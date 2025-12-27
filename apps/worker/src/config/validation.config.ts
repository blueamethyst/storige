/**
 * PDF 검증 관련 설정 상수
 * @see docs/PDF_VALIDATION_WBS.md - WBS 1.1
 */
export const VALIDATION_CONFIG = {
  // Ghostscript 설정
  /** GS 실행 타임아웃 (ms) */
  GS_TIMEOUT: 5000,
  /** inkcov 분석 최대 페이지 수 */
  GS_MAX_PAGES: 50,
  /** GS 동시 실행 제한 (워커당) */
  GS_CONCURRENCY: 2,

  // 파일 크기 제한
  /** 최대 파일 크기 (100MB) */
  MAX_FILE_SIZE: 100 * 1024 * 1024,
  /** 대형 파일 임계값 - GS 분석 선택적 (50MB) */
  LARGE_FILE_THRESHOLD: 50 * 1024 * 1024,

  // 스프레드(펼침면) 감지
  /** 스프레드 판정 점수 임계값 */
  SPREAD_SCORE_THRESHOLD: 70,
  /** 사이즈 허용 오차 (mm) */
  SIZE_TOLERANCE_MM: 2,

  // 사철 제본
  /** 사철 제본 최대 페이지 수 */
  SADDLE_STITCH_MAX_PAGES: 64,

  // 포인트 → mm 변환 계수
  /** 1 포인트 = 0.352778mm */
  PT_TO_MM: 0.352778,

  // 해상도 감지
  /** 인쇄 품질 권장 해상도 (DPI) */
  RECOMMENDED_DPI: 300,
  /** 최소 허용 해상도 (DPI) - 이 값 미만이면 경고 */
  MIN_ACCEPTABLE_DPI: 150,
} as const;

export type ValidationConfig = typeof VALIDATION_CONFIG;
