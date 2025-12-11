<template>
  <div class="my-schedule-page">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">My Schedule</h1>
        <p class="text-body-1 text-grey-darken-1">
          {{ todayFormatted }} • {{ currentGreeting }}
        </p>
      </div>
    </div>

    <v-row>
      <!-- Left Column - Time Clock -->
      <v-col cols="12" md="4">
        <OperationsTimeClock />
        
        <!-- Reliability Score Card -->
        <v-card rounded="lg" class="mt-4">
          <v-card-title class="d-flex align-center">
            <v-icon color="primary" class="mr-2">mdi-chart-arc</v-icon>
            Reliability Score
          </v-card-title>
          <v-card-text class="text-center">
            <v-progress-circular
              :model-value="reliabilityScore"
              :size="120"
              :width="12"
              :color="getReliabilityColor(reliabilityScore)"
            >
              <div class="text-center">
                <div class="text-h4 font-weight-bold">{{ reliabilityScore }}%</div>
                <div class="text-caption text-grey">Score</div>
              </div>
            </v-progress-circular>
            
            <div class="mt-4">
              <v-chip 
                :color="getReliabilityColor(reliabilityScore)" 
                variant="tonal"
                class="mb-2"
              >
                {{ getReliabilityLabel(reliabilityScore) }}
              </v-chip>
            </div>
            
            <v-list density="compact" class="mt-2 bg-transparent">
              <v-list-item>
                <template #prepend>
                  <v-icon color="success" size="small">mdi-check-circle</v-icon>
                </template>
                <v-list-item-title class="text-body-2">On-time arrivals</v-list-item-title>
                <template #append>
                  <span class="font-weight-medium">{{ reliabilityStats.onTime }}</span>
                </template>
              </v-list-item>
              <v-list-item>
                <template #prepend>
                  <v-icon color="warning" size="small">mdi-clock-alert</v-icon>
                </template>
                <v-list-item-title class="text-body-2">Late arrivals</v-list-item-title>
                <template #append>
                  <span class="font-weight-medium">{{ reliabilityStats.late }}</span>
                </template>
              </v-list-item>
              <v-list-item>
                <template #prepend>
                  <v-icon color="error" size="small">mdi-close-circle</v-icon>
                </template>
                <v-list-item-title class="text-body-2">Absences</v-list-item-title>
                <template #append>
                  <span class="font-weight-medium">{{ reliabilityStats.absences }}</span>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <!-- PTO Balance Card -->
        <v-card rounded="lg" class="mt-4">
          <v-card-title class="d-flex align-center">
            <v-icon color="info" class="mr-2">mdi-beach</v-icon>
            PTO Balance
          </v-card-title>
          <v-card-text>
            <v-row dense>
              <v-col cols="6">
                <div class="text-center pa-3 bg-blue-lighten-5 rounded-lg">
                  <div class="text-h4 font-weight-bold text-primary">{{ ptoBalance.available }}</div>
                  <div class="text-caption">Days Available</div>
                </div>
              </v-col>
              <v-col cols="6">
                <div class="text-center pa-3 bg-green-lighten-5 rounded-lg">
                  <div class="text-h4 font-weight-bold text-success">{{ ptoBalance.used }}</div>
                  <div class="text-caption">Days Used</div>
                </div>
              </v-col>
            </v-row>
            
            <div class="mt-4">
              <div class="d-flex justify-space-between text-caption mb-1">
                <span>Used: {{ ptoBalance.used }} days</span>
                <span>Total: {{ ptoBalance.total }} days</span>
              </div>
              <v-progress-linear
                :model-value="(ptoBalance.used / ptoBalance.total) * 100"
                color="primary"
                height="8"
                rounded
              />
            </div>

            <v-divider class="my-4" />

            <div class="text-caption text-grey mb-2">Upcoming Time Off</div>
            <div v-if="upcomingTimeOff.length === 0" class="text-body-2 text-grey">
              No upcoming time off scheduled
            </div>
            <v-list v-else density="compact" class="bg-transparent">
              <v-list-item v-for="pto in upcomingTimeOff" :key="pto.id" class="px-0">
                <template #prepend>
                  <v-icon size="small" :color="getTimeOffStatusColor(pto.status)">
                    {{ getTimeOffStatusIcon(pto.status) }}
                  </v-icon>
                </template>
                <v-list-item-title class="text-body-2">
                  {{ formatDateRange(pto.start_date, pto.end_date) }}
                </v-list-item-title>
                <template #append>
                  <v-chip size="x-small" :color="getTimeOffStatusColor(pto.status)">
                    {{ pto.status }}
                  </v-chip>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Right Column - Schedule & Requests -->
      <v-col cols="12" md="8">
        <v-row>
          <!-- Upcoming Shifts -->
          <v-col cols="12">
            <OperationsUpcomingShifts 
              @request-swap="openSwapDialog"
              @request-drop="openDropDialog"
            />
          </v-col>

          <!-- Time Off Requests -->
          <v-col cols="12">
            <OperationsTimeOffRequestCard />
          </v-col>
        </v-row>
      </v-col>
    </v-row>

    <!-- Quick Stats Row -->
    <v-row class="mt-4">
      <v-col cols="6" sm="3">
        <v-card variant="tonal" color="primary" rounded="lg">
          <v-card-text class="text-center">
            <v-icon size="24" class="mb-1">mdi-clock-check-outline</v-icon>
            <div class="text-h5 font-weight-bold">{{ weeklyHours.toFixed(1) }}h</div>
            <div class="text-caption">This Week</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card variant="tonal" color="success" rounded="lg">
          <v-card-text class="text-center">
            <v-icon size="24" class="mb-1">mdi-calendar-check</v-icon>
            <div class="text-h5 font-weight-bold">{{ upcomingShiftCount }}</div>
            <div class="text-caption">Upcoming Shifts</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card variant="tonal" color="warning" rounded="lg">
          <v-card-text class="text-center">
            <v-icon size="24" class="mb-1">mdi-clock-alert-outline</v-icon>
            <div class="text-h5 font-weight-bold">{{ pendingRequestCount }}</div>
            <div class="text-caption">Pending Requests</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card variant="tonal" color="info" rounded="lg">
          <v-card-text class="text-center">
            <v-icon size="24" class="mb-1">mdi-beach</v-icon>
            <div class="text-h5 font-weight-bold">{{ ptoBalance.available }}</div>
            <div class="text-caption">PTO Days Left</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

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

    <!-- Success Snackbar -->
    <v-snackbar v-model="showSuccess" color="success" location="top">
      <v-icon class="mr-2">mdi-check-circle</v-icon>
      {{ successMessage }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import type { Shift } from '~/stores/operations'

// Middleware
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

useHead({
  title: 'My Schedule'
})

// Stores
const opsStore = useOperationsStore()
const userStore = useUserStore()
const employeeStore = useEmployeeStore()
const toast = useToast()
const supabase = useSupabaseClient()

// State
const myShifts = ref<Shift[]>([])
const swapDialog = ref(false)
const dropDialog = ref(false)
const swapShift = ref<Shift | null>(null)
const dropShift = ref<Shift | null>(null)
const swapTargetEmployee = ref<string | null>(null)
const dropReason = ref('')
const isSubmittingChange = ref(false)
const showSuccess = ref(false)
const successMessage = ref('')
const upcomingTimeOff = ref<any[]>([])

// Reliability stats (simulated - would come from database in production)
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
  available: 12,
  used: 3,
  total: 15
})

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
  // Calculate weekly hours from myShifts
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
const pendingRequestCount = computed(() => 0) // Placeholder until we have time off requests

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

function getTimeOffStatusColor(status: string) {
  switch (status) {
    case 'approved': return 'success'
    case 'pending': return 'warning'
    case 'denied': return 'error'
    default: return 'grey'
  }
}

function getTimeOffStatusIcon(status: string) {
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
  return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`
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
    // Implement swap request logic here
    await new Promise(resolve => setTimeout(resolve, 500)) // Simulated
    successMessage.value = 'Swap request submitted successfully!'
    showSuccess.value = true
    swapDialog.value = false
  } catch (err) {
    console.error('Swap request failed:', err)
    toast.error('Failed to submit swap request')
  } finally {
    isSubmittingChange.value = false
  }
}

async function submitDropRequest() {
  if (!dropShift.value) return
  isSubmittingChange.value = true
  try {
    // Implement drop request logic here
    await new Promise(resolve => setTimeout(resolve, 500)) // Simulated
    successMessage.value = 'Drop request submitted successfully!'
    showSuccess.value = true
    dropDialog.value = false
  } catch (err) {
    console.error('Drop request failed:', err)
    toast.error('Failed to submit drop request')
  } finally {
    isSubmittingChange.value = false
  }
}

async function fetchUpcomingTimeOff() {
  try {
    const employeeId = userStore.employee?.id
    if (!employeeId) return

    const { data, error } = await supabase
      .from('time_off_requests')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('end_date', new Date().toISOString().split('T')[0])
      .order('start_date')
      .limit(5)

    if (error) throw error
    upcomingTimeOff.value = data || []
  } catch (err) {
    console.error('Error fetching time off:', err)
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
    myShifts.value = opsStore.shifts.filter(s => s.employee_id === employeeId)
  }
  
  await employeeStore.fetchEmployees?.()
  await fetchUpcomingTimeOff()
})
</script>

<style scoped>
.my-schedule-page {
  max-width: 1400px;
}
</style>
