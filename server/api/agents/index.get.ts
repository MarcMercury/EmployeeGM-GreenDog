/**
 * GET /api/agents
 * 
 * List all agents with their current status.
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

  const query = getQuery(event)

  try {
    const agents = await listAgents({
      status: query.status as 'active' | 'paused' | 'disabled' | undefined,
      cluster: query.cluster as string | undefined,
    })

    // Get stats for each agent
    const proposalStats = await getProposalStats()
    const runStats = await getRunStats(undefined, 7)

    return {
      success: true,
      data: {
        agents,
        stats: {
          proposals: proposalStats,
          runs: runStats,
        },
      },
    }
  } catch (err: any) {
    console.error('[GET /api/agents] Error:', err?.message || err)
    throw createError({
      statusCode: 500,
      message: `Failed to load agents: ${err?.message || 'Unknown error'}`,
    })
  }
})
