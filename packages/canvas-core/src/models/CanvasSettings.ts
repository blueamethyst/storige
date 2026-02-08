// 봉투 옵션 타입
export interface EnvelopeOption {
  direction: 'top' | 'bottom' | 'left' | 'right'
  size: {
    width: number
    height: number
  }
}

// 기본 설정값 타입
export interface CanvasSettings {
  unit: 'mm' | 'px'
  // 큰 사이즈를 대응하기 위한 방법
  visibleUnit?: 'mm' | 'px'
  colorMode: 'RGB' | 'CMYK'
  dpi: number
  size: {
    width: number
    height: number
    cutSize: number
    safeSize?: number
    printSize?: {
      width: number
      height: number
    }
  }
  showCutBorder: boolean
  showSafeBorder?: boolean
  controls?: CanvasControls
  editMode?: boolean
  page: {
    count: number
    min: number
    max: number
    interval: number
  },
  category?: string,
  reduced?: boolean
  envelopeOption?: EnvelopeOption
  spreadMode?: boolean  // 스프레드 모드 여부
}

export interface CanvasControls {
  transparentCorners?: boolean
  borderColor?: string
  cornerColor?: string
  borderScaleFactor?: number
  cornerStyle?: 'circle' | 'rect' | undefined
  cornerStrokeColor?: string
  borderOpacityWhenMoving?: number
}

type EditorMenu =
  | 'clipping'
  | 'template'
  | 'image'
  | 'text'
  | 'shape'
  | 'background'
  | 'frame'
  | 'smartcode'
