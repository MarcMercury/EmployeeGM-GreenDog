// Auth middleware - protects routes requiring authentication
export default defineNuxtRouteMiddleware(async (to) => {
  // Public routes that don't require auth
  const publicPaths = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/confirm']
  
  // Allow access to public/auth pages without checking
  if (publicPaths.includes(to.path) || to.path.startsWith('/auth/')) {
    return
  }

  // Check session directly (more reliable than useSupabaseUser)
  const supabase = useSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  // Redirect unauthenticated users to login
  if (!session) {
    return navigateTo('/auth/login')
  }
})
