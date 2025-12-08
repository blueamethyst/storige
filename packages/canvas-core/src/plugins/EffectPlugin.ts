import { fabric } from 'fabric'
import Editor from '../Editor'
import { v4 as uuid } from 'uuid'
import { PluginBase } from '../plugin'

class EffectPlugin extends PluginBase {
  name = 'EffectPlugin'
  hotkeys = []
  events = []

  constructor(canvas: fabric.Canvas, editor: Editor) {
    super(canvas, editor, {})
  }

  public textCurve(object: fabric.IText, radius: number): fabric.Group {
    if (!object.text) {
      throw new Error('Text is empty')
    }

    const letters = object.text.split('')
    const angleStep = 180 / (letters.length - 1)
    const centerPoint = object.getCenterPoint()

    const letterObjects = letters.map((letter, i) => {
      const angle = -90 + i * angleStep // 시작 각도 -90도로 중앙에서 시작
      const radian = (angle * Math.PI) / 180 // 각도를 라디안으로 변환

      // x, y 좌표 계산
      const x = centerPoint.x + radius * Math.cos(radian)
      const y = centerPoint.y + radius * Math.sin(radian)

      // 개별 문자 객체 생성
      return new fabric.Text(letter, {
        left: x,
        top: y,
        originX: 'center',
        originY: 'center',
        angle: angle + 90, // 글자를 곡선에 맞게 회전
        fontSize: object.fontSize,
        fontFamily: object.fontFamily,
        fill: object.fill
      })
    })

    // 글자들을 그룹으로 묶음
    return new fabric.Group(letterObjects, {
      id: uuid(),
      left: centerPoint.x,
      top: centerPoint.y,
      originX: 'center',
      originY: 'center'
    })
  }
}

export default EffectPlugin
