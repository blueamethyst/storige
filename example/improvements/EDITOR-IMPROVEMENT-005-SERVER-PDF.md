# 서버 사이드 PDF 생성 상세 설계

> **문서 버전**: 1.0
> **작성일**: 2025-12-03
> **상태**: 제안 (Proposal)
> **상위 문서**: [EDITOR-IMPROVEMENT.md](../EDITOR-IMPROVEMENT.md)

---

## 1. 현재 상태 분석

### 1.1 현재 구현 방식

클라이언트(브라우저)에서 jsPDF + svg2pdf.js를 사용하여 PDF를 생성합니다.

**관련 파일**: `webeasy-editor/packages/canvas-core/src/plugins/ServicePlugin.ts`

```typescript
// 현재 PDF 생성 흐름
async saveMultiPagePDF(pdfFilename: string): Promise<File> {
    const pages = this.pageManager.getExportPages()

    for (const page of pages) {
        const svgElement = await this.generateSvgFromPage(page)  // SVG 생성
        await doc.svg(svgElement, options)  // SVG → PDF 변환
    }

    return new File([doc.output('blob')], pdfFilename)
}
```

### 1.2 현재 흐름도

```
┌─────────────────────────────────────────────────────────────────┐
│                    현재 PDF 생성 흐름                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   [브라우저]                                                     │
│       │                                                         │
│       ▼                                                         │
│   ┌───────────────┐                                             │
│   │ Fabric.js     │                                             │
│   │ Canvas 객체   │                                             │
│   └───────┬───────┘                                             │
│           │ toSVG()                                             │
│           ▼                                                     │
│   ┌───────────────┐                                             │
│   │ SVG 문자열    │ ← 메인 스레드에서 동기 실행                   │
│   └───────┬───────┘                                             │
│           │ svg2pdf.js                                          │
│           ▼                                                     │
│   ┌───────────────┐                                             │
│   │ jsPDF 문서    │ ← 대용량 이미지 시 OOM 위험                   │
│   └───────┬───────┘                                             │
│           │ output('blob')                                      │
│           ▼                                                     │
│   ┌───────────────┐                                             │
│   │ PDF Blob      │                                             │
│   └───────┬───────┘                                             │
│           │ 업로드                                               │
│           ▼                                                     │
│   [S3 저장소]                                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 문제점 상세

#### 문제 1: 메모리 한계 (OOM)

| 상황 | 메모리 사용량 | 결과 |
|------|--------------|------|
| 일반 디자인 (1-2MB 이미지) | ~200MB | 정상 |
| 대형 디자인 (5MB+ 이미지) | ~800MB+ | OOM 크래시 |
| 다중 페이지 (10페이지+) | ~1GB+ | 탭 종료 |

```javascript
// 메모리 핫스팟
_processSvgImages(svgElement) {
    // 모든 이미지를 Base64로 변환하여 메모리에 보관
    const images = svgElement.querySelectorAll('image')
    for (const img of images) {
        const base64 = await this.imageToBase64(img.href)  // 메모리 축적
        img.setAttribute('href', base64)
    }
}
```

#### 문제 2: UI 블로킹

```javascript
// 메인 스레드에서 동기 실행 - UI 완전 차단
await doc.svg(svgElement, {
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight
})
// 복잡한 SVG의 경우 수초~수십초 소요
```

| 디자인 복잡도 | 블로킹 시간 |
|--------------|------------|
| 간단 (텍스트만) | 1-2초 |
| 중간 (이미지 2-3개) | 3-5초 |
| 복잡 (이미지 10개+) | 10-30초 |
| 매우 복잡 | 30초+ (타임아웃) |

#### 문제 3: 품질 제한

```typescript
// AppNav.vue:207 - DPI 하드코딩
const dpi = 72  // 웹 표시용 DPI
const pdfDoc = new jsPDF({
    unit: 'pt',
    format: [width, height]
})
```

| 품질 지표 | 현재 | 인쇄 표준 |
|----------|------|----------|
| DPI | 72 | 300+ |
| 색상 모드 | RGB | CMYK |
| PDF 규격 | 일반 PDF | PDF/X-4 |
| 블리드 | 미포함 | 3mm |

#### 문제 4: 네트워크 불안정

```
[대용량 PDF 업로드 실패 시나리오]

브라우저 ──(100MB PDF)──→ 업로드 중... ──(네트워크 끊김)──→ 실패
    │                                                      │
    └── 전체 과정 다시 시작 필요 (PDF 재생성 포함) ←─────────┘
```

#### 문제 5: 일관성 부재

| 환경 | 렌더링 차이 |
|------|------------|
| Chrome Windows | 기준 |
| Chrome Mac | 폰트 렌더링 미세 차이 |
| Safari | SVG 필터 차이 |
| Firefox | 색상 프로파일 차이 |
| 모바일 Chrome | 메모리 제한으로 단순화 |

---

## 2. 개선 아키텍처 설계

### 2.1 권장 아키텍처: 하이브리드 비동기 큐 기반

```
┌─────────────────────────────────────────────────────────────────┐
│                    개선된 PDF 생성 흐름                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   [Client - Editor]                                             │
│       │                                                         │
│       │ Canvas Data (JSON)                                      │
│       │ exportDesignForPDF()                                    │
│       ▼                                                         │
│   ┌─────────────────────────────────────────────────┐           │
│   │         GraphQL Mutation                        │           │
│   │     requestPdfGeneration(input)                 │           │
│   └─────────────────────┬───────────────────────────┘           │
│                         │                                       │
│                         ▼                                       │
│   ┌─────────────────────────────────────────────────┐           │
│   │         WowMall Backend (Spring WebFlux)        │           │
│   │                                                 │           │
│   │   [PdfGenerationService]                        │           │
│   │       │                                         │           │
│   │       ├─ 소형 작업 (<5초 예상)                   │           │
│   │       │      └─→ 동기 처리 → 즉시 PDF URL 반환  │           │
│   │       │                                         │           │
│   │       └─ 대형 작업 (≥5초 예상)                   │           │
│   │              └─→ SQS 발행 → Job ID 반환         │           │
│   │                      │                          │           │
│   └──────────────────────┼──────────────────────────┘           │
│                          │                                      │
│                          ▼                                      │
│   ┌─────────────────────────────────────────────────┐           │
│   │      PDF Worker Service (별도 EKS Pod)          │           │
│   │                                                 │           │
│   │   - SQS 메시지 소비                              │           │
│   │   - Puppeteer + Chrome headless PDF 생성        │           │
│   │   - S3 직접 업로드                               │           │
│   │   - Redis 상태 업데이트                          │           │
│   │                                                 │           │
│   └─────────────────────┬───────────────────────────┘           │
│                         │                                       │
│                         ▼                                       │
│   ┌─────────────────────────────────────────────────┐           │
│   │              S3 Storage                         │           │
│   │   /generated-pdfs/{jobId}.pdf                   │           │
│   └─────────────────────────────────────────────────┘           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 작업 크기 판단 기준

```
┌─────────────────────────────────────────────────────────────────┐
│                    작업 라우팅 결정 로직                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   [PDF 생성 요청]                                                │
│       │                                                         │
│       ▼                                                         │
│   ┌───────────────────┐                                         │
│   │  작업 크기 추정    │                                         │
│   │                   │                                         │
│   │  - 페이지 수      │                                         │
│   │  - 총 이미지 크기  │                                         │
│   │  - 색상 모드      │                                         │
│   └─────────┬─────────┘                                         │
│             │                                                   │
│   ┌─────────┴───────────────────────────────────┐               │
│   │                                             │               │
│   ▼                                             ▼               │
│ [소형 작업]                                  [대형 작업]          │
│ - 페이지 ≤ 3                                - 페이지 > 3         │
│ - 이미지 총합 ≤ 10MB                        - 이미지 총합 > 10MB  │
│ - RGB 모드                                  - CMYK 모드          │
│   │                                             │               │
│   ▼                                             ▼               │
│ 동기 처리                                    비동기 큐           │
│ (즉시 응답)                                  (Job ID 반환)       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 비동기 처리 상태 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│                    비동기 작업 상태 흐름                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   PENDING ──────→ PROCESSING ──────→ COMPLETED                  │
│      │                │                   │                     │
│      │                │                   └──→ pdfUrl 반환      │
│      │                │                                         │
│      │                └──────→ FAILED                           │
│      │                            │                             │
│      │                            └──→ errorMessage 반환        │
│      │                                                          │
│      └─────────────────→ (타임아웃)                              │
│                                                                 │
│   ┌─────────────────────────────────────────┐                   │
│   │  클라이언트 폴링 (5초 간격)              │                   │
│   │                                         │                   │
│   │  query { pdfGenerationJob(id) {         │                   │
│   │      status                             │                   │
│   │      progress                           │                   │
│   │      pdfUrl                             │                   │
│   │  }}                                     │                   │
│   └─────────────────────────────────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 기술 선택

### 3.1 PDF 렌더링 엔진

| 옵션 | 장점 | 단점 | 선택 |
|------|------|------|------|
| **Puppeteer + Chromium** | 브라우저 동일 품질, SVG/웹폰트 지원 | 메모리 사용량 높음 | ✅ 선택 |
| wkhtmltopdf | 가볍고 빠름 | 최신 CSS 미지원 | ❌ |
| PDFKit (Node) | 네이티브 PDF 생성 | SVG 변환 별도 구현 필요 | ❌ |
| jsPDF (서버) | 기존 코드 재사용 | 동일한 품질 문제 | ❌ |

### 3.2 CMYK 변환

| 옵션 | 장점 | 단점 | 선택 |
|------|------|------|------|
| **Apache PDFBox** | JVM 통합, PDF/X-4 지원 | Java 필요 | ✅ 선택 |
| Ghostscript | 강력한 변환 | 라이선스 복잡 | ❌ |
| ImageMagick | 범용 이미지 처리 | PDF 전용 아님 | ❌ |

### 3.3 인프라 구성요소

| 구성요소 | 선택 | 이유 |
|---------|------|------|
| 메시지 큐 | AWS SQS | 관리형, DLQ 지원, 기존 인프라 |
| 상태 저장 | Redis | 기존 인프라 활용, 빠른 조회 |
| Worker 배포 | EKS Pod (Node.js) | HPA 수평 확장 가능 |
| 파일 저장 | S3 | 기존 인프라 활용 |

---

## 4. API 설계

### 4.1 GraphQL Schema

```graphql
# pdf.graphqls

enum PdfGenerationStatus {
    PENDING
    PROCESSING
    COMPLETED
    FAILED
}

enum PdfStandard {
    PDF_STANDARD    # 일반 PDF
    PDF_X4          # 인쇄용 PDF/X-4
}

input PdfSettings {
    dpi: Int! = 300
    colorMode: EditorColorMode! = CMYK
    pdfStandard: PdfStandard = PDF_X4
    includeBleed: Boolean = true
    bleedMm: Float = 3.0
    includeDieLine: Boolean = false
}

input RequestPdfGenerationInput {
    designId: ID!
    settings: PdfSettings!
}

type RequestPdfGenerationPayload {
    job: PdfGenerationJob!
    # 동기 처리된 경우 즉시 URL 반환
    pdfUrl: Url
}

type PdfGenerationJob {
    id: ID!
    designId: ID!
    status: PdfGenerationStatus!
    progress: Int!              # 0-100
    pdfUrl: Url                 # 완료 시
    errorMessage: String        # 실패 시
    createdAt: DateTime!
    completedAt: DateTime
}

type Mutation {
    requestPdfGeneration(input: RequestPdfGenerationInput!): RequestPdfGenerationPayload!
}

type Query {
    pdfGenerationJob(id: ID!): PdfGenerationJob
}
```

### 4.2 SQS 메시지 형식

```json
{
    "jobId": "job_abc123",
    "designId": "design_xyz789",
    "designDataUrl": "s3://bucket/designs/xyz789.json",
    "settings": {
        "dpi": 300,
        "colorMode": "CMYK",
        "pdfStandard": "PDF_X4",
        "includeBleed": true,
        "bleedMm": 3.0
    },
    "callbackUrl": "https://api.wowmall.kr/internal/pdf-callback",
    "priority": "normal",
    "createdAt": "2025-12-03T10:00:00Z"
}
```

### 4.3 Redis 상태 저장 구조

```
# Key 패턴
pdf:job:{jobId}

# Value (Hash)
{
    "status": "PROCESSING",
    "progress": 45,
    "designId": "design_xyz789",
    "pdfUrl": null,
    "errorMessage": null,
    "createdAt": "2025-12-03T10:00:00Z",
    "updatedAt": "2025-12-03T10:00:30Z"
}

# TTL: 24시간 (완료 후)
```

---

## 5. 구현 상세

### 5.1 Backend 구현 (Kotlin)

#### 디렉토리 구조

```
webeasy-backend/ownweb-app/src/main/kotlin/kr/co/ownweb/pdf/
├── application/
│   ├── PdfGenerationService.kt
│   └── PdfJobStateManager.kt
├── domain/
│   ├── PdfGenerationJob.kt
│   ├── PdfSettings.kt
│   └── PdfGenerationStatus.kt
├── infrastructure/
│   ├── PdfWorkerClient.kt
│   ├── SqsPdfMessageProducer.kt
│   └── RedisPdfJobRepository.kt
└── presentation/
    └── PdfGenerationDataFetcher.kt
```

#### PdfGenerationService.kt

```kotlin
@Service
class PdfGenerationService(
    private val jobStateManager: PdfJobStateManager,
    private val sqsProducer: SqsPdfMessageProducer,
    private val workerClient: PdfWorkerClient
) {
    suspend fun requestGeneration(
        designId: String,
        settings: PdfSettings,
        userId: String
    ): RequestPdfGenerationPayload {

        // 작업 크기 추정
        val estimatedComplexity = estimateComplexity(designId)

        val job = jobStateManager.createJob(designId, settings)

        return if (estimatedComplexity.isSmall()) {
            // 동기 처리 (소형 작업)
            val pdfUrl = workerClient.generateSync(designId, settings)
            jobStateManager.markCompleted(job.id, pdfUrl)
            RequestPdfGenerationPayload(job, pdfUrl)
        } else {
            // 비동기 처리 (대형 작업)
            sqsProducer.sendMessage(job, designId, settings)
            jobStateManager.markPending(job.id)
            RequestPdfGenerationPayload(job, null)
        }
    }

    private fun estimateComplexity(designId: String): Complexity {
        val design = designRepository.findById(designId)
        return Complexity(
            pageCount = design.pages.size,
            totalImageSize = design.calculateTotalImageSize(),
            requiresCmyk = design.colorMode == ColorMode.CMYK
        )
    }
}

data class Complexity(
    val pageCount: Int,
    val totalImageSize: Long,
    val requiresCmyk: Boolean
) {
    fun isSmall(): Boolean =
        pageCount <= 3 &&
        totalImageSize <= 10_000_000 && // 10MB
        !requiresCmyk
}
```

#### PdfGenerationDataFetcher.kt

```kotlin
@DgsComponent
class PdfGenerationDataFetcher(
    private val pdfService: PdfGenerationService,
    private val jobStateManager: PdfJobStateManager
) {
    @DgsMutation
    suspend fun requestPdfGeneration(
        @InputArgument input: RequestPdfGenerationInput,
        dfe: DataFetchingEnvironment
    ): RequestPdfGenerationPayload {
        val userId = dfe.currentUserId()
        return pdfService.requestGeneration(input.designId, input.settings, userId)
    }

    @DgsQuery
    suspend fun pdfGenerationJob(
        @InputArgument id: String
    ): PdfGenerationJob? {
        return jobStateManager.getJob(id)
    }
}
```

### 5.2 PDF Worker 서비스 (Node.js)

#### 디렉토리 구조

```
pdf-worker/
├── src/
│   ├── index.ts
│   ├── config.ts
│   ├── pdfGenerator.ts
│   ├── sqsConsumer.ts
│   ├── s3Uploader.ts
│   ├── redisClient.ts
│   └── types.ts
├── Dockerfile
├── package.json
└── tsconfig.json
```

#### pdfGenerator.ts

```typescript
import puppeteer from 'puppeteer';

interface PdfOptions {
    dpi: number;
    colorMode: 'RGB' | 'CMYK';
    includeBleed: boolean;
    bleedMm: number;
}

export async function generatePdf(
    designData: DesignData,
    options: PdfOptions
): Promise<Buffer> {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    });

    try {
        const page = await browser.newPage();

        // 디자인 데이터를 HTML로 렌더링
        const html = renderDesignToHtml(designData, options);
        await page.setContent(html, { waitUntil: 'networkidle0' });

        // PDF 생성
        const pdfBuffer = await page.pdf({
            width: designData.width + (options.includeBleed ? options.bleedMm * 2 : 0) + 'mm',
            height: designData.height + (options.includeBleed ? options.bleedMm * 2 : 0) + 'mm',
            printBackground: true,
            preferCSSPageSize: true
        });

        // CMYK 변환 필요 시
        if (options.colorMode === 'CMYK') {
            return await convertToCmyk(pdfBuffer);
        }

        return pdfBuffer;

    } finally {
        await browser.close();
    }
}

function renderDesignToHtml(design: DesignData, options: PdfOptions): string {
    // Fabric.js 캔버스 데이터를 HTML/SVG로 변환
    const scale = options.dpi / 72;

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                @page {
                    size: ${design.width}mm ${design.height}mm;
                    margin: 0;
                }
                body { margin: 0; padding: 0; }
                .canvas-container {
                    width: ${design.width}mm;
                    height: ${design.height}mm;
                    transform: scale(${scale});
                    transform-origin: top left;
                }
            </style>
        </head>
        <body>
            <div class="canvas-container">
                ${design.svgContent}
            </div>
        </body>
        </html>
    `;
}
```

#### sqsConsumer.ts

```typescript
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { generatePdf } from './pdfGenerator';
import { uploadToS3 } from './s3Uploader';
import { updateJobStatus } from './redisClient';

const sqs = new SQSClient({ region: process.env.AWS_REGION });

export async function startConsumer() {
    console.log('PDF Worker started, listening for messages...');

    while (true) {
        try {
            const response = await sqs.send(new ReceiveMessageCommand({
                QueueUrl: process.env.SQS_QUEUE_URL,
                MaxNumberOfMessages: 1,
                WaitTimeSeconds: 20,
                VisibilityTimeout: 300 // 5분
            }));

            if (response.Messages && response.Messages.length > 0) {
                for (const message of response.Messages) {
                    await processMessage(message);
                }
            }
        } catch (error) {
            console.error('Error polling SQS:', error);
            await sleep(5000);
        }
    }
}

async function processMessage(message: SQS.Message) {
    const job = JSON.parse(message.Body!);

    try {
        // 상태 업데이트: PROCESSING
        await updateJobStatus(job.jobId, {
            status: 'PROCESSING',
            progress: 0
        });

        // 디자인 데이터 로드
        const designData = await loadDesignFromS3(job.designDataUrl);

        // 진행률 업데이트
        await updateJobStatus(job.jobId, { progress: 20 });

        // PDF 생성
        const pdfBuffer = await generatePdf(designData, job.settings);

        await updateJobStatus(job.jobId, { progress: 80 });

        // S3 업로드
        const pdfUrl = await uploadToS3(pdfBuffer, job.jobId);

        // 완료
        await updateJobStatus(job.jobId, {
            status: 'COMPLETED',
            progress: 100,
            pdfUrl
        });

        // 메시지 삭제
        await sqs.send(new DeleteMessageCommand({
            QueueUrl: process.env.SQS_QUEUE_URL,
            ReceiptHandle: message.ReceiptHandle
        }));

    } catch (error) {
        console.error('Error processing job:', job.jobId, error);

        await updateJobStatus(job.jobId, {
            status: 'FAILED',
            errorMessage: error.message
        });
    }
}
```

#### Dockerfile

```dockerfile
FROM node:20-slim

# Puppeteer 의존성 설치
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-khmeros \
    fonts-noto-cjk \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

CMD ["node", "dist/index.js"]
```

### 5.3 Frontend 구현

#### usePdfGeneration.ts

```typescript
// apps/web/src/composables/usePdfGeneration.ts

import { ref, computed } from 'vue'
import { useRequestPdfGenerationMutation, usePdfGenerationJobQuery } from '@/graphql/generated'

export function usePdfGeneration() {
    const currentJobId = ref<string | null>(null)
    const pollingInterval = ref<number | null>(null)

    const { mutate: requestGeneration } = useRequestPdfGenerationMutation()

    const { result: jobResult, refetch: refetchJob } = usePdfGenerationJobQuery(
        () => ({ id: currentJobId.value! }),
        () => ({ enabled: !!currentJobId.value })
    )

    const job = computed(() => jobResult.value?.pdfGenerationJob)
    const isProcessing = computed(() =>
        job.value?.status === 'PENDING' || job.value?.status === 'PROCESSING'
    )
    const isCompleted = computed(() => job.value?.status === 'COMPLETED')
    const isFailed = computed(() => job.value?.status === 'FAILED')

    async function generatePdf(designId: string, settings: PdfSettings) {
        const result = await requestGeneration({
            input: { designId, settings }
        })

        const payload = result?.data?.requestPdfGeneration

        // 동기 처리된 경우 즉시 반환
        if (payload?.pdfUrl) {
            return payload.pdfUrl
        }

        // 비동기 처리 시작
        currentJobId.value = payload?.job.id ?? null
        startPolling()

        return null
    }

    function startPolling() {
        pollingInterval.value = window.setInterval(async () => {
            await refetchJob()

            if (isCompleted.value || isFailed.value) {
                stopPolling()
            }
        }, 5000) // 5초 간격
    }

    function stopPolling() {
        if (pollingInterval.value) {
            clearInterval(pollingInterval.value)
            pollingInterval.value = null
        }
    }

    return {
        generatePdf,
        job,
        isProcessing,
        isCompleted,
        isFailed,
        progress: computed(() => job.value?.progress ?? 0),
        pdfUrl: computed(() => job.value?.pdfUrl),
        errorMessage: computed(() => job.value?.errorMessage)
    }
}
```

#### AppNav.vue 수정

```vue
<script setup lang="ts">
import { usePdfGeneration } from '@/composables/usePdfGeneration'

const {
    generatePdf,
    isProcessing,
    progress,
    pdfUrl,
    isCompleted,
    isFailed,
    errorMessage
} = usePdfGeneration()

async function handleSavePdf() {
    const settings: PdfSettings = {
        dpi: editorSettings.value.pdfDpi,
        colorMode: editorSettings.value.colorMode,
        pdfStandard: 'PDF_X4',
        includeBleed: true,
        bleedMm: 3.0
    }

    const immediateUrl = await generatePdf(currentDesignId.value, settings)

    if (immediateUrl) {
        // 동기 처리 완료 - 즉시 다운로드
        downloadPdf(immediateUrl)
    }
    // 비동기인 경우 progress 표시 (watch로 처리)
}

watch(isCompleted, (completed) => {
    if (completed && pdfUrl.value) {
        downloadPdf(pdfUrl.value)
        showNotification('PDF 생성이 완료되었습니다.')
    }
})

watch(isFailed, (failed) => {
    if (failed) {
        showError(`PDF 생성 실패: ${errorMessage.value}`)
    }
})
</script>

<template>
    <div v-if="isProcessing" class="pdf-progress">
        <ProgressBar :value="progress" />
        <span>PDF 생성 중... {{ progress }}%</span>
    </div>
</template>
```

---

## 6. 구현 로드맵

### Phase 1: 기반 구축

| 작업 | 설명 | 담당 |
|------|------|------|
| PDF Worker 서비스 생성 | Node.js + Puppeteer 프로젝트 | Backend |
| Docker 이미지 빌드 | Chromium headless 포함 | DevOps |
| SQS 큐 설정 | Main, Priority, DLQ | DevOps |
| GraphQL Schema 추가 | pdf.graphqls | Backend |
| Redis 상태 저장소 구현 | RedisPdfJobRepository | Backend |

### Phase 2: 백엔드 통합

| 작업 | 설명 | 담당 |
|------|------|------|
| PdfGenerationDataFetcher 구현 | GraphQL 엔드포인트 | Backend |
| PdfGenerationService 구현 | 동기/비동기 라우팅 | Backend |
| SQS Producer 구현 | 메시지 발행 | Backend |
| Callback Handler 구현 | Worker 완료 콜백 | Backend |

### Phase 3: 프론트엔드 통합

| 작업 | 설명 | 담당 |
|------|------|------|
| GraphQL Operation 추가 | requestPdfGeneration | Frontend |
| usePdfGeneration composable | 상태 관리 | Frontend |
| 진행 상황 UI | 폴링 기반 프로그레스 | Frontend |
| 에러 처리 | 재시도 로직 | Frontend |

### Phase 4: 점진적 전환

| 작업 | 설명 | 담당 |
|------|------|------|
| Feature Flag 추가 | 서버/클라이언트 선택 | Backend |
| A/B 테스트 | 성능 비교 | QA |
| 모니터링 | CloudWatch 대시보드 | DevOps |
| 품질 검증 | 클라이언트 vs 서버 비교 | QA |

### Phase 5: CMYK/고품질 지원

| 작업 | 설명 | 담당 |
|------|------|------|
| CMYK 색상 변환 | PDFBox 통합 | Backend |
| ICC 프로파일 적용 | 인쇄 표준 준수 | Backend |
| PDF/X-4 규격 준수 | 메타데이터 추가 | Backend |
| WowPress 연동 | 자동 업로드 | Backend |

---

## 7. 마이그레이션 전략

### 7.1 자동 라우팅 규칙

```typescript
function shouldUseServerPdf(design: Design, settings: PdfSettings): boolean {
    // 서버 사이드 PDF 생성 강제 조건
    if (design.pages.length > 3) return true
    if (design.estimatedSize > 10_000_000) return true  // 10MB
    if (settings.colorMode === 'CMYK') return true
    if (settings.pdfStandard === 'PDF_X4') return true

    // Feature Flag 확인
    return featureFlags.isEnabled('SERVER_PDF_GENERATION')
}
```

### 7.2 점진적 롤아웃

| 단계 | 대상 | 비율 |
|------|------|------|
| 1단계 | 내부 테스트 | 100% |
| 2단계 | CMYK/대형 작업 | 100% (자동) |
| 3단계 | 일반 사용자 | 10% |
| 4단계 | 일반 사용자 | 50% |
| 5단계 | 전체 | 100% |

---

## 8. 기대 효과

### 8.1 정량적 개선

| 지표 | 현재 | 개선 후 |
|------|------|---------|
| 대용량 PDF 성공률 | ~70% (OOM) | 99%+ |
| UI 블로킹 | 10-30초 | 0초 (비동기) |
| 최대 처리 가능 크기 | ~50MB | 무제한 |
| PDF DPI | 72 | 300 |
| 색상 모드 | RGB만 | RGB + CMYK |
| 브라우저 메모리 사용 | 800MB+ | ~50MB |

### 8.2 정성적 개선

- **사용자 경험**: PDF 생성 중에도 에디터 사용 가능
- **안정성**: 네트워크 불안정 시에도 서버에서 완료
- **품질**: 인쇄소 요구사항 충족 (CMYK, 300 DPI, PDF/X-4)
- **확장성**: 수평 확장으로 동시 처리량 증가
- **일관성**: 모든 환경에서 동일한 출력물

---

## 9. 비용 추정

### 9.1 월간 인프라 비용

| 항목 | 사양 | 예상 비용 (USD) |
|------|------|----------------|
| SQS | 100,000 요청/월 | ~$10 |
| Worker EC2 | 2x t3.medium | ~$60 |
| S3 저장 | 100GB | ~$20 |
| CloudWatch | 로그/메트릭 | ~$10 |
| **합계** | | **~$100** |

### 9.2 트래픽 증가 시

| 일간 PDF 생성량 | Worker 수 | 예상 비용 (USD/월) |
|----------------|----------|-------------------|
| 100건 | 2 | $100 |
| 1,000건 | 4 | $200 |
| 10,000건 | 10 | $500 |

---

## 10. 리스크 및 대응

| 리스크 | 영향 | 대응 방안 |
|--------|------|----------|
| Worker 장애 | PDF 생성 불가 | HPA + 다중 Pod, DLQ 재처리 |
| SQS 지연 | 처리 지연 | Priority Queue 분리, 알림 설정 |
| 메모리 부족 (Worker) | OOM | 메모리 모니터링, Pod 리소스 제한 상향 |
| CMYK 변환 품질 | 색상 차이 | ICC 프로파일 검증, 샘플 비교 테스트 |
| 롤아웃 실패 | 서비스 중단 | Feature Flag로 즉시 롤백 |

---

## 참고 자료

- [Puppeteer 공식 문서](https://pptr.dev/)
- [AWS SQS 개발자 가이드](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html)
- [PDF/X-4 규격](https://www.iso.org/standard/42876.html)
- [Apache PDFBox](https://pdfbox.apache.org/)
