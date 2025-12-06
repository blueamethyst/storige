import { fabric } from 'fabric'

/**
 * 외부 에셋 없이 엠보싱 효과 구현 - 향상된 버전
 * FilterPlugin 클래스의 emboss 메서드 대체용 코드
 */
function createEmbossPatternCanvas(object: fabric.Object): HTMLCanvasElement {
  const objectElement = object.getElement
    ? (object.getElement() as unknown as HTMLImageElement)
    : null
  const patternCanvas = document.createElement('canvas')
  const size = objectElement ? Math.max(objectElement.width, objectElement.height) : 1000
  patternCanvas.width = objectElement ? objectElement.width : size
  patternCanvas.height = objectElement ? objectElement.height : size
  const ctx = patternCanvas.getContext('2d')

  if (!ctx) return patternCanvas

  // 기본 바탕은 밝은 색상으로 설정
  ctx.fillStyle = '#f5f5f5'
  ctx.fillRect(0, 0, patternCanvas.width, patternCanvas.height)

  // 고급 엠보싱 효과 적용
  applyEnhancedEmbossEffect(ctx, patternCanvas.width, patternCanvas.height)

  return patternCanvas
}

/**
 * 향상된 엠보싱 효과 적용 함수
 */
function applyEnhancedEmbossEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  // 1. 소프트 하이라이트와 그림자 효과
  addSoftLightingEffect(ctx, width, height)

  // 2. 미세 질감 패턴 추가
  addTexturePattern(ctx, width, height)

  // 3. 마지막으로 전체적인 조정
  finalizeEmbossEffect(ctx, width, height)
}

/**
 * 부드러운 조명 효과 추가 (더 입체적인 느낌)
 */
function addSoftLightingEffect(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  // 위쪽 하이라이트 (더 밝고 강한 효과)
  const topGradient = ctx.createLinearGradient(0, 0, 0, height * 0.5)
  topGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)')
  topGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = topGradient
  ctx.fillRect(0, 0, width, height * 0.5)

  // 왼쪽 하이라이트
  const leftGradient = ctx.createLinearGradient(0, 0, width * 0.5, 0)
  leftGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)')
  leftGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = leftGradient
  ctx.fillRect(0, 0, width * 0.5, height)

  // 오른쪽 그림자 (미묘한 효과)
  const rightGradient = ctx.createLinearGradient(width * 0.5, 0, width, 0)
  rightGradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
  rightGradient.addColorStop(1, 'rgba(0, 0, 0, 0.15)')
  ctx.fillStyle = rightGradient
  ctx.fillRect(width * 0.5, 0, width * 0.5, height)

  // 아래쪽 그림자 (미묘한 효과)
  const bottomGradient = ctx.createLinearGradient(0, height * 0.5, 0, height)
  bottomGradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
  bottomGradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)')
  ctx.fillStyle = bottomGradient
  ctx.fillRect(0, height * 0.5, width, height * 0.5)
}

/**
 * 입체감을 높이는 미세 질감 패턴 추가
 */
function addTexturePattern(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  // 미세한 점 패턴 (엠보싱 질감 표현)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'

  // 점 패턴의 밀도 조정
  const density = 3 // 낮을수록 더 조밀한 패턴

  for (let i = 0; i < width; i += density) {
    for (let j = 0; j < height; j += density) {
      if (Math.random() > 0.7) {
        // 30%의 점만 표시하여 자연스러운 질감
        const size = Math.random() * 0.8 + 0.2 // 0.2 ~ 1.0 크기의 점
        ctx.fillRect(i, j, size, size)
      }
    }
  }

  // 추가적인 퍼프 효과 (더 울록불록한 느낌)
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * width
    const y = Math.random() * height
    const radius = Math.random() * 20 + 5 // 5~25px 반경

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)')
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.1)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }
}

/**
 * 전체적인 엠보싱 효과의 마무리 조정
 */
function finalizeEmbossEffect(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  // 전체 밝기 약간 증가
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.fillRect(0, 0, width, height)

  // 윤곽 강화를 위한 미세 테두리 효과
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
  ctx.lineWidth = 0.5
  ctx.strokeRect(1, 1, width - 2, height - 2)
}

/**
 * FilterPlugin 클래스에 적용할 emboss 메서드
 * 외부 이미지 없이 캔버스 기반 엠보싱 효과 구현
 */
function embossEffect(object: fabric.Object) {
  object.effects ??= []

  try {
    // 이미 emboss 효과가 적용되어 있는지 확인하고, 있으면 제거
    if (object.effects.includes('emboss')) {
      // 기본 상태로 복원
      object.fill = '#000000'
      object.shadow = null

      // 오버레이 제거
      const overlay = this._canvas
        .getObjects()
        .find((o: fabric.Object) => o.id === `${object.id}_emboss`)

      if (overlay) {
        object.hasBinding = false
        this._canvas.remove(overlay)
      }

      // 효과 제거
      object.effects = object.effects.filter((effect) => effect !== 'emboss')
      object.dirty = true
      this._canvas.requestRenderAll()
      return
    }

    const currentId = object.id

    this._canvas.offHistory()
    // 이미지 또는 다른 객체는 패턴 오버레이 적용
    const embossCanvas = createEmbossPatternCanvas(object) as unknown as HTMLImageElement | string
    const embossPattern = new fabric.Pattern({
      source: embossCanvas,
      repeat: 'no-repeat'
    })

    // 사각형 오버레이 생성
    const rect = new fabric.Rect({
      id: `${currentId}_emboss`,
      width: object.width * object.scaleX,
      height: object.height * object.scaleY,
      scaleX: 1,
      scaleY: 1,
      fill: embossPattern
    })

    const item = object
    rect.scaleToWidth(item.width)
    rect.scaleToHeight(item.height)

    // 오버레이 설정
    const fore: fabric.Object = this.setOverlay(rect, item)

    // 미묘한 그림자와 함께 설정
    fore.set({
      id: `${currentId}_emboss`,
      editable: false,
      hasControls: false,
      selectable: false,
      evented: false,
      extensionType: 'overlay',
      opacity: 0.9,
      overlayType: 'emboss',
      shadow: new fabric.Shadow({
        color: 'rgba(0,0,0,0.3)',
        offsetX: 2,
        offsetY: 2,
        blur: 4
      })
    })

    // 캔버스에 추가
    this._canvas.add(fore)

    this._canvas.onHistory()

    // 효과 표시
    object.effects ??= []
    object.effects.push('emboss')
    object.dirty = true

    this._canvas.requestRenderAll()
  } catch (e) {
    console.error('Emboss effect error:', e)
  }
}

/**
 * 주어진 색상을 밝게 만들어 하이라이트 효과를 주는 함수
 */
function getHighlightColor(color: string): string {
  // 임시 캔버스를 사용해 색상 추출
  const tempCanvas = document.createElement('canvas')
  const ctx = tempCanvas.getContext('2d')
  if (!ctx) return '#ffffff'

  ctx.fillStyle = color
  ctx.fillRect(0, 0, 1, 1)
  const data = ctx.getImageData(0, 0, 1, 1).data

  // 색상을 더 밝게 만들기 (최대 255까지)
  const r = Math.min(255, data[0] + 70)
  const g = Math.min(255, data[1] + 70)
  const b = Math.min(255, data[2] + 70)

  return `rgb(${r}, ${g}, ${b})`
}

export { embossEffect }
