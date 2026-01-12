/**
 * GET /api/intake/persons
 * 
 * Lists unified persons with optional filtering by lifecycle stage.
 * Admin only endpoint.
 * 
 * Query params:
 *   stage?: person_lifecycle_stage
 *   search?: string (searches name, email)
 *   limit?: number (default: 50)
 *   offset?: number (default: 0)
 *   includeInactive?: boolean (default: false)
 */

import { createAdminClient, verifyAdminAccess } from '../../utils/intake'

export default defineEventHandler(async (event) => {
  // Verify admin access
  await verifyAdminAccess(event)

  // Get query params
  const query = getQuery(event)
  const stage = query.stage as string | undefined
  const search = query.search as string | undefined
  const limit = parseInt(query.limit as string) || 50
  const offset = parseInt(query.offset as string) || 0
  const includeInactive = query.includeInactive === 'true'

  const adminClient = createAdminClient()

  // Build query using the view for enriched data
  let dbQuery = adminClient
    .from('unified_persons_view')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Filter by stage
  if (stage) {
    dbQuery = dbQuery.eq('current_stage', stage)
  }

  // Filter by active status
  if (!includeInactive) {
    dbQuery = dbQuery.eq('is_active', true)
  }

  // Search by name or email
  if (search) {
    dbQuery = dbQuery.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
  }

  const { data: persons, error, count } = await dbQuery

  if (error) {
    console.error('Error fetching persons:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch persons'
    })
  }

  // Get stage counts for summary
  const { data: stageCounts, error: countError } = await adminClient
    .from('unified_persons')
    .select('current_stage')
    .eq('is_active', true)

  const stageStats: Record<string, number> = {}
  if (stageCounts) {
    for (const row of stageCounts) {
      stageStats[row.current_stage] = (stageStats[row.current_stage] || 0) + 1
    }
  }

  return {
    success: true,
    data: persons || [],
    pagination: {
      total: count || 0,
      limit,
      offset,
      hasMore: (offset + limit) < (count || 0)
    },
    stats: {
      byStage: stageStats,
      total: count || 0
    }
  }
})
