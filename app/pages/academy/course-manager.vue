<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">📖 Course Manager</h1>
        <p class="text-body-1 text-grey-darken-1">
          Create and manage training courses for your team
        </p>
      </div>
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        @click="createCourseDialog = true"
      >
        Add Course
      </v-btn>
    </div>

    <!-- Stats Cards -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card rounded="lg">
          <v-card-text class="d-flex align-center gap-4">
            <v-avatar color="primary" size="48">
              <v-icon color="white">mdi-book-open-variant</v-icon>
            </v-avatar>
            <div>
              <p class="text-h5 font-weight-bold mb-0">{{ courses.length }}</p>
              <p class="text-caption text-grey">Total Courses</p>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card rounded="lg">
          <v-card-text class="d-flex align-center gap-4">
            <v-avatar color="info" size="48">
              <v-icon color="white">mdi-progress-clock</v-icon>
            </v-avatar>
            <div>
              <p class="text-h5 font-weight-bold mb-0">{{ inProgressCount }}</p>
              <p class="text-caption text-grey">In Progress</p>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card rounded="lg">
          <v-card-text class="d-flex align-center gap-4">
            <v-avatar color="success" size="48">
              <v-icon color="white">mdi-check-circle</v-icon>
            </v-avatar>
            <div>
              <p class="text-h5 font-weight-bold mb-0">{{ completedCount }}</p>
              <p class="text-caption text-grey">Completed</p>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card rounded="lg">
          <v-card-text class="d-flex align-center gap-4">
            <v-avatar color="warning" size="48">
              <v-icon color="white">mdi-certificate</v-icon>
            </v-avatar>
            <div>
              <p class="text-h5 font-weight-bold mb-0">{{ requiredCount }}</p>
              <p class="text-caption text-grey">Required</p>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Tabs -->
    <v-tabs v-model="tab" color="primary" class="mb-4">
      <v-tab value="my-training">My Training</v-tab>
      <v-tab value="catalog">Course Catalog</v-tab>
      <v-tab v-if="isAdmin" value="manage">Manage Courses</v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <!-- My Training Tab -->
      <v-window-item value="my-training">
        <v-row>
          <v-col 
            v-for="enrollment in myEnrollments" 
            :key="enrollment.id" 
            cols="12" 
            md="6" 
            lg="4"
          >
            <v-card rounded="lg">
              <v-img
                v-if="enrollment.course?.thumbnail_url"
                :src="enrollment.course.thumbnail_url"
                height="150"
                cover
              />
              <div v-else class="bg-primary d-flex align-center justify-center" style="height: 150px">
                <v-icon size="64" color="white">mdi-school</v-icon>
              </div>
              
              <v-card-title>{{ enrollment.course?.title }}</v-card-title>
              <v-card-subtitle>{{ enrollment.course?.category }}</v-card-subtitle>
              
              <v-card-text>
                <v-progress-linear
                  :model-value="enrollment.progress"
                  color="primary"
                  height="8"
                  rounded
                  class="mb-2"
                />
                <div class="d-flex justify-space-between text-caption">
                  <span>{{ enrollment.progress }}% Complete</span>
                  <v-chip 
                    :color="getStatusColor(enrollment.status)" 
                    size="x-small"
                    variant="tonal"
                  >
                    {{ enrollment.status }}
                  </v-chip>
                </div>
              </v-card-text>
              
              <v-card-actions>
                <v-btn color="primary" variant="text" :to="`/training/${enrollment.course_id}`">
                  Continue
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
          
          <v-col v-if="myEnrollments.length === 0" cols="12">
            <v-card rounded="lg" class="text-center pa-8">
              <v-icon size="64" color="grey-lighten-1">mdi-school-outline</v-icon>
              <h3 class="text-h6 mt-4">No Courses Enrolled</h3>
              <p class="text-grey">Browse the catalog to start learning</p>
              <v-btn color="primary" class="mt-4" @click="tab = 'catalog'">
                Browse Catalog
              </v-btn>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- Catalog Tab -->
      <v-window-item value="catalog">
        <CourseCatalog />
      </v-window-item>

      <!-- Manage Courses Tab (Admin) -->
      <v-window-item v-if="isAdmin" value="manage">
        <v-card rounded="lg">
          <v-data-table
            :headers="courseHeaders"
            :items="courses"
            hover
          >
            <template #item.is_required="{ item }">
              <v-chip :color="item.is_required ? 'error' : 'grey'" size="small" variant="tonal">
                {{ item.is_required ? 'Required' : 'Optional' }}
              </v-chip>
            </template>
            <template #item.is_active="{ item }">
              <v-chip :color="item.is_active ? 'success' : 'grey'" size="small" variant="tonal">
                {{ item.is_active ? 'Active' : 'Inactive' }}
              </v-chip>
            </template>
            <template #item.actions="{ item }">
              <v-btn icon="mdi-pencil" size="small" variant="text" @click="editCourse(item)" />
              <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="confirmDeleteCourse(item)" />
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>
    </v-window>

    <!-- Create Course Dialog -->
    <v-dialog v-model="createCourseDialog" max-width="600">
      <v-card>
        <v-card-title>{{ editingCourse ? 'Edit Course' : 'Create New Course' }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="courseForm.title"
            label="Course Title"
            variant="outlined"
          />
          <v-textarea
            v-model="courseForm.description"
            label="Description"
            variant="outlined"
            rows="3"
          />
          <v-row>
            <v-col cols="6">
              <v-select
                v-model="courseForm.category"
                :items="courseCategories"
                label="Category"
                variant="outlined"
              />
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="courseForm.difficulty_level"
                :items="['beginner', 'intermediate', 'advanced']"
                label="Difficulty"
                variant="outlined"
              />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model.number="courseForm.estimated_hours"
                label="Estimated Hours"
                type="number"
                variant="outlined"
              />
            </v-col>
            <v-col cols="6">
              <v-checkbox
                v-model="courseForm.is_required"
                label="Required for all employees"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeCourseDialog">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="saveCourse">{{ editingCourse ? 'Update' : 'Create' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title class="text-error">Delete Course</v-card-title>
        <v-card-text>
          Are you sure you want to delete "{{ courseToDelete?.title }}"? This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="deleteCourse">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import type { TrainingCourse, TrainingEnrollment } from '~/types/database.types'
import CourseCatalog from '~/components/academy/CourseCatalog.vue'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin-only']
})

const authStore = useAuthStore()
const uiStore = useUIStore()

const isAdmin = computed(() => authStore.isAdmin)

const tab = ref('courses')
const courses = ref<TrainingCourse[]>([])
const myEnrollments = ref<(TrainingEnrollment & { course?: TrainingCourse; progress: number })[]>([])

const createCourseDialog = ref(false)
const deleteDialog = ref(false)
const editingCourse = ref<TrainingCourse | null>(null)
const courseToDelete = ref<TrainingCourse | null>(null)
const saving = ref(false)

// Course category options
const courseCategories = [
  'Compliance',
  'Technical',
  'Clinical',
  'Leadership',
  'Safety',
  'Customer Service',
  'Product Knowledge',
  'Soft Skills',
  'Onboarding',
  'Continuing Education',
  'Other'
]

const courseForm = reactive({
  title: '',
  description: '',
  category: '',
  difficulty_level: 'beginner' as const,
  estimated_hours: null as number | null,
  is_required: false
})

const courseHeaders = [
  { title: 'Title', key: 'title' },
  { title: 'Category', key: 'category' },
  { title: 'Difficulty', key: 'difficulty_level' },
  { title: 'Required', key: 'is_required' },
  { title: 'Status', key: 'is_active' },
  { title: 'Actions', key: 'actions', sortable: false }
]

const inProgressCount = computed(() => 
  myEnrollments.value.filter(e => e.status === 'in_progress').length
)

const completedCount = computed(() => 
  myEnrollments.value.filter(e => e.status === 'completed').length
)

const requiredCount = computed(() => 
  courses.value.filter(c => c.is_required).length
)

function isEnrolled(courseId: string): boolean {
  return myEnrollments.value.some(e => e.course_id === courseId)
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    enrolled: 'info',
    in_progress: 'warning',
    completed: 'success',
    failed: 'error',
    dropped: 'grey'
  }
  return colors[status] || 'grey'
}

async function enrollCourse(courseId: string) {
  uiStore.showInfo('Feature coming soon')
}

function editCourse(course: TrainingCourse) {
  editingCourse.value = course
  courseForm.title = course.title
  courseForm.description = course.description || ''
  courseForm.category = course.category || ''
  courseForm.difficulty_level = course.difficulty_level || 'beginner'
  courseForm.estimated_hours = course.estimated_hours
  courseForm.is_required = course.is_required || false
  createCourseDialog.value = true
}

function confirmDeleteCourse(course: TrainingCourse) {
  courseToDelete.value = course
  deleteDialog.value = true
}

function closeCourseDialog() {
  createCourseDialog.value = false
  editingCourse.value = null
  Object.assign(courseForm, {
    title: '',
    description: '',
    category: '',
    difficulty_level: 'beginner',
    estimated_hours: null,
    is_required: false
  })
}

async function saveCourse() {
  if (!courseForm.title) {
    uiStore.showError('Course title is required')
    return
  }
  
  saving.value = true
  try {
    const supabase = useSupabaseClient()
    
    if (editingCourse.value) {
      // Update existing course
      const { error } = await supabase
        .from('training_courses')
        .update({
          title: courseForm.title,
          description: courseForm.description || null,
          category: courseForm.category || null,
          difficulty_level: courseForm.difficulty_level,
          estimated_hours: courseForm.estimated_hours,
          is_required: courseForm.is_required
        })
        .eq('id', editingCourse.value.id)
      
      if (error) throw error
      
      // Update local list
      const idx = courses.value.findIndex(c => c.id === editingCourse.value!.id)
      if (idx !== -1) {
        courses.value[idx] = { ...courses.value[idx], ...courseForm }
      }
      uiStore.showSuccess('Course updated')
    } else {
      // Create new course
      const { data, error } = await supabase
        .from('training_courses')
        .insert({
          title: courseForm.title,
          description: courseForm.description || null,
          category: courseForm.category || null,
          difficulty_level: courseForm.difficulty_level,
          estimated_hours: courseForm.estimated_hours,
          is_required: courseForm.is_required,
          created_by: authStore.profile?.id
        })
        .select()
        .single()
      
      if (error) throw error
      courses.value.push(data as TrainingCourse)
      uiStore.showSuccess('Course created successfully!')
    }
    
    closeCourseDialog()
  } catch (err) {
    console.error('Save course error:', err)
    uiStore.showError(editingCourse.value ? 'Failed to update course' : 'Failed to create course')
  } finally {
    saving.value = false
  }
}

async function deleteCourse() {
  if (!courseToDelete.value) return
  
  try {
    const supabase = useSupabaseClient()
    const { error } = await supabase
      .from('training_courses')
      .update({ is_active: false })
      .eq('id', courseToDelete.value.id)
    
    if (error) throw error
    
    courses.value = courses.value.filter(c => c.id !== courseToDelete.value!.id)
    deleteDialog.value = false
    courseToDelete.value = null
    uiStore.showSuccess('Course deleted')
  } catch {
    uiStore.showError('Failed to delete course')
  }
}

async function createCourse() {
  // Redirect to saveCourse for backward compatibility
  await saveCourse()
}

onMounted(async () => {
  const supabase = useSupabaseClient()
  
  // Fetch all courses
  const { data: coursesData } = await supabase
    .from('training_courses')
    .select('*')
    .order('title')
  
  if (coursesData) {
    courses.value = coursesData as TrainingCourse[]
  }
  
  // Fetch my enrollments
  // This would need the employee ID which requires profile lookup
})
</script>
