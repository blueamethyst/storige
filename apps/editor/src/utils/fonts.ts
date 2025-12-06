import fontData from '@/data/fonts.json'

export interface FontSource {
  name: string
  file: string
}

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

// JSON에서 폰트 리스트 로드
export const fontList: FontSource[] = fontData

// 폰트 이름으로 폰트 찾기
export const findFontByName = (name: string): FontSource | undefined => {
  return fontList.find((f) => f.name === name || f.name.toLowerCase() === name.toLowerCase())
}
