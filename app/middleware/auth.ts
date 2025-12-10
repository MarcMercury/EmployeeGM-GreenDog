// Auth middleware - protects routes that require authentication
export default defineNuxtRouteMiddleware((to) => {
  // Only run on client side
  if (import.meta.server) {
    return
  }
  
  const user = useSupabaseUser()
  
  // Public routes that don't require auth
  const isAuthRoute = to.path.startsWith('/auth')
  
  if (isAuthRoute) {
    // If logged in and trying to access auth pages, redirect to home
    if (user.value) {
      return navigateTo('/')
    }
    return
  }

  // All other routes require authentication
  if (!user.value) {
    return navigateTo('/auth/login')
  }
})
