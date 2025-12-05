import { IsString, IsNotEmpty, IsObject, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CanvasData } from '@storige/types';
import { EditSessionStatus } from '../entities/edit-session.entity';

export class CreateEditSessionDto {
  @ApiPropertyOptional({ example: 'user-uuid-here' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ example: 'template-uuid-here' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiProperty({
    example: {
      version: '1.0',
      objects: [],
      background: '#ffffff',
    },
  })
  @IsObject()
  @IsNotEmpty()
  canvasData: CanvasData;

  @ApiPropertyOptional({
    example: {
      size: { width: 210, height: 297 },
      pages: 4,
      binding: 'perfect',
    },
  })
  @IsOptional()
  @IsObject()
  orderOptions?: any;
}

export class UpdateEditSessionDto {
  @ApiPropertyOptional({
    example: {
      version: '1.0',
      objects: [],
      background: '#ffffff',
    },
  })
  @IsOptional()
  @IsObject()
  canvasData?: CanvasData;

  @ApiPropertyOptional({
    example: {
      size: { width: 210, height: 297 },
      pages: 4,
      binding: 'perfect',
    },
  })
  @IsOptional()
  @IsObject()
  orderOptions?: any;

  @ApiPropertyOptional({ example: 'COMPLETED', enum: EditSessionStatus })
  @IsOptional()
  @IsEnum(EditSessionStatus)
  status?: EditSessionStatus;
}

export class ExportPdfDto {
  @ApiProperty({ example: 'session-uuid-here' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiPropertyOptional({
    example: {
      format: 'A4',
      orientation: 'portrait',
      quality: 'high',
    },
  })
  @IsOptional()
  @IsObject()
  exportOptions?: any;
}
