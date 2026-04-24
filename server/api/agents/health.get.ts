/**
 * GET /api/agents/health
 * Returns health status of the agents system including OpenAI integration
 */

import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { verifyCronAuth } from '../../utils/cronAuth'
import { ADMIN_ROLES, hasRole } from '../../utils/roles'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  let authorized = false

  // Allow secure internal/cron checks via CRON_SECRET.
  if (authHeader) {
    try {
      verifyCronAuth(event)
      authorized = true
    } catch {
      // Fallback to admin-user auth below.
    }
  }

  const supabase = await serverSupabaseServiceRole(event)

  if (!authorized) {
    const user = await serverSupabaseUser(event)
    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile || !hasRole(profile.role, ADMIN_ROLES)) {
      throw createError({
        statusCode: 403,
        message: 'Only admins can check agent health',
      })
    }

    authorized = true
  }

  try {
    const config = useRuntimeConfig()
    const openai = !!(process.env.OPENAI_API_KEY || config.openaiApiKey)

    const nowMs = Date.now()
    const dayAgo = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString()
    const staleThresholdMs = nowMs - 48 * 60 * 60 * 1000

    const { count: activeAgentCount, error: activeErr } = await supabase
      .from('agent_registry')
      .select('agent_id', { count: 'exact', head: true })
      .eq('status', 'active')

    if (activeErr) {
      throw createError({ statusCode: 500, message: `Failed to read agent registry: ${activeErr.message}` })
    }

    const { count: recentSuccessCount, error: successErr } = await supabase
      .from('agent_runs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'success')
      .gte('started_at', dayAgo)

    if (successErr) {
      throw createError({ statusCode: 500, message: `Failed to read agent runs: ${successErr.message}` })
    }

    const { count: recentErrorCount, error: errorErr } = await supabase
      .from('agent_runs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'error')
      .gte('started_at', dayAgo)

    if (errorErr) {
      throw createError({ statusCode: 500, message: `Failed to read agent errors: ${errorErr.message}` })
    }

    const { data: activeAgents, error: staleErr } = await supabase
      .from('agent_registry')
      .select('agent_id, schedule_cron, last_run_at, last_run_status')
      .eq('status', 'active')

    if (staleErr) {
      throw createError({ statusCode: 500, message: `Failed to read active agent state: ${staleErr.message}` })
    }

    const staleAgents = (activeAgents ?? []).filter((agent: any) => {
      if (!agent.schedule_cron) return false
      if (!agent.last_run_at) return true
      return new Date(agent.last_run_at).getTime() < staleThresholdMs
    })

    const hasActiveAgents = (activeAgentCount ?? 0) > 0
    const recentSuccess = (recentSuccessCount ?? 0) > 0

    let status = 'degraded'
    let message = 'Agent system operational with some issues'

    if (openai && hasActiveAgents && recentSuccess && staleAgents.length === 0) {
      status = 'healthy'
      message = 'Agent system fully operational'
    } else if (!openai) {
      status = 'degraded'
      message = 'OpenAI API not configured'
    } else if (!hasActiveAgents) {
      status = 'degraded'
      message = 'No active agents configured'
    } else if (!recentSuccess) {
      status = 'degraded'
      message = 'No recent successful agent runs'
    } else if (staleAgents.length > 0) {
      status = 'degraded'
      message = `${staleAgents.length} scheduled agent(s) appear stale`
    }

    return {
      status,
      message,
      openai,
      recentSuccess,
      hasActiveAgents,
      metrics: {
        activeAgentCount: activeAgentCount ?? 0,
        recentSuccessCount: recentSuccessCount ?? 0,
        recentErrorCount: recentErrorCount ?? 0,
        staleAgentCount: staleAgents.length,
        staleAgentIds: staleAgents.map((a: any) => a.agent_id),
      },
      lastUpdated: new Date().toISOString(),
    }
  } catch (error) {
    console.error('[agents/health] Error checking agent health:', error)
    return {
      status: 'error',
      message: 'Failed to check agent health',
      openai: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      lastUpdated: new Date().toISOString(),
    }
  }
})
