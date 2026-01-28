/**
 * Marketing Admin Access Middleware
 * Allows: super_admin, admin, manager, marketing_admin
 * Use for: Marketing edit features, Events, Leads, Inventory management
 * 
 * Note: manager role has full access to marketing (supervisor with HR + Marketing access)
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const supabase = useSupabaseClient()
  
  // Get session directly
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user) {
    return navigateTo('/auth/login')
  }
  
  // Check role from database
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
  
  const allowedRoles = ['super_admin', 'admin', 'manager', 'marketing_admin']
  
  if (!allowedRoles.includes(profile.role)) {
    console.warn('[Middleware] User without marketing access attempted:', to.path)
    return navigateTo('/')
  }
})
