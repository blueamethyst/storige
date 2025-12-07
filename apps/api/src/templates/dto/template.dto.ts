import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsObject, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CanvasData, TemplateType } from '@storige/types';

export class CreateTemplateDto {
  @ApiProperty({ example: '명함 템플릿 1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'category-id-123' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'page', enum: ['wing', 'cover', 'spine', 'page'] })
  @IsOptional()
  @IsString()
  type?: TemplateType;

  @ApiPropertyOptional({ example: 210, description: 'Width in mm' })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({ example: 297, description: 'Height in mm' })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({ example: 'EDIT001' })
  @IsOptional()
  @IsString()
  editCode?: string;

  @ApiPropertyOptional({ example: 'TMPL001' })
  @IsOptional()
  @IsString()
  templateCode?: string;

  @ApiPropertyOptional({ example: 'https://example.com/thumbnail.jpg' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiProperty({
    example: {
      version: '1.0.0',
      width: 800,
      height: 600,
      objects: [],
      background: '#ffffff',
    },
  })
  @IsObject()
  @IsNotEmpty()
  canvasData: CanvasData;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTemplateDto {
  @ApiPropertyOptional({ example: '명함 템플릿 1' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'category-id-123' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'page', enum: ['wing', 'cover', 'spine', 'page'] })
  @IsOptional()
  @IsString()
  type?: TemplateType;

  @ApiPropertyOptional({ example: 210, description: 'Width in mm' })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({ example: 297, description: 'Height in mm' })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({ example: 'EDIT001' })
  @IsOptional()
  @IsString()
  editCode?: string;

  @ApiPropertyOptional({ example: 'TMPL001' })
  @IsOptional()
  @IsString()
  templateCode?: string;

  @ApiPropertyOptional({ example: 'https://example.com/thumbnail.jpg' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  canvasData?: CanvasData;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
