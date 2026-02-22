/**
 * Agent D1: Supervisor Agent
 *
 * Orchestrates the entire agent fleet. Responsibilities:
 * 1. Auto-approve low-risk proposals from other agents
 * 2. Route medium-risk proposals to appropriate managers
 * 3. Flag high-risk proposals for admin review + Slack alert
 * 4. Monitor agent health (failures, budget overages, stuck runs)
 * 5. Adjust agent schedules based on pending proposal backlog
 *
 * Reads: agent_registry, agent_proposals, agent_runs, employees
 * Writes: agent_proposals (status updates), notifications
 * LLM: optional gpt-4o-mini for risk re-evaluation
 */

import type { AgentRunContext, AgentRunResult } from '~/types/agent.types'
import { createProposal, autoApproveProposal } from '../../utils/agents/proposals'
import { agentChat } from '../../utils/agents/openai'
import { logger } from '../../utils/logger'

// Proposal types that can be auto-approved at low risk
const AUTO_APPROVE_TYPES = new Set([
  'nudge', 'engagement_alert', 'engagement_report',
  'review_reminder', 'new_skill', 'skill_gap_report',
  'course_draft', 'mentor_match', 'hr_audit_report',
  'attendance_report', 'compliance_report',
  'system_health_report',
])

// Proposal types that always require human review
const ALWAYS_HUMAN_REVIEW_TYPES = new Set([
  'schedule_draft', 'review_summary_draft', 'disciplinary_recommendation',
])

const STUCK_RUN_MINUTES = 30
const BUDGET_WARNING_THRESHOLD = 0.8 // 80% of daily budget

const handler = async (ctx: AgentRunContext): Promise<AgentRunResult> => {
  const { supabase: _sb, agentId, runId } = ctx
  const supabase = _sb as any

  logger.info(`[Agent:${agentId}] Supervisor starting sweep`, 'agent', { runId })

  let proposalsCreated = 0
  let proposalsAutoApproved = 0
  let proposalsRouted = 0
  let totalTokens = 0
  let totalCost = 0

  // ── 1. Process pending proposals from all agents ──────────────────

  const { data: pendingProposals, error: propErr } = await supabase
    .from('agent_proposals')
    .select('id, agent_id, proposal_type, title, summary, detail, risk_level, target_employee_id, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(50)

  if (propErr) {
    throw new Error(`Failed to fetch pending proposals: ${propErr.message}`)
  }

  const pending = pendingProposals ?? []
  logger.info(`[Agent:${agentId}] Found ${pending.length} pending proposals`, 'agent')

  // Get all agents for name mapping
  const { data: agents } = await supabase
    .from('agent_registry')
    .select('agent_id, display_name, cluster, daily_tokens_used, daily_token_budget')

  const agentMap = new Map<string, any>()
  for (const a of (agents ?? [])) {
    agentMap.set(a.agent_id, a)
  }

  for (const proposal of pending) {
    const riskLevel = proposal.risk_level ?? 'medium'
    const proposalType = proposal.proposal_type

    // Route based on risk and type
    if (ALWAYS_HUMAN_REVIEW_TYPES.has(proposalType)) {
      // Always requires human review — route to admin
      await routeToAdmin(supabase, proposal, agentId)
      proposalsRouted++
    } else if (riskLevel === 'low' && AUTO_APPROVE_TYPES.has(proposalType)) {
      // Low risk + safe type → auto-approve
      await autoApproveProposal(proposal.id)
      proposalsAutoApproved++
    } else if (riskLevel === 'low') {
      // Low risk but not in auto-approve set → route to manager
      await routeToManager(supabase, proposal, agentId)
      proposalsRouted++
    } else if (riskLevel === 'medium') {
      // Medium risk — use LLM to evaluate if auto-approvable
      const evaluation = await evaluateRisk(ctx, proposal, agentMap)
      totalTokens += evaluation.tokensUsed
      totalCost += evaluation.costUsd

      if (evaluation.approve) {
        await autoApproveProposal(proposal.id)
        proposalsAutoApproved++
      } else {
        await routeToAdmin(supabase, proposal, agentId)
        proposalsRouted++
      }
    } else {
      // High risk — always route to admin + flag
      await routeToAdmin(supabase, proposal, agentId)
      proposalsRouted++

      // Send high-priority notification
      await supabase.from('notification_queue').insert({
        channel: 'slack',
        priority: 'high',
        payload: {
          type: 'agent_high_risk_proposal',
          agent_id: proposal.agent_id,
          agent_name: agentMap.get(proposal.agent_id)?.display_name ?? proposal.agent_id,
          proposal_id: proposal.id,
          title: proposal.title,
          summary: proposal.summary,
        },
      })
    }
  }

  // ── 2. Monitor agent health ───────────────────────────────────────

  const healthIssues: string[] = []

  // Check for stuck runs
  const stuckThreshold = new Date(Date.now() - STUCK_RUN_MINUTES * 60 * 1000).toISOString()
  const { data: stuckRuns } = await supabase
    .from('agent_runs')
    .select('id, agent_id, started_at')
    .eq('status', 'running')
    .lt('started_at', stuckThreshold)

  if (stuckRuns && stuckRuns.length > 0) {
    for (const run of stuckRuns) {
      const agentName = agentMap.get(run.agent_id)?.display_name ?? run.agent_id

      // Mark stuck runs as failed
      await supabase
        .from('agent_runs')
        .update({
          status: 'error',
          finished_at: new Date().toISOString(),
          error_message: 'Terminated by supervisor: exceeded time limit',
        })
        .eq('id', run.id)

      healthIssues.push(`Stuck run killed: ${agentName} (run ${run.id})`)
    }
  }

  // Check for failing agents (>3 consecutive errors)
  const { data: recentRuns } = await supabase
    .from('agent_runs')
    .select('agent_id, status')
    .order('started_at', { ascending: false })
    .limit(200)

  const agentErrorStreaks = new Map<string, number>()
  for (const run of (recentRuns ?? [])) {
    const current = agentErrorStreaks.get(run.agent_id)
    if (current === undefined) {
      agentErrorStreaks.set(run.agent_id, run.status === 'error' ? 1 : 0)
    } else if (current > 0 && run.status === 'error') {
      agentErrorStreaks.set(run.agent_id, current + 1)
    }
  }

  for (const [agId, streak] of agentErrorStreaks) {
    if (streak >= 3) {
      const agentName = agentMap.get(agId)?.display_name ?? agId
      healthIssues.push(`${agentName} has ${streak} consecutive errors — consider pausing`)

      // Auto-pause if 5+ consecutive errors
      if (streak >= 5) {
        await supabase
          .from('agent_registry')
          .update({ status: 'paused' })
          .eq('agent_id', agId)

        healthIssues.push(`AUTO-PAUSED ${agentName} after ${streak} consecutive errors`)
      }
    }
  }

  // Budget monitoring
  for (const agent of (agents ?? [])) {
    if (!agent.daily_token_budget) continue
    const utilization = agent.daily_tokens_used / agent.daily_token_budget
    if (utilization >= BUDGET_WARNING_THRESHOLD) {
      healthIssues.push(
        `${agent.display_name}: ${Math.round(utilization * 100)}% of daily token budget used`
      )
    }
  }

  // ── 3. Create health report proposal ──────────────────────────────

  if (healthIssues.length > 0) {
    const healthProposalId = await createProposal({
      agentId,
      proposalType: 'health_report',
      title: `🤖 Agent Health: ${healthIssues.length} issue(s)`,
      summary: healthIssues.slice(0, 3).join('; '),
      detail: {
        issues: healthIssues,
        agent_statuses: (agents ?? []).map((a: any) => ({
          agent_id: a.agent_id,
          name: a.display_name,
          cluster: a.cluster,
          tokens_today: a.daily_tokens_used,
          budget: a.daily_token_budget,
        })),
        stuck_runs_killed: stuckRuns?.length ?? 0,
      },
      riskLevel: 'low',
      expiresInHours: 24,
    })

    if (healthProposalId) {
      proposalsCreated++
      await autoApproveProposal(healthProposalId)
      proposalsAutoApproved++
    }
  }

  // ── 4. Proposal backlog monitoring ────────────────────────────────

  const { count: backlogCount } = await supabase
    .from('agent_proposals')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  if (backlogCount && backlogCount > 100) {
    healthIssues.push(`High proposal backlog: ${backlogCount} pending`)
  }

  return {
    status: 'success',
    proposalsCreated,
    proposalsAutoApproved,
    tokensUsed: totalTokens,
    costUsd: totalCost,
    summary: `Processed ${pending.length} proposals (${proposalsAutoApproved} approved, ${proposalsRouted} routed). Health: ${healthIssues.length} issue(s).`,
    metadata: {
      pendingProcessed: pending.length,
      autoApproved: proposalsAutoApproved,
      routed: proposalsRouted,
      healthIssues: healthIssues.length,
      stuckRunsKilled: stuckRuns?.length ?? 0,
      backlogSize: backlogCount ?? 0,
    },
  }
}

// ── Helper functions ──────────────────────────────────────────────────

async function evaluateRisk(
  ctx: AgentRunContext,
  proposal: any,
  agentMap: Map<string, any>,
): Promise<{ approve: boolean; tokensUsed: number; costUsd: number }> {
  try {
    const agentName = agentMap.get(proposal.agent_id)?.display_name ?? proposal.agent_id

    const chatResult = await agentChat({
      agentId: ctx.agentId,
      runId: ctx.runId,
      messages: [
        {
          role: 'system',
          content: `You are a risk evaluator for an AI agent workforce at a veterinary practice. Evaluate if a medium-risk proposal can be safely auto-approved. Respond with JSON: { "approve": true/false, "reason": "explanation" }`,
        },
        {
          role: 'user',
          content: `Agent: ${agentName}
Type: ${proposal.proposal_type}
Title: ${proposal.title}
Summary: ${proposal.summary}
Risk Level: ${proposal.risk_level}

Should this be auto-approved?`,
        },
      ],
      model: 'fast',
      responseFormat: 'json',
      maxTokens: 200,
      temperature: 0.1,
    })

    const parsed = JSON.parse(chatResult.content)
    return {
      approve: parsed.approve === true,
      tokensUsed: chatResult.tokensUsed,
      costUsd: chatResult.costUsd,
    }
  } catch {
    // On error, don't auto-approve — route to human
    return { approve: false, tokensUsed: 0, costUsd: 0 }
  }
}

async function routeToAdmin(supabase: any, proposal: any, supervisorId: string): Promise<void> {
  await supabase
    .from('agent_proposals')
    .update({
      detail: {
        ...(proposal.detail ?? {}),
        routed_by: supervisorId,
        routed_at: new Date().toISOString(),
        routing_target: 'admin',
      },
    })
    .eq('id', proposal.id)
}

async function routeToManager(supabase: any, proposal: any, supervisorId: string): Promise<void> {
  // Get the employee's manager
  let managerId = null
  if (proposal.target_employee_id) {
    const { data: emp } = await supabase
      .from('employees')
      .select('manager_employee_id')
      .eq('id', proposal.target_employee_id)
      .single()

    managerId = emp?.manager_employee_id
  }

  await supabase
    .from('agent_proposals')
    .update({
      detail: {
        ...(proposal.detail ?? {}),
        routed_by: supervisorId,
        routed_at: new Date().toISOString(),
        routing_target: managerId ? 'manager' : 'admin',
        target_manager_id: managerId,
      },
    })
    .eq('id', proposal.id)
}

export default handler
