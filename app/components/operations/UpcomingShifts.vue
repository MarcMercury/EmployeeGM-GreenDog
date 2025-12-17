<template>
  <v-card rounded="lg" elevation="2">
    <v-card-title class="d-flex align-center ga-2">
      <v-icon color="primary">mdi-calendar-clock</v-icon>
      Upcoming Shifts
    </v-card-title>
    
    <v-divider />

    <v-card-text v-if="loading" class="text-center py-6">
      <v-progress-circular indeterminate color="primary" />
    </v-card-text>

    <v-list v-else-if="shifts.length > 0" lines="two">
      <v-list-item
        v-for="shift in shifts"
        :key="shift.id"
        class="shift-item"
      >
        <template #prepend>
          <div class="date-badge mr-3">
            <span class="day-name text-caption">{{ formatDayName(shift.start_at) }}</span>
            <span class="day-number">{{ formatDayNumber(shift.start_at) }}</span>
          </div>
        </template>

        <v-list-item-title class="font-weight-medium">
          {{ formatTimeRange(shift.start_at, shift.end_at) }}
        </v-list-item-title>
        
        <v-list-item-subtitle>
          <v-icon size="12" class="mr-1">mdi-map-marker</v-icon>
          {{ shift.location?.name || 'No location' }}
        </v-list-item-subtitle>

        <template #append>
          <v-menu>
            <template #activator="{ props }">
              <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="props" />
            </template>
            <v-list density="compact">
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
            </v-list>
          </v-menu>
        </template>
      </v-list-item>
    </v-list>

    <v-card-text v-else class="text-center py-6">
      <v-icon size="48" color="grey-lighten-1">mdi-calendar-check</v-icon>
      <p class="text-body-2 text-grey mt-2">No upcoming shifts scheduled</p>
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

// Methods
function formatDayName(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' })
}

function formatDayNumber(dateStr: string): string {
  return new Date(dateStr).getDate().toString()
}

function formatTimeRange(start: string, end: string): string {
  const startTime = new Date(start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const endTime = new Date(end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return `${startTime} - ${endTime}`
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
.shift-item {
  padding: 12px 16px;
}

.date-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(var(--v-theme-primary), 0.1);
  border-radius: 8px;
  padding: 8px 12px;
  min-width: 48px;
}

.date-badge .day-name {
  color: rgb(var(--v-theme-primary));
  text-transform: uppercase;
  font-weight: 500;
}

.date-badge .day-number {
  font-size: 1.25rem;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}
</style>
