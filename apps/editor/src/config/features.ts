/**
 * Feature flags configuration
 * 환경변수 기반 기능 활성화/비활성화
 */

export const features = {
  /**
   * AI 기능 활성화 여부
   * - 템플릿 추천
   * - 템플릿 생성
   *
   * 환경변수: VITE_AI_ENABLED (default: false)
   */
  ai: import.meta.env.VITE_AI_ENABLED === 'true',

  /**
   * 이미지 처리 기능 활성화 여부
   */
  imageProcessing: import.meta.env.VITE_ENABLE_IMAGE_PROCESSING === 'true',
} as const;

/**
 * AI 기능이 활성화되어 있는지 확인
 */
export function isAiEnabled(): boolean {
  return features.ai;
}

/**
 * 개발 환경에서 기능 플래그 로깅
 */
if (import.meta.env.DEV) {
  console.log('[Features]', {
    ai: features.ai,
    imageProcessing: features.imageProcessing,
  });
}
