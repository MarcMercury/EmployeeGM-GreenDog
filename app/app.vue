<script setup lang="ts">
/**
 * Root App Component
 * Hydrates global data on mount so it's available everywhere
 */
const { fetchGlobalData, initialized } = useAppData()
const user = useSupabaseUser()

// Hydrate the app immediately when user is authenticated
onMounted(async () => {
  if (user.value) {
    await fetchGlobalData()
  }
})

// Re-hydrate when user logs in
watch(user, async (newUser) => {
  if (newUser && !initialized.value) {
    await fetchGlobalData()
  }
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
