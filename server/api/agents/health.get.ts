/**
 * GET /api/agents/health
 * Returns health status of the agents system including OpenAI integration
 */

import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // Authenticate user
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = await serverSupabaseServiceRole(event)

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || !ADMIN_ROLES.includes(profile.role as any)) {
    throw createError({
      statusCode: 403,
      message: 'Only admins can check agent health',
    })
  }

  try {
    // Check if OpenAI is configured
    const apiKey = process.env.OPENAI_API_KEY
    const openai = apiKey ? true : false

    // Check recent successful agent runs
    const { data: recentRuns, error: runsError } = await supabase
      .from('agent_runs')
      .select('id, status, started_at')
      .eq('status', 'success')
      .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('started_at', { ascending: false })
      .limit(5)

    const recentSuccess = !runsError && (recentRuns?.length ?? 0) > 0

    // Check active agents
    const { data: activeAgents, error: agentsError } = await supabase
      .from('agents')
      .select('id, status')
      .eq('is_active', true)
      .limit(1)

    const hasActiveAgents = !agentsError && (activeAgents?.length ?? 0) > 0

    // Determine overall status
    let status = 'degraded'
    let message = 'Agent system operational with some issues'

    if (openai && recentSuccess && hasActiveAgents) {
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
    }

    return {
      status,
      message,
      openai,
      recentSuccess,
      hasActiveAgents,
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
