import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  isGhostscriptAvailable,
  mergePdfs,
  pdfToImage,
} from '../utils/ghostscript';

export interface SynthesisOptions {
  /** 표지 PDF URL 또는 파일 경로 */
  coverUrl: string;
  /** 내지 PDF URL 또는 파일 경로 */
  contentUrl: string;
  /** 책등 너비 (mm) */
  spineWidth: number;
  /** 제본 유형 */
  bindingType?: 'perfect' | 'saddle' | 'hardcover';
  /** 미리보기 생성 여부 */
  generatePreview?: boolean;
}

export interface SynthesisResult {
  success: boolean;
  outputFileUrl: string;
  previewUrl?: string;
  totalPages: number;
  /** 책등 너비 (mm) */
  spineWidth: number;
  bindingType: string;
}

@Injectable()
export class PdfSynthesizerService {
  private readonly logger = new Logger(PdfSynthesizerService.name);
  private readonly storagePath =
    process.env.STORAGE_PATH || '/app/storage/temp';
  private gsAvailable: boolean | null = null;

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

    // Ghostscript 사용 가능 여부 확인
    if (this.gsAvailable === null) {
      this.gsAvailable = await isGhostscriptAvailable();
      this.logger.log(`Ghostscript available: ${this.gsAvailable}`);
    }

    try {
      // 임시 파일로 다운로드
      const tempCoverPath = path.join(
        this.storagePath,
        `cover_${uuidv4()}.pdf`,
      );
      const tempContentPath = path.join(
        this.storagePath,
        `content_${uuidv4()}.pdf`,
      );

      const coverBytes = await this.downloadFile(options.coverUrl);
      const contentBytes = await this.downloadFile(options.contentUrl);

      await fs.writeFile(tempCoverPath, coverBytes);
      await fs.writeFile(tempContentPath, contentBytes);

      let totalPages: number;
      const bindingType = options.bindingType || 'perfect';

      if (this.gsAvailable) {
        // Ghostscript를 사용한 PDF 병합
        totalPages = await this.synthesizeWithGhostscript(
          tempCoverPath,
          tempContentPath,
          outputPath,
          bindingType,
        );
      } else {
        // pdf-lib를 사용한 PDF 병합 (폴백)
        totalPages = await this.synthesizeWithPdfLib(
          tempCoverPath,
          tempContentPath,
          outputPath,
          bindingType,
        );
      }

      // 임시 파일 정리
      await this.safeDelete(tempCoverPath);
      await this.safeDelete(tempContentPath);

      // 미리보기 이미지 생성
      let previewUrl: string | undefined;
      if (options.generatePreview !== false) {
        previewUrl = await this.generatePreview(outputPath);
      }

      this.logger.log(
        `Synthesis complete: ${totalPages} pages saved to ${outputPath}`,
      );

      return {
        success: true,
        outputFileUrl: outputPath,
        previewUrl,
        totalPages,
        spineWidth: options.spineWidth,
        bindingType,
      };
    } catch (error) {
      this.logger.error(`Synthesis failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Ghostscript를 사용한 PDF 병합
   */
  private async synthesizeWithGhostscript(
    coverPath: string,
    contentPath: string,
    outputPath: string,
    bindingType: string,
  ): Promise<number> {
    // 표지, 내지 순서로 병합
    // perfect binding: 표지 전면 + 내지 전체 + 표지 후면
    // saddle stitch: 내지 페이지를 saddle stitch 순서로 재배열

    // pdf-lib로 표지 구조 분석
    const coverDoc = await PDFDocument.load(await fs.readFile(coverPath));
    const contentDoc = await PDFDocument.load(await fs.readFile(contentPath));

    const coverPageCount = coverDoc.getPageCount();
    const contentPageCount = contentDoc.getPageCount();

    // 임시 파일 경로들
    const tempFiles: string[] = [];

    try {
      // 표지 구조에 따라 병합 순서 결정
      if (bindingType === 'saddle') {
        // 중철 제본: 특별한 페이지 순서 필요
        // TODO: Implement saddle stitch page ordering
        this.logger.warn('Saddle stitch ordering not yet implemented');
        await mergePdfs([coverPath, contentPath], outputPath);
      } else {
        // Perfect binding 또는 hardcover
        if (coverPageCount >= 2) {
          // 표지가 2페이지 이상: 전면표지, 내지, 후면표지
          const frontCoverPath = path.join(
            this.storagePath,
            `front_${uuidv4()}.pdf`,
          );
          const backCoverPath = path.join(
            this.storagePath,
            `back_${uuidv4()}.pdf`,
          );

          // 표지를 전면/후면으로 분리
          await this.extractPages(coverPath, frontCoverPath, [0]);
          await this.extractPages(coverPath, backCoverPath, [
            coverPageCount - 1,
          ]);

          tempFiles.push(frontCoverPath, backCoverPath);

          // 병합: 전면표지 + 내지 + 후면표지
          await mergePdfs(
            [frontCoverPath, contentPath, backCoverPath],
            outputPath,
          );
        } else {
          // 표지가 1페이지: 그대로 병합
          await mergePdfs([coverPath, contentPath], outputPath);
        }
      }

      // 최종 페이지 수 확인
      const finalDoc = await PDFDocument.load(await fs.readFile(outputPath));
      return finalDoc.getPageCount();
    } finally {
      // 임시 파일 정리
      for (const tempFile of tempFiles) {
        await this.safeDelete(tempFile);
      }
    }
  }

  /**
   * pdf-lib를 사용한 PDF 병합 (폴백)
   */
  private async synthesizeWithPdfLib(
    coverPath: string,
    contentPath: string,
    outputPath: string,
    bindingType: string,
  ): Promise<number> {
    const coverDoc = await PDFDocument.load(await fs.readFile(coverPath));
    const contentDoc = await PDFDocument.load(await fs.readFile(contentPath));

    const mergedDoc = await PDFDocument.create();

    // 표지 페이지 복사
    const coverPages = await mergedDoc.copyPages(
      coverDoc,
      coverDoc.getPageIndices(),
    );

    // 내지 페이지 복사
    const contentPages = await mergedDoc.copyPages(
      contentDoc,
      contentDoc.getPageIndices(),
    );

    if (bindingType === 'perfect' || bindingType === 'hardcover') {
      // 전면 표지 추가
      if (coverPages.length > 0) {
        mergedDoc.addPage(coverPages[0]);
      }

      // 내지 추가
      for (const page of contentPages) {
        mergedDoc.addPage(page);
      }

      // 후면 표지 추가
      if (coverPages.length > 1) {
        mergedDoc.addPage(coverPages[coverPages.length - 1]);
      }
    } else {
      // 기타 제본: 표지 전체 + 내지 전체
      for (const page of coverPages) {
        mergedDoc.addPage(page);
      }
      for (const page of contentPages) {
        mergedDoc.addPage(page);
      }
    }

    const mergedPdfBytes = await mergedDoc.save();
    await fs.writeFile(outputPath, mergedPdfBytes);

    return mergedDoc.getPageCount();
  }

  /**
   * PDF에서 특정 페이지 추출
   */
  private async extractPages(
    inputPath: string,
    outputPath: string,
    pageIndices: number[],
  ): Promise<void> {
    const inputDoc = await PDFDocument.load(await fs.readFile(inputPath));
    const outputDoc = await PDFDocument.create();

    const pages = await outputDoc.copyPages(inputDoc, pageIndices);
    for (const page of pages) {
      outputDoc.addPage(page);
    }

    const outputBytes = await outputDoc.save();
    await fs.writeFile(outputPath, outputBytes);
  }

  /**
   * 미리보기 이미지 생성
   */
  private async generatePreview(pdfPath: string): Promise<string | undefined> {
    if (!this.gsAvailable) {
      this.logger.warn(
        'Preview generation skipped: Ghostscript not available',
      );
      return undefined;
    }

    try {
      const previewPath = pdfPath.replace('.pdf', '_preview.png');
      await pdfToImage(pdfPath, previewPath, {
        page: 1,
        resolution: 150,
        format: 'png',
      });
      return previewPath;
    } catch (error) {
      this.logger.warn(`Preview generation failed: ${error.message}`);
      return undefined;
    }
  }

  /**
   * Calculate spine width based on page count and paper thickness
   * @param pageCount 총 페이지 수
   * @param paperThickness 종이 두께 (mm, 기본값: 0.1mm for 80gsm paper)
   * @returns 책등 너비 (mm)
   */
  calculateSpineWidth(
    pageCount: number,
    paperThickness: number = 0.1,
  ): number {
    // 양면 인쇄이므로 2로 나눔
    return (pageCount / 2) * paperThickness;
  }

  /**
   * 종이 종류에 따른 두께 반환 (mm)
   */
  getPaperThickness(
    paperType: 'newsprint' | 'offset' | 'coated' | 'artpaper',
    gsm: number,
  ): number {
    // 종이 종류 및 평량(gsm)에 따른 대략적인 두께
    const thicknessFactors: Record<string, number> = {
      newsprint: 0.0012, // 60gsm 기준 약 0.072mm
      offset: 0.0013, // 80gsm 기준 약 0.104mm
      coated: 0.00095, // 100gsm 기준 약 0.095mm
      artpaper: 0.001, // 100gsm 기준 약 0.1mm
    };

    const factor = thicknessFactors[paperType] || 0.0012;
    return gsm * factor;
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
   * Safely delete a file
   */
  private async safeDelete(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      this.logger.debug(`Could not delete temp file: ${filePath}`);
    }
  }
}
