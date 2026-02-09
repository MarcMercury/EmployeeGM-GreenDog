/**
 * POST /api/agents/events
 *
 * Event-driven agent trigger endpoint. External systems (webhooks, DB triggers,
 * or other agents) can POST events here to trigger agents that listen for
 * specific event types.
 *
 * Body: { event: string, payload?: Record<string, unknown> }
 *
 * Event routing rules are defined in agent config as `config.events: string[]`.
 */

import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

// Map event types to agent IDs that should respond
const EVENT_ROUTES: Record<string, string[]> = {
  // Employee events
  'employee.created': ['hr_auditor', 'gap_analyzer', 'personal_coach'],
  'employee.updated': ['hr_auditor', 'compliance_tracker'],
  'employee.deactivated': ['engagement_pulse'],

  // Skill events
  'skill.created': ['role_mapper', 'course_architect'],
  'skill.updated': ['gap_analyzer'],
  'employee_skill.updated': ['gap_analyzer', 'mentor_matchmaker', 'personal_coach'],

  // Time & attendance events
  'time_entry.created': ['payroll_watchdog'],
  'time_entry.anomaly': ['payroll_watchdog', 'attendance_monitor'],
  'attendance.no_show': ['attendance_monitor', 'engagement_pulse'],

  // Review events
  'review_cycle.opened': ['review_orchestrator'],
  'review_cycle.closing_soon': ['review_orchestrator'],
  'review.completed': ['review_orchestrator', 'personal_coach'],

  // Training events
  'training.enrolled': ['personal_coach'],
  'training.completed': ['personal_coach', 'engagement_pulse'],
  'quiz.passed': ['personal_coach', 'gap_analyzer'],

  // Goal events
  'goal.updated': ['personal_coach'],
  'goal.completed': ['personal_coach', 'engagement_pulse'],

  // Credential events
  'license.expiring': ['compliance_tracker'],
  'certification.expiring': ['compliance_tracker'],

  // Referral events
  'referral.synced': ['referral_intelligence'],
  'partner.visit_logged': ['referral_intelligence'],

  // Agent events (inter-agent communication)
  'agent.proposal_created': ['supervisor_agent'],
  'agent.failed': ['supervisor_agent'],
  'agent.budget_warning': ['supervisor_agent'],
}

export default defineEventHandler(async (event) => {
  // Auth: allow service role (cron/internal) or admin users
  const authHeader = getHeader(event, 'authorization')
  const config = useRuntimeConfig()

  let authorized = false

  // Check cron/internal secret
  if (authHeader === `Bearer ${config.cronSecret}`) {
    authorized = true
  }

  // Check admin user
  if (!authorized) {
    try {
      const user = await serverSupabaseUser(event)
      if (user) {
        const adminClient = await serverSupabaseServiceRole(event)
        const { data: profile } = await adminClient
          .from('profiles')
          .select('id, role')
          .eq('auth_user_id', user.id)
          .single()

        if (profile && hasRole(profile.role, ADMIN_ROLES)) {
          authorized = true
        }
      }
    } catch {
      // Not authenticated via user session
    }
  }

  if (!authorized) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const eventType = body?.event as string

  if (!eventType) {
    throw createError({ statusCode: 400, message: 'Missing "event" field' })
  }

  const agentIds = EVENT_ROUTES[eventType]
  if (!agentIds || agentIds.length === 0) {
    return {
      success: true,
      message: `No agents registered for event "${eventType}"`,
      triggered: [],
    }
  }

  logger.info(`[AgentEvents] Event "${eventType}" → triggering ${agentIds.length} agent(s)`, 'agent', {
    event: eventType,
    agents: agentIds,
  })

  // Check which agents are active before triggering
  const activeAgents = await listAgents({ status: 'active' })
  const activeIds = new Set(activeAgents.map(a => a.agent_id))

  const skipped: Array<{ agentId: string; status: string; error?: string }> = []
  const toRun: string[] = []

  for (const agentId of agentIds) {
    if (!activeIds.has(agentId)) {
      skipped.push({ agentId, status: 'skipped', error: 'Agent not active' })
    } else {
      toRun.push(agentId)
    }
  }

  // Run agents in parallel to avoid Vercel serverless timeout on sequential execution
  const settled = await Promise.allSettled(
    toRun.map(agentId => executeAgentRun(agentId, 'event', eventType)),
  )

  const runResults = settled.map((outcome, i) => {
    if (outcome.status === 'fulfilled') {
      return { agentId: toRun[i], status: outcome.value.status }
    }
    const message = outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason)
    return { agentId: toRun[i], status: 'error', error: message }
  })

  return {
    success: true,
    event: eventType,
    triggered: [...skipped, ...runResults],
  }
})
