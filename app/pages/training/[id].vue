<template>
  <Classroom v-if="courseId" :course-id="courseId" />
</template>

<script setup lang="ts">
import Classroom from '~/components/academy/Classroom.vue'

const route = useRoute()
const courseId = computed(() => route.params.id as string)

// Set page metadata
definePageMeta({
  middleware: ['auth']
})

useHead({
  title: 'Training - Classroom'
})
</script>
