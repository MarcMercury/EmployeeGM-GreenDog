/**
 * Emergency Admin Login
 *
 * POST /api/auth/emergency-login
 *
 * Allows admin access when Supabase Auth is down.
 * Protected by EMERGENCY_ADMIN_SECRET env var.
 *
 * Body: { email: string, secret: string }
 * Returns: { token: string, profile: EmergencyProfile }
 *
 * The token is an HMAC-signed JSON payload with a 4-hour TTL.
 * It is NOT a Supabase JWT — it only works with the emergency
 * middleware and the client-side emergency auth composable.
 */

import { createHmac, randomBytes } from 'node:crypto'

export interface EmergencyProfile {
  id: string
  auth_user_id: string
  email: string
  first_name: string
  last_name: string
  role: string
  location_id: string | null
  is_emergency: true
}

const TOKEN_TTL_MS = 4 * 60 * 60 * 1000 // 4 hours

function signPayload(payload: object, secret: string): string {
  const json = JSON.stringify(payload)
  const b64 = Buffer.from(json).toString('base64url')
  const sig = createHmac('sha256', secret).update(b64).digest('base64url')
  return `${b64}.${sig}`
}

export function verifyEmergencyToken(token: string, secret: string): EmergencyProfile | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [b64, sig] = parts
  const expectedSig = createHmac('sha256', secret).update(b64).digest('base64url')

  if (sig !== expectedSig) return null

  try {
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString())
    if (!payload.exp || Date.now() > payload.exp) return null
    return payload.profile as EmergencyProfile
  } catch {
    return null
  }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const emergencySecret = config.emergencyAdminSecret

  if (!emergencySecret) {
    throw createError({
      statusCode: 503,
      message: 'Emergency login is not configured',
    })
  }

  const body = await readBody(event)
  const { email, secret } = body || {}

  if (!email || !secret) {
    throw createError({ statusCode: 400, message: 'Email and secret are required' })
  }

  // Validate the emergency secret
  if (secret !== emergencySecret) {
    // Constant-time-ish delay to slow brute force
    await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000))
    throw createError({ statusCode: 401, message: 'Invalid emergency credentials' })
  }

  // Validate email matches allowed emergency admin email
  const allowedEmail = config.emergencyAdminEmail
  if (!allowedEmail || email.trim().toLowerCase() !== allowedEmail.trim().toLowerCase()) {
    await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000))
    throw createError({ statusCode: 401, message: 'Invalid emergency credentials' })
  }

  // Build a minimal profile (no DB needed)
  const profile: EmergencyProfile = {
    id: 'emergency-admin-' + randomBytes(4).toString('hex'),
    auth_user_id: 'emergency-' + randomBytes(4).toString('hex'),
    email: allowedEmail,
    first_name: config.emergencyAdminName?.split(' ')[0] || 'Emergency',
    last_name: config.emergencyAdminName?.split(' ').slice(1).join(' ') || 'Admin',
    role: 'super_admin',
    location_id: null,
    is_emergency: true,
  }

  // Sign a token
  const payload = {
    profile,
    iat: Date.now(),
    exp: Date.now() + TOKEN_TTL_MS,
    jti: randomBytes(16).toString('hex'),
  }

  const token = signPayload(payload, emergencySecret)

  console.log(`[EmergencyLogin] Emergency admin login granted for ${allowedEmail}`)

  return {
    token,
    profile,
    expiresAt: new Date(payload.exp).toISOString(),
  }
})
