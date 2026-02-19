<template>
  <div class="safety-dashboard-page">
    <!-- Page Header -->
    <UiPageHeader
      title="Safety Logs"
      subtitle="Digital workplace safety &amp; compliance logging — Cal/OSHA, AVMA, AAHA"
      icon="mdi-shield-check"
    >
      <template #actions>
        <v-btn
          v-if="canManage"
          variant="outlined"
          prepend-icon="mdi-download"
          @click="exportLogs"
        >
          <span class="desktop-only">Export</span>
        </v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          @click="showNewLogSheet = true"
          size="large"
        >
          <span class="desktop-only">New Log</span>
          <span class="mobile-only">New</span>
        </v-btn>
      </template>
    </UiPageHeader>

    <!-- Log Type Grid (quick-launch tiles) -->
    <div class="d-flex align-center justify-space-between mb-3">
      <h2 class="text-h6 font-weight-bold">Log Types</h2>
      <v-btn
        v-if="canManage"
        variant="text"
        size="small"
        prepend-icon="mdi-cog"
        @click="router.push('/med-ops/safety/manage-types')"
      >
        Manage Types
      </v-btn>
    </div>
    <v-row dense class="mb-6">
      <v-col
        v-for="cfg in allTypes"
        :key="cfg.key"
        cols="6"
        sm="4"
        md="3"
        lg="2"
      >
        <v-card
          variant="outlined"
          rounded="lg"
          class="text-center pa-3 cursor-pointer hover-elevate log-type-tile"
          @click="navigateToEntries(cfg.key)"
        >
          <!-- Red dot indicator for overdue logs -->
          <div v-if="overdueLogTypes.has(cfg.key)" class="overdue-indicator"></div>
          
          <v-avatar :color="cfg.color" size="44" variant="tonal" class="mb-2">
            <v-icon size="24">{{ cfg.icon }}</v-icon>
          </v-avatar>
          <div class="text-caption font-weight-medium">{{ cfg.label }}</div>
          <v-chip
            v-if="store.stats.byType[cfg.key]"
            size="x-small"
            variant="tonal"
            color="grey"
            class="mt-1"
          >
            {{ store.stats.byType[cfg.key] }}
          </v-chip>
        </v-card>
      </v-col>
    </v-row>

    <!-- Filters -->
    <v-card variant="outlined" rounded="lg" class="mb-4">
      <v-card-text class="pb-3">
        <v-row dense>
          <v-col cols="12" sm="6" md="3">
            <v-select
              v-model="filters.log_type"
              :items="logTypeOptions"
              item-title="label"
              item-value="key"
              label="Log Type"
              variant="outlined"
              density="compact"
              clearable
              hide-details
              @update:model-value="applyFilters"
            />
          </v-col>
          <v-col cols="6" sm="3" md="2">
            <v-select
              v-model="filters.location"
              :items="SAFETY_LOCATIONS"
              item-title="label"
              item-value="value"
              label="Location"
              variant="outlined"
              density="compact"
              clearable
              hide-details
              @update:model-value="applyFilters"
            />
          </v-col>
          <v-col cols="6" sm="3" md="2">
            <v-select
              v-model="filters.status"
              :items="SAFETY_STATUSES"
              item-title="label"
              item-value="value"
              label="Status"
              variant="outlined"
              density="compact"
              clearable
              hide-details
              @update:model-value="applyFilters"
            />
          </v-col>
          <v-col cols="6" sm="3" md="2">
            <v-text-field
              v-model="filters.date_from"
              label="From"
              type="date"
              variant="outlined"
              density="compact"
              hide-details
              @change="applyFilters"
            />
          </v-col>
          <v-col cols="6" sm="3" md="2">
            <v-text-field
              v-model="filters.date_to"
              label="To"
              type="date"
              variant="outlined"
              density="compact"
              hide-details
              @change="applyFilters"
            />
          </v-col>
          <v-col cols="12" md="1" class="d-flex align-center">
            <v-btn
              icon="mdi-refresh"
              variant="text"
              density="compact"
              @click="resetFilters"
              title="Reset filters"
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Log List -->
    <div v-if="store.loading" class="d-flex justify-center pa-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <div v-else-if="store.logs.length === 0" class="text-center pa-8">
      <UiEmptyState
        type="generic"
        title="No Safety Logs Yet"
        description="Start by submitting your first safety log entry."
      >
        <template #action>
          <v-btn color="primary" prepend-icon="mdi-plus" @click="showNewLogSheet = true">
            Submit a Log
          </v-btn>
        </template>
      </UiEmptyState>
    </div>

    <template v-else>
      <v-row dense>
        <v-col
          v-for="log in store.logs"
          :key="log.id"
          cols="12"
          sm="6"
          md="4"
        >
          <SafetyLogCard :log="log" @click="openLogDetail(log)" />
        </v-col>
      </v-row>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="d-flex justify-center mt-6">
        <v-pagination
          v-model="currentPage"
          :length="totalPages"
          :total-visible="5"
          density="compact"
          rounded
          @update:model-value="store.goToPage"
        />
      </div>
    </template>

    <!-- Bottom Sheet: Choose New Log Type -->
    <v-bottom-sheet v-model="showNewLogSheet" inset>
      <v-card rounded="t-lg">
        <v-card-title class="d-flex align-center justify-space-between pt-4 px-4">
          <span class="text-h6 font-weight-bold">Select Log Type</span>
          <v-btn icon="mdi-close" variant="text" @click="showNewLogSheet = false" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <v-row dense>
            <v-col
              v-for="cfg in submittableTypes"
              :key="cfg.key"
              cols="6"
              sm="4"
            >
              <v-card
                variant="outlined"
                rounded="lg"
                class="text-center pa-4 cursor-pointer hover-elevate"
                @click="navigateToLogForm(cfg.key)"
              >
                <v-avatar :color="cfg.color" size="48" variant="tonal" class="mb-2">
                  <v-icon size="28">{{ cfg.icon }}</v-icon>
                </v-avatar>
                <div class="text-body-2 font-weight-medium">{{ cfg.label }}</div>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-bottom-sheet>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  type SafetyLogType,
  type SafetyLogLocation,
  type SafetyLogStatus,
  type SafetyLog,
  SAFETY_LOG_TYPE_CONFIGS,
  SAFETY_LOCATIONS,
  SAFETY_STATUSES,
  safetyKeyToSlug,
} from '~/types/safety-log.types'
import { useSafetyLogStore } from '~/stores/safetyLog'

definePageMeta({
  middleware: ['auth'],
  layout: 'default',
})

const store = useSafetyLogStore()
const toast = useToast()
const router = useRouter()
const { can } = usePermissions()
const { allTypes, submittableTypes: mergedSubmittable, fetchCustomTypes } = useCustomSafetyLogTypes()

const canManage = computed(() => can('manage:safety-logs'))

const showNewLogSheet = ref(false)

// Submittable types (everything with at least 1 field — built-in + custom)
const submittableTypes = computed(() => mergedSubmittable.value)

// ── Overdue Schedules ──
interface SafetySchedule {
  id: string
  log_type: string
  location: string
  cadence: 'monthly' | 'quarterly' | 'biannual' | 'annual' | 'none'
  last_completed_at: string | null
  last_notified_at: string | null
}

const schedules = ref<SafetySchedule[]>([])

const CADENCE_DAYS: Record<string, number> = {
  monthly: 30,
  quarterly: 90,
  biannual: 182,
  annual: 365,
}

// Compute overdue log types (across all locations)
const overdueLogTypes = computed(() => {
  const now = new Date()
  const overdueSet = new Set<string>()

  for (const sched of schedules.value) {
    if (sched.cadence === 'none') continue

    const periodDays = CADENCE_DAYS[sched.cadence]
    if (!periodDays) continue

    const cutoff = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)

    // Check if last_completed_at is within the period
    // If it's null or older than the cutoff, it's overdue
    if (!sched.last_completed_at || new Date(sched.last_completed_at) < cutoff) {
      overdueSet.add(sched.log_type)
    }
  }

  return overdueSet
})

async function fetchSchedules() {
  try {
    const data = await $fetch<SafetySchedule[]>('/api/safety-log/schedules')
    schedules.value = data || []
  } catch (error) {
    console.error('Failed to fetch schedules:', error)
  }
}

const logTypeOptions = computed(() =>
  allTypes.value.map(c => ({ key: c.key, label: c.label }))
)

// Filters
const filters = ref<{
  log_type: SafetyLogType | null
  location: SafetyLogLocation | null
  status: SafetyLogStatus | null
  date_from: string | null
  date_to: string | null
}>({
  log_type: null,
  location: null,
  status: null,
  date_from: null,
  date_to: null,
})

const currentPage = ref(1)
const totalPages = computed(() => Math.ceil(store.totalCount / store.pageSize) || 1)

function applyFilters() {
  store.applyFilters(filters.value)
}

function resetFilters() {
  filters.value = { log_type: null, location: null, status: null, date_from: null, date_to: null }
  store.applyFilters(filters.value)
}

function navigateToLogForm(logType: SafetyLogType) {
  showNewLogSheet.value = false
  const slug = typeof logType === 'string' ? logType.replace(/_/g, '-') : safetyKeyToSlug(logType)
  router.push(`/med-ops/safety/${slug}`)
}

function navigateToEntries(logType: SafetyLogType) {
  const slug = typeof logType === 'string' ? logType.replace(/_/g, '-') : safetyKeyToSlug(logType)
  router.push(`/med-ops/safety/entries/${slug}`)
}

function openLogDetail(log: SafetyLog) {
  router.push(`/med-ops/safety/log/${log.id}`)
}

async function exportLogs() {
  try {
    const params = new URLSearchParams()
    if (filters.value.log_type) params.set('log_type', filters.value.log_type)
    if (filters.value.location) params.set('location', filters.value.location)
    if (filters.value.date_from) params.set('date_from', filters.value.date_from)
    if (filters.value.date_to) params.set('date_to', filters.value.date_to)

    const url = `/api/safety-log/export?${params.toString()}`
    window.open(url, '_blank')
    toast.success('Export started')
  } catch {
    toast.error('Export failed')
  }
}

onMounted(() => {
  store.fetchLogs()
  fetchCustomTypes()
  fetchSchedules()
})
</script>

<style scoped>
.log-type-tile {
  position: relative;
}

.overdue-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 12px;
  height: 12px;
  background-color: #f44336;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 1;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

.hover-elevate {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.hover-elevate:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.desktop-only { display: inline; }
.mobile-only { display: none; }
@media (max-width: 599px) {
  .desktop-only { display: none; }
  .mobile-only { display: inline; }
}
</style>
