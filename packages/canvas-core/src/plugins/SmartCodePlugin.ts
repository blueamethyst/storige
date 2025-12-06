import { fabric } from 'fabric'
import Editor from '../editor'
import { BarCodeType, QrCodeOption, SmartCodeOption } from '../models'
import JsBarcode from 'jsbarcode'
import { v4 as uuid } from 'uuid'
import QRCodeStyling from 'qr-code-styling'
import { blobToBase64 } from '../utils/utils'
import { core } from '../utils/canvas'
import { PluginBase } from '../plugin'

const defaultBarCodeOption = {
  format: BarCodeType.EAN13,
  textAlign: 'center',
  textPosition: 'bottom',
  fontSize: 14,
  background: 'transparent',
  lineColor: '#000',
  displayValue: true
}

const defaultQrCodeOption = {
  width: 200,
  height: 200,
  type: 'canvas',
  margin: 10,
  qrOptions: {
    errorCorrectionLevel: 'M'
  },
  dotsOptions: {
    color: '#000000',
    type: 'rounded'
  },
  cornersSquareOptions: {
    color: '#000000',
    type: 'square'
  },
  cornersDotOptions: {
    color: '#000000',
    type: 'square'
  },
  backgroundOptions: {
    color: '#ffffff'
  }
}

class SmartCodePlugin extends PluginBase {
  name = 'SmartCodePlugin'
  hotkeys = []
  events = []

  constructor(canvas: fabric.Canvas, editor: Editor) {
    super(canvas, editor, {})
  }

  async hookTransform(object: fabric.Object) {
    if (object.extensionType === 'barcode') {
      object.src = this.getBarCodeDataUrl(object.extension)
    } else if (object.extensionType === 'qrcode') {
      object.src = this.getQrCodeDataUrl(object.extension)
    }
  }

  public async barcode(option: SmartCodeOption): Promise<fabric.Image | undefined> {
    return new Promise((resolve) => {
      const lastOptions = { ...defaultBarCodeOption, ...option }
      const url = this.getBarCodeDataUrl(JSON.parse(JSON.stringify(lastOptions)))
      fabric.Image.fromURL(
        url,
        (imgEl: fabric.Image) => {
          imgEl.set({
            extensionType: 'barcode',
            extension: lastOptions
          })
          imgEl.scaleToWidth(this._getWorkspace()!.getScaledWidth() / 2)
          core.keepObjectRatio(imgEl)
          resolve(imgEl)
        },
        {
          id: uuid(),
          crossOrigin: 'anonymous',
          originX: 'center',
          originY: 'center'
        }
      )
    })
  }

  public async qrcode(option: QrCodeOption): Promise<fabric.Image | undefined> {
    return new Promise(async (resolve) => {
      const lastOptions = { ...defaultQrCodeOption, ...option }
      const url = await this.getQrCodeDataUrl(lastOptions)
      fabric.Image.fromURL(
        url,
        (imgEl) => {
          imgEl.set({
            extensionType: 'qrcode',
            extension: lastOptions
          })
          imgEl.scaleToWidth(this._getWorkspace()!.getScaledWidth() / 2)

          core.keepObjectRatio(imgEl)
          resolve(imgEl)
        },
        {
          id: uuid(),
          crossOrigin: 'anonymous',
          originX: 'center',
          originY: 'center'
        }
      )
    })
  }

  private getBarCodeDataUrl(option: any): string {
    const canvas = document.createElement('canvas')
    let value = option.value

    JsBarcode(canvas, value, {
      ...option
    })
    return canvas.toDataURL('image/png', 1)
  }

  private async getQrCodeDataUrl(options: any): Promise<string> {
    const qrCode = new QRCodeStyling(options)
    const blob = await qrCode.getRawData('png')
    if (!blob) return ''
    const base64Str = (await blobToBase64(blob)) as string
    return base64Str || ''
  }
}

export default SmartCodePlugin
