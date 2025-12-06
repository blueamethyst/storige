import { fabric } from 'fabric'

/**
 * 외부 에셋 없이 금박 효과 구현
 * FilterPlugin 클래스의 golden 메서드 대체용 코드
 */
function createGoldPatternCanvas(): HTMLCanvasElement {
  const patternCanvas = document.createElement('canvas')
  const size = 512
  patternCanvas.width = size
  patternCanvas.height = size
  const ctx = patternCanvas.getContext('2d')

  if (!ctx) return patternCanvas

  // Base gradient - gold metallic effect
  const gradient = ctx.createLinearGradient(0, 0, size, size)
  gradient.addColorStop(0, '#ffd700') // Pure gold
  gradient.addColorStop(0.1, '#f5cc7f') // Light gold
  gradient.addColorStop(0.3, '#e6c66c') // Muted gold
  gradient.addColorStop(0.5, '#d4af37') // Deep gold
  gradient.addColorStop(0.7, '#e6c66c') // Muted gold
  gradient.addColorStop(0.9, '#f5cc7f') // Light gold
  gradient.addColorStop(1, '#ffd700') // Pure gold

  // Fill the pattern background
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  // Add noise texture to simulate foil variations
  addNoiseTexture(ctx, size, 0.13)

  // Add random specular highlights
  addSpecularHighlights(ctx, size, 16)

  return patternCanvas
}

// Adds a subtle noise texture to simulate foil imperfections
function addNoiseTexture(ctx: CanvasRenderingContext2D, size: number, intensity: number): void {
  const imageData = ctx.getImageData(0, 0, size, size)
  const data = imageData.data

  for (let i = 0; i < data.length; i += 4) {
    // Random variation in gold tones
    const noiseValue = (Math.random() - 0.5) * intensity * 255

    // Apply noise to each channel with higher intensity on red and green (gold is predominantly these colors)
    data[i] = Math.min(255, Math.max(0, data[i] + noiseValue * 1.2)) // Red
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noiseValue)) // Green
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noiseValue * 0.8)) // Blue less affected
  }

  ctx.putImageData(imageData, 0, 0)
}

// Adds small specular highlights that give the metallic shine effect
function addSpecularHighlights(ctx: CanvasRenderingContext2D, size: number, count: number): void {
  ctx.save()

  // Create some random highlight points
  for (let i = 0; i < count; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const radius = Math.random() * 15 + 5
    const alpha = Math.random() * 0.3 + 0.1

    // Create highlight gradient
    const highlight = ctx.createRadialGradient(x, y, 0, x, y, radius)
    highlight.addColorStop(0, `rgba(255, 255, 255, ${alpha})`)
    highlight.addColorStop(1, 'rgba(255, 255, 255, 0)')

    ctx.fillStyle = highlight
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  // Add a few larger, more subtle light areas
  for (let i = 0; i < Math.floor(count / 4); i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const radius = Math.random() * 40 + 20
    const alpha = Math.random() * 0.15 + 0.05

    const highlight = ctx.createRadialGradient(x, y, 0, x, y, radius)
    highlight.addColorStop(0, `rgba(255, 255, 220, ${alpha})`)
    highlight.addColorStop(1, 'rgba(255, 255, 220, 0)')

    ctx.fillStyle = highlight
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

// Animation function removed as requested

/**
 * FilterPlugin 클래스에 적용할 golden 메서드
 * 외부 이미지 없이 캔버스 기반 금박 효과 구현
 */
function goldenEffect(object: fabric.Object) {
  object.effects ??= []

  console.log('goldenEffect')

  try {
    // Check if gold effect is already applied - remove it if so
    if (object.effects.includes('gold')) {
      // Reset the fill
      object.fill = '#000000'

      // Remove any overlay
      const overlay = this._canvas
        .getObjects()
        .find((o: fabric.Object) => o.id === `${object.id}_gold`)

      if (overlay) {
        object.hasBinding = false
        this._canvas.remove(overlay)
      }

      // Remove the effect
      object.effects = object.effects.filter((effect) => effect !== 'gold')
      object.dirty = true
      this._canvas.requestRenderAll()
      return
    }

    // Create gold pattern
    const goldCanvas = createGoldPatternCanvas()
    const goldPattern = new fabric.Pattern({
      source: goldCanvas as any,
      repeat: 'repeat'
    })

    const currentId = object.id

    this._canvas.offHistory()

    // Create rectangle with gold pattern
    const rect = new fabric.Rect({
      id: `${currentId}_gold`,
      width: object.width * object.scaleX,
      height: object.height * object.scaleY,
      scaleX: 1,
      scaleY: 1,
      fill: goldPattern
    })

    const item = object
    rect.scaleToWidth(item.width)
    rect.scaleToHeight(item.height)

    // Apply the overlay
    const fore: fabric.Object = this.setOverlay(rect, item)

    fore.set({
      id: `${currentId}_gold`,
      editable: false,
      hasControls: false,
      selectable: false,
      evented: false,
      extensionType: 'overlay',
      overlayType: 'gold'
    })

    // Add to canvas
    this._canvas.add(fore)
    this._canvas.onHistory()
    // Animation effect removed as requested

    // Mark as having gold effect
    object.effects ??= []
    object.effects.push('gold')
    object.dirty = true

    this._canvas.requestRenderAll()
  } catch (e) {
    console.error('Gold effect error:', e)
  }
}

export { goldenEffect }
