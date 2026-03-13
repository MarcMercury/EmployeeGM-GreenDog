<template>
  <div>
    <!-- Internal Admin Notes -->
    <v-row v-if="employee.notes_internal" class="mb-4">
      <v-col cols="12">
        <v-card class="bg-amber-lighten-5 shadow-sm rounded-xl" elevation="0">
          <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold">
            <v-icon start size="20" color="amber-darken-2">mdi-note-alert</v-icon>
            Internal Admin Notes
            <v-chip size="x-small" variant="tonal" color="amber-darken-2" class="ml-2">
              Admin Only
            </v-chip>
          </v-card-title>
          <v-card-text>
            <p class="text-body-2 mb-0" style="white-space: pre-wrap;">{{ employee.notes_internal }}</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Safety & Compliance Logs Section -->
    <v-row class="mb-4">
      <v-col cols="12">
        <v-card class="bg-white shadow-sm rounded-xl" elevation="0">
          <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold">
            <v-icon start size="20" color="deep-orange">mdi-shield-check</v-icon>
            Safety &amp; Compliance Logs
            <v-spacer />
            <v-chip size="x-small" variant="tonal" color="deep-orange">
              {{ safetyLogs.length }} {{ safetyLogs.length === 1 ? 'Record' : 'Records' }}
            </v-chip>
          </v-card-title>

          <!-- Loading -->
          <v-card-text v-if="safetyLogsLoading" class="text-center py-6">
            <v-progress-circular indeterminate size="32" color="deep-orange" />
            <p class="text-body-2 text-grey mt-2">Loading safety logs…</p>
          </v-card-text>

          <!-- Logs list -->
          <v-card-text v-else-if="safetyLogs.length > 0" style="max-height: 500px; overflow-y: auto;">
            <!-- Filter chips -->
            <div class="d-flex flex-wrap gap-2 mb-3">
              <v-chip
                v-for="category in safetyLogCategories"
                :key="category"
                :color="safetyLogFilter === category ? getLogTypeDisplay(category).color : 'grey-lighten-3'"
                :variant="safetyLogFilter === category ? 'flat' : 'tonal'"
                size="small"
                class="cursor-pointer"
                @click="safetyLogFilter = safetyLogFilter === category ? null : category"
              >
                <v-icon start size="14">{{ getLogTypeDisplay(category).icon }}</v-icon>
                {{ getLogTypeDisplay(category).label }}
                <span class="ml-1 text-caption">({{ safetyLogCounts[category] }})</span>
              </v-chip>
            </div>

            <v-timeline density="compact" side="end">
              <v-timeline-item
                v-for="log in filteredSafetyLogs"
                :key="log.id"
                :dot-color="getLogTypeDisplay(log.log_type).color"
                size="x-small"
              >
                <template #opposite>
                  <span class="text-caption text-grey">
                    {{ formatDate(log.submitted_at) }}
                  </span>
                </template>
                <v-card variant="tonal" class="pa-3">
                  <div class="d-flex align-center mb-1">
                    <v-icon size="16" :color="getLogTypeDisplay(log.log_type).color" class="mr-2">
                      {{ getLogTypeDisplay(log.log_type).icon }}
                    </v-icon>
                    <span class="text-body-2 font-weight-medium">
                      {{ getLogTypeDisplay(log.log_type).label }}
                    </span>
                    <v-spacer />
                    <!-- Status chip -->
                    <v-chip
                      :color="getStatusColor(log.status)"
                      size="x-small"
                      variant="tonal"
                      class="ml-2"
                    >
                      {{ log.status }}
                    </v-chip>
                  </div>

                  <!-- Employee role in this log -->
                  <div v-if="log.employee_roles?.length" class="mb-1">
                    <v-chip
                      v-for="role in log.employee_roles"
                      :key="role"
                      size="x-small"
                      variant="outlined"
                      color="grey-darken-1"
                      class="mr-1"
                    >
                      {{ getRoleLabel(role) }}
                    </v-chip>
                  </div>

                  <!-- Key form data summary -->
                  <div class="text-caption text-grey-darken-1">
                    <span v-if="log.form_data?.topic">
                      <strong>Topic:</strong> {{ log.form_data.topic }}
                    </span>
                    <span v-else-if="log.form_data?.description">
                      {{ truncate(String(log.form_data.description), 120) }}
                    </span>
                    <span v-else-if="log.form_data?.drill_type">
                      <strong>Drill:</strong> {{ log.form_data.drill_type }}
                    </span>
                    <span v-else-if="log.form_data?.device_type">
                      <strong>Device:</strong> {{ log.form_data.device_type }}
                    </span>
                    <span v-else-if="log.form_data?.exposure_type">
                      <strong>Exposure:</strong> {{ log.form_data.exposure_type }}
                    </span>
                    <span v-else-if="log.form_data?.chemical_name">
                      <strong>Chemical:</strong> {{ log.form_data.chemical_name }}
                    </span>
                    <span v-else-if="log.form_data?.equipment_id">
                      <strong>Equipment:</strong> {{ log.form_data.equipment_id }}
                    </span>
                  </div>

                  <!-- Location & OSHA -->
                  <div class="d-flex align-center mt-1 text-caption text-grey">
                    <v-icon size="12" class="mr-1">mdi-map-marker</v-icon>
                    {{ formatLocation(log.location) }}
                    <v-chip
                      v-if="log.osha_recordable"
                      size="x-small"
                      color="red"
                      variant="flat"
                      class="ml-2"
                    >
                      OSHA
                    </v-chip>
                    <span v-if="log.submitter" class="ml-2">
                      Filed by {{ log.submitter.first_name }} {{ log.submitter.last_name }}
                    </span>
                  </div>
                </v-card>
              </v-timeline-item>
            </v-timeline>
          </v-card-text>

          <!-- Empty state -->
          <v-card-text v-else class="text-center py-8">
            <v-icon size="48" color="grey-lighten-2">mdi-shield-off-outline</v-icon>
            <p class="text-body-2 text-grey mt-2">No safety or compliance logs linked to this employee</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <!-- Notes Section -->
      <v-col cols="12" md="6">
        <v-card class="bg-white shadow-sm rounded-xl" elevation="0">
          <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold">
            <v-icon start size="20" color="primary">mdi-note-text</v-icon>
            HR Notes
            <v-spacer />
            <v-btn 
              v-if="isAdmin" 
              icon="mdi-plus" 
              size="x-small" 
              variant="tonal"
              color="primary"
              @click="emit('open-note-dialog')"
            />
          </v-card-title>
          <v-card-text v-if="notes.length > 0" style="max-height: 500px; overflow-y: auto;">
            <v-timeline density="compact" side="end">
              <v-timeline-item
                v-for="note in notes"
                :key="note.id"
                :dot-color="note.visibility === 'private' ? 'grey' : 'primary'"
                size="x-small"
              >
                <template #opposite>
                  <span class="text-caption text-grey">
                    {{ formatDate(note.created_at) }}
                  </span>
                </template>
                <v-card variant="tonal" class="pa-3">
                  <div class="d-flex align-center mb-2">
                    <span class="text-body-2 font-weight-medium">
                      {{ note.author?.preferred_name || note.author?.first_name || 'System' }}
                      {{ note.author?.last_name?.charAt(0) || '' }}.
                    </span>
                    <v-chip 
                      v-if="note.visibility === 'private'" 
                      size="x-small" 
                      variant="outlined" 
                      color="grey" 
                      class="ml-2"
                    >
                      <v-icon start size="10">mdi-lock</v-icon>
                      Private
                    </v-chip>
                  </div>
                  <p class="text-body-2 mb-0">{{ note.note }}</p>
                </v-card>
              </v-timeline-item>
            </v-timeline>
          </v-card-text>
          <v-card-text v-else class="text-center py-8">
            <v-icon size="48" color="grey-lighten-2">mdi-note-off-outline</v-icon>
            <p class="text-body-2 text-grey mt-2">No notes on file</p>
            <v-btn 
              v-if="isAdmin" 
              variant="tonal" 
              color="primary" 
              size="small" 
              class="mt-2"
              @click="emit('open-note-dialog')"
            >
              <v-icon start>mdi-plus</v-icon>
              Add First Note
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Audit Log / Activity Timeline -->
      <v-col cols="12" md="6">
        <v-card class="bg-white shadow-sm rounded-xl" elevation="0">
          <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold">
            <v-icon start size="20" color="info">mdi-history</v-icon>
            Activity Log
            <v-spacer />
            <v-chip size="x-small" variant="tonal" color="info">
              Last 50
            </v-chip>
          </v-card-title>
          <v-card-text v-if="auditLogs.length > 0" style="max-height: 500px; overflow-y: auto;">
            <v-list density="compact" class="bg-transparent">
              <v-list-item
                v-for="log in auditLogs"
                :key="log.id"
                class="px-0 mb-2"
              >
                <template #prepend>
                  <v-avatar size="28" :color="getActionColor(log.action)" variant="tonal">
                    <v-icon size="14">{{ getActionIcon(log.action) }}</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="text-body-2">
                  <span class="font-weight-medium text-capitalize">{{ log.action?.toLowerCase() }}</span>
                  <span v-if="log.entity_type" class="text-grey"> • {{ log.entity_type }}</span>
                </v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                  {{ log.actor?.email || 'System' }} • {{ formatDate(log.occurred_at) }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
          <v-card-text v-else class="text-center py-8">
            <v-icon size="48" color="grey-lighten-2">mdi-history</v-icon>
            <p class="text-body-2 text-grey mt-2">No activity recorded</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { formatDate } from '~/utils/rosterFormatters'
import type { EmployeeSafetyLog } from '~/composables/useEmployeeSafetyLogs'
import type { SafetyLogType } from '~/types/safety-log.types'

const props = defineProps<{
  employee: any
  notes: any[]
  auditLogs: any[]
  isAdmin: boolean
}>()

const emit = defineEmits<{
  'open-note-dialog': []
}>()

// ── Safety & Compliance Logs ─────────────────────────
const employeeId = computed(() => props.employee?.id)
const {
  logs: safetyLogs,
  loading: safetyLogsLoading,
  fetchLogs: fetchSafetyLogs,
  getLogTypeDisplay,
  getRoleLabel,
} = useEmployeeSafetyLogs(employeeId)

const safetyLogFilter = ref<SafetyLogType | null>(null)

/** Unique log type categories present in this employee's logs */
const safetyLogCategories = computed<SafetyLogType[]>(() => {
  const types = new Set<SafetyLogType>()
  for (const log of safetyLogs.value) types.add(log.log_type)
  return Array.from(types)
})

/** Count per log type for filter chips */
const safetyLogCounts = computed<Record<string, number>>(() => {
  const counts: Record<string, number> = {}
  for (const log of safetyLogs.value) {
    counts[log.log_type] = (counts[log.log_type] || 0) + 1
  }
  return counts
})

/** Filtered safety logs based on selected category */
const filteredSafetyLogs = computed<EmployeeSafetyLog[]>(() => {
  if (!safetyLogFilter.value) return safetyLogs.value
  return safetyLogs.value.filter(l => l.log_type === safetyLogFilter.value)
})

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    draft: 'grey',
    submitted: 'blue',
    reviewed: 'success',
    flagged: 'error',
  }
  return map[status] || 'grey'
}

function formatLocation(loc: string): string {
  const map: Record<string, string> = {
    venice: 'Venice',
    sherman_oaks: 'Sherman Oaks',
    van_nuys: 'Van Nuys',
  }
  return map[loc] || loc
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '…'
}

// Load safety logs on mount
onMounted(() => {
  if (employeeId.value) fetchSafetyLogs()
})

// ── Activity Log helpers ─────────────────────────────
function getActionIcon(action: string): string {
  const icons: Record<string, string> = {
    'created': 'mdi-plus-circle', 'updated': 'mdi-pencil', 'deleted': 'mdi-delete',
    'INSERT': 'mdi-plus-circle', 'UPDATE': 'mdi-pencil', 'DELETE': 'mdi-delete',
    'note_added': 'mdi-note-plus', 'document_uploaded': 'mdi-file-upload',
    'asset_assigned': 'mdi-package-variant-plus', 'asset_returned': 'mdi-package-variant-closed'
  }
  return icons[action] || 'mdi-information'
}

function getActionColor(action: string): string {
  const colors: Record<string, string> = {
    'created': 'success', 'updated': 'info', 'deleted': 'error',
    'INSERT': 'success', 'UPDATE': 'info', 'DELETE': 'error',
    'note_added': 'primary', 'document_uploaded': 'teal',
    'asset_assigned': 'warning', 'asset_returned': 'success'
  }
  return colors[action] || 'grey'
}
</script>
