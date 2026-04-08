/**
 * OneSignal API - Server Utility
 * =================================
 * Push notifications to web/mobile for shift changes, approvals, alerts.
 * Free tier available.
 *
 * Setup: https://onesignal.com/
 */
import type { OneSignalNotification, OneSignalDevice } from '~/types/external-apis.types'

const BASE_URL = 'https://onesignal.com/api/v1'

function getConfig(): { appId: string; apiKey: string } {
  const config = useRuntimeConfig()
  if (!config.onesignalAppId || !config.onesignalApiKey) {
    throw new Error('OneSignal credentials not configured')
  }
  return { appId: config.onesignalAppId, apiKey: config.onesignalApiKey }
}

async function onesignalFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { apiKey } = getConfig()
  return $fetch<T>(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${apiKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
}

/** Send push notification to specific users */
export async function sendPushNotification(options: {
  title: string
  message: string
  userIds?: string[]
  playerIds?: string[]
  url?: string
  data?: Record<string, any>
}): Promise<{ id: string; recipients: number }> {
  const { appId } = getConfig()

  const notification: Partial<OneSignalNotification> = {
    app_id: appId,
    contents: { en: options.message },
    headings: { en: options.title },
    ...(options.url && { url: options.url }),
    ...(options.data && { data: options.data }),
  }

  if (options.playerIds?.length) {
    notification.include_player_ids = options.playerIds
  } else if (options.userIds?.length) {
    notification.include_external_user_ids = options.userIds
  }

  return onesignalFetch<{ id: string; recipients: number }>('/notifications', {
    method: 'POST',
    body: JSON.stringify(notification),
  })
}

/** Send push to all subscribed users */
export async function sendBroadcastNotification(options: {
  title: string
  message: string
  url?: string
  data?: Record<string, any>
}): Promise<{ id: string; recipients: number }> {
  const { appId } = getConfig()
  return onesignalFetch<{ id: string; recipients: number }>('/notifications', {
    method: 'POST',
    body: JSON.stringify({
      app_id: appId,
      included_segments: ['Subscribed Users'],
      contents: { en: options.message },
      headings: { en: options.title },
      ...(options.url && { url: options.url }),
      ...(options.data && { data: options.data }),
    }),
  })
}

/** Get devices/players for a user */
export async function getOneSignalDevices(limit = 50, offset = 0): Promise<OneSignalDevice[]> {
  const { appId } = getConfig()
  const result = await onesignalFetch<{ players: OneSignalDevice[] }>(
    `/players?app_id=${appId}&limit=${limit}&offset=${offset}`
  )
  return result.players || []
}
