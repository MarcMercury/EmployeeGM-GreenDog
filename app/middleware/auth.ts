/**
 * Auth Middleware — Base authentication check
 * Uses getUser() for server-validated JWT verification (prevents token tampering).
 * Populates the auth store profile for use by other middleware.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // Public routes that don't require auth
  if (to.path.startsWith('/auth/') || to.path.startsWith('/public/')) {
    return
  }

  const supabase = useSupabaseClient()

  // Use getUser() for server-side JWT validation (not getSession which only reads local storage)
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return navigateTo('/auth/login')
  }

  // Ensure auth store has the profile loaded for downstream middleware
  const authStore = useAuthStore()
  if (!authStore.profile) {
    await authStore.fetchProfile(user.id)
  }
})
