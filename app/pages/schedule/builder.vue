<script setup lang="ts">
/**
 * Schedule Builder (Phase 3)
 * 
 * LAYOUT:
 * - LEFT SIDEBAR: Employee Roster (independent, filterable, drag source)
 * - MAIN GRID: Shifts as ROWS (grouped by Service), Days/Locations as COLUMNS
 * 
 * Data Sources (Database-driven):
 * - services: Defines service types (Surgery, NAP, AP, IM, etc.)
 * - service_staffing_requirements: Defines roles needed per service
 * - Shifts created reference service_id and staffing_requirement_id
 */
import { format, addDays, startOfWeek, isSameDay } from 'date-fns'

definePageMeta({
  middleware: ['auth', 'admin-only'],
  layout: 'default'
})

// Types
interface Service {
  id: string
  name: string
  code: string
  color: string
  icon?: string
  sort_order: number
  is_active: boolean
}

interface StaffingRequirement {
  id: string
  service_id: string
  role_category: string
  role_label: string
  min_count: number
  max_count: number
  is_required: boolean
  priority: number
  sort_order: number
}

interface ShiftRow {
  id: string
  service_id: string
  staffing_requirement_id: string | null
  role_label: string
  role_category: string
  start_time: string
  end_time: string
  raw_shift: string
  color: string
  isBreak?: boolean
  service_code?: string
}

// Composables
const { employees, locations, positions } = useAppData()
const toast = useToast()
const supabase = useSupabaseClient()
const { 
  validateShiftAssignment, 
  getWeeklyHoursSummary,
  shouldBlockAssignment,
  showValidationToast 
} = useScheduleValidation()

// Types for Time Off
interface TimeOffRequest {
  id: string
  employee_id: string
  start_date: string
  end_date: string
  status: 'pending' | 'approved' | 'denied' | 'cancelled'
  employees?: { first_name: string; last_name: string }
}

// State
const currentWeekStart = ref(startOfWeek(new Date(), { weekStartsOn: 0 }))
const services = ref<Service[]>([])
const staffingRequirements = ref<StaffingRequirement[]>([])
const shiftRows = ref<ShiftRow[]>([]) // Built from services + requirements
const shifts = ref<any[]>([])
const timeOffRequests = ref<TimeOffRequest[]>([])
const isLoading = ref(true)
const employeeHours = ref(new Map<string, { hours: number; shiftCount: number }>())

// Roster filters
const rosterPositionFilter = ref<string | null>(null)

// Location filters - track which locations are visible
const visibleLocationIds = ref<Set<string>>(new Set())

// Initialize visible locations when locations load
watch(() => locations.value, (locs) => {
  if (locs?.length && visibleLocationIds.value.size === 0) {
    visibleLocationIds.value = new Set(locs.map(l => l.id))
  }
}, { immediate: true })

// Drag state
const draggedEmployee = ref<any>(null)
const dragOverCell = ref<string | null>(null)

// Shift editing state
const editDialog = ref(false)
const editingRow = ref<ShiftRow | null>(null)
const editForm = ref({
  role_label: '',
  raw_shift: '',
  start_time: '',
  end_time: '',
  color: '#f5f5f5'
})

// Publishing state
const isPublishing = ref(false)
const publishDialog = ref(false)

// Default shift times by role category
const defaultShiftTimes: Record<string, { start: string, end: string, display: string }> = {
  DVM: { start: '09:00', end: '18:30', display: '9-6:30' },
  Lead: { start: '08:30', end: '17:00', display: '8:30-5' },
  Tech: { start: '09:00', end: '17:30', display: '9-5:30' },
  DA: { start: '09:00', end: '18:30', display: '9-6:30' },
  Intern: { start: '09:00', end: '17:30', display: '9-5:30' },
  Admin: { start: '09:30', end: '18:00', display: '9:30-6' },
  Float: { start: '10:00', end: '18:30', display: '10-6:30' }
}

// Week days
const weekDays = computed(() => {
  const days = []
  for (let i = 0; i < 7; i++) {
    days.push(addDays(currentWeekStart.value, i))
  }
  return days
})

// Location abbreviations
function getLocAbbrev(name: string): string {
  const n = (name || '').toLowerCase()
  if (n.includes('venice')) return 'VEN'
  if (n.includes('sherman')) return 'SO'
  if (n.includes('valley') || n.includes('van')) return 'VAN'
  if (n.includes('afina') || n.includes('altadena')) return 'AFI'
  return name?.substring(0, 3).toUpperCase() || '???'
}

// Active locations - filtered by visibility toggle
const activeLocations = computed(() => {
  const all = locations.value || []
  if (visibleLocationIds.value.size === 0) return all
  return all.filter(loc => visibleLocationIds.value.has(loc.id))
})

// Toggle location visibility
function toggleLocation(locId: string) {
  const newSet = new Set(visibleLocationIds.value)
  if (newSet.has(locId)) {
    // Don't allow hiding all locations
    if (newSet.size > 1) {
      newSet.delete(locId)
    }
  } else {
    newSet.add(locId)
  }
  visibleLocationIds.value = newSet
}

// Check if location is visible
function isLocationVisible(locId: string): boolean {
  return visibleLocationIds.value.has(locId)
}

// Position options for filter
const positionOptions = computed(() => {
  const pos = positions.value || []
  return [{ title: 'All Positions', value: null }, ...pos.map(p => ({ title: p.title, value: p.id }))]
})

// Filtered roster employees
const rosterEmployees = computed(() => {
  let result = (employees.value || []).filter(e => e.is_active)
  
  if (rosterPositionFilter.value) {
    result = result.filter(e => e.position?.id === rosterPositionFilter.value)
  }
  
  return result.sort((a, b) => (a.first_name || '').localeCompare(b.first_name || ''))
})

// Get shift count for employee in current week
function getWeekShiftCount(employeeId: string): number {
  return shifts.value.filter(s => s.employee_id === employeeId).length
}

// Get employee hours for current week
function getEmployeeWeekHours(employeeId: string): number {
  const info = employeeHours.value.get(employeeId)
  return info?.hours || 0
}

// Get hours display color based on thresholds
function getHoursColor(hours: number): string {
  if (hours > 40) return 'error' // Overtime
  if (hours > 35) return 'warning' // Approaching overtime
  if (hours > 0) return 'success' // Normal scheduled
  return 'grey' // Not scheduled
}

// Recalculate employee hours from shifts
function recalculateEmployeeHours() {
  const hoursMap = new Map<string, { hours: number; shiftCount: number }>()
  
  for (const shift of shifts.value) {
    if (!shift.employee_id || !shift.start_at || !shift.end_at) continue
    
    const start = new Date(shift.start_at)
    const end = new Date(shift.end_at)
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    
    const existing = hoursMap.get(shift.employee_id)
    if (existing) {
      existing.hours += hours
      existing.shiftCount++
    } else {
      hoursMap.set(shift.employee_id, { hours, shiftCount: 1 })
    }
  }
  
  employeeHours.value = hoursMap
}

// Get role color - uses service color
function getRoleColor(row: ShiftRow): string {
  if (row.color) return row.color
  // Fallback based on role category
  const cat = (row.role_category || '').toLowerCase()
  if (cat.includes('dvm')) return '#ff00ff'
  if (cat.includes('lead')) return '#ffcc00'
  if (cat.includes('tech')) return '#00ffff'
  if (cat.includes('da')) return '#99ffff'
  if (cat.includes('intern')) return '#ff99ff'
  if (cat.includes('admin')) return '#e0e0e0'
  return '#f5f5f5'
}

// Open shift row edit dialog
function openRowEdit(row: ShiftRow) {
  if (row.isBreak) return
  editingRow.value = row
  editForm.value = {
    role_label: row.role_label,
    raw_shift: row.raw_shift || '',
    start_time: row.start_time,
    end_time: row.end_time,
    color: row.color || getRoleColor(row)
  }
  editDialog.value = true
}

// Insert a section break after a row
function insertBreakAfter(rowId: string) {
  const idx = shiftRows.value.findIndex(r => r.id === rowId)
  if (idx >= 0) {
    const breakId = `break-${Date.now()}`
    shiftRows.value.splice(idx + 1, 0, {
      id: breakId,
      service_id: '',
      staffing_requirement_id: null,
      role_label: '',
      role_category: '',
      start_time: '',
      end_time: '',
      raw_shift: '',
      color: '',
      isBreak: true
    })
  }
}

// Remove a section break
function removeBreak(breakId: string) {
  shiftRows.value = shiftRows.value.filter(r => r.id !== breakId)
}

// Save row edit changes
async function saveRowEdit() {
  if (!editingRow.value) return
  
  const idx = shiftRows.value.findIndex(r => r.id === editingRow.value!.id)
  if (idx >= 0) {
    shiftRows.value[idx] = {
      ...shiftRows.value[idx],
      role_label: editForm.value.role_label,
      raw_shift: editForm.value.raw_shift,
      start_time: editForm.value.start_time,
      end_time: editForm.value.end_time,
      color: editForm.value.color
    }
  }
  
  toast.success('Shift row updated')
  editDialog.value = false
  editingRow.value = null
}

// PUBLISH WEEK - commits all draft shifts to employee schedules
async function publishWeek() {
  const draftShifts = shifts.value.filter(s => s.status === 'draft')
  
  if (draftShifts.length === 0) {
    toast.warning('No draft shifts to publish')
    return
  }
  
  publishDialog.value = true
}

async function confirmPublish() {
  isPublishing.value = true
  
  try {
    const draftShifts = shifts.value.filter(s => s.status === 'draft')
    
    // Update all draft shifts to 'published' status
    const { error } = await supabase
      .from('shifts')
      .update({ status: 'published' })
      .in('id', draftShifts.map(s => s.id))
    
    if (error) throw error
    
    // Update local state
    shifts.value = shifts.value.map(s => 
      s.status === 'draft' ? { ...s, status: 'published' } : s
    )
    
    toast.success(`Published ${draftShifts.length} shifts to employee schedules!`)
    publishDialog.value = false
  } catch (err) {
    console.error('Publish error:', err)
    toast.error('Failed to publish week')
  } finally {
    isPublishing.value = false
  }
}

// Get count of shifts by status
const draftShiftCount = computed(() => shifts.value.filter(s => s.status === 'draft').length)
const publishedShiftCount = computed(() => shifts.value.filter(s => s.status === 'published').length)

// Load shifts for current week
async function loadShifts() {
  isLoading.value = true
  try {
    const weekEnd = addDays(currentWeekStart.value, 7)
    const { data, error } = await supabase
      .from('shifts')
      .select(`*, employees:employee_id(first_name, last_name)`)
      .gte('start_at', currentWeekStart.value.toISOString())
      .lt('start_at', weekEnd.toISOString())
    
    if (error) throw error
    shifts.value = data || []
    
    // Calculate employee hours
    recalculateEmployeeHours()
  } catch (err) {
    console.error('Load shifts error:', err)
    shifts.value = []
  } finally {
    isLoading.value = false
  }
}

// Load time off requests for current week (approved or pending)
async function loadTimeOffRequests() {
  try {
    const weekEnd = addDays(currentWeekStart.value, 6)
    const weekStartStr = format(currentWeekStart.value, 'yyyy-MM-dd')
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd')
    
    const { data, error } = await supabase
      .from('time_off_requests')
      .select(`*, employees:employee_id(first_name, last_name)`)
      .in('status', ['approved', 'pending'])
      .or(`start_date.lte.${weekEndStr},end_date.gte.${weekStartStr}`)
    
    if (error) throw error
    timeOffRequests.value = data || []
  } catch (err) {
    console.error('Load time off error:', err)
    timeOffRequests.value = []
  }
}

// Check if employee has time off on a specific date
function hasTimeOffOnDate(employeeId: string, date: Date): TimeOffRequest | null {
  const dateStr = format(date, 'yyyy-MM-dd')
  return timeOffRequests.value.find(req => 
    req.employee_id === employeeId &&
    dateStr >= req.start_date &&
    dateStr <= req.end_date
  ) || null
}

// Get time off status badge color
function getTimeOffBadgeColor(status: string): string {
  return status === 'approved' ? 'error' : 'warning'
}

// Get cell key
function getCellKey(rowId: string, date: Date, locId: string): string {
  return `${rowId}-${format(date, 'yyyy-MM-dd')}-${locId}`
}

// Get assigned employee for cell - matches by service_id + staffing_requirement_id
function getCellAssignment(row: ShiftRow, date: Date, locId: string) {
  if (row.isBreak) return null
  const dateStr = format(date, 'yyyy-MM-dd')
  
  // Match by staffing_requirement_id if available (new shifts)
  if (row.staffing_requirement_id) {
    return shifts.value.find(s => 
      s.location_id === locId &&
      s.start_at?.startsWith(dateStr) &&
      s.staffing_requirement_id === row.staffing_requirement_id
    )
  }
  
  // Fallback: match by role_required for legacy shifts
  return shifts.value.find(s => 
    s.location_id === locId &&
    s.start_at?.startsWith(dateStr) &&
    s.role_required === row.role_label
  )
}

// Drag handlers
function onDragStart(emp: any, e: DragEvent) {
  draggedEmployee.value = emp
  e.dataTransfer?.setData('text/plain', emp.id)
}

function onDragEnd() {
  draggedEmployee.value = null
  dragOverCell.value = null
}

function onDragOver(cellKey: string, e: DragEvent) {
  e.preventDefault()
  dragOverCell.value = cellKey
}

function onDragLeave() {
  dragOverCell.value = null
}

async function onDrop(row: ShiftRow, date: Date, locId: string, e: DragEvent) {
  e.preventDefault()
  if (!draggedEmployee.value || row.isBreak) return
  
  const dateStr = format(date, 'yyyy-MM-dd')
  const startAt = `${dateStr}T${row.start_time}:00`
  const endAt = `${dateStr}T${row.end_time}:00`
  
  // Check for time off conflict
  const timeOffConflict = hasTimeOffOnDate(draggedEmployee.value.id, date)
  if (timeOffConflict) {
    const statusLabel = timeOffConflict.status === 'approved' ? 'APPROVED' : 'pending'
    toast.warning(`⚠️ ${draggedEmployee.value.first_name} has ${statusLabel} time off on ${format(date, 'MMM d')}`)
    
    // Block if approved time off
    if (timeOffConflict.status === 'approved') {
      toast.error('Cannot assign employee with approved time off')
      onDragEnd()
      return
    }
  }
  
  // Validate shift assignment against scheduling rules
  const validation = await validateShiftAssignment(
    draggedEmployee.value.id,
    dateStr,
    row.start_time,
    row.end_time,
    locId
  )
  
  // Show violations and potentially block
  if (validation.violations.length > 0) {
    showValidationToast(validation.violations, draggedEmployee.value.first_name)
    
    // Block if there are errors (not just warnings)
    if (shouldBlockAssignment(validation.violations)) {
      onDragEnd()
      return
    }
  }
  
  try {
    const { data, error } = await supabase
      .from('shifts')
      .insert({
        employee_id: draggedEmployee.value.id,
        location_id: locId,
        start_at: startAt,
        end_at: endAt,
        role_required: row.role_label,
        service_id: row.service_id || null,
        staffing_requirement_id: row.staffing_requirement_id || null,
        status: 'draft'
      })
      .select(`*, employees:employee_id(first_name, last_name)`)
      .single()
    
    if (error) throw error
    shifts.value.push(data)
    
    // Update employee hours
    recalculateEmployeeHours()
    
    toast.success(`Assigned ${draggedEmployee.value.first_name}`)
  } catch (err) {
    console.error('Assign error:', err)
    toast.error('Failed to assign')
  }
  
  onDragEnd()
}

async function removeAssignment(shiftId: string) {
  try {
    const { error } = await supabase.from('shifts').delete().eq('id', shiftId)
    if (error) throw error
    shifts.value = shifts.value.filter(s => s.id !== shiftId)
    
    // Recalculate hours after removal
    recalculateEmployeeHours()
  } catch (err) {
    toast.error('Failed to remove')
  }
}

// Navigation
function prevWeek() { currentWeekStart.value = addDays(currentWeekStart.value, -7) }
function nextWeek() { currentWeekStart.value = addDays(currentWeekStart.value, 7) }
function goToday() { currentWeekStart.value = startOfWeek(new Date(), { weekStartsOn: 0 }) }

const weekNum = computed(() => {
  const start = new Date(currentWeekStart.value.getFullYear(), 0, 1)
  return Math.ceil(((currentWeekStart.value.getTime() - start.getTime()) / 86400000 + 1) / 7)
})

// Load services and staffing requirements from database
async function loadServicesAndRequirements() {
  try {
    // Load services
    const { data: servicesData, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
    
    if (servicesError) throw servicesError
    services.value = servicesData || []
    
    // Load staffing requirements
    const { data: reqsData, error: reqsError } = await supabase
      .from('service_staffing_requirements')
      .select('*')
      .order('sort_order')
    
    if (reqsError) throw reqsError
    staffingRequirements.value = reqsData || []
    
    // Build shift rows from services and requirements
    buildShiftRows()
  } catch (err) {
    console.error('Failed to load services:', err)
    toast.error('Failed to load services configuration')
    // Build empty rows
    shiftRows.value = []
  }
}

// Build shift rows grouped by service
function buildShiftRows() {
  const rows: ShiftRow[] = []
  
  for (const service of services.value) {
    // Get requirements for this service
    const reqs = staffingRequirements.value
      .filter(r => r.service_id === service.id)
      .sort((a, b) => a.sort_order - b.sort_order)
    
    // Add each requirement as a row
    for (const req of reqs) {
      const times = defaultShiftTimes[req.role_category] || defaultShiftTimes.Tech
      rows.push({
        id: req.id,
        service_id: service.id,
        staffing_requirement_id: req.id,
        role_label: req.role_label,
        role_category: req.role_category,
        start_time: times.start,
        end_time: times.end,
        raw_shift: times.display,
        color: service.color,
        service_code: service.code
      })
    }
    
    // Add a break row after each service (except the last)
    const lastService = services.value[services.value.length - 1]
    if (service.id !== lastService?.id) {
      rows.push({
        id: `break-${service.id}`,
        service_id: '',
        staffing_requirement_id: null,
        role_label: '',
        role_category: '',
        start_time: '',
        end_time: '',
        raw_shift: '',
        color: '',
        isBreak: true
      })
    }
  }
  
  shiftRows.value = rows
}

watch(currentWeekStart, () => {
  loadShifts()
  loadTimeOffRequests()
})
onMounted(async () => {
  await loadServicesAndRequirements()
  await Promise.all([loadShifts(), loadTimeOffRequests()])
})
</script>

<template>
  <div class="builder">
    <!-- Header -->
    <header class="header">
      <div class="header-title">
        <h1>Schedule Builder</h1>
        <v-chip color="error" size="x-small">ADMIN</v-chip>
      </div>
      <div class="header-actions">
        <v-chip v-if="draftShiftCount > 0" color="warning" size="small" variant="flat">
          {{ draftShiftCount }} drafts
        </v-chip>
        <v-chip v-if="publishedShiftCount > 0" color="success" size="small" variant="flat">
          {{ publishedShiftCount }} published
        </v-chip>
        <v-btn 
          color="success" 
          size="small" 
          variant="flat"
          :disabled="draftShiftCount === 0"
          @click="publishWeek"
        >
          <v-icon start>mdi-send</v-icon>
          PUBLISH WEEK
        </v-btn>
      </div>
      <div class="header-nav">
        <v-btn icon size="small" variant="text" @click="prevWeek"><v-icon>mdi-chevron-left</v-icon></v-btn>
        <v-btn size="small" variant="tonal" @click="goToday">TODAY</v-btn>
        <span class="week-label">Week {{ weekNum }} • {{ format(currentWeekStart, 'MMM d') }} - {{ format(addDays(currentWeekStart, 6), 'MMM d, yyyy') }}</span>
        <v-btn icon size="small" variant="text" @click="nextWeek"><v-icon>mdi-chevron-right</v-icon></v-btn>
      </div>
    </header>

    <!-- Location Filter Bar -->
    <div class="location-bar">
      <span class="location-label">LOCATIONS:</span>
      <div class="location-toggles">
        <button
          v-for="loc in locations"
          :key="loc.id"
          type="button"
          class="loc-toggle"
          :class="{ active: isLocationVisible(loc.id) }"
          @click="toggleLocation(loc.id)"
        >
          {{ getLocAbbrev(loc.name) }}
        </button>
      </div>
    </div>

    <div class="main-layout">
      <!-- LEFT: Roster Sidebar -->
      <aside class="roster">
        <div class="roster-header">
          <div class="roster-title">TEAM ROSTER</div>
          <v-select
            v-model="rosterPositionFilter"
            :items="positionOptions"
            density="compact"
            variant="outlined"
            hide-details
            class="roster-filter"
          />
        </div>
        <div class="roster-list">
          <div
            v-for="emp in rosterEmployees"
            :key="emp.id"
            class="roster-item"
            :class="{ 
              'overtime': getEmployeeWeekHours(emp.id) > 40,
              'near-overtime': getEmployeeWeekHours(emp.id) > 35 && getEmployeeWeekHours(emp.id) <= 40
            }"
            draggable="true"
            @dragstart="onDragStart(emp, $event)"
            @dragend="onDragEnd"
          >
            <v-avatar size="24" :color="emp.avatar_url ? undefined : 'primary'">
              <v-img v-if="emp.avatar_url" :src="emp.avatar_url" />
              <span v-else class="text-white text-caption">{{ emp.initials }}</span>
            </v-avatar>
            <div class="roster-info">
              <span class="roster-name">{{ emp.first_name }} {{ emp.last_name?.charAt(0) }}.</span>
              <span v-if="getEmployeeWeekHours(emp.id) > 0" class="roster-hours" :class="getHoursColor(getEmployeeWeekHours(emp.id))">
                {{ getEmployeeWeekHours(emp.id).toFixed(1) }}h
              </span>
            </div>
            <v-chip size="x-small" :color="getHoursColor(getEmployeeWeekHours(emp.id))" variant="flat">
              {{ getWeekShiftCount(emp.id) }}
            </v-chip>
          </div>
          <div v-if="rosterEmployees.length === 0" class="roster-empty">No employees</div>
        </div>
      </aside>

      <!-- RIGHT: Schedule Grid -->
      <main class="grid-area">
        <div v-if="isLoading" class="loading"><v-progress-circular indeterminate /></div>
        <div v-else class="grid-scroll">
          <table class="grid-table">
            <thead>
              <!-- Day headers -->
              <tr class="row-days">
                <th class="col-shift">SHIFTS</th>
                <th 
                  v-for="day in weekDays" 
                  :key="day.toISOString()"
                  :colspan="activeLocations.length"
                  class="col-day"
                  :class="{ today: isSameDay(day, new Date()) }"
                >
                  <div class="day-name">{{ format(day, 'EEE').toUpperCase() }}</div>
                  <div class="day-date">{{ format(day, 'M/d') }}</div>
                </th>
              </tr>
              <!-- Location headers -->
              <tr class="row-locs">
                <th class="col-shift"></th>
                <template v-for="day in weekDays" :key="`locs-${day.toISOString()}`">
                  <th v-for="loc in activeLocations" :key="`${day}-${loc.id}`" class="col-loc">
                    {{ getLocAbbrev(loc.name) }}
                  </th>
                </template>
              </tr>
            </thead>
            <tbody>
              <template v-for="(row, rowIdx) in shiftRows" :key="row.id">
                <!-- Section Break Row -->
                <tr v-if="row.isBreak" class="row-break">
                  <td class="col-break-shift">
                    <button class="break-remove" @click="removeBreak(row.id)" title="Remove break">×</button>
                  </td>
                  <td 
                    v-for="day in weekDays" 
                    :key="`break-${row.id}-${day.toISOString()}`"
                    :colspan="activeLocations.length"
                    class="col-break"
                  ></td>
                </tr>
                <!-- Regular Shift Row -->
                <tr v-else class="row-shift">
                  <td 
                    class="col-shift col-shift-clickable" 
                    :style="{ backgroundColor: row.color || getRoleColor(row) }"
                    @click="openRowEdit(row)"
                  >
                    <div class="shift-service" v-if="row.service_code">{{ row.service_code }}</div>
                    <div class="shift-role">{{ row.role_label }}</div>
                    <div class="shift-time">{{ row.raw_shift }}</div>
                    <v-icon class="shift-edit-icon" size="12">mdi-pencil</v-icon>
                    <button 
                      class="add-break-btn" 
                      @click.stop="insertBreakAfter(row.id)" 
                      title="Add section break below"
                    >
                      <v-icon size="10">mdi-minus</v-icon>
                    </button>
                  </td>
                  <template v-for="day in weekDays" :key="`cells-${row.id}-${day.toISOString()}`">
                    <td 
                      v-for="loc in activeLocations"
                      :key="getCellKey(row.id, day, loc.id)"
                      class="col-cell"
                      :class="{ 
                        'drag-over': dragOverCell === getCellKey(row.id, day, loc.id),
                        'has-emp': getCellAssignment(row, day, loc.id),
                        'today': isSameDay(day, new Date()),
                        'time-off-conflict': getCellAssignment(row, day, loc.id) && hasTimeOffOnDate(getCellAssignment(row, day, loc.id)!.employee_id, day),
                        'time-off-approved': getCellAssignment(row, day, loc.id) && hasTimeOffOnDate(getCellAssignment(row, day, loc.id)!.employee_id, day)?.status === 'approved'
                      }"
                      @dragover="onDragOver(getCellKey(row.id, day, loc.id), $event)"
                      @dragleave="onDragLeave"
                      @drop="onDrop(row, day, loc.id, $event)"
                    >
                      <template v-if="getCellAssignment(row, day, loc.id)">
                        <div class="cell-emp" :class="{ 'has-warning': hasTimeOffOnDate(getCellAssignment(row, day, loc.id)!.employee_id, day) }">
                          <v-icon 
                            v-if="hasTimeOffOnDate(getCellAssignment(row, day, loc.id)!.employee_id, day)"
                            size="10" 
                            :color="hasTimeOffOnDate(getCellAssignment(row, day, loc.id)!.employee_id, day)?.status === 'approved' ? 'error' : 'warning'"
                            class="time-off-icon"
                            :title="hasTimeOffOnDate(getCellAssignment(row, day, loc.id)!.employee_id, day)?.status === 'approved' ? 'APPROVED Time Off!' : 'Pending Time Off Request'"
                          >mdi-calendar-alert</v-icon>
                          <span>{{ getCellAssignment(row, day, loc.id)?.employees?.first_name }}</span>
                          <button class="cell-remove" @click="removeAssignment(getCellAssignment(row, day, loc.id)!.id)">×</button>
                        </div>
                      </template>
                    </td>
                  </template>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </main>
    </div>

    <!-- Edit Shift Row Dialog -->
    <v-dialog v-model="editDialog" max-width="450">
      <v-card>
        <v-card-title class="text-h6">Edit Shift Row</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="editForm.role_label"
            label="Role Label"
            density="compact"
            variant="outlined"
            class="mb-3"
          />
          <v-text-field
            v-model="editForm.raw_shift"
            label="Shift Time Display (e.g., 9-5:30)"
            density="compact"
            variant="outlined"
            class="mb-3"
          />
          <div class="d-flex gap-3 mb-3">
            <v-text-field
              v-model="editForm.start_time"
              label="Start Time"
              type="time"
              density="compact"
              variant="outlined"
            />
            <v-text-field
              v-model="editForm.end_time"
              label="End Time"
              type="time"
              density="compact"
              variant="outlined"
            />
          </div>
          <div class="color-picker-section">
            <label class="text-caption text-grey-darken-1">Background Color</label>
            <div class="color-options">
              <button
                v-for="color in ['#ff00ff', '#ff99ff', '#ffccff', '#ffff00', '#ffffcc', '#00ffff', '#99ffff', '#ccffff', '#00ff00', '#99ff99', '#ff9900', '#ffcc00', '#0099ff', '#e0e0e0', '#d0d0d0']"
                :key="color"
                type="button"
                class="color-btn"
                :class="{ active: editForm.color === color }"
                :style="{ backgroundColor: color }"
                @click="editForm.color = color"
              />
            </div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="editDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" @click="saveRowEdit">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Publish Confirmation Dialog -->
    <v-dialog v-model="publishDialog" max-width="450">
      <v-card>
        <v-card-title class="text-h6">
          <v-icon color="success" class="mr-2">mdi-send</v-icon>
          Publish Week Schedule
        </v-card-title>
        <v-card-text>
          <p class="mb-3">You are about to publish <strong>{{ draftShiftCount }}</strong> draft shifts for:</p>
          <p class="text-subtitle-1 font-weight-bold mb-3">
            Week {{ weekNum }}: {{ format(currentWeekStart, 'MMM d') }} - {{ format(addDays(currentWeekStart, 6), 'MMM d, yyyy') }}
          </p>
          <v-alert type="info" density="compact" variant="tonal" class="mb-0">
            <strong>This will:</strong>
            <ul class="mt-1 mb-0 pl-4">
              <li>Make shifts visible on employee schedules</li>
              <li>Enable attendance tracking for these shifts</li>
              <li>Allow clock-in/out for reliability scoring</li>
            </ul>
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="publishDialog = false" :disabled="isPublishing">Cancel</v-btn>
          <v-btn 
            color="success" 
            variant="flat" 
            @click="confirmPublish"
            :loading="isPublishing"
          >
            Publish {{ draftShiftCount }} Shifts
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.builder {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px);
  background: #f5f5f5;
  font-size: 12px;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #fff;
  border-bottom: 1px solid #ddd;
}
.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.header-title h1 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}
.header-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.week-label {
  font-weight: 500;
  padding: 0 12px;
}

/* Location Filter Bar */
.location-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  background: #fafafa;
  border-bottom: 1px solid #ddd;
}
.location-label {
  font-size: 11px;
  font-weight: 600;
  color: #666;
}
.location-toggles {
  display: flex;
  gap: 4px;
}
.loc-toggle {
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  color: #666;
  cursor: pointer;
  transition: all 0.15s;
}
.loc-toggle:hover {
  border-color: #1976d2;
  color: #1976d2;
}
.loc-toggle.active {
  background: #1976d2;
  border-color: #1976d2;
  color: #fff;
}

/* Main Layout */
.main-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Roster Sidebar */
.roster {
  width: 200px;
  background: #fff;
  border-right: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.roster-header {
  padding: 8px;
  border-bottom: 1px solid #eee;
}
.roster-title {
  font-weight: 700;
  font-size: 11px;
  color: #666;
  margin-bottom: 6px;
}
.roster-filter :deep(.v-field) {
  font-size: 11px;
}
.roster-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
}
.roster-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 4px;
  cursor: grab;
  margin-bottom: 2px;
  transition: background 0.15s, border 0.15s;
  border: 2px solid transparent;
}
.roster-item:hover {
  background: #e3f2fd;
}
.roster-item:active {
  cursor: grabbing;
  background: #bbdefb;
}
.roster-item.overtime {
  background: #ffebee;
  border-color: #ef5350;
}
.roster-item.near-overtime {
  background: #fff8e1;
  border-color: #ffa726;
}
.roster-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.roster-name {
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.roster-hours {
  font-size: 9px;
  font-weight: 600;
}
.roster-hours.success {
  color: #2e7d32;
}
.roster-hours.warning {
  color: #f57c00;
}
.roster-hours.error {
  color: #c62828;
}
.roster-empty {
  text-align: center;
  color: #999;
  padding: 20px;
}

/* Grid Area */
.grid-area {
  flex: 1;
  overflow: hidden;
  position: relative;
}
.loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.8);
}
.grid-scroll {
  width: 100%;
  height: 100%;
  overflow: auto;
}

/* Table */
.grid-table {
  border-collapse: collapse;
  min-width: 100%;
}
.grid-table th, .grid-table td {
  border: 1px solid #ccc;
  padding: 2px 4px;
  text-align: center;
  white-space: nowrap;
}

/* Header rows */
.row-days th {
  background: #e0e0e0;
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 10;
}
.row-locs th {
  background: #eee;
  font-size: 9px;
  color: #666;
  position: sticky;
  top: 38px;
  z-index: 9;
}
.col-day {
  min-width: 100px;
}
.col-day.today {
  background: #c8e6c9 !important;
}
.day-name {
  font-size: 11px;
  font-weight: 700;
}
.day-date {
  font-size: 10px;
  font-weight: 400;
}
.col-loc {
  min-width: 45px;
  font-weight: 600;
}

/* Shift column */
.col-shift {
  min-width: 100px;
  max-width: 120px;
  text-align: left;
  padding: 2px 6px !important;
  position: sticky;
  left: 0;
  z-index: 5;
  background: #f5f5f5;
}
.row-shift .col-shift {
  font-size: 10px;
}
.shift-service {
  font-size: 8px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.shift-role {
  font-weight: 700;
  font-size: 10px;
  color: #000;
}
.shift-time {
  font-size: 9px;
  color: #333;
}
.col-shift-clickable {
  cursor: pointer;
  position: relative;
}
.col-shift-clickable:hover {
  filter: brightness(0.95);
}
.shift-edit-icon {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  color: #666;
}
.col-shift-clickable:hover .shift-edit-icon {
  opacity: 1;
}
.add-break-btn {
  position: absolute;
  bottom: 1px;
  right: 4px;
  width: 16px;
  height: 10px;
  background: #888;
  border: none;
  border-radius: 2px;
  cursor: pointer;
  opacity: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  transition: opacity 0.15s;
}
.col-shift-clickable:hover .add-break-btn {
  opacity: 0.6;
}
.add-break-btn:hover {
  opacity: 1 !important;
  background: #555;
}

/* Section Break Rows */
.row-break {
  height: 8px !important;
}
.col-break-shift {
  min-width: 100px;
  max-width: 120px;
  background: #666 !important;
  position: sticky;
  left: 0;
  z-index: 5;
  height: 8px !important;
  padding: 0 !important;
  border: none !important;
  position: relative;
}
.col-break {
  background: #666 !important;
  height: 8px !important;
  padding: 0 !important;
  border-top: none !important;
  border-bottom: none !important;
}
.break-remove {
  position: absolute;
  right: 2px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  opacity: 0;
  line-height: 1;
}
.row-break:hover .break-remove {
  opacity: 0.7;
}
.break-remove:hover {
  opacity: 1 !important;
}

/* Cells */
.col-cell {
  min-width: 45px;
  height: 28px;
  background: #fff;
  cursor: pointer;
  transition: background 0.1s;
}
.col-cell:hover {
  background: #e3f2fd;
}
.col-cell.drag-over {
  background: #bbdefb !important;
  box-shadow: inset 0 0 0 2px #1976d2;
}
.col-cell.has-emp {
  background: #c8e6c9;
}
.col-cell.time-off-conflict {
  background: #fff3e0 !important;
  border: 2px solid #ff9800 !important;
}
.col-cell.time-off-approved {
  background: #ffebee !important;
  border: 2px solid #f44336 !important;
}
.col-cell.today {
  border-left: 2px solid #4caf50;
  border-right: 2px solid #4caf50;
}
.cell-emp {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 600;
  color: #2e7d32;
  position: relative;
  gap: 2px;
}
.cell-emp.has-warning {
  color: #e65100;
}
.time-off-icon {
  flex-shrink: 0;
  animation: pulse-warning 1.5s ease-in-out infinite;
}
@keyframes pulse-warning {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.cell-remove {
  position: absolute;
  right: 1px;
  top: 0;
  background: none;
  border: none;
  color: #c62828;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  opacity: 0;
  line-height: 1;
}
.col-cell:hover .cell-remove {
  opacity: 1;
}

/* Scrollbar */
.roster-list::-webkit-scrollbar,
.grid-scroll::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.roster-list::-webkit-scrollbar-thumb,
.grid-scroll::-webkit-scrollbar-thumb {
  background: #bbb;
  border-radius: 3px;
}

/* Color Picker */
.color-picker-section {
  margin-top: 8px;
}
.color-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
.color-btn {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
}
.color-btn:hover {
  transform: scale(1.1);
}
.color-btn.active {
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.3);
}
</style>
