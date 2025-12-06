import { type ReactNode, useCallback, useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface ControlInputProps {
  value: number | string
  display?: 'mixed' | undefined
  onChange?: (e: React.FocusEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>) => void
  children?: ReactNode
  className?: string
  type?: 'number' | 'text'
  min?: number
  max?: number
  step?: number
}

export default function ControlInput({
  value,
  display,
  onChange,
  children,
  className,
  type = 'number',
  min,
  max,
  step = 1,
}: ControlInputProps) {
  const [localValue, setLocalValue] = useState(String(value))
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync external value changes
  useEffect(() => {
    if (display === 'mixed') {
      setLocalValue('')
    } else {
      setLocalValue(String(value))
    }
  }, [value, display])

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    onChange?.(e)
  }, [onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onChange?.(e)
      inputRef.current?.blur()
    }
  }, [onChange])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value)
  }, [])

  return (
    <div className={cn(
      'control-input flex items-center gap-2 h-8 px-2 rounded bg-editor-surface-lowest',
      className
    )}>
      {/* Icon slot */}
      {children && (
        <div className="flex-shrink-0 text-editor-text-muted">
          {children}
        </div>
      )}

      {/* Input */}
      <input
        ref={inputRef}
        type={type}
        value={localValue}
        placeholder={display === 'mixed' ? 'mixed' : undefined}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        min={min}
        max={max}
        step={step}
        className={cn(
          'flex-1 w-full bg-transparent text-sm text-editor-text outline-none',
          'appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
          display === 'mixed' && 'placeholder:text-editor-text-muted placeholder:italic'
        )}
      />
    </div>
  )
}
