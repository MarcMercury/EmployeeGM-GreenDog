<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap ga-3">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Operations Center</h1>
        <p class="text-body-1 text-grey-darken-1">
          Manage schedules, time tracking, and team operations
        </p>
      </div>
      
      <v-btn-toggle v-model="activeTab" mandatory color="primary">
        <v-btn value="schedule" prepend-icon="mdi-calendar-month">Schedule</v-btn>
        <v-btn value="timesheet" prepend-icon="mdi-clipboard-clock">Time Sheets</v-btn>
        <v-btn value="requests" prepend-icon="mdi-file-document-check">Requests</v-btn>
      </v-btn-toggle>
    </div>

    <!-- Schedule Tab -->
    <div v-show="activeTab === 'schedule'">
      <OperationsMasterSchedule :editable="isAdmin" />
    </div>

    <!-- Time Sheets Tab -->
    <div v-show="activeTab === 'timesheet'">
      <OperationsTimeSheetApproval />
    </div>

    <!-- Requests Tab -->
    <div v-show="activeTab === 'requests'">
      <v-row>
        <!-- Time Off Requests -->
        <v-col cols="12" lg="6">
          <v-card rounded="lg" elevation="2">
            <v-card-title class="d-flex align-center ga-2">
              <v-icon color="primary">mdi-beach</v-icon>
              Time Off Requests
              <v-chip v-if="pendingTimeOff.length" color="warning" size="small" class="ml-2">
                {{ pendingTimeOff.length }} pending
              </v-chip>
            </v-card-title>
            
            <v-divider />

            <v-list v-if="pendingTimeOff.length > 0" lines="three">
              <v-list-item
                v-for="request in pendingTimeOff"
                :key="request.id"
              >
                <template #prepend>
                  <v-avatar size="40">
                    <span class="text-caption">
                      {{ getInitials(request.employee?.profile) }}
                    </span>
                  </v-avatar>
                </template>

                <v-list-item-title>
                  {{ getEmployeeName(request.employee?.profile) }}
                </v-list-item-title>
                
                <v-list-item-subtitle>
                  <strong>{{ request.time_off_type?.name || 'Time Off' }}</strong>
                  <br />
                  {{ formatDateRange(request.start_date, request.end_date) }}
                </v-list-item-subtitle>

                <template #append>
                  <div class="d-flex ga-1">
                    <v-btn
                      icon="mdi-check"
                      color="success"
                      size="small"
                      variant="tonal"
                      @click="reviewTimeOff(request.id, 'approved')"
                    />
                    <v-btn
                      icon="mdi-close"
                      color="error"
                      size="small"
                      variant="tonal"
                      @click="reviewTimeOff(request.id, 'denied')"
                    />
                  </div>
                </template>
              </v-list-item>
            </v-list>

            <v-card-text v-else class="text-center py-8">
              <v-icon size="48" color="grey-lighten-1">mdi-check-all</v-icon>
              <p class="text-body-2 text-grey mt-2">No pending time off requests</p>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Shift Change Requests -->
        <v-col cols="12" lg="6">
          <v-card rounded="lg" elevation="2">
            <v-card-title class="d-flex align-center ga-2">
              <v-icon color="primary">mdi-swap-horizontal</v-icon>
              Shift Change Requests
              <v-chip v-if="pendingShiftChanges.length" color="warning" size="small" class="ml-2">
                {{ pendingShiftChanges.length }} pending
              </v-chip>
            </v-card-title>
            
            <v-divider />

            <v-list v-if="pendingShiftChanges.length > 0" lines="three">
              <v-list-item
                v-for="change in pendingShiftChanges"
                :key="change.id"
              >
                <template #prepend>
                  <v-icon :color="change.type === 'swap' ? 'info' : 'warning'">
                    {{ change.type === 'swap' ? 'mdi-swap-horizontal' : 'mdi-calendar-remove' }}
                  </v-icon>
                </template>

                <v-list-item-title>
                  {{ getEmployeeName(change.from_employee?.profile) }}
                  <span class="text-grey">→</span>
                  {{ change.to_employee ? getEmployeeName(change.to_employee.profile) : 'Open' }}
                </v-list-item-title>
                
                <v-list-item-subtitle>
                  {{ change.type === 'swap' ? 'Swap Request' : 'Drop Request' }}
                  <br />
                  {{ change.shift ? formatShiftInfo(change.shift) : 'Shift details unavailable' }}
                </v-list-item-subtitle>

                <template #append>
                  <div class="d-flex ga-1">
                    <v-btn
                      icon="mdi-check"
                      color="success"
                      size="small"
                      variant="tonal"
                      @click="resolveShiftChange(change.id, true)"
                    />
                    <v-btn
                      icon="mdi-close"
                      color="error"
                      size="small"
                      variant="tonal"
                      @click="resolveShiftChange(change.id, false)"
                    />
                  </div>
                </template>
              </v-list-item>
            </v-list>

            <v-card-text v-else class="text-center py-8">
              <v-icon size="48" color="grey-lighten-1">mdi-check-all</v-icon>
              <p class="text-body-2 text-grey mt-2">No pending shift changes</p>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOperationsStore, type Shift } from '~/stores/operations'
import { useAuthStore } from '~/stores/auth'
import { useUserStore } from '~/stores/user'

// Middleware
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

// Stores
const opsStore = useOperationsStore()
const authStore = useAuthStore()
const userStore = useUserStore()

// State
const activeTab = ref<'schedule' | 'timesheet' | 'requests'>('schedule')

// Computed
const isAdmin = computed(() => authStore.isAdmin)
const pendingTimeOff = computed(() => opsStore.pendingTimeOffRequests)
const pendingShiftChanges = computed(() => opsStore.pendingShiftChanges)

// Methods
function getInitials(profile: { first_name?: string | null; last_name?: string | null } | undefined): string {
  if (!profile) return '?'
  return `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase()
}

function getEmployeeName(profile: { first_name?: string | null; last_name?: string | null } | undefined): string {
  if (!profile) return 'Unknown'
  return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown'
}

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start + 'T00:00:00')
  const endDate = new Date(end + 'T00:00:00')
  
  if (start === end) {
    return startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  
  const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${startStr} - ${endStr}`
}

function formatShiftInfo(shift: Shift): string {
  const date = new Date(shift.start_at).toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  })
  const startTime = new Date(shift.start_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const endTime = new Date(shift.end_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return `${date}, ${startTime} - ${endTime}`
}

async function reviewTimeOff(requestId: string, status: 'approved' | 'denied') {
  const approverId = userStore.currentEmployee?.id
  if (!approverId) return
  
  try {
    await opsStore.reviewTimeOffRequest(requestId, status, approverId)
  } catch (err) {
    console.error('Failed to review time off:', err)
  }
}

async function resolveShiftChange(changeId: string, approved: boolean) {
  const managerId = userStore.currentEmployee?.id
  if (!managerId) return
  
  try {
    await opsStore.resolveShiftChange(changeId, approved, managerId)
  } catch (err) {
    console.error('Failed to resolve shift change:', err)
  }
}

// Lifecycle
onMounted(async () => {
  await Promise.all([
    opsStore.fetchTimeOffRequests(undefined, 'pending'),
    opsStore.fetchShiftChanges()
  ])
})
</script>
