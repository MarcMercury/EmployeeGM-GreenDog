/**
 * Marketing Admin Access Middleware
 * Allows: admin, marketing_admin
 * Use for: Marketing edit features, Events, Leads, Inventory management
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const supabase = useSupabaseClient()
  
  // Get session directly
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user) {
    return navigateTo('/auth/login')
  }
  
  // Check role from database
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('auth_user_id', session.user.id)
    .single()
  
  const allowedRoles = ['admin', 'marketing_admin']
  
  if (!profile || !allowedRoles.includes(profile.role)) {
    console.warn('[Middleware] User without marketing access attempted:', to.path)
    return navigateTo('/')
  }
})
