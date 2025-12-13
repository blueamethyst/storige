import React from 'react'
import { useSaveStore, getSaveStatusText, getSaveStatusColor, type SaveStatus } from '@/stores/useSaveStore'

interface AutoSaveIndicatorProps {
  className?: string
}

/**
 * 자동 저장 상태 표시 컴포넌트
 */
export function AutoSaveIndicator({ className = '' }: AutoSaveIndicatorProps) {
  const status = useSaveStore((state) => state.status)
  const lastSavedAt = useSaveStore((state) => state.lastSavedAt)
  const isOnline = useSaveStore((state) => state.isOnline)
  const hasLocalBackup = useSaveStore((state) => state.hasLocalBackup)
  const error = useSaveStore((state) => state.error)

  const statusText = getSaveStatusText(status)
  const statusColor = getSaveStatusColor(status)

  const formatTime = (date: Date | null): string => {
    if (!date) return ''
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) {
      return '방금 전'
    } else if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000)
      return `${minutes}분 전`
    } else {
      return date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    }
  }

  return (
    <div className={`flex items-center gap-2 text-xs ${className}`}>
      {/* 상태 아이콘 */}
      <StatusIcon status={status} />

      {/* 상태 텍스트 */}
      <span className={statusColor}>{statusText}</span>

      {/* 마지막 저장 시간 */}
      {status === 'saved' && lastSavedAt && (
        <span className="text-gray-400">({formatTime(lastSavedAt)})</span>
      )}

      {/* 오프라인 표시 */}
      {!isOnline && (
        <span className="text-orange-500 ml-1" title="오프라인 상태입니다">
          <svg className="w-3 h-3 inline-block" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
              clipRule="evenodd"
            />
            <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.742L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
          </svg>
        </span>
      )}

      {/* 로컬 백업 표시 */}
      {hasLocalBackup && (
        <span
          className="text-yellow-500 ml-1"
          title="로컬에 백업이 저장되어 있습니다"
        >
          <svg className="w-3 h-3 inline-block" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
            <path
              fillRule="evenodd"
              d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      )}

      {/* 에러 메시지 (툴팁) */}
      {error && (
        <span className="text-red-500 cursor-help" title={error}>
          <svg className="w-3 h-3 inline-block" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      )}
    </div>
  )
}

/**
 * 상태 아이콘 컴포넌트
 */
function StatusIcon({ status }: { status: SaveStatus }) {
  switch (status) {
    case 'saving':
      return (
        <svg
          className="w-3 h-3 animate-spin text-blue-500"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )
    case 'saved':
      return (
        <svg
          className="w-3 h-3 text-green-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      )
    case 'failed':
      return (
        <svg
          className="w-3 h-3 text-red-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      )
    case 'unsaved':
      return (
        <svg
          className="w-3 h-3 text-yellow-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
            clipRule="evenodd"
          />
        </svg>
      )
    case 'offline':
      return (
        <svg
          className="w-3 h-3 text-gray-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
            clipRule="evenodd"
          />
          <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.742L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
        </svg>
      )
    default:
      return null
  }
}

export default AutoSaveIndicator
