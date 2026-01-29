<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Recruiting Pipeline</h1>
        <p class="text-body-1 text-grey-darken-1">
          Traffic control for your hiring process
        </p>
      </div>
      <div class="d-flex gap-2">
        <v-btn
          variant="outlined"
          prepend-icon="mdi-upload"
          @click="showUploadWizard = true"
        >
          Import
        </v-btn>
        <v-btn
          variant="outlined"
          prepend-icon="mdi-download"
          @click="exportCandidates"
        >
          Export
        </v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          @click="showAddDialog = true"
        >
          Add Candidate
        </v-btn>
      </div>
    </div>

    <!-- Upload Wizard Dialog -->
    <RecruitingCandidateUploadWizard
      v-model="showUploadWizard"
      @uploaded="fetchCandidates"
    />

    <!-- Add Candidate Dialog -->
    <v-dialog v-model="showAddDialog" max-width="600" persistent>
      <v-card>
        <v-card-title class="d-flex align-center py-4 bg-primary">
          <v-icon class="mr-3" color="white">mdi-account-plus</v-icon>
          <span class="text-white font-weight-bold">Add New Candidate</span>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" color="white" size="small" @click="closeAddDialog" />
        </v-card-title>
        <v-card-text class="pa-6">
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="newCandidate.first_name"
                label="First Name *"
                variant="outlined"
                density="compact"
                :rules="[v => !!v || 'Required']"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="newCandidate.last_name"
                label="Last Name *"
                variant="outlined"
                density="compact"
                :rules="[v => !!v || 'Required']"
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="newCandidate.email"
                label="Email *"
                type="email"
                variant="outlined"
                density="compact"
                :rules="[v => !!v || 'Required', v => /.+@.+\..+/.test(v) || 'Invalid email']"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="newCandidate.phone"
                label="Phone"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="newCandidate.source"
                :items="['Indeed', 'LinkedIn', 'Referral', 'Walk-in', 'Website', 'Job Fair', 'Other']"
                label="Source"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="newCandidate.notes"
                label="Notes"
                variant="outlined"
                density="compact"
                rows="3"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="pa-4 bg-grey-lighten-4">
          <v-spacer />
          <v-btn variant="text" @click="closeAddDialog">Cancel</v-btn>
          <v-btn 
            color="primary" 
            :loading="saving"
            :disabled="!newCandidate.first_name || !newCandidate.last_name || !newCandidate.email"
            @click="saveNewCandidate"
          >
            Add Candidate
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Skeleton Loading State -->
    <template v-if="loading">
      <v-row class="mb-6">
        <v-col v-for="i in 6" :key="i" cols="12" sm="6" md="4" lg="2">
          <v-card rounded="lg" class="skeleton-card">
            <v-card-text>
              <div class="skeleton-pulse mb-2" style="width: 60%; height: 12px; border-radius: 4px;"></div>
              <div class="skeleton-pulse" style="width: 50px; height: 32px; border-radius: 4px;"></div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- Loaded Content -->
    <template v-else>
      <!-- TOP: Pipeline Funnel Metrics -->
      <UiStatsRow
        :stats="pipelineStatsFormatted"
        layout="6-col"
      />

      <!-- Filters -->
      <v-card class="mb-4" variant="outlined">
        <v-card-text class="py-3">
          <v-row dense align="center">
            <v-col cols="12" md="3">
              <v-text-field
                v-model="searchQuery"
                label="Search candidates..."
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                density="compact"
                clearable
                hide-details
              />
            </v-col>
            <v-col cols="6" md="2">
              <v-select
                v-model="selectedPosition"
                :items="positionOptions"
                label="Position"
                variant="outlined"
                density="compact"
                hide-details
              />
            </v-col>
            <v-col cols="6" md="2">
              <v-select
                v-model="activeStatusFilter"
                :items="[
                  { title: 'All Statuses', value: null },
                  { title: 'New', value: 'new' },
                  { title: 'Screening', value: 'screening' },
                  { title: 'Interview', value: 'interview' },
                  { title: 'Offer', value: 'offer' },
                  { title: 'Hired', value: 'hired' },
                  { title: 'Rejected', value: 'rejected' }
                ]"
                label="Status"
                variant="outlined"
                density="compact"
                hide-details
              />
            </v-col>
            <v-col cols="6" md="2">
              <v-select
                v-model="selectedLocation"
                :items="locationOptions"
                label="Location"
                variant="outlined"
                density="compact"
                hide-details
              />
            </v-col>
            <v-col cols="12" md="3" class="d-flex justify-end align-center gap-2">
              <v-btn-toggle
                v-model="quickFilter"
                density="compact"
                variant="outlined"
              >
                <v-btn value="all" size="small">All</v-btn>
                <v-btn value="active" size="small" color="success">Active</v-btn>
                <v-btn value="new" size="small" color="info">New</v-btn>
              </v-btn-toggle>
              <v-chip color="primary" variant="tonal" size="small">
                {{ filteredCandidates.length }}
              </v-chip>
            </v-col>
          </v-row>
          <v-row v-if="hasActiveFilters" dense class="mt-2">
            <v-col cols="12" class="d-flex justify-end">
              <v-btn
                variant="text"
                size="small"
                color="primary"
                prepend-icon="mdi-filter-remove"
                @click="clearAllFilters"
              >
                Clear Filters
              </v-btn>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- BOTTOM: All Applications Data Grid -->
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center justify-space-between flex-wrap gap-2">
          <span class="d-flex align-center gap-2">
            All Applications
            <v-chip 
              v-if="activeStatusFilter" 
              closable 
              :color="getStatusColor(activeStatusFilter)"
              size="small"
              @click:close="activeStatusFilter = null"
            >
              {{ formatStatus(activeStatusFilter) }}
            </v-chip>
          </span>
        </v-card-title>

        <v-data-table
          :headers="tableHeaders"
          :items="filteredCandidates"
          :search="searchQuery"
          hover
          :items-per-page="15"
          class="applications-table"
          @click:row="(_, { item }) => openCandidate(item)"
        >
          <!-- Name Column with Avatar -->
          <template #item.name="{ item }">
            <div class="d-flex align-center py-2">
              <v-avatar :color="getStatusColor(item.status)" size="36" class="mr-3">
                <span class="text-white font-weight-bold text-caption">
                  {{ item.first_name?.[0] }}{{ item.last_name?.[0] }}
                </span>
              </v-avatar>
              <div>
                <span class="font-weight-medium">{{ item.first_name }} {{ item.last_name }}</span>
                <div class="text-caption text-grey">{{ item.email }}</div>
              </div>
            </div>
          </template>

          <!-- Applied Date -->
          <template #item.applied_at="{ item }">
            <div>
              <span>{{ formatDate(item.applied_at) }}</span>
              <div class="text-caption text-grey">{{ getDaysAgo(item.applied_at) }}d ago</div>
            </div>
          </template>

          <!-- Target Role -->
          <template #item.position="{ item }">
            <v-chip size="small" variant="outlined">
              {{ item.job_positions?.title || 'Not specified' }}
            </v-chip>
          </template>

          <!-- Status -->
          <template #item.status="{ item }">
            <v-chip :color="getStatusColor(item.status)" size="small" label>
              {{ formatStatus(item.status) }}
            </v-chip>
          </template>

          <!-- Skill Match % -->
          <template #item.skill_match="{ item }">
            <div class="d-flex align-center gap-2">
              <v-progress-linear
                :model-value="getSkillMatch(item)"
                :color="getSkillMatchColor(getSkillMatch(item))"
                height="8"
                rounded
                style="width: 60px;"
              />
              <span class="text-caption font-weight-medium">{{ getSkillMatch(item) }}%</span>
            </div>
          </template>

          <!-- Actions -->
          <template #item.actions="{ item }">
            <v-btn 
              icon="mdi-chevron-right" 
              variant="text" 
              size="small"
              @click.stop="openCandidate(item)"
            />
          </template>

          <!-- Empty State -->
          <template #no-data>
            <div class="text-center py-12">
              <v-icon size="64" color="grey-lighten-1">mdi-account-search</v-icon>
              <h3 class="text-h6 mt-4">No candidates found</h3>
              <p class="text-grey mb-4">{{ searchQuery ? 'Try a different search term' : 'Start building your talent pipeline' }}</p>
              <v-btn v-if="!searchQuery" color="primary" @click="navigateTo('/recruiting/candidates')">
                Add First Candidate
              </v-btn>
            </div>
          </template>
        </v-data-table>
      </v-card>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'management']
})

interface Candidate {
  id: string
  first_name: string
  last_name: string
  email: string
  status: string
  applied_at: string
  onboarding_complete: boolean
  target_position_id?: string
  job_positions?: { title: string } | null
  candidate_skills?: { rating: number }[]
  onboarding_checklist?: {
    contract_sent: boolean
    contract_signed: boolean
    background_check: boolean
    uniform_ordered: boolean
    email_created: boolean
  }
}

const client = useSupabaseClient()
const toast = useToast()

// State
const candidates = ref<Candidate[]>([])
const loading = ref(true)
const searchQuery = ref('')
const activeStatusFilter = ref<string | null>(null)
const selectedPosition = ref<string | null>(null)
const selectedLocation = ref<string | null>(null)
const selectedDepartment = ref<string | null>(null)
const quickFilter = ref('all')
const showUploadWizard = ref(false)
const showAddDialog = ref(false)
const saving = ref(false)

// New Candidate Form
const newCandidate = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  source: 'Indeed',
  notes: ''
})

// Filter Options
const positionOptions = computed(() => {
  const positions = candidates.value
    .map(c => c.job_positions?.title)
    .filter((title): title is string => !!title)
  const unique = [...new Set(positions)]
  return [{ title: 'All Positions', value: null }, ...unique.map(p => ({ title: p, value: p }))]
})

const locationOptions = [
  { title: 'All Locations', value: null },
  { title: 'Venice', value: 'Venice' },
  { title: 'The Valley', value: 'The Valley' },
  { title: 'Sherman Oaks', value: 'Sherman Oaks' },
  { title: 'Aetna', value: 'Aetna' },
  { title: 'MPMV (Mobile)', value: 'MPMV' },
  { title: 'Off-Site', value: 'Off-Site' }
]

const departmentOptions = [
  { title: 'All Departments', value: null },
  { title: 'Veterinary', value: 'Veterinary' },
  { title: 'Grooming', value: 'Grooming' },
  { title: 'Daycare', value: 'Daycare' },
  { title: 'Admin', value: 'Admin' },
  { title: 'Management', value: 'Management' }
]

// Table Headers
const tableHeaders = [
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Applied', key: 'applied_at', sortable: true },
  { title: 'Target Role', key: 'position', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Skill Match', key: 'skill_match', sortable: true, align: 'center' },
  { title: '', key: 'actions', sortable: false, width: 50 }
]

// Computed
const pipelineStats = computed(() => [
  { status: 'new', label: 'New', count: candidates.value.filter(c => c.status === 'new').length, color: 'info', icon: 'mdi-new-box' },
  { status: 'screening', label: 'Screening', count: candidates.value.filter(c => c.status === 'screening').length, color: 'purple', icon: 'mdi-file-search' },
  { status: 'interview', label: 'Interview', count: candidates.value.filter(c => c.status === 'interview').length, color: 'warning', icon: 'mdi-account-voice' },
  { status: 'offer', label: 'Offer', count: candidates.value.filter(c => c.status === 'offer').length, color: 'success', icon: 'mdi-handshake' },
  { status: 'hired', label: 'Hired', count: candidates.value.filter(c => c.status === 'hired').length, color: 'primary', icon: 'mdi-account-check' },
  { status: 'rejected', label: 'Rejected', count: candidates.value.filter(c => c.status === 'rejected').length, color: 'grey', icon: 'mdi-account-remove' }
])

// Format stats for UiStatsRow with click handlers
const pipelineStatsFormatted = computed(() => pipelineStats.value.map(stat => ({
  value: stat.count,
  label: stat.label,
  color: stat.color,
  icon: stat.icon,
  onClick: () => toggleStatusFilter(stat.status)
})))

const filteredCandidates = computed(() => {
  let result = candidates.value

  // Apply quick filter
  if (quickFilter.value === 'active') {
    result = result.filter(c => c.status === 'screening' || c.status === 'interview' || c.status === 'offer')
  } else if (quickFilter.value === 'new') {
    result = result.filter(c => c.status === 'new')
  }

  // Apply status filter
  if (activeStatusFilter.value) {
    result = result.filter(c => c.status === activeStatusFilter.value)
  }

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(c =>
      c.first_name?.toLowerCase().includes(query) ||
      c.last_name?.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query) ||
      c.job_positions?.title?.toLowerCase().includes(query)
    )
  }

  // Apply position filter
  if (selectedPosition.value) {
    result = result.filter(c => c.job_positions?.title === selectedPosition.value)
  }

  // Apply location filter
  if (selectedLocation.value) {
    result = result.filter(c => (c as any).location === selectedLocation.value)
  }

  // Apply department filter
  if (selectedDepartment.value) {
    result = result.filter(c => (c as any).department === selectedDepartment.value)
  }

  return result
})

// Check if any filters are active
const hasActiveFilters = computed(() => {
  return searchQuery.value || 
    activeStatusFilter.value || 
    selectedPosition.value || 
    selectedLocation.value || 
    selectedDepartment.value ||
    quickFilter.value !== 'all'
})

// Clear all filters
const clearAllFilters = () => {
  searchQuery.value = ''
  activeStatusFilter.value = null
  selectedPosition.value = null
  selectedLocation.value = null
  selectedDepartment.value = null
  quickFilter.value = 'all'
}

// Methods
const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    new: 'info',
    screening: 'purple',
    interview: 'warning',
    offer: 'success',
    hired: 'primary',
    rejected: 'grey'
  }
  return colors[status] || 'grey'
}

const formatStatus = (status: string) => {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const getDaysAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

const getSkillMatch = (candidate: Candidate) => {
  // Calculate skill match based on candidate skills vs position requirements
  // For now, return a mock value based on skills count
  if (!candidate.candidate_skills?.length) return 0
  const avgLevel = candidate.candidate_skills.reduce((sum, s) => sum + (s.rating || 0), 0) / candidate.candidate_skills.length
  return Math.round(avgLevel * 20) // Convert 1-5 to percentage
}

const getSkillMatchColor = (percent: number) => {
  if (percent >= 80) return 'success'
  if (percent >= 60) return 'warning'
  return 'error'
}

const toggleStatusFilter = (status: string) => {
  activeStatusFilter.value = activeStatusFilter.value === status ? null : status
}

const openCandidate = (candidate: Candidate) => {
  navigateTo(`/recruiting/${candidate.id}`)
}

// Export candidates to CSV
const exportCandidates = () => {
  const csv = [
    ['Name', 'Email', 'Phone', 'Position', 'Status', 'Source', 'Applied'],
    ...filteredCandidates.value.map(c => [
      `${c.first_name} ${c.last_name}`,
      c.email || '',
      c.phone || '',
      c.job_positions?.title || '',
      c.status || '',
      c.source || '',
      c.applied_at ? new Date(c.applied_at).toLocaleDateString() : ''
    ])
  ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `candidates-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// Add Candidate Dialog
const closeAddDialog = () => {
  showAddDialog.value = false
  newCandidate.value = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    source: 'Indeed',
    notes: ''
  }
}

const saveNewCandidate = async () => {
  saving.value = true
  try {
    const { data, error } = await client
      .from('candidates')
      .insert({
        first_name: newCandidate.value.first_name,
        last_name: newCandidate.value.last_name,
        email: newCandidate.value.email,
        phone: newCandidate.value.phone || null,
        source: newCandidate.value.source,
        notes: newCandidate.value.notes || null,
        status: 'new',
        applied_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    toast.success('Candidate added successfully')
    closeAddDialog()
    fetchCandidates()
    
    // Navigate to the new candidate's detail page
    if (data?.id) {
      navigateTo(`/recruiting/${data.id}`)
    }
  } catch (error: any) {
    console.error('Error adding candidate:', error)
    toast.error(error.message || 'Failed to add candidate')
  } finally {
    saving.value = false
  }
}

const fetchCandidates = async () => {
  loading.value = true
  try {
    const { data, error } = await client
      .from('candidates')
      .select(`
        *,
        job_positions:target_position_id(title),
        candidate_skills(rating)
      `)
      .order('applied_at', { ascending: false })

    if (error) throw error
    candidates.value = data || []
  } catch (error) {
    console.error('Error fetching candidates:', error)
    toast.error('Failed to load candidates. Please refresh the page.')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchCandidates()
})
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
.cursor-pointer:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.pipeline-card {
  transition: all 0.2s ease;
}

.applications-table :deep(tr) {
  cursor: pointer;
}

.applications-table :deep(tr:hover) {
  background: rgba(var(--v-theme-primary), 0.05);
}

/* Skeleton Loading Animation */
.skeleton-card {
  background: rgba(var(--v-theme-surface-variant), 0.2);
}

.skeleton-pulse {
  background: linear-gradient(
    90deg,
    rgba(var(--v-theme-surface-variant), 0.3) 0%,
    rgba(var(--v-theme-surface-variant), 0.5) 50%,
    rgba(var(--v-theme-surface-variant), 0.3) 100%
  );
  background-size: 200% 100%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.v-theme--dark .skeleton-pulse {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 100%
  );
  background-size: 200% 100%;
}
</style>
