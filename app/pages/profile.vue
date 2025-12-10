<template>
  <NuxtPage />
</template>

<script setup lang="ts">
// Profile page redirects to employee detail
const authStore = useAuthStore()
const router = useRouter()

onMounted(() => {
  if (authStore.profile?.id) {
    router.replace(`/employees/${authStore.profile.id}`)
  }
})
</script>
