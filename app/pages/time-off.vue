<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Time Off Requests</h1>
        <p class="text-body-1 text-grey-darken-1">
          {{ isAdmin ? 'Manage team time off requests' : 'View and submit time off requests' }}
        </p>
      </div>
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        @click="requestDialog = true"
      >
        Request Time Off
      </v-btn>
    </div>

    <!-- Tabs for Admin -->
    <v-tabs v-if="isAdmin" v-model="tab" color="primary" class="mb-4">
      <v-tab value="pending">
        Pending
        <v-chip v-if="pendingRequests.length" size="x-small" color="warning" class="ml-2">
          {{ pendingRequests.length }}
        </v-chip>
      </v-tab>
      <v-tab value="approved">Approved</v-tab>
      <v-tab value="denied">Denied</v-tab>
      <v-tab value="all">All</v-tab>
    </v-tabs>

    <!-- Requests List -->
    <v-card rounded="lg">
      <v-card-text v-if="filteredRequests.length === 0" class="text-center py-12">
        <v-icon size="64" color="grey-lighten-1">mdi-calendar-check</v-icon>
        <h3 class="text-h6 mt-4">No requests found</h3>
        <p class="text-grey">
          {{ tab === 'pending' ? 'No pending time off requests' : 'No requests to display' }}
        </p>
      </v-card-text>

      <v-list v-else>
        <v-list-item
          v-for="request in filteredRequests"
          :key="request.id"
          class="py-4"
        >
          <template #prepend>
            <v-avatar :color="getStatusColor(request.status)" size="48">
              <v-icon color="white">{{ getStatusIcon(request.status) }}</v-icon>
            </v-avatar>
          </template>

          <v-list-item-title class="font-weight-bold mb-1">
            {{ getEmployeeName(request.profile_id) }}
          </v-list-item-title>
          
          <v-list-item-subtitle>
            <v-icon size="16" class="mr-1">mdi-calendar-range</v-icon>
            {{ formatDate(request.start_date) }} - {{ formatDate(request.end_date) }}
            <span class="ml-2 text-grey">({{ getDaysCount(request) }} days)</span>
          </v-list-item-subtitle>

          <div v-if="request.reason" class="text-body-2 text-grey mt-2">
            <v-icon size="14" class="mr-1">mdi-note</v-icon>
            {{ request.reason }}
          </div>

          <template #append>
            <div class="d-flex flex-column align-end gap-2">
              <v-chip :color="getStatusColor(request.status)" size="small" variant="flat">
                {{ request.status }}
              </v-chip>

              <div v-if="isAdmin && request.status === 'pending'" class="d-flex gap-1">
                <v-btn
                  icon="mdi-check"
                  size="small"
                  color="success"
                  variant="tonal"
                  @click="reviewRequest(request.id, 'approved')"
                />
                <v-btn
                  icon="mdi-close"
                  size="small"
                  color="error"
                  variant="tonal"
                  @click="reviewRequest(request.id, 'denied')"
                />
              </div>

              <div v-if="request.reviewed_at" class="text-caption text-grey">
                Reviewed {{ formatDate(request.reviewed_at) }}
              </div>
            </div>
          </template>
        </v-list-item>
      </v-list>
    </v-card>

    <!-- Request Dialog -->
    <v-dialog v-model="requestDialog" max-width="500">
      <v-card>
        <v-card-title>Request Time Off</v-card-title>
        <v-card-text>
          <v-form ref="formRef">
            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="form.start_date"
                  label="Start Date"
                  type="date"
                  :rules="[v => !!v || 'Required']"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="form.end_date"
                  label="End Date"
                  type="date"
                  :rules="[v => !!v || 'Required']"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="form.reason"
                  label="Reason (optional)"
                  rows="3"
                  hint="Briefly describe the reason for your time off request"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="requestDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="submitRequest">Submit Request</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import type { TimeOffRequest, TimeOffStatus } from '~/types/database.types'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const authStore = useAuthStore()
const employeeStore = useEmployeeStore()
const scheduleStore = useScheduleStore()
const uiStore = useUIStore()

const isAdmin = computed(() => authStore.isAdmin)

const tab = ref('pending')
const requestDialog = ref(false)
const formRef = ref()

const form = reactive({
  start_date: '',
  end_date: '',
  reason: ''
})

const allRequests = computed(() => scheduleStore.timeOffRequests)
const pendingRequests = computed(() => allRequests.value.filter(r => r.status === 'pending'))

const filteredRequests = computed(() => {
  // Non-admins only see their own requests
  let requests = isAdmin.value 
    ? allRequests.value 
    : allRequests.value.filter(r => r.profile_id === authStore.profile?.id)

  if (isAdmin.value) {
    switch (tab.value) {
      case 'pending':
        requests = requests.filter(r => r.status === 'pending')
        break
      case 'approved':
        requests = requests.filter(r => r.status === 'approved')
        break
      case 'denied':
        requests = requests.filter(r => r.status === 'denied')
        break
    }
  }

  return requests.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
})

const employeeNames = computed(() => {
  const names: Record<string, string> = {}
  employeeStore.employees.forEach(e => {
    names[e.id] = `${e.first_name} ${e.last_name}`.trim() || e.email
  })
  return names
})

function getEmployeeName(profileId: string): string {
  return employeeNames.value[profileId] || 'Unknown'
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function getDaysCount(request: TimeOffRequest): number {
  const start = new Date(request.start_date)
  const end = new Date(request.end_date)
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

function getStatusColor(status: TimeOffStatus): string {
  const colors: Record<TimeOffStatus, string> = {
    pending: 'warning',
    approved: 'success',
    denied: 'error'
  }
  return colors[status]
}

function getStatusIcon(status: TimeOffStatus): string {
  const icons: Record<TimeOffStatus, string> = {
    pending: 'mdi-clock-outline',
    approved: 'mdi-check',
    denied: 'mdi-close'
  }
  return icons[status]
}

async function submitRequest() {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  try {
    await scheduleStore.requestTimeOff({
      profile_id: authStore.profile!.id,
      start_date: form.start_date,
      end_date: form.end_date,
      reason: form.reason || undefined
    })

    requestDialog.value = false
    uiStore.showSuccess('Time off request submitted')
    
    // Reset form
    Object.assign(form, { start_date: '', end_date: '', reason: '' })
  } catch {
    uiStore.showError('Failed to submit request')
  }
}

async function reviewRequest(id: string, status: TimeOffStatus) {
  try {
    await scheduleStore.reviewTimeOff(id, status)
    uiStore.showSuccess(`Request ${status}`)
  } catch {
    uiStore.showError('Failed to review request')
  }
}

onMounted(async () => {
  await Promise.all([
    employeeStore.fetchEmployees(),
    scheduleStore.fetchTimeOffRequests()
  ])
})
</script>
