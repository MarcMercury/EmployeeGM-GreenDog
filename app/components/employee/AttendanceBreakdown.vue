<template>
  <div class="attendance-breakdown">
    <!-- Reliability Score Display -->
    <div class="text-center mb-4">
      <v-progress-circular
        :model-value="stats.reliabilityScore"
        :color="getReliabilityColor(stats.reliabilityScore)"
        :size="100"
        :width="10"
        class="mb-2"
      >
        <div>
          <span class="text-h4 font-weight-bold">{{ stats.reliabilityScore }}</span>
          <span class="text-body-2 text-grey">%</span>
        </div>
      </v-progress-circular>
      <div class="text-caption text-grey">
        Reliability Score (Last {{ lookbackDays }} days)
      </div>
    </div>

    <v-divider class="my-4" />

    <!-- Attendance Stats Grid -->
    <div class="stats-grid">
      <!-- On Time - NOT clickable -->
      <div class="stat-item stat-item--disabled">
        <div class="stat-icon bg-success-subtle">
          <v-icon color="success" size="20">mdi-check-circle</v-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value text-h6 font-weight-bold">{{ stats.present }}</div>
          <div class="stat-label text-caption text-grey">On Time</div>
        </div>
      </div>

      <!-- Late - Clickable -->
      <div 
        v-if="stats.late > 0"
        class="stat-item stat-item--clickable"
        @click="showDetails('late')"
      >
        <div class="stat-icon bg-warning-subtle">
          <v-icon color="warning" size="20">mdi-clock-alert</v-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value text-h6 font-weight-bold text-warning">{{ stats.late }}</div>
          <div class="stat-label text-caption text-grey">Late</div>
        </div>
        <v-icon size="16" color="grey-lighten-1" class="stat-arrow">mdi-chevron-right</v-icon>
      </div>

      <!-- Excused Late - Clickable -->
      <div 
        v-if="stats.excused_late > 0"
        class="stat-item stat-item--clickable"
        @click="showDetails('excused_late')"
      >
        <div class="stat-icon bg-info-subtle">
          <v-icon color="info" size="20">mdi-clock-check</v-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value text-h6 font-weight-bold text-info">{{ stats.excused_late }}</div>
          <div class="stat-label text-caption text-grey">Excused Late</div>
        </div>
        <v-icon size="16" color="grey-lighten-1" class="stat-arrow">mdi-chevron-right</v-icon>
      </div>

      <!-- Absent - Clickable -->
      <div 
        v-if="stats.absent > 0"
        class="stat-item stat-item--clickable"
        @click="showDetails('absent')"
      >
        <div class="stat-icon bg-error-subtle">
          <v-icon color="error" size="20">mdi-account-off</v-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value text-h6 font-weight-bold text-error">{{ stats.absent }}</div>
          <div class="stat-label text-caption text-grey">Absent</div>
        </div>
        <v-icon size="16" color="grey-lighten-1" class="stat-arrow">mdi-chevron-right</v-icon>
      </div>

      <!-- Excused Absent - Clickable -->
      <div 
        v-if="stats.excused_absent > 0"
        class="stat-item stat-item--clickable"
        @click="showDetails('excused_absent')"
      >
        <div class="stat-icon bg-grey-subtle">
          <v-icon color="grey" size="20">mdi-account-check</v-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value text-h6 font-weight-bold text-grey">{{ stats.excused_absent }}</div>
          <div class="stat-label text-caption text-grey">Excused Absent</div>
        </div>
        <v-icon size="16" color="grey-lighten-1" class="stat-arrow">mdi-chevron-right</v-icon>
      </div>

      <!-- No Show - Clickable -->
      <div 
        v-if="stats.no_show > 0"
        class="stat-item stat-item--clickable"
        @click="showDetails('no_show')"
      >
        <div class="stat-icon bg-error-subtle">
          <v-icon color="error" size="20">mdi-account-remove</v-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value text-h6 font-weight-bold text-error">{{ stats.no_show }}</div>
          <div class="stat-label text-caption text-grey">No Show</div>
        </div>
        <v-icon size="16" color="grey-lighten-1" class="stat-arrow">mdi-chevron-right</v-icon>
      </div>
    </div>

    <!-- Explanation text -->
    <div class="text-caption text-grey text-center mt-4">
      <v-icon size="14" class="mr-1">mdi-information-outline</v-icon>
      Excused events have 25% impact on reliability score
    </div>

    <!-- Details Dialog -->
    <v-dialog v-model="detailsDialog" max-width="600">
      <v-card rounded="xl">
        <v-card-title class="d-flex align-center pa-4">
          <v-icon 
            :color="detailsStatus ? getStatusInfo(detailsStatus).color : 'grey'" 
            class="mr-2"
          >
            {{ detailsStatus ? getStatusInfo(detailsStatus).icon : 'mdi-help' }}
          </v-icon>
          {{ detailsStatus ? getStatusInfo(detailsStatus).label : 'Details' }} Events
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="detailsDialog = false" />
        </v-card-title>
        
        <v-divider />
        
        <v-card-text v-if="loadingDetails" class="text-center py-8">
          <v-progress-circular indeterminate color="primary" />
        </v-card-text>
        
        <v-card-text v-else-if="detailRecords.length === 0" class="text-center py-8">
          <v-icon size="48" color="grey-lighten-2">mdi-calendar-blank</v-icon>
          <p class="text-body-2 text-grey mt-2">No records found</p>
        </v-card-text>
        
        <v-card-text v-else class="pa-0" style="max-height: 400px; overflow-y: auto;">
          <v-list density="compact">
            <v-list-item
              v-for="record in detailRecords"
              :key="record.id"
              class="border-b"
            >
              <template #prepend>
                <v-avatar size="36" :color="getStatusInfo(detailsStatus || '').color" variant="tonal">
                  <v-icon size="18">mdi-calendar</v-icon>
                </v-avatar>
              </template>
              
              <v-list-item-title class="font-weight-medium">
                {{ formatDate(record.shift_date) }}
              </v-list-item-title>
              
              <v-list-item-subtitle>
                <template v-if="record.minutes_late > 0">
                  <span class="text-warning">{{ record.minutes_late }} min late</span>
                  <span class="mx-1">•</span>
                </template>
                <template v-if="record.scheduled_start">
                  Scheduled: {{ formatTime(record.scheduled_start) }}
                </template>
                <template v-if="record.actual_start">
                  <span class="mx-1">→</span>
                  Arrived: {{ formatTime(record.actual_start) }}
                </template>
              </v-list-item-subtitle>
              
              <!-- Excuse info -->
              <template v-if="record.excuse_reason">
                <div class="mt-2 pa-2 bg-grey-lighten-4 rounded text-body-2">
                  <v-icon size="14" color="info" class="mr-1">mdi-check-decagram</v-icon>
                  <span class="font-weight-medium">Excused:</span> {{ record.excuse_reason }}
                  <div v-if="record.excused_by_name" class="text-caption text-grey mt-1">
                    By {{ record.excused_by_name }} on {{ formatDate(record.excused_at) }}
                  </div>
                </div>
              </template>
              
              <!-- Notes -->
              <template v-if="record.notes && !record.excuse_reason">
                <div class="mt-2 text-body-2 text-grey">
                  <v-icon size="14" class="mr-1">mdi-note-text</v-icon>
                  {{ record.notes }}
                </div>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
        
        <v-divider />
        
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="detailsDialog = false">Close</v-btn>
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
  (e: 'score-updated', score: number): void
}>()

const { 
  getAttendanceBreakdown, 
  getAttendanceByStatus, 
  getStatusInfo 
} = useAttendance()

// State
const stats = ref({
  present: 0,
  late: 0,
  excused_late: 0,
  absent: 0,
  excused_absent: 0,
  no_show: 0,
  total: 0,
  reliabilityScore: 100
})

const detailsDialog = ref(false)
const detailsStatus = ref<string | null>(null)
const detailRecords = ref<any[]>([])
const loadingDetails = ref(false)

// Lookback period
const lookbackDays = computed(() => props.lookbackDays || 90)

// Load data on mount
onMounted(async () => {
  await loadStats()
})

// Watch for employee changes
watch(() => props.employeeId, async () => {
  await loadStats()
})

async function loadStats() {
  if (!props.employeeId) return
  
  try {
    const breakdown = await getAttendanceBreakdown(props.employeeId, lookbackDays.value)
    stats.value = breakdown
    emit('score-updated', breakdown.reliabilityScore)
  } catch (err) {
    console.error('Error loading attendance stats:', err)
  }
}

async function showDetails(status: string) {
  detailsStatus.value = status
  detailsDialog.value = true
  loadingDetails.value = true
  
  try {
    detailRecords.value = await getAttendanceByStatus(
      props.employeeId, 
      status, 
      lookbackDays.value
    )
  } catch (err) {
    console.error('Error loading attendance details:', err)
    detailRecords.value = []
  } finally {
    loadingDetails.value = false
  }
}

function getReliabilityColor(score: number): string {
  if (score >= 90) return 'success'
  if (score >= 75) return 'warning'
  return 'error'
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

// Expose refresh function
defineExpose({
  refresh: loadStats
})
</script>

<style scoped>
.stats-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 12px;
  background: #f5f5f5;
  transition: all 0.2s ease;
}

.stat-item--clickable {
  cursor: pointer;
}

.stat-item--clickable:hover {
  background: #eeeeee;
  transform: translateX(4px);
}

.stat-item--disabled {
  opacity: 0.9;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.bg-success-subtle { background: rgba(76, 175, 80, 0.1); }
.bg-warning-subtle { background: rgba(255, 152, 0, 0.1); }
.bg-error-subtle { background: rgba(244, 67, 54, 0.1); }
.bg-info-subtle { background: rgba(33, 150, 243, 0.1); }
.bg-grey-subtle { background: rgba(158, 158, 158, 0.1); }

.stat-content {
  flex: 1;
}

.stat-arrow {
  margin-left: 8px;
}

.border-b {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.border-b:last-child {
  border-bottom: none;
}
</style>
