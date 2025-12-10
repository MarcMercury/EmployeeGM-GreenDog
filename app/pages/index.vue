<template>
  <div>
    <!-- Welcome Section -->
    <div class="mb-6">
      <h1 class="text-h4 font-weight-bold mb-1">
        Welcome back, {{ firstName }}! 👋
      </h1>
      <p class="text-body-1 text-grey-darken-1">
        Here's what's happening at Green Dog Dental today.
      </p>
    </div>

    <!-- Stats Cards -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card class="stat-card" color="primary" variant="flat">
          <v-card-text class="text-white">
            <div class="d-flex align-center justify-space-between">
              <div>
                <p class="text-overline opacity-80 mb-1">Team Members</p>
                <p class="text-h4 font-weight-bold">{{ stats.totalEmployees }}</p>
              </div>
              <v-avatar color="rgba(255,255,255,0.2)" size="48">
                <v-icon color="white">mdi-account-group</v-icon>
              </v-avatar>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="stat-card" color="secondary" variant="flat">
          <v-card-text class="text-white">
            <div class="d-flex align-center justify-space-between">
              <div>
                <p class="text-overline opacity-80 mb-1">Working Today</p>
                <p class="text-h4 font-weight-bold">{{ stats.scheduledToday }}</p>
              </div>
              <v-avatar color="rgba(255,255,255,0.2)" size="48">
                <v-icon color="white">mdi-calendar-check</v-icon>
              </v-avatar>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="stat-card" color="accent" variant="flat">
          <v-card-text class="text-white">
            <div class="d-flex align-center justify-space-between">
              <div>
                <p class="text-overline opacity-80 mb-1">Time Off Requests</p>
                <p class="text-h4 font-weight-bold">{{ stats.pendingTimeOff }}</p>
              </div>
              <v-avatar color="rgba(255,255,255,0.2)" size="48">
                <v-icon color="white">mdi-calendar-remove</v-icon>
              </v-avatar>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="stat-card" color="success" variant="flat">
          <v-card-text class="text-white">
            <div class="d-flex align-center justify-space-between">
              <div>
                <p class="text-overline opacity-80 mb-1">My Skills</p>
                <p class="text-h4 font-weight-bold">{{ mySkillCount }}</p>
              </div>
              <v-avatar color="rgba(255,255,255,0.2)" size="48">
                <v-icon color="white">mdi-star</v-icon>
              </v-avatar>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <!-- My Profile Card -->
      <v-col cols="12" md="4">
        <h3 class="text-h6 font-weight-bold mb-4">My Profile</h3>
        <EmployeeBaseballCard
          v-if="myProfile"
          :profile="myProfile"
          :show-actions="true"
        />
        <v-skeleton-loader v-else type="card" />
      </v-col>

      <!-- Today's Schedule -->
      <v-col cols="12" md="8">
        <h3 class="text-h6 font-weight-bold mb-4">Today's Schedule</h3>
        <v-card rounded="lg">
          <v-card-text>
            <v-list v-if="todaySchedules.length > 0">
              <v-list-item
                v-for="schedule in todaySchedules"
                :key="schedule.id"
                class="mb-2"
                rounded="lg"
              >
                <template #prepend>
                  <v-avatar :color="getShiftColor(schedule.shift_type)" size="40">
                    <v-icon color="white" size="20">
                      {{ getShiftIcon(schedule.shift_type) }}
                    </v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-medium">
                  {{ getEmployeeName(schedule.profile_id) }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ schedule.start_time || 'Flexible' }} - {{ schedule.end_time || 'Flexible' }}
                </v-list-item-subtitle>
                <template #append>
                  <v-chip :color="getShiftColor(schedule.shift_type)" size="small" variant="tonal">
                    {{ getShiftLabel(schedule.shift_type) }}
                  </v-chip>
                </template>
              </v-list-item>
            </v-list>
            <div v-else class="text-center py-8">
              <v-icon size="48" color="grey-lighten-1">mdi-calendar-blank</v-icon>
              <p class="text-grey mt-2">No schedules for today</p>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Admin Section -->
    <v-row v-if="isAdmin" class="mt-4">
      <!-- Pending Time Off -->
      <v-col cols="12" md="6">
        <h3 class="text-h6 font-weight-bold mb-4">
          Pending Time Off Requests
          <v-chip v-if="pendingTimeOff.length > 0" color="warning" size="small" class="ml-2">
            {{ pendingTimeOff.length }}
          </v-chip>
        </h3>
        <v-card rounded="lg">
          <v-card-text>
            <v-list v-if="pendingTimeOff.length > 0">
              <v-list-item
                v-for="request in pendingTimeOff.slice(0, 5)"
                :key="request.id"
                class="mb-2"
                rounded="lg"
              >
                <template #prepend>
                  <v-avatar color="warning" size="40">
                    <v-icon color="white">mdi-clock-outline</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title>
                  {{ getEmployeeName(request.profile_id) }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ formatDate(request.start_date) }} - {{ formatDate(request.end_date) }}
                </v-list-item-subtitle>
                <template #append>
                  <div class="d-flex gap-1">
                    <v-btn
                      icon="mdi-check"
                      size="small"
                      color="success"
                      variant="tonal"
                      @click="approveTimeOff(request.id)"
                    />
                    <v-btn
                      icon="mdi-close"
                      size="small"
                      color="error"
                      variant="tonal"
                      @click="denyTimeOff(request.id)"
                    />
                  </div>
                </template>
              </v-list-item>
            </v-list>
            <div v-else class="text-center py-8">
              <v-icon size="48" color="grey-lighten-1">mdi-check-all</v-icon>
              <p class="text-grey mt-2">No pending requests</p>
            </div>
          </v-card-text>
          <v-card-actions v-if="pendingTimeOff.length > 5">
            <v-btn variant="text" color="primary" to="/time-off">
              View All Requests
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <!-- Quick Actions -->
      <v-col cols="12" md="6">
        <h3 class="text-h6 font-weight-bold mb-4">Quick Actions</h3>
        <v-card rounded="lg">
          <v-card-text>
            <v-row>
              <v-col cols="6">
                <v-btn
                  block
                  variant="tonal"
                  color="primary"
                  class="py-6"
                  to="/employees"
                >
                  <v-icon start size="24">mdi-account-plus</v-icon>
                  Add Employee
                </v-btn>
              </v-col>
              <v-col cols="6">
                <v-btn
                  block
                  variant="tonal"
                  color="secondary"
                  class="py-6"
                  to="/schedule"
                >
                  <v-icon start size="24">mdi-calendar-plus</v-icon>
                  Create Schedule
                </v-btn>
              </v-col>
              <v-col cols="6">
                <v-btn
                  block
                  variant="tonal"
                  color="accent"
                  class="py-6"
                  to="/skills"
                >
                  <v-icon start size="24">mdi-star-plus</v-icon>
                  Manage Skills
                </v-btn>
              </v-col>
              <v-col cols="6">
                <v-btn
                  block
                  variant="tonal"
                  color="success"
                  class="py-6"
                  to="/marketing"
                >
                  <v-icon start size="24">mdi-bullhorn</v-icon>
                  Marketing
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import type { ShiftType, ProfileWithSkills, Schedule, TimeOffRequest } from '~/types/database.types'

definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

const authStore = useAuthStore()
const employeeStore = useEmployeeStore()
const scheduleStore = useScheduleStore()
const uiStore = useUIStore()

const isAdmin = computed(() => authStore.isAdmin)
const firstName = computed(() => authStore.profile?.first_name || 'there')

const myProfile = ref<ProfileWithSkills | null>(null)
const mySkillCount = computed(() => myProfile.value?.employee_skills?.length || 0)

const todaySchedules = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return scheduleStore.schedules.filter(s => s.date === today)
})

const pendingTimeOff = computed(() => scheduleStore.pendingTimeOff)

const stats = computed(() => ({
  totalEmployees: employeeStore.activeEmployees.length,
  scheduledToday: todaySchedules.value.length,
  pendingTimeOff: pendingTimeOff.value.length,
  activeEmployees: employeeStore.activeEmployees.length
}))

// Employee name lookup
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

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

async function approveTimeOff(id: string) {
  try {
    await scheduleStore.reviewTimeOff(id, 'approved')
    uiStore.showSuccess('Time off request approved')
  } catch (error) {
    uiStore.showError('Failed to approve request')
  }
}

async function denyTimeOff(id: string) {
  try {
    await scheduleStore.reviewTimeOff(id, 'denied')
    uiStore.showSuccess('Time off request denied')
  } catch (error) {
    uiStore.showError('Failed to deny request')
  }
}

// Fetch data on mount
onMounted(async () => {
  try {
    await Promise.all([
      employeeStore.fetchEmployees(),
      scheduleStore.fetchSchedules(),
      scheduleStore.fetchTimeOffRequests()
    ])

    // Fetch my profile with skills
    if (authStore.profile?.id) {
      myProfile.value = await employeeStore.fetchEmployee(authStore.profile.id)
    }
  } catch (error) {
    console.error('Error loading dashboard data:', error)
  }
})
</script>

<style scoped>
.stat-card {
  transition: transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
}
</style>
