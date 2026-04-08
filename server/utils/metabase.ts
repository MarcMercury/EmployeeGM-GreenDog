/**
 * Metabase API - Server Utility
 * ================================
 * Embedded BI dashboards for financial KPIs, practice analytics.
 * Free (open source, self-hosted).
 *
 * Setup: docker run -p 3001:3000 metabase/metabase
 */
import type { MetabaseEmbedPayload, MetabaseDashboard } from '~/types/external-apis.types'

function getConfig(): { baseUrl: string; secretKey: string; username?: string; password?: string } {
  const config = useRuntimeConfig()
  if (!config.metabaseUrl) throw new Error('Metabase URL not configured')
  return {
    baseUrl: config.metabaseUrl,
    secretKey: config.metabaseSecretKey || '',
    username: config.metabaseUsername,
    password: config.metabasePassword,
  }
}

let sessionToken: string | null = null

async function getSessionToken(): Promise<string> {
  if (sessionToken) return sessionToken

  const { baseUrl, username, password } = getConfig()
  if (!username || !password) throw new Error('Metabase session credentials not configured')

  const result = await $fetch<{ id: string }>(`${baseUrl}/api/session`, {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })

  sessionToken = result.id
  return sessionToken
}

async function metabaseFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { baseUrl } = getConfig()
  const token = await getSessionToken()
  return $fetch<T>(`${baseUrl}/api${path}`, {
    ...options,
    headers: {
      'X-Metabase-Session': token,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
}

/** Generate a signed embed URL for a dashboard */
export function generateMetabaseEmbedUrl(payload: MetabaseEmbedPayload): string {
  const { baseUrl, secretKey } = getConfig()
  if (!secretKey) throw new Error('Metabase secret key not configured for embedding')

  // In production, sign with JWT using secretKey
  // For now, return the iframe URL pattern
  const resourceType = payload.resource.dashboard ? 'dashboard' : 'question'
  const resourceId = payload.resource.dashboard || payload.resource.question
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(payload.params)) {
    params.set(key, String(value))
  }

  return `${baseUrl}/embed/${resourceType}/${resourceId}#${params}`
}

/** List dashboards */
export async function listMetabaseDashboards(): Promise<MetabaseDashboard[]> {
  return metabaseFetch<MetabaseDashboard[]>('/dashboard')
}

/** Get dashboard details */
export async function getMetabaseDashboard(dashboardId: number): Promise<MetabaseDashboard> {
  return metabaseFetch<MetabaseDashboard>(`/dashboard/${dashboardId}`)
}

/** Run a saved question/query */
export async function runMetabaseQuestion(questionId: number, parameters?: Record<string, any>): Promise<any> {
  return metabaseFetch(`/card/${questionId}/query`, {
    method: 'POST',
    body: JSON.stringify({ parameters }),
  })
}

/** Execute a raw SQL query (admin only) */
export async function runMetabaseNativeQuery(
  databaseId: number,
  query: string,
  params?: any[]
): Promise<any> {
  return metabaseFetch('/dataset', {
    method: 'POST',
    body: JSON.stringify({
      database: databaseId,
      type: 'native',
      native: {
        query,
        'template-tags': {},
      },
      parameters: params || [],
    }),
  })
}
