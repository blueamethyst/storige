export enum BarCodeType {
  CODE128 = 'CODE128',
  EAN8 = 'EAN8',
  EAN13 = 'EAN13',
  ITF14 = 'ITF14',
  codabar = 'codabar',
  pharmacode = 'pharmacode'
}

// {
//       value: '123456',
//       format: CodeType.CODE128,
//       text: 'hi kuaitu',
//       textAlign: 'left',
//       textPosition: 'bottom',
//       fontSize: 12,
//       background: '#fff',
//       lineColor: '#000',
//       displayValue: false,
//     }

export interface SmartCodeOption {
  value: string
  format: BarCodeType
  text: string
  textAlign?: 'left' | 'center' | 'right'
  textPosition?: 'top' | 'bottom'
  fontSize?: number
  background?: string
  lineColor?: string
  displayValue?: boolean
  height?: number
  width?: number
}

enum DotsType {
  rounded = 'rounded',
  dots = 'dots',
  classy = 'classy',
  classy_rounded = 'classy-rounded',
  square = 'square',
  extra_rounded = 'extra-rounded'
}

enum CornersType {
  dot = 'dot',
  square = 'square',
  extra_rounded = 'extra-rounded'
}

enum CornersDotType {
  dot = 'dot',
  square = 'square'
}

enum ErrorCorrectionLevelType {
  L = 'L',
  M = 'M',
  Q = 'Q',
  H = 'H'
}

export interface QrCodeOption {
  width?: number
  height?: number
  type?: 'canvas'
  data: string
  margin?: number
  qrOptions?: {
    errorCorrectionLevel?: ErrorCorrectionLevelType
  }
  dotsOptions?: {
    color?: string
    type?: DotsType
  }
  cornersSquareOptions?: {
    color?: string
    type?: CornersType
  }
  cornersDotOptions?: {
    color?: string
    type?: CornersDotType
  }
  backgroundOptions?: {
    color?: string
  }
}
