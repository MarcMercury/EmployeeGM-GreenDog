/**
 * Compliance Alerts API Endpoint
 * 
 * Returns active compliance alerts (expiring licenses, certifications, etc.)
 * Requires authentication.
 * GET /api/compliance/alerts
 */

import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // Require authentication
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const client = await serverSupabaseClient(event)
  
  // Get query parameters
  const query = getQuery(event)
  const severity = query.severity as string | undefined
  const limit = parseInt(query.limit as string) || 50
  const offset = parseInt(query.offset as string) || 0
  
  // First, generate any new alerts
  try {
    await client.rpc('generate_compliance_alerts')
  } catch (e) {
    // Function may not exist yet, continue anyway
    logger.warn('generate_compliance_alerts not available', 'Compliance', { error: e })
  }
  
  // Fetch active alerts
  let alertsQuery = client
    .from('compliance_alerts')
    .select('*', { count: 'exact' })
    .is('resolved_at', null)
    .order('due_date', { ascending: true })
    .range(offset, offset + limit - 1)
  
  if (severity) {
    alertsQuery = alertsQuery.eq('severity', severity)
  }
  
  const { data: alerts, count: totalAlerts, error } = await alertsQuery
  
  if (error) {
    throw createError({
      statusCode: 500,
      message: error.message
    })
  }
  
  // Group alerts by severity for dashboard display
  const grouped = {
    critical: alerts?.filter(a => a.severity === 'critical') || [],
    warning: alerts?.filter(a => a.severity === 'warning') || [],
    info: alerts?.filter(a => a.severity === 'info') || []
  }
  
  return {
    total: totalAlerts || 0,
    alerts,
    grouped,
    summary: {
      critical: grouped.critical.length,
      warning: grouped.warning.length,
      info: grouped.info.length
    },
    pagination: {
      offset,
      limit,
      total: totalAlerts || 0
    }
  }
})
