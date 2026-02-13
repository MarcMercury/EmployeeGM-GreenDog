/**
 * Sentry Client Plugin
 * Initializes Sentry for client-side error tracking
 */
import * as Sentry from '@sentry/vue'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const router = useRouter()
  
  // Only initialize if DSN is configured
  const dsn = config.public.sentryDsn
  if (!dsn) {
    console.log('[Sentry] No DSN configured, skipping initialization')
    return
  }

  Sentry.init({
    app: nuxtApp.vueApp,
    dsn,
    environment: process.env.NODE_ENV || 'development',
    
    // Performance monitoring
    tracesSampleRate: 0.1, // 10% of transactions for performance monitoring
    
    // Session replay for debugging
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
    
    // Integrations
    integrations: [
      Sentry.browserTracingIntegration({ router }),
      Sentry.replayIntegration({
        maskAllText: true, // Mask sensitive data
        blockAllMedia: true,
      }),
    ],
    
    // Filter out common non-actionable errors
    ignoreErrors: [
      // Browser extensions
      /top\.GLOBALS/,
      /canvas.contentDocument/,
      // Network errors
      'Network request failed',
      'Failed to fetch',
      'Load failed',
      // Cancelled requests
      'AbortError',
      'The operation was aborted',
      // Auth errors (expected during logout)
      'JWT expired',
      'Invalid JWT',
    ],
    
    // Before sending, add user context
    beforeSend(event) {
      // Add user info if available
      try {
        const authStore = useAuthStore()
        if (authStore.profile) {
          event.user = {
            id: authStore.profile.id,
            email: authStore.profile.email,
          }
        }
      } catch {
        // Auth store not available
      }
      return event
    },
  })

  // Add global error handler
  nuxtApp.vueApp.config.errorHandler = (error, instance, info) => {
    Sentry.captureException(error, {
      extra: {
        componentInfo: info,
        componentName: instance?.$options?.name || 'Unknown',
      },
    })
    console.error('[Vue Error]', error)
  }

  // Provide Sentry for use in components
  return {
    provide: {
      sentry: Sentry,
    },
  }
})
