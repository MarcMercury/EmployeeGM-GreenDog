/**
 * Emergency Auth Composable
 *
 * Client-side state management for the emergency admin bypass.
 * The emergency token is stored in an httpOnly server cookie (not accessible
 * to client JS), so an XSS attack cannot steal the emergency session.
 * Only the non-sensitive profile is kept in client state for display/routing.
 */

const PROFILE_KEY = 'emergency_auth_profile'

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

export function useEmergencyAuth() {
  const profile = useState<EmergencyProfile | null>('emergency_profile', () => null)
  const isEmergencyMode = computed(() => !!profile.value)
  const _hydrated = useState<boolean>('emergency_hydrated', () => false)

  // Hydrate from sessionStorage on first call (client-only).
  // sessionStorage is less persistent than localStorage and clears on tab close.
  // The profile is display-only; the actual auth token is in an httpOnly cookie.
  if (import.meta.client && !_hydrated.value) {
    _hydrated.value = true
    try {
      const storedProfile = sessionStorage.getItem(PROFILE_KEY)
      if (storedProfile) {
        profile.value = JSON.parse(storedProfile)
      }
    } catch {
      // sessionStorage may be unavailable
    }
  }

  async function emergencyLogin(email: string, secret: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await $fetch<{
        profile: EmergencyProfile
        expiresAt: string
      }>('/api/auth/emergency-login', {
        method: 'POST',
        body: { email, secret },
      })

      profile.value = res.profile

      // Store profile in sessionStorage for display only (token is httpOnly cookie)
      if (import.meta.client) {
        sessionStorage.setItem(PROFILE_KEY, JSON.stringify(res.profile))
      }

      return { ok: true }
    } catch (err: any) {
      const message = err?.data?.message || err?.message || 'Emergency login failed'
      return { ok: false, error: message }
    }
  }

  async function emergencyLogout() {
    profile.value = null
    if (import.meta.client) {
      sessionStorage.removeItem(PROFILE_KEY)
    }
    // Clear the httpOnly cookie via server endpoint
    try {
      await $fetch('/api/auth/emergency-logout', { method: 'POST' })
    } catch {
      // Best-effort — cookie will expire naturally
    }
  }

  /**
   * Server-side session validation: verify the httpOnly cookie is still valid.
   * Returns the profile if valid, null if not.
   */
  async function verifySession(): Promise<EmergencyProfile | null> {
    try {
      const res = await $fetch<{ active: boolean; profile: EmergencyProfile | null }>('/api/auth/emergency-session')
      if (res.active && res.profile) {
        profile.value = res.profile
        return res.profile
      }
      // Session expired or invalid — clean up
      profile.value = null
      if (import.meta.client) {
        sessionStorage.removeItem(PROFILE_KEY)
      }
      return null
    } catch {
      return null
    }
  }

  return {
    profile: readonly(profile),
    isEmergencyMode,
    emergencyLogin,
    emergencyLogout,
    verifySession,
  }
}

/**
 * Quick check whether the current auth profile is an emergency admin session.
 * Works safely outside of composable context by inspecting the profile object.
 */
export function isEmergencySession(profile: { is_emergency?: boolean; id?: string } | null | undefined): boolean {
  if (!profile) return false
  if ((profile as any).is_emergency) return true
  // Fallback: detect synthetic emergency IDs
  if (typeof profile.id === 'string' && profile.id.startsWith('emergency-admin-')) return true
  return false
}
