import { memo, useCallback } from 'react'
import { PageItem } from './PageItem'
import { useEditorStore } from '@/stores/useEditorStore'
import { useAppStore } from '@/stores/useAppStore'
import type { EditPage } from '@storige/types'

interface PageListProps {
  onDeletePage?: (pageId: string) => void
}

export const PageList = memo(function PageList({ onDeletePage }: PageListProps) {
  const pages = useEditorStore((state) => state.pages)
  const currentPageIndex = useEditorStore((state) => state.currentPageIndex)
  const goToPage = useEditorStore((state) => state.goToPage)
  const canDeletePage = useEditorStore((state) => state.canDeletePage)

  const screenshots = useAppStore((state) => state.screenshots)
  const setPage = useAppStore((state) => state.setPage)

  const handleSelect = useCallback(
    (index: number) => {
      goToPage(index)
      setPage(index)
    },
    [goToPage, setPage]
  )

  const handleDelete = useCallback(
    (pageId: string) => {
      if (onDeletePage) {
        onDeletePage(pageId)
      }
    },
    [onDeletePage]
  )

  if (pages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        페이지가 없습니다
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-2 overflow-y-auto">
      {pages.map((page: EditPage, index: number) => (
        <PageItem
          key={page.id}
          page={page}
          index={index}
          isActive={index === currentPageIndex}
          thumbnail={screenshots[index]}
          onSelect={handleSelect}
          onDelete={handleDelete}
          canDelete={canDeletePage(page.id)}
        />
      ))}
    </div>
  )
})
