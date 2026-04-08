/**
 * Cronitor - Server Utility
 * ===========================
 * Monitor cron jobs and scheduled tasks (ezyVet sync, Slack sync, etc.).
 *
 * Setup: https://cronitor.io/docs/api
 */
import type { CronitorMonitor, CronitorPing } from '~/types/external-apis.types'

const BASE_URL = 'https://cronitor.link'
const API_URL = 'https://cronitor.io/api'

function getApiKey(): string {
  const config = useRuntimeConfig()
  if (!config.cronitorApiKey) throw new Error('Cronitor API key not configured')
  return config.cronitorApiKey
}

/** Ping a monitor (call at start/end of cron jobs) */
export async function cronitorPing(monitorKey: string, state: CronitorPing['state'], message?: string): Promise<void> {
  const params = new URLSearchParams({ state })
  if (message) params.set('msg', message.substring(0, 2000))

  try {
    await $fetch(`${BASE_URL}/${monitorKey}?${params}`, { method: 'GET' })
  } catch (error) {
    // Cronitor pings are fire-and-forget — don't block on failures
    console.warn(`[Cronitor] Ping failed for ${monitorKey}:`, error)
  }
}

/** Wrap an async function with automatic Cronitor monitoring */
export function withCronitor<T>(monitorKey: string, fn: () => Promise<T>): () => Promise<T> {
  return async () => {
    await cronitorPing(monitorKey, 'run')
    try {
      const result = await fn()
      await cronitorPing(monitorKey, 'complete')
      return result
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      await cronitorPing(monitorKey, 'fail', msg)
      throw error
    }
  }
}

/** List all monitors */
export async function listCronitorMonitors(): Promise<CronitorMonitor[]> {
  const apiKey = getApiKey()
  const result = await $fetch<{ monitors: CronitorMonitor[] }>(`${API_URL}/monitors`, {
    headers: { Authorization: `Basic ${btoa(apiKey + ':')}` },
  })
  return result.monitors || []
}

/** Create or update a monitor */
export async function upsertCronitorMonitor(monitor: Partial<CronitorMonitor> & { key: string }): Promise<CronitorMonitor> {
  const apiKey = getApiKey()
  return $fetch<CronitorMonitor>(`${API_URL}/monitors`, {
    method: 'PUT',
    headers: {
      Authorization: `Basic ${btoa(apiKey + ':')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ monitors: [monitor] }),
  })
}
