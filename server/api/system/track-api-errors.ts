/**
 * POST/GET /api/system/track-api-errors
 * Collects and analyzes API errors in production
 * Helps identify missing endpoints and performance issues
 * 
 * Works gracefully even if migrations haven't been run yet
 */

export default defineEventHandler(async (event) => {
  if (event.node.req.method === 'POST') {
    try {
      const body = await readBody(event)
      const { errors, timestamp } = body
      
      if (!errors || !Array.isArray(errors)) {
        throw createError({ statusCode: 400, message: 'Invalid errors format' })
      }

      // Try to log to database, but fail gracefully if tables don't exist
      const supabase = await useSupabaseServer()
      const user = await getSession(event).catch(() => null)

      for (const error of errors) {
        const { endpoint, method = 'GET', status, statusText, duration, body: reqBody } = error

        try {
          // Try to insert into error logs
          const { error: logError } = await supabase
            .from('api_error_logs')
            .insert({
              endpoint,
              method,
              status_code: status,
              error_message: statusText,
              user_id: user?.user?.id || null,
              user_agent: event.node.req.headers['user-agent'],
              request_body: reqBody ? JSON.stringify(reqBody).substring(0, 500) : null,
              duration_ms: duration,
              environment: process.env.NODE_ENV || 'production',
              timestamp: new Date(timestamp).toISOString(),
            })

          // If 404, try to track missing endpoint
          if (status === 404 && !logError) {
            try {
              await supabase
                .from('missing_endpoints')
                .upsert({
                  endpoint,
                  first_seen: new Date().toISOString(),
                  last_seen: new Date().toISOString(),
                }, { onConflict: 'endpoint' })
                .eq('endpoint', endpoint)

              // Try to send Slack alert
              const { data: existing } = await supabase
                .from('missing_endpoints')
                .select('reported')
                .eq('endpoint', endpoint)
                .single()

              if (!existing?.reported) {
                sendMissingEndpointAlert(endpoint, method).catch(console.error)
              }
            } catch (e) {
              // Silent fail if missing_endpoints table doesn't exist yet
              console.debug('Missing endpoints tracking unavailable', e)
            }
          }
        } catch (e) {
          // Silent fail if api_error_logs table doesn't exist yet
          console.debug('Error logging unavailable', e)
        }
      }

      return {
        success: true,
        tracked: errors.length,
        timestamp: new Date().toISOString(),
      }
    } catch (err) {
      console.error('[track-api-errors POST] Fatal error:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }
    }
  }

  // GET: Return error summary for dashboard
  if (event.node.req.method === 'GET') {
    try {
      const supabase = await useSupabaseServer()
      const user = await requireAuth(event)

      // Only admins can view
      if (!['super_admin', 'admin'].includes(user.role)) {
        throw createError({ statusCode: 403, message: 'Admin access required' })
      }

      try {
        const { data } = await supabase
          .from('api_error_logs')
          .select('*')
          .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('timestamp', { ascending: false })
          .limit(100)

        const { data: missing } = await supabase
          .from('missing_endpoints')
          .select('*')
          .eq('reported', false)
          .order('error_count', { ascending: false })

        const { data: trends } = await supabase
          .from('api_error_trends')
          .select('*')
          .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('date', { ascending: false })

        return {
          success: true,
          summary: {
            lastErrors: data?.length || 0,
            missing404Endpoints: missing?.length || 0,
            last7DayTrends: trends?.length || 0,
          },
          recentErrors: data || [],
          missingEndpoints: missing || [],
          trends: trends || [],
        }
      } catch (tableErr) {
        // Tables don't exist yet (migrations not run)
        return {
          success: true,
          summary: {
            lastErrors: 0,
            missing404Endpoints: 0,
            last7DayTrends: 0,
          },
          recentErrors: [],
          missingEndpoints: [],
          trends: [],
          message: 'Database tables not yet created. Run migrations first.',
        }
      }
    } catch (err) {
      console.error('[track-api-errors GET] Error:', err)
      throw createError({
        statusCode: 500,
        message: err instanceof Error ? err.message : 'Failed to fetch error data',
      })
    }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})

// Helper to send Slack alert for missing endpoints
async function sendMissingEndpointAlert(endpoint: string, method: string) {
  try {
    const slackWebhook = process.env.SLACK_WEBHOOK_URL
    if (!slackWebhook) return

    await fetch(slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 Missing API Endpoint Detected`,
        attachments: [{
          color: '#ff6b6b',
          fields: [
            { title: 'Endpoint', value: endpoint, short: true },
            { title: 'Method', value: method, short: true },
            { title: 'Environment', value: process.env.NODE_ENV || 'production', short: true },
            { title: 'Time', value: new Date().toISOString(), short: true },
          ],
          footer: 'API Error Tracking • Employee GM',
          ts: Math.floor(Date.now() / 1000),
        }],
      }),
    })
  } catch (err) {
    console.error('Failed to send Slack alert:', err)
  }
}

