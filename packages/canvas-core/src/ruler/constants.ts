export const UNIT_CONVERSIONS = {
  MM_TO_INCH: 25.4,
  INCH_TO_MM: 1 / 25.4,
  DEFAULT_DPI: 150
} as const

export const RULER_DEFAULTS = {
  RULE_SIZE: 20,
  FONT_SIZE: 10,
  BACKGROUND_COLOR: '#fff',
  TEXT_COLOR: '#888',
  BORDER_COLOR: '#ddd',
  HIGHLIGHT_COLOR: '#545A92',
  TICK_COLOR: '#ccc',
  MAJOR_TICK_COLOR: '#888',
  UNIT: 'mm',
  DPI: UNIT_CONVERSIONS.DEFAULT_DPI
} as const

// DPI에 따른 적응형 눈금 간격 설정 (mm 단위)
export const DPI_ADAPTIVE_GAPS = {
  // 72 DPI에서는 더 넓은 간격 사용
  72: {
    ZOOMS: [0.1, 0.5, 1, 2, 4, 8],
    GAPS: [200, 100, 50, 25, 10, 5]
  },
  150: {
    ZOOMS: [0.1, 0.5, 1, 2, 5, 10],
    GAPS: [100, 50, 25, 10, 5, 2]
  },
  300: {
    ZOOMS: [0.1, 0.5, 1, 2, 5, 10],
    GAPS: [50, 25, 10, 5, 2, 1]
  }
} as const

export const ZOOM_GAPS = {
  ZOOMS: [0.02, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 18],
  GAPS: [10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10]
} as const

export const MM_GAPS = {
  ZOOMS: [0.1, 0.5, 1, 2, 5, 10],
  GAPS: [200, 100, 50, 20, 10, 5]
} as const

export const RENDER_SETTINGS = {
  THROTTLE_DELAY: 8,
  DEBOUNCE_DELAY: 16,
  CACHE_SIZE: 50,
  MAX_TICKS_PER_RENDER: 100,
  MIN_TICK_SPACING: 5
} as const 