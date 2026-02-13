<template>
  <div class="d-flex justify-center align-center min-h-50vh">
    <v-progress-circular indeterminate color="primary" />
  </div>
</template>

<script setup lang="ts">
/**
 * skill-stats.vue — Redirect Stub
 *
 * Skill analytics and the employee skill editor are now tabs on
 * the unified Skills Management page at /admin/skills-management.
 */
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin']
})

onMounted(() => {
  navigateTo('/admin/skills-management?tab=analytics', { replace: true })
})
</script>
