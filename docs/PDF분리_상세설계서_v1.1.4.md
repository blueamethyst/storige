# 단일 PDF 표지/내지 분리 기능 설계서 (v1.1.4)

**작성일**: 2026-02-05

**개정 히스토리**
| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| v1.0 | 2026-02-05 | 최초 설계 |
| v1.1+ | 2026-02-05 | split-synthesize 도입, 이중 검증, pageTypes 배열 |
| v1.1.1 | 2026-02-06 | 운영 안정성 패치: INVALID_OUTPUT_OPTIONS, FILE_DOWNLOAD_FAILED/PDF_LOAD_FAILED, updateJobStatus 재시도 정책, Worker 이중 검증 강화 |
| v1.1.2 | 2026-02-06 | 설계서 품질 패치: storageKeyBase/URL 혼동 제거, sortOrder 무결성(INVALID_SORT_ORDER), verifySplitResult 로드 실패 래핑, merged 모드 부작용 테스트, outputFormat 기본값 API-only 규칙 |
| v1.1.3 | 2026-02-06 | 구현-설계 정합성: Queue payload에 mode:'split' 추가, sortOrder 연속성(0..n-1) 검증 강화, 멱등성 requestId 재발급 규칙 명시 |
| v1.1.4 | 2026-02-06 | 단일 진실 공급원: mode는 Queue payload만 신뢰, sortOrder 2차키 제거, verifySplitResult 세분화, downloadFile 재시도 구체화, circuit breaker 추가, 테스트케이스 보강 |

---

## 1. 개요

### 1.1 요구사항
- **현재**: 표지 PDF + 내지 PDF 2개 입력 필수
- **변경**: 단일 PDF에서 표지/내지 자동 분리 지원

### 1.2 핵심 제약
- **우리 편집기에서 저장한 PDF만 지원**
- `EditSession.pages.templateType` 정보를 활용
- 외부 PDF는 분리 불가 (에러 반환)

### 1.3 설계 원칙 (★ 핵심)
> **"추측/자동 fallback 제거, 불일치 시 즉시 실패"**

이 기능은 "단순 PDF 분리"가 아니라 **"편집 세션 기반 재합성"**에 가깝다.

### 1.4 아키텍처 전제 조건 (★ 중요)

**Worker가 Files 테이블 조회 가능해야 함**

이중 검증(API + Worker)을 위해 Worker가 다음 접근 권한 필요:
- `filesService.findById(pdfFileId)` → Files 테이블 조회
- `file.metadata` 검증 (generatedBy, editSessionId 등)

**트레이드오프 (검증 아키텍처)**
| 검증 방식 | 이중 검증 강도 | Worker 의존성 |
|-----------|----------------|---------------|
| **방식 1. Worker DB 접근** | 강함 (실시간 검증) | DB 연결 필요 |
| 방식 2. Payload 스냅샷 | 약함 (스냅샷 위조 가능) | 독립적 |

본 설계는 **검증 방식 1 (Worker DB 접근)**을 채택. Worker에 DB 접근 권한 부여 필요.

> ⚠️ Worker에 DB 접근이 어려운 환경이면, API가 job payload에 `fileUrl + metadataSnapshot`을 함께 넣는 검증 방식 2로 대체 가능. 다만 이중 검증 강도가 약해짐.

**운영 전제 (검증 방식 1 채택 시)**
- Worker는 **read-only DB credential** 사용
- 커넥션 풀 상한을 낮게 설정 (예: 5~10), burst는 queue concurrency로 제한
- 네트워크 ACL / 보안그룹에서 Worker→DB 접근 허용 필요

**Circuit Breaker (★ P1 운영 안정성)**

DB 장애 시 Worker 보호를 위해 circuit breaker 패턴 도입 권장:

| 항목 | 권장값 | 비고 |
|------|--------|------|
| failure threshold | 5회 연속 | OPEN 전환 조건 |
| reset timeout | 30초 | HALF-OPEN 전환 대기 |
| success threshold | 2회 연속 | CLOSED 복귀 조건 |

```typescript
// Circuit breaker 상태
enum CircuitState { CLOSED, OPEN, HALF_OPEN }

// OPEN 상태에서 filesService 호출 시
if (circuitBreaker.state === CircuitState.OPEN) {
  throw new DomainError('SERVICE_UNAVAILABLE', 'DB 접근 일시 중단');
}
```

> ⚠️ **OPEN 시 처리**: Job을 FAILED 처리하지 않고 **Bull의 자동 재시도**에 위임. DB 복구 후 재처리됨.

**Worker DB 접근 범위 (★ 명시)**
| 테이블 | 컬럼 | 용도 |
|--------|------|------|
| `files` | `id`, `url`, `metadata` | 파일 조회 + 출처 검증 |

> `files.metadata` 내 사용 필드: `generatedBy`, `editSessionId`

---

## 2. 데이터 구조 및 용어 정의

### 2.1 templateType (레이아웃 구조)

```typescript
enum TemplateType {
  WING = 'wing',      // 날개 (표지의 접히는 부분)
  COVER = 'cover',    // 표지 (앞/뒤)
  SPINE = 'spine',    // 책등
  PAGE = 'page',      // 내지 (본문)
}
```

### 2.2 pageTypes (출력 분류) - ★ 권장

**templateType** (레이아웃 구조)
- 값: `'wing'` | `'cover'` | `'spine'` | `'page'`
- 용도: 각 페이지의 물리적 레이아웃 구조 정의

**PageTypes** (출력 분류 배열)
- 타입: `Array<'cover' | 'content'>`
- 용도: PDF 분리 시 cover.pdf / content.pdf 구분
- `pageTypes[i]`는 반드시 `'cover'` 또는 `'content'` 중 하나

> ⚠️ **용어 혼동 주의**: `cover`(templateType)와 `cover`(pageTypes)는 이름이 같지만 의미가 다르다.
> - templateType: 페이지 구조 (`wing`, `cover`, `spine`, `page`)
> - pageTypes: 출력 분류 (`cover`, `content`)
>
> `content`는 templateType으로 사용하지 않음 (도메인 혼용 방지)

**pageTypeMap (deprecated)**
- 객체 방식 `{ [index: number]: 'cover' | 'content' }` 는 하위호환용으로만 유지
- 신규 구현에서는 `pageTypes` 배열 사용 필수

### 2.3 분류 로직

```
templateType === 'page' → pageTypes[i] = 'content'
templateType !== 'page' → pageTypes[i] = 'cover'  // wing, cover, spine 포함
```

| 출력 파일 | templateType | 포함 요소 |
|-----------|-------------|-----------|
| **cover.pdf** | `wing`, `cover`, `spine` | 날개, 표지, 책등 |
| **content.pdf** | `page` | 내지 (본문) |

---

## 3. 핵심 리스크 및 해결책

### 3.1 리스크 #1: PDF 페이지 순서 불일치

**문제**
- API에서 pages가 sortOrder로 정렬되지 않음 (PK/생성순)
- PDF export는 sortOrder 기준으로 렌더링
- "배열 인덱스 == PDF 페이지 인덱스" 가정이 깨짐

**해결책 (★ pageTypes 배열 기반)**
```typescript
// 1. sortOrder ASC 기준으로 정렬 후 pageTypes 배열 생성
const sortedPages = [...session.pages].sort((a, b) => a.sortOrder - b.sortOrder);
const pageTypes: PageTypes = sortedPages.map(page =>
  page.templateType === TemplateType.PAGE ? 'content' : 'cover'
);

// 2. Worker에서 검증 (배열 길이 == PDF 페이지 수)
if (pageTypes.length !== pdfDoc.getPageCount()) {
  throw new DomainError('PAGE_COUNT_MISMATCH', '페이지 수 불일치', {
    expected: pageTypes.length,
    got: pdfDoc.getPageCount(),
  });
}
```

→ **배열 방식으로 "배열 인덱스 == PDF 페이지 인덱스" 자연스럽게 보장**

### 3.2 리스크 #2: pageTypes 누락/잘못된 값

**문제**
- 객체 방식(pageTypeMap)은 undefined 누락이 조용히 통과
- 잘못된 타입 값도 감지하기 어려움

**해결책 (★ 배열 방식의 장점)**
```typescript
// 배열은 길이로 완전성 자연스럽게 강제
if (pageTypes.length !== totalPages) {
  throw new DomainError('PAGETYPEMAP_INCOMPLETE', 'pageTypes 길이 불일치');
}

// 각 요소의 타입 검증
pageTypes.forEach((type, i) => {
  if (type !== 'cover' && type !== 'content') {
    throw new DomainError('PAGETYPEMAP_INVALID_VALUE', `잘못된 타입: ${type}`, { index: i });
  }
});
```

→ **배열 방식은 누락 불가능, 검증도 단순화**

### 3.3 리스크 #3: 외부 PDF 유입

**문제**
- pdfUrl이 열려 있으면 외부 URL 유입 가능

**해결책 (권장)**
- 기본 입력은 `pdfFileId` 중심
- `files.metadata`에 발급자/출처 서명 검증

```typescript
// files 테이블 metadata 예시
{
  generatedBy: 'editor',
  editSessionId: 'uuid',
  exportVersion: '1.0'
}

// 검증
if (file.metadata?.generatedBy !== 'editor') {
  throw new BadRequestException({ code: 'PDF_NOT_FROM_EDITOR' });
}
```

→ **"편집기 산출물만 처리"를 기술적으로 보장**

---

## 4. JobType 전략 (★ 결정)

### 채택: synthesis 타입 유지 + mode 분기

> 신규 job_type 추가 대신, 기존 `synthesis` 타입에 `mode` 필드로 분기하는 전략

| 항목 | 기존 | 신규 |
|------|------|------|
| job_type | `synthesis` | `synthesis` (동일) |
| mode | 없음 (기본 merge) | `options.mode = 'split'` |
| 엔드포인트 | `/synthesize` | `/split-synthesize` |

**mode 단일 진실 공급원 (★ 필수)**

| 저장소 | 필드 | 용도 | Worker 분기 기준 |
|--------|------|------|------------------|
| **Queue payload** | `job.data.mode` | 실행 분기 | **✅ 유일한 기준** |
| DB (worker_jobs) | `options.mode` | 관리/조회용 | ❌ 참조 안 함 |

> ⚠️ **규칙**: `handleSynthesis()`는 **오직 Queue payload의 `job.data.mode`만 신뢰**한다. DB의 `options.mode`는 관리자 조회/통계 용도이며, Worker 실행 분기에 관여하지 않는다.

```typescript
// ✅ 올바른 분기
@Process('synthesize-pdf')
async handleSynthesis(job: Job<SynthesisJobData>) {
  const { mode } = job.data;  // Queue payload만 신뢰

  if (mode === 'split') {
    return this.handleSplitSynthesis(job);
  }
  // mode가 없거나 'merge'면 기존 로직
  return this.handleMergeSynthesis(job);
}
```

**장점**
- DB enum/마이그레이션 불필요
- 기존 프로세서/큐 구조 재사용
- 운영 부담 최소화

→ **DB enum, 마이그레이션, 운영 복잡도 제거**

---

## 5. API 설계

### 5.1 엔드포인트

```
POST /worker-jobs/split-synthesize
```

### 5.2 요청 DTO (★ v1.1+ 기준으로 변경됨)

```typescript
interface CreateSplitSynthesisJobDto {
  // 필수 (★ 모두 required)
  sessionId: string;           // EditSession ID
  pdfFileId: string;           // 업로드된 PDF 파일 ID (pdfUrl 완전 제거)
  requestId: string;           // 멱등성 키 (클라이언트 UUID 생성, 아래 규칙 참고)

  // 옵션
  outputFormat?: 'merged' | 'separate';  // 기본값: 'merged'
  alsoGenerateMerged?: boolean;          // separate일 때 merged도 생성 (기본: false)
  callbackUrl?: string;
  priority?: 'high' | 'normal' | 'low';
}
```

> ⚠️ **pdfUrl 완전 제거** - "API 계약 자체가 안전"하게

**멱등성 규칙 (★ requestId)**

| 규칙 | 설명 |
|------|------|
| 키 조합 | `(sessionId, pdfFileId, requestId)` unique |
| 재호출 시 | 동일 키 조합이면 **기존 job 반환** (새로 생성 안 함) |
| 옵션 변경 시 | **새 requestId를 발급**해야 함 (옵션 변경이 무시되므로) |

> ⚠️ **클라이언트 주의**: 같은 requestId로 `outputFormat`이나 `alsoGenerateMerged`를 바꿔 호출해도 **기존 job이 그대로 반환**됨. 옵션을 변경하려면 반드시 새 requestId를 생성해야 함.

```typescript
// ✅ 올바른 사용 예시
const requestId1 = uuidv4();
await createJob({ sessionId, pdfFileId, requestId: requestId1, outputFormat: 'merged' });

// 옵션 변경 시 새 requestId
const requestId2 = uuidv4();
await createJob({ sessionId, pdfFileId, requestId: requestId2, outputFormat: 'separate' });
```

### 5.3 응답

**Job 생성 응답**
```typescript
interface WorkerJob {
  id: string;
  type: 'synthesis';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  sessionId: string;
  pdfFileId: string;
  requestId: string;
  options: {
    mode: 'split';
    pageTypes: PageTypes;
    // ...
  };
}
```

**완료 결과 (★ 필드 존재 조건)**
```typescript
interface SynthesisResult {
  success: boolean;
  totalPages: number;

  // merged가 생성/업로드된 경우에만 존재
  // - outputFormat='merged' → 항상 존재
  // - outputFormat='separate' + alsoGenerateMerged=true → 존재
  // - outputFormat='separate' + alsoGenerateMerged=false → 없음
  outputFileUrl?: string;

  // separate인 경우에만 존재
  // - outputFormat='separate' → 항상 존재
  // - outputFormat='merged' → 없음
  outputFiles?: Array<{ type: 'cover' | 'content'; url: string }>;
}
```

### 5.4 저장 경로 및 URL 반환 규칙 (★ 강제)

**storageKeyBase 정의 (★ 혼동 방지)**

```typescript
// storageKeyBase = 스토리지 내부 key prefix (슬래시 없이 시작)
const storageKeyBase = `outputs/${jobId}`;  // ✅ 올바름
// const storageKeyBase = `/storage/outputs/${jobId}`;  // ⛔ 금지

// 외부 반환 URL은 항상 '/storage/' 프리픽스 추가
const outputFileUrl = `/storage/${storageKeyBase}/merged.pdf`;
```

| 변수 | 예시 | 용도 |
|------|------|------|
| `storageKeyBase` | `outputs/{jobId}` | 스토리지 내부 key prefix (슬래시 없이 시작) |
| `outputFileUrl` | `/storage/outputs/{jobId}/merged.pdf` | 외부 반환 URL (/storage 프리픽스 포함) |

> ⚠️ **규칙**: `storageKeyBase`에 `/storage` prefix 넣기 **금지**. 외부 URL 생성 시에만 `/storage/` 추가.

**파일 네이밍 규칙 (고정)**
| 파일 | 스토리지 경로 | 외부 URL |
|------|------|-----|
| merged | `outputs/{jobId}/merged.pdf` | `/storage/outputs/{jobId}/merged.pdf` |
| cover | `outputs/{jobId}/cover.pdf` | `/storage/outputs/{jobId}/cover.pdf` |
| content | `outputs/{jobId}/content.pdf` | `/storage/outputs/{jobId}/content.pdf` |

> ⚠️ **네이밍 고정**: `merged.pdf`, `cover.pdf`, `content.pdf` 이외의 파일명 사용 금지

**outputFiles 배열 순서 (★ 강제)**
```typescript
// 항상 cover → content 순서 (고정)
result.outputFiles = [
  { type: 'cover', url: `/storage/outputs/${jobId}/cover.pdf` },
  { type: 'content', url: `/storage/outputs/${jobId}/content.pdf` },
];
```

> ⚠️ **순서 보장**: 클라이언트가 인덱스 기반으로 접근할 수 있도록 `cover` → `content` 순서 고정. 런타임 정렬 금지.

**outputFormat/alsoGenerateMerged 기본값 규칙 (★ API-Worker 동일)**

| 필드 | 기본값 | 적용 시점 |
|------|--------|----------|
| `outputFormat` | `'merged'` | API에서만 적용 |
| `alsoGenerateMerged` | `false` | API에서만 적용 |

> ⚠️ **Worker 규칙**:
> - Worker는 outputFormat/alsoGenerateMerged에 대해 **"기본값을 다시 적용"하지 않는다**.
> - Worker는 payload의 값을 그대로 신뢰하되, **"옵션 조합 검증만"** 수행한다.
> - API가 기본값을 적용한 후 payload에 담아 전달하므로, Worker에서 `|| 'merged'` 같은 fallback 금지.

---

## 6. 타입 정의

### 6.1 packages/types/src/index.ts 추가

```typescript
/**
 * 페이지 타입 배열 (★ v1.1+ 권장: 객체 대신 배열 사용)
 * - 길이 == totalPages로 완전성 자연스럽게 강제
 * - 검증이 pageTypes.length !== totalPages로 단순화
 * - 누락 불가능 (배열은 인덱스 존재)
 */
export type PageTypes = Array<'cover' | 'content'>;

// 하위호환용 (객체 방식, 권장하지 않음)
export interface PageTypeMap {
  [pageIndex: number]: 'cover' | 'content';
}

/**
 * 분리 결과 (내부용)
 */
export interface SplitResult {
  coverPath: string;
  contentPath: string;
  coverPageCount: number;
  contentPageCount: number;
}

/**
 * Worker Job Payload (★ v1.1.3 기준)
 */
export interface SplitSynthesisJobData {
  jobId: string;
  mode: 'split';               // ★ 필수: handleSynthesis() 분기 기준
  sessionId: string;           // ★ 이중 검증용
  pdfFileId: string;           // ★ pdfUrl 대신 fileId (Worker가 조회)
  pageTypes: PageTypes;        // ★ 배열 방식 권장
  totalExpectedPages: number;
  outputFormat: 'merged' | 'separate';
  alsoGenerateMerged?: boolean;
}
```

---

## 7. 서비스 구현

### 7.1 worker-jobs.service.ts (★ v1.1+ 기준)

```typescript
async createSplitSynthesisJob(dto: CreateSplitSynthesisJobDto): Promise<WorkerJob> {
  // 0. ★ 멱등성 체크 (requestId required)
  // DB unique 인덱스: (session_id, pdf_file_id, request_id)
  const existingJob = await this.workerJobRepository.findOne({
    where: { sessionId: dto.sessionId, pdfFileId: dto.pdfFileId, requestId: dto.requestId },
  });
  if (existingJob) return existingJob;

  // 0-1. ★ 옵션 조합 검증 (P0)
  if (dto.outputFormat === 'merged' && dto.alsoGenerateMerged === true) {
    throw new BadRequestException({
      code: 'INVALID_OUTPUT_OPTIONS',
      message: "outputFormat='merged' 일 때 alsoGenerateMerged는 사용할 수 없습니다.",
    });
  }

  // 1. EditSession 조회
  const session = await this.editSessionService.findById(dto.sessionId);
  if (!session) {
    throw new NotFoundException({
      code: 'SESSION_NOT_FOUND',
      message: 'EditSession을 찾을 수 없습니다.',
    });
  }

  // 2. PDF 파일 조회 + 검증 (★ pdfUrl 제거, pdfFileId로 조회)
  const file = await this.filesService.findById(dto.pdfFileId);
  if (!file) {
    throw new NotFoundException({ code: 'FILE_NOT_FOUND' });
  }

  // 2-1. ★ 편집기 산출물 검증
  if (file.metadata?.generatedBy !== 'editor') {
    throw new BadRequestException({
      code: 'PDF_NOT_FROM_EDITOR',
      message: '편집기에서 생성된 PDF만 지원합니다.',
    });
  }

  // 2-2. ★ session-file 일치 검증 (400, 계약 위반)
  if (file.metadata?.editSessionId !== dto.sessionId) {
    throw new BadRequestException({
      code: 'SESSION_FILE_MISMATCH',
      message: '세션과 파일이 일치하지 않습니다.',
    });
  }

  // 3. ★ 빈 세션 검증 (pages 존재 확인)
  if (!session.pages || session.pages.length === 0) {
    throw new UnprocessableEntityException({
      code: 'EMPTY_SESSION_PAGES',
      message: '세션에 페이지가 없습니다.',
    });
  }

  // 3-1. ★ sortOrder 무결성 검증 (중복/누락/타입/연속성 오류 방어)
  const sortOrders = session.pages.map(p => p.sortOrder);
  const n = sortOrders.length;

  // 검증 조건:
  // 1. 모든 값이 정수
  // 2. 모든 값이 0 이상
  // 3. 중복 없음 (Set 크기 == 배열 길이)
  // 4. ★ 연속성: min === 0, max === n-1 (0..n-1 범위 강제)
  const allIntegers = sortOrders.every(o => typeof o === 'number' && Number.isInteger(o) && o >= 0);
  const uniqueSet = new Set(sortOrders);
  const noDuplicates = uniqueSet.size === n;
  const minOrder = Math.min(...sortOrders);
  const maxOrder = Math.max(...sortOrders);
  const isContiguous = minOrder === 0 && maxOrder === n - 1;  // ★ 연속성 강제

  if (!allIntegers || !noDuplicates || !isContiguous) {
    throw new UnprocessableEntityException({
      code: 'INVALID_SORT_ORDER',
      message: 'sortOrder가 유효하지 않습니다 (중복/누락/비정수/비연속).',
    });
  }

  // 4. sortOrder ASC 기준으로 정렬 (★ 연속성 강제로 동률 불가능, 2차키 불필요)
  const sortedPages = [...session.pages].sort((a, b) => a.sortOrder - b.sortOrder);

  // 5. ★ pageTypes 배열 생성 (객체 대신 배열 권장)
  const pageTypes: PageTypes = sortedPages.map(page =>
    page.templateType === TemplateType.PAGE ? 'content' : 'cover'
  );

  // 6. cover/content 존재성 검증
  if (!pageTypes.includes('cover')) {
    throw new UnprocessableEntityException({
      code: 'NO_COVER_PAGES',
      message: '표지 페이지가 없습니다.',
    });
  }
  if (!pageTypes.includes('content')) {
    throw new UnprocessableEntityException({
      code: 'NO_CONTENT_PAGES',
      message: '내지 페이지가 없습니다.',
    });
  }

  // 7. WorkerJob 생성 (★ pdfUrl 대신 pdfFileId + sessionId)
  const job = this.workerJobRepository.create({
    type: 'synthesis',
    status: 'PENDING',
    sessionId: dto.sessionId,      // ★ 이중 검증용
    pdfFileId: dto.pdfFileId,      // ★ Worker가 조회
    requestId: dto.requestId,      // ★ 멱등성 키
    options: {
      mode: 'split',
      pageTypes,                   // ★ 배열 방식
      totalExpectedPages: sortedPages.length,
      outputFormat: dto.outputFormat ?? 'merged',           // ★ ?? 사용 (빈 문자열 방어)
      alsoGenerateMerged: dto.alsoGenerateMerged ?? false, // ★ ?? 사용
    },
    callbackUrl: dto.callbackUrl,
  });

  // ★ Race condition 방어: unique violation 시 기존 job 반환
  try {
    await this.workerJobRepository.save(job);
  } catch (error) {
    // DB 중립적 처리: MySQL=ER_DUP_ENTRY, Postgres=23505 등
    if (this.isUniqueViolation(error)) {
      const existing = await this.workerJobRepository.findOne({
        where: { sessionId: dto.sessionId, pdfFileId: dto.pdfFileId, requestId: dto.requestId },
      });
      if (existing) return existing;
    }
    throw error;
  }

  // 8. Bull Queue에 추가 (★ pdfFileId 전달, pdfUrl 없음)
  await this.synthesisQueue.add('synthesize-pdf', {
    jobId: job.id,
    mode: 'split',                 // ★ 필수: handleSynthesis()에서 분기 기준
    sessionId: dto.sessionId,
    pdfFileId: dto.pdfFileId,
    pageTypes,
    totalExpectedPages: sortedPages.length,
    outputFormat: dto.outputFormat ?? 'merged',           // ★ ?? 사용
    alsoGenerateMerged: dto.alsoGenerateMerged ?? false, // ★ ?? 사용
  }, {
    priority: this.getPriorityValue(dto.priority),
  });

  return job;
}
```

### 7.2 synthesis.processor.ts (★ v1.1+ 기준)

```typescript
@Process('synthesize-pdf')
async handleSynthesis(job: Job<SynthesisJobData>) {
  const { mode } = job.data;

  if (mode === 'split') {
    return this.handleSplitSynthesis(job);
  }

  // 기존 merge 로직
  return this.handleMergeSynthesis(job);
}

/**
 * 분리 합성 처리 (★ v1.1+ 기준)
 */
private async handleSplitSynthesis(job: Job<SplitSynthesisJobData>) {
  const { jobId, sessionId, pdfFileId, pageTypes, totalExpectedPages, outputFormat, alsoGenerateMerged } = job.data;

  // ★ jobId scoped temp 디렉토리 (동시 작업 안정성)
  const jobTempDir = path.join(this.storagePath, `temp_${jobId}`);

  try {
    await this.updateJobStatusWithRetry(jobId, { status: 'PROCESSING' });

    // 0. ★ 옵션 조합 검증 (Worker 최종 방어선)
    if (outputFormat === 'merged' && alsoGenerateMerged === true) {
      throw new DomainError('INVALID_OUTPUT_OPTIONS', "outputFormat='merged' 일 때 alsoGenerateMerged는 사용할 수 없습니다");
    }

    // 0-1. ★ 임시 디렉토리 클린 시작 (재처리/리플레이 안전)
    await fs.rm(jobTempDir, { recursive: true, force: true });
    await fs.mkdir(jobTempDir, { recursive: true });

    // 1. ★ 파일 조회 + 이중 검증 (Worker 최종 방어선)
    const file = await this.filesService.findById(pdfFileId);
    if (!file) {
      throw new DomainError('FILE_NOT_FOUND', '파일을 찾을 수 없습니다');
    }
    if (file.metadata?.generatedBy !== 'editor') {
      throw new DomainError('PDF_NOT_FROM_EDITOR', '편집기 산출물이 아닙니다');
    }
    if (file.metadata?.editSessionId !== sessionId) {
      throw new DomainError('SESSION_FILE_MISMATCH', '세션-파일 불일치');
    }

    // 2. PDF 다운로드 (예외 래핑)
    let pdfBytes: Uint8Array;
    try {
      pdfBytes = await this.downloadFile(file.url);
    } catch (error) {
      throw new DomainError('FILE_DOWNLOAD_FAILED', '파일 다운로드 실패', { url: file.url, cause: error.message });
    }

    // 3. PDF 로드 (예외 래핑)
    let pdfDoc: PDFDocument;
    try {
      pdfDoc = await PDFDocument.load(pdfBytes);
    } catch (error) {
      throw new DomainError('PDF_LOAD_FAILED', 'PDF 로드 실패 (암호화/손상/지원불가)', { cause: error.message });
    }
    const totalPages = pdfDoc.getPageCount();

    // 3. ★ 페이지 수 검증
    if (totalPages !== totalExpectedPages) {
      throw new DomainError('PAGE_COUNT_MISMATCH', '페이지 수 불일치', {
        expected: totalExpectedPages,
        got: totalPages,
      });
    }

    // 4. ★ pageTypes 배열 길이 검증 (배열 방식의 장점)
    if (pageTypes.length !== totalPages) {
      throw new DomainError('PAGETYPEMAP_INCOMPLETE', 'pageTypes 길이 불일치');
    }

    // 5. 페이지 인덱스 분류
    const coverIndices: number[] = [];
    const contentIndices: number[] = [];

    pageTypes.forEach((type, i) => {
      if (type === 'cover') {
        coverIndices.push(i);
      } else if (type === 'content') {
        contentIndices.push(i);
      } else {
        throw new DomainError('PAGETYPEMAP_INVALID_VALUE', `잘못된 타입: ${type}`, { index: i });
      }
    });

    // 5-1. ★ cover/content 비어있음 검증 (Worker 최종 방어선)
    if (coverIndices.length === 0) {
      throw new DomainError('NO_COVER_PAGES', '표지 페이지가 없습니다');
    }
    if (contentIndices.length === 0) {
      throw new DomainError('NO_CONTENT_PAGES', '내지 페이지가 없습니다');
    }

    // 6. PDF 분리 (★ jobTempDir 사용)
    const splitResult = await this.synthesizerService.splitPdfByIndices(
      pdfDoc,
      coverIndices,
      contentIndices,
      jobTempDir,  // ★ jobId scoped
    );

    // 7. ★ 무결성 검증 (Strong Should)
    await this.verifySplitResult(splitResult, coverIndices.length, contentIndices.length);

    // 8. 스토리지 업로드 (★ outputFormat 계약 일치)
    const storageKeyBase = `outputs/${jobId}`;
    await fs.mkdir(path.join(this.outputsPath, jobId), { recursive: true });

    const result: SynthesisResult = {
      success: true,
      totalPages,
    };

    if (outputFormat === 'merged') {
      // ★ merged만 업로드, cover/content는 업로드 X
      const mergedPath = path.join(jobTempDir, 'merged.pdf');
      await mergePdfs([splitResult.coverPath, splitResult.contentPath], mergedPath);

      const mergedStoragePath = path.join(this.outputsPath, jobId, 'merged.pdf');
      await fs.copyFile(mergedPath, mergedStoragePath);
      result.outputFileUrl = `/storage/${storageKeyBase}/merged.pdf`;

    } else if (outputFormat === 'separate') {
      // ★ cover/content 업로드
      const coverStoragePath = path.join(this.outputsPath, jobId, 'cover.pdf');
      const contentStoragePath = path.join(this.outputsPath, jobId, 'content.pdf');

      await fs.copyFile(splitResult.coverPath, coverStoragePath);
      await fs.copyFile(splitResult.contentPath, contentStoragePath);

      result.outputFiles = [
        { type: 'cover', url: `/storage/${storageKeyBase}/cover.pdf` },
        { type: 'content', url: `/storage/${storageKeyBase}/content.pdf` },
      ];

      // ★ alsoGenerateMerged일 때만 merged 생성
      if (alsoGenerateMerged) {
        const mergedPath = path.join(jobTempDir, 'merged.pdf');
        await mergePdfs([splitResult.coverPath, splitResult.contentPath], mergedPath);

        const mergedStoragePath = path.join(this.outputsPath, jobId, 'merged.pdf');
        await fs.copyFile(mergedPath, mergedStoragePath);
        result.outputFileUrl = `/storage/${storageKeyBase}/merged.pdf`;
      }
    }

    // 9. 완료 처리 (★ 재시도 + DLQ)
    await this.updateJobStatusWithRetry(jobId, {
      status: 'COMPLETED',
      result,
    });

    return result;
  } catch (error) {
    const domainError = error instanceof DomainError ? error : new DomainError('INTERNAL_ERROR', error.message);
    // ★ FAILED도 재시도 + DLQ 대상 (상태 유실 방지)
    await this.updateJobStatusWithRetry(jobId, {
      status: 'FAILED',
      errorCode: domainError.code,
      errorMessage: domainError.message,
      errorDetail: domainError.detail,
    });
    throw error;
  } finally {
    // ★ cleanup은 jobId scoped temp 디렉토리만 삭제 (동시 작업 안전)
    await this.cleanupJobTempDir(jobTempDir);
  }
}

/**
 * ★ 무결성 검증 (P0 필수, 비용 감수)
 *
 * 트레이드오프 결정:
 * - 비용: PDF 재로딩으로 인한 I/O 2회 추가 (cover + content)
 * - 이득: 손상/불완전 PDF가 클라이언트에 전달되는 것 방지
 *
 * 이 검증은 P0 필수 항목으로, 성능보다 안정성을 우선한다.
 * PDF 분리 라이브러리(pdf-lib)의 silent failure 가능성 대비.
 */
private async verifySplitResult(result: SplitResult, expectedCover: number, expectedContent: number) {
  // 파일 크기 체크
  const coverStats = await fs.stat(result.coverPath);
  const contentStats = await fs.stat(result.contentPath);
  if (coverStats.size === 0 || contentStats.size === 0) {
    throw new DomainError('EMPTY_OUTPUT_FILE', '출력 파일이 비어있습니다');
  }

  // 재로딩 + 페이지 수 확인 (★ 로드 실패도 래핑)
  let coverDoc: PDFDocument;
  let contentDoc: PDFDocument;

  // ★ 세분화된 errorDetail: phase + target으로 재처리 판단 가속
  try {
    coverDoc = await PDFDocument.load(await fs.readFile(result.coverPath));
  } catch (error) {
    throw new DomainError('SPLIT_VERIFICATION_FAILED', 'cover.pdf 재로딩 실패', {
      phase: 'load',
      target: 'cover',
      cause: error.message,
    });
  }

  try {
    contentDoc = await PDFDocument.load(await fs.readFile(result.contentPath));
  } catch (error) {
    throw new DomainError('SPLIT_VERIFICATION_FAILED', 'content.pdf 재로딩 실패', {
      phase: 'load',
      target: 'content',
      cause: error.message,
    });
  }

  if (coverDoc.getPageCount() !== expectedCover) {
    throw new DomainError('SPLIT_VERIFICATION_FAILED', 'cover 페이지 수 불일치', {
      phase: 'pageCount',
      target: 'cover',
      expected: expectedCover,
      got: coverDoc.getPageCount(),
    });
  }
  if (contentDoc.getPageCount() !== expectedContent) {
    throw new DomainError('SPLIT_VERIFICATION_FAILED', 'content 페이지 수 불일치', {
      phase: 'pageCount',
      target: 'content',
      expected: expectedContent,
      got: contentDoc.getPageCount(),
    });
  }
}

/**
 * ★ jobId scoped temp 디렉토리 정리
 */
private async cleanupJobTempDir(jobTempDir: string) {
  try {
    await fs.rm(jobTempDir, { recursive: true, force: true });
  } catch {
    this.logger.warn(`Failed to cleanup temp dir: ${jobTempDir}`);
  }
}
```

### 7.3 pdf-synthesizer.service.ts (★ v1.1+ 기준)

```typescript
/**
 * PDF 문서에서 인덱스 기반으로 페이지 분리
 * ★ pdfDoc을 직접 받아 I/O 최소화
 * ★ jobTempDir로 jobId scoped 임시 파일 (동시 작업 안전)
 */
async splitPdfByIndices(
  pdfDoc: PDFDocument,
  coverIndices: number[],
  contentIndices: number[],
  jobTempDir: string,  // ★ 추가: jobId scoped temp 디렉토리
): Promise<SplitResult> {
  // 표지 PDF 생성
  const coverDoc = await PDFDocument.create();
  const coverPages = await coverDoc.copyPages(pdfDoc, coverIndices);
  coverPages.forEach(page => coverDoc.addPage(page));

  const coverPath = path.join(jobTempDir, 'cover.pdf');  // ★ jobTempDir 사용
  await fs.writeFile(coverPath, await coverDoc.save());

  // 내지 PDF 생성
  const contentDoc = await PDFDocument.create();
  const contentPages = await contentDoc.copyPages(pdfDoc, contentIndices);
  contentPages.forEach(page => contentDoc.addPage(page));

  const contentPath = path.join(jobTempDir, 'content.pdf');  // ★ jobTempDir 사용
  await fs.writeFile(contentPath, await contentDoc.save());

  return {
    coverPath,
    contentPath,
    coverPageCount: coverIndices.length,
    contentPageCount: contentIndices.length,
  };
}
```

---

## 8. 에러 코드 및 HTTP 매핑 (★ v1.1+ 세분화)

### API 레벨 에러

| 에러 코드 | HTTP | 상황 |
|-----------|------|------|
| `SESSION_NOT_FOUND` | 404 | sessionId로 조회 실패 |
| `FILE_NOT_FOUND` | 404 | pdfFileId로 조회 실패 |
| `PDF_NOT_FROM_EDITOR` | 400 | generatedBy !== 'editor' |
| `SESSION_FILE_MISMATCH` | **400** | editSessionId !== dto.sessionId (★ 계약 위반) |
| `INVALID_OUTPUT_OPTIONS` | **400** | outputFormat='merged' + alsoGenerateMerged=true (★ 옵션 조합 오류) |
| `USER_FILE_MISMATCH` | **403** | 사용자 권한 위반 (★ API 전용, Worker는 처리 안 함) |
| `EMPTY_SESSION_PAGES` | **422** | session.pages가 0개 (★ 빈 세션) |
| `INVALID_SORT_ORDER` | **422** | sortOrder 중복/비정수/비연속 (★ 0..n-1 연속성 필수) |
| `NO_COVER_PAGES` | 422 | 표지 페이지 없음 |
| `NO_CONTENT_PAGES` | 422 | 내지 페이지 없음 |

> ★ `USER_FILE_MISMATCH`는 API에서만 발생. Worker는 "출처/세션 정합성"까지만 검증 (전제: Worker job payload는 API가 생성)

### Worker 레벨 에러 (PAGETYPEMAP_MISMATCH 세분화)

> Worker는 HTTP를 직접 반환하지 않음. "운영 분류"는 API 조회 시 참고용 권장 성격.

| 에러 코드 | 운영 분류 (참고) | 상황 |
|-----------|-------------|------|
| `INVALID_OUTPUT_OPTIONS` | 400 | merged + alsoGenerateMerged=true (★ Worker 이중 검증) |
| `NO_COVER_PAGES` | 422 | coverIndices 빈 배열 (★ Worker 이중 검증) |
| `NO_CONTENT_PAGES` | 422 | contentIndices 빈 배열 (★ Worker 이중 검증) |
| `PAGE_COUNT_MISMATCH` | 400 | expectedPages vs pdfPages 불일치 |
| `PAGETYPEMAP_INCOMPLETE` | 400 | pageTypes.length !== totalPages |
| `PAGETYPEMAP_INVALID_VALUE` | 400 | cover/content 외 값 |

> ⚠️ **에러코드 네이밍 주의**: `PAGETYPEMAP_*` 코드는 역사적 이유로 유지됨 (과거 객체 기반 pageTypeMap 사용). 현재는 배열 기반 `pageTypes`를 사용하지만, **에러코드 변경 시 하위호환 파괴**되므로 유지.

**내부-외부 에러코드 매핑 (P1 권장)**

코드 가독성을 위해 내부적으로는 `PAGETYPES_*`를 사용하고, 외부 저장/웹훅 시 `PAGETYPEMAP_*`로 변환하는 매핑 레이어 도입 권장:

```typescript
// 내부 코드 (가독성)
const INTERNAL_ERROR_CODES = {
  PAGETYPES_INCOMPLETE: 'PAGETYPEMAP_INCOMPLETE',
  PAGETYPES_INVALID_VALUE: 'PAGETYPEMAP_INVALID_VALUE',
} as const;

// 외부 저장 시 변환
const externalCode = INTERNAL_ERROR_CODES[internalCode] ?? internalCode;
```
| `PAGE_STRUCTURE_CHANGED` | 400 | sortedPageIdsHash 불일치 (도입 시) |
| `PDF_TAMPERED` | 400 | pdfSha256 불일치 (도입 시) |
| `FILE_DOWNLOAD_FAILED` | 502 | 스토리지 다운로드 실패/타임아웃 (★ 운영 모니터링) |
| `PDF_LOAD_FAILED` | 422 | PDF 로드 실패 (암호화/손상/지원불가) |
| `SPLIT_VERIFICATION_FAILED` | 500 | 분리 결과 재로딩/페이지수 불일치 |
| `EMPTY_OUTPUT_FILE` | 500 | 0 byte 파일 |
| `INTERNAL_ERROR` | 500 | 알 수 없는 오류 |

### 웹훅 실패 페이로드 (★ DomainError 표준)

```typescript
{
  event: 'synthesis.failed',
  jobId: '...',
  status: 'failed',
  code: 'PAGE_COUNT_MISMATCH',       // ★ 세분화된 코드
  message: '페이지 수 불일치',
  detail: { expected: 14, got: 10 }, // ★ 추가 정보
  timestamp: '...'
}
```

### updateJobStatus 시그니처 (★ Worker → API 내부 계약)

```typescript
/**
 * Worker가 API에 상태 업데이트 요청
 * PATCH /api/worker-jobs/:jobId/status
 */
interface UpdateJobStatusPayload {
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';

  // COMPLETED일 때 (★ result만 유지, 중복 필드 제거)
  result?: SynthesisResult;  // outputFileUrl/outputFiles 포함

  // FAILED일 때
  errorCode?: string;       // DomainError.code (예: 'PAGE_COUNT_MISMATCH')
  errorMessage?: string;    // DomainError.message (예: '페이지 수 불일치')
  errorDetail?: object;     // DomainError.detail (예: { expected: 14, got: 10 })

  // 디버깅용
  queueJobId?: string;      // Bull queue job ID
}
```

> ★ **내부/외부 계약 구분**
> - **Worker→API (내부)**: `result`로만 전달, 중복 필드 금지
> - **API→Webhook (외부)**: 기존 호환을 위해 `outputFileUrl`/`outputFiles`를 루트 필드로 유지

### updateJobStatus 재시도 정책 (★ P0 신뢰성)

상태 업데이트 실패로 인한 Job 유실 방지를 위해 재시도 정책을 강제한다.

**호출 규약 (★ 강제)**

Worker→API는 **payload 객체 형태**로만 호출. 포지션 파라미터 **금지**.

| 상태 | 호출 형태 |
|------|----------|
| PROCESSING | `updateJobStatusWithRetry(jobId, { status: 'PROCESSING' })` |
| COMPLETED | `updateJobStatusWithRetry(jobId, { status: 'COMPLETED', result })` |
| FAILED | `updateJobStatusWithRetry(jobId, { status: 'FAILED', errorCode, errorMessage, errorDetail })` |

> ⛔ 금지: `updateJobStatusWithRetry(jobId, 'PROCESSING')` (포지션 파라미터)

**재시도 정책**
| 항목 | 값 | 비고 |
|------|-----|------|
| 재시도 횟수 | 최대 3회 | 모든 상태 동일 |
| 재시도 지연 | 250ms → 1s → 3s | 지수 백오프 |
| 최종 실패 시 (P0) | ERROR 로그 | jobId, queueJobId, payload, error |
| 최종 실패 시 (P1) | DLQ/알림 | 운영 채널 통보 |

**적용 범위 (★ PROCESSING 정책 확정)**
| 상태 | 재시도 | 최종 실패 시 로그 | 최종 실패 시 DLQ (P1) |
|------|--------|-------------------|----------------------|
| PROCESSING | 3회 | O | **X** (노이즈 방지) |
| **COMPLETED** | 3회 | **O** | **O** (상태 유실 방지) |
| **FAILED** | 3회 | **O** | **O** (상태 유실 방지) |

**의도**
- Job은 처리됐는데 상태만 유실되는 상황 방지
- COMPLETED/FAILED는 완결 상태이므로 DLQ 대상
- PROCESSING은 일시적 상태이므로 DLQ에서 제외 (노이즈 방지)

### worker_jobs 테이블 에러 컬럼

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `error_code` | VARCHAR(50) | DomainError.code |
| `error_message` | VARCHAR(500) | DomainError.message |
| `error_detail` | JSON | DomainError.detail (nullable) |

### errorDetail 공통 필드 가이드 (★ P0)

Worker errorDetail은 아래 표준 필드**만** 사용한다. 추가 필드 도입 시 RFC 절차 필요.

**공통 허용 필드**
| 필드 | 타입 | 용도 | 필수 |
|------|------|------|------|
| `expected` | any | 기대값 | 선택 |
| `got` | any | 실제값 | 선택 |
| `index` | number | 문제 발생 인덱스 | 선택 |
| `cause` | string | 원인 메시지 (짧게, 100자 이내) | 선택 |
| `phase` | string | 실패 단계 (예: `'load'`, `'pageCount'`) | 선택 |
| `target` | string | 대상 파일 (예: `'cover'`, `'content'`) | 선택 |

**FILE_DOWNLOAD_FAILED 전용 필드**
| 필드 | 타입 | 설명 |
|------|------|------|
| `url` | string | 실패한 URL |
| `statusCode` | number | HTTP 상태 코드 (가능할 때) |
| `timeout` | boolean | 타임아웃 여부 |
| `retryable` | boolean | 재시도 가능 여부 힌트 |

**PDF_LOAD_FAILED 전용 필드**
| 필드 | 타입 | 값 |
|------|------|-----|
| `reason` | string | `'encrypted'` \| `'corrupted'` \| `'unsupported'` |

**금지 필드 (★ 강제)**
| 필드 | 이유 |
|------|------|
| `stack` | PII/민감정보/크기 |
| `error` | 전체 Error 객체 |
| `requestBody` | 요청 본문 |
| `responseBody` | 응답 본문 (외부 시스템) |

### 웹훅 페이로드 상세 (★ 완료/실패 구조)

**완료 (synthesis.completed)**
```typescript
{
  event: 'synthesis.completed',
  jobId: string,
  status: 'completed',
  outputFileUrl?: string,           // merged가 있을 때만
  outputFiles?: OutputFile[],       // separate일 때만
  outputFormat: 'merged' | 'separate',
  timestamp: string                 // ISO 8601
}
```

**실패 (synthesis.failed)**
```typescript
{
  event: 'synthesis.failed',
  jobId: string,
  status: 'failed',
  code: string,                     // error_code
  message: string,                  // error_message
  detail?: object,                  // error_detail (있을 때만)
  timestamp: string
}
```

---

## 9. 수정 대상 파일

### 타입/DTO

| 파일 | 수정 내용 |
|------|----------|
| `packages/types/src/index.ts` | PageTypes, SplitResult 타입 추가 |
| `apps/api/src/worker-jobs/dto/worker-job.dto.ts` | CreateSplitSynthesisJobDto 추가 + **옵션 조합 검증 (INVALID_OUTPUT_OPTIONS)** |
| `apps/api/src/worker-jobs/dto/update-job-status.dto.ts` | UpdateJobStatusDto 추가 (★ Worker→API 계약) |

### API/서비스

| 파일 | 수정 내용 |
|------|----------|
| `apps/api/src/worker-jobs/worker-jobs.controller.ts` | POST /split-synthesize 엔드포인트 추가 |
| `apps/api/src/worker-jobs/worker-jobs.service.ts` | createSplitSynthesisJob() 메서드 추가 |

### DB/엔티티 (★ 누락 방지)

| 파일 | 수정 내용 |
|------|----------|
| `apps/api/src/worker-jobs/entities/worker-job.entity.ts` | sessionId, pdfFileId, requestId, errorCode, errorMessage, errorDetail 컬럼 추가 + **unique index (session_id, pdf_file_id, request_id)** |
| `apps/api/src/migrations/*.ts` | worker_jobs 테이블 컬럼 마이그레이션 |

### Worker

| 파일 | 수정 내용 |
|------|----------|
| `apps/worker/src/services/pdf-synthesizer.service.ts` | splitPdfByIndices() 메서드 추가 |
| `apps/worker/src/processors/synthesis.processor.ts` | mode 분기 + handleSplitSynthesis() 추가 + **FILE_DOWNLOAD_FAILED/PDF_LOAD_FAILED 분리 + updateJobStatus 재시도 래퍼** |

### 릴리즈 주의사항

> ⚠️ **types 패키지 버전 bump 필요**
> - `packages/types` 수정 시 버전 bump 후 빌드 필수
> - API/Worker가 공통 types 패키지를 import하므로, 타입 변경 시 함께 배포해야 함
> - CI/CD에서 types → api → worker 순서로 빌드 의존성 보장 필요

---

## 10. 테스트 케이스

**정상 케이스**

| 케이스 | 입력 | 예상 결과 |
|--------|------|----------|
| 정상 분리 (BOOK, merged) | wing+cover+spine+page×8+cover+wing, outputFormat='merged' | outputFileUrl만 존재 |
| 정상 분리 (LEAFLET, separate) | cover+page×4+cover, outputFormat='separate' | outputFiles만 존재 |
| separate + merged 함께 | outputFormat='separate', alsoGenerateMerged=true | outputFileUrl + outputFiles 모두 |

**merged 모드 부작용 검증 (★ P0)**

| 케이스 | 검증 항목 | 예상 결과 |
|--------|----------|----------|
| merged 모드에서 outputFiles 없음 | result.outputFiles | `undefined`여야 함 |
| merged 모드에서 cover/content 미업로드 | 스토리지 `outputs/{jobId}/cover.pdf` | 파일 존재하지 않아야 함 |
| merged 모드에서 cover/content 미업로드 | 스토리지 `outputs/{jobId}/content.pdf` | 파일 존재하지 않아야 함 |

> ⚠️ **운영 주의**: merged 모드에서 cover.pdf/content.pdf가 스토리지에 남아있으면 버그. 업로드 로직 자체가 실행되지 않아야 함.

**API 에러 케이스**

| 케이스 | 입력 | 예상 결과 |
|--------|------|----------|
| 옵션 조합 오류 (★ P0) | outputFormat='merged', alsoGenerateMerged=true | 400: INVALID_OUTPUT_OPTIONS |
| 빈 세션 (★ P0) | session.pages = [] | 422: EMPTY_SESSION_PAGES |
| sortOrder 중복 (★ P0) | [sortOrder: 0, 0, 1] | 422: INVALID_SORT_ORDER |
| sortOrder null/undefined (★ P0) | [sortOrder: 0, null, 2] | 422: INVALID_SORT_ORDER |
| sortOrder 비연속 (★ P0) | [sortOrder: 0, 2, 3] (1 누락) | 422: INVALID_SORT_ORDER |
| 표지만 (에러) | wing+cover+spine+cover+wing | 422: NO_CONTENT_PAGES |
| 내지만 (에러) | page×8 | 422: NO_COVER_PAGES |
| 세션 없음 | sessionId 없음 | 404: SESSION_NOT_FOUND |
| 파일 없음 | pdfFileId 없음 | 404: FILE_NOT_FOUND |
| 외부 PDF | generatedBy !== 'editor' | 400: PDF_NOT_FROM_EDITOR |
| 세션-파일 불일치 | editSessionId !== dto.sessionId | 400: SESSION_FILE_MISMATCH |

**Worker 에러 케이스 (★ v1.1+ 세분화)**

| 케이스 | 입력 | 예상 결과 |
|--------|------|----------|
| 스토리지 접근 실패 | 스토리지 다운로드 실패 유도 | FILE_DOWNLOAD_FAILED |
| PDF 로드 실패 | 암호화/손상된 PDF | PDF_LOAD_FAILED |
| 페이지 수 불일치 | PDF 10p, pages 8개 | PAGE_COUNT_MISMATCH |
| pageTypes 길이 불일치 | pageTypes.length !== totalPages | PAGETYPEMAP_INCOMPLETE |

**멱등성 검증 케이스 (★ v1.1.4 추가)**

| 케이스 | 입력 | 예상 결과 |
|--------|------|----------|
| 동일 requestId로 옵션 변경 시도 | 1차: merged, 2차: separate (동일 requestId) | 2차 호출도 merged로 처리됨 (옵션 무시) |
| 옵션 변경 시 새 requestId | 1차: merged + requestId1, 2차: separate + requestId2 | 별도 job 2개 생성 |

**Worker payload 무결성 케이스 (★ v1.1.4 추가)**

| 케이스 | 입력 | 예상 결과 |
|--------|------|----------|
| Queue payload mode 누락 | `{ jobId, pdfFileId, ... }` (mode 없음) | 기존 merge 로직으로 fallback |
| Queue payload mode=undefined | `{ mode: undefined, ... }` | 기존 merge 로직으로 fallback |

> ⚠️ **가드 구현**: `mode === 'split'` 정확히 일치할 때만 split 분기. undefined/null/빈문자열은 모두 merge로 처리.

**PDF 파일 무결성 케이스 (★ v1.1.4 추가)**

| 케이스 | 입력 | 예상 결과 |
|--------|------|----------|
| 0 byte PDF | 다운로드 성공, 크기 0 | PDF_LOAD_FAILED (reason: 'corrupted') |
| Truncated PDF | PDF 헤더만 있고 내용 불완전 | PDF_LOAD_FAILED (reason: 'corrupted') |
| 분리 후 0 byte 출력 | splitPdfByIndices 결과가 빈 파일 | EMPTY_OUTPUT_FILE |

**merged 모드 잔존 파일 방지 케이스 (★ v1.1.4 추가)**

| 케이스 | 검증 항목 | 예상 결과 |
|--------|----------|----------|
| merged 모드 완료 후 스토리지 검사 | `outputs/{jobId}/` 디렉토리 내용 | `merged.pdf`만 존재 |
| merged 모드에서 cover/content 경로 | splitResult.coverPath, contentPath | **temp 디렉토리에만 존재, 스토리지 미업로드** |

> ⚠️ **테스트 방법**: Job 완료 후 `fs.existsSync(outputs/{jobId}/cover.pdf)`가 `false`여야 함.

---

## 11. 검증 방법

```bash
# 1. 타입 빌드
pnpm --filter @storige/types build

# 2. Worker 테스트
pnpm --filter @storige/worker test

# 3. API 테스트
pnpm --filter @storige/api test

# 4. E2E 테스트 (★ requestId 필수)
curl -X POST http://localhost:4000/api/worker-jobs/split-synthesize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "sessionId": "session-uuid",
    "pdfFileId": "file-uuid",
    "requestId": "'$(uuidgen)'",
    "outputFormat": "separate",
    "alsoGenerateMerged": false,
    "callbackUrl": "http://localhost:8080/webhook.php"
  }'
```

---

## 12. 기존 API와의 관계

| API | 입력 | mode | 용도 |
|-----|------|------|------|
| `POST /synthesize` | coverUrl + contentUrl | `merge` (기본) | 2개 PDF 병합 |
| `POST /split-synthesize` | sessionId + pdfFileId | `split` | 단일 PDF 분리 (신규) |

두 API는 독립적으로 운영되며, 기존 API에 영향 없음.

---

## 13. 배포 전 체크리스트

**P0 (구현 필수)**
- [ ] `pdfUrl` 제거, `pdfFileId` only
- [ ] `editSessionId === dto.sessionId` 검증 + 400 응답
- [ ] DomainError 표준화 + webhook payload 통일
- [ ] **Worker→API payload 객체 통일** (포지션 파라미터 금지)
- [ ] **errorDetail 공통 필드 가이드** (url/expected/got/index/cause, stack 금지)
- [ ] jobId scoped temp 디렉토리 (동시 작업 안전) + 클린 시작
- [ ] `outputFormat` 계약 재정의 + `alsoGenerateMerged` 플래그
- [ ] `requestId` required + unique 인덱스 + race 방어 + **옵션 변경 시 재발급 규칙 문서화**
- [ ] **Queue payload에 mode: 'split' 포함** (handleSynthesis 분기 필수)
- [ ] **옵션 조합 검증 (API+Worker)**: INVALID_OUTPUT_OPTIONS
- [ ] **빈 세션 검증**: EMPTY_SESSION_PAGES (session.pages가 0개)
- [ ] **sortOrder 무결성 검증**: INVALID_SORT_ORDER (중복/비정수/비연속 + 0..n-1 연속성 강제 + 안정 정렬)
- [ ] **Worker 이중 검증**: 파일 메타데이터, 옵션 조합, cover/content 비어있음
- [ ] **예외 래핑**: FILE_DOWNLOAD_FAILED, PDF_LOAD_FAILED (실제 흐름에 구현)
- [ ] **split 무결성 체크 (verifySplitResult)** - P0 필수, 성능보다 안정성 우선
- [ ] 에러코드 세분화 (PAGE_COUNT_MISMATCH 등)
- [ ] **updateJobStatus 재시도 정책** (3회, 250ms→1s→3s, 최종 실패 시 ERROR 로그)
- [ ] **저장 경로/URL 규칙**: 파일명 고정 (merged.pdf, cover.pdf, content.pdf), outputFiles 순서 고정 (cover→content)

**P1 (운영 품질)**
- [ ] DLQ (Dead Letter Queue) 구축 + 알림 시스템
- [ ] 모니터링 대시보드 에러코드 연동
- [ ] 수동 재처리 runbook 작성
- [ ] **downloadFile 리트라이 정책**: 5xx/timeout만 재시도 (2회, 200ms→800ms), 4xx는 즉시 실패
- [ ] **Circuit breaker**: Worker→DB 접근 보호 (failure 5회 → OPEN 30초 → HALF_OPEN)

**P2 (보안/정합성 강화 옵션)**
- [ ] `sortedPageIdsHash` 도입
- [ ] `pdfSha256` 도입
- [ ] **편집기 산출물 검증 강화**: `exportVersion` 또는 `exportSource` 필드 추가 (generatedBy='editor' 외 추가 출처 확인)
