import { memo, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { SpreadThumbnailItem } from './SpreadThumbnailItem'
import { PageItem } from './PageItem'
import { useEditorStore, useCanAddPage } from '@/stores/useEditorStore'
import { useAppStore } from '@/stores/useAppStore'
import { cn } from '@/lib/utils'
import type { EditPage } from '@storige/types'

interface SpreadPagePanelProps {
  className?: string
}

/**
 * SpreadPagePanel - 스프레드 모드 전용 하단 수평 페이지 패널
 *
 * 레이아웃:
 * ┌─────────────────────────────────────────────────────────┐
 * │ [스프레드 썸네일 (200x60px)]  |  [내지1][내지2]...[+]   │
 * │    "표지 스프레드"             |   정방형 썸네일 나열      │
 * └─────────────────────────────────────────────────────────┘
 * 높이: 100px 고정, 항상 표시
 */
export const SpreadPagePanel = memo(function SpreadPagePanel({
  className,
}: SpreadPagePanelProps) {
  const pages = useEditorStore((state) => state.pages)
  const currentPageIndex = useEditorStore((state) => state.currentPageIndex)
  const setPage = useAppStore((state) => state.setPage)
  const addPage = useAppStore((state) => state.addPage)
  const canAddMore = useCanAddPage()

  // 스프레드 페이지 (항상 첫 번째)
  const spreadPage = pages[0]
  // 내지 페이지들
  const innerPages = pages.slice(1)

  const handleSelectSpread = useCallback(() => {
    setPage(0)
  }, [setPage])

  const handleSelectInnerPage = useCallback((index: number) => {
    // index는 innerPages 기준이므로 +1
    setPage(index + 1)
  }, [setPage])

  const handleAddPage = useCallback(async () => {
    if (!canAddMore) return
    try {
      await addPage()
    } catch (error) {
      console.error('페이지 추가 실패:', error)
    }
  }, [canAddMore, addPage])

  return (
    <div
      className={cn(
        'h-[100px] bg-white border-t flex items-center',
        className
      )}
    >
      <div className="flex items-center h-full overflow-x-auto px-4 gap-4">
        {/* 스프레드 썸네일 */}
        {spreadPage && (
          <>
            <SpreadThumbnailItem
              label="표지 스프레드"
              isActive={currentPageIndex === 0}
              onClick={handleSelectSpread}
            />

            {/* 구분선 */}
            <div className="h-16 w-px bg-gray-300" />
          </>
        )}

        {/* 내지 썸네일들 */}
        <div className="flex items-center gap-2">
          {innerPages.map((page, index) => (
            <div key={page.id} className="shrink-0">
              <PageItem
                page={page}
                index={index + 1}
                isActive={currentPageIndex === index + 1}
                onSelect={handleSelectInnerPage}
                canDelete={!page.required && innerPages.length > 1}
              />
            </div>
          ))}

          {/* 페이지 추가 버튼 */}
          <button
            onClick={handleAddPage}
            disabled={!canAddMore}
            className={cn(
              'flex items-center justify-center',
              'w-20 h-28 rounded-lg border-2 border-dashed',
              'transition-colors',
              canAddMore
                ? 'border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-400 hover:text-blue-500'
                : 'border-gray-200 text-gray-300 cursor-not-allowed'
            )}
            title={canAddMore ? '내지 페이지 추가' : '최대 페이지 수에 도달했습니다'}
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  )
})
