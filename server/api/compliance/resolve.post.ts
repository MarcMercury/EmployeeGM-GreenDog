/**
 * Resolve Compliance Alert API Endpoint
 * 
 * Marks a compliance alert as resolved
 * POST /api/compliance/resolve
 */

import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)
  
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required'
    })
  }
  
  // Verify caller has compliance/admin role
  const { data: callerProfile } = await client
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()
  
  const complianceRoles = ['super_admin', 'admin', 'hr_admin', 'manager']
  if (!callerProfile || !complianceRoles.includes(callerProfile.role)) {
    throw createError({
      statusCode: 403,
      message: 'Insufficient permissions - compliance admin access required'
    })
  }
  
  const { alertId, notes } = await validateBody(event, complianceResolveSchema)
  
  // Get profile ID for resolved_by (already fetched above)
  const profile = callerProfile
  
  // Update the alert
  const { data, error } = await client
    .from('compliance_alerts')
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: profile?.id || null,
      notes: notes || null
    })
    .eq('id', alertId)
    .select()
    .single()
  
  if (error) {
    throw createError({
      statusCode: 500,
      message: error.message
    })
  }
  
  return {
    success: true,
    alert: data
  }
})
