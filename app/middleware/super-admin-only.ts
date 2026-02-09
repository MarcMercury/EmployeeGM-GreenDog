/**
 * Super Admin Only Middleware
 * Blocks all users except super_admin from accessing protected routes.
 * Relies on auth.ts middleware having populated authStore.profile.
 *
 * Allowed roles: super_admin ONLY
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore()

  if (!authStore.profile) {
    return navigateTo('/auth/login')
  }

  if (authStore.profile.role !== 'super_admin') {
    console.warn('[Middleware:super-admin-only] Access denied for role:', authStore.profile.role, 'to path:', to.path)
    return navigateTo('/')
  }
})
