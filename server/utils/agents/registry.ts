/**
 * Agent Registry Utilities
 * 
 * CRUD helpers for the agent_registry table.
 * Used by agent endpoints and the dispatcher cron.
 */

import type { AgentRegistryRow, AgentStatus } from '~/types/agent.types'

/**
 * Get a single agent by its agent_id
 */
export async function getAgent(agentId: string): Promise<AgentRegistryRow | null> {
  const client = createAdminClient()
  const { data, error } = await client
    .from('agent_registry')
    .select('*')
    .eq('agent_id', agentId)
    .single()

  if (error) {
    logger.warn('[AgentRegistry] Failed to fetch agent', 'agent', { agentId, error: error.message })
    return null
  }
  return data as AgentRegistryRow
}

/**
 * Get all agents, optionally filtered by status or cluster
 */
export async function listAgents(filters?: {
  status?: AgentStatus
  cluster?: string
}): Promise<AgentRegistryRow[]> {
  const client = createAdminClient()
  let query = client.from('agent_registry').select('*').order('cluster').order('display_name')

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.cluster) {
    query = query.eq('cluster', filters.cluster)
  }

  const { data, error } = await query
  if (error) {
    logger.error('[AgentRegistry] Failed to list agents', error, 'agent')
    return []
  }
  return (data ?? []) as AgentRegistryRow[]
}

/**
 * Update an agent's status (active, paused, disabled)
 */
export async function updateAgentStatus(agentId: string, status: AgentStatus): Promise<boolean> {
  const client = createAdminClient()

  // When resuming (setting to active), also reset error counters
  // so the supervisor agent doesn't immediately re-pause
  const updatePayload: Record<string, any> = { status }
  if (status === 'active') {
    updatePayload.consecutive_errors = 0
    updatePayload.last_error_message = null
  }

  const { error } = await client
    .from('agent_registry')
    .update(updatePayload)
    .eq('agent_id', agentId)

  if (error) {
    logger.error('[AgentRegistry] Failed to update status', error, 'agent', { agentId, status })
    return false
  }
  return true
}

/**
 * Update agent's last run info after a run completes
 */
export async function updateAgentLastRun(
  agentId: string,
  runStatus: 'success' | 'partial' | 'error',
  durationMs: number
): Promise<void> {
  const client = createAdminClient()
  await client
    .from('agent_registry')
    .update({
      last_run_at: new Date().toISOString(),
      last_run_status: runStatus,
      last_run_duration_ms: durationMs,
    })
    .eq('agent_id', agentId)
}

/**
 * Update agent config (merge with existing)
 */
export async function updateAgentConfig(
  agentId: string,
  configPatch: Record<string, unknown>
): Promise<boolean> {
  const agent = await getAgent(agentId)
  if (!agent) return false

  const mergedConfig = { ...agent.config, ...configPatch }
  const client = createAdminClient()
  const { error } = await client
    .from('agent_registry')
    .update({ config: mergedConfig })
    .eq('agent_id', agentId)

  if (error) {
    logger.error('[AgentRegistry] Failed to update config', error, 'agent', { agentId })
    return false
  }
  return true
}

/**
 * Get agents that are due to run based on their cron schedule.
 * This is a simplified cron matcher — checks if agent should run within the current interval.
 */
export function isAgentDue(agent: AgentRegistryRow, nowUtc: Date): boolean {
  if (!agent.schedule_cron || agent.status !== 'active') return false

  const parts = agent.schedule_cron.trim().split(/\s+/)
  if (parts.length !== 5) return false

  const [minuteSpec, hourSpec, dayOfMonthSpec, monthSpec, dayOfWeekSpec] = parts
  const minute = nowUtc.getUTCMinutes()
  const hour = nowUtc.getUTCHours()
  const dayOfMonth = nowUtc.getUTCDate()
  const month = nowUtc.getUTCMonth() + 1
  const dayOfWeek = nowUtc.getUTCDay() // 0 = Sunday

  return (
    matchesCronField(minuteSpec, minute) &&
    matchesCronField(hourSpec, hour) &&
    matchesCronField(dayOfMonthSpec, dayOfMonth) &&
    matchesCronField(monthSpec, month) &&
    matchesCronField(dayOfWeekSpec, dayOfWeek)
  )
}

/**
 * Simple cron field matcher. Supports: *, N, N/step, N-M, comma-separated
 */
function matchesCronField(spec: string, value: number): boolean {
  if (spec === '*') return true

  // Handle comma-separated values
  const parts = spec.split(',')
  for (const part of parts) {
    // Handle range (e.g. 1-5)
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number)
      if (value >= start && value <= end) return true
      continue
    }

    // Handle step (e.g. */5 or 10/5)
    if (part.includes('/')) {
      const [base, step] = part.split('/')
      const stepNum = Number(step)
      const baseNum = base === '*' ? 0 : Number(base)
      if ((value - baseNum) % stepNum === 0 && value >= baseNum) return true
      continue
    }

    // Exact match
    if (Number(part) === value) return true
  }

  return false
}
