<template>
  <div class="d-flex justify-center align-center min-h-50vh">
    <v-progress-circular indeterminate color="primary" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

const userStore = useUserStore()

onMounted(() => {
  const empId = userStore.employee?.id
  if (empId) {
    navigateTo(`/roster/${empId}?tab=reviews`, { replace: true })
  } else {
    navigateTo('/profile', { replace: true })
  }
})
</script>
