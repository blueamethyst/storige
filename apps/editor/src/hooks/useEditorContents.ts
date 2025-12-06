import { useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { v4 as uuid } from 'uuid'
import { useAppStore } from '@/stores/useAppStore'
import {
  useSettingsStore,
  type EditorUseCase,
  type ProductBasedSetupConfig,
  type ContentEditSetupConfig,
  type EmptyEditorSetupConfig,
  type GeneralSetupConfig,
} from '@/stores/useSettingsStore'
import Editor, { ServicePlugin, SvgUtils, TemplatePlugin } from '@storige/canvas-core'
import { contentsApi, storageApi } from '@/api'
import type {
  EditorContent,
  EditorTemplate,
} from '@/generated/graphql'
import type { fabric } from 'fabric'

// Fabric.js Object 확장 타입 (canvas-core에서 사용하는 커스텀 속성 포함)
interface ExtendedFabricObject extends fabric.Object {
  id?: string
  extensionType?: string
  preventAutoResize?: boolean
  editable?: boolean
}

// 사용 케이스별 설정 타입 매핑
export type UseCaseConfigMap = {
  'product-based': ProductBasedSetupConfig
  'content-edit': ContentEditSetupConfig
  'empty': EmptyEditorSetupConfig | undefined
  'general': GeneralSetupConfig | undefined
}

// 메타데이터 안전 접근 유틸리티
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const safeGetMetadata = (content: any, key: string, defaultValue: any = null) => {
  return content?.metadata?.[key] ?? defaultValue
}

// 안전한 URL 접근 유틸리티
const safeGetImageUrl = (content: EditorContent | EditorTemplate): string | null => {
  return content?.image?.image?.url || null
}

// 안전한 템플릿 URL 접근
const safeGetTemplateUrl = (content: EditorTemplate): string | null => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const designUrl = (content as any)?.design?.document?.url
  if (designUrl) return designUrl
  return content?.image?.image?.url || null
}

// 안전한 칼선 템플릿 URL 접근
const safeGetCutLineTemplateUrl = (content: EditorTemplate): string | null => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (content as any)?.cutLineTemplate?.image?.url || null
}

// S3 URL에서 경로 추출
const extractPathFromS3Url = (s3Url: string): string => {
  if (!s3Url.startsWith('s3://')) return s3Url
  const parts = s3Url.replace('s3://', '').split('/')
  return parts.slice(1).join('/')
}

// 콘텐츠 타입별 REST API 호출 함수 가져오기
const getContentApiByType = (contentType: string) => {
  switch (contentType) {
    case 'image':
      return contentsApi.getImages
    case 'frame':
      return contentsApi.getFrames
    case 'element':
      return contentsApi.getElements
    case 'background':
      return contentsApi.getBackgrounds
    case 'template':
      return contentsApi.getTemplates
    default:
      return contentsApi.getTemplates
  }
}

export interface UseEditorContentsReturn {
  // 콘텐츠 로드
  loadContent: (contentId: string, contentType: string) => Promise<void>
  loadCanvasData: (canvases: unknown[]) => Promise<boolean>
  loadEditDesign: (item: EditorContent | EditorTemplate, documentURL: string) => Promise<void>

  // 에셋 설정
  setupAsset: (content: EditorContent | EditorTemplate, contentType: string) => Promise<void>
  setupEditContent: (content: EditorContent | EditorTemplate, contentType: string) => Promise<void>
  setupTemplateFromSvgString: (svgString: string, cutLineSvgString?: string | null, options?: { viaUpload?: boolean }) => Promise<boolean>
  setupTemplateContent: (content: EditorTemplate) => Promise<void>
  setupFrameContent: (content: EditorContent, canvas: fabric.Canvas) => Promise<void>

  // 에셋 추가
  addAssetToCanvas: (url: string, objectId: string) => Promise<fabric.Object>
  setAsBackground: (item: fabric.Object, canvas: fabric.Canvas) => fabric.Object | null

  // 사용 케이스 기반 로더
  loadForUseCase: <T extends EditorUseCase>(useCase: T, config: UseCaseConfigMap[T]) => Promise<void>
  loadProductBasedEditor: (config: ProductBasedSetupConfig) => Promise<void>
  loadContentEditor: (config: ContentEditSetupConfig) => Promise<void>
  loadEmptyEditor: (config?: EmptyEditorSetupConfig) => Promise<void>
  loadGeneralEditor: (config?: GeneralSetupConfig) => Promise<void>
}

/**
 * Editor Contents Hook
 * 에디터 콘텐츠 로딩 및 관리를 위한 React Hook
 *
 * 사용 케이스별 에디터 초기화:
 * - product-based: 제품 기반 에디터 (템플릿, 사이즈 정보 포함)
 * - content-edit: 기존 콘텐츠 편집
 * - empty: 빈 에디터
 * - general: 일반 에디터
 */
export function useEditorContents(): UseEditorContentsReturn {
  // Zustand 스토어 - useShallow로 한 번에 가져와서 불필요한 리렌더링 방지
  const {
    canvas,
    editor,
    allCanvas,
    allEditors,
    clearAll,
    setPage,
    getPlugin,
    updateObjects,
  } = useAppStore(
    useShallow((state) => ({
      canvas: state.canvas,
      editor: state.editor,
      allCanvas: state.allCanvas,
      allEditors: state.allEditors,
      clearAll: state.clearAll,
      setPage: state.setPage,
      getPlugin: state.getPlugin,
      updateObjects: state.updateObjects,
    }))
  )

  const {
    setupProductBased,
    setupEmptyEditor: setupEmptyEditorStore,
    setupGeneral: setupGeneralStore,
    setEditorTemplates,
  } = useSettingsStore(
    useShallow((state) => ({
      setupProductBased: state.setupProductBased,
      setupEmptyEditor: state.setupEmptyEditor,
      setupGeneral: state.setupGeneral,
      setEditorTemplates: state.setEditorTemplates,
    }))
  )

  /**
   * SVG URL에서 콘텐츠 가져오기
   */
  const fetchSvgContent = useCallback(async (url: string): Promise<string> => {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`SVG 로드 실패: ${response.status} ${response.statusText}`)
      }
      return await response.text()
    } catch (error) {
      console.error('SVG 로드 오류:', error)
      throw new Error('SVG 로드 중 오류가 발생했습니다.')
    }
  }, [])

  /**
   * 에셋을 캔버스에 추가
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const addAssetToCanvas = useCallback(async (url: string, _objectId: string): Promise<fabric.Object> => {
    if (!url) {
      throw new Error('이미지 URL을 찾을 수 없습니다.')
    }

    // canvas-core API 사용을 위한 import
    const { core } = await import('@storige/canvas-core')

    const isSvg = url.toLowerCase().endsWith('.svg')

    try {
      if (isSvg) {
        // core API를 사용하여 SVG 로드
        const group = await core.loadSVGFromURL(url, {
          left: 0,
          top: 0,
          originX: 'center',
          originY: 'center'
        })

        if (!group) {
          throw new Error('SVG 로딩에 실패했습니다.')
        }

        group.setCoords()
        canvas?.add(group)
        return group
      } else {
        // core API를 사용하여 이미지 로드
        const img = await core.imageFromURL(url, {
          left: 0,
          top: 0,
          originX: 'center',
          originY: 'center'
        })

        if (!img) {
          throw new Error('이미지 로딩에 실패했습니다.')
        }

        canvas?.add(img)
        return img
      }
    } catch (error) {
      console.error('에셋 처리 오류:', error)
      throw error
    }
  }, [canvas])

  /**
   * 객체를 배경으로 설정
   */
  const setAsBackground = useCallback((item: fabric.Object, targetCanvas: fabric.Canvas): fabric.Object | null => {
    const workspace = targetCanvas.getObjects().find((obj) => (obj as ExtendedFabricObject).id === 'workspace')
    if (!workspace) {
      return null
    }

    const prev = targetCanvas.getObjects().find((obj) => (obj as ExtendedFabricObject).extensionType === 'background')
    if (prev) {
      targetCanvas.remove(prev)
    }

    const fitSide = workspace.width! / item.width! > workspace.height! / item.height!
    const scale = fitSide ? workspace.width! / item.width! : workspace.height! / item.height!

    item.set({
      left: workspace.left,
      top: workspace.top,
      originX: 'center',
      originY: 'center'
    })

    const extItem = item as ExtendedFabricObject
    extItem.id = uuid()
    extItem.extensionType = 'background'
    extItem.editable = false
    item.set({
      scaleX: scale,
      scaleY: scale,
      hasControls: false,
      selectable: true,
      lockMovementX: fitSide,
      lockMovementY: !fitSide,
      name: '배경'
    })

    item.sendToBack()
    item.bringForward()

    return item
  }, [])

  /**
   * 캔버스 데이터 로드
   */
  const loadCanvasData = useCallback(async (canvases: unknown[]): Promise<boolean> => {
    editor?.emit('longTask:start', { message: '디자인을 적용하는 중...' })
    try {
      console.log('캔버스 데이터 로드:', canvases)
      clearAll()

      const canvasContainer = document.getElementById('canvas-containers')
      if (canvasContainer) {
        canvasContainer.innerHTML = ''
      }

      // setupCanvas({ page: canvases.length || 1 })

      if (canvases && canvases.length > 0) {
        const loadPromises = allEditors.map((ed: Editor, index: number) => {
          return new Promise<void>((resolve) => {
            if (index >= canvases.length) {
              resolve()
              return
            }

            const plugin = ed.getPlugin<ServicePlugin>('ServicePlugin')
            plugin?.loadJSON(canvases[index] as string | object, async () => {
              const cvs = allCanvas[index]
              if (cvs) {
                const targetObjects = (cvs.getObjects() as fabric.Object[]).filter((obj: fabric.Object) => {
                  const extObj = obj as ExtendedFabricObject
                  return extObj.id === 'workspace' || extObj.id === 'template-background'
                })

                // 스토어에서 직접 최신 설정 가져오기 (stale closure 방지)
                const latestSettings = useSettingsStore.getState().currentSettings
                const latestGetEffectiveValue = useSettingsStore.getState().getEffectiveValue

                targetObjects.forEach((obj: fabric.Object) => {
                  const extObj = obj as ExtendedFabricObject
                  const size = latestSettings.size
                  const totalWidth = latestGetEffectiveValue(size.width + (size.cutSize || 0))
                  const totalHeight = latestGetEffectiveValue(size.height + (size.cutSize || 0))

                  if (extObj.id === 'workspace') {
                    obj.set({
                      width: totalWidth,
                      height: totalHeight,
                      scaleX: 1,
                      scaleY: 1
                    })
                  } else if (extObj.id === 'template-background') {
                    if (!extObj.preventAutoResize) {
                      obj.set({
                        scaleX: totalWidth / obj.width!,
                        scaleY: totalHeight / obj.height!
                      })
                    }
                  }
                })

                ;(cvs.getObjects() as fabric.Object[]).forEach((obj: fabric.Object) => {
                  obj.setCoords()
                  obj.dirty = true
                })

                cvs.requestRenderAll()
              }
              resolve()
            })
          })
        })

        await Promise.all(loadPromises)
        setPage(0)
      }

      console.log('작업물을 불러왔습니다.')
      return true
    } catch (error) {
      console.error('캔버스 데이터 로드 오류:', error)
      throw error
    } finally {
      editor?.emit('longTask:end')
    }
  }, [editor, clearAll, allEditors, allCanvas, setPage])

  /**
   * S3 URL에서 다운로드 URL 생성
   * REST API 방식: S3 URL인 경우 storageApi를 통해 접근 가능한 URL로 변환
   */
  const getDownloadUrl = useCallback(async (url: string): Promise<string> => {
    try {
      if (!url.startsWith('s3://')) {
        return url
      }

      // S3 URL에서 경로 추출 후 storage API URL로 변환
      const path = extractPathFromS3Url(url)
      // storageApi의 getDesignUrl 사용
      return storageApi.getDesignUrl(path)
    } catch (error) {
      console.error('파일 다운로드 URL 생성 중 오류:', error)
      throw error
    }
  }, [])

  /**
   * 편집 디자인 로드
   */
  const loadEditDesign = useCallback(async (item: EditorContent | EditorTemplate, documentURL: string): Promise<void> => {
    if (!item.metadata) {
      console.error('작업물 메타데이터를 찾을 수 없습니다.')
      return
    }

    try {
      // S3 URL인 경우 다운로드 URL로 변환
      const fileUrl = await getDownloadUrl(documentURL)
      const res = await fetch(fileUrl)
      const jsonData = await res.json()

      const canvases: unknown[] = []
      if (Array.isArray(jsonData)) {
        jsonData.forEach((json: unknown) => {
          canvases.push(typeof json === 'string' ? JSON.parse(json) : json)
        })
      } else {
        canvases.push(typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData)
      }

      await loadCanvasData(canvases)

      // 칼선 템플릿 적용
      const cutLineTemplate = safeGetCutLineTemplateUrl(item as EditorTemplate)
      if (cutLineTemplate) {
        const templatePlugin = editor?.getPlugin('TemplatePlugin') as TemplatePlugin
        if (templatePlugin) {
          const cutLineSvgString = await fetchSvgContent(cutLineTemplate)
          await templatePlugin.setCutTemplate(cutLineSvgString, 0)
        }
      }
    } catch (e) {
      console.error('작업물 로드 오류:', e)
    }

    canvas?.clearHistory()
    canvas?.onHistory()
  }, [canvas, editor, loadCanvasData, fetchSvgContent, getDownloadUrl])

  /**
   * 이미지 콘텐츠 설정
   */
  const setupImageContent = useCallback(async (content: EditorContent, targetCanvas: fabric.Canvas): Promise<void> => {
    const imageUrl = safeGetImageUrl(content)
    if (!imageUrl) {
      throw new Error('이미지 URL을 찾을 수 없습니다.')
    }

    const item = await addAssetToCanvas(imageUrl, content.id)
    ;(item as ExtendedFabricObject).extensionType = 'image'
    targetCanvas?.renderAll()
  }, [addAssetToCanvas])

  /**
   * 엘리먼트/도형 콘텐츠 설정
   */
  const setupShapeContent = useCallback(async (content: EditorContent, targetCanvas: fabric.Canvas): Promise<void> => {
    const imageUrl = safeGetImageUrl(content)
    if (!imageUrl) {
      throw new Error('이미지 URL을 찾을 수 없습니다.')
    }

    const item = await addAssetToCanvas(imageUrl, content.id)
    ;(item as ExtendedFabricObject).extensionType = 'shape'
    targetCanvas?.renderAll()
  }, [addAssetToCanvas])

  /**
   * 배경 콘텐츠 설정
   */
  const setupBackgroundContent = useCallback(async (content: EditorContent, targetCanvas: fabric.Canvas): Promise<void> => {
    const imageUrl = safeGetImageUrl(content)
    if (!imageUrl) {
      throw new Error('이미지 URL을 찾을 수 없습니다.')
    }

    const obj = await addAssetToCanvas(imageUrl, content.id)
    setAsBackground(obj, targetCanvas)
  }, [addAssetToCanvas, setAsBackground])

  /**
   * 콘텐츠 로드 - 개별 콘텐츠를 ID로 가져오기
   * REST API를 사용하여 콘텐츠 조회
   */
  const loadContent = useCallback(async (contentId: string, contentType: string): Promise<void> => {
    try {
      console.log('loadContent:', contentId, contentType)

      // REST API로 개별 콘텐츠 조회
      const result = await contentsApi.getContent(contentId)

      if (!result.success || !result.data) {
        console.error('콘텐츠를 불러오는 중 오류가 발생했습니다:', result.error?.message)
        return
      }

      const content = result.data
      console.log('loaded content', content)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await setupEditContent(content as any, contentType)
    } catch (e) {
      console.error('콘텐츠 로드 중 오류 발생:', e)
    }
  }, [])

  /**
   * 에셋 설정 - 콘텐츠 타입별로 캔버스에 추가
   */
  const setupAsset = useCallback(async (content: EditorContent | EditorTemplate, contentType: string): Promise<void> => {
    if (!content || !canvas) return

    try {
      switch (contentType) {
        case 'image':
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await setupImageContent(content as any, canvas)
          break
        case 'frame':
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await setupFrameContent(content as any, canvas)
          break
        case 'element':
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await setupShapeContent(content as any, canvas)
          break
        case 'background':
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await setupBackgroundContent(content as any, canvas)
          break
        case 'template':
          await setupTemplateContent(content as EditorTemplate)
          break
        default:
          break
      }

      updateObjects()
    } catch (error) {
      console.error('에셋 설정 오류:', error)
    }
  }, [canvas, updateObjects])

  /**
   * 편집 콘텐츠 설정 - 기존 콘텐츠 편집 모드
   */
  const setupEditContent = useCallback(async (content: EditorContent | EditorTemplate, contentType: string): Promise<void> => {
    if (!content) {
      console.error('콘텐츠 정보를 찾을 수 없습니다.')
      return
    }

    try {
      editor?.emit('longTask:start', { message: '콘텐츠를 로드하는 중...' })
      clearAll()

      // 콘텐츠 메타데이터에서 크기 정보 추출 (향후 settings 스토어에 적용)
      const _sizeInfo = safeGetMetadata(content, 'sizeinfo', {})
      const _printSize = safeGetMetadata(content, 'printingSize', {})
      console.log('콘텐츠 크기 정보:', _sizeInfo, _printSize)

      // 문서 URL 확인
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let documentURL = (content as any)?.design?.document?.url || null
      const workId = safeGetMetadata(content, 'workId')

      // 작업물 ID가 있으면 기존 작업물 로드
      if (workId) {
        try {
          // 기존 작업물 로드 로직 - GraphQL 쿼리 필요시 추가 구현
          console.log('작업물 로드:', workId)
        } catch (e) {
          console.error('작업물 로드 중 오류 발생:', e)
        }
      }

      // 문서가 있으면 로드
      if (documentURL) {
        console.log('문서 로드:', documentURL)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await loadEditDesign(content as any, documentURL)
      } else {
        // 기본 에셋으로 설정
        await setupAsset(content, contentType)
      }

      console.log('콘텐츠가 성공적으로 로드되었습니다.')
    } catch (error) {
      console.error('콘텐츠 로드 중 오류 발생:', error)
    } finally {
      editor?.emit('longTask:end')
    }
  }, [editor, clearAll, loadEditDesign])

  /**
   * SVG 문자열로부터 템플릿 설정
   */
  const setupTemplateFromSvgString = useCallback(async (
    svgString: string,
    cutLineSvgString?: string | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options?: { viaUpload?: boolean }
  ): Promise<boolean> => {
    editor?.emit('longTask:start', { message: '템플릿을 적용하는 중...' })
    try {
      if (!svgString) {
        throw new Error('SVG 문자열이 제공되지 않았습니다.')
      }

      const pages = await SvgUtils.loadPagesFromSvgString(svgString)
      console.log('템플릿 페이지:', pages.length)

      clearAll()

      // setupCanvas({ page: pages.length })

      // 각 페이지 처리
      for (let i = 0; i < pages.length; i++) {
        const ed = allEditors[i]
        const cvs = allCanvas[i]

        if (ed && cvs) {
          await new Promise<void>((resolve) => {
            canvas?.offHistory()

            const plugin = ed.getPlugin('TemplatePlugin') as TemplatePlugin
            if (!plugin) {
              console.warn(`페이지 ${i + 1}의 템플릿 플러그인을 찾을 수 없습니다.`)
              resolve()
              return
            }

            try {
              const pageData = pages[i]
              plugin.addTemplateToCanvas(pageData.objects).then(() => {
                if (cutLineSvgString) {
                  plugin.setCutTemplate(cutLineSvgString, 0).then(() => {
                    cvs.onHistory()
                    cvs.requestRenderAll()
                    resolve()
                  }).catch(() => {
                    cvs.onHistory()
                    resolve()
                  })
                } else {
                  cvs.onHistory()
                  cvs.requestRenderAll()
                  resolve()
                }
              }).catch(() => {
                cvs.onHistory()
                resolve()
              })
            } catch (err) {
              console.error(`페이지 ${i + 1} 템플릿 적용 오류:`, err)
              cvs.onHistory()
              resolve()
            }
          })
        }
      }

      if (allCanvas.length > 0) {
        setPage(0)
      }

      console.log('템플릿이 성공적으로 적용되었습니다.')
      return true
    } catch (e) {
      console.error('템플릿 적용 중 오류 발생:', e)
      return false
    } finally {
      editor?.emit('longTask:end')
    }
  }, [editor, canvas, clearAll, allEditors, allCanvas, setPage])

  /**
   * 워크스페이스 초기화 (canvas 크기 및 workspace 설정)
   * 주의: 스토어에서 직접 최신 설정을 가져와야 함 (useCallback의 stale closure 문제 방지)
   */
  const initWorkspace = useCallback(async (): Promise<void> => {
    if (!editor || !canvas) return

    // 캔버스가 dispose되었는지 확인 (React Strict Mode 이중 마운트 대응)
    if (!canvas.getContext()) {
      console.warn('[EditorContents] Canvas has been disposed, skipping initWorkspace')
      return
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const workspacePlugin = getPlugin<any>('WorkspacePlugin')

      if (workspacePlugin) {
        // 스토어에서 직접 최신 설정 가져오기 (stale closure 방지)
        const latestSettings = useSettingsStore.getState().currentSettings

        console.log('[EditorContents] initWorkspace with settings:', latestSettings)

        // setOptions로 설정 적용 (setSize 메서드는 존재하지 않음)
        workspacePlugin.setOptions(latestSettings)

        // init으로 워크스페이스 초기화
        workspacePlugin.init()
      }
    } catch (e) {
      console.error('워크스페이스 초기화 오류:', e)
    }
  }, [editor, canvas, getPlugin])

  // 사용 케이스 기반 로더들
  const loadForUseCase = useCallback(async <T extends EditorUseCase>(
    useCase: T,
    config: UseCaseConfigMap[T]
  ): Promise<void> => {
    console.log(`[EditorContents] Loading for use case: ${useCase}`, config)

    switch (useCase) {
      case 'product-based':
        return await loadProductBasedEditor(config as ProductBasedSetupConfig)
      case 'content-edit':
        return await loadContentEditor(config as ContentEditSetupConfig)
      case 'empty':
        return await loadEmptyEditor(config as EmptyEditorSetupConfig | undefined)
      case 'general':
        return await loadGeneralEditor(config as GeneralSetupConfig | undefined)
      default:
        console.warn(`Unknown use case: ${useCase}`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadProductBasedEditor = useCallback(async (config: ProductBasedSetupConfig): Promise<void> => {
    console.log('[EditorContents] loadProductBasedEditor called with config:', config)
    console.log('[EditorContents] Product ID:', config.product?.id)
    console.log('[EditorContents] Product title:', config.product?.title)

    try {
      editor?.emit('longTask:start', { message: '상품 정보를 설정하는 중...' })

      // 1. settings 스토어 설정 - 이 단계에서 size, dpi 등 설정이 적용됨
      console.log('[EditorContents] Calling setupProductBased...')
      await setupProductBased(config)
      console.log('[EditorContents] setupProductBased completed')

      // 2. 에디터 템플릿 저장
      const allTemplates = config.product?.editorTemplates ||
        config.product?.template?.editorPreset?.editorTemplates || []
      setEditorTemplates(allTemplates)

      // 3. 기본 템플릿 로드 또는 워크스페이스 초기화
      const preset = config.product.template?.editorPreset
      const defaultId = preset?.defaultTemplate?.id

      let templateLoaded = false

      if (allTemplates.length > 0) {
        // 기본 템플릿 찾기
        const defaultTemplate = allTemplates.find(t => t.id === defaultId)
        const sizeMatchTemplate = allTemplates.find(t => t.sizeNo === config.sizeno)
        const templateToLoad = sizeMatchTemplate || defaultTemplate || allTemplates[0]

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const designUrl = (templateToLoad as any)?.design?.document?.url
        if (designUrl) {
          console.log('[EditorContents] Loading template:', templateToLoad.name)
          try {
            const svgString = await fetchSvgContent(designUrl)
            await setupTemplateFromSvgString(svgString, null)
            templateLoaded = true
          } catch (e) {
            console.error('[EditorContents] Template loading error:', e)
          }
        }
      }

      // 4. 템플릿이 로드되지 않았으면 워크스페이스만 초기화
      // 기존 Vue 로직: 템플릿 없어도 setupCanvas 호출하여 빈 캔버스 초기화
      if (!templateLoaded) {
        console.log('[EditorContents] No template loaded, initializing workspace only')
        await initWorkspace()

        // 캔버스 렌더링 요청
        canvas?.requestRenderAll()
      }

      console.log('[EditorContents] Product-based editor loaded successfully')
    } catch (error) {
      console.error('[EditorContents] Product-based editor load error:', error)
      throw error
    } finally {
      editor?.emit('longTask:end')
    }
  }, [editor, canvas, setupProductBased, initWorkspace, setEditorTemplates, fetchSvgContent, setupTemplateFromSvgString])

  const loadContentEditor = useCallback(async (config: ContentEditSetupConfig): Promise<void> => {
    console.log('[EditorContents] Loading content editor', config)
    // TODO: GraphQL로 콘텐츠 데이터 가져와서 로드
    await initWorkspace()
  }, [initWorkspace])

  const loadEmptyEditor = useCallback(async (config?: EmptyEditorSetupConfig): Promise<void> => {
    console.log('[EditorContents] Loading empty editor', config)

    try {
      editor?.emit('longTask:start', { message: '빈 에디터를 준비하는 중...' })

      await setupEmptyEditorStore(config)
      await initWorkspace()

      console.log('[EditorContents] Empty editor loaded successfully')
    } catch (error) {
      console.error('[EditorContents] Empty editor load error:', error)
      throw error
    } finally {
      editor?.emit('longTask:end')
    }
  }, [editor, setupEmptyEditorStore, initWorkspace])

  const loadGeneralEditor = useCallback(async (config?: GeneralSetupConfig): Promise<void> => {
    console.log('[EditorContents] Loading general editor', config)

    try {
      editor?.emit('longTask:start', { message: '에디터를 준비하는 중...' })

      await setupGeneralStore(config)
      await initWorkspace()

      console.log('[EditorContents] General editor loaded successfully')
    } catch (error) {
      console.error('[EditorContents] General editor load error:', error)
      throw error
    } finally {
      editor?.emit('longTask:end')
    }
  }, [editor, setupGeneralStore, initWorkspace])

  /**
   * 템플릿 콘텐츠 설정
   */
  const setupTemplateContent = useCallback(async (content: EditorTemplate): Promise<void> => {
    const templateUrl = safeGetTemplateUrl(content)
    if (!templateUrl) {
      console.error('템플릿 콘텐츠에 디자인 URL이 없습니다.')
      return
    }

    try {
      const svgString = await fetchSvgContent(templateUrl)
      const cutLineSvgUrl = safeGetCutLineTemplateUrl(content)
      const cutLineSvgString = cutLineSvgUrl ? await fetchSvgContent(cutLineSvgUrl) : null
      await setupTemplateFromSvgString(svgString, cutLineSvgString)
    } catch (e) {
      console.error('템플릿 콘텐츠 설정 오류:', e)
    }
  }, [fetchSvgContent, setupTemplateFromSvgString])

  /**
   * 프레임 콘텐츠 설정
   */
  const setupFrameContent = useCallback(async (content: EditorContent, targetCanvas: fabric.Canvas): Promise<void> => {
    const imageUrl = safeGetImageUrl(content)
    if (!imageUrl) {
      console.error('프레임 콘텐츠에 이미지 URL이 없습니다.')
      return
    }

    try {
      const workspace = targetCanvas?.getObjects().find((obj) => (obj as ExtendedFabricObject).id === 'workspace')
      if (!workspace) {
        console.error('워크스페이스를 찾을 수 없습니다.')
        return
      }

      const asset = await addAssetToCanvas(imageUrl, content.id)
      if (asset) {
        const centerPoint = workspace.getCenterPoint()
        ;(asset as ExtendedFabricObject).extensionType = 'frame'
        asset.set({
          left: centerPoint.x,
          top: centerPoint.y,
          originX: 'center',
          originY: 'center'
        })
        targetCanvas?.requestRenderAll()
      }
    } catch (e) {
      console.error('프레임 콘텐츠 설정 오류:', e)
    }
  }, [addAssetToCanvas])

  return {
    loadContent,
    loadCanvasData,
    loadEditDesign,
    setupAsset,
    setupEditContent,
    setupTemplateFromSvgString,
    setupTemplateContent,
    setupFrameContent,
    addAssetToCanvas,
    setAsBackground,
    loadForUseCase,
    loadProductBasedEditor,
    loadContentEditor,
    loadEmptyEditor,
    loadGeneralEditor
  }
}
