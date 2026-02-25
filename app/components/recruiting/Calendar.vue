<template>
  <div>
    <!-- Calendar Header -->
    <div class="d-flex align-center justify-space-between mb-4">
      <div class="d-flex align-center gap-2">
        <v-btn icon="mdi-chevron-left" variant="text" size="small" @click="prevMonth" />
        <h2 class="text-h5 font-weight-bold">
          {{ monthLabel }}
        </h2>
        <v-btn icon="mdi-chevron-right" variant="text" size="small" @click="nextMonth" />
        <v-btn variant="tonal" size="small" class="ml-2" @click="goToToday">Today</v-btn>
      </div>
      <div class="d-flex align-center gap-3">
        <!-- Legend -->
        <div class="d-flex align-center gap-3 flex-wrap">
          <span v-for="leg in legend" :key="leg.type" class="d-flex align-center gap-1 text-caption">
            <span class="legend-dot" :style="{ background: leg.color }" />
            {{ leg.label }}
          </span>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <template v-if="loading">
      <v-card rounded="lg" class="pa-8">
        <div class="d-flex justify-center align-center" style="min-height: 400px;">
          <v-progress-circular indeterminate color="primary" size="48" />
        </div>
      </v-card>
    </template>

    <!-- Calendar Grid -->
    <template v-else>
      <v-card rounded="lg" variant="outlined" class="calendar-card">
        <!-- Day-of-week headers -->
        <div class="calendar-header-row">
          <div v-for="day in dayNames" :key="day" class="calendar-header-cell text-caption font-weight-bold text-grey-darken-1">
            {{ day }}
          </div>
        </div>

        <!-- Calendar weeks -->
        <div v-for="(week, wi) in calendarWeeks" :key="wi" class="calendar-week-row">
          <div
            v-for="(cell, ci) in week"
            :key="ci"
            class="calendar-day-cell"
            :class="{
              'is-today': cell.isToday,
              'is-other-month': !cell.isCurrentMonth,
            }"
          >
            <div class="day-number" :class="{ 'today-badge': cell.isToday }">
              {{ cell.day }}
            </div>
            <div class="day-events">
              <div
                v-for="(ev, ei) in cell.events.slice(0, 3)"
                :key="ei"
                class="calendar-event"
                :style="{ backgroundColor: ev.color + '22', borderLeft: `3px solid ${ev.color}` }"
                :title="`${ev.label}: ${ev.candidateName}`"
              >
                <span class="event-icon">{{ ev.icon }}</span>
                <span class="event-text">{{ ev.candidateName }}</span>
              </div>
              <div v-if="cell.events.length > 3" class="text-caption text-grey-darken-1 mt-1 pl-1">
                +{{ cell.events.length - 3 }} more
              </div>
            </div>
          </div>
        </div>
      </v-card>

      <!-- Upcoming Events Summary -->
      <v-row class="mt-4">
        <v-col cols="12" md="6">
          <v-card rounded="lg" variant="outlined">
            <v-card-title class="text-subtitle-1 d-flex align-center gap-2">
              <v-icon color="primary" size="20">mdi-calendar-clock</v-icon>
              Upcoming This Week
            </v-card-title>
            <v-card-text v-if="upcomingThisWeek.length === 0">
              <p class="text-body-2 text-grey">No upcoming events this week.</p>
            </v-card-text>
            <v-list v-else density="compact" class="py-0">
              <v-list-item
                v-for="ev in upcomingThisWeek"
                :key="ev.id"
                :title="ev.candidateName"
                :subtitle="`${ev.label} — ${formatDate(ev.date)}`"
                class="px-4"
              >
                <template #prepend>
                  <span class="mr-2">{{ ev.icon }}</span>
                </template>
                <template #append>
                  <v-chip :color="ev.chipColor" size="x-small" label>{{ ev.label }}</v-chip>
                </template>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card rounded="lg" variant="outlined">
            <v-card-title class="text-subtitle-1 d-flex align-center gap-2">
              <v-icon color="warning" size="20">mdi-alert-circle-outline</v-icon>
              Quick Stats
            </v-card-title>
            <v-card-text>
              <div class="d-flex flex-wrap gap-4">
                <div v-for="stat in quickStats" :key="stat.label" class="text-center">
                  <div class="text-h5 font-weight-bold" :style="{ color: stat.color }">{{ stat.value }}</div>
                  <div class="text-caption text-grey-darken-1">{{ stat.label }}</div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </div>
</template>

<script setup lang="ts">
interface CalendarEvent {
  id: string
  date: string
  type: 'interview_scheduled' | 'interview_completed' | 'hired' | 'start_date' | 'applied' | 'offer'
  candidateName: string
  label: string
  icon: string
  color: string
  chipColor: string
}

interface CalendarCell {
  day: number
  isToday: boolean
  isCurrentMonth: boolean
  date: Date
  events: CalendarEvent[]
}

const client = useSupabaseClient()
const loading = ref(true)
const calendarEvents = ref<CalendarEvent[]>([])
const currentDate = ref(new Date())

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const legend = [
  { type: 'interview_scheduled', label: 'Scheduled Interview', color: '#FB8C00' },
  { type: 'interview_completed', label: 'Completed Interview', color: '#43A047' },
  { type: 'offer', label: 'Offer Extended', color: '#7E57C2' },
  { type: 'hired', label: 'Hired', color: '#1E88E5' },
  { type: 'start_date', label: 'Start Date', color: '#00897B' },
  { type: 'applied', label: 'Applied', color: '#78909C' },
]

const monthLabel = computed(() => {
  return currentDate.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const prevMonth = () => {
  const d = new Date(currentDate.value)
  d.setMonth(d.getMonth() - 1)
  currentDate.value = d
}

const nextMonth = () => {
  const d = new Date(currentDate.value)
  d.setMonth(d.getMonth() + 1)
  currentDate.value = d
}

const goToToday = () => {
  currentDate.value = new Date()
}

const calendarWeeks = computed((): CalendarCell[][] => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const today = new Date()

  const weeks: CalendarCell[][] = []
  let week: CalendarCell[] = []

  // Fill leading days from previous month
  const startDow = firstDay.getDay()
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    week.push(makeCell(d, false, today))
  }

  // Current month days
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const d = new Date(year, month, day)
    week.push(makeCell(d, true, today))
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }

  // Fill trailing days
  if (week.length > 0) {
    let nextDay = 1
    while (week.length < 7) {
      const d = new Date(year, month + 1, nextDay++)
      week.push(makeCell(d, false, today))
    }
    weeks.push(week)
  }

  return weeks
})

function makeCell(date: Date, isCurrentMonth: boolean, today: Date): CalendarCell {
  const dateStr = formatDateKey(date)
  const isToday = date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()

  return {
    day: date.getDate(),
    isToday,
    isCurrentMonth,
    date,
    events: calendarEvents.value.filter(e => e.date === dateStr)
  }
}

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

// Upcoming this week
const upcomingThisWeek = computed(() => {
  const today = new Date()
  const endOfWeek = new Date(today)
  endOfWeek.setDate(today.getDate() + (7 - today.getDay()))
  const todayStr = formatDateKey(today)
  const endStr = formatDateKey(endOfWeek)

  return calendarEvents.value
    .filter(e => e.date >= todayStr && e.date <= endStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8)
})

// Quick Stats
const quickStats = computed(() => {
  const now = new Date()
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const thisMonthEvents = calendarEvents.value.filter(e => e.date.startsWith(thisMonthKey))

  return [
    {
      label: 'Interviews This Month',
      value: thisMonthEvents.filter(e => e.type === 'interview_scheduled' || e.type === 'interview_completed').length,
      color: '#FB8C00'
    },
    {
      label: 'Offers This Month',
      value: thisMonthEvents.filter(e => e.type === 'offer').length,
      color: '#7E57C2'
    },
    {
      label: 'Hires This Month',
      value: thisMonthEvents.filter(e => e.type === 'hired').length,
      color: '#1E88E5'
    },
    {
      label: 'Starting This Month',
      value: thisMonthEvents.filter(e => e.type === 'start_date').length,
      color: '#00897B'
    },
  ]
})

// ---- Data Fetching ----
async function fetchCalendarData() {
  loading.value = true
  try {
    const events: CalendarEvent[] = []

    // 1) Fetch candidates with applied_at, status dates
    const { data: candidates, error: candError } = await client
      .from('candidates')
      .select('id, first_name, last_name, status, applied_at, hired_at, start_date, offer_date')
      .order('applied_at', { ascending: false })

    if (candError) throw candError

    for (const c of candidates || []) {
      const name = `${c.first_name || ''} ${c.last_name || ''}`.trim()

      if (c.applied_at) {
        events.push({
          id: `applied-${c.id}`,
          date: c.applied_at.substring(0, 10),
          type: 'applied',
          candidateName: name,
          label: 'Applied',
          icon: '📩',
          color: '#78909C',
          chipColor: 'grey',
        })
      }

      if (c.offer_date) {
        events.push({
          id: `offer-${c.id}`,
          date: c.offer_date.substring(0, 10),
          type: 'offer',
          candidateName: name,
          label: 'Offer',
          icon: '🤝',
          color: '#7E57C2',
          chipColor: 'purple',
        })
      }

      if (c.hired_at) {
        events.push({
          id: `hired-${c.id}`,
          date: c.hired_at.substring(0, 10),
          type: 'hired',
          candidateName: name,
          label: 'Hired',
          icon: '✅',
          color: '#1E88E5',
          chipColor: 'primary',
        })
      }

      if (c.start_date) {
        events.push({
          id: `start-${c.id}`,
          date: c.start_date.substring(0, 10),
          type: 'start_date',
          candidateName: name,
          label: 'Start Date',
          icon: '🚀',
          color: '#00897B',
          chipColor: 'teal',
        })
      }
    }

    // 2) Fetch interviews
    const { data: interviews, error: intError } = await client
      .from('candidate_interviews')
      .select('id, candidate_id, scheduled_at, status, candidates(first_name, last_name)')
      .order('scheduled_at', { ascending: false })

    if (!intError && interviews) {
      for (const iv of interviews) {
        if (!iv.scheduled_at) continue
        const cand = iv.candidates as any
        const name = cand ? `${cand.first_name || ''} ${cand.last_name || ''}`.trim() : 'Unknown'
        const isCompleted = iv.status === 'completed'

        events.push({
          id: `interview-${iv.id}`,
          date: iv.scheduled_at.substring(0, 10),
          type: isCompleted ? 'interview_completed' : 'interview_scheduled',
          candidateName: name,
          label: isCompleted ? 'Interview Done' : 'Interview',
          icon: isCompleted ? '✔️' : '🗓️',
          color: isCompleted ? '#43A047' : '#FB8C00',
          chipColor: isCompleted ? 'success' : 'warning',
        })
      }
    }

    // 3) Also check onboarding target_start_date
    const { data: onboardings, error: obError } = await client
      .from('onboardings')
      .select('id, target_start_date, actual_start_date, candidates(first_name, last_name)')

    if (!obError && onboardings) {
      for (const ob of onboardings) {
        const cand = ob.candidates as any
        const name = cand ? `${cand.first_name || ''} ${cand.last_name || ''}`.trim() : 'Unknown'
        const startDate = ob.actual_start_date || ob.target_start_date
        if (startDate && !events.some(e => e.type === 'start_date' && e.date === startDate.substring(0, 10) && e.candidateName === name)) {
          events.push({
            id: `onboard-start-${ob.id}`,
            date: startDate.substring(0, 10),
            type: 'start_date',
            candidateName: name,
            label: 'Start Date',
            icon: '🚀',
            color: '#00897B',
            chipColor: 'teal',
          })
        }
      }
    }

    calendarEvents.value = events
  } catch (err) {
    console.error('Error loading recruiting calendar data:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchCalendarData()
})
</script>

<style scoped>
.calendar-card {
  overflow: hidden;
}

.calendar-header-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: rgba(var(--v-theme-primary), 0.06);
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.calendar-header-cell {
  padding: 10px 8px;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.calendar-week-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.calendar-week-row:last-child {
  border-bottom: none;
}

.calendar-day-cell {
  min-height: 110px;
  padding: 6px;
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  position: relative;
  transition: background-color 0.15s;
}

.calendar-day-cell:last-child {
  border-right: none;
}

.calendar-day-cell:hover {
  background: rgba(var(--v-theme-primary), 0.03);
}

.calendar-day-cell.is-today {
  background: rgba(var(--v-theme-primary), 0.06);
}

.calendar-day-cell.is-other-month {
  opacity: 0.4;
}

.day-number {
  font-size: 0.8rem;
  font-weight: 500;
  margin-bottom: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.day-number.today-badge {
  background: rgb(var(--v-theme-primary));
  color: white;
  font-weight: 700;
}

.day-events {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.calendar-event {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: default;
}

.event-icon {
  font-size: 0.7rem;
  flex-shrink: 0;
}

.event-text {
  overflow: hidden;
  text-overflow: ellipsis;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}
</style>
