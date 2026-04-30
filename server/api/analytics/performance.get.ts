/**
 * Performance Analytics API
 *
 * GET /api/analytics/performance?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 *
 * Returns pre-aggregated data for the Practice Analytics page.
 * Combines appointment_data (status reports) + invoice_lines (revenue)
 * with location normalization and proper cross-referencing.
 *
 * Revenue: Directly from invoice_lines table, grouped by division (location).
 * Appointments: Only COMPLETED appointments from appointment_status uploads.
 * Clients: DISTINCT client_code from invoice_lines.
 *
 * NOTE — "division" here means physical clinic location (Venice, Van Nuys,
 * Sherman Oaks). This is distinct from "department" (service category like
 * Surgery or Dentistry) used in practice-overview.get.ts.
 */

// Shared utils auto-imported from server/utils/:
// requireRole, MARKETING_ROLES, validateQuery, analyticsQuerySchema,
// getCached, CACHE_TTL, lineRevenue

// ── Location normalization ──────────────────────────────────────────────

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

function normLoc(raw: string | null): string {
  if (!raw) return 'Other'
  return LOCATION_NORM[raw.toLowerCase().trim()] || raw
}

// Clinic-only locations (exclude MPMV, Other from main charts)
const CLINIC_LOCATIONS = ['Sherman Oaks', 'Van Nuys', 'Venice']

// ── Garbage appointment type filter ─────────────────────────────────────

const EXCLUDED_TYPES = new Set([
  'zvet services only',
  'venice - green dog facility',
  'sherman oaks - main facility',
  'waitlist - not confirmed',
])

function isGarbageType(type: string): boolean {
  const lower = type.toLowerCase().trim()
  if (EXCLUDED_TYPES.has(lower)) return true
  if (lower.startsWith('green dog -')) return true
  return false
}

function isAvailabilityType(type: string): boolean {
  const lower = type.toLowerCase()
  return lower.includes('avail') || lower === 'uc openings' || lower.includes('same day uc')
}

// lineRevenue() — auto-imported from server/utils/lineRevenue.ts

// ── Export ───────────────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  const { supabase } = await requireRole(event, MARKETING_ROLES)
  const query = validateQuery(event, analyticsQuerySchema)
  const startDate = query.startDate || '2025-01-01'
  const endDate = query.endDate || new Date().toISOString().split('T')[0]

  const cacheKey = `analytics:performance:v4:${startDate}:${endDate}`
  return getCached(cacheKey, async () => {

  // ── 1. LOAD APPOINTMENT DATA (only completed from appointment_status) ─

  let allAppts: any[] = []
  let page = 0
  const pageSize = 1000
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from('appointment_data')
      .select('appointment_date, appointment_type, service_category, location_name, source, raw_data, status, duration_minutes')
      .gte('appointment_date', startDate)
      .lte('appointment_date', endDate)
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) throw createError({ statusCode: 500, message: 'Failed to load appointment data: ' + error.message })
    if (data && data.length > 0) {
      allAppts = allAppts.concat(data)
      hasMore = data.length === pageSize
      page++
    } else {
      hasMore = false
    }
  }

  // ── 2. LOAD INVOICE DATA (RPC preferred, pagination fallback) ─────────

  let invoiceSummary: any = null
  let invoiceLines: any[] = []

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_performance_invoice_summary', {
      p_start_date: startDate,
      p_end_date: endDate,
    })
    if (!rpcError && rpcData) invoiceSummary = rpcData
  } catch { /* RPC not available — fall back to pagination */ }

  if (!invoiceSummary) {
    let invPage = 0
    let invHasMore = true

    while (invHasMore) {
      const from = invPage * pageSize
      const to = from + pageSize - 1

      const { data: invData, error: invError } = await supabase
        .from('invoice_lines')
        .select('invoice_date, total_earned, price_after_discount, division, department, client_code, product_group, staff_member, invoice_number, invoice_type')
        .not('invoice_type', 'eq', 'Header')
        .gte('invoice_date', startDate)
        .lte('invoice_date', endDate)
        .range(from, to)

      if (invError) throw createError({ statusCode: 500, message: 'Failed to load invoice lines: ' + invError.message })
      if (invData && invData.length > 0) {
        invoiceLines = invoiceLines.concat(invData)
        invHasMore = invData.length === pageSize
        invPage++
      } else {
        invHasMore = false
      }
    }
  }

  // ── 3. AGGREGATE APPOINTMENT DATA ─────────────────────────────────────

  interface NormalizedAppt {
    date: string
    type: string
    category: string
    location: string
    source: string
    status: string
    isAvailability: boolean
    isGarbage: boolean
    durationMinutes: number
    dayOfWeek: number
    month: string
    weekStart: string
    count: number
  }

  const normalized: NormalizedAppt[] = allAppts.map(a => {
    const location = normLoc(a.location_name)
    const type = (a.appointment_type || '').trim()
    const d = new Date(a.appointment_date + 'T00:00:00')
    const dow = d.getDay()
    const mon = new Date(d)
    mon.setDate(mon.getDate() - ((dow + 6) % 7))

    return {
      date: a.appointment_date,
      type,
      category: a.service_category || 'UNMAPPED',
      location,
      source: a.source,
      status: a.status || 'unknown',
      isAvailability: isAvailabilityType(type),
      isGarbage: isGarbageType(type),
      durationMinutes: a.duration_minutes || 0,
      dayOfWeek: dow,
      month: a.appointment_date?.substring(0, 7) || '',
      weekStart: mon.toISOString().split('T')[0],
      count: (a.source === 'weekly_tracking' && a.raw_data?.count) ? Number(a.raw_data.count) : 1,
    }
  })

  // Only count COMPLETED appointments (departed/complete in ezyVet status report).
  // NOTE: invoice-derived appointment counts (DISTINCT client + date)
  // are computed in section 4. appointment_data is also retained for:
  //   - appointment_type / service_category breakdowns (weekly_tracking)
  //   - duration stats
  //   - dayOfWeek / weeklyTrend FALLBACK when invoice_lines hasn't been
  //     uploaded for that period (avoids blank charts during onboarding).
  const typedAppts = normalized.filter(a => {
    if (!CLINIC_LOCATIONS.includes(a.location)) return false
    if (a.source !== 'weekly_tracking') return false
    return !a.isAvailability && !a.isGarbage
  })

  // appointment_status (completed) — used as fallback for location/dow/week
  const completedStatusAppts = normalized.filter(a =>
    a.source === 'appointment_status' &&
    a.status === 'completed' &&
    CLINIC_LOCATIONS.includes(a.location) &&
    a.dayOfWeek !== 0
  )

  // ── Appointment Types ──
  const typeMap: Record<string, { total: number; category: string; byLocation: Record<string, number> }> = {}
  for (const a of typedAppts) {
    if (!typeMap[a.type]) typeMap[a.type] = { total: 0, category: a.category, byLocation: {} }
    typeMap[a.type].total += a.count
    typeMap[a.type].byLocation[a.location] = (typeMap[a.type].byLocation[a.location] || 0) + a.count
  }
  // If weekly_tracking is empty but appointment_status has data, derive a
  // type breakdown from appointment_status so the chart isn't blank.
  if (Object.keys(typeMap).length === 0 && completedStatusAppts.length > 0) {
    for (const a of completedStatusAppts) {
      const t = a.type || 'Unspecified'
      if (!typeMap[t]) typeMap[t] = { total: 0, category: a.category, byLocation: {} }
      typeMap[t].total += a.count
      typeMap[t].byLocation[a.location] = (typeMap[t].byLocation[a.location] || 0) + a.count
    }
  }
  const appointmentTypes = Object.entries(typeMap)
    .map(([type, info]) => ({ type, category: info.category, total: info.total, byLocation: info.byLocation }))
    .sort((a, b) => b.total - a.total)

  // ── Service Categories ──
  const catMap: Record<string, { total: number; byLocation: Record<string, number> }> = {}
  for (const a of typedAppts) {
    if (!catMap[a.category]) catMap[a.category] = { total: 0, byLocation: {} }
    catMap[a.category].total += a.count
    catMap[a.category].byLocation[a.location] = (catMap[a.category].byLocation[a.location] || 0) + a.count
  }
  if (Object.keys(catMap).length === 0 && completedStatusAppts.length > 0) {
    for (const a of completedStatusAppts) {
      if (!catMap[a.category]) catMap[a.category] = { total: 0, byLocation: {} }
      catMap[a.category].total += a.count
      catMap[a.category].byLocation[a.location] = (catMap[a.category].byLocation[a.location] || 0) + a.count
    }
  }
  const serviceCategories = Object.entries(catMap)
    .map(([category, info]) => ({ category, total: info.total, byLocation: info.byLocation }))
    .sort((a, b) => b.total - a.total)

  // ── Day of Week / Weekly / Monthly appointment counts come from invoice_lines
  //    (DISTINCT client + date tuples) — computed below in section 4.

  // ── 4. AGGREGATE INVOICE REVENUE (directly from invoice_lines) ────────

  // Dynamic normalization: raw division string → clinic name
  function normLocDynamic(raw: string | null): string {
    if (!raw) return 'All Locations'
    const staticMatch = LOCATION_NORM[raw.toLowerCase().trim()]
    if (staticMatch) return staticMatch
    const lower = raw.toLowerCase()
    if (lower.includes('venice')) return 'Venice'
    if (lower.includes('van nuys')) return 'Van Nuys'
    if (lower.includes('sherman oaks')) return 'Sherman Oaks'
    return 'All Locations'
  }

  // Output variables populated by either RPC or fallback path
  let grandTotalRevenue = 0
  let uniqueClients = 0
  const divisionCounts: Record<string, number> = {}
  const revenueByLocation: Record<string, number> = {}
  const clientCountByLocation: Record<string, number> = {}
  const monthRevMap: Record<string, Record<string, number>> = {}
  const monthRevTotalMap: Record<string, number> = {}
  const pgMap: Record<string, { revenue: number; byLocation: Record<string, number> }> = {}
  const staffMap: Record<string, { revenue: number; location: string; byLocation: Record<string, number> }> = {}

  // ── Appointment counts derived from invoice_lines (DISTINCT client + date).
  //    A single appointment generates many invoice lines on the same day —
  //    roll lines up to (client_code, invoice_date) tuples for appointment grain.
  const apptsByLocation: Record<string, number> = {}
  const monthApptMap: Record<string, { total: number; byLocation: Record<string, number> }> = {}
  const weekApptMap: Record<string, { total: number; byLocation: Record<string, number> }> = {}
  const dowApptMap: Record<number, { total: number; byLocation: Record<string, number> }> = {}
  for (let d = 1; d <= 6; d++) dowApptMap[d] = { total: 0, byLocation: {} }

  if (invoiceSummary) {
    // ── RPC fast path — single DB call, PostgreSQL-side aggregation ──
    const rpc = invoiceSummary
    grandTotalRevenue = Number(rpc.totals?.total_revenue || 0)
    uniqueClients = Number(rpc.totals?.unique_clients || 0)

    for (const row of (rpc.byDivision || [])) {
      const rawDiv = row.division === '(null)' ? null : row.division
      divisionCounts[row.division] = Number(row.unique_invoices || 0)
      const loc = normLocDynamic(rawDiv)
      if (CLINIC_LOCATIONS.includes(loc)) {
        revenueByLocation[loc] = (revenueByLocation[loc] || 0) + Number(row.revenue || 0)
        clientCountByLocation[loc] = (clientCountByLocation[loc] || 0) + Number(row.unique_clients || 0)
        apptsByLocation[loc] = (apptsByLocation[loc] || 0) + Number(row.appointments || 0)
      }
    }

    for (const row of (rpc.byMonth || [])) {
      const rawDiv = row.division === '(null)' ? null : row.division
      const loc = normLocDynamic(rawDiv)
      const rev = Number(row.revenue || 0)
      const appts = Number(row.appointments || 0)
      monthRevTotalMap[row.month] = (monthRevTotalMap[row.month] || 0) + rev
      if (!monthApptMap[row.month]) monthApptMap[row.month] = { total: 0, byLocation: {} }
      if (CLINIC_LOCATIONS.includes(loc)) {
        if (!monthRevMap[row.month]) monthRevMap[row.month] = {}
        monthRevMap[row.month][loc] = (monthRevMap[row.month][loc] || 0) + rev
        monthApptMap[row.month].total += appts
        monthApptMap[row.month].byLocation[loc] = (monthApptMap[row.month].byLocation[loc] || 0) + appts
      }
    }

    for (const row of (rpc.byWeek || [])) {
      const rawDiv = row.division === '(null)' ? null : row.division
      const loc = normLocDynamic(rawDiv)
      if (!CLINIC_LOCATIONS.includes(loc)) continue
      const appts = Number(row.appointments || 0)
      if (!weekApptMap[row.week]) weekApptMap[row.week] = { total: 0, byLocation: {} }
      weekApptMap[row.week].total += appts
      weekApptMap[row.week].byLocation[loc] = (weekApptMap[row.week].byLocation[loc] || 0) + appts
    }

    for (const row of (rpc.byDow || [])) {
      const rawDiv = row.division === '(null)' ? null : row.division
      const loc = normLocDynamic(rawDiv)
      if (!CLINIC_LOCATIONS.includes(loc)) continue
      const dow = Number(row.dow)
      if (dow < 1 || dow > 6) continue // exclude Sunday
      const appts = Number(row.appointments || 0)
      if (!dowApptMap[dow]) dowApptMap[dow] = { total: 0, byLocation: {} }
      dowApptMap[dow].total += appts
      dowApptMap[dow].byLocation[loc] = (dowApptMap[dow].byLocation[loc] || 0) + appts
    }

    for (const row of (rpc.byProductGroup || [])) {
      const rawDiv = row.division === '(null)' ? null : row.division
      const loc = normLocDynamic(rawDiv)
      const rev = Number(row.revenue || 0)
      if (!pgMap[row.product_group]) pgMap[row.product_group] = { revenue: 0, byLocation: {} }
      pgMap[row.product_group].revenue += rev
      if (CLINIC_LOCATIONS.includes(loc)) pgMap[row.product_group].byLocation[loc] = (pgMap[row.product_group].byLocation[loc] || 0) + rev
    }

    for (const row of (rpc.byStaff || [])) {
      const rawDiv = row.division === '(null)' ? null : row.division
      const loc = normLocDynamic(rawDiv)
      const rev = Number(row.revenue || 0)
      if (!staffMap[row.staff_member]) staffMap[row.staff_member] = { revenue: 0, location: loc, byLocation: {} }
      staffMap[row.staff_member].revenue += rev
      if (CLINIC_LOCATIONS.includes(loc)) {
        staffMap[row.staff_member].byLocation[loc] = (staffMap[row.staff_member].byLocation[loc] || 0) + rev
        if ((staffMap[row.staff_member].byLocation[loc] || 0) > (staffMap[row.staff_member].byLocation[staffMap[row.staff_member].location] || 0)) {
          staffMap[row.staff_member].location = loc
        }
      }
    }

    // ── If RPC is an older version without byWeek/byDow, fall back below ──
    const rpcHasApptGrain =
      rpc.totals?.appointments !== undefined ||
      (rpc.byDivision || []).some((r: any) => r.appointments !== undefined)

    if (!rpcHasApptGrain) {
      // Fetch raw lines just for appointment grain
      let invPage = 0
      let invHasMore = true
      while (invHasMore) {
        const from = invPage * pageSize
        const to = from + pageSize - 1
        const { data: invData } = await supabase
          .from('invoice_lines')
          .select('invoice_date, division, client_code')
          .not('invoice_type', 'eq', 'Header')
          .gte('invoice_date', startDate)
          .lte('invoice_date', endDate)
          .range(from, to)
        if (invData && invData.length > 0) {
          invoiceLines = invoiceLines.concat(invData)
          invHasMore = invData.length === pageSize
          invPage++
        } else {
          invHasMore = false
        }
      }
      computeApptGrainFromLines(invoiceLines)
    }
  } else {
    // ── Fallback: client-side aggregation from raw invoice lines ──
    const allClientCodes = new Set<string>()
    const clientsByLocationSets: Record<string, Set<string>> = {}

    for (const line of invoiceLines) {
      const d = line.division || '(null)'
      divisionCounts[d] = (divisionCounts[d] || 0) + 1
    }

    for (const line of invoiceLines) {
      const loc = normLocDynamic(line.division)
      const rev = lineRevenue(line)
      const month = line.invoice_date?.substring(0, 7) || ''
      const isClinic = CLINIC_LOCATIONS.includes(loc)

      grandTotalRevenue += rev
      if (line.client_code) allClientCodes.add(line.client_code)
      if (month) monthRevTotalMap[month] = (monthRevTotalMap[month] || 0) + rev

      if (isClinic) {
        revenueByLocation[loc] = (revenueByLocation[loc] || 0) + rev
        if (line.client_code) {
          if (!clientsByLocationSets[loc]) clientsByLocationSets[loc] = new Set()
          clientsByLocationSets[loc].add(line.client_code)
        }
        if (month) {
          if (!monthRevMap[month]) monthRevMap[month] = {}
          monthRevMap[month][loc] = (monthRevMap[month][loc] || 0) + rev
        }
      }

      const pg = line.product_group || 'Unknown'
      if (!pgMap[pg]) pgMap[pg] = { revenue: 0, byLocation: {} }
      pgMap[pg].revenue += rev
      if (isClinic) pgMap[pg].byLocation[loc] = (pgMap[pg].byLocation[loc] || 0) + rev

      if (line.staff_member) {
        if (!staffMap[line.staff_member]) staffMap[line.staff_member] = { revenue: 0, location: loc, byLocation: {} }
        staffMap[line.staff_member].revenue += rev
        if (isClinic) {
          staffMap[line.staff_member].byLocation[loc] = (staffMap[line.staff_member].byLocation[loc] || 0) + rev
          const curPrimary = staffMap[line.staff_member].location
          if ((staffMap[line.staff_member].byLocation[loc] || 0) > (staffMap[line.staff_member].byLocation[curPrimary] || 0)) {
            staffMap[line.staff_member].location = loc
          }
        }
      }
    }

    uniqueClients = allClientCodes.size
    for (const [loc, s] of Object.entries(clientsByLocationSets)) {
      clientCountByLocation[loc] = s.size
    }

    computeApptGrainFromLines(invoiceLines)
  }

  // Compute appointment grain from invoice_lines (DISTINCT client + date).
  // Used in the fallback path and when RPC is an older version without tuples.
  function computeApptGrainFromLines(lines: any[]) {
    const seenTotal: Record<string, Set<string>> = {} // per-location Set of "client__date"
    const seenByMonth: Record<string, Record<string, Set<string>>> = {} // month -> loc -> Set
    const seenByWeek: Record<string, Record<string, Set<string>>> = {}
    const seenByDow: Record<number, Record<string, Set<string>>> = {}

    for (const line of lines) {
      if (!line.client_code || !line.invoice_date) continue
      const loc = normLocDynamic(line.division)
      if (!CLINIC_LOCATIONS.includes(loc)) continue

      const key = `${line.client_code}__${line.invoice_date}`
      const month = line.invoice_date.substring(0, 7)
      const d = new Date(line.invoice_date + 'T00:00:00')
      const dow = d.getDay()
      const mon = new Date(d); mon.setDate(mon.getDate() - ((dow + 6) % 7))
      const weekStart = mon.toISOString().split('T')[0]

      ;(seenTotal[loc] ||= new Set()).add(key)
      ;((seenByMonth[month] ||= {})[loc] ||= new Set()).add(key)
      ;((seenByWeek[weekStart] ||= {})[loc] ||= new Set()).add(key)
      if (dow >= 1 && dow <= 6) {
        ;((seenByDow[dow] ||= {})[loc] ||= new Set()).add(key)
      }
    }

    for (const [loc, s] of Object.entries(seenTotal)) apptsByLocation[loc] = s.size
    for (const [month, byLoc] of Object.entries(seenByMonth)) {
      const entry = (monthApptMap[month] ||= { total: 0, byLocation: {} })
      for (const [loc, s] of Object.entries(byLoc)) {
        entry.byLocation[loc] = s.size
        entry.total += s.size
      }
    }
    for (const [week, byLoc] of Object.entries(seenByWeek)) {
      const entry = (weekApptMap[week] ||= { total: 0, byLocation: {} })
      for (const [loc, s] of Object.entries(byLoc)) {
        entry.byLocation[loc] = s.size
        entry.total += s.size
      }
    }
    for (const [dow, byLoc] of Object.entries(seenByDow)) {
      const entry = (dowApptMap[Number(dow)] ||= { total: 0, byLocation: {} })
      for (const [loc, s] of Object.entries(byLoc)) {
        entry.byLocation[loc] = s.size
        entry.total += s.size
      }
    }
  }

  // ── Fallback: if invoice_lines yielded no appointment grain (e.g. invoices
  //    not yet uploaded for this period), populate the per-location / dow /
  //    week / month maps from completed appointment_status records so the
  //    charts aren't blank.
  const invoiceApptTotal = Object.values(apptsByLocation).reduce((s, v) => s + v, 0)
  if (invoiceApptTotal === 0 && completedStatusAppts.length > 0) {
    for (const a of completedStatusAppts) {
      apptsByLocation[a.location] = (apptsByLocation[a.location] || 0) + a.count
      const m = a.month
      if (m) {
        const e = (monthApptMap[m] ||= { total: 0, byLocation: {} })
        e.total += a.count
        e.byLocation[a.location] = (e.byLocation[a.location] || 0) + a.count
      }
      const w = a.weekStart
      if (w) {
        const e = (weekApptMap[w] ||= { total: 0, byLocation: {} })
        e.total += a.count
        e.byLocation[a.location] = (e.byLocation[a.location] || 0) + a.count
      }
      if (a.dayOfWeek >= 1 && a.dayOfWeek <= 6) {
        const e = (dowApptMap[a.dayOfWeek] ||= { total: 0, byLocation: {} })
        e.total += a.count
        e.byLocation[a.location] = (e.byLocation[a.location] || 0) + a.count
      }
    }
  }

  // ── Derive dayOfWeek + weeklyTrend output shapes from invoice-based maps ──
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayOfWeek = Object.entries(dowApptMap)
    .map(([idx, info]) => ({ day: dayNames[Number(idx)], index: Number(idx), total: info.total, byLocation: info.byLocation }))
    .sort((a, b) => a.index - b.index)

  const weeklyTrend = Object.entries(weekApptMap)
    .map(([week, info]) => ({ week, total: info.total, byLocation: info.byLocation }))
    .sort((a, b) => a.week.localeCompare(b.week))

  // Combine monthly trends (appointments + revenue)
  const allMonths = new Set([...Object.keys(monthApptMap), ...Object.keys(monthRevMap), ...Object.keys(monthRevTotalMap)])
  const monthLabels: Record<string, string> = {}
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  for (const m of allMonths) {
    const [y, mo] = m.split('-')
    monthLabels[m] = `${monthNames[parseInt(mo) - 1]} ${y}`
  }

  const monthlyTrend = [...allMonths].sort().map(month => ({
    month,
    label: monthLabels[month] || month,
    appointments: monthApptMap[month]?.total || 0,
    appointmentsByLocation: monthApptMap[month]?.byLocation || {},
    revenue: monthRevTotalMap[month] || 0,
    revenueByLocation: monthRevMap[month] || {},
  }))

  // ── KPIs (cross-referenced) ──
  // CRITICAL: numerator and denominator must use the SAME grain (clinic-only)
  // or the ratio explodes. grandTotalRevenue includes MPMV / Other / null-
  // division lines whose appointments aren't counted in apptsByLocation,
  // which previously produced figures like $10,585/appointment.
  const totalAppointments = Object.values(apptsByLocation).reduce((s, v) => s + v, 0)
  const clinicRevenueTotal = Object.values(revenueByLocation).reduce((s, v) => s + v, 0)
  const totalRevenue = grandTotalRevenue

  // ── Revenue per Appointment cross-reference ──
  const revenuePerAppt: Record<string, { appointments: number; revenue: number; perAppt: number }> = {}
  for (const loc of CLINIC_LOCATIONS) {
    const appts = apptsByLocation[loc] || 0
    const rev = revenueByLocation[loc] || 0
    revenuePerAppt[loc] = {
      appointments: appts,
      revenue: rev,
      perAppt: appts > 0 ? Math.round(rev / appts * 100) / 100 : 0,
    }
  }

  // ── Top Product Groups ──
  const topProductGroups = Object.entries(pgMap)
    .map(([group, info]) => ({ group, revenue: info.revenue, byLocation: info.byLocation }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 15)

  // ── Top Staff ──
  const topStaff = Object.entries(staffMap)
    .map(([name, info]) => ({ name, revenue: info.revenue, location: info.location, byLocation: info.byLocation }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20)

  // ── Duration stats from completed appointments ──
  const statusAppts = normalized.filter(a =>
    a.source === 'appointment_status' &&
    a.status === 'completed' &&
    CLINIC_LOCATIONS.includes(a.location) &&
    a.durationMinutes > 0
  )
  const avgDuration: Record<string, { total: number; count: number }> = {}
  for (const a of statusAppts) {
    if (!avgDuration[a.location]) avgDuration[a.location] = { total: 0, count: 0 }
    avgDuration[a.location].total += a.durationMinutes
    avgDuration[a.location].count++
  }
  const avgDurationByLocation: Record<string, number> = {}
  for (const [loc, info] of Object.entries(avgDuration)) {
    avgDurationByLocation[loc] = Math.round(info.total / info.count)
  }

  return {
    locations: CLINIC_LOCATIONS,
    dateRange: { start: startDate, end: endDate },

    kpis: {
      totalAppointments,
      // totalRevenue exposes the all-divisions figure for completeness, but
      // the per-appointment ratio uses clinic-only revenue so the grain
      // matches the appointment denominator.
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      clinicRevenue: Math.round(clinicRevenueTotal * 100) / 100,
      uniqueClients,
      avgRevenuePerAppt: totalAppointments > 0
        ? Math.round((clinicRevenueTotal / totalAppointments) * 100) / 100
        : 0,
    },

    apptsByLocation,
    appointmentTypes,
    serviceCategories,
    dayOfWeek,
    weeklyTrend,
    monthlyTrend,
    revenueByLocation,
    revenuePerAppt,
    topProductGroups,
    topStaff,
    avgDurationByLocation,
    clientsByLocation: clientCountByLocation,

    // Data summary for debugging / transparency
    dataSummary: {
      invoiceLinesLoaded: invoiceSummary ? Number(invoiceSummary.totals?.line_count || 0) : invoiceLines.length,
      appointmentRowsLoaded: allAppts.length,
      completedAppointments: totalAppointments,
      divisionValues: divisionCounts,
      rpcUsed: !!invoiceSummary,
    },
  }
  }, CACHE_TTL.MEDIUM)
})
