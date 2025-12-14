// Context
export {
  AiProvider,
  useAiContext,
  useAiApi,
  useAiEnabled,
  type AiApiClient,
  type AiConfig,
  type AiContextValue,
  type AiProviderProps,
} from './context/AiContext';

// Components
export { AiPanel } from './components/AiPanel';
export { GenerationPanel, type GenerationPanelProps } from './components/GenerationPanel';
export { RecommendationPanel, type RecommendationPanelProps } from './components/RecommendationPanel';
export { LazyAiPanel, type AiPanelProps } from './components/LazyAiPanel';

// Re-export shared types
export * from '../shared';
