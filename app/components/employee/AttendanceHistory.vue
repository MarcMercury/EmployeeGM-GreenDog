<template>
  <div class="attendance-history">
    <!-- Header -->
    <div class="d-flex align-center mb-4">
      <div>
        <h3 class="text-subtitle-1 font-weight-bold">Attendance History</h3>
        <p class="text-caption text-grey mb-0">Last {{ lookbackDays }} days</p>
      </div>
      <v-spacer />
      <v-btn
        v-if="canManageAttendance"
        variant="tonal"
        size="small"
        color="primary"
        prepend-icon="mdi-sync"
        :loading="syncing"
        @click="syncFromShifts"
      >
        Sync from Shifts
      </v-btn>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <!-- Empty State -->
    <div v-else-if="records.length === 0" class="text-center py-8">
      <v-icon size="64" color="grey-lighten-2">mdi-calendar-blank-outline</v-icon>
      <p class="text-body-1 text-grey mt-4">No attendance records found</p>
      <p class="text-caption text-grey">Records are created when shifts are completed</p>
    </div>

    <!-- Records Table -->
    <v-data-table
      v-else
      :headers="tableHeaders"
      :items="records"
      :items-per-page="10"
      class="elevation-0 rounded-lg"
      density="comfortable"
    >
      <!-- Date Column -->
      <template #item.shift_date="{ item }">
        <div class="font-weight-medium">
          {{ formatDate(item.shift_date) }}
        </div>
        <div v-if="item.shift?.location?.name" class="text-caption text-grey">
          {{ item.shift.location.name }}
        </div>
      </template>

      <!-- Status Column -->
      <template #item.status="{ item }">
        <v-chip
          :color="getStatusInfo(item.status).color"
          size="small"
          variant="flat"
        >
          <v-icon start size="14">{{ getStatusInfo(item.status).icon }}</v-icon>
          {{ getStatusInfo(item.status).label }}
        </v-chip>
      </template>

      <!-- Time Details Column -->
      <template #item.time_details="{ item }">
        <div v-if="item.scheduled_start" class="text-body-2">
          <span class="text-grey">Scheduled:</span> {{ formatTime(item.scheduled_start) }}
        </div>
        <div v-if="item.actual_start" class="text-body-2">
          <span class="text-grey">Arrived:</span> 
          <span :class="item.minutes_late > 0 ? 'text-warning' : 'text-success'">
            {{ formatTime(item.actual_start) }}
          </span>
          <span v-if="item.minutes_late > 0" class="text-warning text-caption ml-1">
            (+{{ item.minutes_late }} min)
          </span>
        </div>
        <div v-else-if="item.status !== 'present'" class="text-caption text-grey">
          No clock-in recorded
        </div>
      </template>

      <!-- Notes/Excuse Column -->
      <template #item.notes="{ item }">
        <div v-if="item.excuse_reason" class="d-flex align-center">
          <v-icon size="16" color="info" class="mr-1">mdi-check-decagram</v-icon>
          <span class="text-body-2">{{ truncateText(item.excuse_reason, 40) }}</span>
        </div>
        <div v-else-if="item.notes" class="text-body-2 text-grey">
          {{ truncateText(item.notes, 40) }}
        </div>
        <div v-else class="text-caption text-grey">—</div>
      </template>

      <!-- Actions Column -->
      <template #item.actions="{ item }">
        <v-btn
          v-if="canManageAttendance && canBeExcused(item.status)"
          variant="text"
          size="small"
          color="primary"
          @click="openExcuseDialog(item)"
        >
          <v-icon start size="16">mdi-check-decagram</v-icon>
          Excuse
        </v-btn>
        <v-chip
          v-else-if="item.excused_at"
          size="x-small"
          variant="tonal"
          color="info"
        >
          Excused
        </v-chip>
      </template>
    </v-data-table>

    <!-- Excuse Dialog -->
    <v-dialog v-model="excuseDialog" max-width="500" persistent>
      <v-card rounded="xl">
        <v-card-title class="pa-4">
          <v-icon color="info" class="mr-2">mdi-check-decagram</v-icon>
          Convert to Excused
        </v-card-title>
        
        <v-divider />
        
        <v-card-text class="pa-4">
          <v-alert type="info" variant="tonal" class="mb-4" density="compact">
            <template #text>
              Converting this record to "Excused" will reduce its impact on the 
              reliability score from 100% to 25%.
            </template>
          </v-alert>

          <!-- Record Info -->
          <div v-if="selectedRecord" class="bg-grey-lighten-4 rounded-lg pa-3 mb-4">
            <div class="d-flex align-center mb-2">
              <v-chip
                :color="getStatusInfo(selectedRecord.status).color"
                size="small"
                variant="flat"
              >
                {{ getStatusInfo(selectedRecord.status).label }}
              </v-chip>
              <v-icon class="mx-2">mdi-arrow-right</v-icon>
              <v-chip
                :color="getStatusInfo(getExcusedStatus(selectedRecord.status)).color"
                size="small"
                variant="flat"
              >
                {{ getStatusInfo(getExcusedStatus(selectedRecord.status)).label }}
              </v-chip>
            </div>
            <div class="text-body-2">
              <strong>Date:</strong> {{ formatDate(selectedRecord.shift_date) }}
            </div>
            <div v-if="selectedRecord.minutes_late > 0" class="text-body-2">
              <strong>Minutes Late:</strong> {{ selectedRecord.minutes_late }}
            </div>
          </div>

          <!-- Reason Field -->
          <v-textarea
            v-model="excuseReason"
            label="Reason for Excuse *"
            placeholder="e.g., Doctor's appointment, family emergency, pre-approved leave..."
            variant="outlined"
            rows="3"
            :rules="[v => !!v?.trim() || 'Reason is required']"
            :error-messages="excuseError"
            counter
            maxlength="500"
          />
        </v-card-text>
        
        <v-divider />
        
        <v-card-actions class="pa-4">
          <v-btn variant="text" @click="closeExcuseDialog">Cancel</v-btn>
          <v-spacer />
          <v-btn
            color="primary"
            variant="elevated"
            :loading="saving"
            :disabled="!excuseReason?.trim()"
            @click="submitExcuse"
          >
            <v-icon start>mdi-check</v-icon>
            Confirm Excuse
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { format } from 'date-fns'

const props = defineProps<{
  employeeId: string
  lookbackDays?: number
}>()

const emit = defineEmits<{
  (e: 'attendance-updated'): void
}>()

const {
  getAttendanceHistory,
  convertToExcused,
  syncAttendanceFromShift,
  getStatusInfo,
  canBeExcused
} = useAttendance()

const userStore = useUserStore()
const authStore = useAuthStore()
const supabase = useSupabaseClient()
const toast = useToast()

// State
const loading = ref(true)
const records = ref<any[]>([])
const syncing = ref(false)

// Excuse dialog state
const excuseDialog = ref(false)
const selectedRecord = ref<any>(null)
const excuseReason = ref('')
const excuseError = ref('')
const saving = ref(false)

// Computed
const lookbackDays = computed(() => props.lookbackDays || 90)

const canManageAttendance = computed(() => {
  // Check if user has super_admin, admin, manager, or hr_admin role
  const profile = authStore.profile
  if (!profile) return false
  
  if (['super_admin', 'admin'].includes(profile.role)) return true
  
  // Check for additional roles
  const userRoles = userStore.roles || []
  return userRoles.some((r: any) => 
    ['super_admin', 'admin', 'manager', 'hr_admin'].includes(r.key || r.name)
  )
})

const currentEmployeeId = computed(() => userStore.employee?.id)

// Table headers
const tableHeaders = computed(() => {
  const headers = [
    { title: 'Date', key: 'shift_date', width: '150px' },
    { title: 'Status', key: 'status', width: '150px' },
    { title: 'Time Details', key: 'time_details', width: '200px' },
    { title: 'Notes', key: 'notes' }
  ]
  
  if (canManageAttendance.value) {
    headers.push({ title: 'Actions', key: 'actions', width: '120px', sortable: false } as any)
  }
  
  return headers
})

// Load data
onMounted(async () => {
  await loadRecords()
})

watch(() => props.employeeId, async () => {
  await loadRecords()
})

async function loadRecords() {
  if (!props.employeeId) return
  
  loading.value = true
  try {
    records.value = await getAttendanceHistory(props.employeeId, lookbackDays.value)
  } catch (err) {
    console.error('Error loading attendance history:', err)
    records.value = []
  } finally {
    loading.value = false
  }
}

async function syncFromShifts() {
  syncing.value = true
  try {
    // Get completed shifts that don't have attendance records
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - lookbackDays.value)
    
    const { data: shifts } = await supabase
      .from('shifts')
      .select('id')
      .eq('employee_id', props.employeeId)
      .eq('status', 'completed')
      .gte('start_at', cutoffDate.toISOString())
    
    if (shifts && shifts.length > 0) {
      for (const shift of shifts) {
        try {
          await syncAttendanceFromShift(shift.id)
        } catch (err) {
          console.warn('Failed to sync shift:', shift.id, err)
        }
      }
      
      toast.success(`Synced attendance for ${shifts.length} shifts`)
      await loadRecords()
      emit('attendance-updated')
    } else {
      toast.info('No completed shifts to sync')
    }
  } catch (err) {
    console.error('Error syncing from shifts:', err)
    toast.error('Failed to sync attendance')
  } finally {
    syncing.value = false
  }
}

function openExcuseDialog(record: any) {
  selectedRecord.value = record
  excuseReason.value = ''
  excuseError.value = ''
  excuseDialog.value = true
}

function closeExcuseDialog() {
  excuseDialog.value = false
  selectedRecord.value = null
  excuseReason.value = ''
  excuseError.value = ''
}

async function submitExcuse() {
  if (!selectedRecord.value || !excuseReason.value?.trim()) {
    excuseError.value = 'Reason is required'
    return
  }
  
  if (!currentEmployeeId.value) {
    excuseError.value = 'Unable to identify current user'
    return
  }
  
  saving.value = true
  excuseError.value = ''
  
  try {
    const result = await convertToExcused(
      selectedRecord.value.id,
      currentEmployeeId.value,
      excuseReason.value.trim()
    )
    
    if (result.success) {
      toast.success('Attendance record updated to excused')
      closeExcuseDialog()
      await loadRecords()
      emit('attendance-updated')
    } else {
      excuseError.value = result.error || 'Failed to update record'
    }
  } catch (err: any) {
    console.error('Error excusing attendance:', err)
    excuseError.value = err.message || 'Failed to update record'
  } finally {
    saving.value = false
  }
}

function getExcusedStatus(status: string): string {
  if (status === 'late') return 'excused_late'
  if (status === 'absent' || status === 'no_show') return 'excused_absent'
  return status
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A'
  try {
    return format(new Date(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return 'N/A'
  try {
    return format(new Date(dateStr), 'h:mm a')
  } catch {
    return dateStr
  }
}

function truncateText(text: string, maxLength: number): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// Expose refresh function
defineExpose({
  refresh: loadRecords
})
</script>

<style scoped>
.attendance-history {
  position: relative;
}

:deep(.v-data-table) {
  background: transparent !important;
}

:deep(.v-data-table-header) {
  background: #f5f5f5;
}
</style>
