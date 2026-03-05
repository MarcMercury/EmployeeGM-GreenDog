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
  if (lower.startsWith('green dog -')) return true
  return false
}

function isAvailabilityType(type: string): boolean {
  const lower = type.toLowerCase()
  return lower.includes('avail') || lower === 'uc openings' || lower.includes('same day uc')
}

/** Extract numeric revenue from an invoice line, with fallback chain */
function lineRevenue(line: any): number {
  const v = parseFloat(line.total_earned) || parseFloat(line.price_after_discount) || 0
  return isNaN(v) ? 0 : v
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

  // ── 2. LOAD INVOICE LINES directly (no RPC dependency) ────────────────

  let invoiceLines: any[] = []
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
    }
  })

  // Only count COMPLETED appointments (departed/complete in ezyVet status report).
  // For appointment_status rows: filter by status = 'completed'.
  // For weekly_tracking rows: keep existing filters (no status field, used for type breakdowns only).
  const booked = normalized.filter(a => {
    if (!CLINIC_LOCATIONS.includes(a.location)) return false
    if (a.dayOfWeek === 0) return false // Sunday excluded
    if (a.source === 'appointment_status') {
      return a.status === 'completed'
    }
    // weekly_tracking: apply garbage/availability filters (no per-row status available)
    return !a.isAvailability && !a.isGarbage
  })

  // For type breakdowns, only use weekly_tracking (status has no real types)
  const typedAppts = booked.filter(a => a.source === 'weekly_tracking')

  // ── Appointments by Location (only completed) ──
  const apptsByLocation: Record<string, number> = {}
  for (const a of booked) {
    apptsByLocation[a.location] = (apptsByLocation[a.location] || 0) + 1
  }

  // ── Appointment Types ──
  const typeMap: Record<string, { total: number; category: string; byLocation: Record<string, number> }> = {}
  for (const a of typedAppts) {
    if (!typeMap[a.type]) typeMap[a.type] = { total: 0, category: a.category, byLocation: {} }
    typeMap[a.type].total += 1
    typeMap[a.type].byLocation[a.location] = (typeMap[a.type].byLocation[a.location] || 0) + 1
  }
  const appointmentTypes = Object.entries(typeMap)
    .map(([type, info]) => ({ type, category: info.category, total: info.total, byLocation: info.byLocation }))
    .sort((a, b) => b.total - a.total)

  // ── Service Categories ──
  const catMap: Record<string, { total: number; byLocation: Record<string, number> }> = {}
  for (const a of typedAppts) {
    if (!catMap[a.category]) catMap[a.category] = { total: 0, byLocation: {} }
    catMap[a.category].total += 1
    catMap[a.category].byLocation[a.location] = (catMap[a.category].byLocation[a.location] || 0) + 1
  }
  const serviceCategories = Object.entries(catMap)
    .map(([category, info]) => ({ category, total: info.total, byLocation: info.byLocation }))
    .sort((a, b) => b.total - a.total)

  // ── Day of Week ──
  // Only use appointment_status + completed for day-of-week distribution
  const datedAppts = booked.filter(a => a.source === 'appointment_status')
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dowMap: Record<number, { total: number; byLocation: Record<string, number> }> = {}
  for (let d = 1; d <= 6; d++) dowMap[d] = { total: 0, byLocation: {} }
  for (const a of datedAppts) {
    if (a.dayOfWeek === 0) continue
    dowMap[a.dayOfWeek].total += 1
    dowMap[a.dayOfWeek].byLocation[a.location] = (dowMap[a.dayOfWeek].byLocation[a.location] || 0) + 1
  }
  const dayOfWeek = Object.entries(dowMap)
    .map(([idx, info]) => ({ day: dayNames[Number(idx)], index: Number(idx), total: info.total, byLocation: info.byLocation }))
    .sort((a, b) => a.index - b.index)

  // ── Weekly Trend ──
  const weekMap: Record<string, { total: number; byLocation: Record<string, number> }> = {}
  for (const a of datedAppts) {
    if (!weekMap[a.weekStart]) weekMap[a.weekStart] = { total: 0, byLocation: {} }
    weekMap[a.weekStart].total += 1
    weekMap[a.weekStart].byLocation[a.location] = (weekMap[a.weekStart].byLocation[a.location] || 0) + 1
  }
  const weeklyTrend = Object.entries(weekMap)
    .map(([week, info]) => ({ week, total: info.total, byLocation: info.byLocation }))
    .sort((a, b) => a.week.localeCompare(b.week))

  // ── Monthly Appointment Trend ──
  const monthApptMap: Record<string, { total: number; byLocation: Record<string, number> }> = {}
  for (const a of datedAppts) {
    if (!monthApptMap[a.month]) monthApptMap[a.month] = { total: 0, byLocation: {} }
    monthApptMap[a.month].total += 1
    monthApptMap[a.month].byLocation[a.location] = (monthApptMap[a.month].byLocation[a.location] || 0) + 1
  }

  // ── 4. AGGREGATE INVOICE REVENUE (directly from invoice_lines) ────────

  // Normalize invoice line locations (division → clinic name)
  const revenueByLocation: Record<string, number> = {}
  const clientsByLocation: Record<string, Set<string>> = {}
  const invoicesByLocation: Record<string, Set<string>> = {}
  const monthRevMap: Record<string, Record<string, number>> = {}
  const pgMap: Record<string, { revenue: number; byLocation: Record<string, number> }> = {}
  const staffMap: Record<string, { revenue: number; location: string; byLocation: Record<string, number> }> = {}
  const allClientCodes = new Set<string>()

  for (const line of invoiceLines) {
    const loc = normLoc(line.division)
    if (!CLINIC_LOCATIONS.includes(loc)) continue

    const rev = lineRevenue(line)
    const month = line.invoice_date?.substring(0, 7) || ''

    // Revenue by location
    revenueByLocation[loc] = (revenueByLocation[loc] || 0) + rev

    // Unique clients by location (distinct client_code)
    if (line.client_code) {
      if (!clientsByLocation[loc]) clientsByLocation[loc] = new Set()
      clientsByLocation[loc].add(line.client_code)
      allClientCodes.add(line.client_code)
    }

    // Unique invoices by location
    if (line.invoice_number) {
      if (!invoicesByLocation[loc]) invoicesByLocation[loc] = new Set()
      invoicesByLocation[loc].add(line.invoice_number)
    }

    // Monthly revenue by location
    if (month) {
      if (!monthRevMap[month]) monthRevMap[month] = {}
      monthRevMap[month][loc] = (monthRevMap[month][loc] || 0) + rev
    }

    // Product group breakdown by location
    const pg = line.product_group || 'Unknown'
    if (!pgMap[pg]) pgMap[pg] = { revenue: 0, byLocation: {} }
    pgMap[pg].revenue += rev
    pgMap[pg].byLocation[loc] = (pgMap[pg].byLocation[loc] || 0) + rev

    // Staff breakdown by location
    if (line.staff_member) {
      if (!staffMap[line.staff_member]) staffMap[line.staff_member] = { revenue: 0, location: loc, byLocation: {} }
      staffMap[line.staff_member].revenue += rev
      staffMap[line.staff_member].byLocation[loc] = (staffMap[line.staff_member].byLocation[loc] || 0) + rev
      // Primary location = highest revenue
      const curPrimary = staffMap[line.staff_member].location
      if ((staffMap[line.staff_member].byLocation[loc] || 0) > (staffMap[line.staff_member].byLocation[curPrimary] || 0)) {
        staffMap[line.staff_member].location = loc
      }
    }
  }

  // Convert client sets to counts
  const clientCountByLocation: Record<string, number> = {}
  for (const [loc, s] of Object.entries(clientsByLocation)) {
    clientCountByLocation[loc] = s.size
  }

  // Combine monthly trends (appointments + revenue)
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

  // ── KPIs (cross-referenced) ──
  const totalAppointments = Object.values(apptsByLocation).reduce((s, v) => s + v, 0)
  const totalRevenue = Object.values(revenueByLocation).reduce((s, v) => s + v, 0)
  const uniqueClients = allClientCodes.size

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
      totalRevenue: Math.round(totalRevenue * 100) / 100,
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
    clientsByLocation: clientCountByLocation,

    // Data summary for debugging / transparency
    dataSummary: {
      invoiceLinesLoaded: invoiceLines.length,
      appointmentRowsLoaded: allAppts.length,
      completedAppointments: totalAppointments,
      allStatusCounts: {
        completed: normalized.filter(a => a.status === 'completed' && a.source === 'appointment_status').length,
        in_progress: normalized.filter(a => a.status === 'in_progress' && a.source === 'appointment_status').length,
        confirmed: normalized.filter(a => a.status === 'confirmed' && a.source === 'appointment_status').length,
        scheduled: normalized.filter(a => a.status === 'scheduled' && a.source === 'appointment_status').length,
      },
    },
  }
})
