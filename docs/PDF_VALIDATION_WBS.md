# PDF 검증 기능 확장 - WBS (Work Breakdown Structure)

> 작성일: 2025-12-22
> 관련 문서: [PDF_VALIDATION_REVIEW.md](./PDF_VALIDATION_REVIEW.md)

---

## 전체 구조 다이어그램

```
WBS 1.0 - 인프라/공통 준비 ━━━┓
                               ┣━━ WBS 2.0 - pdf-lib 기반 기능 ━━━┓
                               ┣━━ WBS 3.0 - CMYK 2단계 검증 ━━━━━╋━━ WBS 5.0 - 테스트 ━━━ WBS 6.0 - 배포
                               ┗━━ WBS 4.0 - GS 전용 분석 ━━━━━━━━┛
```

---

## 일정 요약

| Phase | 작업 | 소요 시간 | 일수 |
|-------|------|----------|------|
| WBS 1.0 | 인프라/공통 준비 | 7시간 | 1일 |
| WBS 2.0 | pdf-lib 기반 기능 | 14시간 | 2일 |
| WBS 3.0 | CMYK 2단계 검증 | 12시간 | 1.5일 |
| WBS 4.0 | GS 전용 분석 | 26시간 | 3.5일 |
| WBS 5.0 | 테스트 및 QA | 26시간 | 3일 |
| WBS 6.0 | 문서화 및 배포 | 10시간 | 1.5일 |
| **총합** | | **95시간** | **12.5일 (약 2.5주)** |

---

## WBS 1.0: 인프라/공통 준비

**총 소요: 7시간 (1일)**

### WBS 1.1: 설정 파일 생성
| 항목 | 내용 |
|------|------|
| 작업 | `validation.config.ts` 생성 |
| 파일 | `apps/worker/src/config/validation.config.ts` |
| 소요 | 1시간 |

**상세 구현:**
```typescript
// apps/worker/src/config/validation.config.ts
export const VALIDATION_CONFIG = {
  // Ghostscript 설정
  GS_TIMEOUT: 5000,           // 5초
  GS_MAX_PAGES: 50,           // inkcov 최대 페이지
  GS_CONCURRENCY: 2,          // 동시 실행 제한

  // 파일 크기 제한
  MAX_FILE_SIZE: 100 * 1024 * 1024,  // 100MB
  LARGE_FILE_THRESHOLD: 50 * 1024 * 1024, // 50MB (GS 선택적)

  // 스프레드 감지
  SPREAD_SCORE_THRESHOLD: 70,
  SIZE_TOLERANCE_MM: 2,       // 2mm 오차

  // 사철 제본
  SADDLE_STITCH_MAX_PAGES: 64,
};
```

---

### WBS 1.2: DTO 확장
| 항목 | 내용 |
|------|------|
| 작업 | 새 경고/에러 코드 추가 |
| 파일 | `apps/worker/src/dto/validation-result.dto.ts` |
| 소요 | 2시간 |

**상세 구현:**
```typescript
// 추가할 WarningCode
export enum WarningCode {
  // 기존 코드들...
  LANDSCAPE_PAGE = 'LANDSCAPE_PAGE',
  CENTER_OBJECT_CHECK = 'CENTER_OBJECT_CHECK',
  CMYK_STRUCTURE_DETECTED = 'CMYK_STRUCTURE_DETECTED',
  MIXED_PDF = 'MIXED_PDF',
  TRANSPARENCY_DETECTED = 'TRANSPARENCY_DETECTED',
  OVERPRINT_DETECTED = 'OVERPRINT_DETECTED',
}

// 추가할 ErrorCode
export enum ErrorCode {
  // 기존 코드들...
  SADDLE_STITCH_INVALID = 'SADDLE_STITCH_INVALID',
  POST_PROCESS_CMYK = 'POST_PROCESS_CMYK',
  SPREAD_SIZE_MISMATCH = 'SPREAD_SIZE_MISMATCH',
}

// 새 인터페이스
export interface SpreadDetectionResult {
  isSpread: boolean;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  detectedType: 'single' | 'spread' | 'mixed';
  pageGroups?: PageGroup[];
  warnings: string[];
}

export interface ColorModeResult {
  colorMode: 'CMYK' | 'RGB' | 'GRAY' | 'MIXED' | 'UNKNOWN';
  confidence: 'high' | 'medium' | 'low';
  cmykStructure: CmykStructureResult;
  inkCoverage?: InkCoverageResult;
  warnings: string[];
}
```

---

### WBS 1.3: 테스트 픽스처 디렉토리 구성
| 항목 | 내용 |
|------|------|
| 작업 | 테스트 PDF 파일 구조 생성 |
| 경로 | `apps/worker/test/fixtures/pdf/` |
| 소요 | 4시간 |

**디렉토리 구조:**
```
apps/worker/test/fixtures/pdf/
├── rgb/
│   ├── a4-single-page.pdf
│   └── a4-multi-page.pdf
├── cmyk/
│   ├── cmyk-print-file.pdf
│   └── cmyk-mixed-rgb.pdf
├── spot-color/
│   ├── spot-only.pdf
│   └── spot-with-cmyk.pdf
├── spread/
│   ├── spread-432x303.pdf
│   └── mixed-cover-content.pdf
├── saddle-stitch/
│   ├── valid-16-pages.pdf
│   └── invalid-13-pages.pdf
├── transparency/
│   ├── with-transparency.pdf
│   └── with-overprint.pdf
└── large/
    └── large-100mb.pdf
```

---

## WBS 2.0: pdf-lib 기반 기능

**총 소요: 14시간 (2일)**

### WBS 2.1: 가로형 페이지 감지
| 항목 | 내용 |
|------|------|
| 작업 | validatePageOrientation() 함수 구현 |
| 파일 | `apps/worker/src/services/pdf-validator.service.ts` |
| 소요 | 2시간 |

**서브태스크:**
- [ ] 2.1.1: validatePageOrientation() 함수 작성
- [ ] 2.1.2: 페이지 루프에서 호출 추가
- [ ] 2.1.3: 단위 테스트 작성

**상세 구현:**
```typescript
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
      details: {
        page: pageIndex + 1,
        width: widthMm,
        height: heightMm,
        orientation: 'landscape'
      },
      autoFixable: false,
    });
  }
}
```

---

### WBS 2.2: 사철 제본 검증
| 항목 | 내용 |
|------|------|
| 작업 | validateSaddleStitch() 함수 구현 |
| 파일 | `apps/worker/src/services/pdf-validator.service.ts` |
| 소요 | 2시간 |

**서브태스크:**
- [ ] 2.2.1: validateSaddleStitch() 함수 작성
- [ ] 2.2.2: 제본 타입 옵션 연동
- [ ] 2.2.3: 단위 테스트 작성

**상세 구현:**
```typescript
private validateSaddleStitch(
  pageCount: number,
  bindingType: string,
  errors: ValidationError[],
  warnings: ValidationWarning[],
): void {
  if (bindingType !== 'saddle_stitch') return;

  const { SADDLE_STITCH_MAX_PAGES } = VALIDATION_CONFIG;

  // 4의 배수 검증
  if (pageCount % 4 !== 0) {
    errors.push({
      code: ErrorCode.SADDLE_STITCH_INVALID,
      message: `사철 제본은 페이지 수가 4의 배수여야 합니다. (현재: ${pageCount}페이지)`,
      details: { pageCount, required: 'multiple of 4' },
      autoFixable: true,
      fixMethod: 'addBlankPages',
    });
  }

  // 최대 페이지 수 검증
  if (pageCount > SADDLE_STITCH_MAX_PAGES) {
    errors.push({
      code: ErrorCode.PAGE_COUNT_EXCEEDED,
      message: `사철 제본은 최대 ${SADDLE_STITCH_MAX_PAGES}페이지까지 가능합니다.`,
      details: { pageCount, maxAllowed: SADDLE_STITCH_MAX_PAGES },
      autoFixable: false,
    });
  }

  // 중앙부 경고
  warnings.push({
    code: WarningCode.CENTER_OBJECT_CHECK,
    message: '사철 제본 시 중앙부(접지 부분)에 중요 객체가 배치되어 있는지 확인해주세요.',
    autoFixable: false,
  });
}
```

---

### WBS 2.3: 스프레드(펼침면) 감지
| 항목 | 내용 |
|------|------|
| 작업 | detectSpreadFormat() 점수 기반 감지 |
| 파일 | `apps/worker/src/services/pdf-validator.service.ts` |
| 소요 | 10시간 |

**서브태스크:**
- [ ] 2.3.1: SpreadDetectionResult 인터페이스 정의
- [ ] 2.3.2: standardDeviation() 유틸 함수 구현
- [ ] 2.3.3: detectSpreadFormat() 메인 로직 구현
  - [ ] 2.3.3.1: 규격 기반 판별 (+60점)
  - [ ] 2.3.3.2: 높이 일치 검증 (+20점)
  - [ ] 2.3.3.3: 비율 기반 판별 (+15점)
  - [ ] 2.3.3.4: 페이지 일관성 검증 (+10점)
- [ ] 2.3.4: 페이지 클러스터링 (혼합 PDF)
- [ ] 2.3.5: 메타데이터에 스프레드 정보 추가
- [ ] 2.3.6: 단위 테스트 (정상/혼합/단면)

**상세 구현:**
```typescript
private detectSpreadFormat(
  pages: PDFPage[],
  expectedSingleWidthMm?: number,
  expectedHeightMm?: number,
  bleedMm: number = 3,
): SpreadDetectionResult {
  let score = 0;
  const warnings: string[] = [];
  const tolerance = bleedMm + VALIDATION_CONFIG.SIZE_TOLERANCE_MM;

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
      score += 60;
    } else if (matchingPages.length / pageSizes.length >= 0.9) {
      score += 50;
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
  const widthStd = this.standardDeviation(widths);
  if (widthStd < 1) {
    score += 10;
  }

  // 판정
  const isSpread = score >= VALIDATION_CONFIG.SPREAD_SCORE_THRESHOLD;
  const confidence = score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low';

  // 혼합 PDF 감지
  let detectedType: 'single' | 'spread' | 'mixed' = isSpread ? 'spread' : 'single';
  if (widthStd > 10) {
    detectedType = 'mixed';
    warnings.push('표지/내지 혼합 PDF로 감지되었습니다.');
  }

  return { isSpread, score, confidence, detectedType, warnings };
}

private standardDeviation(arr: number[]): number {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / arr.length);
}
```

---

## WBS 3.0: CMYK 2단계 검증

**총 소요: 12시간 (1.5일)**

### WBS 3.1: 1차 구조적 CMYK 감지
| 항목 | 내용 |
|------|------|
| 작업 | PDF Buffer에서 CMYK 시그니처 검색 |
| 파일 | `apps/worker/src/services/pdf-validator.service.ts` |
| 소요 | 3시간 |

**서브태스크:**
- [ ] 3.1.1: CmykStructureResult 인터페이스 정의
- [ ] 3.1.2: detectCmykStructure() 함수 구현
- [ ] 3.1.3: 단위 테스트 작성

**상세 구현:**
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

  // CMYK 이미지 검색
  const cmykImagePattern = /\/ColorSpace\s*\/DeviceCMYK/g;
  if (cmykImagePattern.test(pdfString)) {
    signatures.push('CMYK_Image');
  }

  // 별색 검색
  if (pdfString.includes('/Separation')) {
    signatures.push('Separation_SpotColor');
  }

  return {
    hasCmykSignature: signatures.length > 0,
    suspectedCmyk: signatures.some(s =>
      s === 'DeviceCMYK' || s === 'CMYK_ICC_Profile' || s === 'CMYK_Image'
    ),
    signatures,
  };
}
```

---

### WBS 3.2: 2차 Ghostscript inkcov 분석
| 항목 | 내용 |
|------|------|
| 작업 | GS inkcov 디바이스로 실제 잉크 사용량 분석 |
| 파일 | `apps/worker/src/utils/ghostscript.ts` |
| 소요 | 6시간 |

**서브태스크:**
- [ ] 3.2.1: runGhostscriptWithTimeout() 래퍼 추가
- [ ] 3.2.2: detectCmykUsage() 함수 구현
- [ ] 3.2.3: parseInkCoverage() 파서 구현
- [ ] 3.2.4: InkCoverageResult 인터페이스 정의
- [ ] 3.2.5: 단위/통합 테스트 작성

**상세 구현:**
```typescript
// apps/worker/src/utils/ghostscript.ts

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

export async function runGhostscriptWithTimeout(
  args: string[],
  timeoutMs: number = VALIDATION_CONFIG.GS_TIMEOUT,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error('Ghostscript timeout'));
    }, timeoutMs);

    const child = spawn('gs', args);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data; });
    child.stderr.on('data', (data) => { stderr += data; });

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve(stdout);
      else reject(new Error(`GS exited with code ${code}: ${stderr}`));
    });
  });
}

export async function detectCmykUsage(inputPath: string): Promise<InkCoverageResult> {
  const args = [
    '-q', '-dBATCH', '-dNOPAUSE', '-dSAFER',
    '-sDEVICE=inkcov',
    '-o', '-',
    inputPath,
  ];

  const output = await runGhostscriptWithTimeout(args);
  return parseInkCoverage(output);
}

function parseInkCoverage(output: string): InkCoverageResult {
  const pages: InkCoverageResult['pages'] = [];
  const lines = output.trim().split('\n');

  for (const line of lines) {
    const match = line.match(/(\d+\.\d+)\s+(\d+\.\d+)\s+(\d+\.\d+)\s+(\d+\.\d+)/);
    if (match) {
      const [, c, m, y, k] = match;
      const cyan = parseFloat(c);
      const magenta = parseFloat(m);
      const yellow = parseFloat(y);
      const black = parseFloat(k);
      const hasCmykUsage = cyan > 0.001 || magenta > 0.001 || yellow > 0.001;

      pages.push({
        page: pages.length + 1,
        cyan, magenta, yellow, black,
        hasCmykUsage,
      });
    }
  }

  const totalCmykUsage = pages.some(p => p.hasCmykUsage);
  const onlyBlack = pages.every(p => !p.hasCmykUsage && p.black > 0);

  let colorMode: 'CMYK' | 'RGB' | 'GRAY' | 'MIXED';
  if (totalCmykUsage) colorMode = 'CMYK';
  else if (onlyBlack) colorMode = 'GRAY';
  else colorMode = 'RGB';

  return { pages, totalCmykUsage, colorMode };
}
```

---

### WBS 3.3: 통합 검증 플로우
| 항목 | 내용 |
|------|------|
| 작업 | 1차 → 조건부 2차 통합 함수 |
| 파일 | `apps/worker/src/services/pdf-validator.service.ts` |
| 소요 | 3시간 |

**서브태스크:**
- [ ] 3.3.1: detectColorMode() 통합 함수 구현
- [ ] 3.3.2: 후가공 파일 규칙 적용
- [ ] 3.3.3: 폴백 정책 구현
- [ ] 3.3.4: 통합 테스트 작성

**상세 구현:**
```typescript
async detectColorMode(
  pdfBytes: Uint8Array,
  inputPath: string,
  fileType: string,
): Promise<ColorModeResult> {
  const warnings: string[] = [];

  // 1차: 구조적 CMYK 감지
  const cmykStructure = this.detectCmykStructure(pdfBytes);

  if (!cmykStructure.suspectedCmyk) {
    return {
      colorMode: 'RGB',
      confidence: 'medium',
      cmykStructure,
      warnings: ['CMYK 구조가 감지되지 않았습니다.'],
    };
  }

  // 2차: Ghostscript inkcov
  try {
    const inkCoverage = await detectCmykUsage(inputPath);

    // 후가공 파일 + CMYK 사용 = 오류
    if (fileType === 'post_process' && inkCoverage.totalCmykUsage) {
      throw new ValidationError(
        ErrorCode.POST_PROCESS_CMYK,
        '후가공 파일에 CMYK 색상이 사용되었습니다. 별색(Spot Color)만 허용됩니다.',
      );
    }

    return {
      colorMode: inkCoverage.colorMode,
      confidence: 'high',
      cmykStructure,
      inkCoverage,
      warnings: cmykStructure.signatures.includes('Separation_SpotColor')
        ? ['별색(Spot Color)이 포함되어 있습니다.']
        : [],
    };
  } catch (error) {
    if (error instanceof ValidationError) throw error;

    // GS 실패 시 폴백
    warnings.push('Ghostscript 분석 실패, 구조 기반 추정');
    return {
      colorMode: 'CMYK',
      confidence: 'low',
      cmykStructure,
      warnings,
    };
  }
}
```

---

## WBS 4.0: Ghostscript 전용 분석

**총 소요: 26시간 (3-4일)**

### WBS 4.1: 별색(Spot Color) 감지
| 항목 | 내용 |
|------|------|
| 작업 | PostScript로 Separation/DeviceN 탐색 |
| 파일 | `apps/worker/src/utils/ghostscript.ts` |
| 소요 | 12시간 |

**서브태스크:**
- [ ] 4.1.1: PostScript 스크립트 작성 및 테스트
- [ ] 4.1.2: detectSpotColors() 함수 구현
- [ ] 4.1.3: 출력 파서 구현
- [ ] 4.1.4: 후가공 파일 검증 연동
- [ ] 4.1.5: 테스트 작성

**상세 구현:**
```typescript
interface SpotColorResult {
  hasSpotColors: boolean;
  spotColorNames: string[];
  pages: { page: number; colors: string[] }[];
}

export async function detectSpotColors(inputPath: string): Promise<SpotColorResult> {
  const psScript = `
    (${inputPath}) (r) file runpdfbegin
    1 pdfpagecount {
      dup pdfgetpage /Resources get
      dup /ColorSpace known {
        /ColorSpace get {
          dup type /arraytype eq {
            dup 0 get /Separation eq {
              1 get ==
            } if
          } if pop
        } forall
      } { pop } ifelse
    } repeat quit
  `;

  const args = ['-q', '-dNODISPLAY', '-dBATCH', '-c', psScript];
  const output = await runGhostscriptWithTimeout(args, 10000);
  return parseSpotColorOutput(output);
}
```

---

### WBS 4.2: 투명도/오버프린트 감지
| 항목 | 내용 |
|------|------|
| 작업 | ExtGState에서 투명도/오버프린트 탐색 |
| 파일 | `apps/worker/src/utils/ghostscript.ts` |
| 소요 | 14시간 |

**서브태스크:**
- [ ] 4.2.1: PostScript 스크립트 작성
- [ ] 4.2.2: detectTransparencyAndOverprint() 함수 구현
- [ ] 4.2.3: 출력 파서 구현
- [ ] 4.2.4: 경고 생성 로직
- [ ] 4.2.5: 테스트 작성

**상세 구현:**
```typescript
interface TransparencyResult {
  hasTransparency: boolean;
  hasOverprint: boolean;
  pages: { page: number; transparency: boolean; overprint: boolean }[];
}

export async function detectTransparencyAndOverprint(
  inputPath: string
): Promise<TransparencyResult> {
  const psScript = `
    (${inputPath}) (r) file runpdfbegin
    1 pdfpagecount {
      dup pdfgetpage /Resources get
      dup /ExtGState known {
        /ExtGState get {
          dup /ca known { (TRANSPARENCY) == } if
          dup /CA known { (OPACITY) == } if
          dup /OP known { (OVERPRINT) == } if
          pop
        } forall
      } { pop } ifelse
    } repeat quit
  `;

  const args = ['-q', '-dNODISPLAY', '-dBATCH', '-c', psScript];
  const output = await runGhostscriptWithTimeout(args);
  return parseTransparencyOutput(output);
}
```

---

## WBS 5.0: 테스트 및 QA

**총 소요: 26시간 (3일)**

### WBS 5.1: 테스트 PDF 파일 준비 (8시간)
- [ ] 5.1.1: RGB 단면 정상 PDF
- [ ] 5.1.2: CMYK 인쇄 파일
- [ ] 5.1.3: Spot Color 후가공 파일
- [ ] 5.1.4: CMYK + Spot 혼합 파일
- [ ] 5.1.5: 단면 + 펼침 혼합 PDF
- [ ] 5.1.6: 사철 규격 위반 파일
- [ ] 5.1.7: 펼침면 + 단면 규격 불일치
- [ ] 5.1.8: 대형 PDF (100MB+)

### WBS 5.2: 단위 테스트 작성 (8시간)
- [ ] 5.2.1: pdf-validator.service.spec.ts 확장
- [ ] 5.2.2: ghostscript.spec.ts 확장

### WBS 5.3: 통합 테스트 작성 (6시간)
- [ ] 5.3.1: 전체 검증 플로우 E2E
- [ ] 5.3.2: 폴백 시나리오 테스트
- [ ] 5.3.3: 대형 파일 성능 테스트

### WBS 5.4: QA 체크리스트 (4시간)
- [ ] 5.4.1: 기능별 수동 테스트
- [ ] 5.4.2: 운영 정책 적용 확인
- [ ] 5.4.3: 에러/경고 메시지 검토

---

## WBS 6.0: 문서화 및 배포

**총 소요: 10시간 (1.5일)**

### WBS 6.1: API 문서 업데이트 (2시간)
- [ ] 6.1.1: DTO 주석 추가
- [ ] 6.1.2: 에러/경고 코드 문서화
- [ ] 6.1.3: ValidationOptions 문서화

### WBS 6.2: 운영 가이드 작성 (3시간)
- [ ] 6.2.1: 면책 조항 문구 확정
- [ ] 6.2.2: 경고/오류 운영자 가이드
- [ ] 6.2.3: GS 리소스 모니터링 가이드

### WBS 6.3: 배포 준비 (2시간)
- [ ] 6.3.1: Docker 이미지 Ghostscript 확인
- [ ] 6.3.2: 환경변수 설정
- [ ] 6.3.3: Bull Queue concurrency 설정

### WBS 6.4: 단계별 배포 (3시간)
- [ ] 6.4.1: Phase 1 배포 (pdf-lib 기반)
- [ ] 6.4.2: 모니터링 및 피드백
- [ ] 6.4.3: Phase 2 배포 (CMYK 2단계)
- [ ] 6.4.4: Phase 3 배포 (별색, 투명도)

---

## 의존성 다이어그램

```
WBS 1.0 ─────┬──────────────────────────────────────┐
             │                                      │
             ▼                                      ▼
WBS 2.0 ─────┼───► WBS 5.1/5.2 (Phase 1 테스트)     │
             │                                      │
WBS 3.0 ─────┼───► WBS 5.2/5.3 (Phase 2 테스트) ───►│
             │                                      │
WBS 4.0 ─────┴───► WBS 5.2/5.3 (Phase 3 테스트) ───►│
                                                    │
                                                    ▼
                                              WBS 6.0 (배포)
```

---

## 병렬 작업 가능 영역

| 영역 | 병렬 가능 작업 | 비고 |
|------|--------------|------|
| 1 | WBS 2.1 ~ 2.3 | 서로 독립적, 병렬 개발 가능 |
| 2 | WBS 3.1 vs 4.1 | 1차 감지와 별색 감지 병렬 가능 |
| 3 | WBS 5.1 vs 5.2 | 테스트 파일 준비와 테스트 코드 작성 병렬 가능 |

---

## 수정 파일 목록

| 파일 | WBS | 작업 내용 |
|------|-----|----------|
| `apps/worker/src/config/validation.config.ts` | 1.1 | 정책 상수 정의 (신규) |
| `apps/worker/src/dto/validation-result.dto.ts` | 1.2 | 새 경고/에러 코드 추가 |
| `apps/worker/src/services/pdf-validator.service.ts` | 2.x, 3.x | 검증 로직 추가 |
| `apps/worker/src/utils/ghostscript.ts` | 3.2, 4.x | GS 분석 함수 추가 |
| `apps/worker/test/fixtures/pdf/` | 5.1 | 테스트 PDF 파일 (신규) |
| `apps/worker/test/*.spec.ts` | 5.2, 5.3 | 테스트 코드 확장 |
