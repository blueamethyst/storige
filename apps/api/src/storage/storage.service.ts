import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface UploadedFile {
  id: string;
  originalName: string;
  filename: string;
  path: string;
  url: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class StorageService {
  private readonly storagePath: string;
  private readonly maxFileSize: number;
  private readonly allowedMimeTypes: string[];

  constructor(private configService: ConfigService) {
    this.storagePath = this.configService.get<string>('STORAGE_PATH', './storage');
    this.maxFileSize = this.configService.get<number>('STORAGE_MAX_FILE_SIZE', 52428800); // 50MB
    this.allowedMimeTypes = [
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      // PDFs
      'application/pdf',
      // Fonts
      'font/ttf',
      'font/otf',
      'font/woff',
      'font/woff2',
      'application/x-font-ttf',
      'application/x-font-otf',
      // JSON (for design data)
      'application/json',
    ];
  }

  async saveFile(
    file: Express.Multer.File,
    category: 'templates' | 'library' | 'uploads' | 'temp' | 'designs' = 'uploads',
  ): Promise<UploadedFile> {
    // Validate file
    this.validateFile(file);

    // Generate unique filename
    const fileId = uuidv4();
    const ext = path.extname(file.originalname);
    const filename = `${fileId}${ext}`;

    // Create category directory if it doesn't exist
    const categoryPath = path.join(this.storagePath, category);
    await this.ensureDirectory(categoryPath);

    // Save file
    const filePath = path.join(categoryPath, filename);
    await fs.writeFile(filePath, file.buffer);

    // Generate URL
    const url = `/storage/${category}/${filename}`;

    return {
      id: fileId,
      originalName: file.originalname,
      filename,
      path: filePath,
      url,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // File might not exist, ignore error
      console.error(`Failed to delete file: ${filePath}`, error);
    }
  }

  async deleteFileByUrl(url: string): Promise<void> {
    // Extract path from URL (e.g., /storage/uploads/file.jpg -> uploads/file.jpg)
    const relativePath = url.replace('/storage/', '');
    const filePath = path.join(this.storagePath, relativePath);
    await this.deleteFile(filePath);
  }

  async getFile(filePath: string): Promise<Buffer> {
    try {
      return await fs.readFile(filePath);
    } catch (error) {
      throw new BadRequestException('File not found');
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }
  }

  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  // Helper method to get full file path from URL
  getFilePathFromUrl(url: string): string {
    const relativePath = url.replace('/storage/', '');
    return path.join(this.storagePath, relativePath);
  }

  // Generate thumbnail for images (placeholder - requires image processing library)
  async generateThumbnail(filePath: string, width: number = 200): Promise<string> {
    // TODO: Implement thumbnail generation using Sharp
    // For now, return original file path
    return filePath;
  }
}
