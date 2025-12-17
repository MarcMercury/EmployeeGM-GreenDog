<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Onboarding</h1>
        <p class="text-body-1 text-grey-darken-1">
          Track new hire onboarding progress and finalize hiring
        </p>
      </div>
      <div class="d-flex align-center ga-2">
        <v-chip color="warning" size="large" v-if="pendingStart.length > 0">
          {{ pendingStart.length }} Awaiting Start
        </v-chip>
        <v-chip color="primary" size="large">
          {{ inProgress.length }} In Progress
        </v-chip>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="48" />
      <p class="text-grey mt-4">Loading onboarding data...</p>
    </div>

    <!-- Tabs for different views -->
    <v-tabs v-else v-model="activeTab" color="primary" class="mb-4">
      <v-tab value="pending">
        <v-icon start>mdi-clock-outline</v-icon>
        Ready to Start ({{ pendingStart.length }})
      </v-tab>
      <v-tab value="inprogress">
        <v-icon start>mdi-progress-clock</v-icon>
        In Progress ({{ inProgress.length }})
      </v-tab>
      <v-tab value="completed">
        <v-icon start>mdi-check-circle</v-icon>
        Completed ({{ completed.length }})
      </v-tab>
    </v-tabs>

    <v-tabs-window v-model="activeTab">
      <!-- Pending Start Tab -->
      <v-tabs-window-item value="pending">
        <v-card v-if="pendingStart.length === 0" rounded="lg" class="text-center pa-12">
          <v-icon size="64" color="grey-lighten-1">mdi-account-clock</v-icon>
          <h3 class="text-h6 mt-4">No candidates awaiting onboarding</h3>
          <p class="text-grey mb-4">
            Candidates will appear here when they receive an offer or are hired
          </p>
          <v-btn color="primary" @click="navigateTo('/recruiting/candidates')">
            View Candidates
          </v-btn>
        </v-card>

        <v-row v-else>
          <v-col
            v-for="candidate in pendingStart"
            :key="candidate.id"
            cols="12"
            md="6"
            lg="4"
          >
            <v-card rounded="lg" class="h-100">
              <v-card-title class="d-flex align-center pa-4">
                <v-avatar :color="getAvatarColor(candidate.status)" size="48" class="mr-3">
                  <span class="text-white font-weight-bold">
                    {{ candidate.first_name[0] }}{{ candidate.last_name[0] }}
                  </span>
                </v-avatar>
                <div class="flex-grow-1">
                  <h3 class="text-h6 font-weight-bold">
                    {{ candidate.first_name }} {{ candidate.last_name }}
                  </h3>
                  <p class="text-body-2 text-grey mb-0">
                    {{ candidate.job_positions?.title || 'General Position' }}
                  </p>
                </div>
                <v-chip :color="candidate.status === 'offer' ? 'warning' : 'success'" size="small" label>
                  {{ candidate.status === 'offer' ? 'Offer Sent' : 'Hired' }}
                </v-chip>
              </v-card-title>

              <v-divider />

              <v-card-text>
                <div class="d-flex align-center text-body-2 text-grey mb-2">
                  <v-icon size="small" class="mr-2">mdi-email</v-icon>
                  {{ candidate.email }}
                </div>
                <div v-if="candidate.phone" class="d-flex align-center text-body-2 text-grey mb-2">
                  <v-icon size="small" class="mr-2">mdi-phone</v-icon>
                  {{ candidate.phone }}
                </div>
                <div class="d-flex align-center text-body-2 text-grey">
                  <v-icon size="small" class="mr-2">mdi-calendar</v-icon>
                  Applied: {{ formatDate(candidate.applied_at) }}
                </div>
              </v-card-text>

              <v-divider />

              <v-card-actions class="pa-4">
                <v-btn
                  color="primary"
                  block
                  size="large"
                  prepend-icon="mdi-rocket-launch"
                  :loading="startingOnboarding === candidate.id"
                  @click="startOnboarding(candidate)"
                >
                  Start Onboarding
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-tabs-window-item>

      <!-- In Progress Tab -->
      <v-tabs-window-item value="inprogress">
        <v-card v-if="inProgress.length === 0" rounded="lg" class="text-center pa-12">
          <v-icon size="64" color="grey-lighten-1">mdi-clipboard-check-multiple</v-icon>
          <h3 class="text-h6 mt-4">No active onboarding</h3>
          <p class="text-grey mb-4">
            Start onboarding for a hired candidate to see them here
          </p>
        </v-card>

        <v-row v-else>
          <v-col
            v-for="item in inProgress"
            :key="item.id"
            cols="12"
            md="6"
            lg="4"
          >
            <v-card rounded="lg" class="h-100" hover @click="openWizard(item)">
              <v-card-title class="d-flex align-center pa-4 pb-2">
                <v-avatar color="primary" size="48" class="mr-3">
                  <span class="text-white font-weight-bold">
                    {{ item.candidates?.first_name[0] }}{{ item.candidates?.last_name[0] }}
                  </span>
                </v-avatar>
                <div class="flex-grow-1">
                  <h3 class="text-h6 font-weight-bold">
                    {{ item.candidates?.first_name }} {{ item.candidates?.last_name }}
                  </h3>
                  <p class="text-body-2 text-grey mb-0">
                    {{ item.candidates?.job_positions?.title || 'General Position' }}
                  </p>
                </div>
                <v-chip color="primary" size="small" label>
                  In Progress
                </v-chip>
              </v-card-title>

              <!-- Progress -->
              <v-card-text class="py-2">
                <div class="d-flex align-center justify-space-between mb-1">
                  <span class="text-caption text-grey">Onboarding Progress</span>
                  <span class="text-caption font-weight-bold">{{ getProgress(item) }}%</span>
                </div>
                <v-progress-linear
                  :model-value="getProgress(item)"
                  :color="getProgress(item) === 100 ? 'success' : 'primary'"
                  height="8"
                  rounded
                />
                <div class="d-flex justify-space-between mt-2 text-caption text-grey">
                  <span>{{ item.completed_tasks || 0 }} of {{ item.total_tasks || 0 }} tasks</span>
                  <span v-if="item.target_start_date">
                    Start: {{ formatDate(item.target_start_date) }}
                  </span>
                </div>
              </v-card-text>

              <v-divider />

              <!-- Current Stage -->
              <v-card-text class="py-3">
                <div class="d-flex align-center">
                  <v-icon color="primary" class="mr-2">
                    {{ item.current_stage?.icon || 'mdi-clipboard-check' }}
                  </v-icon>
                  <div>
                    <span class="text-caption text-grey">Current Stage:</span>
                    <br>
                    <span class="text-body-2 font-weight-medium">
                      {{ item.current_stage?.name || 'Getting Started' }}
                    </span>
                  </div>
                </div>
              </v-card-text>

              <v-divider />

              <v-card-actions class="pa-4">
                <v-btn
                  color="primary"
                  variant="tonal"
                  block
                  prepend-icon="mdi-pencil"
                >
                  Continue Onboarding
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-tabs-window-item>

      <!-- Completed Tab -->
      <v-tabs-window-item value="completed">
        <v-card v-if="completed.length === 0" rounded="lg" class="text-center pa-12">
          <v-icon size="64" color="grey-lighten-1">mdi-check-circle-outline</v-icon>
          <h3 class="text-h6 mt-4">No completed onboarding yet</h3>
          <p class="text-grey">
            Completed onboarding records will appear here
          </p>
        </v-card>

        <v-data-table
          v-else
          :headers="completedHeaders"
          :items="completed"
          :items-per-page="10"
          class="elevation-0 rounded-lg"
        >
          <template #item.name="{ item }">
            <div class="d-flex align-center py-2">
              <v-avatar color="success" size="36" class="mr-3">
                <span class="text-white font-weight-bold text-caption">
                  {{ item.candidates?.first_name[0] }}{{ item.candidates?.last_name[0] }}
                </span>
              </v-avatar>
              <div>
                <span class="font-weight-medium">
                  {{ item.candidates?.first_name }} {{ item.candidates?.last_name }}
                </span>
                <br>
                <span class="text-caption text-grey">
                  {{ item.candidates?.job_positions?.title || 'N/A' }}
                </span>
              </div>
            </div>
          </template>
          <template #item.completed_at="{ item }">
            {{ formatDate(item.completed_at) }}
          </template>
          <template #item.actual_start_date="{ item }">
            {{ item.actual_start_date ? formatDate(item.actual_start_date) : '-' }}
          </template>
          <template #item.actions="{ item }">
            <v-btn
              size="small"
              variant="text"
              color="primary"
              @click="openWizard(item)"
            >
              View Details
            </v-btn>
          </template>
        </v-data-table>
      </v-tabs-window-item>
    </v-tabs-window>

    <!-- Template Selection Dialog -->
    <v-dialog v-model="templateDialog" max-width="500">
      <v-card rounded="lg">
        <v-card-title class="bg-primary text-white pa-4">
          <v-icon start>mdi-rocket-launch</v-icon>
          Start Onboarding
        </v-card-title>
        <v-card-text class="pa-4">
          <p class="mb-4">
            Starting onboarding for <strong>{{ selectedCandidate?.first_name }} {{ selectedCandidate?.last_name }}</strong>
          </p>
          
          <v-select
            v-model="selectedTemplate"
            :items="templates"
            item-title="name"
            item-value="id"
            label="Onboarding Template"
            variant="outlined"
            :hint="getTemplateDescription(selectedTemplate)"
            persistent-hint
          />

          <v-text-field
            v-model="targetStartDate"
            label="Target Start Date"
            type="date"
            variant="outlined"
            class="mt-4"
            prepend-inner-icon="mdi-calendar"
          />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="templateDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="startingOnboarding !== null"
            :disabled="!selectedTemplate"
            @click="executeStartOnboarding"
          >
            Start Onboarding
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin']
})

interface Candidate {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  target_position_id: string | null
  status: string
  applied_at: string
  onboarding_complete: boolean
  job_positions?: { title: string }
}

interface OnboardingRecord {
  id: string
  candidate_id: string
  template_id: string
  current_stage_id: string
  status: string
  started_at: string
  completed_at: string | null
  target_start_date: string | null
  actual_start_date: string | null
  candidates?: Candidate & { job_positions?: { title: string } }
  current_stage?: { name: string; icon: string }
  total_tasks?: number
  completed_tasks?: number
}

interface Template {
  id: string
  name: string
  description: string
  is_default: boolean
}

const client = useSupabaseClient()
const userStore = useUserStore()

// State
const loading = ref(true)
const activeTab = ref('pending')
const candidates = ref<Candidate[]>([])
const onboardingRecords = ref<OnboardingRecord[]>([])
const templates = ref<Template[]>([])

// Dialog state
const templateDialog = ref(false)
const selectedCandidate = ref<Candidate | null>(null)
const selectedTemplate = ref<string | null>(null)
const targetStartDate = ref('')
const startingOnboarding = ref<string | null>(null)

// Snackbar
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

// Table headers
const completedHeaders = [
  { title: 'Employee', key: 'name', sortable: true },
  { title: 'Completed', key: 'completed_at', sortable: true },
  { title: 'Start Date', key: 'actual_start_date', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false }
]

// Computed
const pendingStart = computed(() => {
  // Candidates with offer/hired status that don't have an onboarding record
  const onboardedCandidateIds = new Set(onboardingRecords.value.map(o => o.candidate_id))
  return candidates.value.filter(c =>
    (c.status === 'offer' || c.status === 'hired') &&
    !c.onboarding_complete &&
    !onboardedCandidateIds.has(c.id)
  )
})

const inProgress = computed(() => {
  return onboardingRecords.value.filter(o => o.status === 'in_progress')
})

const completed = computed(() => {
  return onboardingRecords.value.filter(o => o.status === 'completed')
})

// Methods
const showNotification = (message: string, color = 'success') => {
  snackbarText.value = message
  snackbarColor.value = color
  snackbar.value = true
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const getAvatarColor = (status: string) => {
  return status === 'offer' ? 'warning' : 'success'
}

const getProgress = (item: OnboardingRecord) => {
  if (!item.total_tasks || item.total_tasks === 0) return 0
  return Math.round(((item.completed_tasks || 0) / item.total_tasks) * 100)
}

const getTemplateDescription = (templateId: string | null) => {
  if (!templateId) return ''
  const template = templates.value.find(t => t.id === templateId)
  return template?.description || ''
}

const startOnboarding = async (candidate: Candidate) => {
  selectedCandidate.value = candidate
  targetStartDate.value = new Date().toISOString().split('T')[0]
  
  // Pre-select default template
  const defaultTemplate = templates.value.find(t => t.is_default)
  selectedTemplate.value = defaultTemplate?.id || templates.value[0]?.id || null
  
  templateDialog.value = true
}

const executeStartOnboarding = async () => {
  if (!selectedCandidate.value || !selectedTemplate.value) return

  startingOnboarding.value = selectedCandidate.value.id
  try {
    // Use the RPC function to start onboarding
    const { data, error } = await client.rpc('start_candidate_onboarding', {
      p_candidate_id: selectedCandidate.value.id,
      p_template_id: selectedTemplate.value,
      p_assigned_to: userStore.profile?.id,
      p_target_start_date: targetStartDate.value || null
    })

    if (error) throw error

    templateDialog.value = false
    showNotification('Onboarding started successfully!')

    // Navigate to the wizard
    if (data) {
      navigateTo(`/recruiting/onboarding/${data}`)
    } else {
      await fetchData()
    }
  } catch (err) {
    console.error('Error starting onboarding:', err)
    showNotification('Failed to start onboarding', 'error')
  } finally {
    startingOnboarding.value = null
  }
}

const openWizard = (item: OnboardingRecord) => {
  navigateTo(`/recruiting/onboarding/${item.id}`)
}

const fetchData = async () => {
  loading.value = true
  try {
    // Fetch candidates
    const { data: candidatesData } = await client
      .from('candidates')
      .select(`
        *,
        job_positions:target_position_id(title)
      `)
      .in('status', ['offer', 'hired'])
      .eq('onboarding_complete', false)
      .order('applied_at', { ascending: false })

    candidates.value = candidatesData || []

    // Fetch onboarding records with task counts
    const { data: onboardingData } = await client
      .from('candidate_onboarding')
      .select(`
        *,
        candidates:candidate_id(
          *,
          job_positions:target_position_id(title)
        ),
        current_stage:current_stage_id(name, icon)
      `)
      .order('created_at', { ascending: false })

    // Get task counts for each onboarding
    if (onboardingData) {
      for (const record of onboardingData) {
        const { count: totalCount } = await client
          .from('candidate_onboarding_tasks')
          .select('*', { count: 'exact', head: true })
          .eq('onboarding_id', record.id)

        const { count: completedCount } = await client
          .from('candidate_onboarding_tasks')
          .select('*', { count: 'exact', head: true })
          .eq('onboarding_id', record.id)
          .eq('is_completed', true)

        record.total_tasks = totalCount || 0
        record.completed_tasks = completedCount || 0
      }
    }

    onboardingRecords.value = onboardingData || []

    // Fetch templates
    const { data: templatesData } = await client
      .from('onboarding_templates')
      .select('*')
      .eq('is_active', true)
      .order('is_default', { ascending: false })

    templates.value = templatesData || []
  } catch (err) {
    console.error('Error fetching data:', err)
    showNotification('Failed to load data', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>
