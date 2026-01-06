<script setup lang="ts">
// Redirect to partners page (influencers are managed within partners)
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'marketing-admin']
})

const router = useRouter()

// Redirect to partners page - influencers are shown in the combined list
onMounted(() => {
  router.replace('/marketing/partners?filter=influencer')
})
</script>

<template>
  <div class="d-flex align-center justify-center" style="min-height: 50vh;">
    <v-progress-circular indeterminate color="secondary" />
    <span class="ml-4 text-medium-emphasis">Redirecting to Partners...</span>
  </div>
</template>
