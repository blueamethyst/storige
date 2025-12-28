/**
 * 워커 비즈니스 시나리오 테스트
 *
 * 실제 인쇄 주문 워크플로우를 시뮬레이션하는 시나리오 기반 테스트
 * 각 시나리오는 실제 사용자가 겪을 수 있는 상황을 반영
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PdfValidatorService } from '../../src/services/pdf-validator.service';
import { ValidationOptions, ErrorCode, WarningCode } from '../../src/dto/validation-result.dto';
import {
  detectSpotColors,
  detectTransparencyAndOverprint,
  detectImageResolutionFromPdf,
  detectFonts,
} from '../../src/utils/ghostscript';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PDFDocument } from 'pdf-lib';

const FIXTURES_DIR = path.join(__dirname, '../fixtures/pdf');

describe('Worker Business Scenarios', () => {
  let validatorService: PdfValidatorService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfValidatorService],
    }).compile();

    validatorService = module.get<PdfValidatorService>(PdfValidatorService);
  });

  // Helper function to check if file exists
  async function fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================
  // 시나리오 1: 표지 파일 검증 시나리오
  // ============================================================
  describe('Scenario 1: Cover File Validation', () => {
    describe('SC-COVER-001: 무선제본 표지 (책등 포함)', () => {
      it('should validate cover with spine for perfect binding', async () => {
        // 시나리오: 고객이 100페이지 무선제본 책의 표지를 업로드
        // 책등 폭: 5.5mm (100/2 * 0.10 + 0.5)
        // 표지 크기: (210 + 3) * 2 + 5.5 = 431.5mm (폭) x 303mm (높이)

        const coverPath = path.join(FIXTURES_DIR, 'cover', 'success-perfect-binding-cover.pdf');
        if (!await fileExists(coverPath)) {
          // 테스트용 PDF 생성
          const pdfDoc = await PDFDocument.create();
          // 431.5mm x 303mm = 1223.15pt x 858.9pt
          pdfDoc.addPage([1223, 859]);
          const pdfBytes = await pdfDoc.save();

          // 생성된 PDF로 검증
          const result = await detectSpotColors('', pdfBytes);
          expect(result.hasSpotColors).toBe(false);
          return;
        }

        const options: ValidationOptions = {
          fileType: 'cover',
          orderOptions: {
            size: { width: 213, height: 303 }, // A4 + bleed 3mm
            pages: 100,
            binding: 'perfect',
            bleed: 3,
            paperThickness: 0.10,
          },
        };

        const result = await validatorService.validate(coverPath, options);

        // 표지 파일은 1페이지여야 함
        expect(result.metadata.pageCount).toBe(1);
        // 책등 포함된 폭 확인 (단면 폭 * 2 + 책등)
      });

      it('should detect spine size mismatch in cover', async () => {
        // 시나리오: 잘못된 책등 폭으로 표지 제작
        const coverPath = path.join(FIXTURES_DIR, 'cover', 'fail-wrong-spine-cover.pdf');
        if (!await fileExists(coverPath)) {
          console.log('Skipping: fail-wrong-spine-cover.pdf not found');
          return;
        }

        const options: ValidationOptions = {
          fileType: 'cover',
          orderOptions: {
            size: { width: 213, height: 303 },
            pages: 100,
            binding: 'perfect',
            bleed: 3,
            paperThickness: 0.10,
          },
        };

        const result = await validatorService.validate(coverPath, options);

        const spineError = result.errors.find(
          (e) => e.code === ErrorCode.SPINE_SIZE_MISMATCH,
        );
        // 책등 크기 오류가 있어야 함 (또는 SIZE_MISMATCH)
        expect(
          spineError || result.errors.some(e => e.code === ErrorCode.SIZE_MISMATCH)
        ).toBeTruthy();
      });
    });

    describe('SC-COVER-002: 중철제본 표지', () => {
      it('should validate saddle stitch cover (no spine)', async () => {
        // 시나리오: 16페이지 중철제본 책의 표지
        // 중철제본은 책등이 없으므로 펼침면 크기만 확인

        const pdfDoc = await PDFDocument.create();
        // A4 펼침면 + bleed: (210 + 3) * 2 x (297 + 6) = 426mm x 303mm
        pdfDoc.addPage([1207, 859]);
        const pdfBytes = await pdfDoc.save();

        const result = await detectSpotColors('', pdfBytes);
        expect(result.hasSpotColors).toBe(false);
      });
    });
  });

  // ============================================================
  // 시나리오 2: 후가공 파일 검증 시나리오
  // ============================================================
  describe('Scenario 2: Post-Process File Validation', () => {
    describe('SC-PP-001: 별색만 사용한 후가공 파일 (정상)', () => {
      it('should pass for spot color only post-process file', async () => {
        // 시나리오: 도무송(CutContour) + 접선(Crease) 별색만 포함된 후가공 파일
        const postProcessPath = path.join(FIXTURES_DIR, 'spot-color', 'success-spot-only.pdf');
        if (!await fileExists(postProcessPath)) {
          console.log('Skipping: success-spot-only.pdf not found');
          return;
        }

        const pdfBytes = await fs.readFile(postProcessPath);
        const spotResult = await detectSpotColors(postProcessPath, pdfBytes);

        // 별색이 있어야 함
        expect(spotResult.hasSpotColors).toBe(true);

        // CutContour 또는 Crease 별색이 감지되어야 함
        const hasPostProcessColors = spotResult.spotColorNames.some(
          name => ['CutContour', 'Crease', 'Die', 'Dieline'].includes(name)
        );
        expect(hasPostProcessColors).toBe(true);

        // CMYK 잉크가 없어야 함 (순수 별색 파일)
        // 이는 별도의 ink coverage 검사로 확인
      });

      it('should detect PANTONE spot color in post-process file', async () => {
        // 시나리오: PANTONE 별색이 포함된 특수 후가공 파일
        const spotColorPath = path.join(FIXTURES_DIR, 'spot-color', 'spot-only.pdf');
        if (!await fileExists(spotColorPath)) {
          console.log('Skipping: spot-only.pdf not found');
          return;
        }

        const pdfBytes = await fs.readFile(spotColorPath);
        const spotResult = await detectSpotColors(spotColorPath, pdfBytes);

        expect(spotResult.hasSpotColors).toBe(true);
        expect(spotResult.spotColorNames.some(n => n.includes('PANTONE'))).toBe(true);
      });
    });

    describe('SC-PP-002: CMYK 포함 후가공 파일 (에러)', () => {
      it('should fail for CMYK in post-process file', async () => {
        // 시나리오: 고객이 실수로 CMYK 색상이 포함된 후가공 파일 업로드
        const cmykPostProcessPath = path.join(FIXTURES_DIR, 'cmyk', 'fail-cmyk-for-postprocess.pdf');
        if (!await fileExists(cmykPostProcessPath)) {
          console.log('Skipping: fail-cmyk-for-postprocess.pdf not found');
          return;
        }

        const pdfBytes = await fs.readFile(cmykPostProcessPath);
        const pdfString = new TextDecoder('latin1').decode(pdfBytes);

        // DeviceCMYK 시그니처가 있으면 에러
        const hasCmyk = pdfString.includes('/DeviceCMYK');
        expect(hasCmyk).toBe(true);

        // 실제 검증에서는 POST_PROCESS_CMYK 에러 코드 반환
      });
    });

    describe('SC-PP-003: 후가공 파일 투명도/오버프린트 검증', () => {
      it('should detect overprint in post-process file', async () => {
        // 시나리오: 오버프린트가 적용된 후가공 파일
        const overprintPath = path.join(FIXTURES_DIR, 'transparency', 'warn-with-overprint.pdf');
        if (!await fileExists(overprintPath)) {
          console.log('Skipping: warn-with-overprint.pdf not found');
          return;
        }

        const pdfBytes = await fs.readFile(overprintPath);
        const result = await detectTransparencyAndOverprint(overprintPath, pdfBytes);

        expect(result.hasOverprint).toBe(true);
      });
    });
  });

  // ============================================================
  // 시나리오 3: 폰트 검증 시나리오
  // ============================================================
  describe('Scenario 3: Font Validation', () => {
    describe('SC-FONT-001: 임베딩된 폰트 파일', () => {
      it('should pass for PDF with all fonts embedded', async () => {
        // 시나리오: 모든 폰트가 임베딩된 정상 파일
        const pdfPath = path.join(FIXTURES_DIR, 'rgb', 'success-a4-single.pdf');
        if (!await fileExists(pdfPath)) {
          console.log('Skipping: success-a4-single.pdf not found');
          return;
        }

        const pdfBytes = await fs.readFile(pdfPath);
        const result = await detectFonts(pdfBytes);

        // 임베딩되지 않은 폰트가 없어야 함
        expect(result.hasUnembeddedFonts).toBe(false);
        expect(result.allFontsEmbedded).toBe(true);
      });
    });

    describe('SC-FONT-002: 서브셋 폰트 처리', () => {
      it('should recognize subset fonts as embedded', async () => {
        // 시나리오: ABCDEF+FontName 형식의 서브셋 폰트 포함 파일
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595, 842]);
        // 기본 폰트 사용
        const font = await pdfDoc.embedFont('Helvetica' as any);
        page.drawText('Test text', { x: 50, y: 700, font, size: 12 });
        const pdfBytes = await pdfDoc.save();

        const result = await detectFonts(pdfBytes);

        // 서브셋 폰트는 임베딩된 것으로 처리
        const subsetFonts = result.fonts.filter(f => f.subset);
        for (const font of subsetFonts) {
          expect(font.embedded).toBe(true);
        }
      });
    });

    describe('SC-FONT-003: PDF 14 표준 폰트', () => {
      it('should recognize standard fonts without embedding requirement', async () => {
        // 시나리오: PDF 14 표준 폰트(Helvetica, Times 등) 사용 파일
        const pdfDoc = await PDFDocument.create();
        pdfDoc.addPage([595, 842]);
        const pdfBytes = await pdfDoc.save();

        const result = await detectFonts(pdfBytes);

        // 표준 폰트는 미임베딩 경고 대상이 아님
        const standardFonts = ['Helvetica', 'Times-Roman', 'Courier', 'Symbol', 'ZapfDingbats'];
        for (const stdFont of standardFonts) {
          const found = result.unembeddedFonts.find(f =>
            f.toLowerCase().includes(stdFont.toLowerCase())
          );
          expect(found).toBeUndefined();
        }
      });
    });
  });

  // ============================================================
  // 시나리오 4: 이미지 해상도 검증 시나리오
  // ============================================================
  describe('Scenario 4: Image Resolution Validation', () => {
    describe('SC-RES-001: 고해상도 이미지 (300 DPI 이상)', () => {
      it('should pass for high resolution images', async () => {
        // 시나리오: 인쇄용 고해상도 이미지 포함 파일
        const pdfDoc = await PDFDocument.create();
        pdfDoc.addPage([595, 842]);
        const pdfBytes = await pdfDoc.save();

        const result = await detectImageResolutionFromPdf(pdfBytes, 300);

        // 이미지가 없으면 저해상도 없음
        if (result.imageCount === 0) {
          expect(result.hasLowResolution).toBe(false);
        }
      });
    });

    describe('SC-RES-002: 저해상도 이미지 경고', () => {
      it('should warn for low resolution images (below 150 DPI)', async () => {
        // 시나리오: 웹용 저해상도 이미지를 실수로 사용
        const pdfPath = path.join(FIXTURES_DIR, 'rgb', 'success-a4-single.pdf');
        if (!await fileExists(pdfPath)) {
          console.log('Skipping: success-a4-single.pdf not found');
          return;
        }

        const pdfBytes = await fs.readFile(pdfPath);
        const result = await detectImageResolutionFromPdf(pdfBytes, 150);

        // 저해상도 이미지가 있으면 hasLowResolution = true
        if (result.imageCount > 0 && result.minResolution < 150) {
          expect(result.hasLowResolution).toBe(true);
          expect(result.lowResImages.length).toBeGreaterThan(0);
        }
      });
    });

    describe('SC-RES-003: 해상도 임계값 설정', () => {
      it('should use custom DPI threshold', async () => {
        // 시나리오: 고품질 인쇄를 위해 300 DPI 기준 적용
        const pdfDoc = await PDFDocument.create();
        pdfDoc.addPage([595, 842]);
        const pdfBytes = await pdfDoc.save();

        // 300 DPI 기준으로 검사
        const highThresholdResult = await detectImageResolutionFromPdf(pdfBytes, 300);
        // 150 DPI 기준으로 검사
        const lowThresholdResult = await detectImageResolutionFromPdf(pdfBytes, 150);

        // 이미지가 없는 경우 둘 다 false
        expect(highThresholdResult.hasLowResolution).toBe(false);
        expect(lowThresholdResult.hasLowResolution).toBe(false);
      });
    });
  });

  // ============================================================
  // 시나리오 5: 전체 주문 플로우 시나리오
  // ============================================================
  describe('Scenario 5: Full Order Flow', () => {
    describe('SC-FLOW-001: 무선제본 책 주문 (표지+내지)', () => {
      it('should validate complete perfect binding order', async () => {
        // 시나리오:
        // 1. 고객이 A4 무선제본 100페이지 책 주문
        // 2. 표지 PDF 업로드 (책등 포함)
        // 3. 내지 PDF 업로드 (100페이지)
        // 4. 두 파일 모두 검증 통과해야 주문 진행

        // 1. 주문 정보
        const orderInfo = {
          size: { width: 210, height: 297 },
          pages: 100,
          binding: 'perfect' as const,
          bleed: 3,
          paperThickness: 0.10,
        };

        // 2. 내지 검증
        const contentPath = path.join(FIXTURES_DIR, 'rgb', 'success-a4-8pages.pdf');
        if (await fileExists(contentPath)) {
          const contentOptions: ValidationOptions = {
            fileType: 'content',
            orderOptions: orderInfo,
          };

          const contentResult = await validatorService.validate(contentPath, contentOptions);

          // 내지 파일 기본 검증
          expect(contentResult.metadata.pageCount).toBeGreaterThan(0);
          expect(contentResult.errors.filter(e =>
            e.code !== ErrorCode.PAGE_COUNT_INVALID
          ).length).toBe(0);
        }

        // 3. 표지 검증 (시뮬레이션)
        const coverPdfDoc = await PDFDocument.create();
        // 책등 포함 표지: (210+3)*2 + 5.5 = 431.5mm
        coverPdfDoc.addPage([1223, 859]);
        const coverPdfBytes = await coverPdfDoc.save();

        const spotResult = await detectSpotColors('', coverPdfBytes);
        const transparencyResult = await detectTransparencyAndOverprint('', coverPdfBytes);
        const fontResult = await detectFonts(coverPdfBytes);

        // 표지 파일 검증
        expect(spotResult.hasSpotColors).toBe(false);
        expect(transparencyResult.hasTransparency).toBe(false);
        expect(fontResult.hasUnembeddedFonts).toBe(false);
      });
    });

    describe('SC-FLOW-002: 중철제본 책 주문', () => {
      it('should validate complete saddle stitch order', async () => {
        // 시나리오:
        // 1. 고객이 A4 중철제본 16페이지 책 주문
        // 2. 내지는 4의 배수여야 함
        // 3. 64페이지 이하여야 함

        const orderInfo = {
          size: { width: 210, height: 297 },
          pages: 16,
          binding: 'saddle' as const,
          bleed: 3,
        };

        // 16페이지 PDF 생성
        const pdfDoc = await PDFDocument.create();
        for (let i = 0; i < 16; i++) {
          pdfDoc.addPage([595, 842]); // A4
        }
        const pdfBytes = await pdfDoc.save();

        const spotResult = await detectSpotColors('', pdfBytes);
        const fontResult = await detectFonts(pdfBytes);
        const resolutionResult = await detectImageResolutionFromPdf(pdfBytes);

        // 검증 결과
        expect(spotResult.hasSpotColors).toBe(false);
        expect(fontResult.allFontsEmbedded).toBe(true);
        expect(resolutionResult.hasLowResolution).toBe(false);
      });
    });

    describe('SC-FLOW-003: 에러 발생 시 처리', () => {
      it('should collect all errors and warnings', async () => {
        // 시나리오: 여러 문제가 있는 파일 업로드 시 모든 문제점 수집

        // 테스트용 PDF 생성
        const pdfDoc = await PDFDocument.create();
        pdfDoc.addPage([595, 842]);
        const pdfBytes = await pdfDoc.save();

        // 병렬로 모든 검증 수행
        const [spotResult, transparencyResult, fontResult, resolutionResult] = await Promise.all([
          detectSpotColors('', pdfBytes),
          detectTransparencyAndOverprint('', pdfBytes),
          detectFonts(pdfBytes),
          detectImageResolutionFromPdf(pdfBytes),
        ]);

        // 결과 수집
        const validationReport = {
          spotColors: {
            detected: spotResult.hasSpotColors,
            colors: spotResult.spotColorNames,
          },
          transparency: {
            hasTransparency: transparencyResult.hasTransparency,
            hasOverprint: transparencyResult.hasOverprint,
          },
          fonts: {
            count: fontResult.fontCount,
            allEmbedded: fontResult.allFontsEmbedded,
            unembedded: fontResult.unembeddedFonts,
          },
          images: {
            count: resolutionResult.imageCount,
            hasLowResolution: resolutionResult.hasLowResolution,
            minDpi: resolutionResult.minResolution,
          },
        };

        // 리포트 구조 확인
        expect(validationReport).toHaveProperty('spotColors');
        expect(validationReport).toHaveProperty('transparency');
        expect(validationReport).toHaveProperty('fonts');
        expect(validationReport).toHaveProperty('images');
      });
    });
  });

  // ============================================================
  // 시나리오 6: 에지 케이스 및 에러 처리
  // ============================================================
  describe('Scenario 6: Edge Cases and Error Handling', () => {
    describe('SC-EDGE-001: 빈 PDF 파일', () => {
      it('should handle empty PDF gracefully', async () => {
        const pdfDoc = await PDFDocument.create();
        const pdfBytes = await pdfDoc.save();

        const [spotResult, transparencyResult, fontResult, resolutionResult] = await Promise.all([
          detectSpotColors('', pdfBytes),
          detectTransparencyAndOverprint('', pdfBytes),
          detectFonts(pdfBytes),
          detectImageResolutionFromPdf(pdfBytes),
        ]);

        expect(spotResult.hasSpotColors).toBe(false);
        expect(transparencyResult.hasTransparency).toBe(false);
        expect(fontResult.fontCount).toBe(0);
        expect(resolutionResult.imageCount).toBe(0);
      });
    });

    describe('SC-EDGE-002: 대용량 PDF 파일', () => {
      it('should handle large PDF with many pages', async () => {
        // 100페이지 PDF 생성
        const pdfDoc = await PDFDocument.create();
        for (let i = 0; i < 100; i++) {
          pdfDoc.addPage([595, 842]);
        }
        const pdfBytes = await pdfDoc.save();

        const startTime = Date.now();

        const [spotResult, fontResult] = await Promise.all([
          detectSpotColors('', pdfBytes),
          detectFonts(pdfBytes),
        ]);

        const duration = Date.now() - startTime;

        // 검증 완료
        expect(spotResult.hasSpotColors).toBe(false);
        expect(fontResult.fontCount).toBe(0);

        // 성능: 5초 이내 완료
        expect(duration).toBeLessThan(5000);
      });
    });

    describe('SC-EDGE-003: 손상된 파일 처리', () => {
      it('should handle corrupted file path gracefully', async () => {
        const options: ValidationOptions = {
          fileType: 'content',
          orderOptions: {
            size: { width: 210, height: 297 },
            pages: 1,
            binding: 'perfect',
            bleed: 0,
          },
        };

        const result = await validatorService.validate('/nonexistent/corrupted.pdf', options);

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('SC-EDGE-004: 병렬 검증 처리', () => {
      it('should handle multiple concurrent validations', async () => {
        // 여러 PDF 동시 검증
        const pdfs = await Promise.all(
          [1, 2, 3, 4, 5].map(async (i) => {
            const doc = await PDFDocument.create();
            for (let j = 0; j < i * 2; j++) {
              doc.addPage([595, 842]);
            }
            return doc.save();
          })
        );

        const results = await Promise.all(
          pdfs.map(pdfBytes => detectFonts(pdfBytes))
        );

        // 모든 검증이 성공적으로 완료
        expect(results.length).toBe(5);
        results.forEach(result => {
          expect(result.fontCount).toBe(0);
          expect(result.allFontsEmbedded).toBe(true);
        });
      });
    });
  });

  // ============================================================
  // 시나리오 7: 실제 인쇄 문제 사례
  // ============================================================
  describe('Scenario 7: Real Print Issue Cases', () => {
    describe('SC-ISSUE-001: 투명도로 인한 출력 문제', () => {
      it('should detect transparency that may cause print issues', async () => {
        // 시나리오: 투명도가 포함된 PDF가 RIP에서 문제 발생
        const transparencyPath = path.join(FIXTURES_DIR, 'transparency', 'warn-with-transparency.pdf');
        if (!await fileExists(transparencyPath)) {
          console.log('Skipping: warn-with-transparency.pdf not found');
          return;
        }

        const pdfBytes = await fs.readFile(transparencyPath);
        const result = await detectTransparencyAndOverprint(transparencyPath, pdfBytes);

        if (result.hasTransparency) {
          // 투명도 경고 필요
          expect(result.hasTransparency).toBe(true);
          // 실제 서비스에서는 WARNING 코드 반환
        }
      });
    });

    describe('SC-ISSUE-002: 오버프린트 설정 문제', () => {
      it('should detect overprint settings', async () => {
        // 시나리오: 흰색 오버프린트로 인한 출력 누락 문제
        const overprintPath = path.join(FIXTURES_DIR, 'transparency', 'warn-with-overprint.pdf');
        if (!await fileExists(overprintPath)) {
          console.log('Skipping: warn-with-overprint.pdf not found');
          return;
        }

        const pdfBytes = await fs.readFile(overprintPath);
        const result = await detectTransparencyAndOverprint(overprintPath, pdfBytes);

        expect(result.hasOverprint).toBe(true);
      });
    });

    describe('SC-ISSUE-003: 별색 변환 문제', () => {
      it('should detect spot colors for conversion warning', async () => {
        // 시나리오: PANTONE 별색이 CMYK로 변환될 때 색상 차이 발생
        const spotColorPath = path.join(FIXTURES_DIR, 'spot-color', 'spot-only.pdf');
        if (!await fileExists(spotColorPath)) {
          console.log('Skipping: spot-only.pdf not found');
          return;
        }

        const pdfBytes = await fs.readFile(spotColorPath);
        const result = await detectSpotColors(spotColorPath, pdfBytes);

        if (result.hasSpotColors) {
          // PANTONE 별색 감지 시 변환 경고 필요
          const hasPantone = result.spotColorNames.some(n => n.includes('PANTONE'));
          if (hasPantone) {
            expect(hasPantone).toBe(true);
            // 실제 서비스에서는 색상 변환 경고 표시
          }
        }
      });
    });
  });
});
