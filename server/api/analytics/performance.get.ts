/**
 * Performance Analytics API
 *
 * GET /api/analytics/performance?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 *
 * Returns pre-aggregated data for the redesigned Performance Analysis page.
 * Combines appointment data + invoice revenue with location normalization.
 */

import { serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'

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
  // Facility / division names stored as appointment types
  if (lower.startsWith('green dog -')) return true
  return false
}

function isAvailabilityType(type: string): boolean {
  const lower = type.toLowerCase()
  return lower.includes('avail') || lower === 'uc openings' || lower.includes('same day uc')
}

// ── Export ───────────────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  // Auth
  const supabaseUser = await serverSupabaseClient(event)
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const supabase = await serverSupabaseServiceRole(event)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin', 'manager', 'sup_admin', 'marketing_admin'].includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const query = getQuery(event)
  const startDate = (query.startDate as string) || '2025-01-01'
  const endDate = (query.endDate as string) || new Date().toISOString().split('T')[0]

  // ── 1. LOAD APPOINTMENT DATA ──────────────────────────────────────────

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

  // ── 2. LOAD INVOICE REVENUE BY LOCATION+MONTH (via RPC) ──────────────

  const { data: revenueData, error: revErr } = await supabase
    .rpc('get_revenue_by_location_month', { p_start: startDate, p_end: endDate })

  if (revErr) console.error('Revenue RPC error:', revErr.message)

  const { data: breakdownData, error: bdErr } = await supabase
    .rpc('get_revenue_breakdowns', { p_start: startDate, p_end: endDate })

  if (bdErr) console.error('Breakdown RPC error:', bdErr.message)

  // ── 3. AGGREGATE APPOINTMENT DATA ─────────────────────────────────────

  // Normalize and categorize
  interface NormalizedAppt {
    date: string
    type: string
    category: string
    location: string
    source: string
    count: number
    isAvailability: boolean
    isGarbage: boolean
    durationMinutes: number
    dayOfWeek: number // 0=Sun, 6=Sat
    month: string // 'YYYY-MM'
    weekStart: string // Monday of that week
  }

  const normalized: NormalizedAppt[] = allAppts.map(a => {
    const location = normLoc(a.location_name)
    const type = (a.appointment_type || '').trim()
    const count = a.raw_data?.count || 1
    const d = new Date(a.appointment_date + 'T00:00:00')
    const dow = d.getDay()
    // Get Monday of this week
    const mon = new Date(d)
    mon.setDate(mon.getDate() - ((dow + 6) % 7))

    return {
      date: a.appointment_date,
      type,
      category: a.service_category || 'UNMAPPED',
      location,
      source: a.source,
      count,
      isAvailability: isAvailabilityType(type),
      isGarbage: isGarbageType(type),
      durationMinutes: a.duration_minutes || 0,
      dayOfWeek: dow,
      month: a.appointment_date?.substring(0, 7) || '',
      weekStart: mon.toISOString().split('T')[0],
    }
  })

  // Exclude: availability rows, garbage types, Sunday, non-clinic locations
  const booked = normalized.filter(a =>
    !a.isAvailability &&
    !a.isGarbage &&
    a.dayOfWeek !== 0 && // Sunday excluded
    CLINIC_LOCATIONS.includes(a.location)
  )

  // For type breakdowns, only use weekly_tracking (status has no real types)
  const typedAppts = booked.filter(a => a.source === 'weekly_tracking')

  // ── Appointments by Location ──
  const apptsByLocation: Record<string, number> = {}
  for (const a of booked) {
    apptsByLocation[a.location] = (apptsByLocation[a.location] || 0) + a.count
  }

  // ── Appointment Types ──
  const typeMap: Record<string, { total: number; category: string; byLocation: Record<string, number> }> = {}
  for (const a of typedAppts) {
    if (!typeMap[a.type]) typeMap[a.type] = { total: 0, category: a.category, byLocation: {} }
    typeMap[a.type].total += a.count
    typeMap[a.type].byLocation[a.location] = (typeMap[a.type].byLocation[a.location] || 0) + a.count
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
  const serviceCategories = Object.entries(catMap)
    .map(([category, info]) => ({ category, total: info.total, byLocation: info.byLocation }))
    .sort((a, b) => b.total - a.total)

  // ── Day of Week ──
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dowMap: Record<number, { total: number; byLocation: Record<string, number> }> = {}
  for (let d = 1; d <= 6; d++) dowMap[d] = { total: 0, byLocation: {} }
  for (const a of booked) {
    if (a.dayOfWeek === 0) continue
    dowMap[a.dayOfWeek].total += a.count
    dowMap[a.dayOfWeek].byLocation[a.location] = (dowMap[a.dayOfWeek].byLocation[a.location] || 0) + a.count
  }
  const dayOfWeek = Object.entries(dowMap)
    .map(([idx, info]) => ({ day: dayNames[Number(idx)], index: Number(idx), total: info.total, byLocation: info.byLocation }))
    .sort((a, b) => a.index - b.index)

  // ── Weekly Trend ──
  const weekMap: Record<string, { total: number; byLocation: Record<string, number> }> = {}
  for (const a of booked) {
    if (!weekMap[a.weekStart]) weekMap[a.weekStart] = { total: 0, byLocation: {} }
    weekMap[a.weekStart].total += a.count
    weekMap[a.weekStart].byLocation[a.location] = (weekMap[a.weekStart].byLocation[a.location] || 0) + a.count
  }
  const weeklyTrend = Object.entries(weekMap)
    .map(([week, info]) => ({ week, total: info.total, byLocation: info.byLocation }))
    .sort((a, b) => a.week.localeCompare(b.week))

  // ── Monthly Appointment Trend ──
  const monthApptMap: Record<string, { total: number; byLocation: Record<string, number> }> = {}
  for (const a of booked) {
    if (!monthApptMap[a.month]) monthApptMap[a.month] = { total: 0, byLocation: {} }
    monthApptMap[a.month].total += a.count
    monthApptMap[a.month].byLocation[a.location] = (monthApptMap[a.month].byLocation[a.location] || 0) + a.count
  }

  // ── 4. PROCESS INVOICE REVENUE DATA ───────────────────────────────────

  const revenueRows: Array<{ month: string; location: string; revenue: number; line_count: number; unique_clients: number; invoice_count: number }> = (revenueData || [])
    .filter((r: any) => CLINIC_LOCATIONS.includes(r.location))

  // Revenue by location
  const revenueByLocation: Record<string, number> = {}
  const clientsByLocation: Record<string, number> = {}
  for (const r of revenueRows) {
    revenueByLocation[r.location] = (revenueByLocation[r.location] || 0) + Number(r.revenue || 0)
    clientsByLocation[r.location] = (clientsByLocation[r.location] || 0) + Number(r.unique_clients || 0)
  }

  // Monthly revenue by location
  const monthRevMap: Record<string, Record<string, number>> = {}
  for (const r of revenueRows) {
    if (!monthRevMap[r.month]) monthRevMap[r.month] = {}
    monthRevMap[r.month][r.location] = Number(r.revenue || 0)
  }

  // Combine monthly trends
  const allMonths = new Set([...Object.keys(monthApptMap), ...Object.keys(monthRevMap)])
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
    revenue: Object.values(monthRevMap[month] || {}).reduce((s, v) => s + v, 0),
    revenueByLocation: monthRevMap[month] || {},
  }))

  // ── KPIs ──
  const totalAppointments = Object.values(apptsByLocation).reduce((s, v) => s + v, 0)
  const totalRevenue = Object.values(revenueByLocation).reduce((s, v) => s + v, 0)
  const uniqueClients = [...new Set(revenueRows.map(r => r.unique_clients))].reduce((s, v) => s + Number(v || 0), 0)

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

  // ── Product Groups (aggregate across locations) ──
  const bdParsed = breakdownData as any
  const productGroupRaw: Array<{ group: string; location: string; revenue: number; cnt: number }> = bdParsed?.productGroups || []
  // Aggregate by group, keep location breakdown
  const pgMap: Record<string, { revenue: number; byLocation: Record<string, number> }> = {}
  for (const pg of productGroupRaw) {
    if (!CLINIC_LOCATIONS.includes(pg.location)) continue
    if (!pgMap[pg.group]) pgMap[pg.group] = { revenue: 0, byLocation: {} }
    pgMap[pg.group].revenue += Number(pg.revenue || 0)
    pgMap[pg.group].byLocation[pg.location] = Number(pg.revenue || 0)
  }
  const topProductGroups = Object.entries(pgMap)
    .map(([group, info]) => ({ group, revenue: info.revenue, byLocation: info.byLocation }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 15)

  // ── Top Staff ──
  const staffRaw: Array<{ name: string; location: string; revenue: number; cnt: number }> = bdParsed?.topStaff || []
  // Aggregate by staff name across locations
  const staffMap: Record<string, { revenue: number; location: string; byLocation: Record<string, number> }> = {}
  for (const s of staffRaw) {
    if (!CLINIC_LOCATIONS.includes(s.location)) continue
    if (!staffMap[s.name]) staffMap[s.name] = { revenue: 0, location: s.location, byLocation: {} }
    staffMap[s.name].revenue += Number(s.revenue || 0)
    staffMap[s.name].byLocation[s.location] = (staffMap[s.name].byLocation[s.location] || 0) + Number(s.revenue || 0)
    // Primary location = highest revenue
    if (Number(s.revenue || 0) > (staffMap[s.name].byLocation[staffMap[s.name].location] || 0)) {
      staffMap[s.name].location = s.location
    }
  }
  const topStaff = Object.entries(staffMap)
    .map(([name, info]) => ({ name, revenue: info.revenue, location: info.location, byLocation: info.byLocation }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20)

  // ── Duration stats from status data ──
  const statusAppts = normalized.filter(a => a.source === 'appointment_status' && CLINIC_LOCATIONS.includes(a.location) && a.durationMinutes > 0)
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
      totalRevenue,
      uniqueClients,
      avgRevenuePerAppt: totalAppointments > 0 ? Math.round(totalRevenue / totalAppointments * 100) / 100 : 0,
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
    clientsByLocation,
  }
})
