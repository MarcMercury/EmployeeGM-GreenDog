/**
 * GET /api/marketplace/transactions
 * Get transaction history for current user
 */
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const query = getQuery(event)
  const employeeId = query.employeeId as string | undefined
  const limit = parseInt(query.limit as string) || 50

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

  let targetEmployeeId = employeeId

  // If not admin, force to own transactions
  if (!isAdmin) {
    const { data: employee } = await client
      .from('employees')
      .select('id')
      .eq('profile_id', profile.id)
      .single()

    if (!employee) {
      return { transactions: [] }
    }
    targetEmployeeId = employee.id
  }

  let queryBuilder = client
    .from('marketplace_transactions')
    .select(`
      *,
      gig:marketplace_gigs(id, title),
      reward:marketplace_rewards(id, title)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (targetEmployeeId) {
    queryBuilder = queryBuilder.eq('employee_id', targetEmployeeId)
  }

  const { data: transactions, error } = await queryBuilder

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { transactions }
})
