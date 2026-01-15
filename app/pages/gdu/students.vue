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
  { title: 'Internship', value: 'internship' },
  { title: 'Externship', value: 'externship' },
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
  fetchJobPositions()
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
  invite_method: 'google_form' as 'google_form' | 'email' | 'none'
})

// Google Form URLs per program type (can be configured in global settings)
const programFormUrls: Record<string, string> = {
  internship: 'https://forms.gle/YOUR_INTERNSHIP_FORM',
  externship: 'https://forms.gle/YOUR_EXTERNSHIP_FORM',
  shadow: 'https://forms.gle/YOUR_SHADOW_FORM',
  paid_cohort: 'https://forms.gle/YOUR_COHORT_FORM',
  intensive: 'https://forms.gle/YOUR_INTENSIVE_FORM'
}

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
    invite_method: 'google_form'
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
    // Create the student enrollment record
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
      p_send_email: inviteForm.value.invite_method === 'email',
      p_expires_in_days: 30
    })
    
    if (error) throw error
    
    const result = data?.[0]
    
    // Handle different invite methods
    if (inviteForm.value.invite_method === 'google_form') {
      const formUrl = programFormUrls[inviteForm.value.program_type] || programFormUrls.externship
      // Pre-fill form with student info (add query params)
      const prefilledUrl = `${formUrl}?entry.email=${encodeURIComponent(inviteForm.value.email)}&entry.name=${encodeURIComponent(inviteForm.value.first_name + ' ' + inviteForm.value.last_name)}`
      
      showSuccess(`Student record created. Opening application form...`)
      // Open the Google Form in a new tab
      window.open(prefilledUrl, '_blank')
    } else if (inviteForm.value.invite_method === 'email') {
      showSuccess(result?.is_new_person 
        ? 'Created new student record and sent invitation email' 
        : 'Added program enrollment and sent invitation email')
    } else {
      showSuccess(result?.is_new_person 
        ? 'Created new student record (no invitation sent)' 
        : 'Added program enrollment (no invitation sent)')
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
const detailTab = ref('bio')
const studentNotes = ref('')
const savingNotes = ref(false)

// Edit student dialog
const showEditDialog = ref(false)
const editForm = ref({
  program_type: '',
  program_name: '',
  enrollment_status: '',
  school_of_origin: '',
  school_program: '',
  start_date: '',
  end_date: '',
  expected_graduation_date: '',
  cohort_identifier: '',
  assigned_location_id: null as string | null,
  assigned_mentor_id: null as string | null,
  schedule_type: '',
  scheduled_hours_per_week: null as number | null,
  is_paid: false,
  stipend_amount: null as number | null,
  hours_completed: null as number | null,
  hours_required: null as number | null,
  overall_performance_rating: null as string | null,
  employment_interest_level: null as string | null,
  eligible_for_employment: false
})
const savingEdit = ref(false)

// Convert to candidate
const showConvertDialog = ref(false)
const converting = ref(false)
const convertPositionId = ref<string | null>(null)
const jobPositions = ref<{ id: string; title: string }[]>([])

function viewStudent(student: StudentEnrollment) {
  selectedStudent.value = student
  detailTab.value = 'bio'
  studentNotes.value = ''
  showStudentDialog.value = true
  // Load notes from database
  loadStudentNotes(student.enrollment_id)
}

async function loadStudentNotes(enrollmentId: string) {
  try {
    const { data, error } = await supabase
      .from('person_program_data')
      .select('program_notes')
      .eq('id', enrollmentId)
      .single()
    
    if (error) throw error
    studentNotes.value = data?.program_notes || ''
  } catch (error: any) {
    console.error('Error loading notes:', error)
  }
}

async function fetchJobPositions() {
  const { data } = await supabase
    .from('job_positions')
    .select('id, title')
    .eq('is_active', true)
    .order('title')
  jobPositions.value = data || []
}

async function saveStudentNotes() {
  if (!selectedStudent.value) return
  savingNotes.value = true
  try {
    const { error } = await supabase
      .from('person_program_data')
      .update({ program_notes: studentNotes.value })
      .eq('id', selectedStudent.value.enrollment_id)
    
    if (error) throw error
    showSuccess('Notes saved')
  } catch (error: any) {
    console.error('Error saving notes:', error)
    showError('Failed to save notes')
  } finally {
    savingNotes.value = false
  }
}

function convertToCandidate() {
  if (!selectedStudent.value) return
  convertPositionId.value = null
  showConvertDialog.value = true
}

async function confirmConvertToCandidate() {
  if (!selectedStudent.value) return
  converting.value = true
  try {
    // Use the database function for comprehensive conversion
    const { data, error } = await supabase
      .rpc('convert_student_to_candidate', {
        p_enrollment_id: selectedStudent.value.enrollment_id,
        p_target_position_id: convertPositionId.value,
        p_notes: studentNotes.value || null
      })
    
    if (error) {
      // Fallback to direct insert if function doesn't exist yet
      if (error.code === 'PGRST202') {
        console.log('Using fallback conversion method')
        const { error: candidateError } = await supabase
          .from('candidates')
          .insert({
            first_name: selectedStudent.value.first_name,
            last_name: selectedStudent.value.last_name,
            email: selectedStudent.value.email,
            phone: selectedStudent.value.phone_mobile,
            phone_mobile: selectedStudent.value.phone_mobile,
            target_position_id: convertPositionId.value,
            status: 'new',
            source: 'internal_program',
            referral_source: `Converted from ${formatProgramType(selectedStudent.value.program_type)} program`,
            conversion_source: 'student_program',
            notes: buildConversionNotes()
          })
        
        if (candidateError) throw candidateError
        
        // Update student enrollment
        await supabase
          .from('person_program_data')
          .update({ 
            enrollment_status: 'completed',
            actual_completion_date: new Date().toISOString().split('T')[0],
            program_notes: (studentNotes.value ? studentNotes.value + '\n\n' : '') + 
              `Converted to recruiting candidate on ${new Date().toLocaleDateString()}`
          })
          .eq('id', selectedStudent.value.enrollment_id)
      } else {
        throw error
      }
    }
    
    showSuccess(`${selectedStudent.value.display_name} has been added to the Recruiting CRM`)
    showConvertDialog.value = false
    showStudentDialog.value = false
    fetchStudents()
  } catch (error: any) {
    console.error('Error converting to candidate:', error)
    showError(error.message || 'Failed to convert to candidate')
  } finally {
    converting.value = false
  }
}

function buildConversionNotes(): string {
  if (!selectedStudent.value) return ''
  const s = selectedStudent.value
  let notes = `Converted from ${formatProgramType(s.program_type)} program`
  if (s.program_name) notes += ` (${s.program_name})`
  if (s.school_of_origin) notes += `. School: ${s.school_of_origin}`
  if (s.hours_completed && s.hours_required) {
    notes += `. Completed ${s.hours_completed}/${s.hours_required} hours`
  }
  if (s.overall_performance_rating) {
    notes += `. Performance: ${s.overall_performance_rating.replace(/_/g, ' ')}`
  }
  if (studentNotes.value) {
    notes += `\n\n--- Program Notes ---\n${studentNotes.value}`
  }
  return notes
}

function openEditDialog() {
  if (!selectedStudent.value) return
  
  const s = selectedStudent.value
  editForm.value = {
    program_type: s.program_type,
    program_name: s.program_name || '',
    enrollment_status: s.enrollment_status,
    school_of_origin: s.school_of_origin || '',
    school_program: s.school_program || '',
    start_date: s.start_date || '',
    end_date: s.end_date || '',
    expected_graduation_date: s.expected_graduation_date || '',
    cohort_identifier: s.cohort_identifier || '',
    assigned_location_id: s.assigned_location_id,
    assigned_mentor_id: s.assigned_mentor_id,
    schedule_type: s.schedule_type || '',
    scheduled_hours_per_week: s.scheduled_hours_per_week,
    is_paid: s.is_paid,
    stipend_amount: s.stipend_amount,
    hours_completed: s.hours_completed,
    hours_required: s.hours_required,
    overall_performance_rating: s.overall_performance_rating,
    employment_interest_level: s.employment_interest_level,
    eligible_for_employment: s.eligible_for_employment || false
  }
  showEditDialog.value = true
}

async function saveStudentEdit() {
  if (!selectedStudent.value) return
  
  savingEdit.value = true
  try {
    const { error } = await supabase
      .from('person_program_data')
      .update({
        program_type: editForm.value.program_type,
        program_name: editForm.value.program_name || null,
        enrollment_status: editForm.value.enrollment_status,
        school_of_origin: editForm.value.school_of_origin || null,
        school_program: editForm.value.school_program || null,
        start_date: editForm.value.start_date || null,
        end_date: editForm.value.end_date || null,
        expected_graduation_date: editForm.value.expected_graduation_date || null,
        cohort_identifier: editForm.value.cohort_identifier || null,
        assigned_location_id: editForm.value.assigned_location_id,
        assigned_mentor_id: editForm.value.assigned_mentor_id,
        schedule_type: editForm.value.schedule_type || null,
        scheduled_hours_per_week: editForm.value.scheduled_hours_per_week,
        is_paid: editForm.value.is_paid,
        stipend_amount: editForm.value.stipend_amount,
        hours_completed: editForm.value.hours_completed,
        hours_required: editForm.value.hours_required,
        overall_performance_rating: editForm.value.overall_performance_rating,
        employment_interest_level: editForm.value.employment_interest_level,
        eligible_for_employment: editForm.value.eligible_for_employment,
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedStudent.value.enrollment_id)
    
    if (error) throw error
    
    showSuccess('Student enrollment updated')
    showEditDialog.value = false
    await fetchStudents()
    
    // Update selected student view
    const updated = students.value.find(s => s.enrollment_id === selectedStudent.value?.enrollment_id)
    if (updated) selectedStudent.value = updated
  } catch (error: any) {
    console.error('Error saving student edit:', error)
    showError('Failed to save changes')
  } finally {
    savingEdit.value = false
  }
}

function getTimeStatusColor(status: string): string {
  const colors: Record<string, string> = {
    current: 'success',
    upcoming: 'info',
    past: 'grey',
    other: 'grey'
  }
  return colors[status] || 'grey'
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
    await fetchStudents()
    // Update selected student if viewing
    if (selectedStudent.value && selectedStudent.value.enrollment_id === enrollmentId) {
      const updated = students.value.find(s => s.enrollment_id === enrollmentId)
      if (updated) selectedStudent.value = updated
    }
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
          <div class="d-flex align-center py-2 cursor-pointer" @click="viewStudent(item)">
            <v-avatar size="36" class="mr-3">
              <v-img v-if="item.avatar_url" :src="item.avatar_url" />
              <span v-else class="text-body-2">
                {{ item.first_name[0] }}{{ item.last_name[0] }}
              </span>
            </v-avatar>
            <div>
              <div class="font-weight-medium text-primary" style="text-decoration: underline; cursor: pointer;">{{ item.display_name }}</div>
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
            v-if="item.phone_mobile"
            icon="mdi-phone"
            variant="text"
            size="small"
            :href="`tel:${item.phone_mobile}`"
            title="Call"
          />
          <v-btn
            v-if="item.email"
            icon="mdi-email"
            variant="text"
            size="small"
            :href="`mailto:${item.email}`"
            title="Email"
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
                  <v-icon>mdi-account</v-icon>
                </template>
                <v-list-item-title>View Profile</v-list-item-title>
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

                <h4 class="text-subtitle-2 mb-3">How would you like to invite this student?</h4>
                <v-radio-group v-model="inviteForm.invite_method">
                  <v-radio value="google_form" color="primary">
                    <template #label>
                      <div>
                        <span class="font-weight-medium">Send to Google Form Application</span>
                        <div class="text-caption text-medium-emphasis">Opens the program application form pre-filled with student info</div>
                      </div>
                    </template>
                  </v-radio>
                  <v-radio value="email" color="primary">
                    <template #label>
                      <div>
                        <span class="font-weight-medium">Send Email Invitation</span>
                        <div class="text-caption text-medium-emphasis">Student receives a magic link to complete their profile</div>
                      </div>
                    </template>
                  </v-radio>
                  <v-radio value="none" color="primary">
                    <template #label>
                      <div>
                        <span class="font-weight-medium">Just create record (no invitation)</span>
                        <div class="text-caption text-medium-emphasis">Create enrollment only, invite later manually</div>
                      </div>
                    </template>
                  </v-radio>
                </v-radio-group>
              </v-card-text>
              <v-card-actions class="pa-4 pt-0">
                <v-btn variant="text" @click="inviteStep = 3">Back</v-btn>
                <v-spacer />
                <v-btn 
                  color="primary" 
                  :loading="saving"
                  @click="submitInvite"
                >
                  <v-icon start>{{ inviteForm.invite_method === 'google_form' ? 'mdi-open-in-new' : inviteForm.invite_method === 'email' ? 'mdi-email-send' : 'mdi-check' }}</v-icon>
                  {{ inviteForm.invite_method === 'google_form' ? 'Create & Open Form' : inviteForm.invite_method === 'email' ? 'Send Invitation' : 'Create Enrollment' }}
                </v-btn>
              </v-card-actions>
            </v-stepper-window-item>
          </v-stepper-window>
        </v-stepper>
      </v-card>
    </v-dialog>

    <!-- Student Detail Dialog (Matches Candidate Profile Layout) -->
    <v-dialog v-model="showStudentDialog" max-width="700" scrollable>
      <v-card v-if="selectedStudent">
        <v-card-title class="d-flex align-center py-4 bg-primary">
          <v-avatar :color="getStatusColor(selectedStudent.enrollment_status)" size="40" class="mr-3">
            <v-img v-if="selectedStudent.avatar_url" :src="selectedStudent.avatar_url" />
            <span v-else class="text-white font-weight-bold">{{ selectedStudent.first_name[0] }}{{ selectedStudent.last_name[0] }}</span>
          </v-avatar>
          <div class="text-white">
            <div class="font-weight-bold">{{ selectedStudent.display_name }}</div>
            <div class="text-caption">{{ formatProgramType(selectedStudent.program_type) }} • {{ selectedStudent.school_of_origin || 'No school' }}</div>
          </div>
          <v-spacer />
          <v-chip :color="getStatusColor(selectedStudent.enrollment_status)" variant="elevated" size="small">
            {{ formatStatus(selectedStudent.enrollment_status) }}
          </v-chip>
        </v-card-title>

        <v-tabs v-model="detailTab" bg-color="grey-lighten-4">
          <v-tab value="bio"><v-icon start size="small">mdi-account</v-icon>Bio</v-tab>
          <v-tab value="program"><v-icon start size="small">mdi-school</v-icon>Program</v-tab>
          <v-tab value="progress"><v-icon start size="small">mdi-chart-line</v-icon>Progress</v-tab>
          <v-tab value="notes"><v-icon start size="small">mdi-note-text</v-icon>Notes</v-tab>
        </v-tabs>

        <v-window v-model="detailTab">
          <!-- Bio Tab -->
          <v-window-item value="bio">
            <v-card-text>
              <v-row dense>
                <v-col cols="12" sm="6">
                  <v-text-field v-model="selectedStudent.email" label="Email" prepend-inner-icon="mdi-email" variant="outlined" density="compact" readonly />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field :model-value="selectedStudent.phone_mobile || ''" label="Phone" prepend-inner-icon="mdi-phone" variant="outlined" density="compact" readonly />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field :model-value="selectedStudent.school_of_origin || ''" label="School / University" prepend-inner-icon="mdi-school" variant="outlined" density="compact" readonly />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field :model-value="selectedStudent.school_program || ''" label="Academic Program" prepend-inner-icon="mdi-book-education" variant="outlined" density="compact" readonly />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field :model-value="formatDate(selectedStudent.expected_graduation_date)" label="Expected Graduation" prepend-inner-icon="mdi-school-outline" variant="outlined" density="compact" readonly />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field :model-value="selectedStudent.location_name || 'Unassigned'" label="Assigned Location" prepend-inner-icon="mdi-map-marker" variant="outlined" density="compact" readonly />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field :model-value="selectedStudent.mentor_name || 'Unassigned'" label="Mentor" prepend-inner-icon="mdi-account-tie" variant="outlined" density="compact" readonly />
                </v-col>
              </v-row>

              <v-divider class="my-4" />

              <!-- Quick Actions -->
              <div class="d-flex flex-wrap gap-2">
                <v-btn v-if="selectedStudent.phone_mobile" color="primary" prepend-icon="mdi-phone" size="small" :href="`tel:${selectedStudent.phone_mobile}`">
                  Call
                </v-btn>
                <v-btn v-if="selectedStudent.email" color="secondary" prepend-icon="mdi-email" size="small" :href="`mailto:${selectedStudent.email}`">
                  Email
                </v-btn>
                <v-btn v-if="selectedStudent.enrollment_status === 'inquiry'" color="blue" prepend-icon="mdi-file-check" size="small" @click="updateEnrollmentStatus(selectedStudent.enrollment_id, 'applied')">
                  Mark Applied
                </v-btn>
                <v-btn v-if="selectedStudent.enrollment_status === 'applied'" color="purple" prepend-icon="mdi-account-voice" size="small" @click="updateEnrollmentStatus(selectedStudent.enrollment_id, 'interview')">
                  Schedule Interview
                </v-btn>
                <v-btn v-if="selectedStudent.enrollment_status === 'interview'" color="green" prepend-icon="mdi-check" size="small" @click="updateEnrollmentStatus(selectedStudent.enrollment_id, 'accepted')">
                  Accept
                </v-btn>
                <v-btn v-if="selectedStudent.enrollment_status === 'accepted'" color="teal" prepend-icon="mdi-school" size="small" @click="updateEnrollmentStatus(selectedStudent.enrollment_id, 'enrolled')">
                  Enroll
                </v-btn>
                <v-btn v-if="selectedStudent.enrollment_status === 'enrolled'" color="teal" prepend-icon="mdi-play" size="small" @click="updateEnrollmentStatus(selectedStudent.enrollment_id, 'in_progress')">
                  Start Program
                </v-btn>
                <v-btn v-if="selectedStudent.enrollment_status === 'in_progress'" color="success" prepend-icon="mdi-flag-checkered" size="small" @click="updateEnrollmentStatus(selectedStudent.enrollment_id, 'completed')">
                  Mark Completed
                </v-btn>
              </div>
            </v-card-text>
          </v-window-item>

          <!-- Program Tab -->
          <v-window-item value="program">
            <v-card-text>
              <v-row dense>
                <v-col cols="12" sm="6">
                  <v-select
                    :model-value="selectedStudent.program_type"
                    :items="programTypeOptions.filter(p => p.value)"
                    label="Program Type"
                    prepend-inner-icon="mdi-school"
                    variant="outlined"
                    density="compact"
                    readonly
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field :model-value="selectedStudent.program_name || ''" label="Program Name" prepend-inner-icon="mdi-tag" variant="outlined" density="compact" readonly />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field :model-value="formatDate(selectedStudent.start_date)" label="Start Date" prepend-inner-icon="mdi-calendar-start" variant="outlined" density="compact" readonly />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field :model-value="formatDate(selectedStudent.end_date)" label="End Date" prepend-inner-icon="mdi-calendar-end" variant="outlined" density="compact" readonly />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field :model-value="selectedStudent.cohort_identifier || ''" label="Cohort" prepend-inner-icon="mdi-account-group" variant="outlined" density="compact" readonly />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field :model-value="selectedStudent.schedule_type ? formatStatus(selectedStudent.schedule_type) : ''" label="Schedule Type" prepend-inner-icon="mdi-clock" variant="outlined" density="compact" readonly />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field :model-value="selectedStudent.is_paid ? 'Yes' : 'No'" label="Paid Program" prepend-inner-icon="mdi-currency-usd" variant="outlined" density="compact" readonly />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field v-if="selectedStudent.is_paid" :model-value="selectedStudent.stipend_amount ? `$${selectedStudent.stipend_amount}` : ''" label="Stipend" prepend-inner-icon="mdi-cash" variant="outlined" density="compact" readonly />
                </v-col>
              </v-row>
            </v-card-text>
          </v-window-item>

          <!-- Progress Tab -->
          <v-window-item value="progress">
            <v-card-text>
              <v-row dense>
                <v-col cols="12">
                  <h4 class="text-subtitle-2 mb-3">Hours Tracking</h4>
                  <div v-if="selectedStudent.hours_required" class="mb-4">
                    <div class="d-flex justify-space-between mb-1">
                      <span class="text-body-2">{{ selectedStudent.hours_completed || 0 }} / {{ selectedStudent.hours_required }} hours</span>
                      <span class="text-body-2 font-weight-bold">{{ selectedStudent.completion_percentage || 0 }}%</span>
                    </div>
                    <v-progress-linear :model-value="selectedStudent.completion_percentage || 0" color="primary" height="12" rounded />
                  </div>
                  <v-alert v-else type="info" variant="tonal" density="compact" class="mb-4">
                    No hours requirement set for this program.
                  </v-alert>
                </v-col>

                <v-col cols="12" sm="6">
                  <v-select
                    :model-value="selectedStudent.overall_performance_rating || null"
                    :items="[
                      { title: 'Exceptional', value: 'exceptional' },
                      { title: 'Exceeds Expectations', value: 'exceeds_expectations' },
                      { title: 'Meets Expectations', value: 'meets_expectations' },
                      { title: 'Needs Improvement', value: 'needs_improvement' },
                      { title: 'Unsatisfactory', value: 'unsatisfactory' }
                    ]"
                    label="Performance Rating"
                    prepend-inner-icon="mdi-star"
                    variant="outlined"
                    density="compact"
                    readonly
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-select
                    :model-value="selectedStudent.employment_interest_level || null"
                    :items="[
                      { title: 'Very Interested', value: 'very_interested' },
                      { title: 'Interested', value: 'interested' },
                      { title: 'Undecided', value: 'undecided' },
                      { title: 'Not Interested', value: 'not_interested' }
                    ]"
                    label="Employment Interest"
                    prepend-inner-icon="mdi-briefcase-account"
                    variant="outlined"
                    density="compact"
                    readonly
                  />
                </v-col>
                <v-col cols="12">
                  <v-checkbox
                    :model-value="selectedStudent.eligible_for_employment"
                    label="Eligible for Employment"
                    readonly
                    hide-details
                  />
                </v-col>
              </v-row>

              <v-divider class="my-4" />

              <h4 class="text-subtitle-2 mb-3">Time Status</h4>
              <v-chip :color="getTimeStatusColor(selectedStudent.time_status)" size="small">
                {{ formatStatus(selectedStudent.time_status) }}
              </v-chip>
            </v-card-text>
          </v-window-item>

          <!-- Notes Tab -->
          <v-window-item value="notes">
            <v-card-text>
              <!-- Legacy Program Notes (from person_program_data) -->
              <v-expansion-panels v-if="studentNotes" class="mb-4">
                <v-expansion-panel>
                  <v-expansion-panel-title>
                    <v-icon start size="small" color="grey">mdi-history</v-icon>
                    Legacy Program Notes
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <v-textarea
                      v-model="studentNotes"
                      label="Program Notes (Legacy)"
                      variant="outlined"
                      rows="4"
                      readonly
                      class="mb-2"
                    />
                    <v-btn color="primary" size="small" @click="saveStudentNotes" :loading="savingNotes">
                      <v-icon start>mdi-content-save</v-icon>
                      Save Legacy Notes
                    </v-btn>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
              
              <!-- New Unified Notes System -->
              <UiContactNotes
                v-if="selectedStudent"
                contact-type="student"
                :contact-id="selectedStudent.person_id"
                :enrollment-id="selectedStudent.enrollment_id"
                :note-types="['general', 'progress', 'feedback', 'training']"
                show-visibility-control
              />
            </v-card-text>
          </v-window-item>
        </v-window>

        <v-divider />
        <v-card-actions class="pa-4">
          <v-btn variant="text" @click="showStudentDialog = false">Close</v-btn>
          <v-spacer />
          <v-btn color="warning" variant="tonal" prepend-icon="mdi-account-arrow-right" @click="convertToCandidate">
            Convert to Job Candidate
          </v-btn>
          <v-btn color="primary" variant="tonal" prepend-icon="mdi-pencil" @click="openEditDialog">
            Edit
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Convert to Candidate Confirmation -->
    <v-dialog v-model="showConvertDialog" max-width="500">
      <v-card>
        <v-card-title class="bg-warning py-4">
          <v-icon start>mdi-account-arrow-right</v-icon>
          Convert to Recruiting Candidate
        </v-card-title>
        <v-card-text class="pt-4">
          <v-alert type="info" variant="tonal" class="mb-4">
            This will create a recruiting candidate profile for <strong>{{ selectedStudent?.display_name }}</strong>
            and move them from the Student CRM to the Recruiting CRM.
          </v-alert>
          <p class="text-body-2 mb-4">
            Their student enrollment will be marked as <strong>completed</strong> and they will appear in the Recruiting pipeline.
          </p>
          <v-select
            v-model="convertPositionId"
            :items="jobPositions"
            item-title="title"
            item-value="id"
            label="Target Position (optional)"
            variant="outlined"
            density="compact"
            clearable
            hint="Select a position they are applying for"
            persistent-hint
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-btn variant="text" @click="showConvertDialog = false">Cancel</v-btn>
          <v-spacer />
          <v-btn color="warning" :loading="converting" @click="confirmConvertToCandidate">
            <v-icon start>mdi-check</v-icon>
            Convert to Candidate
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Student Dialog -->
    <v-dialog v-model="showEditDialog" max-width="700" scrollable>
      <v-card>
        <v-card-title class="bg-primary py-4 text-white">
          <v-icon start>mdi-pencil</v-icon>
          Edit Student Enrollment
        </v-card-title>
        <v-card-text class="pt-4">
          <v-row dense>
            <!-- Program Information -->
            <v-col cols="12">
              <h4 class="text-subtitle-2 mb-2">Program Information</h4>
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="editForm.program_type"
                :items="programTypeOptions.filter(p => p.value)"
                item-title="title"
                item-value="value"
                label="Program Type"
                prepend-inner-icon="mdi-school"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="editForm.enrollment_status"
                :items="statusOptions.filter(s => s.value)"
                item-title="title"
                item-value="value"
                label="Status"
                prepend-inner-icon="mdi-flag"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="editForm.program_name" label="Program Name" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="editForm.cohort_identifier" label="Cohort" variant="outlined" density="compact" />
            </v-col>

            <!-- School Information -->
            <v-col cols="12" class="mt-2">
              <h4 class="text-subtitle-2 mb-2">School Information</h4>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="editForm.school_of_origin" label="School / University" prepend-inner-icon="mdi-school" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="editForm.school_program" label="Academic Program" prepend-inner-icon="mdi-book-education" variant="outlined" density="compact" />
            </v-col>

            <!-- Dates -->
            <v-col cols="12" class="mt-2">
              <h4 class="text-subtitle-2 mb-2">Dates</h4>
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field v-model="editForm.start_date" label="Start Date" type="date" prepend-inner-icon="mdi-calendar-start" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field v-model="editForm.end_date" label="End Date" type="date" prepend-inner-icon="mdi-calendar-end" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field v-model="editForm.expected_graduation_date" label="Expected Graduation" type="date" prepend-inner-icon="mdi-school" variant="outlined" density="compact" />
            </v-col>

            <!-- Assignment -->
            <v-col cols="12" class="mt-2">
              <h4 class="text-subtitle-2 mb-2">Assignment</h4>
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="editForm.assigned_location_id"
                :items="locations"
                item-title="name"
                item-value="id"
                label="Location"
                prepend-inner-icon="mdi-map-marker"
                variant="outlined"
                density="compact"
                clearable
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="editForm.assigned_mentor_id"
                :items="employees"
                :item-title="(m: Employee) => `${m.first_name} ${m.last_name}`"
                item-value="id"
                label="Mentor"
                prepend-inner-icon="mdi-account-tie"
                variant="outlined"
                density="compact"
                clearable
              />
            </v-col>

            <!-- Schedule -->
            <v-col cols="12" class="mt-2">
              <h4 class="text-subtitle-2 mb-2">Schedule & Compensation</h4>
            </v-col>
            <v-col cols="12" sm="4">
              <v-select
                v-model="editForm.schedule_type"
                :items="[
                  { title: 'Full-time', value: 'full_time' },
                  { title: 'Part-time', value: 'part_time' },
                  { title: 'Flexible', value: 'flexible' }
                ]"
                label="Schedule Type"
                prepend-inner-icon="mdi-clock"
                variant="outlined"
                density="compact"
                clearable
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field 
                v-model.number="editForm.scheduled_hours_per_week" 
                label="Hours/Week" 
                type="number" 
                prepend-inner-icon="mdi-clock-time-four"
                variant="outlined" 
                density="compact" 
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-checkbox v-model="editForm.is_paid" label="Paid Program" hide-details />
            </v-col>
            <v-col cols="12" sm="4" v-if="editForm.is_paid">
              <v-text-field 
                v-model.number="editForm.stipend_amount" 
                label="Stipend Amount" 
                type="number" 
                prefix="$"
                prepend-inner-icon="mdi-currency-usd"
                variant="outlined" 
                density="compact" 
              />
            </v-col>

            <!-- Progress -->
            <v-col cols="12" class="mt-2">
              <h4 class="text-subtitle-2 mb-2">Progress & Evaluation</h4>
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field 
                v-model.number="editForm.hours_completed" 
                label="Hours Completed" 
                type="number" 
                prepend-inner-icon="mdi-check-circle"
                variant="outlined" 
                density="compact" 
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field 
                v-model.number="editForm.hours_required" 
                label="Hours Required" 
                type="number" 
                prepend-inner-icon="mdi-target"
                variant="outlined" 
                density="compact" 
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-select
                v-model="editForm.overall_performance_rating"
                :items="[
                  { title: 'Exceptional', value: 'exceptional' },
                  { title: 'Exceeds Expectations', value: 'exceeds_expectations' },
                  { title: 'Meets Expectations', value: 'meets_expectations' },
                  { title: 'Needs Improvement', value: 'needs_improvement' },
                  { title: 'Unsatisfactory', value: 'unsatisfactory' }
                ]"
                label="Performance Rating"
                prepend-inner-icon="mdi-star"
                variant="outlined"
                density="compact"
                clearable
              />
            </v-col>

            <!-- Employment Outcomes -->
            <v-col cols="12" class="mt-2">
              <h4 class="text-subtitle-2 mb-2">Employment Outcomes</h4>
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="editForm.employment_interest_level"
                :items="[
                  { title: 'Very Interested', value: 'very_interested' },
                  { title: 'Interested', value: 'interested' },
                  { title: 'Undecided', value: 'undecided' },
                  { title: 'Not Interested', value: 'not_interested' }
                ]"
                label="Employment Interest"
                prepend-inner-icon="mdi-briefcase-account"
                variant="outlined"
                density="compact"
                clearable
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-checkbox v-model="editForm.eligible_for_employment" label="Eligible for Employment" hide-details />
            </v-col>
          </v-row>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-btn variant="text" @click="showEditDialog = false">Cancel</v-btn>
          <v-spacer />
          <v-btn color="primary" :loading="savingEdit" @click="saveStudentEdit">
            <v-icon start>mdi-content-save</v-icon>
            Save Changes
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
