/**
 * GET /api/marketplace/gigs
 * Get all available gigs with optional filters
 */
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const query = getQuery(event)
  const status = query.status as string | undefined
  const category = query.category as string | undefined
  const includeCompleted = query.includeCompleted === 'true'

  let queryBuilder = client
    .from('marketplace_gigs')
    .select(`
      *,
      claimed_employee:employees!claimed_by(id, first_name, last_name),
      creator:profiles!created_by(id, full_name),
      approver:profiles!approved_by(id, full_name)
    `)
    .order('created_at', { ascending: false })

  if (status) {
    queryBuilder = queryBuilder.eq('status', status)
  } else if (!includeCompleted) {
    queryBuilder = queryBuilder.in('status', ['open', 'claimed', 'reviewing'])
  }

  if (category) {
    queryBuilder = queryBuilder.eq('category', category)
  }

  const { data: gigs, error } = await queryBuilder

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { gigs }
})
