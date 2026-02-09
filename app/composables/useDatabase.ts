/**
 * Database Operations Composable
 * 
 * Provides a consistent, robust API for all database CRUD operations.
 * Features:
 * - Automatic retry with exponential backoff for transient failures
 * - Consistent error handling and user feedback via toast
 * - Proper loading state management
 * - Detailed error logging for debugging
 * 
 * Usage:
 *   const db = useDatabase()
 *   
 *   // Insert with automatic error handling
 *   const result = await db.insert('employees', { name: 'John' })
 *   
 *   // Update with custom success message
 *   await db.update('employees', { name: 'Jane' }, { id: employeeId }, { successMessage: 'Employee updated!' })
 *   
 *   // Delete with confirmation
 *   await db.delete('shifts', { id: shiftId })
 */

import { withRetry, type RetryOptions } from '~/utils/apiRetry'

export interface DbOperationOptions {
  successMessage?: string | false  // Custom success message, false to suppress
  errorMessage?: string            // Custom error prefix
  showToast?: boolean              // Whether to show toast (default: true)
  retry?: boolean | RetryOptions   // Retry options (default: true with standard settings)
  silent?: boolean                 // Suppress all notifications (default: false)
}

export interface DbResult<T = any> {
  data: T | null
  error: Error | null
  success: boolean
}

// Common RLS/constraint error patterns and user-friendly messages
const ERROR_MESSAGES: Record<string, string> = {
  'row-level security': 'You don\'t have permission to perform this action',
  'violates row-level security policy': 'You don\'t have permission to perform this action',
  'violates foreign key constraint': 'This record is linked to other data and cannot be modified',
  'violates unique constraint': 'A record with this value already exists',
  'violates check constraint': 'The data doesn\'t meet the required format',
  'violates not-null constraint': 'Required fields are missing',
  'duplicate key': 'This record already exists',
  'JWT expired': 'Your session has expired. Please log in again',
  'invalid input syntax': 'Invalid data format',
  'connection refused': 'Unable to connect to the database. Please try again',
  'network': 'Network error. Please check your connection',
  'timeout': 'Request timed out. Please try again',
}

/**
 * Get user-friendly error message from database error
 */
const getFriendlyError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error)
  
  // Check for known error patterns
  for (const [pattern, friendlyMessage] of Object.entries(ERROR_MESSAGES)) {
    if (message.toLowerCase().includes(pattern.toLowerCase())) {
      return friendlyMessage
    }
  }
  
  // Return original message if no pattern matches
  return message
}

/**
 * Main database operations composable
 */
export const useDatabase = () => {
  const supabase = useSupabaseClient()
  const toast = useToast()
  
  const defaultRetryOptions: RetryOptions = {
    maxRetries: 3,
    initialDelay: 500,
    maxDelay: 5000,
    factor: 2,
    jitter: true
  }

  /**
   * Execute a database operation with retry and error handling
   */
  const executeOperation = async <T>(
    operation: () => Promise<{ data: T | null; error: any }>,
    options: DbOperationOptions = {}
  ): Promise<DbResult<T>> => {
    const {
      successMessage,
      errorMessage = 'Operation failed',
      showToast = true,
      retry = true,
      silent = false
    } = options

    try {
      let result: { data: T | null; error: any }

      if (retry) {
        const retryOpts = typeof retry === 'object' ? retry : defaultRetryOptions
        const retryResult = await withRetry(operation, retryOpts)
        
        if (retryResult.error) {
          throw retryResult.error
        }
        
        result = { data: retryResult.data as T, error: null }
      } else {
        result = await operation()
        
        if (result.error) {
          throw result.error
        }
      }

      // Success
      if (!silent && showToast && successMessage !== false) {
        const message = successMessage || 'Saved successfully'
        toast.success(message)
      }

      return {
        data: result.data,
        error: null,
        success: true
      }
    } catch (err: unknown) {
      const friendlyError = getFriendlyError(err)
      
      // Log detailed error for debugging
      console.error(`[Database] ${errorMessage}:`, {
        error: err,
        message: err instanceof Error ? err.message : String(err),
        code: (err as Record<string, unknown>)?.code,
        details: (err as Record<string, unknown>)?.details,
        hint: (err as Record<string, unknown>)?.hint
      })

      if (!silent && showToast) {
        toast.error(`${errorMessage}: ${friendlyError}`)
      }

      return {
        data: null,
        error: err instanceof Error ? err : new Error(friendlyError),
        success: false
      }
    }
  }

  /**
   * Insert a new record
   */
  const insert = async <T = any>(
    table: string,
    data: Record<string, any>,
    options: DbOperationOptions = {}
  ): Promise<DbResult<T>> => {
    return executeOperation<T>(
      () => supabase.from(table).insert(data).select().single(),
      {
        successMessage: options.successMessage ?? 'Created successfully',
        errorMessage: options.errorMessage ?? `Failed to create ${table.replace(/_/g, ' ')}`,
        ...options
      }
    )
  }

  /**
   * Insert multiple records
   */
  const insertMany = async <T = any>(
    table: string,
    data: Record<string, any>[],
    options: DbOperationOptions = {}
  ): Promise<DbResult<T[]>> => {
    return executeOperation<T[]>(
      () => supabase.from(table).insert(data).select(),
      {
        successMessage: options.successMessage ?? `Created ${data.length} records`,
        errorMessage: options.errorMessage ?? `Failed to create ${table.replace(/_/g, ' ')} records`,
        ...options
      }
    )
  }

  /**
   * Update existing record(s)
   */
  const update = async <T = any>(
    table: string,
    data: Record<string, any>,
    match: Record<string, any>,
    options: DbOperationOptions = {}
  ): Promise<DbResult<T>> => {
    return executeOperation<T>(
      () => {
        let query = supabase.from(table).update(data)
        
        // Apply all match conditions
        for (const [key, value] of Object.entries(match)) {
          query = query.eq(key, value)
        }
        
        return query.select().single()
      },
      {
        successMessage: options.successMessage ?? 'Updated successfully',
        errorMessage: options.errorMessage ?? `Failed to update ${table.replace(/_/g, ' ')}`,
        ...options
      }
    )
  }

  /**
   * Upsert (insert or update) a record
   */
  const upsert = async <T = any>(
    table: string,
    data: Record<string, any>,
    options: DbOperationOptions & { onConflict?: string } = {}
  ): Promise<DbResult<T>> => {
    const { onConflict, ...restOptions } = options
    
    return executeOperation<T>(
      () => supabase.from(table).upsert(data, { onConflict }).select().single(),
      {
        successMessage: restOptions.successMessage ?? 'Saved successfully',
        errorMessage: restOptions.errorMessage ?? `Failed to save ${table.replace(/_/g, ' ')}`,
        ...restOptions
      }
    )
  }

  /**
   * Delete record(s)
   */
  const remove = async (
    table: string,
    match: Record<string, any>,
    options: DbOperationOptions = {}
  ): Promise<DbResult<null>> => {
    return executeOperation<null>(
      async () => {
        let query = supabase.from(table).delete()
        
        // Apply all match conditions
        for (const [key, value] of Object.entries(match)) {
          query = query.eq(key, value)
        }
        
        const result = await query
        return { data: null, error: result.error }
      },
      {
        successMessage: options.successMessage ?? 'Deleted successfully',
        errorMessage: options.errorMessage ?? `Failed to delete ${table.replace(/_/g, ' ')}`,
        ...options
      }
    )
  }

  /**
   * Fetch single record
   */
  const fetchOne = async <T = any>(
    table: string,
    match: Record<string, any>,
    options: DbOperationOptions & { select?: string } = {}
  ): Promise<DbResult<T>> => {
    const { select = '*', ...restOptions } = options
    
    return executeOperation<T>(
      () => {
        let query = supabase.from(table).select(select)
        
        for (const [key, value] of Object.entries(match)) {
          query = query.eq(key, value)
        }
        
        return query.single()
      },
      {
        showToast: false,  // Don't show toast for fetches
        errorMessage: restOptions.errorMessage ?? `Failed to load ${table.replace(/_/g, ' ')}`,
        ...restOptions
      }
    )
  }

  /**
   * Fetch multiple records
   */
  const fetchMany = async <T = any>(
    table: string,
    options: DbOperationOptions & { 
      select?: string
      match?: Record<string, any>
      order?: { column: string; ascending?: boolean }
      limit?: number
    } = {}
  ): Promise<DbResult<T[]>> => {
    const { select = '*', match, order, limit, ...restOptions } = options
    
    return executeOperation<T[]>(
      () => {
        let query = supabase.from(table).select(select)
        
        if (match) {
          for (const [key, value] of Object.entries(match)) {
            query = query.eq(key, value)
          }
        }
        
        if (order) {
          query = query.order(order.column, { ascending: order.ascending ?? true })
        }
        
        if (limit) {
          query = query.limit(limit)
        }
        
        return query
      },
      {
        showToast: false,  // Don't show toast for fetches
        errorMessage: restOptions.errorMessage ?? `Failed to load ${table.replace(/_/g, ' ')}`,
        ...restOptions
      }
    )
  }

  /**
   * Execute a raw RPC function
   */
  const rpc = async <T = any>(
    functionName: string,
    params: Record<string, any> = {},
    options: DbOperationOptions = {}
  ): Promise<DbResult<T>> => {
    return executeOperation<T>(
      () => supabase.rpc(functionName, params),
      {
        showToast: false,
        errorMessage: options.errorMessage ?? `Failed to execute ${functionName}`,
        ...options
      }
    )
  }

  return {
    insert,
    insertMany,
    update,
    upsert,
    remove,
    delete: remove,  // Alias
    fetchOne,
    fetchMany,
    rpc,
    executeOperation  // For custom operations
  }
}

/**
 * Shorthand for common save pattern (insert or update based on ID)
 */
export const useSaveRecord = () => {
  const db = useDatabase()

  return async <T = any>(
    table: string,
    data: Record<string, any>,
    idField = 'id',
    options: DbOperationOptions = {}
  ): Promise<DbResult<T>> => {
    const id = data[idField]
    
    if (id) {
      // Update existing
      const { [idField]: _, ...updateData } = data
      return db.update<T>(table, updateData, { [idField]: id }, options)
    } else {
      // Insert new
      const { [idField]: _, ...insertData } = data
      return db.insert<T>(table, insertData, options)
    }
  }
}
