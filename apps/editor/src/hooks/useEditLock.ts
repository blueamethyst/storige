import { useState, useEffect, useCallback, useRef } from 'react'
import { sessionsApi } from '@/api/sessions'
import { useEditorStore } from '@/stores/useEditorStore'

interface UseEditLockOptions {
  /**
   * 세션 ID
   */
  sessionId: string | null
  /**
   * 사용자 ID
   */
  userId: string | null
  /**
   * 하트비트 간격 (ms)
   */
  heartbeatInterval?: number
  /**
   * 잠금 획득 실패 시 읽기 전용 모드로 전환
   */
  fallbackToReadOnly?: boolean
  /**
   * 활성화 여부
   */
  enabled?: boolean
}

interface UseEditLockResult {
  /**
   * 현재 잠금 상태
   */
  isLocked: boolean
  /**
   * 잠금 소유자 ID
   */
  lockedBy: string | null
  /**
   * 잠금 획득 시간
   */
  lockedAt: Date | null
  /**
   * 현재 사용자가 잠금을 소유하고 있는지
   */
  isOwner: boolean
  /**
   * 읽기 전용 모드인지
   */
  isReadOnly: boolean
  /**
   * 잠금 로딩 중
   */
  isLoading: boolean
  /**
   * 잠금 에러
   */
  error: string | null
  /**
   * 잠금 획득 시도
   */
  acquireLock: () => Promise<boolean>
  /**
   * 잠금 해제
   */
  releaseLock: () => Promise<void>
  /**
   * 읽기 전용 모드로 전환
   */
  switchToReadOnly: () => void
}

/**
 * 편집 잠금 관리 훅
 * - 세션 편집 잠금 획득/해제
 * - 하트비트를 통한 잠금 유지
 * - 읽기 전용 모드 지원
 */
export function useEditLock({
  sessionId,
  userId,
  heartbeatInterval = 30000, // 30초
  fallbackToReadOnly = true,
  enabled = true,
}: UseEditLockOptions): UseEditLockResult {
  const [isLocked, setIsLocked] = useState(false)
  const [lockedBy, setLockedBy] = useState<string | null>(null)
  const [lockedAt, setLockedAt] = useState<Date | null>(null)
  const [isReadOnly, setIsReadOnly] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isOwner = lockedBy === userId && !!userId

  const setLock = useEditorStore((state) => state.setLock)

  /**
   * 잠금 획득
   */
  const acquireLock = useCallback(async (): Promise<boolean> => {
    if (!sessionId || !userId) {
      setError('세션 ID 또는 사용자 ID가 없습니다.')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      const session = await sessionsApi.acquireLock(sessionId, { userId })

      setIsLocked(!!session.lockedBy)
      setLockedBy(session.lockedBy || null)
      setLockedAt(session.lockedAt ? new Date(session.lockedAt) : null)
      setLock(session.lockedBy || null, session.lockedAt ? new Date(session.lockedAt) : null)

      const success = session.lockedBy === userId
      if (!success && fallbackToReadOnly) {
        setIsReadOnly(true)
      }

      return success
    } catch (err) {
      const message = err instanceof Error ? err.message : '잠금 획득에 실패했습니다.'
      setError(message)

      if (fallbackToReadOnly) {
        setIsReadOnly(true)
      }

      return false
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, userId, fallbackToReadOnly, setLock])

  /**
   * 잠금 해제
   */
  const releaseLock = useCallback(async (): Promise<void> => {
    if (!sessionId || !userId || !isOwner) {
      return
    }

    try {
      await sessionsApi.releaseLock(sessionId, userId)

      setIsLocked(false)
      setLockedBy(null)
      setLockedAt(null)
      setLock(null, null)
    } catch (err) {
      console.error('잠금 해제 실패:', err)
    }
  }, [sessionId, userId, isOwner, setLock])

  /**
   * 읽기 전용 모드로 전환
   */
  const switchToReadOnly = useCallback(() => {
    setIsReadOnly(true)
  }, [])

  /**
   * 하트비트 (잠금 갱신)
   */
  const sendHeartbeat = useCallback(async () => {
    if (!sessionId || !userId || !isOwner) {
      return
    }

    try {
      await sessionsApi.acquireLock(sessionId, { userId })
    } catch (err) {
      console.error('하트비트 실패:', err)
      // 잠금을 잃었을 수 있음
      setIsLocked(false)
      setLockedBy(null)
      setLockedAt(null)
      setLock(null, null)
      setError('편집 잠금이 해제되었습니다.')
    }
  }, [sessionId, userId, isOwner, setLock])

  /**
   * 초기 잠금 획득
   */
  useEffect(() => {
    if (!enabled || !sessionId || !userId) {
      return
    }

    acquireLock()

    return () => {
      // 컴포넌트 언마운트 시 잠금 해제
      releaseLock()
    }
  }, [enabled, sessionId, userId]) // acquireLock, releaseLock 의존성 제외 (무한루프 방지)

  /**
   * 하트비트 설정
   */
  useEffect(() => {
    if (!enabled || !isOwner || heartbeatInterval <= 0) {
      return
    }

    heartbeatRef.current = setInterval(sendHeartbeat, heartbeatInterval)

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
        heartbeatRef.current = null
      }
    }
  }, [enabled, isOwner, heartbeatInterval, sendHeartbeat])

  /**
   * 페이지 이탈 시 잠금 해제
   */
  useEffect(() => {
    if (!enabled || !isOwner) {
      return
    }

    const handleBeforeUnload = () => {
      // 동기적으로 잠금 해제 시도 (navigator.sendBeacon 사용 권장)
      if (sessionId && userId) {
        // sendBeacon은 페이지 이탈 시에도 안전하게 요청 전송
        const data = JSON.stringify({ userId })
        navigator.sendBeacon(`/api/editor/sessions/${sessionId}/lock/release`, data)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [enabled, isOwner, sessionId, userId])

  return {
    isLocked,
    lockedBy,
    lockedAt,
    isOwner,
    isReadOnly,
    isLoading,
    error,
    acquireLock,
    releaseLock,
    switchToReadOnly,
  }
}

/**
 * 잠금 상태를 포맷팅하는 유틸리티
 */
export function formatLockInfo(lockedBy: string | null, lockedAt: Date | null): string {
  if (!lockedBy || !lockedAt) {
    return '편집 가능'
  }

  const now = new Date()
  const diff = now.getTime() - lockedAt.getTime()
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) {
    return `${lockedBy}님이 방금 편집 시작`
  } else if (minutes < 60) {
    return `${lockedBy}님이 ${minutes}분 전 편집 시작`
  } else {
    return `${lockedBy}님이 편집 중`
  }
}
