/**
 * GET /api/agents/:agentId
 * 
 * Get a single agent's details including recent runs.
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
