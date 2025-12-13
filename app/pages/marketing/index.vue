<script setup lang="ts">
// Redirect to new Growth module location
definePageMeta({
  middleware: [(to, from) => navigateTo('/growth/campaigns', { replace: true })]
})
</script>

<template>
  <div class="d-flex justify-center align-center" style="min-height: 50vh">
    <v-progress-circular indeterminate color="primary" />
  </div>
</template>
