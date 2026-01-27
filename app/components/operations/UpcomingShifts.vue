<template>
  <v-card rounded="lg" elevation="2" class="upcoming-shifts-card">
    <v-card-title class="d-flex align-center ga-2 flex-wrap">
      <v-icon color="primary">mdi-calendar-clock</v-icon>
      <span>Upcoming Shifts</span>
      <v-spacer />
      <v-chip v-if="shifts.length > 0" size="small" color="primary" variant="tonal">
        {{ shifts.length }} shift{{ shifts.length !== 1 ? 's' : '' }}
      </v-chip>
    </v-card-title>
    
    <v-divider />

    <v-card-text v-if="loading" class="text-center py-6">
      <v-progress-circular indeterminate color="primary" />
    </v-card-text>

    <!-- Mobile-Optimized Shift Cards -->
    <div v-else-if="shifts.length > 0" class="shifts-container pa-3">
      <div
        v-for="shift in shifts"
        :key="shift.id"
        class="shift-card-mobile"
        :class="{ 'shift-today': isToday(shift.start_at), 'shift-tomorrow': isTomorrow(shift.start_at) }"
      >
        <!-- Date Badge -->
        <div class="date-column">
          <div class="date-badge-mobile" :class="{ 'is-today': isToday(shift.start_at) }">
            <span class="day-name">{{ formatDayName(shift.start_at) }}</span>
            <span class="day-number">{{ formatDayNumber(shift.start_at) }}</span>
            <span class="month-name">{{ formatMonthName(shift.start_at) }}</span>
          </div>
        </div>

        <!-- Shift Details -->
        <div class="shift-content">
          <div class="time-row">
            <v-icon size="16" color="primary" class="mr-1">mdi-clock-outline</v-icon>
            <span class="time-text font-weight-bold">{{ formatTimeRange(shift.start_at, shift.end_at) }}</span>
            <v-chip 
              v-if="isToday(shift.start_at)" 
              size="x-small" 
              color="success" 
              class="ml-2"
            >
              Today
            </v-chip>
            <v-chip 
              v-else-if="isTomorrow(shift.start_at)" 
              size="x-small" 
              color="info" 
              class="ml-2"
            >
              Tomorrow
            </v-chip>
          </div>
          
          <div class="location-row">
            <v-icon size="14" color="grey" class="mr-1">mdi-map-marker</v-icon>
            <span class="text-grey-darken-1">{{ shift.location?.name || 'No location' }}</span>
          </div>
          
          <div v-if="shift.role_required" class="role-row">
            <v-icon size="14" color="grey" class="mr-1">mdi-badge-account</v-icon>
            <span class="text-grey-darken-1">{{ shift.role_required }}</span>
          </div>
          
          <!-- Shift Duration -->
          <div class="duration-row">
            <v-icon size="14" color="grey" class="mr-1">mdi-timer-outline</v-icon>
            <span class="text-grey-darken-1">{{ getShiftDuration(shift.start_at, shift.end_at) }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="shift-actions">
          <v-menu location="bottom end">
            <template #activator="{ props }">
              <v-btn 
                icon="mdi-dots-vertical" 
                variant="text" 
                size="small" 
                v-bind="props"
                class="action-btn"
              />
            </template>
            <v-list density="compact" class="py-0">
              <v-list-item
                prepend-icon="mdi-swap-horizontal"
                title="Request Swap"
                @click="$emit('requestSwap', shift)"
              />
              <v-list-item
                prepend-icon="mdi-calendar-remove"
                title="Request Drop"
                @click="$emit('requestDrop', shift)"
              />
              <v-list-item
                prepend-icon="mdi-calendar-export"
                title="Add to Calendar"
                @click="addToCalendar(shift)"
              />
            </v-list>
          </v-menu>
        </div>
      </div>
    </div>

    <v-card-text v-else class="text-center py-8">
      <v-icon size="64" color="grey-lighten-1">mdi-calendar-check</v-icon>
      <p class="text-h6 text-grey mt-3">No upcoming shifts</p>
      <p class="text-body-2 text-grey-lighten-1">You're all caught up!</p>
    </v-card-text>
    
    <!-- Week Summary -->
    <v-divider v-if="shifts.length > 0" />
    <v-card-text v-if="shifts.length > 0" class="py-2 px-4 bg-grey-lighten-5">
      <div class="d-flex justify-space-between align-center text-caption">
        <span class="text-grey-darken-1">
          <v-icon size="14" class="mr-1">mdi-clock-outline</v-icon>
          {{ totalHours.toFixed(1) }} hours scheduled
        </span>
        <span class="text-grey-darken-1">
          Next 2 weeks
        </span>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useOperationsStore, type Shift } from '~/stores/operations'
import { useUserStore } from '~/stores/user'

// Emits
defineEmits<{
  requestSwap: [shift: Shift]
  requestDrop: [shift: Shift]
}>()

// Stores
const opsStore = useOperationsStore()
const userStore = useUserStore()

// Computed
const loading = computed(() => opsStore.isLoading)

const shifts = computed(() => {
  const employeeId = userStore.currentEmployee?.id
  if (!employeeId) return []
  return opsStore.myUpcomingShifts(employeeId)
})

const totalHours = computed(() => {
  return shifts.value.reduce((total, shift) => {
    const start = new Date(shift.start_at).getTime()
    const end = new Date(shift.end_at).getTime()
    return total + (end - start) / (1000 * 60 * 60)
  }, 0)
})

// Methods
function formatDayName(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' })
}

function formatDayNumber(dateStr: string): string {
  return new Date(dateStr).getDate().toString()
}

function formatMonthName(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short' })
}

function formatTimeRange(start: string, end: string): string {
  const startTime = new Date(start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const endTime = new Date(end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return `${startTime} - ${endTime}`
}

function getShiftDuration(start: string, end: string): string {
  const hours = (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60)
  return `${hours.toFixed(1)} hours`
}

function isToday(dateStr: string): boolean {
  const date = new Date(dateStr)
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

function isTomorrow(dateStr: string): boolean {
  const date = new Date(dateStr)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return date.toDateString() === tomorrow.toDateString()
}

function addToCalendar(shift: Shift) {
  // Create an iCal event link
  const start = new Date(shift.start_at).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const end = new Date(shift.end_at).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const title = encodeURIComponent(`Work Shift${shift.location?.name ? ` - ${shift.location.name}` : ''}`)
  const location = encodeURIComponent(shift.location?.name || '')
  
  // Use Google Calendar URL for broad compatibility
  const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&location=${location}`
  window.open(calUrl, '_blank')
}

// Lifecycle
onMounted(async () => {
  const now = new Date()
  const weekLater = new Date()
  weekLater.setDate(weekLater.getDate() + 14) // Look 2 weeks ahead
  
  await opsStore.fetchShifts(now.toISOString(), weekLater.toISOString())
})
</script>

<style scoped>
.upcoming-shifts-card {
  overflow: hidden;
}

.shifts-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 500px;
  overflow-y: auto;
}

.shift-card-mobile {
  display: flex;
  align-items: stretch;
  background: #fafafa;
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid transparent;
}

.shift-card-mobile:hover {
  background: #f5f5f5;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.shift-card-mobile.shift-today {
  border-color: rgb(var(--v-theme-success));
  background: linear-gradient(90deg, rgba(var(--v-theme-success), 0.05) 0%, transparent 100%);
}

.shift-card-mobile.shift-tomorrow {
  border-color: rgb(var(--v-theme-info));
  background: linear-gradient(90deg, rgba(var(--v-theme-info), 0.05) 0%, transparent 100%);
}

.date-column {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
}

.date-badge-mobile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-primary), 0.1);
  border-radius: 12px;
  padding: 10px 14px;
  min-width: 60px;
  text-align: center;
}

.date-badge-mobile.is-today {
  background: rgb(var(--v-theme-success));
}

.date-badge-mobile.is-today .day-name,
.date-badge-mobile.is-today .day-number,
.date-badge-mobile.is-today .month-name {
  color: white;
}

.date-badge-mobile .day-name {
  font-size: 10px;
  text-transform: uppercase;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
  letter-spacing: 0.5px;
}

.date-badge-mobile .day-number {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.1;
  color: rgb(var(--v-theme-on-surface));
}

.date-badge-mobile .month-name {
  font-size: 10px;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.shift-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 12px 8px;
  gap: 4px;
  min-width: 0; /* Allow text truncation */
}

.time-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.time-text {
  font-size: 15px;
  white-space: nowrap;
}

.location-row,
.role-row,
.duration-row {
  display: flex;
  align-items: center;
  font-size: 13px;
}

.location-row span,
.role-row span,
.duration-row span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shift-actions {
  display: flex;
  align-items: center;
  padding: 8px;
}

.action-btn {
  opacity: 0.6;
}

.action-btn:hover {
  opacity: 1;
}

/* Mobile touch-friendly adjustments */
@media (max-width: 599px) {
  .shift-card-mobile {
    padding: 4px;
  }
  
  .date-badge-mobile {
    min-width: 52px;
    padding: 8px 10px;
  }
  
  .date-badge-mobile .day-number {
    font-size: 18px;
  }
  
  .shift-content {
    padding: 8px 4px;
  }
  
  .time-text {
    font-size: 14px;
  }
  
  .action-btn {
    opacity: 1;
  }
  
  /* Make tap targets larger on mobile */
  .shift-actions {
    padding: 12px;
  }
}

/* Scrollbar styling */
.shifts-container::-webkit-scrollbar {
  width: 4px;
}

.shifts-container::-webkit-scrollbar-track {
  background: transparent;
}

.shifts-container::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.2);
  border-radius: 4px;
}
</style>
