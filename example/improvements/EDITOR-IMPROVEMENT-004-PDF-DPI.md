# PDF 출력 DPI 개선 상세 설계

> **문서 버전**: 1.0
> **작성일**: 2025-12-03
> **상태**: 제안 (Proposal)
> **우선순위**: 🔴 높음 (Critical)
> **상위 문서**: [EDITOR-IMPROVEMENT.md](../EDITOR-IMPROVEMENT.md)

---

## 1. 현재 상태 분석

### 1.1 인쇄 산업 표준 DPI

| 용도 | 표준 DPI | 설명 |
|------|----------|------|
| 화면 표시 | 72 DPI | 모니터 기본 해상도 |
| 일반 인쇄 | 150 DPI | 가정용 프린터 |
| 고품질 인쇄 | 300 DPI | 상업 인쇄 표준 |
| 상업 인쇄 | 600+ DPI | 고급 인쇄물 |

**WowMall 에디터 목적**: 인쇄용 PDF 생성 → **최소 300 DPI 필요**

### 1.2 현재 DPI 설정 현황

| 위치 | DPI 값 | 용도 | 문제 |
|------|--------|------|------|
| `AppNav.vue:207` | **72** | 메인 PDF 저장 | 🔴 **하드코딩, 설정 무시** |
| `ServicePlugin.ts:47` | 72 | 함수 기본값 | 🔴 낮은 기본값 |
| `settings.ts` (모든 useCase) | 150 | 설정 초기값 | 🟡 인쇄 표준 미달 |
| `constants.ts` | 150 | 단위 변환 기준 | - |

### 1.3 코드 분석

#### AppNav.vue - 메인 PDF 저장 (🔴 핵심 문제)

**파일**: `apps/web/src/components/AppNav.vue`

```typescript
// Line 195-207
await servicePlugin.saveMultiPagePDF(
  appStore.allCanvas,
  appStore.allEditors,
  artwork.value.name,
  {
    width: settingsStore.size.width + settingsStore.size.cutSize,
    height: settingsStore.size.height + settingsStore.size.cutSize,
    cutSize: settingsStore.size.cutSize,
    printSize: settingsStore.size.printSize
  },
  cutline,
  //settingsStore.currentSettings.dpi  // ← 주석처리됨!
  72  // ← 72 DPI로 하드코딩
)
```

**문제**: 설정에서 150 DPI를 정의했지만, 실제 저장 시 72 DPI로 강제됩니다.

#### ServicePlugin.ts - 함수 기본값

**파일**: `packages/canvas-core/src/plugins/ServicePlugin.ts`

```typescript
// Line 36-57
async saveMultiPagePDF(
  canvases: fabric.Canvas[],
  editors: Editor[],
  fileName: string = 'project',
  size: {
    width: number
    height: number
    cutSize: number
    printSize?: { width: number; height: number }
  },
  cutLine?: fabric.Object,
  dpi: number = 72  // ← 기본값이 72 DPI
): Promise<void>
```

#### settings.ts - 설정 초기값

**파일**: `apps/web/src/stores/settings.ts`

```typescript
// Line 89, 110, 131, 152
const USE_CASE_CONFIGS = {
  'empty': {
    defaultSettings: {
      dpi: 150,  // 인쇄 표준 300 미달
      colorMode: 'RGB'
    }
  },
  'content-edit': {
    defaultSettings: {
      dpi: 150,
      colorMode: 'RGB'
    }
  },
  'product-based': {
    defaultSettings: {
      dpi: 150,
      colorMode: 'RGB'
    }
  },
  'general': {
    defaultSettings: {
      dpi: 150,
      colorMode: 'RGB'
    }
  }
}
```

### 1.4 DPI 흐름 분석

```
┌─────────────────────────────────────────────────────────────────┐
│                    현재 DPI 흐름                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   [Settings Store]                                              │
│   dpi: 150 (초기값)                                             │
│       │                                                         │
│       ▼                                                         │
│   [AppNav.vue - PDF 저장]                                       │
│   //settingsStore.currentSettings.dpi  ← 주석처리됨             │
│   72  ← 하드코딩                                                │
│       │                                                         │
│       ▼                                                         │
│   [ServicePlugin.saveMultiPagePDF]                              │
│   dpi 파라미터 = 72                                             │
│       │                                                         │
│       ▼                                                         │
│   [PDF 생성]                                                     │
│   72 DPI로 렌더링 ← 인쇄 품질 부적합                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.5 72 DPI 품질 문제

| 문제 | 설명 | 영향 |
|------|------|------|
| **텍스트 계단 현상** | 글자 경계가 픽셀화됨 | 가독성 저하 |
| **이미지 품질 저하** | 사진/그래픽 흐릿함 | 시각적 품질 저하 |
| **인쇄 시 픽셀 노출** | 육안으로 픽셀 보임 | 상업 인쇄 불가 |
| **인쇄소 반려** | 품질 기준 미달 | 납품 거부 |

---

## 2. 개선 설계

### 2.1 목표 DPI 체계

| 저장 유형 | 목표 DPI | 색상 모드 | 용도 |
|----------|----------|----------|------|
| 미리보기 PDF | 150 | RGB | 화면 확인용 |
| 인쇄용 PDF | 300 | CMYK | 상업 인쇄 |
| 고급 인쇄용 PDF | 600 | CMYK | 고급 인쇄물 |

### 2.2 개선된 DPI 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│                    개선된 DPI 흐름                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   [Settings Store]                                              │
│   dpi: 300 (인쇄 표준)                                          │
│       │                                                         │
│       ▼                                                         │
│   [AppNav.vue - PDF 저장]                                       │
│   settingsStore.currentSettings.dpi  ← 설정값 사용              │
│       │                                                         │
│       ▼                                                         │
│   [ServicePlugin.saveMultiPagePDF]                              │
│   dpi 파라미터 = 300 (설정에서 전달)                            │
│       │                                                         │
│       ▼                                                         │
│   [PDF 생성]                                                     │
│   300 DPI로 렌더링 ← 상업 인쇄 적합                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 구현 상세

### 3.1 수정 대상 파일

| 파일 | 수정 내용 | 우선순위 |
|------|----------|---------|
| `AppNav.vue:207` | 하드코딩 제거, 설정값 사용 | 🔴 즉시 |
| `ServicePlugin.ts:47` | 기본값 72 → 300 | 🔴 즉시 |
| `settings.ts` | 기본값 150 → 300 | 높음 |
| `constants.ts` | DEFAULT_DPI 150 → 300 | 높음 |

### 3.2 AppNav.vue 수정

**파일**: `apps/web/src/components/AppNav.vue`

**변경 전 (Line 195-207):**
```typescript
await servicePlugin.saveMultiPagePDF(
  appStore.allCanvas,
  appStore.allEditors,
  artwork.value.name,
  {
    width: settingsStore.size.width + settingsStore.size.cutSize,
    height: settingsStore.size.height + settingsStore.size.cutSize,
    cutSize: settingsStore.size.cutSize,
    printSize: settingsStore.size.printSize
  },
  cutline,
  //settingsStore.currentSettings.dpi
  72
)
```

**변경 후:**
```typescript
await servicePlugin.saveMultiPagePDF(
  appStore.allCanvas,
  appStore.allEditors,
  artwork.value.name,
  {
    width: settingsStore.size.width + settingsStore.size.cutSize,
    height: settingsStore.size.height + settingsStore.size.cutSize,
    cutSize: settingsStore.size.cutSize,
    printSize: settingsStore.size.printSize
  },
  cutline,
  settingsStore.currentSettings.dpi  // 설정값 사용
)
```

### 3.3 ServicePlugin.ts 수정

**파일**: `packages/canvas-core/src/plugins/ServicePlugin.ts`

**변경 전 (Line 36-57):**
```typescript
async saveMultiPagePDF(
  canvases: fabric.Canvas[],
  editors: Editor[],
  fileName: string = 'project',
  size: {
    width: number
    height: number
    cutSize: number
    printSize?: { width: number; height: number }
  },
  cutLine?: fabric.Object,
  dpi: number = 72  // 낮은 기본값
): Promise<void>
```

**변경 후:**
```typescript
async saveMultiPagePDF(
  canvases: fabric.Canvas[],
  editors: Editor[],
  fileName: string = 'project',
  size: {
    width: number
    height: number
    cutSize: number
    printSize?: { width: number; height: number }
  },
  cutLine?: fabric.Object,
  dpi: number = 300  // 인쇄 표준
): Promise<void>
```

### 3.4 settings.ts 수정

**파일**: `apps/web/src/stores/settings.ts`

**변경 전:**
```typescript
const USE_CASE_CONFIGS = {
  'empty': {
    defaultSettings: {
      dpi: 150,
      colorMode: 'RGB'
    }
  },
  'content-edit': {
    defaultSettings: {
      dpi: 150,
      colorMode: 'RGB'
    }
  },
  'product-based': {
    defaultSettings: {
      dpi: 150,
      colorMode: 'RGB'
    }
  },
  'general': {
    defaultSettings: {
      dpi: 150,
      colorMode: 'RGB'
    }
  }
}
```

**변경 후:**
```typescript
const USE_CASE_CONFIGS = {
  'empty': {
    defaultSettings: {
      dpi: 300,
      colorMode: 'RGB'
    }
  },
  'content-edit': {
    defaultSettings: {
      dpi: 300,
      colorMode: 'RGB'
    }
  },
  'product-based': {
    defaultSettings: {
      dpi: 300,
      colorMode: 'CMYK'  // 인쇄용은 CMYK
    }
  },
  'general': {
    defaultSettings: {
      dpi: 300,
      colorMode: 'RGB'
    }
  }
}
```

### 3.5 constants.ts 수정

**파일**: `packages/canvas-core/src/ruler/constants.ts`

**변경 전:**
```typescript
export const UNIT_CONVERSIONS = {
  DEFAULT_DPI: 150
}
```

**변경 후:**
```typescript
export const UNIT_CONVERSIONS = {
  DEFAULT_DPI: 300
}
```

---

## 4. 추가 개선 (선택)

### 4.1 DPI 선택 UI 추가

사용자가 PDF 저장 시 DPI를 선택할 수 있도록 UI 추가:

```typescript
// DPI 옵션 정의
const DPI_OPTIONS = [
  { label: '미리보기 (150 DPI)', value: 150, description: '화면 확인용' },
  { label: '표준 인쇄 (300 DPI)', value: 300, description: '일반 상업 인쇄' },
  { label: '고급 인쇄 (600 DPI)', value: 600, description: '고품질 인쇄물' }
]
```

### 4.2 제품별 DPI 자동 설정

제품 타입에 따라 적절한 DPI 자동 선택:

```typescript
// 제품 타입별 권장 DPI
const PRODUCT_DPI_RECOMMENDATIONS = {
  'business-card': 300,    // 명함
  'flyer': 300,            // 전단지
  'poster': 150,           // 포스터 (큰 크기)
  'banner': 150,           // 현수막
  'photo-book': 300,       // 포토북
  'packaging': 300         // 패키지
}
```

### 4.3 파일 크기 경고

고해상도 선택 시 예상 파일 크기 표시:

```typescript
function estimateFileSize(dpi: number, pageSize: Size, pageCount: number): string {
  // 대략적인 추정 (실제는 내용에 따라 다름)
  const baseSize = (pageSize.width * pageSize.height * dpi * dpi) / 1000000
  const estimatedMB = baseSize * pageCount * 0.5  // 압축 고려

  if (estimatedMB > 50) {
    return `⚠️ 예상 파일 크기: ${estimatedMB.toFixed(0)}MB (다운로드에 시간이 걸릴 수 있습니다)`
  }
  return `예상 파일 크기: ${estimatedMB.toFixed(0)}MB`
}
```

---

## 5. 테스트 계획

### 5.1 DPI 변경 확인 테스트

```typescript
describe('PDF DPI Settings', () => {
  it('should use settings DPI value instead of hardcoded 72', async () => {
    // 설정에서 300 DPI 설정
    settingsStore.setDpi(300)

    // PDF 저장 호출
    const saveSpy = vi.spyOn(servicePlugin, 'saveMultiPagePDF')
    await saveAsPdf()

    // 300 DPI로 호출되었는지 확인
    expect(saveSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      300  // 설정값 사용 확인
    )
  })
})
```

### 5.2 PDF 품질 테스트

```typescript
describe('PDF Quality', () => {
  it('should generate PDF with correct DPI metadata', async () => {
    const pdfBlob = await generatePdf(300)
    const pdfDoc = await PDFDocument.load(await pdfBlob.arrayBuffer())

    // PDF 메타데이터 확인
    // (실제 DPI는 PDF 내 이미지 해상도로 확인)
  })
})
```

### 5.3 시각적 품질 비교

| DPI | 테스트 항목 | 기대 결과 |
|-----|------------|----------|
| 72 | 텍스트 선명도 | 계단 현상 있음 |
| 150 | 텍스트 선명도 | 경미한 계단 현상 |
| 300 | 텍스트 선명도 | 선명함 |
| 72 | 이미지 품질 | 흐릿함 |
| 300 | 이미지 품질 | 선명함 |

---

## 6. 구현 계획

### Phase 1: 긴급 수정 (즉시)

| 작업 | 파일 | 변경 내용 | 시간 |
|------|------|----------|------|
| 하드코딩 제거 | AppNav.vue:207 | `72` → `settingsStore.currentSettings.dpi` | 5분 |
| 기본값 변경 | ServicePlugin.ts:47 | `dpi: number = 72` → `dpi: number = 300` | 5분 |
| 테스트 | - | PDF 저장 후 품질 확인 | 30분 |

### Phase 2: 설정 업데이트 (1일)

| 작업 | 파일 | 변경 내용 | 시간 |
|------|------|----------|------|
| 기본 DPI 상향 | settings.ts | `dpi: 150` → `dpi: 300` | 15분 |
| 상수 업데이트 | constants.ts | `DEFAULT_DPI: 150` → `DEFAULT_DPI: 300` | 5분 |
| 회귀 테스트 | - | 전체 기능 테스트 | 2시간 |

### Phase 3: 추가 개선 (선택)

| 작업 | 설명 | 시간 |
|------|------|------|
| DPI 선택 UI | 사용자 선택 옵션 | 4시간 |
| 제품별 DPI | 자동 설정 | 2시간 |
| 파일 크기 경고 | 예상 크기 표시 | 2시간 |

---

## 7. 기대 효과

### 정량적 개선

| 지표 | 현재 | 개선 후 | 변화 |
|------|------|---------|------|
| PDF DPI | 72 | 300 | **+317%** |
| 인쇄 해상도 | ~72 PPI | ~300 PPI | **+317%** |
| 텍스트 선명도 | 낮음 | 높음 | **대폭 개선** |

### 정성적 개선

- **상업 인쇄 가능**: 인쇄소 품질 기준 충족
- **고객 만족도 향상**: 인쇄물 품질 개선
- **반품/재작업 감소**: 품질 문제로 인한 재작업 방지
- **WowPress 호환성**: 인쇄 서비스 요구사항 충족

---

## 8. 리스크 및 대응

| 리스크 | 영향 | 대응 방안 |
|--------|------|----------|
| PDF 파일 크기 증가 | 다운로드/업로드 시간 증가 | 파일 크기 경고 UI, 압축 옵션 |
| 메모리 사용량 증가 | 대형 캔버스에서 OOM 가능 | 점진적 렌더링, 메모리 모니터링 |
| 렌더링 시간 증가 | UX 저하 | 프로그레스 표시, 백그라운드 처리 |
| WowPress API 호환성 | 기존 워크플로우 영향 | API 요구사항 확인 후 적용 |

### 메모리 최적화 (필요시)

```typescript
// 대형 캔버스의 경우 청크 단위로 렌더링
async function renderLargeCanvasAsPdf(canvas: fabric.Canvas, dpi: number) {
  const CHUNK_SIZE = 1000  // px

  for (let y = 0; y < canvas.height; y += CHUNK_SIZE) {
    for (let x = 0; x < canvas.width; x += CHUNK_SIZE) {
      // 청크 렌더링
      await renderChunk(canvas, x, y, CHUNK_SIZE, dpi)

      // 메모리 해제
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }
}
```

---

## 9. 결론

PDF DPI 개선은 **즉시 수정이 필요한 Critical 이슈**입니다.

**핵심 변경:**
1. `AppNav.vue:207` - 하드코딩된 `72` 제거 → `settingsStore.currentSettings.dpi` 사용
2. `ServicePlugin.ts:47` - 기본값 `72` → `300`
3. `settings.ts` - 기본 DPI `150` → `300`

이 변경으로 **상업 인쇄 품질 기준을 충족**하는 PDF를 생성할 수 있습니다.

---

## 참고 자료

- 인쇄 산업 DPI 표준: https://www.printingforless.com/resolution.html
- jsPDF 문서: https://rawgit.com/MrRio/jsPDF/master/docs/
- svg2pdf.js: https://github.com/yWorks/svg2pdf.js
