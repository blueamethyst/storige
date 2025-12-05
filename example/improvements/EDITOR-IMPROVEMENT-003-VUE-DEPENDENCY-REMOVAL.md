# canvas-core Vue 의존성 제거 상세 설계

> **문서 버전**: 1.0
> **작성일**: 2025-12-03
> **상태**: 제안 (Proposal)
> **상위 문서**: [EDITOR-IMPROVEMENT.md](../EDITOR-IMPROVEMENT.md)

---

## 1. 현재 상태 분석

### 1.1 Vue 관련 의존성 현황

**파일**: `packages/canvas-core/package.json`

```json
{
  "dependencies": {
    "vue-demi": "^0.14.6",
    "@vueuse/core": "^10.7.0"
  }
}
```

| 패키지 | 설치 여부 | 실제 사용 | 상태 |
|--------|----------|----------|------|
| `vue-demi` | ✓ | ✗ 미사용 | 🔴 제거 가능 |
| `@vueuse/core` | ✓ | 2개 함수만 사용 | 🟡 대체 가능 |

### 1.2 @vueuse/core 사용 현황

**파일**: `packages/canvas-core/src/utils/utils.ts`

```typescript
import { useBase64, useClipboard } from '@vueuse/core'

// 사용 1: 파일 → Base64 변환
export function getImgStr(file: File | Blob): Promise<FileReader['result']> {
  return useBase64(file).promise.value
}

// 사용 2: 클립보드 복사
export async function clipboardText(source: string, options?: UseClipboardOptions<boolean>) {
  return await useClipboard({ source, ...options }).copy()
}
```

### 1.3 vue-demi 사용 현황

프로젝트 전체에서 `vue-demi` import가 **없음**:

```bash
# 검색 결과: 0건
grep -r "vue-demi" packages/canvas-core/src/
```

### 1.4 문제점 분석

#### 문제 1: 불필요한 의존성

```
vue-demi (146KB)
├── 사용되지 않음
└── package.json에만 존재

@vueuse/core (1.2MB)
├── 100+ 함수 포함
└── 실제 사용: 2개 함수
```

#### 문제 2: Framework 종속성

```
┌─────────────────────────────────────────────────────────────────┐
│                    현재 의존성 구조                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   @pf/canvas-core                                               │
│       │                                                         │
│       ├── fabric.js (캔버스 라이브러리)                         │
│       ├── opencv.js (이미지 처리)                               │
│       ├── jspdf (PDF 생성)                                      │
│       │                                                         │
│       └── @vueuse/core ← Vue 의존성                             │
│               │                                                 │
│               └── vue (peer dependency)                         │
│                                                                 │
│   문제: canvas-core가 Vue 없이는 사용 불가                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 문제 3: 번들 크기 영향

| 의존성 | 크기 (minified) | 실제 사용 |
|--------|-----------------|----------|
| vue-demi | ~5KB | 0% |
| @vueuse/core | ~50KB (tree-shaken) | <0.1% |

---

## 2. 개선 설계

### 2.1 목표 의존성 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                    개선된 의존성 구조                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   @pf/canvas-core                                               │
│       │                                                         │
│       ├── fabric.js (캔버스 라이브러리)                         │
│       ├── opencv.js (이미지 처리)                               │
│       ├── jspdf (PDF 생성)                                      │
│       │                                                         │
│       └── (Vue 의존성 제거됨)                                   │
│                                                                 │
│   결과: canvas-core가 Framework-agnostic                        │
│         → React, Svelte, Vanilla JS 등에서도 사용 가능          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 대체 구현

#### useBase64 대체

**현재 코드:**
```typescript
import { useBase64 } from '@vueuse/core'

export function getImgStr(file: File | Blob): Promise<FileReader['result']> {
  return useBase64(file).promise.value
}
```

**대체 코드:**
```typescript
/**
 * 파일을 Base64 문자열로 변환
 * @param file - 변환할 File 또는 Blob 객체
 * @returns Base64 인코딩된 data URL
 */
export function getImgStr(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('FileReader result is not a string'))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file as Base64'))
    }

    reader.readAsDataURL(file)
  })
}
```

#### useClipboard 대체

**현재 코드:**
```typescript
import { useClipboard } from '@vueuse/core'

export async function clipboardText(source: string, options?: UseClipboardOptions<boolean>) {
  return await useClipboard({ source, ...options }).copy()
}
```

**대체 코드:**
```typescript
/**
 * 텍스트를 클립보드에 복사
 * @param text - 복사할 텍스트
 * @returns 성공 여부
 */
export async function clipboardText(text: string): Promise<boolean> {
  try {
    // 현대 브라우저: Clipboard API 사용
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }

    // 폴백: execCommand 사용 (deprecated but widely supported)
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-9999px'
    textArea.style.top = '-9999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    const success = document.execCommand('copy')
    document.body.removeChild(textArea)

    return success
  } catch (error) {
    console.error('Failed to copy text to clipboard:', error)
    return false
  }
}
```

---

## 3. 구현 상세

### 3.1 파일 수정 목록

| 파일 | 수정 내용 |
|------|----------|
| `packages/canvas-core/package.json` | vue-demi, @vueuse/core 제거 |
| `packages/canvas-core/src/utils/utils.ts` | 대체 함수 구현 |

### 3.2 package.json 수정

**변경 전:**
```json
{
  "dependencies": {
    "vue-demi": "^0.14.6",
    "@vueuse/core": "^10.7.0",
    "fabric": "^5.3.0",
    // ... 기타
  }
}
```

**변경 후:**
```json
{
  "dependencies": {
    "fabric": "^5.3.0",
    // ... 기타 (vue 관련 제거)
  }
}
```

### 3.3 utils.ts 전체 수정

**파일**: `packages/canvas-core/src/utils/utils.ts`

```typescript
/**
 * 유틸리티 함수 모음
 * Framework-agnostic: Vue 의존성 없음
 */

/**
 * 파일을 Base64 문자열로 변환
 * @param file - 변환할 File 또는 Blob 객체
 * @returns Base64 인코딩된 data URL
 * @example
 * const base64 = await getImgStr(imageFile)
 * // "data:image/png;base64,iVBORw0KGgo..."
 */
export function getImgStr(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('FileReader result is not a string'))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file as Base64'))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * 텍스트를 클립보드에 복사
 * @param text - 복사할 텍스트
 * @returns 성공 여부
 * @example
 * const success = await clipboardText('Hello, World!')
 * if (success) console.log('Copied!')
 */
export async function clipboardText(text: string): Promise<boolean> {
  try {
    // 현대 브라우저: Clipboard API 사용
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }

    // 폴백: execCommand 사용
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-9999px'
    textArea.style.top = '-9999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    const success = document.execCommand('copy')
    document.body.removeChild(textArea)

    return success
  } catch (error) {
    console.error('Failed to copy text to clipboard:', error)
    return false
  }
}

// ... 기타 유틸리티 함수들 (기존 유지)
```

### 3.4 타입 정의 업데이트

**기존 타입 (제거):**
```typescript
import type { UseClipboardOptions } from '@vueuse/core'
```

**새 타입:**
```typescript
// 외부 타입 의존성 없음
// 함수 시그니처가 단순해짐
```

---

## 4. 테스트 계획

### 4.1 단위 테스트

**파일**: `packages/canvas-core/src/utils/utils.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { getImgStr, clipboardText } from './utils'

describe('getImgStr', () => {
  it('should convert Blob to Base64 string', async () => {
    const blob = new Blob(['test'], { type: 'text/plain' })
    const result = await getImgStr(blob)

    expect(result).toMatch(/^data:text\/plain;base64,/)
  })

  it('should convert image File to Base64 data URL', async () => {
    // 1x1 투명 PNG
    const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const binary = atob(base64Png)
    const array = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i)
    }
    const blob = new Blob([array], { type: 'image/png' })
    const file = new File([blob], 'test.png', { type: 'image/png' })

    const result = await getImgStr(file)

    expect(result).toMatch(/^data:image\/png;base64,/)
  })
})

describe('clipboardText', () => {
  it('should copy text to clipboard using Clipboard API', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText
      }
    })

    const result = await clipboardText('test text')

    expect(result).toBe(true)
    expect(mockWriteText).toHaveBeenCalledWith('test text')
  })

  it('should return false on clipboard error', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('Permission denied'))
      }
    })

    const result = await clipboardText('test text')

    expect(result).toBe(false)
  })
})
```

### 4.2 통합 테스트

```typescript
describe('Integration: Image Upload Flow', () => {
  it('should upload image and convert to Base64', async () => {
    // 이미지 업로드 시뮬레이션
    const imageInput = document.createElement('input')
    imageInput.type = 'file'

    // 파일 선택 시뮬레이션
    const file = new File([/* image data */], 'test.png', { type: 'image/png' })

    // getImgStr 호출
    const base64 = await getImgStr(file)

    // Canvas에 추가
    const canvas = new fabric.Canvas('test-canvas')
    fabric.Image.fromURL(base64, (img) => {
      canvas.add(img)
      expect(canvas.getObjects()).toHaveLength(1)
    })
  })
})
```

### 4.3 브라우저 호환성 테스트

| 브라우저 | Clipboard API | execCommand 폴백 |
|----------|--------------|-----------------|
| Chrome 66+ | ✓ | ✓ |
| Firefox 63+ | ✓ | ✓ |
| Safari 13.1+ | ✓ | ✓ |
| Edge 79+ | ✓ | ✓ |
| IE 11 | ✗ | ✓ |

---

## 5. 구현 계획

### Phase 1: 준비 (즉시)

| 작업 | 설명 | 예상 시간 |
|------|------|----------|
| vue-demi 제거 | package.json에서 삭제 | 5분 |
| 빌드 테스트 | 에러 없음 확인 | 10분 |

### Phase 2: 대체 구현 (1일)

| 작업 | 설명 | 예상 시간 |
|------|------|----------|
| getImgStr 재구현 | FileReader 기반 | 30분 |
| clipboardText 재구현 | Clipboard API + 폴백 | 1시간 |
| 타입 정의 업데이트 | 외부 타입 제거 | 15분 |

### Phase 3: 테스트 (1일)

| 작업 | 설명 | 예상 시간 |
|------|------|----------|
| 단위 테스트 작성 | 새 함수 테스트 | 2시간 |
| 통합 테스트 | 이미지 업로드 플로우 | 2시간 |
| 브라우저 테스트 | 크로스 브라우저 확인 | 2시간 |

### Phase 4: 정리

| 작업 | 설명 | 예상 시간 |
|------|------|----------|
| @vueuse/core 제거 | package.json에서 삭제 | 5분 |
| pnpm install | 의존성 정리 | 5분 |
| 번들 크기 확인 | 감소 확인 | 10분 |

---

## 6. 기대 효과

### 정량적 개선

| 지표 | 현재 | 개선 후 | 변화 |
|------|------|---------|------|
| node_modules 크기 | +1.4MB | -1.4MB | **-1.4MB** |
| 번들 크기 (gzip) | +15KB | -15KB | **-15KB** |
| 의존성 수 | 2개 추가 | 0개 | **-2개** |

### 정성적 개선

- **Framework-agnostic**: React, Svelte, Vanilla JS 등에서 사용 가능
- **유지보수 용이**: 외부 라이브러리 업데이트 영향 없음
- **명확한 코드**: 단순한 구현으로 디버깅 용이
- **테스트 용이**: 외부 의존성 없이 테스트 가능

---

## 7. 리스크 및 대응

| 리스크 | 영향 | 대응 방안 |
|--------|------|----------|
| Clipboard API 미지원 브라우저 | 복사 실패 | execCommand 폴백 구현 |
| FileReader 오류 처리 | 이미지 업로드 실패 | 에러 핸들링 강화 |
| 기존 코드 호환성 | 함수 시그니처 변경 | 기존 시그니처 유지 |

---

## 참고 자료

- MDN FileReader: https://developer.mozilla.org/en-US/docs/Web/API/FileReader
- MDN Clipboard API: https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API
- VueUse useBase64: https://vueuse.org/core/useBase64/
- VueUse useClipboard: https://vueuse.org/core/useClipboard/
