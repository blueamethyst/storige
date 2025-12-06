import { fabric } from 'fabric'

/**
 * 외부 에셋 없이 커팅 효과 구현
 * FilterPlugin 클래스의 cutting 메서드 대체용 코드
 */

/**
 * 패턴화된 텍스처를 생성하는 함수
 * @returns 패턴 텍스처가 그려진 캔버스 요소
 */
function createCuttingPatternCanvas(): HTMLCanvasElement {
  const patternCanvas = document.createElement('canvas')
  const size = 512
  patternCanvas.width = size
  patternCanvas.height = size
  const ctx = patternCanvas.getContext('2d')

  if (!ctx) return patternCanvas

  // 배경색 설정
  ctx.fillStyle = '#f9f9f9'
  ctx.fillRect(0, 0, size, size)

  // 패턴 생성 (격자 무늬)
  createGridPattern(ctx, size)

  // 텍스처 추가
  addTextureNoise(ctx, size)

  return patternCanvas
}

/**
 * 격자 패턴 생성 함수
 */
function createGridPattern(ctx: CanvasRenderingContext2D, size: number): void {
  // 격자 크기 및 색상 설정
  const gridSize = 10
  ctx.strokeStyle = '#e5e5e5'
  ctx.lineWidth = 0.5

  // 수평선
  for (let y = 0; y <= size; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(size, y)
    ctx.stroke()
  }

  // 수직선
  for (let x = 0; x <= size; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, size)
    ctx.stroke()
  }

  // 더 굵은 주요 격자선 (5x5 격자마다)
  ctx.strokeStyle = '#d0d0d0'
  ctx.lineWidth = 1

  for (let y = 0; y <= size; y += gridSize * 5) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(size, y)
    ctx.stroke()
  }

  for (let x = 0; x <= size; x += gridSize * 5) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, size)
    ctx.stroke()
  }
}

/**
 * 텍스처 노이즈 추가 함수
 */
function addTextureNoise(ctx: CanvasRenderingContext2D, size: number): void {
  const imageData = ctx.getImageData(0, 0, size, size)
  const data = imageData.data

  // 미세한 노이즈 추가
  for (let i = 0; i < data.length; i += 4) {
    const noise = Math.random() * 15 - 7.5

    // 모든 채널에 동일한 노이즈 적용하여 회색조 효과 유지
    data[i] = Math.min(255, Math.max(0, data[i] + noise))
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise))
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise))
  }

  ctx.putImageData(imageData, 0, 0)

  // 약간의 무작위 점 추가
  ctx.fillStyle = 'rgba(200, 200, 200, 0.3)'

  for (let i = 0; i < 300; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const radius = Math.random() * 0.8

    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  // 더 어두운 점 몇 개 추가
  ctx.fillStyle = 'rgba(100, 100, 100, 0.2)'

  for (let i = 0; i < 100; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const radius = Math.random() * 0.5 + 0.2

    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }
}

/**
 * FilterPlugin 클래스에 적용할 cutting 메서드
 * 외부 이미지 없이 캔버스 기반 커팅 효과 구현
 */
function cuttingEffect(object: fabric.Object) {
  object.effects ??= []

  try {
    // 이미 cutting 효과가 적용되어 있는지 확인하고, 있으면 제거
    if (object.effects.includes('cutting')) {
      // 기본 색상으로 복원
      object.fill = '#000000'
      object.shadow = null

      // 오버레이 제거
      const overlay = this._canvas
        .getObjects()
        .find((o: fabric.Object) => o.id === `${object.id}_cutting`)

      if (overlay) {
        object.hasBinding = false
        this._canvas.remove(overlay)
      }

      // 효과 제거
      object.effects = object.effects.filter((effect) => effect !== 'cutting')
      object.dirty = true
      this._canvas.requestRenderAll()
      return
    }

    // 패턴 생성
    const patternCanvas = createCuttingPatternCanvas()
    const cuttingPattern = new fabric.Pattern({
      source: patternCanvas as any,
      repeat: 'repeat'
    })

    const currentId = object.id

    this._canvas.offHistory()

    // 이미지인 경우 패턴이 있는 사각형 오버레이 생성
    const rect = new fabric.Rect({
      id: `${currentId}_cutting`,
      width: object.width * object.scaleX,
      height: object.height * object.scaleY,
      scaleX: 1,
      scaleY: 1,
      fill: cuttingPattern
    })

    // 오브젝트 크기에 맞게 조정
    const item = object
    rect.scaleToWidth(item.width)
    rect.scaleToHeight(item.height)

    // 오버레이 설정
    const fore: fabric.Object = this.setOverlay(rect, item)

    // 내부 그림자 효과 추가
    fore.set({
      id: `${currentId}_cutting`,
      editable: false,
      hasControls: false,
      selectable: false,
      evented: false,
      overlayType: 'cutting',
      extensionType: 'overlay'
    })

    // 캔버스에 추가
    this._canvas.add(fore)
    this._canvas.onHistory()

    // cutting 효과 표시
    object.effects ??= []
    object.effects.push('cutting')
    object.dirty = true

    this._canvas.requestRenderAll()
  } catch (e) {
    console.error('Cutting effect error:', e)
  }
}

export { cuttingEffect, createCuttingPatternCanvas }
