<template>
  <div class="schedule-command-center pa-4">
    <!-- Header -->
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 gap-2">
      <div>
        <h1 class="text-h5 font-weight-bold mb-1">Team Schedule Command Center</h1>
        <p class="text-body-2 text-grey-darken-1 mb-0">
          Overview of schedule status across all locations
        </p>
      </div>
      <div class="d-flex flex-wrap align-center gap-2">
        <!-- Quick Actions Menu (schedule managers only) -->
        <v-menu v-if="canManageSchedule">
          <template #activator="{ props }">
            <v-btn variant="outlined" size="small" v-bind="props">
              <v-icon start>mdi-plus</v-icon>
              Build Schedule
              <v-icon end>mdi-chevron-down</v-icon>
            </v-btn>
          </template>
          <v-list density="compact">
            <v-list-item to="/schedule/wizard" prepend-icon="mdi-wizard-hat">
              <v-list-item-title>Schedule Wizard</v-list-item-title>
              <v-list-item-subtitle>Step-by-step service-based builder</v-list-item-subtitle>
            </v-list-item>
            <v-list-item to="/schedule/builder" prepend-icon="mdi-grid">
              <v-list-item-title>Quick Builder</v-list-item-title>
              <v-list-item-subtitle>Drag-and-drop shift editor</v-list-item-subtitle>
            </v-list-item>
            <v-divider />
            <v-list-item to="/schedule/services" prepend-icon="mdi-cog">
              <v-list-item-title>Service Settings</v-list-item-title>
              <v-list-item-subtitle>Configure staffing requirements</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </div>

    <!-- Legend -->
    <div class="d-flex align-center gap-4 mb-4">
      <div class="d-flex align-center gap-2">
        <v-chip size="small" color="success" variant="flat">
          <v-icon start size="14">mdi-check-circle</v-icon>
          Published
        </v-chip>
        <v-chip size="small" color="warning" variant="flat">
          <v-icon start size="14">mdi-pencil</v-icon>
          Draft
        </v-chip>
        <v-chip size="small" color="grey-lighten-2" variant="flat" class="text-grey">
          <v-icon start size="14">mdi-minus</v-icon>
          Not Started
        </v-chip>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="d-flex justify-center align-center min-h-400">
      <v-progress-circular indeterminate color="primary" size="48" />
    </div>

    <!-- Schedule Status Grid -->
    <v-card v-else rounded="lg" elevation="1">
      <div class="schedule-grid-wrapper">
        <table class="schedule-status-grid">
          <!-- Header Row - Locations -->
          <thead>
            <tr>
              <th class="week-header">Week</th>
              <th 
                v-for="location in locations" 
                :key="location.id"
                class="location-header"
              >
                <div class="font-weight-bold">{{ location.code || getLocationAbbrev(location.name) }}</div>
                <div class="text-caption text-grey">{{ location.name }}</div>
              </th>
            </tr>
          </thead>
          
          <!-- Body - Week Rows -->
          <tbody>
            <tr 
              v-for="week in weeksWithData" 
              :key="week.date"
              :class="{ 'current-week-row': isCurrentWeek(week.date) }"
            >
              <td class="week-label">
                <div class="d-flex align-center">
                  <v-icon v-if="isCurrentWeek(week.date)" size="16" color="primary" class="mr-1">mdi-star</v-icon>
                  <div>
                    <div class="font-weight-medium">{{ formatWeekLabel(week.date) }}</div>
                    <div class="text-caption text-grey">{{ formatWeekRange(week.date) }}</div>
                  </div>
                </div>
              </td>
              <td 
                v-for="location in locations" 
                :key="`${week.date}-${location.id}`"
                class="status-cell"
                @click="navigateToSchedule(week.date, location.id)"
              >
                <div 
                  class="status-badge"
                  :class="getStatusClass(getStatus(week.date, location.id))"
                >
                  <v-icon size="16" class="mr-1">{{ getStatusIcon(getStatus(week.date, location.id)) }}</v-icon>
                  <span class="text-caption font-weight-medium">{{ getStatusLabel(getStatus(week.date, location.id)) }}</span>
                </div>
              </td>
            </tr>
            
            <!-- Empty State -->
            <tr v-if="weeksWithData.length === 0">
              <td :colspan="locations.length + 1" class="text-center pa-8 text-grey">
                <v-icon size="48" color="grey-lighten-2" class="mb-2">mdi-calendar-blank</v-icon>
                <div>No schedules have been started yet</div>
                <v-btn color="primary" class="mt-4" to="/schedule/wizard">
                  <v-icon start>mdi-plus</v-icon>
                  Create First Schedule
                </v-btn>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </v-card>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { format, parseISO, isSameWeek } from 'date-fns'
import { SECTION_ACCESS } from '~/types'
import type { UserRole } from '~/types'
import type { ScheduleLocation, ScheduleDraft } from '~/types/schedule.types'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'management']
})

const supabase = useSupabaseClient()
const router = useRouter()
const authStore = useAuthStore()

// Schedule management permission check
const canManageSchedule = computed(() => {
  const role = (authStore.profile?.role as UserRole) || 'user'
  return SECTION_ACCESS.schedules_manage.includes(role)
})

// State
const loading = ref(true)
const locations = ref<ScheduleLocation[]>([])
const scheduleDrafts = ref<ScheduleDraft[]>([])

// Snackbar
const snackbar = ref({ show: false, message: '', color: 'success' })

// Computed: Get unique weeks that have any data (draft or published)
const weeksWithData = computed(() => {
  const weekSet = new Set<string>()
  
  scheduleDrafts.value.forEach(draft => {
    // Only include non-archived drafts
    if (draft.status !== 'archived') {
      weekSet.add(draft.week_start)
    }
  })
  
  // Sort weeks descending (most recent first)
  return Array.from(weekSet)
    .sort((a, b) => b.localeCompare(a))
    .map(date => ({ date }))
})

// Methods
function getLocationAbbrev(name: string): string {
  const abbrevMap: Record<string, string> = {
    'Sherman Oaks': 'SO',
    'Venice': 'VEN',
    'Valley': 'VAL',
    'Encino': 'ENC',
    'Santa Monica': 'SM'
  }
  return abbrevMap[name] || name.substring(0, 3).toUpperCase()
}

function formatWeekLabel(weekStart: string): string {
  try {
    const date = parseISO(weekStart)
    return format(date, 'MMM d')
  } catch {
    return weekStart
  }
}

function formatWeekRange(weekStart: string): string {
  try {
    const start = parseISO(weekStart)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return `${format(start, 'M/d')} - ${format(end, 'M/d')}`
  } catch {
    return ''
  }
}

function isCurrentWeek(weekStart: string): boolean {
  try {
    const weekDate = parseISO(weekStart)
    const today = new Date()
    return isSameWeek(weekDate, today, { weekStartsOn: 1 })
  } catch {
    return false
  }
}

function getStatus(weekStart: string, locationId: string): string | null {
  const draft = scheduleDrafts.value.find(
    d => d.week_start === weekStart && d.location_id === locationId && d.status !== 'archived'
  )
  return draft?.status || null
}

function getStatusClass(status: string | null): string {
  if (!status) return 'status-none'
  if (status === 'published') return 'status-published'
  // All other statuses (building, reviewing, validated) are considered "draft"
  return 'status-draft'
}

function getStatusIcon(status: string | null): string {
  if (!status) return 'mdi-minus'
  if (status === 'published') return 'mdi-check-circle'
  return 'mdi-pencil'
}

function getStatusLabel(status: string | null): string {
  if (!status) return '—'
  if (status === 'published') return 'Published'
  // Show the specific draft stage
  const labels: Record<string, string> = {
    'building': 'Building',
    'reviewing': 'Reviewing',
    'validated': 'Validated'
  }
  return labels[status] || 'Draft'
}

function navigateToSchedule(weekStart: string, locationId: string): void {
  // Navigate to the wizard with this week/location
  router.push({
    path: '/schedule/wizard',
    query: {
      week: weekStart,
      location: locationId
    }
  })
}

// Data fetching
async function fetchLocations(): Promise<void> {
  const { data, error } = await supabase
    .from('locations')
    .select('id, name, code')
    .eq('is_active', true)
    .order('name')
  
  if (error) {
    console.error('Error fetching locations:', error)
    snackbar.value = { show: true, message: 'Failed to load locations', color: 'error' }
  }
  locations.value = data || []
}

async function fetchScheduleDrafts(): Promise<void> {
  const { data, error } = await supabase
    .from('schedule_drafts')
    .select('id, location_id, week_start, status, published_at')
    .neq('status', 'archived')
    .order('week_start', { ascending: false })
  
  if (error) {
    console.error('Error fetching schedule drafts:', error)
    snackbar.value = { show: true, message: 'Failed to load schedules', color: 'error' }
  }
  scheduleDrafts.value = data || []
}

async function fetchAllData(): Promise<void> {
  loading.value = true
  try {
    await Promise.all([
      fetchLocations(),
      fetchScheduleDrafts()
    ])
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchAllData()
})
</script>

<style scoped>
.schedule-command-center {
  max-width: 1400px;
  margin: 0 auto;
}

.schedule-grid-wrapper {
  overflow-x: auto;
}

.schedule-status-grid {
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
}

.schedule-status-grid th,
.schedule-status-grid td {
  padding: 12px 16px;
  text-align: center;
  border-bottom: 1px solid #e0e0e0;
}

.schedule-status-grid th {
  background: #f5f5f5;
  font-weight: 500;
}

.week-header {
  width: 160px;
  text-align: left !important;
  position: sticky;
  left: 0;
  background: #f5f5f5;
  z-index: 1;
}

.week-label {
  text-align: left !important;
  position: sticky;
  left: 0;
  background: white;
  z-index: 1;
}

.location-header {
  min-width: 120px;
}

.status-cell {
  cursor: pointer;
  transition: background-color 0.2s;
}

.status-cell:hover {
  background-color: #f5f5f5;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
}

.status-published {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.status-draft {
  background-color: #fff3e0;
  color: #ef6c00;
}

.status-none {
  background-color: #f5f5f5;
  color: #9e9e9e;
}

.current-week-row {
  background-color: #e3f2fd;
}

.current-week-row .week-label {
  background-color: #e3f2fd;
}

.current-week-row:hover .status-cell {
  background-color: #bbdefb;
}
</style>
