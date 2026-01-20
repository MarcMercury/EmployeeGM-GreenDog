/**
 * Compliance Alerts API Endpoint
 * 
 * Returns active compliance alerts (expiring licenses, certifications, etc.)
 * GET /api/compliance/alerts
 */

import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  
  // Get query parameters
  const query = getQuery(event)
  const severity = query.severity as string | undefined
  const limit = parseInt(query.limit as string) || 50
  
  // First, generate any new alerts
  try {
    await client.rpc('generate_compliance_alerts')
  } catch (e) {
    // Function may not exist yet, continue anyway
    console.warn('[Compliance] generate_compliance_alerts not available:', e)
  }
  
  // Fetch active alerts
  let alertsQuery = client
    .from('compliance_alerts')
    .select('*')
    .is('resolved_at', null)
    .order('due_date', { ascending: true })
    .limit(limit)
  
  if (severity) {
    alertsQuery = alertsQuery.eq('severity', severity)
  }
  
  const { data: alerts, error } = await alertsQuery
  
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
    total: alerts?.length || 0,
    alerts,
    grouped,
    summary: {
      critical: grouped.critical.length,
      warning: grouped.warning.length,
      info: grouped.info.length
    }
  }
})
