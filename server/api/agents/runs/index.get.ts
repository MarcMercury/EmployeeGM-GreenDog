/**
 * GET /api/agents/runs
 * 
 * List recent agent runs. Admin only.
 */
export default defineEventHandler(async (event) => {
  // Auth check
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const client = createAdminClient()
  const { data: profile } = await client
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !hasRole(profile.role, ADMIN_ROLES)) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const query = getQuery(event)
  const limit = Math.min(Number(query.limit) || 50, 200)

  const { data, error } = await client
    .from('agent_runs' as any)
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error) {
    logger.error('[API:AgentRuns] Failed to list runs', error, 'agent')
    throw createError({ statusCode: 500, message: 'Failed to fetch runs' })
  }

  return { success: true, data: data ?? [] }
})
