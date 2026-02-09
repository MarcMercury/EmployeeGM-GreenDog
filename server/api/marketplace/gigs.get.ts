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
  const page = parseInt(query.page as string) || 1
  const perPage = parseInt(query.perPage as string) || 50
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  let queryBuilder = client
    .from('marketplace_gigs')
    .select(`
      *,
      claimed_employee:employees!claimed_by(id, first_name, last_name),
      creator:profiles!created_by(id, full_name),
      approver:profiles!approved_by(id, full_name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) {
    queryBuilder = queryBuilder.eq('status', status)
  } else if (!includeCompleted) {
    queryBuilder = queryBuilder.in('status', ['open', 'claimed', 'reviewing'])
  }

  if (category) {
    queryBuilder = queryBuilder.eq('category', category)
  }

  const { data: gigs, count: totalGigs, error } = await queryBuilder

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return {
    gigs,
    pagination: {
      page,
      perPage,
      total: totalGigs || 0,
      totalPages: Math.ceil((totalGigs || 0) / perPage)
    }
  }
