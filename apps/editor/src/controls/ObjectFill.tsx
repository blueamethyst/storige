import { useCallback, useState, useMemo } from 'react'
import { useAppStore, useActiveSelection, useSelectionType } from '@/stores/useAppStore'
import AppSection from '@/components/AppSection'
import { Button } from '@/components/ui/button'
import { parseColorValue, rgbaToHex8, SelectionType } from '@storige/canvas-core'

export default function ObjectFill() {
  const [expanded, setExpanded] = useState(true)
  const activeSelection = useActiveSelection()
  const selectionType = useSelectionType()
  const canvas = useAppStore((state) => state.canvas)

  // Calculate effective fill color
  const effectiveValue = useMemo(() => {
    if (!activeSelection || !Array.isArray(activeSelection) || activeSelection.length === 0) {
      return '#FFFFFF'
    }

    const selection = activeSelection[0]
    if (!selection) {
      return '#FFFFFF'
    }

     
    let fillValue = (selection as any).fill

    if (!fillValue || fillValue === '' || fillValue === 'transparent') {
      fillValue = '#FFFFFF'
    }

    if (typeof fillValue !== 'string') {
      return '#FFFFFF'
    }

    const rgba = parseColorValue(fillValue)
    if (!rgba) {
      return '#FFFFFF'
    }

    return rgbaToHex8(rgba.r, rgba.g, rgba.b, rgba.a).slice(0, 7)
  }, [activeSelection])

  // Calculate opacity
  const effectiveOpacity = useMemo(() => {
    if (!activeSelection || !Array.isArray(activeSelection) || activeSelection.length === 0) {
      return 100
    }

    const selection = activeSelection[0]
     
    return (selection as any)?.fillOpacity ?? 100
  }, [activeSelection])

  // Check if has fill
  const hasFill = useMemo(() => {
    if (!activeSelection || !Array.isArray(activeSelection) || activeSelection.length === 0) {
      return false
    }

    const selection = activeSelection[0]
     
    const fillValue = (selection as any)?.fill
    return fillValue && fillValue !== '' && fillValue !== 'transparent'
  }, [activeSelection])

  // Check if using effect that hides fill
  const hideFill = useMemo(() => {
    if (!activeSelection || !Array.isArray(activeSelection) || activeSelection.length === 0) {
      return false
    }

    const selection = activeSelection[0]
     
    const effects = (selection as any)?.effects
    if (!effects) return false

    return effects.includes('gold') || effects.includes('cutting')
  }, [activeSelection])

  // Add fill color
  const addFillColor = useCallback(() => {
    if (!activeSelection || !Array.isArray(activeSelection) || activeSelection.length === 0) {
      return
    }

    const firstSelection = activeSelection[0]
    if (!firstSelection) return

     
    const obj = firstSelection as any
    obj.fill = '#FFFFFF'
    obj.fillOpacity = 100
    obj.dirty = true

    canvas?.requestRenderAll()
  }, [activeSelection, canvas])

  // Handle color change
  const handleColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value

      if (!activeSelection || !Array.isArray(activeSelection) || activeSelection.length === 0) {
        return
      }

      const firstSelection = activeSelection[0]
      if (!firstSelection) return

      const rgba = parseColorValue(value)
      if (!rgba) return

      const alpha = effectiveOpacity / 100
      const rgbaString = `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${alpha})`

       
      const obj = firstSelection as any

      if (obj.type === 'i-text') {
        // Text object - apply to all characters
        const it = obj
        const textLen = it.text?.length ?? 0
        if (textLen > 0) {
          it.setSelectionStyles({ fill: rgbaString }, 0, textLen)
        }
        it.set('fill', rgbaString)
        it.dirty = true
      } else {
        obj.fill = rgbaString
        obj.dirty = true
      }

      canvas?.requestRenderAll()
    },
    [activeSelection, effectiveOpacity, canvas]
  )

  // Handle opacity change
  const handleOpacityChange = useCallback(
    (e: React.FocusEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>) => {
      const target = e.target as HTMLInputElement
      let value = parseInt(target.value, 10)

      if (isNaN(value)) return
      if (value < 0) value = 0
      if (value > 100) value = 100

      if (!activeSelection || !Array.isArray(activeSelection) || activeSelection.length === 0) {
        return
      }

      const firstSelection = activeSelection[0]
      if (!firstSelection) return

       
      const obj = firstSelection as any
      obj.fillOpacity = value

      // Update fill with new alpha
      const rgba = parseColorValue(obj.fill || '#000000')
      if (rgba) {
        obj.fill = `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${value / 100})`
      }

      obj.dirty = true
      canvas?.requestRenderAll()
    },
    [activeSelection, canvas]
  )

  // Don't render if no selection
  if (!activeSelection || activeSelection.length === 0) {
    return null
  }

  // Don't render if using certain effects
  const usingEffect = useMemo(() => {
    if (!activeSelection || !Array.isArray(activeSelection) || activeSelection.length === 0) {
      return false
    }

    const firstSelection = activeSelection[0]
     
    const effects = (firstSelection as any)?.effects
    if (!effects) return false

    return (
      effects.includes('gold') ||
      (selectionType === SelectionType.text && effects.includes('emboss'))
    )
  }, [activeSelection, selectionType])

  if (usingEffect) {
    return null
  }

  return (
    <AppSection
      id="fill-control"
      title="채우기"
      expanded={expanded}
      onExpand={() => setExpanded(!expanded)}
    >
      {expanded && (
        <div className="items flex flex-wrap gap-2 px-4">
          {!hideFill && (
            <div className="w-full flex flex-row gap-2">
              {!hasFill ? (
                <Button
                  variant="secondary"
                  className="w-full h-10"
                  onClick={addFillColor}
                >
                  색상 채우기
                </Button>
              ) : (
                <>
                  {/* Color Picker */}
                  <div className="flex-1 flex items-center gap-2 h-10 px-3 rounded-lg bg-editor-surface-lowest">
                    <input
                      type="color"
                      value={effectiveValue}
                      onChange={handleColorChange}
                      className="w-8 h-8 rounded cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={effectiveValue.toUpperCase()}
                      onChange={(e) => {
                        const val = e.target.value
                        if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                          const syntheticEvent = {
                            target: { value: val },
                          } as React.ChangeEvent<HTMLInputElement>
                          handleColorChange(syntheticEvent)
                        }
                      }}
                      className="flex-1 bg-transparent text-sm text-editor-text outline-none uppercase"
                    />
                  </div>

                  {/* Opacity */}
                  <div className="max-w-16 flex items-center gap-1 h-10 px-2 rounded bg-editor-surface-lowest">
                    <input
                      type="number"
                      defaultValue={effectiveOpacity}
                      min={0}
                      max={100}
                      onBlur={handleOpacityChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleOpacityChange(e)
                          ;(e.target as HTMLInputElement).blur()
                        }
                      }}
                      className="w-full bg-transparent text-sm text-editor-text outline-none text-center appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </AppSection>
  )
}
