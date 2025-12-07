import { memo } from 'react'
import { PaperType, BindingType, PAPER_THICKNESS, BINDING_MARGIN } from '@storige/types'
import { cn } from '@/lib/utils'

interface SpineSettingsProps {
  pageCount: number
  paperType: PaperType
  bindingType: BindingType
  onPageCountChange: (count: number) => void
  onPaperTypeChange: (type: PaperType) => void
  onBindingTypeChange: (type: BindingType) => void
  minPages?: number
  maxPages?: number
  pageInterval?: number
  className?: string
}

/**
 * 종이 종류 레이블
 */
const paperTypeLabels: Record<PaperType, { label: string; desc: string }> = {
  [PaperType.MOJO_70G]: { label: '모조지 70g', desc: '본문용, 0.09mm' },
  [PaperType.MOJO_80G]: { label: '모조지 80g', desc: '본문용, 0.10mm' },
  [PaperType.SEOKJI_70G]: { label: '서적지 70g', desc: '본문용, 0.10mm' },
  [PaperType.NEWSPRINT_45G]: { label: '신문지 45g', desc: '본문용, 0.06mm' },
  [PaperType.ART_200G]: { label: '아트지 200g', desc: '표지용, 0.18mm' },
  [PaperType.MATTE_200G]: { label: '매트지 200g', desc: '표지용, 0.20mm' },
  [PaperType.CARD_300G]: { label: '카드지 300g', desc: '표지용, 0.35mm' },
  [PaperType.KRAFT_120G]: { label: '크라프트지 120g', desc: '표지용, 0.16mm' },
}

/**
 * 제본 방식 레이블
 */
const bindingTypeLabels: Record<BindingType, { label: string; desc: string }> = {
  [BindingType.PERFECT]: { label: '무선제본', desc: '32p 이상' },
  [BindingType.SADDLE]: { label: '중철제본', desc: '64p 이하, 4의 배수' },
  [BindingType.SPIRAL]: { label: '스프링제본', desc: '제한 없음' },
  [BindingType.HARDCOVER]: { label: '양장제본', desc: '고급 제본' },
}

/**
 * 책등 설정 패널 컴포넌트
 */
export const SpineSettings = memo(function SpineSettings({
  pageCount,
  paperType,
  bindingType,
  onPageCountChange,
  onPaperTypeChange,
  onBindingTypeChange,
  minPages = 4,
  maxPages = 500,
  pageInterval = 4,
  className,
}: SpineSettingsProps) {
  // 페이지 수 옵션 생성
  const pageOptions: number[] = []
  for (let i = minPages; i <= maxPages; i += pageInterval) {
    pageOptions.push(i)
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* 페이지 수 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          페이지 수
        </label>
        <select
          value={pageCount}
          onChange={(e) => onPageCountChange(Number(e.target.value))}
          className={cn(
            'w-full px-3 py-2 border rounded-lg',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            'bg-white text-gray-900'
          )}
        >
          {pageOptions.map((count) => (
            <option key={count} value={count}>
              {count}p
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          본문 페이지 수 ({pageInterval}페이지 단위)
        </p>
      </div>

      {/* 종이 종류 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          종이 종류
        </label>
        <div className="space-y-2">
          <div className="text-xs text-gray-500 mb-1">본문용</div>
          {[PaperType.MOJO_70G, PaperType.MOJO_80G, PaperType.SEOKJI_70G, PaperType.NEWSPRINT_45G].map(
            (type) => (
              <PaperTypeOption
                key={type}
                type={type}
                selected={paperType === type}
                onSelect={() => onPaperTypeChange(type)}
              />
            )
          )}
          <div className="text-xs text-gray-500 mt-3 mb-1">표지용</div>
          {[PaperType.ART_200G, PaperType.MATTE_200G, PaperType.CARD_300G, PaperType.KRAFT_120G].map(
            (type) => (
              <PaperTypeOption
                key={type}
                type={type}
                selected={paperType === type}
                onSelect={() => onPaperTypeChange(type)}
              />
            )
          )}
        </div>
      </div>

      {/* 제본 방식 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          제본 방식
        </label>
        <div className="space-y-2">
          {Object.values(BindingType).map((type) => (
            <BindingTypeOption
              key={type}
              type={type}
              selected={bindingType === type}
              onSelect={() => onBindingTypeChange(type)}
            />
          ))}
        </div>
      </div>
    </div>
  )
})

interface PaperTypeOptionProps {
  type: PaperType
  selected: boolean
  onSelect: () => void
}

const PaperTypeOption = memo(function PaperTypeOption({
  type,
  selected,
  onSelect,
}: PaperTypeOptionProps) {
  const { label, desc } = paperTypeLabels[type]
  const thickness = PAPER_THICKNESS[type]

  return (
    <label
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
        selected
          ? 'bg-blue-50 border border-blue-200'
          : 'bg-gray-50 border border-transparent hover:bg-gray-100'
      )}
    >
      <input
        type="radio"
        checked={selected}
        onChange={onSelect}
        className="w-4 h-4 text-blue-600"
      />
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className="text-xs text-gray-500">{thickness}mm/장</div>
      </div>
    </label>
  )
})

interface BindingTypeOptionProps {
  type: BindingType
  selected: boolean
  onSelect: () => void
}

const BindingTypeOption = memo(function BindingTypeOption({
  type,
  selected,
  onSelect,
}: BindingTypeOptionProps) {
  const { label, desc } = bindingTypeLabels[type]
  const margin = BINDING_MARGIN[type]

  return (
    <label
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
        selected
          ? 'bg-blue-50 border border-blue-200'
          : 'bg-gray-50 border border-transparent hover:bg-gray-100'
      )}
    >
      <input
        type="radio"
        checked={selected}
        onChange={onSelect}
        className="w-4 h-4 text-blue-600"
      />
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className="text-xs text-gray-500">
          {desc} (여유분 {margin}mm)
        </div>
      </div>
    </label>
  )
})
