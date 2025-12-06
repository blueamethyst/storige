export function sanitizeBase64(base64String: string): string {
  // 유효한 Base64 문자만 포함하도록 정리
  // 유효한 Base64 문자: A-Z, a-z, 0-9, +, /, =
  if (!base64String) return ''

  // 데이터 URL 형식인 경우 분리
  let dataContent = base64String
  if (base64String.indexOf('data:') === 0) {
    const parts = base64String.split(',')
    if (parts.length > 1) {
      dataContent = parts[1]
    }
  }

  // 유효하지 않은 문자 제거
  const validBase64 = dataContent.replace(/[^A-Za-z0-9+/=]/g, '')

  // 패딩 수정 (Base64는 4의 배수 길이여야 함)
  const missingPadding = validBase64.length % 4
  if (missingPadding > 0) {
    return validBase64 + '='.repeat(4 - missingPadding)
  }

  return validBase64
}

// SVG 데이터에서 이미지 참조 정리
export function cleanupSvgImageReferences(svgData: string): string {
  return svgData.replace(/(xlink:href|href)="(data:image\/[^"]+)"/g, (match, attr, url) => {
    try {
      // 데이터 URL 파싱
      const [prefix, base64Data] = url.split(',')

      if (!base64Data) {
        // 손상된 데이터일 가능성이 높음 - 제거 또는 대체
        return `${attr}="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="`
      }

      // 유효한 Base64 데이터인지 확인 시도
      try {
        window.atob(sanitizeBase64(base64Data))
        return match // 유효하면 원본 유지
      } catch (e) {
        console.warn('유효하지 않은 Base64 데이터 발견, 대체 이미지 사용')
        // 투명 1x1 픽셀 이미지로 대체
        return `${attr}="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="`
      }
    } catch (error) {
      console.error('이미지 참조 처리 오류:', error)
      // 대체 이미지로 교체
      return `${attr}="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="`
    }
  })
}

/**
 * 캔버스 내 이미지 최적화 및 위치 조정 함수
 * 특히 scale이 1보다 작은 객체들의 처리를 개선
 * @param canvas 최적화할 캔버스
 */
export async function optimizeCanvasImage(canvas: fabric.Canvas): Promise<void> {
  // 모든 캔버스 객체 가져오기
  const objects = canvas.getObjects()

  // 정규화가 필요한 객체들 필터링 (scale이 1이 아닌 객체들)
  const objectsToNormalize = objects.filter(
    (obj) =>
      (obj.scaleX !== 1 || obj.scaleY !== 1) &&
      // 워크스페이스나 특수 객체는 제외
      obj.id !== 'workspace' &&
      !obj.excludeFromExport &&
      obj.type !== 'GuideLine'
  )

  // 각 객체의 크기와 위치를 정규화
  for (const obj of objectsToNormalize) {
    // 원본 속성 저장
    const originalWidth = obj.width || 0
    const originalHeight = obj.height || 0
    const originalLeft = obj.left || 0
    const originalTop = obj.top || 0
    const originalScaleX = obj.scaleX || 1
    const originalScaleY = obj.scaleY || 1
    const originalOriginX = obj.originX
    const originalOriginY = obj.originY

    // 속성 계산 - 스케일을 실제 크기로 변환
    const actualWidth = originalWidth * originalScaleX
    const actualHeight = originalHeight * originalScaleY

    // 중심점 계산 - 객체의 origin 고려
    let centerX = originalLeft
    let centerY = originalTop

    // originX, originY에 따라 중심점 조정
    if (originalOriginX === 'left') {
      centerX += actualWidth / 2
    } else if (originalOriginX === 'right') {
      centerX -= actualWidth / 2
    }

    if (originalOriginY === 'top') {
      centerY += actualHeight / 2
    } else if (originalOriginY === 'bottom') {
      centerY -= actualHeight / 2
    }

    // 임시 객체 생성 및 속성 업데이트
    obj.set({
      width: actualWidth,
      height: actualHeight,
      scaleX: 1,
      scaleY: 1,
      left: centerX,
      top: centerY,
      originX: 'center',
      originY: 'center'
    })

    // 좌표 업데이트
    obj.setCoords()
  }

  // 캔버스 렌더링
  canvas.renderAll()

  return Promise.resolve()
}
