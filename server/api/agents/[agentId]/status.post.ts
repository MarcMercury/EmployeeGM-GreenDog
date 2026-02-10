/**
 * POST /api/agents/:agentId/status
 * 
 * Update an agent's status (active, paused, disabled).
 * Accessible to admin roles only.
 */

import { z } from 'zod'

const bodySchema = z.object({
  status: z.enum(['active', 'paused', 'disabled']),
})

export default defineEventHandler(async (event) => {
  const { profileId } = await requireAgentAdmin(event)

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
    actorProfileId: profileId,
    metadata: { newStatus: body.status },
  })

  return { success: true, data: { agentId, status: body.status } }
})
