import { useCallback, useState, useMemo } from 'react'
import { useAppStore, useActiveSelection } from '@/stores/useAppStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import AppSection from '@/components/AppSection'
import ControlInput from '@/components/ControlInput'

// Width and Height icons (simple text-based)
function LetterW({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6l4 12 4-8 4 8 4-12" />
    </svg>
  )
}

function LetterH({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 4v16M18 4v16M6 12h12" />
    </svg>
  )
}

export default function ObjectSize() {
  const [expanded, setExpanded] = useState(true)
  const activeSelection = useActiveSelection()
  const changeObjectValue = useAppStore((state) => state.changeObjectValue)
  const showAsVisibleUnit = useSettingsStore((state) => state.showAsVisibleUnit)

  // Calculate size from active selection
  const size = useMemo(() => {
    const selection = activeSelection?.[0]
    if (!selection) {
      return { width: 0, height: 0 }
    }

    const rawWidth = (selection.width || 0) * (selection.scaleX || 1)
    const rawHeight = (selection.height || 0) * (selection.scaleY || 1)

    return {
      width: showAsVisibleUnit(rawWidth, true),
      height: showAsVisibleUnit(rawHeight, true),
    }
  }, [activeSelection, showAsVisibleUnit])

  // Format width value
  const widthValue = useMemo(() => {
    return size.width % 1 === 0 ? size.width : parseFloat(size.width.toFixed(1))
  }, [size.width])

  // Format height value
  const heightValue = useMemo(() => {
    return size.height % 1 === 0 ? size.height : parseFloat(size.height.toFixed(1))
  }, [size.height])

  // Handle width change
  const handleWidthChange = useCallback(
    (e: React.FocusEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>) => {
      const target = e.target as HTMLInputElement
      const value = parseFloat(target.value)
      if (!isNaN(value) && value > 0) {
        changeObjectValue(value, 'width')
      }
    },
    [changeObjectValue]
  )

  // Handle height change
  const handleHeightChange = useCallback(
    (e: React.FocusEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>) => {
      const target = e.target as HTMLInputElement
      const value = parseFloat(target.value)
      if (!isNaN(value) && value > 0) {
        changeObjectValue(value, 'height')
      }
    },
    [changeObjectValue]
  )

  // Don't render if no selection
  if (!activeSelection || activeSelection.length === 0) {
    return null
  }

  return (
    <AppSection
      id="position-control"
      title="크기"
      expanded={expanded}
      onExpand={() => setExpanded(!expanded)}
    >
      {expanded && (
        <div className="items flex flex-wrap gap-2 px-4">
          <ControlInput
            value={widthValue}
            onChange={handleWidthChange}
            type="number"
            min={1}
            step={1}
            className="flex-1"
          >
            <LetterW className="h-5 w-5" />
          </ControlInput>
          <ControlInput
            value={heightValue}
            onChange={handleHeightChange}
            type="number"
            min={1}
            step={1}
            className="flex-1"
          >
            <LetterH className="h-5 w-5" />
          </ControlInput>
        </div>
      )}
    </AppSection>
  )
}
