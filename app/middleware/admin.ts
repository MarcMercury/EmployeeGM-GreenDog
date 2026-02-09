/**
 * Admin Middleware (Store-based)
 * Uses AuthStore + SECTION_ACCESS for role checks with caching.
 * Relies on auth.ts middleware having populated authStore.profile.
 *
 * Allowed roles: super_admin, admin
 */
import { SECTION_ACCESS } from '~/types'
import type { UserRole } from '~/types'

export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore()

  // auth.ts should have populated the profile — fail closed if missing
  if (!authStore.profile) {
    return navigateTo('/auth/login')
  }

  const role = (authStore.profile.role as UserRole) || 'user'

  if (!SECTION_ACCESS.admin.includes(role)) {
    console.warn('[Middleware:admin] Access denied for role:', role, 'to path:', to.path)
    return navigateTo('/')
  }
})
