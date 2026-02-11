/**
 * GET /api/marketplace/redemptions
 * Get redemption requests (admin sees all, users see own)
 */
import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  const { data: { user } } = await supabase.auth.getUser()
  const client = await serverSupabaseServiceRole(event)

  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const query = getQuery(event)
  const status = query.status as string | undefined

  // Get user's profile and check admin status
  const { data: profile } = await client
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) {
    throw createError({ statusCode: 404, message: 'Profile not found' })
  }

  const isAdmin = ['admin', 'super_admin', 'hr_admin'].includes(profile.role)

  let queryBuilder = client
    .from('marketplace_redemptions')
    .select(`
      *,
      reward:marketplace_rewards(id, title, icon, cost),
      employee:employees(id, first_name, last_name),
      fulfilled_by_profile:profiles!fulfilled_by(id, full_name)
    `)
    .order('created_at', { ascending: false })

  if (status) {
    queryBuilder = queryBuilder.eq('status', status)
  }

  if (!isAdmin) {
    // Get user's employee ID
    const { data: employee } = await client
      .from('employees')
      .select('id')
      .eq('profile_id', profile.id)
      .single()

    if (!employee) {
      return { redemptions: [] }
    }
    queryBuilder = queryBuilder.eq('employee_id', employee.id)
  }

  const { data: redemptions, error } = await queryBuilder

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { redemptions }
})
