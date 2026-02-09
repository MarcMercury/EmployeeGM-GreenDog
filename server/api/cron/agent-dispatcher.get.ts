/**
 * Agent Dispatcher Cron
 * 
 * GET /api/cron/agent-dispatcher
 * 
 * Runs every 5 minutes via Vercel cron.
 * Checks agent_registry for active agents whose cron schedules match,
 * then executes them. This avoids needing a separate Vercel cron for each agent.
 * 
 * Configure in vercel.json:
 *   crons: [{ path: "/api/cron/agent-dispatcher", schedule: "every 5 minutes" }]
 */

export default defineEventHandler(async (event) => {
  const startTime = Date.now()

  // Verify cron secret
  const authHeader = getHeader(event, 'authorization')
  const config = useRuntimeConfig()
  const cronSecret = config.cronSecret

  if (!cronSecret) {
    logger.error('[AgentDispatcher] CRON_SECRET not configured')
    throw createError({ statusCode: 500, message: 'Server configuration error' })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('[AgentDispatcher] Unauthorized cron attempt')
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  logger.cron('agent-dispatcher', 'started', { timestamp: new Date().toISOString() })

  const now = new Date()
  const results: Array<{ agentId: string; status: string; error?: string }> = []

  try {
    // 1. Get all active agents
    const agents = await listAgents({ status: 'active' })

    // 2. Filter to those whose cron schedule matches now
    const dueAgents = agents.filter(a => isAgentDue(a, now))

    if (dueAgents.length === 0) {
      logger.info('[AgentDispatcher] No agents due to run', 'cron', {
        activeAgents: agents.length,
      })
      return {
        success: true,
        message: 'No agents due to run',
        activeAgents: agents.length,
        durationMs: Date.now() - startTime,
      }
    }

    logger.info(`[AgentDispatcher] ${dueAgents.length} agent(s) due to run`, 'cron', {
      agents: dueAgents.map(a => a.agent_id),
    })

    // 3. Execute each due agent (sequentially to respect rate limits)
    for (const agent of dueAgents) {
      try {
        // Skip if agent ran recently (within last 4 minutes) to prevent double-runs
        if (agent.last_run_at) {
          const lastRun = new Date(agent.last_run_at)
          const minutesSinceLastRun = (now.getTime() - lastRun.getTime()) / (60 * 1000)
          if (minutesSinceLastRun < 4) {
            logger.info(`[AgentDispatcher] Skipping "${agent.agent_id}" — ran ${minutesSinceLastRun.toFixed(1)}m ago`, 'cron')
            results.push({ agentId: agent.agent_id, status: 'skipped' })
            continue
          }
        }

        const result = await executeAgentRun(agent.agent_id, 'cron', 'agent-dispatcher')
        results.push({ agentId: agent.agent_id, status: result.status })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        results.push({ agentId: agent.agent_id, status: 'error', error: message })
        // Continue to next agent — don't let one failure stop others
      }
    }

    // 4. Also expire stale proposals
    const client = createAdminClient()
    const { data: expiredCount } = await client.rpc('expire_stale_agent_proposals')

    if (expiredCount && expiredCount > 0) {
      logger.info(`[AgentDispatcher] Expired ${expiredCount} stale proposals`, 'cron')
    }

    const durationMs = Date.now() - startTime
    logger.cron('agent-dispatcher', 'completed', {
      durationMs,
      agentsRun: results.length,
      results,
    })

    return {
      success: true,
      durationMs,
      agentsChecked: agents.length,
      agentsRun: dueAgents.length,
      results,
      proposalsExpired: expiredCount ?? 0,
    }
  } catch (err) {
    const durationMs = Date.now() - startTime
    const message = err instanceof Error ? err.message : String(err)
    logger.error('[AgentDispatcher] Fatal error', err instanceof Error ? err : undefined, 'cron')

    return {
      success: false,
      durationMs,
      error: message,
      results,
    }
  }
})
