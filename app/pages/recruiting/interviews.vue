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

    <v-row>
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
            <v-list class="candidate-scroll-list" lines="three" density="compact">
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
                    <span class="text-white text-caption">{{ getInitials(candidate.name) }}</span>
                  </v-avatar>
                </template>
                
                <v-list-item-title class="font-weight-medium">
                  {{ candidate.name }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ candidate.position }}
                </v-list-item-subtitle>
                <v-list-item-subtitle class="text-caption">
                  <v-icon size="12" class="mr-1">mdi-calendar</v-icon>
                  {{ candidate.interview_date }}
                </v-list-item-subtitle>
                
                <template #append>
                  <v-chip :color="getStatusColor(candidate.status)" size="x-small" variant="flat">
                    {{ candidate.status }}
                  </v-chip>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Interview Panel (Right) -->
      <v-col cols="12" md="8">
        <template v-if="selectedCandidate">
          <v-card rounded="lg" class="mb-4">
            <!-- Candidate Header -->
            <div class="d-flex align-center pa-4 bg-primary-lighten-5">
              <v-avatar :color="getStatusColor(selectedCandidate.status)" size="64" class="mr-4">
                <span class="text-h5 text-white">{{ getInitials(selectedCandidate.name) }}</span>
              </v-avatar>
              <div class="flex-grow-1">
                <h2 class="text-h5 font-weight-bold mb-1">{{ selectedCandidate.name }}</h2>
                <p class="text-body-1 text-grey-darken-1 mb-1">
                  {{ selectedCandidate.position }} • {{ selectedCandidate.department }}
                </p>
                <div class="d-flex gap-2">
                  <v-chip size="small" variant="outlined" prepend-icon="mdi-email-outline">
                    {{ selectedCandidate.email }}
                  </v-chip>
                  <v-chip size="small" variant="outlined" prepend-icon="mdi-phone-outline">
                    {{ selectedCandidate.phone }}
                  </v-chip>
                </div>
              </div>
              <v-menu>
                <template #activator="{ props }">
                  <v-btn v-bind="props" icon="mdi-dots-vertical" variant="text" />
                </template>
                <v-list>
                  <v-list-item prepend-icon="mdi-account-check" @click="updateCandidateStatus('Hired')">
                    <v-list-item-title>Mark as Hired</v-list-item-title>
                  </v-list-item>
                  <v-list-item prepend-icon="mdi-calendar-plus" @click="showScheduleDialog = true">
                    <v-list-item-title>Schedule Follow-up</v-list-item-title>
                  </v-list-item>
                  <v-list-item prepend-icon="mdi-close-circle" color="error" @click="updateCandidateStatus('Rejected')">
                    <v-list-item-title>Reject Candidate</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </div>

            <v-divider />

            <!-- Interview Details -->
            <v-card-text>
              <v-row>
                <v-col cols="12" md="6">
                  <div class="d-flex align-center mb-2">
                    <v-icon color="primary" class="mr-2">mdi-calendar</v-icon>
                    <div>
                      <div class="text-caption text-grey">Interview Date</div>
                      <div class="font-weight-medium">{{ selectedCandidate.interview_date }}</div>
                    </div>
                  </div>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="d-flex align-center mb-2">
                    <v-icon color="primary" class="mr-2">mdi-account-tie</v-icon>
                    <div>
                      <div class="text-caption text-grey">Interviewer</div>
                      <div class="font-weight-medium">{{ selectedCandidate.interviewer }}</div>
                    </div>
                  </div>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="d-flex align-center mb-2">
                    <v-icon color="primary" class="mr-2">mdi-briefcase</v-icon>
                    <div>
                      <div class="text-caption text-grey">Experience</div>
                      <div class="font-weight-medium">{{ selectedCandidate.experience }} years</div>
                    </div>
                  </div>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="d-flex align-center mb-2">
                    <v-icon color="primary" class="mr-2">mdi-currency-usd</v-icon>
                    <div>
                      <div class="text-caption text-grey">Salary Expectation</div>
                      <div class="font-weight-medium">${{ selectedCandidate.salary_expectation?.toLocaleString() }}</div>
                    </div>
                  </div>
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
                Use this space for private interview observations.
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
            :items="['Phone Screen', 'Video Call', 'In-Person', 'Technical Assessment']"
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

// State
const searchQuery = ref('')
const filterStatus = ref('all')
const selectedCandidate = ref<any>(null)
const showScheduleDialog = ref(false)

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

const statusFilters = [
  { label: 'All', value: 'all', color: 'grey' },
  { label: 'Scheduled', value: 'Scheduled', color: 'info' },
  { label: 'In Progress', value: 'In Progress', color: 'warning' },
  { label: 'Completed', value: 'Completed', color: 'success' },
  { label: 'Pending', value: 'Pending', color: 'secondary' }
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

// Sample candidates data
const candidates = ref([
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.j@email.com',
    phone: '555-0101',
    position: 'Veterinarian',
    department: 'Veterinary Services',
    status: 'Scheduled',
    interview_date: 'Dec 15, 2024 at 10:00 AM',
    interviewer: 'Dr. Marc Wilson',
    experience: 5,
    salary_expectation: 95000
  },
  {
    id: '2',
    name: 'Michael Chen',
    email: 'mchen@email.com',
    phone: '555-0102',
    position: 'Vet Tech',
    department: 'Veterinary Services',
    status: 'Completed',
    interview_date: 'Dec 12, 2024 at 2:00 PM',
    interviewer: 'Lisa Anderson',
    experience: 3,
    salary_expectation: 48000
  },
  {
    id: '3',
    name: 'Emily Davis',
    email: 'emily.d@email.com',
    phone: '555-0103',
    position: 'Receptionist',
    department: 'Administration',
    status: 'In Progress',
    interview_date: 'Dec 14, 2024 at 11:30 AM',
    interviewer: 'Karen Miller',
    experience: 2,
    salary_expectation: 38000
  },
  {
    id: '4',
    name: 'James Wilson',
    email: 'jwilson@email.com',
    phone: '555-0104',
    position: 'Veterinary Surgeon',
    department: 'Surgery',
    status: 'Pending',
    interview_date: 'Dec 18, 2024 at 9:00 AM',
    interviewer: 'Dr. Marc Wilson',
    experience: 8,
    salary_expectation: 125000
  },
  {
    id: '5',
    name: 'Anna Martinez',
    email: 'amartinez@email.com',
    phone: '555-0105',
    position: 'Vet Tech',
    department: 'Emergency',
    status: 'Scheduled',
    interview_date: 'Dec 16, 2024 at 3:30 PM',
    interviewer: 'Tom Reynolds',
    experience: 4,
    salary_expectation: 52000
  }
])

// Computed
const filteredCandidates = computed(() => {
  let result = candidates.value
  
  if (filterStatus.value !== 'all') {
    result = result.filter(c => c.status === filterStatus.value)
  }
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.position.toLowerCase().includes(query)
    )
  }
  
  return result
})

// Methods
function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase()
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    'Scheduled': 'info',
    'In Progress': 'warning',
    'Completed': 'success',
    'Pending': 'secondary',
    'Hired': 'success',
    'Rejected': 'error'
  }
  return colors[status] || 'grey'
}

function selectCandidate(candidate: any) {
  selectedCandidate.value = candidate
  // Clear session notes when switching candidates
  clearSessionNotes()
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

function updateCandidateStatus(status: string) {
  if (selectedCandidate.value) {
    selectedCandidate.value.status = status
    snackbar.message = `Candidate marked as ${status}`
    snackbar.color = status === 'Hired' ? 'success' : 'info'
    snackbar.show = true
  }
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
Interview Notes - ${selectedCandidate.value?.name}
Position: ${selectedCandidate.value?.position}
Date: ${selectedCandidate.value?.interview_date}

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
