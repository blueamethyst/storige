import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsObject,
  Min,
  Max,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GenerationStatus } from '../entities/ai-generation.entity';

/**
 * 생성 차원 DTO
 */
export class DimensionsDto {
  @ApiProperty({ description: '가로 크기 (mm)', example: 210 })
  @IsNumber()
  @Min(50)
  @Max(1000)
  width!: number;

  @ApiProperty({ description: '세로 크기 (mm)', example: 297 })
  @IsNumber()
  @Min(50)
  @Max(1000)
  height!: number;
}

/**
 * 생성 옵션 DTO
 */
export class GenerationOptionsDto {
  @ApiProperty({
    description: '템플릿셋 타입',
    enum: ['book', 'leaflet'],
    example: 'book',
  })
  @IsEnum(['book', 'leaflet'])
  templateType!: 'book' | 'leaflet';

  @ApiProperty({
    description: '페이지 수',
    minimum: 1,
    maximum: 100,
    example: 20,
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  pageCount!: number;

  @ApiProperty({
    description: '스타일',
    enum: ['minimal', 'modern', 'elegant', 'playful', 'professional'],
    example: 'minimal',
  })
  @IsEnum(['minimal', 'modern', 'elegant', 'playful', 'professional'])
  style!: 'minimal' | 'modern' | 'elegant' | 'playful' | 'professional';

  @ApiProperty({
    description: '색상 테마',
    example: 'blue',
  })
  @IsString()
  colorScheme!: string;

  @ApiProperty({
    description: '크기',
    type: DimensionsDto,
  })
  @ValidateNested()
  @Type(() => DimensionsDto)
  dimensions!: DimensionsDto;

  @ApiPropertyOptional({
    description: '이미지 포함 여부',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeImages?: boolean;

  @ApiPropertyOptional({
    description: '업종 카테고리',
    example: 'technology',
  })
  @IsOptional()
  @IsString()
  industryCategory?: string;
}

/**
 * 생성 요청 DTO
 */
export class GenerationRequestDto {
  @ApiProperty({
    description: '생성 프롬프트',
    example: 'IT 스타트업용 미니멀한 회사 소개서',
    minLength: 10,
    maxLength: 1000,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  prompt!: string;

  @ApiProperty({
    description: '생성 옵션',
    type: GenerationOptionsDto,
  })
  @ValidateNested()
  @Type(() => GenerationOptionsDto)
  options!: GenerationOptionsDto;
}

/**
 * 생성 상태 응답 DTO
 */
export class GenerationStatusDto {
  @ApiProperty({ description: '생성 작업 ID' })
  id!: string;

  @ApiProperty({
    description: '상태',
    enum: GenerationStatus,
  })
  status!: GenerationStatus;

  @ApiProperty({
    description: '진행률 (0-100)',
    example: 50,
  })
  progress!: number;

  @ApiPropertyOptional({
    description: '상태 메시지',
    example: '이미지 생성 중...',
  })
  statusMessage?: string;

  @ApiPropertyOptional({
    description: '예상 완료 시간 (초)',
  })
  estimatedTimeRemaining?: number;

  @ApiPropertyOptional({
    description: '생성된 템플릿셋 ID (완료 시)',
  })
  templateSetId?: string;

  @ApiPropertyOptional({
    description: '썸네일 URL (완료 시)',
  })
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    description: '에러 메시지 (실패 시)',
  })
  errorMessage?: string;

  @ApiProperty({ description: '생성 시작 시간' })
  createdAt!: Date;

  @ApiPropertyOptional({ description: '완료 시간' })
  completedAt?: Date;
}

/**
 * 생성 시작 응답 DTO
 */
export class GenerationStartResponseDto {
  @ApiProperty({ description: '생성 작업 ID' })
  generationId!: string;

  @ApiProperty({ description: '상태' })
  status!: GenerationStatus;

  @ApiProperty({
    description: '예상 소요 시간 (초)',
    example: 30,
  })
  estimatedTime!: number;

  @ApiProperty({
    description: '상태 확인 URL',
    example: '/api/ai/generate/abc-123',
  })
  statusUrl!: string;
}

/**
 * 생성 결과 수락 DTO
 */
export class GenerationAcceptDto {
  @ApiPropertyOptional({
    description: '템플릿셋 이름 (기본값: 프롬프트 기반 자동 생성)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: '평점 (1-5)',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({
    description: '피드백',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  feedback?: string;
}

/**
 * 생성 거절 DTO
 */
export class GenerationRejectDto {
  @ApiPropertyOptional({
    description: '거절 이유',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @ApiPropertyOptional({
    description: '재생성 요청 여부',
  })
  @IsOptional()
  @IsBoolean()
  requestRegenerate?: boolean;
}

/**
 * 생성 이력 조회 응답 DTO
 */
export class GenerationHistoryItemDto {
  @ApiProperty({ description: '생성 작업 ID' })
  id!: string;

  @ApiProperty({ description: '프롬프트' })
  prompt!: string;

  @ApiProperty({ description: '상태' })
  status!: GenerationStatus;

  @ApiPropertyOptional({ description: '썸네일 URL' })
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: '생성된 템플릿셋 ID' })
  templateSetId?: string;

  @ApiProperty({ description: '생성 시간' })
  createdAt!: Date;

  @ApiPropertyOptional({ description: '사용자 수락 여부' })
  userAccepted?: boolean;
}
