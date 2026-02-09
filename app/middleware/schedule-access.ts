/**
 * Schedule-Access Middleware
 * Uses AuthStore + SECTION_ACCESS.schedules_manage for role checks.
 * Relies on auth.ts middleware having populated authStore.profile.
 *
 * Allowed roles: super_admin, admin, manager, sup_admin, office_admin
 */
import { SECTION_ACCESS } from '~/types'
import type { UserRole } from '~/types'

export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore()

  if (!authStore.profile) {
    return navigateTo('/auth/login')
  }

  const role = (authStore.profile.role as UserRole) || 'user'

  if (!SECTION_ACCESS.schedules_manage.includes(role)) {
    console.warn('[Middleware:schedule-access] Access denied for role:', role, 'to path:', to.path)
    return navigateTo('/')
  }
})
