/**
 * Structured Logger
 * Replaces console.log with structured, searchable logs
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: string
  data?: Record<string, any>
  error?: {
    message: string
    stack?: string
    code?: string
  }
}

function formatLog(entry: LogEntry): string {
  return JSON.stringify(entry)
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: string,
  data?: Record<string, any>,
  error?: Error
): LogEntry {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
  }

  if (context) entry.context = context
  if (data) entry.data = data
  if (error) {
    entry.error = {
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
    }
  }

  return entry
}

/**
 * Server-side structured logger
 */
export const logger = {
  /**
   * Debug level - verbose logging for development
   */
  debug(message: string, context?: string, data?: Record<string, any>) {
    if (process.env.NODE_ENV === 'development') {
      const entry = createLogEntry('debug', message, context, data)
      console.log(formatLog(entry))
    }
  },

  /**
   * Info level - standard operational logging
   */
  info(message: string, context?: string, data?: Record<string, any>) {
    const entry = createLogEntry('info', message, context, data)
    console.log(formatLog(entry))
  },

  /**
   * Warning level - potential issues that don't break functionality
   */
  warn(message: string, context?: string, data?: Record<string, any>) {
    const entry = createLogEntry('warn', message, context, data)
    console.warn(formatLog(entry))
  },

  /**
   * Error level - actual errors with stack traces
   */
  error(message: string, error?: Error | unknown, context?: string, data?: Record<string, any>) {
    const err = error instanceof Error ? error : new Error(String(error))
    const entry = createLogEntry('error', message, context, data, err)
    console.error(formatLog(entry))
  },

  /**
   * API request logging helper
   */
  api(method: string, path: string, status: number, durationMs?: number, userId?: string) {
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
  cron(jobName: string, status: 'started' | 'completed' | 'failed', data?: Record<string, any>) {
    const level = status === 'failed' ? 'error' : 'info'
    const entry = createLogEntry(level, `Cron ${jobName} ${status}`, 'cron', data)
    console.log(formatLog(entry))
  },
}
