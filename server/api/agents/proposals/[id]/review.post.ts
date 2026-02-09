/**
 * POST /api/agents/proposals/:id/review
 * 
 * Approve or reject a proposal.
 * Accessible to admin roles only.
 */

import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { z } from 'zod'

const bodySchema = z.object({
  action: z.enum(['approve', 'reject']),
  notes: z.string().optional(),
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

  const proposalId = getRouterParam(event, 'id')
  if (!proposalId) {
    throw createError({ statusCode: 400, message: 'Proposal ID required' })
  }

  const proposal = await getProposal(proposalId)
  if (!proposal) {
    throw createError({ statusCode: 404, message: 'Proposal not found' })
  }

  if (proposal.status !== 'pending') {
    throw createError({ statusCode: 400, message: `Proposal is already ${proposal.status}` })
  }

  const body = await validateBody(event, bodySchema)

  let success: boolean
  if (body.action === 'approve') {
    success = await approveProposal(proposalId, profile.id, body.notes)
  } else {
    success = await rejectProposal(proposalId, profile.id, body.notes)
  }

  if (!success) {
    throw createError({ statusCode: 500, message: `Failed to ${body.action} proposal` })
  }

  await createAuditLog({
    action: `agent_proposal_${body.action}`,
    entityType: 'agent_proposal',
    entityId: proposalId,
    actorProfileId: profile.id,
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

  return {
    success: true,
    data: {
      proposalId,
      action: body.action,
      status: body.action === 'approve' ? 'approved' : 'rejected',
      applied,
    },
  }
})
