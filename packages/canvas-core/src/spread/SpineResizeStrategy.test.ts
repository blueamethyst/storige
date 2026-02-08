import { describe, it, expect, beforeEach } from 'vitest'
import {
  getSpineResizeStrategy,
  TextResizeStrategy,
  ImageResizeStrategy,
  GroupWithTextResizeStrategy,
  DefaultResizeStrategy,
} from './SpineResizeStrategy'
import type { SpreadRegion } from '@storige/types'

// ============================================================================
// Test Helpers
// ============================================================================

const createMockRegion = (x: number, width: number, height: number): SpreadRegion => ({
  type: 'spine',
  position: 'spine',
  x,
  width,
  height,
  widthMm: (width * 25.4) / 300,
  heightMm: (height * 25.4) / 300,
  label: '책등',
})

const createMockTextObject = (): fabric.Object => ({
  type: 'i-text',
  scaleX: 1,
  scaleY: 1,
  meta: {},
} as unknown as fabric.Object)

const createMockImageObject = (): fabric.Object => ({
  type: 'image',
  scaleX: 1,
  scaleY: 1,
  stroke: '#000',
  strokeWidth: 2,
  meta: {},
  set: (key: string, value: any) => {
    // Mock set method
  },
} as unknown as fabric.Object)

const createMockGroupObject = (containsText = false): fabric.Object => ({
  type: 'group',
  scaleX: 1,
  scaleY: 1,
  meta: { containsText },
  getObjects: () => {
    if (containsText) {
      return [createMockTextObject()]
    }
    return [{ type: 'rect' } as fabric.Object]
  },
} as unknown as fabric.Object)

const createMockRectObject = (): fabric.Object => ({
  type: 'rect',
  scaleX: 1,
  scaleY: 1,
  meta: {},
} as unknown as fabric.Object)

// ============================================================================
// getSpineResizeStrategy Tests
// ============================================================================

describe('SpineResizeStrategy - getSpineResizeStrategy', () => {
  it('i-text 타입: TextResizeStrategy 반환', () => {
    const obj = createMockTextObject()
    const strategy = getSpineResizeStrategy(obj)

    expect(strategy).toBeInstanceOf(TextResizeStrategy)
  })

  it('textbox 타입: TextResizeStrategy 반환', () => {
    const obj = { ...createMockTextObject(), type: 'textbox' }
    const strategy = getSpineResizeStrategy(obj)

    expect(strategy).toBeInstanceOf(TextResizeStrategy)
  })

  it('image 타입: ImageResizeStrategy 반환', () => {
    const obj = createMockImageObject()
    const strategy = getSpineResizeStrategy(obj)

    expect(strategy).toBeInstanceOf(ImageResizeStrategy)
  })

  it('group (텍스트 포함): GroupWithTextResizeStrategy 반환', () => {
    const obj = createMockGroupObject(true)
    const strategy = getSpineResizeStrategy(obj)

    expect(strategy).toBeInstanceOf(GroupWithTextResizeStrategy)
  })

  it('group (텍스트 미포함): DefaultResizeStrategy 반환', () => {
    const obj = createMockGroupObject(false)
    const strategy = getSpineResizeStrategy(obj)

    expect(strategy).toBeInstanceOf(DefaultResizeStrategy)
  })

  it('rect 타입: DefaultResizeStrategy 반환', () => {
    const obj = createMockRectObject()
    const strategy = getSpineResizeStrategy(obj)

    expect(strategy).toBeInstanceOf(DefaultResizeStrategy)
  })
})

// ============================================================================
// TextResizeStrategy Tests
// ============================================================================

describe('SpineResizeStrategy - TextResizeStrategy', () => {
  it('스케일 변경 없음: scaleX, scaleY 반환 안 함', () => {
    const strategy = new TextResizeStrategy()
    const obj = createMockTextObject()
    const oldRegion = createMockRegion(100, 50, 200)
    const newRegion = createMockRegion(100, 80, 200) // 1.6배 증가

    const result = strategy.apply(obj, oldRegion, newRegion)

    expect(result.scaleX).toBeUndefined()
    expect(result.scaleY).toBeUndefined()
  })

  it('중앙 재정렬: 새 spine 영역 중앙으로 이동', () => {
    const strategy = new TextResizeStrategy()
    const obj = createMockTextObject()
    const oldRegion = createMockRegion(100, 50, 200)
    const newRegion = createMockRegion(100, 80, 200)

    const result = strategy.apply(obj, oldRegion, newRegion)

    const expectedX = newRegion.x + newRegion.width / 2
    const expectedY = newRegion.height / 2

    expect(result.x).toBe(expectedX)
    expect(result.y).toBe(expectedY)
  })

  it('spine 폭 감소 시에도 중앙 정렬 유지', () => {
    const strategy = new TextResizeStrategy()
    const obj = createMockTextObject()
    const oldRegion = createMockRegion(100, 80, 200)
    const newRegion = createMockRegion(100, 50, 200) // 0.625배 감소

    const result = strategy.apply(obj, oldRegion, newRegion)

    const expectedX = newRegion.x + newRegion.width / 2
    const expectedY = newRegion.height / 2

    expect(result.x).toBe(expectedX)
    expect(result.y).toBe(expectedY)
    expect(result.scaleX).toBeUndefined()
    expect(result.scaleY).toBeUndefined()
  })
})

// ============================================================================
// ImageResizeStrategy Tests
// ============================================================================

describe('SpineResizeStrategy - ImageResizeStrategy', () => {
  it('비례 스케일 적용: ratio = newWidth / oldWidth', () => {
    const strategy = new ImageResizeStrategy()
    const obj = createMockImageObject()
    obj.scaleX = 1.5
    obj.scaleY = 1.5

    const oldRegion = createMockRegion(100, 50, 200)
    const newRegion = createMockRegion(100, 80, 200) // 1.6배 증가

    const result = strategy.apply(obj, oldRegion, newRegion)

    const expectedRatio = 80 / 50
    const expectedScaleX = 1.5 * expectedRatio
    const expectedScaleY = 1.5 * expectedRatio

    expect(result.scaleX).toBeCloseTo(expectedScaleX, 5)
    expect(result.scaleY).toBeCloseTo(expectedScaleY, 5)
  })

  it('중앙 정렬 + 비례 스케일', () => {
    const strategy = new ImageResizeStrategy()
    const obj = createMockImageObject()
    const oldRegion = createMockRegion(100, 50, 200)
    const newRegion = createMockRegion(100, 80, 200)

    const result = strategy.apply(obj, oldRegion, newRegion)

    const expectedX = newRegion.x + newRegion.width / 2
    const expectedY = newRegion.height / 2

    expect(result.x).toBe(expectedX)
    expect(result.y).toBe(expectedY)
  })

  it('strokeUniform 강제 적용: stroke가 있으면', () => {
    const strategy = new ImageResizeStrategy()
    const obj = createMockImageObject()

    let strokeUniformSet = false
    obj.set = (key: string, value: any) => {
      if (key === 'strokeUniform' && value === true) {
        strokeUniformSet = true
      }
    }

    const oldRegion = createMockRegion(100, 50, 200)
    const newRegion = createMockRegion(100, 80, 200)

    strategy.apply(obj, oldRegion, newRegion)

    expect(strokeUniformSet).toBe(true)
  })

  it('spine 폭 감소 시에도 비례 스케일', () => {
    const strategy = new ImageResizeStrategy()
    const obj = createMockImageObject()
    obj.scaleX = 2.0
    obj.scaleY = 2.0

    const oldRegion = createMockRegion(100, 80, 200)
    const newRegion = createMockRegion(100, 50, 200) // 0.625배 감소

    const result = strategy.apply(obj, oldRegion, newRegion)

    const expectedRatio = 50 / 80
    const expectedScaleX = 2.0 * expectedRatio
    const expectedScaleY = 2.0 * expectedRatio

    expect(result.scaleX).toBeCloseTo(expectedScaleX, 5)
    expect(result.scaleY).toBeCloseTo(expectedScaleY, 5)
  })
})

// ============================================================================
// GroupWithTextResizeStrategy Tests
// ============================================================================

describe('SpineResizeStrategy - GroupWithTextResizeStrategy', () => {
  it('스케일 변경 없음: scaleX, scaleY 반환 안 함', () => {
    const strategy = new GroupWithTextResizeStrategy()
    const obj = createMockGroupObject(true)
    const oldRegion = createMockRegion(100, 50, 200)
    const newRegion = createMockRegion(100, 80, 200)

    const result = strategy.apply(obj, oldRegion, newRegion)

    expect(result.scaleX).toBeUndefined()
    expect(result.scaleY).toBeUndefined()
  })

  it('중앙 재정렬만 수행', () => {
    const strategy = new GroupWithTextResizeStrategy()
    const obj = createMockGroupObject(true)
    const oldRegion = createMockRegion(100, 50, 200)
    const newRegion = createMockRegion(100, 80, 200)

    const result = strategy.apply(obj, oldRegion, newRegion)

    const expectedX = newRegion.x + newRegion.width / 2
    const expectedY = newRegion.height / 2

    expect(result.x).toBe(expectedX)
    expect(result.y).toBe(expectedY)
  })

  it('그룹 풀기 없음: 하위 객체 건드리지 않음', () => {
    const strategy = new GroupWithTextResizeStrategy()
    const obj = createMockGroupObject(true)
    const oldRegion = createMockRegion(100, 50, 200)
    const newRegion = createMockRegion(100, 80, 200)

    const objectsBefore = obj.getObjects?.() || []
    strategy.apply(obj, oldRegion, newRegion)
    const objectsAfter = obj.getObjects?.() || []

    // 그룹 구조 변경 없음 (테스트에서는 참조 동일성 확인)
    expect(objectsAfter).toEqual(objectsBefore)
  })
})

// ============================================================================
// DefaultResizeStrategy Tests
// ============================================================================

describe('SpineResizeStrategy - DefaultResizeStrategy', () => {
  it('비례 스케일 적용: ratio = newWidth / oldWidth', () => {
    const strategy = new DefaultResizeStrategy()
    const obj = createMockRectObject()
    obj.scaleX = 1.2
    obj.scaleY = 1.2

    const oldRegion = createMockRegion(100, 50, 200)
    const newRegion = createMockRegion(100, 75, 200) // 1.5배 증가

    const result = strategy.apply(obj, oldRegion, newRegion)

    const expectedRatio = 75 / 50
    const expectedScaleX = 1.2 * expectedRatio
    const expectedScaleY = 1.2 * expectedRatio

    expect(result.scaleX).toBeCloseTo(expectedScaleX, 5)
    expect(result.scaleY).toBeCloseTo(expectedScaleY, 5)
  })

  it('중앙 정렬 + 비례 스케일', () => {
    const strategy = new DefaultResizeStrategy()
    const obj = createMockRectObject()
    const oldRegion = createMockRegion(100, 50, 200)
    const newRegion = createMockRegion(100, 75, 200)

    const result = strategy.apply(obj, oldRegion, newRegion)

    const expectedX = newRegion.x + newRegion.width / 2
    const expectedY = newRegion.height / 2

    expect(result.x).toBe(expectedX)
    expect(result.y).toBe(expectedY)
  })

  it('그룹 (텍스트 미포함): 비례 스케일 허용', () => {
    const strategy = new DefaultResizeStrategy()
    const obj = createMockGroupObject(false)
    obj.scaleX = 1.0
    obj.scaleY = 1.0

    const oldRegion = createMockRegion(100, 50, 200)
    const newRegion = createMockRegion(100, 100, 200) // 2배 증가

    const result = strategy.apply(obj, oldRegion, newRegion)

    expect(result.scaleX).toBeCloseTo(2.0, 5)
    expect(result.scaleY).toBeCloseTo(2.0, 5)
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe('SpineResizeStrategy - Edge Cases', () => {
  it('scaleX/scaleY가 undefined인 객체: 1로 간주', () => {
    const strategy = new ImageResizeStrategy()
    const obj = createMockImageObject()
    obj.scaleX = undefined
    obj.scaleY = undefined

    const oldRegion = createMockRegion(100, 50, 200)
    const newRegion = createMockRegion(100, 100, 200)

    const result = strategy.apply(obj, oldRegion, newRegion)

    const expectedRatio = 100 / 50
    expect(result.scaleX).toBeCloseTo(expectedRatio, 5)
    expect(result.scaleY).toBeCloseTo(expectedRatio, 5)
  })

  it('spine 폭이 동일: ratio=1, 스케일 변경 없음', () => {
    const strategy = new DefaultResizeStrategy()
    const obj = createMockRectObject()
    obj.scaleX = 1.5
    obj.scaleY = 1.5

    const oldRegion = createMockRegion(100, 50, 200)
    const newRegion = createMockRegion(100, 50, 200) // 동일

    const result = strategy.apply(obj, oldRegion, newRegion)

    expect(result.scaleX).toBeCloseTo(1.5, 5)
    expect(result.scaleY).toBeCloseTo(1.5, 5)
  })

  it('그룹 containsText 캐싱: 재귀 판정 1회만', () => {
    const obj = createMockGroupObject(false)
    obj.meta = {} // 캐시 초기화

    let getObjectsCalled = 0
    obj.getObjects = () => {
      getObjectsCalled++
      return [{ type: 'rect' } as fabric.Object]
    }

    const strategy1 = getSpineResizeStrategy(obj)
    const strategy2 = getSpineResizeStrategy(obj)

    // 첫 호출에서만 getObjects 실행, 이후 캐시 사용
    expect(getObjectsCalled).toBe(1)
  })
})
