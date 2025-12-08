import Editor from '../Editor'
import { fabric } from 'fabric'
import { PluginBase, PluginOption } from '../plugin'

class PreviewPlugin extends PluginBase {
  name = 'PreviewPlugin'
  events = []
  hotkeys = []

  // 프리뷰 상태 추적
  private isPreviewActive: boolean = false
  private prevClipPath: fabric.Object | null = null
  private colorMode: 'RGB' | 'CMYK' = 'RGB'
  private cmykOverlay: fabric.Object | null = null
  private clipPathObject: fabric.Object | null = null
  private clipPathObjectOriginalStroke: any
  private clipPathObjectOriginalFill: any
  private clipPathObjectOriginalStrokeWidth: number | null = null

  private showCutBorder: boolean | null = null
  private showSafeZoneBorder: boolean | null = null
  private originalCanvasBackground: string | fabric.Pattern | null = null

  // 객체 상태 저장 (프리뷰 전 상태 복원을 위해)
  private objectStates: Map<
    string,
    {
      selectable: boolean
      hasControls: boolean
      evented: boolean
      lockMovementX: boolean
      lockMovementY: boolean
    }
  > = new Map()

  // 미리보기 시 감추는 moldIcon 가시성 복원용 저장소
  private moldIconVisibility: Map<string, boolean> = new Map()

  constructor(canvas: fabric.Canvas, editor: Editor, options: PluginOption) {
    super(canvas, editor, options)
  }

  // 프리뷰 모드 활성화/비활성화
  async setPreview(preview: boolean, colorMode: 'RGB' | 'CMYK'): Promise<void> {
    const workspace = this._canvas.getObjects().find((obj) => obj.id === 'workspace')
    const guides = this._canvas
      .getObjects()
      .filter(
        (obj) =>
          (obj.id !== 'cutline-template' &&
            obj.id !== 'cut-border' &&
            obj.extensionType === 'printguide') ||
          obj.type === 'GuideLine'
      )

    const filterPlugin = this._editor.getPlugin('FilterPlugin')
    const workspacePlugin = this._editor.getPlugin('WorkspacePlugin')

    const templateBackground = this._canvas
      .getObjects()
      .find((obj) => obj.id === 'template-background')
    const cutlineTemplate = this._canvas.getObjects().find((obj) => obj.id === 'cutline-template')
    const background = (
      templateBackground?.type?.toLowerCase() === 'group'
        ? templateBackground.getObjects()[0]
        : templateBackground
    )?.fill
    const pageOutline = this._canvas.getObjects().find((obj) => obj.id === 'page-outline')

    // 이전 상태 저장 및 새 상태 설정
    if (preview) {
      // 프리뷰 모드 활성화
      this._editor.emit('preview-mode-on')

      console.log('Preview mode On, Color Mode:', colorMode)
      this.showCutBorder = this._canvas.getObjects().find((obj) => obj.id === 'cut-border')?.visible
      this.showSafeZoneBorder = this._canvas
        .getObjects()
        .find((obj) => obj.id === 'safe-zone-border')?.visible

      this.isPreviewActive = true
      this.colorMode = colorMode
      this.prevClipPath = this._canvas.clipPath

      // 모양틀 +아이콘 숨김 (가시성 저장 후 hidden)
      const moldIcons = this._canvas.getObjects().filter((obj) => (obj as any).extensionType === 'moldIcon')
      this.moldIconVisibility.clear()
      for (const icon of moldIcons) {
        if (icon.id) {
          this.moldIconVisibility.set(icon.id, icon.visible !== false)
        }
        icon.visible = false
        icon.dirty = true
      }

      // 캔버스 컨테이너 클릭 이벤트 비활성화
      if (this._canvas.wrapperEl) {
        this._canvas.wrapperEl.style.pointerEvents = 'none'
      }
      if (workspace.extensionType !== 'clipping' && this._options.renderType !== 'envelope') {
        let currentClipPathTarget: fabric.Object | null = null

        // cutlineTemplate가 있는 경우
        if (cutlineTemplate) {
          if (cutlineTemplate.type !== 'group') {
            // cutlineTemplate가 group이 아닌 경우 - 단일 객체로 처리
            currentClipPathTarget = cutlineTemplate
            this.clipPathObject = currentClipPathTarget
            this.clipPathObjectOriginalStroke = currentClipPathTarget.stroke
            this.clipPathObjectOriginalFill = currentClipPathTarget.fill
            this.clipPathObjectOriginalStrokeWidth = currentClipPathTarget.strokeWidth || 0

            this._canvas.discardActiveObject()
          } else {
            // cutlineTemplate가 group인 경우 - 복잡한 형태 처리
            console.log('cutline template as group')
            this.clipPathObject = cutlineTemplate

            // Group의 객체들을 가져오기
            const groupObjects = cutlineTemplate.getObjects()
            if (groupObjects && groupObjects.length > 0) {
              // Group을 제거하기 전에 변환 매트릭스 저장
              const groupTransform = cutlineTemplate.calcTransformMatrix()

              // Canvas에서 group 제거
              this._canvas.remove(cutlineTemplate)

              // 마지막 객체를 clipPath로 사용할 객체로 지정
              const lastObject = groupObjects[groupObjects.length - 1]

              // 모든 객체를 캔버스에 먼저 추가
              for (const item of groupObjects) {
                // Group의 변환을 각 객체에 적용
                const objectTransform = item.calcTransformMatrix()
                const resultTransform = fabric.util.multiplyTransformMatrices(
                  groupTransform,
                  objectTransform
                )

                // 변환 적용
                const options = fabric.util.qrDecompose(resultTransform)
                item.set({
                  flipX: false,
                  flipY: false,
                  left: options.translateX,
                  top: options.translateY,
                  scaleX: options.scaleX,
                  scaleY: options.scaleY,
                  angle: options.angle,
                  skewX: options.skewX || 0,
                  skewY: options.skewY || 0
                })

                // extensionType 설정
                item.extensionType = 'cutline-part'

                // 마지막 객체 표시
                if (item === lastObject) {
                  item.set('id', 'cut-border-part-last')
                }

                // 마지막 객체가 아닌 경우에만 캔버스에 추가
                if (item !== lastObject) {
                  console.log('add cutline part', item)
                  this._canvas.add(item)
                }
              }

              // 마지막 객체를 clipPath로 설정
              if (lastObject) {
                currentClipPathTarget = lastObject
                // clipPath로 사용될 객체는 캔버스에 추가하지 않음
                console.log('Setting last object as clipPath', lastObject)
              }
            }
          }
        } else {
          // cutlineTemplate가 없는 경우 - cut-border를 사용
          currentClipPathTarget = this._canvas.getObjects().find((obj) => obj.id === 'cut-border')
          if (currentClipPathTarget) {
            currentClipPathTarget.visible = true
            this.clipPathObject = currentClipPathTarget
            this.clipPathObjectOriginalStroke = currentClipPathTarget.stroke
            this.clipPathObjectOriginalFill = currentClipPathTarget.fill
            this.clipPathObjectOriginalStrokeWidth = currentClipPathTarget.strokeWidth || 0
          }
        }

        // 클립패스 대상이 설정된 경우 적용
        if (currentClipPathTarget) {
          // 캔버스 배경색 저장 및 설정
          this.originalCanvasBackground = this._canvas.backgroundColor

          // clipPath로 사용될 객체가 캔버스에 있다면 제거
          // (clipPath는 캔버스에 렌더링되지 않고 마스크로만 사용됨)
          if (this._canvas.getObjects().includes(currentClipPathTarget)) {
            // 원본 속성 저장 (이미 저장되어 있지 않은 경우)
            if (this.clipPathObjectOriginalStroke === undefined) {
              this.clipPathObjectOriginalStroke = currentClipPathTarget.stroke
            }
            if (this.clipPathObjectOriginalFill === undefined) {
              this.clipPathObjectOriginalFill = currentClipPathTarget.fill
            }
            if (this.clipPathObjectOriginalStrokeWidth === null) {
              this.clipPathObjectOriginalStrokeWidth = currentClipPathTarget.strokeWidth || 0
            }

            // 캔버스에서 제거 (clipPath로만 사용)
            this._canvas.remove(currentClipPathTarget)
          }

          // 클립패스 설정 - 렌더링을 위해 requestRenderAll 호출 예약
          this._canvas.clipPath = currentClipPathTarget
          //this._canvas.backgroundColor = background || 'white'

          // 즉시 렌더링 강제 실행
          this._canvas.requestRenderAll()
        } else {
          // 클립패스 대상이 없으면 워크스페이스를 사용
          this._canvas.clipPath = workspace

          // 워크스페이스를 클립패스로 사용할 때도 배경색 설정
          this.originalCanvasBackground = this._canvas.backgroundColor
          this._canvas.backgroundColor = background || 'white'

          // 즉시 렌더링 강제 실행
          this._canvas.requestRenderAll()
        }
      }

      // 모든 객체의 상태 저장 및 선택/편집 불가능하게 설정
      this.disableAllObjects()

      // 가이드라인 숨기기
      guides.forEach((guide) => {
        guide.visible = false
        guide.stroke = null
        guide.dirty = true
      })

      if (pageOutline) {
        pageOutline.stroke = null
        pageOutline.dirty = true
      }

      console.log('clipPathObject', this._canvas)

      // 컬러 모드에 따라 다른 처리
      if (colorMode === 'CMYK') {
        if (filterPlugin) {
          await this.applyCMYK(true)
        }
      }

      this._canvas.renderAll()
    } else {
      // 프리뷰 모드 비활성화
      console.log('Preview mode Off')
      this._editor.emit('preview-mode-off')
      this.isPreviewActive = false

      // 모양틀 +아이콘 가시성 복원
      try {
        const moldIcons = this._canvas.getObjects().filter((obj) => (obj as any).extensionType === 'moldIcon')
        for (const icon of moldIcons) {
          if (icon.id && this.moldIconVisibility.has(icon.id)) {
            icon.visible = this.moldIconVisibility.get(icon.id) as boolean
          } else {
            // 저장이 없으면 기본적으로 보이게
            icon.visible = true
          }
          icon.dirty = true
        }
        this.moldIconVisibility.clear()
      } catch (e) {
        console.warn('moldIcon 가시성 복원 중 오류:', e)
      }

      // 캔버스 컨테이너 클릭 이벤트 활성화
      if (this._canvas.wrapperEl) {
        this._canvas.wrapperEl.style.pointerEvents = 'auto'
      }

      // 캔버스 배경색 복원
      if (this.originalCanvasBackground !== null) {
        this._canvas.backgroundColor = this.originalCanvasBackground
        this.originalCanvasBackground = null
      }

      // 이전 클립패스 복원
      this._canvas.clipPath = this.prevClipPath

      if (this.clipPathObject) {
        if (this.clipPathObject.type === 'group') {
          // Group 타입인 경우 - cutline-part들을 제거하고 원본 group 복원
          const parts = this._canvas
            .getObjects()
            .filter((obj) => obj.extensionType === 'cutline-part')

          // 모든 cutline-part 제거
          for (const part of parts) {
            this._canvas.remove(part)
          }

          // 원본 group 다시 추가
          this._canvas.add(this.clipPathObject)
          this.clipPathObject.bringToFront()

          // Group의 각 객체들의 원래 속성 복원
          const groupObjects = this.clipPathObject.getObjects()
          if (groupObjects && groupObjects.length > 0) {
            for (const item of groupObjects) {
              // cutline-part로 설정했던 extensionType 제거
              delete item.extensionType
              // cut-border-part-last ID 제거
              if (item.id === 'cut-border-part-last') {
                delete item.id
              }
              item.dirty = true
            }
          }
        } else {
          // 단일 객체인 경우 - 원래 속성 복원

          // 원래 fill과 stroke 복원
          if (this.clipPathObjectOriginalFill !== undefined) {
            this.clipPathObject.fill = this.clipPathObjectOriginalFill
          }
          if (this.clipPathObjectOriginalStroke !== undefined) {
            this.clipPathObject.stroke = this.clipPathObjectOriginalStroke
          }

          // strokeWidth 복원
          if (this.clipPathObjectOriginalStrokeWidth !== null) {
            this.clipPathObject.strokeWidth = this.clipPathObjectOriginalStrokeWidth
          }

          // clipPath로 사용되었던 객체를 캔버스에 다시 추가
          if (!this._canvas.getObjects().includes(this.clipPathObject)) {
            this._canvas.add(this.clipPathObject)
          }

          // cut-border인 경우 가시성 복원
          if (this.clipPathObject.id === 'cut-border') {
            this.clipPathObject.visible = this.showCutBorder
            console.log('showCutBorder', this.showCutBorder)
          }

          this.clipPathObject.bringToFront()
        }

        this.clipPathObject.dirty = true
        this.clipPathObject = null
        this.clipPathObjectOriginalStroke = null
        this.clipPathObjectOriginalFill = null
        this.clipPathObjectOriginalStrokeWidth = null
      }

      // 강제 렌더링
      this._canvas.requestRenderAll()

      // CMYK 모드였다면 해제
      if (this.colorMode === 'CMYK' && filterPlugin) {
        await this.applyCMYK(false)
      }

      console.log('canvas', this._canvas)

      // 가이드라인 표시
      guides.forEach((guide) => {
        if (guide.id === 'safe-zone-border') {
          guide.visible = this.showSafeZoneBorder
        } else {
          guide.visible = true
        }

        if (guide.id === 'safe-zone-border') {
          guide.stroke = '#3fcd84'
        } else if (guide.id === 'cut-border') {
          guide.stroke = '#cd3f3f'
        }

        guide.dirty = true
      })

      if (pageOutline) {
        pageOutline.stroke = '#ff6b6b'
        pageOutline.dirty = true
      }
    }

    // 모든 객체 상태 복원
    this.restoreAllObjects()

    // 적절한 줌 레벨로 조정
    if (workspacePlugin && workspacePlugin.setZoomAuto) {
      workspacePlugin.setZoomAuto()
      console.log('setZoomAuto', workspacePlugin)
    }

    this._canvas.requestRenderAll()
  }

  // 프리뷰 모드 활성화 여부 확인
  isPreviewEnabled(): boolean {
    return this.isPreviewActive
  }

  // beforeLoad, beforeSave 이벤트에서 프리뷰 모드 비활성화
  async disablePreviewIfActive(): Promise<void> {
    if (this.isPreviewActive) {
      console.log('Disabling preview mode for load/save operation')
      await this.setPreview(false, this.colorMode)
    }
    return Promise.resolve()
  }

  // CMYK 미리보기 적용/해제
  applyCMYK(enableCMYK = true) {
    return new Promise<void>((resolve) => {
      const workspace = this._getWorkspace()

      // 기존 CMYK 오버레이 제거
      if (this.cmykOverlay) {
        this._canvas.remove(this.cmykOverlay)
        this.cmykOverlay = null
      }

      if (!enableCMYK) {
        this._canvas.renderAll()
        resolve()
        return
      }

      if (!workspace) {
        console.error('워크스페이스를 찾을 수 없습니다')
        resolve()
        return
      }

      // clipPath가 있으면 그것을 기준으로, 없으면 workspace 기준으로
      // 이렇게 하면 실제 보이는 영역만 캡처하여 해상도 향상
      const clipPath = this._canvas.clipPath
      const targetObject = clipPath || workspace

      // 대상 객체의 경계 구하기
      const bound = targetObject.getBoundingRect(true)

      console.log('🎯 CMYK 프리뷰 캡처 대상:', {
        hasClipPath: !!clipPath,
        targetId: (targetObject as any).id,
        bounds: bound
      })

      try {
        // 캡처를 위해 뷰포트 리셋
        const originalViewport = [...this._canvas.viewportTransform]
        this._canvas.setViewportTransform([1, 0, 0, 1, 0, 0])

        // 최대 픽셀 수 제한 증가 (6000x6000 = 36,000,000)
        // 인쇄 품질을 위해 더 높은 해상도 허용
        const MAX_PIXELS = 36_000_000
        const currentPixels = bound.width * bound.height

        // multiplier 동적 계산
        // 목표: 300 DPI 수준의 고해상도 프리뷰
        // 작은 영역(< 1000x1000)은 최대 3배, 중간 영역은 2배, 큰 영역은 동적 조정
        let multiplier = 3

        if (currentPixels > 1_000_000) { // > 1000x1000
          multiplier = 2
        }

        if (currentPixels * multiplier * multiplier > MAX_PIXELS) {
          multiplier = Math.sqrt(MAX_PIXELS / currentPixels)
          multiplier = Math.max(1.5, Math.min(3, multiplier)) // 1.5 ~ 3 사이로 제한
        }

        console.log(`📐 CMYK 프리뷰 설정:`, {
          boundSize: `${Math.round(bound.width)}x${Math.round(bound.height)}`,
          currentPixels: currentPixels.toLocaleString(),
          multiplier: multiplier.toFixed(2),
          finalSize: `${Math.round(bound.width * multiplier)}x${Math.round(bound.height * multiplier)}`
        })

        // 캔버스를 이미지로 렌더링
        const dataURL = this._canvas.toDataURL({
          format: 'png',
          quality: 1,
          multiplier: multiplier,
          left: bound.left,
          top: bound.top,
          width: bound.width,
          height: bound.height
        })

        // 원래 뷰포트 복원
        this._canvas.setViewportTransform(originalViewport)

        // 이미지 로드
        const img = new Image()
        img.onload = async () => {
          // 임시 캔버스 생성 (원본 크기 유지)
          const tempCanvas = document.createElement('canvas')
          tempCanvas.width = img.width
          tempCanvas.height = img.height

          const ctx = tempCanvas.getContext('2d')
          if (!ctx) {
            resolve()
            return
          }

          // 이미지 그리기
          ctx.drawImage(img, 0, 0, img.width, img.height)

          // 픽셀 데이터 가져오기
          const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)

          // CMYK 변환 시도 (color-runtime이 없으면 원본 사용)
          let finalImageData = imageData
          // @pf/color-runtime은 optional - 사용하지 않음
          // CMYK 변환이 필요한 경우 별도 구현 필요

          // 변환된 이미지 데이터 적용
          ctx.putImageData(finalImageData, 0, 0)

          // 대상 객체의 중심점 가져오기
          const center = targetObject.getCenterPoint()

          // Fabric 이미지로 변환
          fabric.Image.fromURL(tempCanvas.toDataURL('image/png', 1.0), (fabricImg) => {
            fabricImg.set({
              id: 'cmyk-overlay',
              left: center.x,
              top: center.y,
              width: bound.width * multiplier, // 원본 크기에 multiplier 곱함
              height: bound.height * multiplier, // 원본 크기에 multiplier 곱함
              scaleX: 1 / multiplier, // multiplier로 나누어 원래 크기로 표시
              scaleY: 1 / multiplier, // multiplier로 나누어 원래 크기로 표시
              originX: 'center',
              originY: 'center',
              selectable: false,
              evented: false,
              hasControls: false,
              hasBorders: false,
              lockMovementX: true,
              lockMovementY: true,
              excludeFromExport: true
            })

            // 캔버스에 추가하고 렌더링
            this._canvas.add(fabricImg as any)
            fabricImg.bringToFront()
            this.cmykOverlay = fabricImg as any
            this._canvas.requestRenderAll()
            resolve()
          })
        }

        img.onerror = () => {
          console.error('CMYK 프리뷰 이미지 로드 실패')
          resolve()
        }

        img.src = dataURL
      } catch (error) {
        console.error('CMYK 프리뷰 생성 중 오류:', error)
        resolve()
      }
    })
  }

  // lifecycle hooks
  beforeLoad(...args: any[]): Promise<void> {
    return new Promise((r) => {
      this.disablePreviewIfActive().then(() => {
        r(...args)
      })
    })
  }

  afterLoad(...args: any[]): Promise<void> {
    return new Promise((r) => {
      r(...args)
    })
  }

  beforeSave(...args: any[]): Promise<void> {
    return new Promise((r) => {
      this.disablePreviewIfActive().then(() => {
        r(...args)
      })
    })
  }

  afterSave(...args: any[]): Promise<void> {
    return new Promise((r) => {
      console.log('afterSave: preview plugin')
      r(...args)
    })
  }

  // dispose 메서드 (추가)
  dispose() {
    if (this.cmykOverlay) {
      this._canvas.remove(this.cmykOverlay)
    }

    // 캔버스 배경색 복원
    if (this.originalCanvasBackground !== null) {
      this._canvas.backgroundColor = this.originalCanvasBackground
      this.originalCanvasBackground = null
    }

    // 캔버스 컨테이너 클릭 이벤트 복원 (dispose 시점에도)
    if (this._canvas.wrapperEl) {
      this._canvas.wrapperEl.style.pointerEvents = 'auto'
    }

    // 객체 상태 복원 (프리뷰 모드로 남아있는 경우)
    if (this.isPreviewActive) {
      this.restoreAllObjects()
    }
  }

  // 모든 객체를 선택/편집 불가능하게 설정
  private disableAllObjects(): void {
    // 객체 상태 초기화
    this.objectStates.clear()

    this._canvas.getObjects().forEach((obj) => {
      // 특별한 객체(워크스페이스, 가이드 등)는 제외
      if (
        obj.id === 'workspace' ||
        obj.extensionType === 'printguide' ||
        obj.type === 'GuideLine' ||
        obj.extensionType === 'template-element'
      ) {
        return
      }

      // 현재 상태 저장
      if (obj.id) {
        this.objectStates.set(obj.id, {
          selectable: obj.selectable || false,
          hasControls: obj.hasControls || false,
          evented: obj.evented !== false, // undefined는 true로 처리
          lockMovementX: obj.lockMovementX || false,
          lockMovementY: obj.lockMovementY || false
        })
      }

      // 객체 비활성화
      obj.set({
        selectable: false,
        hasControls: false,
        evented: false,
        lockMovementX: true,
        lockMovementY: true
      })
    })

    // 선택 해제 및 상호작용 비활성화
    this._canvas.discardActiveObject()
    this._canvas.selection = false
  }

  // 모든 객체 상태 복원
  private restoreAllObjects(): void {
    this._canvas.getObjects().forEach((obj) => {
      if (obj.id && this.objectStates.has(obj.id)) {
        // 저장된 상태 복원
        const state = this.objectStates.get(obj.id)
        obj.set({
          selectable: state.selectable,
          hasControls: state.hasControls,
          evented: state.evented,
          lockMovementX: state.lockMovementX,
          lockMovementY: state.lockMovementY
        })
        obj.dirty = true
      }
    })

    // 선택 기능 복원
    this._canvas.selection = true
  }
}

export default PreviewPlugin
