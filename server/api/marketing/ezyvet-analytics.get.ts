/**
 * EzyVet Analytics API
 * 
 * Provides aggregated analytics data for the EzyVet CRM dashboard.
 * Returns KPIs, charts data, distribution metrics, data quality,
 * generated insights, and suggested actions.
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
    function buildFilteredQuery(selectExpr: string = '*') {
      let q = supabase.from('ezyvet_crm_contacts').select(selectExpr)
      if (division) q = q.eq('division', division)
      if (startDate) q = q.gte('last_visit', startDate)
      if (endDate) q = q.lte('last_visit', endDate)
      return q
    }

    // Fetch filtered contacts with pagination
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
      avgRevenue: qualifyingForArpu.length > 0 ? qualifyingRevenue / qualifyingForArpu.length : 0,
      retentionRate: filteredContacts.length > 0 ? Math.round((activeContacts.length / filteredContacts.length) * 100) : 0
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
    // RECENCY ANALYSIS
    // ========================================
    const recencyAnalysis = {
      zeroToThreeMonths: zeroToThreeCount || 0,
      threeToSixMonths: threeToSixCount || 0,
      sixToTwelveMonths: sixToTwelveCount || 0,
      oneToTwoYears: oneToTwoCount || 0,
      overTwoYears: overTwoCount || 0,
      neverVisited: neverVisitedCount || 0
    }

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

    // ========================================
    // GEOGRAPHIC ANALYSIS — Zip Code → Neighborhood clustering
    // ========================================
    const ZIP_TO_NEIGHBORHOOD: Record<string, string> = {
      // Westside & Coastal
      '90291': 'Venice', '90292': 'Marina del Rey', '90293': 'Playa del Rey',
      '90094': 'Playa Vista', '90066': 'Mar Vista', '90230': 'Culver City',
      '90232': 'Culver City', '90245': 'El Segundo', '90254': 'Hermosa Beach',
      '90266': 'Manhattan Beach', '90277': 'Redondo Beach', '90278': 'Redondo Beach',
      '90301': 'Inglewood', '90302': 'Inglewood', '90303': 'Inglewood',
      '90401': 'Santa Monica', '90402': 'Santa Monica', '90403': 'Santa Monica',
      '90404': 'Santa Monica', '90405': 'Santa Monica',
      '90025': 'West LA', '90064': 'West LA / Rancho Park',
      '90049': 'Brentwood', '90073': 'West LA (VA)',
      '90272': 'Pacific Palisades', '90265': 'Malibu',
      // Beverly Hills / Miracle Mile
      '90210': 'Beverly Hills', '90211': 'Beverly Hills', '90212': 'Beverly Hills',
      '90048': 'Beverly Grove / Fairfax', '90035': 'Beverlywood',
      '90036': 'Miracle Mile / Park La Brea',
      // Hollywood / West Hollywood
      '90028': 'Hollywood', '90038': 'Hollywood', '90068': 'Hollywood Hills',
      '90046': 'West Hollywood / Laurel Canyon', '90069': 'West Hollywood',
      '90027': 'Los Feliz', '90039': 'Silver Lake', '90026': 'Echo Park',
      // Mid-City / Mid-Wilshire
      '90004': 'Mid-Wilshire', '90005': 'Koreatown', '90006': 'Koreatown',
      '90010': 'Mid-Wilshire', '90019': 'Mid-City', '90020': 'Koreatown',
      // Downtown LA
      '90012': 'Downtown LA', '90013': 'Downtown LA', '90014': 'Downtown LA',
      '90015': 'Downtown LA', '90017': 'Downtown LA', '90071': 'Downtown LA',
      // South LA
      '90001': 'South LA', '90002': 'South LA', '90003': 'South LA',
      '90007': 'South LA / USC', '90008': 'Baldwin Hills / Crenshaw',
      '90011': 'South LA', '90016': 'West Adams / Jefferson Park',
      '90018': 'West Adams', '90043': 'Ladera Heights / View Park',
      '90044': 'Westmont', '90047': 'South LA',
      // San Fernando Valley — South
      '91423': 'Sherman Oaks', '91403': 'Sherman Oaks',
      '91604': 'Studio City', '91602': 'Studio City / Valley Village',
      '91607': 'Valley Village', '91601': 'North Hollywood',
      '91606': 'North Hollywood', '91605': 'North Hollywood',
      '91411': 'Van Nuys', '91401': 'Van Nuys', '91405': 'Van Nuys',
      '91406': 'Van Nuys', '91316': 'Encino', '91436': 'Encino',
      '91356': 'Tarzana', '91335': 'Reseda', '91344': 'Granada Hills',
      // San Fernando Valley — North
      '91331': 'Pacoima', '91340': 'San Fernando',
      '91342': 'Sylmar', '91345': 'Mission Hills',
      '91352': 'Sun Valley', '91504': 'Burbank', '91505': 'Burbank',
      '91506': 'Burbank', '91501': 'Burbank', '91502': 'Burbank',
      '91203': 'Glendale', '91204': 'Glendale', '91205': 'Glendale',
      '91206': 'Glendale', '91208': 'Glendale',
      // West Valley / Conejo
      '91302': 'Calabasas', '91301': 'Agoura Hills',
      '91361': 'Westlake Village', '91362': 'Thousand Oaks',
      '91320': 'Newbury Park', '93065': 'Simi Valley',
      '91355': 'Valencia', '91354': 'Valencia', '91381': 'Stevenson Ranch',
      '91390': 'Santa Clarita',
      // Pasadena / San Gabriel Valley
      '91101': 'Pasadena', '91103': 'Pasadena', '91104': 'Pasadena',
      '91105': 'Pasadena', '91106': 'Pasadena', '91107': 'Pasadena',
      '91001': 'Altadena', '91011': 'La Cañada Flintridge',
      // South Bay
      '90501': 'Torrance', '90502': 'Torrance', '90503': 'Torrance',
      '90504': 'Torrance', '90505': 'Torrance',
      '90717': 'Lomita', '90710': 'Harbor City', '90731': 'San Pedro',
    }

    // Helper: map a zip code to a neighborhood label
    function zipToNeighborhood(zip: string | null | undefined): string {
      if (!zip) return 'Unknown'
      const trimmed = zip.trim().slice(0, 5)
      return ZIP_TO_NEIGHBORHOOD[trimmed] || `Other (${trimmed})`
    }

    const neighborhoodMap = new Map<string, { count: number; revenue: number; active: number; zips: Set<string> }>()

    for (const contact of filteredContacts) {
      const zip = contact.address_zip?.trim() || null
      if (!zip) continue
      const neighborhood = zipToNeighborhood(zip)
      const existing = neighborhoodMap.get(neighborhood) || { count: 0, revenue: 0, active: 0, zips: new Set<string>() }
      existing.count++
      existing.revenue += parseFloat(contact.revenue_ytd) || 0
      existing.zips.add(zip.slice(0, 5))
      if (contact.last_visit && new Date(contact.last_visit) >= oneYearAgo) {
        existing.active++
      }
      neighborhoodMap.set(neighborhood, existing)
    }

    const geographicBreakdown = Array.from(neighborhoodMap.entries())
      .map(([neighborhood, data]) => ({
        neighborhood,
        zipCodes: Array.from(data.zips).sort(),
        totalClients: data.count,
        activeClients: data.active,
        totalRevenue: data.revenue,
        avgRevenue: data.count > 0 ? data.revenue / data.count : 0,
        retentionRate: data.count > 0 ? Math.round((data.active / data.count) * 100) : 0
      }))
      .sort((a, b) => b.totalClients - a.totalClients)
      .slice(0, 25)

    // ========================================
    // CLIENT SEGMENTATION
    // ========================================
    const segments = {
      vip: { label: 'VIP ($5K+)', count: 0, revenue: 0, active: 0 },
      premium: { label: 'Premium ($2K-$5K)', count: 0, revenue: 0, active: 0 },
      regular: { label: 'Regular ($500-$2K)', count: 0, revenue: 0, active: 0 },
      lowValue: { label: 'Low Value ($25-$500)', count: 0, revenue: 0, active: 0 },
      minimal: { label: 'Minimal (<$25)', count: 0, revenue: 0, active: 0 }
    }

    for (const contact of filteredContacts) {
      const rev = parseFloat(contact.revenue_ytd) || 0
      const isActive = contact.last_visit && new Date(contact.last_visit) >= oneYearAgo

      let seg: keyof typeof segments
      if (rev >= 5000) seg = 'vip'
      else if (rev >= 2000) seg = 'premium'
      else if (rev >= 500) seg = 'regular'
      else if (rev >= 25) seg = 'lowValue'
      else seg = 'minimal'

      segments[seg].count++
      segments[seg].revenue += rev
      if (isActive) segments[seg].active++
    }

    const clientSegments = Object.values(segments).map(seg => ({
      ...seg,
      avgRevenue: seg.count > 0 ? seg.revenue / seg.count : 0,
      retentionRate: seg.count > 0 ? Math.round((seg.active / seg.count) * 100) : 0
    }))

    // ========================================
    // CHURN RISK: High-value clients not seen in 6+ months
    // ========================================
    const churnRisk = filteredContacts
      .filter(c => {
        const rev = parseFloat(c.revenue_ytd) || 0
        if (rev < 100) return false
        if (!c.last_visit) return true
        const daysSince = Math.floor((now.getTime() - new Date(c.last_visit).getTime()) / (1000 * 60 * 60 * 24))
        return daysSince >= 180
      })
      .map(c => {
        const daysSince = c.last_visit
          ? Math.floor((now.getTime() - new Date(c.last_visit).getTime()) / (1000 * 60 * 60 * 24))
          : null
        return {
          name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
          email: c.email,
          phone: c.phone_mobile,
          revenue: parseFloat(c.revenue_ytd) || 0,
          lastVisit: c.last_visit,
          daysSinceVisit: daysSince,
          division: c.division,
          city: c.address_city,
          riskLevel: !c.last_visit ? 'critical' : (daysSince! >= 365 ? 'high' : 'medium') as 'critical' | 'high' | 'medium'
        }
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 50)

    // ========================================
    // TOP CLIENTS (by revenue)
    // ========================================
    const topClients = filteredContacts
      .filter(c => (parseFloat(c.revenue_ytd) || 0) > 0)
      .sort((a, b) => (parseFloat(b.revenue_ytd) || 0) - (parseFloat(a.revenue_ytd) || 0))
      .slice(0, 25)
      .map(c => ({
        name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
        email: c.email,
        revenue: parseFloat(c.revenue_ytd) || 0,
        lastVisit: c.last_visit,
        division: c.division,
        city: c.address_city,
        zip: c.address_zip,
        isActive: c.is_active
      }))

    // ========================================
    // DATA QUALITY METRICS
    // ========================================
    const totalCount = filteredContacts.length
    const dataQuality = {
      totalRecords: totalCount,
      missingEmail: filteredContacts.filter(c => !c.email).length,
      missingPhone: filteredContacts.filter(c => !c.phone_mobile).length,
      missingCity: filteredContacts.filter(c => !c.address_city).length,
      missingLastVisit: filteredContacts.filter(c => !c.last_visit).length,
      missingZip: filteredContacts.filter(c => !c.address_zip).length,
      missingDivision: filteredContacts.filter(c => !c.division).length,
      zeroRevenue: filteredContacts.filter(c => (parseFloat(c.revenue_ytd) || 0) === 0).length,
      overallScore: 0
    }

    // Compute quality score (0-100)
    if (totalCount > 0) {
      const weights = [
        { field: 'missingEmail', weight: 25 },
        { field: 'missingLastVisit', weight: 25 },
        { field: 'missingCity', weight: 15 },
        { field: 'missingPhone', weight: 15 },
        { field: 'missingZip', weight: 10 },
        { field: 'missingDivision', weight: 10 }
      ]
      let completenessScore = 0
      for (const w of weights) {
        const present = totalCount - (dataQuality as any)[w.field]
        completenessScore += (present / totalCount) * w.weight
      }
      dataQuality.overallScore = Math.round(completenessScore)
    }

    // ========================================
    // GENERATE INSIGHTS & SUGGESTED ACTIONS
    // ========================================
    const insights: Array<{ type: 'success' | 'warning' | 'info' | 'error'; icon: string; title: string; detail: string }> = []
    const suggestedActions: Array<{ priority: 'high' | 'medium' | 'low'; icon: string; title: string; detail: string; metric?: string }> = []

    // --- Retention insights ---
    if (kpis.retentionRate < 40) {
      insights.push({
        type: 'error',
        icon: 'mdi-alert-circle',
        title: 'Low Client Retention',
        detail: `Only ${kpis.retentionRate}% of clients visited in the last 12 months. Industry benchmark is 60-70%.`
      })
      suggestedActions.push({
        priority: 'high',
        icon: 'mdi-email-fast',
        title: 'Launch Re-engagement Campaign',
        detail: `${kpis.inactiveContacts.toLocaleString()} clients haven't visited in over a year. Consider an email/SMS campaign with a wellness check offer or seasonal promotion.`,
        metric: `${kpis.inactiveContacts.toLocaleString()} inactive clients`
      })
    } else if (kpis.retentionRate < 60) {
      insights.push({
        type: 'warning',
        icon: 'mdi-account-clock',
        title: 'Moderate Client Retention',
        detail: `${kpis.retentionRate}% retention rate. There's room to improve — typically top practices achieve 65-75%.`
      })
    } else {
      insights.push({
        type: 'success',
        icon: 'mdi-account-check',
        title: 'Strong Client Retention',
        detail: `${kpis.retentionRate}% of clients are active — this is above industry average.`
      })
    }

    // --- Revenue concentration insights ---
    const vipSeg = clientSegments.find(s => s.label.includes('VIP'))
    const premSeg = clientSegments.find(s => s.label.includes('Premium'))
    if (vipSeg && premSeg && totalRevenue > 0) {
      const topRevPct = Math.round(((vipSeg.revenue + premSeg.revenue) / totalRevenue) * 100)
      const topClientPct = totalCount > 0 ? Math.round(((vipSeg.count + premSeg.count) / totalCount) * 100) : 0
      if (topRevPct > 60) {
        insights.push({
          type: 'warning',
          icon: 'mdi-chart-bell-curve',
          title: 'Revenue Concentration Risk',
          detail: `${topClientPct}% of clients (VIP + Premium) generate ${topRevPct}% of total revenue. High dependency on a small group.`
        })
        const regularSeg = clientSegments.find(s => s.label.includes('Regular'))
        suggestedActions.push({
          priority: 'medium',
          icon: 'mdi-arrow-up-bold',
          title: 'Grow Mid-Tier Client Revenue',
          detail: `Focus on upselling Regular-tier clients to Premium. Promote dental cleanings, wellness plans, or diagnostic packages to the ${regularSeg?.count.toLocaleString() || 0} clients in the $500-$2K band.`,
          metric: `${topRevPct}% revenue from top ${topClientPct}%`
        })
      }
    }

    // --- Churn risk insights ---
    const highRiskChurn = churnRisk.filter(c => c.riskLevel === 'high' || c.riskLevel === 'critical')
    const churnRevAtRisk = churnRisk.reduce((sum, c) => sum + c.revenue, 0)
    if (highRiskChurn.length > 0) {
      insights.push({
        type: 'error',
        icon: 'mdi-account-alert',
        title: `${highRiskChurn.length} High-Value Clients at Churn Risk`,
        detail: `${formatUSD(churnRevAtRisk)} in annual revenue is at risk from ${churnRisk.length} clients who haven't visited in 6+ months.`
      })
      suggestedActions.push({
        priority: 'high',
        icon: 'mdi-phone-outgoing',
        title: 'Personal Outreach to At-Risk VIPs',
        detail: `The top ${Math.min(10, highRiskChurn.length)} at-risk clients represent significant revenue. Have client relations reach out with a personalized follow-up call and schedule a wellness visit.`,
        metric: formatUSD(churnRevAtRisk) + ' at risk'
      })
    }

    // --- Geographic insights ---
    if (geographicBreakdown.length >= 3) {
      const topThreeAreas = geographicBreakdown.slice(0, 3)
      const topThreeCount = topThreeAreas.reduce((sum, c) => sum + c.totalClients, 0)
      const topThreePct = totalCount > 0 ? Math.round((topThreeCount / totalCount) * 100) : 0
      insights.push({
        type: 'info',
        icon: 'mdi-map-marker-radius',
        title: 'Geographic Concentration',
        detail: `Top 3 neighborhoods (${topThreeAreas.map(c => c.neighborhood).join(', ')}) account for ${topThreePct}% of all clients.`
      })
      
      const lowRetentionAreas = geographicBreakdown.filter(c => c.totalClients >= 10 && c.retentionRate < 40)
      if (lowRetentionAreas.length > 0) {
        suggestedActions.push({
          priority: 'medium',
          icon: 'mdi-map-marker-alert',
          title: 'Address Low-Retention Neighborhoods',
          detail: `${lowRetentionAreas.map(c => c.neighborhood).slice(0, 3).join(', ')} have under 40% retention. Consider targeted marketing or mobile clinic events in these areas.`,
          metric: lowRetentionAreas.map(c => `${c.neighborhood}: ${c.retentionRate}%`).slice(0, 3).join(', ')
        })
      }
    }

    // --- Data quality insights ---
    if (dataQuality.overallScore < 50) {
      insights.push({
        type: 'error',
        icon: 'mdi-database-alert',
        title: 'Poor Data Quality',
        detail: `Data completeness score is ${dataQuality.overallScore}%. Missing data limits the accuracy of all analytics.`
      })
      suggestedActions.push({
        priority: 'high',
        icon: 'mdi-database-edit',
        title: 'Prioritize Data Cleanup in EzyVet',
        detail: `Focus on filling in email addresses (${totalCount > 0 ? Math.round((dataQuality.missingEmail / totalCount) * 100) : 0}% missing) and last visit dates (${totalCount > 0 ? Math.round((dataQuality.missingLastVisit / totalCount) * 100) : 0}% missing) in EzyVet. Then re-export and re-upload.`,
        metric: `${dataQuality.overallScore}% completeness`
      })
    } else if (dataQuality.overallScore < 75) {
      insights.push({
        type: 'warning',
        icon: 'mdi-database-check',
        title: 'Moderate Data Quality',
        detail: `Data completeness is ${dataQuality.overallScore}%. Key gaps: ${dataQuality.missingEmail} missing emails, ${dataQuality.missingLastVisit} missing visit dates.`
      })
    }

    // --- Zero revenue insight ---
    const zeroRevCount = dataQuality.zeroRevenue
    if (zeroRevCount > totalCount * 0.3 && totalCount > 0) {
      insights.push({
        type: 'warning',
        icon: 'mdi-currency-usd-off',
        title: `${Math.round((zeroRevCount / totalCount) * 100)}% of Clients Show $0 Revenue`,
        detail: `${zeroRevCount.toLocaleString()} clients have zero YTD revenue. These may be stale records or clients who haven't been billed yet this year.`
      })
      suggestedActions.push({
        priority: 'low',
        icon: 'mdi-broom',
        title: 'Clean Up Zero-Revenue Records',
        detail: `Review the ${zeroRevCount.toLocaleString()} zero-revenue contacts in EzyVet. Archive truly inactive ones to keep your CRM focused and analytics accurate.`,
        metric: `${zeroRevCount.toLocaleString()} $0 records`
      })
    }

    // Sort actions by priority
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
    suggestedActions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    // Divisions list
    const divisions = Array.from(divisionMap.keys()).filter(d => d !== 'Unknown').sort()

    // ========================================
    // LAST SYNC INFO
    // ========================================
    const { data: lastSync } = await supabase
      .from('ezyvet_sync_history')
      .select('completed_at, total_rows, inserted_count, updated_count')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()

    return {
      success: true,
      kpis,
      revenueDistribution,
      recencyAnalysis,
      recencyChart,
      divisionBreakdown,
      departmentBreakdown,
      geographicBreakdown,
      clientSegments,
      churnRisk,
      topClients,
      dataQuality,
      insights,
      suggestedActions,
      divisions,
      totalContactsInDb: totalInDb || 0,
      lastSync: lastSync || null,
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

// Helper
function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}