/**
 * DELETE /api/safety-log/custom-types
 * Soft-delete a custom safety log type (admin only).
 * Sets is_active = false instead of hard-deleting to preserve existing log entries.
 * Body: { id }
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const authUserId = getUserId(user)
  const client = await serverSupabaseServiceRole(event)

  // Verify admin role
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', authUserId)
    .single()

  if (profileError) {
    throw createError({ statusCode: 500, message: `Error fetching profile: ${profileError.message}` })
  }

  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Admin role required' })
  }

  const body = await readBody(event)
  if (!body?.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id)) {
    throw createError({ statusCode: 400, message: 'Valid id (UUID) is required' })
  }

  // Check for existing log entries that use this type
  const { data: typeRow } = await (client as any)
    .from('custom_safety_log_types')
    .select('key')
    .eq('id', body.id)
    .single()

  if (!typeRow) {
    throw createError({ statusCode: 404, message: 'Custom type not found' })
  }

  const { count: logCount } = await (client as any)
    .from('safety_logs')
    .select('id', { count: 'exact', head: true })
    .eq('log_type', typeRow.key)

  // Soft-delete: set is_active = false to preserve referential integrity
  const { error } = await (client as any)
    .from('custom_safety_log_types')
    .update({ is_active: false })
    .eq('id', body.id)

  if (error) throw createError({ statusCode: 500, message: error.message })

  return {
    deleted: true,
    soft_delete: true,
    existing_logs: logCount ?? 0,
    message: (logCount ?? 0) > 0
      ? `Type deactivated. ${logCount} existing log entries preserved.`
      : 'Type deactivated.',
  }
})
