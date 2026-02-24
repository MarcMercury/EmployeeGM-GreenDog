/**
 * Clear Referral Stats API
 * Resets total_referrals_all_time and total_revenue_all_time to 0 for all referral_partners
 * This is useful when re-importing referral data from scratch
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
    
    // Get supabase client
    const supabase = await serverSupabaseClient(event)
    
    logger.debug('Looking up profile', 'clear-referral-stats', { authUserId: userId })
    
    // Check if user has appropriate role (super_admin only for this destructive operation)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, email, auth_user_id')
      .eq('auth_user_id', userId)
      .single()
    
    const allowedRoles = ['super_admin', 'admin']
    if (profileError) {
      throw createError({ statusCode: 403, message: `Profile lookup failed: ${profileError.message}` })
    }
    
    if (!profile || !allowedRoles.includes(profile.role)) {
      throw createError({ statusCode: 403, message: `Super Admin or Admin access required for this operation. Your role: ${profile?.role || 'unknown'}` })
    }
    
    logger.info('Access granted', 'clear-referral-stats', { role: profile.role })
    
    // Get current counts for logging
    const { data: partners, error: countError } = await supabase
      .from('referral_partners')
      .select('id, name, total_referrals_all_time, total_revenue_all_time')
    
    if (countError) {
      throw createError({ statusCode: 500, message: `Failed to fetch partners: ${countError.message}` })
    }
    
    const partnersWithData = partners?.filter(p => 
      (p.total_referrals_all_time && p.total_referrals_all_time > 0) || 
      (p.total_revenue_all_time && p.total_revenue_all_time > 0)
    ) || []
    
    const totalReferralsBefore = partners?.reduce((sum, p) => sum + (p.total_referrals_all_time || 0), 0) || 0
    const totalRevenueBefore = partners?.reduce((sum, p) => sum + (Number(p.total_revenue_all_time) || 0), 0) || 0
    
    logger.info('Before clear', 'clear-referral-stats', { partnersWithData: partnersWithData.length, referrals: totalReferralsBefore, revenue: totalRevenueBefore.toFixed(2) })
    
    // Clear all referral stats
    const { error: updateError, count } = await supabase
      .from('referral_partners')
      .update({
        total_referrals_all_time: 0,
        total_revenue_all_time: 0,
        last_sync_date: null,
        last_data_source: null
      })
      .neq('id', '00000000-0000-0000-0000-000000000000') // Update all rows (dummy condition)
    
    if (updateError) {
      throw createError({ statusCode: 500, message: `Failed to clear stats: ${updateError.message}` })
    }
    
    logger.info('Cleared stats for all partners', 'clear-referral-stats')
    
    // Also clear the sync history so we can re-upload
    const { error: historyError } = await supabase
      .from('referral_sync_history')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all rows
    
    if (historyError) {
      logger.warn('Could not clear sync history', 'clear-referral-stats', { message: historyError.message })
    } else {
      logger.info('Cleared sync history', 'clear-referral-stats')
    }
    
    return {
      success: true,
      message: 'All referral stats have been cleared',
      cleared: {
        partnersAffected: partnersWithData.length,
        referralsCleared: totalReferralsBefore,
        revenueCleared: Math.round(totalRevenueBefore * 100) / 100
      }
    }
    
  } catch (error: any) {
    logger.error('Error', error, 'clear-referral-stats')
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to clear referral stats'
    })
  }
})
