/**
 * Cron Job Authentication Utility
 *
 * Uses timing-safe comparison to verify cron secrets,
 * preventing timing attacks on the Bearer token.
 */

import { timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

/**
 * Verify the cron request is properly authenticated.
 * Extracts the Bearer token from Authorization header and compares
 * it against the configured CRON_SECRET using timing-safe comparison.
 *
 * @throws 500 if CRON_SECRET is not configured
 * @throws 401 if the token does not match
 */
export function verifyCronAuth(event: H3Event): void {
  const authHeader = getHeader(event, 'authorization')
  const config = useRuntimeConfig()
  const cronSecret = config.cronSecret

  if (!cronSecret) {
    throw createError({ statusCode: 500, message: 'Server configuration error' })
  }

  const expected = `Bearer ${cronSecret}`

  if (!authHeader || authHeader.length !== expected.length) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const isValid = timingSafeEqual(
    Buffer.from(authHeader, 'utf-8'),
    Buffer.from(expected, 'utf-8')
  )

  if (!isValid) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
}
