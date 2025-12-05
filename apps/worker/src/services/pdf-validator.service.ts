import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';

export interface ValidationOptions {
  fileType: 'cover' | 'content';
  orderOptions: {
    size: { width: number; height: number };
    pages: number;
    binding: 'perfect' | 'saddle';
    bleed: number;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  fileInfo: {
    pages: number;
    size: { width: number; height: number };
    hasBleed: boolean;
    colorMode: string;
    resolution: number;
  };
}

export interface ValidationError {
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  code: string;
  message: string;
}

@Injectable()
export class PdfValidatorService {
  private readonly logger = new Logger(PdfValidatorService.name);

  /**
   * Validate a PDF file
   */
  async validate(
    fileUrl: string,
    options: ValidationOptions,
  ): Promise<ValidationResult> {
    this.logger.log(`Validating PDF: ${fileUrl}`);

    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      fileInfo: {
        pages: 0,
        size: { width: 0, height: 0 },
        hasBleed: false,
        colorMode: 'RGB',
        resolution: 300,
      },
    };

    try {
      // Download PDF file
      const pdfBytes = await this.downloadFile(fileUrl);

      // Load PDF
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];

      // Get page dimensions (in points, 1 point = 1/72 inch)
      const { width, height } = firstPage.getSize();

      // Convert points to mm (1 point = 0.352778 mm)
      const widthMm = width * 0.352778;
      const heightMm = height * 0.352778;

      result.fileInfo.pages = pages.length;
      result.fileInfo.size = {
        width: Math.round(widthMm),
        height: Math.round(heightMm),
      };

      // Validate page count
      this.validatePageCount(pages.length, options, result);

      // Validate page size
      this.validatePageSize(widthMm, heightMm, options, result);

      // Validate bleed
      this.validateBleed(widthMm, heightMm, options, result);

      // Check if there are any errors
      result.valid = result.errors.length === 0;

      this.logger.log(`Validation complete: ${result.valid ? 'PASS' : 'FAIL'}`);

      return result;
    } catch (error) {
      this.logger.error(`Validation failed: ${error.message}`, error.stack);
      result.valid = false;
      result.errors.push({
        code: 'LOAD_ERROR',
        message: `Failed to load PDF: ${error.message}`,
        severity: 'error',
      });
      return result;
    }
  }

  /**
   * Validate page count
   */
  private validatePageCount(
    actualPages: number,
    options: ValidationOptions,
    result: ValidationResult,
  ): void {
    const expectedPages = options.orderOptions.pages;

    if (options.fileType === 'cover') {
      // Cover should be 2 pages (front + back) or 4 pages (with spine)
      if (actualPages !== 2 && actualPages !== 4) {
        result.errors.push({
          code: 'INVALID_PAGE_COUNT',
          message: `Cover PDF must have 2 or 4 pages, found ${actualPages}`,
          severity: 'error',
        });
      }
    } else if (options.fileType === 'content') {
      // Content pages must be multiple of 4 for perfect binding
      if (options.orderOptions.binding === 'perfect' && actualPages % 4 !== 0) {
        result.errors.push({
          code: 'INVALID_PAGE_COUNT',
          message: `Content pages must be multiple of 4 for perfect binding, found ${actualPages}`,
          severity: 'error',
        });
      }

      // Check if page count matches order
      if (actualPages !== expectedPages) {
        result.warnings.push({
          code: 'PAGE_COUNT_MISMATCH',
          message: `Expected ${expectedPages} pages, found ${actualPages}`,
        });
      }
    }
  }

  /**
   * Validate page size
   */
  private validatePageSize(
    widthMm: number,
    heightMm: number,
    options: ValidationOptions,
    result: ValidationResult,
  ): void {
    const expectedWidth = options.orderOptions.size.width;
    const expectedHeight = options.orderOptions.size.height;
    const bleed = options.orderOptions.bleed;

    // Allow tolerance of 1mm
    const tolerance = 1;

    // For files with bleed, size should be larger
    const expectedWidthWithBleed = expectedWidth + bleed * 2;
    const expectedHeightWithBleed = expectedHeight + bleed * 2;

    const widthDiff = Math.abs(widthMm - expectedWidth);
    const heightDiff = Math.abs(heightMm - expectedHeight);

    const widthDiffWithBleed = Math.abs(widthMm - expectedWidthWithBleed);
    const heightDiffWithBleed = Math.abs(heightMm - expectedHeightWithBleed);

    // Check if size matches (with or without bleed)
    const matchesWithoutBleed =
      widthDiff <= tolerance && heightDiff <= tolerance;
    const matchesWithBleed =
      widthDiffWithBleed <= tolerance && heightDiffWithBleed <= tolerance;

    if (!matchesWithoutBleed && !matchesWithBleed) {
      result.errors.push({
        code: 'INVALID_SIZE',
        message: `Page size mismatch. Expected ${expectedWidth}x${expectedHeight}mm (or ${expectedWidthWithBleed}x${expectedHeightWithBleed}mm with bleed), found ${Math.round(widthMm)}x${Math.round(heightMm)}mm`,
        severity: 'error',
      });
    } else if (matchesWithBleed) {
      result.fileInfo.hasBleed = true;
    }
  }

  /**
   * Validate bleed
   */
  private validateBleed(
    widthMm: number,
    heightMm: number,
    options: ValidationOptions,
    result: ValidationResult,
  ): void {
    const expectedBleed = options.orderOptions.bleed;

    if (expectedBleed > 0 && !result.fileInfo.hasBleed) {
      result.warnings.push({
        code: 'MISSING_BLEED',
        message: `Bleed of ${expectedBleed}mm is recommended but not found`,
      });
    }
  }

  /**
   * Download file from URL
   */
  private async downloadFile(url: string): Promise<Uint8Array> {
    // Check if it's a local file path
    if (url.startsWith('/') || url.startsWith('./')) {
      const buffer = await fs.readFile(url);
      return new Uint8Array(buffer);
    }

    // Download from URL
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
    });

    return new Uint8Array(response.data);
  }
}
