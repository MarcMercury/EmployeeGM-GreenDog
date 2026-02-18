/**
 * POST /api/safety-log/custom-types
 * Create a new custom safety log type.
 * Only non-base users (everyone except 'user' role) can create.
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { CustomSafetyLogTypeCreateSchema } from '~/schemas/safety-log'
import { SAFETY_LOG_TYPE_CONFIGS } from '~/types/safety-log.types'

const ALLOWED_ROLES = ['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin', 'marketing_admin']

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const client = await serverSupabaseServiceRole(event)

  // Verify non-base role
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (profileError) {
    throw createError({ statusCode: 500, message: `Error fetching profile: ${profileError.message}` })
  }

  if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Insufficient permissions' })
  }

  const body = await readBody(event)

  // Validate with Zod schema (validates fields structure, key format, etc.)
  const parsed = CustomSafetyLogTypeCreateSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Validation failed',
      data: parsed.error.flatten(),
    })
  }

  // Check for key collision with built-in types
  const builtInKeys = SAFETY_LOG_TYPE_CONFIGS.map(c => c.key)
  if (builtInKeys.includes(parsed.data.key as any)) {
    throw createError({ statusCode: 409, message: `Key "${parsed.data.key}" conflicts with a built-in log type` })
  }

  // Check for duplicate key in custom types
  const { count: existingCount } = await (client as any)
    .from('custom_safety_log_types')
    .select('id', { count: 'exact', head: true })
    .eq('key', parsed.data.key)

  if ((existingCount ?? 0) > 0) {
    throw createError({ statusCode: 409, message: `Key "${parsed.data.key}" already exists` })
  }

  // Insert custom type
  const { data, error } = await (client as any)
    .from('custom_safety_log_types')
    .insert({
      key: parsed.data.key,
      label: parsed.data.label,
      icon: parsed.data.icon,
      color: parsed.data.color,
      description: parsed.data.description,
      fields: parsed.data.fields,
      has_osha_toggle: parsed.data.has_osha_toggle,
      compliance_standards: parsed.data.compliance_standards,
      created_by: profile.id,
    })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })

  // Seed schedule rows for all 3 locations
  const locations = ['venice', 'sherman_oaks', 'van_nuys']
  for (const loc of locations) {
    await (client as any)
      .from('safety_log_schedules')
      .upsert(
        { log_type: parsed.data.key, location: loc, cadence: 'none' },
        { onConflict: 'log_type,location' }
      )
  }

  return { data }
})
