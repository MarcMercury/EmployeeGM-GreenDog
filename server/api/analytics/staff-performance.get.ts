/**
 * Staff Performance Analytics
 *
 * GET /api/analytics/staff-performance?startDate=...&endDate=...&division=...&location=...
 *
 * Aggregates per-staff sales metrics from invoice_lines for the requested
 * window AND the prior equal-length window, so the page can render trend
 * deltas (sales growth / decline per provider) without a second round-trip.
 *
 * For each staff member we return:
 *   - revenue, transactions (distinct invoice_number), uniqueClients
 *   - avgTransactionValue, revenuePerClient
 *   - prior-period revenue + % change
 *   - topProductGroups[]  (the categories driving their book of business)
 *   - byLocation map      (so a single provider working at multiple clinics
 *                          shows where the revenue actually lands)
 *
 * Plus practice-wide rollups:
 *   - productGroupTotals  (used to highlight the practice's strongest groups)
 *   - staffByLocation     (rep counts + revenue per clinic)
 *   - leaderboards        (top by revenue, top growers, most clients served)
 */

// Auto-imported from server/utils/:
//   requireRole, MARKETING_ROLES, validateQuery, analyticsQuerySchema,
//   getCached, CACHE_TTL, lineRevenue

const LOCATION_NORM: Record<string, string> = {
  'green dog - venice (bu)': 'Venice',
  'green dog - venice': 'Venice',
  'green dog - van nuys': 'Van Nuys',
  'green dog - sherman oaks': 'Sherman Oaks',
  'gdd & mpmv': 'MPMV',
  'venice': 'Venice',
  'van nuys': 'Van Nuys',
  'sherman oaks': 'Sherman Oaks',
}

function normLoc(raw: string | null | undefined): string {
  if (!raw) return 'Other'
  return LOCATION_NORM[raw.toLowerCase().trim()] || raw
}

interface InvLine {
  invoice_date: string | null
  invoice_number: string | null
  staff_member: string | null
  client_code: string | null
  product_group: string | null
  department: string | null
  division: string | null
  total_earned: number | string | null
  price_after_discount: number | string | null
  invoice_type: string | null
}

async function loadInvoices(supabase: any, startDate: string, endDate: string, location: string | null, division: string | null): Promise<InvLine[]> {
  const out: InvLine[] = []
  const pageSize = 1000
  let page = 0
  let more = true

  while (more) {
    let q: any = supabase
      .from('invoice_lines')
      .select('invoice_date, invoice_number, staff_member, client_code, product_group, department, division, total_earned, price_after_discount, invoice_type')
      .not('invoice_type', 'eq', 'Header')
      .gte('invoice_date', startDate)
      .lte('invoice_date', endDate)
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (division) q = q.eq('division', division)
    else if (location) q = q.ilike('division', `%${location}%`)

    const { data, error } = await q
    if (error) throw createError({ statusCode: 500, message: 'Failed to load invoice lines: ' + error.message })
    if (data?.length) {
      out.push(...data)
      more = data.length === pageSize
      page++
    } else {
      more = false
    }
  }
  return out
}

interface StaffAgg {
  staff: string
  revenue: number
  transactions: number          // distinct invoice_number
  uniqueClients: number
  invoiceNumbers: Set<string>
  clientCodes: Set<string>
  productGroups: Record<string, number>
  byLocation: Record<string, number>
  primaryLocation: string
}

function aggregate(lines: InvLine[]): Record<string, StaffAgg> {
  const map: Record<string, StaffAgg> = {}
  for (const l of lines) {
    const staff = (l.staff_member || '').trim()
    if (!staff) continue
    if (!map[staff]) {
      map[staff] = {
        staff,
        revenue: 0,
        transactions: 0,
        uniqueClients: 0,
        invoiceNumbers: new Set(),
        clientCodes: new Set(),
        productGroups: {},
        byLocation: {},
        primaryLocation: 'Other',
      }
    }
    const rev = lineRevenue(l)
    const a = map[staff]
    a.revenue += rev
    if (l.invoice_number) a.invoiceNumbers.add(String(l.invoice_number))
    if (l.client_code) a.clientCodes.add(String(l.client_code))
    const pg = (l.product_group || 'Other').trim() || 'Other'
    a.productGroups[pg] = (a.productGroups[pg] || 0) + rev
    const loc = normLoc(l.division)
    a.byLocation[loc] = (a.byLocation[loc] || 0) + rev
  }
  for (const a of Object.values(map)) {
    a.transactions = a.invoiceNumbers.size
    a.uniqueClients = a.clientCodes.size
    // Primary location = where they earned the most revenue
    let bestLoc = 'Other'
    let bestRev = -1
    for (const [loc, rev] of Object.entries(a.byLocation)) {
      if (rev > bestRev) { bestRev = rev; bestLoc = loc }
    }
    a.primaryLocation = bestLoc
  }
  return map
}

export default defineEventHandler(async (event) => {
  const { supabase } = await requireRole(event, MARKETING_ROLES)
  const query = validateQuery(event, analyticsQuerySchema)
  const startDate = query.startDate || `${new Date().getFullYear()}-01-01`
  const endDate = query.endDate || new Date().toISOString().slice(0, 10)
  const location = query.location?.trim() || null
  const division = query.division?.trim() || null

  const cacheKey = `analytics:staff-performance:v1:${startDate}:${endDate}:${location || ''}:${division || ''}`

  return getCached(cacheKey, async () => {
    // Compute prior window of equal length, ending the day before startDate.
    const start = new Date(startDate + 'T00:00:00Z')
    const end = new Date(endDate + 'T00:00:00Z')
    const dayMs = 86400 * 1000
    const lengthDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / dayMs) + 1)
    const priorEnd = new Date(start.getTime() - dayMs)
    const priorStart = new Date(priorEnd.getTime() - (lengthDays - 1) * dayMs)
    const priorStartStr = priorStart.toISOString().slice(0, 10)
    const priorEndStr = priorEnd.toISOString().slice(0, 10)

    const [currentLines, priorLines] = await Promise.all([
      loadInvoices(supabase, startDate, endDate, location, division),
      loadInvoices(supabase, priorStartStr, priorEndStr, location, division),
    ])

    const currentAgg = aggregate(currentLines)
    const priorAgg = aggregate(priorLines)

    // ── Per-staff records ───────────────────────────────────────────────
    const staffRecords = Object.values(currentAgg).map(a => {
      const prior = priorAgg[a.staff]
      const priorRevenue = prior?.revenue || 0
      const change = priorRevenue > 0 ? ((a.revenue - priorRevenue) / priorRevenue) * 100 : (a.revenue > 0 ? 100 : 0)
      const topProductGroups = Object.entries(a.productGroups)
        .sort((x, y) => y[1] - x[1])
        .slice(0, 5)
        .map(([group, revenue]) => ({
          group,
          revenue: Math.round(revenue * 100) / 100,
          pctOfStaffRevenue: a.revenue > 0 ? Math.round((revenue / a.revenue) * 1000) / 10 : 0,
        }))
      const byLocation = Object.entries(a.byLocation)
        .sort((x, y) => y[1] - x[1])
        .map(([loc, revenue]) => ({ location: loc, revenue: Math.round(revenue * 100) / 100 }))
      return {
        staff: a.staff,
        primaryLocation: a.primaryLocation,
        revenue: Math.round(a.revenue * 100) / 100,
        priorRevenue: Math.round(priorRevenue * 100) / 100,
        revenueChangePct: Math.round(change * 10) / 10,
        transactions: a.transactions,
        uniqueClients: a.uniqueClients,
        avgTransactionValue: a.transactions > 0 ? Math.round((a.revenue / a.transactions) * 100) / 100 : 0,
        revenuePerClient: a.uniqueClients > 0 ? Math.round((a.revenue / a.uniqueClients) * 100) / 100 : 0,
        topProductGroups,
        byLocation,
      }
    }).sort((a, b) => b.revenue - a.revenue)

    // ── Practice-wide product-group totals (top groups overall) ────────
    const pgTotals: Record<string, number> = {}
    for (const l of currentLines) {
      const pg = (l.product_group || 'Other').trim() || 'Other'
      pgTotals[pg] = (pgTotals[pg] || 0) + lineRevenue(l)
    }
    const totalRevenue = Object.values(pgTotals).reduce((s, v) => s + v, 0)
    const productGroupTotals = Object.entries(pgTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([group, revenue]) => ({
        group,
        revenue: Math.round(revenue * 100) / 100,
        pctOfPractice: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 1000) / 10 : 0,
      }))

    // ── Staff-by-location summary ──────────────────────────────────────
    const locMap: Record<string, { location: string; staffCount: number; revenue: number; staff: Set<string> }> = {}
    for (const s of staffRecords) {
      for (const bl of s.byLocation) {
        if (bl.revenue <= 0) continue
        if (!locMap[bl.location]) locMap[bl.location] = { location: bl.location, staffCount: 0, revenue: 0, staff: new Set() }
        locMap[bl.location].revenue += bl.revenue
        locMap[bl.location].staff.add(s.staff)
      }
    }
    const staffByLocation = Object.values(locMap)
      .map(l => ({ location: l.location, staffCount: l.staff.size, revenue: Math.round(l.revenue * 100) / 100 }))
      .sort((a, b) => b.revenue - a.revenue)

    // ── Leaderboards ───────────────────────────────────────────────────
    const topByRevenue = staffRecords.slice(0, 10).map(s => ({ staff: s.staff, revenue: s.revenue, location: s.primaryLocation }))
    const topGrowers = [...staffRecords]
      .filter(s => s.priorRevenue > 100) // require some prior baseline so % isn't garbage
      .sort((a, b) => b.revenueChangePct - a.revenueChangePct)
      .slice(0, 10)
      .map(s => ({ staff: s.staff, revenueChangePct: s.revenueChangePct, revenue: s.revenue, priorRevenue: s.priorRevenue }))
    const mostClients = [...staffRecords]
      .sort((a, b) => b.uniqueClients - a.uniqueClients)
      .slice(0, 10)
      .map(s => ({ staff: s.staff, uniqueClients: s.uniqueClients, revenue: s.revenue }))
    const highestAvgTicket = [...staffRecords]
      .filter(s => s.transactions >= 10) // avoid one-off outliers
      .sort((a, b) => b.avgTransactionValue - a.avgTransactionValue)
      .slice(0, 10)
      .map(s => ({ staff: s.staff, avgTransactionValue: s.avgTransactionValue, transactions: s.transactions }))

    // ── KPIs (practice-wide) ───────────────────────────────────────────
    const allStaff = staffRecords.length
    const totalTransactions = staffRecords.reduce((s, x) => s + x.transactions, 0)
    const totalClients = new Set<string>()
    for (const l of currentLines) if (l.client_code) totalClients.add(String(l.client_code))

    return {
      success: true,
      period: { startDate, endDate },
      priorPeriod: { startDate: priorStartStr, endDate: priorEndStr },
      filters: { location, division },
      kpis: {
        totalStaff: allStaff,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalTransactions,
        totalClients: totalClients.size,
        avgRevenuePerStaff: allStaff > 0 ? Math.round((totalRevenue / allStaff) * 100) / 100 : 0,
      },
      staff: staffRecords,
      productGroupTotals,
      staffByLocation,
      leaderboards: {
        topByRevenue,
        topGrowers,
        mostClients,
        highestAvgTicket,
      },
    }
  }, CACHE_TTL.MEDIUM)
})
