import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs/promises';
import axios from 'axios';

export interface SynthesisOptions {
  coverUrl: string;
  contentUrl: string;
  spineWidth: number;
}

export interface SynthesisResult {
  success: boolean;
  outputFileUrl: string;
  previewUrl: string;
  totalPages: number;
}

@Injectable()
export class PdfSynthesizerService {
  private readonly logger = new Logger(PdfSynthesizerService.name);
  private readonly storagePath =
    process.env.STORAGE_PATH || '/app/storage/temp';

  /**
   * Synthesize cover and content PDFs
   */
  async synthesize(
    options: SynthesisOptions,
    outputPath: string,
  ): Promise<SynthesisResult> {
    this.logger.log(
      `Synthesizing PDFs: cover=${options.coverUrl}, content=${options.contentUrl}`,
    );

    try {
      // Load cover and content PDFs
      const coverBytes = await this.downloadFile(options.coverUrl);
      const contentBytes = await this.downloadFile(options.contentUrl);

      const coverDoc = await PDFDocument.load(coverBytes);
      const contentDoc = await PDFDocument.load(contentBytes);

      // Create new PDF document
      const mergedDoc = await PDFDocument.create();

      // Copy cover pages (usually 2 or 4 pages)
      const coverPages = await mergedDoc.copyPages(
        coverDoc,
        coverDoc.getPageIndices(),
      );

      // Add front cover (first page)
      if (coverPages.length > 0) {
        mergedDoc.addPage(coverPages[0]);
      }

      // Copy all content pages
      const contentPages = await mergedDoc.copyPages(
        contentDoc,
        contentDoc.getPageIndices(),
      );

      for (const page of contentPages) {
        mergedDoc.addPage(page);
      }

      // Add back cover (second page of cover, or last page)
      if (coverPages.length > 1) {
        mergedDoc.addPage(coverPages[1]);
      }

      // Save merged PDF
      const mergedPdfBytes = await mergedDoc.save();
      await fs.writeFile(outputPath, mergedPdfBytes);

      const totalPages = mergedDoc.getPageCount();

      this.logger.log(
        `Synthesis complete: ${totalPages} pages saved to ${outputPath}`,
      );

      // TODO: Generate preview image
      const previewUrl = outputPath.replace('.pdf', '_preview.png');

      return {
        success: true,
        outputFileUrl: outputPath,
        previewUrl,
        totalPages,
      };
    } catch (error) {
      this.logger.error(`Synthesis failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Calculate spine width based on page count and paper thickness
   */
  calculateSpineWidth(
    pageCount: number,
    paperThickness: number = 0.1,
  ): number {
    // paperThickness in mm per sheet
    // For perfect binding, divide by 2 (both sides)
    return (pageCount / 2) * paperThickness;
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
   * Generate preview image from PDF
   * This requires external tools like pdftoppm or pdf2image
   */
  private async generatePreview(
    pdfPath: string,
    outputPath: string,
  ): Promise<void> {
    // In production, use:
    // - pdftoppm (from poppler-utils)
    // - ImageMagick
    // - or a Node library like pdf-to-img

    this.logger.warn('generatePreview not implemented');

    // Placeholder: just copy the PDF path
    // await fs.copyFile(pdfPath, outputPath);
  }
}
