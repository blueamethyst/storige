/**
 * SpreadLayout 기반 영역 crop 유틸리티
 *
 * SpreadLayout.regions에서 region별 crop 좌표를 계산합니다.
 * 3D 목업 등에서 스프레드 전체 스크린샷을 영역별로 crop할 때 사용합니다.
 */

import type { SpreadLayout, SpreadRegion, SpreadRegionPosition } from '@storige/types'

/**
 * Crop 영역 (픽셀 좌표)
 */
export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * 영역별 crop 좌표 맵
 */
export type RegionCropMap = Record<SpreadRegionPosition, CropRect>

/**
 * SpreadLayout에서 영역별 crop 좌표 계산
 *
 * @param layout - SpreadLayout (SpreadLayoutEngine 산출물)
 * @param screenshotWidth - 스크린샷 이미지 폭 (px)
 * @param screenshotHeight - 스크린샷 이미지 높이 (px)
 * @returns 영역별 crop 좌표 맵
 *
 * @example
 * ```ts
 * const layout = SpreadLayoutEngine.computeLayout(spec)
 * const screenshot = canvas.toDataURL()
 * const img = new Image()
 * img.onload = () => {
 *   const crops = calculateRegionCrops(layout, img.width, img.height)
 *   // crops['front-cover'] → { x, y, width, height }
 * }
 * img.src = screenshot
 * ```
 */
export function calculateRegionCrops(
  layout: SpreadLayout,
  screenshotWidth: number,
  screenshotHeight: number
): RegionCropMap {
  const crops: Partial<RegionCropMap> = {}

  // 스크린샷과 layout 크기 비율 계산
  const scaleX = screenshotWidth / layout.totalWidthPx
  const scaleY = screenshotHeight / layout.totalHeightPx

  for (const region of layout.regions) {
    crops[region.position] = {
      x: Math.round(region.x * scaleX),
      y: 0, // SpreadRegion은 전체 높이이므로 y는 항상 0
      width: Math.round(region.width * scaleX),
      height: Math.round(region.height * scaleY),
    }
  }

  return crops as RegionCropMap
}

/**
 * 특정 영역의 crop 좌표 계산
 *
 * @param layout - SpreadLayout
 * @param position - 영역 위치
 * @param screenshotWidth - 스크린샷 이미지 폭 (px)
 * @param screenshotHeight - 스크린샷 이미지 높이 (px)
 * @returns Crop 좌표 또는 null (해당 영역 없음)
 */
export function calculateRegionCrop(
  layout: SpreadLayout,
  position: SpreadRegionPosition,
  screenshotWidth: number,
  screenshotHeight: number
): CropRect | null {
  const region = layout.regions.find((r) => r.position === position)
  if (!region) {
    return null
  }

  const scaleX = screenshotWidth / layout.totalWidthPx
  const scaleY = screenshotHeight / layout.totalHeightPx

  return {
    x: Math.round(region.x * scaleX),
    y: 0,
    width: Math.round(region.width * scaleX),
    height: Math.round(region.height * scaleY),
  }
}

/**
 * Canvas 요소에서 영역별 이미지 추출
 *
 * @param canvas - HTMLCanvasElement (스크린샷)
 * @param layout - SpreadLayout
 * @returns 영역별 Data URL 맵
 */
export function extractRegionImages(
  canvas: HTMLCanvasElement,
  layout: SpreadLayout
): Record<SpreadRegionPosition, string> {
  const crops = calculateRegionCrops(layout, canvas.width, canvas.height)
  const images: Partial<Record<SpreadRegionPosition, string>> = {}

  const tempCanvas = document.createElement('canvas')
  const ctx = tempCanvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to create temporary canvas context')
  }

  for (const [position, crop] of Object.entries(crops) as [SpreadRegionPosition, CropRect][]) {
    tempCanvas.width = crop.width
    tempCanvas.height = crop.height

    ctx.drawImage(
      canvas,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      crop.width,
      crop.height
    )

    images[position] = tempCanvas.toDataURL('image/png')
  }

  return images as Record<SpreadRegionPosition, string>
}
