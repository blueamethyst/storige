/**
 * @pf/color-runtime stub
 * LCMS2 기반 색상 변환 라이브러리의 스텁 구현
 * 실제 라이브러리가 없을 때 레거시 폴백을 사용하도록 에러를 발생시킴
 */

export const cmykToRgb = async () => {
  throw new Error('@pf/color-runtime is not available - using legacy fallback')
}

export const rgbToCmyk = async () => {
  throw new Error('@pf/color-runtime is not available - using legacy fallback')
}

export default {
  cmykToRgb,
  rgbToCmyk,
}
