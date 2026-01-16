/**
 * Admin-Only Middleware
 * Blocks non-admin users from accessing protected routes
 * 
 * Allowed roles: super_admin, admin
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const supabase = useSupabaseClient()
  
  // Get session directly
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user) {
    return navigateTo('/auth/login')
  }
  
  // Check admin role from database directly
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('auth_user_id', session.user.id)
    .single()
  
  // Handle errors gracefully - fail closed
  if (error || !profile) {
    console.error('[Middleware] Failed to fetch profile:', error?.message)
    return navigateTo('/auth/login')
  }
  
  // Admin roles include both super_admin and admin
  const adminRoles = ['super_admin', 'admin']
  
  if (!adminRoles.includes(profile.role)) {
    console.warn('[Middleware] Non-admin attempted to access:', to.path)
    return navigateTo('/')
  }
})
