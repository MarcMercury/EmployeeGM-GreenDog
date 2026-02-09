<template>
  <v-container fluid class="classroom-container pa-0">
    <v-row no-gutters class="fill-height">
      <!-- Table of Contents Sidebar -->
      <v-col cols="12" md="3" class="toc-sidebar">
        <v-card flat class="h-100 rounded-0">
          <!-- Course Header -->
          <v-card-title class="text-subtitle-1 bg-primary text-white">
            <v-btn
              icon="mdi-arrow-left"
              variant="text"
              size="small"
              color="white"
              @click="goBack"
            />
            {{ course?.title }}
          </v-card-title>

          <!-- Progress Summary -->
          <v-card-text class="pb-2">
            <div class="d-flex justify-space-between text-caption mb-1">
              <span>Course Progress</span>
              <span>{{ overallProgress }}%</span>
            </div>
            <v-progress-linear
              :model-value="overallProgress"
              :color="overallProgress === 100 ? 'success' : 'primary'"
              height="6"
              rounded
            />
          </v-card-text>

          <v-divider />

          <!-- Lessons List -->
          <v-list density="compact" nav class="lesson-list">
            <v-list-item
              v-for="(lesson, index) in lessons"
              :key="lesson.id"
              :value="lesson.id"
              :active="currentLesson?.id === lesson.id"
              :disabled="isLessonLocked(index)"
              @click="selectLesson(lesson, index)"
              class="lesson-item"
            >
              <template #prepend>
                <v-avatar
                  :color="getLessonStatusColor(lesson, index)"
                  size="28"
                  class="mr-2"
                >
                  <v-icon
                    v-if="isLessonCompleted(lesson)"
                    size="small"
                    color="white"
                  >
                    mdi-check
                  </v-icon>
                  <v-icon
                    v-else-if="isLessonLocked(index)"
                    size="small"
                    color="white"
                  >
                    mdi-lock
                  </v-icon>
                  <span v-else class="text-caption text-white">
                    {{ index + 1 }}
                  </span>
                </v-avatar>
              </template>

              <v-list-item-title class="text-body-2">
                {{ lesson.title }}
              </v-list-item-title>

              <template #append>
                <v-icon
                  v-if="lesson.video_url"
                  size="small"
                  color="grey"
                >
                  mdi-play-circle
                </v-icon>
              </template>
            </v-list-item>

            <!-- Final Quiz (if exists) -->
            <v-divider v-if="courseQuiz" class="my-2" />
            <v-list-item
              v-if="courseQuiz"
              :disabled="!allLessonsCompleted"
              @click="startQuiz"
              class="lesson-item"
            >
              <template #prepend>
                <v-avatar
                  :color="quizPassed ? 'success' : allLessonsCompleted ? 'warning' : 'grey'"
                  size="28"
                  class="mr-2"
                >
                  <v-icon size="small" color="white">
                    {{ quizPassed ? 'mdi-trophy' : 'mdi-help-circle' }}
                  </v-icon>
                </v-avatar>
              </template>

              <v-list-item-title class="text-body-2">
                Final Assessment
              </v-list-item-title>

              <template #append>
                <v-chip
                  v-if="quizPassed"
                  color="success"
                  size="x-small"
                >
                  Passed
                </v-chip>
                <v-chip
                  v-else-if="!allLessonsCompleted"
                  color="grey"
                  size="x-small"
                >
                  Locked
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>

      <!-- Content Viewer -->
      <v-col cols="12" md="9" class="content-viewer">
        <!-- Loading State -->
        <div v-if="loading" class="d-flex align-center justify-center fill-height">
          <v-progress-circular indeterminate color="primary" size="64" />
        </div>

        <!-- No Lesson Selected -->
        <div
          v-else-if="!currentLesson"
          class="d-flex flex-column align-center justify-center fill-height text-center pa-8"
        >
          <v-icon size="96" color="grey-lighten-1">mdi-book-open-variant</v-icon>
          <h2 class="text-h5 mt-4">Welcome to {{ course?.title }}</h2>
          <p class="text-body-1 text-grey mt-2">
            Select a lesson from the sidebar to begin learning
          </p>
          <v-btn
            v-if="lessons.length > 0"
            color="primary"
            size="large"
            class="mt-4"
            @click="selectLesson(lessons[0], 0)"
          >
            <v-icon start>mdi-play</v-icon>
            Start First Lesson
          </v-btn>
        </div>

        <!-- Lesson Content -->
        <div v-else class="lesson-content pa-6">
          <!-- Lesson Header -->
          <div class="lesson-header mb-6">
            <div class="d-flex align-center justify-space-between">
              <div>
                <div class="text-overline text-grey">
                  Lesson {{ currentLessonIndex + 1 }} of {{ lessons.length }}
                </div>
                <h1 class="text-h4">{{ currentLesson.title }}</h1>
              </div>
              <v-chip
                v-if="isLessonCompleted(currentLesson)"
                color="success"
                prepend-icon="mdi-check-circle"
              >
                Completed
              </v-chip>
            </div>
          </div>

          <!-- Video Player -->
          <v-card v-if="currentLesson.video_url" class="mb-6" elevation="2">
            <div class="video-container">
              <iframe
                v-if="isYouTubeUrl(currentLesson.video_url)"
                :src="getEmbedUrl(currentLesson.video_url)"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
                class="video-frame"
              ></iframe>
              <video
                v-else
                :src="currentLesson.video_url"
                controls
                class="video-frame"
              ></video>
            </div>
          </v-card>

          <!-- Text Content -->
          <v-card v-if="currentLesson.content" class="mb-6" elevation="1">
            <v-card-text class="lesson-text-content">
              <div v-html="renderContent(currentLesson.content)" />
            </v-card-text>
          </v-card>

          <!-- Downloadable Attachment -->
          <v-card v-if="currentLesson.file_id" class="mb-6" variant="outlined">
            <v-card-text class="d-flex align-center">
              <v-icon size="large" color="primary" class="mr-3">
                mdi-file-document
              </v-icon>
              <div class="flex-grow-1">
                <div class="text-subtitle-2">Lesson Attachment</div>
                <div class="text-caption text-grey">Download to view additional materials</div>
              </div>
              <v-btn
                color="primary"
                variant="tonal"
                @click="downloadAttachment"
              >
                <v-icon start>mdi-download</v-icon>
                Download
              </v-btn>
            </v-card-text>
          </v-card>

          <!-- Lesson Navigation -->
          <v-card class="mt-auto" variant="tonal" color="grey-lighten-4">
            <v-card-text class="d-flex align-center justify-space-between">
              <v-btn
                :disabled="currentLessonIndex === 0"
                variant="text"
                @click="previousLesson"
              >
                <v-icon start>mdi-chevron-left</v-icon>
                Previous
              </v-btn>

              <v-btn
                v-if="!isLessonCompleted(currentLesson)"
                color="success"
                variant="elevated"
                @click="markComplete"
                :loading="markingComplete"
              >
                <v-icon start>mdi-check</v-icon>
                Mark as Complete
              </v-btn>

              <v-btn
                v-if="currentLessonIndex < lessons.length - 1"
                :disabled="!isLessonCompleted(currentLesson)"
                color="primary"
                variant="elevated"
                @click="nextLesson"
              >
                Next
                <v-icon end>mdi-chevron-right</v-icon>
              </v-btn>
              <v-btn
                v-else-if="courseQuiz && allLessonsCompleted && !quizPassed"
                color="warning"
                variant="elevated"
                @click="startQuiz"
              >
                Take Final Quiz
                <v-icon end>mdi-chevron-right</v-icon>
              </v-btn>
              <v-btn
                v-else-if="allLessonsCompleted"
                color="success"
                variant="tonal"
                @click="goBack"
              >
                <v-icon start>mdi-check-circle</v-icon>
                Course Complete!
              </v-btn>
            </v-card-text>
          </v-card>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAcademyProgressStore } from '~/stores/academyProgress'
import { useAcademyQuizStore } from '~/stores/academyQuiz'
import { useRouter, useRoute } from 'vue-router'
import { marked } from 'marked'

const props = defineProps<{
  courseId: string
}>()

const progressStore = useAcademyProgressStore()
const quizStore = useAcademyQuizStore()
const router = useRouter()
const route = useRoute()

// State
const currentLessonIndex = ref(0)
const markingComplete = ref(false)

// Computed
const loading = computed(() => progressStore.isLoading)
const course = computed(() => progressStore.currentCourse)
const lessons = computed(() => 
  progressStore.lessons
    .filter(l => l.course_id === props.courseId)
    .sort((a, b) => a.position - b.position)
)
const currentLesson = computed(() => progressStore.currentLesson)

const overallProgress = computed(() => progressStore.courseProgress(props.courseId))

const courseQuiz = computed(() => 
  quizStore.quizzes.find(q => q.course_id === props.courseId && !q.lesson_id)
)

const allLessonsCompleted = computed(() => {
  return lessons.value.every(lesson => isLessonCompleted(lesson))
})

const quizPassed = computed(() => {
  if (!courseQuiz.value) return false
  const attempt = quizStore.quizAttempts.find(
    a => a.quiz_id === courseQuiz.value!.id && a.passed
  )
  return !!attempt
})

// Methods
function isLessonCompleted(lesson: any): boolean {
  const progress = progressStore.lessonProgress(lesson.id)
  return progress >= 100
}

function isLessonLocked(index: number): boolean {
  if (index === 0) return false
  // Lesson is locked if previous lesson is not completed
  const prevLesson = lessons.value[index - 1]
  return prevLesson ? !isLessonCompleted(prevLesson) : false
}

function getLessonStatusColor(lesson: any, index: number): string {
  if (isLessonCompleted(lesson)) return 'success'
  if (isLessonLocked(index)) return 'grey'
  if (currentLesson.value?.id === lesson.id) return 'primary'
  return 'grey-darken-1'
}

function selectLesson(lesson: any, index: number) {
  if (isLessonLocked(index)) return
  currentLessonIndex.value = index
  progressStore.setCurrentLesson(lesson)
}

function previousLesson() {
  if (currentLessonIndex.value > 0) {
    selectLesson(lessons.value[currentLessonIndex.value - 1], currentLessonIndex.value - 1)
  }
}

function nextLesson() {
  if (currentLessonIndex.value < lessons.value.length - 1) {
    selectLesson(lessons.value[currentLessonIndex.value + 1], currentLessonIndex.value + 1)
  }
}

async function markComplete() {
  if (!currentLesson.value) return
  markingComplete.value = true
  try {
    await progressStore.completeLesson(currentLesson.value.id)
    // Auto-advance if there's a next lesson
    if (currentLessonIndex.value < lessons.value.length - 1) {
      setTimeout(() => nextLesson(), 500)
    }
  } finally {
    markingComplete.value = false
  }
}

function startQuiz() {
  if (!courseQuiz.value || !allLessonsCompleted.value) return
  router.push(`/training/quiz/${courseQuiz.value.id}`)
}

function goBack() {
  router.push('/training')
}

function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be')
}

function getEmbedUrl(url: string): string {
  // Convert YouTube URL to embed format
  const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  if (videoIdMatch) {
    return `https://www.youtube.com/embed/${videoIdMatch[1]}`
  }
  return url
}

function renderContent(content: string): string {
  // Render markdown to HTML
  return marked(content) as string
}

async function downloadAttachment() {
  if (!currentLesson.value?.file_id) return
  
  try {
    const supabase = useSupabaseClient()
    const { data, error } = await supabase.storage
      .from('academy-files')
      .download(currentLesson.value.file_id)
    
    if (error) {
      console.error('Download error:', error)
      return
    }
    
    // Create download link
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = currentLesson.value.file_name || 'attachment'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Failed to download attachment:', err)
  }
}

// Lifecycle
onMounted(async () => {
  await progressStore.fetchLessonsForCourse(props.courseId)
  await quizStore.fetchQuizzes(props.courseId)
  await progressStore.fetchProgress()
  
  // Select first incomplete lesson or first lesson
  const firstIncomplete = lessons.value.findIndex(l => !isLessonCompleted(l))
  if (firstIncomplete >= 0) {
    selectLesson(lessons.value[firstIncomplete], firstIncomplete)
  } else if (lessons.value.length > 0) {
    selectLesson(lessons.value[0], 0)
  }
})

// Watch for route changes (lesson deep links)
watch(() => route.query.lesson, (lessonId) => {
  if (lessonId) {
    const index = lessons.value.findIndex(l => l.id === lessonId)
    if (index >= 0 && !isLessonLocked(index)) {
      selectLesson(lessons.value[index], index)
    }
  }
})
</script>

<style scoped>
.classroom-container {
  height: calc(100vh - 64px);
  overflow: hidden;
}

.toc-sidebar {
  border-right: 1px solid rgba(0, 0, 0, 0.12);
  height: 100%;
  overflow-y: auto;
}

.lesson-list {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

.lesson-item {
  border-radius: 8px !important;
  margin: 4px 8px;
}

.content-viewer {
  height: 100%;
  overflow-y: auto;
  background-color: #fafafa;
}

.lesson-content {
  max-width: 900px;
  margin: 0 auto;
}

.video-container {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  height: 0;
  overflow: hidden;
}

.video-frame {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.lesson-text-content {
  font-size: 1.1rem;
  line-height: 1.8;
}

.lesson-text-content :deep(h1),
.lesson-text-content :deep(h2),
.lesson-text-content :deep(h3) {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

.lesson-text-content :deep(p) {
  margin-bottom: 1em;
}

.lesson-text-content :deep(ul),
.lesson-text-content :deep(ol) {
  padding-left: 2em;
  margin-bottom: 1em;
}

.lesson-text-content :deep(code) {
  background-color: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.lesson-text-content :deep(pre) {
  background-color: #f5f5f5;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
}

.lesson-text-content :deep(blockquote) {
  border-left: 4px solid #1976d2;
  padding-left: 16px;
  margin-left: 0;
  color: #666;
}
</style>
