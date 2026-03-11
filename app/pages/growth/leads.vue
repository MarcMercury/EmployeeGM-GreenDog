<script setup lang="ts">
// Redirect to combined Events page, leads tab
definePageMeta({
  middleware: [(to, from) => navigateTo('/growth/events?tab=leads', { replace: true })]
})
</script>

<template>
  <div class="d-flex justify-center align-center min-h-50vh">
    <v-progress-circular indeterminate color="primary" />
  </div>
</template>
