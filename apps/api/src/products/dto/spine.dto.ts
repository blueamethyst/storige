import {
  IsNumber,
  IsString,
  IsOptional,
  Min,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaperType, BindingType } from '@storige/types';

/**
 * Spine 계산 요청 DTO
 */
export class CalculateSpineDto {
  @ApiProperty({
    example: 100,
    description: '페이지 수 (책자 총 페이지 수)',
  })
  @IsNumber()
  @Min(1)
  pageCount: number;

  @ApiProperty({
    enum: PaperType,
    example: PaperType.MOJO_80G,
    description: '용지 종류',
  })
  @IsEnum(PaperType)
  paperType: PaperType;

  @ApiProperty({
    enum: BindingType,
    example: BindingType.PERFECT,
    description: '제본 방식',
  })
  @IsEnum(BindingType)
  bindingType: BindingType;

  @ApiPropertyOptional({
    example: 0.5,
    description: '커스텀 용지 두께 (mm 단위, paperType 무시)',
  })
  @IsOptional()
  @IsNumber()
  customPaperThickness?: number;

  @ApiPropertyOptional({
    example: 2.0,
    description: '커스텀 제본 마진 (mm 단위, bindingType 무시)',
  })
  @IsOptional()
  @IsNumber()
  customBindingMargin?: number;
}

/**
 * Spine 계산 결과
 */
export class SpineCalculationResultDto {
  @ApiProperty({
    example: 12.5,
    description: '계산된 책등 너비 (mm)',
  })
  spineWidth: number;

  @ApiProperty({
    example: 0.1,
    description: '사용된 용지 두께 (mm)',
  })
  paperThickness: number;

  @ApiProperty({
    example: 2.5,
    description: '사용된 제본 마진 (mm)',
  })
  bindingMargin: number;

  @ApiProperty({
    description: '경고 메시지 목록',
    type: [Object],
  })
  warnings: { code: string; message: string }[];

  @ApiProperty({
    example: '(100 / 2) × 0.1 + 2.5 = 7.5mm',
    description: '계산 공식',
  })
  formula: string;
}

/**
 * 용지 정보 응답
 */
export class PaperInfoDto {
  @ApiProperty({ example: 'mojo_80g' })
  type: string;

  @ApiProperty({ example: '모조지 80g' })
  name: string;

  @ApiProperty({ example: 0.1 })
  thickness: number;
}

/**
 * 제본 정보 응답
 */
export class BindingInfoDto {
  @ApiProperty({ example: 'perfect' })
  type: string;

  @ApiProperty({ example: '무선제본' })
  name: string;

  @ApiProperty({ example: 2.5 })
  margin: number;
}
