<script setup lang="ts">
/**
 * Root App Component
 * Data hydration happens in the layout, not here
 * This keeps the app.vue simple
 */
const route = useRoute()
</script>

<template>
  <NuxtLayout>
    <NuxtPage :key="route.fullPath" />
  </NuxtLayout>
</template>
