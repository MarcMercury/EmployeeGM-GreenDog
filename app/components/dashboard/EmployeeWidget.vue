<script setup lang="ts">
/**
 * EmployeeWidget Component
 * 
 * Dashboard widget for regular employees showing:
 * - My schedule (upcoming shifts)
 * - My time-off requests
 * - My training progress
 */

const client = useSupabaseClient()
const authStore = useAuthStore()

const loading = ref(true)
const error = ref<string | null>(null)

// Widget data
const upcomingShifts = ref<any[]>([])
const timeOffRequests = ref<any[]>([])
const trainingProgress = ref<any[]>([])

const stats = ref({
  shiftsThisWeek: 0,
  hoursThisWeek: 0,
  ptoBalance: 0,
  coursesInProgress: 0
})

async function fetchData() {
  if (!authStore.profile?.id) return
  
  loading.value = true
  error.value = null
  
  try {
    const userId = authStore.profile.id
    const today = new Date().toISOString().split('T')[0]
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    // Fetch upcoming shifts (next 7 days) - gracefully handle if table doesn't exist
    try {
      const { data: shifts } = await client
        .from('schedule_entries')
        .select('*, shift_template:shift_templates(*)')
        .eq('employee_id', userId)
        .gte('date', today)
        .lte('date', nextWeek)
        .order('date', { ascending: true })
        .limit(5)
      
      upcomingShifts.value = shifts || []
      
      // Calculate hours this week
      let totalHours = 0
      shifts?.forEach(shift => {
        if (shift.shift_template?.start_time && shift.shift_template?.end_time) {
          const start = parseTime(shift.shift_template.start_time)
          const end = parseTime(shift.shift_template.end_time)
          totalHours += (end - start) / 60
        }
      })
      
      stats.value.shiftsThisWeek = shifts?.length || 0
      stats.value.hoursThisWeek = Math.round(totalHours)
    } catch {
      // schedule_entries table may not exist yet
      upcomingShifts.value = []
      stats.value.shiftsThisWeek = 0
      stats.value.hoursThisWeek = 0
    }
    
    // Fetch time-off requests
    try {
      const { data: timeOff } = await client
        .from('time_off_requests')
        .select('*')
        .eq('employee_id', userId)
        .gte('end_date', today)
        .order('start_date', { ascending: true })
        .limit(3)
      
      timeOffRequests.value = timeOff || []
    } catch {
      timeOffRequests.value = []
    }
    
    // Fetch training progress - use user_id and correct status enum values
    try {
      const { data: enrollments } = await client
        .from('course_enrollments')
        .select('*, course:courses(id, title, category, est_minutes)')
        .eq('user_id', userId)
        .in('status', ['assigned', 'in_progress'])
        .order('assigned_at', { ascending: false })
        .limit(3)
      
      trainingProgress.value = (enrollments || []).map(e => ({
        ...e,
        progress: e.progress_percent || 0
      }))
      stats.value.coursesInProgress = enrollments?.length || 0
    } catch {
      // course_enrollments table may not exist
      trainingProgress.value = []
      stats.value.coursesInProgress = 0
    }
    
    // Get PTO balance from profile if available
    stats.value.ptoBalance = authStore.profile?.pto_balance || 0
    
  } catch (err: any) {
    console.error('[EmployeeWidget] Error:', err)
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

function formatShiftTime(start: string, end: string): string {
  const formatTime = (t: string) => {
    const [h, m] = t.split(':')
    const hour = parseInt(h)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const h12 = hour % 12 || 12
    return `${h12}:${m} ${ampm}`
  }
  return `${formatTime(start)} - ${formatTime(end)}`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'warning',
    approved: 'success',
    denied: 'error',
    enrolled: 'info',
    in_progress: 'primary',
    completed: 'success'
  }
  return colors[status] || 'grey'
}

onMounted(fetchData)
</script>

<template>
  <v-card variant="outlined" rounded="lg" class="h-100">
    <v-card-title class="d-flex align-center">
      <v-icon color="primary" class="mr-2">mdi-view-dashboard</v-icon>
      My Overview
    </v-card-title>
    
    <v-card-text v-if="loading">
      <v-skeleton-loader type="article" />
    </v-card-text>
    
    <v-card-text v-else-if="error">
      <v-alert type="error" variant="tonal">{{ error }}</v-alert>
    </v-card-text>
    
    <v-card-text v-else>
      <!-- Stats Row -->
      <v-row dense class="mb-4">
        <v-col cols="3">
          <div class="text-center">
            <div class="text-h5 font-weight-bold text-primary">{{ stats.shiftsThisWeek }}</div>
            <div class="text-caption text-medium-emphasis">Shifts</div>
          </div>
        </v-col>
        <v-col cols="3">
          <div class="text-center">
            <div class="text-h5 font-weight-bold text-success">{{ stats.hoursThisWeek }}h</div>
            <div class="text-caption text-medium-emphasis">Hours</div>
          </div>
        </v-col>
        <v-col cols="3">
          <div class="text-center">
            <div class="text-h5 font-weight-bold text-info">{{ stats.ptoBalance }}</div>
            <div class="text-caption text-medium-emphasis">PTO Days</div>
          </div>
        </v-col>
        <v-col cols="3">
          <div class="text-center">
            <div class="text-h5 font-weight-bold text-warning">{{ stats.coursesInProgress }}</div>
            <div class="text-caption text-medium-emphasis">Courses</div>
          </div>
        </v-col>
      </v-row>
      
      <v-divider class="mb-4" />
      
      <!-- Upcoming Shifts -->
      <div class="mb-4">
        <span class="text-subtitle-2 font-weight-bold">Upcoming Shifts</span>
        <v-list v-if="upcomingShifts.length > 0" density="compact" class="pa-0 mt-2">
          <v-list-item
            v-for="shift in upcomingShifts"
            :key="shift.id"
            class="px-0"
          >
            <template #prepend>
              <v-icon color="primary" size="small">mdi-calendar</v-icon>
            </template>
            <v-list-item-title class="text-body-2">
              {{ formatDate(shift.date) }}
            </v-list-item-title>
            <v-list-item-subtitle class="text-caption">
              {{ shift.shift_template ? formatShiftTime(shift.shift_template.start_time, shift.shift_template.end_time) : 'TBD' }}
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
        <div v-else class="text-center text-medium-emphasis text-caption py-2">
          No upcoming shifts
        </div>
      </div>
      
      <!-- Time Off Requests -->
      <div v-if="timeOffRequests.length > 0" class="mb-4">
        <span class="text-subtitle-2 font-weight-bold">Time Off Requests</span>
        <v-list density="compact" class="pa-0 mt-2">
          <v-list-item
            v-for="request in timeOffRequests"
            :key="request.id"
            class="px-0"
          >
            <template #prepend>
              <v-icon :color="getStatusColor(request.status)" size="small">mdi-beach</v-icon>
            </template>
            <v-list-item-title class="text-body-2">
              {{ request.request_type }}
            </v-list-item-title>
            <v-list-item-subtitle class="text-caption">
              {{ new Date(request.start_date).toLocaleDateString() }} - {{ new Date(request.end_date).toLocaleDateString() }}
            </v-list-item-subtitle>
            <template #append>
              <v-chip :color="getStatusColor(request.status)" size="x-small" variant="tonal">
                {{ request.status }}
              </v-chip>
            </template>
          </v-list-item>
        </v-list>
      </div>
      
      <!-- Training Progress -->
      <div v-if="trainingProgress.length > 0">
        <span class="text-subtitle-2 font-weight-bold">Training In Progress</span>
        <v-list density="compact" class="pa-0 mt-2">
          <v-list-item
            v-for="enrollment in trainingProgress"
            :key="enrollment.id"
            class="px-0"
          >
            <template #prepend>
              <v-icon color="warning" size="small">mdi-school</v-icon>
            </template>
            <v-list-item-title class="text-body-2">
              {{ enrollment.course?.title }}
            </v-list-item-title>
            <v-list-item-subtitle class="text-caption">
              {{ enrollment.course?.category }} • {{ enrollment.progress || 0 }}% complete
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </div>
    </v-card-text>
    
    <v-card-actions>
      <v-btn variant="text" size="small" to="/my-schedule" prepend-icon="mdi-calendar">
        My Schedule
      </v-btn>
      <v-spacer />
      <v-btn variant="text" size="small" to="/training" prepend-icon="mdi-school">
        Training
      </v-btn>
    </v-card-actions>
  </v-card>
</template>
