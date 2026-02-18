/**
 * Cron: Daily API Endpoint Health Check
 * Runs every day at 2 AM UTC
 * 
 * Checks:
 * - Error trends
 * - Missing endpoints
 * - System health
 * - Performance metrics
 */

export default defineEventHandler(async (event) => {
  const isLocalRequest = event.node.req.headers['x-forwarded-for'] === undefined
  const isCronSecret = event.node.req.headers['x-cron-secret'] === process.env.CRON_SECRET

  // Verify request is from Vercel Cron or localhost
  if (!isLocalRequest && !isCronSecret) {
    throw createError({ statusCode: 403, message: 'Unauthorized' })
  }

  try {
    const supabase = await useSupabaseServer()

    // 1. Refresh error trends from last 24 hours
    console.log('[Health Check] Refreshing error trends...')
    const { error: trendsError } = await supabase.rpc(
      'refresh_api_error_trends'
    )
    if (trendsError) console.error('Trends error:', trendsError)

    // 2. Get summary of errors
    const { data: recentErrors, error: errorsError } = await supabase
      .from('api_error_logs')
      .select('status_code, count(*)', { count: 'exact' })
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .group_by('status_code')

    if (errorsError) console.error('Errors fetch error:', errorsError)

    // 3. Check for new missing endpoints
    const { data: newMissing, error: missingError } = await supabase
      .from('missing_endpoints')
      .select('*')
      .eq('reported', false)
      .order('error_count', { ascending: false })

    if (missingError) console.error('Missing endpoints error:', missingError)

    // 4. If there are unreported missing endpoints, alert
    if (newMissing && newMissing.length > 0) {
      await alertMissingEndpoints(newMissing)

      // Mark as reported
      const unreportedIds = newMissing.map(m => m.id)
      await supabase
        .from('missing_endpoints')
        .update({ reported: true, reported_at: new Date().toISOString() })
        .in('id', unreportedIds)
    }

    // 5. Get 404 error count
    const error404Count = recentErrors?.find(r => r.status_code === 404)?.count || 0

    // 6. Prepare summary
    const summary = {
      timestamp: new Date().toISOString(),
      errors_24h: recentErrors || [],
      missing_endpoints_count: newMissing?.length || 0,
      endpoint_404_errors: error404Count,
      system_status: error404Count > 10 ? 'warning' : 'healthy',
    }

    console.log('[Health Check] Summary:', summary)

    // 7. Send to Slack if there are issues
    if (newMissing && newMissing.length > 0) {
      await sendHealthCheckToSlack(summary)
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      checks: {
        trends_refreshed: !trendsError,
        errors_collected: !errorsError,
        missing_endpoints_checked: !missingError,
      },
      summary,
    }
  } catch (error) {
    console.error('[Health Check] Failed:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Health check failed',
    })
  }
})

async function alertMissingEndpoints(endpoints: any[]) {
  console.log(`[Health Check] Alerting about ${endpoints.length} missing endpoints`)

  const slackWebhook = process.env.SLACK_WEBHOOK_URL
  if (!slackWebhook) return

  try {
    const message = {
      text: `⚠️ Missing API Endpoints Detected`,
      attachments: [{
        color: '#ff6b6b',
        title: `Found ${endpoints.length} Missing Endpoint(s)`,
        fields: endpoints.slice(0, 5).map(ep => ({
          title: ep.endpoint,
          value: `${ep.error_count} errors (first seen: ${new Date(ep.first_seen).toLocaleDateString()})`,
          short: false,
        })),
        footer: 'API Health Check • Employee GM',
        ts: Math.floor(Date.now() / 1000),
      }],
    }

    if (endpoints.length > 5) {
      message.attachments[0].fields.push({
        title: 'More Endpoints',
        value: `... and ${endpoints.length - 5} more`,
        short: false,
      })
    }

    await fetch(slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    })
  } catch (err) {
    console.error('Failed to send Slack alert:', err)
  }
}

async function sendHealthCheckToSlack(summary: any) {
  const slackWebhook = process.env.SLACK_WEBHOOK_URL
  if (!slackWebhook) return

  try {
    await fetch(slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `📊 Daily API Health Check`,
        attachments: [{
          color: summary.system_status === 'healthy' ? '#36a64f' : '#ff9500',
          fields: [
            {
              title: '24h Error Count',
              value: summary.errors_24h.reduce((Sum: number, e: any) => Sum + e.count, 0),
              short: true,
            },
            {
              title: 'Missing Endpoints',
              value: summary.missing_endpoints_count,
              short: true,
            },
            {
              title: '404 Errors',
              value: summary.endpoint_404_errors,
              short: true,
            },
            {
              title: 'Status',
              value: summary.system_status === 'healthy' ? '✅ Healthy' : '⚠️ Warnings',
              short: true,
            },
          ],
          footer: 'Daily Health Check • Employee GM',
          ts: Math.floor(Date.now() / 1000),
        }],
      }),
    })
  } catch (err) {
    console.error('Failed to send health check to Slack:', err)
  }
}
