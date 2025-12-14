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
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        @click="navigateTo('/recruiting/candidates')"
      >
        Add Candidate
      </v-btn>
    </div>

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
      <v-row class="mb-6">
        <v-col v-for="stat in pipelineStats" :key="stat.status" cols="12" sm="6" md="4" lg="2">
          <v-card
            :color="activeStatusFilter === stat.status ? stat.color : undefined"
            :variant="activeStatusFilter === stat.status ? 'flat' : 'outlined'"
            rounded="lg"
            class="cursor-pointer pipeline-card"
            @click="toggleStatusFilter(stat.status)"
          >
            <v-card-text :class="activeStatusFilter === stat.status ? 'text-white' : ''">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <p class="text-overline" :class="activeStatusFilter === stat.status ? 'opacity-80' : 'text-grey'">{{ stat.label }}</p>
                  <p class="text-h4 font-weight-bold">{{ stat.count }}</p>
                </div>
                <v-icon size="32" :color="activeStatusFilter === stat.status ? 'white' : stat.color" class="opacity-60">{{ stat.icon }}</v-icon>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

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
          <v-text-field
            v-model="searchQuery"
            prepend-inner-icon="mdi-magnify"
            placeholder="Search candidates..."
            variant="outlined"
            density="compact"
            hide-details
            clearable
            style="max-width: 280px;"
          />
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
  middleware: ['auth', 'admin']
})

interface Candidate {
  id: string
  first_name: string
  last_name: string
  email: string
  status: string
  applied_at: string
  onboarding_complete: boolean
  job_positions?: { title: string }
  candidate_skills?: { skill_level: number }[]
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

const filteredCandidates = computed(() => {
  if (!activeStatusFilter.value) return candidates.value
  return candidates.value.filter(c => c.status === activeStatusFilter.value)
})

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
  const avgLevel = candidate.candidate_skills.reduce((sum, s) => sum + s.skill_level, 0) / candidate.candidate_skills.length
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

const fetchCandidates = async () => {
  loading.value = true
  try {
    const { data, error } = await client
      .from('candidates')
      .select(`
        *,
        job_positions:target_position_id(title),
        candidate_skills(skill_level)
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
