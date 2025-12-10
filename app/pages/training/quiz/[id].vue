<template>
  <QuizEngine v-if="quizId" :quiz-id="quizId" />
</template>

<script setup lang="ts">
import QuizEngine from '~/components/academy/QuizEngine.vue'

const route = useRoute()
const quizId = computed(() => route.params.id as string)

// Set page metadata
definePageMeta({
  middleware: ['auth']
})

useHead({
  title: 'Training - Quiz'
})
</script>
