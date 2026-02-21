/**
 * POST /api/safety-log
 * Create a new safety log entry.
 * All authenticated users can submit.
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { SafetyLogInsertSchema, validateFormData } from '~/schemas/safety-log'

export default defineEventHandler(async (event) => {
  let step = 'init'
  try {
    step = 'auth'
    const user = await serverSupabaseUser(event)
    if (!user) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    const authUserId = getUserId(user)

    step = 'supabase-client'
    const supabase = await serverSupabaseServiceRole(event)

    step = 'profile-lookup'
    // Resolve profile ID from auth user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single()

    if (profileError) {
      throw createError({ statusCode: 500, message: `Profile lookup failed: ${profileError.message}` })
    }

    if (!profile) {
      throw createError({ statusCode: 403, message: 'Profile not found' })
    }

    step = 'read-body'
    const body = await readBody(event)

    step = 'validate-schema'
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

    step = 'validate-form-data'
    // Validate form_data against type-specific schema
    const formValidation = validateFormData(parsed.data.log_type, parsed.data.form_data)
    if (!formValidation.success) {
      throw createError({
        statusCode: 400,
        message: 'Form data validation failed',
        data: 'error' in formValidation ? formValidation.error : undefined,
      })
    }

    step = 'build-payload'
    // Use the validated & transformed form_data
    const validatedFormData = formValidation.success && 'data' in formValidation
      ? formValidation.data
      : parsed.data.form_data

    // Build insert payload
    const basePayload = {
      log_type: parsed.data.log_type,
      location: parsed.data.location,
      form_data: validatedFormData,
      osha_recordable: parsed.data.osha_recordable,
      photo_urls: parsed.data.photo_urls,
      status: parsed.data.status,
      submitted_by: profile.id,
    }

    step = 'db-insert'
    let { data, error } = await supabase
      .from('safety_logs')
      .insert(basePayload)
      .select()
      .single()

    // FK violation likely means submitted_by references auth.users, not profiles
    if (error && (error.code === '23503' || error.message?.includes('violates foreign key'))) {
      step = 'db-insert-retry-auth-uid'
      console.warn('[safety-log POST] FK violation on profile.id, retrying with auth user.id')
      const { data: retryData, error: retryError } = await supabase
        .from('safety_logs')
        .insert({ ...basePayload, submitted_by: authUserId })
        .select()
        .single()
      data = retryData
      error = retryError
    }

    if (error) {
      console.error(`[safety-log POST] Insert error at step=${step}:`, error)
      throw createError({
        statusCode: 500,
        message: `Insert failed: ${error.message} (code: ${error.code}, hint: ${error.hint || 'none'})`,
      })
    }

    return { data }
  } catch (err: any) {
    // If it's already a createError, re-throw
    if (err.statusCode) throw err
    // Unexpected error — return details
    console.error(`[safety-log POST] Unexpected error at step=${step}:`, err)
    throw createError({
      statusCode: 500,
      message: `Unexpected error at step=${step}: ${err?.message || String(err)}`,
    })
  }
})
