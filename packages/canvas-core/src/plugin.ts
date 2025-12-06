import Editor from './editor'
import CanvasHotkey from './models/CanvasHotkey'

export type Exposed<T> = { [K in keyof T]: T[K] }
export type PluginOption = Exposed<Record<string, any>>

export interface ControlsPluginOption extends PluginOption {
  transparentCorners?: boolean
  borderColor?: string
  cornerColor?: string
  borderScaleFactor?: number
  cornerStyle?: 'circle' | 'rect' | undefined
  cornerStrokeColor?: string
  borderOpacityWhenMoving?: number
}

export interface Lifecycle {
  mounted: () => Promise<void>
  destroyed: () => Promise<void>
  beforeLoad: () => Promise<void>
  afterLoad: () => Promise<void>
  beforeSave: () => Promise<void>
  afterSave: () => Promise<void>
}

export abstract class PluginBase implements Lifecycle {
  readonly _canvas: fabric.Canvas
  readonly _editor: Editor
  _options: PluginOption
  abstract name: string
  abstract events: string[]

  // key is KeyInput
  abstract hotkeys: CanvasHotkey[]

  protected constructor(canvas: fabric.Canvas, editor: Editor, options: PluginOption) {
    this._canvas = canvas
    this._editor = editor
    this._options = options
  }

  mounted(): Promise<void> {
    return new Promise((r) => {
      this._editor.emit(`${this.name}:mounted`)
      r()
    })
  }

  destroyed(): Promise<void> {
    return new Promise((r) => r())
  }

  beforeLoad(...args: any[]): Promise<void> {
    return new Promise((r) => r(...args))
  }

  afterLoad(...args: any[]): Promise<void> {
    return new Promise((r) => r(...args))
  }

  beforeSave(...args: any[]): Promise<void> {
    return new Promise((r) => r(...args))
  }

  afterSave(...args: any[]): Promise<void> {
    return new Promise((r) => r(...args))
  }

  protected _getWorkspace(): fabric.Object | undefined {
    return this._canvas.getObjects().find((obj: fabric.Object) => obj.id === 'workspace')
  }

  [propName: string]: any
}
