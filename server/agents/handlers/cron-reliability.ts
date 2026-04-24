/**
 * Agent: Cron Reliability
 *
 * Watches scheduled agent execution health and raises reliability proposals:
 * - Scheduled agents that have not run recently (stale)
 * - Elevated agent error volume in the last 24h
 *
 * Reads: agent_registry, agent_runs
 * Writes: agent_proposals (health_report)
 */

import type { AgentRunContext, AgentRunResult } from '~/types/agent.types'
import { createProposal, autoApproveProposal } from '../../utils/agents/proposals'
import { logger } from '../../utils/logger'

const STALE_HOURS = 48
const ERROR_WINDOW_HOURS = 24
const ERROR_WARN_THRESHOLD = 5

const handler = async (ctx: AgentRunContext): Promise<AgentRunResult> => {
  const { supabase: _sb, agentId, runId } = ctx
  const supabase = _sb as any

  logger.info(`[Agent:${agentId}] Starting cron reliability scan`, 'agent', { runId })

  const nowMs = Date.now()
  const staleThresholdIso = new Date(nowMs - STALE_HOURS * 60 * 60 * 1000).toISOString()
  const errorWindowIso = new Date(nowMs - ERROR_WINDOW_HOURS * 60 * 60 * 1000).toISOString()

  const { data: activeAgents, error: activeErr } = await supabase
    .from('agent_registry')
    .select('agent_id, display_name, schedule_cron, last_run_at, last_run_status')
    .eq('status', 'active')

  if (activeErr) {
    throw new Error(`Failed to read active agents: ${activeErr.message}`)
  }

  const scheduledAgents = (activeAgents ?? []).filter((a: any) => !!a.schedule_cron)
  const staleAgents = scheduledAgents.filter((a: any) => !a.last_run_at || a.last_run_at < staleThresholdIso)

  const { data: recentErrors, error: errErr } = await supabase
    .from('agent_runs')
    .select('agent_id, started_at, status')
    .eq('status', 'error')
    .gte('started_at', errorWindowIso)

  if (errErr) {
    throw new Error(`Failed to read agent run errors: ${errErr.message}`)
  }

  const errorsByAgent = new Map<string, number>()
  for (const row of (recentErrors ?? [])) {
    const current = errorsByAgent.get(row.agent_id) ?? 0
    errorsByAgent.set(row.agent_id, current + 1)
  }

  const noisyAgents = Array.from(errorsByAgent.entries())
    .filter(([, count]) => count >= ERROR_WARN_THRESHOLD)
    .map(([id, count]) => ({ agent_id: id, error_count: count }))

  const issueCount = staleAgents.length + noisyAgents.length
  let proposalsCreated = 0
  let proposalsAutoApproved = 0

  if (issueCount > 0) {
    const summaryParts: string[] = []
    if (staleAgents.length > 0) {
      summaryParts.push(`${staleAgents.length} stale scheduled agent(s)`)
    }
    if (noisyAgents.length > 0) {
      summaryParts.push(`${noisyAgents.length} agent(s) with elevated errors`)
    }

    const proposalId = await createProposal({
      agentId,
      proposalType: 'health_report',
      title: `Cron Reliability Alert (${issueCount} issue${issueCount === 1 ? '' : 's'})`,
      summary: summaryParts.join('; '),
      detail: {
        stale_threshold_hours: STALE_HOURS,
        error_window_hours: ERROR_WINDOW_HOURS,
        error_warn_threshold: ERROR_WARN_THRESHOLD,
        stale_agents: staleAgents.map((a: any) => ({
          agent_id: a.agent_id,
          display_name: a.display_name,
          last_run_at: a.last_run_at,
          last_run_status: a.last_run_status,
          schedule_cron: a.schedule_cron,
        })),
        noisy_agents: noisyAgents,
      },
      riskLevel: 'low',
      expiresInHours: 24,
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
      ? 'No cron reliability issues detected.'
      : `Detected ${issueCount} reliability issue(s).`,
    metadata: {
      active_agents: (activeAgents ?? []).length,
      scheduled_agents: scheduledAgents.length,
      stale_agents: staleAgents.length,
      noisy_agents: noisyAgents.length,
      recent_error_rows: (recentErrors ?? []).length,
    },
  }
}

export default handler
