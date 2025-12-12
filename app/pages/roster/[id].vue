<template>
  <div class="redirect-page d-flex justify-center align-center" style="min-height: 60vh;">
    <v-progress-circular indeterminate color="primary" size="64" />
  </div>
</template>

<script setup lang="ts">
/**
 * Roster Profile Redirect
 * 
 * This page now redirects to /employees/[id] for a unified profile experience.
 * All employee profiles use the same Ultimate Employee Profile v2 design.
 */

definePageMeta({
  middleware: ['auth']
})

const route = useRoute()

// Redirect to the unified employee profile page
onMounted(async () => {
  const employeeId = route.params.id
  await navigateTo(`/employees/${employeeId}`, { replace: true })
})
</script>
