/**
 * @storige/types
 * Shared TypeScript types for Storige system
 */

// ============================================================================
// User & Authentication
// ============================================================================

export enum UserRole {
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

export interface Template {
  id: string;
  name: string;
  categoryId: string;
  editCode?: string;
  templateCode?: string;
  thumbnailUrl?: string;
  canvasData: CanvasData;
  isActive: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateSet {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  productSpecs: ProductSpecs;
  items: TemplateSetItem[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateSetItem {
  id: string;
  templateSetId: string;
  templateId: string;
  sortOrder: number;
}

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
  [key: string]: any;
}

export interface EditSession {
  id: string;
  userId?: string;
  templateId?: string;
  canvasData: CanvasData;
  orderOptions?: OrderOptions;
  status: 'DRAFT' | 'COMPLETED';
  createdAt: Date;
  updatedAt: Date;
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
  isActive: boolean;
  createdAt: Date;
}

export interface LibraryClipart {
  id: string;
  name: string;
  fileUrl: string;
  thumbnailUrl?: string;
  category?: string;
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
