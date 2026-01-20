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
  
  const body = await readBody(event)
  const { alertId, notes } = body
  
  if (!alertId) {
    throw createError({
      statusCode: 400,
      message: 'alertId is required'
    })
  }
  
  // Get profile ID for resolved_by
  const { data: profile } = await client
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  
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
