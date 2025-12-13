import { v4 as uuid } from 'uuid'
import { fabric } from 'fabric'

/**
 * File/Blob을 Base64 문자열로 변환합니다.
 * @param file 변환할 File 또는 Blob
 * @returns Base64 인코딩된 문자열을 반환하는 Promise
 */
export function getImgStr(file: File | Blob): Promise<string | ArrayBuffer | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export async function selectFiles(options: {
  accept?: string
  capture?: string
  multiple?: boolean
}): Promise<FileList | null> {
  return new Promise((resolve, reject) => {
    try {
      // input[type="file"] 동적으로 생성
      const input = document.createElement('input')
      input.type = 'file'

      // 옵션 처리
      if (options.accept) {
        input.accept = options.accept // 파일 형식 지정
      }
      if (options.multiple) {
        input.multiple = options.multiple // 다중 파일 선택 허용
      }

      let resolved = false
      let focusTimeout: ReturnType<typeof setTimeout> | null = null

      const cleanup = () => {
        window.removeEventListener('focus', handleFocus)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        if (focusTimeout) {
          clearTimeout(focusTimeout)
          focusTimeout = null
        }
      }

      const resolveOnce = (files: FileList | null) => {
        if (!resolved) {
          resolved = true
          cleanup()
          resolve(files)
        }
      }

      // 취소 시 null 반환 (reject 대신 resolve로 처리하여 finally 블록이 정상 실행되도록 함)
      input.addEventListener('cancel', () => {
        console.log('File selection canceled (cancel event)')
        resolveOnce(null)
      })

      // 파일 선택이 완료되었을 때 실행
      input.onchange = (event: Event) => {
        const target = event.target as HTMLInputElement
        const files = target.files

        console.log('files', files)
        if (files && files.length > 0) {
          resolveOnce(files) // 파일이 선택되면 resolve로 FileList 반환
        } else {
          resolveOnce(null) // 파일 선택이 취소되면 null 반환
        }
      }

      // 파일 선택을 취소하거나 문제가 있을 때 reject 처리
      input.onerror = () => {
        cleanup()
        reject(new Error('File selection failed'))
      }

      // 파일 다이얼로그가 닫힐 때 window focus 이벤트로 감지 (cancel 이벤트 폴백)
      const handleFocus = () => {
        // 약간의 지연 후 체크 (change 이벤트가 먼저 처리되도록)
        if (focusTimeout) clearTimeout(focusTimeout)
        focusTimeout = setTimeout(() => {
          if (!resolved) {
            console.log('File selection canceled (focus fallback)')
            resolveOnce(null)
          }
        }, 300)
      }

      // visibilitychange 이벤트도 폴백으로 사용 (일부 브라우저/환경에서 필요)
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          if (focusTimeout) clearTimeout(focusTimeout)
          focusTimeout = setTimeout(() => {
            if (!resolved) {
              console.log('File selection canceled (visibility fallback)')
              resolveOnce(null)
            }
          }, 300)
        }
      }

      // 파일 다이얼로그가 열리면 window가 blur됨, 닫히면 focus됨
      window.addEventListener('focus', handleFocus)
      document.addEventListener('visibilitychange', handleVisibilityChange)

      // 파일 선택 대화 상자 열기
      input.click()
    } catch (error) {
      reject(error)
    }
  })
}

export function getImgSrc(str: string | ArrayBuffer | null): string {
  let src = ''
  if (typeof str === 'string') {
    src = str
  } else if (str instanceof ArrayBuffer) {
    const blob = new Blob([new Uint8Array(str)], { type: 'image/png' })
    src = URL.createObjectURL(blob)
  }
  return src
}

export function downFile(fileStr: string, fileType: string, fileName?: string) {
  const anchorEl = document.createElement('a')
  anchorEl.href = fileStr
  anchorEl.download = `${fileName || uuid()}.${fileType}`
  document.body.appendChild(anchorEl) // required for firefox
  anchorEl.click()
  anchorEl.remove()
}

export function shiftAngle(start: fabric.Point, end: fabric.Point) {
  const startX = start.x
  const startY = start.y
  const x2 = end.x - startX
  const y2 = end.y - startY
  const r = Math.sqrt(x2 * x2 + y2 * y2)
  let angle = (Math.atan2(y2, x2) / Math.PI) * 180
  angle = ~~(((angle + 7.5) % 360) / 15) * 15

  const cosX = r * Math.cos((angle * Math.PI) / 180)
  const sinX = r * Math.sin((angle * Math.PI) / 180)

  return {
    x: cosX + startX,
    y: sinX + startY
  }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      resolve(reader.result as string)
    })
    reader.readAsDataURL(blob)
  })
}

/**
 * 텍스트를 클립보드에 복사합니다.
 * @param source 복사할 텍스트
 * @returns 복사 성공 여부를 반환하는 Promise
 */
export async function clipboardText(source: string): Promise<void> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(source)
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = source
    textArea.style.position = 'fixed'
    textArea.style.left = '-9999px'
    textArea.style.top = '-9999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    try {
      document.execCommand('copy')
    } finally {
      document.body.removeChild(textArea)
    }
  }
}

/**
 * SVG 파일을 FabricJS 객체로 로드하는 함수
 * @param file SVG 파일
 * @returns Promise<fabric.Object> 로드된 SVG 객체
 */
export const loadSVGFromFile = (file: File): Promise<fabric.Object> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const svgData = e.target?.result as string

      // SVG 데이터를 FabricJS 객체로 변환
      fabric.loadSVGFromString(svgData, (objects, options) => {
        if (!objects || objects.length === 0) {
          reject(new Error('SVG 파일을 로드할 수 없습니다.'))
          return
        }

        const svgObject = fabric.util.groupSVGElements(objects, {
          ...options,
          id: uuid(),
          left: 0,
          top: 0,
          originX: 'center',
          originY: 'center'
        })

        resolve(svgObject)
      })
    }

    reader.onerror = () => {
      reject(new Error('파일을 읽는 중 오류가 발생했습니다.'))
    }

    reader.readAsText(file)
  })
}

/**
 * 로컬 파일을 SVG 객체로 로드하고 캔버스에 추가하는 함수
 * @param canvas FabricJS 캔버스
 * @param file SVG 파일
 * @returns Promise<fabric.Object> 추가된 SVG 객체
 */
export const addSVGToCanvas = async (canvas: fabric.Canvas, file: File): Promise<fabric.Object> => {
  try {
    // 파일 확장자 확인
    const fileExtension = file.name.split('.').pop()?.toLowerCase()

    if (fileExtension !== 'svg') {
      throw new Error('SVG 파일만 지원합니다.')
    }

    // SVG 파일 로드
    const svgObject = await loadSVGFromFile(file)

    // 워크스페이스 찾기
    const workspace = canvas.getObjects().find((obj: fabric.Object) => obj.id === 'workspace')

    if (workspace) {
      // 워크스페이스 중앙에 배치
      const center = workspace.getCenterPoint()
      svgObject.set({
        left: center.x,
        top: center.y
      })

      // 워크스페이스 크기에 맞게 조정
      const scale = Math.min(
        (workspace.width! * 0.8) / svgObject.width!,
        (workspace.height! * 0.8) / svgObject.height!
      )

      svgObject.scale(scale)
    }

    // 캔버스에 추가
    canvas.add(svgObject)
    canvas.setActiveObject(svgObject)
    canvas.renderAll()

    return svgObject
  } catch (error) {
    console.error('SVG 로드 오류:', error)
    throw error
  }
}
