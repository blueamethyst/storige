import { useState, useCallback } from 'react'
import { useAppStore } from '@/stores/useAppStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useIsAdmin } from '@/stores/useAuthStore'
import { ServicePlugin, PreviewPlugin } from '@storige/canvas-core'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Layers,
  HelpCircle,
  Save,
  Download,
  Upload,
  Monitor,
  Check,
} from 'lucide-react'

interface EditorHeaderProps {
  screenMode?: 'mobile' | 'tablet' | 'desktop'
  onToggleSidePanel?: () => void
  onLoadingChange?: (loading: boolean, message?: string) => void
}

export default function EditorHeader({
  screenMode = 'desktop',
  onToggleSidePanel,
  onLoadingChange,
}: EditorHeaderProps) {
  const [previewMode, setPreviewMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [finishing, setFinishing] = useState(false)

  // Stores
  const { ready, canvas, allCanvas, allEditors, getPlugin, setPage } = useAppStore()
  const { artwork, currentSettings } = useSettingsStore()
  const isAdmin = useIsAdmin()

  // Size from settings
  const size = currentSettings.size || { width: 100, height: 100, cutSize: 5, safeSize: 5, printSize: undefined }

  // Loading helper
  const setLoading = useCallback(
    (loading: boolean, message?: string) => {
      onLoadingChange?.(loading, message)
    },
    [onLoadingChange]
  )

  // 작업 이름 변경
  const handleNameChange = useCallback(
    (e: React.FocusEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>) => {
      if ('key' in e && e.key !== 'Enter') return

      const target = e.target as HTMLInputElement
      if (e.type === 'keydown') {
        target.blur()
      }

      // useSettingsStore의 artwork.name은 이미 바인딩되어 있으므로 추가 처리 불필요
      // 필요시 여기에 저장 로직 추가
    },
    []
  )

  // 인쇄 미리보기 토글
  const handlePreview = useCallback(async () => {
    if (!ready) return

    try {
      setLoading(true, '미리보기 모드를 전환하는 중...')

      const newPreviewMode = !previewMode
      setPreviewMode(newPreviewMode)

      const plugin = getPlugin<PreviewPlugin>('PreviewPlugin')
      if (plugin) {
        await plugin.setPreview(newPreviewMode, currentSettings.colorMode)
      }

      // TODO: 토스트 메시지 추가
      console.log(
        '인쇄 미리보기 모드가 ' + (newPreviewMode ? '활성화' : '비활성화') + '되었습니다.'
      )
    } catch (error) {
      console.error('미리보기 전환 중 오류:', error)
    } finally {
      setLoading(false)
    }
  }, [ready, previewMode, getPlugin, currentSettings.colorMode, setLoading])

  // PDF 저장
  const saveAllPagesToSinglePDF = useCallback(async () => {
    if (!ready || !canvas) return

    try {
      setLoading(true, 'PDF를 생성하는 중...')

      // 현재 활성화된 캔버스 인덱스 저장
      const originalCanvasIndex = allCanvas.findIndex((cvs) => cvs.id === canvas.id)

      // 첫 페이지로 이동
      if (allCanvas.length > 0) {
        setPage(0)
      }

      // preview 모드가 활성화되어 있으면 먼저 해제
      if (previewMode) {
        setPreviewMode(false)
        const previewPlugin = getPlugin<PreviewPlugin>('PreviewPlugin')
        if (previewPlugin) {
          await previewPlugin.setPreview(false, currentSettings.colorMode)
        }
      }

      // ServicePlugin 가져오기
      const servicePlugin = getPlugin<ServicePlugin>('ServicePlugin')
      if (!servicePlugin) {
        throw new Error('ServicePlugin을 찾을 수 없습니다')
      }

      // cutline 찾기
      const cutline = allCanvas[0].getObjects().find((obj: { id?: string }) => obj.id === 'cutline-template')

      // 여러 페이지 PDF 저장 함수 호출
      await servicePlugin.saveMultiPagePDF(
        allCanvas,
        allEditors,
        artwork.name || 'project',
        {
          width: size.width + size.cutSize,
          height: size.height + size.cutSize,
          cutSize: size.cutSize,
          printSize: size.printSize,
        },
        cutline,
        // TODO: DPI 설정 적용 (현재는 72로 하드코딩)
        72
      )

      // 원래 페이지로 돌아가기
      if (originalCanvasIndex >= 0) {
        setPage(originalCanvasIndex)
      }

      // TODO: 토스트 메시지 추가
      console.log('모든 페이지가 포함된 PDF가 성공적으로 저장되었습니다.')
    } catch (error) {
      console.error('PDF 저장 중 오류:', error)
      alert(`PDF 저장 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setLoading(false)
    }
  }, [
    ready,
    canvas,
    allCanvas,
    allEditors,
    artwork.name,
    size,
    previewMode,
    currentSettings.colorMode,
    getPlugin,
    setPage,
    setLoading,
  ])

  // 내 작업에 저장
  const handleSaveWork = useCallback(async () => {
    if (!ready || !canvas) return

    try {
      setSaving(true)
      setLoading(true, '작업을 저장하는 중...')

      // preview 모드가 활성화되어 있으면 먼저 해제
      if (previewMode) {
        setPreviewMode(false)
        const previewPlugin = getPlugin<PreviewPlugin>('PreviewPlugin')
        if (previewPlugin) {
          await previewPlugin.setPreview(false, currentSettings.colorMode)
        }
      }

      // TODO: useWorkSave hook 포팅 후 실제 저장 로직 연결
      console.log('내 작업에 저장 기능은 아직 구현되지 않았습니다.')

      // TODO: 토스트 메시지 추가
    } catch (error) {
      console.error('저장 중 오류:', error)
    } finally {
      setSaving(false)
      setLoading(false)
    }
  }, [ready, canvas, previewMode, getPlugin, currentSettings.colorMode, setLoading])

  // 편집완료 (고객용)
  const handleFinish = useCallback(async () => {
    if (!ready || !canvas) return

    try {
      setFinishing(true)
      setLoading(true, '디자인을 저장하는 중...')

      // preview 모드가 활성화되어 있으면 먼저 해제
      if (previewMode) {
        setPreviewMode(false)
        const previewPlugin = getPlugin<PreviewPlugin>('PreviewPlugin')
        if (previewPlugin) {
          await previewPlugin.setPreview(false, currentSettings.colorMode)
        }
      }

      // TODO: 실제 저장 및 PDF 생성 로직
      // const pdf = await saveWork({ exportToPdf: true })

      // TODO: 쇼핑몰에 메시지 전송
      // if (pdf) {
      //   setTimeout(() => sendMessageToShop(pdf, designMeta), 1000)
      // }

      console.log('편집완료 기능은 아직 구현되지 않았습니다.')
    } catch (error) {
      console.error('디자인 저장 실패:', error)
    } finally {
      setFinishing(false)
      setLoading(false)
    }
  }, [ready, canvas, previewMode, getPlugin, currentSettings.colorMode, setLoading])

  // 관리자용 저장
  const handleSaveForAdmin = useCallback(
    async (closeWindow: boolean = false) => {
      if (!ready || !canvas) return

      try {
        setFinishing(true)
        setLoading(true, '디자인을 저장하는 중...')

        // preview 모드가 활성화되어 있으면 먼저 해제
        if (previewMode) {
          setPreviewMode(false)
          const previewPlugin = getPlugin<PreviewPlugin>('PreviewPlugin')
          if (previewPlugin) {
            await previewPlugin.setPreview(false, currentSettings.colorMode)
          }
        }

        // TODO: 관리자용 저장 로직
        console.log('관리자용 저장 기능은 아직 구현되지 않았습니다.')

        if (closeWindow) {
          // TODO: CMS에 메시지 전송 후 창 닫기
        }
      } catch (error) {
        console.error('디자인 저장 실패:', error)
      } finally {
        setFinishing(false)
        setLoading(false)
      }
    },
    [ready, canvas, previewMode, getPlugin, currentSettings.colorMode, setLoading]
  )

  // 불러오기
  const handleOpenWorkspace = useCallback(() => {
    // TODO: WorkspaceModal 구현 후 연결
    console.log('불러오기 기능은 아직 구현되지 않았습니다.')
  }, [])

  return (
    <TooltipProvider>
      <nav className="h-14 bg-editor-panel border-b border-editor-border flex items-center px-4 z-[100]">
        {/* 왼쪽: 작업 제목 */}
        <div className="flex items-center gap-4">
          <input
            type="text"
            defaultValue={artwork.name || '새로운 작업 1'}
            placeholder="새로운 작업 1"
            className="bg-transparent border-none outline-none text-editor-text text-base font-medium w-40 md:w-auto focus:ring-1 focus:ring-editor-accent rounded px-2 py-1"
            onBlur={handleNameChange}
            onKeyDown={handleNameChange}
          />
        </div>

        {/* 오른쪽: 액션 버튼들 */}
        <div className="ml-auto flex items-center gap-2 md:gap-4">
          {/* 데스크톱/태블릿 버튼들 */}
          <div className="hidden md:flex items-center gap-2">
            {/* 인쇄 미리보기 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={previewMode ? 'default' : 'ghost'}
                  size="icon"
                  onClick={handlePreview}
                  disabled={!ready}
                >
                  <Monitor className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>인쇄 미리보기</TooltipContent>
            </Tooltip>

            {/* PDF 저장 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={saveAllPagesToSinglePDF}
                  disabled={!ready}
                >
                  <Download className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>PDF 저장</TooltipContent>
            </Tooltip>

            {/* 내 작업에 저장 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={isAdmin ? () => handleSaveForAdmin(false) : handleSaveWork}
                  disabled={!ready || saving}
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-editor-text" />
                  ) : (
                    <Upload className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>내 작업에 저장</TooltipContent>
            </Tooltip>
          </div>

          {/* 구분선 */}
          <div className="hidden md:block w-px h-6 bg-editor-border" />

          {/* 불러오기 */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenWorkspace}
            className="hidden md:flex"
          >
            <Save className="h-4 w-4 mr-2" />
            불러오기
          </Button>

          {/* 편집완료 버튼 */}
          {!isAdmin && (
            <Button
              onClick={handleFinish}
              disabled={!ready || finishing}
              className="bg-editor-accent hover:bg-editor-accent-hover text-white"
            >
              {finishing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              편집완료
            </Button>
          )}

          {/* 관리자용 편집완료 버튼 */}
          {isAdmin && (
            <Button
              onClick={() => handleSaveForAdmin(true)}
              disabled={!ready || finishing}
              className="bg-editor-accent hover:bg-editor-accent-hover text-white"
            >
              {finishing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              편집완료
            </Button>
          )}

          {/* 구분선 */}
          <div className="w-px h-6 bg-editor-border" />

          {/* 레이어 패널 토글 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onToggleSidePanel}>
                <Layers className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>레이어 패널</TooltipContent>
          </Tooltip>

          {/* 도움말 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <HelpCircle className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>도움말</TooltipContent>
          </Tooltip>
        </div>

        {/* 모바일 버튼들 */}
        {screenMode === 'mobile' && (
          <div className="flex md:hidden items-center gap-2">
            {/* 편집완료 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={isAdmin ? () => handleSaveForAdmin(true) : handleFinish}
              disabled={!ready || finishing}
            >
              <Check className="h-5 w-5" />
            </Button>
          </div>
        )}
      </nav>
    </TooltipProvider>
  )
}
