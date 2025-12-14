<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Marketing Calendar</h1>
        <p class="text-body-1 text-grey-darken-1">
          {{ isAdmin ? 'Visualize your events and campaigns' : 'View upcoming events and campaigns' }}
        </p>
      </div>
      <div class="d-flex gap-2">
        <!-- View Toggle -->
        <v-btn-toggle v-model="viewMode" mandatory density="compact" color="primary">
          <v-btn value="month" size="small">
            <v-icon start size="18">mdi-calendar-month</v-icon>
            Month
          </v-btn>
          <v-btn value="week" size="small">
            <v-icon start size="18">mdi-calendar-week</v-icon>
            Week
          </v-btn>
        </v-btn-toggle>
        <template v-if="isAdmin">
          <v-btn variant="outlined" :to="'/growth/events'" prepend-icon="mdi-format-list-bulleted">
            List View
          </v-btn>
          <v-btn color="primary" prepend-icon="mdi-plus" :to="'/growth/events'" @click.prevent="createEventRedirect">
            Create Event
          </v-btn>
        </template>
      </div>
    </div>

    <!-- Calendar Navigation -->
    <v-card rounded="lg" class="mb-6">
      <v-card-text class="pa-4">
        <div class="d-flex align-center justify-space-between">
          <v-btn icon="mdi-chevron-left" variant="text" @click="viewMode === 'month' ? previousMonth() : previousWeek()" />
          <div class="text-center">
            <h2 class="text-h5 font-weight-bold">{{ viewMode === 'month' ? currentMonthYear : currentWeekRange }}</h2>
            <v-btn variant="text" size="small" color="primary" @click="goToToday" class="mt-1">
              Today
            </v-btn>
          </div>
          <v-btn icon="mdi-chevron-right" variant="text" @click="viewMode === 'month' ? nextMonth() : nextWeek()" />
        </div>
      </v-card-text>
    </v-card>

    <!-- Loading State -->
    <div v-if="loading" class="d-flex justify-center py-12">
      <v-progress-circular indeterminate color="primary" size="64" />
    </div>

    <!-- Month View Calendar Grid -->
    <v-card v-else-if="viewMode === 'month'" rounded="lg">
      <!-- Day Headers -->
      <div class="calendar-header d-flex border-b">
        <div 
          v-for="day in weekDays" 
          :key="day" 
          class="calendar-header-cell flex-grow-1 text-center py-3 text-overline text-grey"
        >
          {{ day }}
        </div>
      </div>

      <!-- Calendar Weeks -->
      <div class="calendar-body">
        <div 
          v-for="(week, weekIndex) in calendarWeeks" 
          :key="weekIndex" 
          class="calendar-week d-flex border-b"
        >
          <div 
            v-for="(day, dayIndex) in week" 
            :key="`${weekIndex}-${dayIndex}`"
            class="calendar-day flex-grow-1 pa-2"
            :class="{
              'bg-grey-lighten-4': !day.isCurrentMonth,
              'bg-primary-lighten-5': day.isToday
            }"
            style="min-height: 120px; width: 14.28%;"
          >
            <!-- Day Number -->
            <div class="d-flex justify-space-between align-center mb-1">
              <span 
                class="text-caption font-weight-medium"
                :class="{
                  'text-grey': !day.isCurrentMonth,
                  'text-primary font-weight-bold': day.isToday
                }"
              >
                {{ day.date.getDate() }}
              </span>
              <v-chip
                v-if="day.isToday"
                color="primary"
                size="x-small"
                label
              >
                Today
              </v-chip>
            </div>

            <!-- Events for this day -->
            <div class="calendar-events">
              <div
                v-for="event in getEventsForDate(day.date)"
                :key="event.id"
                class="calendar-event mb-1 pa-1 rounded"
                :class="[getEventClass(event), { 'cursor-pointer': true }]"
                @click="openEventDrawer(event)"
              >
                <div class="d-flex align-center gap-1">
                  <span class="text-caption font-weight-medium text-truncate">
                    {{ event.name }}
                  </span>
                </div>
                <div v-if="event.start_time" class="text-caption opacity-70">
                  {{ formatTime(event.start_time) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </v-card>

    <!-- Week View Calendar Grid -->
    <v-card v-else rounded="lg">
      <!-- Day Headers with Dates -->
      <div class="calendar-header d-flex border-b">
        <div 
          v-for="day in currentWeekDays" 
          :key="day.date.toISOString()" 
          class="calendar-header-cell flex-grow-1 text-center py-3"
          :class="{ 'bg-primary-lighten-5': day.isToday }"
          style="width: 14.28%;"
        >
          <div class="text-overline text-grey">{{ weekDays[day.date.getDay()] }}</div>
          <div 
            class="text-h6 font-weight-bold"
            :class="{ 'text-primary': day.isToday }"
          >
            {{ day.date.getDate() }}
          </div>
        </div>
      </div>

      <!-- Week Day Columns -->
      <div class="calendar-body d-flex" style="min-height: 400px;">
        <div 
          v-for="day in currentWeekDays" 
          :key="day.date.toISOString()" 
          class="calendar-day flex-grow-1 pa-2 border-e"
          :class="{ 'bg-primary-lighten-5': day.isToday }"
          style="width: 14.28%;"
        >
          <!-- Events for this day -->
          <div class="calendar-events">
            <div
              v-for="event in getEventsForDate(day.date)"
              :key="event.id"
              class="calendar-event mb-2 pa-2 rounded"
              :class="[getEventClass(event), { 'cursor-pointer': true }]"
              @click="openEventDrawer(event)"
            >
              <div class="text-caption font-weight-bold text-truncate mb-1">
                {{ event.name }}
              </div>
              <div v-if="event.start_time" class="text-caption opacity-80">
                <v-icon size="12">mdi-clock-outline</v-icon>
                {{ formatTime(event.start_time) }}
                <template v-if="event.end_time"> - {{ formatTime(event.end_time) }}</template>
              </div>
              <div v-if="event.location" class="text-caption opacity-80 mt-1">
                <v-icon size="12">mdi-map-marker</v-icon>
                {{ event.location }}
              </div>
            </div>
            
            <!-- Empty state for day -->
            <div 
              v-if="getEventsForDate(day.date).length === 0" 
              class="text-center text-grey-lighten-1 py-8"
            >
              <v-icon size="24" color="grey-lighten-2">mdi-calendar-blank</v-icon>
              <div class="text-caption mt-1">No events</div>
            </div>
          </div>
        </div>
      </div>
    </v-card>

    <!-- Legend -->
    <v-card rounded="lg" class="mt-4">
      <v-card-text class="d-flex align-center gap-4 flex-wrap">
        <span class="text-caption text-grey mr-2">Legend:</span>
        <div class="d-flex align-center gap-2">
          <div class="legend-dot bg-info"></div>
          <span class="text-caption">Planned</span>
        </div>
        <div class="d-flex align-center gap-2">
          <div class="legend-dot bg-success"></div>
          <span class="text-caption">Confirmed</span>
        </div>
        <div class="d-flex align-center gap-2">
          <div class="legend-dot bg-grey"></div>
          <span class="text-caption">Completed</span>
        </div>
        <div class="d-flex align-center gap-2">
          <div class="legend-dot bg-error"></div>
          <span class="text-caption">Cancelled</span>
        </div>
      </v-card-text>
    </v-card>

    <!-- Event Quick View Drawer -->
    <v-navigation-drawer
      v-model="drawer"
      location="right"
      width="400"
      temporary
    >
      <template v-if="selectedEvent">
        <v-toolbar color="primary">
          <v-btn icon="mdi-close" variant="text" @click="drawer = false" />
          <v-toolbar-title>Event Details</v-toolbar-title>
          <v-spacer />
          <v-btn 
            v-if="isAdmin"
            icon="mdi-arrow-right" 
            variant="text" 
            :to="`/growth/events`" 
            title="Go to Events"
          />
        </v-toolbar>

        <div class="pa-4">
          <h2 class="text-h5 font-weight-bold mb-2">{{ selectedEvent.name }}</h2>
          
          <v-chip 
            :color="getStatusColor(selectedEvent.status)" 
            size="small" 
            label 
            class="mb-4"
          >
            {{ formatStatus(selectedEvent.status) }}
          </v-chip>

          <v-list density="compact" class="bg-transparent">
            <v-list-item>
              <template #prepend>
                <v-icon color="primary">mdi-calendar</v-icon>
              </template>
              <v-list-item-title>{{ formatDate(selectedEvent.event_date) }}</v-list-item-title>
              <v-list-item-subtitle v-if="selectedEvent.start_time">
                {{ selectedEvent.start_time }} - {{ selectedEvent.end_time || 'TBD' }}
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="selectedEvent.location">
              <template #prepend>
                <v-icon color="primary">mdi-map-marker</v-icon>
              </template>
              <v-list-item-title>{{ selectedEvent.location }}</v-list-item-title>
            </v-list-item>

            <v-list-item v-if="selectedEvent.description">
              <template #prepend>
                <v-icon color="primary">mdi-text</v-icon>
              </template>
              <v-list-item-title>{{ selectedEvent.description }}</v-list-item-title>
            </v-list-item>

            <v-list-item>
              <template #prepend>
                <v-icon color="primary">mdi-account-group</v-icon>
              </template>
              <v-list-item-title>Staffing</v-list-item-title>
              <v-list-item-subtitle>
                <v-chip 
                  :color="selectedEvent.staffing_status === 'confirmed' ? 'success' : 'warning'" 
                  size="x-small"
                  label
                >
                  {{ selectedEvent.staffing_status === 'confirmed' ? 'Ready' : 'Planning' }}
                </v-chip>
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>

          <v-divider class="my-4" />

          <div v-if="isAdmin" class="text-center">
            <v-btn 
              color="primary" 
              :to="`/growth/events`"
              prepend-icon="mdi-arrow-right"
            >
              View Full Details
            </v-btn>
          </div>
        </div>
      </template>
    </v-navigation-drawer>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

// Get admin status
const { isAdmin } = useAppData()

interface MarketingEvent {
  id: string
  name: string
  description: string | null
  event_date: string
  start_time: string | null
  end_time: string | null
  location: string | null
  staffing_status: string
  status: string
}

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
}

const router = useRouter()
const client = useSupabaseClient()

// State
const loading = ref(true)
const events = ref<MarketingEvent[]>([])
const currentDate = ref(new Date())
const drawer = ref(false)
const selectedEvent = ref<MarketingEvent | null>(null)
const viewMode = ref<'month' | 'week'>('month')

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Computed
const currentMonthYear = computed(() => {
  return currentDate.value.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  })
})

// Week view: get the start of the current week (Sunday)
const currentWeekStart = computed(() => {
  const date = new Date(currentDate.value)
  const day = date.getDay()
  date.setDate(date.getDate() - day)
  date.setHours(0, 0, 0, 0)
  return date
})

// Week view: get all 7 days of the current week
const currentWeekDays = computed((): CalendarDay[] => {
  const days: CalendarDay[] = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(currentWeekStart.value)
    date.setDate(date.getDate() + i)
    days.push({
      date,
      isCurrentMonth: date.getMonth() === currentDate.value.getMonth(),
      isToday: isToday(date)
    })
  }
  return days
})

// Week view: display range like "Dec 8 - 14, 2025"
const currentWeekRange = computed(() => {
  const start = currentWeekDays.value[0]?.date
  const end = currentWeekDays.value[6]?.date
  if (!start || !end) return ''
  
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' })
  const year = end.getFullYear()
  
  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${year}`
  } else {
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${year}`
  }
})

const calendarWeeks = computed((): CalendarDay[][] => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  const weeks: CalendarDay[][] = []
  let currentWeek: CalendarDay[] = []
  
  // Add days from previous month to fill first week
  const firstDayOfWeek = firstDay.getDay()
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month, -i)
    currentWeek.push({
      date,
      isCurrentMonth: false,
      isToday: isToday(date)
    })
  }
  
  // Add days of current month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day)
    currentWeek.push({
      date,
      isCurrentMonth: true,
      isToday: isToday(date)
    })
    
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  
  // Fill remaining days in last week
  if (currentWeek.length > 0) {
    let nextMonthDay = 1
    while (currentWeek.length < 7) {
      const date = new Date(year, month + 1, nextMonthDay++)
      currentWeek.push({
        date,
        isCurrentMonth: false,
        isToday: isToday(date)
      })
    }
    weeks.push(currentWeek)
  }
  
  return weeks
})

// Methods
const isToday = (date: Date): boolean => {
  const today = new Date()
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
}

const previousMonth = () => {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() - 1,
    1
  )
}

const nextMonth = () => {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() + 1,
    1
  )
}

const previousWeek = () => {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth(),
    currentDate.value.getDate() - 7
  )
}

const nextWeek = () => {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth(),
    currentDate.value.getDate() + 7
  )
}

const goToToday = () => {
  currentDate.value = new Date()
}

const getEventsForDate = (date: Date): MarketingEvent[] => {
  const dateStr = date.toISOString().split('T')[0]
  return events.value.filter(event => event.event_date === dateStr)
}

const getEventClass = (event: MarketingEvent): string => {
  const classes: Record<string, string> = {
    planned: 'bg-info text-white',
    confirmed: 'bg-success text-white',
    completed: 'bg-grey text-white',
    cancelled: 'bg-error text-white'
  }
  return classes[event.status] || 'bg-grey text-white'
}

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    planned: 'info',
    confirmed: 'success',
    completed: 'grey',
    cancelled: 'error'
  }
  return colors[status] || 'grey'
}

const formatStatus = (status: string): string => {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

const formatTime = (time: string): string => {
  if (!time) return ''
  const parts = time.split(':')
  if (parts.length < 2) return time
  const hours = parts[0] || '0'
  const minutes = parts[1] || '00'
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

const openEventDrawer = (event: MarketingEvent) => {
  selectedEvent.value = event
  drawer.value = true
}

const createEventRedirect = () => {
  router.push('/growth/events')
}

// Fetch events
const fetchEvents = async () => {
  loading.value = true
  try {
    const { data, error } = await client
      .from('marketing_events')
      .select('*')
      .order('event_date', { ascending: true })

    if (error) throw error
    events.value = data || []
  } catch (err) {
    console.error('Error fetching events:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchEvents()
})
</script>

<style scoped>
.calendar-header-cell {
  border-right: 1px solid rgba(0, 0, 0, 0.12);
}

.calendar-header-cell:last-child {
  border-right: none;
}

.calendar-day {
  border-right: 1px solid rgba(0, 0, 0, 0.12);
}

.calendar-day:last-child {
  border-right: none;
}

.calendar-week:last-child {
  border-bottom: none;
}

.calendar-event {
  font-size: 11px;
  line-height: 1.2;
}

.calendar-event:hover {
  opacity: 0.9;
  transform: scale(1.02);
  transition: all 0.15s ease;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

.bg-primary-lighten-5 {
  background-color: rgba(var(--v-theme-primary), 0.05);
}
</style>
