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

    <!-- All Courses Table -->
    <v-card rounded="lg">
      <v-data-table
        :headers="courseHeaders"
        :items="courses"
        hover
      >
        <template #item.skill_name="{ item }">
          <v-chip v-if="item.skill_name" color="primary" size="small" variant="tonal">
            <v-icon start size="14">mdi-link</v-icon>
            {{ item.skill_name }} → Lv{{ item.skill_level_awarded }}
          </v-chip>
          <span v-else class="text-grey text-caption">—</span>
        </template>
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

    <!-- Create Course Dialog -->
    <v-dialog v-model="createCourseDialog" max-width="700">
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

          <!-- Skill Linking Section -->
          <v-divider class="my-4" />
          <div class="text-subtitle-2 mb-3 d-flex align-center">
            <v-icon class="mr-2" color="primary">mdi-link</v-icon>
            Skill Advancement (Optional)
          </div>
          <p class="text-caption text-grey mb-3">
            Link this course to a skill. Completing the course will advance the employee to the specified level.
          </p>
          <v-row>
            <v-col cols="8">
              <v-autocomplete
                v-model="courseForm.skill_id"
                :items="skillsLibrary"
                item-title="display_name"
                item-value="id"
                label="Linked Skill"
                variant="outlined"
                clearable
                hint="Select a skill this course teaches"
                persistent-hint
              />
            </v-col>
            <v-col cols="4">
              <v-select
                v-model="courseForm.skill_level_awarded"
                :items="skillLevels"
                label="Level Awarded"
                variant="outlined"
                :disabled="!courseForm.skill_id"
                hint="Level upon completion"
                persistent-hint
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
import type { TrainingCourse } from '~/types/database.types'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin-only']
})

// Extended course type with skill linking fields
interface CourseWithSkill extends TrainingCourse {
  skill_id?: string | null
  skill_level_awarded?: number | null
  skill_name?: string
  skill?: { name: string } | null
}

const authStore = useAuthStore()
const uiStore = useUIStore()

const isAdmin = computed(() => authStore.isAdmin)

const courses = ref<CourseWithSkill[]>([])
const skillsLibrary = ref<{ id: string; name: string; category: string; display_name: string }[]>([])

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
  difficulty_level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
  estimated_hours: null as number | null,
  is_required: false,
  skill_id: null as string | null,
  skill_level_awarded: null as number | null
})

// Skill level options for dropdown
const skillLevels = [
  { title: 'Level 1 - Novice', value: 1 },
  { title: 'Level 2 - Beginner', value: 2 },
  { title: 'Level 3 - Intermediate', value: 3 },
  { title: 'Level 4 - Advanced', value: 4 },
  { title: 'Level 5 - Expert', value: 5 }
]

const courseHeaders = [
  { title: 'Title', key: 'title' },
  { title: 'Category', key: 'category' },
  { title: 'Linked Skill', key: 'skill_name' },
  { title: 'Difficulty', key: 'difficulty_level' },
  { title: 'Required', key: 'is_required' },
  { title: 'Status', key: 'is_active' },
  { title: 'Actions', key: 'actions', sortable: false }
]

const enrollmentsCount = computed(() => 0) // Placeholder for enrollment tracking

const inProgressCount = computed(() => 0) // Would need to query training_enrollments

const completedCount = computed(() => 0) // Would need to query training_enrollments

const requiredCount = computed(() => 
  courses.value.filter(c => c.is_required).length
)

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

function editCourse(course: CourseWithSkill) {
  editingCourse.value = course as TrainingCourse
  courseForm.title = course.title
  courseForm.description = course.description || ''
  courseForm.category = course.category || ''
  courseForm.difficulty_level = (course.difficulty_level as 'beginner' | 'intermediate' | 'advanced') || 'beginner'
  courseForm.estimated_hours = course.estimated_hours
  courseForm.is_required = course.is_required || false
  courseForm.skill_id = course.skill_id || null
  courseForm.skill_level_awarded = course.skill_level_awarded || null
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
    is_required: false,
    skill_id: null,
    skill_level_awarded: null
  })
}

async function saveCourse() {
  if (!courseForm.title) {
    uiStore.showError('Course title is required')
    return
  }
  
  // Validate skill level if skill is selected
  if (courseForm.skill_id && !courseForm.skill_level_awarded) {
    uiStore.showError('Please select a skill level to award')
    return
  }
  
  saving.value = true
  try {
    const supabase = useSupabaseClient()
    
    const courseData: Record<string, unknown> = {
      title: courseForm.title,
      description: courseForm.description || null,
      category: courseForm.category || null,
      difficulty_level: courseForm.difficulty_level,
      estimated_hours: courseForm.estimated_hours,
      is_required: courseForm.is_required,
      skill_id: courseForm.skill_id || null,
      skill_level_awarded: courseForm.skill_id ? courseForm.skill_level_awarded : null
    }
    
    if (editingCourse.value) {
      // Update existing course
      const { error } = await supabase
        .from('training_courses')
        .update(courseData as never)
        .eq('id', editingCourse.value.id)
      
      if (error) throw error
      
      // Get updated skill name for display
      const linkedSkill = skillsLibrary.value.find(s => s.id === courseForm.skill_id)
      
      // Update local list
      const idx = courses.value.findIndex(c => c.id === editingCourse.value!.id)
      if (idx !== -1) {
        courses.value[idx] = { 
          ...courses.value[idx], 
          title: courseForm.title,
          description: courseForm.description || null,
          category: courseForm.category || null,
          difficulty_level: courseForm.difficulty_level,
          estimated_hours: courseForm.estimated_hours,
          is_required: courseForm.is_required,
          skill_id: courseForm.skill_id || null,
          skill_level_awarded: courseForm.skill_level_awarded || null,
          skill_name: linkedSkill?.name
        }
      }
      uiStore.showSuccess('Course updated')
    } else {
      // Create new course
      const { data, error } = await supabase
        .from('training_courses')
        .insert({
          ...courseData,
          created_by: authStore.profile?.id
        } as never)
        .select()
        .single()
      
      if (error) throw error
      
      // Get linked skill name
      const linkedSkill = skillsLibrary.value.find(s => s.id === courseForm.skill_id)
      
      courses.value.push({
        ...(data as CourseWithSkill),
        skill_name: linkedSkill?.name
      })
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
      .update({ is_active: false } as never)
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
  
  // Fetch skills library for dropdown
  const { data: skillsData } = await supabase
    .from('skill_library')
    .select('id, name, category')
    .order('category')
    .order('name')
  
  if (skillsData) {
    skillsLibrary.value = (skillsData as { id: string; name: string; category: string }[]).map(s => ({
      id: s.id,
      name: s.name,
      category: s.category,
      display_name: `${s.category} - ${s.name}`
    }))
  }
  
  // Fetch all courses with skill info
  const { data: coursesData } = await supabase
    .from('training_courses')
    .select(`
      *,
      skill:skill_library(name)
    `)
    .order('title')
  
  if (coursesData) {
    courses.value = (coursesData as CourseWithSkill[]).map(c => ({
      ...c,
      skill_name: c.skill?.name
    }))
  }
})
</script>
