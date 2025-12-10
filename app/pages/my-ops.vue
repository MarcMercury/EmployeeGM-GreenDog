<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">My Ops</h1>
        <p class="text-body-1 text-grey-darken-1">
          {{ todayFormatted }} • {{ currentGreeting }}
        </p>
      </div>
    </div>

    <v-row>
      <!-- Left Column - Time Clock -->
      <v-col cols="12" md="4">
        <OperationsTimeClock />
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
            <div class="text-h5 font-weight-bold">{{ remainingPTO }}</div>
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
import { ref, computed, onMounted } from 'vue'
import { useOperationsStore, type Shift } from '~/stores/operations'
import { useUserStore } from '~/stores/user'
import { useEmployeeStore } from '~/stores/employee'

// Middleware
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

// Stores
const opsStore = useOperationsStore()
const userStore = useUserStore()
const employeeStore = useEmployeeStore()

// State
const swapDialog = ref(false)
const dropDialog = ref(false)
const swapShift = ref<Shift | null>(null)
const dropShift = ref<Shift | null>(null)
const swapTargetEmployee = ref<string | null>(null)
const dropReason = ref('')
const isSubmittingChange = ref(false)
const showSuccess = ref(false)
const successMessage = ref('')

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
  const name = userStore.currentEmployee?.profile?.first_name || 'there'
  if (hour < 12) return `Good morning, ${name}`
  if (hour < 17) return `Good afternoon, ${name}`
  return `Good evening, ${name}`
})

const employeeId = computed(() => userStore.currentEmployee?.id)

const upcomingShiftCount = computed(() => {
  if (!employeeId.value) return 0
  return opsStore.myUpcomingShifts(employeeId.value).length
})

const pendingRequestCount = computed(() => {
  return opsStore.timeOffRequests.filter(r => 
    r.employee_id === employeeId.value && r.status === 'pending'
  ).length
})

const weeklyHours = computed(() => {
  // Sum hours from time entries this week
  const startOfWeek = new Date()
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  return opsStore.timeEntries
    .filter(e => 
      e.employee_id === employeeId.value &&
      e.clock_in_at &&
      new Date(e.clock_in_at) >= startOfWeek
    )
    .reduce((sum, e) => sum + (e.total_hours || 0), 0)
})

const remainingPTO = computed(() => {
  // TODO: Calculate from employee's PTO balance
  return 12 // Placeholder
})

const availableEmployees = computed(() => {
  return employeeStore.employees
    .filter(e => e.id !== employeeId.value)
    .map(e => ({
      id: e.id,
      name: e.profile ? `${e.profile.first_name || ''} ${e.profile.last_name || ''}`.trim() : 'Unknown'
    }))
})

// Methods
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
  if (!swapShift.value || !swapTargetEmployee.value || !employeeId.value) return

  isSubmittingChange.value = true
  try {
    await opsStore.createShiftChange({
      shift_id: swapShift.value.id,
      from_employee_id: employeeId.value,
      to_employee_id: swapTargetEmployee.value,
      type: 'swap'
    })
    
    swapDialog.value = false
    successMessage.value = 'Swap request submitted successfully'
    showSuccess.value = true
  } catch (err) {
    console.error('Failed to submit swap request:', err)
  } finally {
    isSubmittingChange.value = false
  }
}

async function submitDropRequest() {
  if (!dropShift.value || !employeeId.value) return

  isSubmittingChange.value = true
  try {
    await opsStore.createShiftChange({
      shift_id: dropShift.value.id,
      from_employee_id: employeeId.value,
      type: 'drop'
    })
    
    dropDialog.value = false
    successMessage.value = 'Drop request submitted successfully'
    showSuccess.value = true
  } catch (err) {
    console.error('Failed to submit drop request:', err)
  } finally {
    isSubmittingChange.value = false
  }
}

// Lifecycle
onMounted(async () => {
  await Promise.all([
    employeeStore.fetchEmployees(),
    opsStore.fetchGeofences()
  ])

  if (employeeId.value) {
    const now = new Date()
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    
    await opsStore.fetchTimeEntries(
      weekAgo.toISOString(),
      now.toISOString(),
      employeeId.value
    )
  }
})
</script>
