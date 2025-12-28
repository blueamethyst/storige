# Storige-Bookmoa 서비스 플로우 테스트 케이스

> **문서 버전**: 1.3
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
7. [워커 유닛 테스트](#7-워커-유닛-테스트)
8. [통합 E2E 테스트](#8-통합-e2e-테스트)

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

## 7. 워커 유닛 테스트

> **테스트 파일**: `apps/worker/src/utils/ghostscript.spec.ts`
> **실행 명령**: `pnpm --filter @storige/worker test`

워커 서비스는 PDF 검증 및 처리를 담당합니다. 주요 테스트 케이스를 아래에 정리합니다.

---

### 7.1 별색(Spot Color) 감지 테스트 (WBS 4.1)

#### TC-WORKER-001: PANTONE 별색 감지

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WORKER-001 |
| **테스트명** | PANTONE 별색 감지 |
| **우선순위** | High |
| **테스트 파일** | `test/fixtures/pdf/spot-color/spot-only.pdf` |

**검증항목:**
- [ ] `hasSpotColors`가 `true`
- [ ] `spotColorNames`에 "PANTONE" 포함
- [ ] Separation colorspace 감지

---

#### TC-WORKER-002: DeviceN 컬러스페이스 별색 감지

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WORKER-002 |
| **테스트명** | DeviceN 컬러스페이스 별색 감지 |
| **우선순위** | High |

**검증항목:**
- [ ] DeviceN [Cyan, Magenta, CutContour] 감지
- [ ] `spotColorNames`에 "CutContour" 포함

---

#### TC-WORKER-003: 순수 별색 PDF 감지 (후가공용)

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WORKER-003 |
| **테스트명** | 순수 별색 PDF 감지 (CMYK 잉크 없음) |
| **우선순위** | Critical |
| **테스트 파일** | `test/fixtures/pdf/spot-color/success-spot-only.pdf` |

**검증항목:**
- [ ] `hasSpotColors`가 `true`
- [ ] `spotColorNames`에 "CutContour", "Crease" 포함
- [ ] CMYK 잉크 커버리지 0%

---

#### TC-WORKER-004: RGB PDF에서 별색 미감지

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WORKER-004 |
| **테스트명** | RGB PDF에서 별색 미감지 |
| **우선순위** | High |
| **테스트 파일** | `test/fixtures/pdf/rgb/success-a4-single.pdf` |

**검증항목:**
- [ ] `hasSpotColors`가 `false`
- [ ] `spotColorNames`가 빈 배열

---

### 7.2 투명도/오버프린트 감지 테스트 (WBS 4.2)

#### TC-WORKER-005: 투명도 감지

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WORKER-005 |
| **테스트명** | 투명도 감지 |
| **우선순위** | Medium |
| **테스트 파일** | `test/fixtures/pdf/transparency/warn-with-transparency.pdf` |

**검증항목:**
- [ ] `hasTransparency`가 `true`
- [ ] Blend mode (/BM /Multiply) 감지

---

#### TC-WORKER-006: 오버프린트 감지

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WORKER-006 |
| **테스트명** | 오버프린트 감지 |
| **우선순위** | Medium |
| **테스트 파일** | `test/fixtures/pdf/transparency/warn-with-overprint.pdf` |

**검증항목:**
- [ ] `hasOverprint`가 `true`
- [ ] /OP true 또는 /op true 감지

---

#### TC-WORKER-007: 투명도+오버프린트 동시 감지

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WORKER-007 |
| **테스트명** | 투명도+오버프린트 동시 감지 |
| **우선순위** | Medium |
| **테스트 파일** | `test/fixtures/pdf/transparency/warn-both-trans-overprint.pdf` |

**검증항목:**
- [ ] `hasTransparency`가 `true`
- [ ] `hasOverprint`가 `true`

---

### 7.3 CMYK 구조 감지 테스트

#### TC-WORKER-008: DeviceCMYK 감지

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WORKER-008 |
| **테스트명** | DeviceCMYK 컬러스페이스 감지 |
| **우선순위** | Critical |
| **테스트 파일** | `test/fixtures/pdf/cmyk/fail-cmyk-for-postprocess.pdf` |

**검증항목:**
- [ ] PDF 바이너리에 `/DeviceCMYK` 시그니처 존재
- [ ] 후가공 파일에서 CMYK 사용 시 에러 코드 `POST_PROCESS_CMYK` 반환

---

#### TC-WORKER-009: RGB PDF에서 CMYK 미감지

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WORKER-009 |
| **테스트명** | RGB PDF에서 DeviceCMYK 미감지 |
| **우선순위** | High |
| **테스트 파일** | `test/fixtures/pdf/cmyk/success-rgb-only.pdf` |

**검증항목:**
- [ ] PDF 바이너리에 `/DeviceCMYK` 시그니처 없음

---

### 7.4 폰트 감지 테스트

#### TC-WORKER-010: 폰트 없는 PDF 처리

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WORKER-010 |
| **테스트명** | 폰트 없는 PDF 처리 |
| **우선순위** | High |

**검증항목:**
- [ ] `fontCount`가 `0`
- [ ] `fonts`가 빈 배열
- [ ] `hasUnembeddedFonts`가 `false`
- [ ] `allFontsEmbedded`가 `true`

---

#### TC-WORKER-011: 폰트 감지 및 FontInfo 구조 검증

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WORKER-011 |
| **테스트명** | 폰트 감지 및 FontInfo 구조 검증 |
| **우선순위** | High |
| **테스트 파일** | `test/fixtures/pdf/rgb/success-a4-single.pdf` |

**검증항목:**
- [ ] `FontInfo` 객체에 `name`, `type`, `embedded`, `subset` 속성 포함
- [ ] 각 속성의 타입이 올바름 (string, string, boolean, boolean)

---

#### TC-WORKER-012: 서브셋 폰트 임베딩 감지

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WORKER-012 |
| **테스트명** | 서브셋 폰트 임베딩 감지 |
| **우선순위** | High |

**검증항목:**
- [ ] 서브셋 폰트 (ABCDEF+FontName 형식)는 `subset: true`
- [ ] 서브셋 폰트는 `embedded: true`

---

#### TC-WORKER-013: PDF 14 표준 폰트 인식

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WORKER-013 |
| **테스트명** | PDF 14 표준 폰트 인식 |
| **우선순위** | Medium |

**검증항목:**
- [ ] Helvetica, Times-Roman, Courier 등 표준 폰트 인식
- [ ] 표준 폰트는 `unembeddedFonts`에 포함되지 않음

---

### 7.5 이미지 해상도 감지 테스트

#### TC-WORKER-014: 이미지 없는 PDF 처리

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WORKER-014 |
| **테스트명** | 이미지 없는 PDF 처리 |
| **우선순위** | High |

**검증항목:**
- [ ] `imageCount`가 `0`
- [ ] `hasLowResolution`가 `false`
- [ ] `minResolution`가 `0`
- [ ] `avgResolution`가 `0`

---

#### TC-WORKER-015: 이미지 해상도 감지

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WORKER-015 |
| **테스트명** | 이미지 해상도 감지 |
| **우선순위** | Critical |
| **테스트 파일** | `test/fixtures/pdf/rgb/success-a4-single.pdf` |

**검증항목:**
- [ ] `ImageInfo` 객체에 필수 속성 포함
  - `index`, `pixelWidth`, `pixelHeight`
  - `displayWidthMm`, `displayHeightMm`
  - `effectiveDpiX`, `effectiveDpiY`, `minEffectiveDpi`

---

#### TC-WORKER-016: 저해상도 이미지 감지

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WORKER-016 |
| **테스트명** | 저해상도 이미지 감지 (150 DPI 미만) |
| **우선순위** | Critical |

**검증항목:**
- [ ] 기본 임계값 150 DPI 적용
- [ ] `hasLowResolution`가 `true` (저해상도 이미지 존재 시)
- [ ] `lowResImages` 배열에 저해상도 이미지 정보 포함

---

### 7.6 에지 케이스 테스트

#### TC-WORKER-017: 빈 PDF 처리

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WORKER-017 |
| **테스트명** | 빈 PDF 처리 |
| **우선순위** | Medium |

**검증항목:**
- [ ] 별색 감지: `hasSpotColors: false`
- [ ] 투명도 감지: `hasTransparency: false`
- [ ] 오버프린트 감지: `hasOverprint: false`
- [ ] 폰트 감지: `fontCount: 0`
- [ ] 이미지 감지: `imageCount: 0`

---

#### TC-WORKER-018: 다중 페이지 PDF 처리

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-WORKER-018 |
| **테스트명** | 다중 페이지 PDF 처리 (10페이지, 64페이지) |
| **우선순위** | Medium |

**검증항목:**
- [ ] 모든 페이지 정상 처리
- [ ] 대용량 PDF에서도 타임아웃 없이 처리 완료

---

### 7.7 워커 유닛 테스트 매트릭스

| 테스트 ID | 시나리오 | 예상 결과 | 우선순위 |
|-----------|----------|-----------|----------|
| TC-WORKER-001 | PANTONE 별색 감지 | hasSpotColors: true | High |
| TC-WORKER-002 | DeviceN 별색 감지 | CutContour 감지 | High |
| TC-WORKER-003 | 순수 별색 PDF | 후가공 파일 검증 통과 | Critical |
| TC-WORKER-004 | RGB PDF 별색 미감지 | hasSpotColors: false | High |
| TC-WORKER-005 | 투명도 감지 | hasTransparency: true | Medium |
| TC-WORKER-006 | 오버프린트 감지 | hasOverprint: true | Medium |
| TC-WORKER-007 | 투명도+오버프린트 동시 | 둘 다 true | Medium |
| TC-WORKER-008 | DeviceCMYK 감지 | 후가공 에러 | Critical |
| TC-WORKER-009 | RGB PDF CMYK 미감지 | DeviceCMYK 없음 | High |
| TC-WORKER-010 | 폰트 없는 PDF | fontCount: 0 | High |
| TC-WORKER-011 | FontInfo 구조 | 속성 검증 통과 | High |
| TC-WORKER-012 | 서브셋 폰트 | embedded: true | High |
| TC-WORKER-013 | 표준 폰트 인식 | unembedded에 미포함 | Medium |
| TC-WORKER-014 | 이미지 없는 PDF | imageCount: 0 | High |
| TC-WORKER-015 | 이미지 해상도 감지 | ImageInfo 검증 | Critical |
| TC-WORKER-016 | 저해상도 감지 | hasLowResolution: true | Critical |
| TC-WORKER-017 | 빈 PDF 처리 | 에러 없이 처리 | Medium |
| TC-WORKER-018 | 다중 페이지 PDF | 타임아웃 없이 처리 | Medium |

---

### 7.8 테스트 픽스처 디렉토리 구조

```
apps/worker/test/fixtures/pdf/
├── rgb/
│   ├── success-a4-single.pdf       # 단일 페이지 A4 RGB
│   ├── success-a4-8pages.pdf       # 8페이지 RGB
│   └── success-a4-with-bleed.pdf   # 재단 여백 포함 RGB
├── cmyk/
│   ├── fail-cmyk-for-postprocess.pdf  # 후가공용 CMYK (에러)
│   └── success-rgb-only.pdf           # RGB 전용
├── spot-color/
│   ├── spot-only.pdf                  # PANTONE + DeviceN
│   ├── success-spot-only.pdf          # 순수 별색 (후가공용)
│   └── warn-cmyk-spot-mixed.pdf       # CMYK + 별색 혼합
├── transparency/
│   ├── warn-with-transparency.pdf     # 투명도 포함
│   ├── warn-with-overprint.pdf        # 오버프린트 포함
│   ├── warn-both-trans-overprint.pdf  # 둘 다 포함
│   └── success-no-transparency.pdf    # 투명도 없음
└── font/                              # 폰트 테스트용
```

---

### 7.9 비즈니스 시나리오 테스트

> **테스트 파일**: `apps/worker/test/integration/scenario.e2e-spec.ts`

실제 인쇄 주문 워크플로우를 시뮬레이션하는 시나리오 기반 통합 테스트입니다.

---

#### SC-COVER-001: 무선제본 표지 검증 (책등 포함)

| 항목 | 내용 |
|------|------|
| **시나리오 ID** | SC-COVER-001 |
| **시나리오명** | 무선제본 표지 검증 (책등 포함) |
| **우선순위** | Critical |

**시나리오:**
1. 고객이 100페이지 무선제본 책의 표지를 업로드
2. 책등 폭: 5.5mm (100/2 × 0.10 + 0.5)
3. 표지 크기: (210 + 3) × 2 + 5.5 = 431.5mm (폭) × 303mm (높이)

**검증항목:**
- [ ] 표지 파일은 1페이지
- [ ] 책등 포함된 폭 검증
- [ ] 잘못된 책등 폭 시 SPINE_SIZE_MISMATCH 에러

---

#### SC-PP-001: 후가공 파일 별색 검증

| 항목 | 내용 |
|------|------|
| **시나리오 ID** | SC-PP-001 |
| **시나리오명** | 후가공 파일 별색 검증 |
| **우선순위** | Critical |

**시나리오:**
1. 도무송(CutContour) + 접선(Crease) 별색만 포함된 후가공 파일 업로드
2. CMYK 잉크가 없어야 함 (순수 별색 파일)

**검증항목:**
- [ ] `hasSpotColors`가 `true`
- [ ] CutContour, Crease 별색 감지
- [ ] CMYK 사용 시 POST_PROCESS_CMYK 에러

---

#### SC-FONT-001: 폰트 임베딩 검증

| 항목 | 내용 |
|------|------|
| **시나리오 ID** | SC-FONT-001 |
| **시나리오명** | 폰트 임베딩 검증 |
| **우선순위** | High |

**시나리오:**
1. 모든 폰트가 임베딩된 파일 검증
2. 서브셋 폰트 (ABCDEF+FontName) 인식
3. PDF 14 표준 폰트 처리

**검증항목:**
- [ ] `hasUnembeddedFonts`가 `false`
- [ ] 서브셋 폰트는 `embedded: true`
- [ ] 표준 폰트는 미임베딩 경고 대상 아님

---

#### SC-RES-001: 이미지 해상도 검증

| 항목 | 내용 |
|------|------|
| **시나리오 ID** | SC-RES-001 |
| **시나리오명** | 이미지 해상도 검증 |
| **우선순위** | High |

**시나리오:**
1. 인쇄용 고해상도 이미지 (300 DPI 이상) 검증
2. 저해상도 이미지 (150 DPI 미만) 경고
3. 커스텀 DPI 임계값 적용

**검증항목:**
- [ ] 저해상도 이미지 시 `hasLowResolution: true`
- [ ] `lowResImages` 배열에 저해상도 이미지 정보

---

#### SC-FLOW-001: 전체 주문 플로우 검증

| 항목 | 내용 |
|------|------|
| **시나리오 ID** | SC-FLOW-001 |
| **시나리오명** | 무선제본 책 주문 (표지+내지) |
| **우선순위** | Critical |

**시나리오:**
```
1. 고객이 A4 무선제본 100페이지 책 주문
2. 표지 PDF 업로드 (책등 포함)
3. 내지 PDF 업로드 (100페이지)
4. 두 파일 모두 검증 통과해야 주문 진행
```

**검증항목:**
- [ ] 내지: 페이지 수, 크기, 별색, 투명도, 폰트 검증
- [ ] 표지: 책등 크기, 펼침면 크기 검증
- [ ] 모든 검증 통과 시 주문 진행 가능

---

#### SC-ISSUE-001: 실제 인쇄 문제 사례

| 항목 | 내용 |
|------|------|
| **시나리오 ID** | SC-ISSUE-001 |
| **시나리오명** | 실제 인쇄 문제 사례 검증 |
| **우선순위** | High |

**시나리오:**
1. 투명도로 인한 RIP 출력 문제 감지
2. 흰색 오버프린트로 인한 출력 누락 감지
3. PANTONE 별색 CMYK 변환 경고

**검증항목:**
- [ ] 투명도 감지 시 경고
- [ ] 오버프린트 감지 시 경고
- [ ] PANTONE 별색 감지 시 변환 경고

---

### 7.10 시나리오 테스트 매트릭스

| 시나리오 ID | 시나리오명 | 예상 결과 | 우선순위 |
|-------------|----------|-----------|----------|
| SC-COVER-001 | 무선제본 표지 검증 | 책등 크기 검증 | Critical |
| SC-COVER-002 | 중철제본 표지 검증 | 펼침면 크기 검증 | High |
| SC-PP-001 | 후가공 별색 검증 | 순수 별색 통과 | Critical |
| SC-PP-002 | 후가공 CMYK 에러 | POST_PROCESS_CMYK | Critical |
| SC-PP-003 | 후가공 투명도/오버프린트 | 경고 반환 | Medium |
| SC-FONT-001 | 폰트 임베딩 | allEmbedded: true | High |
| SC-FONT-002 | 서브셋 폰트 | embedded: true | High |
| SC-FONT-003 | 표준 폰트 | 경고 없음 | Medium |
| SC-RES-001 | 고해상도 이미지 | 경고 없음 | High |
| SC-RES-002 | 저해상도 이미지 | 경고 반환 | High |
| SC-FLOW-001 | 무선제본 전체 플로우 | 주문 진행 가능 | Critical |
| SC-FLOW-002 | 중철제본 전체 플로우 | 4의 배수 검증 | High |
| SC-EDGE-001 | 빈 PDF 처리 | 에러 없이 처리 | Medium |
| SC-EDGE-002 | 대용량 PDF (100페이지) | 5초 이내 처리 | Medium |
| SC-EDGE-003 | 손상된 파일 | 에러 반환 | High |
| SC-EDGE-004 | 병렬 검증 | 모든 검증 성공 | Medium |
| SC-ISSUE-001 | 투명도 문제 | 경고 반환 | High |
| SC-ISSUE-002 | 오버프린트 문제 | 경고 반환 | High |
| SC-ISSUE-003 | 별색 변환 경고 | PANTONE 감지 | High |

---

### 7.11 헬스체크 테스트

> **테스트 파일**: `apps/worker/src/health/health.controller.spec.ts`

워커 서비스의 헬스체크 엔드포인트를 검증하는 테스트입니다.

---

#### TC-HEALTH-001: 헬스체크 기본 응답

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-HEALTH-001 |
| **테스트명** | 헬스체크 기본 응답 검증 |
| **우선순위** | Critical |
| **엔드포인트** | `GET /health` |

**기대결과:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-28T11:00:00.000Z",
  "uptime": 3600.5,
  "environment": "production",
  "version": "1.0.0",
  "queues": { ... }
}
```

**검증항목:**
- [ ] `status`가 `"ok"`
- [ ] `timestamp`가 ISO 8601 형식
- [ ] `uptime`이 0보다 큼
- [ ] `environment`가 정의됨
- [ ] `version`이 정의됨
- [ ] `queues` 객체 존재

---

#### TC-HEALTH-002: 큐 상태 카운트 검증

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-HEALTH-002 |
| **테스트명** | 큐별 작업 카운트 검증 |
| **우선순위** | High |

**기대결과:**
```json
{
  "queues": {
    "validation": { "waiting": 5, "active": 2, "completed": 100, "failed": 3, "delayed": 0 },
    "conversion": { "waiting": 1, "active": 0, "completed": 50, "failed": 0, "delayed": 0 },
    "synthesis": { "waiting": 0, "active": 1, "completed": 25, "failed": 0, "delayed": 0 }
  }
}
```

**검증항목:**
- [ ] `validation` 큐 카운트 반환
- [ ] `conversion` 큐 카운트 반환
- [ ] `synthesis` 큐 카운트 반환
- [ ] 각 큐에 `waiting`, `active`, `completed`, `failed`, `delayed` 포함

---

#### TC-HEALTH-003: Readiness 체크 (Redis 연결)

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-HEALTH-003 |
| **테스트명** | Readiness 체크 - Redis 연결 확인 |
| **우선순위** | Critical |
| **엔드포인트** | `GET /health/ready` |

**기대결과 (정상):**
```json
{ "status": "ready" }
```

**기대결과 (Redis 연결 실패):**
```json
{ "status": "not_ready", "error": "Redis connection failed" }
```

**검증항목:**
- [ ] Redis 연결 시 `status: "ready"`
- [ ] Redis 연결 실패 시 `status: "not_ready"`
- [ ] 연결 실패 시 `error` 메시지 포함

---

#### TC-HEALTH-004: Liveness 체크

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-HEALTH-004 |
| **테스트명** | Liveness 체크 |
| **우선순위** | High |
| **엔드포인트** | `GET /health/live` |

**기대결과:**
```json
{ "status": "alive" }
```

**검증항목:**
- [ ] 항상 `status: "alive"` 반환
- [ ] 외부 의존성 없이 즉시 응답

---

#### TC-HEALTH-005: 빈 큐 처리

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-HEALTH-005 |
| **테스트명** | 빈 큐 상태 처리 |
| **우선순위** | Medium |

**검증항목:**
- [ ] 모든 카운트가 0인 경우 정상 처리
- [ ] 에러 없이 응답 반환

---

#### TC-HEALTH-006: 대량 작업 카운트 처리

| 항목 | 내용 |
|------|------|
| **테스트 ID** | TC-HEALTH-006 |
| **테스트명** | 대량 작업 카운트 처리 |
| **우선순위** | Medium |

**검증항목:**
- [ ] `waiting: 10000` 정상 처리
- [ ] `completed: 1000000` 정상 처리
- [ ] 큰 숫자도 에러 없이 반환

---

### 7.12 헬스체크 테스트 매트릭스

| 테스트 ID | 시나리오 | 예상 결과 | 우선순위 |
|-----------|----------|-----------|----------|
| TC-HEALTH-001 | 기본 헬스체크 | status: ok + 메타데이터 | Critical |
| TC-HEALTH-002 | 큐 카운트 | 3개 큐 카운트 반환 | High |
| TC-HEALTH-003 | Readiness 체크 | Redis ping 성공/실패 | Critical |
| TC-HEALTH-004 | Liveness 체크 | status: alive | High |
| TC-HEALTH-005 | 빈 큐 처리 | 에러 없음 | Medium |
| TC-HEALTH-006 | 대량 카운트 | 에러 없음 | Medium |

---

## 8. 통합 E2E 테스트

### 8.1 전체 플로우 E2E 테스트

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

### 8.2 E2E 테스트 매트릭스

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
| 워커 유닛 | 18 | | | |
| 워커 시나리오 | 19 | | | |
| 헬스체크 | 6 | | | |
| E2E | 5 | | | |
| **합계** | **88** | | | |

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0 | 2025-12-28 | 최초 작성 |
| 1.1 | 2025-12-28 | 워커 유닛 테스트 섹션 추가 (폰트/이미지 해상도/별색/투명도/CMYK 감지) |
| 1.2 | 2025-12-28 | 워커 비즈니스 시나리오 테스트 추가 (표지/후가공/폰트/해상도/주문플로우) |
| 1.3 | 2025-12-28 | 헬스체크 테스트 섹션 추가 (기본 응답/큐 상태/Readiness/Liveness) |
