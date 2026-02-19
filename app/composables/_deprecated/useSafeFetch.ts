/**
 * useSafeFetch Composable
 * Wraps $fetch with consistent error handling, timeouts, and notifications
 */

interface SafeFetchOptions extends RequestInit {
  timeout?: number
  showToast?: boolean
  retries?: number
  retryDelay?: number
}

interface SafeFetchResult<T> {
  data: T | null
  error: Error | null
  status: number | null
}

/**
 * Execute a fetch with automatic error handling, timeouts, and retry
 */
export async function useSafeFetch<T = any>(
  url: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult<T>> {
  const {
    timeout = 30000, // 30 second default timeout
    showToast = true,
    retries = 0,
    retryDelay = 1000,
    ...fetchOptions
  } = options

  const toast = useToast()
  let lastError: Error | null = null
  let attempts = 0
  const maxAttempts = retries + 1

  while (attempts < maxAttempts) {
    attempts++
    
    try {
      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      try {
        const response = await $fetch<T>(url, {
          ...fetchOptions,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)
        
        return {
          data: response,
          error: null,
          status: 200,
        }
      } finally {
        clearTimeout(timeoutId)
      }
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check if it's a timeout
      if (lastError.name === 'AbortError') {
        lastError = new Error(`Request timeout after ${timeout}ms`)
      }

      // Don't retry on client errors (4xx)
      const status = (error as Record<string, unknown> & { response?: { status?: number }; statusCode?: number })?.response?.status || (error as Record<string, unknown> & { statusCode?: number })?.statusCode
      if (status && status >= 400 && status < 500) {
        break
      }

      // Wait before retrying
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempts))
      }
    }
  }

  // Extract error details
  const errorMessage = (lastError as Record<string, unknown> & { data?: { message?: string } })?.data?.message 
    || lastError?.message 
    || 'An unexpected error occurred'

  const statusCode = (lastError as Record<string, unknown> & { response?: { status?: number }; statusCode?: number })?.response?.status 
    || (lastError as Record<string, unknown> & { statusCode?: number })?.statusCode 
    || null

  // Show toast notification if enabled
  if (showToast) {
    toast.error(errorMessage)
  }

  return {
    data: null,
    error: lastError,
    status: statusCode,
  }
}

/**
 * Execute a fetch and throw on error (for use with try/catch)
 */
export async function useSafeFetchThrow<T = any>(
  url: string,
  options: SafeFetchOptions = {}
): Promise<T> {
  const result = await useSafeFetch<T>(url, { ...options, showToast: false })
  
  if (result.error) {
    throw result.error
  }
  
  return result.data as T
}

/**
 * POST request helper
 */
export function useSafePost<T = unknown>(
  url: string,
  body: unknown,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult<T>> {
  return useSafeFetch<T>(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })
}

/**
 * PUT request helper
 */
export function useSafePut<T = unknown>(
  url: string,
  body: unknown,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult<T>> {
  return useSafeFetch<T>(url, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })
}

/**
 * DELETE request helper
 */
export function useSafeDelete<T = any>(
  url: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult<T>> {
  return useSafeFetch<T>(url, {
    method: 'DELETE',
    ...options,
  })
}
