<template>
  <div class="d-flex justify-center align-center" style="min-height: 70vh;">
    <!-- Loading while resolving employee ID -->
    <div v-if="!error" class="text-center">
      <v-progress-circular indeterminate color="primary" size="64" />
      <p class="text-body-1 text-grey-darken-1 mt-4">Loading your profile...</p>
    </div>

    <!-- Fallback if no employee record found -->
    <v-card v-else class="pa-8 text-center" max-width="480" rounded="xl" elevation="2">
      <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-account-alert</v-icon>
      <h2 class="text-h5 font-weight-bold mb-2">Profile Not Found</h2>
      <p class="text-body-1 text-grey-darken-1 mb-6">
        Your user account isn't linked to an employee record yet. Please contact an administrator.
      </p>
      <v-btn color="primary" variant="tonal" to="/activity" prepend-icon="mdi-home">
        Go to Activity Hub
      </v-btn>
    </v-card>
  </div>
</template>

<script setup lang="ts">
/**
 * /profile — Redirect stub
 * 
 * The comprehensive profile lives at /roster/[id].vue (3500+ lines, 11 tabs:
 * Overview, Personal, Compensation, PTO, Skills, Goals, Reviews, Attendance,
 * History, Documents, Assets).
 * 
 * This page resolves the current user's employee ID and redirects to their
 * roster profile. Only shows fallback UI if no employee record is linked.
 */
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

const userStore = useUserStore()
const route = useRoute()
const error = ref(false)

// Resolve employee ID and redirect immediately
onMounted(async () => {
  // Ensure user data is loaded
  if (!userStore.employee?.id) {
    await userStore.fetchUserData()
  }

  let employeeId = userStore.employee?.id

  // Fallback: if UserStore couldn't resolve (406 / no link), try useAppData's cached employees
  if (!employeeId) {
    try {
      const { employees, fetchGlobalData } = useAppData()
      if (!employees.value?.length) {
        await fetchGlobalData()
      }
      const email = userStore.profile?.email
      const firstName = userStore.profile?.first_name
      const lastName = userStore.profile?.last_name
      
      const match = employees.value?.find((e: any) =>
        (email && e.email_work === email) ||
        (firstName && lastName && 
         e.first_name?.toLowerCase() === firstName.toLowerCase() && 
         e.last_name?.toLowerCase() === lastName.toLowerCase())
      )
      if (match) employeeId = match.id
    } catch (e) {
      console.warn('[ProfilePage] AppData fallback failed:', e)
    }
  }

  if (employeeId) {
    // Preserve any ?tab= query param for deep-linking
    const query = route.query.tab ? `?tab=${route.query.tab}` : ''
    await navigateTo(`/roster/${employeeId}${query}`, { replace: true })
    return
  }

  // No employee record — show fallback
  console.warn('[ProfilePage] No employee record linked to this user')
  error.value = true
})
</script>
