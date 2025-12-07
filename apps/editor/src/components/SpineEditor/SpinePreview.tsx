import { memo, useMemo } from 'react'
import { cn } from '@/lib/utils'

interface SpinePreviewProps {
  /**
   * 앞표지 썸네일 URL
   */
  frontCoverUrl?: string
  /**
   * 뒤표지 썸네일 URL
   */
  backCoverUrl?: string
  /**
   * 책등 썸네일 URL
   */
  spineUrl?: string
  /**
   * 표지 너비 (mm)
   */
  coverWidth: number
  /**
   * 표지 높이 (mm)
   */
  coverHeight: number
  /**
   * 책등 폭 (mm)
   */
  spineWidth: number
  /**
   * 블리드 크기 (mm)
   */
  bleed?: number
  /**
   * 안전 영역 (mm)
   */
  safeArea?: number
  /**
   * 가이드라인 표시 여부
   */
  showGuidelines?: boolean
  /**
   * 미리보기 스케일 (px per mm)
   */
  scale?: number
  className?: string
}

/**
 * 앞표지-책등-뒤표지 통합 미리보기 컴포넌트
 */
export const SpinePreview = memo(function SpinePreview({
  frontCoverUrl,
  backCoverUrl,
  spineUrl,
  coverWidth,
  coverHeight,
  spineWidth,
  bleed = 3,
  safeArea = 5,
  showGuidelines = true,
  scale = 1.5,
  className,
}: SpinePreviewProps) {
  // 픽셀 크기 계산
  const sizes = useMemo(() => {
    return {
      coverW: coverWidth * scale,
      coverH: coverHeight * scale,
      spineW: spineWidth * scale,
      bleed: bleed * scale,
      safeArea: safeArea * scale,
      totalW: (coverWidth * 2 + spineWidth + bleed * 2) * scale,
      totalH: (coverHeight + bleed * 2) * scale,
    }
  }, [coverWidth, coverHeight, spineWidth, bleed, safeArea, scale])

  return (
    <div className={cn('flex flex-col items-center', className)}>
      {/* 미리보기 컨테이너 */}
      <div
        className="relative bg-gray-200 border border-gray-300 shadow-lg"
        style={{
          width: sizes.totalW,
          height: sizes.totalH,
        }}
      >
        {/* 블리드 영역 (배경) */}
        {showGuidelines && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,0,0,0.05) 5px, rgba(255,0,0,0.05) 10px)',
            }}
          />
        )}

        {/* 뒤표지 */}
        <div
          className="absolute bg-white"
          style={{
            left: sizes.bleed,
            top: sizes.bleed,
            width: sizes.coverW,
            height: sizes.coverH,
          }}
        >
          {backCoverUrl ? (
            <img
              src={backCoverUrl}
              alt="뒤표지"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
              뒤표지
            </div>
          )}

          {/* 뒤표지 안전 영역 */}
          {showGuidelines && (
            <div
              className="absolute border border-dashed border-green-400 pointer-events-none"
              style={{
                left: sizes.safeArea,
                top: sizes.safeArea,
                right: sizes.safeArea,
                bottom: sizes.safeArea,
              }}
            />
          )}
        </div>

        {/* 책등 */}
        <div
          className="absolute bg-white"
          style={{
            left: sizes.bleed + sizes.coverW,
            top: sizes.bleed,
            width: sizes.spineW,
            height: sizes.coverH,
          }}
        >
          {spineUrl ? (
            <img
              src={spineUrl}
              alt="책등"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
              <span
                style={{
                  writingMode: 'vertical-rl',
                  textOrientation: 'mixed',
                }}
              >
                책등
              </span>
            </div>
          )}

          {/* 책등 중심선 */}
          {showGuidelines && (
            <div
              className="absolute top-0 bottom-0 border-l border-dashed border-blue-400 pointer-events-none"
              style={{
                left: '50%',
              }}
            />
          )}
        </div>

        {/* 앞표지 */}
        <div
          className="absolute bg-white"
          style={{
            left: sizes.bleed + sizes.coverW + sizes.spineW,
            top: sizes.bleed,
            width: sizes.coverW,
            height: sizes.coverH,
          }}
        >
          {frontCoverUrl ? (
            <img
              src={frontCoverUrl}
              alt="앞표지"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
              앞표지
            </div>
          )}

          {/* 앞표지 안전 영역 */}
          {showGuidelines && (
            <div
              className="absolute border border-dashed border-green-400 pointer-events-none"
              style={{
                left: sizes.safeArea,
                top: sizes.safeArea,
                right: sizes.safeArea,
                bottom: sizes.safeArea,
              }}
            />
          )}
        </div>

        {/* 재단선 (블리드 경계) */}
        {showGuidelines && (
          <>
            {/* 상단 */}
            <div
              className="absolute left-0 right-0 border-t border-red-400 pointer-events-none"
              style={{ top: sizes.bleed }}
            />
            {/* 하단 */}
            <div
              className="absolute left-0 right-0 border-t border-red-400 pointer-events-none"
              style={{ bottom: sizes.bleed }}
            />
            {/* 좌측 */}
            <div
              className="absolute top-0 bottom-0 border-l border-red-400 pointer-events-none"
              style={{ left: sizes.bleed }}
            />
            {/* 우측 */}
            <div
              className="absolute top-0 bottom-0 border-l border-red-400 pointer-events-none"
              style={{ right: sizes.bleed }}
            />
          </>
        )}
      </div>

      {/* 범례 */}
      {showGuidelines && (
        <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-4 h-0.5 bg-red-400" />
            <span>재단선</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-0.5 border-t border-dashed border-green-400" />
            <span>안전 영역</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-0.5 border-t border-dashed border-blue-400" />
            <span>책등 중심</span>
          </div>
        </div>
      )}

      {/* 사이즈 정보 */}
      <div className="mt-3 text-xs text-gray-500 text-center">
        <div>
          전체: {(coverWidth * 2 + spineWidth + bleed * 2).toFixed(1)}mm ×{' '}
          {(coverHeight + bleed * 2).toFixed(1)}mm
        </div>
        <div className="text-gray-400">
          (표지 {coverWidth}×{coverHeight}mm + 책등 {spineWidth.toFixed(1)}mm + 블리드 {bleed}mm)
        </div>
      </div>
    </div>
  )
})
