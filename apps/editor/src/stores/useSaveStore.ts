import { create } from 'zustand'

/**
 * 저장 상태 관리
 * - 자동저장 상태
 * - 로컬 임시저장
 * - 네트워크 상태
 */

export type SaveStatus = 'saved' | 'saving' | 'failed' | 'unsaved' | 'offline'

interface SaveState {
  // 저장 상태
  status: SaveStatus
  lastSavedAt: Date | null
  lastModifiedAt: Date | null

  // 에러
  error: string | null
  retryCount: number
  maxRetries: number

  // 네트워크 상태
  isOnline: boolean

  // 자동저장 설정
  autoSaveEnabled: boolean
  autoSaveInterval: number // milliseconds

  // 더티 상태 (변경사항 있음)
  isDirty: boolean

  // 로컬 백업
  hasLocalBackup: boolean
  localBackupAt: Date | null
}

interface SaveActions {
  // 저장 상태 관리
  setSaving: () => void
  setSaved: () => void
  setFailed: (error: string) => void
  setUnsaved: () => void

  // 더티 상태
  markDirty: () => void
  markClean: () => void

  // 네트워크 상태
  setOnline: (isOnline: boolean) => void

  // 자동저장 설정
  setAutoSaveEnabled: (enabled: boolean) => void
  setAutoSaveInterval: (interval: number) => void

  // 재시도
  incrementRetry: () => void
  resetRetry: () => void
  canRetry: () => boolean

  // 로컬 백업
  setLocalBackup: (hasBackup: boolean, backupAt?: Date) => void
  clearLocalBackup: () => void

  // 리셋
  reset: () => void
}

const initialState: SaveState = {
  status: 'saved',
  lastSavedAt: null,
  lastModifiedAt: null,
  error: null,
  retryCount: 0,
  maxRetries: 3,
  isOnline: true,
  autoSaveEnabled: true,
  autoSaveInterval: 30000, // 30초
  isDirty: false,
  hasLocalBackup: false,
  localBackupAt: null,
}

export const useSaveStore = create<SaveState & SaveActions>()((set, get) => ({
  ...initialState,

  // 저장 상태 관리
  setSaving: () => {
    set({
      status: 'saving',
      error: null,
    })
  },

  setSaved: () => {
    set({
      status: 'saved',
      lastSavedAt: new Date(),
      isDirty: false,
      error: null,
      retryCount: 0,
    })
  },

  setFailed: (error: string) => {
    set({
      status: 'failed',
      error,
    })
  },

  setUnsaved: () => {
    set({
      status: 'unsaved',
      lastModifiedAt: new Date(),
      isDirty: true,
    })
  },

  // 더티 상태
  markDirty: () => {
    set({
      isDirty: true,
      lastModifiedAt: new Date(),
      status: 'unsaved',
    })
  },

  markClean: () => {
    set({
      isDirty: false,
    })
  },

  // 네트워크 상태
  setOnline: (isOnline: boolean) => {
    set({
      isOnline,
      status: isOnline ? get().status : 'offline',
    })
  },

  // 자동저장 설정
  setAutoSaveEnabled: (enabled: boolean) => {
    set({ autoSaveEnabled: enabled })
  },

  setAutoSaveInterval: (interval: number) => {
    set({ autoSaveInterval: interval })
  },

  // 재시도
  incrementRetry: () => {
    set((state) => ({
      retryCount: state.retryCount + 1,
    }))
  },

  resetRetry: () => {
    set({ retryCount: 0 })
  },

  canRetry: () => {
    const { retryCount, maxRetries } = get()
    return retryCount < maxRetries
  },

  // 로컬 백업
  setLocalBackup: (hasBackup: boolean, backupAt?: Date) => {
    set({
      hasLocalBackup: hasBackup,
      localBackupAt: backupAt || new Date(),
    })
  },

  clearLocalBackup: () => {
    set({
      hasLocalBackup: false,
      localBackupAt: null,
    })
  },

  // 리셋
  reset: () => {
    set(initialState)
  },
}))

// Selector hooks
export const useSaveStatus = () => useSaveStore((state) => state.status)
export const useIsDirty = () => useSaveStore((state) => state.isDirty)
export const useIsOnline = () => useSaveStore((state) => state.isOnline)
export const useLastSavedAt = () => useSaveStore((state) => state.lastSavedAt)
export const useSaveError = () => useSaveStore((state) => state.error)

// 저장 상태 텍스트 헬퍼
export const getSaveStatusText = (status: SaveStatus): string => {
  switch (status) {
    case 'saved':
      return '저장됨'
    case 'saving':
      return '저장 중...'
    case 'failed':
      return '저장 실패'
    case 'unsaved':
      return '저장되지 않음'
    case 'offline':
      return '오프라인'
    default:
      return ''
  }
}

// 저장 상태 색상 헬퍼
export const getSaveStatusColor = (status: SaveStatus): string => {
  switch (status) {
    case 'saved':
      return 'text-green-600'
    case 'saving':
      return 'text-blue-600'
    case 'failed':
      return 'text-red-600'
    case 'unsaved':
      return 'text-yellow-600'
    case 'offline':
      return 'text-gray-600'
    default:
      return ''
  }
}
