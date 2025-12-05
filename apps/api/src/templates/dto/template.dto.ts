import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CanvasData } from '@storige/types';

export class CreateTemplateDto {
  @ApiProperty({ example: '명함 템플릿 1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'category-id-123' })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

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
