/**
 * Agent Budget Reset Cron
 *
 * GET /api/cron/agent-budget-reset
 *
 * Runs daily at midnight UTC. Resets `daily_tokens_used` to 0
 * for all agents in the registry.
 */

export default defineEventHandler(async (event) => {
  // Verify cron secret
  const authHeader = getHeader(event, 'authorization')
  const config = useRuntimeConfig()
  const cronSecret = config.cronSecret

  if (!cronSecret) {
    throw createError({ statusCode: 500, message: 'CRON_SECRET not configured' })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  logger.cron('agent-budget-reset', 'started', { timestamp: new Date().toISOString() })

  try {
    const client = createAdminClient()

    const { data, error } = await (client as any)
      .from('agent_registry')
      .update({
        daily_tokens_used: 0,
        budget_reset_at: new Date().toISOString(),
      })
      .neq('status', 'disabled')
      .select('agent_id')

    if (error) {
      logger.error('[BudgetReset] Failed to reset budgets', error, 'cron')
      throw createError({ statusCode: 500, message: error.message })
    }

    const count = data?.length ?? 0
    logger.cron('agent-budget-reset', 'completed', { agentsReset: count })

    return {
      success: true,
      agentsReset: count,
      resetAt: new Date().toISOString(),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('[BudgetReset] Fatal error', err instanceof Error ? err : undefined, 'cron')
    return { success: false, error: message }
  }
})
