/**
 * Emergency Auth Composable
 *
 * Client-side state management for the emergency admin bypass.
 * Stores the emergency token in localStorage and provides
 * reactive state that the auth middleware and plugin can check.
 */

const STORAGE_KEY = 'emergency_auth_token'
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
  const token = useState<string | null>('emergency_token', () => null)
  const profile = useState<EmergencyProfile | null>('emergency_profile', () => null)
  const isEmergencyMode = computed(() => !!token.value && !!profile.value)

  // Hydrate from localStorage on first call (client-only)
  if (import.meta.client && !token.value) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const storedProfile = localStorage.getItem(PROFILE_KEY)
      if (stored && storedProfile) {
        token.value = stored
        profile.value = JSON.parse(storedProfile)
      }
    } catch {
      // localStorage may be unavailable
    }
  }

  async function emergencyLogin(email: string, secret: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await $fetch<{
        token: string
        profile: EmergencyProfile
        expiresAt: string
      }>('/api/auth/emergency-login', {
        method: 'POST',
        body: { email, secret },
      })

      token.value = res.token
      profile.value = res.profile

      if (import.meta.client) {
        localStorage.setItem(STORAGE_KEY, res.token)
        localStorage.setItem(PROFILE_KEY, JSON.stringify(res.profile))
      }

      return { ok: true }
    } catch (err: any) {
      const message = err?.data?.message || err?.message || 'Emergency login failed'
      return { ok: false, error: message }
    }
  }

  function emergencyLogout() {
    token.value = null
    profile.value = null
    if (import.meta.client) {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(PROFILE_KEY)
    }
  }

  function getToken(): string | null {
    return token.value
  }

  return {
    token: readonly(token),
    profile: readonly(profile),
    isEmergencyMode,
    emergencyLogin,
    emergencyLogout,
    getToken,
  }
}
