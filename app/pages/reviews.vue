<template>
  <div>
    <ReviewHub />
  </div>
</template>

<script setup lang="ts">
import ReviewHub from '~/components/performance/ReviewHub.vue'

definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

useHead({
  title: 'Performance Reviews'
})
</script>
