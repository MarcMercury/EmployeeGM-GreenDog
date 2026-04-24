/**
 * Agent: Data Freshness
 *
 * Watches external data sources (ezyVet, Slack, marketing, referrals, invoices)
 * for staleness. Raises a health_report proposal when the most recent row in
 * a configured source is older than the allowed threshold.
 *
 * Config shape (ctx.config.sources):
 *   [
 *     { key: 'ezyvet_sync', table: 'ezyvet_api_sync_log',
 *       timestamp_column: 'created_at', max_age_hours: 24, label: 'ezyVet sync' },
 *     ...
 *   ]
 *
 * If no sources are configured, a sensible default set is used.
 *
 * Reads: each configured source table (most recent row).
 * Writes: agent_proposals (health_report).
 */

import type { AgentRunContext, AgentRunResult } from '~/types/agent.types'
import { createProposal, autoApproveProposal } from '../../utils/agents/proposals'
import { logger } from '../../utils/logger'

interface FreshnessSource {
  key: string
  table: string
  timestamp_column: string
  max_age_hours: number
  label?: string
  filter_column?: string
  filter_value?: string | number | boolean
}

const DEFAULT_SOURCES: FreshnessSource[] = [
  { key: 'ezyvet_sync', table: 'ezyvet_api_sync_log', timestamp_column: 'created_at', max_age_hours: 24, label: 'ezyVet API sync' },
  { key: 'slack_sync', table: 'slack_sync_logs', timestamp_column: 'created_at', max_age_hours: 24, label: 'Slack sync' },
  { key: 'marketing_events', table: 'marketing_events', timestamp_column: 'updated_at', max_age_hours: 24 * 14, label: 'Marketing events' },
  { key: 'invoice_lines', table: 'invoice_lines', timestamp_column: 'created_at', max_age_hours: 24 * 30, label: 'Invoice lines' },
  { key: 'referral_revenue', table: 'referral_revenue_line_items', timestamp_column: 'created_at', max_age_hours: 24 * 60, label: 'Referral revenue' },
]

function normalizeSources(raw: unknown): FreshnessSource[] {
  if (!Array.isArray(raw)) return DEFAULT_SOURCES
  const out: FreshnessSource[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const src = item as Record<string, unknown>
    const table = typeof src.table === 'string' ? src.table : null
    const key = typeof src.key === 'string' ? src.key : table
    const ts = typeof src.timestamp_column === 'string' ? src.timestamp_column : 'created_at'
    const maxAge = Number(src.max_age_hours)
    if (!table || !key || !Number.isFinite(maxAge) || maxAge <= 0) continue
    out.push({
      key,
      table,
      timestamp_column: ts,
      max_age_hours: maxAge,
      label: typeof src.label === 'string' ? src.label : undefined,
      filter_column: typeof src.filter_column === 'string' ? src.filter_column : undefined,
      filter_value: src.filter_value as FreshnessSource['filter_value'],
    })
  }
  return out.length > 0 ? out : DEFAULT_SOURCES
}

const handler = async (ctx: AgentRunContext): Promise<AgentRunResult> => {
  const { supabase: _sb, agentId, runId, config } = ctx
  const supabase = _sb as any

  const sources = normalizeSources(config?.sources)
  logger.info(`[Agent:${agentId}] Starting data freshness scan`, 'agent', {
    runId,
    sourceCount: sources.length,
  })

  const nowMs = Date.now()
  const perSourceResults: Array<{
    key: string
    table: string
    label: string
    status: 'ok' | 'stale' | 'empty' | 'error'
    last_timestamp: string | null
    age_hours: number | null
    max_age_hours: number
    error?: string
  }> = []

  for (const source of sources) {
    const label = source.label ?? source.key
    try {
      let query = supabase
        .from(source.table)
        .select(source.timestamp_column)
        .order(source.timestamp_column, { ascending: false, nullsFirst: false })
        .limit(1)

      if (source.filter_column && source.filter_value !== undefined) {
        query = query.eq(source.filter_column, source.filter_value)
      }

      const { data, error } = await query

      if (error) {
        perSourceResults.push({
          key: source.key,
          table: source.table,
          label,
          status: 'error',
          last_timestamp: null,
          age_hours: null,
          max_age_hours: source.max_age_hours,
          error: error.message,
        })
        continue
      }

      const row = Array.isArray(data) && data.length > 0 ? data[0] : null
      const rawTs = row ? (row as Record<string, unknown>)[source.timestamp_column] : null

      if (!rawTs || typeof rawTs !== 'string') {
        perSourceResults.push({
          key: source.key,
          table: source.table,
          label,
          status: 'empty',
          last_timestamp: null,
          age_hours: null,
          max_age_hours: source.max_age_hours,
        })
        continue
      }

      const lastMs = new Date(rawTs).getTime()
      const ageHours = Number.isFinite(lastMs) ? (nowMs - lastMs) / (60 * 60 * 1000) : null
      const isStale = ageHours === null || ageHours > source.max_age_hours

      perSourceResults.push({
        key: source.key,
        table: source.table,
        label,
        status: isStale ? 'stale' : 'ok',
        last_timestamp: rawTs,
        age_hours: ageHours === null ? null : Math.round(ageHours * 10) / 10,
        max_age_hours: source.max_age_hours,
      })
    } catch (err: any) {
      perSourceResults.push({
        key: source.key,
        table: source.table,
        label,
        status: 'error',
        last_timestamp: null,
        age_hours: null,
        max_age_hours: source.max_age_hours,
        error: err?.message ?? String(err),
      })
    }
  }

  const problems = perSourceResults.filter(r => r.status === 'stale' || r.status === 'error' || r.status === 'empty')
  const issueCount = problems.length
  let proposalsCreated = 0
  let proposalsAutoApproved = 0

  if (issueCount > 0) {
    const summaryParts = problems.map(p => {
      if (p.status === 'stale') return `${p.label}: ${p.age_hours}h old (>${p.max_age_hours}h)`
      if (p.status === 'empty') return `${p.label}: no rows`
      return `${p.label}: error`
    })

    const proposalId = await createProposal({
      agentId,
      proposalType: 'health_report',
      title: `Data Freshness Alert (${issueCount} source${issueCount === 1 ? '' : 's'})`,
      summary: summaryParts.slice(0, 4).join('; ') + (summaryParts.length > 4 ? '; ...' : ''),
      detail: {
        checked_sources: perSourceResults.length,
        problem_sources: problems,
        all_sources: perSourceResults,
      },
      riskLevel: 'low',
      expiresInHours: 24,
    })

    if (proposalId) {
      proposalsCreated++
      const approved = await autoApproveProposal(proposalId)
      if (approved) proposalsAutoApproved++
    }
  }

  return {
    status: 'success',
    proposalsCreated,
    proposalsAutoApproved,
    tokensUsed: 0,
    costUsd: 0,
    summary: issueCount === 0
      ? `All ${perSourceResults.length} data source(s) fresh.`
      : `${issueCount} of ${perSourceResults.length} data source(s) need attention.`,
    metadata: {
      sources_checked: perSourceResults.length,
      sources_ok: perSourceResults.filter(r => r.status === 'ok').length,
      sources_stale: perSourceResults.filter(r => r.status === 'stale').length,
      sources_empty: perSourceResults.filter(r => r.status === 'empty').length,
      sources_error: perSourceResults.filter(r => r.status === 'error').length,
    },
  }
}

export default handler
