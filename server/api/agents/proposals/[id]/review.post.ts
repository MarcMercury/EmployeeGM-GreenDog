/**
 * POST /api/agents/proposals/:id/review
 * 
 * Approve, reject, or resolve a proposal.
 * Supports: pending → approve/reject, auto_approved → resolve/reject
 * Accessible to admin roles only.
 */

import { z } from 'zod'

const bodySchema = z.object({
  action: z.enum(['approve', 'reject', 'resolve']),
  notes: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const { profileId } = await requireAgentAdmin(event)

  const proposalId = getRouterParam(event, 'id')
  if (!proposalId) {
    throw createError({ statusCode: 400, message: 'Proposal ID required' })
  }

  const proposal = await getProposal(proposalId)
  if (!proposal) {
    throw createError({ statusCode: 404, message: 'Proposal not found' })
  }

  const body = await validateBody(event, bodySchema)

  // Validate transitions
  if (body.action === 'resolve') {
    // Resolve: marks auto_approved/approved proposals as applied/acknowledged
    if (!['auto_approved', 'approved', 'pending'].includes(proposal.status)) {
      throw createError({ statusCode: 400, message: `Cannot resolve proposal with status: ${proposal.status}` })
    }
  } else if (body.action === 'approve') {
    if (proposal.status !== 'pending') {
      throw createError({ statusCode: 400, message: `Can only approve pending proposals. Current: ${proposal.status}` })
    }
  } else if (body.action === 'reject') {
    if (!['pending', 'auto_approved'].includes(proposal.status)) {
      throw createError({ statusCode: 400, message: `Can only reject pending/auto_approved proposals. Current: ${proposal.status}` })
    }
  }

  let success: boolean
  if (body.action === 'approve') {
    success = await approveProposal(proposalId, profileId, body.notes)
  } else if (body.action === 'reject') {
    success = await rejectProposal(proposalId, profileId, body.notes)
  } else {
    // resolve — mark as applied
    success = await resolveProposal(proposalId, profileId, body.notes)
  }

  if (!success) {
    throw createError({ statusCode: 500, message: `Failed to ${body.action} proposal` })
  }

  await createAuditLog({
    action: `agent_proposal_${body.action}`,
    entityType: 'agent_proposal',
    entityId: proposalId,
    actorProfileId: profileId,
    metadata: {
      agentId: proposal.agent_id,
      proposalType: proposal.proposal_type,
      notes: body.notes,
    },
  })

  // If approved, apply the proposal side effects immediately
  let applied = false
  if (body.action === 'approve') {
    const { applyProposal } = await import('../../../../utils/agents/appliers')
    applied = await applyProposal(proposalId)
  }

  const statusMap = { approve: 'approved', reject: 'rejected', resolve: 'applied' }

  return {
    success: true,
    data: {
      proposalId,
      action: body.action,
      status: statusMap[body.action],
      applied: body.action === 'resolve' || applied,
    },
  }
})
