<template>
  <v-container fluid>
    <v-row>
      <!-- Filter Sidebar -->
      <v-col cols="12" md="3">
        <v-card class="sticky-filters">
          <v-card-title class="d-flex align-center">
            <v-icon start>mdi-filter</v-icon>
            Filters
          </v-card-title>
          <v-card-text>
            <!-- Search -->
            <v-text-field
              v-model="searchQuery"
              label="Search courses"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              clearable
              hide-details
              class="mb-4"
            />

            <!-- Category Filter -->
            <div class="text-subtitle-2 mb-2">Category</div>
            <v-chip-group
              v-model="selectedCategories"
              multiple
              column
              class="mb-4"
            >
              <v-chip
                v-for="category in categories"
                :key="category"
                :value="category"
                filter
                variant="outlined"
                size="small"
              >
                {{ category }}
              </v-chip>
            </v-chip-group>

            <!-- Status Filter -->
            <div class="text-subtitle-2 mb-2">Status</div>
            <v-chip-group
              v-model="selectedStatus"
              column
              class="mb-4"
            >
              <v-chip value="all" filter variant="outlined" size="small">
                All
              </v-chip>
              <v-chip value="enrolled" filter variant="outlined" size="small">
                Enrolled
              </v-chip>
              <v-chip value="completed" filter variant="outlined" size="small">
                Completed
              </v-chip>
              <v-chip value="available" filter variant="outlined" size="small">
                Available
              </v-chip>
            </v-chip-group>

            <!-- Required Filter -->
            <v-switch
              v-model="showMandatoryOnly"
              label="Required courses only"
              color="primary"
              density="compact"
              hide-details
            />
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Course Grid -->
      <v-col cols="12" md="9">
        <!-- Skill Filter Banner -->
        <v-alert
          v-if="filterBySkillId"
          type="info"
          variant="tonal"
          class="mb-4"
          closable
          @click:close="clearSkillFilter"
        >
          <div class="d-flex align-center">
            <v-icon class="mr-2">mdi-filter</v-icon>
            Showing courses for skill: <strong class="ml-1">{{ filterSkillName || 'Loading...' }}</strong>
            <v-btn variant="text" size="small" class="ml-2" @click="clearSkillFilter">
              Show All Courses
            </v-btn>
          </div>
        </v-alert>

        <!-- Header Stats -->
        <UiStatsRow
          :stats="[
            { value: totalCourses, label: 'Total Courses', color: 'primary' },
            { value: enrolledCount, label: 'In Progress', color: 'info' },
            { value: completedCount, label: 'Completed', color: 'success' },
            { value: dueCount, label: 'Due Soon', color: 'warning' }
          ]"
          layout="4-col"
        />

        <!-- Loading State -->
        <div v-if="loading" class="d-flex justify-center pa-8">
          <v-progress-circular indeterminate color="primary" size="64" />
        </div>

        <!-- Empty State -->
        <v-card v-else-if="filteredCourses.length === 0" class="text-center pa-8">
          <v-icon size="64" color="grey-lighten-1">mdi-book-search</v-icon>
          <div class="text-h6 mt-4">
            {{ filterBySkillId ? 'No courses available for this skill yet' : 'No courses found' }}
          </div>
          <div class="text-body-2 text-grey">
            {{ filterBySkillId ? 'Check back later or browse all courses' : 'Try adjusting your filters' }}
          </div>
          <v-btn v-if="filterBySkillId" variant="tonal" color="primary" class="mt-4" @click="clearSkillFilter">
            Browse All Courses
          </v-btn>
        </v-card>

        <!-- Course Cards -->
        <v-row v-else>
          <v-col
            v-for="course in filteredCourses"
            :key="course.id"
            cols="12"
            sm="6"
            lg="4"
          >
            <v-card
              class="course-card h-100 d-flex flex-column"
              :class="{ 'border-warning': isOverdue(course) }"
              hover
            >
              <!-- Course Image/Header -->
              <div
                class="course-header"
                :style="{ backgroundColor: getCategoryColor(course.category) }"
              >
                <v-icon size="48" color="white">
                  {{ getCategoryIcon(course.category) }}
                </v-icon>
                
                <!-- Status Badge -->
                <v-chip
                  :color="getStatusColor(course)"
                  size="small"
                  class="status-badge"
                >
                  {{ getStatusText(course) }}
                </v-chip>

                <!-- Required Badge -->
                <v-chip
                  v-if="course.is_required_for_role"
                  color="error"
                  size="x-small"
                  class="required-badge"
                >
                  Required
                </v-chip>
              </div>

              <v-card-title class="text-subtitle-1">
                {{ course.title }}
              </v-card-title>

              <v-card-subtitle>
                <v-chip size="x-small" variant="text" class="px-0">
                  {{ course.code }}
                </v-chip>
                <span class="mx-1">•</span>
                {{ course.category }}
              </v-card-subtitle>

              <v-card-text class="flex-grow-1">
                <p class="text-body-2 course-description">
                  {{ course.description }}
                </p>

                <!-- Course Meta -->
                <div class="d-flex align-center text-caption text-grey mt-2">
                  <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>
                  {{ course.estimated_hours }}h
                  <span class="mx-2">•</span>
                  <v-icon size="small" class="mr-1">mdi-book-open-page-variant</v-icon>
                  {{ getLessonCount(course.id) }} lessons
                </div>

                <!-- Skill Award Badge -->
                <v-chip
                  v-if="course.skill_name"
                  color="secondary"
                  variant="tonal"
                  size="small"
                  class="mt-2"
                  prepend-icon="mdi-star-circle"
                >
                  Awards: {{ course.skill_name }} (Level {{ course.skill_level_awarded }})
                </v-chip>

                <!-- Progress Bar (if enrolled) -->
                <div v-if="getEnrollment(course.id)" class="mt-3">
                  <div class="d-flex justify-space-between text-caption mb-1">
                    <span>Progress</span>
                    <span>{{ getCourseProgress(course.id) }}%</span>
                  </div>
                  <v-progress-linear
                    :model-value="getCourseProgress(course.id)"
                    :color="getCourseProgress(course.id) === 100 ? 'success' : 'primary'"
                    height="8"
                    rounded
                  />
                </div>

                <!-- Due Date Warning -->
                <v-alert
                  v-if="isOverdue(course)"
                  type="warning"
                  density="compact"
                  variant="tonal"
                  class="mt-3"
                >
                  <template #prepend>
                    <v-icon size="small">mdi-alert</v-icon>
                  </template>
                  Due {{ formatDueDate(course) }}
                </v-alert>
              </v-card-text>

              <v-card-actions>
                <v-btn
                  v-if="!getEnrollment(course.id)"
                  color="primary"
                  variant="elevated"
                  block
                  @click="handleEnroll(course)"
                  :loading="enrollingId === course.id"
                >
                  <v-icon start>mdi-plus</v-icon>
                  Enroll
                </v-btn>
                <v-btn
                  v-else-if="getCourseProgress(course.id) === 100"
                  color="success"
                  variant="tonal"
                  block
                  @click="viewCourse(course)"
                >
                  <v-icon start>mdi-check-circle</v-icon>
                  Review
                </v-btn>
                <v-btn
                  v-else
                  color="primary"
                  variant="elevated"
                  block
                  @click="viewCourse(course)"
                >
                  <v-icon start>mdi-play</v-icon>
                  Continue
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAcademyCoursesStore } from '~/stores/academyCourses'
import { useAcademyProgressStore } from '~/stores/academyProgress'
import { useRouter, useRoute } from 'vue-router'

const coursesStore = useAcademyCoursesStore()
const progressStore = useAcademyProgressStore()
const router = useRouter()
const route = useRoute()

// State
const searchQuery = ref('')
const selectedCategories = ref<string[]>([])
const selectedStatus = ref('all')
const showMandatoryOnly = ref(false)
const enrollingId = ref<string | null>(null)

// Skill filter from query param (set by SkillsTab links)
const filterBySkillId = ref<string | null>(null)
const filterSkillName = ref<string | null>(null)

// Computed
const loading = computed(() => coursesStore.isLoading)

const categories = computed(() => {
  const cats = new Set(coursesStore.courses.map(c => c.category).filter(Boolean))
  return Array.from(cats).sort()
})

const totalCourses = computed(() => coursesStore.courses.length)
const enrolledCount = computed(() => coursesStore.enrolledCourses.length)
const completedCount = computed(() => coursesStore.completedCourses.length)
const dueCount = computed(() => coursesStore.dueCoursesCount)

const filteredCourses = computed(() => {
  let courses = [...coursesStore.courses]

  // Skill filter (from ?skill= query param — shows only courses for that skill)
  if (filterBySkillId.value) {
    courses = courses.filter(c => c.skill_id === filterBySkillId.value)
  }

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    courses = courses.filter(c => 
      c.title.toLowerCase().includes(query) ||
      c.code?.toLowerCase().includes(query) ||
      c.description?.toLowerCase().includes(query)
    )
  }

  // Category filter
  if (selectedCategories.value.length > 0) {
    courses = courses.filter(c => selectedCategories.value.includes(c.category))
  }

  // Status filter
  if (selectedStatus.value !== 'all') {
    courses = courses.filter(c => {
      const enrollment = getEnrollment(c.id)
      const progress = getCourseProgress(c.id)
      
      switch (selectedStatus.value) {
        case 'enrolled':
          return enrollment && progress < 100
        case 'completed':
          return progress === 100
        case 'available':
          return !enrollment
        default:
          return true
      }
    })
  }

  // Mandatory filter
  if (showMandatoryOnly.value) {
    courses = courses.filter(c => c.is_required_for_role)
  }

  return courses
})

// Methods
function getEnrollment(courseId: string) {
  return coursesStore.enrollments.find(e => e.course_id === courseId)
}

function getCourseProgress(courseId: string): number {
  return progressStore.courseProgress(courseId)
}

function getLessonCount(courseId: string): number {
  return progressStore.lessons.filter(l => l.course_id === courseId).length || '?'
}

function isOverdue(course: any): boolean {
  const enrollment = getEnrollment(course.id)
  if (!enrollment?.due_date) return false
  return new Date(enrollment.due_date) < new Date() && getCourseProgress(course.id) < 100
}

function formatDueDate(course: any): string {
  const enrollment = getEnrollment(course.id)
  if (!enrollment?.due_date) return ''
  const date = new Date(enrollment.due_date)
  const now = new Date()
  const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diff < 0) return `${Math.abs(diff)} days overdue`
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  return `in ${diff} days`
}

function getStatusColor(course: any): string {
  const enrollment = getEnrollment(course.id)
  if (!enrollment) return 'grey'
  const progress = getCourseProgress(course.id)
  if (progress === 100) return 'success'
  if (isOverdue(course)) return 'warning'
  return 'info'
}

function getStatusText(course: any): string {
  const enrollment = getEnrollment(course.id)
  if (!enrollment) return 'Not Started'
  const progress = getCourseProgress(course.id)
  if (progress === 100) return 'Completed'
  if (progress > 0) return `${progress}%`
  return 'Enrolled'
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'Safety': '#E53935',
    'Compliance': '#1E88E5',
    'Technical': '#43A047',
    'Leadership': '#8E24AA',
    'Customer Service': '#FB8C00',
    'Product Knowledge': '#00ACC1',
    'Onboarding': '#5E35B1'
  }
  return colors[category] || '#78909C'
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'Safety': 'mdi-shield-check',
    'Compliance': 'mdi-clipboard-check',
    'Technical': 'mdi-wrench',
    'Leadership': 'mdi-account-star',
    'Customer Service': 'mdi-account-heart',
    'Product Knowledge': 'mdi-package-variant',
    'Onboarding': 'mdi-account-plus'
  }
  return icons[category] || 'mdi-book'
}

async function handleEnroll(course: any) {
  enrollingId.value = course.id
  try {
    await coursesStore.enrollInCourseSimple(course.id)
  } finally {
    enrollingId.value = null
  }
}

function viewCourse(course: any) {
  router.push(`/training/${course.id}`)
}

function clearSkillFilter() {
  filterBySkillId.value = null
  filterSkillName.value = null
  // Update query params without the skill filter
  router.replace({ query: { ...route.query, skill: undefined } })
}

// Lifecycle
onMounted(async () => {
  // Read ?skill= query param for pre-filtering by skill
  const skillIdParam = route.query.skill as string | undefined
  if (skillIdParam) {
    filterBySkillId.value = skillIdParam
    // Resolve the skill name for display
    const supabase = useSupabaseClient()
    const { data: skillRow } = await supabase
      .from('skill_library')
      .select('name')
      .eq('id', skillIdParam)
      .single()
    if (skillRow) {
      filterSkillName.value = skillRow.name
    }
  }

  await Promise.all([
    coursesStore.fetchCourses(),
    coursesStore.fetchEnrollments()
  ])
})
</script>

<style scoped>
.sticky-filters {
  position: sticky;
  top: 80px;
}

.course-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.course-card:hover {
  transform: translateY(-4px);
}

.course-header {
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.status-badge {
  position: absolute;
  top: 8px;
  right: 8px;
}

.required-badge {
  position: absolute;
  top: 8px;
  left: 8px;
}

.course-description {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 60px;
}

.border-warning {
  border: 2px solid rgb(var(--v-theme-warning)) !important;
}
</style>
