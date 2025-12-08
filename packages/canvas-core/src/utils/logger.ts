/**
 * 프론트엔드 Logger
 *
 * 환경별 로그 레벨:
 * - development: debug (모든 로그)
 * - staging: warn (warn, error)
 * - production: error (error만)
 *
 * 사용법:
 * ```typescript
 * import { createLogger } from '@storige/canvas-core'
 *
 * const logger = createLogger('MyComponent')
 * logger.debug('디버그 메시지', { data })
 * logger.info('정보 메시지')
 * logger.warn('경고 메시지')
 * logger.error('에러 메시지', error)
 * ```
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none'

export interface LoggerConfig {
  level?: LogLevel
  timestamp?: boolean
  colorize?: boolean
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
}

// 전역 로그 레벨 저장소
let globalLogLevel: LogLevel | null = null

// 로그 필터 (특정 컨텍스트만 출력)
let logFilter: string[] | null = null

/**
 * 전역 로그 레벨 설정 (런타임에 변경 가능)
 * @example setGlobalLogLevel('warn') // warn, error만 출력
 */
export function setGlobalLogLevel(level: LogLevel): void {
  globalLogLevel = level
  if (typeof window !== 'undefined') {
    ;(window as unknown as Record<string, unknown>).__LOG_LEVEL__ = level
  }
}

/**
 * 로그 필터 설정 (특정 컨텍스트만 출력)
 * @example setLogFilter(['HistoryPlugin', 'FontPlugin'])
 */
export function setLogFilter(contexts: string[] | null): void {
  logFilter = contexts
}

/**
 * 현재 로그 레벨 조회
 */
export function getGlobalLogLevel(): LogLevel | null {
  return globalLogLevel
}

class Logger {
  private context: string
  private config: Required<LoggerConfig>

  constructor(context: string, config?: LoggerConfig) {
    this.context = context
    this.config = {
      level: config?.level ?? this.getEnvLogLevel(),
      timestamp: config?.timestamp ?? true,
      colorize: config?.colorize ?? true,
    }
  }

  /**
   * 환경별 기본 로그 레벨 결정
   */
  private getEnvLogLevel(): LogLevel {
    // 전역 설정이 있으면 우선 사용
    if (globalLogLevel) {
      return globalLogLevel
    }

    // window에 저장된 설정 확인
    if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__LOG_LEVEL__) {
      return (window as unknown as Record<string, unknown>).__LOG_LEVEL__ as LogLevel
    }

    // 환경별 기본값
    try {
      if (import.meta.env?.PROD) return 'error'
      if (import.meta.env?.MODE === 'staging') return 'warn'
    } catch {
      // import.meta.env가 없는 환경
    }

    return 'debug' // development 기본값
  }

  /**
   * 로그 출력 여부 결정
   */
  private shouldLog(level: LogLevel): boolean {
    // 필터 확인
    if (logFilter && !logFilter.includes(this.context)) {
      return false
    }

    const currentLevel = globalLogLevel ?? this.config.level
    return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]
  }

  /**
   * 한국 시간 포맷 (yyyy-MM-dd HH:mm:ss)
   */
  private getKoreanTimestamp(): string {
    const now = new Date()

    // 한국 시간대로 포맷팅
    const formatter = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })

    const parts = formatter.formatToParts(now)
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''

    return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`
  }

  /**
   * 로그 메시지 포맷팅
   */
  private formatMessage(level: LogLevel, message: string): string {
    const parts: string[] = []

    if (this.config.timestamp) {
      parts.push(`[${this.getKoreanTimestamp()}]`)
    }
    parts.push(`[${level.toUpperCase()}]`)
    parts.push(`[${this.context}]`)
    parts.push(message)

    return parts.join(' ')
  }

  /**
   * 콘솔 스타일 (colorize 옵션 활성화시)
   */
  private getStyle(level: LogLevel): string {
    if (!this.config.colorize) return ''

    const styles: Record<LogLevel, string> = {
      debug: 'color: #6b7280', // gray
      info: 'color: #3b82f6', // blue
      warn: 'color: #f59e0b', // amber
      error: 'color: #ef4444', // red
      none: '',
    }

    return styles[level]
  }

  /**
   * DEBUG 레벨 로그
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      if (this.config.colorize) {
        console.debug(`%c${this.formatMessage('debug', message)}`, this.getStyle('debug'), ...args)
      } else {
        console.debug(this.formatMessage('debug', message), ...args)
      }
    }
  }

  /**
   * INFO 레벨 로그
   */
  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      if (this.config.colorize) {
        console.info(`%c${this.formatMessage('info', message)}`, this.getStyle('info'), ...args)
      } else {
        console.info(this.formatMessage('info', message), ...args)
      }
    }
  }

  /**
   * WARN 레벨 로그
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      if (this.config.colorize) {
        console.warn(`%c${this.formatMessage('warn', message)}`, this.getStyle('warn'), ...args)
      } else {
        console.warn(this.formatMessage('warn', message), ...args)
      }
    }
  }

  /**
   * ERROR 레벨 로그
   */
  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      if (this.config.colorize) {
        console.error(`%c${this.formatMessage('error', message)}`, this.getStyle('error'), ...args)
      } else {
        console.error(this.formatMessage('error', message), ...args)
      }
    }
  }

  /**
   * 조건부 DEBUG 로그
   */
  debugIf(condition: boolean, message: string, ...args: unknown[]): void {
    if (condition) {
      this.debug(message, ...args)
    }
  }

  /**
   * 조건부 INFO 로그
   */
  infoIf(condition: boolean, message: string, ...args: unknown[]): void {
    if (condition) {
      this.info(message, ...args)
    }
  }

  /**
   * 성능 측정 시작
   */
  time(label: string): void {
    if (this.shouldLog('debug')) {
      console.time(`[${this.context}] ${label}`)
    }
  }

  /**
   * 성능 측정 종료
   */
  timeEnd(label: string): void {
    if (this.shouldLog('debug')) {
      console.timeEnd(`[${this.context}] ${label}`)
    }
  }

  /**
   * 로그 그룹 시작
   */
  group(label: string): void {
    if (this.shouldLog('debug')) {
      console.group(this.formatMessage('debug', label))
    }
  }

  /**
   * 로그 그룹 시작 (접힌 상태)
   */
  groupCollapsed(label: string): void {
    if (this.shouldLog('debug')) {
      console.groupCollapsed(this.formatMessage('debug', label))
    }
  }

  /**
   * 로그 그룹 종료
   */
  groupEnd(): void {
    if (this.shouldLog('debug')) {
      console.groupEnd()
    }
  }

  /**
   * 테이블 형태로 데이터 출력
   */
  table(data: unknown): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', 'Table:'))
      console.table(data)
    }
  }
}

// Logger 인스턴스 캐시 (동일 컨텍스트는 재사용)
const loggerRegistry = new Map<string, Logger>()

/**
 * Logger 인스턴스 생성 또는 캐시에서 반환
 * @param context 로그 컨텍스트 (컴포넌트/모듈 이름)
 * @param config 로거 설정 (설정 전달 시 새 인스턴스 생성)
 *
 * @example
 * const logger = createLogger('TextEffect')
 * logger.debug('초기화 시작')
 * logger.info('설정 완료', { radius: 100 })
 * logger.warn('deprecated 기능 사용')
 * logger.error('처리 실패', error)
 *
 * // 동일 컨텍스트는 같은 인스턴스 반환
 * const logger2 = createLogger('TextEffect')
 * console.log(logger === logger2) // true
 */
export function createLogger(context: string, config?: LoggerConfig): Logger {
  // config가 없고 캐시에 있으면 기존 인스턴스 반환
  if (!config && loggerRegistry.has(context)) {
    return loggerRegistry.get(context)!
  }

  const logger = new Logger(context, config)

  // config가 없는 경우만 캐싱 (기본 설정)
  if (!config) {
    loggerRegistry.set(context, logger)
  }

  return logger
}

/**
 * 캐시된 Logger 통계 조회 (디버깅용)
 */
export function getLoggerStats(): { count: number; contexts: string[] } {
  return {
    count: loggerRegistry.size,
    contexts: Array.from(loggerRegistry.keys()),
  }
}

/**
 * Logger 캐시 초기화 (테스트용)
 */
export function clearLoggerCache(): void {
  loggerRegistry.clear()
}

// 기본 logger export (컨텍스트 없이 사용)
export const logger = createLogger('App')
