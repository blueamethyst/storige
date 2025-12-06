import { fabric } from 'fabric'
import Editor from '../editor'
import { PluginBase, PluginOption } from '../plugin'
import { v4 as uuid } from 'uuid'
import { UNIT_CONVERSIONS } from '../ruler/constants'
import FontPlugin from './FontPlugin'
import { RenderOptimizer } from '../utils/render'
import { mmToPx } from '../utils'

/**
 * SVG 템플릿 관리 플러그인
 * SVG 파일을 로드하고 그룹 분리하여 FabricJS 객체 배열로 변환
 */
class TemplatePlugin extends PluginBase {
  name = 'TemplatePlugin'
  events = ['templateLoaded', 'templateError', 'templateAdded', 'templateSaved']
  hotkeys = []
  cutlineTemplate: fabric.Object | null = null

  constructor(canvas: fabric.Canvas, editor: Editor, options: PluginOption) {
    super(canvas, editor, options)
  }

  async readSVGFromFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (event) => {
        const svgString = event.target.result as string
        resolve(svgString)
      }

      reader.onerror = (error) => {
        reject(error)
      }

      // SVG 파일을 텍스트로 읽기
      reader.readAsText(file)
    })
  }

  /**
   * SVG 파일을 로드하여 FabricJS 객체로 변환
   * @param pageGroup SVG 파일 또는 객체 배열
   */
  async addTemplateToCanvas(pageGroup: fabric.Group | fabric.Object | fabric.Object[]) {
    // 입력 데이터 검증 및 정규화
    let fabricGroup: fabric.Group | fabric.Object

    if (Array.isArray(pageGroup)) {
      if (pageGroup.length === 0) {
        throw new Error('추가할 객체가 없습니다.')
      }

      // 배열의 모든 객체가 유효한 fabric 객체인지 확인
      const validObjects = pageGroup.filter((obj) => obj && typeof obj.set === 'function')
      if (validObjects.length === 0) {
        throw new Error('유효한 fabric 객체가 없습니다.')
      }

      console.log(`처리할 객체 수: ${validObjects.length}개`)

      // 여러 객체를 하나의 그룹으로 만들기 (기존 로직 활용)
      fabricGroup = new fabric.Group(validObjects, {
        id: `template_group_${Date.now()}`,
        left: 0,
        top: 0,
        originX: 'center',
        originY: 'center'
      })
    } else {
      // 단일 객체인 경우
      if (!pageGroup || typeof pageGroup.set !== 'function') {
        console.error('유효하지 않은 fabric 객체:', pageGroup)
        throw new Error('유효하지 않은 fabric 객체입니다.')
      }

      if (pageGroup.type === 'group' && pageGroup._objects?.length === 0) {
        throw new Error('추가할 객체가 없습니다.')
      }

      fabricGroup = pageGroup
    }

    this._canvas.offHistory()

    // 워크스페이스 객체 가져오기
    const workspace = this._getWorkspace()
    if (!workspace) {
      throw new Error('워크스페이스를 찾을 수 없습니다.')
    }

    const workspaceWidth = workspace.width! * workspace.scaleX!
    const workspaceHeight = workspace.height! * workspace.scaleY!
    const workspaceCenter = workspace.getCenterPoint()

    console.log('처리할 fabricGroup:', fabricGroup)

    // 그룹의 객체들 가져오기
    const groupObjects = fabricGroup.type === 'group' ? fabricGroup._objects : [fabricGroup]

    fabricGroup.set({
      evented: false,
      enableRetinaScaling: true,  // 고해상도 디스플레이에서 선명한 렌더링
      clipPath: null,
      top: workspaceCenter.y,
      left: workspaceCenter.x,
      originX: 'center',
      originY: 'center'
    })

    const addedObjects = await this.ungroupItems(fabricGroup, groupObjects, {
      width: workspaceWidth,
      height: workspaceHeight
    }) // 첫 번째 그룹은 flat하게 처리

    // 모든 객체 선택
    if (addedObjects.length > 0) {
      this._canvas.setActiveObject(
        new fabric.ActiveSelection(addedObjects, { canvas: this._canvas })
      )
    }

    // 대량 객체 추가 최적화
    RenderOptimizer.batchAdd(this._canvas, addedObjects)
    this._canvas.discardActiveObject()

    const templateBackground = this._canvas
      .getObjects()
      .find((obj: fabric.Object) => obj.id === 'template-background')

    const workspaceObj = this._getWorkspace()
    templateBackground?.sendToBack()

    workspaceObj?.sendToBack()
    if (templateBackground) {
      const renderType = (this._options as any)?.renderType || (this._canvas as any)?.renderType
      const isNoBounded = renderType === 'noBounded'
      const isEnvelope = renderType === 'envelope'

      if (!isNoBounded && !isEnvelope) {
        // 작업사이즈에 맞춰 다시 리사이즈
        templateBackground.set({
          scaleX: workspaceWidth / templateBackground.width!,
          scaleY: workspaceHeight / templateBackground.height!,
          dirty: true
        })
      } else if (isEnvelope) {
        // 봉투 타입의 경우 출력사이즈 (this._options.envelopeOption.size)에 맞춰 리사이즈
        const dpi = (this._options as any)?.dpi || UNIT_CONVERSIONS.DEFAULT_DPI;
        (templateBackground as any).preventAutoResize = true
        const { width, height } = this._options.envelopeOption.size
        const backgroundBound = templateBackground.getBoundingRect(true, true)
        workspaceObj?.set({
          left: backgroundBound!.width - mmToPx(width, dpi),
          top: backgroundBound!.height - mmToPx(height, dpi),
          width: mmToPx(width, dpi)!,
          height: mmToPx(height, dpi)!,
        })
      } else {
        (templateBackground as any).preventAutoResize = true
      }

      if (templateBackground.type === 'group' && templateBackground.getObjects().length > 0) {
        this._canvas.clipPath = templateBackground.getObjects()[templateBackground.getObjects().length - 1]
      } else {
        this._canvas.clipPath = templateBackground
      }

      this._canvas.fill = 'transparent'
      this._canvas.backgroundColor = 'transparent'

      workspaceObj?.set({
        fill: 'transparent',
        backgroundColor: 'transparent',
        dirty: true
      })

      workspaceObj?.setCoords()
      //this._editor.emit('background:size-changed', backgroundWidth, backgroundHeight)
    }

    this._editor.hooks.get('afterLoad').callAsync('', () => {
      this._canvas.requestRenderAll()
      this._canvas.onHistory()
    })
  }

  setCutTemplate = async (svgData: string | File, cutSizePx: number): Promise<fabric.Object> => {
    return new Promise((resolve, reject) => {
      this._canvas.offHistory()

      const processTemplate = async () => {
        try {
          // svgData가 File 객체인 경우 문자열로 변환
          let svgString: string
          if (svgData instanceof File) {
            svgString = await this.readSVGFromFile(svgData)
          } else if (typeof svgData === 'string') {
            svgString = svgData.trim()
          } else {
            reject(new Error('SVG 데이터는 문자열 또는 File 객체여야 합니다.'))
            return
          }

          // 바로 fabric.loadSVGFromString 사용
          fabric.loadSVGFromString(svgString, (objects, options) => {
            if (!objects || objects.length === 0) {
              reject(new Error('SVG 파일을 로드할 수 없습니다.'))
              return
            }
            this.createCutlineTemplate(objects, options, cutSizePx, resolve)
          })
        } catch (error) {
          reject(error)
        }
      }

      processTemplate()
    })
  }

  /**
   * cutline 템플릿 생성 (공통 로직)
   */
  private createCutlineTemplate(
    objects: fabric.Object[],
    options: any,
    cutSizePx: number,
    resolve: (value: fabric.Object) => void
  ) {
    // 이전 cutline-template 제거
    const prev = this._canvas
      .getObjects()
      .find((obj: fabric.Object) => obj.id === 'cutline-template')
    if (prev) {
      this.cutlineTemplate = null
      this._canvas.remove(prev)
      console.log('delete previous cutline', prev)
    }

    let svgObject: fabric.Object
    if (this._options.renderType === 'envelope') {
      const redLines = objects.filter((obj) => obj.stroke === "#E4007F")
      svgObject = new fabric.Group([...redLines, ...objects.filter((obj) => obj.stroke !== "#E4007F")], {
        ...options
      })
    } else if (objects.length === 1) {
      svgObject = objects[0]
    }

    if (!svgObject) {
      svgObject = fabric.util.groupSVGElements(objects, {
        ...options
      })
    }

    const scale = this._options.unit === 'mm' ? (this._options.dpi || UNIT_CONVERSIONS.DEFAULT_DPI) / 72 : 1
    const isEnvelope = this._options.renderType === 'envelope'

    svgObject.set({
      originX: 'center',
      originY: 'center',
      left: 0,
      top: 0,
      fill: null,
      selectable: false,
      evented: false,
      hasControls: false,
      lockMovementX: true,
      lockMovementY: true,
      excludeFromExport: true,
      extensionType: 'printguide',
      editable: false,
      scaleX: scale,
      scaleY: scale,
      visible: !isEnvelope  // 봉투 타입인 경우 기본적으로 숨김
    })
    svgObject.id = 'cutline-template'
    this.cutlineTemplate = svgObject
    this._canvas.add(svgObject)
    svgObject.bringToFront()
    this._canvas.onHistory()

    resolve(svgObject)
  }

  afterSave(...args: any[]): Promise<void> {
    return new Promise((r) => {
      r(...args)
    })
  }

  beforeSave(...args): Promise<void> {
    return new Promise((r) => {
      r(...args)
    })
  }

  afterLoad(...args): Promise<void> {
    return new Promise((r) => {
      const allObjects = this._canvas.getObjects()
      allObjects.forEach((obj) => {
        if (obj.type === 'text' || obj.type === 'i-text' || obj.type === 'textbox') {
          if (!obj.hasControls) {
            obj.set({
              hasControls: true,
              lockScalingX: false,
              lockScalingY: false,
              lockUniScaling: false,
            })
          }
        }
      })
      r(...args)
    })
  }

  beforeLoad(...args): Promise<void> {
    return new Promise((r) => {
      r(...args)
    })
  }

  mounted(): Promise<void> {
    return super.mounted()
  }

  async ungroupItems(
    group: fabric.Group | fabric.Object,
    groupObjects: fabric.Object[],
    workspaceSize: { width: number; height: number }
  ): Promise<fabric.Object[]> {
    return new Promise((resolve) => {
      // 비동기 작업을 처리하는 즉시 실행 함수
      (async () => {
        // 그룹이 단일 객체인 경우 그대로 처리
        if (group.type !== 'group') {
          // 단일 객체를 배열로 반환
          resolve([group])
          return
        }

        // 1. 필요한 폰트 목록 추출
        const requiredFonts = new Set<string>()

        groupObjects.forEach((item) => {
          // 텍스트 객체에서 폰트 추출
          if (item.type === 'text' || item.type === 'i-text' || item.type === 'textbox') {
            const fontFamily = (item as any).fontFamily
            if (fontFamily && typeof fontFamily === 'string') {
              requiredFonts.add(fontFamily)
            }
          }

          // 중첩된 그룹 내부의 텍스트 객체도 확인
          if (item.type === 'group' && (item as fabric.Group)._objects) {
            const nestedObjects = (item as fabric.Group)._objects
            nestedObjects.forEach((nestedItem) => {
              if (
                nestedItem.type === 'text' ||
                nestedItem.type === 'i-text' ||
                nestedItem.type === 'textbox'
              ) {
                const fontFamily = (nestedItem as any).fontFamily
                if (fontFamily && typeof fontFamily === 'string') {
                  requiredFonts.add(fontFamily)
                }
              }
            })
          }
        })

        console.log('📋 템플릿에 필요한 폰트 목록:', Array.from(requiredFonts))

        // 2. FontPlugin을 사용해 필요한 폰트 미리 로드
        if (requiredFonts.size > 0) {
          const fontPlugin = this._editor.getPlugin<FontPlugin>('FontPlugin')

          if (fontPlugin) {
            const fontLoadPromises = Array.from(requiredFonts).map((fontName) => {
              console.log(`🔄 템플릿 폰트 사전 로드 시작: ${fontName}`)
              return fontPlugin
                .applyFont(fontName, null)
                .then(() => {
                  console.log(`✅ 템플릿 폰트 사전 로드 완료: ${fontName}`)
                })
                .catch((err) => {
                  console.warn(`⚠️ 템플릿 폰트 사전 로드 실패 (계속 진행): ${fontName}`, err)
                })
            })

            // 모든 폰트 로드 대기
            await Promise.all(fontLoadPromises)
            console.log('✅ 템플릿의 모든 폰트 사전 로드 완료')
          }
        }

        // outline 객체를 제외한 실제 렌더링 객체 개수 확인

        // 그룹의 원래 값들 저장 (원래 템플릿 배경으로 계산)
        const mainItem = groupObjects[0]

        if ((groupObjects.length === 1 && (!groupObjects[0].id.includes('default') || this._options.renderType === 'noBounded'))) {
          const centerOf = groupObjects[0].getCenterPoint()
          // 흰색 배경 rect 추가 (기존 로직)
          const backgroundRect = new fabric.Rect({
            id: `background_rect_${Date.now()}`,
            left: centerOf.x,
            top: centerOf.y,
            originX: 'center',
            originY: 'center',
            width: workspaceSize.width,
            height: workspaceSize.height,
            fill: 'white',
            stroke: null
          })

          // 배경 rect를 0번째 위치에 삽입
          groupObjects.unshift(backgroundRect)
          console.log('단일 객체에 흰색 배경 rect 추가됨')
        }

        const groupWidth = mainItem.width! * mainItem.scaleX!
        const groupHeight = mainItem.height! * mainItem.scaleY!


        const groupCenter = mainItem.getCenterPoint()
        const groupLeft = group.left! + groupCenter.x
        const groupTop = group.top! + groupCenter.y

        // 워크스페이스 크기
        const workspaceWidth = workspaceSize.width
        const workspaceHeight = workspaceSize.height

        // 스케일 계산 (워크스페이스 너비에 맞춤)
        const scaleX = workspaceWidth / groupWidth
        const scaleY = workspaceHeight / groupHeight
        let scale = Math.min(scaleX, scaleY)

        // envelope 타입의 경우 우측 하단 배치를 위한 오프셋 계산
        const offsetX = 0
        const offsetY = 0

        // 봉투의 경우 envelopeOption에 따라 스케일 및 오프셋 계산
        if (this._options.renderType === 'envelope') {
          const envelopeOption = (this._options as any)?.envelopeOption

          // envelopeOption이 있는 경우
          const { direction, size } = envelopeOption

          console.log('봉투 옵션 적용:', envelopeOption)
          const dpi = this._options.dpi || UNIT_CONVERSIONS.DEFAULT_DPI
          const totalWidth = mmToPx(size.width, dpi)
          const totalHeight = mmToPx(size.height, dpi)

          if (envelopeOption) {
            // direction에 따라 스케일 계산
            if (direction === 'left' || direction === 'right') {
              // 가로 방향: 높이에 맞춤
              scale = totalHeight / groupHeight
            } else {
              // 세로 방향(top/bottom): 너비에 맞춤
              scale = totalWidth / groupWidth
            }
          }
        }

        // 그룹 객체들을 순서대로 처리 (flat화)
        const addedObjects: fabric.Object[] = []
        let pendingClones = groupObjects.length

        // 각 객체를 순서대로 처리하여 flat하게 만들기
        groupObjects.forEach((item, index) => {
          item.clone(async (clonedItem: fabric.Object) => {
            // 원본 객체의 그룹 정보 보존
            const originalGroupId = (item as any).groupId
            const originalGroupIndex = (item as any).groupIndex

            // 객체 타입 감지
            const objectType = this.determineObjectType(clonedItem)

            // clipPath용 빈 객체는 건너뛰기
            if (objectType === 'clippath') {
              console.log('clipPath용 빈 객체 건너뛰기:', clonedItem)
              pendingClones--
              if (pendingClones === 0) {
                resolve(addedObjects.filter((obj) => obj !== undefined))
              }
              return
            }

            // 고유 ID 설정
            if (index === 0) {
              clonedItem.set({
                id: 'template-background'
              })
            } else {
              // 조건부로 ID 설정: item.id가 특별한 패턴을 가지지 않고, clonedItem.id가 아직 없다면 UUID 할당
              // outline, fixed, floating 등의 ID는 아래의 특정 로직에서 처리됨
              if (!item.id?.match(/outline|fixed|floating/)) {
                if (!clonedItem.id) {
                  // Preserves original ID if it exists and is not special
                  clonedItem.set('id', uuid())
                }
              }
            }

            // 그룹 내 상대적 위치 계산
            const relativeX = item.left! - groupLeft
            const relativeY = item.top! - groupTop

            // 워크스페이스 중앙 기준으로 상대 위치 계산 + envelope 오프셋 적용
            const newLeft = relativeX * scale + offsetX
            const newTop = relativeY * scale + offsetY

            // 공통 속성 설정 (그룹 정보 포함)
            const renderType = (this._options as any)?.renderType
            const isNoBounded = renderType === 'noBounded'
            const isBackground = clonedItem?.id === 'template-background'

            let computedScaleX = (item.scaleX || 1) * scale
            let computedScaleY = (item.scaleY || 1) * scale

            // noBounded의 배경 객체는 DPI를 고려하여 스케일 보정
            if (isNoBounded && isBackground) {
              const currentDpi =
                (this._options as any)?.dpi
              const displayDpi = UNIT_CONVERSIONS.DEFAULT_DPI // 화면 표시는 고정 DPI 사용
              const unit = (this._options as any)?.unit

              // 화면 표시(mm 변환)는 displayDpi(기본 150)를 기준으로 하므로,
              // 실제 작업 DPI와의 비율만큼 스케일을 보정해 일관된 실측(mm) 표시를 유지
              const dpiScale = currentDpi / displayDpi

              if (unit === 'mm') {
                console.log('noBounded 배경 DPI 보정 적용', { currentDpi, displayDpi, dpiScale })
                computedScaleX = dpiScale
                computedScaleY = dpiScale
              } else {
                // px 단위에서는 기존 동작 유지
                console.log('noBounded 배경(px) - 스케일 1 유지')
                computedScaleX = 1
                computedScaleY = 1
              }
            }

            const commonProps = {
              left: newLeft,
              top: newTop,
              scaleX: computedScaleX,
              scaleY: computedScaleY,
              strokeUniform: false,
              fill: clonedItem.fill,
              stroke: clonedItem.stroke,
              // 그룹 정보 보존
              groupId: originalGroupId,
              groupIndex: originalGroupIndex
            }

            // 객체 타입에 따른 추가 속성 설정
            if (objectType === 'text') {
              // 텍스트 객체를 IText로 변환 (편집 기능이 더 잘 작동함)
              const textValue = (clonedItem as any).text || ''
              const fontFamily = (clonedItem as any).fontFamily

              // 변환된 텍스트 객체로 교체
              clonedItem = new fabric.IText(textValue, {
                ...commonProps,
                fontSize: (clonedItem as any).fontSize || 24,
                fontFamily: fontFamily,
                textAlign: (clonedItem as any).textAlign || 'left',
                fontStyle: (clonedItem as any).fontStyle || 'normal',
                fontWeight: (clonedItem as any).fontWeight || 'normal',
                fill: clonedItem.fill || '#000000',
                stroke: clonedItem.stroke,
                strokeWidth: (clonedItem as any).strokeWidth,
                charSpacing: (clonedItem as any).charSpacing,
                lineHeight: (clonedItem as any).lineHeight,
                underline: (clonedItem as any).underline,
                overline: (clonedItem as any).overline,
                linethrough: (clonedItem as any).linethrough,
                // 편집 관련 속성
                editable: true,
                selectable: true,
                // Canvas-Editor 특화 속성
                extensionType: 'text',
                id: clonedItem.id,
                // 텍스트 스케일을 항상 1로 고정하여 fontSize 기준 일관된 크기 유지
                scaleX: 1,
                scaleY: 1,
                // 스케일링 동작 설정
                lockUniScaling: true,
                centeredScaling: false, // 반대편 모서리를 기준으로 스케일링
              })

              // 폰트를 미리 로드했으므로 텍스트 크기 재계산 불필요
              // TextSizeCalculator.recalculateSingleTextSize 호출 제거
              console.log(`📝 텍스트 객체 생성 완료 (폰트 사전 로드됨): ${fontFamily}`)
            } else if (objectType === 'image') {
              // 이미지 객체 속성
              clonedItem.set({
                ...commonProps,
                crossOrigin: 'anonymous'
              })
            } else if (objectType === 'path') {
              // 패스 객체 속성
              clonedItem.set({
                ...commonProps,
                extensionType: 'shape',
                strokeLineCap: (clonedItem as fabric.Path).strokeLineCap || 'round',
                strokeLineJoin: (clonedItem as fabric.Path).strokeLineJoin || 'round'
              })
            } else if (objectType === 'group') {
              // 중첩된 그룹: 그룹으로 유지하고, 공통 속성 적용
              clonedItem.set({
                // clonedItem은 이미 fabric.Group 객체임
                ...commonProps // 크기 조정 및 위치 적용
                // id는 위의 일반 ID 설정 로직 또는 아래의 특수 ID 로직에서 처리됨
              })
            } else {
              // 기본 도형 객체 속성 (rect, circle, polygon 등)
              clonedItem.set({
                ...commonProps
              })

              // 선택. 아이템들의 클립패스 또는 전체
              // clonedItem이 첫 번째 그룹의 직계 자식인 경우에만 clipPath 설정
              if (item?.id === 'outline') {
                clonedItem.set({
                  id: 'page-outline', // ID 일관성 유지
                  selectable: false,
                  evented: false,
                  hasControls: false,
                  lockMovementX: true,
                  lockMovementY: true,
                  editable: false,
                  fill: 'transparent',
                  absolutePositioned: true,
                  extensionType: 'template-element'
                })
                //this._canvas.clipPath = clonedItem;
              }
            }
            if (item?.id?.includes('fixed')) {
              clonedItem.set({
                selectable: false,
                evented: false,
                hasControls: false,
                lockMovementX: true,
                lockMovementY: true,
                editable: false,
                extensionType: 'template-element'
              })
            }
            if (item?.id?.includes('floating')) {
              clonedItem.set({
                evented: true,
                alwaysTop: true,
                extensionType: 'template-element'
              })
            }

            if (clonedItem?.id === 'template-background') {
              clonedItem.set({
                selectable: false,
                evented: false,
                hasControls: false,
                lockMovementX: true,
                lockMovementY: true,
                editable: false,
                extensionType: 'template-element',
                originX: 'center',
                originY: 'center',
                left: 0,
                top: 0
              })

              if (!clonedItem.fill) {
                clonedItem.set({
                  fill: 'white'
                })
              }
            }

            // 중심점 기준으로 위치 설정
            const centerOf = clonedItem.getCenterPoint()
            clonedItem.set({
              left: centerOf.x,
              top: centerOf.y,
              originX: 'center',
              originY: 'center'
            })

            // 원본 객체에 clipPath가 있으면 스케일 조정 후 클론된 객체에도 적용
            // if (item.clipPath) {
            //   console.log('원본 객체 clipPath 발견:', item.id)

            //   // 원본 객체의 clipPath 위치와 크기 조정
            //   const originalClipPath = item.clipPath as fabric.Object

            //   // 클론된 객체에 조정된 clipPath 적용
            //   clonedItem.clipPath = originalClipPath
            //   console.log(`클론된 객체에 clipPath 적용 완료: ${clonedItem.id}`)
            // }

            clonedItem.setCoords()
            addedObjects[index] = clonedItem // 순서 유지를 위해 인덱스 사용

            // 모든 클론 처리가 완료되면 결과를 resolve
            pendingClones--
            if (pendingClones === 0) {
              // 순서가 유지된 배열에서 undefined 제거
              const validObjects = addedObjects.filter((obj) => obj !== undefined)

              resolve(validObjects)
            }
          })
        })

        // 경우에 따라 groupObjects가 비어있을 수 있으므로, 이 경우 바로 resolve
        if (groupObjects.length === 0) {
          resolve(addedObjects)
        }

      })()
    })
  }

  /**
   * 객체의 타입을 결정하는 헬퍼 메서드
   * @param object fabric 객체
   * @returns 객체 타입 문자열
   */
  private determineObjectType(object: fabric.Object): string {
    // 그룹 객체 확인
    if (object.type === 'group') {
      return 'group'
    }

    // 텍스트 관련 객체 확인
    if (object.type === 'text' || object.type === 'i-text' || object.type === 'textbox') {
      return 'text'
    }

    // 이미지 객체 확인
    if (object.type === 'image') {
      return 'image'
    }

    // 패스 객체 확인 (Adobe Illustrator에서 많이 사용)
    if (object.type === 'path' || object.type === 'path-group') {
      return 'path'
    }

    // SVG 그룹에서 온 특정 텍스트 객체는 때때로 잘못 감지될 수 있음
    // 텍스트 내용이 있는지 추가 확인
    if ('text' in object && (object as any).text) {
      return 'text'
    }

    // Adobe Illustrator에서 생성된 빈 clipPath용 rect 객체 확인
    if (
      object.type === 'rect' &&
      (object.width === 0 || object.height === 0) &&
      !object.fill &&
      !object.stroke
    ) {
      console.warn('clipPath용 빈 rect 객체 감지:', object)
      return 'clippath'
    }

    // 기본 도형 객체들 (rect, circle, ellipse, polygon, polyline 등)
    if (
      object.type === 'rect' ||
      object.type === 'circle' ||
      object.type === 'ellipse' ||
      object.type === 'polygon' ||
      object.type === 'polyline' ||
      object.type === 'triangle'
    ) {
      return 'shape'
    }

    // 기타 객체는 기본적으로 shape로 처리
    return 'shape'
  }
}

export default TemplatePlugin
