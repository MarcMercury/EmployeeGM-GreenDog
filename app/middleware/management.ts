/**
 * Management Access Middleware
 * Allows: admin, office_admin
 * Use for: Roster, Team Schedule, Time Off Approvals, Skill Stats
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
  
  const allowedRoles = ['admin', 'office_admin']
  
  if (!profile || !allowedRoles.includes(profile.role)) {
    console.warn('[Middleware] User without management access attempted:', to.path)
    return navigateTo('/')
  }
})
