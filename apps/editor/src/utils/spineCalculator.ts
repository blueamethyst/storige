/**
 * 책등 너비 동적 계산 유틸리티
 * 내지 수에 따라 책등 너비를 계산하고 캔버스에 적용합니다.
 */
import { spineApi } from '@/api'
import { useAppStore } from '@/stores/useAppStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { mmToPxDisplay } from '@storige/canvas-core'
import type { fabric } from 'fabric'

// Fabric.js Object 확장 타입
interface ExtendedFabricObject extends fabric.Object {
  id?: string
}

// 템플릿 메타데이터 타입
interface TemplateMetadata {
  type?: 'cover' | 'spine' | 'page' | 'wing'
  [key: string]: unknown
}

export interface RecalculateSpineOptions {
  paperType: string
  bindingType: string
  templateSetHeight?: number  // 템플릿셋 높이 (mm)
}

export interface RecalculateSpineResult {
  success: boolean
  spineWidth: number | null
  pageCount: number
  warnings: Array<{ code: string; message: string }>
  error?: string
}

/**
 * 템플릿의 타입을 가져옵니다.
 * editorTemplates 저장 시 pageType 필드에 저장되거나, 원본 type 필드가 있을 수 있습니다.
 */
function getTemplateType(template: any): string | undefined {
  // pageType 필드 우선 확인 (useEditorContents에서 매핑된 경우)
  if (template?.pageType) {
    return template.pageType
  }
  // 원본 type 필드 확인
  if (template?.type && template.type !== 'template') {
    return template.type
  }
  // metadata 내부 확인
  if (template?.metadata?.type) {
    return template.metadata.type
  }
  return undefined
}

/**
 * 현재 에디터의 내지(page) 템플릿 개수를 계산합니다.
 * 실제 allCanvas 배열에서 page 타입만 카운트합니다.
 */
export function countPageTemplates(): number {
  const editorTemplates = useSettingsStore.getState().editorTemplates
  const allCanvas = useAppStore.getState().allCanvas
  const actualCanvasCount = allCanvas.length

  if (!editorTemplates || editorTemplates.length === 0) {
    // editorTemplates가 없으면 모든 캔버스를 page로 간주
    return actualCanvasCount
  }

  // editorTemplates에서 page가 아닌 타입(spine, wing, cover 등)의 수를 카운트
  const nonPageCount = editorTemplates.filter((t: any) => {
    const templateType = getTemplateType(t)
    return templateType && templateType !== 'page'
  }).length

  // 실제 캔버스 수에서 비-page 템플릿 수를 빼서 page 수 계산
  // (삭제된 페이지도 반영됨)
  const pageCount = actualCanvasCount - nonPageCount

  return pageCount > 0 ? pageCount : 0
}

/**
 * spine 템플릿의 인덱스를 찾습니다.
 */
export function findSpineTemplateIndex(): number {
  const editorTemplates = useSettingsStore.getState().editorTemplates

  if (!editorTemplates || editorTemplates.length === 0) {
    return -1
  }

  return editorTemplates.findIndex((t: any) => {
    const templateType = getTemplateType(t)
    return templateType === 'spine'
  })
}

/**
 * 책등 너비를 재계산하고 캔버스에 적용합니다.
 *
 * @param options - 계산에 필요한 옵션 (paperType, bindingType)
 * @returns 계산 결과
 */
export async function recalculateSpineWidth(
  options?: Partial<RecalculateSpineOptions>
): Promise<RecalculateSpineResult> {
  const settingsStore = useSettingsStore.getState()
  const spineConfig = settingsStore.spineConfig

  // paperType과 bindingType 결정 (옵션 > 스토어 > null)
  const paperType = options?.paperType || spineConfig.paperType
  const bindingType = options?.bindingType || spineConfig.bindingType

  if (!paperType || !bindingType) {
    console.log('[SpineCalculator] paperType 또는 bindingType이 설정되지 않음, 책등 계산 스킵')
    return {
      success: false,
      spineWidth: null,
      pageCount: 0,
      warnings: [],
      error: 'paperType 또는 bindingType이 설정되지 않았습니다.',
    }
  }

  // spine 템플릿 인덱스 찾기
  const spineTemplateIndex = findSpineTemplateIndex()

  if (spineTemplateIndex === -1) {
    console.log('[SpineCalculator] spine 템플릿이 없음, 책등 계산 스킵')
    return {
      success: false,
      spineWidth: null,
      pageCount: 0,
      warnings: [],
      error: 'spine 템플릿이 없습니다.',
    }
  }

  // 내지 페이지 수 계산 (양면 인쇄이므로 × 2)
  const pageTemplateCount = countPageTemplates()
  const pageCount = pageTemplateCount * 2

  console.log(`[SpineCalculator] 책등 너비 계산: pageCount=${pageCount}, paperType=${paperType}, bindingType=${bindingType}`)

  try {
    // API로 책등 폭 계산
    const spineResult = await spineApi.calculate({
      pageCount,
      paperType,
      bindingType,
    })

    console.log(`[SpineCalculator] 계산된 책등 너비: ${spineResult.spineWidth}mm`)

    // 경고 메시지 출력
    if (spineResult.warnings.length > 0) {
      spineResult.warnings.forEach((warning: { message: string }) => {
        console.warn(`[SpineCalculator] 경고: ${warning.message}`)
      })
    }

    // 책등 캔버스 크기 업데이트
    const appStore = useAppStore.getState()
    const spineEditor = appStore.allEditors[spineTemplateIndex]
    const spineCanvas = appStore.allCanvas[spineTemplateIndex]

    if (spineEditor && spineCanvas) {
      const workspacePlugin = spineEditor.getPlugin<any>('WorkspacePlugin')
      if (workspacePlugin) {
        const newWidthPx = mmToPxDisplay(spineResult.spineWidth)
        const currentHeight = options?.templateSetHeight ||
          workspacePlugin._options?.size?.height ||
          297  // 기본값 A4 높이

        console.log(`[SpineCalculator] 책등 workspace 크기 변경: width=${newWidthPx}px (${spineResult.spineWidth}mm)`)

        // workspace 객체 찾아서 크기 변경
        const workspaceObj = spineCanvas.getObjects().find((obj: fabric.Object) =>
          (obj as ExtendedFabricObject).id === 'workspace'
        )

        if (workspaceObj) {
          const heightPx = mmToPxDisplay(currentHeight)

          // workspace 객체 크기 업데이트
          workspaceObj.set({
            width: newWidthPx,
            height: heightPx,
            scaleX: 1,
            scaleY: 1,
          })
          workspaceObj.setCoords()

          // 플러그인 내부 옵션 업데이트
          if (workspacePlugin._options?.size) {
            workspacePlugin._options.size.width = spineResult.spineWidth
          }

          // 렌더링 및 줌 조정
          spineCanvas.requestRenderAll()
          if (workspacePlugin.setZoomAuto) {
            workspacePlugin.setZoomAuto()
          }

          console.log('[SpineCalculator] 책등 workspace 크기 변경 완료')
        }
      }
    }

    // 스토어에 계산된 값 저장
    settingsStore.setSpineConfig({
      paperType,
      bindingType,
      calculatedSpineWidth: spineResult.spineWidth,
    })

    return {
      success: true,
      spineWidth: spineResult.spineWidth,
      pageCount,
      warnings: spineResult.warnings,
    }
  } catch (error) {
    console.error('[SpineCalculator] 책등 계산 오류:', error)
    return {
      success: false,
      spineWidth: null,
      pageCount,
      warnings: [],
      error: error instanceof Error ? error.message : '책등 계산 중 오류가 발생했습니다.',
    }
  }
}

/**
 * 초기 로딩 시 spineConfig를 설정합니다.
 */
export function initSpineConfig(paperType: string | null, bindingType: string | null): void {
  const settingsStore = useSettingsStore.getState()
  settingsStore.setSpineConfig({
    paperType: paperType || null,
    bindingType: bindingType || null,
  })
  console.log(`[SpineCalculator] spineConfig 초기화: paperType=${paperType}, bindingType=${bindingType}`)
}
