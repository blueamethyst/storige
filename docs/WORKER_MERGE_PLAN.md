# 작업계획서: 워커 PDF 병합 기능

## 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 프로젝트명 | 워커 PDF 병합 (Synthesis) 기능 |
| 작성일 | 2025-12-20 |
| 목표 | 북모아 주문 시점에 표지 PDF + 내지 PDF 병합 트리거 및 저장 시점에 병합 가능 여부 사전 체크 |

---

## 요구사항 요약

### 워크플로우

```
북모아 (에디터 구동 전)          storige 에디터              북모아 (주문)
┌─────────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ 1. 상품 선택         │      │ 4. 표지/책등 편집 │      │ 7. 주문 버튼 클릭 │
│ 2. 내지 PDF 업로드   │      │ 5. 저장          │      │ 8. 병합 트리거    │
│ 3. 파일 검증 완료 ✓  │ ──→  │ 6. 병합 가능 체크 │ ──→  │ 9. 결제 진행     │
└─────────────────────┘      │    (dry-run)    │      │ 10. 병합 완료 대기│
                             └─────────────────┘      └─────────────────┘
```

### 핵심 기능

| 기능 | 시점 | 설명 |
|------|------|------|
| 병합 가능 여부 체크 | 저장 시 | 실제 파일 생성 없이 병합 가능 여부만 검증 (dry-run) |
| 병합 트리거 | 주문 시 | 북모아에서 워커로 실제 병합 작업 요청 |
| 병합 상태 조회 | 주문 후 | 병합 작업 진행 상태 폴링 |

---

## 기존 시스템 분석

### 현재 구조

**API (apps/api)**:
- `POST /worker-jobs/synthesize` - 병합 작업 생성 (Admin/Manager 인증)
- `POST /worker-jobs/validate/external` - 외부 API Key로 검증 작업 생성
- `GET /worker-jobs/external/:id` - 외부 API Key로 작업 상태 조회

**Worker (apps/worker)**:
- `SynthesisProcessor` - Bull Queue에서 `pdf-synthesis` 작업 처리
- `PdfSynthesizerService` - 실제 PDF 병합 로직 (Ghostscript/pdf-lib)

### 병합 프로세스 (기존)

```typescript
// SynthesisJobData
{
  jobId: string;
  coverUrl: string;      // 표지 PDF URL
  contentUrl: string;    // 내지 PDF URL
  spineWidth: number;    // 책등 폭 (mm)
  bindingType?: 'perfect' | 'saddle' | 'hardcover';
  generatePreview?: boolean;
}
```

---

## WBS (Work Breakdown Structure)

### 1. 병합 가능 여부 체크 API (Dry-run) [1.0]

저장 시점에 호출하여 병합 가능 여부만 사전 확인

#### 1.1 CheckMergeableDto 작성
- [ ] 1.1.1 DTO 정의

**파일**: `/apps/api/src/worker-jobs/dto/check-mergeable.dto.ts`

```typescript
import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckMergeableDto {
  @ApiProperty({ description: '편집 세션 ID' })
  @IsString()
  editSessionId: string;

  @ApiProperty({ description: '표지 PDF 파일 ID', required: false })
  @IsString()
  @IsOptional()
  coverFileId?: string;

  @ApiProperty({ description: '표지 PDF URL', required: false })
  @IsString()
  @IsOptional()
  coverUrl?: string;

  @ApiProperty({ description: '내지 PDF 파일 ID', required: false })
  @IsString()
  @IsOptional()
  contentFileId?: string;

  @ApiProperty({ description: '내지 PDF URL', required: false })
  @IsString()
  @IsOptional()
  contentUrl?: string;

  @ApiProperty({ description: '책등 폭 (mm)' })
  @IsNumber()
  spineWidth: number;
}

export class CheckMergeableResponseDto {
  @ApiProperty({ description: '병합 가능 여부' })
  mergeable: boolean;

  @ApiProperty({ description: '문제점 목록', required: false })
  issues?: Array<{
    code: string;
    message: string;
  }>;
}
```

#### 1.2 WorkerJobsService에 checkMergeable 메서드 추가
- [ ] 1.2.1 병합 가능 여부 체크 로직 구현

**파일**: `/apps/api/src/worker-jobs/worker-jobs.service.ts`

```typescript
async checkMergeable(dto: CheckMergeableDto): Promise<CheckMergeableResponseDto> {
  const issues: Array<{ code: string; message: string }> = [];

  // 1. 표지 파일 존재 확인
  let coverUrl = dto.coverUrl;
  if (dto.coverFileId) {
    try {
      const coverFile = await this.filesService.findById(dto.coverFileId);
      coverUrl = coverFile.filePath;
    } catch {
      issues.push({
        code: 'COVER_FILE_NOT_FOUND',
        message: '표지 파일을 찾을 수 없습니다.',
      });
    }
  }

  // 2. 내지 파일 존재 확인
  let contentUrl = dto.contentUrl;
  if (dto.contentFileId) {
    try {
      const contentFile = await this.filesService.findById(dto.contentFileId);
      contentUrl = contentFile.filePath;
    } catch {
      issues.push({
        code: 'CONTENT_FILE_NOT_FOUND',
        message: '내지 파일을 찾을 수 없습니다.',
      });
    }
  }

  // 3. 파일 URL 필수 체크
  if (!coverUrl) {
    issues.push({
      code: 'COVER_URL_REQUIRED',
      message: '표지 URL이 필요합니다.',
    });
  }

  if (!contentUrl) {
    issues.push({
      code: 'CONTENT_URL_REQUIRED',
      message: '내지 URL이 필요합니다.',
    });
  }

  // 4. 파일 접근 가능 여부 확인 (실제 존재 여부)
  if (coverUrl && issues.length === 0) {
    const coverAccessible = await this.checkFileAccessible(coverUrl);
    if (!coverAccessible) {
      issues.push({
        code: 'COVER_FILE_INACCESSIBLE',
        message: '표지 파일에 접근할 수 없습니다.',
      });
    }
  }

  if (contentUrl && issues.length === 0) {
    const contentAccessible = await this.checkFileAccessible(contentUrl);
    if (!contentAccessible) {
      issues.push({
        code: 'CONTENT_FILE_INACCESSIBLE',
        message: '내지 파일에 접근할 수 없습니다.',
      });
    }
  }

  // 5. 책등 폭 유효성 체크
  if (dto.spineWidth < 0) {
    issues.push({
      code: 'INVALID_SPINE_WIDTH',
      message: '책등 폭은 0 이상이어야 합니다.',
    });
  }

  return {
    mergeable: issues.length === 0,
    issues: issues.length > 0 ? issues : undefined,
  };
}

private async checkFileAccessible(url: string): Promise<boolean> {
  try {
    if (url.startsWith('/') || url.startsWith('./')) {
      // 로컬 파일
      await fs.access(url);
      return true;
    } else {
      // 원격 URL
      const response = await axios.head(url, { timeout: 5000 });
      return response.status === 200;
    }
  } catch {
    return false;
  }
}
```

#### 1.3 WorkerJobsController에 엔드포인트 추가
- [ ] 1.3.1 `/worker-jobs/check-mergeable` 엔드포인트 추가
- [ ] 1.3.2 외부용 `/worker-jobs/check-mergeable/external` 엔드포인트 추가

**파일**: `/apps/api/src/worker-jobs/worker-jobs.controller.ts`

```typescript
/**
 * 병합 가능 여부 체크 (에디터 저장 시 호출)
 */
@Post('check-mergeable')
@ApiOperation({ summary: 'Check if PDFs can be merged (dry-run)' })
@ApiResponse({ status: 200, description: 'Merge check result', type: CheckMergeableResponseDto })
async checkMergeable(
  @Body() checkMergeableDto: CheckMergeableDto,
): Promise<CheckMergeableResponseDto> {
  return await this.workerJobsService.checkMergeable(checkMergeableDto);
}

/**
 * 병합 가능 여부 체크 - 외부용 (API Key 인증)
 */
@Post('check-mergeable/external')
@Public()
@UseGuards(ApiKeyGuard)
@ApiSecurity('api-key')
@ApiOperation({ summary: 'Check if PDFs can be merged (external API key auth)' })
@ApiResponse({ status: 200, description: 'Merge check result', type: CheckMergeableResponseDto })
@ApiResponse({ status: 401, description: 'Invalid API key' })
async checkMergeableExternal(
  @Body() checkMergeableDto: CheckMergeableDto,
): Promise<CheckMergeableResponseDto> {
  return await this.workerJobsService.checkMergeable(checkMergeableDto);
}
```

---

### 2. 병합 트리거 API (북모아용) [2.0]

주문 시점에 북모아에서 호출하여 실제 병합 작업 시작

#### 2.1 외부용 Synthesis 엔드포인트 추가
- [ ] 2.1.1 `/worker-jobs/synthesize/external` 엔드포인트 추가

**파일**: `/apps/api/src/worker-jobs/worker-jobs.controller.ts`

```typescript
/**
 * 외부 연동용 병합 작업 생성 (API Key 인증)
 * 북모아 주문 시점에 호출
 */
@Post('synthesize/external')
@Public()
@UseGuards(ApiKeyGuard)
@ApiSecurity('api-key')
@ApiOperation({ summary: 'Create a PDF synthesis job (external API key auth)' })
@ApiResponse({ status: 201, description: 'Synthesis job created and queued', type: WorkerJob })
@ApiResponse({ status: 400, description: 'Invalid input' })
@ApiResponse({ status: 401, description: 'Invalid API key' })
async createSynthesisJobExternal(
  @Body() createSynthesisJobDto: CreateSynthesisJobDto,
): Promise<WorkerJob> {
  return await this.workerJobsService.createSynthesisJob(createSynthesisJobDto);
}
```

#### 2.2 CreateSynthesisJobDto 확장
- [ ] 2.2.1 orderId 필드 추가 (북모아 주문 번호)
- [ ] 2.2.2 priority 필드 추가 (우선순위)
- [ ] 2.2.3 callbackUrl 필드 추가 (완료 시 콜백)

**파일**: `/apps/api/src/worker-jobs/dto/worker-job.dto.ts`

```typescript
export class CreateSynthesisJobDto {
  // 기존 필드들...

  @ApiProperty({ description: '북모아 주문 번호', required: false })
  @IsString()
  @IsOptional()
  orderId?: string;

  @ApiProperty({ description: '우선순위', required: false, enum: ['high', 'normal', 'low'] })
  @IsString()
  @IsOptional()
  priority?: 'high' | 'normal' | 'low';

  @ApiProperty({ description: '완료 시 콜백 URL', required: false })
  @IsString()
  @IsOptional()
  callbackUrl?: string;
}
```

#### 2.3 WorkerJobsService 수정
- [ ] 2.3.1 orderId 저장
- [ ] 2.3.2 priority에 따른 Bull Queue 우선순위 설정
- [ ] 2.3.3 완료 시 callbackUrl로 콜백 전송

**파일**: `/apps/api/src/worker-jobs/worker-jobs.service.ts`

```typescript
async createSynthesisJob(dto: CreateSynthesisJobDto): Promise<WorkerJob> {
  // ... 기존 로직 ...

  const job = this.workerJobRepository.create({
    jobType: WorkerJobType.SYNTHESIZE,
    status: WorkerJobStatus.PENDING,
    fileId: coverFileId,
    inputFileUrl: coverUrl,
    options: {
      coverFileId,
      contentFileId,
      coverUrl,
      contentUrl,
      spineWidth: dto.spineWidth,
      orderId: dto.orderId,           // 추가
      callbackUrl: dto.callbackUrl,   // 추가
    },
  });

  const savedJob = await this.workerJobRepository.save(job);

  // 우선순위 설정
  const jobOptions: any = {};
  if (dto.priority === 'high') {
    jobOptions.priority = 1;
  } else if (dto.priority === 'low') {
    jobOptions.priority = 10;
  } else {
    jobOptions.priority = 5;
  }

  await this.synthesisQueue.add('synthesize-pdf', {
    jobId: savedJob.id,
    coverFileId,
    contentFileId,
    coverUrl,
    contentUrl,
    spineWidth: dto.spineWidth,
    orderId: dto.orderId,
    callbackUrl: dto.callbackUrl,
  }, jobOptions);

  return savedJob;
}
```

---

### 3. 병합 상태 조회 및 콜백 [3.0]

#### 3.1 상태 조회 (기존 활용)
- [x] 3.1.1 `GET /worker-jobs/external/:id` - 이미 구현됨

#### 3.2 웹훅 콜백 확장
- [ ] 3.2.1 병합 완료/실패 시 callbackUrl로 콜백 전송

**콜백 페이로드**:
```typescript
interface SynthesisCallbackPayload {
  event: 'synthesis.completed' | 'synthesis.failed';
  jobId: string;
  orderId?: string;
  status: 'completed' | 'failed';
  outputFileUrl?: string;    // 병합된 PDF URL (완료 시)
  previewUrl?: string;       // 미리보기 이미지 URL
  totalPages?: number;       // 총 페이지 수
  errorMessage?: string;     // 에러 메시지 (실패 시)
  timestamp: string;
}
```

---

## API 명세서 (북모아 연동용)

### 1. 병합 가능 여부 체크

에디터 저장 시점에 호출하여 병합 가능 여부를 사전 확인합니다.

```
POST /api/worker-jobs/check-mergeable/external
Headers:
  X-API-Key: {API_KEY}
  Content-Type: application/json

Request Body:
{
  "editSessionId": "uuid",
  "coverFileId": "uuid",        // 또는 coverUrl
  "contentFileId": "uuid",      // 또는 contentUrl
  "spineWidth": 5.5
}

Response (200):
{
  "mergeable": true
}

Response (200 - 문제 있음):
{
  "mergeable": false,
  "issues": [
    {
      "code": "CONTENT_FILE_NOT_FOUND",
      "message": "내지 파일을 찾을 수 없습니다."
    }
  ]
}
```

### 2. 병합 트리거

주문 시점에 호출하여 실제 병합 작업을 시작합니다.

```
POST /api/worker-jobs/synthesize/external
Headers:
  X-API-Key: {API_KEY}
  Content-Type: application/json

Request Body:
{
  "editSessionId": "uuid",
  "coverFileId": "uuid",
  "contentFileId": "uuid",
  "spineWidth": 5.5,
  "orderId": "ORD-2024-12345",
  "priority": "high",
  "callbackUrl": "https://bookmoa.com/api/webhook/synthesis"
}

Response (201):
{
  "id": "job-uuid",
  "jobType": "SYNTHESIZE",
  "status": "PENDING",
  "createdAt": "2024-12-20T10:00:00Z"
}
```

### 3. 병합 상태 조회

```
GET /api/worker-jobs/external/{jobId}
Headers:
  X-API-Key: {API_KEY}

Response (200):
{
  "id": "job-uuid",
  "jobType": "SYNTHESIZE",
  "status": "COMPLETED",      // PENDING | PROCESSING | COMPLETED | FAILED
  "outputFileUrl": "/storage/temp/synthesized_xxx.pdf",
  "result": {
    "totalPages": 52,
    "spineWidth": 5.5,
    "previewUrl": "/storage/temp/synthesized_xxx_preview.png"
  },
  "createdAt": "2024-12-20T10:00:00Z",
  "completedAt": "2024-12-20T10:00:30Z"
}
```

### 4. 웹훅 콜백 (병합 완료 시)

병합 완료 또는 실패 시 `callbackUrl`로 자동 전송됩니다.

```
POST {callbackUrl}
Headers:
  Content-Type: application/json
  X-Webhook-Signature: {HMAC_SHA256}

Body:
{
  "event": "synthesis.completed",
  "jobId": "job-uuid",
  "orderId": "ORD-2024-12345",
  "status": "completed",
  "outputFileUrl": "/storage/temp/synthesized_xxx.pdf",
  "previewUrl": "/storage/temp/synthesized_xxx_preview.png",
  "totalPages": 52,
  "timestamp": "2024-12-20T10:00:30Z"
}
```

---

## 에러 코드 정의

### 병합 가능 여부 체크 에러

| 코드 | 메시지 | 설명 |
|------|--------|------|
| `COVER_FILE_NOT_FOUND` | 표지 파일을 찾을 수 없습니다. | DB에 파일 레코드 없음 |
| `CONTENT_FILE_NOT_FOUND` | 내지 파일을 찾을 수 없습니다. | DB에 파일 레코드 없음 |
| `COVER_URL_REQUIRED` | 표지 URL이 필요합니다. | coverFileId/coverUrl 둘 다 없음 |
| `CONTENT_URL_REQUIRED` | 내지 URL이 필요합니다. | contentFileId/contentUrl 둘 다 없음 |
| `COVER_FILE_INACCESSIBLE` | 표지 파일에 접근할 수 없습니다. | 파일이 삭제되었거나 접근 불가 |
| `CONTENT_FILE_INACCESSIBLE` | 내지 파일에 접근할 수 없습니다. | 파일이 삭제되었거나 접근 불가 |
| `INVALID_SPINE_WIDTH` | 책등 폭은 0 이상이어야 합니다. | spineWidth < 0 |

---

## 수정 파일 목록

### API (apps/api)

| 파일 경로 | 작업 내용 |
|-----------|----------|
| `/apps/api/src/worker-jobs/dto/check-mergeable.dto.ts` | **신규** - 병합 가능 체크 DTO |
| `/apps/api/src/worker-jobs/dto/worker-job.dto.ts` | orderId, priority, callbackUrl 필드 추가 |
| `/apps/api/src/worker-jobs/worker-jobs.controller.ts` | check-mergeable, synthesize/external 엔드포인트 추가 |
| `/apps/api/src/worker-jobs/worker-jobs.service.ts` | checkMergeable 메서드, 콜백 로직 추가 |

### Worker (apps/worker)

| 파일 경로 | 작업 내용 |
|-----------|----------|
| `/apps/worker/src/processors/synthesis.processor.ts` | 콜백 URL 처리 추가 |

---

## 시퀀스 다이어그램

### 저장 시 병합 가능 여부 체크

```
에디터                    storige API
  │                          │
  │  저장 요청               │
  ├─────────────────────────→│
  │                          │
  │  POST /check-mergeable   │
  ├─────────────────────────→│
  │                          │ 파일 존재/접근 확인
  │                          │────────┐
  │                          │        │
  │                          │←───────┘
  │  { mergeable: true }     │
  │←─────────────────────────┤
  │                          │
  │  저장 완료               │
  │←─────────────────────────┤
```

### 주문 시 병합 트리거

```
북모아                   storige API              Worker
  │                          │                      │
  │  POST /synthesize/external                      │
  ├─────────────────────────→│                      │
  │                          │  Bull Queue 추가     │
  │                          ├─────────────────────→│
  │  { jobId, status: PENDING }                     │
  │←─────────────────────────┤                      │
  │                          │                      │
  │  GET /external/{jobId} (폴링)                   │
  ├─────────────────────────→│                      │
  │  { status: PROCESSING }  │                      │
  │←─────────────────────────┤    PDF 병합 작업     │
  │                          │                      │──┐
  │                          │                      │  │
  │                          │   상태 업데이트      │←─┘
  │                          │←─────────────────────┤
  │                          │                      │
  │  Webhook: synthesis.completed                   │
  │←─────────────────────────┤                      │
  │                          │                      │
  │  GET /external/{jobId}   │                      │
  ├─────────────────────────→│                      │
  │  { status: COMPLETED, outputFileUrl }           │
  │←─────────────────────────┤                      │
```

---

## 테스트 계획

### 1. 단위 테스트

- [ ] `checkMergeable` - 파일 존재 확인 테스트
- [ ] `checkMergeable` - 파일 접근 불가 테스트
- [ ] `createSynthesisJob` - 우선순위 설정 테스트

### 2. 통합 테스트 (e2e)

- [ ] `POST /check-mergeable/external` - 정상 케이스
- [ ] `POST /check-mergeable/external` - 파일 없음 에러
- [ ] `POST /synthesize/external` - 정상 작업 생성
- [ ] `GET /external/:id` - 상태 조회

### 3. 북모아 연동 테스트

- [ ] 저장 시 병합 가능 여부 체크 흐름
- [ ] 주문 시 병합 트리거 → 폴링 → 완료 확인 흐름
- [ ] 웹훅 콜백 수신 확인
