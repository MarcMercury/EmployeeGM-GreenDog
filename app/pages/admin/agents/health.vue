<template>
  <div>
    <v-row class="mb-4">
      <v-col>
        <div class="d-flex align-center justify-space-between flex-wrap ga-3">
          <div>
            <h1 class="text-h4 font-weight-bold d-flex align-center">
              <v-icon class="mr-3" color="primary" size="36">mdi-heart-pulse</v-icon>
              Agent Fleet Health
            </h1>
            <p class="text-subtitle-1 text-medium-emphasis mt-1">
              Real-time health of the autonomous agent fleet
            </p>
          </div>
          <div class="d-flex ga-2">
            <v-btn variant="text" :to="{ path: '/admin/agents' }">
              <v-icon start>mdi-robot</v-icon>
              Full Roster
            </v-btn>
            <v-btn color="primary" variant="elevated" :loading="loading" @click="refresh">
              <v-icon start>mdi-refresh</v-icon>
              Refresh
            </v-btn>
          </div>
        </div>
      </v-col>
    </v-row>

    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-4"
      closable
      @click:close="error = null"
    >
      {{ error }}
    </v-alert>

    <!-- Top status banner -->
    <v-card v-if="health" class="mb-4" :color="bannerColor" variant="tonal">
      <v-card-text class="d-flex align-center ga-3 py-4">
        <v-icon size="32" :color="bannerIconColor">{{ bannerIcon }}</v-icon>
        <div>
          <div class="text-h6">{{ health.status === 'error' ? 'Error' : health.status }}</div>
          <div class="text-body-2">{{ health.message }}</div>
        </div>
        <v-spacer />
        <div class="text-caption text-medium-emphasis">
          Updated {{ formatRelative(health.lastUpdated) }}
        </div>
      </v-card-text>
    </v-card>

    <!-- Metric tiles -->
    <v-row v-if="health && health.status !== 'error'" class="mb-4">
      <v-col cols="6" md="3">
        <v-card variant="outlined">
          <v-card-text>
            <div class="text-caption text-medium-emphasis">Active agents</div>
            <div class="text-h4 font-weight-bold">{{ health.metrics?.activeAgentCount ?? 0 }}</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card variant="outlined">
          <v-card-text>
            <div class="text-caption text-medium-emphasis">Successes (24h)</div>
            <div class="text-h4 font-weight-bold text-success">
              {{ health.metrics?.recentSuccessCount ?? 0 }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card variant="outlined">
          <v-card-text>
            <div class="text-caption text-medium-emphasis">Errors (24h)</div>
            <div
              class="text-h4 font-weight-bold"
              :class="(health.metrics?.recentErrorCount ?? 0) > 0 ? 'text-error' : ''"
            >
              {{ health.metrics?.recentErrorCount ?? 0 }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card variant="outlined">
          <v-card-text>
            <div class="text-caption text-medium-emphasis">Stale agents</div>
            <div
              class="text-h4 font-weight-bold"
              :class="(health.metrics?.staleAgentCount ?? 0) > 0 ? 'text-warning' : ''"
            >
              {{ health.metrics?.staleAgentCount ?? 0 }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Stale agent list -->
    <v-card v-if="staleIds.length > 0" class="mb-4" variant="outlined">
      <v-card-title class="d-flex align-center">
        <v-icon start color="warning">mdi-clock-alert-outline</v-icon>
        Stale agents ({{ staleIds.length }})
      </v-card-title>
      <v-card-text class="text-caption text-medium-emphasis pb-0">
        Scheduled agents that have not run in over 48 hours.
      </v-card-text>
      <v-list density="compact">
        <v-list-item v-for="id in staleIds" :key="id">
          <template #prepend>
            <v-icon color="warning">mdi-robot-off-outline</v-icon>
          </template>
          <v-list-item-title>{{ id }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-card>

    <!-- Recent runs -->
    <v-card class="mb-4" variant="outlined">
      <v-card-title class="d-flex align-center">
        <v-icon start>mdi-history</v-icon>
        Recent runs
      </v-card-title>
      <v-data-table
        :headers="runHeaders"
        :items="recentRuns"
        :loading="loading"
        density="compact"
        items-per-page="20"
      >
        <template #[`item.status`]="{ item }">
          <v-chip :color="runStatusColor(item.status)" size="small" variant="tonal">
            {{ item.status }}
          </v-chip>
        </template>
        <template #[`item.started_at`]="{ item }">
          {{ formatRelative(item.started_at) }}
        </template>
        <template #[`item.finished_at`]="{ item }">
          {{ item.finished_at ? formatRelative(item.finished_at) : '—' }}
        </template>
      </v-data-table>
    </v-card>

    <!-- Open proposals -->
    <v-card variant="outlined">
      <v-card-title class="d-flex align-center">
        <v-icon start>mdi-clipboard-list-outline</v-icon>
        Open proposals ({{ openProposals.length }})
      </v-card-title>
      <v-data-table
        :headers="proposalHeaders"
        :items="openProposals"
        :loading="loading"
        density="compact"
        items-per-page="20"
      >
        <template #[`item.status`]="{ item }">
          <v-chip :color="proposalStatusColor(item.status)" size="small" variant="tonal">
            {{ item.status }}
          </v-chip>
        </template>
        <template #[`item.created_at`]="{ item }">
          {{ formatRelative(item.created_at) }}
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import type { AgentHealthResponse } from '~/schemas/agent-api'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin'],
})

const loading = ref(false)
const error = ref<string | null>(null)
const health = ref<AgentHealthResponse | null>(null)
const recentRuns = ref<any[]>([])
const openProposals = ref<any[]>([])

const runHeaders = [
  { title: 'Agent', key: 'agent_id' },
  { title: 'Status', key: 'status' },
  { title: 'Trigger', key: 'trigger_type' },
  { title: 'Started', key: 'started_at' },
  { title: 'Finished', key: 'finished_at' },
  { title: 'Tokens', key: 'tokens_used', align: 'end' as const },
]

const proposalHeaders = [
  { title: 'Agent', key: 'agent_id' },
  { title: 'Type', key: 'proposal_type' },
  { title: 'Title', key: 'title' },
  { title: 'Risk', key: 'risk_level' },
  { title: 'Status', key: 'status' },
  { title: 'Created', key: 'created_at' },
]

const staleIds = computed(() => {
  if (!health.value || health.value.status === 'error') return [] as string[]
  return health.value.metrics?.staleAgentIds ?? []
})

const bannerColor = computed(() => {
  if (!health.value) return 'info'
  if (health.value.status === 'healthy') return 'success'
  if (health.value.status === 'degraded') return 'warning'
  return 'error'
})
const bannerIconColor = computed(() => bannerColor.value)
const bannerIcon = computed(() => {
  if (!health.value) return 'mdi-cloud-question-outline'
  if (health.value.status === 'healthy') return 'mdi-check-circle-outline'
  if (health.value.status === 'degraded') return 'mdi-alert-outline'
  return 'mdi-alert-circle-outline'
})

function formatRelative(iso: string | null | undefined) {
  if (!iso) return '—'
  const ts = new Date(iso).getTime()
  if (!Number.isFinite(ts)) return iso ?? '—'
  const deltaSec = Math.round((Date.now() - ts) / 1000)
  if (deltaSec < 60) return `${deltaSec}s ago`
  if (deltaSec < 3600) return `${Math.round(deltaSec / 60)}m ago`
  if (deltaSec < 86400) return `${Math.round(deltaSec / 3600)}h ago`
  return `${Math.round(deltaSec / 86400)}d ago`
}

function runStatusColor(status: string) {
  switch (status) {
    case 'success': return 'success'
    case 'partial': return 'warning'
    case 'error': return 'error'
    case 'running': return 'info'
    default: return 'grey'
  }
}

function proposalStatusColor(status: string) {
  switch (status) {
    case 'pending': return 'warning'
    case 'approved':
    case 'auto_approved': return 'info'
    case 'applied': return 'success'
    case 'rejected':
    case 'expired': return 'grey'
    default: return 'grey'
  }
}

async function refresh() {
  loading.value = true
  error.value = null
  try {
    const [healthRes, runsRes, proposalsRes] = await Promise.all([
      $fetch<AgentHealthResponse>('/api/agents/health'),
      $fetch<{ data?: any[] }>('/api/agents/runs?limit=20').catch(() => ({ data: [] })),
      $fetch<{ data?: any[] }>('/api/agents/proposals?status=pending&limit=20').catch(() => ({ data: [] })),
    ])
    health.value = healthRes
    recentRuns.value = Array.isArray(runsRes?.data) ? runsRes.data : []
    openProposals.value = Array.isArray(proposalsRes?.data) ? proposalsRes.data : []
  } catch (err: any) {
    error.value = err?.data?.message || err?.message || 'Failed to load agent health'
  } finally {
    loading.value = false
  }
}

onMounted(refresh)
</script>
