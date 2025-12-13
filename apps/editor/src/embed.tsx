/**
 * Storige Editor - Embeddable Entry Point
 *
 * PHP 쇼핑몰 등 외부 페이지에서 에디터를 임베딩할 수 있는 진입점
 *
 * 사용 예시:
 * ```html
 * <div id="editor-root"></div>
 * <script src="editor-bundle.js"></script>
 * <script>
 *   const editor = window.StorigeEditor.create({
 *     templateSetId: 'ts-001',
 *     productId: 'PROD-001',
 *     token: 'jwt-token',
 *     onComplete: (result) => console.log(result)
 *   });
 *   editor.mount('editor-root');
 * </script>
 * ```
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { createRoot, Root } from 'react-dom/client'
import { useAppStore } from './stores/useAppStore'
import { useEditorContents } from './hooks/useEditorContents'
import { createCanvas } from './utils/createCanvas'
import { templatesApi, editSessionsApi, apiClient, type EditSessionResponse } from './api'
import type { ApiError } from './api/client'
import ToolBar from './components/editor/ToolBar'
import FeatureSidebar from './components/editor/FeatureSidebar'
import ControlBar from './components/editor/ControlBar'
import SidePanel from './components/editor/SidePanel'
import EditorHeader from './components/editor/EditorHeader'
import './index.css'

// ============================================================
// Types
// ============================================================

export interface EditorConfig {
  /** 편집 모드 (bookmoa 연동용) */
  mode?: 'cover' | 'content' | 'both' | 'template'
  /** 주문 번호 (bookmoa 연동용) */
  orderSeqno?: number
  /** 템플릿셋 ID (필수) */
  templateSetId: string
  /** 쇼핑몰 상품 ID */
  productId?: string
  /** API 인증 토큰 (필수, 없으면 쿠키 기반 인증 사용) */
  token?: string
  /** 기존 편집 세션 ID (재편집시) */
  sessionId?: string
  /** 표지 파일 ID (bookmoa 연동용) */
  coverFileId?: string
  /** 내지 파일 ID (bookmoa 연동용) */
  contentFileId?: string
  /** API 기본 URL */
  apiBaseUrl?: string
  /** 동적 옵션 */
  options?: {
    /** 페이지 수 */
    pages?: number
    /** 판형 크기 */
    size?: { width: number; height: number }
    /** 제본 방식 */
    binding?: 'perfect' | 'saddle' | 'spring'
    /** 재단 여백 */
    bleed?: number
    /** 종이 두께 */
    paperThickness?: number
    /** 날개 설정 */
    coverWing?: { front: number; back: number }
    /** 종이 정보 */
    paper?: { type: string; weight: number }
  }
  /** 편집 완료 콜백 */
  onComplete?: (result: EditorResult) => void
  /** 편집 취소 콜백 */
  onCancel?: () => void
  /** 에러 발생 콜백 */
  onError?: (error: Error | EditorError) => void
  /** 저장 완료 콜백 */
  onSave?: (result: SaveResult) => void
  /** 준비 완료 콜백 */
  onReady?: () => void
}

export interface EditorError {
  code: 'AUTH_EXPIRED' | 'NETWORK_ERROR' | 'SAVE_FAILED' | 'INVALID_DATA' | 'SESSION_NOT_FOUND'
  message: string
}

export interface EditorResult {
  sessionId: string
  orderSeqno?: number
  editCode?: string
  pages: {
    initial: number
    final: number
  }
  files: {
    coverFileId?: string
    contentFileId?: string
    cover?: string
    content?: string
    thumbnailUrl?: string
    thumbnail?: string
  }
  savedAt: string
}

export interface SaveResult {
  sessionId: string
  savedAt: string
  thumbnail?: string
}

export interface EditorState {
  ready: boolean
  modified: boolean
  currentPage: number
  totalPages: number
}

// ============================================================
// Embedded Editor Component
// ============================================================

interface EmbeddedEditorProps extends EditorConfig {
  instanceRef: React.MutableRefObject<EditorInstanceMethods | null>
}

// Edit Session API integration
interface EditSessionCreatePayload {
  orderSeqno: number
  mode: 'cover' | 'content' | 'both' | 'template'
  coverFileId?: string
  contentFileId?: string
  templateSetId?: string
  metadata?: Record<string, any>
}

interface EditorInstanceMethods {
  save: () => Promise<SaveResult>
  complete: () => Promise<void>
  cancel: () => void
  undo: () => void
  redo: () => void
  getState: () => EditorState
}

function EmbeddedEditor({
  mode,
  orderSeqno,
  templateSetId,
  productId,
  token,
  sessionId,
  coverFileId,
  contentFileId,
  apiBaseUrl,
  options,
  onComplete,
  onCancel,
  onError,
  onSave,
  onReady,
  instanceRef,
}: EmbeddedEditorProps) {
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const isInitializedRef = useRef(false)
  const [screenMode, setScreenMode] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')
  const [isLoading, setIsLoading] = useState(true)
  const [loadingMessage, setLoadingMessage] = useState('에디터를 초기화하는 중...')
  const [error, setError] = useState<string | null>(null)
  const [currentSession, setCurrentSession] = useState<EditSessionResponse | null>(null)

  // Store state
  const {
    ready,
    showSidePanel,
    setShowSidePanel,
    setReady,
    startInitialization,
    cancelInitialization,
    updateObjects,
    editor,
  } = useAppStore()

  const { loadEmptyEditor } = useEditorContents()

  // Screen resize handler
  const handleResize = useCallback(() => {
    const width = window.innerWidth
    if (width < 768) {
      setScreenMode('mobile')
    } else if (width < 1024) {
      setScreenMode('tablet')
    } else {
      setScreenMode('desktop')
    }
  }, [])

  // Handle window resize
  useEffect(() => {
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [handleResize])

  // 인증 만료 이벤트 핸들링
  useEffect(() => {
    const unsubscribe = apiClient.onAuthExpired(() => {
      console.warn('[EmbeddedEditor] Auth token expired')
      onError?.({
        code: 'AUTH_EXPIRED',
        message: '인증이 만료되었습니다. 페이지를 새로고침해주세요.',
      })
    })
    return unsubscribe
  }, [onError])

  // Main initialization
  useEffect(() => {
    if (!canvasContainerRef.current) return
    if (useAppStore.getState().ready) return

    let isMounted = true

    const initializeEditor = async () => {
      try {
        setIsLoading(true)
        setLoadingMessage('에디터를 초기화하는 중...')
        setError(null)

        // ========== 1. 인증 설정 (API 호출 전에 반드시 먼저 실행) ==========
        // API Base URL 설정
        if (apiBaseUrl) {
          const { apiClient } = await import('./api')
          apiClient.setBaseUrl(apiBaseUrl)
          console.log('[EmbeddedEditor] API Base URL set:', apiBaseUrl)
        }

        // 토큰 우선순위 처리: 파라미터 > localStorage > 에러
        let effectiveToken: string | null = null
        if (token) {
          effectiveToken = token
          localStorage.setItem('auth_token', token)
          console.log('[EmbeddedEditor] Using token from parameter')
        } else {
          effectiveToken = localStorage.getItem('auth_token')
          if (effectiveToken) {
            console.log('[EmbeddedEditor] Using token from localStorage')
          }
        }

        if (!effectiveToken) {
          throw new Error('접근 권한이 없습니다. 로그인 후 다시 시도해주세요.')
        }
        // ========== 인증 설정 완료 ==========

        // Clean up existing canvas
        const container = document.getElementById('canvas-containers')
        if (container) {
          container.innerHTML = ''
        }
        useAppStore.getState().reset()

        // Start initialization session
        const initId = startInitialization()

        // 2. Fetch or create edit session (if bookmoa integration)
        let editSession: EditSessionResponse | null = null
        if (orderSeqno && mode) {
          setLoadingMessage('편집 세션을 불러오는 중...')

          if (sessionId) {
            // 기존 세션 불러오기
            try {
              editSession = await editSessionsApi.get(sessionId)
              console.log('[EmbeddedEditor] Existing session loaded:', editSession.id)
            } catch (err) {
              console.warn('[EmbeddedEditor] Session not found, creating new one:', sessionId)
            }
          }

          // 기존 세션이 없으면 새로 생성
          if (!editSession) {
            editSession = await editSessionsApi.create({
              orderSeqno,
              mode,
              coverFileId,
              contentFileId,
              templateSetId,
            })
            console.log('[EmbeddedEditor] New session created:', editSession.id)
          }

          setCurrentSession(editSession)
        }

        if (!isMounted) return

        // 3. Fetch template set info
        setLoadingMessage('템플릿셋 정보를 불러오는 중...')
        const templateSetResponse = await templatesApi.getTemplateSet(templateSetId)

        // API returns { success, data, error } or direct data
        const templateSet = templateSetResponse.data ?? templateSetResponse
        if (!templateSet || !templateSet.id) {
          throw new Error('템플릿셋을 찾을 수 없습니다.')
        }
        console.log('[EmbeddedEditor] TemplateSet loaded:', templateSet.name)

        if (!isMounted) return

        // 2. Create canvas
        setLoadingMessage('캔버스를 초기화하는 중...')
        const fabricCanvas = await createCanvas({}, canvasContainerRef.current!, initId)

        if (!isMounted) {
          fabricCanvas.dispose()
          return
        }

        // Set canvas dimensions
        const containerWidth = canvasContainerRef.current?.clientWidth || 800
        const containerHeight = canvasContainerRef.current?.clientHeight || 600
        fabricCanvas.setDimensions({
          width: containerWidth,
          height: containerHeight,
        })

        // Event listeners
        fabricCanvas.on('selection:created', () => updateObjects())
        fabricCanvas.on('selection:updated', () => updateObjects())
        fabricCanvas.on('selection:cleared', () => updateObjects())
        fabricCanvas.on('object:added', () => updateObjects())
        fabricCanvas.on('object:removed', () => updateObjects())
        fabricCanvas.on('object:modified', () => updateObjects())

        const appStore = useAppStore.getState()
        const newEditor = appStore.editor

        if (newEditor) {
          newEditor.on('longTask:start', (opts: { message: string }) => {
            setIsLoading(true)
            setLoadingMessage(opts.message)
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

        // 3. Load content based on template set
        setLoadingMessage('콘텐츠를 불러오는 중...')
        await loadEmptyEditor({
          name: templateSet.name,
          size: {
            width: templateSet.width,
            height: templateSet.height,
            cutSize: 3,
            safeSize: 3,
          },
          unit: 'mm',
        })

        if (!isMounted) return

        // 4. Complete initialization
        setReady(true)
        isInitializedRef.current = true
        setIsLoading(false)

        console.log('[EmbeddedEditor] Initialization complete')
        onReady?.()
      } catch (err) {
        console.error('[EmbeddedEditor] Initialization error:', err)

        // API 에러 타입 확인
        const apiError = err as ApiError
        let errorCode: EditorError['code'] = 'INVALID_DATA'
        let errorMessage = '초기화 중 오류가 발생했습니다.'

        if (apiError.code) {
          switch (apiError.code) {
            case 'AUTH_EXPIRED':
              errorCode = 'AUTH_EXPIRED'
              errorMessage = apiError.message || '인증이 만료되었습니다.'
              break
            case 'NETWORK_ERROR':
            case 'TIMEOUT':
              errorCode = 'NETWORK_ERROR'
              errorMessage = apiError.message || '네트워크 연결을 확인해주세요.'
              break
            case 'SERVER_ERROR':
              errorCode = 'NETWORK_ERROR'
              errorMessage = apiError.message || '서버 오류가 발생했습니다.'
              break
            default:
              errorMessage = apiError.message || errorMessage
          }
        } else if (err instanceof Error) {
          errorMessage = err.message
        }

        setError(errorMessage)
        setIsLoading(false)
        onError?.({ code: errorCode, message: errorMessage })
      }
    }

    initializeEditor()

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
          // Ignore dispose errors
        }
      })

      editors.forEach((ed) => {
        try {
          ed?.dispose()
        } catch (e) {
          // Ignore dispose errors
        }
      })

      const containerEl = document.getElementById('canvas-containers')
      if (containerEl) {
        containerEl.innerHTML = ''
      }

      reset()
      isInitializedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Expose instance methods
  useEffect(() => {
    instanceRef.current = {
      save: async () => {
        const currentSessionId = currentSession?.id || sessionId

        if (!currentSessionId) {
          throw new Error('편집 세션이 없습니다.')
        }

        try {
          // Get canvas data from editor
          const canvasData = editor?.toJSON() || null

          // Update edit session with canvas data
          const updatedSession = await editSessionsApi.update(currentSessionId, {
            canvasData,
            status: 'editing',
          })

          setCurrentSession(updatedSession)

          const result: SaveResult = {
            sessionId: updatedSession.id,
            savedAt: updatedSession.updatedAt,
            thumbnail: updatedSession.coverFile?.thumbnailUrl || undefined,
          }

          console.log('[EmbeddedEditor] Save completed:', result.sessionId)
          onSave?.(result)
          return result
        } catch (err) {
          console.error('[EmbeddedEditor] Save failed:', err)
          onError?.({
            code: 'SAVE_FAILED',
            message: err instanceof Error ? err.message : '저장에 실패했습니다.',
          })
          throw err
        }
      },

      complete: async () => {
        const currentSessionId = currentSession?.id || sessionId

        if (!currentSessionId) {
          throw new Error('편집 세션이 없습니다.')
        }

        try {
          // First save current state
          const canvasData = editor?.toJSON() || null
          await editSessionsApi.update(currentSessionId, {
            canvasData,
          })

          // Then mark as completed
          const completedSession = await editSessionsApi.complete(currentSessionId)
          setCurrentSession(completedSession)

          const result: EditorResult = {
            sessionId: completedSession.id,
            orderSeqno: Number(completedSession.orderSeqno),
            editCode: `EDIT-${completedSession.id.substring(0, 8).toUpperCase()}`,
            pages: {
              initial: options?.pages || 1,
              final: options?.pages || 1,
            },
            files: {
              coverFileId: completedSession.coverFileId || undefined,
              contentFileId: completedSession.contentFileId || undefined,
              thumbnailUrl: completedSession.coverFile?.thumbnailUrl || undefined,
            },
            savedAt: completedSession.completedAt || completedSession.updatedAt,
          }

          console.log('[EmbeddedEditor] Complete success:', result.sessionId)
          onComplete?.(result)
        } catch (err) {
          console.error('[EmbeddedEditor] Complete failed:', err)
          onError?.({
            code: 'SAVE_FAILED',
            message: err instanceof Error ? err.message : '편집 완료에 실패했습니다.',
          })
          throw err
        }
      },

      cancel: () => {
        onCancel?.()
      },

      undo: () => {
        editor?.undo()
      },

      redo: () => {
        editor?.redo()
      },

      getState: () => ({
        ready,
        modified: false, // TODO: Track modifications
        currentPage: 1,
        totalPages: 1,
      }),
    }
  }, [ready, editor, sessionId, currentSession, options, onComplete, onCancel, onSave, onError, instanceRef])

  // Loading state handler
  const handleLoadingChange = useCallback((loading: boolean, message?: string) => {
    setIsLoading(loading)
    setLoadingMessage(message || '')
  }, [])

  // Toggle side panel
  const toggleSidePanel = () => {
    setShowSidePanel(!showSidePanel)
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-editor-bg">
        <div className="bg-white rounded-lg p-6 max-w-md text-center">
          <div className="text-red-500 text-4xl mb-4">!</div>
          <h2 className="text-lg font-semibold mb-2">에디터 초기화 실패</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div id="editor" className="flex flex-col h-full w-full">
      <EditorHeader
        screenMode={screenMode}
        onToggleSidePanel={toggleSidePanel}
        onLoadingChange={handleLoadingChange}
      />

      <div className={`flex-1 flex relative overflow-hidden ${screenMode !== 'desktop' ? 'flex-col' : 'flex-row'}`}>
        {/* ToolBar - horizontal in tablet/mobile mode */}
        <ToolBar horizontal={screenMode !== 'desktop'} />

        {/* Content area - always flex-row for sidebar + canvas */}
        <div className="flex-1 flex flex-row relative overflow-hidden">
          <FeatureSidebar />
          {ready && <ControlBar />}

          <main className="flex-1 relative overflow-hidden bg-editor-workspace">
            <div id="canvas-wrapper" className="h-full w-full overflow-hidden relative">
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

          <SidePanel show={showSidePanel} onClose={() => setShowSidePanel(false)} />
        </div>
      </div>

      {isLoading && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-editor-accent" />
            <p className="text-editor-text">{loadingMessage || '로딩 중...'}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Editor Instance Class
// ============================================================

class StorigeEditorInstance {
  private root: Root | null = null
  private container: HTMLElement | null = null
  private config: EditorConfig
  private methodsRef = { current: null as EditorInstanceMethods | null }

  constructor(config: EditorConfig) {
    this.config = config
  }

  mount(elementId: string): void {
    this.container = document.getElementById(elementId)
    if (!this.container) {
      throw new Error(`Element #${elementId} not found`)
    }

    // Set container style for full height
    this.container.style.height = '100%'
    this.container.style.position = 'relative'

    this.root = createRoot(this.container)
    // Note: StrictMode disabled for embed build to prevent double initialization of canvas
    this.root.render(<EmbeddedEditor {...this.config} instanceRef={this.methodsRef} />)
  }

  unmount(): void {
    if (this.root) {
      this.root.unmount()
      this.root = null
    }
    if (this.container) {
      this.container.innerHTML = ''
    }
  }

  async save(): Promise<SaveResult> {
    if (!this.methodsRef.current) {
      throw new Error('Editor not initialized')
    }
    return this.methodsRef.current.save()
  }

  async complete(): Promise<void> {
    if (!this.methodsRef.current) {
      throw new Error('Editor not initialized')
    }
    return this.methodsRef.current.complete()
  }

  cancel(): void {
    this.methodsRef.current?.cancel()
  }

  undo(): void {
    this.methodsRef.current?.undo()
  }

  redo(): void {
    this.methodsRef.current?.redo()
  }

  getState(): EditorState {
    if (!this.methodsRef.current) {
      return { ready: false, modified: false, currentPage: 0, totalPages: 0 }
    }
    return this.methodsRef.current.getState()
  }
}

// ============================================================
// Global API
// ============================================================

/**
 * 에디터 인스턴스 생성 함수
 * @param config 에디터 설정
 * @returns 에디터 인스턴스
 */
function create(config: EditorConfig): StorigeEditorInstance {
  return new StorigeEditorInstance(config)
}

const version = '1.0.0'

// Export for IIFE bundle - these become window.StorigeEditor.create and window.StorigeEditor.version
export { StorigeEditorInstance, EmbeddedEditor, create, version }
export type { EditorConfig, EditorResult, SaveResult, EditorState }
