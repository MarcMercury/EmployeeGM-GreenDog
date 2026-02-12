<template>
  <div class="d-flex justify-center align-center min-h-50vh">
    <v-progress-circular indeterminate color="primary" />
  </div>
</template>

<script setup lang="ts">
/**
 * development.vue — Redirect Stub
 * 
 * Skills, Goals, Reviews & Mentorship are now consolidated into the
 * Profile / Roster page tabs. This page redirects users to their
 * profile with the appropriate tab pre-selected.
 * 
 * Query param mapping:
 *   ?tab=goals   → /roster/{id}?tab=goals
 *   ?tab=reviews → /roster/{id}?tab=reviews
 *   (default)    → /roster/{id}?tab=skills
 */
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

const route = useRoute()
const userStore = useUserStore()

onMounted(() => {
  const empId = userStore.employee?.id
  const tabParam = route.query.tab as string
  
  // Map old development tabs to new profile tabs
  const tabMap: Record<string, string> = {
    goals: 'goals',
    reviews: 'reviews',
    growth: 'skills'
  }
  const targetTab = tabMap[tabParam] || 'skills'

  if (empId) {
    navigateTo(`/roster/${empId}?tab=${targetTab}`, { replace: true })
  } else {
    navigateTo('/profile', { replace: true })
  }
})
</script>
