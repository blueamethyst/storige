import { v4 as uuid } from 'uuid'

/**
 * Adobe Illustrator SVG 파싱 및 FabricJS 객체 생성
 */
import { fabric } from 'fabric'
import * as d3 from 'd3'

interface ParsedSVGGroup {
  id: string
  element: Element
  fabricObjects: fabric.Object[]
}

/**
 * Adobe Illustrator SVG 문자열을 파싱하여 페이지별 FabricJS 객체 생성
 */
const loadPagesFromSvgString = async (svgText: string, minGroupDepth: number = 2) => {
  try {
    // DOMParser로 SVG 파싱
    const parser = new DOMParser()
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml')
    const svgElement = svgDoc.querySelector('svg')

    if (!svgElement) {
      throw new Error('유효한 SVG 요소를 찾을 수 없습니다')
    }

    // 새로운 단순화된 페이지 구조 분석
    const pages = extractPagesFromSvg(svgElement)

    if (pages.length === 0) {
      console.warn('처리할 페이지를 찾을 수 없습니다')
      return []
    }

    // 각 페이지를 FabricJS 객체로 변환
    const fabricGroups = []
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]
      let fabricObjects = await convertPageToFabric(page.element, svgElement, minGroupDepth)

      if (fabricObjects && fabricObjects.length === 1 && fabricObjects[0].type === 'group' && !fabricObjects[0].id.startsWith('element-')) {
        // 페이지 내부의 요소가 하나의 그룹만 있으면 ungroup하여 내부 요소들을 전달
        console.log('ungroupSingleGroupPage', fabricObjects[0].id)
        fabricObjects = ungroupSingleGroupPage(fabricObjects)
        // 오브제가 100개 넘어가면 맨 처음 오브제 제외하고 그룹으로 묶어서 전달
      } else if (fabricObjects && fabricObjects.length > 1000) {
        const group = new fabric.Group(fabricObjects.slice(1))
        fabricObjects = [fabricObjects[0], group]
      }

      console.log('fabricObjects: page', page.id, fabricObjects.length)

      fabricGroups.push({
        id: page.id,
        objects: fabricObjects
      })
    }

    return fabricGroups
  } catch (error) {
    console.error('Adobe Illustrator SVG 파싱 중 오류:', error)
    throw error
  }
}

/**
 * 사용자 규칙에 따른 페이지 추출
 * 1. switch가 있는 구조: g->g->g->defs = 다중페이지, g->g->defs = 단일페이지
 * 2. switch가 없는 구조: 루트의 g를 페이지로 처리
 */
function extractPagesFromSvg(svgElement: Element): ParsedSVGGroup[] {
  // 1. switch 요소 확인
  const switchElement = svgElement.querySelector('switch')

  if (switchElement) {
    return extractPagesFromSwitchStructure(switchElement)
  } else {
    return extractPagesFromDirectStructure(svgElement)
  }
}

/**
 * switch 구조에서 페이지 추출
 */
function extractPagesFromSwitchStructure(switchElement: Element): ParsedSVGGroup[] {
  // switch 내의 i:extraneous="self" 그룹 찾기
  let extraneousGroup = switchElement.querySelector('g[i\\:extraneous="self"]')

  if (!extraneousGroup) {
    extraneousGroup = switchElement.querySelector('g[*|extraneous="self"]')
  }

  if (!extraneousGroup) {
    const allGroups = switchElement.querySelectorAll('g')
    for (const group of allGroups) {
      if (group.hasAttribute('i:extraneous') && group.getAttribute('i:extraneous') === 'self') {
        extraneousGroup = group
        break
      }
    }
  }

  if (!extraneousGroup) {
    console.warn('switch 내 extraneous 그룹을 찾을 수 없음')
    return []
  }

  // 페이지 구조 분석: g -> g -> g -> defs vs g -> g -> defs
  const pageStructure = analyzePageStructure(extraneousGroup)

  if (pageStructure === 'multiple') {
    // 다중 페이지: extraneous 그룹의 직계 자식들을 페이지로 처리
    const childGroups = Array.from(extraneousGroup.children).filter(
      (child) => child.tagName.toLowerCase() === 'g'
    )

    return childGroups.map((group, index) => ({
      id: group.getAttribute('id') || `page_${index}`,
      element: group,
      fabricObjects: []
    }))
  } else {
    // 단일 페이지: extraneous 그룹 자체를 페이지로 처리
    return [
      {
        id: extraneousGroup.getAttribute('id') || 'single_page',
        element: extraneousGroup,
        fabricObjects: []
      }
    ]
  }
}

/**
 * switch 없는 구조에서 페이지 추출 - 구조 분석을 통한 단일/다중 페이지 판단
 */
function extractPagesFromDirectStructure(svgElement: Element): ParsedSVGGroup[] {
  const directGroups = Array.from(svgElement.querySelectorAll(':scope > g'))

  if (directGroups.length === 0) {
    // 그룹이 없으면 전체 SVG를 단일 페이지로 처리
    return [
      {
        id: svgElement.getAttribute('id') || 'svg_root',
        element: svgElement,
        fabricObjects: []
      }
    ]
  }

  // 구조 분석을 통한 단일/다중 페이지 판단
  const pageStructure = analyzeDirectStructureForPages(directGroups)

  if (pageStructure === 'single') {
    // 단일 페이지: 전체 SVG를 하나의 페이지로 처리
    return [
      {
        id: svgElement.getAttribute('id') || 'single_direct_page',
        element: svgElement,
        fabricObjects: []
      }
    ]
  } else {
    // 다중 페이지: 각 직접 그룹을 페이지로 처리
    return directGroups.map((group, index) => ({
      id: group.getAttribute('id') || `direct_group_${index}`,
      element: group,
      fabricObjects: []
    }))
  }
}

/**
 * 직접 구조에서 단일/다중 페이지 판단 함수
 * 새로운 기준: 그룹 수가 2개 이상이고 루트 그룹들에 clipPath가 없으면 다중페이지
 */
function analyzeDirectStructureForPages(directGroups: Element[]): 'single' | 'multiple' {
  // 1. 그룹이 1개 이하인 경우 단일 페이지
  if (directGroups.length <= 1) {
    return 'single'
  }

  // 2. 루트 그룹들의 clipPath 사용 여부 분석
  let groupsWithClipPath = 0

  directGroups.forEach((group) => {
    const hasClipPathAttr = hasClipPath(group)
    if (hasClipPathAttr) {
      groupsWithClipPath++
    }
  })

  // 3. 새로운 판단 기준 적용
  // 그룹이 2개 이상이고 루트 그룹들에 clipPath가 없으면 다중페이지
  if (directGroups.length >= 2 && groupsWithClipPath === 0) {
    return 'multiple'
  }

  // 4. 그 외의 경우는 단일 페이지로 판단
  return 'single'
}

/**
 * 페이지 구조 분석: g -> g -> g -> defs vs g -> g -> defs
 */
function analyzePageStructure(extraneousGroup: Element): 'single' | 'multiple' {
  // extraneous 그룹의 직계 자식들 확인
  const directChildren = Array.from(extraneousGroup.children)

  // 1. 직계 자식들이 모두 그룹(g)인지 확인
  const allChildrenAreGroups = directChildren.every((child) => child.tagName.toLowerCase() === 'g')

  if (!allChildrenAreGroups) {
    return 'single'
  }

  // 2. 모든 직계 자식이 그룹인 경우에만 defs까지의 경로 분석
  let maxGroupCount = 0
  let foundDefs = false

  for (const child of directChildren) {
    const defsInChild = child.querySelector('defs')
    if (defsInChild) {
      foundDefs = true

      // extraneousGroup부터 defs까지의 그룹 개수 계산
      let current = defsInChild.parentElement
      let groupCount = 0

      // defs부터 extraneousGroup까지 역순으로 올라가면서 그룹 개수 계산
      while (current && current !== extraneousGroup) {
        if (current.tagName.toLowerCase() === 'g') {
          groupCount++
        }
        current = current.parentElement
      }

      // extraneousGroup도 포함
      groupCount++
      maxGroupCount = Math.max(maxGroupCount, groupCount)
    }
  }

  if (!foundDefs) {
    return 'single'
  }

  // g -> g -> defs = 1개 그룹 = 단일 페이지
  // g -> g -> g -> defs = 2개 그룹 = 다중 페이지
  const result = maxGroupCount >= 3 ? 'multiple' : 'single'

  return result
}

/**
 * 페이지를 FabricJS 객체로 변환
 * 배경 오브제: clipPath를 사용하는 첫 번째 그룹
 */
async function convertPageToFabric(
  pageElement: Element,
  originalSvg: Element,
  minGroupDepth: number = 1
): Promise<fabric.Object[]> {
  try {
    // 페이지 그룹이 하나의 그룹으로 묶여있는 경우 그 그룹을 페이지로 처리
    if (
      pageElement.tagName.toLowerCase() === 'g' &&
      pageElement.children.length === 1 &&
      pageElement.children[0].tagName.toLowerCase() === 'g'
    ) {
      pageElement = pageElement.children[0]
    }

    const allObjects: fabric.Object[] = []

    // 페이지의 모든 직계 자식 요소 가져오기
    const allChildElements = Array.from(pageElement.children)

    // 메타데이터 요소와 렌더링 요소가 섞여있는지 확인
    const hasMetadataElements = allChildElements.some((child) => {
      const tagName = child.tagName.toLowerCase()
      return ['style', 'metadata', 'defs', 'title', 'desc'].includes(tagName)
    })

    const hasRenderingElements = allChildElements.some((child) => {
      const tagName = child.tagName.toLowerCase()
      return !['style', 'metadata', 'defs', 'title', 'desc'].includes(tagName)
    })

    // 메타데이터와 렌더링 요소가 섞여있는 경우 루트 SVG 자체를 하나의 요소로 처리
    if (hasMetadataElements && hasRenderingElements) {
      console.log('hasMetadataElements && hasRenderingElements')
      const elementId = pageElement.getAttribute('id') || 'svg_root'

      const childObjects = await convertElementToFabricObjects(
        pageElement,
        originalSvg,
        elementId,
        false, // isBackground
        minGroupDepth
      )

      return childObjects
    }

    console.log('render only')

    // 렌더링 요소만 있는 경우 기존 로직 사용
    const childElements = allChildElements.filter((child) => {
      const tagName = child.tagName.toLowerCase()
      return !['style', 'metadata', 'defs', 'title', 'desc'].includes(tagName)
    })

    // clipPath를 사용하는 첫 번째 그룹을 찾아서 배경으로 처리
    const backgroundElementIndex = findBackgroundElementIndex(childElements)

    for (let i = 0; i < childElements.length; i++) {
      const childElement = childElements[i]

      const elementId = childElement.getAttribute('id') || `page_element_${i}`
      const isBackground = i === backgroundElementIndex // clipPath를 사용하는 첫 번째 그룹이 배경

      const childObjects = await convertElementToFabricObjects(
        childElement,
        originalSvg,
        elementId,
        isBackground,
        minGroupDepth
      )

      if (childObjects.length > 0) {
        allObjects.push(...childObjects)
      }
    }

    return allObjects
  } catch (error) {
    console.error('페이지 변환 중 오류:', error)
    return []
  }
}

/**
 * clipPath를 사용하는 첫 번째 그룹을 배경으로 찾는 함수
 */
function findBackgroundElementIndex(childElements: Element[]): number {
  for (let i = 0; i < childElements.length; i++) {
    const element = childElements[i]

    // 그룹 요소인지 확인
    if (element.tagName.toLowerCase() !== 'g') {
      continue
    }

    // clipPath를 사용하는지 확인
    if (hasClipPath(element)) {
      return i
    }

    // 하위 그룹에서도 clipPath 사용 여부 확인
    const nestedGroups = element.querySelectorAll('g')
    for (const nestedGroup of nestedGroups) {
      if (hasClipPath(nestedGroup)) {
        return i
      }
    }
  }

  // clipPath를 사용하는 그룹을 찾지 못한 경우 첫 번째 요소를 배경으로 처리
  return 0
}

/**
 * 페이지 내부의 요소가 하나의 그룹만 있으면 ungroup하여 내부 요소들을 반환
 */
function ungroupSingleGroupPage(fabricObjects: fabric.Object[]): fabric.Object[] {
  // 객체가 정확히 1개이고 그것이 Group 타입인 경우에만 ungroup
  if (fabricObjects.length === 1 && fabricObjects[0].type === 'group') {
    const group = fabricObjects[0] as fabric.Group

    // Group 객체의 내부 객체들 추출
    const groupObjects = group._objects || group.getObjects()

    if (groupObjects && groupObjects.length > 0) {
      // 그룹의 변환 정보를 각 객체에 적용
      const groupLeft = group.left || 0
      const groupTop = group.top || 0
      const groupScaleX = group.scaleX || 1
      const groupScaleY = group.scaleY || 1
      const groupAngle = group.angle || 0

      // 내부 객체들의 위치와 변환 정보 조정
      const adjustedObjects = groupObjects.map((obj, index) => {
        // 객체 복제하여 원본 보존
        const clonedObj = fabric.util.object.clone(obj)

        // 그룹의 변환 정보를 개별 객체에 적용
        const objLeft = (obj.left || 0) * groupScaleX
        const objTop = (obj.top || 0) * groupScaleY

        clonedObj.set({
          left: groupLeft + objLeft,
          top: groupTop + objTop,
          scaleX: (obj.scaleX || 1) * groupScaleX,
          scaleY: (obj.scaleY || 1) * groupScaleY,
          angle: (obj.angle || 0) + groupAngle,
          id: obj.id || `ungrouped_${index}`
        })

        return clonedObj
      })

      return adjustedObjects
    }
  }

  // 그룹이 아니거나 여러 객체가 있는 경우 원본 그대로 반환
  return fabricObjects
}

/**
 * 요소를 FabricJS 객체들로 변환하는 함수 (단순화된 버전)
 */
async function convertElementToFabricObjects(
  element: Element,
  originalSvg: Element,
  elementId: string,
  isBackground: boolean = false,
  minGroupDepth: number = 1
): Promise<fabric.Object[]> {
  try {
    // 임시 SVG 생성
    const tempSvg = createCleanSvg(element)

    // 배경 요소인 경우 clipPath를 유지하고, 그렇지 않으면 제거
    const cleanedElement = cleanElementForFabric(element, !isBackground)
    
    // g 태그 아래에 뎁스 정보가 담긴 id 부여
    addGroupInfoToAllElements(cleanedElement)
    
    tempSvg.appendChild(cleanedElement)

    // 배경 요소인 경우 페이지별 clipPath 추가
    if (isBackground) {
      addClipPathToSvg(tempSvg, element, originalSvg)
    }

    // SVG 문자열로 직렬화
    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(tempSvg)

    // FabricJS로 로드 - 배경 플래그와 그룹화 뎁스 기준 전달
    const objects = await loadSvgAsObjects(svgString, elementId, isBackground, minGroupDepth)

    return objects
  } catch (error) {
    console.error(`요소 ${elementId} 변환 중 오류:`, error)
    return []
  }
}

/**
 * g 태그와 그 아래의 모든 요소에 그룹 정보가 담긴 id를 부여하는 함수
 */
function addGroupInfoToAllElements(element: Element): void {
  try {
    // 루트 element가 g 태그인 경우
    if (element.tagName.toLowerCase() === 'g') {
      const currentId = element.getAttribute('id') || ''
      const groupId = currentId ? `${currentId}-group-0-0` : 'group-0-0'
      element.setAttribute('id', groupId)
      addGroupInfoRecursive(element, [groupId])
    } else {
      // 루트가 g 태그가 아닌 경우 내부 요소들부터 시작
      addGroupInfoRecursive(element, [])
    }
  } catch (error) {
    console.error('그룹 정보 추가 중 오류:', error)
  }
}

/**
 * 재귀적으로 모든 요소에 그룹 정보를 추가하는 함수
 */
function addGroupInfoRecursive(element: Element, groupPath: string[]): void {
  const childElements = Array.from(element.children)
  let gTagIndex = 0
  
  childElements.forEach((child) => {
    if (child.tagName.toLowerCase() === 'g') {
      // g 태그인 경우: 새로운 그룹 ID 생성
      const currentId = child.getAttribute('id') || ''
      const depth = groupPath.length
      const newGroupId = currentId ? `${currentId}-group-${depth}-${gTagIndex}` : `group-${depth}-${gTagIndex}`
      child.setAttribute('id', newGroupId)
      
      // 새로운 그룹 경로 생성
      const newGroupPath = [...groupPath, newGroupId]
      
      gTagIndex++
      
      // 하위 요소들 처리
      addGroupInfoRecursive(child, newGroupPath)
    } else {
      // g 태그가 아닌 요소인 경우: 상위 그룹 정보를 id에 추가
      if (groupPath.length > 0) {
        const currentId = child.getAttribute('id') || ''
        const groupSuffix = groupPath.map(groupId => groupId.replace(/^.*?-/, '')).join('-')
        if (!child.getAttribute('id')) {
          const newId = currentId ? `${currentId}-${groupSuffix}` : `element-${groupSuffix}`
          child.setAttribute('id', newId)
        }
      }
      
      // 내부에 g 태그가 있을 수 있으므로 재귀 호출
      addGroupInfoRecursive(child, groupPath)
    }
  })
}

/**
 * 요소의 clipPath를 SVG에 추가하는 함수
 */
function addClipPathToSvg(tempSvg: Element, pageElement: Element, originalSvg: Element) {
  try {
    // 페이지 요소에서 clipPath 관련 정보 찾기
    const clipPathElements = findPageClipPath(pageElement, originalSvg)

    if (clipPathElements && clipPathElements.length > 0) {
      // 기존 defs가 있는지 확인
      let defs = tempSvg.querySelector('defs')
      if (!defs) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
        tempSvg.insertBefore(defs, tempSvg.firstChild)
      }

      // 요소 타입별로 분리하여 올바른 순서로 추가
      const defsElements: Element[] = []
      const clipPathElements_filtered: Element[] = []

      clipPathElements.forEach((element) => {
        // null 또는 undefined 체크 추가
        if (!element) {
          console.warn('clipPath 요소가 null 또는 undefined입니다.')
          return
        }

        const tagName = element.tagName.toLowerCase()
        if (tagName === 'clippath') {
          clipPathElements_filtered.push(element)
        } else {
          // rect, polygon, path 등의 요소들은 defs 안에 들어가야 함
          defsElements.push(element)
        }
      })

      // 먼저 defs에 속하는 요소들 추가 (rect, polygon 등)
      defsElements.forEach((defsElement) => {
        // null 또는 undefined 체크 추가
        if (!defsElement) {
          console.warn('defs 요소가 null 또는 undefined입니다.')
          return
        }

        try {
          // 이미 defs 안에 있는 요소인지 확인
          if (defsElement.parentElement?.tagName.toLowerCase() !== 'defs') {
            // defs 밖에 있는 요소라면 복사해서 defs에 추가
            const clonedElement = defsElement.cloneNode(true) as Element
            defs!.appendChild(clonedElement)
          } else {
            // 이미 defs 안에 있는 요소라면 그대로 복사
            const clonedElement = defsElement.cloneNode(true) as Element
            defs!.appendChild(clonedElement)
          }
        } catch (cloneError) {
          console.error('defs 요소 복사 중 오류:', cloneError, defsElement)
        }
      })

      // 그 다음 clipPath 요소들 추가
      clipPathElements_filtered.forEach((clipElement) => {
        // null 또는 undefined 체크 추가
        if (!clipElement) {
          console.warn('clipPath 요소가 null 또는 undefined입니다.')
          return
        }

        try {
          const clonedClipPath = clipElement.cloneNode(true) as Element
          defs!.appendChild(clonedClipPath)
        } catch (cloneError) {
          console.error('clipPath 요소 복사 중 오류:', cloneError, clipElement)
        }
      })
    }
  } catch (error) {
    console.error('페이지 clipPath 추가 중 오류:', error)
  }
}

/**
 * 페이지 요소에 적용되는 clipPath를 찾는 함수
 */
function findPageClipPath(pageElement: Element, originalSvg: Element): Element[] | null {
  try {
    const collectedElements = new Map<string, Element>()
    const processedIds = new Set<string>()

    // 1. 페이지 내부의 모든 요소에서 clipPath 찾기 (하향식 검색)
    const allElementsInPage = pageElement.querySelectorAll('*')
    const elementsWithClipPath: Element[] = []

    // 페이지 요소 자체도 확인
    if (hasClipPath(pageElement)) {
      elementsWithClipPath.push(pageElement)
    }

    // 페이지 내부의 모든 요소 확인
    allElementsInPage.forEach((element) => {
      if (hasClipPath(element)) {
        elementsWithClipPath.push(element)
      }
    })

    // 2. 찾은 요소들에서 clipPath ID 추출 및 수집
    elementsWithClipPath.forEach((element) => {
      const clipPathIds = extractClipPathIds(element)
      clipPathIds.forEach((clipPathId) => {
        collectClipPathChain(clipPathId, originalSvg, collectedElements, processedIds)
      })
    })

    // 3. 페이지에서 상위로 올라가면서 추가 clipPath 찾기 (상향식 검색)
    let current: Element | null = pageElement.parentElement
    while (current && current !== originalSvg) {
      if (hasClipPath(current)) {
        const clipPathIds = extractClipPathIds(current)
        clipPathIds.forEach((clipPathId) => {
          collectClipPathChain(clipPathId, originalSvg, collectedElements, processedIds)
        })
      }
      current = current.parentElement
    }

    // 유효한 요소만 필터링하여 반환
    const result = Array.from(collectedElements.values()).filter((element) => {
      if (!element) {
        console.warn('수집된 clipPath 요소가 null 또는 undefined입니다.')
        return false
      }
      return true
    })

    return result.length > 0 ? result : null
  } catch (error) {
    console.error('clipPath 찾기 중 오류:', error)
    return null
  }
}

/**
 * 요소가 clipPath를 가지고 있는지 확인하는 함수
 */
function hasClipPath(element: Element): boolean {
  const style = element.getAttribute('style')
  const clipPathAttr = element.getAttribute('clip-path')

  // style 속성에서 clip-path 확인 (공백 고려)
  const hasStyleClipPath = style && /clip-path\s*:\s*url\(#/.test(style)

  // clip-path 속성 직접 확인
  const hasDirectClipPath = clipPathAttr && clipPathAttr.includes('url(#')

  return !!(hasStyleClipPath || hasDirectClipPath)
}

/**
 * 요소에서 clipPath ID들을 추출하는 함수
 */
function extractClipPathIds(element: Element): string[] {
  const clipPathIds: string[] = []

  // style 속성에서 clip-path 찾기
  const style = element.getAttribute('style')
  if (style && style.includes('clip-path:url(#')) {
    const clipPathMatches = style.matchAll(/clip-path:url\(#([^)]+)\)/g)
    for (const match of clipPathMatches) {
      clipPathIds.push(match[1])
    }
  }

  // clip-path 속성 직접 확인
  const clipPathAttr = element.getAttribute('clip-path')
  if (clipPathAttr && clipPathAttr.includes('url(#')) {
    const clipPathMatches = clipPathAttr.matchAll(/url\(#([^)]+)\)/g)
    for (const match of clipPathMatches) {
      clipPathIds.push(match[1])
    }
  }

  return clipPathIds
}

/**
 * clipPath의 전체 참조 체인을 재귀적으로 수집하는 함수
 */
function collectClipPathChain(
  clipPathId: string,
  originalSvg: Element,
  collectedElements: Map<string, Element>,
  processedIds: Set<string>
): void {
  // 이미 처리된 ID면 순환 참조 방지
  if (processedIds.has(clipPathId)) {
    return
  }

  processedIds.add(clipPathId)

  // clipPath 요소 찾기
  const clipPathElement = originalSvg.querySelector(
    `clipPath[id="${clipPathId}"], clippath[id="${clipPathId}"]`
  )
  if (!clipPathElement) {
    console.warn(`clipPath 요소를 찾을 수 없습니다: ${clipPathId}`)
    return
  }

  // clipPath 요소 수집 (null 체크 추가)
  if (!collectedElements.has(clipPathId) && clipPathElement) {
    collectedElements.set(clipPathId, clipPathElement)
  }

  // clipPath 내의 모든 use 요소 찾기
  const useElements = clipPathElement.querySelectorAll('use')
  useElements.forEach((useEl) => {
    const href = useEl.getAttribute('xlink:href') || useEl.getAttribute('href')
    if (href && href.startsWith('#')) {
      const refId = href.substring(1)
      // 참조되는 요소 찾기 및 수집
      collectReferencedElement(refId, originalSvg, collectedElements, processedIds)
    }
  })

  // clipPath 내의 다른 clipPath 참조도 확인
  const nestedElements = clipPathElement.querySelectorAll('*')
  nestedElements.forEach((el) => {
    const style = el.getAttribute('style')
    if (style && style.includes('clip-path:url(#')) {
      const nestedClipPathMatch = style.match(/clip-path:url\(#([^)]+)\)/)
      if (nestedClipPathMatch) {
        const nestedClipPathId = nestedClipPathMatch[1]
        collectClipPathChain(nestedClipPathId, originalSvg, collectedElements, processedIds)
      }
    }

    const clipPathAttr = el.getAttribute('clip-path')
    if (clipPathAttr && clipPathAttr.includes('url(#')) {
      const nestedClipPathMatch = clipPathAttr.match(/url\(#([^)]+)\)/)
      if (nestedClipPathMatch) {
        const nestedClipPathId = nestedClipPathMatch[1]
        collectClipPathChain(nestedClipPathId, originalSvg, collectedElements, processedIds)
      }
    }
  })
}

/**
 * 참조되는 요소를 재귀적으로 수집하는 함수
 */
function collectReferencedElement(
  refId: string,
  originalSvg: Element,
  collectedElements: Map<string, Element>,
  processedIds: Set<string>
): void {
  // 이미 처리된 ID면 순환 참조 방지
  if (processedIds.has(refId)) {
    return
  }

  processedIds.add(refId)

  // 참조되는 요소 찾기
  const refElement = originalSvg.querySelector(`[id="${refId}"]`)
  if (!refElement) {
    console.warn(`참조된 요소를 찾을 수 없습니다: ${refId}`)
    return
  }

  // 요소 수집 (null 체크 추가)
  if (!collectedElements.has(refId) && refElement) {
    collectedElements.set(refId, refElement)
  }

  // 해당 요소가 다른 요소를 참조하는지 확인
  if (refElement.tagName.toLowerCase() === 'use') {
    const href = refElement.getAttribute('xlink:href') || refElement.getAttribute('href')
    if (href && href.startsWith('#')) {
      const nestedRefId = href.substring(1)
      collectReferencedElement(nestedRefId, originalSvg, collectedElements, processedIds)
    }
  }

  // 요소 내부의 use 요소들도 확인
  const internalUseElements = refElement.querySelectorAll('use')
  internalUseElements.forEach((useEl) => {
    const href = useEl.getAttribute('xlink:href') || useEl.getAttribute('href')
    if (href && href.startsWith('#')) {
      const internalRefId = href.substring(1)
      collectReferencedElement(internalRefId, originalSvg, collectedElements, processedIds)
    }
  })

  // gradient, pattern 등의 참조도 확인
  const fillAttr = refElement.getAttribute('fill')
  const strokeAttr = refElement.getAttribute('stroke')

  const attrs = [fillAttr, strokeAttr].filter((attr) => attr !== null)
  attrs.forEach((attr) => {
    if (attr && attr.includes('url(#')) {
      const urlMatch = attr.match(/url\(#([^)]+)\)/)
      if (urlMatch) {
        const urlRefId = urlMatch[1]
        collectReferencedElement(urlRefId, originalSvg, collectedElements, processedIds)
      }
    }
  })
}

/**
 * 원본 SVG 속성을 가진 깨끗한 SVG 요소 생성
 */
function createCleanSvg(originalSvg: Element): Element {
  const svgNamespace = 'http://www.w3.org/2000/svg'
  const cleanSvg = document.createElementNS(svgNamespace, 'svg')

  // 필수 네임스페이스
  cleanSvg.setAttribute('xmlns', svgNamespace)
  cleanSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')

  // 원본 SVG의 중요한 속성들 복사
  const importantAttributes = ['viewBox', 'width', 'height', 'x', 'y', 'style']
  importantAttributes.forEach((attr) => {
    const value = originalSvg.getAttribute(attr)
    if (value) {
      cleanSvg.setAttribute(attr, value)
    }
  })

  // defs 요소 복사 (gradients, patterns 등은 유지하되 clipPaths는 제거)
  const originalDefs = originalSvg.querySelector('defs')
  if (originalDefs) {
    const cleanedDefs = cleanElementForFabric(originalDefs)

    // defs 내에서 clipPath 요소들 추가 제거
    const clipPaths = cleanedDefs.querySelectorAll('clipPath, clippath')
    clipPaths.forEach((clipPath) => clipPath.remove())

    // defs에 유효한 내용이 남아있는 경우에만 추가
    if (cleanedDefs.children.length > 0) {
      cleanSvg.appendChild(cleanedDefs)
    }
  }

  return cleanSvg
}

/**
 * 요소에서 불필요한 요소 제거 및 정리
 */
function cleanElementForFabric(element: Element, removeClipPath: boolean = true): Element {
  // null 또는 undefined 체크 추가
  if (!element) {
    console.error('cleanElementForFabric: element가 null 또는 undefined입니다.')
    // 빈 그룹 요소 반환
    return document.createElementNS('http://www.w3.org/2000/svg', 'g')
  }

  const cleaned = element.cloneNode(true) as Element

  // Adobe Illustrator 특수 속성 제거
  const aiAttributes = [
    'i:extraneous',
    'xmlns:i',
    'xmlns:x',
    'xmlns:graph',
    'i:knockout',
    'i:layer',
    'i:dimmedPercent',
    'i:rgbTrio'
  ]

  aiAttributes.forEach((attr) => {
    if (cleaned.hasAttribute(attr)) {
      cleaned.removeAttribute(attr)
    }
  })

  if (removeClipPath) {
    // clipPath 관련 속성 제거
    if (cleaned.hasAttribute('clip-path')) {
      cleaned.removeAttribute('clip-path')
    }

    // style 속성에서 clip-path 제거
    const style = cleaned.getAttribute('style')
    if (style && style.includes('clip-path')) {
      const cleanedStyle = style.replace(/clip-path:[^;]+;?/g, '').trim()
      if (cleanedStyle) {
        cleaned.setAttribute('style', cleanedStyle)
      } else {
        cleaned.removeAttribute('style')
      }
    }

    // 메타데이터 및 불필요한 요소 제거 (clipPath 포함)
    const unnecessarySelectors = [
      'metadata',
      'foreignObject',
      'switch',
      'sfw',
      'slices',
      'sliceSourceBounds',
      'i\\:aipgfRef',
      'i\\:pgfRef',
      'clipPath',
      'clippath' // clipPath 요소 제거
    ]

    unnecessarySelectors.forEach((selector) => {
      const elements = cleaned.querySelectorAll(selector)
      elements.forEach((el) => el.remove())
    })

    // 모든 하위 요소에서도 clipPath 관련 속성 제거
    const allElements = cleaned.querySelectorAll('*')
    allElements.forEach((el) => {
      // clip-path 속성 제거
      if (el.hasAttribute('clip-path')) {
        el.removeAttribute('clip-path')
      }

      // style 속성에서 clip-path 제거
      const elementStyle = el.getAttribute('style')
      if (elementStyle && elementStyle.includes('clip-path')) {
        const cleanedElementStyle = elementStyle.replace(/clip-path:[^;]+;?/g, '').trim()
        if (cleanedElementStyle) {
          el.setAttribute('style', cleanedElementStyle)
        } else {
          el.removeAttribute('style')
        }
      }
    })
  } else {
    // 배경 요소인 경우: 메타데이터만 제거하고 clipPath는 유지
    const unnecessarySelectors = [
      'metadata',
      'foreignObject',
      'switch',
      'sfw',
      'slices',
      'sliceSourceBounds',
      'i\\:aipgfRef',
      'i\\:pgfRef'
    ]

    unnecessarySelectors.forEach((selector) => {
      const elements = cleaned.querySelectorAll(selector)
      elements.forEach((el) => el.remove())
    })
  }

  // 빈 그룹 제거 (하지만 렌더링 요소가 있는 그룹은 유지)
  const groups = cleaned.querySelectorAll('g')
  groups.forEach((group) => {
    const hasRenderingElements = group.querySelector(
      'rect, circle, ellipse, line, polyline, polygon, path, text, image'
    )
    const hasChildGroups = group.querySelector('g')

    if (!hasRenderingElements && !hasChildGroups) {
      group.remove()
    }
  })

  return cleaned
}

/**
 * SVG를 FabricJS 객체들로 로드하는 함수
 * 요소의 구조를 그대로 유지하여 적절히 처리
 */
function loadSvgAsObjects(
  svgString: string,
  elementId: string,
  isBackground: boolean = false,
  minGroupDepth: number = 1
): Promise<fabric.Object[]> {
  return new Promise((resolve) => {
    fabric.loadSVGFromString(svgString, (objects) => {
      // null 객체 필터링
      const validObjects = objects.filter((obj) => obj != null)

      if (validObjects.length === 0) {
        resolve([])
        return
      }

      // 배경 요소는 무조건 그룹으로 묶기
      if (isBackground && validObjects.length >= 1) {
        const fabricGroup = new fabric.Group(validObjects, {
          id: elementId,
          selectable: true,
          evented: true
        })
        resolve([fabricGroup])
      } else {
        // 같은 그룹이었던 객체들을 ID 패턴을 통해 다시 그룹화
        const groupedObjects = groupObjectsByDepth(validObjects, minGroupDepth)
        resolve(groupedObjects)
      }
    })
  })
}

/**
 * 같은 그룹이었던 객체들을 ID 패턴을 통해 그룹화하는 함수
 */
function groupObjectsByDepth(objects: fabric.Object[], minGroupDepth: number): fabric.Object[] {
  try {
    // 그룹별로 객체들을 분류
    const groupMap = new Map<string, fabric.Object[]>()
    const ungroupedObjects: fabric.Object[] = []

    objects.forEach((obj) => {
      const objectId = (obj as any).id || ''
      
      if (objectId.startsWith('element-')) {
        const numberSequence = objectId.substring('element-'.length)
        const numbers = numberSequence.split('-').map(num => parseInt(num))
        
        // numbers 배열의 길이가 minGroupDepth 이상이면 그룹화 대상
        if (numbers.length >= ((minGroupDepth + 1) * 2)) {
          // minGroupDepth까지의 숫자들로 그룹 키 생성
          const groupNumbers = numbers.slice(0, minGroupDepth * 2)
          const groupKey = `element-${groupNumbers.join('-')}`
          
          if (!groupMap.has(groupKey)) {
            groupMap.set(groupKey, [])
          }
          groupMap.get(groupKey)!.push(obj)
        } else {
          ungroupedObjects.push(obj)
        }
      } else {
        // element- 패턴이 아닌 경우 그룹화하지 않음
        ungroupedObjects.push(obj)
      }
    })

    // 그룹화된 객체들 생성
    const result: fabric.Object[] = [...ungroupedObjects]

    groupMap.forEach((groupObjects, groupKey) => {
      if (groupObjects.length > 1) {
        // 여러 객체가 있으면 그룹으로 묶기
        const fabricGroup = new fabric.Group(groupObjects, {
          id: groupKey,
          selectable: true,
          evented: true,
        })

        fabricGroup.set({
          groupId: uuid(),
          groupIndex: groupKey,
        })

        result.push(fabricGroup)
      } else {
        // 단일 객체는 그룹화하지 않고 그대로 추가
        result.push(groupObjects[0])
      }
    })

    return result
  } catch (error) {
    console.error('객체 그룹화 중 오류:', error)
    return objects
  }
}



/**
 * SVG path 데이터를 점들로 변환
 * @param pathData SVG path 데이터
 * @returns [number, number][] 점들의 배열
 */
function parsePathToPoints(pathData: string): [number, number][] {
  const points: [number, number][] = []

  try {
    // 임시 SVG 요소 생성하여 path 길이 계산
    const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    tempSvg.setAttribute('width', '1000')
    tempSvg.setAttribute('height', '1000')
    tempSvg.style.position = 'absolute'
    tempSvg.style.left = '-9999px'
    tempSvg.style.top = '-9999px'

    const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    tempPath.setAttribute('d', pathData)

    tempSvg.appendChild(tempPath)
    document.body.appendChild(tempSvg)

    try {
      const pathLength = tempPath.getTotalLength()

      if (pathLength > 0) {
        // path를 따라 점들을 추출
        const numPoints = Math.max(20, Math.min(100, Math.floor(pathLength / 3)))

        for (let i = 0; i <= numPoints; i++) {
          const point = tempPath.getPointAtLength((i / numPoints) * pathLength)
          points.push([point.x, point.y])
        }
      }

      // 임시 요소 제거
      document.body.removeChild(tempSvg)
    } catch (pathError) {
      if (document.body.contains(tempSvg)) {
        document.body.removeChild(tempSvg)
      }
      throw pathError
    }
  } catch (error) {
    console.warn('path 점 추출 실패:', error)
  }

  return points
}

/**
 * d3.js를 사용하여 닫힌 곡선 경로 생성
 * @param points 점들의 배열
 * @returns 닫힌 path 데이터 문자열
 */
function generateClosedPath(points: [number, number][]): string {
  if (points.length < 3) {
    return ''
  }

  try {
    // d3.js line generator 사용 (closed curve)
    const line = d3
      .line<[number, number]>()
      .x((d) => d[0])
      .y((d) => d[1])
      .curve(d3.curveBasisClosed) // 부드러운 닫힌 곡선

    const pathData = line(points)

    return pathData || ''
  } catch (error) {
    console.warn('d3 path 생성 실패:', error)
    return ''
  }
}

/**
 * polygon/polyline의 points 속성을 파싱
 * @param pointsStr points 속성 문자열 (예: "0,0 100,0 100,100 0,100")
 * @returns fabric.Point[] 점들의 배열
 */
function parsePolygonPoints(pointsStr: string): fabric.Point[] {
  const points: fabric.Point[] = []

  try {
    // 공백과 쉼표로 분리하여 좌표 쌍 추출
    const coords = pointsStr.trim().split(/[\s,]+/)

    for (let i = 0; i < coords.length; i += 2) {
      if (i + 1 < coords.length) {
        const x = parseFloat(coords[i])
        const y = parseFloat(coords[i + 1])

        if (!isNaN(x) && !isNaN(y)) {
          points.push(new fabric.Point(x, y))
        }
      }
    }
  } catch (error) {
    console.warn('polygon points 파싱 실패:', error)
  }

  return points
}

/**
 * CSS 스타일 문자열을 객체로 파싱
 * @param styleString CSS 스타일 문자열 (예: "fill: red; stroke: blue;")
 * @returns 스타일 객체
 */
function parseStyleString(styleString: string): Record<string, string> {
  const styles: Record<string, string> = {}

  try {
    styleString.split(';').forEach((rule) => {
      const [property, value] = rule.split(':').map((s) => s.trim())
      if (property && value) {
        styles[property] = value
      }
    })
  } catch (error) {
    console.warn('스타일 문자열 파싱 실패:', error)
  }

  return styles
}

/**
 * 색상 값을 정규화 (hex, rgb, 색상명 등을 통일된 형태로 변환)
 * @param color 원본 색상 값
 * @returns 정규화된 색상 값
 */
function normalizeColor(color: string): string {
  if (!color || color === 'none') return 'transparent'

  // hex 색상인 경우 그대로 반환
  if (color.startsWith('#')) return color

  // rgb/rgba 색상인 경우 그대로 반환
  if (color.startsWith('rgb')) return color

  // named 색상인 경우 그대로 반환
  return color
}

/**
 * SVG에서 각 요소를 개별 fabric 객체로 추출 (path, ellipse, polygon, rect 등 지원)
 * @param svgString SVG 문자열
 * @param cutSizePx 조정할 크기 (픽셀) - 현재 함수 내에서 사용되지 않음. 필요시 전달하여 활용 가능.
 * @returns Promise<fabric.Object[]> 개별 fabric 객체 배열
 */
async function extractSvgElementsAsObjects(
  svgString: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  cutSizePx: number // 파라미터는 유지하되, 현재 사용되지 않음을 명시
): Promise<fabric.Object[]> {
  return new Promise((resolve, reject) => {
    try {
      // DOMParser로 SVG 파싱
      const parser = new DOMParser()
      const svgDoc = parser.parseFromString(svgString, 'image/svg+xml')

      // 파싱 에러 확인
      const parserError = svgDoc.querySelector('parsererror')
      if (parserError) {
        reject(new Error(`SVG 파싱 오류: ${parserError.textContent}`))
        return
      }

      const svgElement = svgDoc.querySelector('svg')

      if (!svgElement) {
        reject(new Error('유효한 SVG 요소를 찾을 수 없습니다'))
        return
      }

      // SVG에서 모든 도형 요소 찾기
      const pathElements = svgElement.querySelectorAll('path')
      const rectElements = svgElement.querySelectorAll('rect')
      const circleElements = svgElement.querySelectorAll('circle')
      const ellipseElements = svgElement.querySelectorAll('ellipse')
      const polygonElements = svgElement.querySelectorAll('polygon')
      const polylineElements = svgElement.querySelectorAll('polyline')

      const totalElements =
        pathElements.length +
        rectElements.length +
        circleElements.length +
        ellipseElements.length +
        polygonElements.length +
        polylineElements.length

      if (totalElements === 0) {
        resolve([])
        return
      }

      const fabricObjects: fabric.Object[] = []
      let processedCount = 0

      // 공통 스타일 추출 함수 (개선된 색상 처리)
      const extractStyles = (element: Element) => {
        // 기본 속성에서 추출
        let fill = element.getAttribute('fill')
        let stroke = element.getAttribute('stroke')
        let strokeWidth = parseFloat(element.getAttribute('stroke-width') || '1')
        let opacity = parseFloat(element.getAttribute('opacity') || '1')

        // CSS 스타일에서 추출 (우선순위 높음)
        const style = element.getAttribute('style')
        if (style) {
          const styleObj = parseStyleString(style)
          if (styleObj.fill) fill = styleObj.fill
          if (styleObj.stroke) stroke = styleObj.stroke
          if (styleObj['stroke-width']) strokeWidth = parseFloat(styleObj['stroke-width'])
          if (styleObj.opacity) opacity = parseFloat(styleObj.opacity)
        }

        // computed style 확인 (브라우저에서 계산된 최종 스타일)
        if (element instanceof SVGElement) {
          try {
            const computedStyle = window.getComputedStyle(element)
            if (!fill || fill === 'currentColor') {
              const computedFill = computedStyle.getPropertyValue('fill')
              if (computedFill && computedFill !== 'none') fill = computedFill
            }
            if (!stroke || stroke === 'currentColor') {
              const computedStroke = computedStyle.getPropertyValue('stroke')
              if (computedStroke && computedStroke !== 'none') stroke = computedStroke
            }
          } catch (e) {
            console.warn('computed style 추출 실패:', e)
          }
        }

        // 상위 요소에서 상속된 색상 확인
        if (!fill || fill === 'inherit' || fill === 'currentColor') {
          let parent = element.parentElement
          while (parent && parent.tagName !== 'svg') {
            const parentFill =
              parent.getAttribute('fill') ||
              (parent.getAttribute('style') && parseStyleString(parent.getAttribute('style')!).fill)
            if (parentFill && parentFill !== 'inherit' && parentFill !== 'currentColor') {
              fill = parentFill
              break
            }
            parent = parent.parentElement
          }
        }

        // 기본값 설정
        if (!fill || fill === 'none') fill = 'white' // 기본값을 white로 변경 (TemplatePlugin과 동일하게)
        if (!stroke || stroke === 'none') stroke = null

        // 색상 값 정규화
        fill = normalizeColor(fill)
        stroke = stroke ? normalizeColor(stroke) : null

        return {
          fill,
          stroke,
          strokeWidth,
          opacity
        }
      }

      // Path 요소 처리 (d3 사용)
      pathElements.forEach((pathElement, index) => {
        let pathData = pathElement.getAttribute('d')
        if (!pathData) {
          processedCount++
          if (processedCount === totalElements) resolve(fabricObjects)
          return
        }

        try {
          // d3로 closed path 처리
          const points = parsePathToPoints(pathData)
          if (points.length > 2) {
            const closedPathData = generateClosedPath(points)
            if (closedPathData) {
              pathData = closedPathData
            }
          }

          const styles = extractStyles(pathElement)
          const fabricPath = new fabric.Path(pathData, {
            fill: styles.fill,
            stroke: styles.stroke || undefined,
            strokeWidth: styles.stroke ? styles.strokeWidth : 0,
            opacity: styles.opacity,
            strokeUniform: true,
            originX: 'center',
            originY: 'center'
          } as any)

          fabricPath.set('id', `cutline-path-${index}`)
          fabricObjects.push(fabricPath)
        } catch (pathError) {
          console.warn(`path ${index} 처리 실패:`, pathError)
        }

        processedCount++
        if (processedCount === totalElements) resolve(fabricObjects)
      })

      // Rect 요소 처리
      rectElements.forEach((rectElement, index) => {
        try {
          const x = parseFloat(rectElement.getAttribute('x') || '0')
          const y = parseFloat(rectElement.getAttribute('y') || '0')
          const width = parseFloat(rectElement.getAttribute('width') || '0')
          const height = parseFloat(rectElement.getAttribute('height') || '0')
          const rx = parseFloat(rectElement.getAttribute('rx') || '0')
          const ry = parseFloat(rectElement.getAttribute('ry') || '0')

          const styles = extractStyles(rectElement)
          const fabricRect = new fabric.Rect({
            left: x,
            top: y,
            width: width,
            height: height,
            rx: rx,
            ry: ry,
            fill: styles.fill,
            stroke: styles.stroke || undefined,
            strokeWidth: styles.stroke ? styles.strokeWidth : 0,
            opacity: styles.opacity,
            strokeUniform: true,
            originX: 'center',
            originY: 'center'
          } as any)

          fabricRect.set('id', `cutline-rect-${index}`)
          fabricObjects.push(fabricRect)
        } catch (rectError) {
          console.warn(`rect ${index} 처리 실패:`, rectError)
        }

        processedCount++
        if (processedCount === totalElements) resolve(fabricObjects)
      })

      // Circle 요소 처리
      circleElements.forEach((circleElement, index) => {
        try {
          const cx = parseFloat(circleElement.getAttribute('cx') || '0')
          const cy = parseFloat(circleElement.getAttribute('cy') || '0')
          const r = parseFloat(circleElement.getAttribute('r') || '0')

          const styles = extractStyles(circleElement)
          const fabricCircle = new fabric.Circle({
            left: cx,
            top: cy,
            radius: r,
            fill: styles.fill,
            stroke: styles.stroke || undefined,
            strokeWidth: styles.stroke ? styles.strokeWidth : 0,
            opacity: styles.opacity,
            strokeUniform: true,
            originX: 'center',
            originY: 'center'
          })

          fabricCircle.set('id', `cutline-circle-${index}`)
          fabricObjects.push(fabricCircle)
        } catch (circleError) {
          console.warn(`circle ${index} 처리 실패:`, circleError)
        }

        processedCount++
        if (processedCount === totalElements) resolve(fabricObjects)
      })

      // Ellipse 요소 처리
      ellipseElements.forEach((ellipseElement, index) => {
        try {
          const cx = parseFloat(ellipseElement.getAttribute('cx') || '0')
          const cy = parseFloat(ellipseElement.getAttribute('cy') || '0')
          const rx = parseFloat(ellipseElement.getAttribute('rx') || '0')
          const ry = parseFloat(ellipseElement.getAttribute('ry') || '0')

          const styles = extractStyles(ellipseElement)
          const fabricEllipse = new fabric.Ellipse({
            left: cx,
            top: cy,
            rx: rx,
            ry: ry,
            fill: styles.fill,
            stroke: styles.stroke || undefined,
            strokeWidth: styles.stroke ? styles.strokeWidth : 0,
            opacity: styles.opacity,
            strokeUniform: true,
            originX: 'center',
            originY: 'center'
          })

          fabricEllipse.set('id', `cutline-ellipse-${index}`)
          fabricObjects.push(fabricEllipse)
        } catch (ellipseError) {
          console.warn(`ellipse ${index} 처리 실패:`, ellipseError)
        }

        processedCount++
        if (processedCount === totalElements) resolve(fabricObjects)
      })

      // Polygon 요소 처리
      polygonElements.forEach((polygonElement, index) => {
        try {
          const pointsStr = polygonElement.getAttribute('points') || ''
          const points = parsePolygonPoints(pointsStr)

          const styles = extractStyles(polygonElement)
          const fabricPolygon = new fabric.Polygon(points, {
            fill: styles.fill,
            stroke: styles.stroke || undefined,
            strokeWidth: styles.stroke ? styles.strokeWidth : 0,
            opacity: styles.opacity,
            strokeUniform: true,
            originX: 'center',
            originY: 'center'
          })

          fabricPolygon.set('id', `cutline-polygon-${index}`)
          fabricObjects.push(fabricPolygon)
        } catch (polygonError) {
          console.warn(`polygon ${index} 처리 실패:`, polygonError)
        }

        processedCount++
        if (processedCount === totalElements) resolve(fabricObjects)
      })

      // Polyline 요소 처리
      polylineElements.forEach((polylineElement, index) => {
        try {
          const pointsStr = polylineElement.getAttribute('points') || ''
          const points = parsePolygonPoints(pointsStr)

          const styles = extractStyles(polylineElement)
          const fabricPolyline = new fabric.Polyline(points, {
            fill: styles.fill,
            stroke: styles.stroke || undefined,
            strokeWidth: styles.stroke ? styles.strokeWidth : 0,
            opacity: styles.opacity,
            strokeUniform: true,
            originX: 'center',
            originY: 'center'
          })

          fabricPolyline.set('id', `cutline-polyline-${index}`)
          fabricObjects.push(fabricPolyline)
        } catch (polylineError) {
          console.warn(`polyline ${index} 처리 실패:`, polylineError)
        }

        processedCount++
        if (processedCount === totalElements) resolve(fabricObjects)
      })

      // 요소가 없는 경우 즉시 resolve
      if (totalElements === 0) {
        resolve(fabricObjects)
      }
    } catch (error) {
      console.error('SVG 요소 추출 중 오류:', error)
      reject(error)
    }
  })
}

/**
 * fabric 객체를 완전한 SVG 문자열로 변환합니다.
 * @param obj 변환할 fabric 객체
 * @returns SVG 문자열
 */
function convertFabricObjectToSVGString(obj: fabric.Object): string {
  try {
    // 1. 기본 toSVG() 시도
    const basicSvg = obj.toSVG()
    if (basicSvg && basicSvg.startsWith('<svg')) {
      // 이미 완전한 SVG 형태이면 그대로 반환
      return basicSvg
    }

    // 2. fabric 객체가 가진 SVG 데이터 추출 (basicSvg가 <g> 등으로 시작할 수 있음)
    const fabricSvgData = basicSvg || '' // basicSvg가 null/undefined일 경우 빈 문자열로 대체

    // 3. <g> 태그로 시작하는 경우 TemplatePlugin의 viewBox 및 패딩 로직 적용
    if (fabricSvgData.startsWith('<g')) {
      const width = obj.width || obj.getBoundingRect().width || 1000
      const height = obj.height || obj.getBoundingRect().height || 1000
      const left = obj.left || 0
      const top = obj.top || 0
      const viewBoxX = Math.min(0, left)
      const viewBoxY = Math.min(0, top)
      const viewBoxWidth = width + (obj.strokeWidth || 0)
      const viewBoxHeight = height + (obj.strokeWidth || 0)

      const completeSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${viewBoxWidth}"
     height="${viewBoxHeight}"
     viewBox="${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}"
     version="1.1">
  ${fabricSvgData}
</svg>`
      return completeSvg
    }

    // 4. fabricSvgData가 다른 유효한 SVG 형태일 경우 (예: <path>, <rect> 등 단일 요소)
    //    기존 svg.ts의 로직을 따르되, viewBox를 좀 더 정확하게 설정
    if (fabricSvgData && fabricSvgData.includes('<') && !fabricSvgData.startsWith('<')) {
      const bounds = obj.getBoundingRect() // 실제 렌더링 영역 기준
      const completeSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${bounds.width}"
     height="${bounds.height}"
     viewBox="0 0 ${bounds.width} ${bounds.height}"
     version="1.1">
  ${fabricSvgData}
</svg>`
      return completeSvg
    }
  } catch (error) {
    console.warn('기본 toSVG() 또는 <g> 태그 처리 중 오류:', error)
    // 오류 발생 시 폴백 로직으로 넘어감
  }

  // 5. 폴백 로직: TemplatePlugin의 객체 타입별 SVG 생성
  try {
    const objType = obj.type
    const left = obj.left || 0
    const top = obj.top || 0
    const width = obj.width || 100
    const height = obj.height || 100
    const fill = (obj as any).fill || 'transparent'
    const stroke = (obj as any).stroke || 'none'
    const strokeWidth = (obj as any).strokeWidth || 0
    let svgContent = ''

    switch (objType) {
      case 'rect':
        svgContent = `<rect x="${left}" y="${top}" width="${width}" height="${height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`
        break
      case 'circle': {
        const radius = (obj as fabric.Circle).radius || 50
        svgContent = `<circle cx="${left + radius}" cy="${top + radius}" r="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`
        break
      }
      case 'path': {
        const pathData = (obj as fabric.Path).path
        if (pathData) {
          let pathString = ''
          if (typeof pathData === 'string') {
            pathString = pathData
          } else if (Array.isArray(pathData)) {
            pathString = pathData
              .map((segment: any) => (Array.isArray(segment) ? segment.join(' ') : segment))
              .join(' ')
          }
          svgContent = `<path d="${pathString}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`
        } else {
          svgContent = `<rect x="${left}" y="${top}" width="${width}" height="${height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`
        }
        break
      }
      // 다른 타입들 (ellipse, line, polyline, polygon, text, image)에 대한 case 추가 가능
      default:
        svgContent = `<rect x="${left}" y="${top}" width="${width}" height="${height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`
    }

    // 폴백 SVG 생성 시 viewBox는 객체의 크기를 기준으로 하되, 약간의 여백을 줄 수 있음
    const fallbackViewBoxWidth = width + 100
    const fallbackViewBoxHeight = height + 100
    const fallbackViewBoxX = left - 50
    const fallbackViewBoxY = top - 50

    const fullSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${fallbackViewBoxWidth}"
     height="${fallbackViewBoxHeight}"
     viewBox="${fallbackViewBoxX} ${fallbackViewBoxY} ${fallbackViewBoxWidth} ${fallbackViewBoxHeight}">
  ${svgContent}
</svg>`
    return fullSvg
  } catch (fallbackError) {
    console.error('폴백 SVG 생성 실패:', fallbackError)
    // 최후의 수단: 빈 SVG 반환
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <rect x="0" y="0" width="100" height="100" fill="transparent"/>
</svg>`
  }
}

export {
  loadPagesFromSvgString,
  extractSvgElementsAsObjects,
  parsePathToPoints,
  generateClosedPath,
  parsePolygonPoints,
  parseStyleString,
  normalizeColor,
  convertFabricObjectToSVGString
}
