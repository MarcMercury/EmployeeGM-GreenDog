<template>
  <div />
</template>

<script setup lang="ts">
// Wiki has been moved to top-level /wiki route
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

// Redirect to new wiki location
const router = useRouter()
onMounted(() => {
  router.replace('/wiki')
})
</script>
