import { UNIT_CONVERSIONS } from "../ruler/constants"

export function snapToGrid(value, gridSize = 1) {
  return Math.round(value / gridSize) * gridSize
}

const MM_PER_INCH = 25.4
const POINTS_PER_INCH = 72

export const mmToPx = (mm: number, dpi?: number): number => {
  return (mm / MM_PER_INCH) * (dpi || UNIT_CONVERSIONS.DEFAULT_DPI)
}
export const pxToMm = (px: number, dpi?: number) => (px / (dpi || UNIT_CONVERSIONS.DEFAULT_DPI)) * MM_PER_INCH

// Point to pixel conversion functions for font sizes
export const ptToPx = (pt: number, dpi?: number): number => {
  return (pt * (dpi || UNIT_CONVERSIONS.DEFAULT_DPI)) / POINTS_PER_INCH
}

export const pxToPt = (px: number, dpi?: number): number => {
  return (px * POINTS_PER_INCH) / (dpi || UNIT_CONVERSIONS.DEFAULT_DPI)
}

export const mmToPxDisplay = (mm: number): number => {
  return (mm / MM_PER_INCH) * UNIT_CONVERSIONS.DEFAULT_DPI
}

export const pxToMmDisplay = (px: number): number => {
  return (px / UNIT_CONVERSIONS.DEFAULT_DPI) * MM_PER_INCH
}

export const getUnitSize = (value: number, unit: 'mm' | 'px') => {
  return Math.round((unit === 'mm' ? pxToMmDisplay(value) : value) * 10) / 10
}

export const roundForMm = (value: number, int: boolean = false) => {
  const mmValue = pxToMmDisplay(value)
  const decimal = int ? 1 : 10
  const rounded = Math.round(mmValue * decimal) / decimal
  return mmToPxDisplay(rounded)
}

export const getObjectBound = (obj: fabric.Object, unit: 'mm' | 'px') => {
  if (unit === 'mm') {
    const widthInMm = getUnitSize(obj.width! * obj.scaleX!, unit)
    const heightInMm = getUnitSize(obj.height! * obj.scaleY!, unit)
    const leftInMm = getUnitSize(obj.left || 0, unit)
    const topInMm = getUnitSize(obj.top || 0, unit)

    return {
      width: widthInMm,
      height: heightInMm,
      left: leftInMm,
      top: topInMm
    }
  } else {
    return {
      width: snapToGrid(obj.width! * obj.scaleX!),
      height: snapToGrid(obj.height! * obj.scaleY!),
      left: obj.left || 0,
      top: obj.top || 0
    }
  }
}

export default {
  snapToGrid,
  mmToPx,
  pxToMm,
  mmToPxDisplay,
  pxToMmDisplay,
  ptToPx,
  pxToPt,
  getObjectBound,
  getUnitSize,
  roundForMm
}
