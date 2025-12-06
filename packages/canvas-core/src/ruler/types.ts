import { PluginOption } from '../plugin'

export interface RulerOptions extends PluginOption {
  ruleSize?: number
  fontSize?: number
  enabled?: boolean
  backgroundColor?: string
  textColor?: string
  borderColor?: string
  highlightColor?: string
  unit: 'px' | 'mm' | 'inch' | string
  dpi: number
}

export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

export interface HighlightRect extends Rect {
  skip?: 'x' | 'y'
}

export interface RulerDrawOptions {
  direction: 'horizontal' | 'vertical'
  totalSize: number
  startCalibration: number
}

export interface RulerState {
  zoom: number
  viewportTransform: number[]
  canvasWidth: number
  canvasHeight: number
  activeObjects: any[]
  unit: string
  dpi: number
}

export interface TickInfo {
  position: number
  value: number
  label: string
  isMajor: boolean
}

export interface RulerTheme {
  backgroundColor: string
  textColor: string
  borderColor: string
  highlightColor: string
  tickColor: string
  majorTickColor: string
} 