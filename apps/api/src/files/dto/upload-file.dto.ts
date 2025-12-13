import { IsEnum, IsOptional, IsNumber, IsString, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { FileType } from '../entities/file.entity';

export class UploadFileDto {
  @ApiProperty({
    description: '파일 타입',
    enum: FileType,
    example: FileType.COVER,
  })
  @IsEnum(FileType)
  type: FileType;

  @ApiPropertyOptional({
    description: 'bookmoa 주문 번호',
    example: 12345,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  orderSeqno?: number;

  @ApiPropertyOptional({
    description: 'bookmoa 회원 번호',
    example: 123,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  memberSeqno?: number;

  @ApiPropertyOptional({
    description: '파일 설명',
    example: '표지 파일',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: '추가 메타데이터',
    example: { pages: 100, binding: 'perfect' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
