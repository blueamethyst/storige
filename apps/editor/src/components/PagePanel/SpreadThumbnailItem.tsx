import { memo } from 'react'
import { cn } from '@/lib/utils'

interface SpreadThumbnailItemProps {
  thumbnailUrl?: string
  label: string
  isActive: boolean
  onClick: () => void
  className?: string
}

export const SpreadThumbnailItem = memo(function SpreadThumbnailItem({
  thumbnailUrl,
  label,
  isActive,
  onClick,
  className,
}: SpreadThumbnailItemProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1 cursor-pointer transition-all',
        className
      )}
      onClick={onClick}
    >
      {/* 썸네일 - 스프레드는 가로로 넓은 형태 (200x60px) */}
      <div
        className={cn(
          'relative rounded overflow-hidden bg-gray-100 border-2 transition-colors',
          'hover:border-blue-400',
          isActive ? 'border-blue-500 shadow-md' : 'border-gray-300'
        )}
        style={{ width: 200, height: 60 }}
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={label}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
            {label}
          </div>
        )}
        {isActive && (
          <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none" />
        )}
      </div>

      {/* 라벨 */}
      <div
        className={cn(
          'text-xs text-center px-2 py-0.5 rounded',
          isActive ? 'text-blue-600 font-medium' : 'text-gray-600'
        )}
      >
        {label}
      </div>
    </div>
  )
})
