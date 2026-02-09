/**
 * POST /api/agents/:agentId/status
 * 
 * Update an agent's status (active, paused, disabled).
 * Accessible to admin roles only.
 */

import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { z } from 'zod'

const bodySchema = z.object({
  status: z.enum(['active', 'paused', 'disabled']),
})

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

  const body = await validateBody(event, bodySchema)

  const success = await updateAgentStatus(agentId, body.status)
  if (!success) {
    throw createError({ statusCode: 500, message: 'Failed to update agent status' })
  }

  await createAuditLog({
    action: 'agent_status_change',
    entityType: 'agent',
    entityId: agentId,
    actorProfileId: profile.id,
    metadata: { newStatus: body.status },
  })

  return { success: true, data: { agentId, status: body.status } }
})
