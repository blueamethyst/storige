import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsObject, IsNumber, IsEnum, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CanvasData, TemplateType, SpreadConfig } from '@storige/types';

export class CreateTemplateDto {
  @ApiProperty({ example: '명함 템플릿 1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'category-id-123' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'page', enum: ['wing', 'cover', 'spine', 'page', 'spread'] })
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

  @ApiPropertyOptional({
    description: '스프레드 설정 (type=spread일 때 필수)',
    example: {
      spec: {
        coverWidthMm: 210,
        coverHeightMm: 297,
        spineWidthMm: 7.5,
        wingEnabled: true,
        wingWidthMm: 60,
        cutSizeMm: 3,
        safeSizeMm: 5,
        dpi: 300,
      },
      regions: [],
      totalWidthMm: 550,
      totalHeightMm: 303,
    },
  })
  @ValidateIf((o) => o.type === 'spread')
  @IsObject()
  @IsNotEmpty()
  spreadConfig?: SpreadConfig;

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

  @ApiPropertyOptional({ example: 'page', enum: ['wing', 'cover', 'spine', 'page', 'spread'] })
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

  @ApiPropertyOptional({
    description: '스프레드 설정 (type=spread일 때 필수)',
  })
  @IsOptional()
  @IsObject()
  spreadConfig?: SpreadConfig;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
