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
 * UUID route param
 */
export const uuidParamSchema = z.object({
  id: uuidSchema
})

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

// ===================
// Marketplace Schemas
// ===================

export const gigCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required').max(5000),
  bounty_value: z.number().int().min(1, 'Bounty must be at least 1').max(10000),
  duration_minutes: z.number().int().min(5).max(480).default(60),
  flake_penalty: z.number().int().min(0).max(1000).default(0),
  category: z.string().min(1).max(100).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  icon: z.string().max(50).default('mdi-star'),
  max_claims: z.number().int().min(1).max(100).default(1),
  is_recurring: z.boolean().default(false),
})

export const gigUpdateSchema = gigCreateSchema.partial()

export const rewardCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  cost: z.number().int().min(1).max(100000),
  category: z.string().max(100).optional(),
  icon: z.string().max(50).optional(),
  stock_quantity: z.number().int().min(0).nullable().optional(),
  is_active: z.boolean().default(true),
  requires_approval: z.boolean().default(false),
})

export const rewardUpdateSchema = rewardCreateSchema.partial()

// ===================
// Compliance Schemas
// ===================

export const complianceResolveSchema = z.object({
  alertId: uuidSchema,
  notes: z.string().max(5000).optional(),
})

// ===================
// User Admin Schemas
// ===================

export const userPatchSchema = z.object({
  role: z.string().optional(),
  is_active: z.boolean().optional(),
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  phone: z.string().max(50).optional(),
})

export const userCreateSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  role: z.string().default('user'),
  profile_id: uuidSchema.optional(),
})

// ===================
// EzyVet Contact Schema
// ===================

export const ezyvetContactSchema = z.object({
  ezyvet_contact_code: z.string().min(1),
  first_name: z.string().max(200).optional().nullable(),
  last_name: z.string().max(200).optional().nullable(),
  email: z.string().max(300).optional().nullable(),
  phone_mobile: z.string().max(50).optional().nullable(),
  address_city: z.string().max(200).optional().nullable(),
  address_zip: z.string().max(20).optional().nullable(),
  division: z.string().max(200).optional().nullable(),
  referral_source: z.string().max(200).optional().nullable(),
  breed: z.string().max(200).optional().nullable(),
  department: z.string().max(200).optional().nullable(),
  revenue_ytd: z.coerce.number().min(0).max(10_000_000).default(0),
  is_active: z.boolean().default(true),
})

export const ezyvetUpsertSchema = z.object({
  contacts: z.array(ezyvetContactSchema).min(1, 'At least one contact required').max(10000, 'Maximum 10,000 contacts per batch'),
})

// ===================
// Intake Link Schema
// ===================

export const intakeLinkSchema = z.object({
  linkType: z.enum([
    'job_application',
    'student_enrollment',
    'externship_signup',
    'general_intake',
    'referral_partner',
    'event_registration'
  ]),
  prefillEmail: z.string().email().optional(),
  prefillFirstName: z.string().max(100).optional(),
  prefillLastName: z.string().max(100).optional(),
  targetPositionId: uuidSchema.optional(),
  targetDepartmentId: uuidSchema.optional(),
  targetLocationId: uuidSchema.optional(),
  targetEventId: uuidSchema.optional(),
  expiresInDays: z.number().int().min(1).max(365).default(7),
  internalNotes: z.string().max(5000).optional(),
  sendEmail: z.boolean().default(false),
})
