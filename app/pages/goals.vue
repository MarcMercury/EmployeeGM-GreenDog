<template>
  <div />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: [(to, from) => navigateTo('/development?tab=goals', { replace: true })]
})
</script>
