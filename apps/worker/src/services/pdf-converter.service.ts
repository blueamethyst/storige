import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, rgb, PDFPage } from 'pdf-lib';
import * as fs from 'fs/promises';
import axios from 'axios';

export interface ConversionOptions {
  addPages: boolean;
  applyBleed: boolean;
  targetPages: number;
  bleed: number;
}

export interface ConversionResult {
  success: boolean;
  outputFileUrl: string;
  pagesAdded: number;
  bleedApplied: boolean;
}

@Injectable()
export class PdfConverterService {
  private readonly logger = new Logger(PdfConverterService.name);
  private readonly storagePath =
    process.env.STORAGE_PATH || '/app/storage/temp';

  /**
   * Convert PDF (add pages, apply bleed)
   */
  async convert(
    fileUrl: string,
    options: ConversionOptions,
    outputPath: string,
  ): Promise<ConversionResult> {
    this.logger.log(`Converting PDF: ${fileUrl}`);

    try {
      // Download and load PDF
      const pdfBytes = await this.downloadFile(fileUrl);
      const pdfDoc = await PDFDocument.load(pdfBytes);

      let pagesAdded = 0;
      let bleedApplied = false;

      // Add pages if needed
      if (options.addPages) {
        pagesAdded = await this.addPages(pdfDoc, options.targetPages);
        this.logger.log(`Added ${pagesAdded} blank pages`);
      }

      // Apply bleed if needed
      if (options.applyBleed && options.bleed > 0) {
        await this.applyBleed(pdfDoc, options.bleed);
        bleedApplied = true;
        this.logger.log(`Applied ${options.bleed}mm bleed`);
      }

      // Save PDF
      const modifiedPdfBytes = await pdfDoc.save();
      await fs.writeFile(outputPath, modifiedPdfBytes);

      this.logger.log(`Conversion complete: ${outputPath}`);

      return {
        success: true,
        outputFileUrl: outputPath,
        pagesAdded,
        bleedApplied,
      };
    } catch (error) {
      this.logger.error(`Conversion failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Add blank pages to reach target count
   */
  private async addPages(
    pdfDoc: PDFDocument,
    targetPages: number,
  ): Promise<number> {
    const currentPages = pdfDoc.getPageCount();

    if (currentPages >= targetPages) {
      return 0;
    }

    const pagesToAdd = targetPages - currentPages;
    const firstPage = pdfDoc.getPage(0);
    const { width, height } = firstPage.getSize();

    for (let i = 0; i < pagesToAdd; i++) {
      const blankPage = pdfDoc.addPage([width, height]);

      // Fill with white background
      blankPage.drawRectangle({
        x: 0,
        y: 0,
        width,
        height,
        color: rgb(1, 1, 1),
      });
    }

    return pagesToAdd;
  }

  /**
   * Apply bleed to all pages
   */
  private async applyBleed(pdfDoc: PDFDocument, bleedMm: number): Promise<void> {
    // Convert mm to points (1mm = 2.83465 points)
    const bleedPoints = bleedMm * 2.83465;

    const pages = pdfDoc.getPages();

    for (const page of pages) {
      const { width, height } = page.getSize();

      // Create new page with bleed
      const newWidth = width + bleedPoints * 2;
      const newHeight = height + bleedPoints * 2;

      page.setSize(newWidth, newHeight);

      // Note: In a real implementation, you would need to:
      // 1. Extract the page content
      // 2. Move it to center (offset by bleed)
      // 3. Extend/repeat edge pixels for bleed area

      // This is a simplified version
      // For production, you'd use more sophisticated image processing
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

  /**
   * Center content on page
   */
  private async centerContent(
    page: PDFPage,
    offsetX: number,
    offsetY: number,
  ): Promise<void> {
    // This would require complex PDF manipulation
    // In production, use tools like Ghostscript or specialized libraries
    this.logger.warn('centerContent not fully implemented');
  }
}
