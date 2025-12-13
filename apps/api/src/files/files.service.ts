import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { FileEntity, FileType } from './entities/file.entity';
import { FileResponseDto } from './dto/file-response.dto';

const execAsync = promisify(exec);

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly uploadPath: string;
  private readonly thumbnailPath: string;
  private readonly maxFileSize: number;
  private readonly ghostscriptPath: string;

  constructor(
    @InjectRepository(FileEntity)
    private fileRepository: Repository<FileEntity>,
    private configService: ConfigService,
  ) {
    this.uploadPath = this.configService.get<string>(
      'UPLOAD_PATH',
      './storage/uploads',
    );
    this.thumbnailPath = this.configService.get<string>(
      'THUMBNAIL_PATH',
      './storage/thumbnails',
    );
    this.maxFileSize = this.configService.get<number>(
      'STORAGE_MAX_FILE_SIZE',
      100 * 1024 * 1024, // 100MB
    );
    this.ghostscriptPath = this.configService.get<string>(
      'GHOSTSCRIPT_PATH',
      'gs',
    );
  }

  /**
   * 파일 업로드
   */
  async uploadFile(
    file: Express.Multer.File,
    type: FileType,
    orderSeqno?: number,
    memberSeqno?: number,
    metadata?: Record<string, any>,
  ): Promise<FileEntity> {
    // 파일 크기 검증
    if (file.size > this.maxFileSize) {
      throw new BadRequestException({
        code: 'FILE_TOO_LARGE',
        message: `파일 크기가 ${Math.round(this.maxFileSize / 1024 / 1024)}MB를 초과합니다.`,
        details: { size: file.size, maxSize: this.maxFileSize },
      });
    }

    // MIME 타입 검증 (PDF만 허용)
    const allowedMimeTypes = ['application/pdf'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException({
        code: 'UNSUPPORTED_FORMAT',
        message: '지원하지 않는 파일 형식입니다. PDF 파일만 업로드해주세요.',
        details: { mimeType: file.mimetype, allowed: allowedMimeTypes },
      });
    }

    // 저장 디렉토리 생성
    await this.ensureDirectoryExists(this.uploadPath);

    // 파일명 생성 (timestamp_uuid.ext)
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    const fileName = `${timestamp}_${uuidv4()}${ext}`;
    const filePath = path.join(this.uploadPath, fileName);
    const fileUrl = `/storage/uploads/${fileName}`;

    // 파일 저장
    await fs.writeFile(filePath, file.buffer);

    // 엔티티 생성 및 저장
    const fileEntity = this.fileRepository.create({
      fileName,
      originalName: file.originalname,
      filePath,
      fileUrl,
      thumbnailUrl: null,
      fileSize: file.size,
      mimeType: file.mimetype,
      fileType: type,
      orderSeqno,
      memberSeqno,
      metadata,
    });

    return this.fileRepository.save(fileEntity);
  }

  /**
   * 파일 ID로 조회
   */
  async findById(id: string): Promise<FileEntity> {
    const file = await this.fileRepository.findOne({ where: { id } });

    if (!file) {
      throw new NotFoundException({
        code: 'FILE_NOT_FOUND',
        message: '파일을 찾을 수 없습니다.',
        details: { fileId: id },
      });
    }

    return file;
  }

  /**
   * 주문 번호로 파일 목록 조회
   */
  async findByOrderSeqno(orderSeqno: number): Promise<FileEntity[]> {
    return this.fileRepository.find({
      where: { orderSeqno },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 회원 번호로 파일 목록 조회
   */
  async findByMemberSeqno(memberSeqno: number): Promise<FileEntity[]> {
    return this.fileRepository.find({
      where: { memberSeqno },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 파일 삭제 (소프트 삭제)
   */
  async softDelete(id: string): Promise<void> {
    const file = await this.findById(id);
    await this.fileRepository.softDelete(file.id);
  }

  /**
   * 썸네일 URL 업데이트
   */
  async updateThumbnailUrl(id: string, thumbnailUrl: string): Promise<FileEntity> {
    const file = await this.findById(id);
    file.thumbnailUrl = thumbnailUrl;
    return this.fileRepository.save(file);
  }

  /**
   * 메타데이터 업데이트
   */
  async updateMetadata(
    id: string,
    metadata: Record<string, any>,
  ): Promise<FileEntity> {
    const file = await this.findById(id);
    file.metadata = { ...file.metadata, ...metadata };
    return this.fileRepository.save(file);
  }

  /**
   * 엔티티를 응답 DTO로 변환
   */
  toResponseDto(file: FileEntity): FileResponseDto {
    return {
      id: file.id,
      fileName: file.fileName,
      originalName: file.originalName,
      fileUrl: file.fileUrl,
      thumbnailUrl: file.thumbnailUrl,
      fileSize: Number(file.fileSize),
      mimeType: file.mimeType,
      fileType: file.fileType,
      orderSeqno: file.orderSeqno,
      memberSeqno: file.memberSeqno,
      metadata: file.metadata,
      createdAt: file.createdAt,
    };
  }

  /**
   * 파일 버퍼 읽기 (다운로드용)
   */
  async getFileBuffer(id: string): Promise<{ buffer: Buffer; file: FileEntity }> {
    const file = await this.findById(id);

    try {
      const buffer = await fs.readFile(file.filePath);
      return { buffer, file };
    } catch (error) {
      throw new NotFoundException({
        code: 'FILE_NOT_FOUND',
        message: '파일을 읽을 수 없습니다.',
        details: { fileId: id, path: file.filePath },
      });
    }
  }

  /**
   * 디렉토리 존재 확인 및 생성
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * PDF 썸네일 생성
   * Ghostscript를 사용하여 PDF의 특정 페이지를 PNG로 변환
   */
  async generateThumbnail(
    fileId: string,
    page: number = 1,
    width: number = 200,
  ): Promise<string> {
    const file = await this.findById(fileId);

    // PDF 파일만 썸네일 생성 가능
    if (file.mimeType !== 'application/pdf') {
      throw new BadRequestException({
        code: 'UNSUPPORTED_FORMAT',
        message: 'PDF 파일만 썸네일을 생성할 수 있습니다.',
        details: { mimeType: file.mimeType },
      });
    }

    // 썸네일 디렉토리 생성
    await this.ensureDirectoryExists(this.thumbnailPath);

    // 썸네일 파일명 생성
    const baseName = path.parse(file.fileName).name;
    const thumbnailFileName = `${baseName}_p${page}_w${width}.png`;
    const thumbnailFilePath = path.join(this.thumbnailPath, thumbnailFileName);
    const thumbnailUrl = `/storage/thumbnails/${thumbnailFileName}`;

    // 이미 생성된 썸네일이 있으면 반환
    try {
      await fs.access(thumbnailFilePath);
      this.logger.debug(`Thumbnail already exists: ${thumbnailFilePath}`);
      return thumbnailUrl;
    } catch {
      // 썸네일 없음, 새로 생성
    }

    // 임시 파일 경로 (Ghostscript 출력용)
    const tempFilePath = path.join(this.thumbnailPath, `${baseName}_p${page}_temp.png`);

    try {
      // Ghostscript를 사용해 PDF → PNG 변환
      const gsCommand = [
        this.ghostscriptPath,
        '-dSAFER',
        '-dBATCH',
        '-dNOPAUSE',
        '-sDEVICE=pngalpha',
        `-dFirstPage=${page}`,
        `-dLastPage=${page}`,
        '-r150', // 150 DPI
        '-dTextAlphaBits=4',
        '-dGraphicsAlphaBits=4',
        `-sOutputFile="${tempFilePath}"`,
        `"${file.filePath}"`,
      ].join(' ');

      this.logger.debug(`Executing Ghostscript: ${gsCommand}`);
      await execAsync(gsCommand);

      // Sharp로 리사이즈
      await sharp(tempFilePath)
        .resize(width, null, { withoutEnlargement: true })
        .png({ quality: 80 })
        .toFile(thumbnailFilePath);

      // 임시 파일 삭제
      try {
        await fs.unlink(tempFilePath);
      } catch {
        // 임시 파일 삭제 실패 무시
      }

      // 파일 엔티티에 첫 번째 썸네일 URL 저장 (page=1, default width인 경우)
      if (page === 1 && !file.thumbnailUrl) {
        file.thumbnailUrl = thumbnailUrl;
        await this.fileRepository.save(file);
      }

      this.logger.log(`Thumbnail generated: ${thumbnailFilePath}`);
      return thumbnailUrl;
    } catch (error) {
      this.logger.error(`Failed to generate thumbnail: ${error.message}`, error.stack);

      // 임시 파일 정리
      try {
        await fs.unlink(tempFilePath);
      } catch {
        // 무시
      }

      throw new BadRequestException({
        code: 'THUMBNAIL_GENERATION_FAILED',
        message: '썸네일 생성에 실패했습니다.',
        details: {
          fileId,
          page,
          error: error.message,
        },
      });
    }
  }

  /**
   * 썸네일 버퍼 읽기 (다운로드용)
   */
  async getThumbnailBuffer(
    fileId: string,
    page: number = 1,
    width: number = 200,
  ): Promise<Buffer> {
    const thumbnailUrl = await this.generateThumbnail(fileId, page, width);
    const thumbnailPath = path.join(
      this.thumbnailPath,
      path.basename(thumbnailUrl),
    );

    try {
      return await fs.readFile(thumbnailPath);
    } catch (error) {
      throw new NotFoundException({
        code: 'THUMBNAIL_NOT_FOUND',
        message: '썸네일 파일을 읽을 수 없습니다.',
        details: { fileId, path: thumbnailPath },
      });
    }
  }
}
