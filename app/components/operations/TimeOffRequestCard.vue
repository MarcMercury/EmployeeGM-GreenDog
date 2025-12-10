<template>
  <v-card rounded="lg" elevation="2">
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-center ga-2">
        <v-icon color="primary">mdi-beach</v-icon>
        Time Off
      </div>
      <v-btn
        color="primary"
        size="small"
        prepend-icon="mdi-plus"
        @click="openRequestDialog"
      >
        Request
      </v-btn>
    </v-card-title>
    
    <v-divider />

    <!-- Pending Requests -->
    <v-list v-if="myRequests.length > 0" lines="two">
      <v-list-subheader>My Requests</v-list-subheader>
      
      <v-list-item
        v-for="request in myRequests"
        :key="request.id"
      >
        <template #prepend>
          <v-icon :color="getStatusColor(request.status)">
            {{ getStatusIcon(request.status) }}
          </v-icon>
        </template>

        <v-list-item-title>
          {{ request.time_off_type?.name || 'Time Off' }}
        </v-list-item-title>
        
        <v-list-item-subtitle>
          {{ formatDateRange(request.start_date, request.end_date) }}
        </v-list-item-subtitle>

        <template #append>
          <v-chip :color="getStatusColor(request.status)" size="small" variant="tonal">
            {{ request.status }}
          </v-chip>
        </template>
      </v-list-item>
    </v-list>

    <v-card-text v-else class="text-center py-6">
      <v-icon size="48" color="grey-lighten-1">mdi-calendar-heart</v-icon>
      <p class="text-body-2 text-grey mt-2">No time off requests</p>
    </v-card-text>

    <!-- Request Dialog -->
    <v-dialog v-model="requestDialog" max-width="500" persistent>
      <v-card>
        <v-card-title>Request Time Off</v-card-title>
        <v-card-text>
          <v-form ref="formRef" v-model="formValid">
            <v-select
              v-model="form.time_off_type_id"
              :items="timeOffTypes"
              item-title="name"
              item-value="id"
              label="Type of Leave"
              :rules="[v => !!v || 'Required']"
            >
              <template #item="{ item, props }">
                <v-list-item v-bind="props">
                  <template #append>
                    <v-chip v-if="item.raw.is_paid" color="success" size="x-small" variant="tonal">
                      Paid
                    </v-chip>
                    <v-chip v-else color="grey" size="x-small" variant="tonal">
                      Unpaid
                    </v-chip>
                  </template>
                </v-list-item>
              </template>
            </v-select>

            <v-row class="mt-2">
              <v-col cols="6">
                <v-text-field
                  v-model="form.start_date"
                  label="Start Date"
                  type="date"
                  :rules="[v => !!v || 'Required']"
                  :min="minDate"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="form.end_date"
                  label="End Date"
                  type="date"
                  :rules="[
                    v => !!v || 'Required',
                    v => v >= form.start_date || 'Must be after start'
                  ]"
                  :min="form.start_date || minDate"
                />
              </v-col>
            </v-row>

            <v-text-field
              v-model.number="form.duration_hours"
              label="Hours (optional)"
              type="number"
              hint="Leave blank for full days"
              persistent-hint
              class="mt-2"
            />

            <!-- Date Range Summary -->
            <v-alert
              v-if="form.start_date && form.end_date"
              type="info"
              variant="tonal"
              class="mt-4"
            >
              <strong>{{ calculateDays }} day{{ calculateDays !== 1 ? 's' : '' }}</strong>
              of time off requested
            </v-alert>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
          <v-btn 
            color="primary" 
            @click="submitRequest"
            :loading="isSubmitting"
            :disabled="!formValid"
          >
            Submit Request
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOperationsStore, type TimeOffRequest } from '~/stores/operations'
import { useUserStore } from '~/stores/user'

// Stores
const opsStore = useOperationsStore()
const userStore = useUserStore()

// State
const requestDialog = ref(false)
const formRef = ref()
const formValid = ref(false)
const isSubmitting = ref(false)

const form = ref({
  time_off_type_id: null as string | null,
  start_date: '',
  end_date: '',
  duration_hours: null as number | null
})

// Computed
const minDate = computed(() => {
  const today = new Date()
  return today.toISOString().split('T')[0]
})

const timeOffTypes = computed(() => opsStore.timeOffTypes)

const myRequests = computed(() => {
  const employeeId = userStore.currentEmployee?.id
  if (!employeeId) return []
  return opsStore.timeOffRequests.filter(r => r.employee_id === employeeId)
})

const calculateDays = computed(() => {
  if (!form.value.start_date || !form.value.end_date) return 0
  const start = new Date(form.value.start_date)
  const end = new Date(form.value.end_date)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
})

// Methods
function getStatusColor(status: string): string {
  switch (status) {
    case 'pending': return 'warning'
    case 'approved': return 'success'
    case 'denied': return 'error'
    case 'cancelled': return 'grey'
    default: return 'grey'
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'pending': return 'mdi-clock-outline'
    case 'approved': return 'mdi-check-circle'
    case 'denied': return 'mdi-close-circle'
    case 'cancelled': return 'mdi-cancel'
    default: return 'mdi-help-circle'
  }
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

function openRequestDialog() {
  form.value = {
    time_off_type_id: null,
    start_date: '',
    end_date: '',
    duration_hours: null
  }
  requestDialog.value = true
}

function closeDialog() {
  requestDialog.value = false
}

async function submitRequest() {
  if (!formRef.value) return
  const { valid } = await formRef.value.validate()
  if (!valid) return

  const employeeId = userStore.currentEmployee?.id
  if (!employeeId) return

  isSubmitting.value = true

  try {
    await opsStore.createTimeOffRequest({
      employee_id: employeeId,
      time_off_type_id: form.value.time_off_type_id!,
      start_date: form.value.start_date,
      end_date: form.value.end_date,
      duration_hours: form.value.duration_hours || undefined
    })
    closeDialog()
  } catch (err) {
    console.error('Failed to submit request:', err)
  } finally {
    isSubmitting.value = false
  }
}

// Lifecycle
onMounted(async () => {
  const employeeId = userStore.currentEmployee?.id
  await Promise.all([
    opsStore.fetchTimeOffTypes(),
    employeeId ? opsStore.fetchTimeOffRequests(employeeId) : Promise.resolve()
  ])
})
</script>
