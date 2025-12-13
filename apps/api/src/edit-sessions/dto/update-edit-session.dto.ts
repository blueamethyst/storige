import { IsOptional, IsObject, IsEnum, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SessionStatus } from '../entities/edit-session.entity';

export class UpdateEditSessionDto {
  @ApiPropertyOptional({ description: '캔버스 데이터 (편집 내용)' })
  @IsOptional()
  @IsObject()
  canvasData?: any;

  @ApiPropertyOptional({ description: '메타데이터' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ example: 'complete', enum: SessionStatus, description: '세션 상태' })
  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @ApiPropertyOptional({ example: 'uuid', description: '표지 파일 ID' })
  @IsOptional()
  @IsUUID()
  coverFileId?: string;

  @ApiPropertyOptional({ example: 'uuid', description: '내지 파일 ID' })
  @IsOptional()
  @IsUUID()
  contentFileId?: string;
}
