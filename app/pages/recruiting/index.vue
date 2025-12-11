<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Recruiting Dashboard</h1>
        <p class="text-body-1 text-grey-darken-1">
          Track your hiring pipeline and onboarding progress
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

    <!-- Pipeline Funnel Stats -->
    <v-row class="mb-6">
      <v-col v-for="stat in pipelineStats" :key="stat.status" cols="12" sm="6" md="4" lg="2">
        <v-card
          :color="stat.color"
          variant="flat"
          rounded="lg"
          class="cursor-pointer"
          @click="navigateTo(`/recruiting/candidates?status=${stat.status}`)"
        >
          <v-card-text class="text-white">
            <div class="d-flex align-center justify-space-between">
              <div>
                <p class="text-overline opacity-80">{{ stat.label }}</p>
                <p class="text-h4 font-weight-bold">{{ stat.count }}</p>
              </div>
              <v-icon size="32" class="opacity-60">{{ stat.icon }}</v-icon>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <!-- Action Items -->
      <v-col cols="12" md="6">
        <v-card rounded="lg" class="h-100">
          <v-card-title class="d-flex align-center">
            <v-icon start color="warning">mdi-alert-circle</v-icon>
            Action Items
          </v-card-title>
          <v-divider />
          <v-card-text v-if="staleNewCandidates.length === 0" class="text-center py-8">
            <v-icon size="48" color="grey-lighten-1">mdi-check-circle</v-icon>
            <p class="text-body-1 text-grey mt-2">No pending action items</p>
          </v-card-text>
          <v-list v-else>
            <v-list-item
              v-for="candidate in staleNewCandidates"
              :key="candidate.id"
              :to="`/recruiting/candidates?id=${candidate.id}`"
            >
              <template #prepend>
                <v-avatar color="warning" size="40">
                  <span class="text-white font-weight-bold">
                    {{ candidate.first_name[0] }}{{ candidate.last_name[0] }}
                  </span>
                </v-avatar>
              </template>
              <v-list-item-title>{{ candidate.first_name }} {{ candidate.last_name }}</v-list-item-title>
              <v-list-item-subtitle class="text-warning">
                <v-icon size="14" start>mdi-clock-alert</v-icon>
                New for {{ getDaysAgo(candidate.applied_at) }} days - needs review
              </v-list-item-subtitle>
              <template #append>
                <v-icon color="grey">mdi-chevron-right</v-icon>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>

      <!-- Onboarding Progress -->
      <v-col cols="12" md="6">
        <v-card rounded="lg" class="h-100">
          <v-card-title class="d-flex align-center">
            <v-icon start color="success">mdi-clipboard-check-multiple</v-icon>
            Onboarding in Progress
          </v-card-title>
          <v-divider />
          <v-card-text v-if="onboardingCandidates.length === 0" class="text-center py-8">
            <v-icon size="48" color="grey-lighten-1">mdi-account-check</v-icon>
            <p class="text-body-1 text-grey mt-2">No candidates currently onboarding</p>
          </v-card-text>
          <v-list v-else>
            <v-list-item
              v-for="candidate in onboardingCandidates"
              :key="candidate.id"
              :to="`/recruiting/onboarding?id=${candidate.id}`"
            >
              <template #prepend>
                <v-avatar color="success" size="40">
                  <span class="text-white font-weight-bold">
                    {{ candidate.first_name[0] }}{{ candidate.last_name[0] }}
                  </span>
                </v-avatar>
              </template>
              <v-list-item-title>{{ candidate.first_name }} {{ candidate.last_name }}</v-list-item-title>
              <v-list-item-subtitle>
                <v-progress-linear
                  :model-value="getOnboardingProgress(candidate)"
                  color="success"
                  height="6"
                  rounded
                  class="mt-1"
                />
              </v-list-item-subtitle>
              <template #append>
                <span class="text-caption text-grey mr-2">
                  {{ getOnboardingProgress(candidate) }}%
                </span>
                <v-icon color="grey">mdi-chevron-right</v-icon>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>

    <!-- Recent Activity -->
    <v-card rounded="lg" class="mt-6">
      <v-card-title class="d-flex align-center">
        <v-icon start color="primary">mdi-history</v-icon>
        Recent Applications
      </v-card-title>
      <v-divider />
      <v-card-text v-if="recentCandidates.length === 0" class="text-center py-8">
        <v-icon size="48" color="grey-lighten-1">mdi-account-search</v-icon>
        <p class="text-body-1 text-grey mt-2">No recent applications</p>
      </v-card-text>
      <v-list v-else>
        <v-list-item
          v-for="candidate in recentCandidates"
          :key="candidate.id"
          :to="`/recruiting/candidates?id=${candidate.id}`"
        >
          <template #prepend>
            <v-avatar :color="getStatusColor(candidate.status)" size="40">
              <span class="text-white font-weight-bold">
                {{ candidate.first_name[0] }}{{ candidate.last_name[0] }}
              </span>
            </v-avatar>
          </template>
          <v-list-item-title>
            {{ candidate.first_name }} {{ candidate.last_name }}
            <span class="text-grey ml-2">applied for</span>
            {{ candidate.job_positions?.title || 'General Position' }}
          </v-list-item-title>
          <v-list-item-subtitle>
            {{ formatDate(candidate.applied_at) }}
          </v-list-item-subtitle>
          <template #append>
            <v-chip :color="getStatusColor(candidate.status)" size="small" label>
              {{ formatStatus(candidate.status) }}
            </v-chip>
          </template>
        </v-list-item>
      </v-list>
    </v-card>
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
  onboarding_checklist?: {
    contract_sent: boolean
    contract_signed: boolean
    background_check: boolean
    uniform_ordered: boolean
    email_created: boolean
  }
}

const client = useSupabaseClient()

// State
const candidates = ref<Candidate[]>([])
const loading = ref(true)

// Computed
const pipelineStats = computed(() => [
  { status: 'new', label: 'New', count: candidates.value.filter(c => c.status === 'new').length, color: 'info', icon: 'mdi-new-box' },
  { status: 'screening', label: 'Screening', count: candidates.value.filter(c => c.status === 'screening').length, color: 'purple', icon: 'mdi-file-search' },
  { status: 'interview', label: 'Interview', count: candidates.value.filter(c => c.status === 'interview').length, color: 'warning', icon: 'mdi-account-voice' },
  { status: 'offer', label: 'Offer', count: candidates.value.filter(c => c.status === 'offer').length, color: 'success', icon: 'mdi-handshake' },
  { status: 'hired', label: 'Hired', count: candidates.value.filter(c => c.status === 'hired').length, color: 'primary', icon: 'mdi-account-check' },
  { status: 'rejected', label: 'Rejected', count: candidates.value.filter(c => c.status === 'rejected').length, color: 'grey', icon: 'mdi-account-remove' }
])

const staleNewCandidates = computed(() => {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  return candidates.value
    .filter(c => c.status === 'new' && new Date(c.applied_at) < sevenDaysAgo)
    .slice(0, 5)
})

const onboardingCandidates = computed(() => {
  return candidates.value
    .filter(c => (c.status === 'offer' || c.status === 'hired') && !c.onboarding_complete)
    .slice(0, 5)
})

const recentCandidates = computed(() => {
  return [...candidates.value]
    .sort((a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime())
    .slice(0, 10)
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

const getOnboardingProgress = (candidate: Candidate) => {
  if (!candidate.onboarding_checklist) return 0
  const checklist = candidate.onboarding_checklist
  const items = [
    checklist.contract_sent,
    checklist.contract_signed,
    checklist.background_check,
    checklist.uniform_ordered,
    checklist.email_created
  ]
  const completed = items.filter(Boolean).length
  return Math.round((completed / items.length) * 100)
}

const fetchCandidates = async () => {
  loading.value = true
  try {
    const { data, error } = await client
      .from('candidates')
      .select(`
        *,
        job_positions:target_position_id(title),
        onboarding_checklist(*)
      `)
      .order('applied_at', { ascending: false })

    if (error) throw error
    candidates.value = data || []
  } catch (error) {
    console.error('Error fetching candidates:', error)
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
</style>
