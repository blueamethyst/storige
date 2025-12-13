/**
 * 검증 에러 코드
 * 기획 문서와 통일된 코드
 */
export enum ErrorCode {
  /** 지원하지 않는 파일 형식 */
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  /** 손상된 파일 */
  FILE_CORRUPTED = 'FILE_CORRUPTED',
  /** 파일 크기 초과 */
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  /** 페이지 수 오류 (제본 방식에 맞지 않음) */
  PAGE_COUNT_INVALID = 'PAGE_COUNT_INVALID',
  /** 페이지 수 초과 */
  PAGE_COUNT_EXCEEDED = 'PAGE_COUNT_EXCEEDED',
  /** 페이지 사이즈 불일치 */
  SIZE_MISMATCH = 'SIZE_MISMATCH',
  /** 책등 사이즈 불일치 */
  SPINE_SIZE_MISMATCH = 'SPINE_SIZE_MISMATCH',
}

/**
 * 검증 경고 코드
 */
export enum WarningCode {
  /** 페이지 수 불일치 (주문과 다름) */
  PAGE_COUNT_MISMATCH = 'PAGE_COUNT_MISMATCH',
  /** 재단 여백 없음 */
  BLEED_MISSING = 'BLEED_MISSING',
  /** 해상도 낮음 */
  RESOLUTION_LOW = 'RESOLUTION_LOW',
}

/**
 * 검증 에러 정보
 */
export interface ValidationError {
  /** 에러 코드 */
  code: ErrorCode;
  /** 사용자 표시 메시지 */
  message: string;
  /** 상세 정보 */
  details: {
    expected?: any;
    actual?: any;
    page?: number;
  };
  /** 자동 수정 가능 여부 */
  autoFixable: boolean;
  /** 수정 방법 */
  fixMethod?: 'addBlankPages' | 'extendBleed' | 'adjustSpine' | 'resizeWithPadding';
}

/**
 * 검증 경고 정보
 */
export interface ValidationWarning {
  /** 경고 코드 */
  code: WarningCode;
  /** 사용자 표시 메시지 */
  message: string;
  /** 상세 정보 */
  details?: any;
  /** 자동 수정 가능 여부 */
  autoFixable: boolean;
  /** 수정 방법 */
  fixMethod?: string;
}

/**
 * PDF 메타데이터
 */
export interface PdfMetadata {
  /** 페이지 수 */
  pageCount: number;
  /** 페이지 크기 (mm) */
  pageSize: {
    width: number;
    height: number;
  };
  /** 재단 여백 포함 여부 */
  hasBleed: boolean;
  /** 재단 여백 크기 (mm) */
  bleedSize?: number;
  /** 책등 크기 (mm) */
  spineSize?: number;
  /** 해상도 (DPI) */
  resolution?: number;
  /** 컬러 모드 */
  colorMode?: string;
}

/**
 * 검증 결과 DTO
 */
export interface ValidationResultDto {
  /** 검증 통과 여부 */
  isValid: boolean;
  /** 에러 목록 */
  errors: ValidationError[];
  /** 경고 목록 */
  warnings: ValidationWarning[];
  /** PDF 메타데이터 */
  metadata: PdfMetadata;
}

/**
 * 검증 옵션
 */
export interface ValidationOptions {
  /** 파일 타입 */
  fileType: 'cover' | 'content';
  /** 주문 옵션 */
  orderOptions: {
    /** 판형 크기 (mm) */
    size: {
      width: number;
      height: number;
    };
    /** 주문 페이지 수 */
    pages: number;
    /** 제본 방식 */
    binding: 'perfect' | 'saddle' | 'spring';
    /** 재단 여백 (mm) */
    bleed: number;
    /** 종이 두께 (mm, 책등 계산용) */
    paperThickness?: number;
  };
  /** 최대 허용 파일 크기 (bytes) */
  maxFileSize?: number;
  /** 최대 허용 페이지 수 */
  maxPages?: number;
}
