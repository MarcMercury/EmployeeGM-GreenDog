/**
 * GET /api/agents/charts
 *
 * Returns chart data for the agent dashboard:
 * - Daily cost by cluster (7 days)
 * - Run success/error counts by day (7 days)
 * - Proposal status breakdown by agent
 * - Token usage by agent
 */

export default defineEventHandler(async (event) => {
  await requireAgentAdmin(event)

  const sb = createAdminClient() as any
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // 1. Runs in last 7 days for cost/status charts
  const { data: runs } = await sb
    .from('agent_runs')
    .select('agent_id, status, started_at, tokens_used, cost_usd, proposals_created')
    .gte('started_at', sevenDaysAgo)
    .order('started_at')

  // 2. Agent list for names + clusters
  const { data: agents } = await sb
    .from('agent_registry')
    .select('agent_id, display_name, cluster, daily_token_budget, daily_tokens_used')
    .order('cluster')

  const agentMap = new Map<string, any>()
  for (const a of (agents ?? [])) agentMap.set(a.agent_id, a)

  // Build daily cost by cluster (last 7 days)
  const dailyCost: Record<string, Record<string, number>> = {}
  const dailyRunStatus: Record<string, { success: number; error: number; partial: number }> = {}

  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().split('T')[0]
    dailyCost[key] = {}
    dailyRunStatus[key] = { success: 0, error: 0, partial: 0 }
  }

  for (const run of (runs ?? [])) {
    const day = run.started_at.split('T')[0]
    const agent = agentMap.get(run.agent_id)
    const cluster = agent?.cluster ?? 'unknown'
    const cost = Number(run.cost_usd) || 0

    if (dailyCost[day]) {
      dailyCost[day][cluster] = (dailyCost[day][cluster] ?? 0) + cost
    }
    if (dailyRunStatus[day]) {
      const s = run.status as 'success' | 'error' | 'partial'
      if (s in dailyRunStatus[day]) {
        dailyRunStatus[day][s]++
      }
    }
  }

  // Build per-agent token usage
  const agentTokens = (agents ?? []).map((a: any) => ({
    agent_id: a.agent_id,
    name: a.display_name,
    cluster: a.cluster,
    used: a.daily_tokens_used ?? 0,
    budget: a.daily_token_budget ?? 0,
    pct: a.daily_token_budget > 0
      ? Math.round(((a.daily_tokens_used ?? 0) / a.daily_token_budget) * 100)
      : 0,
  }))

  // Build per-agent proposal counts (last 7 days)
  const { data: recentProposals } = await sb
    .from('agent_proposals')
    .select('agent_id, status')
    .gte('created_at', sevenDaysAgo)

  const proposalsByAgent: Record<string, Record<string, number>> = {}
  for (const p of (recentProposals ?? [])) {
    if (!proposalsByAgent[p.agent_id]) {
      proposalsByAgent[p.agent_id] = {}
    }
    proposalsByAgent[p.agent_id][p.status] = (proposalsByAgent[p.agent_id][p.status] ?? 0) + 1
  }

  // Format for ApexCharts
  const days = Object.keys(dailyCost).sort()
  const clusters = [...new Set((agents ?? []).map((a: any) => a.cluster))]

  const costSeries = clusters.map((c: string) => ({
    name: c,
    data: days.map(d => Number((dailyCost[d]?.[c] ?? 0).toFixed(4))),
  }))

  const runSeries = [
    { name: 'Success', data: days.map(d => dailyRunStatus[d]?.success ?? 0) },
    { name: 'Error', data: days.map(d => dailyRunStatus[d]?.error ?? 0) },
    { name: 'Partial', data: days.map(d => dailyRunStatus[d]?.partial ?? 0) },
  ]

  return {
    success: true,
    data: {
      days,
      costSeries,
      runSeries,
      agentTokens,
      proposalsByAgent,
      clusters,
    },
  }
})
