/**
 * Marketing Admin Access Middleware
 * Allows: super_admin, admin, manager, marketing_admin
 * For FULL marketing access (edit/manage features, Events, Leads, Inventory)
 * 
 * Note: office_admin and user have VIEW access to calendar/resources only
 * Use 'marketing-view' middleware for those pages
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
  
  // Roles with FULL marketing access (can edit/manage)
  const fullAccessRoles = ['super_admin', 'admin', 'manager', 'marketing_admin']
  
  // Roles with VIEW access to specific marketing pages (calendar, resources)
  const viewAccessRoles = ['office_admin', 'user']
  const viewOnlyPaths = ['/marketing/calendar', '/marketing/resources']
  
  // Check if user has full access
  if (fullAccessRoles.includes(profile.role)) {
    return // Allow access
  }
  
  // Check if user has view access to specific pages
  if (viewAccessRoles.includes(profile.role) && viewOnlyPaths.includes(to.path)) {
    return // Allow view access
  }
  
  console.warn('[Middleware] User without marketing access attempted:', to.path)
  return navigateTo('/')
})
