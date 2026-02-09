/**
 * Agent Run Lifecycle Utilities
 * 
 * Manages the lifecycle of agent runs: start → complete/fail.
 * Every agent execution creates a run record for auditing.
 */

import type { AgentRunRow, RunStatus, TriggerType } from '~/types/agent.types'

/**
 * Start a new agent run. Returns the run ID.
 */
export async function startAgentRun(
  agentId: string,
  triggerType: TriggerType,
  triggerSource?: string
): Promise<string> {
  const client = createAdminClient()

  const { data, error } = await client
    .from('agent_runs')
    .insert({
      agent_id: agentId,
      trigger_type: triggerType,
      trigger_source: triggerSource ?? null,
      status: 'running',
    })
    .select('id')
    .single()

  if (error || !data) {
    logger.error('[AgentRuns] Failed to start run', error, 'agent', { agentId })
    throw new Error(`Failed to start agent run for ${agentId}: ${error?.message}`)
  }

  logger.info(`[Agent:${agentId}] Run started`, 'agent', {
    runId: data.id,
    triggerType,
    triggerSource,
  })

  return data.id
}

/**
 * Complete an agent run with success or partial status.
 */
export async function completeAgentRun(
  runId: string,
  result: {
    status?: RunStatus
    proposalsCreated?: number
    proposalsAutoApproved?: number
    tokensUsed?: number
    costUsd?: number
    metadata?: Record<string, unknown>
  }
): Promise<void> {
  const client = createAdminClient()

  const { error } = await client
    .from('agent_runs')
    .update({
      finished_at: new Date().toISOString(),
      status: result.status ?? 'success',
      proposals_created: result.proposalsCreated ?? 0,
      proposals_auto_approved: result.proposalsAutoApproved ?? 0,
      tokens_used: result.tokensUsed ?? 0,
      cost_usd: result.costUsd ?? 0,
      metadata: result.metadata ?? {},
    })
    .eq('id', runId)

  if (error) {
    logger.warn('[AgentRuns] Failed to complete run', 'agent', { runId, error: error.message })
  }
}

/**
 * Fail an agent run with an error message.
 */
export async function failAgentRun(
  runId: string,
  errorMessage: string,
  partialResult?: {
    proposalsCreated?: number
    tokensUsed?: number
    costUsd?: number
  }
): Promise<void> {
  const client = createAdminClient()

  const { error } = await client
    .from('agent_runs')
    .update({
      finished_at: new Date().toISOString(),
      status: 'error',
      error_message: errorMessage,
      proposals_created: partialResult?.proposalsCreated ?? 0,
      tokens_used: partialResult?.tokensUsed ?? 0,
      cost_usd: partialResult?.costUsd ?? 0,
    })
    .eq('id', runId)

  if (error) {
    logger.warn('[AgentRuns] Failed to record run failure', 'agent', { runId, error: error.message })
  }
}

/**
 * List recent runs for an agent or all agents.
 */
export async function listAgentRuns(filters?: {
  agentId?: string
  status?: RunStatus
  limit?: number
}): Promise<AgentRunRow[]> {
  const client = createAdminClient()
  const limit = filters?.limit ?? 20

  let query = client
    .from('agent_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit)

  if (filters?.agentId) query = query.eq('agent_id', filters.agentId)
  if (filters?.status) query = query.eq('status', filters.status)

  const { data, error } = await query

  if (error) {
    logger.error('[AgentRuns] Failed to list runs', error, 'agent')
    return []
  }

  return (data ?? []) as AgentRunRow[]
}

/**
 * Get aggregate run stats for dashboard.
 */
export async function getRunStats(agentId?: string, days: number = 7): Promise<{
  totalRuns: number
  successRuns: number
  errorRuns: number
  totalTokens: number
  totalCost: number
  avgDurationMs: number
}> {
  const client = createAdminClient()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  let query = client
    .from('agent_runs')
    .select('status, tokens_used, cost_usd, started_at, finished_at')
    .gte('started_at', since)

  if (agentId) query = query.eq('agent_id', agentId)

  const { data, error } = await query

  if (error || !data) {
    return { totalRuns: 0, successRuns: 0, errorRuns: 0, totalTokens: 0, totalCost: 0, avgDurationMs: 0 }
  }

  const rows = data as Array<{
    status: string
    tokens_used: number
    cost_usd: number
    started_at: string
    finished_at: string | null
  }>

  let totalTokens = 0
  let totalCost = 0
  let successRuns = 0
  let errorRuns = 0
  let totalDuration = 0
  let durationsCount = 0

  for (const row of rows) {
    totalTokens += row.tokens_used || 0
    totalCost += Number(row.cost_usd) || 0
    if (row.status === 'success') successRuns++
    if (row.status === 'error') errorRuns++
    if (row.finished_at && row.started_at) {
      totalDuration += new Date(row.finished_at).getTime() - new Date(row.started_at).getTime()
      durationsCount++
    }
  }

  return {
    totalRuns: rows.length,
    successRuns,
    errorRuns,
    totalTokens,
    totalCost,
    avgDurationMs: durationsCount > 0 ? Math.round(totalDuration / durationsCount) : 0,
  }
}
