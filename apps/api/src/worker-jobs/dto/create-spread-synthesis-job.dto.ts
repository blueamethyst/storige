import {
  IsString,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsUrl,
  IsEnum,
  IsArray,
  ArrayMinSize,
} from 'class-validator';

/**
 * 스프레드 합성 작업 생성 DTO
 *
 * POST /worker-jobs/spread-synthesize
 *
 * 스프레드 모드(책모드) PDF 합성 작업
 * - spreadPdfFileId: 스프레드 캔버스 PDF (1페이지, 표지 전체)
 * - contentPdfFileIds: 내지 PDF들 (순서대로 병합)
 * - sessionId: EditSession ID (스냅샷 검증용)
 * - requestId: 멱등성 키
 */
export class CreateSpreadSynthesisJobDto {
  /**
   * EditSession ID
   * metadata.spine, metadata.spread 검증용
   */
  @IsUUID()
  sessionId: string;

  /**
   * 스프레드 PDF 파일 ID (표지 전체, 1페이지)
   */
  @IsUUID()
  spreadPdfFileId: string;

  /**
   * 내지 PDF 파일 ID 배열 (순서 보장)
   */
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  contentPdfFileIds: string[];

  /**
   * 멱등성 키
   * 클라이언트가 UUID로 생성
   * (sessionId, spreadPdfFileId, requestId) unique
   */
  @IsUUID()
  requestId: string;

  /**
   * 출력 형식 (항상 'separate' - 스프레드 모드는 분리 고정)
   */
  @IsOptional()
  @IsEnum(['separate'])
  outputFormat?: 'separate';

  /**
   * merged.pdf도 함께 생성 (선택)
   */
  @IsOptional()
  @IsBoolean()
  alsoGenerateMerged?: boolean;

  /**
   * 완료 시 호출할 웹훅 URL
   */
  @IsOptional()
  @IsUrl()
  callbackUrl?: string;

  /**
   * 작업 우선순위
   */
  @IsOptional()
  @IsEnum(['high', 'normal', 'low'])
  priority?: 'high' | 'normal' | 'low';
}
