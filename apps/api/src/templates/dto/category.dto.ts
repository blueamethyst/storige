import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: '명함' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'BC' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ example: null })
  @IsOptional()
  @IsString()
  parentId?: string | null;

  @ApiProperty({ example: 1, enum: [1, 2, 3] })
  @IsNumber()
  @IsIn([1, 2, 3])
  level: 1 | 2 | 3;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: '명함' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'BC' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}
