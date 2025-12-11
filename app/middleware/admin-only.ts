/**
 * Admin-Only Middleware
 * Blocks non-admin users from accessing protected routes
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const supabase = useSupabaseClient()
  
  // Get session directly
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user) {
    return navigateTo('/auth/login')
  }
  
  // Check admin role from database directly
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('auth_user_id', session.user.id)
    .single()
  
  if (profile?.role !== 'admin') {
    console.warn('[Middleware] Non-admin attempted to access:', to.path)
    return navigateTo('/')
  }
})
