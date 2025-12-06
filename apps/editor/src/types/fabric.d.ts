/**
 * Fabric.js 타입 확장
 * canvas-core의 fabric.d.ts와 동기화
 */

declare namespace fabric {
  interface Canvas {
    id: string
    contextTop: CanvasRenderingContext2D
    lowerCanvasEl: HTMLCanvasElement
    upperCanvasEl: HTMLCanvasElement
    wrapperEl: HTMLElement
    isDragging: boolean
    historyProcessing: boolean
    _currentTransform: unknown
    extraProps: any
    _centerObject: (obj: fabric.Object, center: fabric.Point) => fabric.Canvas
    undo: (callback?: () => void) => void
    redo: (callback?: () => void) => void
    canUndo: () => boolean
    canRedo: () => boolean
    historyUndo: any[]
    historyRedo: any[]
    strokeOpacity: number
    fillOpacity: number
    screenshot: any
    disposed?: boolean

    name?: string

    unitOptions: {
      unit: 'px' | 'mm'
      dpi: number
    }

    clearHistory(): void
    _historyNext(): void
    _historyInit(): void
    offHistory(): void
    onHistory(): void
    _setupCurrentTransform(e: Event, target: fabric.Object, alreadySelected: boolean): void
    getCenterPoint(): fabric.Point
  }

  interface ICanvasOptions {
    id?: string
    index?: number
  }

  interface Object {
    id: string
    originalLeft: number
    originalTop: number
    extensionType: string
    fillImage: string
    editable: boolean
    movingPath?: fabric.Path
    fixed?: boolean
    alwaysTop?: boolean
    getElement(): HTMLCanvasElement
    [key: string]: any
  }

  interface IGroupOptions {
    id?: string
    editable?: boolean
    extensionType?: string
  }

  interface IPathOptions {
    id?: string
    editable?: boolean
    extensionType?: string
    evented?: boolean
    hasControls?: boolean
    lockMovementX?: boolean
    lockMovementY?: boolean
    [key: string]: any
  }

  interface Path {
    editable?: boolean
    [key: string]: any
  }

  interface IRectOptions {
    id?: string
    editable?: boolean
    clipPath?: any
    extensionType?: string
  }

  interface IImageOptions {
    id?: string
    crossOrigin?: string
    editable?: boolean
    extensionType?: string
  }

  interface ITextOptions {
    id?: string
    editable?: boolean
    extensionType?: string
  }

  interface ILineOptions {
    id?: string
  }

  interface IBaseFilter {
    effectType?: string | undefined
  }

  interface StaticCanvas {
    ruler: any
  }
}
