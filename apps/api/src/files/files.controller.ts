import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { FilesService } from './files.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { FileResponseDto, FileListResponseDto } from './dto/file-response.dto';
import { FileType } from './entities/file.entity';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  /**
   * 파일 업로드
   */
  @Post('upload')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'PDF 파일 업로드' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'PDF 파일' },
        type: {
          type: 'string',
          enum: Object.values(FileType),
          description: '파일 타입',
        },
        orderSeqno: { type: 'number', description: '주문 번호 (선택)' },
        memberSeqno: { type: 'number', description: '회원 번호 (선택)' },
      },
      required: ['file', 'type'],
    },
  })
  @ApiResponse({
    status: 201,
    description: '파일 업로드 성공',
    type: FileResponseDto,
  })
  @ApiResponse({ status: 400, description: '잘못된 파일 형식 또는 크기 초과' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
      fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          cb(
            new BadRequestException({
              code: 'UNSUPPORTED_FORMAT',
              message: 'PDF 파일만 업로드할 수 있습니다.',
            }),
            false,
          );
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
    @CurrentUser() user: any,
  ): Promise<FileResponseDto> {
    if (!file) {
      throw new BadRequestException({
        code: 'FILE_REQUIRED',
        message: '파일을 선택해주세요.',
      });
    }

    // JWT에서 memberSeqno 추출 (dto에 없으면)
    const memberSeqno = dto.memberSeqno || (user?.userId ? parseInt(user.userId) : undefined);

    const fileEntity = await this.filesService.uploadFile(
      file,
      dto.type,
      dto.orderSeqno,
      memberSeqno,
      dto.metadata,
    );

    return this.filesService.toResponseDto(fileEntity);
  }

  /**
   * 파일 정보 조회
   */
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '파일 정보 조회' })
  @ApiResponse({ status: 200, description: '파일 정보', type: FileResponseDto })
  @ApiResponse({ status: 404, description: '파일을 찾을 수 없음' })
  async getFile(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FileResponseDto> {
    const file = await this.filesService.findById(id);
    return this.filesService.toResponseDto(file);
  }

  /**
   * 주문별 파일 목록 조회
   */
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: '파일 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '파일 목록',
    type: FileListResponseDto,
  })
  async getFiles(
    @Query('orderSeqno') orderSeqno?: string,
    @Query('memberSeqno') memberSeqno?: string,
  ): Promise<FileListResponseDto> {
    let files;

    if (orderSeqno) {
      files = await this.filesService.findByOrderSeqno(parseInt(orderSeqno));
    } else if (memberSeqno) {
      files = await this.filesService.findByMemberSeqno(parseInt(memberSeqno));
    } else {
      files = [];
    }

    return {
      files: files.map((f) => this.filesService.toResponseDto(f)),
      total: files.length,
    };
  }

  /**
   * 파일 다운로드
   */
  @Get(':id/download')
  @Public()
  @ApiOperation({ summary: '파일 다운로드' })
  @ApiResponse({ status: 200, description: 'PDF 파일' })
  @ApiResponse({ status: 404, description: '파일을 찾을 수 없음' })
  async downloadFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, file } = await this.filesService.getFileBuffer(id);

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(file.originalName)}"`,
    );
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  /**
   * PDF 썸네일 조회
   */
  @Get(':id/thumbnail')
  @Public()
  @ApiOperation({ summary: 'PDF 썸네일 조회' })
  @ApiResponse({ status: 200, description: 'PNG 이미지' })
  @ApiResponse({ status: 400, description: 'PDF 파일이 아니거나 썸네일 생성 실패' })
  @ApiResponse({ status: 404, description: '파일을 찾을 수 없음' })
  async getThumbnail(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page: string = '1',
    @Query('width') width: string = '200',
    @Res() res: Response,
  ): Promise<void> {
    const pageNum = parseInt(page, 10) || 1;
    const widthNum = parseInt(width, 10) || 200;

    // 유효성 검증
    if (pageNum < 1 || pageNum > 1000) {
      throw new BadRequestException({
        code: 'INVALID_PAGE',
        message: '페이지 번호는 1-1000 사이여야 합니다.',
      });
    }
    if (widthNum < 50 || widthNum > 1000) {
      throw new BadRequestException({
        code: 'INVALID_WIDTH',
        message: '너비는 50-1000 사이여야 합니다.',
      });
    }

    const buffer = await this.filesService.getThumbnailBuffer(id, pageNum, widthNum);

    // 캐싱 헤더 설정 (1시간)
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  /**
   * 파일 삭제
   */
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '파일 삭제' })
  @ApiResponse({ status: 200, description: '삭제 성공' })
  @ApiResponse({ status: 404, description: '파일을 찾을 수 없음' })
  async deleteFile(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean }> {
    await this.filesService.softDelete(id);
    return { success: true };
  }
}
