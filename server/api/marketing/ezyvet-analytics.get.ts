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
    // Fetch ALL contacts using pagination to bypass 1000 row limit
    let allContacts: any[] = []
    let page = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      let query = supabase
        .from('ezyvet_crm_contacts')
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1)
      
      if (division) {
        query = query.eq('division', division)
      }
      
      if (startDate) {
        query = query.gte('last_visit', startDate)
      }
      
      if (endDate) {
        query = query.lte('last_visit', endDate)
      }

      const { data: pageData, error } = await query

      if (error) {
        throw createError({
          statusCode: 500,
          message: `Database error: ${error.message}`
        })
      }

      if (pageData && pageData.length > 0) {
        allContacts = allContacts.concat(pageData)
        hasMore = pageData.length === pageSize
        page++
      } else {
        hasMore = false
      }
    }

    // Define "Active" as having activity within the last 3 years
    const threeYearsAgo = new Date()
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)
    
    const activeContacts = allContacts.filter(c => {
      // Must have a last_visit date within 3 years
      if (!c.last_visit) return false
      const lastVisit = new Date(c.last_visit)
      return lastVisit >= threeYearsAgo
    })

    // ========================================
    // KPI METRICS
    // ========================================
    const totalRevenue = allContacts.reduce((sum, c) => sum + (parseFloat(c.revenue_ytd) || 0), 0)
    const activeRevenue = activeContacts.reduce((sum, c) => sum + (parseFloat(c.revenue_ytd) || 0), 0)
    const arpu = activeContacts.length > 0 ? activeRevenue / activeContacts.length : 0

    const kpis = {
      totalContacts: allContacts.length,
      activeContacts: activeContacts.length,
      inactiveContacts: allContacts.length - activeContacts.length,
      totalRevenue,
      activeRevenue,
      arpu,
      avgRevenue: allContacts.length > 0 ? totalRevenue / allContacts.length : 0
    }

    // ========================================
    // REVENUE DISTRIBUTION (Histogram)
    // ========================================
    const revenueBuckets = [
      { label: '$0', min: 0, max: 1 },
      { label: '$1-$100', min: 1, max: 100 },
      { label: '$100-$500', min: 100, max: 500 },
      { label: '$500-$1K', min: 500, max: 1000 },
      { label: '$1K-$2.5K', min: 1000, max: 2500 },
      { label: '$2.5K-$5K', min: 2500, max: 5000 },
      { label: '$5K-$10K', min: 5000, max: 10000 },
      { label: '$10K+', min: 10000, max: Infinity }
    ]

    const revenueDistribution = revenueBuckets.map(bucket => {
      const count = activeContacts.filter(c => {
        const rev = parseFloat(c.revenue_ytd) || 0
        return rev >= bucket.min && rev < bucket.max
      }).length
      return {
        label: bucket.label,
        count,
        percentage: activeContacts.length > 0 ? Math.round((count / activeContacts.length) * 100) : 0
      }
    })

    // ========================================
    // GEOGRAPHIC HOTSPOTS (Top 10 Cities)
    // ========================================
    const cityMap = new Map<string, { count: number; revenue: number }>()
    
    for (const contact of activeContacts) {
      const city = contact.address_city || 'Unknown'
      const existing = cityMap.get(city) || { count: 0, revenue: 0 }
      existing.count++
      existing.revenue += parseFloat(contact.revenue_ytd) || 0
      cityMap.set(city, existing)
    }

    const geographicData = Array.from(cityMap.entries())
      .map(([city, data]) => ({
        city,
        clientCount: data.count,
        totalRevenue: data.revenue,
        avgRevenue: data.count > 0 ? data.revenue / data.count : 0
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10)

    // ========================================
    // MARKETING EFFICACY (Referral Sources)
    // ========================================
    const referralMap = new Map<string, { count: number; revenue: number }>()
    
    for (const contact of activeContacts) {
      const source = contact.referral_source || 'Unknown'
      const existing = referralMap.get(source) || { count: 0, revenue: 0 }
      existing.count++
      existing.revenue += parseFloat(contact.revenue_ytd) || 0
      referralMap.set(source, existing)
    }

    const marketingEfficacy = Array.from(referralMap.entries())
      .map(([source, data]) => ({
        source,
        clientCount: data.count,
        totalRevenue: data.revenue,
        percentage: activeContacts.length > 0 ? Math.round((data.count / activeContacts.length) * 100) : 0
      }))
      .sort((a, b) => b.clientCount - a.clientCount)

    // ========================================
    // RECENCY ANALYSIS
    // ========================================
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    const oneEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

    function countByRecency(minDate: Date, maxDate: Date | null = null) {
      return activeContacts.filter(c => {
        if (!c.last_visit) return false
        const visitDate = new Date(c.last_visit)
        if (maxDate) {
          return visitDate >= minDate && visitDate < maxDate
        }
        return visitDate >= minDate
      }).length
    }

    const neverVisited = activeContacts.filter(c => !c.last_visit).length

    const recencyAnalysis = {
      last30Days: countByRecency(thirtyDaysAgo),
      days31to60: countByRecency(sixtyDaysAgo, thirtyDaysAgo),
      days61to90: countByRecency(ninetyDaysAgo, sixtyDaysAgo),
      days91to180: countByRecency(oneEightyDaysAgo, ninetyDaysAgo),
      days181to365: countByRecency(oneYearAgo, oneEightyDaysAgo),
      overOneYear: activeContacts.filter(c => {
        if (!c.last_visit) return false
        return new Date(c.last_visit) < oneYearAgo
      }).length,
      neverVisited
    }

    // Chart-ready format
    const recencyChart = [
      { label: 'Last 30 Days', count: recencyAnalysis.last30Days, color: '#4CAF50' },
      { label: '31-60 Days', count: recencyAnalysis.days31to60, color: '#8BC34A' },
      { label: '61-90 Days', count: recencyAnalysis.days61to90, color: '#FFC107' },
      { label: '91-180 Days', count: recencyAnalysis.days91to180, color: '#FF9800' },
      { label: '181-365 Days', count: recencyAnalysis.days181to365, color: '#FF5722' },
      { label: 'Over 1 Year', count: recencyAnalysis.overOneYear, color: '#F44336' },
      { label: 'Never Visited', count: recencyAnalysis.neverVisited, color: '#9E9E9E' }
    ]

    // ========================================
    // DIVISION BREAKDOWN
    // ========================================
    const divisionMap = new Map<string, { count: number; revenue: number; active: number }>()
    
    for (const contact of allContacts) {
      const div = contact.division || 'Unknown'
      const existing = divisionMap.get(div) || { count: 0, revenue: 0, active: 0 }
      existing.count++
      existing.revenue += parseFloat(contact.revenue_ytd) || 0
      // Active = has activity within 3 years
      if (contact.last_visit && new Date(contact.last_visit) >= threeYearsAgo) {
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

    // Get list of divisions for filter dropdown
    const divisions = Array.from(divisionMap.keys()).filter(d => d !== 'Unknown').sort()

    return {
      success: true,
      kpis,
      revenueDistribution,
      geographicData,
      marketingEfficacy,
      recencyAnalysis,
      recencyChart,
      divisionBreakdown,
      divisions,
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
