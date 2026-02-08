import { describe, it, expect } from 'vitest'
import {
  computeLayout,
  computeResizedLayout,
  resolveRegionAtX,
  computeObjectReposition,
  resolveRegionRef,
} from './SpreadLayoutEngine'
import type {
  SpreadSpec,
  SpreadLayout,
  SpreadRegion,
  SpreadRegionPosition,
  ObjectAnchor,
} from '@storige/types'

// ============================================================================
// Test Helpers
// ============================================================================

const createBasicSpec = (spineWidthMm = 7.5): SpreadSpec => ({
  coverWidthMm: 210,
  coverHeightMm: 297,
  spineWidthMm,
  wingEnabled: true,
  wingWidthMm: 60,
  cutSizeMm: 3,
  safeSizeMm: 5,
  dpi: 300,
})

const createNoWingSpec = (spineWidthMm = 7.5): SpreadSpec => ({
  coverWidthMm: 210,
  coverHeightMm: 297,
  spineWidthMm,
  wingEnabled: false,
  wingWidthMm: 0,
  cutSizeMm: 3,
  safeSizeMm: 5,
  dpi: 300,
})

const mmToPx = (mm: number, dpi: number): number => (mm / 25.4) * dpi

// ============================================================================
// computeLayout Tests
// ============================================================================

describe('SpreadLayoutEngine - computeLayout', () => {
  it('날개 포함: 5개 영역 생성 (back-wing, back-cover, spine, front-cover, front-wing)', () => {
    const spec = createBasicSpec()
    const layout = computeLayout(spec)

    expect(layout.regions).toHaveLength(5)
    expect(layout.regions[0].position).toBe('back-wing')
    expect(layout.regions[1].position).toBe('back-cover')
    expect(layout.regions[2].position).toBe('spine')
    expect(layout.regions[3].position).toBe('front-cover')
    expect(layout.regions[4].position).toBe('front-wing')
  })

  it('날개 미포함: 3개 영역 생성 (back-cover, spine, front-cover)', () => {
    const spec = createNoWingSpec()
    const layout = computeLayout(spec)

    expect(layout.regions).toHaveLength(3)
    expect(layout.regions[0].position).toBe('back-cover')
    expect(layout.regions[1].position).toBe('spine')
    expect(layout.regions[2].position).toBe('front-cover')
  })

  it('총 폭 계산: wingWidth*2 + coverWidth*2 + spineWidth', () => {
    const spec = createBasicSpec(7.5)
    const layout = computeLayout(spec)

    const expectedMm = 60 * 2 + 210 * 2 + 7.5
    expect(layout.totalWidthMm).toBe(expectedMm)
  })

  it('총 높이 계산: coverHeight와 동일', () => {
    const spec = createBasicSpec()
    const layout = computeLayout(spec)

    expect(layout.totalHeightMm).toBe(spec.coverHeightMm)
  })

  it('영역 좌표 순차 배치: x 좌표가 좌→우 순서로 증가', () => {
    const spec = createBasicSpec()
    const layout = computeLayout(spec)

    let prevX = -1
    for (const region of layout.regions) {
      expect(region.x).toBeGreaterThan(prevX)
      prevX = region.x
    }
  })

  it('mm → px 변환 정확성', () => {
    const spec = createBasicSpec()
    const layout = computeLayout(spec)

    const expectedTotalWidthPx = mmToPx(layout.totalWidthMm, spec.dpi)
    expect(layout.totalWidthPx).toBeCloseTo(expectedTotalWidthPx, 1)

    const expectedTotalHeightPx = mmToPx(spec.coverHeightMm, spec.dpi)
    expect(layout.totalHeightPx).toBeCloseTo(expectedTotalHeightPx, 1)
  })

  it('가이드라인 생성: 영역 수 - 1개', () => {
    const spec = createBasicSpec()
    const layout = computeLayout(spec)

    expect(layout.guides).toHaveLength(layout.regions.length - 1)
  })

  it('가이드라인 x 좌표: 영역 경계와 일치', () => {
    const spec = createBasicSpec()
    const layout = computeLayout(spec)

    for (let i = 0; i < layout.guides.length; i++) {
      const guide = layout.guides[i]
      const region = layout.regions[i]
      const expectedX = region.x + region.width

      expect(guide.x).toBeCloseTo(expectedX, 1)
    }
  })

  it('치수 라벨 생성: 영역 수와 동일', () => {
    const spec = createBasicSpec()
    const layout = computeLayout(spec)

    expect(layout.labels).toHaveLength(layout.regions.length)
  })

  it('치수 라벨 x 좌표: 영역 중앙', () => {
    const spec = createBasicSpec()
    const layout = computeLayout(spec)

    for (let i = 0; i < layout.labels.length; i++) {
      const label = layout.labels[i]
      const region = layout.regions[i]
      const expectedX = region.x + region.width / 2

      expect(label.x).toBeCloseTo(expectedX, 1)
    }
  })

  it('치수 라벨 텍스트: mm 단위로 표시', () => {
    const spec = createBasicSpec()
    const layout = computeLayout(spec)

    for (const label of layout.labels) {
      expect(label.text).toMatch(/^\d+(\.\d+)?mm$/)
    }
  })

  it('영역 타입 판정: wing/cover/spine 올바르게 설정', () => {
    const spec = createBasicSpec()
    const layout = computeLayout(spec)

    expect(layout.regions.find((r) => r.position === 'back-wing')?.type).toBe('wing')
    expect(layout.regions.find((r) => r.position === 'back-cover')?.type).toBe('cover')
    expect(layout.regions.find((r) => r.position === 'spine')?.type).toBe('spine')
    expect(layout.regions.find((r) => r.position === 'front-cover')?.type).toBe('cover')
    expect(layout.regions.find((r) => r.position === 'front-wing')?.type).toBe('wing')
  })

  it('영역 라벨 텍스트: 한글 라벨 올바르게 설정', () => {
    const spec = createBasicSpec()
    const layout = computeLayout(spec)

    expect(layout.regions.find((r) => r.position === 'back-wing')?.label).toBe('뒷날개')
    expect(layout.regions.find((r) => r.position === 'back-cover')?.label).toBe('뒷표지')
    expect(layout.regions.find((r) => r.position === 'spine')?.label).toBe('책등')
    expect(layout.regions.find((r) => r.position === 'front-cover')?.label).toBe('앞표지')
    expect(layout.regions.find((r) => r.position === 'front-wing')?.label).toBe('앞날개')
  })
})

// ============================================================================
// computeResizedLayout Tests
// ============================================================================

describe('SpreadLayoutEngine - computeResizedLayout', () => {
  it('spine 폭만 변경되고 나머지는 유지', () => {
    const spec = createBasicSpec(7.5)
    const oldLayout = computeLayout(spec)
    const newLayout = computeResizedLayout(oldLayout, spec, 10.0)

    expect(newLayout.totalWidthMm).toBeGreaterThan(oldLayout.totalWidthMm)

    const spineRegionOld = oldLayout.regions.find((r) => r.position === 'spine')!
    const spineRegionNew = newLayout.regions.find((r) => r.position === 'spine')!

    expect(spineRegionNew.widthMm).toBe(10.0)
    expect(spineRegionOld.widthMm).toBe(7.5)
  })

  it('spine 폭 증가: front-cover와 front-wing이 우측으로 이동', () => {
    const spec = createBasicSpec(7.5)
    const oldLayout = computeLayout(spec)
    const newLayout = computeResizedLayout(oldLayout, spec, 10.0)

    const frontCoverOld = oldLayout.regions.find((r) => r.position === 'front-cover')!
    const frontCoverNew = newLayout.regions.find((r) => r.position === 'front-cover')!

    expect(frontCoverNew.x).toBeGreaterThan(frontCoverOld.x)
  })

  it('spine 폭 감소: front-cover와 front-wing이 좌측으로 이동', () => {
    const spec = createBasicSpec(10.0)
    const oldLayout = computeLayout(spec)
    const newLayout = computeResizedLayout(oldLayout, spec, 7.5)

    const frontCoverOld = oldLayout.regions.find((r) => r.position === 'front-cover')!
    const frontCoverNew = newLayout.regions.find((r) => r.position === 'front-cover')!

    expect(frontCoverNew.x).toBeLessThan(frontCoverOld.x)
  })

  it('back-wing과 back-cover 위치 변동 없음', () => {
    const spec = createBasicSpec(7.5)
    const oldLayout = computeLayout(spec)
    const newLayout = computeResizedLayout(oldLayout, spec, 10.0)

    const backWingOld = oldLayout.regions.find((r) => r.position === 'back-wing')!
    const backWingNew = newLayout.regions.find((r) => r.position === 'back-wing')!
    const backCoverOld = oldLayout.regions.find((r) => r.position === 'back-cover')!
    const backCoverNew = newLayout.regions.find((r) => r.position === 'back-cover')!

    expect(backWingNew.x).toBe(backWingOld.x)
    expect(backCoverNew.x).toBe(backCoverOld.x)
  })
})

// ============================================================================
// resolveRegionAtX Tests
// ============================================================================

describe('SpreadLayoutEngine - resolveRegionAtX', () => {
  it('x 좌표가 영역 내부: 해당 영역 반환', () => {
    const spec = createBasicSpec()
    const layout = computeLayout(spec)

    const spineRegion = layout.regions.find((r) => r.position === 'spine')!
    const midX = spineRegion.x + spineRegion.width / 2

    const result = resolveRegionAtX(layout.regions, midX)

    expect(result).not.toBeNull()
    expect(result?.position).toBe('spine')
  })

  it('x 좌표가 영역 외부: null 반환', () => {
    const spec = createBasicSpec()
    const layout = computeLayout(spec)

    const result = resolveRegionAtX(layout.regions, -100)

    expect(result).toBeNull()
  })

  it('영역 경계(좌측): 해당 영역 포함', () => {
    const spec = createBasicSpec()
    const layout = computeLayout(spec)

    const spineRegion = layout.regions.find((r) => r.position === 'spine')!
    const result = resolveRegionAtX(layout.regions, spineRegion.x)

    expect(result?.position).toBe('spine')
  })

  it('영역 경계(우측): 다음 영역 포함', () => {
    const spec = createBasicSpec()
    const layout = computeLayout(spec)

    const spineRegion = layout.regions.find((r) => r.position === 'spine')!
    const boundaryX = spineRegion.x + spineRegion.width
    const result = resolveRegionAtX(layout.regions, boundaryX)

    expect(result?.position).not.toBe('spine')
  })
})

// ============================================================================
// computeObjectReposition Tests
// ============================================================================

describe('SpreadLayoutEngine - computeObjectReposition', () => {
  it('자유 객체 (regionRef=null, canvas anchor): 절대좌표 유지', () => {
    const spec = createBasicSpec(7.5)
    const oldLayout = computeLayout(spec)
    const newLayout = computeResizedLayout(oldLayout, spec, 10.0)

    const result = computeObjectReposition(
      {
        regionRef: null,
        anchor: { kind: 'canvas', x: 500, y: 300 },
      },
      { left: 490, top: 290, width: 20, height: 20 },
      oldLayout,
      newLayout
    )

    expect(result.x).toBe(500)
    expect(result.y).toBe(300)
    expect(result.regionRef).toBeNull()
  })

  it('영역 객체 (regionRef=spine, region anchor): 영역 기준 재배치', () => {
    const spec = createBasicSpec(7.5)
    const oldLayout = computeLayout(spec)
    const newLayout = computeResizedLayout(oldLayout, spec, 10.0)

    const oldSpine = oldLayout.regions.find((r) => r.position === 'spine')!
    const newSpine = newLayout.regions.find((r) => r.position === 'spine')!

    const result = computeObjectReposition(
      {
        regionRef: 'spine',
        anchor: { kind: 'region', xNorm: 0.5, yNorm: 0.5 },
      },
      { left: oldSpine.x, top: 0, width: 20, height: 20 },
      oldLayout,
      newLayout
    )

    expect(result.x).toBeCloseTo(newSpine.x + newSpine.width * 0.5, 1)
    expect(result.y).toBeCloseTo(newSpine.height * 0.5, 1)
    expect(result.regionRef).toBe('spine')
  })

  it('영역 객체 (front-cover): 영역 이동과 함께 이동', () => {
    const spec = createBasicSpec(7.5)
    const oldLayout = computeLayout(spec)
    const newLayout = computeResizedLayout(oldLayout, spec, 10.0)

    const oldFrontCover = oldLayout.regions.find((r) => r.position === 'front-cover')!
    const newFrontCover = newLayout.regions.find((r) => r.position === 'front-cover')!

    const result = computeObjectReposition(
      {
        regionRef: 'front-cover',
        anchor: { kind: 'region', xNorm: 0.5, yNorm: 0.5 },
      },
      { left: oldFrontCover.x, top: 0, width: 20, height: 20 },
      oldLayout,
      newLayout
    )

    expect(result.x).toBeCloseTo(newFrontCover.x + newFrontCover.width * 0.5, 1)
    expect(result.regionRef).toBe('front-cover')
  })

  it('xNorm/yNorm 범위 클램핑: -1.0 ~ 2.0', () => {
    const spec = createBasicSpec()
    const layout = computeLayout(spec)

    const result = computeObjectReposition(
      {
        regionRef: 'spine',
        anchor: { kind: 'region', xNorm: 3.0, yNorm: -2.0 }, // 범위 초과
      },
      { left: 0, top: 0, width: 20, height: 20 },
      layout,
      layout
    )

    expect(result.anchor).toMatchObject({
      kind: 'region',
      xNorm: 2.0, // 클램핑됨
      yNorm: -1.0, // 클램핑됨
    })
  })

  it('영역 비활성화 (wing 제거): 자유 객체로 강등', () => {
    const specWithWing = createBasicSpec()
    const specNoWing = createNoWingSpec()

    const oldLayout = computeLayout(specWithWing)
    const newLayout = computeLayout(specNoWing)

    const result = computeObjectReposition(
      {
        regionRef: 'front-wing',
        anchor: { kind: 'region', xNorm: 0.5, yNorm: 0.5 },
      },
      { left: 0, top: 0, width: 20, height: 20 },
      oldLayout,
      newLayout
    )

    expect(result.regionRef).toBeNull()
    expect(result.anchor.kind).toBe('canvas')
  })
})

// ============================================================================
// resolveRegionRef Tests (Hysteresis)
// ============================================================================

describe('SpreadLayoutEngine - resolveRegionRef (Hysteresis)', () => {
  it('승격 (null → region): 90% 이상 포함 시', () => {
    const spec = createBasicSpec()
    const layout = computeLayout(spec)

    const spineRegion = layout.regions.find((r) => r.position === 'spine')!

    // spine 영역의 95% 포함
    const boundingRect = {
      left: spineRegion.x + spineRegion.width * 0.025,
      top: spineRegion.height * 0.025,
      width: spineRegion.width * 0.95,
      height: spineRegion.height * 0.95,
    }

    const result = resolveRegionRef(layout.regions, boundingRect, null)

    expect(result.regionRef).toBe('spine')
  })

  it('승격 실패: 90% 미만이면 자유 객체 유지', () => {
    const spec = createBasicSpec()
    const layout = computeLayout(spec)

    const spineRegion = layout.regions.find((r) => r.position === 'spine')!
    const backCover = layout.regions.find((r) => r.position === 'back-cover')!

    // 객체가 back-cover와 spine에 걸쳐 있음
    // back-cover에 45%, spine에 45% 포함 (각각 90% 미만)
    const objectWidth = spineRegion.width + backCover.width * 0.1
    const objectHeight = spineRegion.height
    const boundingRect = {
      left: backCover.x + backCover.width - backCover.width * 0.05, // back-cover 5%
      top: 0,
      width: objectWidth,
      height: objectHeight,
    }

    // 실제 포함율 계산
    // back-cover overlap: backCover.width * 0.05
    // spine overlap: spineRegion.width
    // object area: objectWidth * objectHeight
    // back-cover ratio: (backCover.width * 0.05) / objectWidth
    // spine ratio: spineRegion.width / objectWidth
    // 둘 다 90% 미만이어야 함

    const result = resolveRegionRef(layout.regions, boundingRect, null)

    expect(result.regionRef).toBeNull()
  })

  it('유지 (region → region): 70% 이상이면 regionRef 유지', () => {
    const spec = createBasicSpec()
    const layout = computeLayout(spec)

    const spineRegion = layout.regions.find((r) => r.position === 'spine')!

    // spine 영역의 75% 포함
    const boundingRect = {
      left: spineRegion.x + spineRegion.width * 0.125,
      top: spineRegion.height * 0.125,
      width: spineRegion.width * 0.75,
      height: spineRegion.height * 0.75,
    }

    const result = resolveRegionRef(layout.regions, boundingRect, 'spine')

    expect(result.regionRef).toBe('spine')
  })

  it('강등 (region → null): 70% 미만이면 자유 객체로', () => {
    const spec = createBasicSpec()
    const layout = computeLayout(spec)

    const spineRegion = layout.regions.find((r) => r.position === 'spine')!
    const backCover = layout.regions.find((r) => r.position === 'back-cover')!

    // 객체가 back-cover와 spine에 걸쳐 있음
    // spine에 60% 포함 (70% 미만)
    const objectWidth = spineRegion.width * 1.5 // spine보다 1.5배 큰 객체
    const objectHeight = spineRegion.height
    const boundingRect = {
      left: backCover.x + backCover.width - objectWidth * 0.1, // back-cover 10%, spine 90%
      top: 0,
      width: objectWidth,
      height: objectHeight,
    }

    // spine overlap: spineRegion.width
    // object area: objectWidth * objectHeight
    // spine ratio: spineRegion.width / objectWidth = 1 / 1.5 = 66.7% < 70%

    const result = resolveRegionRef(layout.regions, boundingRect, 'spine')

    expect(result.regionRef).toBeNull()
  })

  it('primaryRegionHint: 가장 많이 겹치는 영역', () => {
    const spec = createBasicSpec()
    const layout = computeLayout(spec)

    const backCover = layout.regions.find((r) => r.position === 'back-cover')!
    const spine = layout.regions.find((r) => r.position === 'spine')!

    // back-cover 60%, spine 30% 걸침
    const boundingRect = {
      left: backCover.x + backCover.width * 0.6,
      top: 0,
      width: spine.width * 0.3 + backCover.width * 0.6,
      height: backCover.height,
    }

    const result = resolveRegionRef(layout.regions, boundingRect, null)

    expect(result.primaryRegionHint).toBe('back-cover')
  })

  it('겹침 없음: regionRef=null, primaryRegionHint=null', () => {
    const spec = createBasicSpec()
    const layout = computeLayout(spec)

    // 캔버스 밖
    const boundingRect = {
      left: -100,
      top: -100,
      width: 50,
      height: 50,
    }

    const result = resolveRegionRef(layout.regions, boundingRect, null)

    expect(result.regionRef).toBeNull()
    expect(result.primaryRegionHint).toBeNull()
  })

  it('anchor 계산: regionRef 있으면 region anchor, 없으면 canvas anchor', () => {
    const spec = createBasicSpec()
    const layout = computeLayout(spec)

    const spineRegion = layout.regions.find((r) => r.position === 'spine')!

    // 95% 포함 → regionRef='spine'
    const boundingRect = {
      left: spineRegion.x + spineRegion.width * 0.025,
      top: spineRegion.height * 0.025,
      width: spineRegion.width * 0.95,
      height: spineRegion.height * 0.95,
    }

    const result = resolveRegionRef(layout.regions, boundingRect, null)

    expect(result.anchor.kind).toBe('region')
    if (result.anchor.kind === 'region') {
      expect(result.anchor.xNorm).toBeGreaterThan(0)
      expect(result.anchor.xNorm).toBeLessThan(1)
    }
  })

  it('anchor xNorm/yNorm 범위 클램핑: -1.0 ~ 2.0', () => {
    const spec = createBasicSpec()
    const layout = computeLayout(spec)

    const spineRegion = layout.regions.find((r) => r.position === 'spine')!

    // spine 영역 밖 (xNorm > 2.0)
    const boundingRect = {
      left: spineRegion.x + spineRegion.width * 2.5,
      top: spineRegion.height * 0.5,
      width: 20,
      height: 20,
    }

    const result = resolveRegionRef(layout.regions, boundingRect, 'spine')

    // 70% 미만이므로 강등 → canvas anchor
    expect(result.regionRef).toBeNull()
  })
})
