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
          prepend-icon="mdi-qrcode"
          @click="router.push('/med-ops/safety/qr-codes')"
        >
          <span class="desktop-only">QR Codes</span>
        </v-btn>
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

    <!-- Stats Row -->
    <div class="stats-scroll-container mb-6">
      <div class="stats-scroll-inner">
        <v-card rounded="lg" class="stat-card">
          <v-card-text class="text-center pa-3">
            <v-icon size="24" color="primary" class="mb-1">mdi-file-document-multiple</v-icon>
            <div class="text-h5 font-weight-bold">{{ store.stats.total }}</div>
            <div class="text-caption text-grey">Total Logs</div>
          </v-card-text>
        </v-card>
        <v-card rounded="lg" class="stat-card">
          <v-card-text class="text-center pa-3">
            <v-icon size="24" color="blue" class="mb-1">mdi-clock-outline</v-icon>
            <div class="text-h5 font-weight-bold">{{ store.stats.pendingReview }}</div>
            <div class="text-caption text-grey">Pending Review</div>
          </v-card-text>
        </v-card>
        <v-card v-if="canManage" rounded="lg" class="stat-card">
          <v-card-text class="text-center pa-3">
            <v-icon size="24" color="error" class="mb-1">mdi-alert-circle</v-icon>
            <div class="text-h5 font-weight-bold">{{ store.stats.oshaCount }}</div>
            <div class="text-caption text-grey">OSHA Recordable</div>
          </v-card-text>
        </v-card>
        <v-card rounded="lg" class="stat-card">
          <v-card-text class="text-center pa-3">
            <v-icon size="24" color="warning" class="mb-1">mdi-flag</v-icon>
            <div class="text-h5 font-weight-bold">{{ store.stats.flaggedCount }}</div>
            <div class="text-caption text-grey">Flagged</div>
          </v-card-text>
        </v-card>
      </div>
    </div>

    <!-- Log Type Grid (quick-launch tiles) -->
    <h2 class="text-h6 font-weight-bold mb-3">Log Types</h2>
    <v-row dense class="mb-6">
      <v-col
        v-for="cfg in SAFETY_LOG_TYPE_CONFIGS"
        :key="cfg.key"
        cols="6"
        sm="4"
        md="3"
        lg="2"
      >
        <v-card
          variant="outlined"
          rounded="lg"
          class="text-center pa-3 cursor-pointer hover-elevate"
          @click="navigateToLogForm(cfg.key)"
        >
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

const canManage = computed(() => can('manage:safety-logs'))

const showNewLogSheet = ref(false)

// Submittable types (everything except emergency_contacts which is read-only)
const submittableTypes = computed(() =>
  SAFETY_LOG_TYPE_CONFIGS.filter(c => c.key !== 'emergency_contacts')
)

const logTypeOptions = computed(() =>
  SAFETY_LOG_TYPE_CONFIGS.map(c => ({ key: c.key, label: c.label }))
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
  if (logType === 'emergency_contacts') {
    // Emergency contacts is a static view on this same page
    router.push(`/med-ops/safety/${safetyKeyToSlug(logType)}`)
  } else {
    router.push(`/med-ops/safety/${safetyKeyToSlug(logType)}`)
  }
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
})
</script>

<style scoped>
.stat-card {
  min-width: 130px;
  flex-shrink: 0;
}
.stats-scroll-container {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.stats-scroll-inner {
  display: flex;
  gap: 12px;
  padding-bottom: 4px;
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
