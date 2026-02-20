/**
 * Agent C4: Referral Intelligence
 *
 * Analyzes referral partner data to identify trends, suggest outreach
 * priorities, and flag declining/inactive partnerships.
 *
 * Reads: referral_partners, referral_sync_history, clinic_visits,
 *        partner_contacts, partner_notes
 * Writes: agent_proposals (referral_insight type)
 * LLM: gpt-4o-mini for insight generation
 */

import type { AgentRunContext, AgentRunResult } from '~/types/agent.types'
import { createProposal, autoApproveProposal } from '../../utils/agents/proposals'
import { agentChat } from '../../utils/agents/openai'
import { logger } from '../../utils/logger'
import { getBenchmarkContextForAI, REFERRAL_BENCHMARKS } from '~/utils/vetBenchmarks'

const handler = async (ctx: AgentRunContext): Promise<AgentRunResult> => {
  const { supabase: _sb, agentId, runId } = ctx
  const supabase = _sb as any

  logger.info(`[Agent:${agentId}] Starting referral intelligence`, 'agent', { runId })

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()

  // 1. Get all referral partners
  const { data: partners, error: partErr } = await supabase
    .from('referral_partners')
    .select('id, hospital_name, address, status, tier, total_referrals, last_contact_date, notes, created_at')
    .order('hospital_name')

  if (partErr || !partners) {
    throw new Error(`Failed to fetch referral partners: ${partErr?.message}`)
  }

  if (partners.length === 0) {
    return {
      status: 'success',
      proposalsCreated: 0,
      proposalsAutoApproved: 0,
      tokensUsed: 0,
      costUsd: 0,
      summary: 'No referral partners found.',
    }
  }

  // 2. Get recent clinic visits (last 90 days)
  const { data: recentVisits } = await supabase
    .from('clinic_visits')
    .select('id, partner_id, visit_date, visit_notes, spoke_to, clinic_name')
    .gte('visit_date', ninetyDaysAgo)
    .order('visit_date', { ascending: false })

  // 3. Get referral sync history for trend analysis
  const { data: syncHistory } = await supabase
    .from('referral_sync_history')
    .select('id, total_referrals, new_referrals, created_at')
    .order('created_at', { ascending: false })
    .limit(12)

  // 4. Get partner notes (last 90 days)
  const { data: partnerNotes } = await supabase
    .from('partner_notes')
    .select('id, partner_id, content, created_at')
    .gte('created_at', ninetyDaysAgo)
    .order('created_at', { ascending: false })
    .limit(100)

  // 5. Analyze partners
  const partnerAnalysis = partners.map((p: any) => {
    const visits = (recentVisits ?? []).filter((v: any) => v.partner_id === p.id)
    const notes = (partnerNotes ?? []).filter((n: any) => n.partner_id === p.id)
    const lastReferral = p.last_contact_date ? new Date(p.last_contact_date) : null
    const daysSinceLastReferral = lastReferral
      ? Math.floor((now.getTime() - lastReferral.getTime()) / (1000 * 60 * 60 * 24))
      : null

    const lastVisit = visits.length > 0 ? new Date(visits[0].visit_date) : null
    const daysSinceLastVisit = lastVisit
      ? Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
      : null

    return {
      id: p.id,
      name: p.hospital_name,
      status: p.status,
      tier: p.tier,
      referral_count: p.total_referrals ?? 0,
      days_since_last_referral: daysSinceLastReferral,
      visits_last_90_days: visits.length,
      days_since_last_visit: daysSinceLastVisit,
      notes_count: notes.length,
      address: p.address,
    }
  })

  // 6. Identify issues and opportunities
  const inactive = partnerAnalysis.filter(
    (p: any) => (p.days_since_last_referral === null || p.days_since_last_referral > 60) && p.status === 'active'
  )
  const unvisited = partnerAnalysis.filter(
    (p: any) => p.visits_last_90_days === 0 && p.status === 'active'
  )
  const topPerformers = partnerAnalysis
    .filter((p: any) => p.referral_count > 0)
    .sort((a: any, b: any) => b.referral_count - a.referral_count)
    .slice(0, 10)

  // 7. Dedup — avoid weekly duplicate insights
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentInsights } = await supabase
    .from('agent_proposals')
    .select('id')
    .eq('agent_id', agentId)
    .eq('proposal_type', 'referral_insight')
    .gte('created_at', weekAgo)

  if (recentInsights && recentInsights.length > 0) {
    return {
      status: 'success',
      proposalsCreated: 0,
      proposalsAutoApproved: 0,
      tokensUsed: 0,
      costUsd: 0,
      summary: `Already generated insights this week. ${partners.length} partners tracked.`,
    }
  }

  // 8. LLM: Generate strategic insights
  const contextSummary = `
REFERRAL PARTNER PORTFOLIO: ${partners.length} total partners

TOP 10 BY VOLUME:
${topPerformers.map((p: any) => `- ${p.name} (${p.address ?? 'no address'}): ${p.referral_count} referrals, last referral ${p.days_since_last_referral ?? 'never'} days ago`).join('\n')}

INACTIVE PARTNERS (>60 days since last referral): ${inactive.length}
${inactive.slice(0, 10).map((p: any) => `- ${p.name}: ${p.days_since_last_referral ?? 'no'} days since referral, ${p.visits_last_90_days} visits in 90d`).join('\n')}

UNVISITED ACTIVE PARTNERS (no clinic visits in 90 days): ${unvisited.length}
${unvisited.slice(0, 10).map((p: any) => `- ${p.name} (${p.address ?? 'no address'}): ${p.referral_count} total referrals`).join('\n')}

SYNC TREND (last 12 syncs):
${(syncHistory ?? []).slice(0, 6).map((s: any) => `- ${new Date(s.created_at).toLocaleDateString()}: ${s.new_referrals} new / ${s.total_referrals} total`).join('\n')}
`

  let totalTokens = 0
  let totalCost = 0

  const chatResult = await agentChat({
    agentId,
    runId,
    messages: [
      {
        role: 'system',
        content: `You are a veterinary practice referral strategist specializing in California small-animal practices. Analyze the referral partner data and provide actionable insights.

${getBenchmarkContextForAI()}

REFERRAL-SPECIFIC BENCHMARKS:
- Visit platinum/gold partners every ${REFERRAL_BENCHMARKS.visitFrequency.highTier} days
- Visit silver partners every ${REFERRAL_BENCHMARKS.visitFrequency.midTier} days
- Visit bronze/new partners every ${REFERRAL_BENCHMARKS.visitFrequency.lowTier} days
- No single partner should exceed ${REFERRAL_BENCHMARKS.referralConcentration.maxSingleSource * 100}% of total referrals
- Top 3 partners should be < ${REFERRAL_BENCHMARKS.referralConcentration.topThreeMax * 100}% of total
- Target 24 new clients per month per veterinarian from all sources combined

Focus on:
1. Outreach priorities (who to visit this week)
2. At-risk partnerships (declining activity)
3. Growth opportunities (high-potential partners not being leveraged)
4. Trends (is referral volume growing or declining?)
5. Revenue concentration risk (too dependent on few sources?)

Respond in JSON:
{
  "insights": [
    {
      "type": "opportunity|risk|trend|recommendation",
      "title": "Short title",
      "summary": "2-3 sentence explanation with specific data. Reference CA vet industry benchmarks where relevant.",
      "priority": "high|medium|low",
      "partners_referenced": ["Partner Name"]
    }
  ],
  "weekly_outreach_priority": ["Partner 1", "Partner 2", "Partner 3"],
  "overall_health": "healthy|needs_attention|concerning"
}`,
      },
      { role: 'user', content: contextSummary },
    ],
    model: 'fast',
    responseFormat: 'json',
    maxTokens: 2000,
    temperature: 0.4,
  })

  totalTokens += chatResult.tokensUsed
  totalCost += chatResult.costUsd

  // 9. Parse and create proposals
  let proposalsCreated = 0
  let proposalsAutoApproved = 0

  try {
    const parsed = JSON.parse(chatResult.content)
    const insights = parsed.insights ?? []

    // Create individual proposals for high-priority insights
    for (const insight of insights.filter((i: any) => i.priority === 'high').slice(0, 3)) {
      const proposalId = await createProposal({
        agentId,
        proposalType: 'referral_insight',
        title: `🏥 ${insight.title}`,
        summary: insight.summary,
        detail: {
          insight_type: insight.type,
          summary: insight.summary,
          priority: insight.priority,
          partners_referenced: insight.partners_referenced,
          data: { overall_health: parsed.overall_health, outreach_priority: parsed.weekly_outreach_priority },
        },
        targetEntityType: 'referral_partners',
        riskLevel: 'low',
        expiresInHours: 168, // 1 week
      })

      if (proposalId) {
        proposalsCreated++
        await autoApproveProposal(proposalId)
        proposalsAutoApproved++
      }
    }

    // Weekly summary proposal
    const summaryId = await createProposal({
      agentId,
      proposalType: 'referral_insight',
      title: `Weekly Referral Intelligence — ${now.toLocaleDateString()}`,
      summary: `Health: ${parsed.overall_health}. ${inactive.length} inactive, ${unvisited.length} unvisited. Outreach priority: ${(parsed.weekly_outreach_priority ?? []).join(', ')}.`,
      detail: {
        insight_type: 'trend',
        summary: chatResult.content,
        data: {
          total_partners: partners.length,
          inactive_count: inactive.length,
          unvisited_count: unvisited.length,
          top_performers: topPerformers.slice(0, 5).map((p: any) => ({ name: p.name, count: p.referral_count })),
          insights: insights.length,
          overall_health: parsed.overall_health,
          weekly_outreach_priority: parsed.weekly_outreach_priority,
        },
      },
      targetEntityType: 'referral_partners',
      riskLevel: 'low',
      expiresInHours: 168,
    })

    if (summaryId) {
      proposalsCreated++
      await autoApproveProposal(summaryId)
      proposalsAutoApproved++
    }
  } catch {
    logger.warn(`[Agent:${agentId}] Failed to parse LLM insights`, 'agent')
  }

  return {
    status: 'success',
    proposalsCreated,
    proposalsAutoApproved,
    tokensUsed: totalTokens,
    costUsd: totalCost,
    summary: `Analyzed ${partners.length} partners. ${inactive.length} inactive, ${unvisited.length} unvisited. ${proposalsCreated} insights generated.`,
    metadata: {
      totalPartners: partners.length,
      inactiveCount: inactive.length,
      unvisitedCount: unvisited.length,
      insightsGenerated: proposalsCreated,
    },
  }
}

export default handler
