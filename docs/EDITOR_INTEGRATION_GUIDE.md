# Storige 에디터 연동 가이드

> 북모아 ↔ Storige 에디터 연동을 위한 개발 문서

## 목차

1. [개요](#1-개요)
2. [에디터 URL 파라미터](#2-에디터-url-파라미터)
3. [책등(Spine) API](#3-책등spine-api)
4. [용지/제본 코드 참조](#4-용지제본-코드-참조)
5. [연동 시나리오](#5-연동-시나리오)
6. [에러 처리](#6-에러-처리)

---

## 1. 개요

### 1.1 연동 목적

북모아에서 Storige 에디터를 호출할 때:
- **내지 페이지수 자동 맞춤**: 사용자가 선택한 페이지수에 맞게 에디터 내지 자동 조정
- **책등 자동 리사이징**: 페이지수/용지/제본에 따라 책등 폭 자동 계산 및 적용

### 1.2 연동 흐름

```
┌─────────────┐     URL 파라미터      ┌─────────────┐
│   북모아    │ ─────────────────────▶ │   에디터    │
│  (PHP)      │                        │  (React)    │
└─────────────┘                        └──────┬──────┘
                                              │
                                              │ API 호출
                                              ▼
                                       ┌─────────────┐
                                       │   API       │
                                       │  (NestJS)   │
                                       └─────────────┘
```

---

## 2. 에디터 URL 파라미터

### 2.1 기본 URL 형식

```
{EDITOR_URL}/?templateSetId={ID}&pageCount={N}&paperType={CODE}&bindingType={CODE}
```

### 2.2 파라미터 상세

| 파라미터 | 필수 | 타입 | 설명 | 예시 |
|----------|------|------|------|------|
| `templateSetId` | ✅ | string (UUID) | 템플릿셋 ID | `550e8400-e29b-41d4-a716-446655440000` |
| `pageCount` | ❌ | number | 요청 페이지 수 (내지 기준) | `50` |
| `paperType` | ❌ | string | 용지 종류 코드 | `mojo_80g` |
| `bindingType` | ❌ | string | 제본 방식 코드 | `perfect` |

### 2.3 파라미터 동작 규칙

#### `pageCount` (내지 페이지수)

| 상황 | 동작 |
|------|------|
| 미지정 | 템플릿셋의 기본 내지수 유지 |
| 템플릿 내지수보다 많음 | 마지막 내지 템플릿 복제하여 페이지 추가 |
| 템플릿 내지수보다 적음 | **에러 발생** (페이지 삭제 불가) |
| `pageCountRange` 범위 벗어남 | **에러 발생** |

#### `paperType` + `bindingType` (책등 계산)

| 상황 | 동작 |
|------|------|
| 둘 다 지정 | 책등 폭 자동 계산 및 리사이징 |
| 하나만 지정 | 책등 계산 안 함 (기본 크기 유지) |
| 둘 다 미지정 | 책등 계산 안 함 (기본 크기 유지) |

### 2.4 URL 예시

```bash
# 기본 - 템플릿셋만 지정
/?templateSetId=abc123

# 50페이지, 기본 책등
/?templateSetId=abc123&pageCount=50

# 50페이지, 모조지 80g, 무선제본
/?templateSetId=abc123&pageCount=50&paperType=mojo_80g&bindingType=perfect

# 100페이지, 아트지 200g, 양장제본
/?templateSetId=abc123&pageCount=100&paperType=art_200g&bindingType=hardcover
```

---

## 3. 책등(Spine) API

### 3.1 API 엔드포인트 목록

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/products/spine/paper-types` | 용지 종류 목록 |
| GET | `/api/products/spine/binding-types` | 제본 방식 목록 |
| POST | `/api/products/spine/calculate` | 책등 폭 계산 |

### 3.2 용지 종류 목록 조회

```http
GET /api/products/spine/paper-types
```

**Response (200 OK)**
```json
[
  {
    "code": "mojo_70g",
    "name": "모조지 70g",
    "thickness": 0.09,
    "category": "body"
  },
  {
    "code": "mojo_80g",
    "name": "모조지 80g",
    "thickness": 0.1,
    "category": "body"
  },
  {
    "code": "art_200g",
    "name": "아트지 200g",
    "thickness": 0.18,
    "category": "cover"
  }
]
```

### 3.3 제본 방식 목록 조회

```http
GET /api/products/spine/binding-types
```

**Response (200 OK)**
```json
[
  {
    "code": "perfect",
    "name": "무선제본",
    "margin": 0.5,
    "minPages": 32,
    "maxPages": null,
    "pageMultiple": null
  },
  {
    "code": "saddle",
    "name": "중철제본",
    "margin": 0.3,
    "minPages": null,
    "maxPages": 64,
    "pageMultiple": 4
  }
]
```

### 3.4 책등 폭 계산

```http
POST /api/products/spine/calculate
Content-Type: application/json
```

**Request Body**
```json
{
  "pageCount": 100,
  "paperType": "mojo_80g",
  "bindingType": "perfect",
  "customPaperThickness": null,
  "customBindingMargin": null
}
```

| 필드 | 필수 | 타입 | 설명 |
|------|------|------|------|
| `pageCount` | ✅ | number | 페이지 수 (≥ 1) |
| `paperType` | ✅ | string | 용지 코드 |
| `bindingType` | ✅ | string | 제본 코드 |
| `customPaperThickness` | ❌ | number | 커스텀 용지 두께 (mm) |
| `customBindingMargin` | ❌ | number | 커스텀 제본 마진 (mm) |

**Response (201 Created)**
```json
{
  "spineWidth": 5.5,
  "paperThickness": 0.1,
  "bindingMargin": 0.5,
  "warnings": [],
  "formula": "(100 / 2) × 0.1 + 0.5 = 5.50mm"
}
```

### 3.5 경고 메시지 (warnings)

API는 계산 결과와 함께 경고 메시지를 반환할 수 있습니다:

| code | 상황 | 메시지 예시 |
|------|------|------------|
| `SPINE_TOO_NARROW` | 책등 폭 5mm 미만 | "책등 폭이 5mm 미만입니다. 텍스트 배치에 주의하세요." |
| `BINDING_PAGE_LIMIT` | 페이지수 제한 위반 | "무선제본은 최소 32페이지 이상이어야 합니다." |
| `BINDING_PAGE_MULTIPLE` | 페이지 배수 불일치 | "중철제본은 4의 배수여야 합니다." |

**경고 포함 응답 예시**
```json
{
  "spineWidth": 3,
  "paperThickness": 0.1,
  "bindingMargin": 0.5,
  "warnings": [
    {
      "code": "BINDING_PAGE_LIMIT",
      "message": "무선제본은 최소 32페이지 이상이어야 합니다."
    },
    {
      "code": "SPINE_TOO_NARROW",
      "message": "책등 폭이 5mm 미만입니다. 텍스트 배치에 주의하세요."
    }
  ],
  "formula": "(20 / 2) × 0.1 + 0.5 = 1.50mm"
}
```

---

## 4. 용지/제본 코드 참조

### 4.1 용지 종류 (paper_types)

#### 본문용 (body)

| code | name | thickness (mm) | 비고 |
|------|------|----------------|------|
| `mojo_70g` | 모조지 70g | 0.09 | 일반 본문 |
| `mojo_80g` | 모조지 80g | 0.10 | 일반 본문 (기본값 추천) |
| `seokji_70g` | 서적지 70g | 0.10 | 서적용 |
| `newsprint_45g` | 신문지 45g | 0.06 | 신문/전단지 |

#### 표지용 (cover)

| code | name | thickness (mm) | 비고 |
|------|------|----------------|------|
| `art_200g` | 아트지 200g | 0.18 | 광택 표지 |
| `matte_200g` | 매트지 200g | 0.20 | 무광 표지 |
| `card_300g` | 카드지 300g | 0.35 | 두꺼운 표지 |
| `kraft_120g` | 크라프트지 120g | 0.16 | 자연스러운 질감 |

### 4.2 제본 방식 (binding_types)

| code | name | margin (mm) | minPages | maxPages | pageMultiple |
|------|------|-------------|----------|----------|--------------|
| `perfect` | 무선제본 | 0.5 | 32 | - | - |
| `saddle` | 중철제본 | 0.3 | - | 64 | 4 |
| `spiral` | 스프링제본 | 3.0 | - | - | - |
| `hardcover` | 양장제본 | 2.0 | - | - | - |

### 4.3 책등 폭 계산 공식

```
책등 폭 (mm) = (페이지수 / 2) × 용지 두께 + 제본 여유분
```

**계산 예시**

| 페이지수 | 용지 | 제본 | 계산식 | 결과 |
|----------|------|------|--------|------|
| 50 | 모조지 80g (0.10mm) | 무선 (0.5mm) | (50/2) × 0.10 + 0.5 | **3.0mm** |
| 100 | 모조지 80g (0.10mm) | 무선 (0.5mm) | (100/2) × 0.10 + 0.5 | **5.5mm** |
| 100 | 아트지 200g (0.18mm) | 양장 (2.0mm) | (100/2) × 0.18 + 2.0 | **11.0mm** |
| 200 | 모조지 80g (0.10mm) | 스프링 (3.0mm) | (200/2) × 0.10 + 3.0 | **13.0mm** |

---

## 5. 연동 시나리오

### 5.1 북모아 주문 페이지 → 에디터 호출

```php
<?php
// 사용자 선택 정보
$templateSetId = $_POST['template_set_id'];  // 템플릿셋 ID
$pageCount = (int)$_POST['page_count'];       // 페이지수 (예: 50)
$paperType = $_POST['paper_type'];            // 용지 코드 (예: 'mojo_80g')
$bindingType = $_POST['binding_type'];        // 제본 코드 (예: 'perfect')

// 에디터 URL 생성
$editorUrl = sprintf(
    '%s/?templateSetId=%s&pageCount=%d&paperType=%s&bindingType=%s',
    STORIGE_EDITOR_URL,
    urlencode($templateSetId),
    $pageCount,
    urlencode($paperType),
    urlencode($bindingType)
);

// 에디터로 리다이렉트 또는 iframe/팝업 열기
header("Location: $editorUrl");
```

### 5.2 용지/제본 선택 UI 구현

```php
<?php
// API에서 용지 목록 조회
$paperTypes = json_decode(
    file_get_contents(STORIGE_API_URL . '/products/spine/paper-types'),
    true
);

// API에서 제본 목록 조회
$bindingTypes = json_decode(
    file_get_contents(STORIGE_API_URL . '/products/spine/binding-types'),
    true
);
?>

<form action="/order/editor" method="POST">
    <div>
        <label>용지 종류</label>
        <select name="paper_type">
            <?php foreach ($paperTypes as $paper): ?>
                <option value="<?= $paper['code'] ?>">
                    <?= $paper['name'] ?> (두께: <?= $paper['thickness'] ?>mm)
                </option>
            <?php endforeach; ?>
        </select>
    </div>

    <div>
        <label>제본 방식</label>
        <select name="binding_type">
            <?php foreach ($bindingTypes as $binding): ?>
                <option value="<?= $binding['code'] ?>"
                        data-min-pages="<?= $binding['minPages'] ?? '' ?>"
                        data-max-pages="<?= $binding['maxPages'] ?? '' ?>">
                    <?= $binding['name'] ?>
                </option>
            <?php endforeach; ?>
        </select>
    </div>

    <div>
        <label>페이지수</label>
        <input type="number" name="page_count" min="1" value="32">
    </div>

    <button type="submit">에디터 열기</button>
</form>
```

### 5.3 책등 폭 미리보기 (JavaScript)

```javascript
async function calculateSpineWidth(pageCount, paperType, bindingType) {
    const response = await fetch(`${STORIGE_API_URL}/products/spine/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageCount, paperType, bindingType })
    });

    const result = await response.json();

    // 경고 메시지 표시
    if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach(warning => {
            console.warn(warning.message);
            // UI에 경고 표시
        });
    }

    return result.spineWidth;
}

// 사용 예시
document.getElementById('page_count').addEventListener('change', async (e) => {
    const pageCount = parseInt(e.target.value);
    const paperType = document.getElementById('paper_type').value;
    const bindingType = document.getElementById('binding_type').value;

    const spineWidth = await calculateSpineWidth(pageCount, paperType, bindingType);
    document.getElementById('spine_preview').textContent = `책등 폭: ${spineWidth}mm`;
});
```

---

## 6. 에러 처리

### 6.1 에디터 에러

| 에러 | 원인 | 대응 |
|------|------|------|
| "페이지 수는 최소 N페이지 이상이어야 합니다." | `pageCount` < `pageCountRange` 최소값 | 페이지수 조정 |
| "페이지 수는 최대 N페이지를 초과할 수 없습니다." | `pageCount` > `pageCountRange` 최대값 | 페이지수 조정 |
| "요청된 페이지 수(N)가 템플릿의 최소 내지 수(M)보다 적습니다." | `pageCount` < 템플릿 내지수 | 페이지수 증가 필요 |

### 6.2 API 에러

| Status | 원인 | 응답 예시 |
|--------|------|----------|
| 400 | 유효성 검증 실패 | `{"message": ["pageCount must be a positive number"]}` |
| 404 | 존재하지 않는 용지/제본 코드 | `{"message": "종이 타입 'invalid'을(를) 찾을 수 없습니다."}` |

### 6.3 에러 처리 예시 (PHP)

```php
<?php
function callSpineApi($pageCount, $paperType, $bindingType) {
    $ch = curl_init(STORIGE_API_URL . '/products/spine/calculate');

    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode([
            'pageCount' => $pageCount,
            'paperType' => $paperType,
            'bindingType' => $bindingType,
        ]),
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $result = json_decode($response, true);

    if ($httpCode !== 201) {
        // 에러 처리
        throw new Exception($result['message'] ?? '책등 계산 실패');
    }

    // 경고 메시지 로깅
    if (!empty($result['warnings'])) {
        foreach ($result['warnings'] as $warning) {
            error_log("[Spine Warning] {$warning['code']}: {$warning['message']}");
        }
    }

    return $result;
}
```

---

## 부록: 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0 | 2025-12-20 | 최초 작성 |

---

## 문의

- **기술 문의**: Storige 개발팀
- **API 문서**: `/api/docs` (Swagger UI)
