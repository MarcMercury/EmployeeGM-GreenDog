/**
 * Mixpanel API - Server Utility
 * ================================
 * Product analytics — track which features employees use.
 * Free tier available.
 *
 * Setup: https://mixpanel.com/
 */
import type { MixpanelEvent, MixpanelProfile } from '~/types/external-apis.types'

const TRACK_URL = 'https://api.mixpanel.com/track'
const ENGAGE_URL = 'https://api.mixpanel.com/engage'

function getToken(): string {
  const config = useRuntimeConfig()
  if (!config.mixpanelToken) throw new Error('Mixpanel project token not configured')
  return config.mixpanelToken
}

/** Track a single event */
export async function mixpanelTrack(
  event: string,
  distinctId: string,
  properties?: Record<string, any>
): Promise<void> {
  const token = getToken()

  const data: MixpanelEvent = {
    event,
    properties: {
      distinct_id: distinctId,
      token,
      time: Math.floor(Date.now() / 1000),
      ...properties,
    },
  }

  await $fetch(TRACK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/plain' },
    body: JSON.stringify([data]),
  }).catch(err => {
    console.warn('[Mixpanel] Track failed:', err)
  })
}

/** Track multiple events in batch */
export async function mixpanelTrackBatch(events: MixpanelEvent[]): Promise<void> {
  const token = getToken()

  const data = events.map(e => ({
    ...e,
    properties: { ...e.properties, token },
  }))

  // Mixpanel accepts max 2000 events per batch
  const chunks = []
  for (let i = 0; i < data.length; i += 2000) {
    chunks.push(data.slice(i, i + 2000))
  }

  for (const chunk of chunks) {
    await $fetch(TRACK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/plain' },
      body: JSON.stringify(chunk),
    }).catch(err => {
      console.warn('[Mixpanel] Batch track failed:', err)
    })
  }
}

/** Set user profile properties */
export async function mixpanelSetProfile(
  distinctId: string,
  properties: Record<string, any>
): Promise<void> {
  const token = getToken()

  const data: MixpanelProfile = {
    $distinct_id: distinctId,
    $set: properties,
  }

  await $fetch(ENGAGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/plain' },
    body: JSON.stringify([{ ...data, $token: token }]),
  }).catch(err => {
    console.warn('[Mixpanel] Profile update failed:', err)
  })
}

/** Set profile properties only if not already set */
export async function mixpanelSetProfileOnce(
  distinctId: string,
  properties: Record<string, any>
): Promise<void> {
  const token = getToken()

  await $fetch(ENGAGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/plain' },
    body: JSON.stringify([{
      $distinct_id: distinctId,
      $token: token,
      $set_once: properties,
    }]),
  }).catch(err => {
    console.warn('[Mixpanel] Profile set-once failed:', err)
  })
}
