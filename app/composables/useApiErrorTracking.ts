/**
 * API Error Tracking Middleware
 * Logs all API errors including 404s to help identify missing endpoints
 * 
 * This runs in the browser and reports failed API calls for debugging
 */

export const useApiErrorTracking = () => {
  const errors = ref<any[]>([])
  const endpoint404Errors = ref<Set<string>>(new Set())

  // Wrap fetch globally
  const originalFetch = fetch
  
  globalThis.fetch = async (resource: string | Request, init?: RequestInit) => {
    const startTime = Date.now()
    const response = await originalFetch.call(globalThis, resource, init)
    const duration = Date.now() - startTime
    
    // Track API calls
    if (typeof resource === 'string' && resource.includes('/api/')) {
      if (!response.ok) {
        const errorEntry = {
          timestamp: new Date().toISOString(),
          endpoint: resource,
          method: init?.method || 'GET',
          status: response.status,
          statusText: response.statusText,
          duration,
          body: init?.body ? JSON.stringify(init.body).substring(0, 200) : null,
        }
        
        errors.value.push(errorEntry)
        
        if (response.status === 404) {
          endpoint404Errors.value.add(resource)
          console.error(`🚨 API 404 Error: ${init?.method || 'GET'} ${resource}`)
        } else if (response.status >= 500) {
          console.error(`🚨 API Server Error: ${response.status} ${init?.method || 'GET'} ${resource}`)
        } else if (!response.ok) {
          console.warn(`⚠️  API Error: ${response.status} ${init?.method || 'GET'} ${resource}`)
        }
      }
    }
    
    return response
  }

  // Also track $fetch calls
  return {
    errors: computed(() => errors.value),
    endpoint404Errors: computed(() => Array.from(endpoint404Errors.value)),
    clear: () => {
      errors.value = []
      endpoint404Errors.value.clear()
    },
    report: () => {
      console.table(errors.value)
      return errors.value
    },
  }
}

// Report helper to send to server for logging
export const reportApiErrors = async (errors: any[]) => {
  try {
    await $fetch('/api/system/track-api-errors', {
      method: 'POST',
      body: { errors, timestamp: new Date().toISOString() }
    })
  } catch (err) {
    console.error('Failed to report API errors:', err)
  }
}
