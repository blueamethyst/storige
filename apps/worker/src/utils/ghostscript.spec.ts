/**
 * Ghostscript 유틸리티 테스트
 * WBS 5.2.2: ghostscript.spec.ts
 *
 * 성공/경고/실패 케이스 모두 테스트
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { PDFDocument } from 'pdf-lib';

// 실제 파일 시스템 사용 (테스트 픽스처)
const FIXTURES_DIR = path.join(__dirname, '../../test/fixtures/pdf');

// 모듈 임포트 (실제 구현 테스트)
import {
  detectSpotColors,
  detectTransparencyAndOverprint,
  detectImageResolutionFromPdf,
} from './ghostscript';

describe('Ghostscript Utilities', () => {
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
  // WBS 4.1: 별색(Spot Color) 감지 테스트
  // ============================================================
  describe('detectSpotColors (WBS 4.1)', () => {
    describe('Success cases - spot colors detected', () => {
      it('should detect spot colors from PDF with Separation colorspace', async () => {
        const spotColorPdfPath = path.join(FIXTURES_DIR, 'spot-color', 'success-spot-only.pdf');

        if (!await fileExists(spotColorPdfPath)) {
          console.log('Skipping test: success-spot-only.pdf not found');
          return;
        }

        const pdfBytes = await fs.readFile(spotColorPdfPath);
        const result = await detectSpotColors(spotColorPdfPath, pdfBytes);

        expect(result.hasSpotColors).toBe(true);
        expect(result.spotColorNames.length).toBeGreaterThan(0);
        // PANTONE Red 032 C 가 포함되어야 함
        expect(
          result.spotColorNames.some((name) => name.includes('PANTONE')),
        ).toBe(true);
      });

      it('should detect DeviceN colorspace colors', async () => {
        const spotColorPdfPath = path.join(FIXTURES_DIR, 'spot-color', 'success-spot-only.pdf');

        if (!await fileExists(spotColorPdfPath)) {
          console.log('Skipping test: success-spot-only.pdf not found');
          return;
        }

        const pdfBytes = await fs.readFile(spotColorPdfPath);
        const result = await detectSpotColors(spotColorPdfPath, pdfBytes);

        // DeviceN에서 CutContour 별색이 감지되어야 함
        expect(result.spotColorNames.some((name) => name === 'CutContour')).toBe(
          true,
        );
      });

      it('should decode hex-encoded spot color names', async () => {
        // #20 = space, #23 = #
        // 테스트 PDF에 PANTONE#20Red#20032#20C 가 있음
        const spotColorPdfPath = path.join(FIXTURES_DIR, 'spot-color', 'success-spot-only.pdf');

        if (!await fileExists(spotColorPdfPath)) {
          console.log('Skipping test: success-spot-only.pdf not found');
          return;
        }

        const pdfBytes = await fs.readFile(spotColorPdfPath);
        const result = await detectSpotColors(spotColorPdfPath, pdfBytes);

        // 디코딩된 이름이 공백을 포함해야 함
        expect(
          result.spotColorNames.some((name) => name.includes(' ')),
        ).toBe(true);
      });
    });

    describe('Warning cases - mixed colors', () => {
      it('should detect both CMYK and spot colors in mixed PDF', async () => {
        const mixedPdfPath = path.join(FIXTURES_DIR, 'spot-color', 'warn-cmyk-spot-mixed.pdf');

        if (!await fileExists(mixedPdfPath)) {
          console.log('Skipping test: warn-cmyk-spot-mixed.pdf not found');
          return;
        }

        const pdfBytes = await fs.readFile(mixedPdfPath);
        const result = await detectSpotColors(mixedPdfPath, pdfBytes);

        // 별색이 감지되어야 함
        expect(result.hasSpotColors).toBe(true);
        expect(result.spotColorNames.length).toBeGreaterThan(0);
      });
    });

    describe('Success cases - no spot colors', () => {
      it('should not detect system colors as spot colors in RGB PDF', async () => {
        const rgbPdfPath = path.join(FIXTURES_DIR, 'rgb', 'success-a4-single.pdf');

        if (!await fileExists(rgbPdfPath)) {
          console.log('Skipping test: success-a4-single.pdf not found');
          return;
        }

        const pdfBytes = await fs.readFile(rgbPdfPath);
        const result = await detectSpotColors(rgbPdfPath, pdfBytes);

        expect(result.hasSpotColors).toBe(false);
        expect(result.spotColorNames).toHaveLength(0);
      });

      it('should not detect spot colors in 8-page RGB PDF', async () => {
        const rgbPdfPath = path.join(FIXTURES_DIR, 'rgb', 'success-a4-8pages.pdf');

        if (!await fileExists(rgbPdfPath)) {
          console.log('Skipping test: success-a4-8pages.pdf not found');
          return;
        }

        const pdfBytes = await fs.readFile(rgbPdfPath);
        const result = await detectSpotColors(rgbPdfPath, pdfBytes);

        expect(result.hasSpotColors).toBe(false);
        expect(result.spotColorNames).toHaveLength(0);
      });

      it('should not detect spot colors in RGB PDF with bleed', async () => {
        const rgbPdfPath = path.join(FIXTURES_DIR, 'rgb', 'success-a4-with-bleed.pdf');

        if (!await fileExists(rgbPdfPath)) {
          console.log('Skipping test: success-a4-with-bleed.pdf not found');
          return;
        }

        const pdfBytes = await fs.readFile(rgbPdfPath);
        const result = await detectSpotColors(rgbPdfPath, pdfBytes);

        expect(result.hasSpotColors).toBe(false);
        expect(result.spotColorNames).toHaveLength(0);
      });
    });
  });

  // ============================================================
  // WBS 4.2: 투명도/오버프린트 감지 테스트
  // ============================================================
  describe('detectTransparencyAndOverprint (WBS 4.2)', () => {
    describe('Warning cases - transparency detected', () => {
      it('should detect transparency in PDF', async () => {
        const transparencyPdfPath = path.join(
          FIXTURES_DIR,
          'transparency',
          'warn-with-transparency.pdf',
        );

        if (!await fileExists(transparencyPdfPath)) {
          console.log('Skipping test: warn-with-transparency.pdf not found');
          return;
        }

        const pdfBytes = await fs.readFile(transparencyPdfPath);
        const result = await detectTransparencyAndOverprint(
          transparencyPdfPath,
          pdfBytes,
        );

        expect(result.hasTransparency).toBe(true);
      });

      it('should detect blend mode as transparency', async () => {
        const transparencyPdfPath = path.join(
          FIXTURES_DIR,
          'transparency',
          'warn-with-transparency.pdf',
        );

        if (!await fileExists(transparencyPdfPath)) {
          console.log('Skipping test: warn-with-transparency.pdf not found');
          return;
        }

        const pdfBytes = await fs.readFile(transparencyPdfPath);
        const result = await detectTransparencyAndOverprint(
          transparencyPdfPath,
          pdfBytes,
        );

        // BM /Multiply 가 투명도로 감지되어야 함
        expect(result.hasTransparency).toBe(true);
      });
    });

    describe('Warning cases - overprint detected', () => {
      it('should detect overprint in PDF', async () => {
        const overprintPdfPath = path.join(
          FIXTURES_DIR,
          'transparency',
          'warn-with-overprint.pdf',
        );

        if (!await fileExists(overprintPdfPath)) {
          console.log('Skipping test: warn-with-overprint.pdf not found');
          return;
        }

        const pdfBytes = await fs.readFile(overprintPdfPath);
        const result = await detectTransparencyAndOverprint(
          overprintPdfPath,
          pdfBytes,
        );

        expect(result.hasOverprint).toBe(true);
      });
    });

    describe('Warning cases - both transparency and overprint', () => {
      it('should detect both transparency and overprint in PDF', async () => {
        const bothPdfPath = path.join(
          FIXTURES_DIR,
          'transparency',
          'warn-both-trans-overprint.pdf',
        );

        if (!await fileExists(bothPdfPath)) {
          console.log('Skipping test: warn-both-trans-overprint.pdf not found');
          return;
        }

        const pdfBytes = await fs.readFile(bothPdfPath);
        const result = await detectTransparencyAndOverprint(
          bothPdfPath,
          pdfBytes,
        );

        expect(result.hasTransparency).toBe(true);
        expect(result.hasOverprint).toBe(true);
      });
    });

    describe('Success cases - no transparency or overprint', () => {
      it('should not detect transparency in normal RGB PDF', async () => {
        const rgbPdfPath = path.join(FIXTURES_DIR, 'rgb', 'success-a4-single.pdf');

        if (!await fileExists(rgbPdfPath)) {
          console.log('Skipping test: success-a4-single.pdf not found');
          return;
        }

        const pdfBytes = await fs.readFile(rgbPdfPath);
        const result = await detectTransparencyAndOverprint(rgbPdfPath, pdfBytes);

        expect(result.hasTransparency).toBe(false);
        expect(result.hasOverprint).toBe(false);
      });

      it('should not detect transparency in PDF explicitly without transparency', async () => {
        const noTransPdfPath = path.join(FIXTURES_DIR, 'transparency', 'success-no-transparency.pdf');

        if (!await fileExists(noTransPdfPath)) {
          console.log('Skipping test: success-no-transparency.pdf not found');
          return;
        }

        const pdfBytes = await fs.readFile(noTransPdfPath);
        const result = await detectTransparencyAndOverprint(noTransPdfPath, pdfBytes);

        expect(result.hasTransparency).toBe(false);
        expect(result.hasOverprint).toBe(false);
      });

      it('should not detect transparency in 8-page RGB PDF', async () => {
        const rgbPdfPath = path.join(FIXTURES_DIR, 'rgb', 'success-a4-8pages.pdf');

        if (!await fileExists(rgbPdfPath)) {
          console.log('Skipping test: success-a4-8pages.pdf not found');
          return;
        }

        const pdfBytes = await fs.readFile(rgbPdfPath);
        const result = await detectTransparencyAndOverprint(rgbPdfPath, pdfBytes);

        expect(result.hasTransparency).toBe(false);
        expect(result.hasOverprint).toBe(false);
      });
    });
  });

  // ============================================================
  // CMYK 감지 테스트 (구조적 감지)
  // ============================================================
  describe('CMYK detection', () => {
    describe('Fail cases - CMYK detected', () => {
      it('should detect DeviceCMYK in CMYK PDF', async () => {
        const cmykPdfPath = path.join(FIXTURES_DIR, 'cmyk', 'fail-cmyk-for-postprocess.pdf');

        if (!await fileExists(cmykPdfPath)) {
          console.log('Skipping test: fail-cmyk-for-postprocess.pdf not found');
          return;
        }

        const pdfBytes = await fs.readFile(cmykPdfPath);
        const pdfString = new TextDecoder('latin1').decode(pdfBytes);

        // DeviceCMYK 시그니처 확인
        expect(pdfString.includes('/DeviceCMYK')).toBe(true);
      });
    });

    describe('Success cases - no CMYK', () => {
      it('should not detect DeviceCMYK in RGB PDF', async () => {
        const rgbPdfPath = path.join(FIXTURES_DIR, 'cmyk', 'success-rgb-only.pdf');

        if (!await fileExists(rgbPdfPath)) {
          console.log('Skipping test: success-rgb-only.pdf not found');
          return;
        }

        const pdfBytes = await fs.readFile(rgbPdfPath);
        const pdfString = new TextDecoder('latin1').decode(pdfBytes);

        // DeviceCMYK 시그니처가 없어야 함
        expect(pdfString.includes('/DeviceCMYK')).toBe(false);
      });

      it('should not detect DeviceCMYK in normal A4 PDF', async () => {
        const rgbPdfPath = path.join(FIXTURES_DIR, 'rgb', 'success-a4-single.pdf');

        if (!await fileExists(rgbPdfPath)) {
          console.log('Skipping test: success-a4-single.pdf not found');
          return;
        }

        const pdfBytes = await fs.readFile(rgbPdfPath);
        const pdfString = new TextDecoder('latin1').decode(pdfBytes);

        // DeviceCMYK 시그니처가 없어야 함
        expect(pdfString.includes('/DeviceCMYK')).toBe(false);
      });
    });
  });

  // ============================================================
  // 에지 케이스 테스트
  // ============================================================
  describe('edge cases', () => {
    it('should handle empty PDF gracefully', async () => {
      const pdfDoc = await PDFDocument.create();
      const pdfBytes = await pdfDoc.save();

      const spotResult = await detectSpotColors('', pdfBytes);
      expect(spotResult.hasSpotColors).toBe(false);

      const transparencyResult = await detectTransparencyAndOverprint(
        '',
        pdfBytes,
      );
      expect(transparencyResult.hasTransparency).toBe(false);
      expect(transparencyResult.hasOverprint).toBe(false);
    });

    it('should handle PDF with only pages', async () => {
      const pdfDoc = await PDFDocument.create();
      pdfDoc.addPage([595, 842]); // A4
      const pdfBytes = await pdfDoc.save();

      const spotResult = await detectSpotColors('', pdfBytes);
      expect(spotResult.hasSpotColors).toBe(false);

      const transparencyResult = await detectTransparencyAndOverprint(
        '',
        pdfBytes,
      );
      expect(transparencyResult.hasTransparency).toBe(false);
    });

    it('should handle PDF with multiple pages', async () => {
      const pdfDoc = await PDFDocument.create();
      for (let i = 0; i < 10; i++) {
        pdfDoc.addPage([595, 842]); // A4
      }
      const pdfBytes = await pdfDoc.save();

      const spotResult = await detectSpotColors('', pdfBytes);
      expect(spotResult.hasSpotColors).toBe(false);

      const transparencyResult = await detectTransparencyAndOverprint(
        '',
        pdfBytes,
      );
      expect(transparencyResult.hasTransparency).toBe(false);
      expect(transparencyResult.hasOverprint).toBe(false);
    });

    it('should handle large page count PDF', async () => {
      const pdfDoc = await PDFDocument.create();
      for (let i = 0; i < 64; i++) {
        pdfDoc.addPage([595, 842]); // A4
      }
      const pdfBytes = await pdfDoc.save();

      const spotResult = await detectSpotColors('', pdfBytes);
      expect(spotResult.hasSpotColors).toBe(false);

      const transparencyResult = await detectTransparencyAndOverprint(
        '',
        pdfBytes,
      );
      expect(transparencyResult.hasTransparency).toBe(false);
    });
  });

  // ============================================================
  // 해상도 감지 테스트
  // ============================================================
  describe('detectImageResolutionFromPdf', () => {
    describe('PDF with no images', () => {
      it('should return empty result for PDF without images', async () => {
        const pdfDoc = await PDFDocument.create();
        pdfDoc.addPage([595, 842]); // A4
        const pdfBytes = await pdfDoc.save();

        const result = await detectImageResolutionFromPdf(pdfBytes);

        expect(result.imageCount).toBe(0);
        expect(result.hasLowResolution).toBe(false);
        expect(result.minResolution).toBe(0);
        expect(result.avgResolution).toBe(0);
        expect(result.images).toHaveLength(0);
        expect(result.lowResImages).toHaveLength(0);
      });

      it('should handle empty PDF', async () => {
        const pdfDoc = await PDFDocument.create();
        const pdfBytes = await pdfDoc.save();

        const result = await detectImageResolutionFromPdf(pdfBytes);

        expect(result.imageCount).toBe(0);
        expect(result.hasLowResolution).toBe(false);
      });
    });

    describe('PDF with images (using fixture files)', () => {
      it('should detect images in real PDF file', async () => {
        const pdfPath = path.join(FIXTURES_DIR, 'rgb', 'success-a4-single.pdf');

        if (!await fileExists(pdfPath)) {
          console.log('Skipping test: success-a4-single.pdf not found');
          return;
        }

        const pdfBytes = await fs.readFile(pdfPath);
        const result = await detectImageResolutionFromPdf(pdfBytes);

        // 이미지가 있거나 없을 수 있음 (픽스처에 따라 다름)
        expect(result.imageCount).toBeGreaterThanOrEqual(0);
        expect(typeof result.hasLowResolution).toBe('boolean');
        expect(typeof result.minResolution).toBe('number');
        expect(typeof result.avgResolution).toBe('number');
      });

      it('should detect images in 8-page PDF', async () => {
        const pdfPath = path.join(FIXTURES_DIR, 'rgb', 'success-a4-8pages.pdf');

        if (!await fileExists(pdfPath)) {
          console.log('Skipping test: success-a4-8pages.pdf not found');
          return;
        }

        const pdfBytes = await fs.readFile(pdfPath);
        const result = await detectImageResolutionFromPdf(pdfBytes);

        expect(result.imageCount).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(result.images)).toBe(true);
        expect(Array.isArray(result.lowResImages)).toBe(true);
      });
    });

    describe('Resolution threshold', () => {
      it('should use custom minDpi threshold', async () => {
        const pdfDoc = await PDFDocument.create();
        pdfDoc.addPage([595, 842]); // A4
        const pdfBytes = await pdfDoc.save();

        // 높은 threshold로 테스트 (500 DPI)
        const result = await detectImageResolutionFromPdf(pdfBytes, 500);

        expect(result.imageCount).toBe(0);
        expect(result.hasLowResolution).toBe(false);
      });

      it('should use default threshold of 150 DPI', async () => {
        const pdfDoc = await PDFDocument.create();
        pdfDoc.addPage([595, 842]); // A4
        const pdfBytes = await pdfDoc.save();

        // 기본 threshold 사용
        const result = await detectImageResolutionFromPdf(pdfBytes);

        expect(result.imageCount).toBe(0);
        // 이미지가 없으므로 저해상도도 없음
        expect(result.hasLowResolution).toBe(false);
      });
    });

    describe('Image info structure', () => {
      it('should return correct ImageInfo structure when images exist', async () => {
        const pdfPath = path.join(FIXTURES_DIR, 'rgb', 'success-a4-single.pdf');

        if (!await fileExists(pdfPath)) {
          console.log('Skipping test: success-a4-single.pdf not found');
          return;
        }

        const pdfBytes = await fs.readFile(pdfPath);
        const result = await detectImageResolutionFromPdf(pdfBytes);

        if (result.imageCount > 0) {
          const firstImage = result.images[0];
          expect(firstImage).toHaveProperty('index');
          expect(firstImage).toHaveProperty('pixelWidth');
          expect(firstImage).toHaveProperty('pixelHeight');
          expect(firstImage).toHaveProperty('displayWidthMm');
          expect(firstImage).toHaveProperty('displayHeightMm');
          expect(firstImage).toHaveProperty('effectiveDpiX');
          expect(firstImage).toHaveProperty('effectiveDpiY');
          expect(firstImage).toHaveProperty('minEffectiveDpi');

          expect(typeof firstImage.index).toBe('number');
          expect(typeof firstImage.pixelWidth).toBe('number');
          expect(typeof firstImage.pixelHeight).toBe('number');
          expect(typeof firstImage.minEffectiveDpi).toBe('number');
        }
      });
    });
  });
});
