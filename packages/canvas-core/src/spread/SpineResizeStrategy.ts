/**
 * SpineResizeStrategy
 *
 * 책등 리사이즈 시 객체 타입별 처리 전략
 * - i-text/Textbox: 스케일 금지, 중앙 재정렬만
 * - Image: 비례 스케일 + strokeUniform/strokeWidth 보정
 * - Group (텍스트 포함): 스케일 금지, 중앙 재정렬만
 * - Group (텍스트 미포함): 비례 스케일
 * - 기타 (Rect, Path 등): 비례 스케일
 */

import type { SpreadRegion } from '@storige/types'

// ============================================================================
// Type Guards
// ============================================================================

/**
 * 텍스트 타입 판정
 */
function isTextObject(obj: fabric.Object): boolean {
  const type = obj.type
  return type === 'i-text' || type === 'textbox' || type === 'text'
}

/**
 * 이미지 타입 판정
 */
function isImageObject(obj: fabric.Object): boolean {
  return obj.type === 'image'
}

/**
 * 그룹 타입 판정
 */
function isGroupObject(obj: fabric.Object): obj is fabric.Group {
  return obj.type === 'group'
}

/**
 * 그룹 내 텍스트 포함 여부 판정 (재귀)
 */
function containsText(obj: fabric.Object): boolean {
  // 캐싱된 결과가 있으면 사용
  if (obj.meta?.containsText !== undefined) {
    return obj.meta.containsText as boolean
  }

  if (isTextObject(obj)) {
    return true
  }

  if (isGroupObject(obj)) {
    const group = obj as fabric.Group
    const objects = group.getObjects()
    const hasText = objects.some((child) => containsText(child))

    // 캐싱
    if (!obj.meta) {
      obj.meta = {}
    }
    obj.meta.containsText = hasText

    return hasText
  }

  return false
}

// ============================================================================
// Strategy Interface
// ============================================================================

export interface ResizeResult {
  x: number
  y: number
  scaleX?: number
  scaleY?: number
}

export interface SpineResizeStrategy {
  apply(
    obj: fabric.Object,
    oldRegion: SpreadRegion,
    newRegion: SpreadRegion
  ): ResizeResult
}

// ============================================================================
// Concrete Strategies
// ============================================================================

/**
 * 텍스트 리사이즈 전략: 스케일 금지, 중앙 재정렬만
 */
export class TextResizeStrategy implements SpineResizeStrategy {
  apply(
    obj: fabric.Object,
    oldRegion: SpreadRegion,
    newRegion: SpreadRegion
  ): ResizeResult {
    // 새 spine 영역 중앙으로 이동
    const newCenterX = newRegion.x + newRegion.width / 2
    const newCenterY = newRegion.height / 2

    return {
      x: newCenterX,
      y: newCenterY,
      // scaleX, scaleY 변경 없음 (폰트 렌더링 품질 보존)
    }
  }
}

/**
 * 이미지 리사이즈 전략: 비례 스케일 + strokeUniform/strokeWidth 보정
 */
export class ImageResizeStrategy implements SpineResizeStrategy {
  apply(
    obj: fabric.Object,
    oldRegion: SpreadRegion,
    newRegion: SpreadRegion
  ): ResizeResult {
    const ratio = newRegion.width / oldRegion.width

    // 현재 스케일 유지하면서 비례 조정
    const currentScaleX = obj.scaleX ?? 1
    const currentScaleY = obj.scaleY ?? 1

    const newScaleX = currentScaleX * ratio
    const newScaleY = currentScaleY * ratio

    // 새 spine 영역 중앙으로 이동
    const newCenterX = newRegion.x + newRegion.width / 2
    const newCenterY = newRegion.height / 2

    // strokeUniform 강제 적용 (MVP 보정)
    if (obj.stroke && obj.strokeWidth) {
      obj.set('strokeUniform', true)
    }

    return {
      x: newCenterX,
      y: newCenterY,
      scaleX: newScaleX,
      scaleY: newScaleY,
    }
  }
}

/**
 * 그룹 (텍스트 포함) 리사이즈 전략: 스케일 금지, 중앙 재정렬만
 */
export class GroupWithTextResizeStrategy implements SpineResizeStrategy {
  apply(
    obj: fabric.Object,
    oldRegion: SpreadRegion,
    newRegion: SpreadRegion
  ): ResizeResult {
    // 텍스트가 포함된 그룹은 스케일하지 않음
    // (그룹 풀기 없이 중앙 재정렬만)
    const newCenterX = newRegion.x + newRegion.width / 2
    const newCenterY = newRegion.height / 2

    return {
      x: newCenterX,
      y: newCenterY,
      // scaleX, scaleY 변경 없음
    }
  }
}

/**
 * 기타 객체 (그룹 포함) 리사이즈 전략: 비례 스케일 허용
 */
export class DefaultResizeStrategy implements SpineResizeStrategy {
  apply(
    obj: fabric.Object,
    oldRegion: SpreadRegion,
    newRegion: SpreadRegion
  ): ResizeResult {
    const ratio = newRegion.width / oldRegion.width

    const currentScaleX = obj.scaleX ?? 1
    const currentScaleY = obj.scaleY ?? 1

    const newScaleX = currentScaleX * ratio
    const newScaleY = currentScaleY * ratio

    const newCenterX = newRegion.x + newRegion.width / 2
    const newCenterY = newRegion.height / 2

    return {
      x: newCenterX,
      y: newCenterY,
      scaleX: newScaleX,
      scaleY: newScaleY,
    }
  }
}

// ============================================================================
// Strategy Factory
// ============================================================================

/**
 * 객체 타입에 따른 리사이즈 전략 선택
 */
export function getSpineResizeStrategy(obj: fabric.Object): SpineResizeStrategy {
  // 1. 텍스트: 스케일 금지
  if (isTextObject(obj)) {
    return new TextResizeStrategy()
  }

  // 2. 이미지: 비례 스케일 + strokeUniform 보정
  if (isImageObject(obj)) {
    return new ImageResizeStrategy()
  }

  // 3. 그룹 (텍스트 포함): 스케일 금지
  if (isGroupObject(obj) && containsText(obj)) {
    return new GroupWithTextResizeStrategy()
  }

  // 4. 기타 (그룹 포함): 비례 스케일 허용
  return new DefaultResizeStrategy()
}
