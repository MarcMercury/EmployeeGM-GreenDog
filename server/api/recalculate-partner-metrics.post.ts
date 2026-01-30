/**
 * Recalculate Partner Metrics API
 * Recalculates Tier, Priority, Visit Tier, Relationship Health, and Overdue status
 * for all referral partners based on current data.
 * 
 * This should be called after importing referral data to update all metrics.
 */
import { createError, defineEventHandler } from 'h3'
import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  try {
    // Get authenticated user
    const supabaseAdmin = await serverSupabaseServiceRole(event)
    const authHeader = event.headers.get('authorization')
    
    if (!authHeader) {
      throw createError({ statusCode: 401, message: 'No authorization header' })
    }
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      throw createError({ statusCode: 401, message: 'Invalid or expired session' })
    }
    
    const userId = user.id
    
    // Check if user has appropriate role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, email')
      .eq('auth_user_id', userId)
      .single()
    
    const allowedRoles = ['super_admin', 'admin', 'marketing_manager']
    if (profileError) {
      throw createError({ statusCode: 403, message: `Profile lookup failed: ${profileError.message}` })
    }
    
    if (!profile || !allowedRoles.includes(profile.role)) {
      throw createError({ statusCode: 403, message: `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${profile?.role || 'unknown'}` })
    }
    
    console.log('[recalculate-metrics] Access granted for role:', profile.role)
    
    // Get supabase client
    const supabase = await serverSupabaseClient(event)
    
    // Call the recalculate function via RPC
    const { data, error } = await supabase.rpc('recalculate_partner_metrics')
    
    if (error) {
      console.error('[recalculate-metrics] Error calling function:', error)
      throw createError({ statusCode: 500, message: `Failed to recalculate metrics: ${error.message}` })
    }
    
    // Get summary of results
    const { data: summary, error: summaryError } = await supabase
      .from('referral_partners')
      .select('tier, priority, visit_tier, relationship_status, visit_overdue')
      .is('deleted_at', null)
    
    if (summaryError) {
      console.warn('[recalculate-metrics] Error fetching summary:', summaryError)
    }
    
    // Calculate counts
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
    
    console.log('[recalculate-metrics] Completed. Partners updated:', summary?.length || 0)
    
    return {
      success: true,
      message: 'Partner metrics recalculated successfully',
      partnersUpdated: summary?.length || 0,
      summary: {
        tier: tierCounts,
        priority: priorityCounts,
        visitTier: visitTierCounts,
        relationshipHealth: healthCounts,
        overdueVisits: overdueCount
      }
    }
    
  } catch (error: any) {
    console.error('[recalculate-metrics] Error:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to recalculate partner metrics'
    })
  }
})
