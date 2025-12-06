import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AppSectionProps {
  id?: string
  title: string
  expanded?: boolean
  onExpand?: () => void
  onDetail?: () => void
  children?: ReactNode
  searchSlot?: ReactNode
}

export default function AppSection({
  id,
  title,
  expanded: externalExpanded,
  onExpand,
  onDetail,
  children,
  searchSlot,
}: AppSectionProps) {
  const [internalExpanded, setInternalExpanded] = useState(true)

  const isExpanded = externalExpanded !== undefined ? externalExpanded : internalExpanded

  const handleToggle = () => {
    if (onExpand) {
      onExpand()
    } else {
      setInternalExpanded(!internalExpanded)
    }
  }

  return (
    <section id={id} className="app-section w-full">
      {/* Header */}
      <div
        className="section-header flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-editor-hover"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-editor-text-muted" />
          ) : (
            <ChevronRight className="h-4 w-4 text-editor-text-muted" />
          )}
          <span className="text-sm font-medium text-editor-text">{title}</span>
        </div>
        {onDetail && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-editor-text-muted hover:text-editor-text"
            onClick={(e) => {
              e.stopPropagation()
              onDetail()
            }}
          >
            더보기
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>

      {/* Search slot */}
      {searchSlot && isExpanded && (
        <div className="px-4 pb-2">
          {searchSlot}
        </div>
      )}

      {/* Content */}
      {isExpanded && (
        <div className="section-content pb-4">
          {children}
        </div>
      )}
    </section>
  )
}
