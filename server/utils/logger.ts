/**
 * Structured Logger
 * JSON-structured, level-filtered logging for Vercel serverless environment.
 * All server endpoints should use `logger.*` instead of raw `console.*`.
 *
 * LOG_LEVEL env var controls minimum level (default: 'info' in production, 'debug' in dev).
 * Sensitive fields (email, token, password, cookie) are automatically redacted.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }

function getMinLevel(): number {
  const envLevel = (process.env.LOG_LEVEL ?? '').toLowerCase() as LogLevel
  if (envLevel in LOG_LEVEL_ORDER) return LOG_LEVEL_ORDER[envLevel]
  return process.env.NODE_ENV === 'development' ? LOG_LEVEL_ORDER.debug : LOG_LEVEL_ORDER.info
}

const SENSITIVE_KEYS = new Set(['email', 'password', 'token', 'cookie', 'secret', 'authorization', 'access_token', 'refresh_token'])

function redactValue(key: string, value: unknown): unknown {
  if (typeof key === 'string' && SENSITIVE_KEYS.has(key.toLowerCase())) {
    return typeof value === 'string' ? `[REDACTED:${value.length}chars]` : '[REDACTED]'
  }
  return value
}

function redactData(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    result[key] = redactValue(key, value)
  }
  return result
}

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: string
  data?: Record<string, unknown>
  error?: {
    message: string
    stack?: string
    code?: string
  }
}

function formatLog(entry: LogEntry): string {
  return JSON.stringify(entry)
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_ORDER[level] >= getMinLevel()
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: string,
  data?: Record<string, unknown>,
  error?: Error
): LogEntry {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
  }

  if (context) entry.context = context
  if (data) entry.data = redactData(data)
  if (error) {
    entry.error = {
      message: error.message,
      stack: error.stack,
      code: (error as Record<string, unknown>).code as string | undefined,
    }
  }

  return entry
}

/**
 * Server-side structured logger.
 *
 * Usage:
 *   logger.info('User created', 'admin-users', { userId: '123' })
 *   logger.error('Insert failed', error, 'admin-users', { userId: '123' })
 *   logger.cron('credential-expiry', 'completed', { checked: 42, expired: 3 })
 */
export const logger = {
  /**
   * Debug level - verbose logging, suppressed in production by default
   */
  debug(message: string, context?: string, data?: Record<string, unknown>) {
    if (!shouldLog('debug')) return
    const entry = createLogEntry('debug', message, context, data)
    console.log(formatLog(entry))
  },

  /**
   * Info level - standard operational logging
   */
  info(message: string, context?: string, data?: Record<string, unknown>) {
    if (!shouldLog('info')) return
    const entry = createLogEntry('info', message, context, data)
    console.log(formatLog(entry))
  },

  /**
   * Warning level - potential issues that don't break functionality
   */
  warn(message: string, context?: string, data?: Record<string, unknown>) {
    if (!shouldLog('warn')) return
    const entry = createLogEntry('warn', message, context, data)
    console.warn(formatLog(entry))
  },

  /**
   * Error level - actual errors with stack traces
   */
  error(message: string, error?: Error | unknown, context?: string, data?: Record<string, unknown>) {
    if (!shouldLog('error')) return
    const err = error instanceof Error ? error : new Error(String(error))
    const entry = createLogEntry('error', message, context, data, err)
    console.error(formatLog(entry))
  },

  /**
   * API request logging helper
   */
  api(method: string, path: string, status: number, durationMs?: number, userId?: string) {
    if (!shouldLog('info')) return
    const entry = createLogEntry('info', `${method} ${path}`, 'api', {
      method,
      path,
      status,
      durationMs,
      userId,
    })
    console.log(formatLog(entry))
  },

  /**
   * Database operation logging helper
   */
  db(operation: string, table: string, durationMs?: number, rowCount?: number) {
    if (!shouldLog('debug')) return
    const entry = createLogEntry('debug', `DB ${operation} on ${table}`, 'database', {
      operation,
      table,
      durationMs,
      rowCount,
    })
    console.log(formatLog(entry))
  },

  /**
   * Cron job logging helper
   */
  cron(jobName: string, status: 'started' | 'completed' | 'failed', data?: Record<string, unknown>) {
    const level: LogLevel = status === 'failed' ? 'error' : 'info'
    if (!shouldLog(level)) return
    const entry = createLogEntry(level, `Cron ${jobName} ${status}`, 'cron', data)
    if (level === 'error') {
      console.error(formatLog(entry))
    } else {
      console.log(formatLog(entry))
    }
  },
}
