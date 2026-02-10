/**
 * POST /api/agents/:agentId/trigger
 * 
 * Manually trigger an agent run.
 * Accessible to admin roles only.
 */

export default defineEventHandler(async (event) => {
  const { profileId } = await requireAgentAdmin(event)

  const agentId = getRouterParam(event, 'agentId')
  if (!agentId) {
    throw createError({ statusCode: 400, message: 'Agent ID required' })
  }

  const agent = await getAgent(agentId)
  if (!agent) {
    throw createError({ statusCode: 404, message: `Agent "${agentId}" not found` })
  }

  if (agent.status === 'disabled') {
    throw createError({ statusCode: 400, message: `Agent "${agentId}" is disabled` })
  }

  await createAuditLog({
    action: 'agent_manual_trigger',
    entityType: 'agent',
    entityId: agentId,
    actorProfileId: profileId,
  })

  try {
    const result = await executeAgentRun(agentId, 'manual', `user:${profileId}`)

    return {
      success: true,
      data: {
        agentId,
        status: result.status,
        proposalsCreated: result.proposalsCreated,
        tokensUsed: result.tokensUsed,
        summary: result.summary,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw createError({ statusCode: 500, message: `Agent run failed: ${message}` })
  }
})
