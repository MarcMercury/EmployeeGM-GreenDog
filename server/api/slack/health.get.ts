/**
 * Slack Integration Health Check
 * ==============================
 * Returns the health status of the Slack integration
 * 
 * GET /api/slack/health
 */

import { serverSupabaseClient } from '#supabase/server'

// Inline security utilities since server utils aren't auto-imported
function getSlackBotToken(): string | null {
  return process.env.SLACK_BOT_TOKEN || null
}

function validateSlackToken(token: string): boolean {
  return /^xox[bp]-[0-9]+-[0-9]+-[A-Za-z0-9]+$/.test(token)
}

function maskToken(token: string): string {
  if (token.length <= 12) return '****'
  return `${token.slice(0, 8)}...${token.slice(-4)}`
}

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const health: Record<string, any> = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {}
  }

  // Check 1: Token configured
  const token = getSlackBotToken()
  health.checks.token_configured = {
    status: token ? 'pass' : 'fail',
    message: token ? `Token configured (${maskToken(token)})` : 'No token configured'
  }

  // Check 2: Token format valid
  if (token) {
    const isValid = validateSlackToken(token)
    health.checks.token_format = {
      status: isValid ? 'pass' : 'warn',
      message: isValid ? 'Token format valid' : 'Token format may be invalid'
    }
  }

  // Check 3: Slack API reachable
  try {
    const response = await fetch('https://slack.com/api/api.test', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    const data: any = await response.json()
    
    health.checks.api_reachable = {
      status: data.ok ? 'pass' : 'fail',
      message: data.ok ? 'Slack API reachable' : `API error: ${data.error}`
    }
  } catch (error: any) {
    health.checks.api_reachable = {
      status: 'fail',
      message: `Network error: ${error.message}`
    }
  }

  // Check 4: Auth test (validates token permissions)
  if (token) {
    try {
      const response = await fetch('https://slack.com/api/auth.test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      const data: any = await response.json()
      
      health.checks.auth = {
        status: data.ok ? 'pass' : 'fail',
        message: data.ok ? `Authenticated as ${data.bot_id || data.user}` : `Auth failed: ${data.error}`,
        details: data.ok ? {
          team: data.team,
          bot_id: data.bot_id,
          user: data.user
        } : undefined
      }
    } catch (error: any) {
      health.checks.auth = {
        status: 'fail',
        message: `Auth test failed: ${error.message}`
      }
    }
  }

  // Check 5: Last sync status
  try {
    const { data: lastSync } = await client
      .from('slack_sync_logs')
      .select('status, completed_at, errors_count')
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    if (lastSync) {
      const hoursSinceSync = lastSync.completed_at 
        ? (Date.now() - new Date(lastSync.completed_at).getTime()) / (1000 * 60 * 60)
        : null

      health.checks.last_sync = {
        status: lastSync.status === 'success' && (!hoursSinceSync || hoursSinceSync < 24) 
          ? 'pass' 
          : 'warn',
        message: `Last sync: ${lastSync.status} (${hoursSinceSync?.toFixed(1) || 'unknown'} hours ago)`,
        details: {
          status: lastSync.status,
          errors: lastSync.errors_count,
          completed_at: lastSync.completed_at
        }
      }
    } else {
      health.checks.last_sync = {
        status: 'warn',
        message: 'No sync has been run yet'
      }
    }
  } catch (error) {
    health.checks.last_sync = {
      status: 'warn',
      message: 'Could not fetch sync status'
    }
  }

  // Check 6: Pending notifications
  try {
    const { count } = await client
      .from('notification_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    health.checks.notification_queue = {
      status: (count || 0) > 100 ? 'warn' : 'pass',
      message: `${count || 0} pending notifications`,
      details: { pending_count: count }
    }
  } catch (error) {
    health.checks.notification_queue = {
      status: 'warn',
      message: 'Could not check notification queue'
    }
  }

  // Check 7: Pending conflicts
  try {
    const { count } = await client
      .from('slack_sync_conflicts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    health.checks.pending_conflicts = {
      status: (count || 0) > 10 ? 'warn' : 'pass',
      message: `${count || 0} pending conflicts`,
      details: { pending_count: count }
    }
  } catch (error) {
    health.checks.pending_conflicts = {
      status: 'warn',
      message: 'Could not check pending conflicts'
    }
  }

  // Calculate overall status
  const checkStatuses = Object.values(health.checks).map((c: any) => c.status)
  if (checkStatuses.includes('fail')) {
    health.status = 'unhealthy'
  } else if (checkStatuses.includes('warn')) {
    health.status = 'degraded'
  }

  return health
})
