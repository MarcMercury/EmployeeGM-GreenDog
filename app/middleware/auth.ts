// Auth middleware - protects routes requiring authentication
export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()
  
  // Public routes that don't require auth
  const publicPaths = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/confirm']
  
  // Check if current path is public
  if (publicPaths.includes(to.path) || to.path.startsWith('/auth/')) {
    // Redirect logged-in users away from auth pages
    if (user.value) {
      return navigateTo('/')
    }
    return
  }

  // Redirect unauthenticated users to login
  if (!user.value) {
    return navigateTo('/auth/login')
  }
})
