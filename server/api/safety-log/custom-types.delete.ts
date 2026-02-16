/**
 * DELETE /api/safety-log/custom-types
 * Delete a custom safety log type (admin only).
 * Body: { id }
 */
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const client = await serverSupabaseClient(event)

  // Verify admin role
  const { data: profile } = await client
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Admin role required' })
  }

  const body = await readBody(event)
  if (!body?.id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const { error } = await (client as any)
    .from('custom_safety_log_types')
    .delete()
    .eq('id', body.id)

  if (error) throw createError({ statusCode: 500, message: error.message })

  return { deleted: true }
})
