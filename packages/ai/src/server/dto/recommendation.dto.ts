import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsEnum,
  IsObject,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 색상 팔레트 DTO
 */
export class ColorPaletteDto {
  @ApiPropertyOptional({ description: '주요 색상', example: '#3B82F6' })
  @IsOptional()
  @IsString()
  primary?: string;

  @ApiPropertyOptional({
    description: '보조 색상들',
    example: ['#1F2937', '#F3F4F6'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  secondary?: string[];

  @ApiPropertyOptional({ description: '강조 색상', example: '#EF4444' })
  @IsOptional()
  @IsString()
  accent?: string;
}

/**
 * 사용자 선호도 입력 DTO
 */
export class UserPreferenceInputDto {
  @ApiPropertyOptional({
    description: '선호 스타일',
    example: ['minimal', 'modern'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredStyles?: string[];

  @ApiPropertyOptional({
    description: '선호 색상 팔레트',
    type: ColorPaletteDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ColorPaletteDto)
  preferredColors?: ColorPaletteDto;

  @ApiPropertyOptional({
    description: '선호 폰트',
    example: ['Pretendard', 'Noto Sans KR'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredFonts?: string[];

  @ApiPropertyOptional({
    description: '업종 카테고리',
    example: 'technology',
  })
  @IsOptional()
  @IsString()
  industryCategory?: string;

  @ApiPropertyOptional({
    description: '용도',
    example: 'business',
  })
  @IsOptional()
  @IsString()
  usageContext?: string;

  @ApiPropertyOptional({
    description: '선호 복잡도',
    enum: ['minimal', 'moderate', 'complex'],
  })
  @IsOptional()
  @IsEnum(['minimal', 'moderate', 'complex'])
  preferredComplexity?: 'minimal' | 'moderate' | 'complex';

  @ApiPropertyOptional({
    description: '선호 분위기',
    enum: ['professional', 'casual', 'playful', 'elegant'],
  })
  @IsOptional()
  @IsEnum(['professional', 'casual', 'playful', 'elegant'])
  preferredMood?: 'professional' | 'casual' | 'playful' | 'elegant';
}

/**
 * 추천 요청 DTO
 */
export class RecommendationRequestDto {
  @ApiPropertyOptional({
    description: '사용자 선호도 (없으면 저장된 선호도 사용)',
    type: UserPreferenceInputDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserPreferenceInputDto)
  preferences?: UserPreferenceInputDto;

  @ApiPropertyOptional({
    description: '템플릿셋 타입 필터',
    enum: ['book', 'leaflet'],
  })
  @IsOptional()
  @IsString()
  templateType?: 'book' | 'leaflet';

  @ApiPropertyOptional({
    description: '추천 결과 수',
    default: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({
    description: '특정 카테고리 ID 필터',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;
}

/**
 * 추천 결과 아이템
 */
export class RecommendationItemDto {
  @ApiProperty({ description: '템플릿셋 ID' })
  templateSetId!: string;

  @ApiProperty({ description: '템플릿셋 이름' })
  name!: string;

  @ApiProperty({ description: '썸네일 URL' })
  thumbnailUrl!: string | null;

  @ApiProperty({ description: '추천 점수 (0-1)', example: 0.92 })
  score!: number;

  @ApiProperty({
    description: '추천 이유',
    example: ['선호 스타일 일치', '인기 템플릿'],
  })
  reasons!: string[];

  @ApiProperty({ description: '템플릿 타입' })
  type!: 'book' | 'leaflet';

  @ApiProperty({ description: '가로 크기 (mm)' })
  width!: number;

  @ApiProperty({ description: '세로 크기 (mm)' })
  height!: number;
}

/**
 * 추천 응답 DTO
 */
export class RecommendationResponseDto {
  @ApiProperty({
    description: '추천 결과 목록',
    type: [RecommendationItemDto],
  })
  recommendations!: RecommendationItemDto[];

  @ApiProperty({ description: '총 템플릿셋 수' })
  totalCount!: number;

  @ApiProperty({ description: '사용된 선호도 소스', enum: ['input', 'saved', 'default'] })
  preferenceSource!: 'input' | 'saved' | 'default';
}

/**
 * 피드백 요청 DTO
 */
export class FeedbackRequestDto {
  @ApiProperty({ description: '템플릿셋 ID' })
  @IsString()
  templateSetId!: string;

  @ApiProperty({
    description: '피드백 타입',
    enum: ['like', 'dislike'],
  })
  @IsEnum(['like', 'dislike'])
  type!: 'like' | 'dislike';

  @ApiPropertyOptional({
    description: '피드백 컨텍스트',
    enum: ['recommendation', 'generation', 'browse'],
  })
  @IsOptional()
  @IsString()
  context?: 'recommendation' | 'generation' | 'browse';

  @ApiPropertyOptional({
    description: '추천 목록에서의 순위',
  })
  @IsOptional()
  @IsNumber()
  recommendationRank?: number;

  @ApiPropertyOptional({
    description: '코멘트',
  })
  @IsOptional()
  @IsString()
  comment?: string;
}
