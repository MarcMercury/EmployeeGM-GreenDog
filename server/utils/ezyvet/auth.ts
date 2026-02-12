/**
 * ezyVet OAuth 2.0 Authentication Manager
 *
 * Implements client_credentials grant with lazy token refresh.
 * Tokens have a 12-hour TTL. We refresh when the cached token is
 * expired or within 5 minutes of expiration.
 *
 * Token state is persisted in Supabase `ezyvet_tokens` so it
 * survives serverless cold starts and is shared across instances.
 */

import { logger } from '../logger'
import type { EzyVetClinic, EzyVetToken, EzyVetOAuthResponse } from './types'
import type { SupabaseClient } from '@supabase/supabase-js'

/** Buffer before actual expiry to trigger proactive refresh (ms) */
const REFRESH_BUFFER_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Get a valid access token for the given clinic.
 * Uses lazy-refresh: returns cached token if still valid,
 * otherwise fetches a new one from ezyVet and persists it.
 */
export async function getAccessToken(
  supabase: SupabaseClient,
  clinic: EzyVetClinic
): Promise<string> {
  // 1. Check for a cached token in the database
  const { data: cached } = await supabase
    .from('ezyvet_tokens')
    .select('*')
    .eq('clinic_id', clinic.id)
    .single()

  if (cached) {
    const expiresAt = new Date(cached.expires_at).getTime()
    const now = Date.now()

    if (expiresAt - now > REFRESH_BUFFER_MS) {
      logger.debug('Using cached ezyVet token', 'ezyvet-auth', {
        clinic: clinic.label,
        expiresIn: `${Math.round((expiresAt - now) / 60_000)}m`,
      })
      return cached.access_token
    }

    logger.info('ezyVet token expired or near expiry — refreshing', 'ezyvet-auth', {
      clinic: clinic.label,
    })
  }

  // 2. Request a fresh token
  const token = await requestNewToken(clinic)

  // 3. Persist (upsert) the token
  const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString()

  const { error: upsertErr } = await supabase
    .from('ezyvet_tokens')
    .upsert(
      {
        clinic_id: clinic.id,
        access_token: token.access_token,
        token_type: token.token_type,
        expires_at: expiresAt,
        issued_at: new Date().toISOString(),
      },
      { onConflict: 'clinic_id' }
    )

  if (upsertErr) {
    logger.error('Failed to cache ezyVet token', upsertErr, 'ezyvet-auth')
    // Non-fatal: we still have the token in memory
  }

  logger.info('New ezyVet token obtained', 'ezyvet-auth', {
    clinic: clinic.label,
    expiresIn: `${Math.round(token.expires_in / 3600)}h`,
  })

  return token.access_token
}

/**
 * Request a new OAuth token from ezyVet's token endpoint.
 */
async function requestNewToken(clinic: EzyVetClinic): Promise<EzyVetOAuthResponse> {
  const url = `${clinic.base_url}/v1/oauth/access_token`

  const body = new URLSearchParams({
    partner_id: clinic.partner_id,
    client_id: clinic.client_id,
    client_secret: clinic.client_secret,
    grant_type: 'client_credentials',
    scope: clinic.scope,
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    logger.error('ezyVet OAuth token request failed', null, 'ezyvet-auth', {
      status: response.status,
      body: errorBody.slice(0, 500),
      clinic: clinic.label,
    })
    throw createError({
      statusCode: 502,
      message: `ezyVet auth failed (${response.status}): ${errorBody.slice(0, 200)}`,
    })
  }

  return (await response.json()) as EzyVetOAuthResponse
}

/**
 * Invalidate cached token for a clinic (e.g. after a 401).
 */
export async function invalidateToken(
  supabase: SupabaseClient,
  clinicId: string
): Promise<void> {
  await supabase.from('ezyvet_tokens').delete().eq('clinic_id', clinicId)
  logger.info('Invalidated cached ezyVet token', 'ezyvet-auth', { clinicId })
}
