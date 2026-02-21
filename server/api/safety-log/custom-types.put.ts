/**
 * PUT /api/safety-log/custom-types
 * Update an existing custom safety log type.
 * Body: { id, label?, icon?, color?, description?, fields?, has_osha_toggle?, compliance_standards?, is_active? }
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { CustomSafetyLogTypeUpdateSchema } from '~/schemas/safety-log'
import { getUserId } from '~/server/utils/getUserId'

const ALLOWED_ROLES = ['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin', 'marketing_admin']

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const client = await serverSupabaseServiceRole(event)

  // Verify non-base role
  const authUserId = getUserId(user)
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', authUserId)
    .single()

  if (profileError) {
    throw createError({ statusCode: 500, message: `Error fetching profile: ${profileError.message}` })
  }

  if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Insufficient permissions' })
  }

  const body = await readBody(event)

  // Validate with Zod schema
  const parsed = CustomSafetyLogTypeUpdateSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Validation failed',
      data: parsed.error.flatten(),
    })
  }

  // Build update payload from validated data (exclude id)
  const { id, ...updatePayload } = parsed.data

  const { data, error } = await (client as any)
    .from('custom_safety_log_types')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })

  return { data }
})
