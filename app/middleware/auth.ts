// Auth middleware - protects routes requiring authentication
export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()
  
  // Public routes that don't require auth
  const publicPaths = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/confirm']
  
  // Allow access to public/auth pages without checking
  if (publicPaths.includes(to.path) || to.path.startsWith('/auth/')) {
    return
  }

  // Redirect unauthenticated users to login
  if (!user.value) {
    return navigateTo('/auth/login')
  }
})
