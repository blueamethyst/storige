# PDF 검증 기능 확장 검토서

## 개요

| 항목 | 내용 |
|------|------|
| 작성일 | 2025-12-22 |
| 목적 | 고객 문의 8가지 항목에 대한 구현 가능성 검토 |
| 현재 스택 | pdf-lib v1.17.1, Ghostscript, Sharp |

---

## 검토 결과 요약

| # | 기능 | 현재 상태 | 구현 가능 | 난이도 | 권장 방식 |
|---|------|----------|----------|--------|----------|
| 1 | 별색 감지 | ❌ 미구현 | ⭐ 가능 | 높음 | Ghostscript/Python |
| 2 | 가로형 페이지 감지 | ❌ 미구현 | ✅ 가능 | 낮음 | pdf-lib |
| 3 | 펼침면 인쇄 순서 | ⚠️ 부분 | ⭐ 제한적 | 중상 | 논리적 검증 |
| 4 | 사철 펼침면 연결 | ❌ 미구현 | ✅ 가능 | 중간 | pdf-lib |
| 5 | 스프레드(펼침면) 감지 | ❌ 미구현 | ✅ 가능 | 중간 | pdf-lib + 점수 기반 |
| 6 | CMYK 감지 | ❌ 미구현 | ✅ 가능 | 중간 | 2단계 검증 (구조→inkcov) |
| 7 | 용량 제한 | ✅ 구현됨 | - | - | 100MB 기본값 |
| 8 | 투명도/오버프린트 | ❌ 미구현 | ⭐ 가능 | 높음 | Ghostscript/Python |

---

## 상세 검토

### 1. 별색(Spot Color) 감지

**현재 상태**: ❌ 미구현

**구현 가능 여부**: ⭐ 가능 (Ghostscript 또는 Python 필요)

**pdf-lib 한계**:
- ColorSpace, Separation, DeviceN 객체 접근 불가
- 색상 정보 추상화 레이어가 없음

**구현 방안 (Ghostscript)**:
```typescript
// PostScript 스크립트로 ColorSpace 정보 추출
const args = [
  '-q', '-dNODISPLAY', '-dBATCH',
  '-sFileName=' + inputPath,
  '-c', `
    (${inputPath}) (r) file runpdfbegin
    1 pdfpagecount {
      pdfgetpage /ColorSpaces get {
        /Separation eq { (SPOT_COLOR_FOUND) print } if
      } forall
    } repeat quit
  `
];
```

**대안**: Python 마이크로서비스 (PyPDF2, pdfplumber)

**예상 소요**: 12-16시간

---

### 2. 가로형 페이지 감지

**현재 상태**: ❌ 미구현 (페이지 크기만 확인)

**구현 가능 여부**: ✅ 가능 (pdf-lib)

**구현 방안**:
```typescript
// pdf-validator.service.ts에 추가
private validatePageOrientation(
  widthMm: number,
  heightMm: number,
  pageIndex: number,
  warnings: ValidationWarning[],
): void {
  const isLandscape = widthMm > heightMm;

  if (isLandscape) {
    warnings.push({
      code: WarningCode.LANDSCAPE_PAGE,
      message: `${pageIndex + 1}페이지가 가로형입니다.`,
      details: { page: pageIndex + 1, width: widthMm, height: heightMm },
      autoFixable: false,
    });
  }
}
```

**수정 파일**: `apps/worker/src/services/pdf-validator.service.ts`

**예상 소요**: 2시간

---

### 3. 펼침면 인쇄 순서 확인 (1 / 2-3 / 4-5)

**현재 상태**: ⚠️ 부분 구현 (표지만 처리)

**구현 가능 여부**: ⭐ 제한적 가능

**한계점**:
- PDF 구조상 "펼침면"은 논리적 개념 (물리적 정보 없음)
- 페이지 크기 변화로만 추론 가능 (부정확)

**구현 방안**:
```typescript
private validateSpreadOrder(
  pages: PDFPage[],
  expectedPattern: 'spread' | 'single',
  warnings: ValidationWarning[],
): void {
  // 첫 페이지: 단일
  // 이후 페이지: 크기가 2배면 펼침면으로 추정
  const firstPageWidth = pages[0].getSize().width;

  for (let i = 1; i < pages.length; i++) {
    const pageWidth = pages[i].getSize().width;
    const isSpread = pageWidth > firstPageWidth * 1.8; // 1.8배 이상이면 펼침

    // 패턴 검증 로직
  }
}
```

**제약사항**: 페이지 크기 기반 휴리스틱만 가능, 100% 정확도 불가

**예상 소요**: 4-6시간

---

### 4. 사철 좌우 펼침면 연결 확인

**현재 상태**: ❌ 미구현

**구현 가능 여부**: ✅ 가능 (pdf-lib)

**사철 좌우 펼침면 PDF 특징**:
- 페이지 폭 ≈ 단일 페이지의 2배
- 페이지 수 = 실제 페이지 수 / 2
- 중앙 기준선 존재 (명시적 또는 암묵적)

**자동 검수 체크 포인트**:
| 체크 항목 | pdf-lib 가능 여부 | 비고 |
|----------|------------------|------|
| 가로폭 2배 여부 | ✅ 가능 | `page.getSize()` |
| 페이지 수 짝수 규칙 | ✅ 가능 | 4의 배수 검증 |
| 중앙부 객체 존재 여부 | ⚠️ 제한적 | 객체 위치 분석 필요 |
| 사철 제본 메타정보 | ✅ 가능 | 주문 옵션에서 전달 |

**구현 방안**:
```typescript
private validateSaddleStitchSpread(
  pages: PDFPage[],
  expectedSingleWidth: number,  // 단일 페이지 예상 폭 (mm)
  expectedHeight: number,
  bindingType: string,
  errors: ValidationError[],
  warnings: ValidationWarning[],
): void {
  const pageCount = pages.length;

  // 1. 사철 제본: 4의 배수 필수 (펼침면 기준 2의 배수)
  if (pageCount % 2 !== 0) {
    errors.push({
      code: ErrorCode.SADDLE_STITCH_INVALID,
      message: '사철 제본 펼침면은 페이지 수가 짝수여야 합니다.',
      autoFixable: true,
      fixMethod: 'addBlankPages',
    });
  }

  // 2. 최대 페이지 수 제한 (펼침면 32장 = 64페이지)
  if (pageCount > 32) {
    errors.push({
      code: ErrorCode.PAGE_COUNT_EXCEEDED,
      message: '사철 제본은 최대 32장(64페이지)까지 가능합니다.',
    });
  }

  // 3. 가로폭 2배 여부 검증
  for (let i = 0; i < pages.length; i++) {
    const { width, height } = pages[i].getSize();
    const widthMm = width * 0.352778;
    const heightMm = height * 0.352778;

    const expectedSpreadWidth = expectedSingleWidth * 2;
    const widthTolerance = 2; // 2mm 오차 허용

    if (Math.abs(widthMm - expectedSpreadWidth) > widthTolerance) {
      errors.push({
        code: ErrorCode.SIZE_MISMATCH,
        message: `${i + 1}페이지 폭이 펼침면 규격(${expectedSpreadWidth}mm)과 맞지 않습니다.`,
        details: { page: i + 1, expected: expectedSpreadWidth, actual: widthMm },
      });
    }
  }

  // 4. 중앙부 객체 존재 여부 경고 (선택적)
  // - pdf-lib으로는 객체 위치 분석이 제한적
  // - 중앙 10% 영역에 객체가 걸쳐있으면 경고
  warnings.push({
    code: WarningCode.CENTER_OBJECT_CHECK,
    message: '펼침면 중앙부에 중요 객체가 배치되어 있는지 확인해주세요.',
    autoFixable: false,
  });
}
```

**중앙부 객체 감지 (고급)**:
```typescript
// Ghostscript로 중앙 영역 렌더링 후 분석
private async checkCenterObjects(
  inputPath: string,
  pageIndex: number,
): Promise<boolean> {
  // 중앙 10% 영역만 추출하여 이미지로 변환
  // Sharp로 해당 영역의 픽셀 분석
  // 빈 영역이 아니면 경고
}
```

**고객 답변 제안**: "사철 제본 펼침면 검증 시 다음 항목을 자동으로 체크합니다:
- 페이지 폭이 단일 페이지의 2배인지
- 페이지 수가 짝수(4의 배수)인지
- 중앙부 객체 배치 여부 (경고)"

**예상 소요**: 4-6시간

---

### 5. 스프레드(펼침면) 형식 감지

**현재 상태**: ❌ 미구현

**구현 가능 여부**: ✅ 가능 (pdf-lib + 점수 기반 판정)

**고객 질문 해석**:
> "216×303 40페이지가 아닌 432×303 20페이지로 접수 시 어떤 내용이 뜰까요?"

**현재 동작**: 사이즈 불일치 에러 발생

---

#### 5.1 입력 정보

| 정보 | 소스 | 필수 |
|------|------|------|
| 페이지별 (widthPt, heightPt) | pdf-lib `page.getSize()` | ✅ |
| 단면 기준 규격 (expectedSingleWidthMm, expectedHeightMm) | 주문/상품 스펙 | 권장 |
| 재단/도련(bleed) 옵션 | 주문 옵션 | 선택 |

**단위 변환**: `mm = pt * 25.4 / 72` (= pt * 0.352778)

---

#### 5.2 1차 판별: 가로/세로 비율

**A. 규격 기반 판별 (가장 정확)**

단면 규격을 아는 경우:
- `spreadWidthMm ≈ expectedSingleWidthMm * 2`
- `heightMm ≈ expectedHeightMm`
- **오차 허용치**: ±2~3mm (도련 불명확 시 ±5mm)

**B. 비율 기반 판별 (규격 모를 때)**

```
ratio = width / height

일반 단면: ratio < 1 (세로형) 또는 ~1.4 (가로형)
펼침면: ratio가 단면의 약 2배

예시:
- A4 단면 210×297 → ratio 0.707
- A4 펼침 420×297 → ratio 1.414
```

**휴리스틱**: ratio > 1.25 이고 대부분 페이지가 비슷한 ratio → 펼침면 가능성 ↑

---

#### 5.3 2차 검증: 페이지 일관성

펼침면 PDF는 보통 **모든 페이지 사이즈가 동일**:
- `std(widthMm)` / `std(heightMm)`가 매우 작아야 함
- **예외**: 표지/내지 혼합 PDF (표지는 단면, 내지는 펼침면)

---

#### 5.4 3차 보강: 중앙 거터 탐지 (선택적)

**Ghostscript + Sharp 활용**:
1. 페이지를 이미지로 렌더링 (150~200dpi)
2. 중앙 세로 띠 (폭의 1~2%) 픽셀 분석
3. 중앙 비어있음 → "거터 고려된 펼침면"
4. 중앙 가로지르는 요소 많음 → "스프레드 디자인" 또는 경고

**용도**: 감지보다는 **추가 경고**로 활용

---

#### 5.5 점수(Score) 기반 최종 판정

| 조건 | 점수 |
|------|------|
| (규격 기반) 폭이 단면×2에 맞음 | +60 |
| 높이가 단면 높이에 맞음 | +20 |
| ratio가 스프레드 후보 (>1.25) | +15 |
| 페이지 사이즈 일관성 높음 | +10 |
| 중앙 거터 신호 존재 | +5 |

**판정 기준**:
- `score ≥ 70` → 펼침면으로 판정
- 그 외 → 단면 또는 혼합으로 판정

---

#### 5.6 혼합 PDF 처리 (표지 단면 + 내지 펼침)

실무에서 흔한 케이스:
1. 모든 페이지 (widthMm, heightMm)로 **클러스터링**
2. 가장 큰 그룹을 "주 타입"으로 간주
3. 각 그룹별로 판별 로직 적용
4. 결과: `Group A = 단면`, `Group B = 펼침면`

---

#### 5.7 구현 방안

```typescript
interface SpreadDetectionResult {
  isSpread: boolean;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  detectedType: 'single' | 'spread' | 'mixed';
  pageGroups?: {
    type: 'single' | 'spread';
    pages: number[];
    widthMm: number;
    heightMm: number;
  }[];
  warnings: string[];
}

private detectSpreadFormat(
  pages: PDFPage[],
  expectedSingleWidthMm?: number,
  expectedHeightMm?: number,
  bleedMm: number = 3,
): SpreadDetectionResult {
  let score = 0;
  const warnings: string[] = [];
  const tolerance = bleedMm + 2; // 도련 + 기본 오차

  // 페이지별 크기 수집
  const pageSizes = pages.map((page, idx) => {
    const { width, height } = page.getSize();
    return {
      index: idx,
      widthMm: width * 0.352778,
      heightMm: height * 0.352778,
      ratio: width / height,
    };
  });

  // 1차: 규격 기반 판별
  if (expectedSingleWidthMm && expectedHeightMm) {
    const expectedSpreadWidth = expectedSingleWidthMm * 2;
    const matchingPages = pageSizes.filter(p =>
      Math.abs(p.widthMm - expectedSpreadWidth) <= tolerance &&
      Math.abs(p.heightMm - expectedHeightMm) <= tolerance
    );

    if (matchingPages.length === pageSizes.length) {
      score += 60; // 모든 페이지가 펼침면 규격
    } else if (matchingPages.length / pageSizes.length >= 0.9) {
      score += 50; // 90% 이상
    }

    // 높이 일치
    const heightMatch = pageSizes.filter(p =>
      Math.abs(p.heightMm - expectedHeightMm) <= tolerance
    );
    if (heightMatch.length === pageSizes.length) {
      score += 20;
    }
  }

  // 2차: 비율 기반 판별
  const avgRatio = pageSizes.reduce((sum, p) => sum + p.ratio, 0) / pageSizes.length;
  if (avgRatio > 1.25) {
    score += 15;
  }

  // 3차: 페이지 일관성
  const widths = pageSizes.map(p => p.widthMm);
  const widthStd = standardDeviation(widths);
  if (widthStd < 1) {
    score += 10; // 매우 일관적
  }

  // 판정
  const isSpread = score >= 70;
  const confidence = score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low';

  // 혼합 PDF 감지
  let detectedType: 'single' | 'spread' | 'mixed' = isSpread ? 'spread' : 'single';
  if (widthStd > 10) {
    detectedType = 'mixed';
    warnings.push('표지/내지 혼합 PDF로 감지되었습니다.');
  }

  return {
    isSpread,
    score,
    confidence,
    detectedType,
    warnings,
  };
}

function standardDeviation(arr: number[]): number {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / arr.length);
}
```

---

#### 5.8 리턴 예시

```json
{
  "isSpread": true,
  "score": 85,
  "confidence": "high",
  "detectedType": "spread",
  "pageGroups": [
    {
      "type": "spread",
      "pages": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      "widthMm": 432,
      "heightMm": 303
    }
  ],
  "warnings": []
}
```

**예상 소요**: 8-10시간

---

### 6. 후가공 파일 CMYK 감지

**현재 상태**: ❌ 미구현 (colorMode 필드만 존재, 항상 'RGB')

**구현 가능 여부**: ✅ 가능 (2단계 검증)

---

#### 6.1 2단계 검증 전략

| 단계 | 목적 | 방식 | 성능 |
|------|------|------|------|
| **1차** | 구조적 CMYK 존재 감지 | PDF 구조 분석 | 빠름 |
| **2차** | 실사용 CMYK 확정 | Ghostscript inkcov | 조건부 실행 |

**장점**: GS를 항상 돌리지 않고 **조건부로만** 실행 → 성능 최적화

---

#### 6.2 1차: 구조적 CMYK 존재 감지 (pdf-lib)

PDF 내부 구조에서 CMYK 관련 요소 탐색:
- DeviceCMYK ColorSpace
- CMYK ICC 프로파일
- CMYK 이미지 XObject

**pdf-lib 한계**: ColorSpace 직접 접근 불가
**대안**: PDF Raw 파싱 (Buffer 검색)

```typescript
interface CmykStructureResult {
  hasCmykSignature: boolean;
  suspectedCmyk: boolean;
  signatures: string[];
}

private detectCmykStructure(pdfBytes: Uint8Array): CmykStructureResult {
  const signatures: string[] = [];
  const pdfString = new TextDecoder('latin1').decode(pdfBytes);

  // DeviceCMYK 검색
  if (pdfString.includes('/DeviceCMYK')) {
    signatures.push('DeviceCMYK');
  }

  // CMYK ICC 프로파일 검색
  if (pdfString.includes('/ICCBased') && pdfString.includes('/N 4')) {
    signatures.push('CMYK_ICC_Profile');
  }

  // CMYK 이미지 검색 (XObject)
  const cmykImagePattern = /\/ColorSpace\s*\/DeviceCMYK/g;
  if (cmykImagePattern.test(pdfString)) {
    signatures.push('CMYK_Image');
  }

  // Separation (별색) 검색
  if (pdfString.includes('/Separation')) {
    signatures.push('Separation_SpotColor');
  }

  return {
    hasCmykSignature: signatures.length > 0,
    suspectedCmyk: signatures.length > 0,
    signatures,
  };
}
```

**결과**:
- `suspectedCmyk = true` → 2차 검증 진행
- `suspectedCmyk = false` → CMYK 없음 확정 (GS 생략)

---

#### 6.3 2차: 실사용 CMYK 확정 (Ghostscript inkcov)

1차에서 CMYK 의심 시에만 실행:

```typescript
interface InkCoverageResult {
  pages: {
    page: number;
    cyan: number;
    magenta: number;
    yellow: number;
    black: number;
    hasCmykUsage: boolean;
  }[];
  totalCmykUsage: boolean;
  colorMode: 'CMYK' | 'RGB' | 'GRAY' | 'MIXED';
}

async function detectCmykUsage(inputPath: string): Promise<InkCoverageResult> {
  // Ghostscript inkcov 디바이스 사용
  const args = [
    '-q',
    '-dBATCH',
    '-dNOPAUSE',
    '-dSAFER',
    '-sDEVICE=inkcov',  // 잉크 커버리지 측정
    '-o', '-',          // stdout으로 출력
    inputPath,
  ];

  const output = await runGhostscript(args);
  return parseInkCoverage(output);
}

function parseInkCoverage(output: string): InkCoverageResult {
  // inkcov 출력 형식:
  // Page 1: 0.12345  0.23456  0.34567  0.45678  CMYK OK
  // (Cyan, Magenta, Yellow, Black 비율)

  const pages: InkCoverageResult['pages'] = [];
  const lines = output.trim().split('\n');

  for (const line of lines) {
    const match = line.match(/Page\s+(\d+):\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
    if (match) {
      const [, pageNum, c, m, y, k] = match;
      const cyan = parseFloat(c);
      const magenta = parseFloat(m);
      const yellow = parseFloat(y);
      const black = parseFloat(k);

      // CMYK 사용 여부: C, M, Y 중 하나라도 0.001 이상이면 컬러
      const hasCmykUsage = cyan > 0.001 || magenta > 0.001 || yellow > 0.001;

      pages.push({
        page: parseInt(pageNum),
        cyan,
        magenta,
        yellow,
        black,
        hasCmykUsage,
      });
    }
  }

  // 전체 판정
  const totalCmykUsage = pages.some(p => p.hasCmykUsage);
  const onlyBlack = pages.every(p => !p.hasCmykUsage && p.black > 0);

  let colorMode: 'CMYK' | 'RGB' | 'GRAY' | 'MIXED';
  if (totalCmykUsage) {
    colorMode = 'CMYK';
  } else if (onlyBlack) {
    colorMode = 'GRAY';
  } else {
    colorMode = 'RGB'; // 기본값 (inkcov가 RGB를 직접 감지하지 않음)
  }

  return {
    pages,
    totalCmykUsage,
    colorMode,
  };
}
```

---

#### 6.4 통합 검증 플로우

```typescript
interface ColorModeResult {
  colorMode: 'CMYK' | 'RGB' | 'GRAY' | 'MIXED' | 'UNKNOWN';
  confidence: 'high' | 'medium' | 'low';
  cmykStructure: CmykStructureResult;
  inkCoverage?: InkCoverageResult;
  warnings: string[];
}

async function detectColorMode(
  pdfBytes: Uint8Array,
  inputPath: string,
): Promise<ColorModeResult> {
  const warnings: string[] = [];

  // 1차: 구조적 CMYK 감지 (빠름)
  const cmykStructure = detectCmykStructure(pdfBytes);

  if (!cmykStructure.suspectedCmyk) {
    // CMYK 구조 없음 → RGB로 간주 (GS 생략)
    return {
      colorMode: 'RGB',
      confidence: 'medium',
      cmykStructure,
      warnings: ['CMYK 구조가 감지되지 않았습니다.'],
    };
  }

  // 2차: Ghostscript inkcov로 실사용 확정
  try {
    const inkCoverage = await detectCmykUsage(inputPath);

    return {
      colorMode: inkCoverage.colorMode,
      confidence: 'high',
      cmykStructure,
      inkCoverage,
      warnings: cmykStructure.signatures.includes('Separation_SpotColor')
        ? ['별색(Spot Color)이 포함되어 있을 수 있습니다.']
        : [],
    };
  } catch (error) {
    // GS 실패 시 1차 결과로 폴백
    warnings.push('Ghostscript 분석 실패, 구조 기반 추정');
    return {
      colorMode: 'CMYK', // 의심 → CMYK로 간주
      confidence: 'low',
      cmykStructure,
      warnings,
    };
  }
}
```

---

#### 6.5 성능 비교

| 시나리오 | 1차만 | 1차+2차 | 비고 |
|----------|-------|---------|------|
| RGB PDF (대부분) | ~10ms | - | GS 생략 |
| CMYK 의심 PDF | ~10ms | ~500ms | 조건부 GS |
| 별색 포함 PDF | ~10ms | ~500ms | 경고 추가 |

**예상 평균 처리 시간**: 대부분의 파일이 RGB이므로 **90% 이상 GS 생략**

---

#### 6.6 리턴 예시

**RGB PDF (GS 생략)**:
```json
{
  "colorMode": "RGB",
  "confidence": "medium",
  "cmykStructure": {
    "hasCmykSignature": false,
    "suspectedCmyk": false,
    "signatures": []
  },
  "warnings": ["CMYK 구조가 감지되지 않았습니다."]
}
```

**CMYK PDF (GS 실행)**:
```json
{
  "colorMode": "CMYK",
  "confidence": "high",
  "cmykStructure": {
    "hasCmykSignature": true,
    "suspectedCmyk": true,
    "signatures": ["DeviceCMYK", "CMYK_Image"]
  },
  "inkCoverage": {
    "pages": [
      { "page": 1, "cyan": 0.15, "magenta": 0.22, "yellow": 0.18, "black": 0.45, "hasCmykUsage": true }
    ],
    "totalCmykUsage": true,
    "colorMode": "CMYK"
  },
  "warnings": []
}
```

**수정 파일**:
- `apps/worker/src/services/pdf-validator.service.ts` (1차 검증)
- `apps/worker/src/utils/ghostscript.ts` (2차 inkcov)

**예상 소요**: 6-8시간

---

### 7. 용량 제한

**현재 상태**: ✅ 구현됨

**현재 코드** (`pdf-validator.service.ts:45-62`):
```typescript
const DEFAULT_MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const maxFileSize = options.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;
if (fileSize > maxFileSize) {
  errors.push({
    code: ErrorCode.FILE_TOO_LARGE,
    message: `파일 크기가 ${Math.round(maxFileSize / 1024 / 1024)}MB를 초과합니다.`,
    details: { expected: maxFileSize, actual: fileSize },
    autoFixable: false,
  });
}
```

**고객 답변**: "기본 100MB 제한이 있으며, 필요시 조정 가능합니다."

---

### 8. 투명도/오버프린트 감지

**현재 상태**: ❌ 미구현

**구현 가능 여부**: ⭐ 가능 (Ghostscript 필요, 난이도 높음)

**pdf-lib 한계**: ExtGState (그래픽 상태) 접근 불가

**구현 방안 (Ghostscript)**:
```typescript
export async function detectTransparencyAndOverprint(
  inputPath: string
): Promise<{
  hasTransparency: boolean;
  hasOverprint: boolean;
  pages: { page: number; transparency: boolean; overprint: boolean }[];
}> {
  const args = [
    '-q', '-dNODISPLAY', '-dBATCH',
    '-c', `
      (${inputPath}) (r) file runpdfbegin
      1 pdfpagecount {
        dup pdfgetpage /ExtGState get {
          /ca known { (TRANSPARENCY) == } if
          /CA known { (OPACITY) == } if
          /OP known { (OVERPRINT) == } if
        } forall pop
      } repeat quit
    `
  ];

  const output = await runGhostscript(args);
  return parseTransparencyOutput(output);
}
```

**예상 소요**: 12-16시간

---

## 구현 우선순위 권장

### 1단계: 즉시 구현 가능 (pdf-lib만으로)

| # | 기능 | 예상 소요 |
|---|------|----------|
| 2 | 가로형 페이지 감지 | 2시간 |
| 4 | 사철 펼침면 검증 (폭 2배, 페이지 수, 중앙부 경고) | 4-6시간 |
| 5 | 스프레드(펼침면) 감지 (점수 기반, 혼합 PDF 처리) | 8-10시간 |

**총 소요**: 14-18시간 (2일)

### 2단계: 2단계 검증 (pdf-lib + Ghostscript)

| # | 기능 | 예상 소요 |
|---|------|----------|
| 6 | CMYK 감지 (2단계: 구조→inkcov) | 6-8시간 |

**총 소요**: 6-8시간 (1일)

### 3단계: Ghostscript 전용 분석

| # | 기능 | 예상 소요 |
|---|------|----------|
| 1 | 별색 감지 | 12시간 |
| 8 | 투명도/오버프린트 | 14시간 |

**총 소요**: 26시간 (3-4일)

### 4단계: 장기 개선 (선택사항)

| 방안 | 설명 |
|------|------|
| Python 마이크로서비스 | PyPDF2 기반 전용 분석 서비스 |
| Poppler 통합 | C++ 기반 완전한 PDF 분석 |

---

## 고객 답변 제안

### 지원 가능 기능
1. **용량 제한**: 100MB (조정 가능)
2. **가로형 페이지 감지**: 구현 예정 (1주 내)
3. **스프레드(펼침면) 감지**: 구현 예정 (2주 내)
   - 점수 기반 자동 판정 (규격/비율/일관성)
   - 혼합 PDF 처리 (표지 단면 + 내지 펼침)
   - 432×303 20p 접수 시 자동 인식
4. **사철 펼침면 검증**: 구현 예정 (1주 내)
   - 페이지 폭이 단일 페이지의 2배인지 검증
   - 페이지 수가 짝수(4의 배수)인지 검증
   - 중앙부 객체 배치 여부 경고

### 개발 필요 기능
5. **CMYK 감지**: 개발 예정 (1주)
   - 1차: 구조적 CMYK 감지 (빠름, 대부분 파일에서 GS 생략)
   - 2차: Ghostscript inkcov로 실사용 CMYK 확정 (조건부)
6. **별색 감지**: 개발 예정 (2-3주)
7. **투명도/오버프린트**: 개발 예정 (3-4주)

### 제한적 지원
8. **펼침면 순서 (1/2-3/4-5 형식)**: 페이지 크기 기반 휴리스틱 추론만 가능 (100% 정확도 불가)
9. **중앙부 객체 연결 품질**: 자동 경고는 가능하나, 실제 연결 품질은 인쇄소 QC에서 최종 확인 필요

---

## 운영 정책

### 1. 자동 검수의 한계와 책임 범위

> ⚠️ **면책 조항**: 자동 검수 시스템은 기술적 검증을 보조하는 도구입니다.

| 구분 | 설명 |
|------|------|
| **자동 검수 범위** | PDF 구조, 색상 모드, 페이지 규격, 제본 규칙 등 기술적 항목 |
| **자동 검수 한계** | 디자인 품질, 색상 정확도, 최종 인쇄물 품질 보장 불가 |
| **최종 책임** | 인쇄소 QC 및 고객 최종 확인 |

**고객 안내 문구 (예시)**:
```
본 검수 시스템은 기술적 규격 검증을 자동화한 것으로,
실제 인쇄 품질을 보장하지 않습니다.
최종 확인은 인쇄소 담당자가 진행합니다.
```

---

### 2. 경고(Warning) vs 오류(Error) 기준

| 항목 | 처리 | 사유 |
|------|------|------|
| 후가공 파일 + CMYK 사용 | ❌ **오류(차단)** | 실제 인쇄 사고 |
| 펼침면인데 단면 규격 | ❌ **오류** | 재단/접지 오류 |
| 사철 페이지 수 불일치 (4의 배수 아님) | ❌ **오류** | 제본 불가 |
| 파일 용량 초과 | ❌ **오류** | 시스템 제한 |
| 중앙부 객체 배치 | ⚠️ **경고** | 품질 이슈 가능성 |
| 혼합 PDF (표지+내지 다른 규격) | ⚠️ **경고** | 고객 확인 필요 |
| 가로형 페이지 | ⚠️ **경고** | 의도적일 수 있음 |
| CMYK 구조 감지 (GS 미확정) | ⚠️ **경고** | 추가 확인 필요 |

**원칙**:
- **오류**: 인쇄 사고로 이어질 수 있는 항목 → 접수 차단
- **경고**: 품질 이슈 가능성 → 고객 확인 후 진행 가능

---

### 3. 후가공 파일 색상 규칙

| 허용 여부 | 색상 모드 | 설명 |
|----------|----------|------|
| ✅ 허용 | Spot Color (별색) | 칼선, 박 등 후가공 전용 |
| ❌ 불허 | CMYK (C/M/Y 중 하나라도 사용) | 인쇄색과 혼동 위험 |
| ❌ 불허 | K (Black) 단독 | 칼선 오인 가능 |

**예외 처리**:
- 테스트용 내부 파일: 관리자 승인 필요
- 인쇄소 특별 요청: 관리자 승인 필요

---

### 4. Ghostscript 실패 시 폴백 정책

| 상황 | 처리 | 신뢰도 |
|------|------|--------|
| 1차 구조 감지: CMYK 없음 | → RGB로 확정 (GS 생략) | 중간 |
| 1차 구조 감지: CMYK 있음 + GS 성공 | → GS 결과로 확정 | 높음 |
| 1차 구조 감지: CMYK 있음 + GS 실패 | → ⚠️ 경고 + 고객 확인 요청 | 낮음 |
| 1차 구조 감지: CMYK 있음 + GS 타임아웃 | → ⚠️ 경고 + 구조 기반 추정 | 낮음 |

**GS 실패 시 오류로 처리하지 않는 이유**:
- 대부분의 파일이 RGB이므로 과도한 차단 방지
- 고객 확인 후 진행 가능하도록 유연성 확보

---

### 5. 성능/리소스 보호 정책

| 항목 | 기준 | 비고 |
|------|------|------|
| GS 실행 타임아웃 | 5초 | 초과 시 구조 기반 폴백 |
| GS 동시 실행 제한 | 워커당 2개 | Bull Queue concurrency 설정 |
| inkcov 페이지 제한 | 최대 50페이지 | 대형 PDF 보호 |
| 대형 파일 (>50MB) | GS 분석 선택적 | 구조 기반만 수행 가능 |

**구현 방안**:
```typescript
const GS_TIMEOUT = 5000; // 5초
const GS_MAX_PAGES = 50;
const GS_CONCURRENCY = 2;

// 대형 파일 처리
if (fileSizeMb > 50 || pageCount > GS_MAX_PAGES) {
  return structureBasedResultOnly();
}
```

---

### 6. 테스트 기준 PDF 세트

| 테스트 케이스 | 파일 설명 | 예상 결과 |
|--------------|----------|----------|
| RGB 단면 정상 | 일반 A4 단면 PDF | ✅ 통과 |
| CMYK 인쇄 파일 | DeviceCMYK 포함 | colorMode: CMYK |
| Spot Color 후가공 | Separation 컬러스페이스 | ✅ 통과 (후가공용) |
| CMYK + Spot 혼합 | 인쇄색 + 별색 혼합 | ⚠️ 경고 |
| 단면 + 펼침 혼합 | 표지 단면, 내지 펼침 | detectedType: mixed |
| 사철 규격 위반 | 13페이지 (4의 배수 아님) | ❌ 오류 |
| 펼침면 + 단면 규격 | 432×303 but 단면 주문 | ❌ 오류 |
| 대형 PDF (100MB+) | 고해상도 카탈로그 | 용량 오류 또는 GS 생략 |

**테스트 파일 저장 위치**: `apps/worker/test/fixtures/pdf/`

---

## 수정 파일 목록

| 파일 | 작업 내용 |
|------|----------|
| `apps/worker/src/services/pdf-validator.service.ts` | 검증 로직 추가 |
| `apps/worker/src/dto/validation-result.dto.ts` | 새 경고/에러 코드 추가 |
| `apps/worker/src/utils/ghostscript.ts` | 색상/투명도 감지 함수 추가 |
| `apps/worker/src/config/validation.config.ts` | 정책 상수 정의 (신규) |
| `apps/worker/test/fixtures/pdf/` | 테스트 PDF 파일 (신규) |
