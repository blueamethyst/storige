import { apiClient } from './client';
import { TemplateSetType } from '@storige/types';
import { isAiEnabled } from '../config/features';

/**
 * AI 기능 비활성화 시 에러
 */
class AiDisabledError extends Error {
  constructor() {
    super('AI features are disabled. Set VITE_AI_ENABLED=true to enable.');
    this.name = 'AiDisabledError';
  }
}

/**
 * AI 기능 활성화 확인 래퍼
 */
function requireAiEnabled(): void {
  if (!isAiEnabled()) {
    throw new AiDisabledError();
  }
}

// ==================== 타입 정의 ====================

export interface ColorPalette {
  primary?: string;
  secondary?: string[];
  accent?: string;
}

export interface UserPreferenceInput {
  preferredStyles?: string[];
  preferredColors?: ColorPalette;
  preferredFonts?: string[];
  industryCategory?: string;
  usageContext?: string;
  preferredComplexity?: 'minimal' | 'moderate' | 'complex';
  preferredMood?: 'professional' | 'casual' | 'playful' | 'elegant';
}

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

// ==================== API 함수 ====================

export const aiApi = {
  /**
   * AI 기능 활성화 여부 확인
   */
  isEnabled: isAiEnabled,

  // 추천
  getRecommendations: async (
    request: RecommendationRequest = {},
  ): Promise<RecommendationResponse> => {
    requireAiEnabled();
    const response = await apiClient.post<RecommendationResponse>(
      '/ai/recommendations',
      request,
    );
    return response.data;
  },

  setPreferences: async (
    preferences: UserPreferenceInput,
  ): Promise<{ success: boolean }> => {
    requireAiEnabled();
    const response = await apiClient.post<{ success: boolean }>(
      '/ai/preferences',
      preferences,
    );
    return response.data;
  },

  submitFeedback: async (
    feedback: FeedbackRequest,
  ): Promise<{ success: boolean }> => {
    requireAiEnabled();
    const response = await apiClient.post<{ success: boolean }>(
      '/ai/feedback',
      feedback,
    );
    return response.data;
  },

  // 생성
  startGeneration: async (
    request: GenerationRequest,
  ): Promise<GenerationStartResponse> => {
    requireAiEnabled();
    const response = await apiClient.post<GenerationStartResponse>(
      '/ai/generate',
      request,
    );
    return response.data;
  },

  getGenerationStatus: async (
    generationId: string,
  ): Promise<GenerationStatusResponse> => {
    requireAiEnabled();
    const response = await apiClient.get<GenerationStatusResponse>(
      `/ai/generate/${generationId}`,
    );
    return response.data;
  },

  acceptGeneration: async (
    generationId: string,
    accept: GenerationAccept = {},
  ): Promise<{ templateSetId: string }> => {
    requireAiEnabled();
    const response = await apiClient.post<{ templateSetId: string }>(
      `/ai/generate/${generationId}/accept`,
      accept,
    );
    return response.data;
  },

  rejectGeneration: async (
    generationId: string,
    reject: GenerationReject = {},
  ): Promise<{ success: boolean }> => {
    requireAiEnabled();
    const response = await apiClient.post<{ success: boolean }>(
      `/ai/generate/${generationId}/reject`,
      reject,
    );
    return response.data;
  },

  getGenerationHistory: async (
    limit?: number,
  ): Promise<GenerationHistoryItem[]> => {
    requireAiEnabled();
    const response = await apiClient.get<GenerationHistoryItem[]>(
      '/ai/generate/history',
      { params: { limit } },
    );
    return response.data;
  },
};
