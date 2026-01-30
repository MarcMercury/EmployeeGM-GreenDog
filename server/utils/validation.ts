/**
 * Server-side Request Validation Utility
 * 
 * Provides consistent validation patterns for API routes using Zod
 */

import { z, ZodSchema, ZodError } from 'zod'
import { logger } from './logger'

/**
 * Validate request body against a Zod schema
 * Returns validated data or throws a formatted error
 */
export async function validateBody<T extends ZodSchema>(
  event: any,
  schema: T
): Promise<z.infer<T>> {
  const body = await readBody(event)
  
  try {
    return schema.parse(body)
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors = error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
        code: e.code
      }))

      logger.warn('[Validation] Request body validation failed', {
        path: event.path,
        errors: formattedErrors
      })

      throw createError({
        statusCode: 400,
        statusMessage: 'Validation Error',
        data: { errors: formattedErrors }
      })
    }
    throw error
  }
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery<T extends ZodSchema>(
  event: any,
  schema: T
): z.infer<T> {
  const query = getQuery(event)
  
  try {
    return schema.parse(query)
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors = error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
        code: e.code
      }))

      logger.warn('[Validation] Query validation failed', {
        path: event.path,
        errors: formattedErrors
      })

      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid Query Parameters',
        data: { errors: formattedErrors }
      })
    }
    throw error
  }
}

/**
 * Validate route params against a Zod schema
 */
export function validateParams<T extends ZodSchema>(
  event: any,
  schema: T
): z.infer<T> {
  const params = event.context.params || {}
  
  try {
    return schema.parse(params)
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors = error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
        code: e.code
      }))

      logger.warn('[Validation] Params validation failed', {
        path: event.path,
        errors: formattedErrors
      })

      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid Route Parameters',
        data: { errors: formattedErrors }
      })
    }
    throw error
  }
}

// ===================
// Common Schemas
// ===================

/**
 * UUID validation
 */
export const uuidSchema = z.string().uuid('Invalid UUID format')

/**
 * Pagination query params
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc')
})

/**
 * Date range query params
 */
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
}).refine(
  data => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate)
    }
    return true
  },
  { message: 'startDate must be before endDate' }
)

/**
 * Employee ID param
 */
export const employeeIdSchema = z.object({
  id: uuidSchema
})

/**
 * Search query
 */
export const searchSchema = z.object({
  q: z.string().min(1).max(100).optional(),
  ...paginationSchema.shape
})

/**
 * Employee create/update schema
 */
export const employeeSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  department_id: uuidSchema.optional(),
  position: z.string().optional(),
  hire_date: z.string().datetime().optional(),
  status: z.enum(['active', 'inactive', 'on_leave', 'terminated']).optional()
})

/**
 * Referral partner schema
 */
export const referralPartnerSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  zone: z.enum(['a', 'b', 'c', 'd', 'e']).optional(),
  tier: z.coerce.number().int().min(1).max(5).optional(),
  notes: z.string().optional()
})

/**
 * Schedule entry schema
 */
export const scheduleEntrySchema = z.object({
  employee_id: uuidSchema,
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  location_id: uuidSchema.optional(),
  notes: z.string().optional()
}).refine(
  data => new Date(data.start_time) < new Date(data.end_time),
  { message: 'start_time must be before end_time' }
)

// Export z for convenience
export { z }
