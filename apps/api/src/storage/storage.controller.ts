import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  Query,
  UseGuards,
  BadRequestException,
  StreamableFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { StorageService } from './storage.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '@storige/types';
import * as fs from 'fs';

@ApiTags('Storage')
@ApiBearerAuth()
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        category: {
          type: 'string',
          enum: ['templates', 'library', 'uploads', 'temp'],
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or file too large' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('category') category?: 'templates' | 'library' | 'uploads' | 'temp',
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return await this.storageService.saveFile(file, category || 'uploads');
  }

  @Get('files/:category/:filename')
  @ApiOperation({ summary: 'Get a file' })
  @ApiResponse({ status: 200, description: 'File retrieved successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFile(
    @Param('category') category: string,
    @Param('filename') filename: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const url = `/storage/${category}/${filename}`;
    const filePath = this.storageService.getFilePathFromUrl(url);

    const exists = await this.storageService.fileExists(filePath);
    if (!exists) {
      throw new BadRequestException('File not found');
    }

    const file = fs.createReadStream(filePath);

    // Set appropriate content type
    const ext = filename.split('.').pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      pdf: 'application/pdf',
      ttf: 'font/ttf',
      otf: 'font/otf',
      woff: 'font/woff',
      woff2: 'font/woff2',
    };

    if (ext && contentTypes[ext]) {
      res.set('Content-Type', contentTypes[ext]);
    }

    return new StreamableFile(file);
  }

  @Delete('files')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete a file by URL' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  async deleteFile(@Query('url') url: string) {
    if (!url) {
      throw new BadRequestException('URL is required');
    }

    await this.storageService.deleteFileByUrl(url);
    return { message: 'File deleted successfully' };
  }

  // ============================================================================
  // Designs Storage Endpoints
  // ============================================================================

  @Post('upload/designs')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a design file (JSON or image)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Design file uploaded successfully' })
  async uploadDesignFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const result = await this.storageService.saveFile(file, 'designs');
    return {
      success: true,
      data: result,
    };
  }

  @Get('designs/:filename')
  @ApiOperation({ summary: 'Get a design file' })
  @ApiResponse({ status: 200, description: 'Design file retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Design file not found' })
  async getDesignFile(
    @Param('filename') filename: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const url = `/storage/designs/${filename}`;
    const filePath = this.storageService.getFilePathFromUrl(url);

    const exists = await this.storageService.fileExists(filePath);
    if (!exists) {
      throw new BadRequestException('Design file not found');
    }

    const file = fs.createReadStream(filePath);

    // Set appropriate content type
    const ext = filename.split('.').pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      json: 'application/json',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      pdf: 'application/pdf',
    };

    if (ext && contentTypes[ext]) {
      res.set('Content-Type', contentTypes[ext]);
    }

    return new StreamableFile(file);
  }

  @Delete('designs/:filename')
  @ApiOperation({ summary: 'Delete a design file' })
  @ApiResponse({ status: 200, description: 'Design file deleted successfully' })
  async deleteDesignFile(@Param('filename') filename: string) {
    const url = `/storage/designs/${filename}`;
    await this.storageService.deleteFileByUrl(url);
    return {
      success: true,
      message: 'Design file deleted successfully',
    };
  }
}
