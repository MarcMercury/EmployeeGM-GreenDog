<template>
  <div class="command-center">
    <!-- Top Bar -->
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap gap-4">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">
          The Locker Room
        </h1>
        <p class="text-body-2 text-grey">
          {{ currentDate }} • Welcome back, {{ firstName }}
        </p>
      </div>

      <!-- Quick Actions -->
      <div class="d-flex gap-2">
        <v-btn color="primary" prepend-icon="mdi-calendar-plus" variant="flat" @click="quickAddShift">
          Add Shift
        </v-btn>
        <v-btn color="secondary" prepend-icon="mdi-calendar-star" variant="flat" @click="quickAddEvent" v-if="isAdmin">
          New Event
        </v-btn>
        <v-btn color="warning" prepend-icon="mdi-alert-circle" variant="tonal" @click="quickLogIncident" v-if="isAdmin">
          Log Incident
        </v-btn>
      </div>
    </div>

    <!-- Alert Banner (if any open shifts) -->
    <v-alert 
      v-if="openShiftsCount > 0" 
      type="error" 
      variant="tonal" 
      class="mb-6"
      prominent
    >
      <template #prepend>
        <v-icon>mdi-alert-circle</v-icon>
      </template>
      <v-alert-title>{{ openShiftsCount }} Open Shift{{ openShiftsCount > 1 ? 's' : '' }} Need Coverage</v-alert-title>
      <span class="text-body-2">Review and assign staff to fill these positions.</span>
      <template #append>
        <v-btn color="error" variant="flat" size="small" to="/schedule">View Schedule</v-btn>
      </template>
    </v-alert>

    <!-- Stats Overview Row -->
    <v-row class="mb-6">
      <v-col cols="6" sm="3">
        <v-card class="stat-card h-100" variant="outlined">
          <v-card-text class="text-center pa-4">
            <v-icon size="32" color="primary" class="mb-2">mdi-account-group</v-icon>
            <div class="text-h4 font-weight-bold">{{ stats.totalStaff }}</div>
            <div class="text-caption text-grey">Total Staff</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card class="stat-card h-100" variant="outlined">
          <v-card-text class="text-center pa-4">
            <v-icon size="32" color="success" class="mb-2">mdi-calendar-check</v-icon>
            <div class="text-h4 font-weight-bold">{{ stats.onShiftToday }}</div>
            <div class="text-caption text-grey">On Shift Today</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card class="stat-card h-100" variant="outlined">
          <v-card-text class="text-center pa-4">
            <v-icon size="32" color="warning" class="mb-2">mdi-clock-alert</v-icon>
            <div class="text-h4 font-weight-bold">{{ stats.pendingRequests }}</div>
            <div class="text-caption text-grey">Pending Requests</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card class="stat-card h-100" variant="outlined">
          <v-card-text class="text-center pa-4">
            <v-icon size="32" color="info" class="mb-2">mdi-account-supervisor</v-icon>
            <div class="text-h4 font-weight-bold">{{ stats.activeMentorships }}</div>
            <div class="text-caption text-grey">Active Mentorships</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Main Widget Grid -->
    <v-row>
      <!-- Team Health Card -->
      <v-col cols="12" md="6" lg="4">
        <v-card class="h-100" variant="outlined">
          <v-card-title class="d-flex align-center">
            <v-icon color="success" class="mr-2">mdi-heart-pulse</v-icon>
            Team Health
          </v-card-title>
          <v-card-text>
            <div class="d-flex align-center justify-space-between mb-4">
              <div class="text-center">
                <div class="text-h3 font-weight-bold text-success">{{ teamHealth.compliant }}</div>
                <div class="text-caption">Compliant</div>
              </div>
              <v-progress-circular
                :model-value="teamHealth.percentage"
                :size="80"
                :width="8"
                :color="teamHealth.percentage >= 80 ? 'success' : teamHealth.percentage >= 60 ? 'warning' : 'error'"
              >
                {{ teamHealth.percentage }}%
              </v-progress-circular>
              <div class="text-center">
                <div class="text-h3 font-weight-bold text-error">{{ teamHealth.expired }}</div>
                <div class="text-caption">Expired Certs</div>
              </div>
            </div>
            <v-divider class="mb-3" />
            <div class="text-caption text-grey">
              <v-icon size="14" class="mr-1">mdi-information</v-icon>
              {{ teamHealth.expired }} staff need certification renewal
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Mentorship Ticker -->
      <v-col cols="12" md="6" lg="4">
        <v-card class="h-100" variant="outlined">
          <v-card-title class="d-flex align-center justify-space-between">
            <div>
              <v-icon color="amber" class="mr-2">mdi-account-supervisor</v-icon>
              Mentorship Matches
            </div>
            <v-chip v-if="pendingMentorships.length > 0" color="warning" size="small">
              {{ pendingMentorships.length }}
            </v-chip>
          </v-card-title>
          <v-card-text>
            <v-list v-if="pendingMentorships.length > 0" density="compact" class="bg-transparent">
              <v-list-item
                v-for="match in pendingMentorships.slice(0, 3)"
                :key="match.id"
                class="px-0"
              >
                <template #prepend>
                  <v-avatar size="32" color="blue-lighten-4">
                    <span class="text-caption font-weight-bold text-blue">L1</span>
                  </v-avatar>
                </template>
                <v-list-item-title class="text-body-2">
                  {{ match.learnerName }}
                </v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                  wants to learn <strong>{{ match.skillName }}</strong>
                </v-list-item-subtitle>
                <template #append>
                  <div class="d-flex align-center gap-1">
                    <v-icon size="14" color="grey">mdi-arrow-right</v-icon>
                    <v-avatar size="24" color="amber-lighten-4">
                      <span class="text-caption font-weight-bold text-amber-darken-3">M</span>
                    </v-avatar>
                    <v-btn icon size="x-small" color="success" variant="tonal" @click="approveMentorship(match.id)">
                      <v-icon size="14">mdi-check</v-icon>
                    </v-btn>
                  </div>
                </template>
              </v-list-item>
            </v-list>
            <div v-else class="text-center py-6">
              <v-icon size="40" color="grey-lighten-2">mdi-account-check</v-icon>
              <p class="text-caption text-grey mt-2">No pending matches</p>
            </div>
          </v-card-text>
          <v-card-actions v-if="pendingMentorships.length > 3">
            <v-btn variant="text" color="primary" size="small" to="/mentorship">View All</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <!-- Growth Pulse (Admin Only) -->
      <v-col cols="12" md="6" lg="4" v-if="isAdmin">
        <v-card class="h-100" variant="outlined">
          <v-card-title class="d-flex align-center">
            <v-icon color="purple" class="mr-2">mdi-rocket-launch</v-icon>
            Growth Pulse
          </v-card-title>
          <v-card-text>
            <div class="d-flex align-center justify-space-between mb-4">
              <div>
                <div class="text-h3 font-weight-bold">{{ growthStats.leadsThisWeek }}</div>
                <div class="text-caption text-grey">Leads This Week</div>
              </div>
              <div class="text-right">
                <div class="text-h5 text-grey">/ {{ growthStats.weeklyGoal }}</div>
                <div class="text-caption text-grey">Goal</div>
              </div>
            </div>
            <v-progress-linear
              :model-value="(growthStats.leadsThisWeek / growthStats.weeklyGoal) * 100"
              :color="growthStats.leadsThisWeek >= growthStats.weeklyGoal ? 'success' : 'purple'"
              height="8"
              rounded
              class="mb-3"
            />
            <div class="d-flex justify-space-between text-caption">
              <span>
                <v-icon size="14" color="success" class="mr-1">mdi-trending-up</v-icon>
                {{ growthStats.conversionRate }}% conversion
              </span>
              <span class="text-grey">{{ growthStats.upcomingEvents }} events this month</span>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-btn variant="text" color="primary" size="small" to="/leads">View Leads</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <!-- Upcoming Ops (Next 48 Hours) -->
      <v-col cols="12" :lg="isAdmin ? 8 : 12">
        <v-card variant="outlined">
          <v-card-title class="d-flex align-center justify-space-between">
            <div>
              <v-icon color="blue" class="mr-2">mdi-calendar-clock</v-icon>
              Upcoming Ops (48h)
            </div>
            <v-btn variant="text" color="primary" size="small" to="/schedule">Full Schedule</v-btn>
          </v-card-title>
          <v-card-text>
            <v-table density="compact" v-if="upcomingShifts.length > 0">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Staff</th>
                  <th>Role</th>
                  <th>Location</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="shift in upcomingShifts.slice(0, 6)" :key="shift.id">
                  <td class="text-caption">{{ formatShiftTime(shift) }}</td>
                  <td>
                    <div class="d-flex align-center gap-2">
                      <v-avatar size="24" :color="shift.employee ? 'primary' : 'error'">
                        <span class="text-caption text-white">{{ shift.employee?.initials || '?' }}</span>
                      </v-avatar>
                      <span class="text-body-2">{{ shift.employee?.name || 'OPEN' }}</span>
                    </div>
                  </td>
                  <td class="text-caption">{{ shift.role }}</td>
                  <td class="text-caption">{{ shift.location }}</td>
                  <td>
                    <v-chip 
                      :color="shift.employee ? 'success' : 'error'" 
                      size="x-small" 
                      variant="flat"
                    >
                      {{ shift.employee ? 'Filled' : 'Open' }}
                    </v-chip>
                  </td>
                </tr>
              </tbody>
            </v-table>
            <div v-else class="text-center py-8">
              <v-icon size="48" color="grey-lighten-2">mdi-calendar-blank</v-icon>
              <p class="text-grey mt-2">No upcoming shifts</p>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- My Profile Card (Non-Admin) -->
      <v-col cols="12" lg="4" v-if="!isAdmin">
        <v-card variant="outlined" class="h-100">
          <v-card-title class="d-flex align-center">
            <v-icon color="primary" class="mr-2">mdi-account-card</v-icon>
            My Profile
          </v-card-title>
          <v-card-text class="text-center">
            <v-avatar size="80" color="primary" class="mb-3">
              <v-img v-if="userStore.profile?.avatar_url" :src="userStore.profile.avatar_url" />
              <span v-else class="text-h4 text-white">{{ userStore.initials }}</span>
            </v-avatar>
            <h3 class="text-h6">{{ userStore.fullName }}</h3>
            <p class="text-caption text-grey mb-3">{{ userStore.jobTitle }}</p>
            <div class="d-flex justify-center gap-2 mb-3">
              <v-chip size="small" color="primary" variant="tonal">{{ userStore.departmentName || 'No Dept' }}</v-chip>
              <v-chip size="small" color="secondary" variant="tonal">{{ userStore.locationName || 'No Location' }}</v-chip>
            </div>
            <v-btn color="primary" variant="tonal" block to="/profile">View Full Profile</v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Quick Add Dialogs -->
    <v-dialog v-model="showShiftDialog" max-width="400">
      <v-card>
        <v-card-title>Add Shift</v-card-title>
        <v-card-text>
          <p class="text-body-2 text-grey">Quick shift creation coming soon!</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showShiftDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showEventDialog" max-width="400">
      <v-card>
        <v-card-title>New Event</v-card-title>
        <v-card-text>
          <p class="text-body-2 text-grey">Event creation coming soon!</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showEventDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showIncidentDialog" max-width="400">
      <v-card>
        <v-card-title>Log Incident</v-card-title>
        <v-card-text>
          <p class="text-body-2 text-grey">Incident logging coming soon!</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showIncidentDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

const authStore = useAuthStore()
const userStore = useUserStore()

const isAdmin = computed(() => authStore.isAdmin)
const firstName = computed(() => authStore.profile?.first_name || 'there')

const currentDate = computed(() => {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

// Dialog states
const showShiftDialog = ref(false)
const showEventDialog = ref(false)
const showIncidentDialog = ref(false)

// Quick action handlers
function quickAddShift() {
  showShiftDialog.value = true
}

function quickAddEvent() {
  showEventDialog.value = true
}

function quickLogIncident() {
  showIncidentDialog.value = true
}

// Mock data - will be replaced with real API calls
const stats = ref({
  totalStaff: 24,
  onShiftToday: 8,
  pendingRequests: 3,
  activeMentorships: 5
})

const openShiftsCount = ref(2)

const teamHealth = ref({
  compliant: 21,
  expired: 3,
  percentage: 87
})

const pendingMentorships = ref([
  { id: '1', learnerName: 'Sarah M.', skillName: 'IV Catheter', mentorName: 'Mike R.' },
  { id: '2', learnerName: 'John D.', skillName: 'Dental Prophy', mentorName: 'Lisa T.' }
])

const growthStats = ref({
  leadsThisWeek: 12,
  weeklyGoal: 10,
  conversionRate: 23,
  upcomingEvents: 2
})

const upcomingShifts = ref([
  { id: '1', date: 'Today', time: '8:00 AM - 4:00 PM', employee: { name: 'Sarah Miller', initials: 'SM' }, role: 'Vet Tech', location: 'Sherman Oaks' },
  { id: '2', date: 'Today', time: '9:00 AM - 5:00 PM', employee: { name: 'John Davis', initials: 'JD' }, role: 'CSR', location: 'Venice' },
  { id: '3', date: 'Today', time: '12:00 PM - 8:00 PM', employee: null, role: 'Vet Tech', location: 'The Valley' },
  { id: '4', date: 'Tomorrow', time: '8:00 AM - 4:00 PM', employee: { name: 'Lisa Thompson', initials: 'LT' }, role: 'DVM', location: 'Sherman Oaks' },
  { id: '5', date: 'Tomorrow', time: '10:00 AM - 6:00 PM', employee: null, role: 'Receptionist', location: 'Venice' }
])

function formatShiftTime(shift: any) {
  return `${shift.date} ${shift.time.split(' - ')[0]}`
}

function approveMentorship(id: string) {
  pendingMentorships.value = pendingMentorships.value.filter(m => m.id !== id)
}

// Fetch real data on mount
onMounted(async () => {
  await userStore.fetchUserData()
  // TODO: Fetch real stats from API
})
</script>

<style scoped>
.command-center {
  max-width: 1400px;
}

.stat-card {
  transition: all 0.2s ease;
}

.stat-card:hover {
  border-color: rgb(var(--v-theme-primary));
  transform: translateY(-2px);
}

.h-100 {
  height: 100%;
}
</style>
