<script setup lang="ts">
/**
 * Schedule Builder - Spreadsheet Style
 * 
 * LAYOUT (matches Excel reference):
 * - Column 1: Employee Name
 * - Column 2: Wk# (shift count this week)
 * - Column 3: Hrs (total hours)
 * - Column 4: Role (position/department)
 * - Column 5: Shift (default shift time)
 * - Columns 6+: Days of week with location sub-columns
 */
import { format, addDays, startOfWeek, isSameDay } from 'date-fns'

definePageMeta({
  middleware: ['auth', 'admin-only'],
  layout: 'default'
})

// Composables
const { employees, locations } = useAppData()
const toast = useToast()
const supabase = useSupabaseClient()

// State
const currentWeekStart = ref(startOfWeek(new Date(), { weekStartsOn: 0 })) // Sunday start like Excel
const shifts = ref<any[]>([])
const isLoading = ref(true)
const editingCell = ref<string | null>(null)
const editingShift = ref<string | null>(null)

// Week days (Sun-Sat to match screenshot)
const weekDays = computed(() => {
  const days = []
  for (let i = 0; i < 7; i++) {
    days.push(addDays(currentWeekStart.value, i))
  }
  return days
})

// Active locations for columns
const activeLocations = computed(() => locations.value || [])

// Employee data with shift info
const employeeRows = computed(() => {
  return (employees.value || [])
    .filter(e => e.is_active)
    .map(emp => {
      const empShifts = shifts.value.filter(s => s.employee_id === emp.id)
      const weekHours = empShifts.reduce((acc, s) => {
        if (s.start_at && s.end_at) {
          const start = new Date(s.start_at)
          const end = new Date(s.end_at)
          return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60)
        }
        return acc
      }, 0)
      
      return {
        id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`,
        shortName: `${emp.first_name} ${emp.last_name?.charAt(0)}.`,
        role: emp.position?.title || '',
        shift: emp.default_shift || '9-5:30 (8)',
        shiftCount: empShifts.length,
        hours: Math.round(weekHours),
        color: getRoleColor(emp.position?.title || '')
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
})

// Get role-based color
function getRoleColor(role: string): string {
  const r = role.toLowerCase()
  if (r.includes('vet') && (r.includes('surgery') || r.includes('surg'))) return '#ff00ff'
  if (r.includes('vet') && r.includes('intern')) return '#ff99ff'
  if (r.includes('extern') || r.includes('student')) return '#ffccff'
  if (r.includes('surgery lead')) return '#ff66ff'
  if (r.includes('surgery tech')) return '#ff99ff'
  if (r.includes('vet') && r.includes('ap')) return '#ffff00'
  if (r.includes('ap lead')) return '#ffff66'
  if (r.includes('ap tech')) return '#ffffcc'
  if (r.includes('vet') && r.includes('nap')) return '#00ffff'
  if (r.includes('da ') || r.includes('doctor')) return '#99ffff'
  if (r.includes('da train')) return '#66ffff'
  if (r.includes('clinic tech')) return '#ccffff'
  if (r.includes('float') || r.includes('lead')) return '#ffcc00'
  if (r.includes('dental')) return '#ff9900'
  if (r.includes('vet') && r.includes('im')) return '#00ff00'
  if (r.includes('im tech')) return '#99ff99'
  if (r.includes('vet') && r.includes('exotic')) return '#00ff99'
  if (r.includes('exotic tech')) return '#99ffcc'
  if (r.includes('vet') && r.includes('mpmv')) return '#0099ff'
  if (r.includes('manager')) return '#ffffff'
  if (r.includes('admin')) return '#e0e0e0'
  if (r.includes('inventory')) return '#cccccc'
  return '#ffffff'
}

// Get shift for a specific cell
function getShiftForCell(employeeId: string, date: Date, locationId: string) {
  const dateStr = format(date, 'yyyy-MM-dd')
  return shifts.value.find(s => 
    s.employee_id === employeeId &&
    s.location_id === locationId &&
    s.start_at?.startsWith(dateStr)
  )
}

// Check if employee is scheduled at any location on this day
function isScheduledOnDay(employeeId: string, date: Date, locationId: string): boolean {
  return !!getShiftForCell(employeeId, date, locationId)
}

// Load shifts for current week
async function loadShifts() {
  isLoading.value = true
  try {
    const weekEnd = addDays(currentWeekStart.value, 7)
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .gte('start_at', currentWeekStart.value.toISOString())
      .lt('start_at', weekEnd.toISOString())
    
    if (error) throw error
    shifts.value = data || []
  } catch (err) {
    console.error('Error loading shifts:', err)
    shifts.value = []
  } finally {
    isLoading.value = false
  }
}

// Toggle shift assignment
async function toggleShift(employeeId: string, date: Date, locationId: string) {
  const existing = getShiftForCell(employeeId, date, locationId)
  const emp = employeeRows.value.find(e => e.id === employeeId)
  
  if (existing) {
    // Remove shift
    try {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', existing.id)
      
      if (error) throw error
      shifts.value = shifts.value.filter(s => s.id !== existing.id)
    } catch (err) {
      console.error('Error removing shift:', err)
      toast.error('Failed to remove shift')
    }
  } else {
    // Add shift - parse employee's default shift time
    const shiftTime = emp?.shift || '9-5:30'
    const [startStr, endStr] = shiftTime.replace(/\s*\(\d+\)/, '').split('-')
    
    const startHour = parseTimeToHour(startStr)
    const endHour = parseTimeToHour(endStr)
    
    const dateStr = format(date, 'yyyy-MM-dd')
    const startAt = `${dateStr}T${String(startHour).padStart(2, '0')}:00:00`
    const endAt = `${dateStr}T${String(endHour).padStart(2, '0')}:00:00`
    
    try {
      const { data, error } = await supabase
        .from('shifts')
        .insert({
          employee_id: employeeId,
          location_id: locationId,
          start_at: startAt,
          end_at: endAt,
          status: 'draft'
        })
        .select()
        .single()
      
      if (error) throw error
      shifts.value.push(data)
    } catch (err) {
      console.error('Error adding shift:', err)
      toast.error('Failed to add shift')
    }
  }
}

function parseTimeToHour(timeStr: string): number {
  const cleaned = timeStr.trim().toLowerCase()
  let hour = parseInt(cleaned)
  if (cleaned.includes(':')) {
    hour = parseInt(cleaned.split(':')[0])
  }
  // Assume PM for times < 7
  if (hour < 7) hour += 12
  return hour
}

// Edit shift time for employee
function startEditShift(employeeId: string) {
  editingShift.value = employeeId
}

async function saveShift(employeeId: string, newShift: string) {
  // This would save to employee's default_shift field
  // For now just update local state
  const emp = employees.value?.find(e => e.id === employeeId)
  if (emp) {
    (emp as any).default_shift = newShift
  }
  editingShift.value = null
}

// Navigation
function previousWeek() {
  currentWeekStart.value = addDays(currentWeekStart.value, -7)
}

function nextWeek() {
  currentWeekStart.value = addDays(currentWeekStart.value, 7)
}

function goToToday() {
  currentWeekStart.value = startOfWeek(new Date(), { weekStartsOn: 0 })
}

// Get week number
const weekNumber = computed(() => {
  const start = new Date(currentWeekStart.value.getFullYear(), 0, 1)
  const diff = currentWeekStart.value.getTime() - start.getTime()
  return Math.ceil((diff / (1000 * 60 * 60 * 24) + 1) / 7)
})

// Watch for week changes
watch(currentWeekStart, loadShifts)

onMounted(loadShifts)
</script>

<template>
  <div class="schedule-builder">
    <!-- Compact Header -->
    <div class="header-bar">
      <div class="header-left">
        <span class="title">Schedule Builder</span>
        <v-chip color="red" size="x-small" class="ml-1">ADMIN</v-chip>
      </div>
      <div class="header-center">
        <v-btn icon size="x-small" variant="text" @click="previousWeek">
          <v-icon size="16">mdi-chevron-left</v-icon>
        </v-btn>
        <span class="week-info">
          WEEK {{ weekNumber }} | {{ format(currentWeekStart, 'MMM d') }} - {{ format(addDays(currentWeekStart, 6), 'MMM d, yyyy') }}
        </span>
        <v-btn icon size="x-small" variant="text" @click="nextWeek">
          <v-icon size="16">mdi-chevron-right</v-icon>
        </v-btn>
        <v-btn size="x-small" variant="tonal" class="ml-2" @click="goToToday">RTD</v-btn>
      </div>
      <div class="header-right">
        <span class="text-caption">{{ format(currentWeekStart, 'MMMM').toUpperCase() }}</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="loading">
      <v-progress-circular indeterminate size="24" />
    </div>

    <!-- Main Grid -->
    <div v-else class="grid-wrapper">
      <table class="schedule-table">
        <!-- Header Row 1: Day Names -->
        <thead>
          <tr class="header-row-days">
            <th class="col-employee sticky-col">Employee</th>
            <th class="col-wk">Wk{{ weekNumber }}</th>
            <th class="col-hrs">Hrs</th>
            <th class="col-role">Role</th>
            <th class="col-shift">Shift</th>
            <th 
              v-for="day in weekDays" 
              :key="day.toISOString()"
              :colspan="activeLocations.length"
              class="col-day"
              :class="{ 'is-today': isSameDay(day, new Date()) }"
            >
              {{ format(day, 'EEEE').toUpperCase() }}
              <div class="day-date">{{ format(day, 'd') }}</div>
            </th>
          </tr>
          <!-- Header Row 2: Location Names -->
          <tr class="header-row-locs">
            <th class="col-employee sticky-col"></th>
            <th class="col-wk"></th>
            <th class="col-hrs"></th>
            <th class="col-role"></th>
            <th class="col-shift"></th>
            <template v-for="day in weekDays" :key="`loc-${day.toISOString()}`">
              <th 
                v-for="loc in activeLocations" 
                :key="`${day.toISOString()}-${loc.id}`"
                class="col-loc"
              >
                {{ loc.name?.substring(0, 6).toUpperCase() }}
              </th>
            </template>
          </tr>
        </thead>
        <!-- Body: Employee Rows -->
        <tbody>
          <tr 
            v-for="emp in employeeRows" 
            :key="emp.id"
            class="employee-row"
          >
            <td class="col-employee sticky-col">{{ emp.shortName }}</td>
            <td class="col-wk">{{ emp.shiftCount }}</td>
            <td class="col-hrs">{{ emp.hours }}</td>
            <td 
              class="col-role" 
              :style="{ backgroundColor: emp.color }"
            >
              {{ emp.role }}
            </td>
            <td 
              class="col-shift"
              @dblclick="startEditShift(emp.id)"
            >
              <template v-if="editingShift === emp.id">
                <input 
                  :value="emp.shift"
                  class="shift-input"
                  @blur="saveShift(emp.id, ($event.target as HTMLInputElement).value)"
                  @keyup.enter="saveShift(emp.id, ($event.target as HTMLInputElement).value)"
                  autofocus
                />
              </template>
              <template v-else>
                {{ emp.shift }}
              </template>
            </td>
            <!-- Day/Location cells -->
            <template v-for="day in weekDays" :key="`cells-${emp.id}-${day.toISOString()}`">
              <td 
                v-for="loc in activeLocations"
                :key="`${emp.id}-${day.toISOString()}-${loc.id}`"
                class="col-cell"
                :class="{ 
                  'is-assigned': isScheduledOnDay(emp.id, day, loc.id),
                  'is-today': isSameDay(day, new Date())
                }"
                @click="toggleShift(emp.id, day, loc.id)"
              >
                <span v-if="isScheduledOnDay(emp.id, day, loc.id)" class="assigned-marker">✓</span>
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.schedule-builder {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px);
  background: #1a1a2e;
  color: #fff;
  font-family: 'Segoe UI', Tahoma, sans-serif;
  font-size: 11px;
}

/* Header */
.header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  background: #16213e;
  border-bottom: 1px solid #0f3460;
  flex-shrink: 0;
}

.title {
  font-weight: 700;
  font-size: 13px;
}

.header-center {
  display: flex;
  align-items: center;
  gap: 4px;
}

.week-info {
  font-weight: 600;
  font-size: 11px;
  padding: 0 8px;
}

.loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Grid Wrapper */
.grid-wrapper {
  flex: 1;
  overflow: auto;
}

/* Table */
.schedule-table {
  border-collapse: collapse;
  width: max-content;
  min-width: 100%;
}

/* Header Rows */
.header-row-days th,
.header-row-locs th {
  background: #0f3460;
  color: #fff;
  font-weight: 600;
  text-align: center;
  padding: 2px 4px;
  border: 1px solid #1a1a2e;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-row-locs th {
  top: 28px;
  font-size: 9px;
  color: #aaa;
}

.day-date {
  font-size: 10px;
  font-weight: 400;
}

.col-day.is-today {
  background: #1e5128 !important;
}

/* Sticky Employee Column */
.sticky-col {
  position: sticky;
  left: 0;
  z-index: 20;
  background: #16213e;
}

/* Column Widths */
.col-employee {
  min-width: 120px;
  max-width: 120px;
  text-align: left;
  padding: 2px 4px;
  font-weight: 500;
}

.col-wk, .col-hrs {
  width: 30px;
  min-width: 30px;
  text-align: center;
  padding: 2px;
}

.col-role {
  min-width: 100px;
  max-width: 120px;
  text-align: center;
  padding: 2px 4px;
  font-weight: 600;
  font-size: 10px;
  color: #000;
}

.col-shift {
  min-width: 70px;
  max-width: 80px;
  text-align: center;
  padding: 2px 4px;
  font-size: 10px;
}

.col-loc {
  min-width: 50px;
  max-width: 60px;
  font-size: 8px;
}

.col-cell {
  min-width: 50px;
  max-width: 60px;
  height: 22px;
  text-align: center;
  cursor: pointer;
  transition: background 0.1s;
}

/* Employee Rows */
.employee-row {
  border-bottom: 1px solid #1a1a2e;
}

.employee-row:nth-child(odd) {
  background: #16213e;
}

.employee-row:nth-child(even) {
  background: #1a1a2e;
}

.employee-row td {
  border: 1px solid #0f3460;
  padding: 1px 2px;
}

.employee-row:hover {
  background: #1e3a5f;
}

/* Cell States */
.col-cell:hover {
  background: #2d4a6f !important;
}

.col-cell.is-assigned {
  background: #2e7d32 !important;
}

.col-cell.is-today {
  border-left: 2px solid #4caf50;
  border-right: 2px solid #4caf50;
}

.assigned-marker {
  color: #fff;
  font-weight: 700;
  font-size: 12px;
}

/* Shift Input */
.shift-input {
  width: 100%;
  background: #fff;
  color: #000;
  border: none;
  padding: 1px 2px;
  font-size: 10px;
  text-align: center;
}

/* Scrollbar */
.grid-wrapper::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.grid-wrapper::-webkit-scrollbar-track {
  background: #1a1a2e;
}

.grid-wrapper::-webkit-scrollbar-thumb {
  background: #0f3460;
  border-radius: 4px;
}

.grid-wrapper::-webkit-scrollbar-thumb:hover {
  background: #1e5128;
}
</style>
