import { IsString, IsNotEmpty, IsObject, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkerJobType } from '@storige/types';

export class CreateValidationJobDto {
  @ApiProperty({ example: 'https://example.com/file.pdf' })
  @IsString()
  @IsNotEmpty()
  fileUrl: string;

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
    },
  })
  @IsObject()
  @IsNotEmpty()
  orderOptions: any;
}

export class CreateConversionJobDto {
  @ApiProperty({ example: 'https://example.com/file.pdf' })
  @IsString()
  @IsNotEmpty()
  fileUrl: string;

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
  @ApiProperty({ example: 'https://example.com/cover.pdf' })
  @IsString()
  @IsNotEmpty()
  coverUrl: string;

  @ApiProperty({ example: 'https://example.com/content.pdf' })
  @IsString()
  @IsNotEmpty()
  contentUrl: string;

  @ApiProperty({ example: 3.5 })
  @IsNotEmpty()
  spineWidth: number;
}

export class UpdateJobStatusDto {
  @ApiPropertyOptional({ example: 'COMPLETED', enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] })
  @IsOptional()
  @IsString()
  status?: string;

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
