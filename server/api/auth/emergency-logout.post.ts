/**
 * Emergency Logout
 *
 * POST /api/auth/emergency-logout
 *
 * Clears the httpOnly emergency_token cookie.
 */
export default defineEventHandler((event) => {
  deleteCookie(event, 'emergency_token', { path: '/' })
  return { ok: true }
})
