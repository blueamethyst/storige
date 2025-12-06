import fontData from '@/data/fonts.json'

export interface FontSource {
  name: string
  file: string
}

export const DEFAULT_FONT_FAMILY = '본고딕(Noto Sans) Regular'

// 폰트 리스트 (JSON에서 로드)
export const fontList: FontSource[] = fontData as FontSource[]

// 폰트 리스트를 반환하는 함수
export const getFontList = (): FontSource[] => fontList

// 폰트 URL 생성
export const getFontUrl = (fileName: string): string | undefined => {
  try {
    // 공백을 +로 변환
    const encodedFileName = fileName.replace(/ /g, '+')
    return `https://cdn.webeasy.co.kr/fonts/${encodedFileName}`
  } catch (e) {
    console.error(`Error creating URL path for font: ${fileName}`, e)
    return undefined
  }
}

// 폰트 이름으로 검색
export const findFontByName = (name: string): FontSource | undefined => {
  const normalizedName = name.trim().toLowerCase()
  return fontList.find((font) => font.name.toLowerCase() === normalizedName)
}

// 폰트 검색
export const searchFonts = (searchTerm: string): FontSource[] => {
  if (!searchTerm.trim()) return fontList

  const normalizedTerm = searchTerm.toLowerCase().trim()
  return fontList.filter((font) => font.name.toLowerCase().includes(normalizedTerm))
}
