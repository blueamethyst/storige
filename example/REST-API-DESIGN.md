# REST API 설계서 (REST API Design)

> 상위 문서: [SYSTEM-ARCHITECTURE.md](./SYSTEM-ARCHITECTURE.md)

---

## 1. 개요

WowMall REST API는 **Spring WebFlux**를 기반으로 구축된 리액티브 API입니다. GraphQL로 처리하기 어려운 특수한 케이스(인증, 외부 결제 콜백 등)를 위해 사용됩니다.

### 1.1 API 특징
- **Non-blocking I/O**: Kotlin Coroutine 기반 비동기 처리
- **JWT 인증**: Access Token + Refresh Token 방식
- **역할 기반 접근 제어**: Spring Security `@PreAuthorize` 어노테이션
- **일관된 응답 형식**: `ApiResponse<T>` 래퍼 사용

---

## 2. API 아키텍처

```mermaid
graph TB
    subgraph "Client Layer"
        Frontend[Frontend Apps]
        PG[결제 게이트웨이<br/>Nicepay]
    end

    subgraph "API Layer"
        Auth[/api/auth/*<br/>인증 API/]
        Payment[/api/payment/*<br/>결제 콜백 API/]
    end

    subgraph "Service Layer"
        AuthSvc[Authentication Service]
        UserSvc[User Service]
        PaymentSvc[Payment Service]
        OrderSvc[Order Service]
    end

    subgraph "External Services"
        Firebase[Firebase Admin SDK]
        DB[(Database)]
    end

    Frontend -->|Login/Register| Auth
    Frontend -->|Token Refresh| Auth
    PG -->|Payment Callback| Payment
    PG -->|Webhook| Payment

    Auth --> AuthSvc
    Auth --> UserSvc
    Payment --> PaymentSvc
    Payment --> OrderSvc

    AuthSvc --> Firebase
    AuthSvc --> DB
    PaymentSvc --> DB

    classDef client fill:#e1f5fe,stroke:#01579b
    classDef api fill:#e8f5e9,stroke:#2e7d32
    classDef service fill:#fff3e0,stroke:#ff6f00
    classDef external fill:#fce4ec,stroke:#c2185b

    class Frontend,PG client
    class Auth,Payment api
    class AuthSvc,UserSvc,PaymentSvc,OrderSvc service
    class Firebase,DB external
```

---

## 3. 공통 응답 형식

### 3.1 ApiResponse 구조
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": "2024-01-15T09:30:00.000"
}
```

### 3.2 성공 응답
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "tokenType": "Bearer",
    "expiresIn": 3600,
    "role": "CUSTOMER"
  },
  "timestamp": "2024-01-15T09:30:00.000"
}
```

### 3.3 에러 응답
```json
{
  "success": false,
  "error": "Invalid credentials",
  "timestamp": "2024-01-15T09:30:00.000"
}
```

---

## 4. 인증 API (Auth Controller)

**Base Path**: `/api/auth`

### 4.1 이메일 로그인

로그인하여 액세스 토큰과 리프레시 토큰을 발급받습니다.

```
POST /api/auth/login/email
```

#### Request
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "CUSTOMER",
  "storeId": "U3RvcmU6MTIz"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `email` | string | O | 이메일 주소 (유효한 이메일 형식) |
| `password` | string | O | 비밀번호 |
| `role` | enum | O | 사용자 역할 |
| `storeId` | string | △ | 상점 ID (CUSTOMER 역할인 경우 필수) |

**role 값**:
- `CUSTOMER`: 고객
- `SELLER`: 판매자
- `MANAGER`: 매니저
- `ADMIN`: 관리자
- `SUPER_ADMIN`: 최고 관리자

#### Response

**200 OK**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "tokenType": "Bearer",
    "expiresIn": 3600,
    "role": "CUSTOMER"
  }
}
```

**401 Unauthorized**
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

---

### 4.2 이메일 회원가입

새로운 사용자를 등록합니다.

```
POST /api/auth/register/email
```

#### Request
```json
{
  "email": "newuser@example.com",
  "password": "SecurePass1!",
  "role": "CUSTOMER",
  "storeId": "U3RvcmU6MTIz",
  "invitationToken": null
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `email` | string | O | 이메일 주소 |
| `password` | string | O | 비밀번호 (8자 이상, 영문+숫자 포함) |
| `role` | enum | O | 사용자 역할 |
| `storeId` | string | △ | 상점 ID (CUSTOMER 역할인 경우 필수) |
| `invitationToken` | string | △ | 초대 토큰 (MANAGER/ADMIN/SUPER_ADMIN인 경우 필수) |

**비밀번호 규칙**: `^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$`
- 최소 8자
- 영문자 1개 이상
- 숫자 1개 이상
- 특수문자 허용: `@$!%*?&`

#### Response

**201 Created**
```json
{
  "success": true,
  "data": {
    "id": "VXNlcjoxMjM=",
    "email": "newuser@example.com",
    "role": "CUSTOMER",
    "status": "ACTIVE",
    "storeId": "U3RvcmU6MTIz",
    "createdAt": "2024-01-15T09:30:00+09:00"
  }
}
```

**400 Bad Request**
```json
{
  "success": false,
  "error": "Invalid password format"
}
```

**409 Conflict**
```json
{
  "success": false,
  "error": "Email already exists"
}
```

---

### 4.3 토큰 갱신

리프레시 토큰을 사용하여 새로운 액세스 토큰을 발급받습니다.

```
POST /api/auth/refresh
```

#### Request
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `refreshToken` | string | O | 유효한 리프레시 토큰 |

#### Response

**200 OK**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "tokenType": "Bearer",
    "expiresIn": 3600,
    "role": "CUSTOMER"
  }
}
```

**401 Unauthorized**
```json
{
  "success": false,
  "error": "Invalid refresh token"
}
```

---

### 4.4 Firebase 토큰 발급

인증된 사용자를 위한 Firebase Custom Token을 발급합니다.

```
POST /api/auth/firebase-token
```

#### Headers
```
Authorization: Bearer {accessToken}
```

#### Request
빈 본문

#### Response

**200 OK**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJSUzI1NiIs..."
  }
}
```

**인증 요구사항**: 다음 역할 중 하나 필요
- `ROLE_CUSTOMER`
- `ROLE_SELLER`
- `ROLE_MANAGER`
- `ROLE_ADMIN`
- `ROLE_SUPER_ADMIN`

---

### 4.5 토큰 검증

토큰의 유효성을 검사합니다.

```
POST /api/auth/validate
```

#### Request
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Response

**200 OK**
```json
{
  "success": true,
  "data": true
}
```

또는

```json
{
  "success": true,
  "data": false
}
```

---

## 5. 비밀번호 API (Password Controller)

**Base Path**: `/api/auth/password`

### 5.1 비밀번호 변경

로그인된 사용자의 비밀번호를 변경합니다.

```
POST /api/auth/password/change
```

#### Headers
```
Authorization: Bearer {accessToken}
```

#### Request
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `currentPassword` | string | O | 현재 비밀번호 |
| `newPassword` | string | O | 새 비밀번호 (비밀번호 규칙 적용) |

#### Response

**200 OK**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "비밀번호가 변경되었습니다."
  }
}
```

**400 Bad Request**
```json
{
  "success": false,
  "error": "사용자가 존재하지 않습니다"
}
```

또는

```json
{
  "success": false,
  "error": "현재 비밀번호가 일치하지 않습니다"
}
```

---

## 6. 결제 콜백 API (Payment Controller)

**Base Path**: `/api/payment`

### 6.1 Nicepay 카드 결제 콜백

Nicepay에서 카드 결제 승인 결과를 수신합니다.

```
GET/POST /api/payment/nicepay/card
GET/POST /api/payment/nicepay/callback
```

#### Request (Form Data)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `tid` | string | O | Nicepay 거래 ID |
| `orderId` | string | O | 주문 ID |
| `authResultCode` | string | O | 승인 결과 코드 ("0000" = 성공) |
| `authResultMsg` | string | O | 승인 결과 메시지 |
| `clientId` | string | O | 클라이언트 ID |
| `amount` | integer | O | 결제 금액 (원) |
| `mallReserved` | string | X | 가맹점 예약 데이터 (JSON) |
| `authToken` | string | X | 인증 토큰 |
| `signature` | string | X | 서명 |

**mallReserved JSON 구조**:
```json
{
  "successUrl": "https://shop.example.com/order/success",
  "failureUrl": "https://shop.example.com/checkout/error"
}
```

#### Response

**302 Redirect**

성공 시 (`authResultCode == "0000"`):
```
Location: {successUrl}?orderId={orderId}&code={authResultCode}
```

실패 시:
```
Location: {failureUrl}?orderId={orderId}&code={authResultCode}
```

처리 오류 시:
```
Location: {failureUrl}?orderId={orderId}&code={authResultCode}&reason=PROCESSING_ERROR
```

#### 처리 흐름

```mermaid
sequenceDiagram
    participant PG as Nicepay
    participant API as Payment API
    participant PS as Payment Service
    participant DB as Database

    PG->>API: POST /nicepay/callback
    API->>API: 필드 검증 (orderId, tid)

    alt authResultCode == "0000"
        API->>PS: authorize(orderId, tid, amount)
        PS->>DB: Payment 생성 (AUTHORIZED)
        API->>PS: capture(paymentId)
        PS->>DB: Payment 업데이트 (COMPLETED)
        API-->>PG: 302 Redirect (successUrl)
    else authResultCode != "0000"
        API-->>PG: 302 Redirect (failureUrl)
    end
```

---

### 6.2 Nicepay 가상계좌 콜백

Nicepay에서 가상계좌 발급 결과를 수신합니다.

```
GET/POST /api/payment/nicepay/vbank
```

#### Request (Form Data)
카드 결제 콜백과 동일한 필드

#### Response

**302 Redirect**
- 성공/실패에 따라 적절한 URL로 리다이렉트

---

### 6.3 Nicepay Webhook

Nicepay에서 결제 상태 변경 알림을 수신합니다.

```
POST /api/payment/nicepay/webhook
```

#### Request (JSON)

```json
{
  "resultCode": "0000",
  "status": "paid",
  "payMethod": "vbank",
  "tid": "nicepay_tid_12345",
  "orderId": "order_12345",
  "amount": 50000,
  "vbank": {
    "bankCode": "004",
    "bankName": "국민은행",
    "accountNumber": "12345678901234",
    "expDate": "20240120"
  }
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `resultCode` | string | 결과 코드 ("0000" = 성공) |
| `status` | string | 결제 상태 |
| `payMethod` | string | 결제 수단 |
| `tid` | string | Nicepay 거래 ID |
| `orderId` | string | 주문 ID |
| `amount` | integer | 결제 금액 |
| `vbank` | object | 가상계좌 정보 (가상계좌인 경우) |

**status 값**:
- `ready`: 가상계좌 발급 완료 (입금 대기)
- `paid`: 결제 완료
- `failed`: 결제 실패
- `cancelled`: 결제 취소
- `partialCancelled`: 부분 취소
- `expired`: 만료됨

**payMethod 값**:
- `card`: 신용카드
- `vbank`: 가상계좌
- `naverpay`: 네이버페이
- `kakaopay`: 카카오페이
- `payco`: 페이코
- `ssgpay`: SSG페이
- `samsungpay`: 삼성페이

#### Response

```
OK
```

항상 "OK"를 반환합니다 (멱등성 보장).

#### Webhook 처리 흐름

```mermaid
stateDiagram-v2
    [*] --> ready: 가상계좌 발급
    ready --> paid: 입금 완료
    ready --> expired: 기한 만료
    paid --> cancelled: 전액 취소
    paid --> partialCancelled: 부분 취소
    cancelled --> [*]
    partialCancelled --> [*]
    expired --> [*]
```

---

### 6.4 테스트 콜백 (개발용)

개발/디버깅을 위한 테스트 엔드포인트입니다.

```
GET/POST /api/payment/nicepay/test-callback
```

모든 요청 파라미터, 헤더, 폼 데이터를 로깅합니다.

#### Response

```json
{
  "status": "success"
}
```

---

## 7. 인증 및 보안

### 7.1 JWT 토큰 구조

**Access Token**:
- 유효 기간: 1시간
- 포함 정보: 사용자 ID, 역할, 상점 ID (해당 시)

**Refresh Token**:
- 유효 기간: 7일
- 용도: Access Token 갱신

### 7.2 역할 계층 구조

```
SUPER_ADMIN
    └── ADMIN
        └── MANAGER
            ├── SELLER
            └── CUSTOMER
```

### 7.3 인증 헤더 형식

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## 8. 에러 코드

### 8.1 HTTP 상태 코드

| 코드 | 설명 | 사용 사례 |
|------|------|----------|
| 200 | 성공 | 정상 처리 |
| 201 | 생성됨 | 리소스 생성 성공 |
| 302 | 리다이렉트 | 결제 콜백 처리 후 |
| 400 | 잘못된 요청 | 유효성 검증 실패 |
| 401 | 인증 실패 | 잘못된 자격 증명 |
| 403 | 권한 없음 | 접근 권한 부족 |
| 404 | 찾을 수 없음 | 리소스 없음 |
| 409 | 충돌 | 중복 데이터 |
| 500 | 서버 오류 | 내부 오류 |

### 8.2 일반 에러 메시지

| 메시지 | 설명 |
|--------|------|
| `Invalid credentials` | 이메일 또는 비밀번호 불일치 |
| `Invalid refresh token` | 리프레시 토큰 만료/무효 |
| `Email already exists` | 이미 등록된 이메일 |
| `Invalid password format` | 비밀번호 규칙 미충족 |
| `사용자가 존재하지 않습니다` | 사용자 조회 실패 |
| `서버 오류가 발생했습니다.` | 내부 서버 오류 |

---

## 9. API 엔드포인트 요약

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| POST | `/api/auth/login/email` | 이메일 로그인 | X |
| POST | `/api/auth/register/email` | 이메일 회원가입 | X |
| POST | `/api/auth/refresh` | 토큰 갱신 | X |
| POST | `/api/auth/firebase-token` | Firebase 토큰 발급 | O |
| POST | `/api/auth/validate` | 토큰 검증 | X |
| POST | `/api/auth/password/change` | 비밀번호 변경 | O |
| GET/POST | `/api/payment/nicepay/card` | 카드 결제 콜백 | X (외부) |
| GET/POST | `/api/payment/nicepay/callback` | 결제 콜백 | X (외부) |
| GET/POST | `/api/payment/nicepay/vbank` | 가상계좌 콜백 | X (외부) |
| POST | `/api/payment/nicepay/webhook` | 결제 Webhook | X (외부) |
| GET/POST | `/api/payment/nicepay/test-callback` | 테스트 콜백 | X |

---

## 10. 통합 시 주의사항

### 10.1 결제 콜백 처리
- 결제 콜백은 Nicepay 서버에서 직접 호출됨
- 클라이언트가 아닌 서버에서 처리
- 리다이렉트 URL은 `mallReserved`로 전달

### 10.2 토큰 관리
- Access Token 만료 시 자동으로 Refresh Token으로 갱신
- Refresh Token도 만료되면 재로그인 필요
- 토큰은 안전하게 저장 (httpOnly 쿠키 또는 secure storage)

### 10.3 역할별 접근
- CUSTOMER: 자신의 주문/정보만 접근
- SELLER: 자신의 상점만 관리
- MANAGER/ADMIN: 초대 토큰 필요

---

## 11. 참고 자료

- [Spring WebFlux 문서](https://docs.spring.io/spring-framework/reference/web/webflux.html)
- [Nicepay 개발 가이드](https://www.nicepay.co.kr/)
- [JWT 표준 (RFC 7519)](https://tools.ietf.org/html/rfc7519)
