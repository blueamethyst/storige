// Lazy loaded (recommended - supports tree-shaking)
export { LazyAiPanel, useAiEnabled } from './LazyAiPanel';

// Direct imports (only use if AI_ENABLED is guaranteed)
// These will be tree-shaken if LazyAiPanel is used instead
export { RecommendationPanel } from './RecommendationPanel';
export { GenerationPanel } from './GenerationPanel';
export { AiPanel } from './AiPanel';
