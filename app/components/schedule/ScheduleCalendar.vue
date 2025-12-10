<template>
  <v-card class="schedule-calendar" :elevation="2" rounded="lg">
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-center gap-2">
        <v-btn icon="mdi-chevron-left" variant="text" @click="navigatePrevious" />
        <span class="text-h6">{{ headerTitle }}</span>
        <v-btn icon="mdi-chevron-right" variant="text" @click="navigateNext" />
      </div>
      
      <div class="d-flex align-center gap-2">
        <v-btn variant="outlined" size="small" @click="goToToday">
          Today
        </v-btn>
        <v-btn-toggle v-model="viewMode" mandatory density="compact" color="primary">
          <v-btn value="day" size="small">Day</v-btn>
          <v-btn value="week" size="small">Week</v-btn>
          <v-btn value="month" size="small">Month</v-btn>
        </v-btn-toggle>
      </div>
    </v-card-title>

    <v-divider />

    <v-card-text class="pa-0">
      <!-- Week View -->
      <div v-if="viewMode === 'week'" class="week-view">
        <div class="week-header">
          <div 
            v-for="day in weekDays" 
            :key="day.date"
            :class="['week-day-header', { today: day.isToday }]"
          >
            <span class="day-name">{{ day.dayName }}</span>
            <span class="day-number">{{ day.dayNumber }}</span>
          </div>
        </div>
        
        <div class="week-body">
          <div 
            v-for="day in weekDays" 
            :key="day.date"
            :class="['week-day-cell', { today: day.isToday }]"
            @click="selectDate(day.date)"
          >
            <div 
              v-for="schedule in getSchedulesForDate(day.date)"
              :key="schedule.id"
              :class="['schedule-item', schedule.shift_type]"
              @click.stop="$emit('scheduleClick', schedule)"
            >
              <span class="schedule-time">
                {{ schedule.start_time || getShiftLabel(schedule.shift_type) }}
              </span>
              <span v-if="showEmployee" class="schedule-employee">
                {{ getEmployeeName(schedule.profile_id) }}
              </span>
            </div>
            
            <v-btn
              v-if="editable && getSchedulesForDate(day.date).length === 0"
              icon="mdi-plus"
              size="x-small"
              variant="text"
              color="grey"
              class="add-schedule-btn"
              @click.stop="$emit('addSchedule', day.date)"
            />
          </div>
        </div>
      </div>

      <!-- Day View -->
      <div v-else-if="viewMode === 'day'" class="day-view pa-4">
        <h3 class="text-h6 mb-4">{{ formatDate(selectedDate) }}</h3>
        
        <v-list v-if="todaySchedules.length > 0">
          <v-list-item
            v-for="schedule in todaySchedules"
            :key="schedule.id"
            :class="['schedule-list-item', schedule.shift_type]"
            @click="$emit('scheduleClick', schedule)"
          >
            <template #prepend>
              <v-icon :color="getShiftColor(schedule.shift_type)">
                {{ getShiftIcon(schedule.shift_type) }}
              </v-icon>
            </template>
            <v-list-item-title>
              {{ showEmployee ? getEmployeeName(schedule.profile_id) : getShiftLabel(schedule.shift_type) }}
            </v-list-item-title>
            <v-list-item-subtitle>
              {{ schedule.start_time }} - {{ schedule.end_time }}
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>

        <div v-else class="text-center py-8">
          <v-icon size="48" color="grey-lighten-1">mdi-calendar-blank</v-icon>
          <p class="text-grey mt-2">No schedules for this day</p>
          <v-btn 
            v-if="editable" 
            variant="outlined" 
            color="primary" 
            class="mt-2"
            @click="$emit('addSchedule', selectedDate)"
          >
            Add Schedule
          </v-btn>
        </div>
      </div>

      <!-- Month View -->
      <div v-else-if="viewMode === 'month'" class="month-view">
        <div class="month-header">
          <div v-for="dayName in dayNames" :key="dayName" class="month-day-header">
            {{ dayName }}
          </div>
        </div>
        
        <div class="month-body">
          <div 
            v-for="week in monthWeeks" 
            :key="week[0].date"
            class="month-week"
          >
            <div 
              v-for="day in week" 
              :key="day.date"
              :class="[
                'month-day-cell',
                { 
                  today: day.isToday,
                  'other-month': !day.isCurrentMonth,
                  'has-schedules': getSchedulesForDate(day.date).length > 0
                }
              ]"
              @click="selectDate(day.date)"
            >
              <span class="day-number">{{ day.dayNumber }}</span>
              <div class="schedule-dots">
                <span 
                  v-for="(schedule, i) in getSchedulesForDate(day.date).slice(0, 3)"
                  :key="i"
                  :class="['schedule-dot', schedule.shift_type]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { Schedule, ShiftType } from '~/types/database.types'

interface Props {
  schedules: Schedule[]
  selectedDate: string
  viewMode: 'day' | 'week' | 'month'
  editable?: boolean
  showEmployee?: boolean
  employeeNames?: Record<string, string>
}

const props = withDefaults(defineProps<Props>(), {
  editable: false,
  showEmployee: false,
  employeeNames: () => ({})
})

const emit = defineEmits<{
  'update:selectedDate': [date: string]
  'update:viewMode': [mode: 'day' | 'week' | 'month']
  scheduleClick: [schedule: Schedule]
  addSchedule: [date: string]
}>()

const viewMode = computed({
  get: () => props.viewMode,
  set: (value) => emit('update:viewMode', value)
})

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const headerTitle = computed(() => {
  const date = new Date(props.selectedDate)
  
  if (props.viewMode === 'day') {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    })
  } else if (props.viewMode === 'week') {
    const weekStart = getWeekStart(date)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    
    return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  } else {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }
})

const weekDays = computed(() => {
  const start = getWeekStart(new Date(props.selectedDate))
  const days = []
  const today = new Date().toISOString().split('T')[0]
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    
    days.push({
      date: dateStr,
      dayName: dayNames[d.getDay()],
      dayNumber: d.getDate(),
      isToday: dateStr === today
    })
  }
  
  return days
})

const monthWeeks = computed(() => {
  const date = new Date(props.selectedDate)
  const year = date.getFullYear()
  const month = date.getMonth()
  const today = new Date().toISOString().split('T')[0]
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  const weeks = []
  let currentWeek = []
  
  // Add days from previous month
  const firstDayOfWeek = firstDay.getDay()
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(firstDay)
    d.setDate(d.getDate() - i - 1)
    currentWeek.push({
      date: d.toISOString().split('T')[0],
      dayNumber: d.getDate(),
      isToday: d.toISOString().split('T')[0] === today,
      isCurrentMonth: false
    })
  }
  
  // Add days of current month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const d = new Date(year, month, day)
    const dateStr = d.toISOString().split('T')[0]
    
    currentWeek.push({
      date: dateStr,
      dayNumber: day,
      isToday: dateStr === today,
      isCurrentMonth: true
    })
    
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  
  // Add remaining days from next month
  if (currentWeek.length > 0) {
    let nextDay = 1
    while (currentWeek.length < 7) {
      const d = new Date(year, month + 1, nextDay++)
      currentWeek.push({
        date: d.toISOString().split('T')[0],
        dayNumber: d.getDate(),
        isToday: false,
        isCurrentMonth: false
      })
    }
    weeks.push(currentWeek)
  }
  
  return weeks
})

const todaySchedules = computed(() => {
  return props.schedules.filter(s => s.date === props.selectedDate)
})

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  return d
}

function getSchedulesForDate(date: string): Schedule[] {
  return props.schedules.filter(s => s.date === date)
}

function selectDate(date: string) {
  emit('update:selectedDate', date)
}

function navigatePrevious() {
  const current = new Date(props.selectedDate)
  
  switch (props.viewMode) {
    case 'day':
      current.setDate(current.getDate() - 1)
      break
    case 'week':
      current.setDate(current.getDate() - 7)
      break
    case 'month':
      current.setMonth(current.getMonth() - 1)
      break
  }
  
  emit('update:selectedDate', current.toISOString().split('T')[0])
}

function navigateNext() {
  const current = new Date(props.selectedDate)
  
  switch (props.viewMode) {
    case 'day':
      current.setDate(current.getDate() + 1)
      break
    case 'week':
      current.setDate(current.getDate() + 7)
      break
    case 'month':
      current.setMonth(current.getMonth() + 1)
      break
  }
  
  emit('update:selectedDate', current.toISOString().split('T')[0])
}

function goToToday() {
  emit('update:selectedDate', new Date().toISOString().split('T')[0])
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function getEmployeeName(profileId: string): string {
  return props.employeeNames[profileId] || 'Unknown'
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
</script>

<style scoped>
.schedule-calendar {
  height: 100%;
  min-height: 400px;
}

/* Week View */
.week-view {
  display: flex;
  flex-direction: column;
}

.week-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.week-day-header {
  padding: 12px 8px;
  text-align: center;
  background: #fafafa;
}

.week-day-header.today {
  background: rgba(46, 125, 50, 0.1);
}

.day-name {
  display: block;
  font-size: 0.75rem;
  color: #666;
}

.day-number {
  display: block;
  font-size: 1.25rem;
  font-weight: 500;
}

.week-body {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  min-height: 200px;
}

.week-day-cell {
  border-right: 1px solid rgba(0, 0, 0, 0.08);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  padding: 8px;
  min-height: 120px;
  cursor: pointer;
  position: relative;
}

.week-day-cell:last-child {
  border-right: none;
}

.week-day-cell.today {
  background: rgba(46, 125, 50, 0.05);
}

.week-day-cell:hover {
  background: rgba(0, 0, 0, 0.02);
}

.schedule-item {
  font-size: 0.75rem;
  padding: 4px 8px;
  border-radius: 4px;
  margin-bottom: 4px;
  cursor: pointer;
}

.schedule-item.morning {
  background: rgba(255, 152, 0, 0.15);
  color: #e65100;
}

.schedule-item.afternoon {
  background: rgba(33, 150, 243, 0.15);
  color: #1565c0;
}

.schedule-item.evening {
  background: rgba(156, 39, 176, 0.15);
  color: #7b1fa2;
}

.schedule-item.full-day {
  background: rgba(76, 175, 80, 0.15);
  color: #2e7d32;
}

.schedule-item.off {
  background: rgba(158, 158, 158, 0.15);
  color: #616161;
}

.add-schedule-btn {
  position: absolute;
  bottom: 8px;
  right: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.week-day-cell:hover .add-schedule-btn {
  opacity: 1;
}

/* Month View */
.month-view {
  display: flex;
  flex-direction: column;
}

.month-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.month-day-header {
  padding: 12px 8px;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 500;
  color: #666;
  background: #fafafa;
}

.month-body {
  display: flex;
  flex-direction: column;
}

.month-week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.month-day-cell {
  aspect-ratio: 1;
  padding: 4px;
  border-right: 1px solid rgba(0, 0, 0, 0.08);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.month-day-cell:last-child {
  border-right: none;
}

.month-day-cell.other-month {
  color: #bbb;
}

.month-day-cell.today {
  background: rgba(46, 125, 50, 0.1);
}

.month-day-cell.today .day-number {
  background: #2e7d32;
  color: white;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.month-day-cell:hover {
  background: rgba(0, 0, 0, 0.02);
}

.schedule-dots {
  display: flex;
  gap: 2px;
  margin-top: 4px;
}

.schedule-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.schedule-dot.morning { background: #FF9800; }
.schedule-dot.afternoon { background: #2196F3; }
.schedule-dot.evening { background: #9C27B0; }
.schedule-dot.full-day { background: #4CAF50; }
.schedule-dot.off { background: #9E9E9E; }

/* Day View */
.schedule-list-item {
  border-radius: 8px;
  margin-bottom: 8px;
}
</style>
