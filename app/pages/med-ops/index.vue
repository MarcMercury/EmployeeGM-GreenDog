<template>
  <div />
</template>

<script setup lang="ts">
// Med Ops content has been consolidated into the Wiki page.
// This redirect ensures breadcrumb links to /med-ops resolve properly.
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

const router = useRouter()
onMounted(() => {
  router.replace('/wiki')
})
</script>
