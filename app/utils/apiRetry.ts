/**
 * API Retry Utility with Exponential Backoff
 * 
 * Handles transient failures gracefully for multi-user environments.
 * Uses exponential backoff with jitter to prevent thundering herd.
 */

export interface RetryOptions {
  maxRetries?: number          // Maximum number of retry attempts (default: 3)
  initialDelay?: number        // Initial delay in ms (default: 500)
  maxDelay?: number            // Maximum delay between retries in ms (default: 10000)
  factor?: number              // Exponential factor (default: 2)
  jitter?: boolean             // Add random jitter to prevent thundering herd (default: true)
  retryIf?: (error: any) => boolean  // Custom function to determine if retry should happen
}

export interface RetryResult<T> {
  data: T | null
  error: Error | null
  attempts: number
  retriedErrors: Error[]
}

// HTTP status codes that are typically transient and worth retrying
const RETRYABLE_STATUS_CODES = [
  408, // Request Timeout
  429, // Too Many Requests
  500, // Internal Server Error  
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
]

// Error messages that indicate transient issues
const RETRYABLE_ERROR_PATTERNS = [
  /network/i,
  /timeout/i,
  /econnreset/i,
  /econnrefused/i,
  /socket hang up/i,
  /fetch failed/i,
  /rate limit/i,
]

/**
 * Determine if an error is retryable
 */
export const isRetryableError = (error: any): boolean => {
  // Check HTTP status codes
  if (error?.status && RETRYABLE_STATUS_CODES.includes(error.status)) {
    return true
  }
  
  // Check error message patterns
  const message = error?.message || String(error)
  return RETRYABLE_ERROR_PATTERNS.some(pattern => pattern.test(message))
}

/**
 * Calculate delay with exponential backoff and optional jitter
 */
export const calculateDelay = (
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  factor: number,
  jitter: boolean
): number => {
  // Exponential backoff: initialDelay * factor^attempt
  let delay = Math.min(initialDelay * Math.pow(factor, attempt), maxDelay)
  
  // Add jitter (random 0-50% of delay) to prevent thundering herd
  if (jitter) {
    delay = delay + (Math.random() * delay * 0.5)
  }
  
  return Math.floor(delay)
}

/**
 * Sleep for a given number of milliseconds
 */
const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms))

/**
 * Execute an async operation with retry logic and exponential backoff
 * 
 * @example
 * ```ts
 * const result = await withRetry(async () => {
 *   return await supabase.from('shifts').update({ status: 'published' }).eq('id', shiftId)
 * })
 * 
 * if (result.error) {
 *   toast.error(`Failed after ${result.attempts} attempts: ${result.error.message}`)
 * } else {
 *   toast.success('Saved successfully')
 * }
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxRetries = 3,
    initialDelay = 500,
    maxDelay = 10000,
    factor = 2,
    jitter = true,
    retryIf = isRetryableError
  } = options

  const retriedErrors: Error[] = []
  let attempt = 0

  while (attempt <= maxRetries) {
    try {
      const result = await operation()
      
      // Handle Supabase-style responses with error property
      if (result && typeof result === 'object' && 'error' in result) {
        const supabaseResult = result as { data: any; error: any }
        if (supabaseResult.error) {
          // Check if this is a retryable error
          if (retryIf(supabaseResult.error) && attempt < maxRetries) {
            retriedErrors.push(supabaseResult.error)
            const delay = calculateDelay(attempt, initialDelay, maxDelay, factor, jitter)
            console.warn(`[Retry] Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${delay}ms...`, supabaseResult.error)
            await sleep(delay)
            attempt++
            continue
          }
          // Non-retryable or max retries exceeded
          return {
            data: null,
            error: new Error(supabaseResult.error.message || 'Unknown error'),
            attempts: attempt + 1,
            retriedErrors
          }
        }
        // Success
        return {
          data: supabaseResult.data,
          error: null,
          attempts: attempt + 1,
          retriedErrors
        }
      }
      
      // Regular success
      return {
        data: result,
        error: null,
        attempts: attempt + 1,
        retriedErrors
      }
    } catch (error: any) {
      // Check if we should retry
      if (retryIf(error) && attempt < maxRetries) {
        retriedErrors.push(error)
        const delay = calculateDelay(attempt, initialDelay, maxDelay, factor, jitter)
        console.warn(`[Retry] Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${delay}ms...`, error)
        await sleep(delay)
        attempt++
        continue
      }
      
      // Non-retryable or max retries exceeded
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
        attempts: attempt + 1,
        retriedErrors
      }
    }
  }

  // Should never reach here, but TypeScript needs it
  return {
    data: null,
    error: new Error('Max retries exceeded'),
    attempts: attempt + 1,
    retriedErrors
  }
}

export interface BatchOptions extends RetryOptions {
  /** Max number of items processed in parallel (default: 5) */
  concurrency?: number
}

/**
 * Batch operations with individual retry logic and concurrency control.
 * Useful for bulk updates where some may fail due to conflicts.
 *
 * Items are processed in chunks of `concurrency` size using
 * `Promise.allSettled`, each individual item retried via `withRetry`.
 * 
 * @example
 * ```ts
 * const results = await batchWithRetry(
 *   shiftIds,
 *   async (id) => supabase.from('shifts').update({ status: 'published' }).eq('id', id),
 *   { concurrency: 10 }
 * )
 * 
 * const failed = results.filter(r => r.result.error)
 * if (failed.length > 0) {
 *   toast.warning(`${failed.length} shifts failed to update`)
 * }
 * ```
 */
export async function batchWithRetry<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  options: BatchOptions = {}
): Promise<{ item: T; result: RetryResult<R> }[]> {
  const { concurrency = 5, ...retryOptions } = options
  const results: { item: T; result: RetryResult<R> }[] = []

  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency)
    const settled = await Promise.allSettled(
      chunk.map(async (item) => ({
        item,
        result: await withRetry(() => operation(item), retryOptions)
      }))
    )

    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        results.push(outcome.value)
      } else {
        // Should not happen since withRetry catches errors, but handle defensively
        results.push({
          item: chunk[settled.indexOf(outcome)],
          result: {
            data: null,
            error: outcome.reason instanceof Error ? outcome.reason : new Error(String(outcome.reason)),
            attempts: 1,
            retriedErrors: []
          }
        })
      }
    }
  }

  return results
}

/**
 * Optimistic locking conflict error
 */
export class VersionConflictError extends Error {
  constructor(
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly expectedVersion: number,
    public readonly actualVersion: number
  ) {
    super(`Version conflict on ${entityType} ${entityId}: expected ${expectedVersion}, found ${actualVersion}`)
    this.name = 'VersionConflictError'
  }
}

/**
 * Check if error is a version conflict (optimistic locking failure)
 */
export const isVersionConflict = (error: any): boolean => {
  return error instanceof VersionConflictError ||
    error?.code === 'PGRST116' || // No rows returned from update with version check
    /version.*conflict/i.test(error?.message || '') ||
    /row was updated/i.test(error?.message || '')
}
