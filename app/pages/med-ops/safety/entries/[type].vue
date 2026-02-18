<template>
  <div class="safety-entries-page">
    <!-- Back link -->
    <div class="mb-4">
      <v-btn
        variant="text"
        prepend-icon="mdi-arrow-left"
        @click="router.push('/med-ops/safety')"
        class="text-none"
      >
        Back to Safety Logs
      </v-btn>
    </div>

    <!-- Loading type -->
    <div v-if="loadingType" class="d-flex justify-center pa-12">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <!-- Unknown type -->
    <UiEmptyState
      v-else-if="!typeConfig"
      type="generic"
      title="Unknown Log Type"
      description="This safety log type could not be found."
    >
      <template #action>
        <v-btn color="primary" @click="router.push('/med-ops/safety')">
          Back to Safety Logs
        </v-btn>
      </template>
    </UiEmptyState>

    <template v-else>
      <!-- Header -->
      <UiPageHeader
        :title="typeConfig.label"
        :subtitle="`All entries for ${typeConfig.label} — chronological order`"
        :icon="typeConfig.icon"
      >
        <template #actions>
          <v-btn
            color="primary"
            prepend-icon="mdi-plus"
            @click="openNewEntry"
          >
            New Entry
          </v-btn>
        </template>
      </UiPageHeader>

      <!-- Filters row -->
      <v-card variant="outlined" rounded="lg" class="mb-4">
        <v-card-text class="pb-3">
          <v-row dense>
            <v-col cols="6" sm="3">
              <v-select
                v-model="filterLocation"
                :items="SAFETY_LOCATIONS"
                item-title="label"
                item-value="value"
                label="Location"
                variant="outlined"
                density="compact"
                clearable
                hide-details
                @update:model-value="fetchEntries"
              />
            </v-col>
            <v-col cols="6" sm="3">
              <v-select
                v-model="filterStatus"
                :items="SAFETY_STATUSES"
                item-title="label"
                item-value="value"
                label="Status"
                variant="outlined"
                density="compact"
                clearable
                hide-details
                @update:model-value="fetchEntries"
              />
            </v-col>
            <v-col cols="6" sm="3">
              <v-text-field
                v-model="filterDateFrom"
                label="From"
                type="date"
                variant="outlined"
                density="compact"
                hide-details
                @change="fetchEntries"
              />
            </v-col>
            <v-col cols="6" sm="3">
              <v-text-field
                v-model="filterDateTo"
                label="To"
                type="date"
                variant="outlined"
                density="compact"
                hide-details
                @change="fetchEntries"
              />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Stats row -->
      <div class="d-flex gap-3 mb-4 flex-wrap">
        <v-chip variant="tonal" color="primary" size="small">
          {{ totalCount }} total entries
        </v-chip>
        <v-chip v-if="oshaCount > 0" variant="tonal" color="error" size="small">
          {{ oshaCount }} OSHA recordable
        </v-chip>
      </div>

      <!-- Loading entries -->
      <div v-if="loadingEntries" class="d-flex justify-center pa-8">
        <v-progress-circular indeterminate color="primary" />
      </div>

      <!-- Empty -->
      <v-card v-else-if="entries.length === 0" variant="outlined" rounded="lg" class="text-center pa-8">
        <v-icon size="48" color="grey" class="mb-3">mdi-clipboard-text-outline</v-icon>
        <div class="text-body-1 font-weight-medium mb-2">No entries yet</div>
        <div class="text-caption text-grey mb-4">Be the first to submit a {{ typeConfig.label }} log.</div>
        <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="openNewEntry">
          Submit Entry
        </v-btn>
      </v-card>

      <!-- Entries list (chronological) -->
      <template v-else>
        <v-timeline side="end" density="compact" class="entries-timeline">
          <v-timeline-item
            v-for="entry in entries"
            :key="entry.id"
            :dot-color="statusColor(entry.status)"
            size="x-small"
          >
            <v-card
              variant="outlined"
              rounded="lg"
              class="entry-card cursor-pointer"
              @click="openEntry(entry)"
            >
              <v-card-text class="pa-3">
                <div class="d-flex align-center justify-space-between mb-1">
                  <div class="d-flex align-center gap-2">
                    <span class="text-subtitle-2 font-weight-medium">
                      {{ locationLabel(entry.location) }}
                    </span>
                    <v-chip
                      v-if="entry.osha_recordable"
                      size="x-small"
                      color="error"
                      variant="flat"
                    >
                      OSHA
                    </v-chip>
                    <v-chip
                      :color="statusColor(entry.status)"
                      size="x-small"
                      variant="tonal"
                    >
                      {{ entry.status }}
                    </v-chip>
                  </div>
                  <span class="text-caption text-grey">
                    {{ formatDate(entry.submitted_at) }}
                  </span>
                </div>

                <!-- Summary from form data -->
                <div v-if="entrySummary(entry)" class="text-body-2 text-grey-darken-1 mb-1 text-truncate">
                  {{ entrySummary(entry) }}
                </div>

                <div class="text-caption text-grey">
                  <v-icon size="12" class="mr-1">mdi-account</v-icon>
                  {{ submitterName(entry) }}
                </div>
              </v-card-text>
            </v-card>
          </v-timeline-item>
        </v-timeline>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="d-flex justify-center mt-6">
          <v-pagination
            v-model="currentPage"
            :length="totalPages"
            :total-visible="5"
            density="compact"
            rounded
            @update:model-value="fetchEntries"
          />
        </div>
      </template>
    </template>

    <!-- New Entry Dialog (full-screen on mobile) -->
    <v-dialog v-model="showNewEntryDialog" max-width="900" scrollable>
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center justify-space-between pt-4 px-4">
          <span class="text-h6 font-weight-bold">
            <v-icon :color="typeConfig?.color" class="mr-2">{{ typeConfig?.icon }}</v-icon>
            New {{ typeConfig?.label }} Entry
          </span>
          <v-btn icon="mdi-close" variant="text" @click="showNewEntryDialog = false" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4 pa-sm-6">
          <!-- Auto-fill banner -->
          <v-alert
            type="info"
            variant="tonal"
            density="compact"
            class="mb-4"
            icon="mdi-information"
          >
            Submitting as <strong>{{ userName }}</strong> on <strong>{{ todayFormatted }}</strong>.
          </v-alert>

          <SafetyLogFormRenderer
            v-if="typeConfig"
            :log-type="typeKey"
            :submitting="submitting"
            @submit="handleSubmit"
            @cancel="showNewEntryDialog = false"
          />
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Success dialog -->
    <v-dialog v-model="showSuccess" max-width="420" persistent>
      <v-card rounded="lg">
        <v-card-text class="text-center pa-8">
          <v-icon size="64" color="success" class="mb-4">mdi-check-circle</v-icon>
          <h3 class="text-h6 font-weight-bold mb-2">Entry Submitted!</h3>
          <p class="text-body-2 text-grey mb-6">
            Your {{ typeConfig?.label }} entry has been recorded.
          </p>
          <v-btn color="primary" block @click="onSuccessDismiss">
            Done
          </v-btn>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { format, parseISO } from 'date-fns'
import {
  type SafetyLog,
  type SafetyLogType,
  type SafetyLogLocation,
  type SafetyLogStatus,
  type SafetyLogTypeConfig,
  SAFETY_LOCATIONS,
  SAFETY_STATUSES,
  safetySlugToKey,
  getSafetyLogTypeConfig,
} from '~/types/safety-log.types'

definePageMeta({
  middleware: ['auth'],
  layout: 'default',
})

const route = useRoute()
const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()
const { findType, fetchCustomTypes, loaded: ctLoaded } = useCustomSafetyLogTypes()

const loadingType = ref(true)

// ── Resolve type from URL ──────────────────────────────
const typeKey = computed<SafetyLogType>(() =>
  safetySlugToKey(route.params.type as string)
)

const typeConfig = computed<SafetyLogTypeConfig | undefined>(() => {
  const builtIn = getSafetyLogTypeConfig(typeKey.value)
  if (builtIn) return builtIn
  return findType(typeKey.value)
})

// ── Entries state ──────────────────────────────────────
const entries = ref<SafetyLog[]>([])
const loadingEntries = ref(false)
const totalCount = ref(0)
const oshaCount = ref(0)
const currentPage = ref(1)
const pageSize = 25
const totalPages = computed(() => Math.ceil(totalCount.value / pageSize) || 1)

// ── Filters ────────────────────────────────────────────
const filterLocation = ref<SafetyLogLocation | null>(null)
const filterStatus = ref<SafetyLogStatus | null>(null)
const filterDateFrom = ref<string | null>(null)
const filterDateTo = ref<string | null>(null)

async function fetchEntries() {
  loadingEntries.value = true
  try {
    const params: Record<string, string> = {
      log_type: typeKey.value,
      page: String(currentPage.value),
      pageSize: String(pageSize),
    }
    if (filterLocation.value) params.location = filterLocation.value
    if (filterStatus.value) params.status = filterStatus.value
    if (filterDateFrom.value) params.date_from = filterDateFrom.value
    if (filterDateTo.value) params.date_to = filterDateTo.value

    const result = await $fetch<{ data: SafetyLog[]; total: number; page: number; pageSize: number }>('/api/safety-log', {
      params,
    })

    entries.value = result.data || []
    totalCount.value = result.total || 0

    // Count OSHA
    oshaCount.value = entries.value.filter(e => e.osha_recordable).length
  } catch (err: any) {
    console.error('Failed to fetch entries:', err)
    toast.error('Failed to load entries')
  } finally {
    loadingEntries.value = false
  }
}

// ── Helpers ────────────────────────────────────────────
function locationLabel(loc: string): string {
  return SAFETY_LOCATIONS.find(l => l.value === loc)?.label || loc
}

function statusColor(status: string): string {
  return SAFETY_STATUSES.find(s => s.value === status)?.color || 'grey'
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy h:mm a')
  } catch {
    return dateStr
  }
}

function submitterName(entry: SafetyLog): string {
  if (entry.submitter) return `${entry.submitter.first_name} ${entry.submitter.last_name}`
  return 'Unknown'
}

function entrySummary(entry: SafetyLog): string {
  const fd = entry.form_data || {}
  const cfg = typeConfig.value
  if (cfg) {
    const firstField = cfg.fields.find(f => f.required && fd[f.key])
    if (firstField) return String(fd[firstField.key])
  }
  for (const val of Object.values(fd)) {
    if (typeof val === 'string' && val.trim()) return val
  }
  return ''
}

function openEntry(entry: SafetyLog) {
  router.push(`/med-ops/safety/log/${entry.id}`)
}

// ── New Entry ──────────────────────────────────────────
const showNewEntryDialog = ref(false)
const showSuccess = ref(false)
const submitting = ref(false)

const userName = computed(() => {
  const p = authStore.profile
  if (p?.first_name && p?.last_name) return `${p.first_name} ${p.last_name}`
  return authStore.profile?.email || 'You'
})

const todayFormatted = computed(() => format(new Date(), 'MMMM d, yyyy'))

function openNewEntry() {
  showNewEntryDialog.value = true
}

async function handleSubmit(payload: { location: SafetyLogLocation; form_data: Record<string, unknown>; osha_recordable: boolean }) {
  submitting.value = true
  try {
    await $fetch('/api/safety-log', {
      method: 'POST',
      body: {
        log_type: typeKey.value,
        location: payload.location,
        form_data: payload.form_data,
        osha_recordable: payload.osha_recordable,
        status: 'submitted',
      },
    })

    showNewEntryDialog.value = false
    showSuccess.value = true
    toast.success('Entry submitted')
  } catch (err: any) {
    const message = err?.data?.message || err?.message || 'Failed to submit entry'
    toast.error(message)
  } finally {
    submitting.value = false
  }
}

function onSuccessDismiss() {
  showSuccess.value = false
  fetchEntries()
}

// ── Lifecycle ──────────────────────────────────────────
onMounted(async () => {
  if (!ctLoaded.value) await fetchCustomTypes()
  loadingType.value = false
  fetchEntries()
})
</script>

<style scoped>
.safety-entries-page {
  max-width: 1000px;
}

.entry-card {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.entry-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.entries-timeline :deep(.v-timeline-item__body) {
  width: 100%;
}
</style>
