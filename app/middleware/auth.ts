/**
 * Auth Middleware — Base authentication check
 * Uses getUser() for server-validated JWT verification (prevents token tampering).
 * Populates the auth store profile for use by other middleware.
 * Includes a timeout so navigation is never blocked when Supabase is unreachable.
 * Supports emergency admin bypass when Supabase is down.
 */

const AUTH_TIMEOUT = 5_000 // 5 seconds max for auth check

export default defineNuxtRouteMiddleware(async (to) => {
  // Public routes that don't require auth
  if (to.path.startsWith('/auth/') || to.path.startsWith('/public/')) {
    return
  }

  // Check for emergency admin session first — re-validate via server
  const { isEmergencyMode, profile: emergencyProfile, verifySession } = useEmergencyAuth()
  if (isEmergencyMode.value && emergencyProfile.value) {
    // Re-validate the httpOnly cookie token server-side
    const verifiedProfile = await verifySession()
    if (verifiedProfile) {
      console.log('[AuthMiddleware] Emergency admin session verified server-side')
      const authStore = useAuthStore()
      if (!authStore.profile) {
        authStore.profile = verifiedProfile as any
        authStore.initialized = true
      }
      return
    }
    // Session was invalid/expired — fall through to normal auth
    console.warn('[AuthMiddleware] Emergency session expired or invalid')
  }

  const supabase = useSupabaseClient()

  // Race getUser() against a timeout so a Supabase outage doesn't freeze navigation
  let user: any = null
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<{ data: { user: null }, error: { message: string } }>((resolve) =>
        setTimeout(() => resolve({ data: { user: null }, error: { message: 'Auth check timed out' } }), AUTH_TIMEOUT)
      )
    ])
    user = result.data?.user ?? null
    if (result.error) {
      console.warn('[AuthMiddleware] Auth check failed:', result.error.message)
    }
  } catch (err) {
    console.warn('[AuthMiddleware] Auth check threw:', err)
  }

  if (!user) {
    return navigateTo('/auth/login')
  }

  // Ensure auth store has the profile loaded for downstream middleware
  const authStore = useAuthStore()
  if (!authStore.profile) {
    try {
      await Promise.race([
        authStore.fetchProfile(user.id),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), AUTH_TIMEOUT))
      ])
    } catch (err) {
      console.warn('[AuthMiddleware] Profile fetch failed:', err)
    }
  }
})
