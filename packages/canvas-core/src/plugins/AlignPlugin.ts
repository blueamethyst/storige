import Editor from '../editor'
import { PluginBase } from '../plugin'
import { fabric } from 'fabric'

class AlignPlugin extends PluginBase {
  name = 'AlignPlugin'

  hotkeys = []
  events: string[] = []

  constructor(canvas: fabric.Canvas, editor: Editor) {
    super(canvas, editor, {})
  }

  center(object: fabric.Object) {
    const workspace = this._getWorkspace()
    const center = workspace.getCenterPoint()
    return this._canvas._centerObject(object, center)
  }

  setV(type: 'top' | 'center' | 'bottom') {
    const objects = this._canvas.getActiveObjects()

    if (!objects || objects.length === 0) {
      return
    }

    // 캔버스에서 현재 변경 상태 추적 시작
    this._canvas.offHistory()

    /// 그룹 아이템일 경우
    if (objects.length > 1) {
      // 모든 객체의 경계를 구해서 정렬 기준점 계산
      const bounds = objects.map(obj => obj.getBoundingRect(true))
      
      let targetY = 0
      if (type === 'top') {
        targetY = Math.min(...bounds.map(b => b.top))
      } else if (type === 'center') {
        const totalCenterY = bounds.reduce((sum, b) => sum + b.top + b.height / 2, 0)
        targetY = totalCenterY / objects.length
      } else if (type === 'bottom') {
        targetY = Math.max(...bounds.map(b => b.top + b.height))
      }

      // 각 객체를 정렬
      objects.forEach((item, index) => {
        const bound = bounds[index]
        let newY = targetY

        if (type === 'top') {
          newY = targetY + bound.height / 2
        } else if (type === 'center') {
          newY = targetY
        } else if (type === 'bottom') {
          newY = targetY - bound.height / 2
        }

        this._canvas._centerObject(item, new fabric.Point(item.getCenterPoint().x, newY))
        item.setCoords()
        item.dirty = true
      })

      // 캔버스를 한 번 렌더링하여 객체 위치 업데이트 반영
      this._canvas.requestRenderAll()

      // ActiveSelection을 새로 생성하여 바운딩 박스 크기를 올바르게 업데이트
      this._canvas.discardActiveObject()
      const newActiveSelection = new fabric.ActiveSelection(objects, { canvas: this._canvas })
      this._canvas.setActiveObject(newActiveSelection)
      
      // 새로운 ActiveSelection의 좌표 설정
      newActiveSelection.setCoords()
      
      // 선택 박스 업데이트를 위해 다시 렌더링
      this._canvas.requestRenderAll()

      // modified 이벤트 발생 - 상태 변경 알림
      this._canvas.fire('object:modified', { target: newActiveSelection })
    } else {
      const bound = this._getWorkspace().getBoundingRect(true)
      const object = objects[0]
      const objectBound = object.getBoundingRect(true)

      let point = 0
      if (type === 'top') {
        point = bound.top + objectBound.height / 2
      } else if (type === 'center') {
        point = bound.top + bound.height / 2
      } else if (type === 'bottom') {
        point = bound.top + bound.height - objectBound.height / 2
      }

      this._canvas._centerObject(object, new fabric.Point(object.getCenterPoint().x, point))
      object.setCoords()
      object.dirty = true // 객체를 dirty로 표시하여 강제 업데이트

      // modified 이벤트 발생 - 상태 변경 알림
      this._canvas.fire('object:modified', { target: object })
    }

    // 캔버스 렌더링 및 히스토리 추적 재개
    this._canvas.requestRenderAll()
    this._canvas.onHistory()
  }

  setH(type: 'left' | 'center' | 'right') {
    const objects = this._canvas.getActiveObjects()

    if (!objects || objects.length === 0) {
      return
    }

    // 캔버스에서 현재 변경 상태 추적 시작
    this._canvas.offHistory()

    /// 그룹 아이템일 경우
    if (objects.length > 1) {
      // 모든 객체의 경계를 구해서 정렬 기준점 계산
      const bounds = objects.map(obj => obj.getBoundingRect(true))
      
      let targetX = 0
      if (type === 'left') {
        targetX = Math.min(...bounds.map(b => b.left))
      } else if (type === 'center') {
        const totalCenterX = bounds.reduce((sum, b) => sum + b.left + b.width / 2, 0)
        targetX = totalCenterX / objects.length
      } else if (type === 'right') {
        targetX = Math.max(...bounds.map(b => b.left + b.width))
      }

      // 각 객체를 정렬
      objects.forEach((item, index) => {
        const bound = bounds[index]
        let newX = targetX

        if (type === 'left') {
          newX = targetX + bound.width / 2
        } else if (type === 'center') {
          newX = targetX
        } else if (type === 'right') {
          newX = targetX - bound.width / 2
        }

        this._canvas._centerObject(item, new fabric.Point(newX, item.getCenterPoint().y))
        item.setCoords()
        item.dirty = true
      })

      // 캔버스를 한 번 렌더링하여 객체 위치 업데이트 반영
      this._canvas.requestRenderAll()

      // ActiveSelection을 새로 생성하여 바운딩 박스 크기를 올바르게 업데이트
      this._canvas.discardActiveObject()
      const newActiveSelection = new fabric.ActiveSelection(objects, { canvas: this._canvas })
      this._canvas.setActiveObject(newActiveSelection)
      
      // 새로운 ActiveSelection의 좌표 설정
      newActiveSelection.setCoords()
      
      // 선택 박스 업데이트를 위해 다시 렌더링
      this._canvas.requestRenderAll()

      // modified 이벤트 발생 - 상태 변경 알림
      this._canvas.fire('object:modified', { target: newActiveSelection })
    } else {
      const bound = this._getWorkspace().getBoundingRect(true)
      const object = objects[0]
      const objectBound = object.getBoundingRect(true)

      let point = 0
      if (type === 'left') {
        point = bound.left + objectBound.width / 2
      } else if (type === 'center') {
        point = bound.left + bound.width / 2
      } else if (type === 'right') {
        point = bound.left + bound.width - objectBound.width / 2
      }

      this._canvas._centerObject(object, new fabric.Point(point, object.getCenterPoint().y))
      object.setCoords()
      object.dirty = true // 객체를 dirty로 표시하여 강제 업데이트

      // modified 이벤트 발생 - 상태 변경 알림
      this._canvas.fire('object:modified', { target: object })
    }

    // 캔버스 렌더링 및 히스토리 추적 재개
    this._canvas.requestRenderAll()
    this._canvas.onHistory()
  }

  dispose() {}
}

export default AlignPlugin
