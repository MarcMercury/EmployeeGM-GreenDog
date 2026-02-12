<template>
  <div class="d-flex justify-center align-center min-h-50vh">
    <v-progress-circular indeterminate color="primary" />
  </div>
</template>

<script setup lang="ts">
/**
 * skills-library.vue — Redirect Stub
 *
 * The skills library is now the "Library" tab of the unified
 * Skills Management page at /admin/skills-management.
 * Non-admin users who had bookmarks will be redirected.
 */
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

onMounted(() => {
  navigateTo('/admin/skills-management?tab=library', { replace: true })
})
</script>
