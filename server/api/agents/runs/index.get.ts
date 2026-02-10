/**
 * GET /api/agents/runs
 * 
 * List recent agent runs. Admin only.
 */
export default defineEventHandler(async (event) => {
  await requireAgentAdmin(event)

  const query = getQuery(event)
  const limit = Math.min(Number(query.limit) || 50, 200)

  const client = createAdminClient()
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
