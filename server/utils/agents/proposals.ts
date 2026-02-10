/**
 * Agent Proposals Utilities
 * 
 * CRUD helpers for the agent_proposals table.
 * Every agent writes proposals here; humans or the supervisor agent approve them.
 */

import type {
  AgentProposalRow,
  ProposalType,
  ProposalStatus,
  RiskLevel,
} from '~/types/agent.types'

interface CreateProposalInput {
  agentId: string
  proposalType: ProposalType
  title: string
  summary?: string
  detail: Record<string, unknown>
  targetEmployeeId?: string
  targetEntityType?: string
  targetEntityId?: string
  riskLevel?: RiskLevel
  expiresInHours?: number
}

/**
 * Create a new agent proposal.
 * Returns the created proposal ID, or null on failure.
 */
export async function createProposal(input: CreateProposalInput): Promise<string | null> {
  const client = createAdminClient()

  const expiresAt = input.expiresInHours
    ? new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000).toISOString()
    : null

  const { data, error } = await client
    .from('agent_proposals')
    .insert({
      agent_id: input.agentId,
      proposal_type: input.proposalType,
      title: input.title,
      summary: input.summary ?? null,
      detail: input.detail,
      target_employee_id: input.targetEmployeeId ?? null,
      target_entity_type: input.targetEntityType ?? null,
      target_entity_id: input.targetEntityId ?? null,
      risk_level: input.riskLevel ?? 'low',
      status: 'pending',
      expires_at: expiresAt,
    })
    .select('id')
    .single()

  if (error) {
    logger.error('[AgentProposals] Failed to create proposal', error, 'agent', {
      agentId: input.agentId,
      type: input.proposalType,
    })
    return null
  }

  return data?.id ?? null
}

/**
 * Auto-approve a proposal (used for low-risk items that don't need human review).
 */
export async function autoApproveProposal(proposalId: string): Promise<boolean> {
  const client = createAdminClient()
  const { error } = await client
    .from('agent_proposals')
    .update({
      status: 'auto_approved' as ProposalStatus,
      reviewed_at: new Date().toISOString(),
      review_notes: 'Auto-approved (low risk)',
    })
    .eq('id', proposalId)
    .eq('status', 'pending')

  if (error) {
    logger.warn('[AgentProposals] Failed to auto-approve', 'agent', { proposalId, error: error.message })
    return false
  }
  return true
}

/**
 * Approve a proposal (human review).
 */
export async function approveProposal(
  proposalId: string,
  reviewerProfileId: string,
  notes?: string
): Promise<boolean> {
  const client = createAdminClient()
  const { error } = await client
    .from('agent_proposals')
    .update({
      status: 'approved' as ProposalStatus,
      reviewed_by: reviewerProfileId,
      reviewed_at: new Date().toISOString(),
      review_notes: notes ?? null,
    })
    .eq('id', proposalId)
    .eq('status', 'pending')

  if (error) {
    logger.warn('[AgentProposals] Failed to approve', 'agent', { proposalId, error: error.message })
    return false
  }
  return true
}

/**
 * Reject a proposal (human review).
 */
export async function rejectProposal(
  proposalId: string,
  reviewerProfileId: string,
  notes?: string
): Promise<boolean> {
  const client = createAdminClient()
  const { error } = await client
    .from('agent_proposals')
    .update({
      status: 'rejected' as ProposalStatus,
      reviewed_by: reviewerProfileId,
      reviewed_at: new Date().toISOString(),
      review_notes: notes ?? null,
    })
    .eq('id', proposalId)
    .eq('status', 'pending')

  if (error) {
    logger.warn('[AgentProposals] Failed to reject', 'agent', { proposalId, error: error.message })
    return false
  }
  return true
}

/**
 * Mark a proposal as applied (side effect executed).
 */
export async function markProposalApplied(proposalId: string): Promise<boolean> {
  const client = createAdminClient()
  const { error } = await client
    .from('agent_proposals')
    .update({
      status: 'applied' as ProposalStatus,
      applied_at: new Date().toISOString(),
    })
    .eq('id', proposalId)
    .in('status', ['approved', 'auto_approved'])

  if (error) {
    logger.warn('[AgentProposals] Failed to mark applied', 'agent', { proposalId, error: error.message })
    return false
  }
  return true
}

/**
 * Resolve (dismiss/acknowledge) a proposal.
 * Used for auto_approved proposals that need to be cleared from the queue.
 */
export async function resolveProposal(
  proposalId: string,
  reviewerProfileId: string,
  notes?: string
): Promise<boolean> {
  const client = createAdminClient()
  const { error } = await client
    .from('agent_proposals')
    .update({
      status: 'applied' as ProposalStatus,
      reviewed_by: reviewerProfileId,
      reviewed_at: new Date().toISOString(),
      applied_at: new Date().toISOString(),
      review_notes: notes ?? 'Resolved by admin',
    })
    .eq('id', proposalId)
    .in('status', ['pending', 'auto_approved', 'approved'])

  if (error) {
    logger.warn('[AgentProposals] Failed to resolve', 'agent', { proposalId, error: error.message })
    return false
  }
  return true
}

/**
 * Bulk-resolve proposals (mark as applied). Returns count resolved.
 */
export async function bulkResolveProposals(
  reviewerProfileId: string,
  filters?: { agentId?: string; status?: ProposalStatus }
): Promise<number> {
  const client = createAdminClient()

  let query = client
    .from('agent_proposals')
    .update({
      status: 'applied' as ProposalStatus,
      reviewed_by: reviewerProfileId,
      reviewed_at: new Date().toISOString(),
      applied_at: new Date().toISOString(),
      review_notes: 'Bulk resolved by admin',
    })
    .in('status', filters?.status ? [filters.status] : ['auto_approved', 'pending'])

  if (filters?.agentId) {
    query = query.eq('agent_id', filters.agentId)
  }

  const { data, error, count } = await query.select('id')

  if (error) {
    logger.warn('[AgentProposals] Bulk resolve failed', 'agent', { error: error.message })
    return 0
  }
  return data?.length ?? 0
}

/**
 * List proposals with filtering options.
 */
export async function listProposals(filters?: {
  agentId?: string
  status?: ProposalStatus
  proposalType?: ProposalType
  targetEmployeeId?: string
  limit?: number
  offset?: number
}): Promise<{ proposals: AgentProposalRow[]; total: number }> {
  const client = createAdminClient()
  const limit = filters?.limit ?? 50
  const offset = filters?.offset ?? 0

  let query = client
    .from('agent_proposals')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (filters?.agentId) query = query.eq('agent_id', filters.agentId)
  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.proposalType) query = query.eq('proposal_type', filters.proposalType)
  if (filters?.targetEmployeeId) query = query.eq('target_employee_id', filters.targetEmployeeId)

  const { data, error, count } = await query

  if (error) {
    logger.error('[AgentProposals] Failed to list proposals', error, 'agent')
    return { proposals: [], total: 0 }
  }

  return {
    proposals: (data ?? []) as AgentProposalRow[],
    total: count ?? 0,
  }
}

/**
 * Get a single proposal by ID.
 */
export async function getProposal(proposalId: string): Promise<AgentProposalRow | null> {
  const client = createAdminClient()
  const { data, error } = await client
    .from('agent_proposals')
    .select('*')
    .eq('id', proposalId)
    .single()

  if (error) {
    logger.warn('[AgentProposals] Failed to fetch proposal', 'agent', { proposalId, error: error.message })
    return null
  }
  return data as AgentProposalRow
}

/**
 * Get counts of proposals grouped by status, for dashboard stats.
 */
export async function getProposalStats(agentId?: string): Promise<Record<ProposalStatus, number>> {
  const client = createAdminClient()
  let query = client.from('agent_proposals').select('status')

  if (agentId) query = query.eq('agent_id', agentId)

  const { data, error } = await query

  const stats: Record<string, number> = {
    pending: 0,
    auto_approved: 0,
    approved: 0,
    rejected: 0,
    applied: 0,
    expired: 0,
  }

  if (error || !data) return stats as Record<ProposalStatus, number>

  for (const row of data) {
    const s = (row as { status: string }).status
    if (s in stats) stats[s]++
  }

  return stats as Record<ProposalStatus, number>
}
