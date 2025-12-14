import { createContext, useContext, ReactNode } from 'react';
import type {
  RecommendationRequest,
  RecommendationResponse,
  FeedbackRequest,
  GenerationRequest,
  GenerationStartResponse,
  GenerationStatusResponse,
  GenerationAccept,
  GenerationReject,
  UserPreferenceInput,
} from '../../shared';

/**
 * AI API 인터페이스
 */
export interface AiApiClient {
  // 추천
  getRecommendations(request?: RecommendationRequest): Promise<RecommendationResponse>;
  setPreferences(preferences: UserPreferenceInput): Promise<{ success: boolean }>;
  submitFeedback(feedback: FeedbackRequest): Promise<{ success: boolean }>;

  // 생성
  startGeneration(request: GenerationRequest): Promise<GenerationStartResponse>;
  getGenerationStatus(generationId: string): Promise<GenerationStatusResponse>;
  acceptGeneration(generationId: string, accept?: GenerationAccept): Promise<{ templateSetId: string }>;
  rejectGeneration(generationId: string, reject?: GenerationReject): Promise<{ success: boolean }>;
}

/**
 * AI 설정 인터페이스
 */
export interface AiConfig {
  isEnabled: () => boolean;
}

/**
 * AI Context 값
 */
export interface AiContextValue {
  api: AiApiClient;
  config: AiConfig;
}

const AiContext = createContext<AiContextValue | null>(null);

/**
 * AI Provider Props
 */
export interface AiProviderProps {
  api: AiApiClient;
  config?: AiConfig;
  children: ReactNode;
}

/**
 * AI Context Provider
 *
 * @example
 * ```tsx
 * import { AiProvider, AiPanel } from '@storige/ai/client';
 * import { aiApi } from './api/ai';
 *
 * function App() {
 *   return (
 *     <AiProvider api={aiApi} config={{ isEnabled: () => true }}>
 *       <AiPanel />
 *     </AiProvider>
 *   );
 * }
 * ```
 */
export function AiProvider({ api, config, children }: AiProviderProps) {
  const value: AiContextValue = {
    api,
    config: config ?? { isEnabled: () => true },
  };

  return <AiContext.Provider value={value}>{children}</AiContext.Provider>;
}

/**
 * AI Context Hook
 */
export function useAiContext(): AiContextValue {
  const context = useContext(AiContext);
  if (!context) {
    throw new Error('useAiContext must be used within an AiProvider');
  }
  return context;
}

/**
 * AI API Hook
 */
export function useAiApi(): AiApiClient {
  const { api } = useAiContext();
  return api;
}

/**
 * AI 활성화 여부 Hook
 */
export function useAiEnabled(): boolean {
  const { config } = useAiContext();
  return config.isEnabled();
}
