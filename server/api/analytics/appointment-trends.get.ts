/**
 * Appointment Trends Analytics API
 *
 * GET /api/analytics/appointment-trends?startDate=&endDate=&location=
 *
 * Pure VOLUME view of appointments — no invoice/revenue correlation.
 *
 * Source: appointment_data rows with source='appointment_status' (the
 * "Appointment Status / Details" report). Each row is one appointment with a
 * date and location, so we simply count them:
 *   • month-by-month appointment trend (total + per location)
 *   • appointment counter per day (for a per-day drill-down)
 *   • per-location totals
 */

import { serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'

function monthKey(dateStr: string): string {
  return (dateStr || '').slice(0, 7) // YYYY-MM
}

async function loadAllPaged(
  supabase: any,
  table: string,
  columns: string,
  apply: (q: any) => any,
): Promise<any[]> {
  const pageSize = 1000
  let page = 0
  let out: any[] = []
  let more = true
  while (more) {
    let q = supabase.from(table).select(columns).range(page * pageSize, (page + 1) * pageSize - 1)
    q = apply(q)
    const { data, error } = await q
    if (error) throw createError({ statusCode: 500, message: `Failed to load ${table}: ${error.message}` })
    if (data && data.length) {
      out = out.concat(data)
      more = data.length === pageSize
      page++
    } else {
      more = false
    }
  }
  return out
}

export default defineEventHandler(async (event) => {
  const supabaseUser = await serverSupabaseClient(event)
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const supabase = await serverSupabaseServiceRole(event)

  const query = getQuery(event)
  const startDate = (query.startDate as string) || '2025-01-01'
  const endDate = (query.endDate as string) || new Date().toISOString().slice(0, 10)
  const locationFilter = (query.location as string) || ''

  // ── Load appointments (the "status / details" report) ──
  const appts = await loadAllPaged(
    supabase,
    'appointment_data',
    'appointment_date, location_name',
    (q: any) => {
      q = q.eq('source', 'appointment_status')
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)
      if (locationFilter) q = q.ilike('location_name', `%${locationFilter}%`)
      return q
    },
  )

  // ── Aggregate ──
  const monthMap = new Map<string, { count: number; byLocation: Map<string, number> }>()
  const dayMap = new Map<string, number>()
  const locationTotals = new Map<string, number>()

  for (const a of appts) {
    const date = (a.appointment_date || '').slice(0, 10)
    if (!date) continue
    const loc = (a.location_name || 'Unknown').trim() || 'Unknown'
    const mk = monthKey(date)

    // monthly (+ per location)
    const m = monthMap.get(mk) || { count: 0, byLocation: new Map<string, number>() }
    m.count += 1
    m.byLocation.set(loc, (m.byLocation.get(loc) || 0) + 1)
    monthMap.set(mk, m)

    // daily
    dayMap.set(date, (dayMap.get(date) || 0) + 1)

    // location totals
    locationTotals.set(loc, (locationTotals.get(loc) || 0) + 1)
  }

  const locationNames = Array.from(locationTotals.keys()).sort()

  const monthly = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      count: v.count,
      byLocation: Object.fromEntries(locationNames.map(loc => [loc, v.byLocation.get(loc) || 0])),
    }))

  const daily = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))

  const locations = Array.from(locationTotals.entries())
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count)

  // ── KPIs ──
  const total = appts.length
  const distinctMonths = monthMap.size
  const distinctDays = dayMap.size

  let busiestMonth = { month: '', count: 0 }
  for (const m of monthly) if (m.count > busiestMonth.count) busiestMonth = { month: m.month, count: m.count }

  let busiestDay = { date: '', count: 0 }
  for (const d of daily) if (d.count > busiestDay.count) busiestDay = { date: d.date, count: d.count }

  return {
    success: true,
    dateRange: { start: startDate, end: endDate },
    kpis: {
      totalAppointments: total,
      months: distinctMonths,
      activeDays: distinctDays,
      avgPerMonth: distinctMonths > 0 ? Math.round(total / distinctMonths) : 0,
      avgPerDay: distinctDays > 0 ? Math.round((total / distinctDays) * 10) / 10 : 0,
      busiestMonth,
      busiestDay,
    },
    monthly,
    daily,
    locations,
    locationNames,
  }
})
