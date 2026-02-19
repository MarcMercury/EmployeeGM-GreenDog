/**
 * Form Validation Composable with Zod Schemas
 * 
 * Provides pre-built validation schemas for common forms
 * with user-friendly error messages.
 */

import { z } from 'zod'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm, useField } from 'vee-validate'

// ===== REUSABLE FIELD SCHEMAS =====

export const emailSchema = z
  .string({ required_error: 'Email is required' })
  .min(1, 'Email is required')
  .email('Please enter a valid email address')

export const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(1, 'Password is required')
  .min(8, 'Password must be at least 8 characters')

export const nameSchema = z
  .string({ required_error: 'Name is required' })
  .min(1, 'Name is required')
  .max(100, 'Name is too long')

export const phoneSchema = z
  .string()
  .optional()
  .refine((val) => !val || /^[\d\s\-\+\(\)]+$/.test(val), {
    message: 'Please enter a valid phone number'
  })

export const requiredString = (field: string) => 
  z.string({ required_error: `${field} is required` }).min(1, `${field} is required`)

export const optionalString = () => z.string().optional().nullable()

// ===== FORM SCHEMAS =====

// Login Form
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required')
})

export type LoginFormValues = z.infer<typeof loginSchema>

// Employee Create/Edit Form
export const employeeSchema = z.object({
  first_name: requiredString('First name'),
  last_name: requiredString('Last name'),
  email_work: emailSchema,
  phone_mobile: phoneSchema,
  department_id: optionalString(),
  position_id: optionalString(),
  location_id: optionalString(),
  hire_date: optionalString(),
  employment_status: z.enum(['active', 'inactive', 'on_leave', 'terminated']).default('active')
})

export type EmployeeFormValues = z.infer<typeof employeeSchema>

// Candidate Form (Recruiting)
export const candidateSchema = z.object({
  first_name: requiredString('First name'),
  last_name: requiredString('Last name'),
  email: emailSchema,
  phone: phoneSchema,
  position_applied: requiredString('Position'),
  source: optionalString(),
  notes: optionalString()
})

export type CandidateFormValues = z.infer<typeof candidateSchema>

// Marketing Lead Form
export const leadSchema = z.object({
  company_name: requiredString('Company name'),
  contact_name: optionalString(),
  contact_email: z.string().email('Please enter a valid email').optional().nullable().or(z.literal('')),
  contact_phone: phoneSchema,
  status: z.enum(['new', 'contacted', 'qualified', 'negotiating', 'won', 'lost']).default('new'),
  notes: optionalString()
})

export type LeadFormValues = z.infer<typeof leadSchema>

// Profile Update Form
export const profileSchema = z.object({
  first_name: requiredString('First name'),
  last_name: requiredString('Last name'),
  phone: phoneSchema,
  bio: z.string().max(500, 'Bio must be under 500 characters').optional().nullable()
})

export type ProfileFormValues = z.infer<typeof profileSchema>

// Time Off Request Form
export const timeOffSchema = z.object({
  start_date: requiredString('Start date'),
  end_date: requiredString('End date'),
  type: z.enum(['vacation', 'sick', 'personal', 'other']),
  notes: optionalString()
}).refine((data) => {
  if (data.start_date && data.end_date) {
    return new Date(data.end_date) >= new Date(data.start_date)
  }
  return true
}, {
  message: 'End date must be after start date',
  path: ['end_date']
})

export type TimeOffFormValues = z.infer<typeof timeOffSchema>

// ===== COMPOSABLE =====

/**
 * Create a form with Zod validation
 * @param schema Zod schema to validate against
 * @param initialValues Optional initial values for the form
 */
export function useFormValidation<T extends z.ZodType>(
  schema: T,
  initialValues?: Partial<z.infer<T>>
) {
  const typedSchema = toTypedSchema(schema)
  
  const { 
    handleSubmit, 
    errors, 
    values, 
    meta,
    resetForm,
    setFieldValue,
    setValues,
    validate
  } = useForm({
    validationSchema: typedSchema,
    initialValues: initialValues as any
  })

  // Computed helpers
  const isValid = computed(() => meta.value.valid)
  const isDirty = computed(() => meta.value.dirty)
  const hasErrors = computed(() => Object.keys(errors.value).length > 0)
  const firstError = computed(() => Object.values(errors.value)[0] as string | undefined)

  return {
    // Form state
    values,
    errors,
    isValid,
    isDirty,
    hasErrors,
    firstError,

    // Form actions
    handleSubmit,
    resetForm,
    setFieldValue,
    setValues,
    validate,

    // Re-export useField for individual field binding
    useField
  }
}

/**
 * Quick validation helper for inline validation
 * @param schema Zod schema
 * @param data Data to validate
 * @returns Result with success/error states
 */
export function validateData<T extends z.ZodType>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}

/**
 * Get first error message from Zod validation result
 */
export function getFirstError(result: z.SafeParseReturnType<any, any>): string | null {
  if (result.success) return null
  return result.error.errors[0]?.message ?? 'Validation failed'
}

// ===== TYPED SCHEMA EXPORTS =====

export const typedLoginSchema = toTypedSchema(loginSchema)
export const typedEmployeeSchema = toTypedSchema(employeeSchema)
export const typedCandidateSchema = toTypedSchema(candidateSchema)
export const typedLeadSchema = toTypedSchema(leadSchema)
export const typedProfileSchema = toTypedSchema(profileSchema)
export const typedTimeOffSchema = toTypedSchema(timeOffSchema)
