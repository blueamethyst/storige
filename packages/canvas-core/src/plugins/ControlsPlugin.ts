import { ControlsPluginOption, PluginBase } from '../plugin'
import { fabric } from 'fabric'
import Editor from '../Editor'

class ControlsPlugin extends PluginBase {
  name = 'ControlsPlugin'
  hotkeys = []
  events: string[] = []

  // public hotkeys: string[] = ['space'];
  constructor(canvas: fabric.Canvas, editor: Editor, option: ControlsPluginOption) {
    super(canvas, editor, {})

    /// basic control
    fabric.Object.NUM_FRACTION_DIGITS = 4
    fabric.Object.prototype.set({
      transparentCorners: false,
      cornerColor: '#FFF',
      borderScaleFactor: 1,
      cornerStyle: 'rect',
      borderOpacityWhenMoving: 0.8,
      ...option
    })

    // 방향키로 오브젝트 이동
    this.initArrowKeyMovement()

    // 텍스트 객체 유니폼 스케일 강제 및 폰트 크기 동기화
    // 기존 객체에도 적용
    this._canvas.getObjects().forEach((obj) => {
      if (obj.type === 'i-text') {
        obj.set({ 
          lockUniScaling: true
        })
      }
    })

    // 새로 추가되는 객체에 대해서도 적용
    this._canvas.on('object:added', (evt) => {
      const target = evt.target as fabric.Object | undefined
      if (target && target.type === 'i-text') {
        target.set({ 
          lockUniScaling: true
        })
        this._canvas.requestRenderAll()
      }
    })

    // // 스케일링 시 폰트 크기 동기화: 코너 리사이즈로 텍스트 크기를 변경
    // this._canvas.on('object:scaling', (evt) => {
    //   const target = evt.target as (fabric.Object & { fontSize?: number; _scalingGuard?: boolean; __corner?: string }) | undefined
    //   if (!target || target.type !== 'i-text') return

    //   if ((target as any)._scalingGuard) return
    //   ;(target as any)._scalingGuard = true
    //   try {
    //     const sx = (target.scaleX ?? 1)
    //     const sy = (target.scaleY ?? 1)
    //     const scale = Math.max(sx, sy)
    //     if (!isFinite(scale) || scale === 1) return

    //     const currentFontSize = (target as any).fontSize ?? 16
    //     const newFontSize = Math.max(1, Math.round(currentFontSize * scale))

    //     // 드래그 중인 코너의 반대편을 기준점으로 사용
    //     const corner = target.__corner
    //     let originX: string = 'center'
    //     let originY: string = 'center'
        
    //     if (corner) {
    //       // 코너 핸들: 반대편 코너를 기준점으로
    //       if (corner === 'tl') { originX = 'right'; originY = 'bottom' }
    //       else if (corner === 'tr') { originX = 'left'; originY = 'bottom' }
    //       else if (corner === 'bl') { originX = 'right'; originY = 'top' }
    //       else if (corner === 'br') { originX = 'left'; originY = 'top' }
    //     }
        
    //     // 크기 변경 전 기준점의 좌표 저장
    //     const originPoint = target.getPointByOrigin(originX, originY)

    //     target.set({
    //       // 유니폼 스케일은 lockUniScaling으로 보장, 폰트 사이즈로 반영하고 스케일을 리셋
    //       scaleX: 1,
    //       scaleY: 1
    //     })
    //     ;(target as any).fontSize = newFontSize

    //     // 폰트 크기 변경 후 동일한 기준점의 좌표 유지 (반대편 코너 고정)
    //     target.setPositionByOrigin(originPoint, originX, originY)
    //     target.setCoords()
    //     this._canvas.requestRenderAll()
    //   } finally {
    //     ;(target as any)._scalingGuard = false
    //   }
    // })

    // 측면 핸들은 Shift 키 조합에 따라 scale/skew 동작하도록 기본 설정 유지
    // (텍스트 객체는 측면 핸들이 숨겨져 있으므로 영향 없음)
    // Shift를 누르지 않으면 scale, Shift를 누르면 skew
    ;(['ml', 'mr'] as const).forEach((key) => {
      const ctrl = (fabric.Object.prototype.controls as any)[key] as fabric.Control | undefined
      if (ctrl) {
        // Fabric.js 기본 동작: scalingXOrSkewingY
        ctrl.actionHandler = fabric.controlsUtils.scalingXOrSkewingY
        ctrl.actionName = fabric.controlsUtils.scaleOrSkewActionName
      }
    })
    ;(['mt', 'mb'] as const).forEach((key) => {
      const ctrl = (fabric.Object.prototype.controls as any)[key] as fabric.Control | undefined
      if (ctrl) {
        // Fabric.js 기본 동작: scalingYOrSkewingX
        ctrl.actionHandler = fabric.controlsUtils.scalingYOrSkewingX
        ctrl.actionName = fabric.controlsUtils.scaleOrSkewActionName
      }
    })

    //this.cornerRotationControl()
  }

  private handleArrowKeyMovement = (e: KeyboardEvent) => {
    // 입력 요소에서 포커스가 있을 때는 무시
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return
    }

    const activeObject = this._canvas.getActiveObject()
    if (!activeObject) return

    const moveDistance = e.shiftKey ? 10 : 1 // Shift 키를 누르면 10px씩 이동

    let shouldMove = false
    
    switch (e.key) {
      case 'ArrowUp':
        activeObject.set({ top: (activeObject.top || 0) - moveDistance })
        shouldMove = true
        break
      case 'ArrowDown':
        activeObject.set({ top: (activeObject.top || 0) + moveDistance })
        shouldMove = true
        break
      case 'ArrowLeft':
        activeObject.set({ left: (activeObject.left || 0) - moveDistance })
        shouldMove = true
        break
      case 'ArrowRight':
        activeObject.set({ left: (activeObject.left || 0) + moveDistance })
        shouldMove = true
        break
    }

    if (shouldMove) {
      e.preventDefault()
      activeObject.setCoords()
      this._canvas.requestRenderAll()
      this._canvas.fire('object:modified', { target: activeObject })
    }
  }

  private initArrowKeyMovement() {
    window.addEventListener('keydown', this.handleArrowKeyMovement)
  }

  dispose() {
    window.removeEventListener('keydown', this.handleArrowKeyMovement)
  }
}

export default ControlsPlugin
