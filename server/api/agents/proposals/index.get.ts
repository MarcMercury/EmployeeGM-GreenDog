/**
 * GET /api/agents/proposals
 * 
 * List agent proposals with filtering.
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

  const result = await listProposals({
    agentId: query.agentId as string | undefined,
    status: query.status as any,
    proposalType: query.proposalType as any,
    targetEmployeeId: query.employeeId as string | undefined,
    limit: query.limit ? Number(query.limit) : 50,
    offset: query.offset ? Number(query.offset) : 0,
  })

  return {
    success: true,
    data: result.proposals,
    pagination: {
      total: result.total,
      limit: query.limit ? Number(query.limit) : 50,
      offset: query.offset ? Number(query.offset) : 0,
    },
  }
})
