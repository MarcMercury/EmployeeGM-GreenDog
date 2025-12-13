<template>
  <div />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: [(to, from) => navigateTo('/development', { replace: true })]
})
</script>
