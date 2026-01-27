/**
 * Schedule-Access Middleware
 * Restricts schedule management pages to admin, manager, and HR roles
 * 
 * Allowed roles: super_admin, admin, manager, hr_admin
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const supabase = useSupabaseClient()
  
  // Get session directly
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user) {
    return navigateTo('/auth/login')
  }
  
  // Check role from database directly
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('auth_user_id', session.user.id)
    .single()
  
  // Handle errors gracefully - fail closed
  if (error || !profile) {
    console.error('[Middleware:schedule-access] Failed to fetch profile:', error?.message)
    return navigateTo('/auth/login')
  }
  
  // Allowed roles for schedule management
  const allowedRoles = ['super_admin', 'admin', 'manager', 'hr_admin']
  
  if (!allowedRoles.includes(profile.role)) {
    console.warn('[Middleware:schedule-access] Access denied for role:', profile.role, 'to path:', to.path)
    return navigateTo('/')
  }
})
