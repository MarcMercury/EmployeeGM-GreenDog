<template>
  <div class="d-flex justify-center align-center min-h-50vh">
    <v-progress-circular indeterminate color="primary" />
  </div>
</template>

<script setup lang="ts">
/**
 * my-skills.vue — Redirect Stub
 * 
 * The full skill scorecard is now part of the Profile / Roster page
 * Growth & Skills tab. This page redirects to the appropriate profile.
 * 
 * Supports ?employee= query param for viewing another employee's skills.
 */
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

const route = useRoute()
const userStore = useUserStore()

onMounted(() => {
  // Support ?employee= query param (used by admin links to view other employees)
  const targetId = (route.query.employee as string) || userStore.employee?.id
  
  if (targetId) {
    navigateTo(`/roster/${targetId}?tab=skills`, { replace: true })
  } else {
    navigateTo('/profile', { replace: true })
  }
})
</script>
