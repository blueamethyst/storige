# 북모아 쇼핑몰 워커 UX 기획안

> 작성일: 2024-12-10
> 참고 문서: worker-work-flow.pdf

---

## 1. 고객 유형별 주문 플로우

PDF 문서에 따르면 **7가지 고객 유형**이 있습니다:

| 유형 | 고객 | 보유 파일 | 처리 방식 |
|------|------|----------|----------|
| A | PDF 업로드 고객 | 표지 + 내지 | **워커** (파일검증) |
| B | PDF 업로드 고객 | 내지만 (표지 디자인 요청) | **관리자 컨펌** |
| C | 출판계약 작가 | 내지만 | **관리자 컨펌** |
| D | 셀프 편집 고객 | 내지만 | **에디터** (표지 편집 + 내지 PDF) |
| E | 셀프 편집 고객 | 없음 | **에디터** (표지 + 내지 편집) |
| F | 디지털인쇄 고객 | 작업파일 보유 | **워커** (파일검증) |
| G | 디지털인쇄 고객 | 없음 | **에디터** (템플릿 편집) |

---

## 2. 쇼핑몰 주문 화면 UX Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         북모아 쇼핑몰 주문 화면                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [상품 옵션 선택]                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 재단사이즈: [210] mm × [297] mm                                      │   │
│  │ 작업사이즈: [216] mm × [303] mm                                      │   │
│  │ 수량: [100장] × [1] 건                                               │   │
│  │ 제본방식: ○ 무선제본  ○ 중철제본  ○ 스프링                           │   │
│  │ 후가공: □ 코팅  □ 박  □ 형압                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [파일 첨부] ─────────────────────────────────────────────────────────────  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 표지파일: [파일 추가하기] ________________________________           │   │
│  │           지원포맷: PDF                                               │   │
│  │                                                                       │   │
│  │ 내지파일: [파일 추가하기] ________________________________           │   │
│  │           지원포맷: PDF                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ 바로 주문하기 │  │   장바구니   │  │  견적서 출력  │  │ 셀프편집주문 │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 주문 버튼 클릭 시 분기 로직

```
[바로 주문하기] 또는 [셀프편집주문] 클릭
          │
          ▼
    ┌─────────────────┐
    │ 디자인 의뢰     │
    │ 체크 여부       │
    └─────────────────┘
          │
    ┌─────┴─────────────────┐
    │                       │
    ▼                       ▼
 디자인 의뢰 O          디자인 의뢰 X
    │                       │
    ▼                       ▼
 ┌──────────┐         ┌─────────────────┐
 │ 관리자   │         │ 파일 첨부 상태   │
 │ 컨펌     │         │ 체크            │
 └──────────┘         └─────────────────┘
                            │
              ┌─────┬───────┴───────┬─────────────┐
              │     │               │             │
              ▼     ▼               ▼             ▼
          표지+내지  내지만        표지만         파일없음
              │     │               │             │
              ▼     ▼               ▼             ▼
          ┌──────┐ ┌──────┐      ┌──────┐      ┌──────┐
          │워커  │ │에디터│      │에디터│      │에디터│
          │파일  │ │표지  │      │내지  │      │전체  │
          │검증  │ │편집  │      │편집  │      │편집  │
          └──────┘ └──────┘      └──────┘      └──────┘
```

> **참고**: 고객 유형 B(표지 디자인 요청), C(출판계약 작가)는 "디자인 의뢰" 경로로 처리됨

---

## 4. 워커 파일 검증 화면 (신규 개발 필요)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         파일 검증 중...                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    파일을 검증하고 있습니다                           │   │
│  │                                                                       │   │
│  │  [████████████████████░░░░░░░░░░] 67%                                │   │
│  │                                                                       │   │
│  │  ✓ 파일 업로드 완료                                                   │   │
│  │  ✓ 파일 무결성 검사 완료                                              │   │
│  │  ○ 사이즈 검증 중...                                                  │   │
│  │  ○ 페이지 수 확인 대기                                                │   │
│  │  ○ 재단선(Bleed) 확인 대기                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. 워커 검증 결과 화면

### 5-1. 검증 성공 (자동 변환 불필요)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ✓ 파일 검증 완료                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [표지 파일] cover.pdf                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ✓ 파일 형식: PDF                                                      │   │
│  │ ✓ 페이지 수: 2페이지 (앞표지/뒷표지)                                   │   │
│  │ ✓ 사이즈: 436mm × 303mm (세네카 포함)                                 │   │
│  │ ✓ 재단선: 3mm 확인됨                                                  │   │
│  │ ✓ 해상도: 300dpi                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [내지 파일] content.pdf                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ✓ 파일 형식: PDF                                                      │   │
│  │ ✓ 페이지 수: 100페이지                                                │   │
│  │ ✓ 사이즈: 216mm × 303mm                                               │   │
│  │ ✓ 재단선: 3mm 확인됨                                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌────────────────────────────┐                                            │
│  │      주문 진행하기         │                                            │
│  └────────────────────────────┘                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5-2. 검증 실패 - 수정 필요 (고객 노티 모드)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ⚠️ 파일 수정이 필요합니다                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [표지 파일] cover.pdf                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ✓ 파일 형식: PDF                                                      │   │
│  │ ✓ 페이지 수: 2페이지                                                  │   │
│  │ ⚠️ 사이즈 오류: 430mm × 300mm → 436mm × 303mm 필요                    │   │
│  │ ❌ 재단선 없음: 3mm 재단선이 필요합니다                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [오류 상세]                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 1. 표지 사이즈가 주문 옵션과 맞지 않습니다.                            │   │
│  │    - 현재: 430mm × 300mm                                              │   │
│  │    - 필요: 436mm × 303mm (세네카 10mm + 재단선 3mm 포함)              │   │
│  │                                                                       │   │
│  │ 2. 재단선(Bleed)이 설정되지 않았습니다.                                │   │
│  │    - 인쇄 시 잘림 현상이 발생할 수 있습니다.                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │   파일 재업로드   │  │   자동 변환 요청  │  │   편집기로 수정   │         │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5-3. 자동 변환 미리보기 (Before/After 컨펌)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      자동 변환 미리보기                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [변환 내역]                                                                │
│  • 사이즈 조정: 430mm × 300mm → 436mm × 303mm                              │
│  • 재단선 추가: 3mm                                                         │
│  • 빈 페이지 추가: 2페이지 (4의 배수 맞춤)                                   │
│                                                                             │
│  ┌───────────────────────┐    ┌───────────────────────┐                    │
│  │                       │    │                       │                    │
│  │      [Before]         │    │       [After]         │                    │
│  │                       │    │                       │                    │
│  │   ┌─────────────┐     │    │   ┌─────────────┐     │                    │
│  │   │             │     │    │   │ ┌─────────┐ │     │                    │
│  │   │   원본      │     │    │   │ │  변환   │ │     │                    │
│  │   │   이미지    │     │    │   │ │  이미지 │ │     │                    │
│  │   │             │     │    │   │ └─────────┘ │     │                    │
│  │   └─────────────┘     │    │   └─────────────┘     │                    │
│  │                       │    │     (재단선 표시)      │                    │
│  └───────────────────────┘    └───────────────────────┘                    │
│                                                                             │
│  ┌────────────────────────────┐  ┌────────────────────────────┐            │
│  │     변환 승인 및 주문      │  │          취소              │            │
│  └────────────────────────────┘  └────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. 시스템 연동 구조

### 6-1. 인프라 구성

- 쇼핑몰(북모아)과 Storige는 **같은 서버**에 설치
- **같은 storage 폴더** 공유
- 파일 업로드/관리는 Storige가 담당
- 쇼핑몰은 **fileId(키)만 관리**

### 6-2. 역할 분리 (명확한 책임 경계)

| 시스템 | 담당 | 관리하는 상태 |
|--------|------|--------------|
| **북모아 (쇼핑몰)** | 주문 전체 라이프사이클 관리 | 주문상태 (12단계: 110~021) |
| **Storige API** | 편집 세션 관리, 파일 저장 | 편집상태 (`draft` / `complete`) |
| **Storige Worker** | PDF 검증/변환/합성 | Job 상태 (`PENDING` / `PROCESSING` / `COMPLETED` / `FAILED`) |

> **핵심 원칙**: 주문상태는 북모아가 독점 관리. Storige는 편집 완료 여부만 추적하고, 북모아에 알림만 전달.

### 6-3. 전체 시스템 흐름도

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              북모아 주문 시스템 흐름도                                │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  [북모아 쇼핑몰]                 [Storige API]                [Worker]              │
│                                       │                           │                │
│  1. 파일 업로드                       │                           │                │
│  POST /api/files/upload ─────────────▶│ (파일 저장)               │                │
│  ◀──── { fileId, fileUrl } ──────────│                           │                │
│                                       │                           │                │
│  2. fileId를 주문DB에 저장            │                           │                │
│  (쇼핑몰 자체 DB)                     │                           │                │
│                                       │                           │                │
│  3. 검증 요청                         │                           │                │
│  POST /api/worker-jobs/validate ─────▶│                           │                │
│  { fileId, fileType, options }        │──▶ Queue Job ────────────▶│                │
│  ◀──── { jobId } ────────────────────│                           │                │
│                                       │                           │                │
│  4. 검증 상태 폴링 (2-3초 간격)       │                           │                │
│  GET /api/worker-jobs/:jobId ────────▶│                           │                │
│  ◀──── { status, result } ───────────│◀── 상태 업데이트 ─────────│                │
│                                       │                           │                │
│  5. 결과에 따른 분기                  │                           │                │
│  - 성공: 주문 진행                    │                           │                │
│  - 실패: 에러 표시 / 재업로드         │                           │                │
│  - 변환필요: 자동변환 요청            │                           │                │
│                                       │                           │                │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 6-4. 검증 결과 회신 방식

**Polling 방식 채택** (같은 서버 환경에 적합)

- 쇼핑몰이 2-3초 간격으로 `GET /api/worker-jobs/:jobId` 호출
- 장점: 구현 단순, 추가 인프라 불필요
- 같은 서버이므로 네트워크 지연 최소
- 검증 시간이 보통 몇 초 내외이므로 충분

---

## 7. 워커 기본 기능

### 7-1. 고객 노티 모드
- PDF 파일 객체 검증 후 고객에 노티
- 검증 항목:
  - 책자: 표지사이즈, 세네카, 내지사이즈, 파일무결성
  - 디지털인쇄: 작업/재단사이즈, 후가공, 파일무결성

### 7-2. 자동 변환 모드
- 자동변환 처리내역 표시
- 전/후 미리보기 이미지 컨펌

---

## 8. 편집기 구동 모드

| 모드 | 설명 | 표지 | 내지 |
|------|------|------|------|
| 1 | 표지편집 + 내지 PDF 업로드 | 편집기 | PDF 첨부 |
| 2 | 표지 PDF 업로드 + 내지 PDF 업로드 | PDF 첨부 | PDF 첨부 |
| 3 | 책자 편집모드 | 편집기 | 편집기 |
| 4 | 낱장 편집모드 | - | 템플릿 |

---

## 9. 지원 파일 포맷

| 구분 | 지원 포맷 |
|------|----------|
| 표지 파일 | PDF |
| 내지 파일 | PDF |

---

## 10. 편집 상태 관리 (Storige 범위)

> **중요**: 주문상태(110~021)는 북모아가 전담 관리. Storige는 편집 완료 여부만 추적.

### 10-1. Storige 편집 세션 상태

```
┌─────────────────────────────────────────────────────────────────┐
│  edit_sessions.status                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   draft ──────────────────────▶ complete                        │
│    │                              │                             │
│    │ (사용자 편집 중)              │ (편집 완료 버튼 클릭)        │
│    │                              │                             │
│    └──────────────────────────────┴─▶ 북모아에 알림 전송         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 10-2. 북모아 연동 포인트 (최소화)

| 이벤트 | 방향 | 내용 |
|--------|------|------|
| 편집 시작 | 북모아 → Storige | `POST /api/edit-sessions` (order_seqno, member_seqno 전달) |
| 편집 완료 | Storige → 북모아 | Webhook 콜백 또는 폴링으로 `status=complete` 확인 |

북모아는 편집 완료 알림을 받은 후, 자체적으로 주문 상태를 변경합니다 (예: 110 → 210).

### 10-3. 편집 세션 테이블 구조

```sql
CREATE TABLE edit_sessions (
  id VARCHAR(36) PRIMARY KEY,
  order_seqno BIGINT,           -- 북모아 주문 번호
  member_seqno BIGINT,          -- 북모아 회원 번호
  status ENUM('draft', 'complete') DEFAULT 'draft',
  cover_file_id VARCHAR(36),
  content_file_id VARCHAR(36),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## 11. 개발 우선순위 제안

| 순서 | 기능 | 설명 | 예상 난이도 |
|------|------|------|------------|
| 1 | **주문-워커 연동 API** | 쇼핑몰에서 워커 Job 생성 API | 중 |
| 2 | **파일 검증 결과 화면** | 검증 결과 표시 UI (쇼핑몰) | 중 |
| 3 | **실시간 상태 업데이트** | WebSocket 또는 Polling | 중 |
| 4 | **Before/After 미리보기** | 변환 전후 썸네일 생성 | 상 |
| 5 | **에디터 연동** | 파일 없을 때 에디터로 전환 | 중 |
| 6 | **마이페이지 편집보관함** | 편집 세션 목록 조회 | 하 |

---

## 12. API 명세

### 12-1. 파일 업로드 (신규 개발)

```
POST /api/files/upload

Request: multipart/form-data
- file: PDF 파일
- type: 'cover' | 'content'
- orderId?: string (선택, 쇼핑몰 주문번호)

Response:
{
  "id": "uuid",
  "fileName": "cover.pdf",
  "fileUrl": "/storage/uploads/uuid.pdf",
  "fileSize": 1234567,
  "mimeType": "application/pdf",
  "createdAt": "2024-12-10T..."
}
```

### 12-2. 검증 요청 (기존 수정)

```
POST /api/worker-jobs/validate

Request:
{
  "fileId": "uuid",              // fileUrl 대신 fileId 사용
  "fileType": "cover" | "content",
  "orderOptions": {
    "size": { "width": 210, "height": 297 },
    "pages": 100,
    "binding": "perfect" | "saddle" | "spring",
    "bleed": 3,
    "paperThickness": 0.1        // 종이 두께 (mm) - 세네카 계산용
  }
}

Response:
{
  "id": "job-uuid",
  "status": "PENDING"
}
```

### 12-3. 썸네일 조회 (신규 개발)

```
GET /api/files/:fileId/thumbnail

Query Parameters:
- page: number (기본값: 1)
- width: number (기본값: 200)

Response:
- Content-Type: image/png
- 썸네일 이미지 바이너리
```

### 12-4. 검증 결과 조회 (기존 그대로)

```
GET /api/worker-jobs/:jobId

Response:
{
  "id": "job-uuid",
  "status": "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED",
  "result": {
    "isValid": true,
    "errors": [],
    "warnings": [],
    "metadata": {
      "pageCount": 100,
      "pageSize": { "width": 210, "height": 297 },
      "hasBleed": true
    }
  },
  "createdAt": "...",
  "completedAt": "..."
}
```

### 12-5. API 개발 현황

| API | 용도 | 상태 |
|-----|------|------|
| `POST /api/files/upload` | 파일 업로드, fileId 반환 | **신규 개발** |
| `GET /api/files/:fileId/thumbnail` | 썸네일 이미지 조회 | **신규 개발** |
| `POST /api/worker-jobs/validate` | 검증 요청 (fileId 지원) | 수정 필요 |
| `GET /api/worker-jobs/:jobId` | 검증 결과 조회 | 기존 사용 |
| `POST /api/worker-jobs/convert` | 변환 요청 | 기존 사용 |
| `POST /api/worker-jobs/synthesize` | 합성 요청 | 기존 사용 |

---

## 13. 쇼핑몰 측 개발 필요 사항

### 주문 화면
- 파일 업로드 시 Storige API 호출
- 반환된 fileId를 주문 데이터에 저장
- 검증 요청 및 결과 폴링 로직 구현
- 검증 결과에 따른 UI 분기 처리

### 마이페이지
- 편집보관함 메뉴 추가
- 저장된 편집 세션 목록 조회
- 편집 재개 기능

---

## 14. 에디터 연동 스펙

### 14-1. 에디터 연동 방식 (JS 번들)

> **중요**: URL 파라미터로 토큰 전달 금지. httpOnly Cookie 방식 사용 (16장 참조)

```
[PHP 쇼핑몰 페이지]
    │
    │ 1. 페이지 로드 시 PHP에서 세션 토큰 발급 (서버 측)
    │    POST /api/auth/shop-session → httpOnly Cookie 설정
    │
    │ 2. 에디터 번들 로드 및 초기화
    │
    ▼
<div id="editor-root"></div>
<script src="/editor-bundle.js"></script>
<script>
    const editor = window.StorigeEditor.create({
        // 인증: httpOnly Cookie 자동 사용 (token 파라미터 없음!)
        mode: 'cover',
        orderId: 'shop-order-123',
        templateSetId: 'uuid',
        // ...
    });
    editor.mount('editor-root');
</script>
```

### 14-2. 에디터 초기화 파라미터

```typescript
interface EditorConfig {
  // 필수 파라미터
  mode: 'cover' | 'content' | 'both' | 'template';
  orderId: string;           // 쇼핑몰 주문번호

  // 선택 파라미터
  templateSetId?: string;    // 템플릿셋 ID
  sessionId?: string;        // 재편집 시 기존 세션 ID
  contentFileId?: string;    // 내지 PDF fileId (mode='cover'일 때)
  coverFileId?: string;      // 표지 PDF fileId (mode='content'일 때)

  // 옵션
  options?: {
    size?: { width: number; height: number };  // mm
    binding?: 'perfect' | 'saddle' | 'spring';
    pages?: number;
    bleed?: number;           // mm
    paperThickness?: number;  // mm
  };

  // 콜백
  onComplete?: (result: EditorResult) => void;
  onCancel?: () => void;
  onError?: (error: EditorError) => void;
}
```

### 14-3. 에디터 완료 콜백

```typescript
interface EditorResult {
  sessionId: string;
  orderId: string;
  pages: {
    initial: number;    // 시작 페이지 수
    final: number;      // 최종 페이지 수
  };
  files: {
    coverFileId?: string;
    contentFileId?: string;
    thumbnailUrl?: string;
  };
  savedAt: string;      // ISO 8601
}

interface EditorError {
  code: 'AUTH_EXPIRED' | 'NETWORK_ERROR' | 'SAVE_FAILED' | 'INVALID_DATA';
  message: string;
}
```

**콜백 처리 예시:**

```javascript
const editor = window.StorigeEditor.create({
    mode: 'both',
    orderId: 'shop-order-123',

    onComplete: (result) => {
        console.log('편집 완료:', result);
        // 쇼핑몰 주문 완료 페이지로 이동
        window.location.href = '/order/complete?' + new URLSearchParams({
            sessionId: result.sessionId,
            pages: result.pages.final
        });
    },

    onCancel: () => {
        if (confirm('편집을 취소하시겠습니까?')) {
            window.location.href = '/products';
        }
    },

    onError: (error) => {
        if (error.code === 'AUTH_EXPIRED') {
            // 세션 만료 → 로그인 페이지로
            window.location.href = '/login';
        } else {
            alert('오류: ' + error.message);
        }
    }
});
```

### 14-4. 편집 세션 API

#### 세션 조회

```
GET /api/edit-sessions?orderSeqno={orderSeqno}

Headers:
  Cookie: storige_access={JWT}  (자동 포함)

Response:
{
  "sessions": [
    {
      "id": "uuid",
      "orderSeqno": 12345,         // 북모아 주문번호
      "memberSeqno": 123,          // 북모아 회원번호
      "status": "draft" | "complete",
      "coverFileId": "uuid",
      "contentFileId": "uuid",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

#### 편집 완료 처리

```
PATCH /api/edit-sessions/:id/complete

Headers:
  Cookie: storige_access={JWT}

Response:
{
  "id": "uuid",
  "status": "complete",
  "completedAt": "2024-12-10T..."
}

Side Effects:
  - 북모아에 편집 완료 Webhook 전송 (선택적)
```

---

## 15. 에러 코드 정의

### 15-1. 에러 코드 (errors)

| 코드 | 설명 | 심각도 | 자동 변환 | 변환 방법 |
|------|------|--------|----------|----------|
| `UNSUPPORTED_FORMAT` | 지원하지 않는 형식 (PDF만 허용) | error | ❌ 불가 | - |
| `FILE_CORRUPTED` | 파일 손상/로드 실패 | error | ❌ 불가 | - |
| `FILE_TOO_LARGE` | 파일 크기 초과 (100MB 제한) | error | ❌ 불가 | - |
| `PAGE_COUNT_INVALID` | 페이지 수 규칙 위반 (4배수 등) | error | ✅ 가능 | 빈 페이지 추가 |
| `PAGE_COUNT_EXCEEDED` | 최대 페이지 수 초과 (500p) | error | ❌ 불가 | - |
| `SIZE_MISMATCH` | 페이지 사이즈 불일치 | error | ⚠️ 조건부 | 여백 추가/크롭 |
| `SPINE_SIZE_MISMATCH` | 세네카(책등) 사이즈 불일치 | error | ✅ 가능 | 세네카 영역 조정 |

### 15-2. 경고 코드 (warnings)

| 코드 | 설명 | 심각도 | 자동 변환 | 변환 방법 |
|------|------|--------|----------|----------|
| `PAGE_COUNT_MISMATCH` | 주문 페이지 수와 불일치 | warning | ⚠️ 조건부 | 부족 시 빈 페이지 추가 |
| `BLEED_MISSING` | 재단선 없음 | warning | ✅ 가능 | 가장자리 확장 (mirror) |
| `RESOLUTION_LOW` | 해상도 부족 (300dpi 미만) | warning | ❌ 불가 | - |

### 15-3. 검증 결과 예시

```json
{
  "isValid": false,
  "errors": [
    {
      "code": "SIZE_MISMATCH",
      "message": "페이지 사이즈가 일치하지 않습니다",
      "details": {
        "expected": { "width": 216, "height": 303 },
        "actual": { "width": 210, "height": 297 }
      },
      "autoFixable": true,
      "fixMethod": "resizeWithPadding"
    },
    {
      "code": "PAGE_COUNT_INVALID",
      "message": "내지 페이지 수가 4의 배수가 아닙니다",
      "details": {
        "actual": 98,
        "required": "4의 배수"
      },
      "autoFixable": true,
      "fixMethod": "addBlankPages"
    }
  ],
  "warnings": [
    {
      "code": "BLEED_MISSING",
      "message": "재단선(3mm)이 설정되지 않았습니다",
      "details": {
        "expected": 3,
        "actual": 0
      },
      "autoFixable": true,
      "fixMethod": "extendBleed"
    },
    {
      "code": "RESOLUTION_LOW",
      "message": "일부 이미지의 해상도가 낮습니다 (권장: 300dpi)",
      "details": {
        "page": 5,
        "resolution": 150
      },
      "autoFixable": false
    }
  ],
  "metadata": {
    "pageCount": 98,
    "pageSize": { "width": 210, "height": 297 },
    "hasBleed": false,
    "resolution": 150
  }
}
```

---

## 16. 보안 및 인증

### 16-1. 인증 아키텍처 개요

**설계 원칙:**
- URL 파라미터로 토큰 전달 금지 (보안 위험)
- httpOnly Cookie 사용 (XSS 방어)
- PHP 쇼핑몰 세션과 연동
- 같은 DB의 User 테이블 공유

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        토큰 연동 아키텍처                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [PHP 쇼핑몰] ──────────────────────────────────────────────────────────│
│       │                                                                 │
│       │ 1. 사용자 로그인 (PHP 세션)                                      │
│       │    $_SESSION['member_id'] = 123                                 │
│       │                                                                 │
│       │ 2. 에디터/워커 페이지 접근 시                                     │
│       │    PHP가 서버 측에서 Storige API 호출                            │
│       │    POST /api/auth/shop-session (API Key 인증)                   │
│       │                                                                 │
│       ▼                                                                 │
│  [Storige API] ─────────────────────────────────────────────────────────│
│       │                                                                 │
│       │ 3. JWT 생성 + httpOnly Cookie 설정                               │
│       │    - accessToken (1시간)                                        │
│       │    - refreshToken (30일)                                        │
│       │                                                                 │
│       ▼                                                                 │
│  [에디터/워커 JS] ──────────────────────────────────────────────────────│
│       │                                                                 │
│       │ 4. API 호출 시 쿠키 자동 포함                                    │
│       │    credentials: 'include'                                       │
│       │                                                                 │
│       │ 5. 401 시 Silent Refresh → 실패 시 로그인 리다이렉트             │
│       │                                                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

### 16-2. API 인증 방식 (2가지)

#### A. 서버 간 통신: API Key 인증

```
Header: X-API-Key: {api-key}
```

- PHP 쇼핑몰 → Storige API 호출 시 사용
- 쇼핑몰별 고유 API Key 발급
- IP 화이트리스트 적용 가능

#### B. 클라이언트 통신: httpOnly Cookie 인증

```
Cookie: storige_access={JWT}; storige_refresh={JWT}
```

- 에디터/워커 JS → Storige API 호출 시 사용
- XSS 공격으로 토큰 탈취 불가
- CSRF 방어: SameSite=Lax 설정

### 16-3. 세션 토큰 발급 API (신규)

```
POST /api/auth/shop-session

Headers:
  X-API-Key: {shop-api-key}

Request:
{
  "memberId": "123",              // 쇼핑몰 회원 ID
  "phpSessionId": "abc123...",    // PHP session_id()
  "permissions": ["edit", "upload", "validate"]  // 선택
}

Response:
  Set-Cookie: storige_access={JWT}; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=3600
  Set-Cookie: storige_refresh={JWT}; HttpOnly; Secure; SameSite=Lax; Path=/api/auth; Max-Age=2592000

{
  "success": true,
  "expiresIn": 3600
}
```

### 16-4. JWT 토큰 구조

```typescript
interface JwtPayload {
  sub: string;           // member_id (쇼핑몰 회원 테이블 ID)
  email?: string;
  name?: string;
  role: 'customer' | 'admin';
  source: 'shop';        // 출처 구분: 'shop' | 'admin'
  phpSessionId?: string; // PHP 세션 연동용 (선택)
  permissions?: string[];
  iat: number;           // 발급 시간
  exp: number;           // 만료 시간
}
```

### 16-5. 토큰 만료 정책

| 토큰 | 만료 시간 | 저장 위치 | 갱신 방법 |
|------|----------|----------|----------|
| accessToken | 1시간 | httpOnly Cookie | refreshToken으로 갱신 |
| refreshToken | 30일 | httpOnly Cookie | 재로그인 필요 |

### 16-6. 토큰 갱신 (Silent Refresh)

```
POST /api/auth/refresh

Cookies:
  storige_refresh={refreshToken}

Response (성공):
  Set-Cookie: storige_access={newJWT}; HttpOnly; Secure; ...

{
  "success": true,
  "expiresIn": 3600
}

Response (실패 - 401):
{
  "success": false,
  "error": "REFRESH_TOKEN_EXPIRED",
  "redirectUrl": "/login"
}
```

**에디터/워커 JS 처리 로직:**

```javascript
async function apiCall(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: 'include'  // 쿠키 자동 포함
  });

  if (response.status === 401) {
    // Silent Refresh 시도
    const refreshResult = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include'
    });

    if (refreshResult.ok) {
      // 원래 요청 재시도
      return fetch(url, { ...options, credentials: 'include' });
    } else {
      // 로그인 페이지로 리다이렉트
      window.location.href = '/login';
      throw new Error('Session expired');
    }
  }

  return response;
}
```

### 16-7. PHP 쇼핑몰 구현 가이드

#### 에디터 페이지 (editor.php)

```php
<?php
session_start();

// 로그인 확인
if (!isset($_SESSION['member_id'])) {
    header('Location: /login.php');
    exit;
}

// Storige API에 세션 토큰 요청 (서버 측)
$response = requestStorageSession($_SESSION['member_id'], session_id());

if (!$response['success']) {
    die('인증 오류: ' . $response['error']);
}

// 쿠키는 API 응답에서 자동 설정됨 (Set-Cookie 헤더)
?>
<!DOCTYPE html>
<html>
<head>
    <title>에디터</title>
</head>
<body>
    <div id="editor-root"></div>

    <!-- 에디터 번들 (토큰 파라미터 없음!) -->
    <script src="/editor-bundle.js"></script>
    <script>
        const editor = window.StorigeEditor.create({
            templateSetId: '<?= htmlspecialchars($_GET['templateSetId']) ?>',
            // token 파라미터 불필요 - httpOnly 쿠키 사용
            onComplete: (result) => { /* ... */ },
            onError: (error) => {
                if (error.code === 'AUTH_EXPIRED') {
                    window.location.href = '/login.php';
                }
            }
        });
        editor.mount('editor-root');
    </script>
</body>
</html>
```

#### 세션 토큰 요청 함수 (PHP)

```php
function requestStorageSession($memberId, $phpSessionId) {
    $apiUrl = STORIGE_API_URL . '/api/auth/shop-session';

    $ch = curl_init($apiUrl);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode([
            'memberId' => (string)$memberId,
            'phpSessionId' => $phpSessionId,
            'permissions' => ['edit', 'upload', 'validate']
        ]),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'X-API-Key: ' . STORIGE_API_KEY
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HEADER => true  // 헤더 포함 (Set-Cookie 전달용)
    ]);

    $response = curl_exec($ch);
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $headers = substr($response, 0, $headerSize);
    $body = substr($response, $headerSize);

    // Set-Cookie 헤더를 클라이언트로 전달
    foreach (explode("\r\n", $headers) as $header) {
        if (stripos($header, 'Set-Cookie:') === 0) {
            header($header, false);  // 쿠키 전달
        }
    }

    curl_close($ch);
    return json_decode($body, true);
}
```

### 16-8. 공유 User 테이블 설계 (향후)

**현재:** 쇼핑몰 members 테이블 + Storige users 테이블 별도

**향후 통합:** 쇼핑몰 members 테이블을 Primary로 사용

```sql
-- 쇼핑몰 members 테이블에 Storige 필드 추가
ALTER TABLE members ADD COLUMN storige_role VARCHAR(20) DEFAULT 'customer';

-- JWT는 members.id를 sub로 사용
-- source='shop' → members 테이블 조회
-- source='admin' → 기존 users 테이블 조회 (관리자용)
```

**Storige API JwtStrategy 수정:**

```typescript
async validate(payload: JwtPayload): Promise<User | Member> {
  if (payload.source === 'shop') {
    // 쇼핑몰 회원 테이블 조회
    return this.memberRepository.findOne({ where: { id: payload.sub } });
  } else {
    // 관리자 테이블 조회
    return this.userRepository.findOne({ where: { id: payload.sub } });
  }
}
```

### 16-9. 파일 업로드 제한

| 항목 | 제한값 |
|------|--------|
| 최대 파일 크기 | 100MB |
| 허용 MIME 타입 | application/pdf |
| 최대 페이지 수 | 500페이지 |

### 16-10. 파일 접근 권한

- 업로드된 파일은 fileId(UUID)로만 접근 가능
- 파일 URL 직접 접근 불가 (API를 통해서만 접근)
- 파일 삭제는 업로드한 회원만 가능 (JWT sub 검증)

---

## 17. 상세 검증조건 및 자동 변환 기능

### 17-1. 검증조건 전체 목록

| 검증 항목 | 대상 | 조건 | 에러코드 | 심각도 | 자동변환 |
|----------|------|------|---------|--------|---------|
| 파일 형식 | 공통 | PDF만 허용 | `UNSUPPORTED_FORMAT` | error | ❌ |
| 파일 무결성 | 공통 | PDF 로드 성공 | `FILE_CORRUPTED` | error | ❌ |
| 파일 크기 | 공통 | ≤100MB | `FILE_TOO_LARGE` | error | ❌ |
| 페이지 수 (표지) | 표지 | 2 또는 4페이지 | `PAGE_COUNT_INVALID` | error | ❌ |
| 페이지 수 (내지-무선) | 내지 | 4의 배수 | `PAGE_COUNT_INVALID` | error | ✅ |
| 페이지 수 (내지-중철) | 내지 | 4의 배수, 8~64p | `PAGE_COUNT_INVALID` | error | ✅ |
| 페이지 수 (최대) | 공통 | ≤500페이지 | `PAGE_COUNT_EXCEEDED` | error | ❌ |
| 페이지 수 불일치 | 내지 | 주문 수량과 비교 | `PAGE_COUNT_MISMATCH` | warning | ⚠️ 조건부 |
| 페이지 사이즈 | 공통 | 주문 사이즈 ±1mm | `SIZE_MISMATCH` | error | ⚠️ 조건부 |
| 재단선 | 공통 | bleed 존재 여부 | `BLEED_MISSING` | warning | ✅ |
| 세네카 사이즈 | 표지 | spine 계산값 비교 | `SPINE_SIZE_MISMATCH` | error | ✅ |
| 해상도 | 공통 | ≥300dpi 권장 | `RESOLUTION_LOW` | warning | ❌ |

### 17-2. 제본 방식별 검증 규칙

#### 무선제본 (perfect binding)

| 항목 | 규칙 | 비고 |
|------|------|------|
| 내지 페이지 수 | 4의 배수, 최소 40페이지 | 풀 제본 특성상 최소 두께 필요 |
| 표지 세네카 | 필수 (pages × paperThickness) | 책등 두께 |
| 표지 사이즈 | (width + bleed×2) × 2 + spine | 펼친 상태 기준 |

```
표지 전체 너비 계산:
spine = pages × paperThickness
totalWidth = (baseWidth + bleed × 2) × 2 + spine

예: 210×297mm, bleed 3mm, 100페이지, 두께 0.1mm
→ spine = 100 × 0.1 = 10mm
→ totalWidth = (210 + 6) × 2 + 10 = 442mm
→ totalHeight = 297 + 6 = 303mm
```

#### 중철제본 (saddle stitching)

| 항목 | 규칙 | 비고 |
|------|------|------|
| 내지 페이지 수 | 4의 배수, 8~64페이지 | 스테이플러 한계 |
| 표지 세네카 | 없음 (spine = 0) | 접어서 제본 |
| 표지 사이즈 | (width + bleed×2) × 2 | 세네카 없이 계산 |

#### 스프링제본 (spring/wire binding)

| 항목 | 규칙 | 비고 |
|------|------|------|
| 내지 페이지 수 | 제한 없음 | 링 크기만 선택 |
| 표지 세네카 | 없음 | 낱장 결합 |
| 표지 사이즈 | width + bleed×2 | 단면 기준 |

### 17-3. 자동 변환 기능 상세

#### ✅ 자동 변환 가능 항목

| 에러코드 | 변환 방법 | 구현 도구 | 미리보기 |
|---------|----------|----------|---------|
| `PAGE_COUNT_INVALID` (4배수) | 마지막에 빈 페이지 추가 | pdf-lib | 추가 페이지 위치 표시 |
| `BLEED_MISSING` | 가장자리 픽셀 확장 (mirror/extend) | Sharp + Ghostscript | Before/After |
| `SPINE_SIZE_MISMATCH` | 세네카 영역 조정 | pdf-lib | Before/After |

#### ⚠️ 조건부 자동 변환 항목

| 에러코드 | 가능 조건 | 불가 조건 | 변환 방법 |
|---------|----------|----------|----------|
| `SIZE_MISMATCH` | 크기가 작은 경우 | 비율 불일치 | 여백 추가 (중앙 정렬) |
| `PAGE_COUNT_MISMATCH` | 실제 < 주문 | 실제 > 주문 | 빈 페이지 추가 |

**SIZE_MISMATCH 자동 변환 주의사항:**
- 이미지/텍스트가 가장자리에 있으면 잘릴 위험
- 비율이 다르면 왜곡 발생
- 반드시 Before/After 미리보기 후 사용자 확인 필요

#### ❌ 자동 변환 불가 항목

| 에러코드 | 불가 사유 |
|---------|----------|
| `UNSUPPORTED_FORMAT` | PDF 외 파일은 변환 불가 |
| `FILE_CORRUPTED` | 손상된 파일 복구 불가 |
| `FILE_TOO_LARGE` | 파일 압축 시 품질 저하 |
| `PAGE_COUNT_EXCEEDED` | 인쇄 한계 초과 |
| `RESOLUTION_LOW` | 업스케일링 품질 저하 |

### 17-4. 검증 결과 데이터 구조

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata: {
    pageCount: number;
    pageSize: { width: number; height: number };  // mm
    hasBleed: boolean;
    bleedSize?: number;  // mm
    spineSize?: number;  // mm (표지만)
    resolution?: number; // dpi (추정값)
  };
}

interface ValidationError {
  code: ErrorCode;
  message: string;
  details: {
    expected?: any;
    actual?: any;
    page?: number;  // 특정 페이지 문제 시
  };
  autoFixable: boolean;
  fixMethod?: 'addBlankPages' | 'extendBleed' | 'adjustSpine' | 'resizeWithPadding';
}

interface ValidationWarning {
  code: WarningCode;
  message: string;
  details?: any;
}

type ErrorCode =
  | 'UNSUPPORTED_FORMAT'
  | 'FILE_CORRUPTED'
  | 'FILE_TOO_LARGE'
  | 'PAGE_COUNT_INVALID'
  | 'PAGE_COUNT_EXCEEDED'
  | 'SIZE_MISMATCH'
  | 'SPINE_SIZE_MISMATCH';

type WarningCode =
  | 'PAGE_COUNT_MISMATCH'
  | 'BLEED_MISSING'
  | 'RESOLUTION_LOW';
```

### 17-5. 검증 옵션 파라미터

```typescript
interface ValidationOptions {
  fileType: 'cover' | 'content';
  orderOptions: {
    size: { width: number; height: number };  // 재단 사이즈 (mm)
    pages: number;                             // 주문 페이지 수
    binding: 'perfect' | 'saddle' | 'spring'; // 제본 방식
    bleed: number;                             // 재단선 (mm)
    paperThickness?: number;                   // 종이 두께 (mm) - 세네카 계산용
  };
}
```

### 17-6. 현재 구현 vs 기획 GAP 분석

| 항목 | 기획 코드 | 현재 구현 | 상태 |
|------|----------|----------|------|
| 사이즈 불일치 | `SIZE_MISMATCH` | `INVALID_SIZE` | 🔄 수정 필요 |
| 재단선 없음 | `BLEED_MISSING` | `MISSING_BLEED` | 🔄 수정 필요 |
| 페이지 수 오류 | `PAGE_COUNT_INVALID` | `INVALID_PAGE_COUNT` | 🔄 수정 필요 |
| 파일 손상 | `FILE_CORRUPTED` | `LOAD_ERROR` | 🔄 수정 필요 |
| 페이지 수 불일치 | `PAGE_COUNT_MISMATCH` | `PAGE_COUNT_MISMATCH` | ✅ 일치 |
| 세네카 불일치 | `SPINE_SIZE_MISMATCH` | - | 🆕 신규 개발 |
| 해상도 부족 | `RESOLUTION_LOW` | - | 🆕 신규 개발 |
| 형식 미지원 | `UNSUPPORTED_FORMAT` | - | 🆕 신규 개발 |
| 파일 크기 초과 | `FILE_TOO_LARGE` | - | 🆕 신규 개발 |
| 최대 페이지 초과 | `PAGE_COUNT_EXCEEDED` | - | 🆕 신규 개발 |
| autoFixable 필드 | 있음 | - | 🆕 신규 개발 |
| spring 제본 | 지원 | 미지원 | 🆕 신규 개발 |
| paperThickness | 있음 | - | 🆕 신규 개발 |

### 17-7. 구현 우선순위

| 순서 | 작업 | 난이도 | 영향도 |
|------|------|--------|--------|
| 1 | 에러코드 통일 (기존 코드 수정) | 하 | 높음 |
| 2 | autoFixable 필드 추가 | 하 | 높음 |
| 3 | spring 제본 지원 | 하 | 중간 |
| 4 | paperThickness 파라미터 추가 | 하 | 중간 |
| 5 | SPINE_SIZE_MISMATCH 검증 구현 | 중 | 높음 |
| 6 | FILE_TOO_LARGE 검증 추가 | 하 | 중간 |
| 7 | PAGE_COUNT_EXCEEDED 검증 추가 | 하 | 중간 |
| 8 | UNSUPPORTED_FORMAT 검증 추가 | 하 | 중간 |
| 9 | RESOLUTION_LOW 검증 구현 | 상 | 낮음 |
| 10 | 빈 페이지 추가 자동변환 | 중 | 높음 |
| 11 | 재단선 확장 자동변환 | 상 | 중간 |
| 12 | 세네카 조정 자동변환 | 상 | 중간 |
