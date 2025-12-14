<script setup lang="ts">
// Redirect to Marketing Calendar (main landing page for Marketing)
definePageMeta({
  middleware: [(to, from) => navigateTo('/marketing/calendar', { replace: true })]
})
</script>

<template>
  <div class="d-flex justify-center align-center" style="min-height: 50vh">
    <v-progress-circular indeterminate color="primary" />
  </div>
</template>
