<template>
  <v-card rounded="lg" elevation="2">
    <v-card-title class="d-flex align-center justify-space-between flex-wrap ga-2">
      <div class="d-flex align-center ga-2">
        <v-icon color="primary">mdi-clipboard-check-outline</v-icon>
        Time Sheet Approval
      </div>
      
      <div class="d-flex align-center ga-2">
        <!-- Date Range Filter -->
        <v-text-field
          v-model="startDate"
          type="date"
          label="From"
          density="compact"
          hide-details
          style="max-width: 150px"
        />
        <v-text-field
          v-model="endDate"
          type="date"
          label="To"
          density="compact"
          hide-details
          style="max-width: 150px"
        />
        <v-btn icon="mdi-refresh" variant="text" @click="loadEntries" />
      </div>
    </v-card-title>
    
    <v-divider />

    <!-- Filters & Stats -->
    <v-card-text class="pb-0">
      <v-row>
        <v-col cols="12" sm="4">
          <v-card variant="tonal" color="warning" rounded="lg">
            <v-card-text class="text-center">
              <div class="text-h4 font-weight-bold">{{ pendingCount }}</div>
              <div class="text-caption">Pending Approval</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="4">
          <v-card variant="tonal" color="error" rounded="lg">
            <v-card-text class="text-center">
              <div class="text-h4 font-weight-bold">{{ overtimeCount }}</div>
              <div class="text-caption">Overtime Flagged</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="4">
          <v-card variant="tonal" color="info" rounded="lg">
            <v-card-text class="text-center">
              <div class="text-h4 font-weight-bold">{{ missingPunchCount }}</div>
              <div class="text-caption">Missing Punches</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Filter Chips -->
      <div class="d-flex ga-2 mt-4 flex-wrap">
        <v-chip
          :color="filter === 'all' ? 'primary' : 'default'"
          :variant="filter === 'all' ? 'flat' : 'outlined'"
          @click="filter = 'all'"
        >
          All
        </v-chip>
        <v-chip
          :color="filter === 'pending' ? 'warning' : 'default'"
          :variant="filter === 'pending' ? 'flat' : 'outlined'"
          @click="filter = 'pending'"
        >
          <v-icon start size="14">mdi-clock</v-icon>
          Pending
        </v-chip>
        <v-chip
          :color="filter === 'overtime' ? 'error' : 'default'"
          :variant="filter === 'overtime' ? 'flat' : 'outlined'"
          @click="filter = 'overtime'"
        >
          <v-icon start size="14">mdi-alert</v-icon>
          Overtime
        </v-chip>
        <v-chip
          :color="filter === 'missing' ? 'info' : 'default'"
          :variant="filter === 'missing' ? 'flat' : 'outlined'"
          @click="filter = 'missing'"
        >
          <v-icon start size="14">mdi-help-circle</v-icon>
          Missing Punch
        </v-chip>
      </div>
    </v-card-text>

    <v-divider class="mt-4" />

    <!-- Data Table -->
    <v-data-table
      :headers="headers"
      :items="filteredEntries"
      :loading="loading"
      class="elevation-0"
      item-value="id"
      hover
    >
      <!-- Employee Column -->
      <template #item.employee="{ item }">
        <div class="d-flex align-center ga-2 py-2">
          <v-avatar size="32">
            <v-img v-if="item.employee?.profile?.avatar_url" :src="item.employee.profile.avatar_url" />
            <span v-else class="text-caption">
              {{ getInitials(item.employee?.profile) }}
            </span>
          </v-avatar>
          <div>
            <div class="font-weight-medium">
              {{ getEmployeeName(item.employee?.profile) }}
            </div>
          </div>
        </div>
      </template>

      <!-- Date Column -->
      <template #item.date="{ item }">
        {{ formatDate(item.clock_in_at) }}
      </template>

      <!-- Scheduled Hours Column -->
      <template #item.scheduled="{ item }">
        <span v-if="item.shift">
          {{ formatScheduledHours(item.shift) }}
        </span>
        <span v-else class="text-grey">—</span>
      </template>

      <!-- Actual Hours Column -->
      <template #item.actual="{ item }">
        <div class="d-flex align-center ga-1">
          <span :class="getActualClass(item)">
            {{ formatActualHours(item) }}
          </span>
          <v-icon
            v-if="isOvertime(item)"
            size="14"
            color="error"
            title="Overtime"
          >
            mdi-arrow-up-bold
          </v-icon>
        </div>
      </template>

      <!-- Clock In/Out Column -->
      <template #item.punches="{ item }">
        <div class="text-caption">
          <span class="text-success">{{ formatTime(item.clock_in_at) }}</span>
          <span class="mx-1">→</span>
          <span :class="item.clock_out_at ? 'text-error' : 'text-warning'">
            {{ item.clock_out_at ? formatTime(item.clock_out_at) : 'Missing' }}
          </span>
        </div>
      </template>

      <!-- Flags Column -->
      <template #item.flags="{ item }">
        <div class="d-flex ga-1">
          <v-tooltip v-if="isOvertime(item)" text="Overtime Risk" location="top">
            <template #activator="{ props }">
              <v-icon v-bind="props" size="18" color="error">mdi-alert-circle</v-icon>
            </template>
          </v-tooltip>
          <v-tooltip v-if="!item.clock_out_at" text="Missing Clock Out" location="top">
            <template #activator="{ props }">
              <v-icon v-bind="props" size="18" color="warning">mdi-clock-alert</v-icon>
            </template>
          </v-tooltip>
          <v-tooltip v-if="item.correction_reason" text="Has Correction" location="top">
            <template #activator="{ props }">
              <v-icon v-bind="props" size="18" color="info">mdi-pencil-circle</v-icon>
            </template>
          </v-tooltip>
        </div>
      </template>

      <!-- Status Column -->
      <template #item.status="{ item }">
        <v-chip
          :color="item.is_approved ? 'success' : 'warning'"
          size="small"
          variant="tonal"
        >
          {{ item.is_approved ? 'Approved' : 'Pending' }}
        </v-chip>
      </template>

      <!-- Actions Column -->
      <template #item.actions="{ item }">
        <div class="d-flex ga-1">
          <!-- Feedback dropdown on approve -->
          <v-menu v-if="!item.is_approved" location="bottom end">
            <template #activator="{ props }">
              <v-btn
                color="success"
                size="small"
                variant="tonal"
                v-bind="props"
                :loading="approvingId === item.id"
              >
                Approve
                <v-icon end size="14">mdi-menu-down</v-icon>
              </v-btn>
            </template>
            <v-list density="compact">
              <v-list-item @click="approveEntry(item.id)">
                <template #prepend>
                  <v-icon size="18">mdi-check</v-icon>
                </template>
                <v-list-item-title>Approve Only</v-list-item-title>
              </v-list-item>
              <v-divider />
              <v-list-item @click="approveWithFeedback(item, 'kudos')">
                <template #prepend>
                  <v-icon size="18" color="success">mdi-thumb-up</v-icon>
                </template>
                <v-list-item-title>
                  <span class="text-success">Approve + Kudos</span>
                </v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                  +10 XP for great work
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item @click="approveWithFeedback(item, 'incident')">
                <template #prepend>
                  <v-icon size="18" color="warning">mdi-flag</v-icon>
                </template>
                <v-list-item-title>
                  <span class="text-warning">Approve + Flag Incident</span>
                </v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                  Log for review cycle
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-menu>
          
          <!-- Already approved - show feedback badge if exists -->
          <v-chip v-else-if="item.feedback_type" :color="item.feedback_type === 'kudos' ? 'success' : 'warning'" size="small" variant="tonal">
            <v-icon start size="14">{{ item.feedback_type === 'kudos' ? 'mdi-thumb-up' : 'mdi-flag' }}</v-icon>
            {{ item.feedback_type === 'kudos' ? 'Kudos' : 'Flagged' }}
          </v-chip>
          <v-chip v-else color="success" size="small" variant="tonal">
            <v-icon start size="14">mdi-check</v-icon>
            Approved
          </v-chip>
          
          <v-btn
            icon="mdi-pencil"
            size="x-small"
            variant="text"
            @click="openEditDialog(item)"
          />
        </div>
      </template>

      <!-- No Data -->
      <template #no-data>
        <div class="text-center py-8">
          <v-icon size="48" color="grey-lighten-1">mdi-clipboard-text-off</v-icon>
          <p class="text-body-2 text-grey mt-2">No time entries found</p>
        </div>
      </template>
    </v-data-table>

    <!-- Bulk Actions -->
    <v-card-actions v-if="pendingCount > 0" class="pa-4">
      <v-btn
        color="success"
        prepend-icon="mdi-check-all"
        @click="approveAll"
        :loading="bulkApproving"
      >
        Approve All Pending ({{ pendingCount }})
      </v-btn>
    </v-card-actions>

    <!-- Edit Dialog -->
    <v-dialog v-model="editDialog" max-width="500">
      <v-card v-if="editingEntry">
        <v-card-title>Edit Time Entry</v-card-title>
        <v-card-text>
          <v-form ref="editFormRef">
            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="editForm.clock_in_at"
                  label="Clock In"
                  type="datetime-local"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="editForm.clock_out_at"
                  label="Clock Out"
                  type="datetime-local"
                />
              </v-col>
            </v-row>
            
            <v-textarea
              v-model="editForm.correction_reason"
              label="Correction Reason"
              placeholder="Explain the correction..."
              rows="2"
              class="mt-2"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="editDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveEdit" :loading="isSaving">
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOperationsStore, type TimeEntry, type Shift } from '~/stores/operations'
import { useIntegrationsStore } from '~/stores/integrations'
import { useUserStore } from '~/stores/user'

// Stores
const opsStore = useOperationsStore()
const integrationsStore = useIntegrationsStore()
const userStore = useUserStore()

// State
const filter = ref<'all' | 'pending' | 'overtime' | 'missing'>('all')
const startDate = ref('')
const endDate = ref('')
const approvingId = ref<string | null>(null)
const bulkApproving = ref(false)
const editDialog = ref(false)
const editingEntry = ref<TimeEntry | null>(null)
const isSaving = ref(false)
const editFormRef = ref()

const editForm = ref({
  clock_in_at: '',
  clock_out_at: '',
  correction_reason: ''
})

const headers = [
  { title: 'Employee', key: 'employee', sortable: true, value: (item: any) => item.employee?.profile?.last_name || item.employee?.profile?.first_name || '' },
  { title: 'Date', key: 'date', sortable: true, value: (item: any) => item.clock_in_at || '' },
  { title: 'Scheduled', key: 'scheduled', sortable: false },
  { title: 'Actual', key: 'actual', sortable: true },
  { title: 'Punches', key: 'punches', sortable: false },
  { title: 'Flags', key: 'flags', sortable: false },
  { title: 'Status', key: 'status', sortable: true, value: (item: any) => item.is_approved ? 'approved' : 'pending' },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' }
]

// Computed
const loading = computed(() => opsStore.isLoading)
const entries = computed(() => opsStore.timeEntries)

const filteredEntries = computed(() => {
  let result = entries.value

  switch (filter.value) {
    case 'pending':
      result = result.filter(e => !e.is_approved)
      break
    case 'overtime':
      result = result.filter(e => isOvertime(e))
      break
    case 'missing':
      result = result.filter(e => !e.clock_out_at)
      break
  }

  return result
})

const pendingCount = computed(() => entries.value.filter(e => !e.is_approved).length)
const overtimeCount = computed(() => entries.value.filter(e => isOvertime(e)).length)
const missingPunchCount = computed(() => entries.value.filter(e => !e.clock_out_at).length)

// Methods
function getInitials(profile: { first_name?: string | null; last_name?: string | null } | undefined): string {
  if (!profile) return '?'
  return `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase()
}

function getEmployeeName(profile: { first_name?: string | null; last_name?: string | null } | undefined): string {
  if (!profile) return 'Unknown'
  return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown'
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric' 
  })
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatScheduledHours(shift: Shift): string {
  const start = new Date(shift.start_at)
  const end = new Date(shift.end_at)
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
  return `${hours.toFixed(1)}h`
}

function formatActualHours(entry: TimeEntry): string {
  if (entry.total_hours) {
    return `${entry.total_hours.toFixed(1)}h`
  }
  if (entry.clock_in_at && entry.clock_out_at) {
    const hours = (new Date(entry.clock_out_at).getTime() - new Date(entry.clock_in_at).getTime()) / (1000 * 60 * 60)
    return `${hours.toFixed(1)}h`
  }
  return '—'
}

function isOvertime(entry: TimeEntry): boolean {
  if (!entry.shift || !entry.total_hours) return false
  const scheduled = (new Date(entry.shift.end_at).getTime() - new Date(entry.shift.start_at).getTime()) / (1000 * 60 * 60)
  return entry.total_hours > scheduled + 0.25 // 15 min grace
}

function getActualClass(entry: TimeEntry): string {
  if (isOvertime(entry)) return 'text-error font-weight-bold'
  return ''
}

async function approveEntry(entryId: string) {
  const approverId = userStore.currentEmployee?.id
  if (!approverId) return

  approvingId.value = entryId
  try {
    await opsStore.approveTimeEntry(entryId, approverId)
  } catch (err) {
    console.error('Failed to approve:', err)
  } finally {
    approvingId.value = null
  }
}

async function approveAll() {
  const approverId = userStore.currentEmployee?.id
  if (!approverId) return

  const pendingIds = entries.value.filter(e => !e.is_approved).map(e => e.id)
  
  bulkApproving.value = true
  try {
    for (const id of pendingIds) {
      await opsStore.approveTimeEntry(id, approverId)
    }
  } catch (err) {
    console.error('Failed to bulk approve:', err)
  } finally {
    bulkApproving.value = false
  }
}

async function approveWithFeedback(entry: TimeEntry, feedbackType: 'kudos' | 'incident') {
  const approverId = userStore.currentEmployee?.id
  if (!approverId || !entry.employee_id) return

  approvingId.value = entry.id
  try {
    // 1. Approve the time entry
    await opsStore.approveTimeEntry(entry.id, approverId)
    
    // 2. Add shift feedback (kudos or incident)
    if (entry.shift_id) {
      await integrationsStore.addShiftFeedback(
        entry.shift_id,
        entry.employee_id,
        feedbackType
      )
    }
    
    // 3. Mark feedback type locally for UI display
    const entryInList = entries.value.find(e => e.id === entry.id)
    if (entryInList) {
      (entryInList as any).feedback_type = feedbackType
    }
  } catch (err) {
    console.error('Failed to approve with feedback:', err)
  } finally {
    approvingId.value = null
  }
}

function openEditDialog(entry: TimeEntry) {
  editingEntry.value = entry
  editForm.value = {
    clock_in_at: entry.clock_in_at ? formatDateTimeLocal(entry.clock_in_at) : '',
    clock_out_at: entry.clock_out_at ? formatDateTimeLocal(entry.clock_out_at) : '',
    correction_reason: entry.correction_reason || ''
  }
  editDialog.value = true
}

function formatDateTimeLocal(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toISOString().slice(0, 16)
}

async function saveEdit() {
  if (!editingEntry.value) return

  isSaving.value = true
  try {
    const supabase = useSupabaseClient()
    
    // Calculate new total hours
    let totalHours = null
    if (editForm.value.clock_in_at && editForm.value.clock_out_at) {
      const inTime = new Date(editForm.value.clock_in_at).getTime()
      const outTime = new Date(editForm.value.clock_out_at).getTime()
      totalHours = Math.round((outTime - inTime) / (1000 * 60 * 60) * 100) / 100
    }

    const { error } = await supabase
      .from('time_entries')
      .update({
        clock_in_at: editForm.value.clock_in_at ? new Date(editForm.value.clock_in_at).toISOString() : null,
        clock_out_at: editForm.value.clock_out_at ? new Date(editForm.value.clock_out_at).toISOString() : null,
        total_hours: totalHours,
        correction_reason: editForm.value.correction_reason || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingEntry.value.id)

    if (error) throw error

    // Refresh data
    await loadEntries()
    editDialog.value = false
  } catch (err) {
    console.error('Failed to save edit:', err)
  } finally {
    isSaving.value = false
  }
}

async function loadEntries() {
  await opsStore.fetchTimeEntries(startDate.value, endDate.value)
}

// Lifecycle
onMounted(() => {
  // Default to current week
  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  
  startDate.value = weekAgo.toISOString().split('T')[0]
  endDate.value = now.toISOString().split('T')[0]
  
  loadEntries()
})
</script>
