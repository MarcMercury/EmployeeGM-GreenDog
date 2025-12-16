<template>
  <div class="interviews-page">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Interviews</h1>
        <p class="text-body-1 text-grey-darken-1">
          Manage candidate interviews and session notes
        </p>
      </div>
      <v-chip color="warning" variant="flat">
        <v-icon start>mdi-shield-crown</v-icon>
        Admin Only
      </v-chip>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="d-flex justify-center align-center" style="min-height: 400px;">
      <v-progress-circular indeterminate color="primary" size="64" />
    </div>

    <v-row v-else>
      <!-- Candidate List (Left Panel) -->
      <v-col cols="12" md="4">
        <v-card rounded="lg" class="candidate-list-card">
          <v-card-title class="d-flex align-center justify-space-between">
            <span>Candidates</span>
            <v-chip size="small" color="primary" variant="tonal">
              {{ filteredCandidates.length }}
            </v-chip>
          </v-card-title>
          
          <v-card-text class="pa-2">
            <!-- Search -->
            <v-text-field
              v-model="searchQuery"
              placeholder="Search candidates..."
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              hide-details
              class="mb-3"
            />

            <!-- Filter chips -->
            <div class="d-flex flex-wrap gap-1 mb-3">
              <v-chip
                v-for="status in statusFilters"
                :key="status.value"
                :color="filterStatus === status.value ? status.color : 'grey'"
                :variant="filterStatus === status.value ? 'flat' : 'outlined'"
                size="small"
                @click="filterStatus = status.value"
              >
                {{ status.label }}
              </v-chip>
            </div>

            <!-- Candidate List -->
            <v-list v-if="filteredCandidates.length > 0" class="candidate-scroll-list" lines="three" density="compact">
              <v-list-item
                v-for="candidate in filteredCandidates"
                :key="candidate.id"
                :active="selectedCandidate?.id === candidate.id"
                @click="selectCandidate(candidate)"
                rounded="lg"
                class="mb-1"
              >
                <template #prepend>
                  <v-avatar :color="getStatusColor(candidate.status)" size="40">
                    <span class="text-white text-caption">{{ getInitials(candidate.first_name, candidate.last_name) }}</span>
                  </v-avatar>
                </template>
                
                <v-list-item-title class="font-weight-medium">
                  {{ candidate.first_name }} {{ candidate.last_name }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ candidate.job_positions?.title || 'No position' }}
                </v-list-item-subtitle>
                <v-list-item-subtitle class="text-caption">
                  <v-icon size="12" class="mr-1">mdi-calendar</v-icon>
                  {{ candidate.interview_date ? formatDate(candidate.interview_date) : 'Not scheduled' }}
                </v-list-item-subtitle>
                
                <template #append>
                  <v-chip :color="getStatusColor(candidate.status)" size="x-small" variant="flat">
                    {{ formatStatus(candidate.status) }}
                  </v-chip>
                </template>
              </v-list-item>
            </v-list>

            <!-- Empty State -->
            <div v-else class="text-center py-8">
              <v-icon size="48" color="grey-lighten-1">mdi-account-search</v-icon>
              <p class="text-body-2 text-grey mt-2">No candidates found</p>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Interview Panel (Right) -->
      <v-col cols="12" md="8">
        <template v-if="selectedCandidate">
          <v-card rounded="lg" class="mb-4">
            <!-- Candidate Header - Editable -->
            <div class="d-flex align-center pa-4 bg-primary-lighten-5">
              <v-avatar :color="getStatusColor(selectedCandidate.status)" size="64" class="mr-4">
                <span class="text-h5 text-white">{{ getInitials(selectedCandidate.first_name, selectedCandidate.last_name) }}</span>
              </v-avatar>
              <div class="flex-grow-1">
                <h2 class="text-h5 font-weight-bold mb-1">{{ selectedCandidate.first_name }} {{ selectedCandidate.last_name }}</h2>
                <p class="text-body-1 text-grey-darken-1 mb-1">
                  {{ selectedCandidate.job_positions?.title || 'No position' }}
                </p>
                <div class="d-flex gap-2 flex-wrap">
                  <v-chip size="small" variant="outlined" prepend-icon="mdi-email-outline">
                    {{ selectedCandidate.email }}
                  </v-chip>
                  <v-chip v-if="selectedCandidate.phone" size="small" variant="outlined" prepend-icon="mdi-phone-outline">
                    {{ selectedCandidate.phone }}
                  </v-chip>
                </div>
              </div>
              <div class="d-flex gap-2">
                <v-btn color="primary" variant="outlined" @click="showForwardDialog = true">
                  <v-icon start>mdi-share</v-icon>
                  Forward
                </v-btn>
                <v-menu>
                  <template #activator="{ props }">
                    <v-btn v-bind="props" icon="mdi-dots-vertical" variant="text" />
                  </template>
                  <v-list>
                    <v-list-item prepend-icon="mdi-account-check" @click="updateCandidateStatus('hired')">
                      <v-list-item-title>Mark as Hired</v-list-item-title>
                    </v-list-item>
                    <v-list-item prepend-icon="mdi-calendar-plus" @click="showScheduleDialog = true">
                      <v-list-item-title>Schedule Follow-up</v-list-item-title>
                    </v-list-item>
                    <v-list-item prepend-icon="mdi-close-circle" color="error" @click="updateCandidateStatus('rejected')">
                      <v-list-item-title>Reject Candidate</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </div>
            </div>

            <v-divider />

            <!-- Interview Details - Editable -->
            <v-card-text>
              <div class="d-flex align-center justify-space-between mb-4">
                <h3 class="text-subtitle-1 font-weight-bold">Interview Details</h3>
                <v-btn v-if="hasChanges" color="primary" size="small" :loading="saving" @click="saveChanges">
                  <v-icon start>mdi-content-save</v-icon>
                  Save Changes
                </v-btn>
              </div>

              <v-row>
                <!-- Overall Score -->
                <v-col cols="12">
                  <div class="d-flex align-center mb-4">
                    <v-icon color="amber" class="mr-2">mdi-star</v-icon>
                    <div class="flex-grow-1">
                      <div class="text-caption text-grey">Overall Score</div>
                      <v-rating
                        v-model="editForm.overall_score"
                        color="amber"
                        active-color="amber"
                        density="compact"
                        size="large"
                      />
                    </div>
                  </div>
                </v-col>

                <!-- Interviewer -->
                <v-col cols="12" md="6">
                  <v-autocomplete
                    v-model="editForm.interviewed_by"
                    :items="employees"
                    item-title="full_name"
                    item-value="profile_id"
                    label="Interviewer"
                    prepend-inner-icon="mdi-account-tie"
                    variant="outlined"
                    density="compact"
                    clearable
                  />
                </v-col>

                <!-- Interview Date -->
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="editForm.interview_date"
                    label="Interview Date"
                    type="datetime-local"
                    prepend-inner-icon="mdi-calendar"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>

                <!-- Position -->
                <v-col cols="12" md="6">
                  <v-autocomplete
                    v-model="editForm.target_position_id"
                    :items="positions"
                    item-title="title"
                    item-value="id"
                    label="Position Interviewing For"
                    prepend-inner-icon="mdi-briefcase"
                    variant="outlined"
                    density="compact"
                    clearable
                  />
                </v-col>

                <!-- Source -->
                <v-col cols="12" md="6">
                  <v-combobox
                    v-model="editForm.source"
                    :items="sourceOptions"
                    label="Source (How they found us)"
                    prepend-inner-icon="mdi-map-marker"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>

                <!-- Experience -->
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model.number="editForm.experience_years"
                    label="Years of Experience"
                    type="number"
                    prepend-inner-icon="mdi-briefcase-clock"
                    variant="outlined"
                    density="compact"
                    min="0"
                  />
                </v-col>

                <!-- Salary Expectation -->
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model.number="editForm.salary_expectation"
                    label="Salary Expectation"
                    type="number"
                    prepend-inner-icon="mdi-currency-usd"
                    variant="outlined"
                    density="compact"
                    prefix="$"
                  />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Interview Notes (Session Only - Not Saved) -->
          <v-card rounded="lg">
            <v-card-title class="d-flex align-center justify-space-between">
              <span>Interview Notes</span>
              <v-chip color="warning" size="small" variant="tonal">
                <v-icon start size="small">mdi-alert</v-icon>
                Session Only - Not Saved
              </v-chip>
            </v-card-title>
            <v-card-text>
              <v-alert type="info" variant="tonal" density="compact" class="mb-4">
                <v-icon start>mdi-information</v-icon>
                These notes are for this session only and will NOT be saved to the candidate's profile.
              </v-alert>

              <!-- Rating Categories -->
              <div class="mb-6">
                <h4 class="text-subtitle-2 mb-3">Candidate Ratings</h4>
                <v-row dense>
                  <v-col v-for="rating in ratingCategories" :key="rating.key" cols="12" md="6">
                    <div class="d-flex align-center mb-2">
                      <span class="text-body-2 flex-grow-1">{{ rating.label }}</span>
                      <v-rating
                        v-model="sessionNotes.ratings[rating.key]"
                        density="compact"
                        color="amber"
                        active-color="amber"
                        half-increments
                      />
                    </div>
                  </v-col>
                </v-row>
              </div>

              <!-- Quick Assessments -->
              <div class="mb-6">
                <h4 class="text-subtitle-2 mb-3">Quick Assessment</h4>
                <div class="d-flex flex-wrap gap-2">
                  <v-chip
                    v-for="tag in assessmentTags"
                    :key="tag"
                    :color="sessionNotes.tags.includes(tag) ? 'primary' : 'grey'"
                    :variant="sessionNotes.tags.includes(tag) ? 'flat' : 'outlined'"
                    @click="toggleTag(tag)"
                  >
                    {{ tag }}
                  </v-chip>
                </div>
              </div>

              <!-- Notes Text Area -->
              <div class="mb-4">
                <h4 class="text-subtitle-2 mb-3">Interview Observations</h4>
                <v-textarea
                  v-model="sessionNotes.observations"
                  placeholder="Enter your interview notes here. These are private and session-only..."
                  variant="outlined"
                  rows="5"
                  auto-grow
                />
              </div>

              <!-- Pros and Cons -->
              <v-row>
                <v-col cols="12" md="6">
                  <h4 class="text-subtitle-2 mb-2 text-success">
                    <v-icon size="small" class="mr-1">mdi-plus-circle</v-icon>
                    Strengths
                  </h4>
                  <v-textarea
                    v-model="sessionNotes.strengths"
                    placeholder="What stands out positively..."
                    variant="outlined"
                    rows="3"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <h4 class="text-subtitle-2 mb-2 text-error">
                    <v-icon size="small" class="mr-1">mdi-minus-circle</v-icon>
                    Concerns
                  </h4>
                  <v-textarea
                    v-model="sessionNotes.concerns"
                    placeholder="Areas of concern..."
                    variant="outlined"
                    rows="3"
                  />
                </v-col>
              </v-row>

              <!-- Recommendation -->
              <div class="mt-4">
                <h4 class="text-subtitle-2 mb-3">Recommendation</h4>
                <v-btn-toggle v-model="sessionNotes.recommendation" mandatory color="primary" variant="outlined">
                  <v-btn value="strong_yes" prepend-icon="mdi-thumb-up" color="success">
                    Strong Yes
                  </v-btn>
                  <v-btn value="yes" prepend-icon="mdi-check">
                    Yes
                  </v-btn>
                  <v-btn value="maybe" prepend-icon="mdi-help">
                    Maybe
                  </v-btn>
                  <v-btn value="no" prepend-icon="mdi-close" color="error">
                    No
                  </v-btn>
                </v-btn-toggle>
              </div>
            </v-card-text>

            <v-divider />

            <v-card-actions class="pa-4">
              <v-btn variant="outlined" @click="clearSessionNotes">
                <v-icon start>mdi-eraser</v-icon>
                Clear Notes
              </v-btn>
              <v-spacer />
              <v-btn variant="outlined" @click="printNotes">
                <v-icon start>mdi-printer</v-icon>
                Print
              </v-btn>
              <v-btn variant="outlined" @click="copyNotes">
                <v-icon start>mdi-content-copy</v-icon>
                Copy to Clipboard
              </v-btn>
            </v-card-actions>
          </v-card>
        </template>

        <!-- No Selection State -->
        <template v-else>
          <v-card rounded="lg" class="text-center pa-12">
            <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-account-question</v-icon>
            <h3 class="text-h6 text-grey">Select a Candidate</h3>
            <p class="text-body-2 text-grey-darken-1">
              Choose a candidate from the list to view their interview details and add session notes.
            </p>
          </v-card>
        </template>
      </v-col>
    </v-row>

    <!-- Forward Candidate Dialog -->
    <v-dialog v-model="showForwardDialog" max-width="500" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start color="primary">mdi-share</v-icon>
          Forward Candidate for Review
        </v-card-title>
        <v-card-text>
          <v-alert type="info" variant="tonal" density="compact" class="mb-4">
            The selected employee will receive a notification to review and interview this candidate.
          </v-alert>

          <v-autocomplete
            v-model="forwardTo"
            :items="employees"
            item-title="full_name"
            item-value="id"
            label="Send to Employee"
            prepend-inner-icon="mdi-account"
            variant="outlined"
            class="mb-4"
          />

          <v-textarea
            v-model="forwardNotes"
            label="Notes for Reviewer (Optional)"
            placeholder="Any context or specific areas to evaluate..."
            variant="outlined"
            rows="3"
          />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-btn variant="text" @click="showForwardDialog = false">Cancel</v-btn>
          <v-spacer />
          <v-btn 
            color="primary" 
            :disabled="!forwardTo"
            :loading="forwarding"
            @click="forwardCandidate"
          >
            <v-icon start>mdi-send</v-icon>
            Forward
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Schedule Dialog -->
    <v-dialog v-model="showScheduleDialog" max-width="400">
      <v-card>
        <v-card-title>Schedule Follow-up</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="followUp.date"
            label="Date"
            type="date"
            variant="outlined"
            class="mb-3"
          />
          <v-text-field
            v-model="followUp.time"
            label="Time"
            type="time"
            variant="outlined"
            class="mb-3"
          />
          <v-select
            v-model="followUp.type"
            :items="['Phone Screen', 'Video Call', 'In-Person', 'Technical Assessment', 'Working Interview']"
            label="Interview Type"
            variant="outlined"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showScheduleDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="scheduleFollowUp">Schedule</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin']
})

useHead({
  title: 'Interviews'
})

const client = useSupabaseClient()
const userStore = useUserStore()
const toast = useToast()

// State
const loading = ref(true)
const saving = ref(false)
const searchQuery = ref('')
const filterStatus = ref('all')
const selectedCandidate = ref<any>(null)
const showScheduleDialog = ref(false)
const showForwardDialog = ref(false)
const forwarding = ref(false)
const forwardTo = ref<string | null>(null)
const forwardNotes = ref('')

// Data from DB
const candidates = ref<any[]>([])
const employees = ref<any[]>([])
const positions = ref<any[]>([])

// Edit form for candidate details
const editForm = reactive({
  overall_score: 0,
  interviewed_by: null as string | null,
  interview_date: '',
  target_position_id: null as string | null,
  source: '',
  experience_years: 0,
  salary_expectation: 0
})

// Original values to detect changes
const originalForm = ref<any>({})

const snackbar = reactive({
  show: false,
  message: '',
  color: 'success'
})

const followUp = reactive({
  date: '',
  time: '',
  type: ''
})

// Session-only notes (NOT saved to database)
const sessionNotes = reactive({
  ratings: {
    technical: 0,
    communication: 0,
    cultural_fit: 0,
    experience: 0,
    enthusiasm: 0,
    professionalism: 0
  },
  tags: [] as string[],
  observations: '',
  strengths: '',
  concerns: '',
  recommendation: 'maybe'
})

// Source options for combobox
const sourceOptions = [
  'Indeed',
  'LinkedIn',
  'Glassdoor',
  'Company Website',
  'Employee Referral',
  'Job Fair',
  'University/School',
  'Walk-in',
  'Social Media',
  'Recruiter',
  'Other'
]

const statusFilters = [
  { label: 'All', value: 'all', color: 'grey' },
  { label: 'Interview', value: 'interview', color: 'warning' },
  { label: 'New', value: 'new', color: 'info' },
  { label: 'Screening', value: 'screening', color: 'purple' },
  { label: 'Offer', value: 'offer', color: 'success' }
]

const ratingCategories: { key: keyof typeof sessionNotes.ratings; label: string }[] = [
  { key: 'technical', label: 'Technical Skills' },
  { key: 'communication', label: 'Communication' },
  { key: 'cultural_fit', label: 'Cultural Fit' },
  { key: 'experience', label: 'Relevant Experience' },
  { key: 'enthusiasm', label: 'Enthusiasm' },
  { key: 'professionalism', label: 'Professionalism' }
]

const assessmentTags = [
  'Great Communicator',
  'Team Player',
  'Self-Starter',
  'Leadership Potential',
  'Quick Learner',
  'Detail-Oriented',
  'Problem Solver',
  'Creative Thinker',
  'Overqualified',
  'Underqualified',
  'Needs Training',
  'Red Flags'
]

// Computed
const filteredCandidates = computed(() => {
  let result = candidates.value
  
  if (filterStatus.value !== 'all') {
    result = result.filter(c => c.status === filterStatus.value)
  }
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(c =>
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(query) ||
      c.job_positions?.title?.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query)
    )
  }
  
  return result
})

const hasChanges = computed(() => {
  return JSON.stringify(editForm) !== JSON.stringify(originalForm.value)
})

// Methods
function getInitials(firstName: string, lastName: string) {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    'new': 'info',
    'screening': 'purple',
    'interview': 'warning',
    'offer': 'success',
    'hired': 'primary',
    'rejected': 'grey'
  }
  return colors[status] || 'grey'
}

function formatStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function formatDate(dateStr: string) {
  if (!dateStr) return 'Not scheduled'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

function selectCandidate(candidate: any) {
  selectedCandidate.value = candidate
  
  // Populate edit form with candidate data
  editForm.overall_score = candidate.overall_score || 0
  editForm.interviewed_by = candidate.interviewed_by || userStore.employee?.profile_id || null
  editForm.interview_date = candidate.interview_date ? new Date(candidate.interview_date).toISOString().slice(0, 16) : ''
  editForm.target_position_id = candidate.target_position_id || null
  editForm.source = candidate.source || ''
  editForm.experience_years = candidate.experience_years || 0
  editForm.salary_expectation = candidate.salary_expectation || 0
  
  // Store original for change detection
  originalForm.value = { ...editForm }
  
  // Clear session notes when switching candidates
  clearSessionNotes()
}

async function saveChanges() {
  if (!selectedCandidate.value) return
  
  saving.value = true
  try {
    const { error } = await client
      .from('candidates')
      .update({
        overall_score: editForm.overall_score || null,
        interviewed_by: editForm.interviewed_by,
        interview_date: editForm.interview_date || null,
        target_position_id: editForm.target_position_id,
        source: editForm.source || null,
        experience_years: editForm.experience_years || null,
        salary_expectation: editForm.salary_expectation || null
      })
      .eq('id', selectedCandidate.value.id)
    
    if (error) throw error
    
    // Update local data
    const idx = candidates.value.findIndex(c => c.id === selectedCandidate.value.id)
    if (idx !== -1) {
      Object.assign(candidates.value[idx], editForm)
      Object.assign(selectedCandidate.value, editForm)
    }
    
    originalForm.value = { ...editForm }
    toast.success('Candidate details saved')
  } catch (err: any) {
    console.error('Failed to save:', err)
    toast.error('Failed to save changes')
  } finally {
    saving.value = false
  }
}

async function updateCandidateStatus(status: string) {
  if (!selectedCandidate.value) return
  
  try {
    const { error } = await client
      .from('candidates')
      .update({ status })
      .eq('id', selectedCandidate.value.id)
    
    if (error) throw error
    
    selectedCandidate.value.status = status
    const idx = candidates.value.findIndex(c => c.id === selectedCandidate.value.id)
    if (idx !== -1) {
      candidates.value[idx].status = status
    }
    
    toast.success(`Candidate marked as ${formatStatus(status)}`)
  } catch (err: any) {
    console.error('Failed to update status:', err)
    toast.error('Failed to update status')
  }
}

async function forwardCandidate() {
  if (!selectedCandidate.value || !forwardTo.value) return
  
  forwarding.value = true
  try {
    const { error } = await client
      .from('candidate_forwards')
      .insert({
        candidate_id: selectedCandidate.value.id,
        forwarded_by_employee_id: userStore.employee?.id,
        forwarded_to_employee_id: forwardTo.value,
        notes: forwardNotes.value || null
      })
    
    if (error) throw error
    
    showForwardDialog.value = false
    forwardTo.value = null
    forwardNotes.value = ''
    toast.success('Candidate forwarded for review')
  } catch (err: any) {
    console.error('Failed to forward:', err)
    toast.error('Failed to forward candidate')
  } finally {
    forwarding.value = false
  }
}

function toggleTag(tag: string) {
  const index = sessionNotes.tags.indexOf(tag)
  if (index === -1) {
    sessionNotes.tags.push(tag)
  } else {
    sessionNotes.tags.splice(index, 1)
  }
}

function clearSessionNotes() {
  sessionNotes.ratings = {
    technical: 0,
    communication: 0,
    cultural_fit: 0,
    experience: 0,
    enthusiasm: 0,
    professionalism: 0
  }
  sessionNotes.tags = []
  sessionNotes.observations = ''
  sessionNotes.strengths = ''
  sessionNotes.concerns = ''
  sessionNotes.recommendation = 'maybe'
}

function scheduleFollowUp() {
  showScheduleDialog.value = false
  snackbar.message = 'Follow-up interview scheduled'
  snackbar.color = 'success'
  snackbar.show = true
}

function printNotes() {
  window.print()
}

function copyNotes() {
  const notes = `
Interview Notes - ${selectedCandidate.value?.first_name} ${selectedCandidate.value?.last_name}
Position: ${selectedCandidate.value?.job_positions?.title || 'Not specified'}
Date: ${formatDate(selectedCandidate.value?.interview_date)}

Overall Score: ${editForm.overall_score}/5

Ratings:
${Object.entries(sessionNotes.ratings).map(([k, v]) => `- ${k}: ${v}/5`).join('\n')}

Tags: ${sessionNotes.tags.join(', ')}

Observations:
${sessionNotes.observations}

Strengths:
${sessionNotes.strengths}

Concerns:
${sessionNotes.concerns}

Recommendation: ${sessionNotes.recommendation}
  `.trim()
  
  navigator.clipboard.writeText(notes)
  snackbar.message = 'Notes copied to clipboard'
  snackbar.color = 'success'
  snackbar.show = true
}

// Data fetching
async function fetchData() {
  loading.value = true
  try {
    // Fetch candidates with interview or relevant status
    const { data: candidatesData, error: candidatesError } = await client
      .from('candidates')
      .select(`
        *,
        job_positions:target_position_id(id, title)
      `)
      .in('status', ['new', 'screening', 'interview', 'offer'])
      .order('applied_at', { ascending: false })
    
    if (candidatesError) throw candidatesError
    candidates.value = candidatesData || []
    
    // Fetch employees for interviewer picker
    const { data: employeesData, error: employeesError } = await client
      .from('employees')
      .select('id, profile_id, first_name, last_name')
      .eq('employment_status', 'active')
      .order('first_name')
    
    if (employeesError) throw employeesError
    employees.value = (employeesData || []).map(e => ({
      ...e,
      full_name: `${e.first_name} ${e.last_name}`
    }))
    
    // Fetch positions
    const { data: positionsData, error: positionsError } = await client
      .from('job_positions')
      .select('id, title')
      .eq('is_active', true)
      .order('title')
    
    if (positionsError) throw positionsError
    positions.value = positionsData || []
    
  } catch (err: any) {
    console.error('Failed to fetch data:', err)
    toast.error('Failed to load interview data')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.interviews-page {
  max-width: 1400px;
}

.candidate-list-card {
  height: calc(100vh - 200px);
  display: flex;
  flex-direction: column;
}

.candidate-scroll-list {
  flex: 1;
  overflow-y: auto;
  max-height: 500px;
}
</style>
