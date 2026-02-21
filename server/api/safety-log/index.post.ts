/**
 * POST /api/safety-log
 * Create a new safety log entry.
 * All authenticated users can submit.
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { SafetyLogInsertSchema, validateFormData } from '~/schemas/safety-log'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const supabase = await serverSupabaseServiceRole(event)

  // Resolve profile ID from auth user
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (profileError) {
    throw createError({ statusCode: 500, message: `Error fetching profile: ${profileError.message}` })
  }

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
  const validatedFormData = formValidation.success && 'data' in formValidation
    ? formValidation.data
    : parsed.data.form_data

  // Build insert payload — use profile.id for submitted_by.
  // If the DB FK references auth.users(id) instead of profiles(id),
  // we fall back to user.id (auth UUID) on the first attempt failure.
  const basePayload = {
    log_type: parsed.data.log_type,
    location: parsed.data.location,
    form_data: validatedFormData,
    osha_recordable: parsed.data.osha_recordable,
    photo_urls: parsed.data.photo_urls,
    status: parsed.data.status,
    submitted_by: profile.id,
  }

  let { data, error } = await supabase
    .from('safety_logs')
    .insert(basePayload)
    .select()
    .single()

  // FK violation likely means submitted_by references auth.users, not profiles
  if (error && (error.code === '23503' || error.message?.includes('violates foreign key'))) {
    console.warn('[safety-log POST] FK violation on profile.id, retrying with auth user.id')
    const { data: retryData, error: retryError } = await supabase
      .from('safety_logs')
      .insert({ ...basePayload, submitted_by: user.id })
      .select()
      .single()
    data = retryData
    error = retryError
  }

  if (error) {
    console.error('[safety-log POST] Insert error:', error)
    throw createError({ statusCode: 500, message: error.message })
  }

  return { data }
})
