/**
 * EzyVet Analytics API
 * 
 * Provides aggregated analytics data for the EzyVet CRM dashboard.
 * Returns KPIs, charts data, and distribution metrics.
 */

import { serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // Authenticate user first
  const supabaseUser = await serverSupabaseClient(event)
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
  
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Verify admin role
  const supabase = await serverSupabaseServiceRole(event)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()
  
  if (!profile || !['admin', 'super_admin', 'manager', 'marketing_admin'].includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Manager, marketing admin, or admin access required' })
  }

  const query = getQuery(event)
  
  // Optional filters
  const division = query.division as string | undefined
  const startDate = query.startDate as string | undefined
  const endDate = query.endDate as string | undefined

  try {
    // Build base query with ALL filters pushed to the DB
    // This avoids fetching the entire table into server memory.
    function buildFilteredQuery(selectExpr: string = '*') {
      let q = supabase.from('ezyvet_crm_contacts').select(selectExpr)
      if (division) q = q.eq('division', division)
      if (startDate) q = q.gte('last_visit', startDate)
      if (endDate) q = q.lte('last_visit', endDate)
      return q
    }

    // Get filtered count first
    const { count: filteredCount } = await buildFilteredQuery('*')
      .select('*', { count: 'exact', head: true })

    // Fetch filtered contacts with pagination (only matching rows)
    let filteredContacts: any[] = []
    let page = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      const from = page * pageSize
      const to = from + pageSize - 1

      const { data: pageData, error } = await buildFilteredQuery()
        .range(from, to)

      if (error) {
        throw createError({
          statusCode: 500,
          message: `Database error: ${error.message}`
        })
      }

      if (pageData && pageData.length > 0) {
        filteredContacts = filteredContacts.concat(pageData)
        hasMore = pageData.length === pageSize
        page++
      } else {
        hasMore = false
      }
    }

    logger.info('Fetched filtered contacts', 'ezyvet-analytics', { count: filteredContacts.length })

    // For recency analysis, we also need total count and unfiltered recency buckets
    // Use targeted count queries instead of fetching all rows
    const now = new Date()
    const threeMonthsAgo = new Date(now)
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    const sixMonthsAgo = new Date(now)
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const twelveMonthsAgo = new Date(now)
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)
    const twoYearsAgo = new Date(now)
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
    const oneYearAgo = twelveMonthsAgo

    // Run recency count queries in parallel (pushed to DB)
    let baseQ = supabase.from('ezyvet_crm_contacts').select('*', { count: 'exact', head: true })
    if (division) baseQ = baseQ.eq('division', division)

    const [
      { count: totalInDb },
      { count: zeroToThreeCount },
      { count: threeToSixCount },
      { count: sixToTwelveCount },
      { count: oneToTwoCount },
      { count: overTwoCount },
      { count: neverVisitedCount }
    ] = await Promise.all([
      supabase.from('ezyvet_crm_contacts').select('*', { count: 'exact', head: true }),
      (() => { let q = supabase.from('ezyvet_crm_contacts').select('*', { count: 'exact', head: true }).gte('last_visit', threeMonthsAgo.toISOString()); if (division) q = q.eq('division', division); return q })(),
      (() => { let q = supabase.from('ezyvet_crm_contacts').select('*', { count: 'exact', head: true }).gte('last_visit', sixMonthsAgo.toISOString()).lt('last_visit', threeMonthsAgo.toISOString()); if (division) q = q.eq('division', division); return q })(),
      (() => { let q = supabase.from('ezyvet_crm_contacts').select('*', { count: 'exact', head: true }).gte('last_visit', twelveMonthsAgo.toISOString()).lt('last_visit', sixMonthsAgo.toISOString()); if (division) q = q.eq('division', division); return q })(),
      (() => { let q = supabase.from('ezyvet_crm_contacts').select('*', { count: 'exact', head: true }).gte('last_visit', twoYearsAgo.toISOString()).lt('last_visit', twelveMonthsAgo.toISOString()); if (division) q = q.eq('division', division); return q })(),
      (() => { let q = supabase.from('ezyvet_crm_contacts').select('*', { count: 'exact', head: true }).lt('last_visit', twoYearsAgo.toISOString()); if (division) q = q.eq('division', division); return q })(),
      (() => { let q = supabase.from('ezyvet_crm_contacts').select('*', { count: 'exact', head: true }).is('last_visit', null); if (division) q = q.eq('division', division); return q })()
    ])
    
    const activeContacts = filteredContacts.filter(c => {
      if (!c.last_visit) return false
      return new Date(c.last_visit) >= oneYearAgo
    })

    // For ARPU calculation, only include contacts with revenue >= $25
    const qualifyingForArpu = filteredContacts.filter(c => {
      const rev = parseFloat(c.revenue_ytd) || 0
      return rev >= 25
    })

    // ========================================
    // KPI METRICS
    // ========================================
    const totalRevenue = filteredContacts.reduce((sum, c) => sum + (parseFloat(c.revenue_ytd) || 0), 0)
    const qualifyingRevenue = qualifyingForArpu.reduce((sum, c) => sum + (parseFloat(c.revenue_ytd) || 0), 0)
    const arpu = qualifyingForArpu.length > 0 ? qualifyingRevenue / qualifyingForArpu.length : 0

    const kpis = {
      totalContacts: filteredContacts.length,
      activeContacts: activeContacts.length,
      inactiveContacts: filteredContacts.length - activeContacts.length,
      totalRevenue,
      arpu,
      avgRevenue: qualifyingForArpu.length > 0 ? qualifyingRevenue / qualifyingForArpu.length : 0
    }

    // ========================================
    // REVENUE DISTRIBUTION (Histogram) - Starting at $25+
    // ========================================
    const revenueBuckets = [
      { label: '$25-$100', min: 25, max: 100 },
      { label: '$100-$250', min: 100, max: 250 },
      { label: '$250-$500', min: 250, max: 500 },
      { label: '$500-$1K', min: 500, max: 1000 },
      { label: '$1K-$2.5K', min: 1000, max: 2500 },
      { label: '$2.5K-$5K', min: 2500, max: 5000 },
      { label: '$5K-$10K', min: 5000, max: 10000 },
      { label: '$10K+', min: 10000, max: Infinity }
    ]

    // Only include contacts with revenue >= $25
    const revenueQualifiedContacts = filteredContacts.filter(c => (parseFloat(c.revenue_ytd) || 0) >= 25)

    const revenueDistribution = revenueBuckets.map(bucket => {
      const count = revenueQualifiedContacts.filter(c => {
        const rev = parseFloat(c.revenue_ytd) || 0
        return rev >= bucket.min && rev < bucket.max
      }).length
      return {
        label: bucket.label,
        count,
        percentage: revenueQualifiedContacts.length > 0 ? Math.round((count / revenueQualifiedContacts.length) * 100) : 0
      }
    })

    // ========================================
    // BREED REVENUE (Top 10 Breeds)
    // ========================================
    const breedMap = new Map<string, { count: number; revenue: number }>()
    
    for (const contact of filteredContacts) {
      const breed = contact.breed || 'Unknown'
      const existing = breedMap.get(breed) || { count: 0, revenue: 0 }
      existing.count++
      existing.revenue += parseFloat(contact.revenue_ytd) || 0
      breedMap.set(breed, existing)
    }

    const breedData = Array.from(breedMap.entries())
      .map(([breed, data]) => ({
        breed,
        clientCount: data.count,
        totalRevenue: data.revenue,
        avgRevenue: data.count > 0 ? data.revenue / data.count : 0
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10)

    // ========================================
    // RECENCY ANALYSIS - Using DB-pushed count queries (already computed above)
    // ========================================
    const recencyAnalysis = {
      zeroToThreeMonths: zeroToThreeCount || 0,
      threeToSixMonths: threeToSixCount || 0,
      sixToTwelveMonths: sixToTwelveCount || 0,
      oneToTwoYears: oneToTwoCount || 0,
      overTwoYears: overTwoCount || 0,
      neverVisited: neverVisitedCount || 0
    }

    // Chart-ready format
    const recencyChart = [
      { label: '0-3 Months', count: recencyAnalysis.zeroToThreeMonths, color: '#4CAF50' },
      { label: '3-6 Months', count: recencyAnalysis.threeToSixMonths, color: '#8BC34A' },
      { label: '6-12 Months', count: recencyAnalysis.sixToTwelveMonths, color: '#FFC107' },
      { label: '1-2 Years', count: recencyAnalysis.oneToTwoYears, color: '#FF9800' },
      { label: '2+ Years', count: recencyAnalysis.overTwoYears, color: '#F44336' },
      { label: 'Never Visited', count: recencyAnalysis.neverVisited, color: '#9E9E9E' }
    ]

    // ========================================
    // DIVISION BREAKDOWN
    // ========================================
    const divisionMap = new Map<string, { count: number; revenue: number; active: number }>()
    
    for (const contact of filteredContacts) {
      const div = contact.division || 'Unknown'
      const existing = divisionMap.get(div) || { count: 0, revenue: 0, active: 0 }
      existing.count++
      existing.revenue += parseFloat(contact.revenue_ytd) || 0
      if (contact.last_visit && new Date(contact.last_visit) >= oneYearAgo) {
        existing.active++
      }
      divisionMap.set(div, existing)
    }

    const divisionBreakdown = Array.from(divisionMap.entries())
      .map(([division, data]) => ({
        division,
        totalClients: data.count,
        activeClients: data.active,
        totalRevenue: data.revenue,
        avgRevenue: data.count > 0 ? data.revenue / data.count : 0
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)

    // ========================================
    // DEPARTMENT BREAKDOWN
    // ========================================
    const departmentMap = new Map<string, { count: number; revenue: number; active: number }>()
    
    for (const contact of filteredContacts) {
      const dept = contact.department || 'Unknown'
      const existing = departmentMap.get(dept) || { count: 0, revenue: 0, active: 0 }
      existing.count++
      existing.revenue += parseFloat(contact.revenue_ytd) || 0
      if (contact.last_visit && new Date(contact.last_visit) >= oneYearAgo) {
        existing.active++
      }
      departmentMap.set(dept, existing)
    }

    const departmentBreakdown = Array.from(departmentMap.entries())
      .map(([department, data]) => ({
        department,
        totalClients: data.count,
        activeClients: data.active,
        totalRevenue: data.revenue,
        avgRevenue: data.count > 0 ? data.revenue / data.count : 0
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)

    // Get list of divisions for filter dropdown
    const divisions = Array.from(divisionMap.keys()).filter(d => d !== 'Unknown').sort()

    return {
      success: true,
      kpis,
      revenueDistribution,
      breedData,
      recencyAnalysis,
      recencyChart,
      divisionBreakdown,
      departmentBreakdown,
      divisions,
      totalContactsInDb: totalInDb || 0,
      filters: {
        division: division || null,
        startDate: startDate || null,
        endDate: endDate || null
      }
    }

  } catch (err: any) {
    logger.error('Analytics error', err, 'ezyvet-analytics')
    
    if (err.statusCode) throw err

    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to load analytics'
    })
  }
})
