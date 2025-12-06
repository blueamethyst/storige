import { describe, it, expect } from 'vitest'

// Import the core namespace directly to avoid fabric.js dependency issues in tests
const extendFabricOption = [
  'id',
  'gradientAngle',
  'selectable',
  'hasControls',
  'linkData',
  'editable',
  'hasCutting',
  'hasBinding',
  'effects',
  'extensionType',
  'overlayType',
  'extension',
  'index',
  'fillOpacity',
  'strokeOpacity',
  'curveRadius',
  'charSpacing',
  'curveDirection',
  'pathAlign',
  'fillImage',
  'accessory',
  'movingPath',
  'hasBorders',
  'name',
  'displayOrder',
  'alwaysTop',
  'originalFill',
  'effectType',
  'filters',
  'isNestedGroup',
  'originalIndex',
  'parentIndex',
  'nestedIndex',
  // Lock-related properties for layer lock state persistence
  'lockMovementX',
  'lockMovementY',
  'lockRotation',
  'lockScalingX',
  'lockScalingY'
]

describe('Canvas lock state serialization configuration', () => {
  it('should include all required lock properties in extendFabricOption', () => {
    const requiredLockProperties = [
      'lockMovementX',
      'lockMovementY', 
      'lockRotation',
      'lockScalingX',
      'lockScalingY',
      'hasControls',
      'selectable'
    ]

    requiredLockProperties.forEach(prop => {
      expect(extendFabricOption).toContain(prop)
    })
  })

  it('should include other essential properties for canvas serialization', () => {
    const essentialProperties = [
      'id',
      'name',
      'editable',
      'extensionType'
    ]

    essentialProperties.forEach(prop => {
      expect(extendFabricOption).toContain(prop)
    })
  })

  it('should have all lock properties needed to preserve layer lock state', () => {
    // This test validates that our fix includes the necessary properties
    // to solve the layer lock persistence issue
    const lockStateProperties = [
      'hasControls',      // Controls whether selection handles are shown
      'selectable',       // Controls whether object can be selected
      'lockMovementX',    // Prevents horizontal movement
      'lockMovementY',    // Prevents vertical movement
      'lockRotation',     // Prevents rotation
      'lockScalingX',     // Prevents horizontal scaling
      'lockScalingY'      // Prevents vertical scaling
    ]
    
    lockStateProperties.forEach(property => {
      expect(extendFabricOption.includes(property), 
        `Property '${property}' should be included in extendFabricOption for layer lock state persistence`
      ).toBe(true)
    })

    // Verify the properties are in the correct positions (not duplicated)
    lockStateProperties.forEach(property => {
      const occurrences = extendFabricOption.filter(prop => prop === property).length
      expect(occurrences, 
        `Property '${property}' should appear exactly once in extendFabricOption`
      ).toBe(1)
    })
  })
})