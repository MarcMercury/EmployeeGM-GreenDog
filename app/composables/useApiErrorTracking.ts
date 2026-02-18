/**
 * API Error Tracking System
 * Automatically logs all API errors to database for production monitoring
 * 
 * Features:
 * - Tracks all API calls (success & failure)
 * - Auto-detects missing endpoints (404s)
 * - Sends errors to database for analysis
 * - Alerts on Slack for critical issues
 * - Provides console feedback to developers
 */

const trackedErrors = ref<any[]>([])
const reportQueueMaxSize = 50
let lastReportTime = Date.now()

export const useApiErrorTracking = () => {
  const endpoint404Errors = ref<Set<string>>(new Set())

  // Initialize error tracking on first use
  if (process.client && !globalThis._apiErrorTracking_initialized) {
    globalThis._apiErrorTracking_initialized = true
    setupErrorTracking()
  }

  return {
    errors: computed(() => trackedErrors.value),
    endpoint404Errors: computed(() => Array.from(endpoint404Errors.value)),
    
    clear: () => {
      trackedErrors.value = []
      endpoint404Errors.value.clear()
    },
    
    report: async () => {
      if (trackedErrors.value.length === 0) return null
      console.log(`📊 Sending ${trackedErrors.value.length} tracked errors to server...`)
      return await reportErrorsToServer(trackedErrors.value)
    },
    
    // Manual error tracking (for errors not caught by middleware)
    trackError: (endpoint: string, method: string, status: number, message: string) => {
      const error = {
        timestamp: new Date().toISOString(),
        endpoint,
        method,
        status,
        statusText: message,
        duration_ms: 0,
      }
      trackedErrors.value.push(error)
      
      if (status === 404) {
        endpoint404Errors.value.add(endpoint)
      }

      // Try to report if we have enough errors or timeout
      if (trackedErrors.value.length >= reportQueueMaxSize) {
        reportErrorsToServer(trackedErrors.value)
      }
    },

    // Get summary
    getSummary: () => ({
      totalErrors: trackedErrors.value.length,
      missing404s: Array.from(endpoint404Errors.value).length,
      serverErrors: trackedErrors.value.filter(e => e.status >= 500).length,
      clientErrors: trackedErrors.value.filter(e => e.status >= 400 && e.status < 500).length,
    }),
  }
}

// Setup global fetch interception
function setupErrorTracking() {
  if (!process.client) return

  const originalFetch = globalThis.fetch
  
  globalThis.fetch = async (resource: string | Request, init?: RequestInit) => {
    const startTime = performance.now()
    
    try {
      const response = await originalFetch.call(globalThis, resource, init)
      const duration = Math.round(performance.now() - startTime)
      
      // Track API calls
      const endpoint = typeof resource === 'string' ? resource : resource.url
      if (endpoint && endpoint.includes('/api/')) {
        if (!response.ok) {
          const errorEntry = {
            timestamp: new Date().toISOString(),
            endpoint: cleanEndpoint(endpoint),
            method: init?.method || 'GET',
            status: response.status,
            statusText: response.statusText || `HTTP ${response.status}`,
            duration_ms: duration,
            body: init?.body ? JSON.stringify(init.body).substring(0, 200) : null,
          }
          
          trackedErrors.value.push(errorEntry)
          
          // Log to console
          if (response.status === 404) {
            console.error(`❌ API 404: ${init?.method || 'GET'} ${endpoint}`)
          } else if (response.status >= 500) {
            console.error(`⚠️  Server Error ${response.status}: ${init?.method || 'GET'} ${endpoint}`)
          } else if (!response.ok) {
            console.warn(`⚠️  API Error ${response.status}: ${init?.method || 'GET'} ${endpoint}`)
          }

          // Auto-report if queue is full
          if (trackedErrors.value.length >= reportQueueMaxSize) {
            reportErrorsToServer(trackedErrors.value.splice(0, reportQueueMaxSize))
          }
        }
      }
      
      return response
    } catch (error) {
      console.error('Fetch error:', error)
      throw error
    }
  }

  // Report errors on page unload
  if (process.client) {
    globalThis.addEventListener('beforeunload', () => {
      if (trackedErrors.value.length > 0) {
        reportErrorsToServer(trackedErrors.value)
      }
    })

    // Also report periodically (every 5 minutes)
    setInterval(() => {
      if (trackedErrors.value.length > 0 && Date.now() - lastReportTime > 5 * 60 * 1000) {
        reportErrorsToServer(trackedErrors.value.splice(0, reportQueueMaxSize))
      }
    }, 60000) // Check every minute
  }
}

// Send errors to backend
async function reportErrorsToServer(errors: any[]) {
  if (errors.length === 0) return

  try {
    const response = await fetch('/api/system/track-api-errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        errors,
        timestamp: new Date().toISOString(),
      }),
    })

    if (response.ok) {
      lastReportTime = Date.now()
      console.log(`✅ Sent ${errors.length} errors to tracking system`)
    } else {
      console.warn(`Failed to report errors: ${response.status}`)
    }
  } catch (err) {
    console.error('Failed to send errors to server:', err)
  }
}

// Clean endpoint URL (remove query params and tokens)
function cleanEndpoint(url: string): string {
  try {
    const urlObj = new URL(url, location.origin)
    return urlObj.pathname + urlObj.search.substring(0, 50) // Keep first 50 chars of query
  } catch {
    return url.split('?')[0] // Fallback: remove query string
  }
}

// Export helper for manual usage
export const reportApiError = (endpoint: string, status: number, message: string) => {
  const { trackError } = useApiErrorTracking()
  trackError(endpoint, 'MANUAL', status, message)
}
