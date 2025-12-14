# 상품-템플릿셋 연동 기획서

작성일: 2025-12-14

## 1. 개요

### 1.1 목적
북모아(bookmoa) 쇼핑몰의 상품과 스토리지(storige) 에디터의 템플릿셋을 연결하여, 고객이 특정 상품을 주문할 때 해당 상품에 적합한 템플릿을 자동으로 제공한다.

### 1.2 관계 정의
- **1:N 관계**: 하나의 북모아 상품에 여러 개의 스토리지 템플릿셋을 연결할 수 있음
- 예: "A4 무선제본 책자" 상품에 "A4 기본 템플릿", "A4 포토북 템플릿", "A4 카탈로그 템플릿" 등 연결

### 1.3 사용 시나리오
1. 고객이 북모아에서 상품 선택
2. 주문 페이지에서 "에디터로 편집하기" 버튼 클릭
3. 시스템이 해당 상품에 연결된 템플릿셋 목록 조회
4. 에디터에서 템플릿 선택 화면 표시
5. 고객이 템플릿 선택 후 편집 시작

---

## 2. 시스템 분석

### 2.1 북모아 상품 구조

```
┌─────────────────────────────────────────────────────────┐
│ cate (카테고리)                                          │
├─────────────────────────────────────────────────────────┤
│ - cate_sortcode (PK): 카테고리 코드 (예: "001001001")    │
│ - cate_name: 카테고리명                                  │
│ - depth: 계층 깊이                                       │
│ - parent_sortcode: 상위 카테고리                         │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ prdt_stan (상품 규격)                                    │
├─────────────────────────────────────────────────────────┤
│ - seqno (PK): 규격 번호                                  │
│ - sortcode (FK): 카테고리 코드                           │
│ - name: 규격명                                           │
│ - width / height: 너비/높이 (mm)                         │
│ - is_landscape: 가로형 여부                              │
└─────────────────────────────────────────────────────────┘
```

**상품 식별 방식**:
- `sortcode`: 카테고리 코드로 상품 종류 식별
- `prdt_stan.seqno`: 동일 카테고리 내 세부 규격 구분

### 2.2 스토리지 템플릿셋 구조

```typescript
// TemplateSet Entity (apps/api/src/template-sets/entities/template-set.entity.ts)
{
  id: string;              // UUID
  name: string;            // 템플릿셋 이름
  type: 'BOOK' | 'LEAFLET'; // 유형
  width: number;           // 기본 너비 (mm)
  height: number;          // 기본 높이 (mm)
  pageCountRange?: {       // 페이지 수 범위
    min: number;
    max: number;
  };
  templates: Template[];   // 포함된 템플릿 목록
  isActive: boolean;       // 활성화 상태
  createdAt: Date;
  updatedAt: Date;
}

// Template (개별 템플릿)
{
  type: 'WING' | 'COVER' | 'SPINE' | 'PAGE';  // 템플릿 유형
  canvasData: object;      // Fabric.js 캔버스 데이터
  thumbnailUrl?: string;   // 미리보기 이미지
}
```

---

## 3. 구현 설계

### 3.1 데이터베이스 스키마

#### 3.1.1 연결 테이블 (Storige DB)

```sql
-- product_template_sets: 상품-템플릿셋 연결 테이블
CREATE TABLE product_template_sets (
  id CHAR(36) PRIMARY KEY,                    -- UUID

  -- 북모아 상품 식별
  sortcode VARCHAR(20) NOT NULL,              -- 북모아 카테고리 코드
  prdt_stan_seqno INT NULL,                   -- 북모아 규격 번호 (NULL이면 전체 규격)

  -- 스토리지 템플릿셋
  template_set_id CHAR(36) NOT NULL,          -- 템플릿셋 ID

  -- 메타데이터
  display_order INT DEFAULT 0,                -- 표시 순서
  is_default BOOLEAN DEFAULT FALSE,           -- 기본 템플릿 여부
  is_active BOOLEAN DEFAULT TRUE,             -- 활성화 상태

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- 인덱스
  INDEX idx_sortcode (sortcode),
  INDEX idx_sortcode_stan (sortcode, prdt_stan_seqno),
  INDEX idx_template_set (template_set_id),

  -- 외래키
  FOREIGN KEY (template_set_id) REFERENCES template_sets(id) ON DELETE CASCADE,

  -- 유니크 제약 (동일 상품-템플릿셋 중복 방지)
  UNIQUE KEY uk_product_template (sortcode, prdt_stan_seqno, template_set_id)
);
```

#### 3.1.2 연결 로직

```
북모아 상품 조회 시:
1. sortcode + prdt_stan_seqno 로 정확히 매칭되는 템플릿셋 조회
2. 없으면 sortcode만으로 조회 (prdt_stan_seqno IS NULL인 행)
3. display_order 순으로 정렬
4. is_default=true인 항목을 첫 번째로 표시
```

### 3.2 API 설계

#### 3.2.1 템플릿셋 조회 API (외부용)

```
GET /api/product-template-sets/by-product
```

**Request Parameters**:
```
sortcode: string       (필수) 북모아 카테고리 코드
stanSeqno: number      (선택) 북모아 규격 번호
```

**Response**:
```json
{
  "templateSets": [
    {
      "id": "uuid-1234",
      "name": "A4 기본 템플릿",
      "type": "BOOK",
      "width": 210,
      "height": 297,
      "thumbnailUrl": "/api/template-sets/uuid-1234/thumbnail",
      "isDefault": true
    },
    {
      "id": "uuid-5678",
      "name": "A4 포토북 템플릿",
      "type": "BOOK",
      "width": 210,
      "height": 297,
      "thumbnailUrl": "/api/template-sets/uuid-5678/thumbnail",
      "isDefault": false
    }
  ],
  "total": 2
}
```

#### 3.2.2 연결 관리 API (관리자용)

```
# 연결 목록 조회
GET /api/product-template-sets
  ?sortcode=001001001
  ?templateSetId=uuid-1234
  ?page=1&limit=20

# 연결 생성
POST /api/product-template-sets
{
  "sortcode": "001001001",
  "prdtStanSeqno": 1,           // 선택
  "templateSetId": "uuid-1234",
  "displayOrder": 1,
  "isDefault": true
}

# 연결 수정
PATCH /api/product-template-sets/:id
{
  "displayOrder": 2,
  "isDefault": false,
  "isActive": true
}

# 연결 삭제
DELETE /api/product-template-sets/:id

# 일괄 연결
POST /api/product-template-sets/bulk
{
  "sortcode": "001001001",
  "templateSetIds": ["uuid-1234", "uuid-5678", "uuid-9012"]
}
```

### 3.3 Admin UI 설계

#### 3.3.1 연결 관리 페이지

```
┌─────────────────────────────────────────────────────────────────┐
│ 상품-템플릿셋 연결 관리                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [카테고리 선택 ▼]  [규격 선택 ▼]  [검색]                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 선택된 상품: 책자 > A4 무선제본 > 210x297mm              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  연결된 템플릿셋 (3개)                      [+ 템플릿셋 추가]    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ☆ A4 기본 템플릿      BOOK  210x297  [기본] [↑] [↓] [×] │   │
│  │   A4 포토북 템플릿    BOOK  210x297        [↑] [↓] [×] │   │
│  │   A4 카탈로그 템플릿  BOOK  210x297        [↑] [↓] [×] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ☆ = 기본 템플릿 (고객에게 먼저 추천됨)                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 3.3.2 템플릿셋 추가 모달

```
┌─────────────────────────────────────────────────────────────────┐
│ 템플릿셋 추가                                           [×]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [템플릿셋 검색...]                                             │
│                                                                 │
│  ☐ A4 기본 템플릿        BOOK  210x297                          │
│  ☐ A4 포토북 템플릿      BOOK  210x297                          │
│  ☑ A4 카탈로그 템플릿    BOOK  210x297                          │
│  ☐ A4 미니북 템플릿      BOOK  148x210                          │
│                                                                 │
│  * 크기가 유사한 템플릿셋이 상단에 표시됩니다                     │
│                                                                 │
│                                [취소]  [추가 (1개 선택됨)]       │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 북모아 연동

#### 3.4.1 에디터 진입 시 템플릿 목록 조회

```php
// bookmoa/front/storige/edit.php

// 상품 정보로 템플릿셋 조회
$sortcode = $order_info['sortcode'];
$stan_seqno = $order_info['stan_seqno'];

$template_sets = storige_get_template_sets($sortcode, $stan_seqno);

// 에디터에 전달
$editor_config = [
    'orderSeqno' => $order_seqno,
    'memberSeqno' => $member_seqno,
    'templateSets' => $template_sets,  // 사용 가능한 템플릿셋 목록
    'defaultTemplateSetId' => $template_sets[0]['id'] ?? null,
];
```

#### 3.4.2 템플릿 조회 헬퍼 함수

```php
// bookmoa/front/storige/storige_common.php

function storige_get_template_sets($sortcode, $stan_seqno = null) {
    $api_url = STORIGE_API_URL . '/product-template-sets/by-product';
    $params = [
        'sortcode' => $sortcode,
    ];
    if ($stan_seqno) {
        $params['stanSeqno'] = $stan_seqno;
    }

    $response = storige_api_get($api_url, $params);

    return $response['templateSets'] ?? [];
}
```

---

## 4. 구현 태스크

### Phase 6.1: 백엔드 구현

| 태스크 | 설명 | 예상 작업 |
|--------|------|----------|
| 6.1.1 | Entity 생성 | `ProductTemplateSet` 엔티티 |
| 6.1.2 | Repository 구현 | 조회/생성/수정/삭제 메서드 |
| 6.1.3 | Service 구현 | 비즈니스 로직 (폴백 조회 등) |
| 6.1.4 | Controller 구현 | API 엔드포인트 |
| 6.1.5 | DTO 정의 | Request/Response DTO |
| 6.1.6 | API Key 인증 | 외부 조회 API에 인증 추가 |

### Phase 6.2: Admin UI 구현

| 태스크 | 설명 | 예상 작업 |
|--------|------|----------|
| 6.2.1 | 연결 관리 페이지 | 목록/추가/삭제 UI |
| 6.2.2 | 카테고리 셀렉터 | 북모아 카테고리 트리 선택 |
| 6.2.3 | 템플릿셋 선택 모달 | 검색/필터/다중선택 |
| 6.2.4 | 순서/기본 설정 | 드래그앤드롭 순서 변경 |

### Phase 6.3: bookmoa 연동

| 태스크 | 설명 | 예상 작업 |
|--------|------|----------|
| 6.3.1 | 헬퍼 함수 | `storige_get_template_sets()` |
| 6.3.2 | edit.php 수정 | 템플릿셋 목록 전달 |
| 6.3.3 | 에디터 템플릿 선택 | 템플릿 선택 UI (에디터 측) |

---

## 5. 추가 고려사항

### 5.1 캐싱 전략
- 상품-템플릿셋 연결 정보는 자주 변경되지 않음
- Redis 캐싱 적용 권장 (TTL: 1시간)
- 연결 변경 시 캐시 무효화

### 5.2 북모아 카테고리 동기화
- 북모아 카테고리 정보를 storige에서 조회해야 함
- 옵션 1: 북모아 DB 직접 조회 (bookmoa 데이터소스 설정 필요)
- 옵션 2: 북모아 API 호출 (새로운 API 개발 필요)
- 옵션 3: Admin에서 수동 입력 (sortcode 직접 입력)

### 5.3 마이그레이션
- 기존 에디터 세션에는 영향 없음 (템플릿셋 선택 없이 진행 가능)
- 점진적 적용: 연결된 상품만 템플릿 선택 UI 표시

---

## 6. 참고 자료

### 관련 파일
- `apps/api/src/template-sets/` - 템플릿셋 모듈
- `apps/admin/src/pages/template-sets/` - 템플릿셋 관리 UI
- `bookmoa/front/storige/edit.php` - 에디터 진입점
- `bookmoa/front/storige/storige_common.php` - 공통 유틸리티

### API 문서
- Swagger: `http://localhost:4000/api/docs`
