# 이중 저장 방식 상세 설계 (Dual Storage Strategy)

> **문서 버전**: 1.0
> **작성일**: 2025-12-03
> **상태**: 제안 (Proposal)
> **상위 문서**: [EDITOR-IMPROVEMENT.md](../EDITOR-IMPROVEMENT.md)

---

## 1. 현재 아키텍처 분석

### 1.1 저장 데이터 흐름 (As-Is)

```
┌─────────────────────────────────────────────────────────────────┐
│                     현재 저장 흐름                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   [캔버스 저장]                                                  │
│        │                                                        │
│        ▼                                                        │
│   ┌────────────────────────────────────────┐                   │
│   │ Fabric.js toJSON()                     │                   │
│   │ - 모든 이미지 src를 그대로 직렬화       │                   │
│   │ - 로컬 업로드/처리된 이미지 → Base64   │                   │
│   └────────────────────────────────────────┘                   │
│        │                                                        │
│        ▼                                                        │
│   ┌────────────────────────────────────────┐                   │
│   │ S3 업로드                              │                   │
│   │ - JSON 파일 (이미지 Base64 포함)       │                   │
│   │ - 썸네일 PNG                           │                   │
│   └────────────────────────────────────────┘                   │
│        │                                                        │
│        ▼                                                        │
│   ┌────────────────────────────────────────┐                   │
│   │ GraphQL 저장                           │                   │
│   │ - EditorDesign (사용자 작업)           │                   │
│   │ - EditorTemplate (관리자 템플릿)       │                   │
│   └────────────────────────────────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 이미지 src 저장 형태 (현재)

| 케이스 | src 저장 형태 | 크기 영향 |
|--------|--------------|----------|
| CDN 이미지 로드 | URL (`https://...`) | 작음 |
| 로컬 파일 업로드 | Base64 data URL | 큼 |
| 이미지 처리 후 (배경 제거 등) | Base64 data URL | 큼 |
| 필터/효과 적용 후 | Base64 data URL | 큼 |

### 1.3 주문 vs 템플릿 특성 비교

| 구분 | 주문 파일 (User Work) | 템플릿 (Admin Template) |
|------|----------------------|------------------------|
| **용도** | 1회성 인쇄 주문 | 반복 사용되는 디자인 자산 |
| **수명** | 주문 완료 후 보관 | 장기간 유지/업데이트 |
| **사용 빈도** | 1회 (PDF 생성 후 종료) | 다수 사용자가 반복 로드 |
| **크기 민감도** | 낮음 | 높음 (로딩 속도 영향) |
| **에셋 공유** | 불필요 | 필요 (중복 제거) |
| **버전 관리** | 불필요 | 필요 |

---

## 2. 개선 아키텍처 설계

### 2.1 이중 저장 방식 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                    저장 시점 분기 (To-Be)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   [저장 요청]                                                    │
│       │                                                         │
│       ▼                                                         │
│   ┌───────────────┐                                             │
│   │ 저장 타입 확인 │                                             │
│   │ (SaveMode)    │                                             │
│   └───────┬───────┘                                             │
│           │                                                     │
│     ┌─────┴─────┐                                               │
│     ▼           ▼                                               │
│ [ORDER]     [TEMPLATE]                                          │
│     │           │                                               │
│     ▼           ▼                                               │
│ ┌─────────┐ ┌──────────────────────────────────────┐           │
│ │ Base64  │ │ Asset Reference Strategy             │           │
│ │ 내장    │ │                                      │           │
│ │ (현행)  │ │ 1. 이미지 → Asset Storage 업로드     │           │
│ │         │ │ 2. JSON에 assetRef + transform 저장  │           │
│ │         │ │ 3. 로드 시 Lazy Loading              │           │
│ └─────────┘ └──────────────────────────────────────┘           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 저장 모드 정의

```typescript
/**
 * 저장 모드 열거형
 */
enum SaveMode {
  /** 주문 파일 - Base64 내장 방식 */
  ORDER = 'order',

  /** 템플릿 - Asset 참조 방식 */
  TEMPLATE = 'template'
}
```

### 2.3 데이터 구조 설계

**주문 파일 (ORDER) - 기존 유지**

```typescript
// 주문 파일의 이미지 객체 (기존 방식 유지)
interface OrderImageObject {
  type: 'image';
  src: string;  // Base64 data URL 또는 CDN URL
  width: number;
  height: number;
  // ... 기타 Fabric.js 속성
}
```

**예시:**
```json
{
  "type": "image",
  "src": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "width": 500,
  "height": 400,
  "left": 100,
  "top": 50,
  "scaleX": 1,
  "scaleY": 1
}
```

**템플릿 파일 (TEMPLATE) - Asset Reference 방식**

```typescript
/**
 * Asset 참조 정보
 */
interface AssetRef {
  /** Asset Storage의 고유 ID */
  assetId: string;

  /** Asset 버전 (업데이트 추적용) */
  version: number;

  /** 원본 URL (fallback용) */
  originalUrl?: string;

  /** 파일 체크섬 (무결성 검증용) */
  checksum?: string;
}

/**
 * 이미지 변환/처리 정보
 */
interface ImageTransform {
  /** 배경 제거 여부 */
  backgroundRemoved?: boolean;

  /** 적용된 필터 목록 */
  filters?: string[];

  /** 크롭 영역 */
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  /** 적용된 효과 (골드박, 은박 등) */
  effects?: string[];
}

/**
 * 템플릿용 이미지 객체
 */
interface TemplateImageObject {
  type: 'image';

  /** Asset 참조 (src 대신 사용) */
  assetRef: AssetRef;

  /** 이미지 변환 정보 */
  transform: ImageTransform;

  /** 처리된 결과 캐시 ID (선택) */
  processedCacheId?: string;

  width: number;
  height: number;
  // ... 기타 Fabric.js 속성
}
```

**예시:**
```json
{
  "type": "image",
  "assetRef": {
    "assetId": "asset_abc123def456",
    "version": 1,
    "originalUrl": "https://cdn.wowmall.com/assets/original.png",
    "checksum": "sha256:e3b0c44298fc1c149afbf4c8996fb924..."
  },
  "transform": {
    "backgroundRemoved": true,
    "filters": ["brightness:1.2", "contrast:1.1"],
    "crop": { "x": 10, "y": 20, "width": 480, "height": 360 }
  },
  "processedCacheId": "cache_abc123_bgremoved_v1",
  "width": 500,
  "height": 400,
  "left": 100,
  "top": 50,
  "scaleX": 1,
  "scaleY": 1
}
```

---

## 3. Asset Storage 설계

### 3.1 S3 디렉토리 구조

```
s3://wowmall-editor-assets/
│
├── assets/                              # 공유 에셋 저장소
│   ├── images/
│   │   └── {assetId}/
│   │       ├── original.{ext}           # 원본 이미지
│   │       ├── metadata.json            # 메타데이터
│   │       └── processed/               # 처리된 버전들
│   │           ├── bg_removed.png       # 배경 제거
│   │           ├── thumbnail_sm.png     # 썸네일 (소)
│   │           ├── thumbnail_md.png     # 썸네일 (중)
│   │           └── {cacheId}.png        # 기타 캐시
│   │
│   └── fonts/                           # 폰트 에셋
│       └── {fontId}/
│           └── ...
│
├── templates/                           # 템플릿 JSON (경량)
│   └── {templateId}/
│       ├── canvas.json                  # Asset 참조만 포함
│       └── versions/
│           ├── v1.json
│           └── v2.json
│
└── orders/                              # 주문 파일 (Base64 내장)
    └── users/
        └── {userId}/
            └── personal-document/
                └── {fileName}.json      # Self-contained JSON
```

### 3.2 Asset 메타데이터 구조

```typescript
interface AssetMetadata {
  /** Asset 고유 ID */
  assetId: string;

  /** 현재 버전 */
  version: number;

  /** 원본 파일 정보 */
  original: {
    filename: string;
    mimeType: string;
    size: number;
    width: number;
    height: number;
    checksum: string;
  };

  /** 생성/수정 정보 */
  createdAt: string;
  createdBy: string;
  updatedAt: string;

  /** 처리된 버전 목록 */
  processedVersions: {
    cacheId: string;
    transform: ImageTransform;
    path: string;
    createdAt: string;
  }[];

  /** 사용 현황 */
  usage: {
    templateIds: string[];
    usageCount: number;
  };

  /** 라이선스 정보 (선택) */
  license?: {
    type: string;
    attribution?: string;
    expiresAt?: string;
  };
}
```

**예시 (metadata.json):**
```json
{
  "assetId": "asset_abc123def456",
  "version": 1,
  "original": {
    "filename": "company_logo.png",
    "mimeType": "image/png",
    "size": 245678,
    "width": 1200,
    "height": 800,
    "checksum": "sha256:e3b0c44298fc1c149afbf4c8996fb924..."
  },
  "createdAt": "2025-12-03T10:00:00Z",
  "createdBy": "admin_user_123",
  "updatedAt": "2025-12-03T10:00:00Z",
  "processedVersions": [
    {
      "cacheId": "cache_abc123_bgremoved_v1",
      "transform": { "backgroundRemoved": true },
      "path": "processed/bg_removed.png",
      "createdAt": "2025-12-03T10:05:00Z"
    }
  ],
  "usage": {
    "templateIds": ["template_001", "template_002", "template_003"],
    "usageCount": 3
  },
  "license": {
    "type": "proprietary",
    "attribution": "WowMall Inc."
  }
}
```

---

## 4. 저장/로드 흐름 상세

### 4.1 템플릿 저장 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│                    템플릿 저장 흐름                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   [관리자 템플릿 저장 클릭]                                      │
│            │                                                    │
│            ▼                                                    │
│   ┌────────────────────────────────────────────────────┐       │
│   │ Step 1: 이미지 객체 순회                           │       │
│   │ - Canvas의 모든 이미지 객체 탐색                   │       │
│   │ - Base64 src 감지                                  │       │
│   │ - 각 이미지의 해시값 계산 (중복 체크용)            │       │
│   └────────────────────────────────────────────────────┘       │
│            │                                                    │
│            ▼                                                    │
│   ┌────────────────────────────────────────────────────┐       │
│   │ Step 2: Asset 중복 확인                            │       │
│   │ - 해시값으로 기존 Asset 검색                       │       │
│   │ - 존재하면 → 기존 assetId 사용                     │       │
│   │ - 신규면 → Asset Storage에 업로드                  │       │
│   └────────────────────────────────────────────────────┘       │
│            │                                                    │
│            ▼                                                    │
│   ┌────────────────────────────────────────────────────┐       │
│   │ Step 3: Transform 정보 추출                        │       │
│   │ - 적용된 필터/효과 정보 수집                       │       │
│   │ - 배경 제거 여부 확인                              │       │
│   │ - 처리된 결과 캐시 생성 (선택)                     │       │
│   └────────────────────────────────────────────────────┘       │
│            │                                                    │
│            ▼                                                    │
│   ┌────────────────────────────────────────────────────┐       │
│   │ Step 4: JSON 변환                                  │       │
│   │ - src: base64 → assetRef: { assetId, ... }        │       │
│   │ - transform 정보 첨부                              │       │
│   │ - 경량 JSON 생성                                   │       │
│   └────────────────────────────────────────────────────┘       │
│            │                                                    │
│            ▼                                                    │
│   ┌────────────────────────────────────────────────────┐       │
│   │ Step 5: 저장                                       │       │
│   │ - S3: templates/{templateId}/canvas.json           │       │
│   │ - DB: EditorTemplate 메타데이터                    │       │
│   │ - Asset 사용 현황 업데이트                         │       │
│   └────────────────────────────────────────────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 템플릿 로드 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│                    템플릿 로드 흐름                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   [사용자 템플릿 선택]                                           │
│            │                                                    │
│            ▼                                                    │
│   ┌────────────────────────────────────────────────────┐       │
│   │ Step 1: 경량 JSON 로드 (빠름)                      │       │
│   │ - templates/{templateId}/canvas.json 다운로드      │       │
│   │ - Asset 참조만 포함된 작은 파일 (수십 KB)          │       │
│   └────────────────────────────────────────────────────┘       │
│            │                                                    │
│            ▼                                                    │
│   ┌────────────────────────────────────────────────────┐       │
│   │ Step 2: 캔버스 구조 렌더링                         │       │
│   │ - 텍스트, 도형 등 즉시 렌더링                      │       │
│   │ - 이미지 위치에 placeholder 표시                   │       │
│   │ - 사용자는 즉시 작업 가능                          │       │
│   └────────────────────────────────────────────────────┘       │
│            │                                                    │
│            ▼                                                    │
│   ┌────────────────────────────────────────────────────┐       │
│   │ Step 3: Lazy Asset Loading                         │       │
│   │ - Viewport 내 이미지 우선 로드                     │       │
│   │ - processedCacheId 있으면 캐시 버전 로드           │       │
│   │ - 없으면 원본 + transform 재적용                   │       │
│   │ - CDN URL로 점진적 로드                            │       │
│   └────────────────────────────────────────────────────┘       │
│            │                                                    │
│            ▼                                                    │
│   ┌────────────────────────────────────────────────────┐       │
│   │ Step 4: 이미지 로드 완료                           │       │
│   │ - placeholder → 실제 이미지로 교체                 │       │
│   │ - Canvas 업데이트                                  │       │
│   └────────────────────────────────────────────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 주문 전환 흐름 (템플릿 → 주문)

```
┌─────────────────────────────────────────────────────────────────┐
│               주문 전환 흐름 (Asset → Base64)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   [사용자가 템플릿 기반 작업 완료]                               │
│            │                                                    │
│            ▼                                                    │
│   [주문하기 / 내 작업에 저장 클릭]                               │
│            │                                                    │
│            ▼                                                    │
│   ┌────────────────────────────────────────────────────┐       │
│   │ Step 1: SaveMode 확인                              │       │
│   │ - 주문/개인작업 저장 → SaveMode.ORDER              │       │
│   └────────────────────────────────────────────────────┘       │
│            │                                                    │
│            ▼                                                    │
│   ┌────────────────────────────────────────────────────┐       │
│   │ Step 2: Asset → Base64 변환                        │       │
│   │ - assetRef가 있는 이미지 객체 탐색                 │       │
│   │ - processedCacheId 있으면 캐시된 이미지 사용       │       │
│   │ - 없으면 현재 Canvas 상태에서 추출                 │       │
│   │ - Canvas.toDataURL()로 Base64 변환                 │       │
│   └────────────────────────────────────────────────────┘       │
│            │                                                    │
│            ▼                                                    │
│   ┌────────────────────────────────────────────────────┐       │
│   │ Step 3: Self-contained JSON 생성                   │       │
│   │ - assetRef → src: base64 로 교체                   │       │
│   │ - transform 정보 제거 (이미 적용됨)                │       │
│   │ - PDF 생성에 필요한 모든 데이터 내장               │       │
│   └────────────────────────────────────────────────────┘       │
│            │                                                    │
│            ▼                                                    │
│   ┌────────────────────────────────────────────────────┐       │
│   │ Step 4: 주문 파일 저장                             │       │
│   │ - S3: orders/users/{userId}/.../{fileName}.json    │       │
│   │ - DB: EditorDesign 메타데이터                      │       │
│   └────────────────────────────────────────────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. API 설계

### 5.1 Asset Management API

**Asset 업로드**

```graphql
mutation CreateAsset($input: CreateAssetInput!) {
  createAsset(input: $input) {
    assetId
    version
    urls {
      original
      thumbnail
    }
    checksum
  }
}

input CreateAssetInput {
  file: Upload!
  filename: String!
  mimeType: String!
  metadata: AssetMetadataInput
}
```

**Asset 조회**

```graphql
query GetAsset($assetId: ID!) {
  asset(id: $assetId) {
    assetId
    version
    original {
      url
      width
      height
      mimeType
    }
    processedVersions {
      cacheId
      url
      transform
    }
    usage {
      templateCount
    }
  }
}
```

**Asset 중복 확인**

```graphql
query FindAssetByChecksum($checksum: String!) {
  assetByChecksum(checksum: $checksum) {
    assetId
    version
  }
}
```

### 5.2 Template Save API 확장

```graphql
mutation SaveTemplate($input: SaveTemplateInput!) {
  saveTemplate(input: $input) {
    templateId
    version
    assets {
      assetId
      status  # UPLOADED, EXISTING, FAILED
    }
  }
}

input SaveTemplateInput {
  templateId: ID
  name: String!
  canvasData: String!  # Asset Reference가 포함된 경량 JSON
  saveMode: SaveMode!
}

enum SaveMode {
  ORDER
  TEMPLATE
}
```

---

## 6. 구현 계획

### Phase 1: 기반 구조

| 작업 | 설명 | 담당 |
|------|------|------|
| SaveMode 열거형 추가 | 저장 타입 분기 로직 | Frontend |
| AssetRef 인터페이스 정의 | TypeScript 타입 정의 | Frontend |
| Asset Storage S3 구조 생성 | 버킷/폴더 구조 설정 | Backend |

### Phase 2: Asset Management

| 작업 | 설명 | 담당 |
|------|------|------|
| Asset 업로드 API | CreateAsset mutation | Backend |
| Asset 조회 API | GetAsset query | Backend |
| Asset 중복 확인 | 해시 기반 검색 | Backend |
| Asset 메타데이터 DB | 스키마 설계 및 마이그레이션 | Backend |

### Phase 3: 템플릿 저장 개선

| 작업 | 설명 | 담당 |
|------|------|------|
| Base64 → Asset 변환 로직 | 저장 시 이미지 추출 | Frontend |
| Transform 정보 추출 | 필터/효과 정보 수집 | Frontend |
| 경량 JSON 생성 | AssetRef 방식 직렬화 | Frontend |

### Phase 4: 템플릿 로드 개선

| 작업 | 설명 | 담당 |
|------|------|------|
| Lazy Loading 구현 | Viewport 기반 로드 | Frontend |
| Placeholder UI | 로딩 중 표시 | Frontend |
| Asset URL Resolver | assetRef → CDN URL | Frontend |

### Phase 5: 주문 전환

| 작업 | 설명 | 담당 |
|------|------|------|
| Asset → Base64 변환 | 주문 저장 시 변환 | Frontend |
| Self-contained 검증 | PDF 생성 테스트 | QA |

### Phase 6: 마이그레이션

| 작업 | 설명 | 담당 |
|------|------|------|
| 기존 템플릿 분석 | Base64 이미지 추출 | Backend |
| 마이그레이션 스크립트 | 일괄 변환 도구 | Backend |
| 롤백 계획 | 문제 발생 시 대응 | DevOps |

---

## 7. 기대 효과

### 정량적 개선

| 지표 | 현재 (As-Is) | 개선 후 (To-Be) | 개선율 |
|------|-------------|----------------|--------|
| 템플릿 JSON 크기 | 50~200 MB | 50~200 KB | **99% 감소** |
| 초기 로딩 시간 | 5~20초 | 0.5~2초 | **90% 감소** |
| 동일 이미지 중복 | N회 저장 | 1회 저장 | **N배 절약** |
| CDN 캐시 적중률 | 낮음 | 높음 | **대폭 개선** |

### 정성적 개선

- **에셋 중앙 관리**: 브랜드 로고 등 공통 에셋 일괄 업데이트 가능
- **라이선스 추적**: 이미지 사용 현황 파악 및 컴플라이언스 관리
- **버전 관리**: 템플릿 및 에셋의 변경 이력 추적
- **확장성**: 대형 템플릿 지원 가능 (현수막, 배너 등)

---

## 8. 리스크 및 대응

### 기술적 리스크

| 리스크 | 영향 | 대응 방안 |
|--------|------|----------|
| Asset 로드 실패 | 이미지 표시 불가 | fallback URL, 재시도 로직 |
| 마이그레이션 오류 | 기존 템플릿 손상 | 백업 후 진행, 롤백 계획 |
| Transform 재적용 오차 | 이미지 품질 차이 | processedCache 우선 사용 |

### 운영 리스크

| 리스크 | 영향 | 대응 방안 |
|--------|------|----------|
| Asset 삭제 시 참조 무결성 | 템플릿 깨짐 | 사용 중인 Asset 삭제 금지 |
| 저장소 비용 증가 (Asset) | 비용 증가 | 미사용 Asset 정리 정책 |

---

## 9. 결론

이중 저장 방식(Dual Storage Strategy)을 통해:

1. **주문 파일**은 기존 Base64 방식을 유지하여 PDF 생성 안정성 보장
2. **템플릿 파일**은 Asset Reference 방식으로 전환하여 성능 및 관리 효율성 대폭 개선

이를 통해 대형 제품 템플릿 지원, 에셋 중앙 관리, 로딩 성능 개선이라는 세 가지 핵심 목표를 달성할 수 있습니다.

---

## 참고 자료

- Fabric.js 직렬화: http://fabricjs.com/fabric-intro-part-3
- AWS S3 Best Practices: https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance.html
