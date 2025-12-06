import { useMemo } from 'react'
import { useAppStore } from '@/stores/useAppStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useImageStore } from '@/stores/useImageStore'
import { ImageProcessingPlugin, SelectionType } from '@storige/canvas-core'
import {
  Upload,
  LayoutTemplate,
  Image,
  Type,
  Shapes,
  PaintBucket,
  Frame,
  QrCode,
  Pencil,
  Scissors,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AppMenu } from '@/types/menu'

// Tool definitions
const ALL_MENUS: AppMenu[] = [
  { type: 'CLIPPING', label: '모양컷', icon: Scissors },
  { type: 'TEMPLATE', label: '템플릿', icon: LayoutTemplate },
  { type: 'IMAGE', label: '이미지', icon: Image },
  { type: 'TEXT', label: '텍스트', icon: Type },
  { type: 'SHAPE', label: '요소', icon: Shapes },
  { type: 'BACKGROUND', label: '배경', icon: PaintBucket },
  { type: 'FRAME', label: '프레임', icon: Frame },
  { type: 'SMART_CODE', label: 'QR/바코드', icon: QrCode },
  { type: 'EDIT', label: '편집도구', icon: Pencil },
]

interface ToolBarProps {
  horizontal?: boolean
}

export default function ToolBar({ horizontal = false }: ToolBarProps) {
  const canvas = useAppStore((state) => state.canvas)
  const ready = useAppStore((state) => state.ready)
  const currentMenu = useAppStore((state) => state.currentMenu)
  const tapMenu = useAppStore((state) => state.tapMenu)
  const getPlugin = useAppStore((state) => state.getPlugin)

  const editMode = useSettingsStore((state) => state.currentSettings.editMode)
  // Note: menu config will be loaded from product settings when available
  // For now, use all menus as default
  const appMenu: string[] | undefined = undefined

  const upload = useImageStore((state) => state.upload)

  // Build menu list based on editMode and appMenu settings
  const menus = useMemo(() => {
    const uploadMenu: AppMenu = {
      type: 'upload',
      label: '업로드',
      icon: Upload,
      onTap: async () => {
        if (!ready || !canvas) return

        const imagePlugin = getPlugin<ImageProcessingPlugin>('ImageProcessingPlugin')
        if (!imagePlugin) return

        try {
          await upload(
            canvas,
            imagePlugin,
            SelectionType.image,
            'image/*,.ai,.eps,.pdf,application/pdf,application/postscript,application/illustrator'
          )
        } catch (error) {
          console.error('Upload error:', error)
        }
      },
    }

    // In edit mode or development, show all menus
    const availableMenus =
      editMode || import.meta.env.DEV
        ? ALL_MENUS
        : (appMenu as string[] | undefined)
            ?.map((menuType) => ALL_MENUS.find((m) => m.type === menuType))
            .filter((m): m is AppMenu => m !== undefined) ?? ALL_MENUS

    return [uploadMenu, ...availableMenus]
  }, [editMode, appMenu, ready, canvas, getPlugin, upload])

  const handleMenuClick = (menu: AppMenu) => {
    if (menu.onTap) {
      menu.onTap()
    } else {
      tapMenu(currentMenu?.type === menu.type ? null : menu)
    }
  }

  return (
    <div
      className={cn(
        'toolbar bg-editor-panel border-editor-border flex gap-1 z-[101]',
        horizontal
          ? 'flex-row h-auto max-w-full overflow-x-auto border-t px-2 scrollbar-hide'
          : 'flex-col overflow-y-auto max-h-full border-r py-2 min-w-[90px] items-center gap-5'
      )}
    >
      {menus.map((menu) => {
        const Icon = menu.icon
        const isSelected = currentMenu?.type === menu.type

        return (
          <button
            key={menu.type}
            className={cn(
              'menu-item flex flex-col items-center justify-center gap-1 rounded-lg transition-colors',
              horizontal ? 'h-10 w-10 min-w-[40px]' : 'h-16 w-16',
              isSelected
                ? 'bg-editor-accent/10 text-editor-accent'
                : 'text-editor-text-muted hover:bg-editor-hover hover:text-editor-text'
            )}
            onClick={() => handleMenuClick(menu)}
            title={menu.label}
          >
            {Icon && <Icon className={cn(horizontal ? 'h-5 w-5' : 'h-6 w-6')} />}
            {!horizontal && (
              <span className="menu-text text-xs font-medium">{menu.label}</span>
            )}
          </button>
        )
      })}

      {/* Edit mode indicator */}
      {editMode && (
        <div className="fixed bottom-3 m-auto bg-white pt-3">
          <span className="px-2 py-1 text-xs font-bold text-editor-accent bg-editor-accent/10 rounded">
            편집모드
          </span>
        </div>
      )}
    </div>
  )
}
