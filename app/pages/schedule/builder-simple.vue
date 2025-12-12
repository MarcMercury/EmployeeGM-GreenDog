<script setup lang="ts">
/**
 * Schedule Builder Test - No middleware version
 */
definePageMeta({
  layout: 'default'
})

console.log('[ScheduleBuilderSimple] Loaded - no middleware')
</script>

<template>
  <div class="pa-6">
    <h1 class="text-h4 mb-4">Schedule Builder Simple Test</h1>
    
    <v-alert type="success">
      If you can see this, the page route works!
    </v-alert>
  </div>
</template>
