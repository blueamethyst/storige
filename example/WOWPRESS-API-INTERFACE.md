# WowPress API 인터페이스 정의서 (WowPress API Interface Specification)

> 상위 문서: [BACKEND-ARCHITECTURE.md](./BACKEND-ARCHITECTURE.md)

---

## 1. 개요

WowPress API는 **인쇄 서비스 플랫폼**과의 통합을 위한 외부 REST API입니다. WowMall 플랫폼은 WowPress를 통해 인쇄 상품 주문, 가격 조회, 주문 이행을 처리합니다.

### 1.1 통합 목적
- **상품 카탈로그**: WowPress 인쇄 상품 정보 조회
- **가격 계산**: 인쇄 사양에 따른 실시간 가격 산출
- **주문 제출**: 인쇄 주문 생성 및 디자인 파일 업로드
- **주문 추적**: 주문 상태 조회

### 1.2 기술 사양
- **Base URL**: `https://api.wowpress.co.kr`
- **File Upload URL**: `https://file.wowpress.co.kr`
- **프로토콜**: HTTPS (TLS 1.2+)
- **인증**: Bearer Token (JWT)
- **데이터 형식**: JSON
- **문자 인코딩**: UTF-8

---

## 2. 시스템 아키텍처

```mermaid
graph TB
    subgraph "WowMall Backend"
        WowPressClient[WowPress HTTP Client<br/>Spring WebFlux]
        OrderService[Order Service]
        CatalogService[Catalog Service]
        Cache[(Redis Cache)]
    end

    subgraph "WowPress Platform"
        WowPressAPI[WowPress API<br/>api.wowpress.co.kr]
        WowPressFile[WowPress File API<br/>file.wowpress.co.kr]
    end

    OrderService --> WowPressClient
    CatalogService --> WowPressClient
    WowPressClient --> Cache
    WowPressClient -->|HTTPS| WowPressAPI
    WowPressClient -->|HTTPS| WowPressFile

    classDef internal fill:#e1f5fe,stroke:#01579b
    classDef external fill:#fff3e0,stroke:#ff6f00
    classDef cache fill:#fce4ec,stroke:#c2185b

    class WowPressClient,OrderService,CatalogService internal
    class WowPressAPI,WowPressFile external
    class Cache cache
```

---

## 3. 인증 (Authentication)

### 3.1 토큰 발급

WowPress API 인증을 위한 JWT 토큰을 발급받습니다.

```
POST /api/login/issue
```

#### Request
```json
{
  "authUid": "user_id",
  "authPw": "password"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `authUid` | string | O | WowPress 사용자 ID |
| `authPw` | string | O | WowPress 비밀번호 |

#### Response
```json
{
  "resultCode": "200",
  "resultMsg": "success",
  "resultMap": {
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "expiresIn": 31449600
  }
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `token` | string | JWT 액세스 토큰 |
| `expiresIn` | integer | 토큰 유효 기간 (초), 약 364일 |

### 3.2 인증 헤더

모든 API 요청에 Bearer 토큰을 포함해야 합니다.

```
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

---

## 4. 공통 응답 구조

### 4.1 성공 응답
```json
{
  "resultCode": "200",
  "reqPath": "/api/v1/std/prodlist",
  "statusCode": "200",
  "resultMsg": "success",
  "resultMap": { ... }
}
```

### 4.2 에러 응답
```json
{
  "resultCode": "400",
  "reqPath": "/api/v1/ord/cjson_order",
  "statusCode": "400",
  "resultMsg": "failure",
  "errMsg": "Invalid request parameters"
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `resultCode` | string | 결과 코드 ("200" = 성공, "400" = 실패) |
| `reqPath` | string | 요청 경로 |
| `statusCode` | string | HTTP 상태 코드 |
| `resultMsg` | string | 결과 메시지 |
| `errMsg` | string | 에러 메시지 (실패 시) |
| `resultMap` | object | 응답 데이터 (성공 시) |

---

## 5. 상품 API (Product API)

### 5.1 상품 목록 조회

모든 가용 인쇄 상품 목록을 조회합니다.

```
GET /api/v1/std/prodlist
```

#### Response
```json
{
  "resultCode": "200",
  "resultMap": {
    "products": [
      {
        "prodno": 101,
        "prodname": "명함",
        "prodgroup": "인쇄물",
        "deliveryGroup": "일반배송",
        "thumbnail": "https://..."
      },
      {
        "prodno": 102,
        "prodname": "전단지",
        "prodgroup": "인쇄물",
        "deliveryGroup": "일반배송",
        "thumbnail": "https://..."
      }
    ]
  }
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `prodno` | integer | 상품 번호 (고유 식별자) |
| `prodname` | string | 상품명 |
| `prodgroup` | string | 상품 그룹 |
| `deliveryGroup` | string | 배송 그룹 |
| `thumbnail` | string | 썸네일 이미지 URL |

---

### 5.2 상품 상세 정보 조회

특정 상품의 상세 사양 정보를 조회합니다.

```
GET /api/v1/std/prod_info/{prodno}
```

#### Path Parameters
| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `prodno` | integer | 상품 번호 |

#### Response
```json
{
  "resultCode": "200",
  "resultMap": {
    "prodno": 101,
    "prodname": "명함",
    "sizeinfo": [
      {
        "sizeno": "1",
        "sizename": "90x50mm",
        "wsize": "90",
        "hsize": "50",
        "wsizeMin": "85",
        "wsizeMax": "100",
        "hsizeMin": "45",
        "hsizeMax": "55"
      }
    ],
    "paperinfo": [
      {
        "paperno": "10",
        "papername": "스노우지 250g",
        "papergroup": "일반용지"
      }
    ],
    "colorinfo": [
      {
        "colorno": "1",
        "colorname": "4도(양면)",
        "colorcode": "4/4"
      }
    ],
    "prsjobinfo": [
      {
        "jobno": "1",
        "jobname": "기본 인쇄",
        "jobtype": "print",
        "covercd": 0
      }
    ],
    "awkjobinfo": [
      {
        "jobno": "101",
        "jobname": "코팅",
        "jobtype": "coating",
        "jobopts": [
          {
            "optno": "1",
            "optname": "무광 코팅"
          }
        ]
      }
    ],
    "deliverinfo": [
      {
        "dlvymcd": "4",
        "dlvyname": "선불택배",
        "dlvycost": 3000
      }
    ],
    "ordqty": [
      {
        "qty": "100",
        "minQty": "100",
        "maxQty": "10000",
        "unitQty": "100"
      }
    ]
  }
}
```

#### 상품 정보 구조

##### sizeinfo (사이즈 정보)
| 필드 | 타입 | 설명 |
|------|------|------|
| `sizeno` | string | 사이즈 번호 |
| `sizename` | string | 사이즈명 |
| `wsize` | string | 너비 (mm) |
| `hsize` | string | 높이 (mm) |
| `wsizeMin` | string | 최소 너비 |
| `wsizeMax` | string | 최대 너비 |
| `hsizeMin` | string | 최소 높이 |
| `hsizeMax` | string | 최대 높이 |

##### paperinfo (용지 정보)
| 필드 | 타입 | 설명 |
|------|------|------|
| `paperno` | string | 용지 번호 |
| `papername` | string | 용지명 |
| `papergroup` | string | 용지 그룹 |

##### colorinfo (색상/인쇄 옵션)
| 필드 | 타입 | 설명 |
|------|------|------|
| `colorno` | string | 색상 번호 |
| `colorname` | string | 색상명 |
| `colorcode` | string | 색상 코드 (예: "4/4" = 양면 4도) |

##### prsjobinfo (인쇄 작업 정보)
| 필드 | 타입 | 설명 |
|------|------|------|
| `jobno` | string | 작업 번호 |
| `jobname` | string | 작업명 |
| `jobtype` | string | 작업 유형 |
| `covercd` | integer | 커버 코드 (0=통합, 1=표지, 2=내지) |

##### awkjobinfo (후가공 정보)
| 필드 | 타입 | 설명 |
|------|------|------|
| `jobno` | string | 후가공 번호 |
| `jobname` | string | 후가공명 |
| `jobtype` | string | 후가공 유형 |
| `jobopts` | array | 후가공 옵션 목록 |

##### deliverinfo (배송 정보)
| 필드 | 타입 | 설명 |
|------|------|------|
| `dlvymcd` | string | 배송 방법 코드 |
| `dlvyname` | string | 배송 방법명 |
| `dlvycost` | integer | 배송비 (원) |

---

### 5.3 부속품/악세서리 조회

상품의 부속품 및 악세서리 정보를 조회합니다. 부속품은 메인 상품과 함께 주문할 수 있는 추가 상품입니다.

```
POST /api/v1/std/add
```

#### Request
```json
{
  "prodNo": 101
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `prodNo` | integer | O | 상품 번호 |

#### Response
```json
{
  "curUri": "/api/v1/std/add",
  "prodAddList": [
    {
      "prodadinfo": {
        "prodno": 201,
        "prodname": "명함 케이스",
        "qunit": 1,
        "qunit_val": "개"
      },
      "paperlist": [
        {
          "prodno": 201,
          "item": "paper",
          "itemname": "투명 케이스",
          "prodname": "명함 케이스",
          "itemno": "1"
        }
      ],
      "sizelist": [
        {
          "prodno": 201,
          "item": "size",
          "itemname": "90x50mm",
          "prodname": "명함 케이스",
          "itemno": "1"
        }
      ],
      "colorlist": [
        {
          "prodno": 201,
          "item": "color",
          "itemname": "투명",
          "covercd": 0,
          "prodname": "명함 케이스",
          "itemno": "1"
        }
      ],
      "optlist": [
        {
          "prodno": 201,
          "item": "option",
          "optno": 1,
          "optname": "기본",
          "prodname": "명함 케이스"
        }
      ]
    }
  ]
}
```

#### Response 필드 설명

##### prodAddList (부속품 목록)
| 필드 | 타입 | 설명 |
|------|------|------|
| `prodadinfo` | object | 부속품 기본 정보 |
| `paperlist` | array | 용지 옵션 목록 |
| `sizelist` | array | 사이즈 옵션 목록 |
| `colorlist` | array | 색상 옵션 목록 |
| `optlist` | array | 기타 옵션 목록 |

##### prodadinfo (부속품 기본 정보)
| 필드 | 타입 | 설명 |
|------|------|------|
| `prodno` | integer | 부속품 상품 번호 |
| `prodname` | string | 부속품 상품명 |
| `qunit` | integer | 주문 단위 |
| `qunit_val` | string | 주문 단위 설명 (예: "개", "세트") |

##### paperlist / sizelist (용지/사이즈 옵션)
| 필드 | 타입 | 설명 |
|------|------|------|
| `prodno` | integer | 부속품 상품 번호 |
| `item` | string | 항목 유형 ("paper", "size") |
| `itemname` | string | 항목명 |
| `prodname` | string | 상품명 |
| `itemno` | string | 항목 번호 |

##### colorlist (색상 옵션)
| 필드 | 타입 | 설명 |
|------|------|------|
| `prodno` | integer | 부속품 상품 번호 |
| `item` | string | 항목 유형 ("color") |
| `itemname` | string | 색상명 |
| `covercd` | integer | 커버 코드 |
| `prodname` | string | 상품명 |
| `itemno` | string | 항목 번호 |

##### optlist (기타 옵션)
| 필드 | 타입 | 설명 |
|------|------|------|
| `prodno` | integer | 부속품 상품 번호 |
| `item` | string | 항목 유형 ("option") |
| `optno` | integer | 옵션 번호 |
| `optname` | string | 옵션명 |
| `prodname` | string | 상품명 |

---

## 6. 가격 API (Pricing API)

### 6.1 가격 조회

인쇄 사양에 따른 가격을 계산합니다.

```
POST /api/v1/ord/cjson_jobcost
```

#### Request
```json
{
  "prodno": 101,
  "ordqty": "500",
  "ordcnt": "1",
  "ordtitle": "명함 주문",
  "jobpresetno": "1",
  "prsjob": [
    {
      "jobno": "1",
      "covercd": 0,
      "sizeno": "1",
      "wsize": "90",
      "hsize": "50",
      "jobqty": "500",
      "paperno": "10",
      "colorno0": "1",
      "colorno1": "1"
    }
  ],
  "awkjob": [
    {
      "jobno": "101",
      "covercd": 0,
      "pagecd": "0",
      "sizeno": "1",
      "wsize": "90",
      "hsize": "50",
      "jobqty": "500"
    }
  ],
  "apath": "5",
  "cpath": "13"
}
```

#### Request 필드 설명

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `prodno` | integer | O | 상품 번호 |
| `ordqty` | string | O | 주문 수량 |
| `ordcnt` | string | O | 주문 건수 |
| `ordtitle` | string | O | 주문 제목 |
| `jobpresetno` | string | X | 작업 프리셋 번호 |
| `prsjob` | array | O | 인쇄 작업 목록 |
| `awkjob` | array | X | 후가공 작업 목록 |
| `apath` | string | O | 경로 코드 (고정값: "5") |
| `cpath` | string | O | 경로 코드 (고정값: "13") |

##### prsjob (인쇄 작업)
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `jobno` | string | O | 작업 번호 |
| `covercd` | integer | O | 커버 코드 |
| `sizeno` | string | X | 사이즈 번호 |
| `wsize` | string | X | 너비 |
| `hsize` | string | X | 높이 |
| `jobqty` | string | O | 작업 수량 |
| `paperno` | string | X | 용지 번호 |
| `colorno0` | string | X | 앞면 색상 번호 |
| `colorno0add` | string | X | 앞면 추가 색상 |
| `colorno1` | string | X | 뒷면 색상 번호 |
| `colorno1add` | string | X | 뒷면 추가 색상 |
| `pagecd` | integer | X | 페이지 코드 |
| `pagecnt` | integer | X | 페이지 수 |
| `optno` | string | X | 옵션 번호 |

##### awkjob (후가공 작업)
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `jobno` | string | O | 후가공 번호 |
| `covercd` | integer | O | 커버 코드 |
| `pagecd` | string | O | 페이지 코드 |
| `sizeno` | string | X | 사이즈 번호 |
| `wsize` | string | O | 너비 |
| `hsize` | string | O | 높이 |
| `jobqty` | string | O | 작업 수량 |
| `joboptmsg` | string | X | 작업 옵션 메시지 |

#### Response
```json
{
  "resultCode": "200",
  "resultMap": {
    "status": 200,
    "prodno": 101,
    "ordqty": 500,
    "ordcnt": 1,
    "exitday": 3,
    "exitdate": "2024-01-18",
    "ordcost_price": 50000,
    "ordcost_dc": 5000,
    "ordcost_sup": 40909,
    "ordcost_tax": 4091,
    "ordcost_bill": 45000,
    "ordcost_base": {
      "prs_cost": 30000,
      "awk_cost": 10000,
      "add_cost": 5000
    }
  }
}
```

#### Response 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| `status` | integer | 상태 코드 |
| `prodno` | integer | 상품 번호 |
| `ordqty` | integer | 주문 수량 |
| `ordcnt` | integer | 주문 건수 |
| `exitday` | integer | 출고 소요일 |
| `exitdate` | string | 예상 출고일 (YYYY-MM-DD) |
| `ordcost_price` | double | 주문 가격 (원) |
| `ordcost_dc` | double | 할인 금액 |
| `ordcost_sup` | double | 공급가 |
| `ordcost_tax` | double | 세금 |
| `ordcost_bill` | double | 청구 금액 |
| `ordcost_base` | object | 상세 비용 내역 |

##### ordcost_base (비용 내역)
| 필드 | 타입 | 설명 |
|------|------|------|
| `prs_cost` | double | 인쇄 비용 |
| `awk_cost` | double | 후가공 비용 |
| `add_cost` | double | 부속품 비용 |

---

## 7. 주문 API (Order API)

### 7.1 주문 생성

인쇄 주문을 제출합니다.

```
POST /api/v1/ord/cjson_order
```

#### Request
```json
{
  "action": "ord",
  "cpath": "13",
  "apath": "8",
  "dlvymcd": "4",
  "ordreq": [
    {
      "prodno": 101,
      "ordqty": "500",
      "ordcnt": "1",
      "ordtitle": "명함 주문",
      "ordbody": "추가 요청사항",
      "ordkey": "lineitem_12345",
      "jobpresetno": "1",
      "prsjob": [
        {
          "jobno": "1",
          "covercd": 0,
          "sizeno": "1",
          "wsize": "90",
          "hsize": "50",
          "jobqty": "500",
          "paperno": "10",
          "colorno0": "1",
          "colorno1": "1"
        }
      ],
      "awkjob": []
    }
  ],
  "dlvyfr": {
    "name": "발송인",
    "tel": "02-1234-5678",
    "zipcode": "06123",
    "sd": "서울특별시",
    "sgg": "강남구",
    "umd": "역삼동",
    "addr1": "테헤란로 123",
    "addr2": "4층"
  },
  "dlvyto": {
    "name": "수령인",
    "tel": "010-1234-5678",
    "zipcode": "06234",
    "sd": "서울특별시",
    "sgg": "서초구",
    "umd": "서초동",
    "addr1": "서초대로 456",
    "addr2": "1층",
    "dlvymsg": "문 앞에 놓아주세요"
  }
}
```

#### Request 필드 설명

##### 최상위 필드
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `action` | string | O | 액션 코드 (고정값: "ord") |
| `cpath` | string | O | 경로 코드 (고정값: "13") |
| `apath` | string | O | 경로 코드 (고정값: "8") |
| `dlvymcd` | string | O | 배송 방법 코드 |
| `ordreq` | array | O | 주문 항목 목록 |
| `dlvyfr` | object | O | 발송인 주소 |
| `dlvyto` | object | O | 수령인 주소 |

##### dlvymcd (배송 방법 코드)
| 코드 | 설명 |
|------|------|
| `0` | 방문 수령 |
| `1` | 배달 |
| `2` | 대리배송 |
| `3` | 착불택배 |
| `4` | 선불택배 (기본값) |
| `5` | 화물 |

##### ordreq (주문 항목)
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `prodno` | integer | O | 상품 번호 |
| `ordqty` | string | O | 주문 수량 |
| `ordcnt` | string | O | 주문 건수 |
| `ordtitle` | string | O | 주문 제목 |
| `ordbody` | string | X | 주문 설명/요청사항 |
| `ordkey` | string | O | 주문 키 (라인 아이템 ID) |
| `jobpresetno` | string | O | 작업 프리셋 번호 |
| `prsjob` | array | O | 인쇄 작업 목록 |
| `awkjob` | array | X | 후가공 작업 목록 |

##### dlvyfr / dlvyto (주소)
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `name` | string | O | 이름 |
| `tel` | string | O | 전화번호 |
| `zipcode` | string | O | 우편번호 |
| `sd` | string | O | 시/도 |
| `sgg` | string | O | 시/군/구 |
| `umd` | string | O | 읍/면/동 |
| `addr1` | string | O | 상세주소 1 |
| `addr2` | string | O | 상세주소 2 |
| `dlvymsg` | string | X | 배송 메시지 (수령인만) |

#### Response
```json
{
  "resultCode": "200",
  "resultMap": {
    "timestamp": "2024-01-15T10:30:00",
    "action": "ord",
    "status": 200,
    "errmsg": "",
    "ordcostPrice": 50000,
    "ordcostDc": 5000,
    "ordcostSup": 40909,
    "ordcostTax": 4091,
    "ordcostBill": 45000,
    "dlvcostPrice": 3000,
    "dlvcostDc": 0,
    "dlvcostSup": 2727,
    "dlvcostTax": 273,
    "dlvcostBill": 3000,
    "costBill": 48000,
    "ordinfo": [
      [
        {
          "ordnum": "WP2024011512345",
          "ordkey": "lineitem_12345",
          "prodno": 101,
          "ordqty": 500
        }
      ]
    ],
    "dlvinfo": [
      {
        "dlvyno": "DLV001",
        "dlvymcd": "4",
        "dlvyname": "선불택배"
      }
    ],
    "step": "ordered"
  }
}
```

#### Response 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| `timestamp` | string | 처리 시간 |
| `action` | string | 액션 |
| `status` | double | 상태 코드 (200 = 성공) |
| `errmsg` | string | 에러 메시지 |
| `ordcostPrice` | double | 주문 가격 |
| `ordcostDc` | double | 주문 할인 |
| `ordcostSup` | double | 주문 공급가 |
| `ordcostTax` | double | 주문 세금 |
| `ordcostBill` | double | 주문 청구액 |
| `dlvcostPrice` | double | 배송비 |
| `dlvcostDc` | double | 배송 할인 |
| `dlvcostSup` | double | 배송 공급가 |
| `dlvcostTax` | double | 배송 세금 |
| `dlvcostBill` | double | 배송 청구액 |
| `costBill` | double | 총 청구액 |
| `ordinfo` | array | 주문 정보 (중첩 배열) |
| `dlvinfo` | array | 배송 정보 |
| `step` | string | 주문 단계 |

##### ordinfo 항목
| 필드 | 타입 | 설명 |
|------|------|------|
| `ordnum` | string | WowPress 주문 번호 |
| `ordkey` | string | 주문 키 (라인 아이템 ID) |
| `prodno` | integer | 상품 번호 |
| `ordqty` | integer | 주문 수량 |

---

### 7.2 주문 목록 조회

주문 내역을 조회합니다.

```
POST /api/v1/ord/ord_list
```

#### Request
```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "status": "all",
  "page": 1,
  "pageSize": 20
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `startDate` | string | O | 조회 시작일 (YYYY-MM-DD) |
| `endDate` | string | O | 조회 종료일 (YYYY-MM-DD) |
| `status` | string | X | 주문 상태 필터 |
| `page` | integer | X | 페이지 번호 (기본값: 1) |
| `pageSize` | integer | X | 페이지 크기 (기본값: 20) |

#### Response
```json
{
  "resultCode": "200",
  "resultMap": {
    "totalCount": 15,
    "orders": [
      {
        "ordnum": "WP2024011512345",
        "orddate": "2024-01-15",
        "prodname": "명함",
        "ordqty": 500,
        "ordstatus": "제작중",
        "exitdate": "2024-01-18"
      }
    ]
  }
}
```

---

## 8. 파일 API (File API)

### 8.1 디자인 파일 업로드

URL을 통해 디자인 파일을 WowPress에 업로드합니다.

```
POST https://file.wowpress.co.kr/api/v1/file/uploadurl
Content-Type: multipart/form-data
```

#### Request (Form Data)
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `ordnum` | string | O | WowPress 주문 번호 |
| `fileurl` | string | O | 디자인 파일 URL |
| `filename` | string | O | 파일명 |

#### Response
```json
{
  "resultCode": "200",
  "resultMsg": "success",
  "resultMap": {
    "fileId": "FILE12345",
    "filename": "design.pdf",
    "filesize": 1024000
  }
}
```

---

## 9. 에러 코드

### 9.1 HTTP 상태 코드
| 코드 | 설명 |
|------|------|
| 200 | 성공 |
| 400 | 잘못된 요청 |
| 401 | 인증 실패 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 408 | 요청 시간 초과 |
| 429 | 요청 제한 초과 |
| 500 | 서버 오류 |

### 9.2 비즈니스 에러
| resultCode | 설명 |
|------------|------|
| `200` | 성공 |
| `400` | 요청 검증 실패 |
| `401` | 인증 토큰 만료/무효 |
| `404` | 상품/주문 없음 |
| `500` | 내부 서버 오류 |

### 9.3 WowMall 예외 클래스
```kotlin
sealed class WowPressException(message: String) : RuntimeException(message)
class AuthenticationException(message: String) : WowPressException(message)
class ProductNotFoundException(message: String) : WowPressException(message)
class OrderValidationException(message: String) : WowPressException(message)
class FileUploadException(message: String) : WowPressException(message)
class WowPressApiException(val resultCode: String, message: String) : WowPressException(message)
```

---

## 10. 주문 흐름

```mermaid
sequenceDiagram
    participant C as Customer
    participant W as WowMall
    participant WP as WowPress API
    participant WF as WowPress File API

    C->>W: 상품 선택 및 사양 설정
    W->>WP: 가격 조회 (cjson_jobcost)
    WP-->>W: 가격 정보 반환
    W-->>C: 가격 표시

    C->>W: 주문 생성
    W->>WP: 주문 제출 (cjson_order)
    WP-->>W: 주문 번호 반환 (ordnum)

    W->>WF: 디자인 파일 업로드 (uploadurl)
    WF-->>W: 업로드 완료

    W-->>C: 주문 완료

    Note over W,WP: 주문 상태 추적
    W->>WP: 주문 조회 (ord_list)
    WP-->>W: 주문 상태
```

---

## 11. 설정 및 구성

### 11.1 환경 변수
```yaml
wowpress:
  base-url: ${WOWPRESS_BASE_URL:https://api.wowpress.co.kr}
  auth-uid: ${WOWPRESS_AUTH_UID}
  auth-pw: ${WOWPRESS_AUTH_PW}
  access-token: ${WOWPRESS_ACCESS_TOKEN}
```

### 11.2 HTTP 클라이언트 설정
| 설정 | 기본값 | 설명 |
|------|--------|------|
| `connectTimeout` | 5초 | 연결 타임아웃 |
| `readTimeout` | 30초 | 읽기 타임아웃 |
| `writeTimeout` | 30초 | 쓰기 타임아웃 |
| `maxInMemorySize` | 16MB | 최대 인메모리 크기 |
| `maxConnections` | 500 | 최대 연결 수 |
| `acquisitionTimeout` | 3초 | 연결 획득 타임아웃 |

### 11.3 재시도 정책
| 설정 | 값 | 설명 |
|------|-----|------|
| 최대 재시도 | 3회 | |
| 초기 백오프 | 2초 | |
| 최대 백오프 | 10초 | |
| 지터 | 75% | |
| 재시도 대상 | 5xx, 429, 408 | HTTP 상태 코드 |

---

## 12. 캐싱 전략

| 캐시명 | TTL | 설명 |
|--------|-----|------|
| `WOWPRESS_PROD_LIST_CACHE` | 1시간 | 상품 목록 |
| `WOWPRESS_PROD_INFO_CACHE` | 1시간 | 상품 상세 정보 |
| `WOWPRESS_PROD_ACC_CACHE` | 1시간 | 부속품 정보 |
| `WOWPRESS_PROD_PRICE` | 1시간 | 가격 정보 (요청 해시 기반) |

---

## 13. 보안 고려사항

1. **인증 토큰 관리**
   - JWT 토큰은 환경 변수 또는 보안 저장소에 보관
   - 토큰 만료 전 갱신 처리
   - 셀러별 토큰 분리 관리

2. **민감 데이터 처리**
   - 토큰, 비밀번호는 로그에 기록하지 않음
   - HTTPS 통신 필수

3. **요청 검증**
   - 주문 제출 전 디자인 승인 확인
   - 입력값 유효성 검증

---

## 14. 향후 개선 사항

현재 WowPress 연동에서 미구현된 기능으로, 향후 개선이 필요한 항목입니다.

### 14.1 Callback/Webhook 구현

현재 WowPress에서 WowMall로 상태 변경을 알리는 callback 메커니즘이 없습니다.

**필요 기능:**
- WowPress에서 주문 상태 변경 시 자동 알림 수신
- 송장번호(`shipnum`) 자동 업데이트
- 배송상태(`dlvystat`) 실시간 동기화
- 주문상태(제작중, 출고완료 등) 자동 반영

**구현 방안:**
```
POST /api/wowpress/callback
Content-Type: application/json

{
  "ordnum": "WP2024011512345",
  "ordstat": 1,
  "jobstat": 3,
  "dlvystat": 2,
  "shipnum": "1234567890",
  "timestamp": "2024-01-18T10:30:00"
}
```

### 14.2 주기적 상태 동기화 (Polling)

Callback이 불가능한 경우 대안으로 폴링 방식 구현이 필요합니다.

**필요 기능:**
- 스케줄러를 통한 미완료 주문 상태 주기적 조회
- `TrackingInfo` 자동 업데이트
- `Fulfillment` 상태 동기화

**구현 방안:**
```kotlin
@Scheduled(fixedDelay = 600000) // 10분마다
suspend fun syncWowPressOrderStatus() {
    // 미완료 주문 목록 조회
    // WowPress API로 상태 조회
    // DB 업데이트
}
```

### 14.3 현재 조회 가능한 상태 정보

WowPress `getOrderList` API 응답에서 다음 정보 조회 가능:

| 필드 | 타입 | 설명 |
|------|------|------|
| `ordstat` | int | 주문상태 코드 |
| `ordstatval` | string | 주문상태 텍스트 (예: "입금대기") |
| `jobstat` | int | 작업상태 코드 |
| `jobstatval` | string | 작업상태 텍스트 (예: "제작중") |
| `dlvystat` | int | 배송상태 코드 |
| `dlvystatval` | string | 배송상태 텍스트 (예: "배송중") |
| `shipnum` | string | 송장번호 |

---

## 15. 참고 자료

- WowPress API 개발 가이드 (내부 문서)
- [Spring WebFlux 문서](https://docs.spring.io/spring-framework/reference/web/webflux.html)
- [Kotlin Coroutines](https://kotlinlang.org/docs/coroutines-overview.html)
