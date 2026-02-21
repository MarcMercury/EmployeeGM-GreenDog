/**
 * Recalculate Partner Metrics API
 * Recalculates Tier, Priority, Visit Tier, Relationship Health, and Overdue status
 * for all referral partners based on current data.
 * 
 * Uses row-by-row updates to avoid Supabase's "UPDATE requires WHERE" restriction.
 */
import { createError, defineEventHandler } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'

// NTILE-like bucket assignment (1-indexed)
function ntile<T extends { id: string }>(sorted: T[], n: number): Map<string, number> {
  const map = new Map<string, number>()
  const bucketSize = Math.ceil(sorted.length / n)
  sorted.forEach((item, i) => map.set(item.id, Math.floor(i / bucketSize) + 1))
  return map
}

export default defineEventHandler(async (event) => {
  try {
    const supabase = await serverSupabaseServiceRole(event)

    // Auth check
    const authHeader = event.headers.get('authorization')
    if (!authHeader) throw createError({ statusCode: 401, message: 'No authorization header' })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw createError({ statusCode: 401, message: 'Invalid or expired session' })

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, email')
      .eq('auth_user_id', user.id)
      .single()

    const allowedRoles = ['super_admin', 'admin', 'marketing_admin']
    if (profileError) throw createError({ statusCode: 403, message: `Profile lookup failed: ${profileError.message}` })
    if (!profile || !allowedRoles.includes(profile.role)) {
      throw createError({ statusCode: 403, message: `Access denied. Required: ${allowedRoles.join(', ')}. Your role: ${profile?.role || 'unknown'}` })
    }

    logger.info('Access granted', 'recalculate-metrics', { role: profile.role })

    // Fetch all partners
    const { data: partners, error: fetchErr } = await supabase
      .from('referral_partners')
      .select('id, total_revenue_all_time, total_referrals_all_time, last_visit_date, needs_followup')
      .order('name')

    if (fetchErr) throw createError({ statusCode: 500, message: `Failed to fetch partners: ${fetchErr.message}` })
    if (!partners?.length) return { success: true, message: 'No partners found', partnersUpdated: 0 }

    // Step 1: Tier by revenue (NTILE quintiles) — Platinum/Gold/Silver/Bronze/Coal
    const byRevenue = [...partners].sort((a, b) => (Number(b.total_revenue_all_time) || 0) - (Number(a.total_revenue_all_time) || 0))
    const tierBuckets = ntile(byRevenue, 5)
    const tierLabels = ['Platinum', 'Gold', 'Silver', 'Bronze', 'Coal'] as const

    // Step 2: Priority by referral count (NTILE quartiles) — Very High/High/Medium/Low
    const byReferrals = [...partners].sort((a, b) => (b.total_referrals_all_time || 0) - (a.total_referrals_all_time || 0))
    const priorityBuckets = ntile(byReferrals, 4)
    const priorityLabels = ['Very High', 'High', 'Medium', 'Low'] as const

    // Step 3: Visit Tier (NTILE thirds on combined score) — High/Medium/Low
    const byCombined = [...partners].sort((a, b) => {
      const sa = (Number(a.total_revenue_all_time) || 0) + (a.total_referrals_all_time || 0) * 100
      const sb2 = (Number(b.total_revenue_all_time) || 0) + (b.total_referrals_all_time || 0) * 100
      return sb2 - sa
    })
    const visitBuckets = ntile(byCombined, 3)
    const visitLabels = ['High', 'Medium', 'Low'] as const
    const freqDays: Record<string, number> = { High: 60, Medium: 120, Low: 180 }

    const tierPts: Record<string, number> = { Platinum: 40, Gold: 32, Silver: 24, Bronze: 16, Coal: 8 }
    const priPts: Record<string, number> = { 'Very High': 30, High: 22, Medium: 15, Low: 8 }

    let updated = 0
    let failed = 0

    for (const p of partners) {
      const tier = tierLabels[(tierBuckets.get(p.id) || 5) - 1]
      const priority = priorityLabels[(priorityBuckets.get(p.id) || 4) - 1]
      const visitTier = visitLabels[(visitBuckets.get(p.id) || 3) - 1]
      const expectedFreq = freqDays[visitTier]

      // Days since last visit
      let daysSince: number | null = null
      let visitOverdue = true
      if (p.last_visit_date) {
        daysSince = Math.floor((Date.now() - new Date(p.last_visit_date).getTime()) / 86400000)
        visitOverdue = daysSince > expectedFreq
      }

      // Relationship Health (0-100)
      let visitPts = 0
      if (p.last_visit_date && daysSince !== null) {
        if (daysSince <= expectedFreq * 0.5) visitPts = 30
        else if (daysSince <= expectedFreq) visitPts = 20
        else if (daysSince <= expectedFreq * 1.5) visitPts = 10
      }
      const health = (tierPts[tier] || 0) + (priPts[priority] || 0) + visitPts

      let status = 'At Risk'
      if (health >= 80) status = 'Excellent'
      else if (health >= 60) status = 'Good'
      else if (health >= 40) status = 'Fair'
      else if (health >= 20) status = 'Needs Attention'

      const needsFollowup = visitOverdue || health < 40

      const { error: upErr } = await supabase.from('referral_partners').update({
        tier, priority, visit_tier: visitTier,
        expected_visit_frequency_days: expectedFreq,
        days_since_last_visit: daysSince,
        visit_overdue: visitOverdue,
        relationship_health: health,
        relationship_status: status,
        needs_followup: needsFollowup,
        updated_at: new Date().toISOString()
      }).eq('id', p.id)

      if (upErr) { logger.warn('Update failed', 'recalculate-metrics', { id: p.id, error: upErr.message }); failed++ }
      else updated++
    }

    // Build summary
    const { data: summary } = await supabase
      .from('referral_partners')
      .select('tier, priority, visit_tier, relationship_status, visit_overdue')

    const tierCounts: Record<string, number> = {}
    const priorityCounts: Record<string, number> = {}
    const visitTierCounts: Record<string, number> = {}
    const healthCounts: Record<string, number> = {}
    let overdueCount = 0

    if (summary) {
      for (const partner of summary) {
        tierCounts[partner.tier] = (tierCounts[partner.tier] || 0) + 1
        priorityCounts[partner.priority] = (priorityCounts[partner.priority] || 0) + 1
        visitTierCounts[partner.visit_tier] = (visitTierCounts[partner.visit_tier] || 0) + 1
        healthCounts[partner.relationship_status] = (healthCounts[partner.relationship_status] || 0) + 1
        if (partner.visit_overdue) overdueCount++
      }
    }

    logger.info('Completed', 'recalculate-metrics', { updated, failed })

    return {
      success: true,
      message: `Partner metrics recalculated successfully (${updated} updated, ${failed} failed)`,
      partnersUpdated: updated,
      summary: {
        tier: tierCounts,
        priority: priorityCounts,
        visitTier: visitTierCounts,
        relationshipHealth: healthCounts,
        overdueVisits: overdueCount
      }
    }

  } catch (error: any) {
    logger.error('Error', error, 'recalculate-metrics')
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, message: error.message || 'Failed to recalculate partner metrics' })
  }
})
