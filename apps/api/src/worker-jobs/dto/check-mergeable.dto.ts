import { IsString, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CheckMergeableDto {
  @ApiProperty({ description: '편집 세션 ID' })
  @IsUUID()
  editSessionId: string;

  @ApiPropertyOptional({ description: '표지 PDF 파일 ID' })
  @IsOptional()
  @IsUUID()
  coverFileId?: string;

  @ApiPropertyOptional({ description: '표지 PDF URL' })
  @IsOptional()
  @IsString()
  coverUrl?: string;

  @ApiPropertyOptional({ description: '내지 PDF 파일 ID' })
  @IsOptional()
  @IsUUID()
  contentFileId?: string;

  @ApiPropertyOptional({ description: '내지 PDF URL' })
  @IsOptional()
  @IsString()
  contentUrl?: string;

  @ApiProperty({ description: '책등 폭 (mm)', example: 5.5 })
  @IsNumber()
  @Min(0)
  spineWidth: number;
}

export class MergeIssueDto {
  @ApiProperty({ description: '에러 코드' })
  code: string;

  @ApiProperty({ description: '에러 메시지' })
  message: string;
}

export class CheckMergeableResponseDto {
  @ApiProperty({ description: '병합 가능 여부' })
  mergeable: boolean;

  @ApiPropertyOptional({ description: '문제점 목록', type: [MergeIssueDto] })
  issues?: MergeIssueDto[];
}
