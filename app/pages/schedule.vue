<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Schedule</h1>
        <p class="text-body-1 text-grey-darken-1">
          Manage team schedules
        </p>
      </div>
      <v-btn
        v-if="isAdmin"
        color="primary"
        prepend-icon="mdi-plus"
        @click="addScheduleDialog = true"
      >
        Add Schedule
      </v-btn>
    </div>

    <!-- Calendar -->
    <ScheduleScheduleCalendar
      :schedules="schedules"
      v-model:selected-date="selectedDate"
      v-model:view-mode="viewMode"
      :editable="isAdmin"
      :show-employee="true"
      :employee-names="employeeNames"
      @schedule-click="handleScheduleClick"
      @add-schedule="handleAddSchedule"
    />

    <!-- Add/Edit Schedule Dialog -->
    <v-dialog v-model="addScheduleDialog" max-width="500">
      <v-card>
        <v-card-title>
          {{ editingSchedule ? 'Edit Schedule' : 'Add Schedule' }}
        </v-card-title>
        <v-card-text>
          <v-form ref="scheduleFormRef">
            <v-select
              v-model="scheduleForm.profile_id"
              :items="employeeOptions"
              label="Employee"
              item-title="name"
              item-value="id"
              :rules="[v => !!v || 'Required']"
            />

            <v-text-field
              v-model="scheduleForm.date"
              label="Date"
              type="date"
              :rules="[v => !!v || 'Required']"
            />

            <v-select
              v-model="scheduleForm.shift_type"
              :items="shiftOptions"
              label="Shift Type"
              :rules="[v => !!v || 'Required']"
            />

            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="scheduleForm.start_time"
                  label="Start Time"
                  type="time"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="scheduleForm.end_time"
                  label="End Time"
                  type="time"
                />
              </v-col>
            </v-row>

            <v-textarea
              v-model="scheduleForm.notes"
              label="Notes"
              rows="2"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-btn
            v-if="editingSchedule"
            color="error"
            variant="text"
            @click="deleteSchedule"
          >
            Delete
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="closeScheduleDialog">Cancel</v-btn>
          <v-btn color="primary" @click="saveSchedule">
            {{ editingSchedule ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import type { Schedule, ShiftType } from '~/types/database.types'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const authStore = useAuthStore()
const employeeStore = useEmployeeStore()
const scheduleStore = useScheduleStore()
const uiStore = useUIStore()

const isAdmin = computed(() => authStore.isAdmin)

const selectedDate = ref(new Date().toISOString().split('T')[0])
const viewMode = ref<'day' | 'week' | 'month'>('week')

const addScheduleDialog = ref(false)
const scheduleFormRef = ref()
const editingSchedule = ref<Schedule | null>(null)

const scheduleForm = reactive({
  profile_id: '',
  date: '',
  shift_type: 'full-day' as ShiftType,
  start_time: '',
  end_time: '',
  notes: ''
})

const shiftOptions = [
  { title: 'Morning', value: 'morning' },
  { title: 'Afternoon', value: 'afternoon' },
  { title: 'Evening', value: 'evening' },
  { title: 'Full Day', value: 'full-day' },
  { title: 'Off', value: 'off' }
]

const schedules = computed(() => scheduleStore.schedules)

const employeeNames = computed(() => {
  const names: Record<string, string> = {}
  employeeStore.employees.forEach(e => {
    names[e.id] = `${e.first_name} ${e.last_name}`.trim() || e.email
  })
  return names
})

const employeeOptions = computed(() => {
  return employeeStore.employees.map(e => ({
    id: e.id,
    name: `${e.first_name} ${e.last_name}`.trim() || e.email
  }))
})

function handleScheduleClick(schedule: Schedule) {
  if (!isAdmin.value) return
  
  editingSchedule.value = schedule
  Object.assign(scheduleForm, {
    profile_id: schedule.profile_id,
    date: schedule.date,
    shift_type: schedule.shift_type,
    start_time: schedule.start_time || '',
    end_time: schedule.end_time || '',
    notes: schedule.notes || ''
  })
  addScheduleDialog.value = true
}

function handleAddSchedule(date: string) {
  scheduleForm.date = date
  addScheduleDialog.value = true
}

function closeScheduleDialog() {
  addScheduleDialog.value = false
  editingSchedule.value = null
  Object.assign(scheduleForm, {
    profile_id: '',
    date: '',
    shift_type: 'full-day',
    start_time: '',
    end_time: '',
    notes: ''
  })
}

async function saveSchedule() {
  const { valid } = await scheduleFormRef.value.validate()
  if (!valid) return

  try {
    if (editingSchedule.value) {
      await scheduleStore.updateSchedule(editingSchedule.value.id, {
        shift_type: scheduleForm.shift_type,
        start_time: scheduleForm.start_time || null,
        end_time: scheduleForm.end_time || null,
        notes: scheduleForm.notes || null
      })
      uiStore.showSuccess('Schedule updated')
    } else {
      await scheduleStore.createSchedule({
        profile_id: scheduleForm.profile_id,
        date: scheduleForm.date,
        shift_type: scheduleForm.shift_type,
        start_time: scheduleForm.start_time || null,
        end_time: scheduleForm.end_time || null,
        notes: scheduleForm.notes || null,
        created_by: authStore.profile!.id
      })
      uiStore.showSuccess('Schedule created')
    }
    closeScheduleDialog()
  } catch {
    uiStore.showError('Failed to save schedule')
  }
}

async function deleteSchedule() {
  if (!editingSchedule.value) return
  
  try {
    await scheduleStore.deleteSchedule(editingSchedule.value.id)
    uiStore.showSuccess('Schedule deleted')
    closeScheduleDialog()
  } catch {
    uiStore.showError('Failed to delete schedule')
  }
}

onMounted(async () => {
  await Promise.all([
    employeeStore.fetchEmployees(),
    scheduleStore.fetchSchedules()
  ])
})
</script>
