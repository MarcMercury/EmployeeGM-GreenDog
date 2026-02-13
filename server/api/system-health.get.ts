/**
 * System Health Check API Endpoint
 * 
 * Returns system health status for monitoring.
 * GET /api/system-health
 */

import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'

interface HealthCheck {
  name: string
  status: 'ok' | 'degraded' | 'error'
  message?: string
  latency?: number
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'error'
  timestamp: string
  version: string
  uptime: number
  checks: HealthCheck[]
}

const startTime = Date.now()

// Helper functions defined BEFORE export to avoid circular reference
async function checkDatabase(event: H3Event): Promise<HealthCheck> {
  const start = Date.now()
  
  try {
    const client = await serverSupabaseClient(event)
    
    // Simple query to test connectivity
    const { data, error } = await client
      .from('profiles')
      .select('id')
      .limit(1)
    
    const latency = Date.now() - start
    
    if (error) {
      return {
        name: 'database',
        status: 'error',
        message: error.message,
        latency
      }
    }
    
    // Check for slow response (>500ms is concerning)
    if (latency > 500) {
      return {
        name: 'database',
        status: 'degraded',
        message: `High latency: ${latency}ms`,
        latency
      }
    }
    
    return {
      name: 'database',
      status: 'ok',
      latency
    }
  } catch (err: any) {
    return {
      name: 'database',
      status: 'error',
      message: err.message || 'Connection failed',
      latency: Date.now() - start
    }
  }
}

async function checkAuth(event: H3Event): Promise<HealthCheck> {
  const start = Date.now()
  
  try {
    const client = await serverSupabaseClient(event)
    
    // Check auth service is responding
    const { error } = await client.auth.getSession()
    
    const latency = Date.now() - start
    
    if (error) {
      return {
        name: 'auth',
        status: 'degraded',
        message: error.message,
        latency
      }
    }
    
    return {
      name: 'auth',
      status: 'ok',
      latency
    }
  } catch (err: any) {
    return {
      name: 'auth',
      status: 'error',
      message: err.message || 'Auth service unavailable',
      latency: Date.now() - start
    }
  }
}

function checkEnvironment(): HealthCheck {
  const config = useRuntimeConfig()

  const required = [
    'SUPABASE_URL',
    'SUPABASE_KEY'
  ]
  
  // Check optional services via runtime config (Nuxt resolves env vars at startup)
  // This is more reliable than raw process.env, especially on Vercel
  const optionalConfigChecks: { name: string; hasValue: boolean }[] = [
    { name: 'SLACK_BOT_TOKEN', hasValue: !!(process.env.SLACK_BOT_TOKEN || config.slackBotToken) },
    { name: 'OPENAI_API_KEY', hasValue: !!(process.env.OPENAI_API_KEY || config.openaiApiKey) },
  ]
  
  const missingRequired = required.filter(key => !process.env[key] && !process.env[`NUXT_PUBLIC_${key}`])
  const missingOptional = optionalConfigChecks.filter(c => !c.hasValue).map(c => c.name)
  
  if (missingRequired.length > 0) {
    return {
      name: 'environment',
      status: 'error',
      message: `Required environment variables missing: ${missingRequired.join(', ')}`
    }
  }
  
  if (missingOptional.length > 0) {
    return {
      name: 'environment',
      status: 'degraded',
      message: `Optional services not configured: ${missingOptional.join(', ')}`
    }
  }
  
  return {
    name: 'environment',
    status: 'ok'
  }
}

// Main handler
export default defineEventHandler(async (event): Promise<HealthResponse> => {
  // Require authentication — only admins/managers can view system health
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  const adminClient = await serverSupabaseServiceRole(event)
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || !['super_admin', 'admin', 'sup_admin', 'manager'].includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const checks: HealthCheck[] = []
  
  // 1. Database connectivity check
  const dbCheck = await checkDatabase(event)
  checks.push(dbCheck)
  
  // 2. Supabase Auth check
  const authCheck = await checkAuth(event)
  checks.push(authCheck)
  
  // 3. Environment variables check
  const envCheck = checkEnvironment()
  checks.push(envCheck)
  
  // Determine overall status
  const hasError = checks.some(c => c.status === 'error')
  const hasDegraded = checks.some(c => c.status === 'degraded')
  
  const status = hasError ? 'error' : hasDegraded ? 'degraded' : 'healthy'
  
  // Set appropriate HTTP status
  if (status === 'error') {
    setResponseStatus(event, 503)
  } else if (status === 'degraded') {
    setResponseStatus(event, 200) // Still operational
  }
  
  return {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks
  }
})
