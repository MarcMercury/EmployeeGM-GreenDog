/**
 * Agent: Proposal SLA
 *
 * Closes the loop on the proposal/approval lifecycle by surfacing
 * proposals that are stuck in `pending` past their SLA:
 *  - Past their `expires_at` timestamp (and not yet expired in DB)
 *  - Older than `pending_warn_hours` (default 72h) without review
 *
 * Optionally auto-expires proposals already past `expires_at` by
 * updating their status to 'expired' (config: auto_expire = true).
 *
 * Reads:  agent_proposals
 * Writes: agent_proposals (status update on auto-expire),
 *         agent_proposals (new health_report proposal for the alert)
 */

import type { AgentRunContext, AgentRunResult } from '~/types/agent.types'
import { createProposal, autoApproveProposal } from '../../utils/agents/proposals'
import { logger } from '../../utils/logger'

const DEFAULT_PENDING_WARN_HOURS = 72
const DEFAULT_AUTO_EXPIRE = true

function readPositiveNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value
  return fallback
}

const handler = async (ctx: AgentRunContext): Promise<AgentRunResult> => {
  const { supabase: _sb, agentId, runId, config } = ctx
  const supabase = _sb as any

  const pendingWarnHours = readPositiveNumber(config?.pending_warn_hours, DEFAULT_PENDING_WARN_HOURS)
  const autoExpire = readBoolean(config?.auto_expire, DEFAULT_AUTO_EXPIRE)

  logger.info(`[Agent:${agentId}] Starting proposal SLA scan`, 'agent', {
    runId,
    pendingWarnHours,
    autoExpire,
  })

  const nowIso = new Date().toISOString()
  const warnCutoffIso = new Date(Date.now() - pendingWarnHours * 60 * 60 * 1000).toISOString()

  // 1. Find proposals past their explicit expires_at but still pending
  const { data: expiredRows, error: expErr } = await supabase
    .from('agent_proposals')
    .select('id, agent_id, title, created_at, expires_at, risk_level')
    .eq('status', 'pending')
    .not('expires_at', 'is', null)
    .lt('expires_at', nowIso)

  if (expErr) {
    throw new Error(`Failed to read expired proposals: ${expErr.message}`)
  }

  // 2. Find proposals older than the SLA warning window (regardless of expires_at)
  const { data: staleRows, error: staleErr } = await supabase
    .from('agent_proposals')
    .select('id, agent_id, title, created_at, expires_at, risk_level')
    .eq('status', 'pending')
    .lt('created_at', warnCutoffIso)

  if (staleErr) {
    throw new Error(`Failed to read stale proposals: ${staleErr.message}`)
  }

  const expiredList = expiredRows ?? []
  const staleList = staleRows ?? []

  // De-duplicate: stale list may overlap with expired list.
  const expiredIds = new Set(expiredList.map((r: any) => r.id))
  const staleOnly = staleList.filter((r: any) => !expiredIds.has(r.id))

  let autoExpiredCount = 0
  if (autoExpire && expiredList.length > 0) {
    const ids = expiredList.map((r: any) => r.id)
    const { error: updateErr } = await supabase
      .from('agent_proposals')
      .update({ status: 'expired', reviewed_at: nowIso, review_notes: 'Auto-expired by proposal_sla agent' })
      .in('id', ids)

    if (updateErr) {
      logger.warn(`[Agent:${agentId}] Failed to auto-expire proposals`, 'agent', { error: updateErr.message })
    } else {
      autoExpiredCount = ids.length
    }
  }

  const issueCount = expiredList.length + staleOnly.length
  let proposalsCreated = 0
  let proposalsAutoApproved = 0

  if (issueCount > 0) {
    const summaryParts: string[] = []
    if (expiredList.length > 0) {
      summaryParts.push(
        autoExpiredCount > 0
          ? `${autoExpiredCount} proposal(s) auto-expired`
          : `${expiredList.length} proposal(s) past expires_at`,
      )
    }
    if (staleOnly.length > 0) {
      summaryParts.push(`${staleOnly.length} pending proposal(s) over ${pendingWarnHours}h old`)
    }

    const proposalId = await createProposal({
      agentId,
      proposalType: 'health_report',
      title: `Proposal SLA Alert (${issueCount} issue${issueCount === 1 ? '' : 's'})`,
      summary: summaryParts.join('; '),
      detail: {
        pending_warn_hours: pendingWarnHours,
        auto_expire: autoExpire,
        auto_expired_count: autoExpiredCount,
        expired_proposals: expiredList.map((r: any) => ({
          id: r.id,
          agent_id: r.agent_id,
          title: r.title,
          expires_at: r.expires_at,
          risk_level: r.risk_level,
        })),
        stale_pending_proposals: staleOnly.map((r: any) => ({
          id: r.id,
          agent_id: r.agent_id,
          title: r.title,
          created_at: r.created_at,
          risk_level: r.risk_level,
        })),
      },
      riskLevel: 'low',
      expiresInHours: 48,
    })

    if (proposalId) {
      proposalsCreated++
      const approved = await autoApproveProposal(proposalId)
      if (approved) proposalsAutoApproved++
    }
  }

  return {
    status: 'success',
    proposalsCreated,
    proposalsAutoApproved,
    tokensUsed: 0,
    costUsd: 0,
    summary: issueCount === 0
      ? 'All pending proposals within SLA.'
      : `${issueCount} proposal SLA issue(s); ${autoExpiredCount} auto-expired.`,
    metadata: {
      expired_count: expiredList.length,
      stale_pending_count: staleOnly.length,
      auto_expired_count: autoExpiredCount,
      pending_warn_hours: pendingWarnHours,
    },
  }
}

export default handler
