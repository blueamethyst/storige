import { Test, TestingModule } from '@nestjs/testing';
import { PdfValidatorService } from './pdf-validator.service';
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs/promises';
import axios from 'axios';
import { ValidationOptions, ErrorCode, WarningCode } from '../dto/validation-result.dto';

jest.mock('fs/promises');
jest.mock('axios');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PdfValidatorService', () => {
  let service: PdfValidatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfValidatorService],
    }).compile();

    service = module.get<PdfValidatorService>(PdfValidatorService);
    jest.clearAllMocks();
  });

  describe('validate', () => {
    const createMockPdf = async (pageCount: number, width: number, height: number) => {
      const pdfDoc = await PDFDocument.create();
      for (let i = 0; i < pageCount; i++) {
        // Convert mm to points (1mm = 2.83465 points)
        pdfDoc.addPage([width * 2.83465, height * 2.83465]);
      }
      return pdfDoc.save();
    };

    const defaultOptions: ValidationOptions = {
      fileType: 'content',
      orderOptions: {
        size: { width: 210, height: 297 },
        pages: 4,
        binding: 'perfect',
        bleed: 3,
      },
    };

    it('should validate a valid PDF successfully', async () => {
      const pdfBytes = await createMockPdf(4, 210, 297);
      mockedFs.readFile.mockResolvedValue(Buffer.from(pdfBytes));

      const result = await service.validate('./test.pdf', defaultOptions);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata.pageCount).toBe(4);
    });

    it('should return error for corrupted PDF', async () => {
      mockedFs.readFile.mockResolvedValue(Buffer.from('not a pdf'));

      const result = await service.validate('./corrupted.pdf', defaultOptions);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.FILE_CORRUPTED);
    });

    it('should return error when file is too large', async () => {
      const pdfBytes = await createMockPdf(1, 210, 297);
      mockedFs.readFile.mockResolvedValue(Buffer.from(pdfBytes));

      const optionsWithSmallLimit: ValidationOptions = {
        ...defaultOptions,
        maxFileSize: 100, // 100 bytes
      };

      const result = await service.validate('./large.pdf', optionsWithSmallLimit);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.FILE_TOO_LARGE);
    });

    it('should return error for invalid page count with perfect binding', async () => {
      const pdfBytes = await createMockPdf(3, 210, 297); // 3 pages, not multiple of 4
      mockedFs.readFile.mockResolvedValue(Buffer.from(pdfBytes));

      const options: ValidationOptions = {
        ...defaultOptions,
        orderOptions: {
          ...defaultOptions.orderOptions,
          pages: 3,
        },
      };

      const result = await service.validate('./test.pdf', options);

      expect(result.isValid).toBe(false);
      const pageCountError = result.errors.find(e => e.code === ErrorCode.PAGE_COUNT_INVALID);
      expect(pageCountError).toBeDefined();
      expect(pageCountError?.autoFixable).toBe(true);
      expect(pageCountError?.fixMethod).toBe('addBlankPages');
    });

    it('should return error for saddle binding exceeding 64 pages', async () => {
      const pdfBytes = await createMockPdf(68, 210, 297);
      mockedFs.readFile.mockResolvedValue(Buffer.from(pdfBytes));

      const options: ValidationOptions = {
        ...defaultOptions,
        orderOptions: {
          ...defaultOptions.orderOptions,
          binding: 'saddle',
          pages: 68,
        },
      };

      const result = await service.validate('./test.pdf', options);

      expect(result.isValid).toBe(false);
      const pageCountError = result.errors.find(e => e.code === ErrorCode.PAGE_COUNT_EXCEEDED);
      expect(pageCountError).toBeDefined();
    });

    it('should return warning for page count mismatch', async () => {
      const pdfBytes = await createMockPdf(4, 210, 297);
      mockedFs.readFile.mockResolvedValue(Buffer.from(pdfBytes));

      const options: ValidationOptions = {
        ...defaultOptions,
        orderOptions: {
          ...defaultOptions.orderOptions,
          pages: 8, // Expected 8 but PDF has 4
        },
      };

      const result = await service.validate('./test.pdf', options);

      const pageCountWarning = result.warnings.find(w => w.code === WarningCode.PAGE_COUNT_MISMATCH);
      expect(pageCountWarning).toBeDefined();
    });

    it('should return warning for missing bleed', async () => {
      const pdfBytes = await createMockPdf(4, 210, 297); // No bleed
      mockedFs.readFile.mockResolvedValue(Buffer.from(pdfBytes));

      const result = await service.validate('./test.pdf', defaultOptions);

      const bleedWarning = result.warnings.find(w => w.code === WarningCode.BLEED_MISSING);
      expect(bleedWarning).toBeDefined();
      expect(bleedWarning?.autoFixable).toBe(true);
    });

    it('should detect PDF with bleed', async () => {
      // 210 + 3*2 = 216, 297 + 3*2 = 303
      const pdfBytes = await createMockPdf(4, 216, 303);
      mockedFs.readFile.mockResolvedValue(Buffer.from(pdfBytes));

      const result = await service.validate('./test.pdf', defaultOptions);

      expect(result.metadata.hasBleed).toBe(true);
      const bleedWarning = result.warnings.find(w => w.code === WarningCode.BLEED_MISSING);
      expect(bleedWarning).toBeUndefined();
    });

    it('should return error for size mismatch', async () => {
      const pdfBytes = await createMockPdf(4, 100, 100); // Wrong size
      mockedFs.readFile.mockResolvedValue(Buffer.from(pdfBytes));

      const result = await service.validate('./test.pdf', defaultOptions);

      expect(result.isValid).toBe(false);
      const sizeError = result.errors.find(e => e.code === ErrorCode.SIZE_MISMATCH);
      expect(sizeError).toBeDefined();
    });

    it('should validate cover PDF page count', async () => {
      const pdfBytes = await createMockPdf(3, 210, 297); // Invalid cover page count
      mockedFs.readFile.mockResolvedValue(Buffer.from(pdfBytes));

      const options: ValidationOptions = {
        fileType: 'cover',
        orderOptions: {
          size: { width: 210, height: 297 },
          pages: 4,
          binding: 'perfect',
          bleed: 3,
        },
      };

      const result = await service.validate('./cover.pdf', options);

      expect(result.isValid).toBe(false);
      const pageCountError = result.errors.find(e => e.code === ErrorCode.PAGE_COUNT_INVALID);
      expect(pageCountError).toBeDefined();
    });

    it('should download file from URL', async () => {
      const pdfBytes = await createMockPdf(4, 210, 297);
      mockedAxios.get.mockResolvedValue({
        data: pdfBytes,
      });

      const result = await service.validate('https://example.com/test.pdf', defaultOptions);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://example.com/test.pdf',
        expect.objectContaining({
          responseType: 'arraybuffer',
          timeout: 60000,
        }),
      );
      expect(result.metadata.pageCount).toBe(4);
    });

    it('should handle storage/ path correctly', async () => {
      const originalEnv = process.env.WORKER_STORAGE_PATH;
      process.env.WORKER_STORAGE_PATH = '../api';

      const pdfBytes = await createMockPdf(4, 210, 297);
      mockedFs.readFile.mockResolvedValue(Buffer.from(pdfBytes));

      await service.validate('storage/uploads/test.pdf', defaultOptions);

      expect(mockedFs.readFile).toHaveBeenCalledWith('../api/storage/uploads/test.pdf');

      process.env.WORKER_STORAGE_PATH = originalEnv;
    });

    it('should use default storage path when WORKER_STORAGE_PATH not set', async () => {
      const originalEnv = process.env.WORKER_STORAGE_PATH;
      delete process.env.WORKER_STORAGE_PATH;

      const pdfBytes = await createMockPdf(4, 210, 297);
      mockedFs.readFile.mockResolvedValue(Buffer.from(pdfBytes));

      await service.validate('storage/uploads/test.pdf', defaultOptions);

      expect(mockedFs.readFile).toHaveBeenCalledWith('../api/storage/uploads/test.pdf');

      process.env.WORKER_STORAGE_PATH = originalEnv;
    });
  });
});
