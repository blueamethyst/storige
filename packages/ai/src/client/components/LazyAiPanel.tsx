import { lazy, Suspense } from 'react';
import { useAiEnabled } from '../context/AiContext';

/**
 * AI 패널 Props
 */
export interface AiPanelProps {
  templateType?: 'book' | 'leaflet';
  dimensions?: { width: number; height: number };
  onSelectTemplate?: (templateSetId: string) => void;
  onGenerated?: (templateSetId: string) => void;
}

/**
 * Lazy loaded AI Panel
 */
const LazyAiPanelComponent = lazy(() =>
  import('./AiPanel').then((module) => ({
    default: module.AiPanel,
  })),
);

/**
 * 로딩 스피너
 */
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
    </div>
  );
}

/**
 * AI 패널 래퍼 (조건부 렌더링 + Lazy Loading)
 *
 * 사용법:
 * ```tsx
 * import { AiProvider, LazyAiPanel } from '@storige/ai/client';
 *
 * // AiProvider 내에서 사용
 * <AiProvider api={aiApi}>
 *   <LazyAiPanel
 *     templateType="book"
 *     onSelectTemplate={(id) => console.log(id)}
 *   />
 * </AiProvider>
 * ```
 */
export function LazyAiPanel(props: AiPanelProps) {
  const isEnabled = useAiEnabled();

  // AI 기능이 비활성화되어 있으면 렌더링하지 않음
  if (!isEnabled) {
    return null;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <LazyAiPanelComponent {...props} />
    </Suspense>
  );
}
