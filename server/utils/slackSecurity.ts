/**
 * Slack Token Security Utilities
 * ==============================
 * Server-side utilities for secure handling of Slack API tokens.
 * 
 * SECURITY BEST PRACTICES:
 * 1. Tokens are stored ONLY in environment variables, never in the database
 * 2. Tokens are accessed only server-side via runtimeConfig
 * 3. Tokens are never exposed to client-side code
 * 4. Rate limiting is applied to API calls
 * 5. All API calls are logged for audit purposes
 */

import { createClient } from '@supabase/supabase-js'

// Rate limiting state (in-memory, resets on server restart)
// ⚠️ SERVERLESS NOTE: This rate limiter is per-instance only and resets on cold starts.
// For Slack API calls this is acceptable — worst case is slightly exceeding the limit
// before Slack's own 429 response kicks in. For critical rate limiting (e.g. auth),
// use a persistent store (Vercel KV, Redis, or Supabase table).
const rateLimitState = {
  lastReset: Date.now(),
  callCount: 0,
  maxCallsPerMinute: 50 // Slack's Tier 3 rate limit
}

/**
 * Check if we're within rate limits for Slack API calls
 */
export function checkRateLimit(): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const minuteElapsed = now - rateLimitState.lastReset > 60000
  
  if (minuteElapsed) {
    rateLimitState.lastReset = now
    rateLimitState.callCount = 0
  }
  
  if (rateLimitState.callCount >= rateLimitState.maxCallsPerMinute) {
    const retryAfter = Math.ceil((60000 - (now - rateLimitState.lastReset)) / 1000)
    return { allowed: false, retryAfter }
  }
  
  rateLimitState.callCount++
  return { allowed: true }
}

/**
 * Get Slack bot token from environment (server-side only)
 */
export function getSlackBotToken(): string | null {
  const config = useRuntimeConfig()
  return config.slackBotToken || null
}

/**
 * Validate that a Slack token has the required format
 */
export function validateSlackToken(token: string): boolean {
  // Slack bot tokens start with 'xoxb-'
  // User tokens start with 'xoxp-'
  return /^xox[bp]-[0-9]+-[0-9]+-[A-Za-z0-9]+$/.test(token)
}

/**
 * Log a Slack API call for audit purposes
 */
export async function logSlackApiCall(
  action: string,
  success: boolean,
  details?: Record<string, any>
): Promise<void> {
  const config = useRuntimeConfig()
  const SUPABASE_URL = config.public.supabaseUrl
  const SUPABASE_SERVICE_ROLE_KEY = config.supabaseServiceRoleKey
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    await supabase.from('audit_logs').insert({
      action: `slack_api:${action}`,
      entity_type: 'slack_integration',
      metadata: {
        success,
        timestamp: new Date().toISOString(),
        ...details
      }
    })
  } catch (error) {
    logger.error('Failed to log Slack API call', error instanceof Error ? error : null, 'slackSecurity')
  }
}

/**
 * Make a rate-limited Slack API call with automatic retry
 */
export async function slackApiCall<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST'
    body?: any
    retries?: number
  } = {}
): Promise<{ ok: boolean; data?: T; error?: string }> {
  const token = getSlackBotToken()
  
  if (!token) {
    return { ok: false, error: 'Slack bot token not configured' }
  }
  
  const rateCheck = checkRateLimit()
  if (!rateCheck.allowed) {
    return { 
      ok: false, 
      error: `Rate limited. Retry after ${rateCheck.retryAfter} seconds` 
    }
  }
  
  const { method = 'POST', body, retries = 2 } = options
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`https://slack.com/api/${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
      })
      
      const data = await response.json() as any
      
      // Log the API call
      await logSlackApiCall(endpoint, data.ok, {
        attempt: attempt + 1,
        error: data.error
      })
      
      if (data.ok) {
        return { ok: true, data }
      }
      
      // Handle rate limiting from Slack
      if (data.error === 'ratelimited') {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '30')
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
          continue
        }
      }
      
      return { ok: false, error: data.error }
      
    } catch (error: any) {
      await logSlackApiCall(endpoint, false, {
        attempt: attempt + 1,
        error: error.message
      })
      
      if (attempt === retries) {
        return { ok: false, error: error.message }
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
    }
  }
  
  return { ok: false, error: 'Max retries exceeded' }
}

/**
 * Mask a token for safe logging (shows first and last 4 characters)
 */
export function maskToken(token: string): string {
  if (token.length <= 12) return '****'
  return `${token.slice(0, 8)}...${token.slice(-4)}`
}
