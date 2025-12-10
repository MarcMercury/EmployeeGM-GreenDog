<template>
  <div class="command-center">
    <!-- Top Bar -->
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap gap-4">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">
          Command Center
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

    <!-- Stats Overview Row - Desktop-first: 4 columns -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card class="stat-card h-100" variant="outlined">
          <v-card-text class="text-center pa-4">
            <v-icon size="32" color="primary" class="mb-2">mdi-account-group</v-icon>
            <div class="text-h4 font-weight-bold">{{ stats.totalStaff }}</div>
            <div class="text-caption text-grey">Total Staff</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card class="stat-card h-100" variant="outlined">
          <v-card-text class="text-center pa-4">
            <v-icon size="32" color="success" class="mb-2">mdi-calendar-check</v-icon>
            <div class="text-h4 font-weight-bold">{{ stats.onShiftToday }}</div>
            <div class="text-caption text-grey">On Shift Today</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card class="stat-card h-100" variant="outlined">
          <v-card-text class="text-center pa-4">
            <v-icon size="32" color="warning" class="mb-2">mdi-clock-alert</v-icon>
            <div class="text-h4 font-weight-bold">{{ stats.pendingRequests }}</div>
            <div class="text-caption text-grey">Pending Requests</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
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
    
    <!-- Add Shift Dialog -->
    <v-dialog v-model="showShiftDialog" max-width="500" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="primary" class="mr-2">mdi-calendar-plus</v-icon>
          Quick Add Shift
        </v-card-title>
        <v-card-text>
          <v-form ref="shiftFormRef" v-model="shiftFormValid">
            <v-autocomplete
              v-model="shiftForm.employee_id"
              :items="employeeOptions"
              item-title="name"
              item-value="id"
              label="Employee"
              variant="outlined"
              density="compact"
              class="mb-3"
              :rules="[v => !!v || 'Employee is required']"
            />
            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="shiftForm.date"
                  label="Date"
                  type="date"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Date is required']"
                />
              </v-col>
              <v-col cols="6">
                <v-select
                  v-model="shiftForm.shift_template_id"
                  :items="shiftTemplates"
                  item-title="name"
                  item-value="id"
                  label="Shift Template"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="shiftForm.start_time"
                  label="Start Time"
                  type="time"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Start time is required']"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="shiftForm.end_time"
                  label="End Time"
                  type="time"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'End time is required']"
                />
              </v-col>
            </v-row>
            <v-textarea
              v-model="shiftForm.notes"
              label="Notes (optional)"
              variant="outlined"
              density="compact"
              rows="2"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeShiftDialog">Cancel</v-btn>
          <v-btn color="primary" variant="flat" :loading="savingShift" @click="saveQuickShift">
            Create Shift
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- New Event Dialog -->
    <v-dialog v-model="showEventDialog" max-width="500" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="secondary" class="mr-2">mdi-calendar-star</v-icon>
          New Event
        </v-card-title>
        <v-card-text>
          <v-form ref="eventFormRef" v-model="eventFormValid">
            <v-text-field
              v-model="eventForm.name"
              label="Event Name"
              variant="outlined"
              density="compact"
              class="mb-3"
              :rules="[v => !!v || 'Event name is required']"
            />
            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="eventForm.start_date"
                  label="Start Date"
                  type="date"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Start date is required']"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="eventForm.end_date"
                  label="End Date"
                  type="date"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>
            <v-select
              v-model="eventForm.event_type"
              :items="['meeting', 'training', 'team_building', 'company_wide', 'other']"
              label="Event Type"
              variant="outlined"
              density="compact"
              class="mb-3"
            />
            <v-textarea
              v-model="eventForm.description"
              label="Description"
              variant="outlined"
              density="compact"
              rows="3"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeEventDialog">Cancel</v-btn>
          <v-btn color="secondary" variant="flat" :loading="savingEvent" @click="saveQuickEvent">
            Create Event
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Log Incident Dialog -->
    <v-dialog v-model="showIncidentDialog" max-width="500" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="warning" class="mr-2">mdi-alert-circle</v-icon>
          Log Incident
        </v-card-title>
        <v-card-text>
          <v-form ref="incidentFormRef" v-model="incidentFormValid">
            <v-text-field
              v-model="incidentForm.title"
              label="Incident Title"
              variant="outlined"
              density="compact"
              class="mb-3"
              :rules="[v => !!v || 'Title is required']"
            />
            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="incidentForm.date"
                  label="Date"
                  type="date"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Date is required']"
                />
              </v-col>
              <v-col cols="6">
                <v-select
                  v-model="incidentForm.severity"
                  :items="['low', 'medium', 'high', 'critical']"
                  label="Severity"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Severity is required']"
                />
              </v-col>
            </v-row>
            <v-autocomplete
              v-model="incidentForm.involved_employees"
              :items="employeeOptions"
              item-title="name"
              item-value="id"
              label="Involved Employees"
              variant="outlined"
              density="compact"
              multiple
              chips
              closable-chips
              class="mb-3"
            />
            <v-textarea
              v-model="incidentForm.description"
              label="Description"
              variant="outlined"
              density="compact"
              rows="3"
              :rules="[v => !!v || 'Description is required']"
            />
            <v-textarea
              v-model="incidentForm.resolution"
              label="Resolution / Action Taken"
              variant="outlined"
              density="compact"
              rows="2"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeIncidentDialog">Cancel</v-btn>
          <v-btn color="warning" variant="flat" :loading="savingIncident" @click="saveQuickIncident">
            Log Incident
          </v-btn>
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

const supabase = useSupabaseClient()
const authStore = useAuthStore()
const userStore = useUserStore()
const dashboardStore = useDashboardStore()

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

// Form refs and validation
const shiftFormRef = ref()
const eventFormRef = ref()
const incidentFormRef = ref()
const shiftFormValid = ref(false)
const eventFormValid = ref(false)
const incidentFormValid = ref(false)

// Loading states
const savingShift = ref(false)
const savingEvent = ref(false)
const savingIncident = ref(false)

// Form data
const shiftForm = reactive({
  employee_id: null as string | null,
  date: new Date().toISOString().split('T')[0],
  shift_template_id: null as string | null,
  start_time: '09:00',
  end_time: '17:30',
  notes: ''
})

const eventForm = reactive({
  name: '',
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  event_type: 'meeting',
  description: ''
})

const incidentForm = reactive({
  title: '',
  date: new Date().toISOString().split('T')[0],
  severity: 'low',
  involved_employees: [] as string[],
  description: '',
  resolution: ''
})

// Options data
const employeeOptions = ref<{ id: string; name: string }[]>([])
const shiftTemplates = ref<{ id: string; name: string }[]>([])

// Load options when dialogs open
watch(showShiftDialog, async (val) => {
  if (val && employeeOptions.value.length === 0) {
    await loadEmployeeOptions()
    await loadShiftTemplates()
  }
})

watch(showEventDialog, async (val) => {
  if (val) resetEventForm()
})

watch(showIncidentDialog, async (val) => {
  if (val && employeeOptions.value.length === 0) {
    await loadEmployeeOptions()
  }
})

async function loadEmployeeOptions() {
  const { data } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('is_active', true)
    .order('first_name')
  
  if (data) {
    employeeOptions.value = data.map(e => ({
      id: e.id,
      name: `${e.first_name} ${e.last_name}`
    }))
  }
}

async function loadShiftTemplates() {
  const { data } = await supabase
    .from('shift_templates')
    .select('id, name')
    .order('name')
  
  if (data) {
    shiftTemplates.value = data
  }
}

// Quick action handlers
function quickAddShift() {
  resetShiftForm()
  showShiftDialog.value = true
}

function quickAddEvent() {
  resetEventForm()
  showEventDialog.value = true
}

function quickLogIncident() {
  resetIncidentForm()
  showIncidentDialog.value = true
}

// Reset form functions
function resetShiftForm() {
  shiftForm.employee_id = null
  shiftForm.date = new Date().toISOString().split('T')[0]
  shiftForm.shift_template_id = null
  shiftForm.start_time = '09:00'
  shiftForm.end_time = '17:30'
  shiftForm.notes = ''
}

function resetEventForm() {
  eventForm.name = ''
  eventForm.start_date = new Date().toISOString().split('T')[0]
  eventForm.end_date = ''
  eventForm.event_type = 'meeting'
  eventForm.description = ''
}

function resetIncidentForm() {
  incidentForm.title = ''
  incidentForm.date = new Date().toISOString().split('T')[0]
  incidentForm.severity = 'low'
  incidentForm.involved_employees = []
  incidentForm.description = ''
  incidentForm.resolution = ''
}

// Close dialogs
function closeShiftDialog() {
  showShiftDialog.value = false
  resetShiftForm()
}

function closeEventDialog() {
  showEventDialog.value = false
  resetEventForm()
}

function closeIncidentDialog() {
  showIncidentDialog.value = false
  resetIncidentForm()
}

// Save functions
async function saveQuickShift() {
  if (shiftFormRef.value) {
    const { valid } = await shiftFormRef.value.validate()
    if (!valid) return
  }
  
  savingShift.value = true
  try {
    const { error } = await supabase.from('schedules').insert({
      employee_id: shiftForm.employee_id,
      date: shiftForm.date,
      shift_template_id: shiftForm.shift_template_id,
      start_time: shiftForm.start_time,
      end_time: shiftForm.end_time,
      notes: shiftForm.notes || null,
      status: 'scheduled',
      created_by: authStore.profile?.id
    })
    
    if (error) throw error
    
    closeShiftDialog()
    // Refresh dashboard data
    await dashboardStore.fetchDashboardData()
  } catch (err) {
    console.error('Error creating shift:', err)
  } finally {
    savingShift.value = false
  }
}

async function saveQuickEvent() {
  if (eventFormRef.value) {
    const { valid } = await eventFormRef.value.validate()
    if (!valid) return
  }
  
  savingEvent.value = true
  try {
    const { error } = await supabase.from('events').insert({
      name: eventForm.name,
      start_date: eventForm.start_date,
      end_date: eventForm.end_date || eventForm.start_date,
      event_type: eventForm.event_type,
      description: eventForm.description || null,
      created_by: authStore.profile?.id
    })
    
    if (error) throw error
    
    closeEventDialog()
  } catch (err) {
    console.error('Error creating event:', err)
  } finally {
    savingEvent.value = false
  }
}

async function saveQuickIncident() {
  if (incidentFormRef.value) {
    const { valid } = await incidentFormRef.value.validate()
    if (!valid) return
  }
  
  savingIncident.value = true
  try {
    const { error } = await supabase.from('incidents').insert({
      title: incidentForm.title,
      incident_date: incidentForm.date,
      severity: incidentForm.severity,
      description: incidentForm.description,
      resolution: incidentForm.resolution || null,
      reported_by: authStore.profile?.id,
      status: incidentForm.resolution ? 'resolved' : 'open'
    })
    
    if (error) throw error
    
    closeIncidentDialog()
  } catch (err) {
    console.error('Error logging incident:', err)
  } finally {
    savingIncident.value = false
  }
}

// Use real data from store
const stats = computed(() => dashboardStore.stats)
const openShiftsCount = computed(() => dashboardStore.openShiftsCount)
const teamHealth = computed(() => dashboardStore.teamHealth)
const pendingMentorships = computed(() => dashboardStore.pendingMentorships)
const growthStats = computed(() => dashboardStore.growthStats)
const upcomingShifts = computed(() => dashboardStore.upcomingShifts)

function formatShiftTime(shift: any) {
  return `${shift.date} ${shift.time.split(' - ')[0]}`
}

async function approveMentorship(id: string) {
  try {
    await dashboardStore.approveMentorship(id)
  } catch (err) {
    console.error('Error approving mentorship:', err)
  }
}

// Fetch real data on mount
onMounted(async () => {
  await Promise.all([
    userStore.fetchUserData(),
    dashboardStore.fetchDashboardData()
  ])
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
