<template>
  <div />
</template>

<script setup lang="ts">
/**
 * Legacy employees page — redirects to /roster
 * The roster page is the active team directory with proper role-based access.
 */
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

await navigateTo('/roster', { redirectCode: 301 })
</script>
