<script setup lang="ts">
// Redirect to resources page with influencers tab
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'marketing-admin']
})

const router = useRouter()

// Redirect to resources page with influencers tab
onMounted(() => {
  router.replace('/marketing/resources?tab=influencers')
})
</script>

<template>
  <div class="d-flex align-center justify-center" style="min-height: 50vh;">
    <v-progress-circular indeterminate color="secondary" />
    <span class="ml-4 text-medium-emphasis">Redirecting to Resources...</span>
  </div>
</template>
