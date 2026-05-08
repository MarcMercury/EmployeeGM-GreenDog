/**
 * Comprehensive Integrations Status Check
 *
 * GET /api/system/integrations-status
 *
 * Inspects every external integration declared in nuxt.config.ts runtimeConfig
 * and reports:
 *   - configured: are credentials present?
 *   - connected:  does a lightweight ping succeed?
 *   - latencyMs:  round-trip time for the ping
 *   - message:    human-readable status / error
 *
 * Only super_admin / admin / sup_admin can call this endpoint. Each provider
 * uses a cheap, read-only request. Failing providers are isolated so one bad
 * key does not affect the others.
 */

import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { logger } from '../../utils/logger'

type Status = 'connected' | 'misconfigured' | 'error' | 'not_configured'

interface IntegrationCheck {
  id: string
  name: string
  category: 'core' | 'ai' | 'communications' | 'scheduling' | 'analytics' | 'finance' | 'marketing' | 'observability' | 'storage' | 'veterinary'
  status: Status
  configured: boolean
  connected: boolean
  latencyMs?: number
  message: string
  envVars: string[]      // env vars this integration depends on
  optional: boolean
}

const ALLOWED = ['super_admin', 'admin', 'sup_admin']

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Authentication required' })

  const admin = await serverSupabaseServiceRole(event)
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('auth_user_id', (user as any).id)
    .single()

  if (!profile || !ALLOWED.includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const config = useRuntimeConfig()
  const checks = await Promise.all([
    // Core
    checkSupabase(),
    // AI
    runCheck('openai', 'OpenAI', 'ai', ['OPENAI_API_KEY'], !!config.openaiApiKey, false, () => pingOpenAI(config.openaiApiKey, config.openaiBaseUrl)),
    runCheck('gemini', 'Google Gemini', 'ai', ['GEMINI_API_KEY'], !!config.geminiApiKey, true, () => pingGemini(config.geminiApiKey, config.geminiModel)),
    runCheck('assemblyai', 'AssemblyAI', 'ai', ['ASSEMBLYAI_API_KEY'], !!config.assemblyaiApiKey, true, () => pingAssemblyAI(config.assemblyaiApiKey)),
    runCheck('pinecone', 'Pinecone', 'ai', ['PINECONE_API_KEY'], !!config.pineconeApiKey, true, () => pingPinecone(config.pineconeApiKey)),
    // Communications
    runCheck('slack', 'Slack', 'communications', ['SLACK_BOT_TOKEN'], !!config.slackBotToken, false, () => pingSlack(config.slackBotToken)),
    runCheck('resend', 'Resend (email)', 'communications', ['RESEND_API_KEY'], !!config.resendApiKey, false, () => pingResend(config.resendApiKey)),
    runCheck('sendgrid', 'SendGrid', 'communications', ['SENDGRID_API_KEY'], !!config.sendgridApiKey, true, () => pingSendGrid(config.sendgridApiKey)),
    runCheck('onesignal', 'OneSignal (push)', 'communications', ['ONESIGNAL_APP_ID', 'ONESIGNAL_API_KEY'], !!config.onesignalAppId && !!config.onesignalApiKey, true, () => pingOneSignal(config.onesignalAppId, config.onesignalApiKey)),
    // Scheduling
    runCheck('calcom', 'Cal.com', 'scheduling', ['CALCOM_API_KEY'], !!config.calcomApiKey, true, () => pingCalcom(config.calcomApiKey, config.calcomBaseUrl)),
    runCheck('clockify', 'Clockify', 'scheduling', ['CLOCKIFY_API_KEY'], !!config.clockifyApiKey, true, () => pingClockify(config.clockifyApiKey)),
    runCheck('google-calendar', 'Google Workspace', 'scheduling', ['GOOGLE_SERVICE_ACCOUNT_JSON'], !!config.googleServiceAccountJson, true, () => pingGoogleSA(config.googleServiceAccountJson)),
    // Analytics / Observability
    runCheck('cronitor', 'Cronitor', 'observability', ['CRONITOR_API_KEY'], !!config.cronitorApiKey, true, () => pingCronitor(config.cronitorApiKey)),
    runCheck('sentry', 'Sentry', 'observability', ['SENTRY_DSN'], !!config.sentryDsn, true, () => Promise.resolve({ ok: true, message: 'DSN present (errors auto-reported)' })),
    runCheck('mixpanel', 'Mixpanel', 'analytics', ['MIXPANEL_TOKEN'], !!config.mixpanelToken, true, () => pingMixpanel(config.mixpanelToken)),
    runCheck('ga4', 'Google Analytics 4', 'analytics', ['GA4_MEASUREMENT_ID', 'GA4_API_SECRET'], !!config.ga4MeasurementId && !!config.ga4ApiSecret, true, () => Promise.resolve({ ok: true, message: 'Credentials present (write-only API)' })),
    runCheck('metabase', 'Metabase', 'analytics', ['METABASE_URL', 'METABASE_SECRET_KEY'], !!config.metabaseUrl && !!config.metabaseSecretKey, true, () => pingMetabase(config.metabaseUrl)),
    // Finance
    runCheck('plaid', 'Plaid', 'finance', ['PLAID_CLIENT_ID', 'PLAID_SECRET'], !!config.plaidClientId && !!config.plaidSecret, true, () => pingPlaid(config.plaidClientId, config.plaidSecret, config.plaidEnv)),
    runCheck('pandadoc', 'PandaDoc', 'finance', ['PANDADOC_API_KEY'], !!config.pandadocApiKey, true, () => pingPandaDoc(config.pandadocApiKey)),
    // Marketing
    runCheck('hubspot', 'HubSpot', 'marketing', ['HUBSPOT_ACCESS_TOKEN'], !!config.hubspotAccessToken, true, () => pingHubSpot(config.hubspotAccessToken)),
    runCheck('mailchimp', 'Mailchimp', 'marketing', ['MAILCHIMP_API_KEY'], !!config.mailchimpApiKey, true, () => pingMailchimp(config.mailchimpApiKey)),
    runCheck('eventbrite', 'Eventbrite', 'marketing', ['EVENTBRITE_TOKEN'], !!config.eventbriteToken, true, () => pingEventbrite(config.eventbriteToken)),
    runCheck('yelp', 'Yelp', 'marketing', ['YELP_API_KEY'], !!config.yelpApiKey, true, () => pingYelp(config.yelpApiKey)),
    runCheck('meta', 'Meta (Facebook/IG)', 'marketing', ['META_PAGE_ACCESS_TOKEN', 'META_PAGE_ID'], !!config.metaPageAccessToken && !!config.metaPageId, true, () => pingMeta(config.metaPageAccessToken, config.metaPageId)),
    runCheck('google-maps', 'Google Maps', 'marketing', ['GOOGLE_MAPS_API_KEY'], !!config.googleMapsApiKey, true, () => pingGoogleMaps(config.googleMapsApiKey)),
    // Veterinary
    runCheck('vetcove', 'VetCove', 'veterinary', ['VETCOVE_API_KEY'], !!config.vetcoveApiKey, true, () => Promise.resolve({ ok: true, message: 'API key present (no public ping endpoint)' })),
    runCheck('ezyvet', 'EzyVet', 'veterinary', ['EZYVET_WEBHOOK_SECRET'], !!config.ezyvetWebhookSecret, true, () => Promise.resolve({ ok: true, message: 'Webhook secret configured' })),
  ])

  // Sort: errors first, then misconfigured, then not_configured, then connected
  const order: Record<Status, number> = { error: 0, misconfigured: 1, not_configured: 2, connected: 3 }
  checks.sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name))

  const summary = {
    total: checks.length,
    connected: checks.filter(c => c.status === 'connected').length,
    misconfigured: checks.filter(c => c.status === 'misconfigured').length,
    error: checks.filter(c => c.status === 'error').length,
    not_configured: checks.filter(c => c.status === 'not_configured').length,
  }

  return {
    timestamp: new Date().toISOString(),
    summary,
    checks,
  }
})

// ─────────────────────────────────────────────────────────────────────────
// Check runner
// ─────────────────────────────────────────────────────────────────────────

async function runCheck(
  id: string,
  name: string,
  category: IntegrationCheck['category'],
  envVars: string[],
  configured: boolean,
  optional: boolean,
  ping: () => Promise<{ ok: boolean; message: string }>,
): Promise<IntegrationCheck> {
  if (!configured) {
    return {
      id, name, category, envVars, optional,
      status: 'not_configured',
      configured: false,
      connected: false,
      message: `Set ${envVars.join(', ')} to enable.`,
    }
  }

  const start = Date.now()
  try {
    const result = await withTimeout(ping(), 5000)
    const latencyMs = Date.now() - start
    return {
      id, name, category, envVars, optional,
      status: result.ok ? 'connected' : 'misconfigured',
      configured: true,
      connected: result.ok,
      latencyMs,
      message: result.message,
    }
  } catch (err: any) {
    const latencyMs = Date.now() - start
    logger.warn(`[integrations-status] ${id} ping failed: ${err?.message}`, 'system')
    return {
      id, name, category, envVars, optional,
      status: 'error',
      configured: true,
      connected: false,
      latencyMs,
      message: err?.message || 'Ping failed',
    }
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)),
  ])
}

// ─────────────────────────────────────────────────────────────────────────
// Provider pings — cheapest authenticated read for each.
// ─────────────────────────────────────────────────────────────────────────

async function checkSupabase(): Promise<IntegrationCheck> {
  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl
  const anonKey = config.public.supabaseKey
  const serviceKey = config.supabaseServiceRoleKey

  const envVars = ['SUPABASE_URL', 'SUPABASE_KEY', 'SUPABASE_SERVICE_ROLE_KEY']
  if (!url || !anonKey) {
    return {
      id: 'supabase', name: 'Supabase (Database & Auth)', category: 'core',
      envVars, optional: false,
      status: 'misconfigured', configured: false, connected: false,
      message: 'SUPABASE_URL / SUPABASE_KEY missing — application will not work.',
    }
  }

  const start = Date.now()
  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anonKey },
    })
    const latencyMs = Date.now() - start
    const ok = res.ok
    return {
      id: 'supabase', name: 'Supabase (Database & Auth)', category: 'core',
      envVars, optional: false,
      status: ok && serviceKey ? 'connected' : ok ? 'misconfigured' : 'error',
      configured: true,
      connected: ok,
      latencyMs,
      message: ok
        ? (serviceKey ? `Online (${latencyMs}ms)` : 'Auth OK but service role key missing — server-side admin operations will fail.')
        : `Auth health check returned ${res.status}`,
    }
  } catch (err: any) {
    return {
      id: 'supabase', name: 'Supabase (Database & Auth)', category: 'core',
      envVars, optional: false,
      status: 'error', configured: true, connected: false,
      latencyMs: Date.now() - start,
      message: err?.message || 'Network error',
    }
  }
}

async function pingOpenAI(apiKey: string, baseUrl?: string): Promise<{ ok: boolean; message: string }> {
  const url = `${baseUrl || 'https://api.openai.com/v1'}/models`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } })
  if (!res.ok) return { ok: false, message: `${res.status} ${res.statusText}` }
  const data = await res.json() as { data?: any[] }
  return { ok: true, message: `${data.data?.length ?? 0} models available` }
}

async function pingGemini(apiKey: string, model?: string): Promise<{ ok: boolean; message: string }> {
  const m = model || 'gemini-2.0-flash'
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}?key=${apiKey}`)
  if (!res.ok) return { ok: false, message: `${res.status} ${res.statusText}` }
  return { ok: true, message: `Model ${m} reachable` }
}

async function pingAssemblyAI(apiKey: string): Promise<{ ok: boolean; message: string }> {
  // List transcripts (returns empty list if none — still validates auth)
  const res = await fetch('https://api.assemblyai.com/v2/transcript?limit=1', {
    headers: { Authorization: apiKey },
  })
  if (!res.ok) return { ok: false, message: `${res.status} ${res.statusText}` }
  return { ok: true, message: 'API key valid' }
}

async function pingPinecone(apiKey: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch('https://api.pinecone.io/indexes', {
    headers: { 'Api-Key': apiKey, 'X-Pinecone-API-Version': '2024-07' },
  })
  if (!res.ok) return { ok: false, message: `${res.status} ${res.statusText}` }
  const data = await res.json() as { indexes?: any[] }
  return { ok: true, message: `${data.indexes?.length ?? 0} index(es)` }
}

async function pingSlack(token: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch('https://slack.com/api/auth.test', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json() as { ok: boolean; team?: string; error?: string }
  return data.ok
    ? { ok: true, message: `Workspace: ${data.team}` }
    : { ok: false, message: data.error || 'auth.test failed' }
}

async function pingResend(apiKey: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch('https://api.resend.com/domains', {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) return { ok: false, message: `${res.status} ${res.statusText}` }
  const data = await res.json() as { data?: any[] }
  return { ok: true, message: `${data.data?.length ?? 0} domain(s)` }
}

async function pingSendGrid(apiKey: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch('https://api.sendgrid.com/v3/scopes', {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) return { ok: false, message: `${res.status} ${res.statusText}` }
  return { ok: true, message: 'API key valid' }
}

async function pingOneSignal(appId: string, apiKey: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`https://onesignal.com/api/v1/apps/${appId}`, {
    headers: { Authorization: `Basic ${apiKey}` },
  })
  if (!res.ok) return { ok: false, message: `${res.status} ${res.statusText}` }
  return { ok: true, message: 'App reachable' }
}

async function pingCalcom(apiKey: string, baseUrl?: string): Promise<{ ok: boolean; message: string }> {
  const url = `${baseUrl || 'https://api.cal.com/v1'}/event-types?apiKey=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) return { ok: false, message: `${res.status} ${res.statusText}` }
  return { ok: true, message: 'API key valid' }
}

async function pingClockify(apiKey: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch('https://api.clockify.me/api/v1/workspaces', { headers: { 'X-Api-Key': apiKey } })
  if (!res.ok) return { ok: false, message: `${res.status} ${res.statusText}` }
  const data = await res.json() as any[]
  return { ok: true, message: `${data.length} workspace(s)` }
}

async function pingGoogleSA(serviceAccountJson: string): Promise<{ ok: boolean; message: string }> {
  try {
    const parsed = JSON.parse(serviceAccountJson)
    if (!parsed.client_email || !parsed.private_key) {
      return { ok: false, message: 'JSON missing client_email or private_key' }
    }
    return { ok: true, message: `Service account: ${parsed.client_email}` }
  } catch {
    return { ok: false, message: 'GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON' }
  }
}

async function pingCronitor(apiKey: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch('https://cronitor.io/api/monitors?page=1', {
    headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}` },
  })
  if (!res.ok) return { ok: false, message: `${res.status} ${res.statusText}` }
  const data = await res.json() as { total_monitor_count?: number }
  return { ok: true, message: `${data.total_monitor_count ?? 0} monitors` }
}

async function pingMixpanel(token: string): Promise<{ ok: boolean; message: string }> {
  if (!/^[a-f0-9]{32}$/i.test(token)) {
    return { ok: false, message: 'Token format looks invalid (expected 32 hex chars)' }
  }
  return { ok: true, message: 'Token format valid (Mixpanel has no auth-test endpoint)' }
}

async function pingMetabase(url: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${url.replace(/\/$/, '')}/api/health`)
  if (!res.ok) return { ok: false, message: `${res.status} ${res.statusText}` }
  return { ok: true, message: 'Metabase reachable' }
}

async function pingPlaid(clientId: string, secret: string, env?: string): Promise<{ ok: boolean; message: string }> {
  const envBase: Record<string, string> = {
    sandbox: 'https://sandbox.plaid.com',
    development: 'https://development.plaid.com',
    production: 'https://production.plaid.com',
  }
  const base = envBase[env || 'sandbox'] || envBase.sandbox
  const res = await fetch(`${base}/categories/get`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, secret }),
  })
  if (!res.ok) return { ok: false, message: `${res.status} ${res.statusText}` }
  return { ok: true, message: `Authenticated to Plaid ${env || 'sandbox'}` }
}

async function pingPandaDoc(apiKey: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch('https://api.pandadoc.com/public/v1/templates?count=1', {
    headers: { Authorization: `API-Key ${apiKey}` },
  })
  if (!res.ok) return { ok: false, message: `${res.status} ${res.statusText}` }
  return { ok: true, message: 'API key valid' }
}

async function pingHubSpot(token: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return { ok: false, message: `${res.status} ${res.statusText}` }
  return { ok: true, message: 'Token valid' }
}

async function pingMailchimp(apiKey: string): Promise<{ ok: boolean; message: string }> {
  const parts = apiKey.split('-')
  const dc = parts[parts.length - 1]
  if (!dc || !/^us\d+$/.test(dc)) return { ok: false, message: 'API key missing data-center suffix (e.g. -us21)' }
  const res = await fetch(`https://${dc}.api.mailchimp.com/3.0/ping`, {
    headers: { Authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString('base64')}` },
  })
  if (!res.ok) return { ok: false, message: `${res.status} ${res.statusText}` }
  return { ok: true, message: `Connected to ${dc}` }
}

async function pingEventbrite(token: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch('https://www.eventbriteapi.com/v3/users/me/', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return { ok: false, message: `${res.status} ${res.statusText}` }
  return { ok: true, message: 'Token valid' }
}

async function pingYelp(apiKey: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch('https://api.yelp.com/v3/categories?locale=en_US', {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) return { ok: false, message: `${res.status} ${res.statusText}` }
  return { ok: true, message: 'API key valid' }
}

async function pingMeta(token: string, pageId: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=name&access_token=${token}`)
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({})) as { error?: { message?: string } }
    return { ok: false, message: errBody.error?.message || `${res.status} ${res.statusText}` }
  }
  const data = await res.json() as { name?: string }
  return { ok: true, message: `Page: ${data.name}` }
}

async function pingGoogleMaps(apiKey: string): Promise<{ ok: boolean; message: string }> {
  // Geocode a known address — cheap and well-defined
  const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=Mountain+View,CA&key=${apiKey}`)
  const data = await res.json() as { status: string; error_message?: string }
  if (data.status === 'OK') return { ok: true, message: 'Geocoding API authorized' }
  return { ok: false, message: data.error_message || data.status }
}
