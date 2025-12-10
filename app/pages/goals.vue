<template>
  <div>
    <GoalTracker />
  </div>
</template>

<script setup lang="ts">
import GoalTracker from '~/components/performance/GoalTracker.vue'

definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

useHead({
  title: 'My Goals'
})
</script>
