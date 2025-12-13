import { IsString, IsNotEmpty, IsObject, IsEnum, IsOptional, IsUUID, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkerJobType } from '@storige/types';

export class CreateValidationJobDto {
  @ApiPropertyOptional({ example: 'uuid', description: '파일 ID (fileUrl 대신 사용 가능)' })
  @IsOptional()
  @IsUUID()
  fileId?: string;

  @ApiPropertyOptional({ example: 'https://example.com/file.pdf', description: '파일 URL (fileId 대신 사용 가능)' })
  @ValidateIf((o) => !o.fileId)
  @IsString()
  @IsNotEmpty()
  fileUrl?: string;

  @ApiProperty({ example: 'cover', enum: ['cover', 'content'] })
  @IsString()
  @IsNotEmpty()
  fileType: 'cover' | 'content';

  @ApiProperty({
    example: {
      size: { width: 210, height: 297 },
      pages: 4,
      binding: 'perfect',
      bleed: 3,
      paperThickness: 0.1,
    },
  })
  @IsObject()
  @IsNotEmpty()
  orderOptions: {
    size: { width: number; height: number };
    pages: number;
    binding: 'perfect' | 'saddle' | 'spring';
    bleed: number;
    paperThickness?: number;
  };
}

export class CreateConversionJobDto {
  @ApiPropertyOptional({ example: 'uuid', description: '파일 ID (fileUrl 대신 사용 가능)' })
  @IsOptional()
  @IsUUID()
  fileId?: string;

  @ApiPropertyOptional({ example: 'https://example.com/file.pdf', description: '파일 URL (fileId 대신 사용 가능)' })
  @ValidateIf((o) => !o.fileId)
  @IsString()
  @IsNotEmpty()
  fileUrl?: string;

  @ApiProperty({
    example: {
      addPages: true,
      applyBleed: true,
      targetPages: 4,
      bleed: 3,
    },
  })
  @IsObject()
  @IsNotEmpty()
  convertOptions: any;
}

export class CreateSynthesisJobDto {
  @ApiPropertyOptional({ example: 'uuid', description: '표지 파일 ID (coverUrl 대신 사용 가능)' })
  @IsOptional()
  @IsUUID()
  coverFileId?: string;

  @ApiPropertyOptional({ example: 'https://example.com/cover.pdf', description: '표지 URL (coverFileId 대신 사용 가능)' })
  @ValidateIf((o) => !o.coverFileId)
  @IsString()
  @IsNotEmpty()
  coverUrl?: string;

  @ApiPropertyOptional({ example: 'uuid', description: '내지 파일 ID (contentUrl 대신 사용 가능)' })
  @IsOptional()
  @IsUUID()
  contentFileId?: string;

  @ApiPropertyOptional({ example: 'https://example.com/content.pdf', description: '내지 URL (contentFileId 대신 사용 가능)' })
  @ValidateIf((o) => !o.contentFileId)
  @IsString()
  @IsNotEmpty()
  contentUrl?: string;

  @ApiProperty({ example: 3.5 })
  @IsNotEmpty()
  spineWidth: number;
}

export class UpdateJobStatusDto {
  @ApiPropertyOptional({ example: 'COMPLETED', enum: ['PENDING', 'PROCESSING', 'FIXABLE', 'COMPLETED', 'FAILED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'uuid', description: '출력 파일 ID' })
  @IsOptional()
  @IsUUID()
  outputFileId?: string;

  @ApiPropertyOptional({ example: 'https://example.com/output.pdf' })
  @IsOptional()
  @IsString()
  outputFileUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  result?: any;

  @ApiPropertyOptional({ example: 'Processing failed: Invalid PDF' })
  @IsOptional()
  @IsString()
  errorMessage?: string;
}
