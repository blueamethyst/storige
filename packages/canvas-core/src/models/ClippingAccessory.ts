export interface ClippingAccessory {
  /// asset url
  label: string
  value: ClippingAccessoryType
  svg: string
  position: AccessoryPosition
  movingArea: MovingArea
  size: { width?: number; height?: number; radius?: number }
  keyholePosition?: KeyholePosition
}

export type MovingArea = 'inner' | 'outline' | 'bottomLine'

export type AccessoryPosition = 'topCenter' | 'center' | 'bottomCenter'

export type KeyholePosition = 'outside' | 'inside'

export type ClippingAccessoryType = 'keyring' | 'stand' | 'grip'
