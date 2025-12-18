/**
 * @storige/types
 * Shared TypeScript types for Storige system
 */

// ============================================================================
// User & Authentication
// ============================================================================

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  CUSTOMER = 'CUSTOMER',
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ============================================================================
// Category
// ============================================================================

export interface Category {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
  level: 1 | 2 | 3;
  sortOrder: number;
  children?: Category[];
  createdAt: Date;
}

// ============================================================================
// Template
// ============================================================================

/**
 * 템플릿 타입
 * - wing: 날개 (표지를 접었을 때 안쪽으로 접히는 부분)
 * - cover: 표지 (앞/뒤 표지, 위치로 구분)
 * - spine: 책등 (책의 등 부분)
 * - page: 내지 (본문 페이지)
 */
export enum TemplateType {
  WING = 'wing',
  COVER = 'cover',
  SPINE = 'spine',
  PAGE = 'page',
}

/**
 * 템플릿셋 타입
 * - book: 책자 (날개 + 앞표지 + 책등 + 내지 N장 + 뒤표지 + 날개)
 * - leaflet: 리플렛 (앞표지 + 내지 N장 + 뒤표지)
 */
export enum TemplateSetType {
  BOOK = 'book',
  LEAFLET = 'leaflet',
}

/**
 * 템플릿
 * 단면 1페이지에 해당하는 디자인 틀
 */
export interface Template {
  id: string;
  name: string;
  thumbnailUrl?: string;
  type: TemplateType;
  width: number;              // 판형 (mm)
  height: number;             // 판형 (mm)
  editable: boolean;          // 편집 가능 여부
  deleteable: boolean;        // 삭제 가능 여부
  canvasData: CanvasData;     // Fabric.js JSON
  isDeleted: boolean;         // 소프트 삭제
  // Legacy fields (하위 호환)
  categoryId?: string;
  editCode?: string;
  templateCode?: string;
  isActive?: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 템플릿 생성 입력
 */
export interface CreateTemplateInput {
  name: string;
  thumbnailUrl?: string;
  type: TemplateType;
  width: number;
  height: number;
  editable?: boolean;
  deleteable?: boolean;
  canvasData?: CanvasData;
  categoryId?: string;
}

/**
 * 템플릿 수정 입력
 */
export interface UpdateTemplateInput {
  name?: string;
  thumbnailUrl?: string;
  type?: TemplateType;
  width?: number;
  height?: number;
  editable?: boolean;
  deleteable?: boolean;
  canvasData?: CanvasData;
}

/**
 * 템플릿 참조 (템플릿셋 내 템플릿 구성)
 */
export interface TemplateRef {
  templateId: string;
  required: boolean;          // 필수 페이지 여부
}

/**
 * 템플릿셋
 * 템플릿들의 조합. 상품에 연결되어 에디터의 기본 구성을 정의
 */
export interface TemplateSet {
  id: string;
  name: string;
  thumbnailUrl?: string;
  type: TemplateSetType;
  width: number;              // 판형 (mm)
  height: number;             // 판형 (mm)
  canAddPage: boolean;        // 내지 추가 가능 여부
  pageCountRange: number[];   // 내지 수량 범위 (예: [10, 20, 30, 40])
  templates: TemplateRef[];   // 순서 포함, N:N 관계
  isDeleted: boolean;         // 소프트 삭제
  // Legacy fields (하위 호환)
  description?: string;
  categoryId?: string;
  productSpecs?: ProductSpecs;
  items?: TemplateSetItem[];
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 템플릿셋 생성 입력
 */
export interface CreateTemplateSetInput {
  name: string;
  thumbnailUrl?: string;
  type: TemplateSetType;
  width: number;
  height: number;
  canAddPage?: boolean;
  pageCountRange?: number[];
  templates?: TemplateRef[];
  categoryId?: string;
}

/**
 * 템플릿셋 수정 입력
 */
export interface UpdateTemplateSetInput {
  name?: string;
  thumbnailUrl?: string;
  type?: TemplateSetType;
  width?: number;
  height?: number;
  canAddPage?: boolean;
  pageCountRange?: number[];
  templates?: TemplateRef[];
}

/**
 * 템플릿셋 아이템 (Legacy - 하위 호환용)
 */
export interface TemplateSetItem {
  id: string;
  templateSetId: string;
  templateId: string;
  sortOrder: number;
  required?: boolean;
}

/**
 * 상품 스펙 (Legacy)
 */
export interface ProductSpecs {
  size: {
    width: number;
    height: number;
    unit: 'mm' | 'cm' | 'inch';
  };
  pages: number;
  binding: 'perfect' | 'saddle' | 'none';
  bleed: number;
  orientation: 'portrait' | 'landscape';
}

// ============================================================================
// Canvas / Editor
// ============================================================================

export interface CanvasData {
  version: string;
  width: number;
  height: number;
  objects: FabricObject[];
  background?: string | FabricObject;
}

export interface FabricObject {
  type: string;
  isUserAdded?: boolean;      // 사용자가 추가한 요소 여부 (템플릿 교체 시 보존)
  isLocked?: boolean;         // 잠금 상태
  [key: string]: any;
}

/**
 * 편집 상태
 * - draft: 편집 중 (고객 편집 가능)
 * - review: 검토 중 (관리자 편집 가능)
 * - submitted: 완료 (관리자 편집 가능, 기록 남김)
 */
export enum EditStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  SUBMITTED = 'submitted',
}

/**
 * 편집 페이지 (에디터 내 개별 페이지)
 */
export interface EditPage {
  id: string;
  templateId: string;
  templateType: TemplateType;
  canvasData: CanvasData;
  sortOrder: number;
  required: boolean;
  deleteable: boolean;
}

/**
 * 편집 세션
 * 사용자의 편집 작업 상태를 저장
 */
export interface EditSession {
  id: string;
  userId?: string;
  orderId?: string;
  templateSetId: string;
  templateSet?: TemplateSet;  // 조인된 템플릿셋 정보 (optional)
  pages: EditPage[];          // 페이지별 캔버스 데이터
  status: EditStatus;
  // 동시 편집 방지
  lockedBy?: string;
  lockedAt?: Date;
  // 수정 기록
  modifiedBy?: string;
  modifiedAt?: Date;
  // Legacy fields
  templateId?: string;
  canvasData?: CanvasData;
  orderOptions?: OrderOptions;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 편집 세션 생성 입력
 */
export interface CreateEditSessionInput {
  templateSetId: string;
  orderId?: string;
  userId?: string;
}

/**
 * 편집 세션 저장 입력 (자동저장용)
 */
export interface SaveEditSessionInput {
  pages?: EditPage[];
  currentPageIndex?: number;
}

/**
 * 편집 이력
 */
export interface EditHistory {
  id: string;
  sessionId: string;
  userId: string;
  userName?: string;
  action: string;
  details?: string;
  createdAt: Date;
}

export interface OrderOptions {
  size: {
    width: number;
    height: number;
    unit: 'mm' | 'cm' | 'inch';
  };
  pages: number;
  binding: 'perfect' | 'saddle' | 'none';
  bleed: number;
}

// ============================================================================
// Library
// ============================================================================

/**
 * 라이브러리 카테고리 타입
 */
export type LibraryCategoryType = 'background' | 'shape' | 'frame' | 'clipart';

/**
 * 라이브러리 카테고리 (계층형)
 */
export interface LibraryCategory {
  id: string;
  name: string;
  type: LibraryCategoryType;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  children?: LibraryCategory[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LibraryFont {
  id: string;
  name: string;
  fileUrl: string;
  fileFormat: 'ttf' | 'otf' | 'woff' | 'woff2';
  isActive: boolean;
  createdAt: Date;
}

export interface LibraryBackground {
  id: string;
  name: string;
  fileUrl: string;
  thumbnailUrl?: string;
  category?: string;
  categoryId?: string;
  isActive: boolean;
  createdAt: Date;
}

/**
 * 도형 에셋
 */
export interface LibraryShape {
  id: string;
  name: string;
  fileUrl: string;
  thumbnailUrl?: string;
  categoryId?: string;
  tags?: string[];
  isActive: boolean;
  createdAt: Date;
}

/**
 * 사진틀 에셋
 */
export interface LibraryFrame {
  id: string;
  name: string;
  fileUrl: string;
  thumbnailUrl?: string;
  categoryId?: string;
  tags?: string[];
  isActive: boolean;
  createdAt: Date;
}

export interface LibraryClipart {
  id: string;
  name: string;
  fileUrl: string;
  thumbnailUrl?: string;
  category?: string;
  categoryId?: string;
  tags?: string[];
  isActive: boolean;
  createdAt: Date;
}

// ============================================================================
// Worker / PDF Processing
// ============================================================================

export enum WorkerJobType {
  VALIDATE = 'VALIDATE',
  CONVERT = 'CONVERT',
  SYNTHESIZE = 'SYNTHESIZE',
}

export enum WorkerJobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface WorkerJob {
  id: string;
  jobType: WorkerJobType;
  status: WorkerJobStatus;
  inputFileUrl?: string;
  outputFileUrl?: string;
  options?: ValidationOptions | ConversionOptions | SynthesisOptions;
  result?: ValidationResult | ConversionResult | SynthesisResult;
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
}

// Validation
export interface ValidationOptions {
  fileType: 'cover' | 'content';
  orderOptions: OrderOptions;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  fileInfo: {
    pages: number;
    size: { width: number; height: number };
    hasBleed: boolean;
    colorMode: string;
    resolution: number;
  };
}

export interface ValidationError {
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  code: string;
  message: string;
}

// Conversion
export interface ConversionOptions {
  addPages: boolean;
  applyBleed: boolean;
  targetPages: number;
  bleed: number;
}

export interface ConversionResult {
  success: boolean;
  outputFileUrl: string;
  pagesAdded: number;
  bleedApplied: boolean;
}

// Synthesis
export interface SynthesisOptions {
  coverUrl: string;
  contentUrl: string;
  spineWidth: number;
}

export interface SynthesisResult {
  success: boolean;
  outputFileUrl: string;
  previewUrl: string;
  totalPages: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T = any> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ============================================================================
// Editor Config
// ============================================================================

export interface EditorConfig {
  container: string;
  orderId?: string;
  options?: EditorOptions;
  onComplete?: (result: EditorResult) => void;
}

export interface EditorOptions {
  mode: 1 | 2 | 3 | 4; // 편집 모드
  templateSetId?: string;
  templateId?: string;
  readonly?: boolean;
}

export interface EditorResult {
  canvasData: CanvasData;
  files?: {
    coverPdf?: string;
    contentPdf?: string;
  };
}

// ============================================================================
// Editor Design (사용자 디자인 저장)
// ============================================================================

export interface EditorDesign {
  id: string;
  userId: string;
  name: string;
  imageUrl?: string;
  mediaUrl: string;
  metadata: EditorDesignMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface EditorDesignMetadata {
  productId?: string;
  sizeNo?: string;
  totalPage: number;
  settings: Record<string, any>;
  isAdmin?: boolean;
}

export interface CreateEditorDesignInput {
  name: string;
  imageUrl?: string;
  mediaUrl: string;
  metadata: EditorDesignMetadata;
}

export interface UpdateEditorDesignInput {
  name?: string;
  imageUrl?: string;
  mediaUrl?: string;
  metadata?: Partial<EditorDesignMetadata>;
}

// ============================================================================
// Editor Content (에디터 에셋: 템플릿, 프레임, 이미지, 배경, 요소)
// ============================================================================

export type EditorContentType = 'template' | 'frame' | 'image' | 'background' | 'element';

export interface EditorContent {
  id: string;
  type: EditorContentType;
  name: string;
  imageUrl?: string;
  designUrl?: string;
  cutLineUrl?: string;
  tags: string[];
  metadata: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EditorContentFilter {
  type?: EditorContentType;
  tags?: string[];
  isActive?: boolean;
  search?: string;
}

export interface EditorContentSort {
  field: 'name' | 'createdAt' | 'updatedAt';
  order: 'asc' | 'desc';
}

// ============================================================================
// Canvas Settings (캔버스 설정)
// ============================================================================

export type ColorMode = 'RGB' | 'CMYK';
export type SizeUnit = 'mm' | 'px' | 'inch';

export interface CanvasSettings {
  unit: SizeUnit;
  visibleUnit?: SizeUnit;
  colorMode: ColorMode;
  dpi: number;
  size: {
    width: number;
    height: number;
    cutSize: number;
    safeSize?: number;
    printSize?: { width: number; height: number };
  };
  showCutBorder: boolean;
  showSafeBorder?: boolean;
  editMode?: boolean;
  page: {
    count: number;
    min: number;
    max: number;
    interval: number;
  };
}

// ============================================================================
// Spine (책등) 관련 타입
// ============================================================================

/**
 * 종이 타입
 * 각 종이 타입별 두께(mm) 포함
 */
export enum PaperType {
  // 본문용
  MOJO_70G = 'mojo_70g',           // 모조지 70g
  MOJO_80G = 'mojo_80g',           // 모조지 80g
  SEOKJI_70G = 'seokji_70g',       // 서적지 70g
  NEWSPRINT_45G = 'newsprint_45g', // 신문지 45g
  // 표지용
  ART_200G = 'art_200g',           // 아트지 200g
  MATTE_200G = 'matte_200g',       // 매트지 200g
  CARD_300G = 'card_300g',         // 카드지 300g
  KRAFT_120G = 'kraft_120g',       // 크라프트지 120g
}

/**
 * 종이 두께 상수 (mm per sheet, 양면 1장 기준)
 */
export const PAPER_THICKNESS: Record<PaperType, number> = {
  [PaperType.MOJO_70G]: 0.09,
  [PaperType.MOJO_80G]: 0.10,
  [PaperType.SEOKJI_70G]: 0.10,
  [PaperType.NEWSPRINT_45G]: 0.06,
  [PaperType.ART_200G]: 0.18,
  [PaperType.MATTE_200G]: 0.20,
  [PaperType.CARD_300G]: 0.35,
  [PaperType.KRAFT_120G]: 0.16,
};

/**
 * 제본 방식
 */
export enum BindingType {
  PERFECT = 'perfect',     // 무선제본 (32p 이상)
  SADDLE = 'saddle',       // 중철제본 (64p 이하, 4의 배수)
  SPIRAL = 'spiral',       // 스프링제본
  HARDCOVER = 'hardcover', // 양장제본
}

/**
 * 제본 여유분 상수 (mm)
 */
export const BINDING_MARGIN: Record<BindingType, number> = {
  [BindingType.PERFECT]: 0.5,
  [BindingType.SADDLE]: 0.3,    // 0.2~0.4mm 평균
  [BindingType.SPIRAL]: 3.0,
  [BindingType.HARDCOVER]: 2.0,
};

/**
 * 제본 방식별 제한 조건
 */
export const BINDING_CONSTRAINTS: Record<BindingType, { minPages?: number; maxPages?: number; pageMultiple?: number }> = {
  [BindingType.PERFECT]: { minPages: 32 },
  [BindingType.SADDLE]: { maxPages: 64, pageMultiple: 4 },
  [BindingType.SPIRAL]: {},
  [BindingType.HARDCOVER]: {},
};

/**
 * 책등 설정
 */
export interface SpineConfig {
  pageCount: number;        // 페이지 수
  paperType: PaperType;     // 종이 종류
  bindingType: BindingType; // 제본 방식
}

/**
 * 책등 계산 결과
 */
export interface SpineCalculationResult {
  spineWidth: number;       // 계산된 책등 폭 (mm)
  paperThickness: number;   // 종이 두께 (mm per sheet)
  bindingMargin: number;    // 제본 여유분 (mm)
  warnings: SpineWarning[]; // 경고 메시지
}

/**
 * 책등 관련 경고
 */
export interface SpineWarning {
  code: 'SPINE_TOO_NARROW' | 'BINDING_PAGE_LIMIT' | 'BINDING_PAGE_MULTIPLE';
  message: string;
}

/**
 * 책등 폭 계산 함수 (유틸리티)
 * 공식: 책등 폭 = (페이지 수 ÷ 2) × 종이 두께 + 제본 여유분
 */
export function calculateSpineWidth(config: SpineConfig): SpineCalculationResult {
  const paperThickness = PAPER_THICKNESS[config.paperType];
  const bindingMargin = BINDING_MARGIN[config.bindingType];
  const constraints = BINDING_CONSTRAINTS[config.bindingType];

  const warnings: SpineWarning[] = [];

  // 제본 조건 검증
  if (constraints.minPages && config.pageCount < constraints.minPages) {
    warnings.push({
      code: 'BINDING_PAGE_LIMIT',
      message: `${config.bindingType} 제본은 최소 ${constraints.minPages}페이지 이상이어야 합니다.`,
    });
  }
  if (constraints.maxPages && config.pageCount > constraints.maxPages) {
    warnings.push({
      code: 'BINDING_PAGE_LIMIT',
      message: `${config.bindingType} 제본은 최대 ${constraints.maxPages}페이지까지 가능합니다.`,
    });
  }
  if (constraints.pageMultiple && config.pageCount % constraints.pageMultiple !== 0) {
    warnings.push({
      code: 'BINDING_PAGE_MULTIPLE',
      message: `${config.bindingType} 제본은 ${constraints.pageMultiple}의 배수 페이지여야 합니다.`,
    });
  }

  // 책등 폭 계산
  const spineWidth = (config.pageCount / 2) * paperThickness + bindingMargin;

  // 책등 폭 경고
  if (spineWidth < 5) {
    warnings.push({
      code: 'SPINE_TOO_NARROW',
      message: '책등 폭이 5mm 미만입니다. 텍스트 배치에 주의하세요.',
    });
  }

  return {
    spineWidth: Math.round(spineWidth * 100) / 100, // 소수점 둘째자리까지
    paperThickness,
    bindingMargin,
    warnings,
  };
}

// ============================================================================
// 권한 관련 타입
// ============================================================================

/**
 * 사용자 유형별 권한
 */
export interface UserPermissions {
  canEdit: boolean;                // 기본 편집 권한
  canAddDeletePages: boolean;      // 페이지 추가/삭제
  canReplaceTemplate: boolean;     // 템플릿 교체
  canUnlockElements: boolean;      // 잠금 요소 해제
  canChangeStatus: boolean;        // 상태 변경 (review, submitted)
  canViewAllSessions: boolean;     // 모든 세션 조회
}

/**
 * 역할별 기본 권한
 */
export const ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  [UserRole.CUSTOMER]: {
    canEdit: true,
    canAddDeletePages: true,
    canReplaceTemplate: true,
    canUnlockElements: false,
    canChangeStatus: false,
    canViewAllSessions: false,
  },
  [UserRole.MANAGER]: {
    canEdit: true,
    canAddDeletePages: true,
    canReplaceTemplate: true,
    canUnlockElements: true,
    canChangeStatus: true,
    canViewAllSessions: true,
  },
  [UserRole.ADMIN]: {
    canEdit: true,
    canAddDeletePages: true,
    canReplaceTemplate: true,
    canUnlockElements: true,
    canChangeStatus: true,
    canViewAllSessions: true,
  },
  [UserRole.SUPER_ADMIN]: {
    canEdit: true,
    canAddDeletePages: true,
    canReplaceTemplate: true,
    canUnlockElements: true,
    canChangeStatus: true,
    canViewAllSessions: true,
  },
};
