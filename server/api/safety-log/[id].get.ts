/**
 * GET /api/safety-log/:id
 * Fetch a single safety log by ID.
 * Managers+ can view any log; regular users can only view their own.
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

const MANAGER_ROLES = ['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin', 'marketing_admin']

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw createError({ statusCode: 400, message: 'Valid Log ID (UUID) is required' })
  }

  const supabase = await serverSupabaseServiceRole(event)

  // Resolve the caller's profile and role
  const authUserId = getUserId(user)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', authUserId)
    .single()

  if (profileError) {
    throw createError({ statusCode: 500, message: `Error fetching profile: ${profileError.message}` })
  }

  if (!profile) {
    throw createError({ statusCode: 403, message: 'Profile not found' })
  }

  const { data, error } = await supabase
    .from('safety_logs')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw createError({ statusCode: error.code === 'PGRST116' ? 404 : 500, message: error.message })
  }

  // Non-managers can only view their own logs
  const isManager = MANAGER_ROLES.includes(profile.role)
  if (!isManager && data.submitted_by !== profile.id) {
    throw createError({ statusCode: 403, message: 'You can only view your own logs' })
  }

  return { data }
})
