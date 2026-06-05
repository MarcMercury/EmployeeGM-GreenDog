/**
 * Appointment Value Analytics API
 *
 * GET /api/analytics/appointment-value?startDate=&endDate=&location=
 *
 * Ties three of the four analytics reports together to answer:
 *   "By month, what is the average value of an appointment (and appointment type)?"
 *
 *   • Appointment Details (appointment_data, source='appointment_status')
 *       — one row per visit: Owner (last/first), Animal, date, location.
 *   • Invoices (invoice_lines)
 *       — revenue, keyed to a client (last/first name) + pet + date.
 *   • Appointment Types (appointment_type_summary)
 *       — per-month, per-location volume + duration for each type.
 *
 * Correlation: each appointment is matched to the SAME-DAY invoice lines for the
 * same client + pet, and their `total_earned` is summed to give that visit's
 * value. Appointments roll up to a monthly average value (overall + by location).
 *
 * Per-type value: the Appointment Type report is pre-aggregated and carries no
 * per-visit revenue, so a type's average value is ESTIMATED by allocating the
 * month's matched appointment revenue across types in proportion to each type's
 * share of total appointment time (count × avg duration). This is clearly flagged
 * as an estimate in the response (`valueEstimated: true`).
 */

import { serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'

function norm(s: any): string {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // strip spaces, punctuation, accents-ish
    .trim()
}

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

  // ── 1. Load appointments (the "details" report) ──
  const appts = await loadAllPaged(
    supabase,
    'appointment_data',
    'appointment_date, location_name, duration_minutes, raw_data',
    (q: any) => {
      q = q.eq('source', 'appointment_status')
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)
      if (locationFilter) q = q.ilike('location_name', `%${locationFilter}%`)
      return q
    },
  )

  // ── 2. Load invoice lines (revenue) ──
  const invoices = await loadAllPaged(
    supabase,
    'invoice_lines',
    'invoice_date, client_last_name, client_first_name, pet_name, total_earned, price_after_discount, division, invoice_number',
    (q: any) => {
      q = q.not('invoice_type', 'eq', 'Header')
        .gte('invoice_date', startDate)
        .lte('invoice_date', endDate)
      if (locationFilter) q = q.ilike('division', `%${locationFilter}%`)
      return q
    },
  )

  // ── 3. Build invoice lookup: date|lastName|pet  and  date|firstName|pet ──
  const byLastPet = new Map<string, { revenue: number; invoices: Set<string> }>()
  const byFirstPet = new Map<string, { revenue: number; invoices: Set<string> }>()
  for (const inv of invoices) {
    const amount = Number(inv.total_earned ?? inv.price_after_discount ?? 0) || 0
    const date = (inv.invoice_date || '').slice(0, 10)
    if (!date) continue
    const pet = norm(inv.pet_name)
    if (!pet) continue
    const last = norm(inv.client_last_name)
    const first = norm(inv.client_first_name)
    if (last) {
      const k = `${date}|${last}|${pet}`
      const e = byLastPet.get(k) || { revenue: 0, invoices: new Set<string>() }
      e.revenue += amount
      if (inv.invoice_number) e.invoices.add(String(inv.invoice_number))
      byLastPet.set(k, e)
    }
    if (first) {
      const k = `${date}|${first}|${pet}`
      const e = byFirstPet.get(k) || { revenue: 0, invoices: new Set<string>() }
      e.revenue += amount
      if (inv.invoice_number) e.invoices.add(String(inv.invoice_number))
      byFirstPet.set(k, e)
    }
  }

  // ── 4. Match each appointment to its same-day invoices ──
  interface MonthAgg { revenue: number; matched: number; total: number; invoices: Set<string> }
  const byMonth = new Map<string, MonthAgg>()
  const byLocation = new Map<string, MonthAgg>()
  let totalMatched = 0
  let totalRevenue = 0

  function bump(map: Map<string, MonthAgg>, key: string, revenue: number, matched: boolean, invoiceIds: Set<string>) {
    const e = map.get(key) || { revenue: 0, matched: 0, total: 0, invoices: new Set<string>() }
    e.total += 1
    if (matched) {
      e.matched += 1
      e.revenue += revenue
      for (const id of invoiceIds) e.invoices.add(id)
    }
    map.set(key, e)
  }

  for (const a of appts) {
    const raw = a.raw_data || {}
    const date = (a.appointment_date || '').slice(0, 10)
    if (!date) continue
    const pet = norm(raw.animal)
    const last = norm(raw.owner_last)
    const first = norm(raw.owner_first)

    let hit: { revenue: number; invoices: Set<string> } | undefined
    if (pet && last) hit = byLastPet.get(`${date}|${last}|${pet}`)
    if (!hit && pet && first) hit = byFirstPet.get(`${date}|${first}|${pet}`)

    const mk = monthKey(date)
    const loc = a.location_name || 'Unknown'
    const revenue = hit?.revenue || 0
    const matched = !!hit && revenue > 0
    const ids = hit?.invoices || new Set<string>()

    bump(byMonth, mk, revenue, matched, ids)
    bump(byLocation, loc, revenue, matched, ids)
    if (matched) { totalMatched += 1; totalRevenue += revenue }
  }

  // ── 5. Load appointment-type summary in range ──
  const startMonth = `${monthKey(startDate)}-01`
  const endMonth = `${monthKey(endDate)}-01`
  const typeRows = await loadAllPaged(
    supabase,
    'appointment_type_summary',
    'period_month, location_name, type_name, appointment_count, avg_time_mins, total_time_mins',
    (q: any) => {
      q = q.gte('period_month', startMonth).lte('period_month', endMonth)
      if (locationFilter) q = q.ilike('location_name', `%${locationFilter}%`)
      return q
    },
  )

  // Group type rows by month, summing across locations.
  const typesByMonth = new Map<string, Map<string, { count: number; totalTime: number }>>()
  for (const t of typeRows) {
    const mk = monthKey(t.period_month)
    if (!typesByMonth.has(mk)) typesByMonth.set(mk, new Map())
    const m = typesByMonth.get(mk)!
    const e = m.get(t.type_name) || { count: 0, totalTime: 0 }
    e.count += Number(t.appointment_count) || 0
    e.totalTime += Number(t.total_time_mins) || 0
    m.set(t.type_name, e)
  }

  // ── 6. Build monthly output with estimated per-type value ──
  const months = Array.from(new Set([...byMonth.keys(), ...typesByMonth.keys()])).sort()
  const monthly = months.map((mk) => {
    const agg = byMonth.get(mk)
    const apptRevenue = agg?.revenue || 0
    const matched = agg?.matched || 0
    const total = agg?.total || 0
    const avgValue = matched > 0 ? Math.round((apptRevenue / matched) * 100) / 100 : 0

    const typeMap = typesByMonth.get(mk)
    let types: any[] = []
    if (typeMap && typeMap.size) {
      const totalTimeAll = Array.from(typeMap.values()).reduce((s, v) => s + v.totalTime, 0)
      types = Array.from(typeMap.entries())
        .map(([name, v]) => {
          // Allocate the month's matched revenue by share of total appointment time.
          const timeShare = totalTimeAll > 0 ? v.totalTime / totalTimeAll : 0
          const allocatedRevenue = apptRevenue * timeShare
          const estAvgValue = v.count > 0 ? Math.round((allocatedRevenue / v.count) * 100) / 100 : 0
          return {
            type: name,
            count: v.count,
            totalTimeMins: Math.round(v.totalTime),
            estAvgValue,
            estTotalValue: Math.round(allocatedRevenue),
          }
        })
        .sort((a, b) => b.count - a.count)
    }

    return {
      month: mk,
      apptRevenue: Math.round(apptRevenue),
      matchedAppointments: matched,
      totalAppointments: total,
      matchRate: total > 0 ? Math.round((matched / total) * 1000) / 10 : 0,
      avgAppointmentValue: avgValue,
      types,
    }
  })

  // ── 7. Location rollup ──
  const locations = Array.from(byLocation.entries())
    .map(([loc, v]) => ({
      location: loc,
      apptRevenue: Math.round(v.revenue),
      matchedAppointments: v.matched,
      totalAppointments: v.total,
      avgAppointmentValue: v.matched > 0 ? Math.round((v.revenue / v.matched) * 100) / 100 : 0,
    }))
    .sort((a, b) => b.apptRevenue - a.apptRevenue)

  return {
    success: true,
    dateRange: { start: startDate, end: endDate },
    kpis: {
      totalAppointments: appts.length,
      matchedAppointments: totalMatched,
      matchRate: appts.length > 0 ? Math.round((totalMatched / appts.length) * 1000) / 10 : 0,
      matchedRevenue: Math.round(totalRevenue),
      avgAppointmentValue: totalMatched > 0 ? Math.round((totalRevenue / totalMatched) * 100) / 100 : 0,
      typeReportMonths: typesByMonth.size,
    },
    monthly,
    locations,
    valueEstimated: true, // per-type values are time-weighted estimates
  }
})
