<script setup lang="ts">
// Redirect to the my-training page for training overview
definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

// Automatically redirect to my-training page
navigateTo('/academy/my-training', { replace: true })
</script>

<template>
  <div class="d-flex justify-center align-center" style="height: 200px">
    <v-progress-circular indeterminate color="primary" />
  </div>
</template>
