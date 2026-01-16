/**
 * GET /api/marketplace/rewards
 * Get all available rewards
 */
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const query = getQuery(event)
  const includeInactive = query.includeInactive === 'true'

  let queryBuilder = client
    .from('marketplace_rewards')
    .select(`
      *,
      creator:profiles!created_by(id, full_name)
    `)
    .order('cost', { ascending: true })

  if (!includeInactive) {
    queryBuilder = queryBuilder.eq('is_active', true)
  }

  const { data: rewards, error } = await queryBuilder

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { rewards }
})
