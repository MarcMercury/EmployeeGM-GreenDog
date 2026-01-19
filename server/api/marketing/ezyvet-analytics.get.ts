/**
 * EzyVet Analytics API
 * 
 * Provides aggregated analytics data for the EzyVet CRM dashboard.
 * Returns KPIs, charts data, and distribution metrics.
 */

import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)
  const query = getQuery(event)
  
  // Optional filters
  const division = query.division as string | undefined
  const startDate = query.startDate as string | undefined
  const endDate = query.endDate as string | undefined

  try {
    // First, get total count to know how many records exist
    const { count: totalCount, error: countError } = await supabase
      .from('ezyvet_crm_contacts')
      .select('*', { count: 'exact', head: true })
    
    console.log('[ezyvet-analytics] Total count in DB:', totalCount)

    // Fetch ALL contacts using pagination to bypass 1000 row limit
    let allContacts: any[] = []
    let page = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      const from = page * pageSize
      const to = from + pageSize - 1
      
      console.log(`[ezyvet-analytics] Fetching page ${page + 1}, range ${from}-${to}`)
      
      let pageQuery = supabase
        .from('ezyvet_crm_contacts')
        .select('*')
        .range(from, to)
      
      // Division filter always applies
      if (division) {
        pageQuery = pageQuery.eq('division', division)
      }

      const { data: pageData, error } = await pageQuery

      if (error) {
        console.error('[ezyvet-analytics] Page error:', error)
        throw createError({
          statusCode: 500,
          message: `Database error: ${error.message}`
        })
      }

      console.log(`[ezyvet-analytics] Page ${page + 1} returned ${pageData?.length || 0} rows`)

      if (pageData && pageData.length > 0) {
        allContacts = allContacts.concat(pageData)
        hasMore = pageData.length === pageSize
        page++
      } else {
        hasMore = false
      }
    }

    console.log(`[ezyvet-analytics] Total fetched: ${allContacts.length} contacts`)

    // Apply date range filter on last_visit AFTER fetching all data
    let filteredContacts = allContacts
    if (startDate || endDate) {
      filteredContacts = allContacts.filter(c => {
        if (!c.last_visit) return false
        const visitDate = new Date(c.last_visit)
        if (startDate && visitDate < new Date(startDate)) return false
        if (endDate && visitDate > new Date(endDate)) return false
        return true
      })
      console.log(`[ezyvet-analytics] After date filter: ${filteredContacts.length} contacts`)
    }

    // Define "Active" as having activity within the last 12 months
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    
    const activeContacts = filteredContacts.filter(c => {
      if (!c.last_visit) return false
      const lastVisit = new Date(c.last_visit)
      return lastVisit >= oneYearAgo
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
    // RECENCY ANALYSIS - New buckets: 0-3mo, 3-6mo, 6-12mo, 1-2yr, 2yr+
    // ========================================
    const now = new Date()
    const threeMonthsAgo = new Date(now)
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    const sixMonthsAgo = new Date(now)
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const twelveMonthsAgo = new Date(now)
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)
    const twoYearsAgo = new Date(now)
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)

    // Use ALL contacts (not just filtered) for recency to match CRM total
    function countByRecency(contacts: any[], minDate: Date, maxDate: Date | null = null) {
      return contacts.filter(c => {
        if (!c.last_visit) return false
        const visitDate = new Date(c.last_visit)
        if (maxDate) {
          return visitDate >= minDate && visitDate < maxDate
        }
        return visitDate >= minDate
      }).length
    }

    // Count contacts with no last_visit date
    const neverVisited = allContacts.filter(c => !c.last_visit).length
    
    // Count by recency buckets (use allContacts so total matches CRM)
    const zeroToThreeMonths = countByRecency(allContacts, threeMonthsAgo, null)
    const threeToSixMonths = countByRecency(allContacts, sixMonthsAgo, threeMonthsAgo)
    const sixToTwelveMonths = countByRecency(allContacts, twelveMonthsAgo, sixMonthsAgo)
    const oneToTwoYears = countByRecency(allContacts, twoYearsAgo, twelveMonthsAgo)
    const overTwoYears = allContacts.filter(c => {
      if (!c.last_visit) return false
      return new Date(c.last_visit) < twoYearsAgo
    }).length

    const recencyAnalysis = {
      zeroToThreeMonths,
      threeToSixMonths,
      sixToTwelveMonths,
      oneToTwoYears,
      overTwoYears,
      neverVisited
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
      totalContactsInDb: allContacts.length,
      filters: {
        division: division || null,
        startDate: startDate || null,
        endDate: endDate || null
      }
    }

  } catch (err: any) {
    console.error('Analytics error:', err)
    
    if (err.statusCode) throw err

    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to load analytics'
    })
  }
})
