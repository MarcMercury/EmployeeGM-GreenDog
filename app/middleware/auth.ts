export default defineNuxtRouteMiddleware(async (to) => {
  // Skip on server to avoid hydration issues
  if (import.meta.server) return
  
  const user = useSupabaseUser()
  
  // Public routes that don't require auth
  const publicRoutes = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/confirm']
  const isPublicRoute = publicRoutes.some(route => to.path.startsWith(route)) || to.path.startsWith('/auth/')
  
  if (isPublicRoute) {
    // If logged in and trying to access auth pages, redirect to home
    if (user.value) {
      return navigateTo('/', { replace: true })
    }
    return
  }

  // All other routes require authentication
  if (!user.value) {
    console.log('No user found, redirecting to login')
    return navigateTo('/auth/login', { replace: true })
  }
})
