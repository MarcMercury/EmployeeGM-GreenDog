<template>
  <v-container class="quiz-container" max-width="800">
    <!-- Loading State -->
    <div v-if="loading" class="d-flex align-center justify-center py-16">
      <v-progress-circular indeterminate color="primary" size="64" />
    </div>

    <!-- Quiz Not Found -->
    <v-card v-else-if="!quiz" class="text-center pa-8">
      <v-icon size="64" color="error">mdi-alert-circle</v-icon>
      <h2 class="text-h5 mt-4">Quiz Not Found</h2>
      <v-btn color="primary" class="mt-4" @click="goBack">
        Return to Course
      </v-btn>
    </v-card>

    <!-- Quiz Results -->
    <v-card v-else-if="showResults" class="quiz-results">
      <v-card-text class="text-center pa-8">
        <!-- Result Icon -->
        <v-avatar
          :color="passed ? 'success' : 'error'"
          size="120"
          class="mb-4"
        >
          <v-icon size="64" color="white">
            {{ passed ? 'mdi-trophy' : 'mdi-close' }}
          </v-icon>
        </v-avatar>

        <h1 class="text-h3 mb-2">
          {{ passed ? 'Congratulations!' : 'Not Quite' }}
        </h1>

        <p class="text-h5 text-grey mb-4">
          {{ passed ? 'You passed the assessment!' : 'Keep studying and try again' }}
        </p>

        <!-- Score Display -->
        <v-card
          :color="passed ? 'success' : 'error'"
          variant="tonal"
          class="mx-auto mb-6"
          max-width="300"
        >
          <v-card-text class="text-center">
            <div class="text-overline">Your Score</div>
            <div class="text-h2">{{ score }}%</div>
            <div class="text-caption">
              Passing: {{ quiz.passing_score }}%
            </div>
          </v-card-text>
        </v-card>

        <!-- Results Breakdown -->
        <v-row class="mb-6" justify="center">
          <v-col cols="4">
            <v-card variant="outlined" class="text-center pa-3">
              <v-icon color="success" size="large">mdi-check-circle</v-icon>
              <div class="text-h5">{{ correctCount }}</div>
              <div class="text-caption">Correct</div>
            </v-card>
          </v-col>
          <v-col cols="4">
            <v-card variant="outlined" class="text-center pa-3">
              <v-icon color="error" size="large">mdi-close-circle</v-icon>
              <div class="text-h5">{{ incorrectCount }}</div>
              <div class="text-caption">Incorrect</div>
            </v-card>
          </v-col>
          <v-col cols="4">
            <v-card variant="outlined" class="text-center pa-3">
              <v-icon color="grey" size="large">mdi-help-circle</v-icon>
              <div class="text-h5">{{ skippedCount }}</div>
              <div class="text-caption">Skipped</div>
            </v-card>
          </v-col>
        </v-row>

        <!-- Certification Awarded -->
        <v-alert
          v-if="certificationAwarded"
          type="success"
          variant="tonal"
          class="mb-6"
          prominent
        >
          <template #prepend>
            <v-icon size="large">mdi-certificate</v-icon>
          </template>
          <div class="text-h6">Certification Earned!</div>
          <div>You've earned the course certification. Check your profile to view it.</div>
        </v-alert>

        <!-- Review Answers Toggle -->
        <v-expansion-panels v-model="reviewPanel" class="mb-6">
          <v-expansion-panel title="Review Your Answers">
            <v-expansion-panel-text>
              <v-list>
                <v-list-item
                  v-for="(question, index) in questions"
                  :key="question.id"
                  :class="isAnswerCorrect(question) ? 'bg-success-lighten-5' : 'bg-error-lighten-5'"
                  class="mb-2 rounded"
                >
                  <template #prepend>
                    <v-icon :color="isAnswerCorrect(question) ? 'success' : 'error'">
                      {{ isAnswerCorrect(question) ? 'mdi-check-circle' : 'mdi-close-circle' }}
                    </v-icon>
                  </template>
                  <v-list-item-title class="text-body-2 font-weight-medium">
                    {{ index + 1 }}. {{ question.question_text }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption">
                    Your answer: {{ formatAnswer(answers[question.id]) }}
                    <span v-if="!isAnswerCorrect(question)" class="text-success ml-2">
                      Correct: {{ formatAnswer(question.correct_answer) }}
                    </span>
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <!-- Actions -->
        <div class="d-flex justify-center gap-4">
          <v-btn
            v-if="!passed"
            color="primary"
            variant="elevated"
            size="large"
            @click="retakeQuiz"
          >
            <v-icon start>mdi-refresh</v-icon>
            Try Again
          </v-btn>
          <v-btn
            :color="passed ? 'primary' : 'grey'"
            :variant="passed ? 'elevated' : 'text'"
            size="large"
            @click="goBack"
          >
            Return to Course
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Active Quiz -->
    <template v-else>
      <!-- Quiz Header -->
      <v-card class="mb-4">
        <v-card-title class="d-flex align-center">
          <v-btn
            icon="mdi-arrow-left"
            variant="text"
            size="small"
            @click="confirmExit"
          />
          <span class="ml-2">{{ quiz.title }}</span>
          <v-spacer />
          <v-chip color="primary" variant="tonal">
            {{ currentQuestionIndex + 1 }} / {{ questions.length }}
          </v-chip>
        </v-card-title>

        <!-- Progress Bar -->
        <v-progress-linear
          :model-value="progressPercent"
          color="primary"
          height="4"
        />
      </v-card>

      <!-- Instructions (before starting) -->
      <v-card v-if="!started" class="text-center pa-8">
        <v-icon size="64" color="primary" class="mb-4">mdi-clipboard-text</v-icon>
        <h2 class="text-h4 mb-4">{{ quiz.title }}</h2>
        
        <p v-if="quiz.instructions" class="text-body-1 mb-6">
          {{ quiz.instructions }}
        </p>

        <v-card variant="outlined" class="mx-auto mb-6" max-width="400">
          <v-list density="compact">
            <v-list-item>
              <template #prepend>
                <v-icon color="primary">mdi-help-circle</v-icon>
              </template>
              <v-list-item-title>{{ questions.length }} Questions</v-list-item-title>
            </v-list-item>
            <v-list-item>
              <template #prepend>
                <v-icon color="success">mdi-check-circle</v-icon>
              </template>
              <v-list-item-title>{{ quiz.passing_score }}% to Pass</v-list-item-title>
            </v-list-item>
            <v-list-item>
              <template #prepend>
                <v-icon color="info">mdi-information</v-icon>
              </template>
              <v-list-item-title>Unlimited Attempts</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>

        <v-btn
          color="primary"
          size="x-large"
          @click="startQuiz"
        >
          <v-icon start>mdi-play</v-icon>
          Begin Assessment
        </v-btn>
      </v-card>

      <!-- Question Card -->
      <v-card v-else class="question-card">
        <v-card-text class="pa-6">
          <!-- Question Text -->
          <h2 class="text-h5 mb-6">
            {{ currentQuestion.question_text }}
          </h2>

          <!-- Multiple Choice -->
          <v-radio-group
            v-if="currentQuestion.question_type === 'multiple_choice'"
            v-model="answers[currentQuestion.id]"
            class="answer-options"
          >
            <v-radio
              v-for="(option, index) in currentQuestion.options"
              :key="index"
              :value="option"
              :label="option"
              class="answer-option mb-2"
            />
          </v-radio-group>

          <!-- Multi-Select -->
          <div v-else-if="currentQuestion.question_type === 'multi_select'" class="answer-options">
            <v-checkbox
              v-for="(option, index) in currentQuestion.options"
              :key="index"
              :value="option"
              :label="option"
              v-model="answers[currentQuestion.id]"
              hide-details
              class="answer-option mb-2"
            />
          </div>

          <!-- True/False -->
          <v-radio-group
            v-else-if="currentQuestion.question_type === 'true_false'"
            v-model="answers[currentQuestion.id]"
            class="answer-options"
          >
            <v-radio value="true" label="True" class="answer-option mb-2" />
            <v-radio value="false" label="False" class="answer-option mb-2" />
          </v-radio-group>

          <!-- Short Answer -->
          <v-textarea
            v-else-if="currentQuestion.question_type === 'short_answer'"
            v-model="answers[currentQuestion.id]"
            label="Your Answer"
            variant="outlined"
            rows="3"
            class="mt-4"
          />
        </v-card-text>

        <v-divider />

        <!-- Navigation -->
        <v-card-actions class="pa-4">
          <v-btn
            :disabled="currentQuestionIndex === 0"
            variant="text"
            @click="previousQuestion"
          >
            <v-icon start>mdi-chevron-left</v-icon>
            Previous
          </v-btn>

          <v-spacer />

          <!-- Question Indicators -->
          <div class="question-indicators d-none d-sm-flex gap-1">
            <v-btn
              v-for="(q, index) in questions"
              :key="q.id"
              :color="getIndicatorColor(q, index)"
              :variant="currentQuestionIndex === index ? 'elevated' : 'tonal'"
              size="x-small"
              icon
              @click="goToQuestion(index)"
            >
              {{ index + 1 }}
            </v-btn>
          </div>

          <v-spacer />

          <v-btn
            v-if="currentQuestionIndex < questions.length - 1"
            color="primary"
            variant="elevated"
            @click="nextQuestion"
          >
            Next
            <v-icon end>mdi-chevron-right</v-icon>
          </v-btn>

          <v-btn
            v-else
            color="success"
            variant="elevated"
            @click="submitQuiz"
            :loading="submitting"
          >
            Submit
            <v-icon end>mdi-check</v-icon>
          </v-btn>
        </v-card-actions>
      </v-card>

      <!-- Unanswered Warning -->
      <v-alert
        v-if="started && unansweredCount > 0"
        type="info"
        variant="tonal"
        class="mt-4"
      >
        {{ unansweredCount }} question{{ unansweredCount > 1 ? 's' : '' }} unanswered
      </v-alert>
    </template>

    <!-- Exit Confirmation Dialog -->
    <v-dialog v-model="exitDialog" max-width="400">
      <v-card>
        <v-card-title>Exit Quiz?</v-card-title>
        <v-card-text>
          Your progress will not be saved. Are you sure you want to exit?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="exitDialog = false">
            Continue Quiz
          </v-btn>
          <v-btn color="error" variant="tonal" @click="goBack">
            Exit
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAcademyStore } from '~/stores/academy'
import { useRouter } from 'vue-router'

const props = defineProps<{
  quizId: string
}>()

const academyStore = useAcademyStore()
const router = useRouter()

// State
const started = ref(false)
const showResults = ref(false)
const submitting = ref(false)
const currentQuestionIndex = ref(0)
const answers = ref<Record<string, any>>({})
const score = ref(0)
const passed = ref(false)
const certificationAwarded = ref(false)
const reviewPanel = ref<number | undefined>(undefined)
const exitDialog = ref(false)

// Computed
const loading = computed(() => academyStore.loading)
const quiz = computed(() => academyStore.currentQuiz)
const questions = computed(() => academyStore.currentQuizQuestions)

const currentQuestion = computed(() => questions.value[currentQuestionIndex.value])

const progressPercent = computed(() => {
  if (questions.value.length === 0) return 0
  return ((currentQuestionIndex.value + 1) / questions.value.length) * 100
})

const answeredCount = computed(() => {
  return Object.keys(answers.value).filter(key => {
    const val = answers.value[key]
    if (Array.isArray(val)) return val.length > 0
    return val !== undefined && val !== null && val !== ''
  }).length
})

const unansweredCount = computed(() => questions.value.length - answeredCount.value)

const correctCount = computed(() => {
  return questions.value.filter(q => isAnswerCorrect(q)).length
})

const incorrectCount = computed(() => {
  return questions.value.filter(q => {
    const answer = answers.value[q.id]
    if (!answer || (Array.isArray(answer) && answer.length === 0)) return false
    return !isAnswerCorrect(q)
  }).length
})

const skippedCount = computed(() => {
  return questions.value.filter(q => {
    const answer = answers.value[q.id]
    return !answer || (Array.isArray(answer) && answer.length === 0)
  }).length
})

// Methods
function startQuiz() {
  started.value = true
  currentQuestionIndex.value = 0
  answers.value = {}
  
  // Initialize multi-select answers as arrays
  questions.value.forEach(q => {
    if (q.question_type === 'multi_select') {
      answers.value[q.id] = []
    }
  })
}

function previousQuestion() {
  if (currentQuestionIndex.value > 0) {
    currentQuestionIndex.value--
  }
}

function nextQuestion() {
  if (currentQuestionIndex.value < questions.value.length - 1) {
    currentQuestionIndex.value++
  }
}

function goToQuestion(index: number) {
  currentQuestionIndex.value = index
}

function getIndicatorColor(question: any, index: number): string {
  const answer = answers.value[question.id]
  const hasAnswer = answer && (!Array.isArray(answer) || answer.length > 0)
  
  if (currentQuestionIndex.value === index) return 'primary'
  if (hasAnswer) return 'success'
  return 'grey'
}

function isAnswerCorrect(question: any): boolean {
  const userAnswer = answers.value[question.id]
  const correctAnswer = question.correct_answer
  
  if (!userAnswer) return false
  
  // Handle array comparison for multi-select
  if (Array.isArray(correctAnswer)) {
    if (!Array.isArray(userAnswer)) return false
    if (correctAnswer.length !== userAnswer.length) return false
    return correctAnswer.every((ans: any) => userAnswer.includes(ans))
  }
  
  // String comparison (case-insensitive for short answer)
  if (question.question_type === 'short_answer') {
    return userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim()
  }
  
  return userAnswer === correctAnswer
}

function formatAnswer(answer: any): string {
  if (Array.isArray(answer)) return answer.join(', ')
  if (answer === null || answer === undefined) return '(no answer)'
  return String(answer)
}

async function submitQuiz() {
  if (!quiz.value) return
  
  submitting.value = true
  try {
    const result = await academyStore.submitQuiz(props.quizId, answers.value)
    
    score.value = result.score
    passed.value = result.passed
    certificationAwarded.value = result.certificationAwarded || false
    showResults.value = true
  } finally {
    submitting.value = false
  }
}

function retakeQuiz() {
  showResults.value = false
  startQuiz()
}

function confirmExit() {
  if (started.value && answeredCount.value > 0) {
    exitDialog.value = true
  } else {
    goBack()
  }
}

function goBack() {
  exitDialog.value = false
  // Navigate back to course if we have courseId, otherwise to training
  if (quiz.value?.course_id) {
    router.push(`/training/${quiz.value.course_id}`)
  } else {
    router.push('/training')
  }
}

// Lifecycle
onMounted(async () => {
  await academyStore.startQuiz(props.quizId)
})
</script>

<style scoped>
.quiz-container {
  padding-top: 24px;
  padding-bottom: 48px;
}

.question-card {
  min-height: 400px;
}

.answer-options {
  margin-top: 16px;
}

.answer-option {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  padding: 12px 16px;
  transition: all 0.2s;
}

.answer-option:hover {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.question-indicators {
  flex-wrap: wrap;
  max-width: 300px;
  justify-content: center;
}

.quiz-results {
  animation: slideUp 0.5s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bg-success-lighten-5 {
  background-color: rgba(76, 175, 80, 0.1);
}

.bg-error-lighten-5 {
  background-color: rgba(244, 67, 54, 0.1);
}
</style>
