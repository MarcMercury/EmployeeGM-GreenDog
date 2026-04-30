/**
 * Analytics AI Review
 *
 * POST /api/marketing/analytics-ai-review
 *
 * Audits the Practice Analytics & CRM report end-to-end with GPT-4o:
 *   1. Pulls the live KPI/aggregate output from the existing analytics
 *      endpoints (so we audit the SAME numbers the page renders).
 *   2. Builds a data-integrity fingerprint of invoice_lines + CRM contacts
 *      (null rates, distinct counts, outliers, suspicious patterns).
 *   3. Asks the model to verify methodology, flag anomalies, cross-reference
 *      against AAHA / VHMA / VetSuccess benchmarks, and propose fixes.
 *   4. Returns structured JSON the page can render directly.
 *
 * The prompt is deterministic and JSON-only so the UI never has to parse
 * markdown. All numbers come from the database — the model never invents
 * figures, only interprets them.
 */

import { CLIENT_BENCHMARKS, FINANCIAL_BENCHMARKS } from '~/utils/vetBenchmarks'

// Shared utils auto-imported from server/utils/:
// requireRole, MARKETING_ROLES, lineRevenue

interface AiReviewBody {
  startDate?: string
  endDate?: string
  location?: string
  division?: string
}

interface Finding {
  severity: 'critical' | 'warning' | 'info' | 'success'
  category: 'methodology' | 'data_quality' | 'anomaly' | 'benchmark' | 'recommendation'
  title: string
  detail: string
  metric?: string
  affectedRecords?: number
  suggestedAction?: string
}

interface AiReviewResponse {
  success: boolean
  generatedAt: string
  model: string
  costUsd: number
  tokensUsed: number
  durationMs: number
  dataFingerprint: Record<string, unknown>
  summary: string
  confidenceScore: number   // 0-100, model's confidence the report is accurate
  findings: Finding[]
  verifiedMetrics: Array<{ name: string; value: string; assessment: 'verified' | 'questionable' | 'flagged'; note: string }>
  topActions: Array<{ priority: 'high' | 'medium' | 'low'; title: string; rationale: string }>
}

export default defineEventHandler(async (event): Promise<AiReviewResponse> => {
  const { supabase } = await requireRole(event, MARKETING_ROLES)
  const body = await readBody<AiReviewBody>(event)

  const config = useRuntimeConfig()
  const openaiKey = config.openaiApiKey
  if (!openaiKey) {
    throw createError({ statusCode: 503, message: 'AI service not configured. Add OPENAI_API_KEY.' })
  }

  const now = new Date()
  const startDate = body?.startDate || `${now.getFullYear()}-01-01`
  const endDate = body?.endDate || now.toISOString().slice(0, 10)
  const location = body?.location?.trim() || null
  const division = body?.division?.trim() || null

  // ──────────────────────────────────────────────────────────────────
  // 1. DATA-INTEGRITY FINGERPRINT — small focused samples & counts
  //    designed to give the model enough signal without bloating tokens.
  // ──────────────────────────────────────────────────────────────────

  const fingerprint = await buildFingerprint(supabase, { startDate, endDate, location, division })

  // ──────────────────────────────────────────────────────────────────
  // 2. PULL ALREADY-COMPUTED KPIs from the live endpoints so the model
  //    audits exactly what the user sees on screen.
  // ──────────────────────────────────────────────────────────────────

  const params = new URLSearchParams({ startDate, endDate })
  if (location) params.set('location', location)
  if (division) params.set('division', division)

  const headers = getRequestHeaders(event)
  const cookie = headers.cookie || ''

  const fetchInternal = async <T>(path: string): Promise<T | null> => {
    try {
      return await $fetch<T>(`${path}?${params.toString()}`, {
        headers: cookie ? { cookie } : {},
      })
    } catch (err) {
      logger.warn(`[ai-review] internal fetch failed: ${path}`, 'analytics-ai-review', {
        error: err instanceof Error ? err.message : String(err),
      })
      return null
    }
  }

  const [perfData, crmAnalytics] = await Promise.all([
    fetchInternal<any>('/api/analytics/performance'),
    fetchInternal<any>('/api/marketing/ezyvet-analytics'),
  ])

  // ──────────────────────────────────────────────────────────────────
  // 3. PROMPT THE MODEL — JSON-only, schema-pinned response.
  // ──────────────────────────────────────────────────────────────────

  const startTime = Date.now()

  const systemPrompt = [
    'You are a senior veterinary practice business analyst auditing a single,',
    'unified analytics report. Your job is to:',
    '  1. Verify the calculations are methodologically sound (no double-counting,',
    '     correct denominators, correct date windows).',
    '  2. Flag data-quality issues that would distort the conclusions.',
    '  3. Detect anomalies (suspicious outliers, parsing failures, stale data).',
    '  4. Cross-reference against AAHA / VHMA / VetSuccess CA small-animal',
    '     benchmarks supplied below.',
    '  5. Recommend the highest-leverage actions.',
    'NEVER invent numbers. Only interpret what is provided. If a number looks',
    'wrong, name the field and explain why. Return STRICT JSON matching the',
    'schema below — no prose, no markdown.',
  ].join('\n')

  const benchmarks = {
    clientRetention: CLIENT_BENCHMARKS.clientRetention,
    averageTransactionCharge: CLIENT_BENCHMARKS.averageTransactionCharge,
    annualClientValue: CLIENT_BENCHMARKS.annualClientValue,
    revenuePerFteVet: FINANCIAL_BENCHMARKS.revenuePerFteVet,
    cogs: FINANCIAL_BENCHMARKS.cogs,
    payrollCostRatio: FINANCIAL_BENCHMARKS.payrollCostRatio,
  }

  const userPrompt = JSON.stringify({
    instructions: [
      'Audit the report below. For each finding, classify it as critical / warning / info / success.',
      'Use the dataFingerprint to detect suspicious patterns (e.g. >30% rows missing invoice_date,',
      'high % of negative or zero revenue rows, division/location string anomalies, outlier dates,',
      'duplicate detection signals).',
      'Use the kpis + perf + crm sections to verify the numbers tell a coherent business story.',
      'Cross-check headline metrics against the benchmarks block.',
      'Output ONLY the JSON object specified in responseSchema — no commentary.',
    ],
    period: { startDate, endDate, location, division },
    benchmarks,
    dataFingerprint: fingerprint,
    perfKpis: perfData?.kpis ?? null,
    perfDataSummary: perfData?.dataSummary ?? null,
    perfMonthlyTrend: (perfData?.monthlyTrend ?? []).map((m: any) => ({
      month: m.month, revenue: m.revenue, appointments: m.appointments,
    })),
    perfRevenuePerAppt: perfData?.revenuePerAppt ?? null,
    perfTopProductGroups: (perfData?.topProductGroups ?? []).slice(0, 8).map((p: any) => ({
      group: p.group, revenue: p.revenue,
    })),
    crmKpis: crmAnalytics?.kpis ?? null,
    crmRevenueDistribution: crmAnalytics?.revenueDistribution ?? null,
    crmRecencyChart: (crmAnalytics?.recencyChart ?? []).map((r: any) => ({ label: r.label, count: r.count })),
    crmClientSegments: (crmAnalytics?.clientSegments ?? []).map((s: any) => ({
      label: s.label, count: s.count, revenue: s.revenue, retentionRate: s.retentionRate,
    })),
    crmDivisionBreakdown: (crmAnalytics?.divisionBreakdown ?? []).slice(0, 8),
    crmDepartmentBreakdown: (crmAnalytics?.departmentBreakdown ?? []).slice(0, 8),
    crmDataQuality: crmAnalytics?.dataQuality ?? null,
    crmDataQualityNote: crmAnalytics?.dataQualityNote ?? null,
    responseSchema: {
      summary: 'one-paragraph executive verdict (≤ 80 words)',
      confidenceScore: 'integer 0-100 — your confidence the report is accurate and decision-ready',
      findings: [{
        severity: 'critical|warning|info|success',
        category: 'methodology|data_quality|anomaly|benchmark|recommendation',
        title: 'short headline',
        detail: 'specific evidence from the data',
        metric: 'the number or % that triggered this',
        affectedRecords: 'integer when applicable',
        suggestedAction: 'concrete next step',
      }],
      verifiedMetrics: [{
        name: 'metric name',
        value: 'value as displayed',
        assessment: 'verified|questionable|flagged',
        note: 'why',
      }],
      topActions: [{
        priority: 'high|medium|low',
        title: 'action headline',
        rationale: 'why now / expected impact',
      }],
    },
  })

  const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.2,
      max_tokens: 3500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!aiResponse.ok) {
    const errText = await aiResponse.text()
    logger.error('[ai-review] OpenAI error', null, 'analytics-ai-review', { status: aiResponse.status, body: errText.slice(0, 500) })
    throw createError({ statusCode: 502, message: `AI review failed (${aiResponse.status})` })
  }

  const aiData = await aiResponse.json() as {
    choices: Array<{ message: { content: string } }>
    usage?: { total_tokens?: number; prompt_tokens?: number; completion_tokens?: number }
    model?: string
  }
  const durationMs = Date.now() - startTime
  const raw = aiData.choices?.[0]?.message?.content ?? '{}'

  let parsed: any = {}
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    logger.error('[ai-review] JSON parse failed', err instanceof Error ? err : null, 'analytics-ai-review', {
      sample: raw.slice(0, 400),
    })
    throw createError({ statusCode: 502, message: 'AI returned malformed JSON. Try again.' })
  }

  const tokensUsed = aiData.usage?.total_tokens ?? 0
  // gpt-4o blended cost: ~$2.50/1M input + $10/1M output. Use blended ≈ $0.0075/1K.
  const costUsd = (tokensUsed / 1000) * 0.0075

  // Log usage (fire and forget)
  supabase.from('ai_usage_log').insert({
    feature: 'analytics-ai-review',
    model: aiData.model || 'gpt-4o',
    tokens_used: tokensUsed,
    prompt_tokens: aiData.usage?.prompt_tokens ?? 0,
    completion_tokens: aiData.usage?.completion_tokens ?? 0,
    cost_usd: costUsd,
    duration_ms: durationMs,
    success: true,
    metadata: { startDate, endDate, location, division },
  }).then(() => {}).catch(() => { /* logging is best-effort */ })

  const findings: Finding[] = Array.isArray(parsed.findings) ? parsed.findings : []
  // Sort: critical → warning → info → success
  const sevOrder: Record<string, number> = { critical: 0, warning: 1, info: 2, success: 3 }
  findings.sort((a, b) => (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9))

  return {
    success: true,
    generatedAt: new Date().toISOString(),
    model: aiData.model || 'gpt-4o',
    costUsd: Math.round(costUsd * 10000) / 10000,
    tokensUsed,
    durationMs,
    dataFingerprint: fingerprint,
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    confidenceScore: clampScore(parsed.confidenceScore),
    findings,
    verifiedMetrics: Array.isArray(parsed.verifiedMetrics) ? parsed.verifiedMetrics : [],
    topActions: Array.isArray(parsed.topActions) ? parsed.topActions : [],
  }
})

function clampScore(v: unknown): number {
  const n = typeof v === 'number' ? v : parseInt(String(v), 10)
  if (isNaN(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

// ──────────────────────────────────────────────────────────────────────
// FINGERPRINT BUILDER
// Pulls a focused, bounded set of integrity signals from invoice_lines
// and ezyvet_crm_contacts. All counts are head:true (no row transfer).
// Outlier samples are hard-capped to keep the prompt small.
// ──────────────────────────────────────────────────────────────────────

interface FingerprintArgs {
  startDate: string
  endDate: string
  location: string | null
  division: string | null
}

async function buildFingerprint(supabase: any, args: FingerprintArgs) {
  const { startDate, endDate, location, division } = args

  const applyInvoiceFilters = <T extends { gte: any; lte: any; eq?: any; ilike?: any; not?: any }>(q: T): T => {
    let r: any = q.not('invoice_type', 'eq', 'Header')
      .gte('invoice_date', startDate)
      .lte('invoice_date', endDate)
    if (division) r = r.eq('division', division)
    else if (location) r = r.ilike('division', `%${location}%`)
    return r as T
  }

  const head = (q: any) => q.select('*', { count: 'exact', head: true })

  // Counts in parallel
  const [
    invTotal,
    invMissingDate,
    invMissingClient,
    invMissingDept,
    invMissingDivision,
    invNegativeRevenue,
    invZeroRevenue,
    invFutureDate,
    invAncientDate,
    crmTotal,
    crmMissingEmail,
    crmMissingLastVisit,
    crmFutureLastVisit,
  ] = await Promise.all([
    applyInvoiceFilters(head(supabase.from('invoice_lines'))),
    applyInvoiceFilters(head(supabase.from('invoice_lines'))).is('invoice_date', null),
    applyInvoiceFilters(head(supabase.from('invoice_lines'))).is('client_code', null),
    applyInvoiceFilters(head(supabase.from('invoice_lines'))).is('department', null),
    applyInvoiceFilters(head(supabase.from('invoice_lines'))).is('division', null),
    applyInvoiceFilters(head(supabase.from('invoice_lines'))).lt('total_earned', 0),
    applyInvoiceFilters(head(supabase.from('invoice_lines'))).eq('total_earned', 0),
    applyInvoiceFilters(head(supabase.from('invoice_lines'))).gt('invoice_date', new Date().toISOString().slice(0, 10)),
    applyInvoiceFilters(head(supabase.from('invoice_lines'))).lt('invoice_date', '2020-01-01'),
    head(supabase.from('ezyvet_crm_contacts')),
    head(supabase.from('ezyvet_crm_contacts')).is('email', null),
    head(supabase.from('ezyvet_crm_contacts')).is('last_visit', null),
    head(supabase.from('ezyvet_crm_contacts')).gt('last_visit', new Date().toISOString().slice(0, 10)),
  ])

  // Distinct division/department samples (cap 20 each)
  const { data: divSamples } = await applyInvoiceFilters(
    supabase.from('invoice_lines').select('division').not('division', 'is', null).limit(2000)
  )
  const distinctDivisions = unique((divSamples || []).map((r: any) => r.division)).slice(0, 20)

  const { data: deptSamples } = await applyInvoiceFilters(
    supabase.from('invoice_lines').select('department').not('department', 'is', null).limit(2000)
  )
  const distinctDepartments = unique((deptSamples || []).map((r: any) => r.department)).slice(0, 20)

  // Top 5 outlier invoice lines by absolute revenue
  const { data: highRevLines } = await applyInvoiceFilters(
    supabase
      .from('invoice_lines')
      .select('invoice_date, division, department, product_name, total_earned, price_after_discount, client_code')
      .order('total_earned', { ascending: false })
      .limit(5)
  )

  const { data: lowRevLines } = await applyInvoiceFilters(
    supabase
      .from('invoice_lines')
      .select('invoice_date, division, department, product_name, total_earned, price_after_discount, client_code')
      .order('total_earned', { ascending: true })
      .limit(5)
  )

  // Suspicious: invoice_date older than 24 months (purge boundary)
  const purgeBoundary = new Date()
  purgeBoundary.setMonth(purgeBoundary.getMonth() - 24)
  const { count: olderThanPurge } = await head(supabase.from('invoice_lines'))
    .lt('invoice_date', purgeBoundary.toISOString().slice(0, 10))

  // Sample CRM contacts with non-trivial revenue but no email/last_visit
  const { data: crmHighRevNoContact } = await supabase
    .from('ezyvet_crm_contacts')
    .select('ezyvet_contact_code, first_name, last_name, revenue_ytd, last_visit, email, phone_mobile')
    .gt('revenue_ytd', 1000)
    .or('email.is.null,phone_mobile.is.null')
    .limit(5)

  const total = invTotal.count || 0
  const pct = (n: number | null | undefined) => (total > 0 ? Math.round(((n || 0) / total) * 1000) / 10 : 0)

  return {
    period: { startDate, endDate, location, division },
    invoice: {
      totalRows: total,
      missingInvoiceDate: { count: invMissingDate.count || 0, pct: pct(invMissingDate.count) },
      missingClientCode: { count: invMissingClient.count || 0, pct: pct(invMissingClient.count) },
      missingDepartment: { count: invMissingDept.count || 0, pct: pct(invMissingDept.count) },
      missingDivision: { count: invMissingDivision.count || 0, pct: pct(invMissingDivision.count) },
      negativeRevenue: { count: invNegativeRevenue.count || 0, pct: pct(invNegativeRevenue.count), note: 'expected for credit notes — large % could indicate parsing flip' },
      zeroRevenue: { count: invZeroRevenue.count || 0, pct: pct(invZeroRevenue.count) },
      futureDated: { count: invFutureDate.count || 0, pct: pct(invFutureDate.count), note: 'should be 0 unless prepaid' },
      preEpochDates: { count: invAncientDate.count || 0, note: 'invoice_date < 2020-01-01 likely a parser failure' },
      olderThan24Months: { count: olderThanPurge || 0, note: 'should be 0 — purge job runs after each upload' },
      distinctDivisions,
      distinctDepartments,
      highRevenueOutliers: highRevLines || [],
      lowRevenueOutliers: lowRevLines || [],
    },
    crm: {
      totalRows: crmTotal.count || 0,
      missingEmail: { count: crmMissingEmail.count || 0, pct: pctOf(crmMissingEmail.count, crmTotal.count) },
      missingLastVisit: { count: crmMissingLastVisit.count || 0, pct: pctOf(crmMissingLastVisit.count, crmTotal.count) },
      futureLastVisit: { count: crmFutureLastVisit.count || 0, note: 'should be 0 — likely DD/MM vs MM/DD parse error' },
      highRevenueButMissingContact: crmHighRevNoContact || [],
    },
  }
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr))
}

function pctOf(n: number | null | undefined, total: number | null | undefined): number {
  const t = total || 0
  if (t === 0) return 0
  return Math.round(((n || 0) / t) * 1000) / 10
}
