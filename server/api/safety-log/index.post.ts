/**
 * POST /api/safety-log
 * Create a new safety log entry.
 * All authenticated users can submit.
 */
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { SafetyLogInsertSchema, validateFormData } from '~/app/schemas/safety-log'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)

  // Validate base payload
  const parsed = SafetyLogInsertSchema.safeParse({
    ...body,
    submitted_by: user.id,
  })

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Validation failed',
      data: parsed.error.flatten(),
    })
  }

  // Validate form_data against type-specific schema
  const formValidation = validateFormData(parsed.data.log_type, parsed.data.form_data)
  if (!formValidation.success) {
    throw createError({
      statusCode: 400,
      message: 'Form data validation failed',
      data: 'error' in formValidation ? formValidation.error : undefined,
    })
  }

  // Use the validated & transformed form_data
  const insertPayload = {
    ...parsed.data,
    form_data: formValidation.success && 'data' in formValidation ? formValidation.data : parsed.data.form_data,
    submitted_by: user.id,
  }

  const supabase = await serverSupabaseClient(event)
  const { data, error } = await supabase
    .from('safety_logs')
    .insert(insertPayload)
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { data }
})
