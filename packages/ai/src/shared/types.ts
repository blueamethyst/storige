// ==================== 템플릿 타입 ====================

/**
 * 템플릿셋 타입 (AI 패키지 전용)
 * @storige/types의 TemplateSetType과 호환됨
 */
export type TemplateSetType = 'book' | 'leaflet';

// ==================== 색상 ====================

export interface ColorPalette {
  primary?: string;
  secondary?: string[];
  accent?: string;
}

// ==================== 사용자 선호도 ====================

export interface UserPreferenceInput {
  preferredStyles?: string[];
  preferredColors?: ColorPalette;
  preferredFonts?: string[];
  industryCategory?: string;
  usageContext?: string;
  preferredComplexity?: 'minimal' | 'moderate' | 'complex';
  preferredMood?: 'professional' | 'casual' | 'playful' | 'elegant';
}

// ==================== 추천 ====================

export interface RecommendationRequest {
  preferences?: UserPreferenceInput;
  templateType?: TemplateSetType;
  limit?: number;
  categoryId?: string;
}

export interface RecommendationItem {
  templateSetId: string;
  name: string;
  thumbnailUrl: string | null;
  score: number;
  reasons: string[];
  type: TemplateSetType;
  width: number;
  height: number;
}

export interface RecommendationResponse {
  recommendations: RecommendationItem[];
  totalCount: number;
  preferenceSource: 'input' | 'saved' | 'default';
}

export interface FeedbackRequest {
  templateSetId: string;
  type: 'like' | 'dislike';
  context?: 'recommendation' | 'generation' | 'browse';
  recommendationRank?: number;
  comment?: string;
}

// ==================== 생성 ====================

export interface GenerationOptions {
  templateType: 'book' | 'leaflet';
  pageCount: number;
  style: 'minimal' | 'modern' | 'elegant' | 'playful' | 'professional';
  colorScheme: string;
  dimensions: {
    width: number;
    height: number;
  };
  includeImages?: boolean;
  industryCategory?: string;
}

export interface GenerationRequest {
  prompt: string;
  options: GenerationOptions;
}

export type GenerationStatus =
  | 'pending'
  | 'layout'
  | 'images'
  | 'assembly'
  | 'completed'
  | 'failed';

export interface GenerationStartResponse {
  generationId: string;
  status: GenerationStatus;
  estimatedTime: number;
  statusUrl: string;
}

export interface GenerationStatusResponse {
  id: string;
  status: GenerationStatus;
  progress: number;
  statusMessage?: string;
  estimatedTimeRemaining?: number;
  templateSetId?: string;
  thumbnailUrl?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface GenerationAccept {
  name?: string;
  rating?: number;
  feedback?: string;
}

export interface GenerationReject {
  reason?: string;
  requestRegenerate?: boolean;
}

export interface GenerationHistoryItem {
  id: string;
  prompt: string;
  status: GenerationStatus;
  thumbnailUrl?: string;
  templateSetId?: string;
  createdAt: string;
  userAccepted?: boolean;
}
