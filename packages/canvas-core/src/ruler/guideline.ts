// @ts-nocheck
import { fabric } from 'fabric'

export function setupGuideLine(canvas: fabric.Canvas) {

  fabric.GuideLine = fabric.util.createClass(fabric.Line, {
    type: 'GuideLine',
    selectable: true,
    hasControls: false,
    hasBorders: false,
    stroke: '#ff2d55',
    originX: 'center',
    originY: 'center',
    padding: 4,
    globalCompositeOperation: 'difference',
    axis: 'horizontal',
    editable: false,
    alwaysTop: true,
    extensionType: 'guideline',
    excludeFromExport: true,

    initialize(points: number, options: fabric.IGuideLineOptions) {
      const computeGuideThickness = () => {
        const w = canvas.getWidth() || 0
        const h = canvas.getHeight() || 0
        const maxDim = Math.max(w, h)
        // 캔버스 크기에 따른 두께: 0~2400 → 1~4px 범위로 클램프
        const t = Math.round(maxDim / 800)
        return Math.max(1, Math.min(4, t))
      }

      const isHorizontal = options.axis === 'horizontal'
      let isDragging = false
      const initialSelectionValue = canvas.selection

      this.hoverCursor = isHorizontal ? 'ns-resize' : 'ew-resize'
      this.activeOn = 'down'

      const newPoints = isHorizontal
        ? [-999999, points, 999999, points]
        : [points, -999999, points, 999999]
      options[isHorizontal ? 'lockMovementX' : 'lockMovementY'] = true
      this.callSuper('initialize', newPoints, options)

      // 시인성 향상: 두께/그림자/유니폼 스트로크 적용
      this.set({
        strokeWidth: computeGuideThickness(),
        strokeUniform: true,
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.35)', blur: 6, offsetX: 0, offsetY: 0 })
      })

      const onMoving = (e: fabric.IEvent) => {
        if (!canvas.ruler || !canvas.ruler.enabled) {
          return
        }

        if (isDragging) {
          const { x, y } = e.absolutePointer
          this.set({
            left: x,
            top: y
          })

          const mouseEvent = e.e as MouseEvent
          if (canvas.ruler && this.isPointOnRuler(mouseEvent)) {
            this.moveCursor = 'not-allowed'
            this.hoverCursor = 'not-allowed'
          } else {
            this.moveCursor = isHorizontal ? 'ns-resize' : 'ew-resize'
            this.hoverCursor = isHorizontal ? 'ns-resize' : 'ew-resize'
          }

          this.setCoords()
          canvas.requestRenderAll()
        }
      }

      // 줌/뷰포트 변경 시 가이드선 두께 업데이트 (화면 시인성 유지)
      const onViewportChanged = () => {
        const next = computeGuideThickness()
        if (this.strokeWidth !== next) {
          this.set('strokeWidth', next)
          canvas.requestRenderAll()
        }
      }

      const onObjectAdded = (e: fabric.IEvent) => {
        this.bringToFront()
      }

      this.on('mousedown:before', (e: fabric.IEvent<MouseEvent>) => {
        if (!canvas.ruler || !canvas.ruler.enabled) {
          return
        }

        console.log('mousedown:before', e)
        isDragging = true
        canvas.selection = false
        e.e.preventDefault()
        //canvas && canvas.setActiveObject(this, e)
      })

      canvas.on('mouse:move', onMoving)
      canvas.on('object:added', onObjectAdded)
      canvas.on('viewport:changed', onViewportChanged)

      // 전역 마우스업 이벤트 처리 추가
      const onGlobalMouseUp = (e: fabric.IEvent<MouseEvent>) => {
        if (!canvas.ruler || !canvas.ruler.enabled || !isDragging) {
          return
        }

        console.log('global mouseup event triggered', { isDragging, target: e.target })
        
        isDragging = false
        canvas.selection = initialSelectionValue
        this.hoverCursor = isHorizontal ? 'ns-resize' : 'ew-resize'
        this.moveCursor = isHorizontal ? 'ns-resize' : 'ew-resize'

        // 이벤트 객체에서 좌표 추출 방식 개선
        const mouseEvent = e.e as MouseEvent
        if (canvas && this.isPointOnRuler(mouseEvent)) {
          console.log('guide removed via global mouseup')
          canvas.remove(this)
        }

        canvas.requestRenderAll()
      }

      canvas.on('mouse:up', onGlobalMouseUp)

      this.on('removed', () => {
        this.off('removed')
        this.off('mousedown:before')
        this.off('mouseup')
        canvas.off('mouse:move', onMoving)
        canvas.off('object:added', onObjectAdded)
        canvas.off('viewport:changed', onViewportChanged)
        canvas.off('mouse:up', onGlobalMouseUp)
        isDragging = false
      })
    },

    getBoundingRect(absolute, calculate) {
      this.bringToFront()

      const isHorizontal = this.isHorizontal()
      const rect = this.callSuper('getBoundingRect', absolute, calculate)
      rect[isHorizontal ? 'top' : 'left'] += rect[isHorizontal ? 'height' : 'width'] / 2
      rect[isHorizontal ? 'height' : 'width'] = 0
      return rect
    },

    isPointOnRuler(e) {
      const isHorizontal = this.isHorizontal()
      
      // 마우스 이벤트 객체에서 캔버스 상의 좌표를 얻기
      let point
      if (e.offsetX !== undefined && e.offsetY !== undefined) {
        // 일반적인 MouseEvent 객체
        point = new fabric.Point(e.offsetX, e.offsetY)
      } else if (e.clientX !== undefined && e.clientY !== undefined) {
        // clientX/Y를 사용하는 경우 캔버스 영역을 고려한 좌표 계산
        const canvasElement = canvas.getElement()
        const rect = canvasElement.getBoundingClientRect()
        point = new fabric.Point(e.clientX - rect.left, e.clientY - rect.top)
      } else {
        console.warn('Unable to get coordinates from event', e)
        return false
      }
      
      const hoveredRuler = canvas && canvas.ruler.isPointOnRuler(point)
      
      if (
        (isHorizontal && hoveredRuler === 'horizontal') ||
        (!isHorizontal && hoveredRuler === 'vertical')
      ) {
        return hoveredRuler
      }
      return false
    },

    isHorizontal() {
      return this.height === 0
    },

    isNearCanvasEdge() {
      const edgeThreshold = 20 // 가장자리에서 20px 이내
      const canvasWidth = canvas.getWidth()
      const canvasHeight = canvas.getHeight()
      const isHorizontal = this.isHorizontal()

      if (isHorizontal) {
        // 수평 가이드선: 상단/하단 가장자리 체크
        const y = this.top || 0
        return y <= edgeThreshold || y >= canvasHeight - edgeThreshold
      } else {
        // 수직 가이드선: 좌측/우측 가장자리 체크  
        const x = this.left || 0
        return x <= edgeThreshold || x >= canvasWidth - edgeThreshold
      }
    }
  } as fabric.GuideLine)

  fabric.GuideLine.fromObject = function (object, callback) {
    const clone = fabric.util.object.clone as (object: any, deep: boolean) => any

    function _callback(instance: any) {
      delete instance.xy
      callback && callback(instance)
    }

    const options = clone(object, true)
    const isHorizontal = options.height === 0

    options.xy = isHorizontal ? options.y1 : options.x1
    options.axis = isHorizontal ? 'horizontal' : 'vertical'

    fabric.Object._fromObject(options.type, options, _callback, 'xy')
  }
}

export default fabric.GuideLine
