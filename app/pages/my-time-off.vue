<template>
  <div class="my-time-off-page">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">My Time Off</h1>
        <p class="text-body-1 text-grey-darken-1">
          Manage your time off requests and PTO balance
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

    <!-- PTO Summary Cards -->
    <v-row class="mb-6">
      <v-col cols="12" md="4">
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
      
      <v-col cols="12" md="4">
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
      
      <v-col cols="12" md="4">
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
    </v-row>

    <!-- PTO Breakdown -->
    <v-card rounded="lg" class="mb-6">
      <v-card-title>PTO Breakdown by Type</v-card-title>
      <v-card-text>
        <v-row>
          <v-col v-for="type in ptoTypes" :key="type.name" cols="6" sm="4" md="2">
            <div class="text-center pa-3 rounded-lg" :style="{ backgroundColor: `${type.color}20` }">
              <v-icon :color="type.color" size="24" class="mb-2">{{ type.icon }}</v-icon>
              <div class="text-body-1 font-weight-bold">{{ type.available }}</div>
              <div class="text-caption">{{ type.name }}</div>
              <div class="text-caption text-grey">of {{ type.total }}</div>
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Requests History -->
    <v-card rounded="lg">
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Request History</span>
        <v-chip-group v-model="statusFilter" mandatory selected-class="text-primary">
          <v-chip value="all" size="small" variant="outlined">All</v-chip>
          <v-chip value="pending" size="small" variant="outlined">Pending</v-chip>
          <v-chip value="approved" size="small" variant="outlined">Approved</v-chip>
          <v-chip value="denied" size="small" variant="outlined">Denied</v-chip>
        </v-chip-group>
      </v-card-title>
      
      <v-card-text v-if="loading" class="text-center py-8">
        <v-progress-circular indeterminate color="primary" />
      </v-card-text>
      
      <v-card-text v-else-if="filteredRequests.length === 0" class="text-center py-12">
        <v-icon size="64" color="grey-lighten-1">mdi-calendar-blank</v-icon>
        <h3 class="text-h6 mt-4">No requests found</h3>
        <p class="text-grey">
          {{ statusFilter === 'all' ? 'You haven\'t submitted any time off requests yet.' : `No ${statusFilter} requests.` }}
        </p>
      </v-card-text>

      <v-list v-else lines="three">
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
            {{ formatDateRange(request.start_date, request.end_date) }}
          </v-list-item-title>
          
          <v-list-item-subtitle>
            <v-icon size="16" class="mr-1">mdi-clock-outline</v-icon>
            {{ getDaysCount(request) }} day{{ getDaysCount(request) !== 1 ? 's' : '' }}
            <span class="mx-2">•</span>
            <span>{{ request.type || 'PTO' }}</span>
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

              <div v-if="request.status === 'pending'" class="d-flex gap-1">
                <v-btn
                  icon="mdi-close"
                  size="small"
                  color="error"
                  variant="text"
                  @click="cancelRequest(request.id)"
                  title="Cancel Request"
                />
              </div>

              <div v-if="request.approved_at" class="text-caption text-grey">
                Reviewed {{ formatDate(request.approved_at) }}
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
            <v-select
              v-model="form.type"
              :items="ptoTypeOptions"
              label="Type"
              variant="outlined"
              class="mb-3"
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
            
            <v-alert v-if="form.start_date && form.end_date" type="info" variant="tonal" class="mt-3">
              This request is for <strong>{{ calculateDays }} day{{ calculateDays !== 1 ? 's' : '' }}</strong>.
              You'll have <strong>{{ ptoBalance.available - calculateDays }}</strong> days remaining.
            </v-alert>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="requestDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="submitRequest" :loading="submitting">Submit Request</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

useHead({
  title: 'My Time Off'
})

const supabase = useSupabaseClient()
const userStore = useUserStore()
const authStore = useAuthStore()

// State
const loading = ref(true)
const submitting = ref(false)
const requestDialog = ref(false)
const statusFilter = ref('all')
const allRequests = ref<any[]>([])
const formRef = ref()

const snackbar = reactive({
  show: false,
  message: '',
  color: 'success'
})

const form = reactive({
  type: 'PTO',
  start_date: '',
  end_date: '',
  reason: ''
})

// PTO Balance
const ptoBalance = ref({
  available: 12,
  used: 3,
  total: 15
})

// PTO Types
const ptoTypes = ref([
  { name: 'PTO', total: 10, available: 7, icon: 'mdi-beach', color: '#2196F3' },
  { name: 'Sick', total: 5, available: 5, icon: 'mdi-hospital', color: '#F44336' },
  { name: 'Personal', total: 3, available: 2, icon: 'mdi-account', color: '#9C27B0' },
  { name: 'Floating', total: 2, available: 1, icon: 'mdi-calendar-star', color: '#FF9800' },
  { name: 'Bereavement', total: 3, available: 3, icon: 'mdi-heart', color: '#607D8B' },
  { name: 'Jury Duty', total: 5, available: 5, icon: 'mdi-gavel', color: '#795548' }
])

const ptoTypeOptions = computed(() => ptoTypes.value.map(t => t.name))

// Computed
const ptoUsedPercentage = computed(() => 
  (ptoBalance.value.used / ptoBalance.value.total) * 100
)

const pendingRequests = computed(() => 
  allRequests.value.filter(r => r.status === 'pending')
)

const approvedRequests = computed(() => 
  allRequests.value.filter(r => r.status === 'approved')
)

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

// Methods
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
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

async function fetchRequests() {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('time_off_requests')
      .select('*')
      .eq('profile_id', authStore.profile?.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    allRequests.value = data || []
  } catch (err) {
    console.error('Error fetching requests:', err)
    snackbar.message = 'Failed to load requests'
    snackbar.color = 'error'
    snackbar.show = true
  } finally {
    loading.value = false
  }
}

async function submitRequest() {
  const { valid } = await formRef.value?.validate()
  if (!valid) return

  submitting.value = true
  try {
    const { error } = await supabase
      .from('time_off_requests')
      .insert({
        profile_id: authStore.profile?.id,
        employee_id: userStore.employee?.id,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason || null,
        status: 'pending'
      })

    if (error) throw error

    snackbar.message = 'Time off request submitted!'
    snackbar.color = 'success'
    snackbar.show = true
    
    requestDialog.value = false
    form.start_date = ''
    form.end_date = ''
    form.reason = ''
    form.type = 'PTO'
    
    await fetchRequests()
  } catch (err) {
    console.error('Error submitting request:', err)
    snackbar.message = 'Failed to submit request'
    snackbar.color = 'error'
    snackbar.show = true
  } finally {
    submitting.value = false
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
  await fetchRequests()
})
</script>

<style scoped>
.my-time-off-page {
  max-width: 1200px;
}
</style>
