/**
 * Agent Handler Registry
 * 
 * Maps agent_id strings to their handler functions.
 * The dispatcher cron uses this to find and execute the right handler.
 */

import type { AgentRunContext, AgentRunResult } from '~~/app/types/agent.types'
import { startAgentRun, completeAgentRun, failAgentRun } from './runs'
import { getAgent, updateAgentLastRun } from './registry'

// Agent handler function type
export type AgentHandler = (ctx: AgentRunContext) => Promise<AgentRunResult>

// Handler registry — new agents register here
const handlerMap = new Map<string, () => Promise<{ default: AgentHandler }>>()

// =========================================================
// Phase 1: Skill & Development Cluster
// =========================================================
handlerMap.set('gap_analyzer', () => import('~~/server/agents/handlers/gap-analyzer'))
handlerMap.set('skill_scout', () => import('~~/server/agents/handlers/skill-scout'))
handlerMap.set('role_mapper', () => import('~~/server/agents/handlers/role-mapper'))
handlerMap.set('mentor_matchmaker', () => import('~~/server/agents/handlers/mentor-matchmaker'))
handlerMap.set('course_architect', () => import('~~/server/agents/handlers/course-architect'))

// =========================================================
// Phase 2: Operations & HR Cluster
// =========================================================
handlerMap.set('hr_auditor', () => import('~~/server/agents/handlers/hr-auditor'))
handlerMap.set('schedule_planner', () => import('~~/server/agents/handlers/schedule-planner'))
handlerMap.set('attendance_monitor', () => import('~~/server/agents/handlers/attendance-monitor'))
handlerMap.set('payroll_watchdog', () => import('~~/server/agents/handlers/payroll-watchdog'))
handlerMap.set('compliance_tracker', () => import('~~/server/agents/handlers/compliance-tracker'))

// =========================================================
// Phase 3: Engagement & Growth Cluster
// =========================================================
handlerMap.set('personal_coach', () => import('~~/server/agents/handlers/personal-coach'))
handlerMap.set('review_orchestrator', () => import('~~/server/agents/handlers/review-orchestrator'))
handlerMap.set('engagement_pulse', () => import('~~/server/agents/handlers/engagement-pulse'))
handlerMap.set('referral_intelligence', () => import('~~/server/agents/handlers/referral-intelligence'))

// =========================================================
// Phase 4: Orchestration
// =========================================================
handlerMap.set('supervisor_agent', () => import('~~/server/agents/handlers/supervisor-agent'))

/**
 * Get the handler for a given agent_id.
 * Returns null if no handler is registered.
 */
export async function getAgentHandler(agentId: string): Promise<AgentHandler | null> {
  const loader = handlerMap.get(agentId)
  if (!loader) return null

  try {
    const mod = await loader()
    return mod.default
  } catch (err) {
    logger.error(`[AgentHandlers] Failed to load handler for "${agentId}"`, err instanceof Error ? err : undefined, 'agent')
    return null
  }
}

/**
 * Get list of all registered agent IDs.
 */
export function getRegisteredAgentIds(): string[] {
  return Array.from(handlerMap.keys())
}

/**
 * Execute a full agent run lifecycle:
 * 1. Start run record
 * 2. Call handler
 * 3. Complete/fail run record
 * 4. Update agent registry last_run fields
 */
export async function executeAgentRun(
  agentId: string,
  triggerType: 'cron' | 'event' | 'manual' | 'agent',
  triggerSource?: string
): Promise<AgentRunResult> {
  const startTime = Date.now()

  // 1. Start run
  const runId = await startAgentRun(agentId, triggerType, triggerSource)

  // 2. Get agent config
  const agent = await getAgent(agentId)
  if (!agent) {
    const msg = `Agent "${agentId}" not found in registry`
    await failAgentRun(runId, msg)
    throw new Error(msg)
  }

  if (agent.status !== 'active') {
    const msg = `Agent "${agentId}" is ${agent.status}, skipping`
    await failAgentRun(runId, msg)
    throw new Error(msg)
  }

  // 3. Get handler
  const handler = await getAgentHandler(agentId)
  if (!handler) {
    const msg = `No handler registered for agent "${agentId}"`
    await failAgentRun(runId, msg)
    throw new Error(msg)
  }

  // 4. Build context
  const supabase = createAdminClient() as any
  const ctx: AgentRunContext = {
    agentId,
    runId,
    triggerType,
    triggerSource,
    supabase,
    config: agent.config,
  }

  // 5. Execute
  try {
    const result = await handler(ctx)
    const durationMs = Date.now() - startTime

    // 6. Record completion
    await completeAgentRun(runId, {
      status: result.status,
      proposalsCreated: result.proposalsCreated,
      proposalsAutoApproved: result.proposalsAutoApproved,
      tokensUsed: result.tokensUsed,
      costUsd: result.costUsd,
      metadata: { summary: result.summary, ...result.metadata },
    })

    await updateAgentLastRun(agentId, result.status === 'running' ? 'success' : result.status as 'success' | 'partial' | 'error', durationMs)

    logger.info(`[Agent:${agentId}] Run completed`, 'agent', {
      runId,
      status: result.status,
      proposals: result.proposalsCreated,
      tokens: result.tokensUsed,
      durationMs,
    })

    return result
  } catch (err) {
    const durationMs = Date.now() - startTime
    const errorMsg = err instanceof Error ? err.message : String(err)

    await failAgentRun(runId, errorMsg)
    await updateAgentLastRun(agentId, 'error', durationMs)

    logger.error(`[Agent:${agentId}] Run failed`, err instanceof Error ? err : undefined, 'agent', {
      runId,
      durationMs,
    })

    throw err
  }
}
