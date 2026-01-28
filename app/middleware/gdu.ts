/**
 * GDU (Green Dog University) Access Middleware
 * Allows: super_admin, admin, manager, hr_admin, sup_admin, marketing_admin
 * Use for: GDU Dashboard, Visitor CRM, CE Events, Education Content
 * 
 * Note: office_admin and user do NOT have GDU access per the Access Matrix
 * hr_admin can create courses, marketing_admin handles content management
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
  
  // Roles with GDU access - matches SECTION_ACCESS.education
  // Note: office_admin and user are explicitly excluded
  const allowedRoles = ['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'marketing_admin']
  
  if (!allowedRoles.includes(profile.role)) {
    console.warn('[Middleware] User without GDU access attempted:', to.path)
    return navigateTo('/')
  }
})
