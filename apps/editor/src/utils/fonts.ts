// 하위 호환성을 위해 fontManager에서 re-export
export type { FontSource } from './fontManager'
export {
  DEFAULT_FONT_FAMILY,
  getFontUrl,
  getFontList,
  getFontListAsSource,
  findFontByName,
  searchFonts,
  loadFonts,
  refreshFonts,
  isFontsLoaded,
  resolveStorageUrl,
} from './fontManager'

// fontList는 이제 비동기로 로드되므로, 동기적 접근은 빈 배열 반환
// getFontList() 또는 loadFonts()를 사용하세요
import { getFontListAsSource } from './fontManager'
export const fontList = getFontListAsSource()
