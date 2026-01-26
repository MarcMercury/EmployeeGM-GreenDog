<template>
  <div class="my-schedule-page">
    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">My Schedule & Time Off</h1>
        <p class="text-body-1 text-grey-darken-1">
          {{ todayFormatted }} • {{ currentGreeting }}
        </p>
      </div>
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        @click="requestDialog = true"
        class="d-none d-sm-flex"
      >
        Request Time Off
      </v-btn>
      <v-btn
        color="primary"
        icon="mdi-plus"
        @click="requestDialog = true"
        class="d-flex d-sm-none"
        size="small"
      />
    </div>

    <!-- Quick Stats Row - Mobile Friendly -->
    <div class="stats-scroll mb-4">
      <div class="stats-row">
        <v-card variant="tonal" color="primary" rounded="lg" class="stat-card">
          <v-card-text class="text-center pa-3">
            <v-icon size="20" class="mb-1">mdi-clock-check-outline</v-icon>
            <div class="text-h6 font-weight-bold">{{ weeklyHours.toFixed(1) }}h</div>
            <div class="text-caption">This Week</div>
          </v-card-text>
        </v-card>
        <v-card variant="tonal" color="success" rounded="lg" class="stat-card">
          <v-card-text class="text-center pa-3">
            <v-icon size="20" class="mb-1">mdi-calendar-check</v-icon>
            <div class="text-h6 font-weight-bold">{{ upcomingShiftCount }}</div>
            <div class="text-caption">Upcoming</div>
          </v-card-text>
        </v-card>
        <v-card variant="tonal" color="warning" rounded="lg" class="stat-card">
          <v-card-text class="text-center pa-3">
            <v-icon size="20" class="mb-1">mdi-clock-alert-outline</v-icon>
            <div class="text-h6 font-weight-bold">{{ pendingRequests.length }}</div>
            <div class="text-caption">Pending</div>
          </v-card-text>
        </v-card>
        <v-card variant="tonal" color="info" rounded="lg" class="stat-card">
          <v-card-text class="text-center pa-3">
            <v-icon size="20" class="mb-1">mdi-beach</v-icon>
            <div class="text-h6 font-weight-bold">{{ ptoBalance.available }}</div>
            <div class="text-caption">PTO Left</div>
          </v-card-text>
        </v-card>
      </div>
    </div>

    <!-- Main Content Tabs -->
    <v-tabs v-model="activeTab" color="primary" class="mb-4">
      <v-tab value="schedule">
        <v-icon start>mdi-calendar</v-icon>
        <span class="d-none d-sm-inline">Schedule</span>
      </v-tab>
      <v-tab value="timeoff">
        <v-icon start>mdi-beach</v-icon>
        <span class="d-none d-sm-inline">Time Off</span>
      </v-tab>
      <v-tab value="reliability">
        <v-icon start>mdi-chart-arc</v-icon>
        <span class="d-none d-sm-inline">Reliability</span>
      </v-tab>
    </v-tabs>

    <v-window v-model="activeTab">
      <!-- SCHEDULE TAB -->
      <v-window-item value="schedule">
        <v-row>
          <!-- Time Clock -->
          <v-col cols="12" md="4">
            <OperationsTimeClock />
          </v-col>

          <!-- Upcoming Shifts -->
          <v-col cols="12" md="8">
            <OperationsUpcomingShifts 
              @request-swap="openSwapDialog"
              @request-drop="openDropDialog"
            />
          </v-col>
        </v-row>
      </v-window-item>

      <!-- TIME OFF TAB -->
      <v-window-item value="timeoff">
        <v-row>
          <!-- PTO Summary Cards -->
          <v-col cols="12" sm="6" md="4">
            <v-card rounded="lg" class="h-100">
              <v-card-text class="text-center">
                <v-progress-circular
                  :model-value="ptoUsedPercentage"
                  :size="100"
                  :width="10"
                  color="primary"
                  class="mb-3"
                >
                  <div>
                    <div class="text-h5 font-weight-bold">{{ ptoBalance.available }}</div>
                    <div class="text-caption">Days Left</div>
                  </div>
                </v-progress-circular>
                <div class="text-subtitle-1 font-weight-medium">PTO Balance</div>
                <div class="text-body-2 text-grey">
                  {{ ptoBalance.used }} used of {{ ptoBalance.total }} days
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          
          <v-col cols="12" sm="6" md="4">
            <v-card rounded="lg" class="h-100">
              <v-card-text>
                <div class="d-flex align-center mb-4">
                  <v-icon color="warning" size="32" class="mr-3">mdi-clock-outline</v-icon>
                  <div>
                    <div class="text-h5 font-weight-bold">{{ pendingRequests.length }}</div>
                    <div class="text-body-2 text-grey">Pending Requests</div>
                  </div>
                </div>
                <v-divider class="mb-3" />
                <div class="text-caption text-grey mb-2">Awaiting Approval</div>
                <template v-if="pendingRequests.length > 0">
                  <div v-for="req in pendingRequests.slice(0, 2)" :key="req.id" class="text-body-2 mb-1">
                    {{ formatDateRange(req.start_date, req.end_date) }}
                  </div>
                </template>
                <div v-else class="text-body-2 text-grey-lighten-1">No pending requests</div>
              </v-card-text>
            </v-card>
          </v-col>
          
          <v-col cols="12" sm="12" md="4">
            <v-card rounded="lg" class="h-100">
              <v-card-text>
                <div class="d-flex align-center mb-4">
                  <v-icon color="success" size="32" class="mr-3">mdi-calendar-check</v-icon>
                  <div>
                    <div class="text-h5 font-weight-bold">{{ approvedRequests.length }}</div>
                    <div class="text-body-2 text-grey">Approved This Year</div>
                  </div>
                </div>
                <v-divider class="mb-3" />
                <div class="text-caption text-grey mb-2">Next Time Off</div>
                <template v-if="nextTimeOff">
                  <div class="text-body-2 font-weight-medium">
                    {{ formatDateRange(nextTimeOff.start_date, nextTimeOff.end_date) }}
                  </div>
                  <div class="text-caption text-grey">
                    {{ getDaysUntil(nextTimeOff.start_date) }} days away
                  </div>
                </template>
                <div v-else class="text-body-2 text-grey-lighten-1">No upcoming time off</div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- PTO Breakdown -->
          <v-col cols="12">
            <v-card rounded="lg">
              <v-card-title class="text-subtitle-1">PTO Breakdown by Type</v-card-title>
              <v-card-text>
                <div class="pto-types-grid">
                  <div 
                    v-for="type in ptoTypes" 
                    :key="type.name" 
                    class="pto-type-item"
                    :style="{ backgroundColor: `${type.color}20` }"
                  >
                    <v-icon :color="type.color" size="20" class="mb-1">{{ type.icon }}</v-icon>
                    <div class="text-body-1 font-weight-bold">{{ type.available }}</div>
                    <div class="text-caption">{{ type.name }}</div>
                    <div class="text-caption text-grey">of {{ type.total }}</div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Request History -->
          <v-col cols="12">
            <v-card rounded="lg">
              <v-card-title class="d-flex flex-wrap align-center justify-space-between gap-2">
                <span class="text-subtitle-1">Request History</span>
                <v-chip-group v-model="statusFilter" mandatory selected-class="text-primary">
                  <v-chip value="all" size="small" variant="outlined">All</v-chip>
                  <v-chip value="pending" size="small" variant="outlined">Pending</v-chip>
                  <v-chip value="approved" size="small" variant="outlined">Approved</v-chip>
                </v-chip-group>
              </v-card-title>
              
              <v-card-text v-if="loadingRequests" class="text-center py-8">
                <v-progress-circular indeterminate color="primary" />
              </v-card-text>
              
              <v-card-text v-else-if="filteredRequests.length === 0" class="text-center py-8">
                <v-icon size="48" color="grey-lighten-1">mdi-calendar-blank</v-icon>
                <p class="text-body-2 text-grey mt-2">No requests found</p>
              </v-card-text>

              <v-list v-else lines="two" class="py-0">
                <v-list-item
                  v-for="request in filteredRequests"
                  :key="request.id"
                  class="py-3"
                >
                  <template #prepend>
                    <v-avatar :color="getStatusColor(request.status)" size="40">
                      <v-icon color="white" size="20">{{ getStatusIcon(request.status) }}</v-icon>
                    </v-avatar>
                  </template>

                  <v-list-item-title class="font-weight-medium">
                    {{ formatDateRange(request.start_date, request.end_date) }}
                  </v-list-item-title>
                  
                  <v-list-item-subtitle>
                    {{ getDaysCount(request) }} day{{ getDaysCount(request) !== 1 ? 's' : '' }}
                    • {{ request.time_off_type?.name || 'PTO' }}
                  </v-list-item-subtitle>

                  <template #append>
                    <div class="d-flex align-center gap-2">
                      <v-chip :color="getStatusColor(request.status)" size="small" variant="flat">
                        {{ request.status }}
                      </v-chip>
                      <v-btn
                        v-if="request.status === 'pending'"
                        icon="mdi-close"
                        size="x-small"
                        color="error"
                        variant="text"
                        @click="cancelRequest(request.id)"
                        title="Cancel"
                      />
                    </div>
                  </template>
                </v-list-item>
              </v-list>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- RELIABILITY TAB -->
      <v-window-item value="reliability">
        <v-row>
          <!-- Reliability Score -->
          <v-col cols="12" md="6">
            <v-card rounded="lg">
              <v-card-title class="d-flex align-center">
                <v-icon color="primary" class="mr-2">mdi-chart-arc</v-icon>
                Reliability Score
              </v-card-title>
              <v-card-text class="text-center">
                <v-progress-circular
                  :model-value="reliabilityScore"
                  :size="140"
                  :width="14"
                  :color="getReliabilityColor(reliabilityScore)"
                >
                  <div class="text-center">
                    <div class="text-h3 font-weight-bold">{{ reliabilityScore }}%</div>
                    <div class="text-caption text-grey">Score</div>
                  </div>
                </v-progress-circular>
                
                <div class="mt-4">
                  <v-chip 
                    :color="getReliabilityColor(reliabilityScore)" 
                    variant="tonal"
                    size="large"
                  >
                    {{ getReliabilityLabel(reliabilityScore) }}
                  </v-chip>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Reliability Stats -->
          <v-col cols="12" md="6">
            <v-card rounded="lg" class="h-100">
              <v-card-title>Attendance Breakdown</v-card-title>
              <v-card-text>
                <v-list density="comfortable" class="bg-transparent">
                  <v-list-item>
                    <template #prepend>
                      <v-avatar color="success" size="40">
                        <v-icon color="white">mdi-check-circle</v-icon>
                      </v-avatar>
                    </template>
                    <v-list-item-title class="font-weight-medium">On-time Arrivals</v-list-item-title>
                    <v-list-item-subtitle>Arrived on time or early</v-list-item-subtitle>
                    <template #append>
                      <span class="text-h6 font-weight-bold text-success">{{ reliabilityStats.onTime }}</span>
                    </template>
                  </v-list-item>
                  <v-list-item>
                    <template #prepend>
                      <v-avatar color="warning" size="40">
                        <v-icon color="white">mdi-clock-alert</v-icon>
                      </v-avatar>
                    </template>
                    <v-list-item-title class="font-weight-medium">Late Arrivals</v-list-item-title>
                    <v-list-item-subtitle>Arrived after scheduled time</v-list-item-subtitle>
                    <template #append>
                      <span class="text-h6 font-weight-bold text-warning">{{ reliabilityStats.late }}</span>
                    </template>
                  </v-list-item>
                  <v-list-item>
                    <template #prepend>
                      <v-avatar color="error" size="40">
                        <v-icon color="white">mdi-close-circle</v-icon>
                      </v-avatar>
                    </template>
                    <v-list-item-title class="font-weight-medium">Absences</v-list-item-title>
                    <v-list-item-subtitle>Missed scheduled shifts</v-list-item-subtitle>
                    <template #append>
                      <span class="text-h6 font-weight-bold text-error">{{ reliabilityStats.absences }}</span>
                    </template>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- PTO Balance Card -->
          <v-col cols="12">
            <v-card rounded="lg">
              <v-card-title class="d-flex align-center">
                <v-icon color="info" class="mr-2">mdi-beach</v-icon>
                PTO Balance Overview
              </v-card-title>
              <v-card-text>
                <v-row dense>
                  <v-col cols="6" sm="3">
                    <div class="text-center pa-4 bg-blue-lighten-5 rounded-lg">
                      <div class="text-h4 font-weight-bold text-primary">{{ ptoBalance.available }}</div>
                      <div class="text-caption">Days Available</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="3">
                    <div class="text-center pa-4 bg-green-lighten-5 rounded-lg">
                      <div class="text-h4 font-weight-bold text-success">{{ ptoBalance.used }}</div>
                      <div class="text-caption">Days Used</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="3">
                    <div class="text-center pa-4 bg-amber-lighten-5 rounded-lg">
                      <div class="text-h4 font-weight-bold text-amber-darken-2">{{ ptoBalance.total }}</div>
                      <div class="text-caption">Total Annual</div>
                    </div>
                  </v-col>
                  <v-col cols="6" sm="3">
                    <div class="text-center pa-4 bg-purple-lighten-5 rounded-lg">
                      <div class="text-h4 font-weight-bold text-purple">{{ Math.round((ptoBalance.used / ptoBalance.total) * 100) }}%</div>
                      <div class="text-caption">Used</div>
                    </div>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>
    </v-window>

    <!-- Swap Shift Dialog -->
    <v-dialog v-model="swapDialog" max-width="500">
      <v-card>
        <v-card-title>Request Shift Swap</v-card-title>
        <v-card-text>
          <v-alert type="info" variant="tonal" class="mb-4">
            <strong>Shift:</strong> {{ swapShift ? formatShiftInfo(swapShift) : '' }}
          </v-alert>
          
          <v-select
            v-model="swapTargetEmployee"
            :items="availableEmployees"
            item-title="name"
            item-value="id"
            label="Swap With"
            hint="Select a coworker to swap shifts with"
            persistent-hint
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="swapDialog = false">Cancel</v-btn>
          <v-btn 
            color="primary" 
            @click="submitSwapRequest"
            :loading="isSubmittingChange"
            :disabled="!swapTargetEmployee"
          >
            Request Swap
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Drop Shift Dialog -->
    <v-dialog v-model="dropDialog" max-width="500">
      <v-card>
        <v-card-title>Request to Drop Shift</v-card-title>
        <v-card-text>
          <v-alert type="warning" variant="tonal" class="mb-4">
            <strong>Shift:</strong> {{ dropShift ? formatShiftInfo(dropShift) : '' }}
          </v-alert>
          
          <p class="text-body-2 mb-4">
            You are requesting to drop this shift. It will be marked as open
            and available for other team members to pick up.
          </p>

          <v-textarea
            v-model="dropReason"
            label="Reason (optional)"
            placeholder="Why do you need to drop this shift?"
            rows="2"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dropDialog = false">Cancel</v-btn>
          <v-btn 
            color="warning" 
            @click="submitDropRequest"
            :loading="isSubmittingChange"
          >
            Request Drop
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Request Time Off Dialog -->
    <v-dialog v-model="requestDialog" max-width="500">
      <v-card>
        <v-card-title>Request Time Off</v-card-title>
        <v-card-text>
          <v-form ref="formRef">
            <v-select
              v-model="form.type_id"
              :items="ptoTypeOptions"
              item-title="title"
              item-value="value"
              label="Type"
              variant="outlined"
              class="mb-3"
              :loading="loadingTypes"
              :rules="[v => !!v || 'Please select a type']"
            />
            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="form.start_date"
                  label="Start Date"
                  type="date"
                  variant="outlined"
                  :rules="[v => !!v || 'Required']"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="form.end_date"
                  label="End Date"
                  type="date"
                  variant="outlined"
                  :rules="[v => !!v || 'Required']"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="form.reason"
                  label="Reason (optional)"
                  variant="outlined"
                  rows="3"
                  hint="Briefly describe the reason for your time off request"
                />
              </v-col>
            </v-row>
            
            <!-- Shift Conflict Warning -->
            <v-alert 
              v-if="conflictingShifts.length > 0" 
              type="warning" 
              variant="tonal" 
              class="mt-3"
              icon="mdi-alert"
            >
              <strong>⚠️ Schedule Conflict:</strong> You have 
              <strong>{{ conflictingShifts.length }} scheduled shift{{ conflictingShifts.length !== 1 ? 's' : '' }}</strong>
              during this time. Your manager will need to find coverage if this request is approved.
              <div v-if="conflictingShifts.length <= 3" class="text-caption mt-2">
                <div v-for="shift in conflictingShifts" :key="shift.id" class="d-flex align-center gap-1">
                  <v-icon size="12">mdi-clock</v-icon>
                  {{ new Date(shift.start_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) }}
                  {{ new Date(shift.start_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) }} -
                  {{ new Date(shift.end_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) }}
                </div>
              </div>
            </v-alert>
            
            <!-- Checking for conflicts indicator -->
            <div v-if="checkingConflicts" class="text-caption text-grey mt-2 d-flex align-center gap-2">
              <v-progress-circular indeterminate size="12" width="2" />
              Checking for schedule conflicts...
            </div>
            
            <v-alert v-if="form.start_date && form.end_date && !checkingConflicts" type="info" variant="tonal" class="mt-3">
              This request is for <strong>{{ calculateDays }} day{{ calculateDays !== 1 ? 's' : '' }}</strong>.
              You'll have <strong>{{ ptoBalance.available - calculateDays }}</strong> days remaining.
            </v-alert>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="requestDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="submitTimeOffRequest" :loading="submittingRequest">Submit Request</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Success Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" location="top" :timeout="3000">
      <v-icon class="mr-2">{{ snackbar.color === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle' }}</v-icon>
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import type { Shift } from '~/stores/operations'

definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

useHead({
  title: 'My Schedule & Time Off'
})

// Stores
const opsStore = useOperationsStore()
const userStore = useUserStore()
const employeeStore = useEmployeeStore()
const authStore = useAuthStore()
const supabase = useSupabaseClient()
const route = useRoute()

// Tabs - check for query param
const activeTab = ref('schedule')

// Initialize data and tab from query param
onMounted(async () => {
  if (route.query.tab === 'timeoff') {
    activeTab.value = 'timeoff'
  } else if (route.query.tab === 'reliability') {
    activeTab.value = 'reliability'
  }
  
  // Fetch time off data
  await Promise.all([
    fetchTimeOffTypes(),
    fetchRequests(),
    fetchTimeOffBalances()
  ])
})

// Schedule State
const myShifts = ref<Shift[]>([])
const swapDialog = ref(false)
const dropDialog = ref(false)
const swapShift = ref<Shift | null>(null)
const dropShift = ref<Shift | null>(null)
const swapTargetEmployee = ref<string | null>(null)
const dropReason = ref('')
const isSubmittingChange = ref(false)

// Time Off State
const requestDialog = ref(false)
const loadingRequests = ref(true)
const submittingRequest = ref(false)
const statusFilter = ref('all')
const allRequests = ref<any[]>([])
const formRef = ref()

// Time Off Types from database
const timeOffTypes = ref<any[]>([])
const loadingTypes = ref(true)

// Shift conflict detection
const conflictingShifts = ref<Shift[]>([])
const checkingConflicts = ref(false)

const form = reactive({
  type_id: '',  // UUID of time_off_type
  start_date: '',
  end_date: '',
  reason: ''
})

// Snackbar
const snackbar = reactive({
  show: false,
  message: '',
  color: 'success'
})

// Reliability stats
const reliabilityStats = ref({
  onTime: 45,
  late: 3,
  absences: 1
})

const reliabilityScore = computed(() => {
  const total = reliabilityStats.value.onTime + reliabilityStats.value.late + reliabilityStats.value.absences
  if (total === 0) return 100
  return Math.round((reliabilityStats.value.onTime / total) * 100)
})

// PTO Balance
const ptoBalance = ref({
  available: 0,
  used: 0,
  total: 0
})

// PTO Types from employee_time_off_balances
const ptoTypes = ref<any[]>([])
const loadingBalances = ref(true)

// Type icons and colors mapping
const typeStyles: Record<string, { icon: string; color: string }> = {
  'PTO': { icon: 'mdi-beach', color: '#2196F3' },
  'Paid Time Off': { icon: 'mdi-beach', color: '#2196F3' },
  'Sick Leave': { icon: 'mdi-hospital', color: '#F44336' },
  'SICK': { icon: 'mdi-hospital', color: '#F44336' },
  'Personal Day': { icon: 'mdi-account', color: '#9C27B0' },
  'PERS': { icon: 'mdi-account', color: '#9C27B0' },
  'Vacation': { icon: 'mdi-palm-tree', color: '#4CAF50' },
  'VAC': { icon: 'mdi-palm-tree', color: '#4CAF50' },
  'Bereavement': { icon: 'mdi-heart', color: '#607D8B' },
  'BRV': { icon: 'mdi-heart', color: '#607D8B' },
  'Jury Duty': { icon: 'mdi-gavel', color: '#795548' },
  'JURY': { icon: 'mdi-gavel', color: '#795548' },
  'Holiday': { icon: 'mdi-calendar-star', color: '#FF9800' },
  'HOL': { icon: 'mdi-calendar-star', color: '#FF9800' },
  'Unpaid Leave': { icon: 'mdi-currency-usd-off', color: '#9E9E9E' },
  'UNPAID': { icon: 'mdi-currency-usd-off', color: '#9E9E9E' },
  'FMLA': { icon: 'mdi-file-document', color: '#3F51B5' },
  'Maternity/Paternity': { icon: 'mdi-baby-carriage', color: '#E91E63' },
  'PARENTAL': { icon: 'mdi-baby-carriage', color: '#E91E63' }
}

const ptoTypeOptions = computed(() => timeOffTypes.value.map(t => ({ 
  title: t.name, 
  value: t.id 
})))

// Computed
const todayFormatted = computed(() => {
  return new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  })
})

const currentGreeting = computed(() => {
  const hour = new Date().getHours()
  const name = userStore.profile?.first_name || 'there'
  if (hour < 12) return `Good morning, ${name}`
  if (hour < 17) return `Good afternoon, ${name}`
  return `Good evening, ${name}`
})

const weeklyHours = computed(() => {
  const now = new Date()
  const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)
  
  return myShifts.value.filter(s => {
    const shiftDate = new Date(s.start_at)
    return shiftDate >= weekStart && shiftDate < weekEnd
  }).reduce((total, shift) => {
    const start = new Date(shift.start_at)
    const end = new Date(shift.end_at)
    return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60)
  }, 0)
})

const upcomingShiftCount = computed(() => myShifts.value.filter(s => new Date(s.start_at) > new Date()).length)

const ptoUsedPercentage = computed(() => (ptoBalance.value.used / ptoBalance.value.total) * 100)

const pendingRequests = computed(() => allRequests.value.filter(r => r.status === 'pending'))
const approvedRequests = computed(() => allRequests.value.filter(r => r.status === 'approved'))

const nextTimeOff = computed(() => {
  const future = approvedRequests.value
    .filter(r => new Date(r.start_date) > new Date())
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
  return future[0] || null
})

const filteredRequests = computed(() => {
  if (statusFilter.value === 'all') return allRequests.value
  return allRequests.value.filter(r => r.status === statusFilter.value)
})

const calculateDays = computed(() => {
  if (!form.start_date || !form.end_date) return 0
  const start = new Date(form.start_date)
  const end = new Date(form.end_date)
  const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  return Math.max(1, diff)
})

// Watch for date changes to check shift conflicts
watch([() => form.start_date, () => form.end_date], async ([startDate, endDate]) => {
  if (!startDate || !endDate) {
    conflictingShifts.value = []
    return
  }
  
  const employeeId = userStore.employee?.id
  if (!employeeId) return
  
  checkingConflicts.value = true
  try {
    // Find published/scheduled shifts in the date range
    const { data } = await supabase
      .from('shifts')
      .select('id, start_at, end_at, status')
      .eq('employee_id', employeeId)
      .in('status', ['published', 'scheduled'])
      .gte('start_at', `${startDate}T00:00:00`)
      .lte('start_at', `${endDate}T23:59:59`)
    
    conflictingShifts.value = (data as Shift[]) || []
  } catch (err) {
    console.error('Error checking shift conflicts:', err)
    conflictingShifts.value = []
  } finally {
    checkingConflicts.value = false
  }
})

const availableEmployees = computed(() => {
  return employeeStore.employees?.map((e: any) => ({
    id: e.id,
    name: e.profile?.first_name && e.profile?.last_name 
      ? `${e.profile.first_name} ${e.profile.last_name}`
      : e.id
  })) || []
})

// Methods
function getReliabilityColor(score: number) {
  if (score >= 90) return 'success'
  if (score >= 75) return 'primary'
  if (score >= 60) return 'warning'
  return 'error'
}

function getReliabilityLabel(score: number) {
  if (score >= 95) return 'Excellent'
  if (score >= 85) return 'Very Good'
  if (score >= 75) return 'Good'
  if (score >= 60) return 'Needs Improvement'
  return 'At Risk'
}

function getStatusColor(status: string) {
  switch (status) {
    case 'approved': return 'success'
    case 'pending': return 'warning'
    case 'denied': return 'error'
    default: return 'grey'
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'approved': return 'mdi-check-circle'
    case 'pending': return 'mdi-clock'
    case 'denied': return 'mdi-close-circle'
    default: return 'mdi-help-circle'
  }
}

function formatDateRange(start: string, end: string) {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  
  if (startDate.getTime() === endDate.getTime()) {
    return startDate.toLocaleDateString('en-US', { ...options, year: 'numeric' })
  }
  return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', { ...options, year: 'numeric' })}`
}

function getDaysCount(request: any) {
  const start = new Date(request.start_date)
  const end = new Date(request.end_date)
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

function getDaysUntil(dateStr: string) {
  const date = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatShiftInfo(shift: Shift) {
  if (!shift) return ''
  const startDate = new Date(shift.start_at)
  const endDate = new Date(shift.end_at)
  const date = startDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
  const startTime = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const endTime = endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${date} • ${startTime} - ${endTime}`
}

function openSwapDialog(shift: Shift) {
  swapShift.value = shift
  swapTargetEmployee.value = null
  swapDialog.value = true
}

function openDropDialog(shift: Shift) {
  dropShift.value = shift
  dropReason.value = ''
  dropDialog.value = true
}

async function submitSwapRequest() {
  if (!swapShift.value || !swapTargetEmployee.value) return
  isSubmittingChange.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 500))
    snackbar.message = 'Swap request submitted successfully!'
    snackbar.color = 'success'
    snackbar.show = true
    swapDialog.value = false
  } catch (err) {
    console.error('Swap request failed:', err)
    snackbar.message = 'Failed to submit swap request'
    snackbar.color = 'error'
    snackbar.show = true
  } finally {
    isSubmittingChange.value = false
  }
}

async function submitDropRequest() {
  if (!dropShift.value) return
  isSubmittingChange.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 500))
    snackbar.message = 'Drop request submitted successfully!'
    snackbar.color = 'success'
    snackbar.show = true
    dropDialog.value = false
  } catch (err) {
    console.error('Drop request failed:', err)
    snackbar.message = 'Failed to submit drop request'
    snackbar.color = 'error'
    snackbar.show = true
  } finally {
    isSubmittingChange.value = false
  }
}

async function fetchRequests() {
  loadingRequests.value = true
  try {
    const profileId = authStore.profile?.id
    if (!profileId) {
      allRequests.value = []
      return
    }
    
    const { data, error } = await supabase
      .from('time_off_requests')
      .select(`
        *,
        time_off_type:time_off_types(id, name, code)
      `)
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })

    if (error) throw error
    allRequests.value = data || []
  } catch (err) {
    console.error('Error fetching requests:', err)
  } finally {
    loadingRequests.value = false
  }
}

async function fetchTimeOffTypes() {
  loadingTypes.value = true
  try {
    const { data, error } = await supabase
      .from('time_off_types')
      .select('*')
      .order('name')

    if (error) throw error
    timeOffTypes.value = data || []
    
    // Set default type if available
    if (timeOffTypes.value.length > 0 && !form.type_id) {
      const ptoType = timeOffTypes.value.find(t => t.code === 'PTO' || t.name === 'Paid Time Off')
      form.type_id = ptoType?.id || timeOffTypes.value[0].id
    }
  } catch (err) {
    console.error('Error fetching time off types:', err)
  } finally {
    loadingTypes.value = false
  }
}

async function fetchTimeOffBalances() {
  loadingBalances.value = true
  try {
    const employeeId = userStore.employee?.id
    if (!employeeId) {
      ptoTypes.value = []
      return
    }
    
    const currentYear = new Date().getFullYear()
    
    const { data, error } = await supabase
      .from('employee_time_off_balances')
      .select(`
        *,
        time_off_type:time_off_types(id, name, code)
      `)
      .eq('employee_id', employeeId)
      .eq('period_year', currentYear)

    if (error) throw error
    
    if (data && data.length > 0) {
      // Calculate totals
      let totalUsed = 0
      let totalAvailable = 0
      
      ptoTypes.value = data.map((b: any) => {
        const typeName = b.time_off_type?.name || 'Unknown'
        const typeCode = b.time_off_type?.code || typeName
        const style = typeStyles[typeName] || typeStyles[typeCode] || { icon: 'mdi-calendar', color: '#9E9E9E' }
        
        // Calculate from accrued, used, pending, carryover
        const used = b.used_hours || 0
        const total = (b.accrued_hours || 0) + (b.carryover_hours || 0)
        const pending = b.pending_hours || 0
        const available = Math.max(0, total - used - pending)
        
        totalUsed += used
        totalAvailable += available
        
        return {
          name: typeName,
          total: Math.round(total / 8), // Convert hours to days
          available: Math.round(available / 8),
          used: Math.round(used / 8),
          icon: style.icon,
          color: style.color
        }
      })
      
      ptoBalance.value = {
        total: Math.round((totalUsed + totalAvailable) / 8),
        used: Math.round(totalUsed / 8),
        available: Math.round(totalAvailable / 8)
      }
    } else {
      // No balances found - show empty state
      ptoTypes.value = []
      ptoBalance.value = { total: 0, used: 0, available: 0 }
    }
  } catch (err) {
    console.error('Error fetching time off balances:', err)
  } finally {
    loadingBalances.value = false
  }
}

async function submitTimeOffRequest() {
  const { valid } = await formRef.value?.validate()
  if (!valid) return

  const profileId = authStore.profile?.id
  const employeeId = userStore.employee?.id
  if (!profileId || !employeeId) {
    snackbar.message = 'User session not found'
    snackbar.color = 'error'
    snackbar.show = true
    return
  }

  submittingRequest.value = true
  try {
    const { error } = await supabase
      .from('time_off_requests')
      .insert({
        profile_id: profileId,
        employee_id: employeeId,
        time_off_type_id: form.type_id,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason || null,
        status: 'pending'
      } as any)

    if (error) throw error

    snackbar.message = 'Time off request submitted!'
    snackbar.color = 'success'
    snackbar.show = true
    
    // Send Slack notification to managers
    try {
      const employeeName = `${userStore.profile?.first_name || ''} ${userStore.profile?.last_name || ''}`.trim() || 'Unknown Employee'
      const startFormatted = new Date(form.start_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      const endFormatted = new Date(form.end_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      const typeLabel = timeOffTypes.value.find(t => t.id === form.type_id)?.name || 'Time Off'
      const conflictWarning = conflictingShifts.value.length > 0
        ? `\n⚠️ *Schedule Conflict:* ${conflictingShifts.value.length} scheduled shift${conflictingShifts.value.length !== 1 ? 's' : ''} during this period`
        : ''
      
      await $fetch('/api/slack/send', {
        method: 'POST',
        body: {
          type: 'channel',
          channel: '#time-off-requests',
          text: `📅 *New Time Off Request*\n*Employee:* ${employeeName}\n*Type:* ${typeLabel}\n*Dates:* ${startFormatted} - ${endFormatted} (${calculateDays.value} day${calculateDays.value !== 1 ? 's' : ''})\n*Reason:* ${form.reason || 'No reason provided'}${conflictWarning}\n\n_Please review in Employee GM → Time Off_`
        }
      })
    } catch (slackError) {
      // Don't fail if Slack notification fails
      console.error('Slack notification failed:', slackError)
    }
    
    requestDialog.value = false
    form.start_date = ''
    form.end_date = ''
    form.reason = ''
    conflictingShifts.value = []
    // Reset to default type
    const ptoType = timeOffTypes.value.find(t => t.code === 'PTO' || t.name === 'Paid Time Off')
    form.type_id = ptoType?.id || timeOffTypes.value[0]?.id || ''
    
    await fetchRequests()
  } catch (err) {
    console.error('Error submitting request:', err)
    snackbar.message = 'Failed to submit request'
    snackbar.color = 'error'
    snackbar.show = true
  } finally {
    submittingRequest.value = false
  }
}

async function cancelRequest(id: string) {
  try {
    const { error } = await supabase
      .from('time_off_requests')
      .delete()
      .eq('id', id)

    if (error) throw error

    snackbar.message = 'Request cancelled'
    snackbar.color = 'info'
    snackbar.show = true
    
    await fetchRequests()
  } catch (err) {
    console.error('Error cancelling request:', err)
    snackbar.message = 'Failed to cancel request'
    snackbar.color = 'error'
    snackbar.show = true
  }
}

// Initialize
onMounted(async () => {
  await userStore.fetchUserData()
  
  // Fetch my shifts
  const employeeId = userStore.employee?.id
  if (employeeId) {
    const now = new Date()
    const startDate = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0] || ''
    const endDate = new Date(now.setDate(now.getDate() + 30)).toISOString().split('T')[0] || ''
    
    await opsStore.fetchShifts(startDate, endDate)
    // Only show published or completed shifts to employees
    myShifts.value = opsStore.shifts.filter(s => 
      s.employee_id === employeeId && 
      ['published', 'completed'].includes(s.status)
    )
  }
  
  await employeeStore.fetchEmployees?.()
  await fetchRequests()
})
</script>

<style scoped>
.my-schedule-page {
  max-width: 1400px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

/* Horizontal scrollable stats on mobile */
.stats-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.stats-scroll::-webkit-scrollbar {
  display: none;
}

.stats-row {
  display: flex;
  gap: 12px;
  min-width: max-content;
}

.stat-card {
  min-width: 100px;
  flex-shrink: 0;
}

@media (min-width: 600px) {
  .stats-row {
    min-width: auto;
  }
  .stat-card {
    flex: 1;
    min-width: auto;
  }
}

/* PTO Types Grid */
.pto-types-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

@media (min-width: 600px) {
  .pto-types-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

.pto-type-item {
  text-align: center;
  padding: 12px 8px;
  border-radius: 8px;
}
</style>
