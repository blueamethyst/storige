import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { useAppStore } from '@/stores/useAppStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useTemplateSave } from '@/hooks/useTemplateSave'
import { templatesApi } from '@/api'
import { createCanvas } from '@/utils/createCanvas'
import { ServicePlugin } from '@storige/canvas-core'
import ToolBar from '@/components/editor/ToolBar'
import FeatureSidebar from '@/components/editor/FeatureSidebar'
import ControlBar from '@/components/editor/ControlBar'
import SidePanel from '@/components/editor/SidePanel'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Layers,
  Save,
  X,
  Check,
} from 'lucide-react'
import type { TemplateType } from '@storige/types'

// PostMessage 이벤트 타입
interface TemplateEditorMessage {
  type: 'TEMPLATE_SAVED' | 'TEMPLATE_CLOSED' | 'TEMPLATE_READY'
  payload?: {
    templateId?: string
    success?: boolean
    error?: string
  }
}

/**
 * TemplateEditorView - 템플릿 생성/편집 전용 에디터 뷰
 * Admin 대시보드에서 iframe으로 로드되어 사용됨
 */
export default function TemplateEditorView() {
  const [searchParams] = useSearchParams()
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const isInitializedRef = useRef(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [showSidePanel, setShowSidePanel] = useState(false)
  const [templateName, setTemplateName] = useState('새 템플릿')

  // Query parameters
  const templateId = searchParams.get('templateId')
  const token = searchParams.get('token')
  const nameParam = searchParams.get('name')
  const widthParam = searchParams.get('width')
  const heightParam = searchParams.get('height')
  const typeParam = searchParams.get('type') as TemplateType | null

  // Stores
  const { setToken, initializeFromStorage } = useAuthStore()
  const {
    ready,
    showSidePanel: sidePanelState,
    setShowSidePanel: setSidePanelState,
    setReady,
    startInitialization,
    cancelInitialization,
    updateObjects,
    editor,
    canvas,
  } = useAppStore()
  const { updateSettings } = useSettingsStore()

  // Template save hook
  const { saving, saveTemplate, updateExistingTemplate } = useTemplateSave()

  // 부모 창에 메시지 전송
  const sendMessageToParent = useCallback((message: TemplateEditorMessage) => {
    if (window.parent !== window) {
      window.parent.postMessage(message, '*')
    }
  }, [])

  // 초기화 및 인증
  useEffect(() => {
    initializeFromStorage()
    if (token) {
      setToken(token)
    }
    // URL에서 전달된 이름이 있으면 초기값으로 설정
    if (nameParam) {
      setTemplateName(nameParam)
    }
  }, [token, setToken, initializeFromStorage, nameParam])

  // 캔버스 초기화
  useEffect(() => {
    if (!canvasContainerRef.current) return
    if (useAppStore.getState().ready) {
      console.log('[TemplateEditorView] Already initialized, skipping')
      return
    }

    let isMounted = true

    const initializeEditor = async () => {
      try {
        setIsLoading(true)
        setLoadingMessage('에디터를 초기화하는 중...')

        // 기존 캔버스 정리
        const container = document.getElementById('canvas-containers')
        if (container) {
          container.innerHTML = ''
        }
        useAppStore.getState().reset()

        const initId = startInitialization()

        // 캔버스 크기 설정
        const width = widthParam ? parseInt(widthParam) : 210
        const height = heightParam ? parseInt(heightParam) : 297

        // 설정 업데이트
        updateSettings({
          size: {
            width,
            height,
            cutSize: 3,
            safeSize: 3,
          },
          unit: 'mm',
        })

        // 캔버스 초기화
        const fabricCanvas = await createCanvas({}, canvasContainerRef.current!, initId)

        if (!isMounted) {
          fabricCanvas.dispose()
          return
        }

        // 캔버스 크기 조정
        const containerWidth = canvasContainerRef.current?.clientWidth || 800
        const containerHeight = canvasContainerRef.current?.clientHeight || 600
        fabricCanvas.setDimensions({
          width: containerWidth,
          height: containerHeight,
        })

        // 에디터 가져오기
        const appStore = useAppStore.getState()
        const newEditor = appStore.editor

        // 이벤트 리스너 등록
        fabricCanvas.on('selection:created', () => updateObjects())
        fabricCanvas.on('selection:updated', () => updateObjects())
        fabricCanvas.on('selection:cleared', () => updateObjects())
        fabricCanvas.on('object:added', () => updateObjects())
        fabricCanvas.on('object:removed', () => updateObjects())
        fabricCanvas.on('object:modified', () => updateObjects())

        // Long task 이벤트 리스너
        if (newEditor) {
          newEditor.on('longTask:start', (options: { message: string }) => {
            setIsLoading(true)
            setLoadingMessage(options.message)
          })

          newEditor.on('longTask:end', () => {
            setIsLoading(false)
            setLoadingMessage('')
          })
        }

        if (!isMounted) {
          fabricCanvas.dispose()
          return
        }

        // 기존 템플릿 로드 (편집 모드)
        if (templateId) {
          setLoadingMessage('템플릿을 불러오는 중...')
          try {
            const template = await templatesApi.getTemplate(templateId)
            setTemplateName(template.name)

            // 캔버스에 템플릿 데이터 로드
            const servicePlugin = newEditor?.getPlugin('ServicePlugin') as ServicePlugin
            if (servicePlugin && template.canvasData) {
              await servicePlugin.loadJSON(JSON.stringify(template.canvasData))
            }
          } catch (error) {
            console.error('[TemplateEditorView] Failed to load template:', error)
          }
        }

        if (!isMounted) return

        // 초기화 완료
        setReady(true)
        isInitializedRef.current = true

        // 부모 창에 준비 완료 알림
        sendMessageToParent({ type: 'TEMPLATE_READY' })

        console.log('[TemplateEditorView] Editor initialized successfully')
      } catch (error) {
        console.error('[TemplateEditorView] Failed to initialize editor:', error)
      } finally {
        if (isMounted) {
          setIsLoading(false)
          setLoadingMessage('')
        }
      }
    }

    initializeEditor()

    // Cleanup
    return () => {
      isMounted = false
      cancelInitialization()

      const { allCanvas: canvases, allEditors: editors, reset } = useAppStore.getState()

      canvases.forEach((cvs) => {
        try {
          if (!cvs) return
          cvs.off()
          cvs.disposed = true
          cvs.dispose()
        } catch (e) {
          if (!(e instanceof TypeError && String(e).includes('clearRect'))) {
            console.error('Canvas dispose error:', e)
          }
        }
      })

      editors.forEach((ed) => {
        try {
          ed?.dispose()
        } catch (e) {
          console.error('Editor dispose error:', e)
        }
      })

      const containerEl = document.getElementById('canvas-containers')
      if (containerEl) {
        containerEl.innerHTML = ''
      }

      reset()
      isInitializedRef.current = false

      console.log('[TemplateEditorView] Editor cleanup completed')
    }
  }, [templateId, widthParam, heightParam, updateSettings, startInitialization, cancelInitialization, setReady, updateObjects, sendMessageToParent])

  // 템플릿 저장 핸들러
  const handleSaveTemplate = useCallback(async () => {
    if (!ready || saving) return

    try {
      setIsLoading(true)
      setLoadingMessage('템플릿을 저장하는 중...')

      const width = widthParam ? parseInt(widthParam) : 210
      const height = heightParam ? parseInt(heightParam) : 297

      let savedTemplate
      if (templateId) {
        // 기존 템플릿 업데이트
        savedTemplate = await updateExistingTemplate(templateId, {
          name: templateName,
          type: typeParam || 'page',
          width,
          height,
        })
      } else {
        // 새 템플릿 생성
        savedTemplate = await saveTemplate({
          name: templateName,
          type: typeParam || 'page',
          width,
          height,
        })
      }

      if (savedTemplate) {
        // 부모 창에 저장 완료 알림
        sendMessageToParent({
          type: 'TEMPLATE_SAVED',
          payload: {
            templateId: savedTemplate.id,
            success: true,
          },
        })
      }
    } catch (error) {
      console.error('템플릿 저장 실패:', error)
      sendMessageToParent({
        type: 'TEMPLATE_SAVED',
        payload: {
          success: false,
          error: error instanceof Error ? error.message : '템플릿 저장에 실패했습니다',
        },
      })
    } finally {
      setIsLoading(false)
      setLoadingMessage('')
    }
  }, [ready, saving, templateId, templateName, typeParam, widthParam, heightParam, saveTemplate, updateExistingTemplate, sendMessageToParent])

  // 닫기 핸들러
  const handleClose = useCallback(() => {
    sendMessageToParent({ type: 'TEMPLATE_CLOSED' })
  }, [sendMessageToParent])

  // 템플릿 이름 변경
  const handleNameChange = useCallback((e: React.FocusEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>) => {
    if ('key' in e && e.key !== 'Enter') return
    const target = e.target as HTMLInputElement
    setTemplateName(target.value || '새 템플릿')
    if (e.type === 'keydown') {
      target.blur()
    }
  }, [])

  return (
    <TooltipProvider>
      <div id="template-editor" className="flex flex-col h-full w-full absolute">
        {/* Header */}
        <nav className="h-14 bg-editor-panel border-b border-editor-border flex items-center px-4 z-[100]">
          {/* 왼쪽: 템플릿 이름 */}
          <div className="flex items-center gap-4">
            <input
              type="text"
              defaultValue={templateName}
              placeholder="템플릿 이름"
              className="bg-transparent border-none outline-none text-editor-text text-base font-medium w-40 md:w-auto focus:ring-1 focus:ring-editor-accent rounded px-2 py-1"
              onBlur={handleNameChange}
              onKeyDown={handleNameChange}
            />
            <span className="text-xs text-editor-text-muted">
              {typeParam || 'page'} | {widthParam || 210}×{heightParam || 297}mm
            </span>
          </div>

          {/* 오른쪽: 액션 버튼들 */}
          <div className="ml-auto flex items-center gap-2 md:gap-4">
            {/* 저장 버튼 */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveTemplate}
              disabled={!ready || saving}
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-editor-text mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              저장
            </Button>

            {/* 저장 후 닫기 버튼 */}
            <Button
              onClick={async () => {
                await handleSaveTemplate()
                handleClose()
              }}
              disabled={!ready || saving}
              className="bg-editor-accent hover:bg-editor-accent-hover text-white"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              저장 후 닫기
            </Button>

            {/* 구분선 */}
            <div className="w-px h-6 bg-editor-border" />

            {/* 레이어 패널 토글 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setShowSidePanel(!showSidePanel)}>
                  <Layers className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>레이어 패널</TooltipContent>
            </Tooltip>

            {/* 닫기 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleClose}>
                  <X className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>닫기</TooltipContent>
            </Tooltip>
          </div>
        </nav>

        {/* Main Layout */}
        <div className="flex-1 flex relative overflow-hidden">
          {/* Tool Sidebar */}
          <ToolBar horizontal={false} />

          {/* Feature Sidebar or Control Bar */}
          <FeatureSidebar />
          {ready && <ControlBar />}

          {/* Canvas Area */}
          <main className="flex-1 relative overflow-hidden bg-editor-workspace">
            <div
              id="canvas-wrapper"
              className="h-full w-full overflow-hidden relative"
            >
              <div id="workspace" className="workspace absolute inset-0 flex items-center justify-center">
                <div className="inside-shadow absolute inset-0 shadow-inner pointer-events-none" />
                <div
                  ref={canvasContainerRef}
                  id="canvas-containers"
                  className="relative"
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </div>
          </main>

          {/* Side Panel */}
          <SidePanel show={showSidePanel} onClose={() => setShowSidePanel(false)} />
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-editor-accent" />
              <p className="text-editor-text">{loadingMessage || '로딩 중...'}</p>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
