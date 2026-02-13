/**
 * Emergency Session Verify
 *
 * GET /api/auth/emergency-session
 *
 * Validates the httpOnly emergency_token cookie and returns the profile.
 * Used by the client-side auth middleware to check emergency sessions
 * without exposing the token to JavaScript.
 */
import { verifyEmergencyToken } from './emergency-login.post'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const emergencySecret = config.emergencyAdminSecret
    || process.env.EMERGENCY_ADMIN_SECRET
    || process.env.NUXT_EMERGENCY_ADMIN_SECRET

  if (!emergencySecret) {
    return { active: false, profile: null }
  }

  const token = getCookie(event, 'emergency_token')
  if (!token) {
    return { active: false, profile: null }
  }

  const profile = verifyEmergencyToken(token, emergencySecret)
  if (!profile) {
    // Token is invalid or expired — clear the cookie
    deleteCookie(event, 'emergency_token', { path: '/' })
    return { active: false, profile: null }
  }

  return { active: true, profile }
})
