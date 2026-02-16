/**
 * POST /api/safety-log
 * Create a new safety log entry.
 * All authenticated users can submit.
 */
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { SafetyLogInsertSchema, validateFormData } from '~/schemas/safety-log'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const supabase = await serverSupabaseClient(event)

  // Resolve profile ID from auth user (submitted_by uses profile UUID, not auth UUID)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) {
    throw createError({ statusCode: 403, message: 'Profile not found' })
  }

  const body = await readBody(event)

  // Validate base payload
  const parsed = SafetyLogInsertSchema.safeParse({
    ...body,
    submitted_by: profile.id,
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
    submitted_by: profile.id,
  }

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
