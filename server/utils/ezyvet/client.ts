/**
 * ezyVet Rate-Limited HTTP Client
 *
 * Wraps all ezyVet API calls with:
 *  - Automatic Bearer-token injection (via auth.ts)
 *  - Exponential backoff on 429 Too Many Requests
 *  - Automatic token refresh on 401 Unauthorized
 *  - Scope error detection on 403 Forbidden
 *  - Validation error logging on 422
 *  - Pagination helper (limit up to 200 per page)
 *
 * Rate limits:
 *  - 60 calls/min per endpoint
 *  - 180 calls/min global
 *  - 300 calls/min for /ezycab/availability
 */

import { logger } from '../logger'
import { getAccessToken, invalidateToken } from './auth'
import type {
  EzyVetClinic,
  EzyVetListResponse,
  EzyVetClientOptions,
} from './types'
import type { SupabaseClient } from '@supabase/supabase-js'

const DEFAULT_OPTIONS: Required<EzyVetClientOptions> = {
  rateLimitPerEndpoint: 60,
  rateLimitGlobal: 180,
  maxPageSize: 200,
  maxRetries: 5,
  useTrial: false,
}

interface RequestState {
  /** Unix ms timestamp of last call per endpoint path */
  lastCall: Map<string, number[]>
  /** Global call timestamps */
  globalCalls: number[]
}

// Per-clinic rate limit state (in-memory, resets on cold start)
const stateMap = new Map<string, RequestState>()

function getState(clinicId: string): RequestState {
  if (!stateMap.has(clinicId)) {
    stateMap.set(clinicId, { lastCall: new Map(), globalCalls: [] })
  }
  return stateMap.get(clinicId)!
}

/**
 * Sleep helper that respects exponential backoff.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Prune timestamps older than 60 s from a list.
 */
function pruneOld(timestamps: number[]): number[] {
  const cutoff = Date.now() - 60_000
  return timestamps.filter((t) => t > cutoff)
}

/**
 * Wait if we'd exceed rate limits, then record the call.
 */
async function throttle(
  clinicId: string,
  endpointPath: string,
  opts: Required<EzyVetClientOptions>
): Promise<void> {
  const state = getState(clinicId)

  // Prune old entries
  state.globalCalls = pruneOld(state.globalCalls)
  const epCalls = pruneOld(state.lastCall.get(endpointPath) || [])
  state.lastCall.set(endpointPath, epCalls)

  const limit = endpointPath.includes('/ezycab/availability')
    ? 300
    : opts.rateLimitPerEndpoint

  // If either limit is reached, wait until the oldest call in the window expires
  if (epCalls.length >= limit || state.globalCalls.length >= opts.rateLimitGlobal) {
    const oldestEp = epCalls.length >= limit ? epCalls[0]! : Infinity
    const oldestGlobal =
      state.globalCalls.length >= opts.rateLimitGlobal ? state.globalCalls[0]! : Infinity
    const oldest = Math.min(oldestEp, oldestGlobal)
    const waitMs = oldest + 60_000 - Date.now() + 50 // +50 ms buffer
    if (waitMs > 0) {
      logger.info(`Rate limit: waiting ${waitMs}ms`, 'ezyvet-client', {
        clinicId,
        endpointPath,
      })
      await sleep(waitMs)
    }
  }

  // Record call
  const now = Date.now()
  state.globalCalls.push(now)
  epCalls.push(now)
  state.lastCall.set(endpointPath, epCalls)
}

/**
 * Core fetch wrapper with retries and backoff.
 */
export async function ezyvetFetch<T = unknown>(
  supabase: SupabaseClient,
  clinic: EzyVetClinic,
  path: string,
  init: RequestInit = {},
  options: EzyVetClientOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const baseUrl = opts.useTrial
    ? 'https://api.trial.ezyvet.com'
    : clinic.base_url

  let attempt = 0

  while (attempt <= opts.maxRetries) {
    // Get a valid token (lazy-refresh)
    const token = await getAccessToken(supabase, clinic)

    // Throttle before the request
    await throttle(clinic.id, path, opts)

    const url = `${baseUrl}${path}`
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...((init.headers as Record<string, string>) || {}),
      },
    })

    // ── Success ──
    if (response.ok) {
      return (await response.json()) as T
    }

    // ── 401 — Token expired ──
    if (response.status === 401) {
      logger.warn('ezyVet 401 — invalidating token and retrying', 'ezyvet-client', {
        path,
        attempt,
      })
      await invalidateToken(supabase, clinic.id)
      attempt++
      continue
    }

    // ── 403 — Scope issue ──
    if (response.status === 403) {
      const body = await response.text()
      logger.error('ezyVet 403 — scope/permission error', null, 'ezyvet-client', {
        path,
        body: body.slice(0, 500),
        currentScope: clinic.scope,
      })
      throw createError({
        statusCode: 403,
        message: `ezyVet scope error on ${path}. Verify the scope parameter includes the required permissions.`,
      })
    }

    // ── 422 — Validation error ──
    if (response.status === 422) {
      const body = await response.json().catch(() => ({}))
      logger.error('ezyVet 422 — validation error', null, 'ezyvet-client', {
        path,
        messages: (body as any)?.messages || body,
      })

      // Log to Supabase for debugging
      await supabase.from('ezyvet_api_sync_log').insert({
        clinic_id: clinic.id,
        sync_type: 'full',
        status: 'failed',
        error_details: { status: 422, path, messages: (body as any)?.messages || body },
        triggered_by: 'api-client',
      })

      throw createError({
        statusCode: 422,
        message: `ezyVet validation error on ${path}`,
        data: (body as any)?.messages || body,
      })
    }

    // ── 429 — Rate limited ──
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '0', 10)
      const backoffMs = retryAfter
        ? retryAfter * 1000
        : Math.min(1000 * Math.pow(2, attempt), 60_000) // exponential up to 60 s

      logger.warn(`ezyVet 429 — backing off ${backoffMs}ms (attempt ${attempt + 1}/${opts.maxRetries})`, 'ezyvet-client', { path })
      await sleep(backoffMs)
      attempt++
      continue
    }

    // ── Other errors ──
    const errorText = await response.text()
    logger.error(`ezyVet ${response.status} error`, null, 'ezyvet-client', {
      path,
      status: response.status,
      body: errorText.slice(0, 500),
    })
    throw createError({
      statusCode: response.status,
      message: `ezyVet API error ${response.status} on ${path}`,
    })
  }

  throw createError({
    statusCode: 429,
    message: `ezyVet rate limit: max retries (${opts.maxRetries}) exceeded for ${path}`,
  })
}

/**
 * Paginated GET — automatically walks all pages using limit/page params.
 * Returns every item concatenated into a single array.
 */
export async function ezyvetFetchAll<T = unknown>(
  supabase: SupabaseClient,
  clinic: EzyVetClinic,
  path: string,
  params: Record<string, string | number> = {},
  options: EzyVetClientOptions = {}
): Promise<T[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const allItems: T[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const qs = new URLSearchParams({
      ...Object.fromEntries(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ),
      limit: String(opts.maxPageSize),
      page: String(page),
    })

    const url = `${path}?${qs.toString()}`
    const response = await ezyvetFetch<EzyVetListResponse<T>>(
      supabase,
      clinic,
      url,
      {},
      options
    )

    if (response.items) {
      allItems.push(...response.items)
    }

    if (response.meta) {
      totalPages = response.meta.pages_total || 1
    }

    page++
  }

  logger.info(`Paginated fetch complete: ${allItems.length} items`, 'ezyvet-client', {
    path,
    pages: totalPages,
  })

  return allItems
}
