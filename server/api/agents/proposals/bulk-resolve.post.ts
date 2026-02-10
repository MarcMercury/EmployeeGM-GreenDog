/**
 * POST /api/agents/proposals/bulk-resolve
 * 
 * Bulk-resolve (dismiss/acknowledge) auto_approved and pending proposals.
 * Accessible to admin roles only.
 */

import { z } from 'zod'

const bodySchema = z.object({
  agentId: z.string().optional(),
  status: z.enum(['pending', 'auto_approved']).optional(),
})

export default defineEventHandler(async (event) => {
  const { profileId } = await requireAgentAdmin(event)

  const body = await validateBody(event, bodySchema)

  const resolved = await bulkResolveProposals(profileId, {
    agentId: body.agentId,
    status: body.status as any,
  })

  await createAuditLog({
    action: 'agent_proposals_bulk_resolve',
    entityType: 'agent_proposal',
    entityId: 'bulk',
    actorProfileId: profileId,
    metadata: {
      resolved,
      agentId: body.agentId,
      status: body.status,
    },
  })

  return {
    success: true,
    data: { resolved },
  }
})
