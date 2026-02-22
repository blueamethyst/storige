import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionStatus, SessionMode } from '../entities/edit-session.entity';

export class ExternalSessionFilesDto {
  @ApiPropertyOptional({ description: '표지 PDF URL (워커 출력 > 에디터 원본 fallback)', example: '/storage/outputs/job-uuid/cover.pdf' })
  cover: string | null;

  @ApiPropertyOptional({ description: '내지 PDF URL (워커 출력 > 에디터 원본 fallback)', example: '/storage/outputs/job-uuid/content.pdf' })
  content: string | null;

  @ApiPropertyOptional({ description: '병합 PDF URL (워커 출력만)', example: '/storage/outputs/job-uuid/merged.pdf' })
  merged: string | null;
}

export class ExternalSessionResponseDto {
  @ApiProperty({ description: '편집 세션 ID' })
  sessionId: string;

  @ApiProperty({ description: '주문 번호' })
  orderSeqno: number;

  @ApiProperty({ enum: SessionStatus, description: '세션 상태' })
  status: SessionStatus;

  @ApiProperty({ enum: SessionMode, description: '편집 모드' })
  mode: SessionMode;

  @ApiProperty({ type: ExternalSessionFilesDto, description: '파일 URL 정보' })
  files: ExternalSessionFilesDto;

  @ApiPropertyOptional({ description: '완료 일시' })
  completedAt: Date | null;
}

export class ExternalSessionListResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ type: [ExternalSessionResponseDto] })
  data: ExternalSessionResponseDto[];
}
