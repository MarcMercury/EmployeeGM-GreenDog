<template>
  <div>
    <!-- Back Button -->
    <v-btn
      variant="text"
      prepend-icon="mdi-arrow-left"
      class="mb-4"
      @click="router.back()"
    >
      Back to Team
    </v-btn>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="48" />
      <p class="text-grey mt-4">Loading profile...</p>
    </div>

    <!-- Error State -->
    <v-alert v-else-if="error" type="error" class="mb-6">
      {{ error }}
    </v-alert>

    <!-- Profile Content -->
    <v-row v-else-if="employee">
      <!-- Baseball Card -->
      <v-col cols="12" md="4">
        <EmployeeBaseballCard
          :profile="employee"
          :show-actions="false"
        />

        <!-- Contact Info -->
        <v-card rounded="lg" class="mt-4">
          <v-card-title class="text-subtitle-1">Contact Information</v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item prepend-icon="mdi-email">
                <v-list-item-title>{{ employee.email }}</v-list-item-title>
                <v-list-item-subtitle>Email</v-list-item-subtitle>
              </v-list-item>
              <v-list-item v-if="employee.phone" prepend-icon="mdi-phone">
                <v-list-item-title>{{ employee.phone }}</v-list-item-title>
                <v-list-item-subtitle>Phone</v-list-item-subtitle>
              </v-list-item>
              <v-list-item v-if="employee.hire_date" prepend-icon="mdi-calendar">
                <v-list-item-title>{{ formatDate(employee.hire_date) }}</v-list-item-title>
                <v-list-item-subtitle>Hire Date</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <!-- Admin Actions -->
        <v-card v-if="isAdmin && !isOwnProfile" rounded="lg" class="mt-4">
          <v-card-title class="text-subtitle-1">Admin Actions</v-card-title>
          <v-card-text>
            <v-btn
              variant="outlined"
              color="primary"
              block
              class="mb-2"
              :to="`/employees/${id}/edit`"
            >
              <v-icon start>mdi-pencil</v-icon>
              Edit Profile
            </v-btn>
            <v-btn
              variant="outlined"
              :color="employee.is_active ? 'warning' : 'success'"
              block
              @click="toggleActiveStatus"
            >
              <v-icon start>{{ employee.is_active ? 'mdi-account-off' : 'mdi-account-check' }}</v-icon>
              {{ employee.is_active ? 'Deactivate' : 'Activate' }}
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Skills & Details -->
      <v-col cols="12" md="8">
        <!-- Skills Card -->
        <SkillSkillsCard
          :employee-skills="employee.employee_skills || []"
          :all-skills="allSkills"
          :profile-id="employee.id"
          :editable="canEditSkills"
          @update-skill="handleUpdateSkill"
          @add-skill="handleAddSkill"
        />

        <!-- Schedule Preview -->
        <v-card rounded="lg" class="mt-4">
          <v-card-title class="d-flex align-center justify-space-between">
            <span>Upcoming Schedule</span>
            <v-btn
              variant="text"
              color="primary"
              size="small"
              to="/schedule"
            >
              View Full Schedule
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-list v-if="upcomingSchedules.length > 0" density="compact">
              <v-list-item
                v-for="schedule in upcomingSchedules"
                :key="schedule.id"
              >
                <template #prepend>
                  <v-icon :color="getShiftColor(schedule.shift_type)">
                    {{ getShiftIcon(schedule.shift_type) }}
                  </v-icon>
                </template>
                <v-list-item-title>
                  {{ formatDate(schedule.date) }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ getShiftLabel(schedule.shift_type) }}
                  <span v-if="schedule.start_time">
                    • {{ schedule.start_time }} - {{ schedule.end_time }}
                  </span>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
            <div v-else class="text-center py-4">
              <v-icon color="grey-lighten-1">mdi-calendar-blank</v-icon>
              <p class="text-grey text-caption">No upcoming schedules</p>
            </div>
          </v-card-text>
        </v-card>

        <!-- Time Off Requests -->
        <v-card rounded="lg" class="mt-4">
          <v-card-title class="d-flex align-center justify-space-between">
            <span>Time Off Requests</span>
            <v-btn
              v-if="isOwnProfile"
              variant="text"
              color="primary"
              size="small"
              @click="requestTimeOffDialog = true"
            >
              Request Time Off
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-list v-if="timeOffRequests.length > 0" density="compact">
              <v-list-item
                v-for="request in timeOffRequests"
                :key="request.id"
              >
                <template #prepend>
                  <v-chip
                    :color="getStatusColor(request.status)"
                    size="small"
                    variant="flat"
                  >
                    {{ request.status }}
                  </v-chip>
                </template>
                <v-list-item-title>
                  {{ formatDate(request.start_date) }} - {{ formatDate(request.end_date) }}
                </v-list-item-title>
                <v-list-item-subtitle v-if="request.reason">
                  {{ request.reason }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
            <div v-else class="text-center py-4">
              <v-icon color="grey-lighten-1">mdi-calendar-check</v-icon>
              <p class="text-grey text-caption">No time off requests</p>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Request Time Off Dialog -->
    <v-dialog v-model="requestTimeOffDialog" max-width="500">
      <v-card>
        <v-card-title>Request Time Off</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="timeOffForm.start_date"
                label="Start Date"
                type="date"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="timeOffForm.end_date"
                label="End Date"
                type="date"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="timeOffForm.reason"
                label="Reason (optional)"
                rows="3"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="requestTimeOffDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="submitTimeOffRequest">Submit</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import type { ProfileWithSkills, Schedule, TimeOffRequest, ShiftType, SkillLevel, TimeOffStatus } from '~/types/database.types'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const employeeStore = useEmployeeStore()
const scheduleStore = useScheduleStore()
const uiStore = useUIStore()

const id = route.params.id as string

const isLoading = ref(true)
const error = ref('')
const employee = ref<ProfileWithSkills | null>(null)
const upcomingSchedules = ref<Schedule[]>([])
const timeOffRequests = ref<TimeOffRequest[]>([])

const requestTimeOffDialog = ref(false)
const timeOffForm = reactive({
  start_date: '',
  end_date: '',
  reason: ''
})

const isAdmin = computed(() => authStore.isAdmin)
const isOwnProfile = computed(() => authStore.profile?.id === id)
const canEditSkills = computed(() => isAdmin.value)

const allSkills = computed(() => employeeStore.skills)

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function getShiftColor(type: ShiftType): string {
  const colors: Record<ShiftType, string> = {
    morning: 'orange',
    afternoon: 'blue',
    evening: 'purple',
    'full-day': 'green',
    off: 'grey'
  }
  return colors[type]
}

function getShiftIcon(type: ShiftType): string {
  const icons: Record<ShiftType, string> = {
    morning: 'mdi-weather-sunset-up',
    afternoon: 'mdi-weather-sunny',
    evening: 'mdi-weather-sunset-down',
    'full-day': 'mdi-clock-outline',
    off: 'mdi-home'
  }
  return icons[type]
}

function getShiftLabel(type: ShiftType): string {
  const labels: Record<ShiftType, string> = {
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    'full-day': 'Full Day',
    off: 'Off'
  }
  return labels[type]
}

function getStatusColor(status: TimeOffStatus): string {
  const colors: Record<TimeOffStatus, string> = {
    pending: 'warning',
    approved: 'success',
    denied: 'error'
  }
  return colors[status]
}

async function handleUpdateSkill(skillId: string, level: SkillLevel, notes?: string) {
  try {
    await employeeStore.updateEmployeeSkill(id, skillId, level, notes)
    uiStore.showSuccess('Skill updated successfully')
  } catch {
    uiStore.showError('Failed to update skill')
  }
}

async function handleAddSkill(skillId: string, level: SkillLevel, notes?: string) {
  try {
    await employeeStore.updateEmployeeSkill(id, skillId, level, notes)
    uiStore.showSuccess('Skill added successfully')
    employee.value = await employeeStore.fetchEmployee(id)
  } catch {
    uiStore.showError('Failed to add skill')
  }
}

async function toggleActiveStatus() {
  if (!employee.value) return
  
  try {
    // This would need an API endpoint
    uiStore.showInfo('Feature coming soon')
  } catch {
    uiStore.showError('Failed to update status')
  }
}

async function submitTimeOffRequest() {
  if (!timeOffForm.start_date || !timeOffForm.end_date) {
    uiStore.showError('Please select start and end dates')
    return
  }

  try {
    await scheduleStore.requestTimeOff({
      profile_id: id,
      start_date: timeOffForm.start_date,
      end_date: timeOffForm.end_date,
      reason: timeOffForm.reason || undefined
    })
    
    requestTimeOffDialog.value = false
    uiStore.showSuccess('Time off request submitted')
    
    // Refresh data
    timeOffRequests.value = scheduleStore.timeOffForEmployee(id)
  } catch {
    uiStore.showError('Failed to submit request')
  }
}

onMounted(async () => {
  try {
    // Fetch all data
    await Promise.all([
      employeeStore.fetchSkills(),
      scheduleStore.fetchSchedules(),
      scheduleStore.fetchTimeOffRequests()
    ])

    // Fetch employee
    employee.value = await employeeStore.fetchEmployee(id)
    
    if (!employee.value) {
      error.value = 'Employee not found'
      return
    }

    // Get upcoming schedules
    const today = new Date().toISOString().split('T')[0]
    upcomingSchedules.value = scheduleStore.schedulesForEmployee(id)
      .filter(s => s.date >= today)
      .slice(0, 5)

    // Get time off requests
    timeOffRequests.value = scheduleStore.timeOffForEmployee(id)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load profile'
  } finally {
    isLoading.value = false
  }
})
</script>
