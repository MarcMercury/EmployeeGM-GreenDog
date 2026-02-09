/**
 * Sentry Server Utils
 * Server-side error tracking for API routes
 */
import * as Sentry from '@sentry/node'

const config = useRuntimeConfig()

// Initialize Sentry for server-side
if (config.sentryDsn) {
  Sentry.init({
    dsn: config.sentryDsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
    
    // Server-specific settings
    integrations: [
      Sentry.httpIntegration({ tracing: true }),
    ],
  })
}

/**
 * Capture an exception with optional context
 */
export function captureException(error: Error | unknown, context?: Record<string, any>) {
  if (config.sentryDsn) {
    Sentry.captureException(error, {
      extra: context,
    })
  }
  // Always log to console for debugging
  logger.error('Server Error', error instanceof Error ? error : null, 'Sentry', context)
}

/**
 * Capture a message for non-error events
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (config.sentryDsn) {
    Sentry.captureMessage(message, level)
  }
  logger.info(message, `Sentry ${level}`)
}

/**
 * Set user context for subsequent events
 */
export function setUser(user: { id: string; email?: string }) {
  if (config.sentryDsn) {
    Sentry.setUser(user)
  }
}

/**
 * Add breadcrumb for tracing
 */
export function addBreadcrumb(breadcrumb: {
  message: string
  category?: string
  level?: 'debug' | 'info' | 'warning' | 'error'
  data?: Record<string, any>
}) {
  if (config.sentryDsn) {
    Sentry.addBreadcrumb(breadcrumb)
  }
}

export { Sentry }
