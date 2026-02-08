# PDF 분리 출력 - 상세 설계서 (v2.5 Final)

**작성일**: 2026년 2월 5일
**예상 소요**: 1.5일 (4시간 × 1.5)

---

## 1. 개요

### 1.1 변경 요청
- **현재**: 표지 + 내지가 하나의 PDF로 병합 출력
- **변경**: 표지와 내지를 별도 PDF 파일로 분리 출력 (옵션)

### 1.2 입력 전제 (명확화)
- **입력**: 이미 분리된 cover PDF + content PDF (2개 URL)
- **현재 동작**: 두 PDF를 병합하여 1개 merged PDF 출력
- **변경 동작**: 분리 옵션 시 cover/content를 **그대로 저장** + merged 생성

> 💡 입력이 이미 분리된 상태이므로 `copyFile` 사용 (extractPages 불필요)

---

## 2. 핵심 설계 원칙

### 2.1 책임 분리 (★★★ 필수)

| 컴포넌트 | 책임 | 반환값 |
|----------|------|--------|
| `pdf-synthesizer.service.ts` | PDF 파일 생성 | **로컬 파일 경로** |
| `synthesis.processor.ts` | 스토리지 업로드 + URL 발급 | **URL** |

> **synthesizer는 파일 생성, processor는 publish**

### 2.2 하위호환 원칙 (★★★ 필수)

```
outputFileUrl: 항상 merged PDF URL (기존 의미 유지)
outputFiles: separate 모드에서만 "추가" 제공
```

| 모드 | outputFileUrl | outputFiles |
|------|---------------|-------------|
| `merged` (기본) | merged.pdf URL | 없음 |
| `separate` | merged.pdf URL ✅ | cover/content URL 추가 |

> ❌ 절대 outputFileUrl에 cover를 넣지 않음 (장애 발생)

---

## 3. 수정 대상 파일

| Phase | 파일 | 수정 내용 |
|-------|------|----------|
| 1 | `packages/types/src/index.ts` | 타입 확장 |
| 2 | `apps/worker/src/services/pdf-synthesizer.service.ts` | 분리 파일 생성 (로컬) |
| 2 | `apps/worker/src/processors/synthesis.processor.ts` | 업로드 + URL 발급 |
| 3 | `apps/api/src/worker-jobs/dto/worker-job.dto.ts` | DTO 확장 |
| 3 | `apps/api/src/worker-jobs/worker-jobs.service.ts` | 웹훅 수정 |

---

## 4. 타입 정의 변경

### 4.1 SynthesisOptions 확장
```typescript
interface SynthesisOptions {
  generatePreview?: boolean;
  outputFormat?: 'merged' | 'separate';  // 요청 옵션, 기본값: 'merged'
}
```

### 4.2 로컬 결과 (Synthesizer → Processor) ★ B1 수정

```typescript
// pdf-synthesizer.service.ts 반환값
interface SynthesisLocalResult {
  success: boolean;

  // 다운로드 원본 (cleanup 대상)
  sourceCoverPath: string;      // downloadFile() 결과
  sourceContentPath: string;    // downloadFile() 결과

  // 출력 파일 (cleanup 대상)
  mergedPath: string;           // 항상 생성
  coverPath?: string;           // separate 모드에서만 (copyFile 결과)
  contentPath?: string;         // separate 모드에서만 (copyFile 결과)

  totalPages: number;
}
```

> **source vs output 분리**: downloadFile 결과 ≠ 최종 출력 파일

### 4.3 최종 결과 (Processor → API)
```typescript
interface SynthesisResult {
  success: boolean;
  outputFileUrl: string;        // 항상 merged URL (하위호환)
  outputFiles?: OutputFile[];   // separate 모드에서만 추가
  previewUrl?: string;
  totalPages: number;           // ★ merged PDF 기준 총 페이지 수
}

// 확장성 고려한 배열 구조
interface OutputFile {
  type: 'cover' | 'content';
  url: string;
}
```

**outputFiles 규칙 (★ 명시)**:
- type 중복 없음 (cover 1개, content 1개)
- 순서: **cover → content** (가독성/일관성)
- optional 유지 (기존 클라이언트는 무시 가능)

### 4.4 웹훅 페이로드 (★ R1 반영)
```typescript
interface SynthesisWebhookPayload {
  event: 'synthesis.completed' | 'synthesis.failed';
  jobId: string;
  status: 'completed' | 'failed';

  // 하위호환 필수
  outputFileUrl: string;         // 항상 merged URL (failed면 '')

  // separate 모드에서만 추가 (★ 존재 시 cover→content 순서 보장)
  outputFiles?: OutputFile[];

  // 요청 옵션 echo-back
  outputFormat?: 'merged' | 'separate';

  // 디버깅용 (★ 공식 필드)
  queueJobId?: string | number;  // Bull queue ID

  // 실패 시 (★ 공식 필드)
  errorMessage?: string;

  timestamp: string;
}
```

---

## 5. Worker 서비스 구현

### 5.1 pdf-synthesizer.service.ts (파일 생성만) ★ B2 수정

```typescript
async synthesize(
  coverPdfUrl: string,
  contentPdfUrl: string,
  options: SynthesisOptions = {},
): Promise<SynthesisLocalResult> {
  const { outputFormat = 'merged' } = options;

  // 1. 다운로드 (source 경로)
  const sourceCoverPath = await this.downloadFile(coverPdfUrl);
  const sourceContentPath = await this.downloadFile(contentPdfUrl);

  // 2. merged PDF 생성 (항상)
  const mergedPath = path.join(this.tempDir, `merged_${uuidv4()}.pdf`);
  await this.mergePdfs(sourceCoverPath, sourceContentPath, mergedPath);

  // 3. separate 모드면 cover/content 복사본 생성 (output 경로)
  if (outputFormat === 'separate') {
    const coverPath = path.join(this.tempDir, `cover_${uuidv4()}.pdf`);
    const contentPath = path.join(this.tempDir, `content_${uuidv4()}.pdf`);
    await fs.copyFile(sourceCoverPath, coverPath);
    await fs.copyFile(sourceContentPath, contentPath);

    return {
      success: true,
      sourceCoverPath,      // ★ 다운로드 원본
      sourceContentPath,    // ★ 다운로드 원본
      mergedPath,
      coverPath,            // ★ 복사본 (출력용)
      contentPath,          // ★ 복사본 (출력용)
      totalPages: await this.countPages(mergedPath),
    };
  }

  return {
    success: true,
    sourceCoverPath,        // ★ 다운로드 원본
    sourceContentPath,      // ★ 다운로드 원본
    mergedPath,
    totalPages: await this.countPages(mergedPath),
  };
}
```

> **source vs output 명확 분리**: `sourceCoverPath`(다운로드) ≠ `coverPath`(출력)

### 5.2 synthesis.processor.ts (업로드 + URL 발급)

**ID 규칙 (★ 필수)**:
```typescript
const jobId = job.data.jobId;  // domain ID (worker_jobs.id) - 스토리지/DB용
const queueJobId = job.id;      // Bull queue ID - 로깅/디버깅용
```
> 스토리지 키 및 DB key는 항상 **domain jobId** 사용

```typescript
async handleSynthesis(job: Job<SynthesisJobData>) {
  // ★ 모든 비즈니스 데이터는 job.data에서 추출
  const { coverPdfUrl, contentPdfUrl, options } = job.data;
  const jobId = job.data.jobId;  // domain ID (worker_jobs.id)
  const queueJobId = job.id;      // Bull queue ID (로깅용)

  // 1. PDF 생성 (로컬 경로 반환)
  const localResult = await this.synthesizer.synthesize(
    coverPdfUrl,
    contentPdfUrl,
    options
  );

  // 2. 스토리지 업로드 + URL 발급
  const storageKeyBase = `outputs/${jobId}`;

  // merged는 항상 업로드
  const mergedUrl = await this.storageService.upload(
    localResult.mergedPath,
    `${storageKeyBase}/merged.pdf`
  );

  const result: SynthesisResult = {
    success: true,
    outputFileUrl: mergedUrl,  // 하위호환
    totalPages: localResult.totalPages,
  };

  // 3. separate 모드면 cover/content도 업로드 (★ options = job.data.options)
  if (options?.outputFormat === 'separate' && localResult.coverPath) {
    const coverUrl = await this.storageService.upload(
      localResult.coverPath,
      `${storageKeyBase}/cover.pdf`
    );
    const contentUrl = await this.storageService.upload(
      localResult.contentPath!,
      `${storageKeyBase}/content.pdf`
    );

    result.outputFiles = [
      { type: 'cover', url: coverUrl },
      { type: 'content', url: contentUrl },
    ];
  }

  // 4. 임시 파일 정리
  await this.cleanupTempFiles(localResult);

  // 5. 결과 저장 및 콜백
  await this.updateJobStatus(jobId, 'completed', result);
}
```

### 5.3 스토리지 키 규칙 (idempotency)

```
outputs/{jobId}/merged.pdf
outputs/{jobId}/cover.pdf
outputs/{jobId}/content.pdf
```

- 동일 jobId 재시도 시 **덮어쓰기** (중복 생성 방지)
- 키가 jobId 기반이므로 안전

### 5.4 캐시 무효화 정책 (★ 선택)

> **채택: Option A - Cache-Control 설정**

```typescript
// storageService.upload() 시 메타데이터 설정
await this.storageService.upload(localPath, storageKey, {
  CacheControl: 'no-cache, no-store, must-revalidate',
});
```

- CDN/프록시 캐시가 있어도 재시도 시 최신 파일 보장
- URL 변경 없이 idempotency 유지

> ⚠️ **스토리지 Adapter 책임**: S3/MinIO/Local 구현체에서 메타데이터 키 매핑 처리
> 예: S3는 `CacheControl`, MinIO도 동일, Local은 무시 등

### 5.5 cleanupTempFiles 범위 (★ 명시)

```typescript
interface SynthesisLocalResult {
  // 출력 파일 (cleanup 대상)
  mergedPath: string;
  coverPath?: string;
  contentPath?: string;

  // 다운로드 원본 (cleanup 대상)
  sourceCoverPath: string;
  sourceContentPath: string;

  totalPages: number;
}

private async cleanupTempFiles(localResult: SynthesisLocalResult) {
  const filesToDelete = [
    localResult.mergedPath,
    localResult.coverPath,
    localResult.contentPath,
    localResult.sourceCoverPath,
    localResult.sourceContentPath,
  ].filter(Boolean);

  for (const file of filesToDelete) {
    await this.safeDelete(file);
  }
}
```

> 다운로드 원본 + 출력 파일 **모두 cleanup**

### 5.6 에러 핸들링 + failed webhook ★ B3 수정

```typescript
// synthesis.processor.ts
async handleSynthesis(job: Job<SynthesisJobData>) {
  const jobId = job.data.jobId;
  const options = job.data.options;

  try {
    // ... 처리 ...
    await this.updateJobStatus(jobId, 'completed', result);
  } catch (error) {
    // ★ failed 상태 업데이트 → worker-jobs.service에서 failed webhook 발송
    await this.updateJobStatus(jobId, 'failed', null, error.message);
  }
}
```

**failed webhook 발송 흐름** (★ 명시):
```
1. processor에서 catch → updateJobStatus('failed', errorMessage)
2. worker-jobs.service.updateJobStatus() 호출
3. status === 'failed' && callbackUrl 존재 시
   → sendFailedCallback() 호출
4. failed 웹훅 발송
```

**failed 콜백 구현** (worker-jobs.service.ts):
```typescript
// job: WorkerJob (DB 엔티티)
async updateJobStatus(jobId: string, status: string, result?: any, errorMessage?: string) {
  const job = await this.findById(jobId);
  // DB 업데이트 ...

  if (status === 'completed' && job.callbackUrl) {
    await this.sendCompletedCallback(job);
  } else if (status === 'failed' && job.callbackUrl) {
    await this.sendFailedCallback(job, errorMessage);  // ★ failed 발송
  }
}

private async sendFailedCallback(job: WorkerJob, errorMessage: string) {
  const payload: SynthesisWebhookPayload = {
    event: 'synthesis.failed',
    jobId: job.id,                    // ★ DB entity PK = domain ID
    status: 'failed',
    outputFileUrl: '',                // 하위호환: 빈값 유지
    outputFormat: job.options?.outputFormat || 'merged',  // ★ DB에 저장된 options
    errorMessage,
    timestamp: new Date().toISOString(),
  };
  await this.webhookService.send(job.callbackUrl, payload);
}
```

### 5.7 부분 실패 정책 (★ 결정)

> **채택: 전체 실패 처리 (부분 성공 금지)**

- separate 요청에서 cover 업로드 성공, content 업로드 실패 → **전체 failed**
- **파일 정리 정책**: 기본은 **덮어쓰기 기반 idempotency**로 수습
  - 다음 재시도에서 같은 키로 덮어씀 → 별도 delete 불필요
  - delete는 보안/비용 정책상 필요 시 **옵션**으로만 구현

> ⚠️ **운영 참고**: failed라도 일부 파일(예: merged)이 스토리지에 남을 수 있으나, 다음 재시도에서 동일 키로 덮어써 최종 일관성을 확보한다.

```typescript
// 3. separate 모드 업로드 (트랜잭션처럼 처리)
if (options?.outputFormat === 'separate') {
  try {
    const coverUrl = await this.storageService.upload(...);
    const contentUrl = await this.storageService.upload(...);
    result.outputFiles = [...];
  } catch (uploadError) {
    // 전체 실패 처리
    throw new Error(`Separate upload failed: ${uploadError.message}`);
  }
}
```

---

## 6. API 수정

### 6.1 DTO 확장
```typescript
// worker-job.dto.ts
@ApiPropertyOptional({
  enum: ['merged', 'separate'],
  default: 'merged',
  description: '출력 형식 (요청 옵션)'
})
@IsOptional()
@IsIn(['merged', 'separate'])
outputFormat?: 'merged' | 'separate';
```

### 6.2 웹훅 콜백 (★ B4 수정 - DB Entity 기준)

**데이터 소스 명확화**:
- `worker-jobs.service.ts`의 `job`은 **DB 엔티티 (WorkerJob)**, Bull Job 아님
- Bull Job의 `job.data`는 processor에서만 접근
- 웹훅 payload는 **DB에 저장된 데이터 기준**으로 구성

```typescript
// worker-jobs.service.ts
// job: WorkerJob (DB 엔티티)

const payload: SynthesisWebhookPayload = {
  event: 'synthesis.completed',
  jobId: job.id,                   // ★ domain ID (worker_jobs.id)
  status: 'completed',

  // 하위호환: 항상 merged URL
  outputFileUrl: job.result.outputFileUrl,

  // separate 모드에서만 추가
  outputFiles: job.result.outputFiles,
  outputFormat: job.options?.outputFormat || 'merged',  // ★ DB에 저장된 options

  // 디버깅용 (optional) - DB에 저장된 경우만
  queueJobId: job.queueJobId,      // Bull queue ID (저장돼 있으면)

  timestamp: new Date().toISOString(),
};
```

**데이터 소스 정리**:
| 위치 | 변수 | 의미 |
|------|------|------|
| processor | `job.data.jobId` | Bull job payload의 domain ID |
| processor | `job.id` | Bull queue ID |
| service | `job.id` | DB entity PK = domain ID |
| service | `job.options` | DB에 저장된 비즈니스 옵션 (JSON) |

---

## 7. 북모아 연동

### 7.1 웹훅 수신 (PHP)
```php
// 하위호환: 기존 코드 그대로 동작
$mergedUrl = $payload['outputFileUrl'];

// separate 모드 처리 (옵션)
if (isset($payload['outputFiles']) && is_array($payload['outputFiles'])) {
    foreach ($payload['outputFiles'] as $file) {
        if ($file['type'] === 'cover') {
            $coverUrl = $file['url'];
        } elseif ($file['type'] === 'content') {
            $contentUrl = $file['url'];
        }
    }
    // 2개 파일 추가 저장
}
```

---

## 8. 구현 일정

### Day 1 (2/5 목) - 4시간
| 시간 | 작업 |
|------|------|
| 30분 | Phase 1: 타입 정의 확장 |
| 1.5시간 | Phase 2-1: pdf-synthesizer.service.ts |
| 1시간 | Phase 2-2: synthesis.processor.ts |
| 1시간 | Phase 3: API 수정 |

### Day 2 (2/6 금) - 2시간
| 시간 | 작업 |
|------|------|
| 1시간 | 북모아 웹훅 수신부 수정 |
| 1시간 | E2E 검증 |

---

## 9. 테스트 케이스

### 9.1 기능 테스트
| 케이스 | 입력 | 예상 결과 |
|--------|------|----------|
| 기본 (merged) | outputFormat 미지정 | outputFileUrl만 반환 |
| 분리 출력 | outputFormat: 'separate' | outputFileUrl + outputFiles |
| 하위호환 | 기존 클라이언트 | outputFileUrl로 merged 수신 |

### 9.2 URL 유효성 테스트 (신규)
| 케이스 | 검증 항목 |
|--------|----------|
| outputFileUrl | URL 형식, 외부 GET 가능 |
| outputFiles[*].url | URL 형식, 외부 GET 가능 |

### 9.3 재시도 테스트 (idempotency)
| 케이스 | 예상 결과 |
|--------|----------|
| 동일 jobId 재시도 | 파일 덮어쓰기 (중복 X) |
| 실패 후 재시도 | 이전 파일 정리 후 재생성 |

### 9.4 부분 실패 테스트 (신규)
| 케이스 | 예상 결과 |
|--------|----------|
| cover 업로드 성공 + content 실패 | **전체 failed** (부분 성공 금지) |
| merged 업로드 실패 | failed + cleanup |

### 9.5 하위호환 테스트 (신규)
| 케이스 | 예상 결과 |
|--------|----------|
| 기존 클라이언트 + separate 응답 | outputFiles 무시, outputFileUrl만 사용 |
| outputFiles 필드 없는 응답 | 기존과 동일하게 동작 |

### 9.6 failed webhook 테스트
| 케이스 | 예상 결과 |
|--------|----------|
| synthesize 실패 | event='synthesis.failed', outputFileUrl='' |
| errorMessage 포함 | 실패 원인 메시지 전달 |

---

## 10. 검증 방법

```bash
# 1. 타입 빌드
pnpm --filter @storige/types build

# 2. Worker 테스트
pnpm --filter @storige/worker test

# 3. API 테스트
pnpm --filter @storige/api test

# 4. E2E (수동)
# 1) separate 요청 (★ R5 반영: 필드명 DTO 기준 통일)
curl -X POST /worker-jobs/synthesize \
  -d '{"coverPdfUrl":"...", "contentPdfUrl":"...", "outputFormat":"separate"}'

# 2) 웹훅 확인
# - outputFileUrl: merged URL 확인
# - outputFiles: cover/content URL 확인
# - 각 URL GET 가능 확인
```

---

## 11. 완료 기준 (최종)

### 기능
- [ ] `outputFormat='separate'` 옵션 동작
- [ ] `outputFileUrl`: merged PDF URL 유지 (**하위호환**)
- [ ] `outputFiles`: cover → content 순서, 배열 구조

### 인프라
- [ ] 모든 URL이 외부 GET 가능 (스토리지 publish)
- [ ] Cache-Control 설정으로 캐시 무효화
- [ ] 스토리지 키: `outputs/{jobId}/` 기반

### 안정성
- [ ] 재시도 시 파일 덮어쓰기 (idempotency)
- [ ] 부분 실패 → 전체 failed 처리
- [ ] 임시 파일 전체 cleanup (source + output)

### 웹훅
- [ ] `payload.jobId` = domain ID (worker_jobs.id) (**B1**)
- [ ] `outputFormat` = job.data.options에서 참조 (**B2**)
- [ ] completed payload에 outputFiles 포함
- [ ] failed payload에 outputFileUrl='' 유지

### 하위호환
- [ ] **기존 클라이언트 무수정 동작 보장**
- [ ] outputFiles optional 유지
- [ ] 북모아에서 2개 파일 정상 저장

---

## 12. 실행 전 체크리스트 (★ 필수 확인)

- [ ] WorkerJob 생성 시 `options`가 DB에 항상 저장되는지
- [ ] storage adapter에서 Cache-Control 메타데이터 실제 적용 확인 (HEAD 요청)
- [ ] completed/failed 모두 `jobId=DB PK(domain)`가 찍히는지
- [ ] E2E curl 필드명이 실제 DTO와 일치 (`coverPdfUrl`/`contentPdfUrl`)
