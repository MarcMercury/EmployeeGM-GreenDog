/**
 * Management Access Middleware
 * Allows: super_admin, admin, manager, hr_admin, sup_admin, office_admin
 * Use for: Roster, Team Schedule, Time Off Approvals, Skill Stats
 * 
 * Note: This middleware is now unified with the new RBAC role system.
 * Consider using the 'rbac' middleware with requiredSection meta for new pages.
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
  
  const allowedRoles = ['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin']
  
  if (!allowedRoles.includes(profile.role)) {
    console.warn('[Middleware] User without management access attempted:', to.path)
    return navigateTo('/')
  }
})
