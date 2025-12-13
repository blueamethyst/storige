import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs/promises';
import axios from 'axios';
import {
  ErrorCode,
  WarningCode,
  ValidationError,
  ValidationWarning,
  ValidationResultDto,
  ValidationOptions,
  PdfMetadata,
} from '../dto/validation-result.dto';

// 기본 설정
const DEFAULT_MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const DEFAULT_MAX_PAGES = 1000;
const DEFAULT_BLEED = 3; // mm

@Injectable()
export class PdfValidatorService {
  private readonly logger = new Logger(PdfValidatorService.name);

  /**
   * PDF 파일 검증
   */
  async validate(
    fileUrl: string,
    options: ValidationOptions,
  ): Promise<ValidationResultDto> {
    this.logger.log(`Validating PDF: ${fileUrl}`);

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const metadata: PdfMetadata = {
      pageCount: 0,
      pageSize: { width: 0, height: 0 },
      hasBleed: false,
      colorMode: 'RGB',
      resolution: 300,
    };

    try {
      // 1. 파일 다운로드 및 기본 검증
      const pdfBytes = await this.downloadFile(fileUrl);
      const fileSize = pdfBytes.length;

      // 2. 파일 크기 검증
      const maxFileSize = options.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;
      if (fileSize > maxFileSize) {
        errors.push({
          code: ErrorCode.FILE_TOO_LARGE,
          message: `파일 크기가 ${Math.round(maxFileSize / 1024 / 1024)}MB를 초과합니다.`,
          details: {
            expected: maxFileSize,
            actual: fileSize,
          },
          autoFixable: false,
        });
        // 파일이 너무 크면 추가 검증 불필요
        return { isValid: false, errors, warnings, metadata };
      }

      // 3. PDF 로드 및 무결성 검증
      let pdfDoc: PDFDocument;
      try {
        pdfDoc = await PDFDocument.load(pdfBytes);
      } catch (error) {
        errors.push({
          code: ErrorCode.FILE_CORRUPTED,
          message: '파일이 손상되었습니다. 다시 업로드해주세요.',
          details: {
            actual: error.message,
          },
          autoFixable: false,
        });
        return { isValid: false, errors, warnings, metadata };
      }

      // 4. 메타데이터 추출
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();

      // Points to mm 변환 (1 point = 0.352778 mm)
      const widthMm = width * 0.352778;
      const heightMm = height * 0.352778;

      metadata.pageCount = pages.length;
      metadata.pageSize = {
        width: Math.round(widthMm * 10) / 10,
        height: Math.round(heightMm * 10) / 10,
      };

      // 5. 페이지 수 검증
      this.validatePageCount(pages.length, options, errors, warnings);

      // 6. 페이지 크기 검증
      this.validatePageSize(widthMm, heightMm, options, errors, metadata);

      // 7. 재단 여백 검증
      this.validateBleed(widthMm, heightMm, options, warnings, metadata);

      // 8. 책등 크기 검증 (표지인 경우)
      if (options.fileType === 'cover') {
        this.validateSpine(widthMm, options, errors, metadata);
      }

      this.logger.log(
        `Validation complete: ${errors.length === 0 ? 'PASS' : 'FAIL'} (errors: ${errors.length}, warnings: ${warnings.length})`,
      );

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        metadata,
      };
    } catch (error) {
      this.logger.error(`Validation failed: ${error.message}`, error.stack);
      errors.push({
        code: ErrorCode.FILE_CORRUPTED,
        message: `파일 처리 중 오류가 발생했습니다: ${error.message}`,
        details: { actual: error.message },
        autoFixable: false,
      });
      return { isValid: false, errors, warnings, metadata };
    }
  }

  /**
   * 페이지 수 검증
   */
  private validatePageCount(
    actualPages: number,
    options: ValidationOptions,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
    const expectedPages = options.orderOptions.pages;

    // 최대 페이지 수 초과
    if (actualPages > maxPages) {
      errors.push({
        code: ErrorCode.PAGE_COUNT_EXCEEDED,
        message: `페이지 수가 최대 허용치(${maxPages}페이지)를 초과합니다.`,
        details: {
          expected: maxPages,
          actual: actualPages,
        },
        autoFixable: false,
      });
      return;
    }

    if (options.fileType === 'cover') {
      // 표지: 2페이지 (앞뒤) 또는 4페이지 (펼침면)
      if (actualPages !== 2 && actualPages !== 4 && actualPages !== 1) {
        errors.push({
          code: ErrorCode.PAGE_COUNT_INVALID,
          message: `표지 PDF는 1, 2 또는 4페이지여야 합니다. (현재: ${actualPages}페이지)`,
          details: {
            expected: [1, 2, 4],
            actual: actualPages,
          },
          autoFixable: false,
        });
      }
    } else if (options.fileType === 'content') {
      const binding = options.orderOptions.binding;

      // 무선제본: 4의 배수
      if (binding === 'perfect' && actualPages % 4 !== 0) {
        errors.push({
          code: ErrorCode.PAGE_COUNT_INVALID,
          message: `무선제본은 페이지 수가 4의 배수여야 합니다. (현재: ${actualPages}페이지)`,
          details: {
            expected: Math.ceil(actualPages / 4) * 4,
            actual: actualPages,
          },
          autoFixable: true,
          fixMethod: 'addBlankPages',
        });
      }

      // 중철제본: 4의 배수, 최대 64페이지
      if (binding === 'saddle') {
        if (actualPages % 4 !== 0) {
          errors.push({
            code: ErrorCode.PAGE_COUNT_INVALID,
            message: `중철제본은 페이지 수가 4의 배수여야 합니다. (현재: ${actualPages}페이지)`,
            details: {
              expected: Math.ceil(actualPages / 4) * 4,
              actual: actualPages,
            },
            autoFixable: true,
            fixMethod: 'addBlankPages',
          });
        }
        if (actualPages > 64) {
          errors.push({
            code: ErrorCode.PAGE_COUNT_EXCEEDED,
            message: `중철제본은 최대 64페이지까지 가능합니다. (현재: ${actualPages}페이지)`,
            details: {
              expected: 64,
              actual: actualPages,
            },
            autoFixable: false,
          });
        }
      }

      // 주문 페이지 수와 다른 경우 경고
      if (actualPages !== expectedPages) {
        warnings.push({
          code: WarningCode.PAGE_COUNT_MISMATCH,
          message: `주문한 페이지 수(${expectedPages}페이지)와 다릅니다. (현재: ${actualPages}페이지)`,
          details: {
            expected: expectedPages,
            actual: actualPages,
          },
          autoFixable: actualPages < expectedPages,
          fixMethod: actualPages < expectedPages ? 'addBlankPages' : undefined,
        });
      }
    }
  }

  /**
   * 페이지 크기 검증
   */
  private validatePageSize(
    widthMm: number,
    heightMm: number,
    options: ValidationOptions,
    errors: ValidationError[],
    metadata: PdfMetadata,
  ): void {
    const expectedWidth = options.orderOptions.size.width;
    const expectedHeight = options.orderOptions.size.height;
    const bleed = options.orderOptions.bleed ?? DEFAULT_BLEED;

    // 허용 오차 1mm
    const tolerance = 1;

    // 재단 여백 포함 크기
    const expectedWidthWithBleed = expectedWidth + bleed * 2;
    const expectedHeightWithBleed = expectedHeight + bleed * 2;

    // 크기 비교
    const widthDiff = Math.abs(widthMm - expectedWidth);
    const heightDiff = Math.abs(heightMm - expectedHeight);
    const widthDiffWithBleed = Math.abs(widthMm - expectedWidthWithBleed);
    const heightDiffWithBleed = Math.abs(heightMm - expectedHeightWithBleed);

    const matchesWithoutBleed = widthDiff <= tolerance && heightDiff <= tolerance;
    const matchesWithBleed =
      widthDiffWithBleed <= tolerance && heightDiffWithBleed <= tolerance;

    if (!matchesWithoutBleed && !matchesWithBleed) {
      errors.push({
        code: ErrorCode.SIZE_MISMATCH,
        message: `페이지 크기가 맞지 않습니다. (기대: ${expectedWidth}x${expectedHeight}mm 또는 ${expectedWidthWithBleed}x${expectedHeightWithBleed}mm, 현재: ${Math.round(widthMm)}x${Math.round(heightMm)}mm)`,
        details: {
          expected: {
            withoutBleed: { width: expectedWidth, height: expectedHeight },
            withBleed: { width: expectedWidthWithBleed, height: expectedHeightWithBleed },
          },
          actual: { width: Math.round(widthMm * 10) / 10, height: Math.round(heightMm * 10) / 10 },
        },
        autoFixable: true,
        fixMethod: 'resizeWithPadding',
      });
    } else if (matchesWithBleed) {
      metadata.hasBleed = true;
      metadata.bleedSize = bleed;
    }
  }

  /**
   * 재단 여백 검증
   */
  private validateBleed(
    widthMm: number,
    heightMm: number,
    options: ValidationOptions,
    warnings: ValidationWarning[],
    metadata: PdfMetadata,
  ): void {
    const expectedBleed = options.orderOptions.bleed ?? DEFAULT_BLEED;

    if (expectedBleed > 0 && !metadata.hasBleed) {
      warnings.push({
        code: WarningCode.BLEED_MISSING,
        message: `${expectedBleed}mm 재단 여백이 권장되지만 포함되어 있지 않습니다. 재단 시 테두리가 잘릴 수 있습니다.`,
        details: {
          expected: expectedBleed,
          actual: 0,
        },
        autoFixable: true,
        fixMethod: 'extendBleed',
      });
    }
  }

  /**
   * 책등 크기 검증 (표지용)
   */
  private validateSpine(
    widthMm: number,
    options: ValidationOptions,
    errors: ValidationError[],
    metadata: PdfMetadata,
  ): void {
    const { size, pages, paperThickness } = options.orderOptions;

    if (!paperThickness) {
      return; // 종이 두께 정보 없으면 검증 생략
    }

    // 예상 책등 크기 계산 (종이 두께 * 내지 페이지 수 / 2)
    const expectedSpine = Math.round(paperThickness * (pages / 2) * 10) / 10;
    metadata.spineSize = expectedSpine;

    // 표지 전체 너비 (앞표지 + 책등 + 뒤표지)
    const bleed = options.orderOptions.bleed ?? DEFAULT_BLEED;
    const expectedTotalWidth = size.width * 2 + expectedSpine + bleed * 2;

    // 허용 오차 2mm (책등은 좀 더 여유롭게)
    const tolerance = 2;

    if (Math.abs(widthMm - expectedTotalWidth) > tolerance) {
      errors.push({
        code: ErrorCode.SPINE_SIZE_MISMATCH,
        message: `표지 크기가 책등 크기와 맞지 않습니다. (예상 전체 너비: ${Math.round(expectedTotalWidth)}mm, 현재: ${Math.round(widthMm)}mm)`,
        details: {
          expected: {
            totalWidth: Math.round(expectedTotalWidth),
            spine: expectedSpine,
          },
          actual: {
            totalWidth: Math.round(widthMm),
          },
        },
        autoFixable: true,
        fixMethod: 'adjustSpine',
      });
    }
  }

  /**
   * 파일 다운로드
   */
  private async downloadFile(url: string): Promise<Uint8Array> {
    // 로컬 파일 경로인 경우
    if (url.startsWith('/') || url.startsWith('./')) {
      const buffer = await fs.readFile(url);
      return new Uint8Array(buffer);
    }

    // URL에서 다운로드
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 60000, // 60초 타임아웃
    });

    return new Uint8Array(response.data);
  }
}
