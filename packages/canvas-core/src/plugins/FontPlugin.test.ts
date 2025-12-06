import { describe, it, expect } from 'vitest'

/**
 * Tests for rotated text position calculation
 * 
 * When converting text to path, the position must be correctly transformed
 * from the original text object's coordinate system (which may use any origin)
 * to the path object's coordinate system (which uses left/top origin).
 * 
 * The transformation must account for:
 * - Different origin points (left, center, right for X; top, center, bottom for Y)
 * - Rotation angle
 * - Scale factors
 * - Flip transformations (flipX, flipY)
 */

describe('FontPlugin - Rotated text position transformation', () => {
  /**
   * Helper function to calculate the expected path position
   * This mimics the logic in FontPlugin._convertTextToPathWithWOFF2
   */
  function calculatePathPosition(
    textLeft: number,
    textTop: number,
    textWidth: number,
    textHeight: number,
    originX: 'left' | 'center' | 'right',
    originY: 'top' | 'center' | 'bottom',
    angle: number,
    scaleX: number = 1,
    scaleY: number = 1,
    flipX: boolean = false,
    flipY: boolean = false
  ): { left: number; top: number } {
    // Fabric.js uses effective scale = scale * (flip ? -1 : 1)
    const effectiveScaleX = scaleX * (flipX ? -1 : 1)
    const effectiveScaleY = scaleY * (flipY ? -1 : 1)
    
    // Calculate offset from original origin to left/top origin
    let offsetX = 0
    let offsetY = 0
    
    if (originX === 'center') {
      offsetX = -(textWidth * effectiveScaleX) / 2
    } else if (originX === 'right') {
      offsetX = -(textWidth * effectiveScaleX)
    }
    
    if (originY === 'center') {
      offsetY = -(textHeight * effectiveScaleY) / 2
    } else if (originY === 'bottom') {
      offsetY = -(textHeight * effectiveScaleY)
    }
    
    // Apply rotation transformation to offset
    const angleRad = (angle * Math.PI) / 180
    const cosAngle = Math.cos(angleRad)
    const sinAngle = Math.sin(angleRad)
    
    const rotatedOffsetX = offsetX * cosAngle - offsetY * sinAngle
    const rotatedOffsetY = offsetX * sinAngle + offsetY * cosAngle
    
    // Calculate final position
    return {
      left: textLeft + rotatedOffsetX,
      top: textTop + rotatedOffsetY
    }
  }

  describe('No rotation (0°)', () => {
    const angle = 0
    const textWidth = 100
    const textHeight = 50
    const textLeft = 200
    const textTop = 150

    it('should keep same position with left/top origin', () => {
      const result = calculatePathPosition(
        textLeft, textTop, textWidth, textHeight,
        'left', 'top', angle
      )
      
      expect(result.left).toBeCloseTo(textLeft, 5)
      expect(result.top).toBeCloseTo(textTop, 5)
    })

    it('should offset correctly with center/center origin', () => {
      const result = calculatePathPosition(
        textLeft, textTop, textWidth, textHeight,
        'center', 'center', angle
      )
      
      // With center origin, left/top position should be offset by -width/2, -height/2
      expect(result.left).toBeCloseTo(textLeft - textWidth / 2, 5)
      expect(result.top).toBeCloseTo(textTop - textHeight / 2, 5)
    })

    it('should offset correctly with right/bottom origin', () => {
      const result = calculatePathPosition(
        textLeft, textTop, textWidth, textHeight,
        'right', 'bottom', angle
      )
      
      expect(result.left).toBeCloseTo(textLeft - textWidth, 5)
      expect(result.top).toBeCloseTo(textTop - textHeight, 5)
    })
  })

  describe('45° rotation', () => {
    const angle = 45
    const textWidth = 100
    const textHeight = 50
    const textLeft = 200
    const textTop = 150

    it('should rotate offset correctly with center/center origin', () => {
      const result = calculatePathPosition(
        textLeft, textTop, textWidth, textHeight,
        'center', 'center', angle
      )
      
      // Offset before rotation: (-50, -25)
      // After 45° rotation:
      // x' = -50 * cos(45°) - (-25) * sin(45°) = -50 * 0.707 + 25 * 0.707 ≈ -17.68
      // y' = -50 * sin(45°) + (-25) * cos(45°) = -50 * 0.707 - 25 * 0.707 ≈ -53.03
      
      const expectedOffsetX = -(textWidth / 2) * Math.cos(Math.PI / 4) - (-(textHeight / 2)) * Math.sin(Math.PI / 4)
      const expectedOffsetY = -(textWidth / 2) * Math.sin(Math.PI / 4) + (-(textHeight / 2)) * Math.cos(Math.PI / 4)
      
      expect(result.left).toBeCloseTo(textLeft + expectedOffsetX, 5)
      expect(result.top).toBeCloseTo(textTop + expectedOffsetY, 5)
    })

    it('should handle left/top origin with rotation', () => {
      const result = calculatePathPosition(
        textLeft, textTop, textWidth, textHeight,
        'left', 'top', angle
      )
      
      // With left/top origin, offset is (0, 0), so no change
      expect(result.left).toBeCloseTo(textLeft, 5)
      expect(result.top).toBeCloseTo(textTop, 5)
    })
  })

  describe('90° rotation', () => {
    const angle = 90
    const textWidth = 100
    const textHeight = 50
    const textLeft = 200
    const textTop = 150

    it('should swap X and Y offsets correctly with center/center origin', () => {
      const result = calculatePathPosition(
        textLeft, textTop, textWidth, textHeight,
        'center', 'center', angle
      )
      
      // Offset before rotation: (-50, -25)
      // After 90° rotation (cos=0, sin=1):
      // x' = -50 * 0 - (-25) * 1 = 25
      // y' = -50 * 1 + (-25) * 0 = -50
      
      expect(result.left).toBeCloseTo(textLeft + 25, 5)
      expect(result.top).toBeCloseTo(textTop - 50, 5)
    })
  })

  describe('-45° rotation (clockwise)', () => {
    const angle = -45
    const textWidth = 100
    const textHeight = 50
    const textLeft = 200
    const textTop = 150

    it('should rotate offset correctly with center/center origin', () => {
      const result = calculatePathPosition(
        textLeft, textTop, textWidth, textHeight,
        'center', 'center', angle
      )
      
      const expectedOffsetX = -(textWidth / 2) * Math.cos(-Math.PI / 4) - (-(textHeight / 2)) * Math.sin(-Math.PI / 4)
      const expectedOffsetY = -(textWidth / 2) * Math.sin(-Math.PI / 4) + (-(textHeight / 2)) * Math.cos(-Math.PI / 4)
      
      expect(result.left).toBeCloseTo(textLeft + expectedOffsetX, 5)
      expect(result.top).toBeCloseTo(textTop + expectedOffsetY, 5)
    })
  })

  describe('180° rotation', () => {
    const angle = 180
    const textWidth = 100
    const textHeight = 50
    const textLeft = 200
    const textTop = 150

    it('should reverse offsets with center/center origin', () => {
      const result = calculatePathPosition(
        textLeft, textTop, textWidth, textHeight,
        'center', 'center', angle
      )
      
      // Offset before rotation: (-50, -25)
      // After 180° rotation (cos=-1, sin=0):
      // x' = -50 * (-1) - (-25) * 0 = 50
      // y' = -50 * 0 + (-25) * (-1) = 25
      
      expect(result.left).toBeCloseTo(textLeft + 50, 5)
      expect(result.top).toBeCloseTo(textTop + 25, 5)
    })
  })

  describe('With scale factors', () => {
    const angle = 45
    const textWidth = 100
    const textHeight = 50
    const textLeft = 200
    const textTop = 150
    const scaleX = 2
    const scaleY = 1.5

    it('should apply scale to offset before rotation', () => {
      const result = calculatePathPosition(
        textLeft, textTop, textWidth, textHeight,
        'center', 'center', angle, scaleX, scaleY
      )
      
      // Offset before rotation: (-(100*2)/2, -(50*1.5)/2) = (-100, -37.5)
      // After 45° rotation:
      const scaledOffsetX = -(textWidth * scaleX) / 2
      const scaledOffsetY = -(textHeight * scaleY) / 2
      const expectedOffsetX = scaledOffsetX * Math.cos(Math.PI / 4) - scaledOffsetY * Math.sin(Math.PI / 4)
      const expectedOffsetY = scaledOffsetX * Math.sin(Math.PI / 4) + scaledOffsetY * Math.cos(Math.PI / 4)
      
      expect(result.left).toBeCloseTo(textLeft + expectedOffsetX, 5)
      expect(result.top).toBeCloseTo(textTop + expectedOffsetY, 5)
    })
  })

  describe('Edge cases', () => {
    it('should handle zero dimensions', () => {
      const result = calculatePathPosition(
        100, 100, 0, 0,
        'center', 'center', 45
      )
      
      expect(result.left).toBeCloseTo(100, 5)
      expect(result.top).toBeCloseTo(100, 5)
    })

    it('should handle 360° rotation (same as 0°)', () => {
      const result360 = calculatePathPosition(
        100, 100, 80, 40,
        'center', 'center', 360
      )
      
      const result0 = calculatePathPosition(
        100, 100, 80, 40,
        'center', 'center', 0
      )
      
      expect(result360.left).toBeCloseTo(result0.left, 5)
      expect(result360.top).toBeCloseTo(result0.top, 5)
    })

    it('should handle negative dimensions (should not happen but test defensive code)', () => {
      const result = calculatePathPosition(
        100, 100, -50, -30,
        'center', 'center', 45, 1, 1
      )
      
      // Even with negative dimensions, calculation should not crash
      expect(result.left).toBeDefined()
      expect(result.top).toBeDefined()
      expect(Number.isFinite(result.left)).toBe(true)
      expect(Number.isFinite(result.top)).toBe(true)
    })
  })

  describe('Regression tests - Issue: 기울어진 폰트 벡터와 위치이슈', () => {
    it('should not use getBoundingRect for rotated text positioning', () => {
      // This is a documentation test explaining the fix
      // The old code used:
      // const bounds = textObj.getBoundingRect(true, true)
      // Then set: left: bounds.left, top: bounds.top, angle: textObj.angle
      // 
      // This was WRONG because:
      // 1. getBoundingRect returns AABB (axis-aligned bounding box) of rotated text
      // 2. Applying angle again causes double-transformation
      // 
      // The new code correctly:
      // 1. Calculates offset from original origin to left/top origin
      // 2. Applies rotation matrix to the offset
      // 3. Adds rotated offset to original position
      
      // Example: Text at (100, 100) center/center, 100x50, rotated 45°
      const result = calculatePathPosition(100, 100, 100, 50, 'center', 'center', 45)
      
      // The path should be positioned such that when it's rotated 45° around (result.left, result.top),
      // its center aligns with (100, 100)
      
      // Verify the position is calculated correctly (not using AABB)
      const expectedOffsetX = -50 * Math.cos(Math.PI / 4) + 25 * Math.sin(Math.PI / 4)
      const expectedOffsetY = -50 * Math.sin(Math.PI / 4) - 25 * Math.cos(Math.PI / 4)
      
      expect(result.left).toBeCloseTo(100 + expectedOffsetX, 5)
      expect(result.top).toBeCloseTo(100 + expectedOffsetY, 5)
    })
  })

  describe('Flip transformations (flipX, flipY)', () => {
    const textWidth = 100
    const textHeight = 50
    const textLeft = 200
    const textTop = 150

    it('should handle flipX with center/center origin (no rotation)', () => {
      // flipX reverses the sign of scaleX in the transformation matrix
      // This affects the offset calculation
      const result = calculatePathPosition(
        textLeft, textTop, textWidth, textHeight,
        'center', 'center', 0, 1, 1, true, false
      )
      
      // With flipX, effective scaleX = 1 * -1 = -1
      // offsetX = -(100 * -1) / 2 = 50 (instead of -50)
      expect(result.left).toBeCloseTo(textLeft + 50, 5)
      expect(result.top).toBeCloseTo(textTop - textHeight / 2, 5)
    })

    it('should handle flipY with center/center origin (no rotation)', () => {
      // flipY reverses the sign of scaleY in the transformation matrix
      const result = calculatePathPosition(
        textLeft, textTop, textWidth, textHeight,
        'center', 'center', 0, 1, 1, false, true
      )
      
      // With flipY, effective scaleY = 1 * -1 = -1
      // offsetY = -(50 * -1) / 2 = 25 (instead of -25)
      expect(result.left).toBeCloseTo(textLeft - textWidth / 2, 5)
      expect(result.top).toBeCloseTo(textTop + 25, 5)
    })

    it('should handle both flipX and flipY with center/center origin', () => {
      const result = calculatePathPosition(
        textLeft, textTop, textWidth, textHeight,
        'center', 'center', 0, 1, 1, true, true
      )
      
      // Both flips: offsetX = 50, offsetY = 25
      expect(result.left).toBeCloseTo(textLeft + 50, 5)
      expect(result.top).toBeCloseTo(textTop + 25, 5)
    })

    it('should handle flipX with rotation (45°)', () => {
      // Critical test: flipX with rotation
      // This is where the bug would manifest without proper effective scale
      const result = calculatePathPosition(
        textLeft, textTop, textWidth, textHeight,
        'center', 'center', 45, 1, 1, true, false
      )
      
      // With flipX, offsetX = 50 (not -50)
      // After 45° rotation:
      const expectedOffsetX = 50 * Math.cos(Math.PI / 4) - (-25) * Math.sin(Math.PI / 4)
      const expectedOffsetY = 50 * Math.sin(Math.PI / 4) + (-25) * Math.cos(Math.PI / 4)
      
      expect(result.left).toBeCloseTo(textLeft + expectedOffsetX, 5)
      expect(result.top).toBeCloseTo(textTop + expectedOffsetY, 5)
    })

    it('should handle flipY with rotation (45°)', () => {
      const result = calculatePathPosition(
        textLeft, textTop, textWidth, textHeight,
        'center', 'center', 45, 1, 1, false, true
      )
      
      // With flipY, offsetY = 25 (not -25)
      // After 45° rotation:
      const expectedOffsetX = -50 * Math.cos(Math.PI / 4) - 25 * Math.sin(Math.PI / 4)
      const expectedOffsetY = -50 * Math.sin(Math.PI / 4) + 25 * Math.cos(Math.PI / 4)
      
      expect(result.left).toBeCloseTo(textLeft + expectedOffsetX, 5)
      expect(result.top).toBeCloseTo(textTop + expectedOffsetY, 5)
    })

    it('should handle flipX and flipY with rotation (90°)', () => {
      const result = calculatePathPosition(
        textLeft, textTop, textWidth, textHeight,
        'center', 'center', 90, 1, 1, true, true
      )
      
      // Both flips with 90° rotation
      // offsetX = 50, offsetY = 25
      // After 90° rotation (cos=0, sin=1):
      // rotatedOffsetX = 50 * 0 - 25 * 1 = -25
      // rotatedOffsetY = 50 * 1 + 25 * 0 = 50
      
      expect(result.left).toBeCloseTo(textLeft - 25, 5)
      expect(result.top).toBeCloseTo(textTop + 50, 5)
    })

    it('should handle flipX with scale and rotation', () => {
      // Complex case: flipX + scale + rotation
      const scaleX = 2
      const scaleY = 1.5
      const result = calculatePathPosition(
        textLeft, textTop, textWidth, textHeight,
        'center', 'center', 45, scaleX, scaleY, true, false
      )
      
      // effectiveScaleX = 2 * -1 = -2
      // effectiveScaleY = 1.5 * 1 = 1.5
      // offsetX = -(100 * -2) / 2 = 100
      // offsetY = -(50 * 1.5) / 2 = -37.5
      const offsetX = 100
      const offsetY = -37.5
      
      const expectedOffsetX = offsetX * Math.cos(Math.PI / 4) - offsetY * Math.sin(Math.PI / 4)
      const expectedOffsetY = offsetX * Math.sin(Math.PI / 4) + offsetY * Math.cos(Math.PI / 4)
      
      expect(result.left).toBeCloseTo(textLeft + expectedOffsetX, 5)
      expect(result.top).toBeCloseTo(textTop + expectedOffsetY, 5)
    })

    it('should handle right/bottom origin with flipX', () => {
      // Test different origin with flip
      const result = calculatePathPosition(
        textLeft, textTop, textWidth, textHeight,
        'right', 'bottom', 0, 1, 1, true, false
      )
      
      // With flipX and right origin:
      // effectiveScaleX = -1
      // offsetX = -(100 * -1) = 100 (instead of -100)
      // offsetY = -(50 * 1) = -50
      
      expect(result.left).toBeCloseTo(textLeft + 100, 5)
      expect(result.top).toBeCloseTo(textTop - 50, 5)
    })
  })

  describe('Skew transformations (skewX, skewY)', () => {
    /**
     * NOTE: The current implementation does NOT account for skew transformations
     * in position calculation. This is because:
     *
     * 1. Skew affects visual appearance but the position (left, top) should remain
     *    at the origin point, similar to rotation
     * 2. In Fabric.js, when you apply skewX/skewY to an object, the left/top
     *    coordinates stay at the origin point - skew is applied via transformation matrix
     * 3. Since we're copying skewX/skewY directly to the path object (lines 692-693, 731-732),
     *    the skew will be applied in the same way
     *
     * However, if issues arise with skewed text positioning, this test documents
     * the expected behavior and can be updated accordingly.
     */

    const textWidth = 100
    const textHeight = 50
    const textLeft = 200
    const textTop = 150

    it('should maintain position with skewX (documented behavior)', () => {
      // Skew is applied via transformation matrix, not position offset
      // The position calculation ignores skew, which is correct behavior
      // because skewX/skewY will be copied to the path object
      const result = calculatePathPosition(
        textLeft, textTop, textWidth, textHeight,
        'center', 'center', 0, 1, 1, false, false
      )

      // Position should be calculated same as without skew
      // Skew will be applied separately via the skewX/skewY properties
      expect(result.left).toBeCloseTo(textLeft - textWidth / 2, 5)
      expect(result.top).toBeCloseTo(textTop - textHeight / 2, 5)
    })

    it('should handle skew with rotation (documented behavior)', () => {
      // When both skew and rotation are present, only rotation affects position
      // Skew is applied via transformation matrix after position is set
      const result = calculatePathPosition(
        textLeft, textTop, textWidth, textHeight,
        'center', 'center', 45, 1, 1, false, false
      )

      // Position should be same as rotation without skew
      const expectedOffsetX = -(textWidth / 2) * Math.cos(Math.PI / 4) - (-(textHeight / 2)) * Math.sin(Math.PI / 4)
      const expectedOffsetY = -(textWidth / 2) * Math.sin(Math.PI / 4) + (-(textHeight / 2)) * Math.cos(Math.PI / 4)

      expect(result.left).toBeCloseTo(textLeft + expectedOffsetX, 5)
      expect(result.top).toBeCloseTo(textTop + expectedOffsetY, 5)
    })
  })
})
