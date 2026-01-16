/**
 * Super Admin Only Middleware
 * Blocks all users except super_admin from accessing protected routes
 * 
 * Allowed roles: super_admin ONLY
 * 
 * Usage:
 * definePageMeta({
 *   middleware: ['auth', 'super-admin-only']
 * })
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const supabase = useSupabaseClient()
  
  // Get session directly
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user) {
    return navigateTo('/auth/login')
  }
  
  // Check super_admin role from database directly
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
  
  // Only super_admin is allowed
  if (profile.role !== 'super_admin') {
    console.warn('[Middleware] Non-super-admin attempted to access super-admin-only route:', to.path)
    return navigateTo('/')
  }
})
