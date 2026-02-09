<script setup lang="ts">
// Redirect to new Growth module location
definePageMeta({
  middleware: [(to, from) => navigateTo('/growth/leads', { replace: true })]
})
</script>

<template>
  <div class="d-flex justify-center align-center min-h-50vh">
    <v-progress-circular indeterminate color="primary" />
  </div>
</template>
