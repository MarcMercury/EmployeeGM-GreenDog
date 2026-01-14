<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'gdu']
})

const supabase = useSupabaseClient()
const { showSuccess, showError } = useToast()

// Loading states
const loading = ref(true)
const saving = ref(false)

// Types
interface StudentEnrollment {
  enrollment_id: string
  person_id: string
  first_name: string
  last_name: string
  preferred_name: string | null
  display_name: string
  email: string
  phone_mobile: string | null
  avatar_url: string | null
  lifecycle_stage: string
  program_type: string
  enrollment_status: string
  program_name: string | null
  cohort_identifier: string | null
  start_date: string | null
  end_date: string | null
  expected_graduation_date: string | null
  school_of_origin: string | null
  school_program: string | null
  assigned_location_id: string | null
  location_name: string | null
  assigned_mentor_id: string | null
  mentor_name: string | null
  coordinator_name: string | null
  schedule_type: string | null
  scheduled_hours_per_week: number | null
  is_paid: boolean
  stipend_amount: number | null
  hours_completed: number | null
  hours_required: number | null
  completion_percentage: number | null
  overall_performance_rating: string | null
  eligible_for_employment: boolean | null
  employment_interest_level: string | null
  converted_to_employee: boolean
  time_status: string
  created_at: string
  updated_at: string
}

interface Location {
  id: string
  name: string
}

interface Employee {
  id: string
  first_name: string
  last_name: string
}

// Filter state
const searchQuery = ref('')
const selectedProgramType = ref<string | null>(null)
const selectedStatus = ref<string | null>(null)
const selectedLocation = ref<string | null>(null)
const selectedTimeStatus = ref<string | null>(null)

const programTypeOptions = [
  { title: 'All Programs', value: null },
  { title: 'Internship (12 months)', value: 'internship' },
  { title: 'Externship (2-8 weeks)', value: 'externship' },
  { title: 'Paid Cohort', value: 'paid_cohort' },
  { title: 'Intensive', value: 'intensive' },
  { title: 'Shadow', value: 'shadow' }
]

const statusOptions = [
  { title: 'All Statuses', value: null },
  { title: 'Inquiry', value: 'inquiry' },
  { title: 'Applied', value: 'applied' },
  { title: 'Reviewing', value: 'reviewing' },
  { title: 'Interview', value: 'interview' },
  { title: 'Accepted', value: 'accepted' },
  { title: 'Enrolled', value: 'enrolled' },
  { title: 'In Progress', value: 'in_progress' },
  { title: 'Completed', value: 'completed' },
  { title: 'Withdrawn', value: 'withdrawn' },
  { title: 'Waitlisted', value: 'waitlisted' }
]

const timeStatusOptions = [
  { title: 'All', value: null },
  { title: 'Current', value: 'current' },
  { title: 'Upcoming', value: 'upcoming' },
  { title: 'Past', value: 'past' }
]

// Fetch data
const students = ref<StudentEnrollment[]>([])
const locations = ref<Location[]>([])
const employees = ref<Employee[]>([])

async function fetchStudents() {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('student_program_view')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    students.value = data || []
  } catch (error: any) {
    console.error('Error fetching students:', error)
    showError('Failed to load students')
  } finally {
    loading.value = false
  }
}

async function fetchLocations() {
  const { data } = await supabase
    .from('locations')
    .select('id, name')
    .eq('is_active', true)
    .order('name')
  locations.value = data || []
}

async function fetchEmployees() {
  const { data } = await supabase
    .from('employees')
    .select('id, first_name, last_name')
    .eq('is_active', true)
    .order('first_name')
  employees.value = data || []
}

onMounted(() => {
  fetchStudents()
  fetchLocations()
  fetchEmployees()
})

// Filtered students
const filteredStudents = computed(() => {
  let result = students.value
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(s => 
      s.first_name.toLowerCase().includes(query) ||
      s.last_name.toLowerCase().includes(query) ||
      s.display_name.toLowerCase().includes(query) ||
      s.email?.toLowerCase().includes(query) ||
      s.school_of_origin?.toLowerCase().includes(query) ||
      s.program_name?.toLowerCase().includes(query) ||
      s.mentor_name?.toLowerCase().includes(query)
    )
  }
  
  if (selectedProgramType.value) {
    result = result.filter(s => s.program_type === selectedProgramType.value)
  }
  
  if (selectedStatus.value) {
    result = result.filter(s => s.enrollment_status === selectedStatus.value)
  }
  
  if (selectedLocation.value) {
    result = result.filter(s => s.assigned_location_id === selectedLocation.value)
  }
  
  if (selectedTimeStatus.value) {
    result = result.filter(s => s.time_status === selectedTimeStatus.value)
  }
  
  return result
})

// Stats
const stats = computed(() => ({
  total: students.value.length,
  current: students.value.filter(s => s.time_status === 'current').length,
  upcoming: students.value.filter(s => s.time_status === 'upcoming').length,
  byProgram: {
    internship: students.value.filter(s => s.program_type === 'internship').length,
    externship: students.value.filter(s => s.program_type === 'externship').length,
    paid_cohort: students.value.filter(s => s.program_type === 'paid_cohort').length,
    intensive: students.value.filter(s => s.program_type === 'intensive').length,
    shadow: students.value.filter(s => s.program_type === 'shadow').length
  }
}))

// Invite wizard dialog
const showInviteWizard = ref(false)
const inviteStep = ref(1)
const inviteForm = ref({
  email: '',
  first_name: '',
  last_name: '',
  phone: '',
  program_type: 'externship' as string,
  program_name: '',
  school_of_origin: '',
  start_date: '',
  end_date: '',
  assigned_location_id: null as string | null,
  assigned_mentor_id: null as string | null,
  send_invite_email: true
})
const identityCheckResult = ref<{
  found: boolean
  person_id?: string
  existing_stage?: string
  existing_name?: string
} | null>(null)
const checkingIdentity = ref(false)

function openInviteWizard() {
  inviteStep.value = 1
  inviteForm.value = {
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    program_type: 'externship',
    program_name: '',
    school_of_origin: '',
    start_date: '',
    end_date: '',
    assigned_location_id: null,
    assigned_mentor_id: null,
    send_invite_email: true
  }
  identityCheckResult.value = null
  showInviteWizard.value = true
}

async function checkIdentity() {
  if (!inviteForm.value.email) {
    showError('Please enter an email address')
    return
  }
  
  checkingIdentity.value = true
  try {
    // Check if person exists
    const { data, error } = await supabase
      .from('unified_persons')
      .select('id, first_name, last_name, current_stage')
      .ilike('email', inviteForm.value.email.trim())
      .maybeSingle()
    
    if (error) throw error
    
    if (data) {
      identityCheckResult.value = {
        found: true,
        person_id: data.id,
        existing_stage: data.current_stage,
        existing_name: `${data.first_name} ${data.last_name}`
      }
      // Pre-fill name if found
      if (!inviteForm.value.first_name) {
        inviteForm.value.first_name = data.first_name
      }
      if (!inviteForm.value.last_name) {
        inviteForm.value.last_name = data.last_name
      }
    } else {
      identityCheckResult.value = { found: false }
    }
    
    // Move to next step
    inviteStep.value = 2
  } catch (error: any) {
    console.error('Error checking identity:', error)
    showError('Failed to check identity')
  } finally {
    checkingIdentity.value = false
  }
}

async function submitInvite() {
  if (!inviteForm.value.first_name || !inviteForm.value.last_name) {
    showError('First and last name are required')
    return
  }
  
  saving.value = true
  try {
    // Use the invite_student function
    const { data, error } = await supabase.rpc('invite_student', {
      p_email: inviteForm.value.email.trim(),
      p_first_name: inviteForm.value.first_name.trim(),
      p_last_name: inviteForm.value.last_name.trim(),
      p_program_type: inviteForm.value.program_type,
      p_program_name: inviteForm.value.program_name || null,
      p_school_of_origin: inviteForm.value.school_of_origin || null,
      p_start_date: inviteForm.value.start_date || null,
      p_end_date: inviteForm.value.end_date || null,
      p_phone: inviteForm.value.phone || null,
      p_assigned_location_id: inviteForm.value.assigned_location_id,
      p_assigned_mentor_id: inviteForm.value.assigned_mentor_id,
      p_send_email: inviteForm.value.send_invite_email,
      p_expires_in_days: 30
    })
    
    if (error) throw error
    
    const result = data?.[0]
    if (result?.is_new_person) {
      showSuccess(`Created new student record and ${inviteForm.value.send_invite_email ? 'sent invitation' : 'generated invite link'}`)
    } else {
      showSuccess(`Added program enrollment to existing profile and ${inviteForm.value.send_invite_email ? 'sent invitation' : 'generated invite link'}`)
    }
    
    showInviteWizard.value = false
    fetchStudents()
  } catch (error: any) {
    console.error('Error inviting student:', error)
    showError(error.message || 'Failed to invite student')
  } finally {
    saving.value = false
  }
}

// View/Edit student dialog
const showStudentDialog = ref(false)
const selectedStudent = ref<StudentEnrollment | null>(null)

function viewStudent(student: StudentEnrollment) {
  selectedStudent.value = student
  showStudentDialog.value = true
}

// Status update
async function updateEnrollmentStatus(enrollmentId: string, newStatus: string) {
  try {
    const { error } = await supabase
      .from('person_program_data')
      .update({ 
        enrollment_status: newStatus,
        status_changed_at: new Date().toISOString()
      })
      .eq('id', enrollmentId)
    
    if (error) throw error
    showSuccess('Status updated')
    fetchStudents()
  } catch (error: any) {
    console.error('Error updating status:', error)
    showError('Failed to update status')
  }
}

// Helpers
function getProgramTypeColor(type: string): string {
  const colors: Record<string, string> = {
    internship: 'blue',
    externship: 'purple',
    paid_cohort: 'green',
    intensive: 'orange',
    shadow: 'cyan',
    ce_course: 'amber'
  }
  return colors[type] || 'grey'
}

function getProgramTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    internship: 'mdi-briefcase-account',
    externship: 'mdi-school-outline',
    paid_cohort: 'mdi-account-group',
    intensive: 'mdi-lightning-bolt',
    shadow: 'mdi-account-eye',
    ce_course: 'mdi-certificate'
  }
  return icons[type] || 'mdi-account'
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    inquiry: 'grey',
    applied: 'blue-lighten-1',
    reviewing: 'blue',
    interview: 'purple',
    accepted: 'green-lighten-1',
    enrolled: 'green',
    in_progress: 'teal',
    completed: 'success',
    withdrawn: 'orange',
    dismissed: 'red',
    deferred: 'amber',
    waitlisted: 'grey-darken-1'
  }
  return colors[status] || 'grey'
}

function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  })
}

function formatProgramType(type: string): string {
  const labels: Record<string, string> = {
    internship: 'Internship',
    externship: 'Externship',
    paid_cohort: 'Paid Cohort',
    intensive: 'Intensive',
    shadow: 'Shadow',
    ce_course: 'CE Course'
  }
  return labels[type] || type
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Student Contacts</h1>
        <p class="text-body-2 text-medium-emphasis mt-1">
          Manage interns, externs, cohort students, and intensive participants
        </p>
      </div>
      <v-btn
        color="primary"
        prepend-icon="mdi-account-plus"
        @click="openInviteWizard"
      >
        Invite Student
      </v-btn>
    </div>

    <!-- Stats Cards -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text class="d-flex align-center">
            <v-avatar color="primary" class="mr-4">
              <v-icon>mdi-account-group</v-icon>
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ stats.total }}</div>
              <div class="text-caption text-medium-emphasis">Total Students</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text class="d-flex align-center">
            <v-avatar color="success" class="mr-4">
              <v-icon>mdi-account-check</v-icon>
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ stats.current }}</div>
              <div class="text-caption text-medium-emphasis">Currently Active</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text class="d-flex align-center">
            <v-avatar color="info" class="mr-4">
              <v-icon>mdi-calendar-clock</v-icon>
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ stats.upcoming }}</div>
              <div class="text-caption text-medium-emphasis">Upcoming</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text class="d-flex align-center">
            <v-avatar color="blue" class="mr-4">
              <v-icon>mdi-briefcase-account</v-icon>
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ stats.byProgram.internship }}</div>
              <div class="text-caption text-medium-emphasis">Interns</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Filters -->
    <v-card class="mb-6">
      <v-card-text>
        <v-row dense>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="searchQuery"
              label="Search students..."
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="6" md="2">
            <v-select
              v-model="selectedProgramType"
              :items="programTypeOptions"
              label="Program"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="6" md="2">
            <v-select
              v-model="selectedStatus"
              :items="statusOptions"
              label="Status"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="6" md="2">
            <v-select
              v-model="selectedLocation"
              :items="[{ title: 'All Locations', value: null }, ...locations.map(l => ({ title: l.name, value: l.id }))]"
              label="Location"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="6" md="2">
            <v-select
              v-model="selectedTimeStatus"
              :items="timeStatusOptions"
              label="Time Status"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Students Table -->
    <v-card>
      <v-data-table
        :headers="[
          { title: 'Student', key: 'display_name', sortable: true },
          { title: 'Program', key: 'program_type', sortable: true },
          { title: 'Status', key: 'enrollment_status', sortable: true },
          { title: 'School', key: 'school_of_origin', sortable: true },
          { title: 'Location', key: 'location_name', sortable: true },
          { title: 'Mentor', key: 'mentor_name', sortable: true },
          { title: 'Dates', key: 'start_date', sortable: true },
          { title: 'Progress', key: 'completion_percentage', sortable: true },
          { title: 'Actions', key: 'actions', sortable: false, align: 'end' }
        ]"
        :items="filteredStudents"
        :loading="loading"
        item-value="enrollment_id"
        hover
        class="elevation-0"
      >
        <!-- Student Name -->
        <template #item.display_name="{ item }">
          <div class="d-flex align-center py-2">
            <v-avatar size="36" class="mr-3">
              <v-img v-if="item.avatar_url" :src="item.avatar_url" />
              <span v-else class="text-body-2">
                {{ item.first_name[0] }}{{ item.last_name[0] }}
              </span>
            </v-avatar>
            <div>
              <div class="font-weight-medium">{{ item.display_name }}</div>
              <div class="text-caption text-medium-emphasis">{{ item.email }}</div>
            </div>
          </div>
        </template>

        <!-- Program Type -->
        <template #item.program_type="{ item }">
          <v-chip
            :color="getProgramTypeColor(item.program_type)"
            size="small"
            variant="tonal"
          >
            <v-icon start size="small">{{ getProgramTypeIcon(item.program_type) }}</v-icon>
            {{ formatProgramType(item.program_type) }}
          </v-chip>
        </template>

        <!-- Enrollment Status -->
        <template #item.enrollment_status="{ item }">
          <v-chip
            :color="getStatusColor(item.enrollment_status)"
            size="small"
            variant="flat"
          >
            {{ formatStatus(item.enrollment_status) }}
          </v-chip>
        </template>

        <!-- School -->
        <template #item.school_of_origin="{ item }">
          <span class="text-body-2">{{ item.school_of_origin || '—' }}</span>
        </template>

        <!-- Location -->
        <template #item.location_name="{ item }">
          <span class="text-body-2">{{ item.location_name || '—' }}</span>
        </template>

        <!-- Mentor -->
        <template #item.mentor_name="{ item }">
          <span class="text-body-2">{{ item.mentor_name || '—' }}</span>
        </template>

        <!-- Dates -->
        <template #item.start_date="{ item }">
          <div class="text-body-2">
            <div v-if="item.start_date">
              {{ formatDate(item.start_date) }}
              <span v-if="item.end_date"> → {{ formatDate(item.end_date) }}</span>
            </div>
            <span v-else class="text-medium-emphasis">Not set</span>
          </div>
        </template>

        <!-- Progress -->
        <template #item.completion_percentage="{ item }">
          <div v-if="item.hours_required" class="d-flex align-center" style="min-width: 120px;">
            <v-progress-linear
              :model-value="item.completion_percentage || 0"
              color="primary"
              height="8"
              rounded
              class="mr-2"
            />
            <span class="text-caption">{{ item.completion_percentage || 0 }}%</span>
          </div>
          <span v-else class="text-caption text-medium-emphasis">—</span>
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <v-btn
            icon="mdi-eye"
            variant="text"
            size="small"
            @click="viewStudent(item)"
          />
          <v-menu>
            <template #activator="{ props }">
              <v-btn
                icon="mdi-dots-vertical"
                variant="text"
                size="small"
                v-bind="props"
              />
            </template>
            <v-list density="compact">
              <v-list-item @click="viewStudent(item)">
                <template #prepend>
                  <v-icon>mdi-eye</v-icon>
                </template>
                <v-list-item-title>View Details</v-list-item-title>
              </v-list-item>
              <v-divider />
              <v-list-subheader>Update Status</v-list-subheader>
              <v-list-item 
                v-for="status in statusOptions.filter(s => s.value && s.value !== item.enrollment_status)"
                :key="status.value!"
                @click="updateEnrollmentStatus(item.enrollment_id, status.value!)"
              >
                <v-list-item-title>{{ status.title }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </template>

        <!-- Empty state -->
        <template #no-data>
          <div class="text-center py-8">
            <v-icon size="64" color="grey-lighten-1">mdi-school-outline</v-icon>
            <h3 class="text-h6 mt-4">No students found</h3>
            <p class="text-body-2 text-medium-emphasis mb-4">
              {{ searchQuery || selectedProgramType || selectedStatus ? 
                'Try adjusting your filters' : 
                'Get started by inviting your first student' }}
            </p>
            <v-btn
              v-if="!searchQuery && !selectedProgramType && !selectedStatus"
              color="primary"
              @click="openInviteWizard"
            >
              Invite Student
            </v-btn>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Invite Student Wizard Dialog -->
    <v-dialog v-model="showInviteWizard" max-width="600" persistent>
      <v-card>
        <v-card-title class="d-flex align-center pa-4">
          <v-icon class="mr-2">mdi-account-plus</v-icon>
          Invite Student
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" @click="showInviteWizard = false" />
        </v-card-title>

        <v-divider />

        <!-- Stepper -->
        <v-stepper v-model="inviteStep" flat>
          <v-stepper-header>
            <v-stepper-item :value="1" title="Identity" :complete="inviteStep > 1" />
            <v-divider />
            <v-stepper-item :value="2" title="Details" :complete="inviteStep > 2" />
            <v-divider />
            <v-stepper-item :value="3" title="Program" :complete="inviteStep > 3" />
            <v-divider />
            <v-stepper-item :value="4" title="Review" />
          </v-stepper-header>

          <v-stepper-window>
            <!-- Step 1: Identity Check -->
            <v-stepper-window-item :value="1">
              <v-card-text class="pt-4">
                <p class="text-body-2 mb-4">
                  Enter the student's email to check if they already exist in the system.
                </p>
                <v-text-field
                  v-model="inviteForm.email"
                  label="Email Address"
                  type="email"
                  prepend-inner-icon="mdi-email"
                  variant="outlined"
                  :rules="[v => !!v || 'Email is required', v => /.+@.+/.test(v) || 'Must be valid email']"
                  autofocus
                  @keyup.enter="checkIdentity"
                />
              </v-card-text>
              <v-card-actions class="pa-4 pt-0">
                <v-spacer />
                <v-btn variant="text" @click="showInviteWizard = false">Cancel</v-btn>
                <v-btn 
                  color="primary" 
                  :loading="checkingIdentity"
                  @click="checkIdentity"
                >
                  Check & Continue
                </v-btn>
              </v-card-actions>
            </v-stepper-window-item>

            <!-- Step 2: Basic Details -->
            <v-stepper-window-item :value="2">
              <v-card-text class="pt-4">
                <!-- Identity Result Banner -->
                <v-alert
                  v-if="identityCheckResult?.found"
                  type="info"
                  variant="tonal"
                  class="mb-4"
                >
                  <strong>Existing Profile Found!</strong><br>
                  {{ identityCheckResult.existing_name }} is already in the system as 
                  <v-chip size="x-small" class="ml-1">{{ identityCheckResult.existing_stage }}</v-chip>.
                  A new program enrollment will be added to their profile.
                </v-alert>
                <v-alert
                  v-else-if="identityCheckResult"
                  type="success"
                  variant="tonal"
                  class="mb-4"
                >
                  <strong>New Student</strong><br>
                  No existing profile found. A new Universal Profile will be created.
                </v-alert>

                <v-row dense>
                  <v-col cols="6">
                    <v-text-field
                      v-model="inviteForm.first_name"
                      label="First Name"
                      variant="outlined"
                      :rules="[v => !!v || 'Required']"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model="inviteForm.last_name"
                      label="Last Name"
                      variant="outlined"
                      :rules="[v => !!v || 'Required']"
                    />
                  </v-col>
                  <v-col cols="12">
                    <v-text-field
                      v-model="inviteForm.phone"
                      label="Phone (optional)"
                      variant="outlined"
                      prepend-inner-icon="mdi-phone"
                    />
                  </v-col>
                  <v-col cols="12">
                    <v-text-field
                      v-model="inviteForm.school_of_origin"
                      label="School / University"
                      variant="outlined"
                      prepend-inner-icon="mdi-school"
                    />
                  </v-col>
                </v-row>
              </v-card-text>
              <v-card-actions class="pa-4 pt-0">
                <v-btn variant="text" @click="inviteStep = 1">Back</v-btn>
                <v-spacer />
                <v-btn 
                  color="primary" 
                  :disabled="!inviteForm.first_name || !inviteForm.last_name"
                  @click="inviteStep = 3"
                >
                  Continue
                </v-btn>
              </v-card-actions>
            </v-stepper-window-item>

            <!-- Step 3: Program Details -->
            <v-stepper-window-item :value="3">
              <v-card-text class="pt-4">
                <v-row dense>
                  <v-col cols="12">
                    <v-select
                      v-model="inviteForm.program_type"
                      :items="[
                        { title: 'Internship (12 months, paid)', value: 'internship' },
                        { title: 'Externship (2-8 weeks)', value: 'externship' },
                        { title: 'Paid Cohort', value: 'paid_cohort' },
                        { title: 'Student Intensive', value: 'intensive' },
                        { title: 'Shadow (1 day)', value: 'shadow' }
                      ]"
                      label="Program Type"
                      variant="outlined"
                      prepend-inner-icon="mdi-school"
                    />
                  </v-col>
                  <v-col cols="12">
                    <v-text-field
                      v-model="inviteForm.program_name"
                      label="Program Name (optional)"
                      variant="outlined"
                      placeholder="e.g., RVT Internship 2025"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model="inviteForm.start_date"
                      label="Start Date"
                      type="date"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model="inviteForm.end_date"
                      label="End Date"
                      type="date"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-select
                      v-model="inviteForm.assigned_location_id"
                      :items="locations"
                      item-title="name"
                      item-value="id"
                      label="Assigned Location"
                      variant="outlined"
                      clearable
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-select
                      v-model="inviteForm.assigned_mentor_id"
                      :items="employees.map(e => ({ title: `${e.first_name} ${e.last_name}`, value: e.id }))"
                      label="Assigned Mentor"
                      variant="outlined"
                      clearable
                    />
                  </v-col>
                </v-row>
              </v-card-text>
              <v-card-actions class="pa-4 pt-0">
                <v-btn variant="text" @click="inviteStep = 2">Back</v-btn>
                <v-spacer />
                <v-btn color="primary" @click="inviteStep = 4">Review</v-btn>
              </v-card-actions>
            </v-stepper-window-item>

            <!-- Step 4: Review & Send -->
            <v-stepper-window-item :value="4">
              <v-card-text class="pt-4">
                <v-list lines="two">
                  <v-list-item>
                    <template #prepend>
                      <v-avatar color="primary">
                        <span>{{ inviteForm.first_name[0] }}{{ inviteForm.last_name[0] }}</span>
                      </v-avatar>
                    </template>
                    <v-list-item-title class="font-weight-medium">
                      {{ inviteForm.first_name }} {{ inviteForm.last_name }}
                    </v-list-item-title>
                    <v-list-item-subtitle>{{ inviteForm.email }}</v-list-item-subtitle>
                  </v-list-item>
                </v-list>

                <v-divider class="my-4" />

                <v-list density="compact">
                  <v-list-item>
                    <template #prepend><v-icon>mdi-school</v-icon></template>
                    <v-list-item-title>Program</v-list-item-title>
                    <template #append>
                      <v-chip :color="getProgramTypeColor(inviteForm.program_type)" size="small">
                        {{ formatProgramType(inviteForm.program_type) }}
                      </v-chip>
                    </template>
                  </v-list-item>
                  <v-list-item v-if="inviteForm.school_of_origin">
                    <template #prepend><v-icon>mdi-domain</v-icon></template>
                    <v-list-item-title>School</v-list-item-title>
                    <template #append>{{ inviteForm.school_of_origin }}</template>
                  </v-list-item>
                  <v-list-item v-if="inviteForm.start_date">
                    <template #prepend><v-icon>mdi-calendar</v-icon></template>
                    <v-list-item-title>Dates</v-list-item-title>
                    <template #append>
                      {{ formatDate(inviteForm.start_date) }} 
                      <span v-if="inviteForm.end_date">→ {{ formatDate(inviteForm.end_date) }}</span>
                    </template>
                  </v-list-item>
                </v-list>

                <v-divider class="my-4" />

                <v-checkbox
                  v-model="inviteForm.send_invite_email"
                  label="Send invitation email to student"
                  hint="Student will receive a magic link to complete their profile"
                  persistent-hint
                />
              </v-card-text>
              <v-card-actions class="pa-4 pt-0">
                <v-btn variant="text" @click="inviteStep = 3">Back</v-btn>
                <v-spacer />
                <v-btn 
                  color="primary" 
                  :loading="saving"
                  @click="submitInvite"
                >
                  <v-icon start>mdi-send</v-icon>
                  {{ inviteForm.send_invite_email ? 'Send Invitation' : 'Create Enrollment' }}
                </v-btn>
              </v-card-actions>
            </v-stepper-window-item>
          </v-stepper-window>
        </v-stepper>
      </v-card>
    </v-dialog>

    <!-- Student Detail Dialog -->
    <v-dialog v-model="showStudentDialog" max-width="800">
      <v-card v-if="selectedStudent">
        <v-card-title class="d-flex align-center pa-4">
          <v-avatar size="48" class="mr-3">
            <v-img v-if="selectedStudent.avatar_url" :src="selectedStudent.avatar_url" />
            <span v-else class="text-h6">
              {{ selectedStudent.first_name[0] }}{{ selectedStudent.last_name[0] }}
            </span>
          </v-avatar>
          <div>
            <div class="text-h6">{{ selectedStudent.display_name }}</div>
            <div class="text-caption text-medium-emphasis">{{ selectedStudent.email }}</div>
          </div>
          <v-spacer />
          <v-chip :color="getProgramTypeColor(selectedStudent.program_type)" class="mr-2">
            {{ formatProgramType(selectedStudent.program_type) }}
          </v-chip>
          <v-chip :color="getStatusColor(selectedStudent.enrollment_status)">
            {{ formatStatus(selectedStudent.enrollment_status) }}
          </v-chip>
        </v-card-title>

        <v-divider />

        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <h4 class="text-subtitle-2 mb-2">Program Details</h4>
              <v-list density="compact">
                <v-list-item>
                  <v-list-item-title>Program Name</v-list-item-title>
                  <template #append>{{ selectedStudent.program_name || '—' }}</template>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Cohort</v-list-item-title>
                  <template #append>{{ selectedStudent.cohort_identifier || '—' }}</template>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Start Date</v-list-item-title>
                  <template #append>{{ formatDate(selectedStudent.start_date) }}</template>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>End Date</v-list-item-title>
                  <template #append>{{ formatDate(selectedStudent.end_date) }}</template>
                </v-list-item>
              </v-list>
            </v-col>

            <v-col cols="12" md="6">
              <h4 class="text-subtitle-2 mb-2">Assignment</h4>
              <v-list density="compact">
                <v-list-item>
                  <v-list-item-title>Location</v-list-item-title>
                  <template #append>{{ selectedStudent.location_name || '—' }}</template>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Mentor</v-list-item-title>
                  <template #append>{{ selectedStudent.mentor_name || '—' }}</template>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Coordinator</v-list-item-title>
                  <template #append>{{ selectedStudent.coordinator_name || '—' }}</template>
                </v-list-item>
              </v-list>
            </v-col>

            <v-col cols="12" md="6">
              <h4 class="text-subtitle-2 mb-2">Academic Info</h4>
              <v-list density="compact">
                <v-list-item>
                  <v-list-item-title>School</v-list-item-title>
                  <template #append>{{ selectedStudent.school_of_origin || '—' }}</template>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Program</v-list-item-title>
                  <template #append>{{ selectedStudent.school_program || '—' }}</template>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Academic Advisor</v-list-item-title>
                  <template #append>{{ selectedStudent.academic_advisor || '—' }}</template>
                </v-list-item>
              </v-list>
            </v-col>

            <v-col cols="12" md="6">
              <h4 class="text-subtitle-2 mb-2">Progress</h4>
              <v-list density="compact">
                <v-list-item v-if="selectedStudent.hours_required">
                  <v-list-item-title>Hours Completed</v-list-item-title>
                  <template #append>
                    {{ selectedStudent.hours_completed || 0 }} / {{ selectedStudent.hours_required }}
                  </template>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Performance Rating</v-list-item-title>
                  <template #append>
                    <v-chip v-if="selectedStudent.overall_performance_rating" size="small">
                      {{ formatStatus(selectedStudent.overall_performance_rating) }}
                    </v-chip>
                    <span v-else>—</span>
                  </template>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Employment Interest</v-list-item-title>
                  <template #append>
                    {{ selectedStudent.employment_interest_level ? formatStatus(selectedStudent.employment_interest_level) : '—' }}
                  </template>
                </v-list-item>
              </v-list>
            </v-col>
          </v-row>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-btn variant="text" @click="showStudentDialog = false">Close</v-btn>
          <v-spacer />
          <v-btn color="primary" variant="tonal">
            <v-icon start>mdi-pencil</v-icon>
            Edit Enrollment
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
