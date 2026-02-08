/**
 * Template → SpreadSpec 변환 유틸리티
 *
 * 관리자가 입력한 최소 스펙(Template.spreadConfig.spec)과
 * product_sizes의 cutSize/safeSize를 결합하여
 * 완전한 SpreadSpec을 생성합니다.
 */

import type { SpreadSpec, SpreadConfig, Template } from '@storige/types'

export interface BuildSpreadSpecOptions {
  /** Template (spread 타입) */
  template: Template
  /** 상품 스펙의 재단 여백 (mm) */
  cutSizeMm?: number
  /** 상품 스펙의 안전 여백 (mm) */
  safeSizeMm?: number
  /** DPI (기본값: 150) */
  dpi?: number
}

/**
 * Template에서 SpreadSpec 추출
 *
 * @param options - 빌드 옵션
 * @returns SpreadSpec 또는 null (spread 타입이 아니면)
 * @throws {Error} spreadConfig 필수 필드 누락 시
 */
export function buildSpreadSpec(options: BuildSpreadSpecOptions): SpreadSpec | null {
  const { template, cutSizeMm = 2, safeSizeMm = 3, dpi = 150 } = options

  // spread 타입이 아니면 null 반환
  if (template.type !== 'spread') {
    return null
  }

  // spreadConfig 존재 확인
  if (!template.spreadConfig) {
    throw new Error(`Template ${template.id} is type=spread but missing spreadConfig`)
  }

  const config: SpreadConfig = template.spreadConfig

  // 필수 필드 검증
  if (!config.spec) {
    throw new Error(`Template ${template.id} spreadConfig.spec is missing`)
  }

  const { spec } = config

  // 필수 필드 존재 확인
  if (
    typeof spec.coverWidthMm !== 'number' ||
    typeof spec.coverHeightMm !== 'number' ||
    typeof spec.wingEnabled !== 'boolean' ||
    typeof spec.wingWidthMm !== 'number'
  ) {
    throw new Error(
      `Template ${template.id} spreadConfig.spec is missing required fields (coverWidthMm, coverHeightMm, wingEnabled, wingWidthMm)`
    )
  }

  // 완전한 SpreadSpec 생성 (저장된 값 + 상품 스펙 보완)
  const spreadSpec: SpreadSpec = {
    coverWidthMm: spec.coverWidthMm,
    coverHeightMm: spec.coverHeightMm,
    spineWidthMm: spec.spineWidthMm || 0, // 초기값, 나중에 계산됨
    wingEnabled: spec.wingEnabled,
    wingWidthMm: spec.wingWidthMm,
    cutSizeMm: spec.cutSizeMm || cutSizeMm, // 저장된 값 우선, 없으면 상품 스펙
    safeSizeMm: spec.safeSizeMm || safeSizeMm,
    dpi: spec.dpi || dpi,
  }

  return spreadSpec
}

/**
 * SpreadSpec 유효성 검사
 *
 * @param spec - 검사할 SpreadSpec
 * @returns 유효하면 true
 * @throws {Error} 유효하지 않으면 에러
 */
export function validateSpreadSpec(spec: SpreadSpec): boolean {
  if (spec.coverWidthMm <= 0 || spec.coverHeightMm <= 0) {
    throw new Error('coverWidth and coverHeight must be positive')
  }

  if (spec.spineWidthMm < 0) {
    throw new Error('spineWidth must be non-negative')
  }

  if (spec.wingEnabled && spec.wingWidthMm <= 0) {
    throw new Error('wingWidth must be positive when wingEnabled=true')
  }

  if (spec.cutSizeMm < 0 || spec.safeSizeMm < 0) {
    throw new Error('cutSize and safeSize must be non-negative')
  }

  if (spec.dpi <= 0) {
    throw new Error('dpi must be positive')
  }

  return true
}
