<script setup lang="ts">
/**
 * Root App Component
 * - Initializes API error tracking for production monitoring
 * - Data hydration happens in the layout, not here
 * - This keeps the app.vue simple
 */
const route = useRoute()

// Initialize API error tracking (automatic 404 detection & reporting)
const { getSummary } = useApiErrorTracking()

// Log summary periodically in development
if (process.dev && process.client) {
  setInterval(() => {
    const summary = getSummary()
    if (summary.totalErrors > 0) {
      console.log('📊 API Error Summary:', summary)
    }
  }, 30000) // Every 30 seconds
}
</script>

<template>
  <NuxtLayout>
    <NuxtPage :key="route.path" />
  </NuxtLayout>
</template>
