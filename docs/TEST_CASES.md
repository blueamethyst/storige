# Storige-Bookmoa 서비스 플로우 테스트 케이스

> **문서 버전**: 1.0
> **작성일**: 2025-12-28
> **대상 시스템**: Storige + Bookmoa 통합 인쇄 쇼핑몰 시스템

---

## 목차

1. [테스트 개요](#1-테스트-개요)
2. [인증 플로우 테스트](#2-인증-플로우-테스트)
3. [편집 세션 플로우 테스트](#3-편집-세션-플로우-테스트)
4. [책등 계산 테스트](#4-책등-계산-테스트)
5. [PDF 처리 테스트](#5-pdf-처리-테스트)
6. [웹훅 테스트](#6-웹훅-테스트)
7. [통합 E2E 테스트](#7-통합-e2e-테스트)

---

## 1. 테스트 개요

### 1.1 테스트 범위

```
┌─────────────────────────────────────────────────────────────────┐
│                        테스트 범위                               │
├─────────────────┬───────────────────────────────────────────────┤
│ 단위 테스트      │ 개별 서비스/함수 레벨                          │
│ 통합 테스트      │ API 엔드포인트 + DB                           │
│ E2E 테스트       │ 전체 플로우 (브라우저 → API → Worker)          │
└─────────────────┴───────────────────────────────────────────────┘
```

### 1.2 테스트 환경

| 환경 | API URL | DB |
|------|---------|-----|
| 로컬 | `http://localhost:4000/api` | storige_test |
| 스테이징 | `https://staging-api.storige.com/api` | storige_staging |

### 1.3 테스트 데이터

```typescript
// 테스트용 상수
const TEST_API_KEY = 'test-api-key-for-testing';
const TEST_MEMBER = {
  memberSeqno: 99999,
  memberId: 'test@example.com',
  memberName: '테스트유저'
};
const TEST_TEMPLATE_SET_ID = 'ts-test-001';
```

---

## 2. 인증 플로우 테스트

### 2.1 Shop Session 발급 테스트

#### TC-AUTH-001: 정상적인 Shop Session 발급

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-AUTH-001 |
| **테스트명** | 정상적인 Shop Session 발급 |
| **우선순위** | Critical |
| **사전조건** | 유효한 API Key 보유 |

**요청:**
```http
POST /api/auth/shop-session
X-API-Key: {valid-api-key}
Content-Type: application/json

{
  "memberSeqno": 12345,
  "memberId": "user@example.com",
  "memberName": "홍길동"
}
```

**기대결과:**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 3600,
  "member": {
    "seqno": 12345,
    "id": "user@example.com",
    "name": "홍길동"
  }
}
```

**검증항목:**
- [ ] HTTP 상태코드 201
- [ ] accessToken이 유효한 JWT 형식
- [ ] expiresIn이 3600 (1시간)
- [ ] member 정보가 요청과 일치

---

#### TC-AUTH-002: 잘못된 API Key로 요청

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-AUTH-002 |
| **테스트명** | 잘못된 API Key로 요청 |
| **우선순위** | Critical |
| **사전조건** | 없음 |

**요청:**
```http
POST /api/auth/shop-session
X-API-Key: invalid-api-key
Content-Type: application/json

{
  "memberSeqno": 12345,
  "memberId": "user@example.com",
  "memberName": "홍길동"
}
```

**기대결과:**
```json
{
  "statusCode": 401,
  "message": "Invalid API key",
  "error": "Unauthorized"
}
```

**검증항목:**
- [ ] HTTP 상태코드 401
- [ ] 에러 메시지에 "Invalid API key" 포함

---

#### TC-AUTH-003: API Key 누락

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-AUTH-003 |
| **테스트명** | API Key 헤더 누락 |
| **우선순위** | High |

**요청:**
```http
POST /api/auth/shop-session
Content-Type: application/json

{
  "memberSeqno": 12345,
  "memberId": "user@example.com",
  "memberName": "홍길동"
}
```

**기대결과:**
- HTTP 상태코드: 401
- 에러 메시지: "API key is required"

---

#### TC-AUTH-004: 필수 필드 누락 (memberSeqno)

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-AUTH-004 |
| **테스트명** | memberSeqno 필드 누락 |
| **우선순위** | High |

**요청:**
```http
POST /api/auth/shop-session
X-API-Key: {valid-api-key}
Content-Type: application/json

{
  "memberId": "user@example.com",
  "memberName": "홍길동"
}
```

**기대결과:**
- HTTP 상태코드: 400
- 에러 메시지: validation error 관련

---

#### TC-AUTH-005: JWT 토큰 만료 검증

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-AUTH-005 |
| **테스트명** | 만료된 JWT 토큰으로 API 요청 |
| **우선순위** | High |

**사전조건:**
- 만료된 JWT 토큰 준비 (테스트용으로 짧은 만료시간 설정)

**요청:**
```http
GET /api/edit-sessions
Authorization: Bearer {expired-jwt-token}
```

**기대결과:**
- HTTP 상태코드: 401
- 에러 메시지: "Token expired" 또는 유사

---

### 2.2 인증 테스트 매트릭스

| 테스트 ID | 시나리오 | 예상 결과 | 우선순위 |
|-----------|----------|-----------|----------|
| TC-AUTH-001 | 정상 Shop Session 발급 | 201 + JWT | Critical |
| TC-AUTH-002 | 잘못된 API Key | 401 | Critical |
| TC-AUTH-003 | API Key 누락 | 401 | High |
| TC-AUTH-004 | 필수 필드 누락 | 400 | High |
| TC-AUTH-005 | 만료된 JWT | 401 | High |
| TC-AUTH-006 | 변조된 JWT | 401 | High |
| TC-AUTH-007 | 잘못된 JWT 형식 | 401 | Medium |

---

## 3. 편집 세션 플로우 테스트

### 3.1 세션 생성 테스트

#### TC-SESSION-001: 정상적인 세션 생성

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-SESSION-001 |
| **테스트명** | 정상적인 편집 세션 생성 |
| **우선순위** | Critical |
| **사전조건** | 유효한 JWT 토큰, 존재하는 templateSetId |

**요청:**
```http
POST /api/edit-sessions
Authorization: Bearer {jwt-token}
Content-Type: application/json

{
  "orderSeqno": 99999,
  "mode": "both",
  "templateSetId": "ts-001"
}
```

**기대결과:**
```json
{
  "id": "session-uuid",
  "status": "creating",
  "orderSeqno": 99999,
  "mode": "both",
  "templateSetId": "ts-001",
  "createdAt": "2025-12-28T10:00:00Z"
}
```

**검증항목:**
- [ ] HTTP 상태코드 201
- [ ] id가 유효한 UUID 형식
- [ ] status가 "creating"
- [ ] orderSeqno, mode, templateSetId가 요청값과 일치

---

#### TC-SESSION-002: 존재하지 않는 템플릿셋으로 세션 생성

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-SESSION-002 |
| **테스트명** | 존재하지 않는 템플릿셋 ID |
| **우선순위** | High |

**요청:**
```http
POST /api/edit-sessions
Authorization: Bearer {jwt-token}
Content-Type: application/json

{
  "orderSeqno": 99999,
  "mode": "both",
  "templateSetId": "non-existent-id"
}
```

**기대결과:**
- HTTP 상태코드: 404
- 에러 메시지: "Template set not found"

---

### 3.2 세션 저장 테스트

#### TC-SESSION-003: 세션 자동 저장

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-SESSION-003 |
| **테스트명** | 편집 세션 자동 저장 |
| **우선순위** | Critical |
| **사전조건** | 생성된 세션 ID |

**요청:**
```http
PATCH /api/edit-sessions/{sessionId}
Authorization: Bearer {jwt-token}
Content-Type: application/json

{
  "canvasData": {
    "pages": [
      {
        "id": "page-1",
        "objects": [
          { "type": "text", "content": "테스트" }
        ]
      }
    ],
    "version": "2.0"
  },
  "status": "editing"
}
```

**기대결과:**
```json
{
  "id": "session-uuid",
  "status": "editing",
  "canvasData": { ... },
  "updatedAt": "2025-12-28T10:05:00Z"
}
```

**검증항목:**
- [ ] HTTP 상태코드 200
- [ ] status가 "editing"으로 변경
- [ ] canvasData가 저장됨
- [ ] updatedAt이 갱신됨

---

#### TC-SESSION-004: 다른 사용자의 세션 수정 시도

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-SESSION-004 |
| **테스트명** | 권한 없는 세션 수정 시도 |
| **우선순위** | Critical |

**사전조건:**
- 사용자 A가 생성한 세션 ID
- 사용자 B의 JWT 토큰

**요청:**
```http
PATCH /api/edit-sessions/{userA-sessionId}
Authorization: Bearer {userB-jwt-token}
Content-Type: application/json

{
  "canvasData": { ... }
}
```

**기대결과:**
- HTTP 상태코드: 403
- 에러 메시지: "Forbidden" 또는 "Access denied"

---

### 3.3 세션 완료 테스트

#### TC-SESSION-005: 세션 정상 완료

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-SESSION-005 |
| **테스트명** | 편집 세션 정상 완료 |
| **우선순위** | Critical |

**요청:**
```http
PATCH /api/edit-sessions/{sessionId}/complete
Authorization: Bearer {jwt-token}
```

**기대결과:**
```json
{
  "id": "session-uuid",
  "status": "completed",
  "completedAt": "2025-12-28T10:30:00Z"
}
```

**검증항목:**
- [ ] HTTP 상태코드 200
- [ ] status가 "completed"로 변경
- [ ] completedAt이 설정됨

---

#### TC-SESSION-006: 이미 완료된 세션 재완료 시도

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-SESSION-006 |
| **테스트명** | 이미 완료된 세션 재완료 |
| **우선순위** | Medium |

**사전조건:**
- status가 "completed"인 세션

**요청:**
```http
PATCH /api/edit-sessions/{completedSessionId}/complete
Authorization: Bearer {jwt-token}
```

**기대결과:**
- HTTP 상태코드: 400 또는 409
- 에러 메시지: "Session already completed"

---

### 3.4 세션 테스트 매트릭스

| 테스트 ID | 시나리오 | 예상 결과 | 우선순위 |
|-----------|----------|-----------|----------|
| TC-SESSION-001 | 정상 세션 생성 | 201 | Critical |
| TC-SESSION-002 | 없는 템플릿셋 | 404 | High |
| TC-SESSION-003 | 세션 자동 저장 | 200 | Critical |
| TC-SESSION-004 | 권한 없는 수정 | 403 | Critical |
| TC-SESSION-005 | 세션 정상 완료 | 200 | Critical |
| TC-SESSION-006 | 중복 완료 시도 | 400/409 | Medium |
| TC-SESSION-007 | 취소된 세션 수정 | 400 | Medium |
| TC-SESSION-008 | 세션 조회 | 200 | High |
| TC-SESSION-009 | 없는 세션 조회 | 404 | Medium |

---

## 4. 책등 계산 테스트

### 4.1 용지 종류 조회 테스트

#### TC-SPINE-001: 용지 종류 목록 조회

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-SPINE-001 |
| **테스트명** | 용지 종류 목록 조회 |
| **우선순위** | High |

**요청:**
```http
GET /api/products/spine/paper-types
```

**기대결과:**
```json
[
  { "code": "mojo_70g", "name": "모조지 70g", "thickness": 0.09, "category": "body" },
  { "code": "mojo_80g", "name": "모조지 80g", "thickness": 0.10, "category": "body" },
  { "code": "art_200g", "name": "아트지 200g", "thickness": 0.18, "category": "cover" }
]
```

**검증항목:**
- [ ] HTTP 상태코드 200
- [ ] 배열 형태로 반환
- [ ] 각 항목에 code, name, thickness, category 포함
- [ ] thickness가 양수

---

### 4.2 제본 방식 조회 테스트

#### TC-SPINE-002: 제본 방식 목록 조회

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-SPINE-002 |
| **테스트명** | 제본 방식 목록 조회 |
| **우선순위** | High |

**요청:**
```http
GET /api/products/spine/binding-types
```

**기대결과:**
```json
[
  { "code": "perfect", "name": "무선제본", "margin": 0.5, "minPages": 32, "maxPages": null },
  { "code": "saddle", "name": "중철제본", "margin": 0.3, "minPages": null, "maxPages": 64 }
]
```

**검증항목:**
- [ ] HTTP 상태코드 200
- [ ] 배열 형태로 반환
- [ ] 각 항목에 code, name, margin 포함

---

### 4.3 책등 폭 계산 테스트

#### TC-SPINE-003: 정상적인 책등 폭 계산

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-SPINE-003 |
| **테스트명** | 정상적인 책등 폭 계산 |
| **우선순위** | Critical |

**요청:**
```http
POST /api/products/spine/calculate
Content-Type: application/json

{
  "pageCount": 100,
  "paperType": "mojo_80g",
  "bindingType": "perfect"
}
```

**기대결과:**
```json
{
  "spineWidth": 5.5,
  "paperThickness": 0.10,
  "bindingMargin": 0.5,
  "warnings": [],
  "formula": "(100 / 2) × 0.10 + 0.5 = 5.50mm"
}
```

**검증항목:**
- [ ] HTTP 상태코드 201
- [ ] spineWidth = (100/2) × 0.10 + 0.5 = 5.5
- [ ] formula 문자열 포함

---

#### TC-SPINE-004: 최소 페이지수 미달 (무선제본)

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-SPINE-004 |
| **테스트명** | 무선제본 최소 페이지수 미달 |
| **우선순위** | High |

**요청:**
```http
POST /api/products/spine/calculate
Content-Type: application/json

{
  "pageCount": 20,
  "paperType": "mojo_80g",
  "bindingType": "perfect"
}
```

**기대결과:**
- HTTP 상태코드: 400
- 에러 메시지: "무선제본은 최소 32페이지 이상이어야 합니다"

또는 경고와 함께 계산:
```json
{
  "spineWidth": 1.5,
  "warnings": ["무선제본은 최소 32페이지 이상이어야 합니다"]
}
```

---

#### TC-SPINE-005: 최대 페이지수 초과 (중철제본)

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-SPINE-005 |
| **테스트명** | 중철제본 최대 페이지수 초과 |
| **우선순위** | High |

**요청:**
```http
POST /api/products/spine/calculate
Content-Type: application/json

{
  "pageCount": 100,
  "paperType": "mojo_80g",
  "bindingType": "saddle"
}
```

**기대결과:**
- HTTP 상태코드: 400
- 에러 메시지: "중철제본은 최대 64페이지까지 가능합니다"

---

#### TC-SPINE-006: 존재하지 않는 용지 코드

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-SPINE-006 |
| **테스트명** | 존재하지 않는 용지 코드 |
| **우선순위** | High |

**요청:**
```http
POST /api/products/spine/calculate
Content-Type: application/json

{
  "pageCount": 100,
  "paperType": "invalid_paper",
  "bindingType": "perfect"
}
```

**기대결과:**
- HTTP 상태코드: 400
- 에러 메시지: "Invalid paper type"

---

#### TC-SPINE-007: 음수 페이지수

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-SPINE-007 |
| **테스트명** | 음수 페이지수 입력 |
| **우선순위** | Medium |

**요청:**
```http
POST /api/products/spine/calculate
Content-Type: application/json

{
  "pageCount": -10,
  "paperType": "mojo_80g",
  "bindingType": "perfect"
}
```

**기대결과:**
- HTTP 상태코드: 400
- 에러 메시지: validation error

---

### 4.4 책등 계산 테스트 데이터

| pageCount | paperType | bindingType | 예상 spineWidth | 비고 |
|-----------|-----------|-------------|-----------------|------|
| 32 | mojo_70g | perfect | 1.94mm | 최소 무선제본 |
| 50 | mojo_80g | perfect | 3.0mm | 일반 |
| 100 | mojo_80g | perfect | 5.5mm | 일반 |
| 200 | mojo_80g | perfect | 10.5mm | 두꺼운 책 |
| 500 | seokji_70g | perfect | 25.5mm | 매우 두꺼운 책 |
| 16 | mojo_80g | saddle | 1.1mm | 중철제본 |
| 64 | mojo_80g | saddle | 3.5mm | 중철 최대 |
| 100 | art_200g | hardcover | 11.0mm | 양장제본 |

---

### 4.5 책등 계산 테스트 매트릭스

| 테스트 ID | 시나리오 | 예상 결과 | 우선순위 |
|-----------|----------|-----------|----------|
| TC-SPINE-001 | 용지 목록 조회 | 200 + 배열 | High |
| TC-SPINE-002 | 제본 목록 조회 | 200 + 배열 | High |
| TC-SPINE-003 | 정상 계산 | 201 + spineWidth | Critical |
| TC-SPINE-004 | 무선 최소 미달 | 400 또는 warning | High |
| TC-SPINE-005 | 중철 최대 초과 | 400 | High |
| TC-SPINE-006 | 없는 용지 코드 | 400 | High |
| TC-SPINE-007 | 음수 페이지수 | 400 | Medium |
| TC-SPINE-008 | 0 페이지수 | 400 | Medium |
| TC-SPINE-009 | 홀수 페이지수 | 경고 또는 에러 | Medium |
| TC-SPINE-010 | 필드 누락 | 400 | Medium |

---

## 5. PDF 처리 테스트

### 5.1 병합 가능 여부 체크 테스트

#### TC-PDF-001: 정상적인 병합 가능 체크

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-PDF-001 |
| **테스트명** | 정상적인 병합 가능 체크 |
| **우선순위** | Critical |
| **사전조건** | 유효한 세션, 표지/내지 파일 업로드 완료 |

**요청:**
```http
POST /api/worker-jobs/check-mergeable/external
X-API-Key: {api-key}
Content-Type: application/json

{
  "editSessionId": "session-uuid",
  "coverFileId": "cover-file-uuid",
  "contentFileId": "content-file-uuid",
  "spineWidth": 5.5
}
```

**기대결과:**
```json
{
  "mergeable": true
}
```

**검증항목:**
- [ ] HTTP 상태코드 200/201
- [ ] mergeable이 true

---

#### TC-PDF-002: 접근 불가능한 파일로 체크

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-PDF-002 |
| **테스트명** | 존재하지 않는 파일 ID로 체크 |
| **우선순위** | High |

**요청:**
```http
POST /api/worker-jobs/check-mergeable/external
X-API-Key: {api-key}
Content-Type: application/json

{
  "editSessionId": "session-uuid",
  "coverFileId": "non-existent-file-id",
  "contentFileId": "content-file-uuid",
  "spineWidth": 5.5
}
```

**기대결과:**
```json
{
  "mergeable": false,
  "issues": [
    {
      "code": "COVER_FILE_INACCESSIBLE",
      "message": "표지 파일에 접근할 수 없습니다."
    }
  ]
}
```

---

### 5.2 PDF 병합 요청 테스트

#### TC-PDF-003: 정상적인 PDF 병합 요청

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-PDF-003 |
| **테스트명** | 정상적인 PDF 병합 요청 |
| **우선순위** | Critical |

**요청:**
```http
POST /api/worker-jobs/synthesize/external
X-API-Key: {api-key}
Content-Type: application/json

{
  "editSessionId": "session-uuid",
  "coverFileId": "cover-file-uuid",
  "contentFileId": "content-file-uuid",
  "spineWidth": 5.5,
  "orderId": "ORD-2024-12345",
  "priority": "high",
  "callbackUrl": "https://bookmoa.com/api/webhook/synthesis"
}
```

**기대결과:**
```json
{
  "id": "job-uuid",
  "jobType": "SYNTHESIZE",
  "status": "PENDING",
  "options": {
    "orderId": "ORD-2024-12345",
    "callbackUrl": "https://bookmoa.com/api/webhook/synthesis"
  },
  "createdAt": "2025-12-28T10:00:00Z"
}
```

**검증항목:**
- [ ] HTTP 상태코드 201
- [ ] id가 유효한 UUID
- [ ] status가 "PENDING"
- [ ] jobType이 "SYNTHESIZE"

---

#### TC-PDF-004: API Key 없이 병합 요청

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-PDF-004 |
| **테스트명** | API Key 없이 병합 요청 |
| **우선순위** | Critical |

**요청:**
```http
POST /api/worker-jobs/synthesize/external
Content-Type: application/json

{
  "editSessionId": "session-uuid",
  ...
}
```

**기대결과:**
- HTTP 상태코드: 401
- 에러 메시지: "API key is required"

---

### 5.3 작업 상태 조회 테스트

#### TC-PDF-005: 작업 상태 조회

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-PDF-005 |
| **테스트명** | 작업 상태 조회 |
| **우선순위** | High |

**요청:**
```http
GET /api/worker-jobs/external/{jobId}
X-API-Key: {api-key}
```

**기대결과 (처리 중):**
```json
{
  "id": "job-uuid",
  "jobType": "SYNTHESIZE",
  "status": "PROCESSING",
  "progress": 50,
  "createdAt": "2025-12-28T10:00:00Z"
}
```

**기대결과 (완료):**
```json
{
  "id": "job-uuid",
  "jobType": "SYNTHESIZE",
  "status": "COMPLETED",
  "outputFileUrl": "/storage/temp/synthesized_xxx.pdf",
  "result": {
    "totalPages": 52,
    "previewUrl": "/storage/temp/synthesized_xxx_preview.png"
  },
  "createdAt": "2025-12-28T10:00:00Z",
  "completedAt": "2025-12-28T10:00:30Z"
}
```

---

#### TC-PDF-006: 존재하지 않는 작업 조회

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-PDF-006 |
| **테스트명** | 존재하지 않는 작업 ID 조회 |
| **우선순위** | Medium |

**요청:**
```http
GET /api/worker-jobs/external/non-existent-job-id
X-API-Key: {api-key}
```

**기대결과:**
- HTTP 상태코드: 404
- 에러 메시지: "Job not found"

---

### 5.4 PDF 처리 테스트 매트릭스

| 테스트 ID | 시나리오 | 예상 결과 | 우선순위 |
|-----------|----------|-----------|----------|
| TC-PDF-001 | 정상 병합 체크 | mergeable: true | Critical |
| TC-PDF-002 | 없는 파일 체크 | mergeable: false | High |
| TC-PDF-003 | 정상 병합 요청 | 201 + PENDING | Critical |
| TC-PDF-004 | API Key 누락 | 401 | Critical |
| TC-PDF-005 | 작업 상태 조회 | 200 + status | High |
| TC-PDF-006 | 없는 작업 조회 | 404 | Medium |
| TC-PDF-007 | 잘못된 spineWidth | 400 | Medium |
| TC-PDF-008 | 콜백 URL 누락 | 201 (선택값) | Low |
| TC-PDF-009 | 중복 병합 요청 | 409 또는 허용 | Medium |

---

## 6. 웹훅 테스트

### 6.1 웹훅 수신 테스트

#### TC-WEBHOOK-001: 성공 웹훅 수신

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WEBHOOK-001 |
| **테스트명** | PDF 병합 완료 웹훅 수신 |
| **우선순위** | Critical |
| **테스트 방식** | 목(Mock) 서버 또는 실제 콜백 엔드포인트 |

**수신 데이터:**
```http
POST /api/webhook/synthesis
Content-Type: application/json
X-Storige-Event: synthesis.completed
X-Storige-Timestamp: 1703750400

{
  "event": "synthesis.completed",
  "jobId": "job-uuid",
  "orderId": "ORD-2024-12345",
  "status": "completed",
  "outputFileUrl": "/storage/temp/synthesized_xxx.pdf",
  "result": {
    "totalPages": 52,
    "previewUrl": "/storage/temp/synthesized_xxx_preview.png"
  },
  "timestamp": "2025-12-28T10:00:30Z"
}
```

**검증항목:**
- [ ] 웹훅 수신 확인
- [ ] X-Storige-Event 헤더 확인
- [ ] orderId로 주문 상태 업데이트 확인
- [ ] outputFileUrl 접근 가능 확인

---

#### TC-WEBHOOK-002: 실패 웹훅 수신

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WEBHOOK-002 |
| **테스트명** | PDF 병합 실패 웹훅 수신 |
| **우선순위** | High |

**수신 데이터:**
```http
POST /api/webhook/synthesis
Content-Type: application/json
X-Storige-Event: synthesis.failed

{
  "event": "synthesis.failed",
  "jobId": "job-uuid",
  "orderId": "ORD-2024-12345",
  "status": "failed",
  "errorMessage": "Cover PDF is corrupted",
  "timestamp": "2025-12-28T10:00:30Z"
}
```

**검증항목:**
- [ ] 웹훅 수신 확인
- [ ] 실패 상태로 주문 업데이트 확인
- [ ] 에러 메시지 로깅 확인
- [ ] 관리자 알림 발송 확인 (해당시)

---

#### TC-WEBHOOK-003: 웹훅 재시도 검증

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WEBHOOK-003 |
| **테스트명** | 웹훅 재시도 동작 검증 |
| **우선순위** | Medium |

**시나리오:**
1. 콜백 서버가 500 에러 반환
2. Storige Worker가 재시도 수행
3. 최대 3회까지 재시도 확인

**검증항목:**
- [ ] 1차 실패 후 1분 후 재시도
- [ ] 2차 실패 후 5분 후 재시도
- [ ] 3차 실패 후 30분 후 재시도
- [ ] 4차 실패 시 최종 실패 처리

---

### 6.2 웹훅 테스트 매트릭스

| 테스트 ID | 시나리오 | 예상 결과 | 우선순위 |
|-----------|----------|-----------|----------|
| TC-WEBHOOK-001 | 성공 웹훅 수신 | 주문 상태 업데이트 | Critical |
| TC-WEBHOOK-002 | 실패 웹훅 수신 | 실패 처리 + 알림 | High |
| TC-WEBHOOK-003 | 웹훅 재시도 | 최대 3회 재시도 | Medium |
| TC-WEBHOOK-004 | 타임스탬프 만료 | 400 거부 | Medium |
| TC-WEBHOOK-005 | 서명 검증 실패 | 401 거부 | High |

---

## 7. 통합 E2E 테스트

### 7.1 전체 플로우 E2E 테스트

#### TC-E2E-001: 전체 주문 플로우

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-E2E-001 |
| **테스트명** | 전체 주문 플로우 E2E 테스트 |
| **우선순위** | Critical |
| **예상 소요시간** | 3-5분 |

**테스트 단계:**

```
Step 1: 인증
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] POST /auth/shop-session → JWT 토큰 발급
    - 검증: 201 응답, accessToken 존재

Step 2: 템플릿셋 조회
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] GET /template-sets/{id}/with-templates
    - 검증: 200 응답, templates 배열 존재

Step 3: 책등 폭 계산
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] POST /products/spine/calculate
    - 입력: pageCount=100, paperType=mojo_80g, bindingType=perfect
    - 검증: spineWidth=5.5

Step 4: 편집 세션 생성
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] POST /edit-sessions
    - 검증: 201 응답, sessionId 존재, status=creating

Step 5: 편집 세션 저장
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] PATCH /edit-sessions/{sessionId}
    - 입력: canvasData (테스트용 JSON)
    - 검증: 200 응답, status=editing

Step 6: 편집 세션 완료
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] PATCH /edit-sessions/{sessionId}/complete
    - 검증: 200 응답, status=completed

Step 7: 파일 업로드 (표지/내지)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] POST /files/upload (표지 PDF)
    - 검증: 201 응답, coverFileId 존재
[ ] POST /files/upload (내지 PDF)
    - 검증: 201 응답, contentFileId 존재

Step 8: PDF 병합 요청
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] POST /worker-jobs/synthesize/external
    - 검증: 201 응답, jobId 존재, status=PENDING

Step 9: 작업 완료 대기 (Polling)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] GET /worker-jobs/external/{jobId} (반복)
    - 검증: status=COMPLETED, outputFileUrl 존재

Step 10: 웹훅 수신 확인
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] 콜백 서버에서 웹훅 수신 확인
    - 검증: event=synthesis.completed
```

---

#### TC-E2E-002: 에디터 브라우저 테스트

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-E2E-002 |
| **테스트명** | 에디터 브라우저 E2E 테스트 |
| **우선순위** | High |
| **도구** | Playwright 또는 Cypress |

**테스트 시나리오:**

```javascript
// Playwright 테스트 예시
test('에디터 전체 플로우', async ({ page }) => {
  // 1. 에디터 페이지 로드
  await page.goto('/editor?templateSetId=ts-001&pageCount=50');

  // 2. 에디터 로드 대기
  await page.waitForSelector('#editor-canvas');

  // 3. 텍스트 추가
  await page.click('[data-tool="text"]');
  await page.click('#editor-canvas');
  await page.keyboard.type('테스트 텍스트');

  // 4. 이미지 추가
  await page.click('[data-tool="image"]');
  await page.setInputFiles('input[type="file"]', 'test-image.jpg');

  // 5. 저장 버튼 클릭
  await page.click('[data-action="save"]');
  await page.waitForResponse(resp => resp.url().includes('/edit-sessions'));

  // 6. 완료 버튼 클릭
  await page.click('[data-action="complete"]');

  // 7. 리다이렉트 확인
  await expect(page).toHaveURL(/mypage/);
});
```

---

### 7.2 E2E 테스트 매트릭스

| 테스트 ID | 시나리오 | 예상 소요시간 | 우선순위 |
|-----------|----------|--------------|----------|
| TC-E2E-001 | 전체 주문 플로우 | 3-5분 | Critical |
| TC-E2E-002 | 에디터 브라우저 테스트 | 2분 | High |
| TC-E2E-003 | 에러 복구 플로우 | 3분 | Medium |
| TC-E2E-004 | 동시 편집 충돌 | 2분 | Medium |
| TC-E2E-005 | 대용량 PDF 처리 | 10분 | Medium |

---

## 부록

### A. 테스트 환경 설정

```bash
# 테스트 DB 초기화
cd storige
pnpm --filter @storige/api test:db:reset

# 테스트 실행
pnpm --filter @storige/api test           # 단위 테스트
pnpm --filter @storige/api test:e2e       # E2E 테스트
pnpm --filter @storige/api test:cov       # 커버리지
```

### B. 테스트 데이터 시드

```typescript
// test/fixtures/seed-data.ts
export const testData = {
  templateSet: {
    id: 'ts-test-001',
    name: '테스트 템플릿셋',
    type: 'booklet',
  },
  paperTypes: [
    { code: 'mojo_80g', name: '모조지 80g', thickness: 0.10 },
  ],
  bindingTypes: [
    { code: 'perfect', name: '무선제본', margin: 0.5, minPages: 32 },
  ],
};
```

### C. 테스트 결과 체크리스트

| 영역 | 테스트 수 | 통과 | 실패 | 스킵 |
|------|----------|------|------|------|
| 인증 | 7 | | | |
| 편집 세션 | 9 | | | |
| 책등 계산 | 10 | | | |
| PDF 처리 | 9 | | | |
| 웹훅 | 5 | | | |
| E2E | 5 | | | |
| **합계** | **45** | | | |

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0 | 2025-12-28 | 최초 작성 |
