<template>
  <div>
    <FeedbackStream />
  </div>
</template>

<script setup lang="ts">
import FeedbackStream from '~/components/performance/FeedbackStream.vue'

definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

useHead({
  title: 'Feedback'
})
</script>
