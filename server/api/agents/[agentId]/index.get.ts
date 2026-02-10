/**
 * GET /api/agents/:agentId
 * 
 * Get a single agent's details including recent runs.
 * Accessible to admin roles only.
 */

export default defineEventHandler(async (event) => {
  await requireAgentAdmin(event)

  const agentId = getRouterParam(event, 'agentId')
  if (!agentId) {
    throw createError({ statusCode: 400, message: 'Agent ID required' })
  }

  const agent = await getAgent(agentId)
  if (!agent) {
    throw createError({ statusCode: 404, message: `Agent "${agentId}" not found` })
  }

  const [recentRuns, proposalStats] = await Promise.all([
    listAgentRuns({ agentId, limit: 10 }),
    getProposalStats(agentId),
  ])

  return {
    success: true,
    data: {
      agent,
      recentRuns,
      proposalStats,
    },
  }
})
