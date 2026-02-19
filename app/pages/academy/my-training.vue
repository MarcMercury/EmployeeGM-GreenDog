<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">📚 My Training</h1>
        <p class="text-body-1 text-grey-darken-1">
          Track your learning progress and complete required courses
        </p>
      </div>
    </div>

    <!-- Progress Stats -->
    <UiStatsRow
      :stats="[
        { value: inProgressCourses.length, label: 'In Progress', color: 'info', icon: 'mdi-progress-clock' },
        { value: completedCourses.length, label: 'Completed', color: 'success', icon: 'mdi-check-circle' },
        { value: requiredCourses.length, label: 'Required', color: 'warning', icon: 'mdi-alert-circle' },
        { value: certificates.length, label: 'Certificates', color: 'purple', icon: 'mdi-certificate' }
      ]"
      layout="4-col"
      tile-size="tall"
    />

    <!-- Required Courses Alert -->
    <v-alert 
      v-if="requiredCourses.length > 0" 
      type="warning" 
      variant="tonal"
      class="mb-6"
      border="start"
    >
      <div class="d-flex align-center justify-space-between">
        <div>
          <strong>{{ requiredCourses.length }} required course{{ requiredCourses.length > 1 ? 's' : '' }}</strong> 
          need{{ requiredCourses.length === 1 ? 's' : '' }} to be completed
        </div>
        <v-btn variant="text" color="warning" size="small" @click="scrollToRequired">
          View Required
        </v-btn>
      </div>
    </v-alert>

    <!-- Loading State -->
    <div v-if="loading" class="d-flex justify-center py-12">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <!-- Content -->
    <template v-else>
      <!-- In Progress Section -->
      <div v-if="inProgressCourses.length > 0" class="mb-8">
        <h2 class="text-h6 font-weight-bold mb-4">
          <v-icon class="mr-2" color="info">mdi-progress-clock</v-icon>
          Continue Learning
        </h2>
        <v-row>
          <v-col 
            v-for="enrollment in inProgressCourses" 
            :key="enrollment.id"
            cols="12" 
            md="6" 
            lg="4"
          >
            <CourseCard 
              :enrollment="enrollment"
              @continue="openCourse(enrollment)"
            />
          </v-col>
        </v-row>
      </div>

      <!-- Required Section -->
      <div v-if="requiredCourses.length > 0" ref="requiredSection" class="mb-8">
        <h2 class="text-h6 font-weight-bold mb-4">
          <v-icon class="mr-2" color="warning">mdi-alert-circle</v-icon>
          Required Courses
        </h2>
        <v-row>
          <v-col 
            v-for="enrollment in requiredCourses" 
            :key="enrollment.id"
            cols="12" 
            md="6" 
            lg="4"
          >
            <CourseCard 
              :enrollment="enrollment"
              required
              @start="openCourse(enrollment)"
            />
          </v-col>
        </v-row>
      </div>

      <!-- Completed Section -->
      <div v-if="completedCourses.length > 0" class="mb-8">
        <h2 class="text-h6 font-weight-bold mb-4">
          <v-icon class="mr-2" color="success">mdi-check-circle</v-icon>
          Completed
        </h2>
        <v-row>
          <v-col 
            v-for="enrollment in completedCourses" 
            :key="enrollment.id"
            cols="12" 
            md="6" 
            lg="4"
          >
            <CourseCard 
              :enrollment="enrollment"
              completed
              @view-certificate="viewCertificate(enrollment)"
            />
          </v-col>
        </v-row>
      </div>

      <!-- Empty State -->
      <v-card v-if="enrollments.length === 0" rounded="lg" class="text-center py-12">
        <v-icon size="64" color="grey-lighten-1">mdi-school</v-icon>
        <h3 class="text-h6 mt-4">No Training Assigned</h3>
        <p class="text-grey mt-2">You don't have any training courses yet.</p>
        <v-btn color="primary" class="mt-4" to="/academy/catalog">
          Browse Course Catalog
        </v-btn>
      </v-card>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

const supabase = useSupabaseClient()
const { currentUserProfile } = useAppData()

const loading = ref(true)
const enrollments = ref<any[]>([])
const certificates = ref<any[]>([])
const requiredSection = ref<HTMLElement>()

// Computed filters
const inProgressCourses = computed(() => 
  enrollments.value.filter(e => e.status === 'in_progress')
)

const completedCourses = computed(() => 
  enrollments.value.filter(e => e.status === 'completed')
)

const requiredCourses = computed(() => 
  enrollments.value.filter(e => 
    e.course?.is_required && 
    e.status !== 'completed'
  )
)

// Fetch user's enrollments
async function fetchEnrollments() {
  if (!currentUserProfile.value?.id) return
  // Emergency admin — skip Supabase queries
  if ((currentUserProfile.value as any)?.is_emergency || currentUserProfile.value.id.startsWith('emergency-')) {
    loading.value = false
    return
  }
  
  loading.value = true
  try {
    // Get employee record for current user
    const { data: employee } = await supabase
      .from('employees')
      .select('id')
      .eq('profile_id', currentUserProfile.value.id)
      .single()
    
    if (!employee) {
      loading.value = false
      return
    }

    // Fetch enrollments with course details
    const { data } = await supabase
      .from('training_enrollments')
      .select(`
        id,
        status,
        progress_percent,
        started_at,
        completed_at,
        due_date,
        course:training_course_id (
          id,
          title,
          description,
          duration_minutes,
          is_required,
          thumbnail_url,
          category
        )
      `)
      .eq('employee_id', employee.id)
      .order('created_at', { ascending: false })

    enrollments.value = data || []

    // Fetch certificates
    const { data: certs } = await supabase
      .from('training_certificates')
      .select('*')
      .eq('employee_id', employee.id)

    certificates.value = certs || []
  } catch (error) {
    console.error('Failed to fetch enrollments:', error)
  } finally {
    loading.value = false
  }
}

function scrollToRequired() {
  requiredSection.value?.scrollIntoView({ behavior: 'smooth' })
}

function openCourse(enrollment: any) {
  // Navigate to training course viewer
  navigateTo(`/training/${enrollment.course?.id}`)
}

function viewCertificate(enrollment: any) {
  // Open certificate in new tab or show dialog
  if (enrollment.certificate_url) {
    window.open(enrollment.certificate_url, '_blank')
  } else {
    alert(`Certificate for "${enrollment.course?.title}" - Completed on ${new Date(enrollment.completed_at).toLocaleDateString()}`)
  }
}

onMounted(() => {
  fetchEnrollments()
})

// Watch for profile changes
watch(currentUserProfile, () => {
  fetchEnrollments()
})
</script>
