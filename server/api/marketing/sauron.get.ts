/**
 * Sauron Executive Report API
 *
 * GET /api/marketing/sauron
 *
 * Aggregates data from all 3 sources (invoices, CRM contacts, appointments)
 * server-side using the service role to bypass PostgREST row limits.
 * Reuses the get_invoice_dashboard() RPC for invoice aggregations.
 */

import { serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'
import {
  CLIENT_BENCHMARKS,
  FINANCIAL_BENCHMARKS,
  evaluateRetention,
} from '~/utils/vetBenchmarks'

export default defineEventHandler(async (event) => {
  // Auth check
  const supabaseUser = await serverSupabaseClient(event)
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const supabase = await serverSupabaseServiceRole(event)

  // Verify role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin', 'manager', 'marketing_admin', 'sup_admin'].includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  try {
    // ═══════════════════════════════════════════
    // DATE CUTOFF — only include complete months
    // e.g. if today is Feb 11, cutoff = Jan 31 (last day of previous month)
    // ═══════════════════════════════════════════
    const now = new Date()
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0) // day 0 = last day of prev month
    const cutoffDate = endOfLastMonth.toISOString().split('T')[0] // e.g. '2026-01-31'

    // ═══════════════════════════════════════════
    // 1. INVOICE DATA — via the get_invoice_dashboard RPC (processes ALL rows)
    // ═══════════════════════════════════════════
    const { data: dashboardData, error: dashErr } = await supabase.rpc('get_invoice_dashboard', {
      p_start_date: null,
      p_end_date: cutoffDate,
      p_location: null,
    })

    if (dashErr) {
      console.error('[Sauron] Invoice dashboard RPC error:', dashErr)
    }

    const invoiceStats = dashboardData?.stats || {}
    const invoiceMonthly = dashboardData?.monthly || []
    const invoiceDepartments = dashboardData?.departments || []
    const invoiceStaff = dashboardData?.staff || []

    // Compute totals from RPC data
    const totalRevenue = invoiceStats.totalRevenue || 0
    const totalLines = invoiceStats.totalLines || 0
    const uniqueInvoices = invoiceStats.uniqueInvoices || 0
    const uniqueClients = invoiceStats.uniqueClients || 0
    const uniqueStaff = invoiceStats.uniqueStaff || 0
    const earliestInvoice = invoiceStats.earliestDate || null
    const latestInvoice = invoiceStats.latestDate || null

    // Departments with percentages
    const topDepartments = invoiceDepartments.map((d: any) => ({
      name: d.department || 'Unknown',
      revenue: d.revenue || 0,
      pct: totalRevenue > 0 ? Math.round(((d.revenue || 0) / totalRevenue) * 100) : 0,
    }))

    // Staff with revenue
    const topStaffList = invoiceStaff.map((s: any) => ({
      name: s.staffMember || 'Unknown',
      revenue: s.revenue || 0,
      lines: s.lineCount || s.line_count || 0,
      invoices: s.invoiceCount || s.invoice_count || 0,
    }))

    // Monthly trend with labels
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthlyTrend = invoiceMonthly.map((m: any) => {
      const [y, mo] = (m.month || '').split('-')
      return {
        month: m.month,
        label: mo ? `${monthNames[parseInt(mo) - 1]} ${(y || '').slice(2)}` : m.month,
        revenue: m.revenue || 0,
      }
    })
    const peakMonth = Math.max(...monthlyTrend.map((m: any) => m.revenue), 1)
    const avgMonthly = monthlyTrend.length > 0
      ? monthlyTrend.reduce((s: number, m: any) => s + m.revenue, 0) / monthlyTrend.length
      : 0

    const inv = {
      totalRevenue,
      uniqueInvoices,
      uniqueClients,
      uniqueStaff,
      totalLines,
      topDepartments,
      topStaff: topStaffList,
      monthlyTrend,
      peakMonth,
      avgMonthly,
      earliestDate: earliestInvoice,
      latestDate: latestInvoice,
    }

    // ═══════════════════════════════════════════
    // 2. CRM CONTACTS — paginate with service role (no PostgREST limit)
    // ═══════════════════════════════════════════
    let allContacts: any[] = []
    let page = 0
    const pageSize = 1000
    let hasMore = true
    while (hasMore) {
      const { data } = await supabase
        .from('ezyvet_crm_contacts')
        .select('id, last_visit, revenue_ytd, division, is_active')
        .range(page * pageSize, (page + 1) * pageSize - 1)
      if (data && data.length > 0) {
        allContacts = allContacts.concat(data)
        hasMore = data.length === pageSize
        page++
      } else {
        hasMore = false
      }
    }

    const sixMonthsAgo = new Date(endOfLastMonth); sixMonthsAgo.setMonth(endOfLastMonth.getMonth() - 6)
    const twelveMonthsAgo = new Date(endOfLastMonth); twelveMonthsAgo.setFullYear(endOfLastMonth.getFullYear() - 1)

    let active = 0, atRisk = 0, lapsed = 0, neverVisited = 0
    let highValue = 0
    let totalClientRev = 0
    const divisionMap = new Map<string, { count: number; revenue: number }>()
    let arpuSum = 0, arpuCount = 0

    const tierDef = [
      { label: 'VIP', range: '$5,000+', min: 5000, max: Infinity, color: 'amber-darken-1', count: 0, revenue: 0 },
      { label: 'Premium', range: '$2,000–$5,000', min: 2000, max: 5000, color: 'purple', count: 0, revenue: 0 },
      { label: 'Regular', range: '$500–$2,000', min: 500, max: 2000, color: 'blue', count: 0, revenue: 0 },
      { label: 'Low Value', range: '$25–$500', min: 25, max: 500, color: 'grey', count: 0, revenue: 0 },
      { label: 'Minimal', range: '<$25', min: 0, max: 25, color: 'grey-lighten-1', count: 0, revenue: 0 },
    ]

    for (const c of allContacts) {
      const lastVisit = c.last_visit ? new Date(c.last_visit) : null
      const rev = parseFloat(c.revenue_ytd) || 0
      totalClientRev += rev

      if (rev >= 25) { arpuSum += rev; arpuCount++ }
      if (rev >= 2000) highValue++

      const div = c.division || 'Unknown'
      if (!divisionMap.has(div)) divisionMap.set(div, { count: 0, revenue: 0 })
      const d = divisionMap.get(div)!
      d.count++; d.revenue += rev

      if (!lastVisit) { neverVisited++ }
      else if (lastVisit >= sixMonthsAgo) { active++ }
      else if (lastVisit >= twelveMonthsAgo) { atRisk++ }
      else { lapsed++ }

      for (const t of tierDef) {
        if (rev >= t.min && rev < t.max) { t.count++; t.revenue += rev; break }
      }
    }

    const totalClients = allContacts.length
    const retentionRate = totalClients > 0 ? Math.round(((active + atRisk) / totalClients) * 100) : 0
    const arpu = arpuCount > 0 ? arpuSum / arpuCount : 0

    const segments = [
      { label: 'Active (0-6mo)', count: active, pct: totalClients > 0 ? Math.round((active / totalClients) * 100) : 0, bg: 'rgba(76, 175, 80, 0.15)' },
      { label: 'At Risk (6-12mo)', count: atRisk, pct: totalClients > 0 ? Math.round((atRisk / totalClients) * 100) : 0, bg: 'rgba(255, 152, 0, 0.15)' },
      { label: 'Lapsed (12mo+)', count: lapsed, pct: totalClients > 0 ? Math.round((lapsed / totalClients) * 100) : 0, bg: 'rgba(244, 67, 54, 0.15)' },
      { label: 'Never Visited', count: neverVisited, pct: totalClients > 0 ? Math.round((neverVisited / totalClients) * 100) : 0, bg: 'rgba(158, 158, 158, 0.15)' },
    ].filter(s => s.count > 0)

    const divisions = [...divisionMap.entries()]
      .map(([name, d]) => ({ name, count: d.count, revenue: d.revenue }))
      .sort((a, b) => b.revenue - a.revenue)

    const tiers = tierDef.map(t => ({
      ...t,
      clientPct: totalClients > 0 ? Math.round((t.count / totalClients) * 100) : 0,
    })).filter(t => t.count > 0)

    const cli = {
      totalClients,
      activeClients: active,
      atRisk,
      lapsed,
      neverVisited,
      retentionRate,
      arpu,
      totalRevenue: totalClientRev,
      highValue,
      segments,
      tiers,
      divisions,
    }

    // ═══════════════════════════════════════════
    // 3. APPOINTMENTS — paginate with service role
    // ═══════════════════════════════════════════
    let allAppts: any[] = []
    page = 0
    hasMore = true
    while (hasMore) {
      const { data } = await supabase
        .from('appointment_data')
        .select('id, appointment_type, appointment_date, location_name, location_id, day_of_week, species, service_category, duration_minutes, revenue, provider_name, status')
        .lte('appointment_date', cutoffDate)
        .range(page * pageSize, (page + 1) * pageSize - 1)
      if (data && data.length > 0) {
        allAppts = allAppts.concat(data)
        hasMore = data.length === pageSize
        page++
      } else {
        hasMore = false
      }
    }

    const uniqueApptTypes = new Set(allAppts.map(a => a.appointment_type).filter(Boolean)).size
    const apptLocations = new Set(allAppts.map(a => a.location_name || a.location_id).filter(Boolean)).size

    // Service mix
    const typeMap = new Map<string, number>()
    for (const a of allAppts) {
      const t = (a.appointment_type as string) || 'Unknown'
      typeMap.set(t, (typeMap.get(t) || 0) + 1)
    }
    const topServices = [...typeMap.entries()]
      .map(([name, count]) => ({ name, count, pct: allAppts.length > 0 ? Math.round((count / allAppts.length) * 100) : 0 }))
      .sort((a, b) => b.count - a.count)

    // Day of week
    const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayAbbr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dayMap = new Map<string, number>()
    for (const a of allAppts) {
      let dow = a.day_of_week as string
      if (!dow && a.appointment_date) {
        const d = new Date(a.appointment_date as string)
        dow = dayOrder[d.getDay()]
      }
      if (dow) dayMap.set(dow, (dayMap.get(dow) || 0) + 1)
    }
    let peakDay = ''
    let peakDayCount = 0
    for (const [day, count] of dayMap) {
      if (count > peakDayCount) { peakDay = day; peakDayCount = count }
    }
    const dayDistribution = dayOrder.map((name, i) => ({
      name, abbr: dayAbbr[i], count: dayMap.get(name) || 0,
      pct: allAppts.length > 0 ? Math.round(((dayMap.get(name) || 0) / allAppts.length) * 100) : 0,
    }))

    // Species
    const speciesMap = new Map<string, number>()
    for (const a of allAppts) {
      const sp = (a.species as string) || ''
      if (sp) speciesMap.set(sp, (speciesMap.get(sp) || 0) + 1)
    }
    const speciesBreakdown = [...speciesMap.entries()]
      .map(([name, count]) => ({ name, count, pct: allAppts.length > 0 ? Math.round((count / allAppts.length) * 100) : 0 }))
      .sort((a, b) => b.count - a.count)

    const apptDates = allAppts.map(a => a.appointment_date as string).filter(Boolean).sort()

    const appt = {
      total: allAppts.length,
      uniqueTypes: uniqueApptTypes,
      locations: apptLocations,
      peakDay,
      topServices,
      dayDistribution,
      speciesBreakdown,
      earliestDate: apptDates[0] || null,
      latestDate: apptDates[apptDates.length - 1] || null,
    }

    return { inv, cli, appt, cutoffDate }

  } catch (err: any) {
    console.error('[Sauron] API error:', err)
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, message: err.message || 'Failed to load Sauron data' })
  }
})
