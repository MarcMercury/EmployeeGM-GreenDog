/**
 * Admin Middleware (Store-based)
 * Uses AuthStore for role checks with caching
 * 
 * Allowed roles: super_admin, admin
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const supabase = useSupabaseClient()
  
  // Verify session first
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user) {
    return navigateTo('/auth/login')
  }
  
  const authStore = useAuthStore()
  
  // Wait for profile to load if needed
  if (!authStore.profile) {
    await authStore.fetchProfile(session.user.id)
  }

  // Check if user is admin (includes super_admin)
  if (!authStore.isAdmin) {
    console.warn('[Middleware] Non-admin attempted to access:', to.path)
    return navigateTo('/')
  }
})
