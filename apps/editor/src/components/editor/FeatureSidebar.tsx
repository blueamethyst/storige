import { useAppStore } from '@/stores/useAppStore'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// Tool panels
import AppText from '@/tools/AppText'
import AppImage from '@/tools/AppImage'
import AppElement from '@/tools/AppElement'
import AppBackground from '@/tools/AppBackground'
import AppClipping from '@/tools/AppClipping'
import AppTemplate from '@/tools/AppTemplate'
import AppFrame from '@/tools/AppFrame'
import SmartCodes from '@/tools/SmartCodes'
import AppEdit from '@/tools/AppEdit'

interface FeatureSidebarProps {
  className?: string
}

export default function FeatureSidebar({ className }: FeatureSidebarProps) {
  const currentMenu = useAppStore((state) => state.currentMenu)
  const tapMenu = useAppStore((state) => state.tapMenu)
  const activeSelection = useAppStore((state) => state.activeSelection)

  // Check if an object is selected (for toggle behavior with ControlBar)
  const hasSelection = activeSelection && Array.isArray(activeSelection) && activeSelection.length > 0
  const isNonBackgroundSelection = hasSelection && activeSelection.some(
    (obj) => obj?.extensionType !== 'background' &&
             obj?.extensionType !== 'clipping' &&
             obj?.id !== 'workspace' &&
             obj?.extensionType !== 'guideline'
  )

  // If no menu selected, or if object is selected (show ControlBar instead), don't render
  if (!currentMenu || isNonBackgroundSelection) {
    return null
  }

  // Close sidebar
  const handleClose = () => {
    tapMenu(null)
  }

  // Render the appropriate tool panel based on current menu
  const renderToolPanel = () => {
    switch (currentMenu.type) {
      case 'TEXT':
        return <AppText />
      case 'IMAGE':
        return <AppImage />
      case 'SHAPE':
        return <AppElement />
      case 'BACKGROUND':
        return <AppBackground />
      case 'TEMPLATE':
        return <AppTemplate />
      case 'FRAME':
        return <AppFrame />
      case 'CLIPPING':
        return <AppClipping />
      case 'SMART_CODE':
        return <SmartCodes />
      case 'EDIT':
        return <AppEdit />
      default:
        return (
          <div className="p-4 text-editor-text-muted text-sm">
            {currentMenu.label} 패널
          </div>
        )
    }
  }

  return (
    <div
      className={cn(
        'feature-sidebar bg-editor-panel border-r border-editor-border flex flex-col',
        'w-[280px] min-w-[280px] max-w-[280px] h-full overflow-hidden z-[100]',
        className
      )}
    >
      {/* Header with close button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-editor-border">
        <h2 className="text-sm font-medium text-editor-text">{currentMenu.label}</h2>
        <button
          onClick={handleClose}
          className="p-1 rounded hover:bg-editor-hover text-editor-text-muted hover:text-editor-text transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tool panel content */}
      <div className="flex-1 overflow-hidden">
        {renderToolPanel()}
      </div>
    </div>
  )
}
