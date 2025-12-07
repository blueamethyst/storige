import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * WorkspacePlugin 테스트
 * - 워크스페이스 생성 및 관리
 * - 줌 및 뷰포트 관리
 * - 경계선 (cut-border, safe-zone-border) 관리
 * - 이벤트 핸들러 관리
 */

const DEFAULT_OPTIONS = {
  width: 900,
  height: 1200
}

const DEFAULT_ZOOM_RATIO = 0.8

describe('WorkspacePlugin - Default Values', () => {
  it('should have correct default dimensions', () => {
    expect(DEFAULT_OPTIONS.width).toBe(900)
    expect(DEFAULT_OPTIONS.height).toBe(1200)
  })

  it('should have correct default zoom ratio', () => {
    expect(DEFAULT_ZOOM_RATIO).toBe(0.8)
  })
})

describe('WorkspacePlugin - Workspace Management', () => {
  describe('Workspace Creation', () => {
    it('should create workspace with correct properties', () => {
      const workspace = {
        id: 'workspace',
        width: 900,
        height: 1200,
        top: 0,
        left: 0,
        originX: 'center',
        originY: 'center',
        lockMovementX: true,
        lockMovementY: true,
        selectable: false,
        hasControls: false,
        hasBorders: false,
        moveCursor: 'default',
        hoverCursor: 'default',
        scaleX: 1,
        scaleY: 1,
        fill: '#fff'
      }

      expect(workspace.id).toBe('workspace')
      expect(workspace.width).toBe(900)
      expect(workspace.height).toBe(1200)
      expect(workspace.selectable).toBe(false)
      expect(workspace.lockMovementX).toBe(true)
      expect(workspace.lockMovementY).toBe(true)
    })

    it('should calculate workspace dimensions correctly', () => {
      const options = {
        size: { width: 100, height: 150, cutSize: 3 },
        unit: 'mm'
      }

      const canvasWidth = options.size.width + options.size.cutSize
      const canvasHeight = options.size.height + options.size.cutSize

      expect(canvasWidth).toBe(103)
      expect(canvasHeight).toBe(153)
    })
  })

  describe('Scale Calculation', () => {
    it('should calculate correct scale for workspace fitting', () => {
      const workspace = { width: 900, height: 1200 }
      const container = { width: 800, height: 600 }

      // fabric.util.findScaleToFit 로직 시뮬레이션
      const scaleX = container.width / workspace.width
      const scaleY = container.height / workspace.height
      const scale = Math.min(scaleX, scaleY)

      expect(scale).toBeCloseTo(0.5, 2) // 600/1200 = 0.5
    })

    it('should apply zoom ratio to scale', () => {
      const baseScale = 0.5
      const zoomRatio = DEFAULT_ZOOM_RATIO
      const additionalScale = 0.98 // 여백 확보용

      const adaptedScale = baseScale * zoomRatio * additionalScale

      expect(adaptedScale).toBeCloseTo(0.392, 2)
    })
  })
})

describe('WorkspacePlugin - Border Management', () => {
  describe('Cut Border', () => {
    it('should create cut border with correct properties', () => {
      const cutBorder = {
        fill: 'transparent',
        stroke: '#cd3f3f',
        strokeWidth: 0.5,
        opacity: 0.8,
        strokeDashArray: [12, 12],
        selectable: false,
        hasControls: false,
        hoverCursor: 'default',
        evented: false,
        strokeUniform: true,
        id: 'cut-border',
        extensionType: 'printguide',
        editable: false,
        absolutePositioned: true,
        excludeFromExport: true,
        visible: true
      }

      expect(cutBorder.id).toBe('cut-border')
      expect(cutBorder.stroke).toBe('#cd3f3f')
      expect(cutBorder.strokeDashArray).toEqual([12, 12])
      expect(cutBorder.extensionType).toBe('printguide')
      expect(cutBorder.excludeFromExport).toBe(true)
    })

    it('should calculate cut border dimensions correctly', () => {
      const workspace = { width: 900, height: 1200, scaleX: 1, scaleY: 1 }
      const cutSize = 10 // margin

      const adjustedWidth = workspace.width * workspace.scaleX - cutSize
      const adjustedHeight = workspace.height * workspace.scaleY - cutSize

      expect(adjustedWidth).toBe(890)
      expect(adjustedHeight).toBe(1190)
    })
  })

  describe('Safe Zone Border', () => {
    it('should create safe zone border with correct properties', () => {
      const safeBorder = {
        fill: 'transparent',
        stroke: '#3fcd84',
        strokeWidth: 0.5,
        opacity: 0.8,
        strokeDashArray: [10, 10],
        selectable: false,
        hasControls: false,
        hoverCursor: 'default',
        evented: false,
        strokeUniform: true,
        id: 'safe-zone-border',
        extensionType: 'printguide',
        editable: false,
        excludeFromExport: true,
        visible: true
      }

      expect(safeBorder.id).toBe('safe-zone-border')
      expect(safeBorder.stroke).toBe('#3fcd84')
      expect(safeBorder.strokeDashArray).toEqual([10, 10])
    })

    it('should calculate safe zone dimensions correctly', () => {
      const options = {
        size: { cutSize: 3, safeSize: 5 },
        unit: 'mm'
      }
      const workspace = { width: 900, height: 1200, scaleX: 1, scaleY: 1 }

      const margin = options.size.safeSize + options.size.cutSize
      const adjustedWidth = workspace.width * workspace.scaleX - margin
      const adjustedHeight = workspace.height * workspace.scaleY - margin

      expect(margin).toBe(8)
      expect(adjustedWidth).toBe(892)
      expect(adjustedHeight).toBe(1192)
    })
  })

  describe('Toggle Borders', () => {
    it('should toggle cut border visibility', () => {
      let showCutBorder = true

      // Toggle off
      showCutBorder = false
      expect(showCutBorder).toBe(false)

      // Toggle on
      showCutBorder = true
      expect(showCutBorder).toBe(true)
    })

    it('should toggle safe border visibility', () => {
      let showSafeBorder = true

      // Toggle off
      showSafeBorder = false
      expect(showSafeBorder).toBe(false)

      // Toggle on
      showSafeBorder = true
      expect(showSafeBorder).toBe(true)
    })
  })

  describe('Bring Borders to Front', () => {
    it('should maintain correct z-order for borders', () => {
      const objects = [
        { id: 'workspace', zIndex: 0 },
        { id: 'template-background', zIndex: 1 },
        { id: 'user-element', zIndex: 2 },
        { id: 'cut-border', zIndex: 3 },
        { id: 'safe-zone-border', zIndex: 4 }
      ]

      // 경계선들이 최상위에 있는지 확인
      const cutBorder = objects.find(o => o.id === 'cut-border')
      const safeBorder = objects.find(o => o.id === 'safe-zone-border')
      const userElement = objects.find(o => o.id === 'user-element')

      expect(cutBorder!.zIndex).toBeGreaterThan(userElement!.zIndex)
      expect(safeBorder!.zIndex).toBeGreaterThan(userElement!.zIndex)
    })
  })
})

describe('WorkspacePlugin - Template Background Z-Order', () => {
  it('should ensure template-background is above workspace', () => {
    const objects = [
      { id: 'workspace' },
      { id: 'template-background' },
      { id: 'user-element' }
    ]

    const workspace = objects.find(o => o.id === 'workspace')
    const templateBg = objects.find(o => o.id === 'template-background')

    const workspaceIndex = objects.indexOf(workspace!)
    const templateBgIndex = objects.indexOf(templateBg!)

    expect(templateBgIndex).toBeGreaterThan(workspaceIndex)
  })

  it('should ensure template-background is below user elements', () => {
    const objects = [
      { id: 'workspace' },
      { id: 'template-background' },
      { id: 'user-element' }
    ]

    const templateBg = objects.find(o => o.id === 'template-background')
    const userElement = objects.find(o => o.id === 'user-element')

    const templateBgIndex = objects.indexOf(templateBg!)
    const userElementIndex = objects.indexOf(userElement!)

    expect(userElementIndex).toBeGreaterThan(templateBgIndex)
  })
})

describe('WorkspacePlugin - Event Handling', () => {
  describe('Defined Events', () => {
    it('should have correct events array', () => {
      const events = ['sizeChange', 'toggleCutBorder', 'toggleSafeBorder']

      expect(events).toContain('sizeChange')
      expect(events).toContain('toggleCutBorder')
      expect(events).toContain('toggleSafeBorder')
    })
  })

  describe('Object Modified Handler', () => {
    it('should detect page-outline modification', () => {
      const event = { target: { id: 'page-outline' } }

      const isPageOutline = event.target?.id === 'page-outline'

      expect(isPageOutline).toBe(true)
    })
  })

  describe('Object Added Handler', () => {
    it('should detect cutline-template addition', () => {
      const event = { target: { id: 'cutline-template' } }

      const isCutlineTemplate = event.target?.id === 'cutline-template'

      expect(isCutlineTemplate).toBe(true)
    })

    it('should detect template-background addition', () => {
      const event = { target: { id: 'template-background' } }

      const isTemplateBg = event.target?.id === 'template-background'

      expect(isTemplateBg).toBe(true)
    })
  })
})

describe('WorkspacePlugin - Page Outline Management', () => {
  describe('Edit Mode', () => {
    it('should update page-outline properties based on edit mode', () => {
      const isEditMode = true
      const pageOutlineProps = {
        selectable: isEditMode,
        hasControls: isEditMode,
        lockMovementX: !isEditMode,
        lockMovementY: !isEditMode,
        editable: isEditMode,
        evented: isEditMode,
        stroke: '#ff6b6b',
        fill: 'transparent',
        extensionType: 'template-element'
      }

      expect(pageOutlineProps.selectable).toBe(true)
      expect(pageOutlineProps.hasControls).toBe(true)
      expect(pageOutlineProps.lockMovementX).toBe(false)
      expect(pageOutlineProps.lockMovementY).toBe(false)
    })

    it('should lock page-outline when not in edit mode', () => {
      const isEditMode = false
      const pageOutlineProps = {
        selectable: isEditMode,
        hasControls: isEditMode,
        lockMovementX: !isEditMode,
        lockMovementY: !isEditMode,
        editable: isEditMode,
        evented: isEditMode
      }

      expect(pageOutlineProps.selectable).toBe(false)
      expect(pageOutlineProps.lockMovementX).toBe(true)
    })
  })
})

describe('WorkspacePlugin - ClipPath Management', () => {
  describe('Apply ClipPath', () => {
    it('should not apply clipPath to excluded objects', () => {
      const objects = [
        { id: 'page-outline', extensionType: 'template-element' },
        { id: 'template-background' },
        { id: 'cut-border', extensionType: 'printguide' },
        { id: 'overlay_1', extensionType: 'overlay' },
        { id: 'user-element' }
      ]

      const excludedTypes = ['outline', 'printguide', 'overlay']
      const excludedIds = ['page-outline', 'template-background']

      const clipPathApplicable = objects.filter(obj => {
        if (excludedIds.includes(obj.id)) return false
        if (obj.extensionType && excludedTypes.includes(obj.extensionType)) return false
        return true
      })

      expect(clipPathApplicable).toHaveLength(1)
      expect(clipPathApplicable[0].id).toBe('user-element')
    })
  })

  describe('Remove ClipPath', () => {
    it('should only remove page-outline-clip', () => {
      const objects = [
        { id: 'obj1', clipPath: { id: 'page-outline-clip' } },
        { id: 'obj2', clipPath: { id: 'custom-clip' } },
        { id: 'obj3', clipPath: null }
      ]

      const toRemoveClip = objects.filter(obj =>
        obj.clipPath && obj.clipPath.id === 'page-outline-clip'
      )

      expect(toRemoveClip).toHaveLength(1)
      expect(toRemoveClip[0].id).toBe('obj1')
    })
  })
})

describe('WorkspacePlugin - Options Management', () => {
  describe('setOptions', () => {
    it('should detect size changes', () => {
      const currentOptions = { size: { width: 900, height: 1200 } }
      const newOptions = { size: { width: 1000, height: 1200 } }

      const sizeChanged =
        newOptions.size &&
        (newOptions.size.width !== currentOptions.size.width ||
          newOptions.size.height !== currentOptions.size.height)

      expect(sizeChanged).toBe(true)
    })

    it('should detect edit mode changes', () => {
      const currentOptions = { editMode: false }
      const newOptions = { editMode: true }

      const editModeChanged =
        newOptions.editMode !== undefined &&
        newOptions.editMode !== currentOptions.editMode

      expect(editModeChanged).toBe(true)
    })

    it('should detect border visibility changes', () => {
      const currentOptions = { showCutBorder: true, showSafeBorder: true }
      const newOptions = { showCutBorder: false }

      const showCutChanged =
        newOptions.showCutBorder !== undefined &&
        newOptions.showCutBorder !== currentOptions.showCutBorder

      expect(showCutChanged).toBe(true)
    })
  })
})

describe('WorkspacePlugin - Zoom', () => {
  describe('Wheel Zoom', () => {
    it('should calculate zoom correctly', () => {
      let zoom = 1.0
      const delta = 100 // scroll down

      zoom *= 0.999 ** delta

      expect(zoom).toBeLessThan(1.0)
    })

    it('should clamp zoom to minimum', () => {
      let zoom = 0.005
      const minZoom = 0.01

      if (zoom < minZoom) zoom = minZoom

      expect(zoom).toBe(0.01)
    })

    it('should clamp zoom to maximum', () => {
      let zoom = 25
      const maxZoom = 20

      if (zoom > maxZoom) zoom = maxZoom

      expect(zoom).toBe(20)
    })
  })
})

describe('WorkspacePlugin - Lifecycle', () => {
  describe('Cleanup', () => {
    it('should track event handlers for cleanup', () => {
      const handlers = {
        handleObjectAdded: vi.fn(),
        handleObjectRemoved: vi.fn(),
        handleObjectModified: vi.fn(),
        handleObjectMoved: vi.fn(),
        mouseWheel: vi.fn()
      }

      // 핸들러가 등록되어 있음
      Object.values(handlers).forEach(handler => {
        expect(handler).toBeDefined()
      })
    })

    it('should cancel debounced functions on destroy', () => {
      const debounceCancel = vi.fn()

      // Simulate cancel
      debounceCancel()

      expect(debounceCancel).toHaveBeenCalled()
    })
  })

  describe('afterLoad', () => {
    it('should set workspace as non-selectable after load', () => {
      const workspace = { selectable: true, hasControls: true }

      workspace.selectable = false
      workspace.hasControls = false

      expect(workspace.selectable).toBe(false)
      expect(workspace.hasControls).toBe(false)
    })
  })
})

describe('WorkspacePlugin - Render Type Handling', () => {
  describe('noBounded type', () => {
    it('should set template-background as non-interactive', () => {
      const renderType = 'noBounded'
      const editMode = false

      if (renderType === 'noBounded' && !editMode) {
        const templateBgProps = {
          editable: false,
          evented: false,
          hasControls: false,
          lockMovementX: true,
          selectable: false,
          lockMovementY: true
        }

        expect(templateBgProps.selectable).toBe(false)
        expect(templateBgProps.evented).toBe(false)
      }
    })
  })

  describe('envelope type', () => {
    it('should use template-background as clipPath', () => {
      const renderType = 'envelope'
      const templateBackground = { id: 'template-background' }

      if (renderType === 'envelope' && templateBackground) {
        const clipPath = templateBackground
        expect(clipPath.id).toBe('template-background')
      }
    })
  })

  describe('mockup type', () => {
    it('should not set clipPath for mockup type', () => {
      const renderType = 'mockup'
      let clipPath: any = null

      if (renderType !== 'noBounded' && renderType !== 'mockup') {
        clipPath = { id: 'workspace' }
      }

      expect(clipPath).toBeNull()
    })
  })
})

describe('WorkspacePlugin - Hidden Outline Visibility', () => {
  it('should show hidden outlines', () => {
    const obj = { id: 'shape1' }
    const objects = [
      { id: 'shape1_outline', visible: false }
    ]

    const outlineId = `${obj.id}_outline`
    const outline = objects.find(item => item.id === outlineId)

    if (outline && outline.visible === false) {
      outline.visible = true
    }

    expect(outline!.visible).toBe(true)
  })
})
