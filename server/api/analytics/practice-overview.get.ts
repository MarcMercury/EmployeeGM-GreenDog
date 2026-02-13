/**
 * Unified Practice Analytics API
 *
 * GET /api/analytics/practice-overview
 *
 * Combines key metrics from all ezyVet data sources into a single
 * cohesive dashboard. Pulls from:
 *   - invoice_lines (revenue, department, staff performance)
 *   - appointment_data / ezyvet_appointments (scheduling, demand)
 *   - ezyvet_crm_contacts (client retention, growth)
 *   - referral_partners (referral pipeline)
 *
 * Also returns sync status to indicate data freshness.
 */

import { serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // Auth
  const supabaseUser = await serverSupabaseClient(event)
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const supabase = await serverSupabaseServiceRole(event)

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin', 'manager', 'marketing_admin'].includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const query = getQuery(event)
  const startDate = (query.startDate as string) || new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]
  const endDate = (query.endDate as string) || new Date().toISOString().split('T')[0]

  try {
    // Run all queries in parallel for speed
    const [
      revenueMetrics,
      appointmentMetrics,
      clientMetrics,
      referralMetrics,
      syncStatus,
      monthlyRevenue,
      departmentRevenue,
      topStaff,
      appointmentsByType,
      clientRetention,
    ] = await Promise.all([
      // 1. Revenue KPIs
      getRevenueMetrics(supabase, startDate, endDate),
      // 2. Appointment KPIs
      getAppointmentMetrics(supabase, startDate, endDate),
      // 3. Client KPIs
      getClientMetrics(supabase),
      // 4. Referral KPIs
      getReferralMetrics(supabase),
      // 5. Sync status
      getSyncStatus(supabase),
      // 6. Monthly revenue trend
      getMonthlyRevenueTrend(supabase, startDate, endDate),
      // 7. Revenue by department
      getDepartmentRevenue(supabase, startDate, endDate),
      // 8. Top performing staff
      getTopStaff(supabase, startDate, endDate),
      // 9. Appointments by type
      getAppointmentsByType(supabase, startDate, endDate),
      // 10. Client retention bands
      getClientRetention(supabase),
    ])

    return {
      success: true,
      dateRange: { startDate, endDate },
      kpis: {
        revenue: revenueMetrics,
        appointments: appointmentMetrics,
        clients: clientMetrics,
        referrals: referralMetrics,
      },
      charts: {
        monthlyRevenue,
        departmentRevenue,
        topStaff,
        appointmentsByType,
        clientRetention,
      },
      syncStatus,
      generatedAt: new Date().toISOString(),
    }
  } catch (err: any) {
    console.error('Practice analytics error:', err)
    throw createError({ statusCode: 500, message: err.message || 'Failed to load analytics' })
  }
})

// ─── Revenue Metrics ──────────────────────────────────────────
async function getRevenueMetrics(supabase: any, startDate: string, endDate: string) {
  const { data } = await supabase
    .from('invoice_lines')
    .select('total_earned, invoice_number, client_code, staff_member')
    .gte('invoice_date', startDate)
    .lte('invoice_date', endDate)

  const rows = data || []
  const totalRevenue = rows.reduce((sum: number, r: any) => sum + (parseFloat(r.total_earned) || 0), 0)
  const uniqueInvoices = new Set(rows.map((r: any) => r.invoice_number).filter(Boolean)).size
  const uniqueClients = new Set(rows.map((r: any) => r.client_code).filter(Boolean)).size
  const avgRevenuePerInvoice = uniqueInvoices > 0 ? totalRevenue / uniqueInvoices : 0

  // Previous period comparison
  const periodDays = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000)
  const prevStart = new Date(new Date(startDate).getTime() - periodDays * 86400000).toISOString().split('T')[0]
  const prevEnd = new Date(new Date(startDate).getTime() - 86400000).toISOString().split('T')[0]

  const { data: prevData } = await supabase
    .from('invoice_lines')
    .select('total_earned')
    .gte('invoice_date', prevStart)
    .lte('invoice_date', prevEnd)

  const prevRevenue = (prevData || []).reduce((sum: number, r: any) => sum + (parseFloat(r.total_earned) || 0), 0)
  const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    uniqueInvoices,
    uniqueClients,
    avgRevenuePerInvoice: Math.round(avgRevenuePerInvoice * 100) / 100,
    lineCount: rows.length,
    revenueChangePct: Math.round(revenueChange * 10) / 10,
  }
}

// ─── Appointment Metrics ──────────────────────────────────────
async function getAppointmentMetrics(supabase: any, startDate: string, endDate: string) {
  // Try ezyvet_appointments first (API-synced), fallback to appointment_data (CSV)
  const { count: apiCount } = await supabase
    .from('ezyvet_appointments')
    .select('*', { count: 'exact', head: true })
    .gte('start_at', startDate)
    .lte('start_at', endDate + 'T23:59:59Z')

  const { count: csvCount } = await supabase
    .from('appointment_data')
    .select('*', { count: 'exact', head: true })
    .gte('appointment_date', startDate)
    .lte('appointment_date', endDate)

  const totalAppointments = Math.max(apiCount || 0, csvCount || 0)
  const source = (apiCount || 0) >= (csvCount || 0) ? 'ezyvet_api' : 'csv_upload'

  // Get type breakdown
  let typeBreakdown: Record<string, number> = {}
  if (source === 'ezyvet_api') {
    const { data } = await supabase
      .from('ezyvet_appointments')
      .select('type_name')
      .gte('start_at', startDate)
      .lte('start_at', endDate + 'T23:59:59Z')

    for (const row of (data || [])) {
      const t = row.type_name || 'Other'
      typeBreakdown[t] = (typeBreakdown[t] || 0) + 1
    }
  } else {
    const { data } = await supabase
      .from('appointment_data')
      .select('appointment_type')
      .gte('appointment_date', startDate)
      .lte('appointment_date', endDate)

    for (const row of (data || [])) {
      const t = row.appointment_type || 'Other'
      typeBreakdown[t] = (typeBreakdown[t] || 0) + 1
    }
  }

  const periodDays = Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000))
  const avgPerDay = totalAppointments / periodDays

  return {
    totalAppointments,
    avgPerDay: Math.round(avgPerDay * 10) / 10,
    uniqueTypes: Object.keys(typeBreakdown).length,
    dataSource: source,
  }
}

// ─── Client Metrics ───────────────────────────────────────────
async function getClientMetrics(supabase: any) {
  const { count: totalContacts } = await supabase
    .from('ezyvet_crm_contacts')
    .select('*', { count: 'exact', head: true })

  const { count: activeContacts } = await supabase
    .from('ezyvet_crm_contacts')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  const threeMonthsAgo = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]
  const { count: recentVisitors } = await supabase
    .from('ezyvet_crm_contacts')
    .select('*', { count: 'exact', head: true })
    .gte('last_visit', threeMonthsAgo)

  const oneYearAgo = new Date(Date.now() - 365 * 86400000).toISOString().split('T')[0]
  const { count: lapsed } = await supabase
    .from('ezyvet_crm_contacts')
    .select('*', { count: 'exact', head: true })
    .lt('last_visit', oneYearAgo)

  const retentionRate = totalContacts ? Math.round(((recentVisitors || 0) / totalContacts) * 100) : 0

  return {
    totalContacts: totalContacts || 0,
    activeContacts: activeContacts || 0,
    recentVisitors: recentVisitors || 0,
    lapsedClients: lapsed || 0,
    retentionRate3Mo: retentionRate,
  }
}

// ─── Referral Metrics ─────────────────────────────────────────
async function getReferralMetrics(supabase: any) {
  const { data: partners } = await supabase
    .from('referral_partners')
    .select('id, total_referrals_all_time, total_revenue_all_time, last_contact_date, status, tier')

  const allPartners = partners || []
  const activePartners = allPartners.filter((p: any) => p.status === 'active')
  const totalReferrals = allPartners.reduce((sum: number, p: any) => sum + (p.total_referrals_all_time || 0), 0)
  const totalReferralRevenue = allPartners.reduce((sum: number, p: any) => sum + (parseFloat(p.total_revenue_all_time) || 0), 0)

  const tierCounts: Record<string, number> = {}
  for (const p of allPartners) {
    const tier = p.tier || 'Untiered'
    tierCounts[tier] = (tierCounts[tier] || 0) + 1
  }

  return {
    totalPartners: allPartners.length,
    activePartners: activePartners.length,
    totalReferrals,
    totalReferralRevenue: Math.round(totalReferralRevenue * 100) / 100,
    tierBreakdown: tierCounts,
  }
}

// ─── Sync Status ──────────────────────────────────────────────
async function getSyncStatus(supabase: any) {
  // Get latest sync log entries per type
  const { data: recentSyncs } = await supabase
    .from('ezyvet_api_sync_log')
    .select('sync_type, status, completed_at, records_upserted')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(20)

  const lastSyncByType: Record<string, any> = {}
  for (const s of (recentSyncs || [])) {
    if (!lastSyncByType[s.sync_type]) {
      lastSyncByType[s.sync_type] = {
        lastSync: s.completed_at,
        recordsSynced: s.records_upserted,
      }
    }
  }

  // Check data freshness
  const now = Date.now()
  const staleThresholdMs = 8 * 60 * 60 * 1000 // 8 hours
  const hasApiData = Object.keys(lastSyncByType).length > 0

  return {
    mode: hasApiData ? 'auto' : 'manual',
    lastSyncByType,
    isStale: hasApiData
      ? Object.values(lastSyncByType).some(
          (s: any) => (now - new Date(s.lastSync).getTime()) > staleThresholdMs
        )
      : true,
    hasApiData,
  }
}

// ─── Monthly Revenue Trend ────────────────────────────────────
async function getMonthlyRevenueTrend(supabase: any, startDate: string, endDate: string) {
  const { data } = await supabase
    .from('invoice_lines')
    .select('invoice_date, total_earned, invoice_number, client_code')
    .gte('invoice_date', startDate)
    .lte('invoice_date', endDate)

  const monthMap: Record<string, { revenue: number; invoices: Set<string>; clients: Set<string> }> = {}

  for (const row of (data || [])) {
    if (!row.invoice_date) continue
    const month = row.invoice_date.substring(0, 7) // YYYY-MM
    if (!monthMap[month]) monthMap[month] = { revenue: 0, invoices: new Set(), clients: new Set() }
    monthMap[month].revenue += parseFloat(row.total_earned) || 0
    if (row.invoice_number) monthMap[month].invoices.add(row.invoice_number)
    if (row.client_code) monthMap[month].clients.add(row.client_code)
  }

  return Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      revenue: Math.round(data.revenue * 100) / 100,
      invoiceCount: data.invoices.size,
      clientCount: data.clients.size,
    }))
}

// ─── Department Revenue ───────────────────────────────────────
async function getDepartmentRevenue(supabase: any, startDate: string, endDate: string) {
  const { data } = await supabase
    .from('invoice_lines')
    .select('department, total_earned')
    .gte('invoice_date', startDate)
    .lte('invoice_date', endDate)

  const deptMap: Record<string, number> = {}
  for (const row of (data || [])) {
    const dept = row.department || 'Unknown'
    deptMap[dept] = (deptMap[dept] || 0) + (parseFloat(row.total_earned) || 0)
  }

  return Object.entries(deptMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([department, revenue]) => ({ department, revenue: Math.round(revenue * 100) / 100 }))
}

// ─── Top Staff ────────────────────────────────────────────────
async function getTopStaff(supabase: any, startDate: string, endDate: string) {
  const { data } = await supabase
    .from('invoice_lines')
    .select('staff_member, total_earned')
    .gte('invoice_date', startDate)
    .lte('invoice_date', endDate)

  const staffMap: Record<string, number> = {}
  for (const row of (data || [])) {
    const staff = row.staff_member || 'Unknown'
    staffMap[staff] = (staffMap[staff] || 0) + (parseFloat(row.total_earned) || 0)
  }

  return Object.entries(staffMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, revenue]) => ({ name, revenue: Math.round(revenue * 100) / 100 }))
}

// ─── Appointments by Type ─────────────────────────────────────
async function getAppointmentsByType(supabase: any, startDate: string, endDate: string) {
  // Prefer ezyvet_appointments over appointment_data
  const { data: apiData } = await supabase
    .from('ezyvet_appointments')
    .select('type_name')
    .gte('start_at', startDate)
    .lte('start_at', endDate + 'T23:59:59Z')

  const useApi = (apiData || []).length > 0

  const typeMap: Record<string, number> = {}
  if (useApi) {
    for (const row of (apiData || [])) {
      const t = row.type_name || 'Other'
      typeMap[t] = (typeMap[t] || 0) + 1
    }
  } else {
    const { data } = await supabase
      .from('appointment_data')
      .select('appointment_type')
      .gte('appointment_date', startDate)
      .lte('appointment_date', endDate)

    for (const row of (data || [])) {
      const t = row.appointment_type || 'Other'
      typeMap[t] = (typeMap[t] || 0) + 1
    }
  }

  return Object.entries(typeMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([type, count]) => ({ type, count }))
}

// ─── Client Retention Bands ───────────────────────────────────
async function getClientRetention(supabase: any) {
  const now = new Date()
  const bands = [
    { label: '0-30 days', maxDays: 30 },
    { label: '31-90 days', maxDays: 90 },
    { label: '91-180 days', maxDays: 180 },
    { label: '181-365 days', maxDays: 365 },
    { label: '1-2 years', maxDays: 730 },
    { label: '2+ years', maxDays: Infinity },
  ]

  const results: Array<{ label: string; count: number }> = []

  for (let i = 0; i < bands.length; i++) {
    const minDate = i > 0
      ? new Date(now.getTime() - bands[i].maxDays * 86400000).toISOString().split('T')[0]
      : null
    const maxDate = i > 0
      ? new Date(now.getTime() - bands[i - 1].maxDays * 86400000).toISOString().split('T')[0]
      : new Date(now.getTime() - 0).toISOString().split('T')[0]

    let query = supabase
      .from('ezyvet_crm_contacts')
      .select('*', { count: 'exact', head: true })

    if (i === 0) {
      query = query.gte('last_visit', new Date(now.getTime() - bands[0].maxDays * 86400000).toISOString().split('T')[0])
    } else if (bands[i].maxDays === Infinity) {
      query = query.lt('last_visit', new Date(now.getTime() - bands[i - 1].maxDays * 86400000).toISOString().split('T')[0])
    } else {
      query = query
        .gte('last_visit', new Date(now.getTime() - bands[i].maxDays * 86400000).toISOString().split('T')[0])
        .lt('last_visit', new Date(now.getTime() - bands[i - 1].maxDays * 86400000).toISOString().split('T')[0])
    }

    const { count } = await query
    results.push({ label: bands[i].label, count: count || 0 })
  }

  return results
}
