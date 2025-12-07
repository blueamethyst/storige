import { useCallback, useState, useRef, useEffect } from 'react'
import { Upload, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppStore } from '@/stores/useAppStore'
import { useImageStore, useUploaded } from '@/stores/useImageStore'
import { useIsCustomer } from '@/stores/useAuthStore'
import { useEditorContents } from '@/hooks/useEditorContents'
import { Button } from '@/components/ui/button'
import AppSection from '@/components/AppSection'
import { ImageProcessingPlugin, SelectionType } from '@storige/canvas-core'
import type { EditorContent } from '@/generated/graphql'

export default function AppImage() {
  const canvas = useAppStore((state) => state.canvas)
  const getPlugin = useAppStore((state) => state.getPlugin)
  const setContentsBrowser = useAppStore((state) => state.setContentsBrowser)
  const isCustomer = useIsCustomer()
  const upload = useImageStore((state) => state.upload)
  const uploaded = useUploaded()
  const { setupAsset } = useEditorContents()

  // Carousel state
  const carouselRef = useRef<HTMLDivElement>(null)
  const [isLeftDisabled, setIsLeftDisabled] = useState(true)
  const [isRightDisabled, setIsRightDisabled] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Search state (for future GraphQL implementation)
  const [_searchType, _setSearchType] = useState('name')
  const [_searchKeyword, _setSearchKeyword] = useState('')

  // Placeholder for recommended contents (will be loaded via GraphQL)
  const [contents] = useState<Array<{
    id: string
    name: string
    image?: { image?: { url?: string } }
  }>>([])
  const loadingContents = false

  // Update carousel button states
  const updateButtonStates = useCallback(() => {
    if (!carouselRef.current) return

    const carousel = carouselRef.current
    setIsLeftDisabled(carousel.scrollLeft <= 0)
    setIsRightDisabled(carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 1)
  }, [])

  // Scroll handlers
  const scrollLeft = useCallback(() => {
    if (!carouselRef.current) return
    carouselRef.current.scrollBy({ left: -150, behavior: 'smooth' })
    setTimeout(updateButtonStates, 300)
  }, [updateButtonStates])

  const scrollRight = useCallback(() => {
    if (!carouselRef.current) return
    carouselRef.current.scrollBy({ left: 150, behavior: 'smooth' })
    setTimeout(updateButtonStates, 300)
  }, [updateButtonStates])

  // Handle upload
  const handleUpload = useCallback(async () => {
    if (!canvas) return

    const imagePlugin = getPlugin<ImageProcessingPlugin>('ImageProcessingPlugin')

    setIsLoading(true)

    try {
      await upload(
        canvas,
        imagePlugin!,
        SelectionType.image,
        'image/*,.ai,.eps,.pdf,application/pdf,application/postscript,application/illustrator',
        () => {
          // onVectorStart
          console.log('벡터 이미지 변환 시작...')
        },
        (success) => {
          // onVectorEnd
          if (success) {
            console.log('벡터 변환 완료!')
          } else {
            console.error('벡터 변환 실패')
          }
        }
      )
    } catch (error) {
      console.error('이미지 업로드 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }, [canvas, getPlugin, upload])

  // Add uploaded image to canvas
  const addToCanvas = useCallback(async (image: unknown) => {
    if (!canvas) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imgObj = image as any

    canvas.offHistory()

    try {
      const workspace = canvas.getObjects().find((obj: unknown) => (obj as { id?: string }).id === 'workspace')
      if (!workspace) {
        console.error('워크스페이스를 찾을 수 없습니다')
        return
      }

      const workspaceCenter = workspace.getCenterPoint()
      const src = imgObj.getSrc?.() || imgObj._element?.src

      if (src) {
        // core API를 사용하여 이미지 로드 및 캔버스에 추가
        const { core } = await import('@storige/canvas-core')

        const img = await core.addImageFromURL(canvas, src, {
          left: workspaceCenter.x,
          top: workspaceCenter.y,
          originX: 'center',
          originY: 'center',
          scaleX: imgObj.scaleX || 1,
          scaleY: imgObj.scaleY || imgObj.scaleX || 1,
          centerInWorkspace: false,
          setActive: true
        })

        canvas.onHistory()
        canvas.requestRenderAll()
      }
    } catch (error) {
      console.error('이미지 추가 중 오류:', error)
      canvas.onHistory()
    }
  }, [canvas])

  // Add content to canvas (for recommended contents)
  const addContentToCanvas = useCallback(async (content: unknown) => {
    if (!content) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await setupAsset(content as EditorContent, 'image')
    } catch (error) {
      console.error('이미지 콘텐츠 추가 오류:', error)
    }
  }, [setupAsset])

  const showMore = useCallback(() => {
    setContentsBrowser('image')
  }, [setContentsBrowser])

  // Setup scroll event listener
  useEffect(() => {
    const carousel = carouselRef.current
    if (!carousel) return

    const handleScroll = () => updateButtonStates()
    carousel.addEventListener('scroll', handleScroll)

    // Initial state update
    updateButtonStates()

    return () => {
      carousel.removeEventListener('scroll', handleScroll)
    }
  }, [updateButtonStates, uploaded])

  return (
    <div className="w-full h-full flex flex-col">
      <div className="tool-header p-4 gap-6 flex flex-col">
        <span className="title text-editor-text font-medium">이미지</span>
        <Button
          variant="secondary"
          className="w-full h-10"
          onClick={handleUpload}
          disabled={isLoading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {isLoading ? '업로드 중...' : '업로드'}
        </Button>
      </div>

      <hr className="border-editor-border" />

      <div className="sections flex flex-col overflow-y-auto">
        {/* My Contents (Uploaded Images) */}
        {uploaded.length > 0 && (
          <AppSection title="나의 콘텐츠">
            <div className="relative flex items-center px-5 w-full">
              <button
                disabled={isLeftDisabled}
                className="carousel-arrow absolute left-0 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-white/80 shadow hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={scrollLeft}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div
                ref={carouselRef}
                className="flex overflow-x-auto scroll-smooth w-full py-2 gap-4 scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {uploaded.map((image, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 w-[88px] h-[88px] rounded-lg overflow-hidden cursor-pointer bg-gray-50 hover:scale-105 transition-transform"
                    onClick={() => addToCanvas(image)}
                  >
                    <img
                      src={(image as { getSrc?: () => string }).getSrc?.() || ''}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>

              <button
                disabled={isRightDisabled}
                className="carousel-arrow absolute right-0 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-white/80 shadow hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={scrollRight}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </AppSection>
        )}

        {/* Recommended Contents */}
        {isCustomer && (
          <AppSection title="추천 콘텐츠" onDetail={showMore}>
            {loadingContents ? (
              <div className="flex justify-center items-center min-h-[200px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-editor-accent" />
              </div>
            ) : contents.length === 0 ? (
              <div className="px-4 py-8 text-center text-editor-text-muted text-sm">
                추천 콘텐츠가 없습니다.
              </div>
            ) : (
              <div className="w-full grid grid-cols-2 gap-2 px-4">
                {contents.map((content, index) => (
                  <div
                    key={index}
                    className="w-full cursor-pointer"
                    onClick={() => addContentToCanvas(content)}
                  >
                    <div className="bg-gray-50 p-2 flex items-center justify-center w-full rounded hover:bg-gray-100 aspect-square overflow-hidden">
                      {content.image?.image?.url && (
                        <img
                          src={content.image.image.url}
                          alt={content.name}
                          className="object-contain w-full h-full"
                        />
                      )}
                    </div>
                    <div className="mt-1 px-1 text-left text-xs text-gray-600 truncate">
                      {content.name || '이름 없음'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AppSection>
        )}

        <div className="h-10 w-1 p-10" />
      </div>
    </div>
  )
}
