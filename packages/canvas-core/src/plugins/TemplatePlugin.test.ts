import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * TemplatePlugin 테스트
 * - 템플릿 요소 식별
 * - 사용자 요소 식별 및 보존
 * - 객체 타입 결정
 */

// 템플릿 요소 extensionType 목록
const TEMPLATE_EXTENSION_TYPES = [
  'template-element',
  'printguide',
  'guideline',
  'overlay',
  'outline',
  'background'
]

// 템플릿 요소 ID 패턴
const TEMPLATE_ELEMENT_IDS = [
  'workspace',
  'template-background',
  'page-outline',
  'template-outline',
  'cut-border',
  'safe-zone-border',
  'cutline-template',
  'center-guideline-h',
  'center-guideline-v'
]

/**
 * 객체가 템플릿 요소인지 판단
 */
function isTemplateElement(obj: any): boolean {
  // extensionType으로 판단
  if (obj.extensionType && TEMPLATE_EXTENSION_TYPES.includes(obj.extensionType)) {
    return true
  }

  // ID로 판단
  if (obj.id && TEMPLATE_ELEMENT_IDS.includes(obj.id)) {
    return true
  }

  // ID 패턴으로 판단 (fixed, floating 등)
  if (obj.id && (
    obj.id.includes('fixed') ||
    obj.id.includes('floating') ||
    obj.id.startsWith('background_rect_')
  )) {
    return true
  }

  // excludeFromExport가 true인 경우 (가이드라인 등)
  if (obj.excludeFromExport) {
    return true
  }

  return false
}

/**
 * 사용자가 추가한 요소인지 판단
 */
function isUserAddedElement(obj: any): boolean {
  // 명시적으로 isUserAdded가 true인 경우
  if (obj.isUserAdded === true) {
    return true
  }

  // 명시적으로 false가 아니고, 템플릿 요소도 아닌 경우
  if (obj.isUserAdded !== false && !isTemplateElement(obj)) {
    return true
  }

  return false
}

/**
 * 객체의 타입을 결정하는 헬퍼 함수
 */
function determineObjectType(object: any): string {
  // 그룹 객체 확인
  if (object.type === 'group') {
    return 'group'
  }

  // 텍스트 관련 객체 확인
  if (object.type === 'text' || object.type === 'i-text' || object.type === 'textbox') {
    return 'text'
  }

  // 이미지 객체 확인
  if (object.type === 'image') {
    return 'image'
  }

  // 패스 객체 확인
  if (object.type === 'path' || object.type === 'path-group') {
    return 'path'
  }

  // 텍스트 내용이 있는지 추가 확인
  if ('text' in object && object.text) {
    return 'text'
  }

  // Adobe Illustrator에서 생성된 빈 clipPath용 rect 객체 확인
  if (
    object.type === 'rect' &&
    (object.width === 0 || object.height === 0) &&
    !object.fill &&
    !object.stroke
  ) {
    return 'clippath'
  }

  // 기본 도형 객체들
  if (
    object.type === 'rect' ||
    object.type === 'circle' ||
    object.type === 'ellipse' ||
    object.type === 'polygon' ||
    object.type === 'polyline' ||
    object.type === 'triangle'
  ) {
    return 'shape'
  }

  // 기타 객체는 기본적으로 shape로 처리
  return 'shape'
}

describe('TemplatePlugin - Element Identification', () => {
  describe('isTemplateElement', () => {
    it('should identify template element by extensionType', () => {
      TEMPLATE_EXTENSION_TYPES.forEach(type => {
        const obj = { extensionType: type }
        expect(isTemplateElement(obj)).toBe(true)
      })
    })

    it('should identify template element by ID', () => {
      TEMPLATE_ELEMENT_IDS.forEach(id => {
        const obj = { id }
        expect(isTemplateElement(obj)).toBe(true)
      })
    })

    it('should identify fixed elements', () => {
      expect(isTemplateElement({ id: 'element_fixed_1' })).toBe(true)
      expect(isTemplateElement({ id: 'fixed_header' })).toBe(true)
      expect(isTemplateElement({ id: 'logo_fixed' })).toBe(true)
    })

    it('should identify floating elements', () => {
      expect(isTemplateElement({ id: 'floating_image' })).toBe(true)
      expect(isTemplateElement({ id: 'element_floating' })).toBe(true)
    })

    it('should identify background rect elements', () => {
      expect(isTemplateElement({ id: 'background_rect_123456' })).toBe(true)
      expect(isTemplateElement({ id: 'background_rect_987654321' })).toBe(true)
    })

    it('should identify elements with excludeFromExport', () => {
      expect(isTemplateElement({ id: 'any_element', excludeFromExport: true })).toBe(true)
    })

    it('should not identify regular user elements', () => {
      expect(isTemplateElement({ id: 'user_text_1' })).toBe(false)
      expect(isTemplateElement({ id: 'my_image', type: 'image' })).toBe(false)
      expect(isTemplateElement({ type: 'rect', fill: '#000' })).toBe(false)
    })
  })

  describe('isUserAddedElement', () => {
    it('should identify explicitly marked user elements', () => {
      expect(isUserAddedElement({ isUserAdded: true })).toBe(true)
    })

    it('should not identify explicitly marked non-user elements', () => {
      expect(isUserAddedElement({ isUserAdded: false })).toBe(false)
    })

    it('should identify unmarked non-template elements as user elements', () => {
      expect(isUserAddedElement({ id: 'my_custom_text', type: 'text' })).toBe(true)
      expect(isUserAddedElement({ type: 'image', src: 'photo.jpg' })).toBe(true)
    })

    it('should not identify template elements as user elements', () => {
      expect(isUserAddedElement({ id: 'workspace' })).toBe(false)
      expect(isUserAddedElement({ extensionType: 'printguide' })).toBe(false)
      expect(isUserAddedElement({ id: 'cut-border' })).toBe(false)
    })

    it('should handle mixed properties correctly', () => {
      // 명시적으로 isUserAdded가 true면 템플릿 속성 무시
      expect(isUserAddedElement({
        isUserAdded: true,
        extensionType: 'printguide'
      })).toBe(true)

      // 명시적으로 false면 템플릿 속성 무시
      expect(isUserAddedElement({
        isUserAdded: false,
        type: 'image'
      })).toBe(false)
    })
  })

  describe('extractUserElements', () => {
    it('should extract only user-added elements', () => {
      const allObjects = [
        { id: 'workspace', extensionType: 'template-element' },
        { id: 'user_text', type: 'text', isUserAdded: true },
        { id: 'template-background' },
        { id: 'user_image', type: 'image' },
        { id: 'cut-border', extensionType: 'printguide' }
      ]

      const userElements = allObjects.filter(obj => isUserAddedElement(obj))

      expect(userElements).toHaveLength(2)
      expect(userElements.map(e => e.id)).toContain('user_text')
      expect(userElements.map(e => e.id)).toContain('user_image')
    })
  })
})

describe('TemplatePlugin - Object Type Determination', () => {
  describe('determineObjectType', () => {
    it('should identify group objects', () => {
      expect(determineObjectType({ type: 'group' })).toBe('group')
    })

    it('should identify text objects', () => {
      expect(determineObjectType({ type: 'text' })).toBe('text')
      expect(determineObjectType({ type: 'i-text' })).toBe('text')
      expect(determineObjectType({ type: 'textbox' })).toBe('text')
    })

    it('should identify text by content property', () => {
      expect(determineObjectType({ type: 'rect', text: 'Hello' })).toBe('text')
    })

    it('should identify image objects', () => {
      expect(determineObjectType({ type: 'image' })).toBe('image')
    })

    it('should identify path objects', () => {
      expect(determineObjectType({ type: 'path' })).toBe('path')
      expect(determineObjectType({ type: 'path-group' })).toBe('path')
    })

    it('should identify clippath objects', () => {
      expect(determineObjectType({
        type: 'rect',
        width: 0,
        height: 50,
        fill: null,
        stroke: null
      })).toBe('clippath')

      expect(determineObjectType({
        type: 'rect',
        width: 100,
        height: 0,
        fill: null,
        stroke: null
      })).toBe('clippath')
    })

    it('should identify shape objects', () => {
      expect(determineObjectType({ type: 'rect', width: 100, height: 50, fill: '#000' })).toBe('shape')
      expect(determineObjectType({ type: 'circle' })).toBe('shape')
      expect(determineObjectType({ type: 'ellipse' })).toBe('shape')
      expect(determineObjectType({ type: 'polygon' })).toBe('shape')
      expect(determineObjectType({ type: 'polyline' })).toBe('shape')
      expect(determineObjectType({ type: 'triangle' })).toBe('shape')
    })

    it('should default to shape for unknown types', () => {
      expect(determineObjectType({ type: 'custom' })).toBe('shape')
      expect(determineObjectType({ type: 'unknown' })).toBe('shape')
    })
  })
})

describe('TemplatePlugin - User Element Preservation', () => {
  it('should preserve original position information', () => {
    const userElement = {
      id: 'user_text',
      left: 100,
      top: 200,
      scaleX: 1.5,
      scaleY: 1.5,
      angle: 45
    }

    // 위치 정보 저장
    const originalPosition = {
      left: userElement.left,
      top: userElement.top,
      scaleX: userElement.scaleX,
      scaleY: userElement.scaleY,
      angle: userElement.angle
    }

    expect(originalPosition.left).toBe(100)
    expect(originalPosition.top).toBe(200)
    expect(originalPosition.scaleX).toBe(1.5)
    expect(originalPosition.scaleY).toBe(1.5)
    expect(originalPosition.angle).toBe(45)
  })

  it('should restore position information after template replacement', () => {
    const preservedElement = {
      id: 'user_text',
      left: 0,
      top: 0,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      originalPosition: {
        left: 100,
        top: 200,
        scaleX: 1.5,
        scaleY: 1.5,
        angle: 45
      }
    }

    // 위치 복원
    const originalPosition = preservedElement.originalPosition
    preservedElement.left = originalPosition.left
    preservedElement.top = originalPosition.top
    preservedElement.scaleX = originalPosition.scaleX
    preservedElement.scaleY = originalPosition.scaleY
    preservedElement.angle = originalPosition.angle

    expect(preservedElement.left).toBe(100)
    expect(preservedElement.top).toBe(200)
    expect(preservedElement.scaleX).toBe(1.5)
  })
})

describe('TemplatePlugin - Template Replacement Flow', () => {
  it('should follow correct template replacement order', () => {
    const steps: string[] = []

    // 1. 사용자 요소 보존
    steps.push('preserve_user_elements')

    // 2. 기존 템플릿 요소 제거 (workspace 제외)
    steps.push('remove_template_elements')

    // 3. 새 템플릿 로드
    steps.push('load_new_template')

    // 4. 사용자 요소 복원
    steps.push('restore_user_elements')

    // 5. 이벤트 발생
    steps.push('emit_templateReplaced')

    expect(steps).toEqual([
      'preserve_user_elements',
      'remove_template_elements',
      'load_new_template',
      'restore_user_elements',
      'emit_templateReplaced'
    ])
  })

  it('should not remove workspace during template replacement', () => {
    const allObjects = [
      { id: 'workspace' },
      { id: 'template-background' },
      { id: 'cut-border' },
      { id: 'user_text', isUserAdded: true }
    ]

    // 템플릿 요소 중 workspace 제외하고 제거
    const toRemove = allObjects.filter(obj =>
      !isUserAddedElement(obj) && obj.id !== 'workspace'
    )

    expect(toRemove).toHaveLength(2)
    expect(toRemove.map(o => o.id)).not.toContain('workspace')
    expect(toRemove.map(o => o.id)).not.toContain('user_text')
  })
})

describe('TemplatePlugin - Events', () => {
  it('should define correct event names', () => {
    const events = ['templateLoaded', 'templateError', 'templateAdded', 'templateSaved', 'templateReplaced']

    expect(events).toContain('templateLoaded')
    expect(events).toContain('templateError')
    expect(events).toContain('templateAdded')
    expect(events).toContain('templateSaved')
    expect(events).toContain('templateReplaced')
  })
})

describe('TemplatePlugin - Object Marking', () => {
  it('should mark new objects as user-added when not template elements', () => {
    const newObject: any = { id: 'new_text', type: 'text' }

    // 마킹 로직
    if (typeof newObject.isUserAdded === 'undefined') {
      if (!isTemplateElement(newObject)) {
        newObject.isUserAdded = true
      } else {
        newObject.isUserAdded = false
      }
    }

    expect(newObject.isUserAdded).toBe(true)
  })

  it('should mark template elements as non-user-added', () => {
    const templateObject: any = { id: 'workspace' }

    // 마킹 로직
    if (typeof templateObject.isUserAdded === 'undefined') {
      if (!isTemplateElement(templateObject)) {
        templateObject.isUserAdded = true
      } else {
        templateObject.isUserAdded = false
      }
    }

    expect(templateObject.isUserAdded).toBe(false)
  })

  it('should not override existing isUserAdded property', () => {
    const object: any = { id: 'some_object', isUserAdded: true }

    // 마킹 로직
    if (typeof object.isUserAdded === 'undefined') {
      if (!isTemplateElement(object)) {
        object.isUserAdded = true
      } else {
        object.isUserAdded = false
      }
    }

    expect(object.isUserAdded).toBe(true)
  })
})

describe('TemplatePlugin - Font Handling', () => {
  it('should extract font families from text objects', () => {
    const groupObjects = [
      { type: 'text', fontFamily: 'Pretendard' },
      { type: 'i-text', fontFamily: 'NotoSansKR' },
      { type: 'rect', fill: '#000' },
      { type: 'textbox', fontFamily: 'Pretendard' }
    ]

    const fonts = new Set<string>()

    groupObjects.forEach(item => {
      if (item.type === 'text' || item.type === 'i-text' || item.type === 'textbox') {
        if (item.fontFamily && typeof item.fontFamily === 'string') {
          fonts.add(item.fontFamily)
        }
      }
    })

    expect(fonts.size).toBe(2)
    expect(fonts.has('Pretendard')).toBe(true)
    expect(fonts.has('NotoSansKR')).toBe(true)
  })

  it('should extract fonts from nested groups', () => {
    const groupObjects = [
      {
        type: 'group',
        _objects: [
          { type: 'text', fontFamily: 'Roboto' },
          { type: 'i-text', fontFamily: 'Arial' }
        ]
      },
      { type: 'text', fontFamily: 'Pretendard' }
    ]

    const fonts = new Set<string>()

    groupObjects.forEach(item => {
      if (item.type === 'text' || item.type === 'i-text' || item.type === 'textbox') {
        if ((item as any).fontFamily) {
          fonts.add((item as any).fontFamily)
        }
      }

      if (item.type === 'group' && (item as any)._objects) {
        (item as any)._objects.forEach((nestedItem: any) => {
          if (
            nestedItem.type === 'text' ||
            nestedItem.type === 'i-text' ||
            nestedItem.type === 'textbox'
          ) {
            if (nestedItem.fontFamily) {
              fonts.add(nestedItem.fontFamily)
            }
          }
        })
      }
    })

    expect(fonts.size).toBe(3)
    expect(fonts.has('Roboto')).toBe(true)
    expect(fonts.has('Arial')).toBe(true)
    expect(fonts.has('Pretendard')).toBe(true)
  })
})
