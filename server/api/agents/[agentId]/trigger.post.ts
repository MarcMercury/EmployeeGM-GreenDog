/**
 * POST /api/agents/:agentId/trigger
 * 
 * Manually trigger an agent run.
 * Accessible to admin roles only.
 */

import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const adminClient = await serverSupabaseServiceRole(event)
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || !hasRole(profile.role, ADMIN_ROLES)) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

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
    actorProfileId: profile.id,
  })

  try {
    const result = await executeAgentRun(agentId, 'manual', `user:${profile.id}`)

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
