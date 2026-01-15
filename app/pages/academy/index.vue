<script setup lang="ts">
// Redirect to the main academy page
definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

// Automatically redirect to the academy catalog
navigateTo('/academy/catalog', { replace: true })
</script>

<template>
  <div class="d-flex justify-center align-center" style="height: 200px">
    <v-progress-circular indeterminate color="primary" />
  </div>
</template>
