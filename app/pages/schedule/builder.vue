<script setup lang="ts">
/**
 * Schedule Builder - The "Cockpit"
 * 
 * LAYOUT:
 * - LEFT: Employee Roster (drag source)
 * - CENTER: Calendar grid with Shift Templates as ROWS
 * - Days of week as columns
 */
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns'

definePageMeta({
  middleware: ['auth', 'admin-only'],
  layout: 'default'
})

// Types
interface ShiftTemplate {
  id: string
  role_name: string
  name: string
  raw_shift: string | null
  start_time: string
  end_time: string
  is_remote: boolean
  is_active: boolean
}

interface GridShift {
  id: string
  templateId: string
  date: string
  locationId: string
  employeeId: string | null
  employeeName: string | null
  status: string
}

// Stores and composables
const scheduleStore = useScheduleBuilderStore()
const { employees, locations, isAdmin } = useAppData()
const toast = useToast()
const supabase = useSupabaseClient()

// --- State ---
const currentWeekStart = ref(startOfWeek(new Date(), { weekStartsOn: 1 }))
const shiftTemplates = ref<ShiftTemplate[]>([])
const gridShifts = ref<GridShift[]>([])
const isLoading = ref(true)

// Default shift templates if none in DB
const defaultShiftTemplates: ShiftTemplate[] = [
  { id: 'default-1', role_name: 'Veterinarian', name: 'Morning Vet', raw_shift: '8am-4pm', start_time: '08:00', end_time: '16:00', is_remote: false, is_active: true },
  { id: 'default-2', role_name: 'Veterinarian', name: 'Afternoon Vet', raw_shift: '10am-6pm', start_time: '10:00', end_time: '18:00', is_remote: false, is_active: true },
  { id: 'default-3', role_name: 'Vet Tech', name: 'Morning Tech', raw_shift: '7am-3pm', start_time: '07:00', end_time: '15:00', is_remote: false, is_active: true },
  { id: 'default-4', role_name: 'Vet Tech', name: 'Day Tech', raw_shift: '9am-5pm', start_time: '09:00', end_time: '17:00', is_remote: false, is_active: true },
  { id: 'default-5', role_name: 'Vet Assistant', name: 'Assistant AM', raw_shift: '8am-4pm', start_time: '08:00', end_time: '16:00', is_remote: false, is_active: true },
  { id: 'default-6', role_name: 'Vet Assistant', name: 'Assistant PM', raw_shift: '12pm-8pm', start_time: '12:00', end_time: '20:00', is_remote: false, is_active: true },
  { id: 'default-7', role_name: 'Client Service', name: 'Front Desk AM', raw_shift: '7am-3pm', start_time: '07:00', end_time: '15:00', is_remote: false, is_active: true },
  { id: 'default-8', role_name: 'Client Service', name: 'Front Desk PM', raw_shift: '11am-7pm', start_time: '11:00', end_time: '19:00', is_remote: false, is_active: true },
]

// Sidebar filters
const employeeSearch = ref('')

// Drag state
const draggedEmployee = ref<any>(null)
const dragOverCellKey = ref<string | null>(null)

// Dialogs
const showLocationPicker = ref(false)
const visibleLocations = ref<string[]>([])

// --- Computed ---
const weekDays = computed(() => {
  const days = []
  for (let i = 0; i < 7; i++) {
    days.push(addDays(currentWeekStart.value, i))
  }
  return days
})

const filteredEmployees = computed(() => {
  let result = (employees.value || []).filter(e => e.is_active)
  
  if (employeeSearch.value) {
    const search = employeeSearch.value.toLowerCase()
    result = result.filter(e => 
      e.full_name?.toLowerCase().includes(search) ||
      (e.position?.title || '').toLowerCase().includes(search)
    )
  }
  
  return result
})

const activeLocations = computed(() => {
  const locs = locations.value || []
  if (visibleLocations.value.length === 0) return locs
  return locs.filter(l => visibleLocations.value.includes(l.id))
})

const getEmployeeShiftCount = (employeeId: string): number => {
  return gridShifts.value.filter(s => s.employeeId === employeeId).length
}

// --- Load Data ---
const loadShiftTemplates = async () => {
  try {
    const { data, error } = await supabase
      .from('shift_templates')
      .select('*')
      .eq('is_active', true)
      .order('start_time')
      .order('role_name')
    
    if (error) {
      console.warn('Error loading shift templates:', error)
      shiftTemplates.value = defaultShiftTemplates
    } else if (!data || data.length === 0) {
      console.log('No shift templates in DB, using defaults')
      shiftTemplates.value = defaultShiftTemplates
    } else {
      shiftTemplates.value = data
    }
  } catch (err) {
    console.error('Error loading shift templates:', err)
    shiftTemplates.value = defaultShiftTemplates
  }
}

const loadWeekShifts = async () => {
  isLoading.value = true
  try {
    const weekEnd = addDays(currentWeekStart.value, 7)
    
    const { data, error } = await supabase
      .from('shifts')
      .select(`
        id,
        start_at,
        end_at,
        location_id,
        employee_id,
        role_required,
        status,
        employees:employee_id ( first_name, last_name )
      `)
      .gte('start_at', currentWeekStart.value.toISOString())
      .lt('start_at', weekEnd.toISOString())
      .order('start_at')

    if (error) {
      console.warn('Error loading shifts:', error)
      gridShifts.value = []
    } else {
      // Map DB shifts to grid shifts
      gridShifts.value = (data || []).map((s: any) => ({
        id: s.id,
        templateId: '', // We'll match by time/role
        date: s.start_at?.split('T')[0] || '',
        locationId: s.location_id,
        employeeId: s.employee_id,
        employeeName: s.employees ? `${s.employees.first_name} ${s.employees.last_name?.charAt(0)}.` : null,
        status: s.status
      }))
    }
  } catch (err) {
    console.error('Error loading week shifts:', err)
    gridShifts.value = []
  } finally {
    isLoading.value = false
  }
}

// --- Grid Helpers ---
const getCellKey = (templateId: string, locationId: string, dateStr: string): string => {
  return `${templateId}-${locationId}-${dateStr}`
}

const getShiftForCell = (templateId: string, locationId: string, dateStr: string): GridShift | null => {
  const template = shiftTemplates.value.find(t => t.id === templateId)
  if (!template) return null
  
  return gridShifts.value.find(s => 
    s.locationId === locationId &&
    s.date === dateStr
  ) || null
}

// --- Drag & Drop ---
const handleDragStart = (employee: any, event: DragEvent) => {
  draggedEmployee.value = employee
  event.dataTransfer?.setData('text/plain', employee.id)
}

const handleDragEnd = () => {
  draggedEmployee.value = null
  dragOverCellKey.value = null
}

const handleDragOverCell = (cellKey: string, event: DragEvent) => {
  event.preventDefault()
  dragOverCellKey.value = cellKey
}

const handleDragLeaveCell = () => {
  dragOverCellKey.value = null
}

const handleDropOnCell = async (template: ShiftTemplate, locationId: string, date: Date, event: DragEvent) => {
  event.preventDefault()
  
  if (!draggedEmployee.value) return
  
  const dateStr = format(date, 'yyyy-MM-dd')
  const cellKey = getCellKey(template.id, locationId, dateStr)
  
  // Create shift datetime
  const startDateTime = `${dateStr}T${template.start_time}:00`
  const endDateTime = `${dateStr}T${template.end_time}:00`
  
  try {
    // Check if shift already exists
    let existingShift = gridShifts.value.find(s => 
      s.locationId === locationId && s.date === dateStr
    )
    
    if (existingShift) {
      // Update existing shift
      const { error } = await supabase
        .from('shifts')
        .update({ 
          employee_id: draggedEmployee.value.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingShift.id)
      
      if (error) throw error
      
      existingShift.employeeId = draggedEmployee.value.id
      existingShift.employeeName = `${draggedEmployee.value.first_name} ${draggedEmployee.value.last_name?.charAt(0)}.`
    } else {
      // Create new shift
      const { data, error } = await supabase
        .from('shifts')
        .insert({
          location_id: locationId,
          employee_id: draggedEmployee.value.id,
          start_at: startDateTime,
          end_at: endDateTime,
          role_required: template.role_name,
          status: 'draft',
          is_open_shift: false
        })
        .select('id')
        .single()
      
      if (error) throw error
      
      gridShifts.value.push({
        id: data.id,
        templateId: template.id,
        date: dateStr,
        locationId: locationId,
        employeeId: draggedEmployee.value.id,
        employeeName: `${draggedEmployee.value.first_name} ${draggedEmployee.value.last_name?.charAt(0)}.`,
        status: 'draft'
      })
    }
    
    toast.success(`Assigned ${draggedEmployee.value.first_name}`)
  } catch (err: any) {
    console.error('Error assigning shift:', err)
    toast.error('Failed to assign shift')
  }
  
  handleDragEnd()
}

const unassignFromCell = async (shift: GridShift) => {
  try {
    const { error } = await supabase
      .from('shifts')
      .update({ employee_id: null })
      .eq('id', shift.id)
    
    if (error) throw error
    
    shift.employeeId = null
    shift.employeeName = null
    toast.info('Employee unassigned')
  } catch (err) {
    console.error('Error unassigning:', err)
    toast.error('Failed to unassign')
  }
}

// --- Week Navigation ---
const previousWeek = () => {
  currentWeekStart.value = addDays(currentWeekStart.value, -7)
}

const nextWeek = () => {
  currentWeekStart.value = addDays(currentWeekStart.value, 7)
}

const goToToday = () => {
  currentWeekStart.value = startOfWeek(new Date(), { weekStartsOn: 1 })
}

// --- Lifecycle ---
watch(currentWeekStart, () => {
  loadWeekShifts()
})

onMounted(async () => {
  visibleLocations.value = (locations.value || []).map(l => l.id)
  await loadShiftTemplates()
  await loadWeekShifts()
})
</script>

<template>
  <div class="schedule-builder">
    <!-- Header -->
    <header class="builder-header">
      <div class="header-left">
        <h1 class="text-h5 font-weight-bold">Schedule Builder</h1>
        <v-chip color="error" variant="flat" size="x-small" class="ml-2">ADMIN</v-chip>
      </div>

      <div class="header-center">
        <v-btn icon="mdi-chevron-left" size="small" variant="text" @click="previousWeek" />
        <v-btn variant="tonal" size="small" class="mx-2" @click="goToToday">TODAY</v-btn>
        <span class="week-label">
          {{ format(currentWeekStart, 'MMM d') }} – {{ format(addDays(currentWeekStart, 6), 'MMM d, yyyy') }}
        </span>
        <v-btn icon="mdi-chevron-right" size="small" variant="text" @click="nextWeek" />
      </div>

      <div class="header-right">
        <v-btn variant="text" size="small" prepend-icon="mdi-auto-fix">
          AUTO-FILL
        </v-btn>
        <v-btn variant="text" size="small" prepend-icon="mdi-map-marker" @click="showLocationPicker = true">
          LOCATIONS
        </v-btn>
      </div>
    </header>

    <!-- Main Layout -->
    <div class="builder-body">
      <!-- LEFT: Employee Roster -->
      <aside class="employee-roster">
        <div class="roster-header">
          <span class="text-subtitle-2 font-weight-bold">TEAM ROSTER</span>
          <v-chip size="x-small" class="ml-2">{{ filteredEmployees.length }}</v-chip>
        </div>
        
        <div class="roster-search">
          <v-text-field
            v-model="employeeSearch"
            placeholder="Search employees..."
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            hide-details
            clearable
          />
        </div>

        <div class="roster-list">
          <div
            v-for="emp in filteredEmployees"
            :key="emp.id"
            class="roster-employee"
            draggable="true"
            @dragstart="handleDragStart(emp, $event)"
            @dragend="handleDragEnd"
          >
            <v-avatar size="32" :color="emp.avatar_url ? undefined : 'primary'" class="mr-2">
              <v-img v-if="emp.avatar_url" :src="emp.avatar_url" />
              <span v-else class="text-white text-caption font-weight-bold">{{ emp.initials }}</span>
            </v-avatar>
            <div class="employee-info">
              <div class="employee-name">{{ emp.first_name }} {{ emp.last_name?.charAt(0) }}.</div>
              <div class="employee-role">{{ emp.position?.title || 'Staff' }}</div>
            </div>
            <v-chip size="x-small" variant="tonal" :color="getEmployeeShiftCount(emp.id) > 0 ? 'primary' : 'grey'">
              {{ getEmployeeShiftCount(emp.id) }}
            </v-chip>
          </div>
          
          <div v-if="filteredEmployees.length === 0" class="text-center py-8 text-grey">
            No employees found
          </div>
        </div>
      </aside>

      <!-- CENTER: Schedule Grid -->
      <main class="schedule-grid">
        <!-- Loading Overlay -->
        <div v-if="isLoading" class="loading-overlay">
          <v-progress-circular indeterminate color="primary" size="48" />
        </div>

        <!-- Grid Container -->
        <div class="grid-container">
          <!-- Header Row: Days -->
          <div class="grid-row grid-header">
            <div class="grid-cell shift-label-cell header-cell">
              <span class="text-caption font-weight-bold">SHIFTS</span>
            </div>
            <div 
              v-for="day in weekDays" 
              :key="day.toISOString()"
              class="grid-cell day-header-cell"
              :class="{ 'is-today': isSameDay(day, new Date()) }"
            >
              <div class="day-name">{{ format(day, 'EEE') }}</div>
              <div class="day-date">{{ format(day, 'M/d') }}</div>
            </div>
          </div>

          <!-- Location Sub-Header -->
          <div class="grid-row location-header">
            <div class="grid-cell shift-label-cell">
              <!-- Empty corner -->
            </div>
            <div 
              v-for="day in weekDays" 
              :key="`loc-${day.toISOString()}`"
              class="grid-cell location-cells"
            >
              <div 
                v-for="loc in activeLocations" 
                :key="`${day.toISOString()}-${loc.id}`"
                class="location-label"
              >
                {{ loc.name?.substring(0, 6) }}
              </div>
            </div>
          </div>

          <!-- Shift Template Rows -->
          <div 
            v-for="template in shiftTemplates"
            :key="template.id"
            class="grid-row shift-row"
          >
            <!-- Shift Label -->
            <div class="grid-cell shift-label-cell">
              <div class="shift-label">
                <span class="shift-role">{{ template.role_name }}</span>
                <span class="shift-time">{{ template.raw_shift || `${template.start_time}-${template.end_time}` }}</span>
              </div>
            </div>

            <!-- Day Cells -->
            <div 
              v-for="day in weekDays" 
              :key="`${template.id}-${day.toISOString()}`"
              class="grid-cell day-cells"
            >
              <!-- Location sub-cells -->
              <div 
                v-for="loc in activeLocations"
                :key="getCellKey(template.id, loc.id, format(day, 'yyyy-MM-dd'))"
                class="schedule-cell"
                :class="{ 
                  'drag-over': dragOverCellKey === getCellKey(template.id, loc.id, format(day, 'yyyy-MM-dd')),
                  'has-employee': getShiftForCell(template.id, loc.id, format(day, 'yyyy-MM-dd'))?.employeeId
                }"
                @dragover="handleDragOverCell(getCellKey(template.id, loc.id, format(day, 'yyyy-MM-dd')), $event)"
                @dragleave="handleDragLeaveCell"
                @drop="handleDropOnCell(template, loc.id, day, $event)"
              >
                <template v-if="getShiftForCell(template.id, loc.id, format(day, 'yyyy-MM-dd'))?.employeeId">
                  <div class="cell-assigned">
                    <span class="assigned-name">
                      {{ getShiftForCell(template.id, loc.id, format(day, 'yyyy-MM-dd'))?.employeeName }}
                    </span>
                    <v-btn 
                      icon="mdi-close" 
                      size="x-small" 
                      variant="text"
                      density="compact"
                      class="remove-btn"
                      @click.stop="unassignFromCell(getShiftForCell(template.id, loc.id, format(day, 'yyyy-MM-dd'))!)"
                    />
                  </div>
                </template>
                <template v-else>
                  <div class="cell-empty">
                    <v-icon size="12" color="grey-lighten-2">mdi-plus</v-icon>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="shiftTemplates.length === 0" class="empty-state">
            <v-icon size="64" color="grey-lighten-2">mdi-calendar-blank</v-icon>
            <p class="text-grey mt-4">No shift templates configured</p>
          </div>
        </div>
      </main>
    </div>

    <!-- Location Picker Dialog -->
    <v-dialog v-model="showLocationPicker" max-width="400">
      <v-card>
        <v-card-title>Show/Hide Locations</v-card-title>
        <v-card-text>
          <v-checkbox
            v-for="loc in locations"
            :key="loc.id"
            v-model="visibleLocations"
            :value="loc.id"
            :label="loc.name"
            density="compact"
            hide-details
          />
        </v-card-text>
        <v-card-actions>
          <v-btn variant="text" @click="visibleLocations = []">Hide All</v-btn>
          <v-btn variant="text" @click="visibleLocations = (locations || []).map(l => l.id)">Show All</v-btn>
          <v-spacer />
          <v-btn color="primary" @click="showLocationPicker = false">Done</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.schedule-builder {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px);
  background: #f8f9fa;
}

/* Header */
.builder-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: white;
  border-bottom: 2px solid #e0e0e0;
  flex-shrink: 0;
}

.header-left, .header-center, .header-right {
  display: flex;
  align-items: center;
}

.week-label {
  font-weight: 600;
  font-size: 0.95rem;
  min-width: 200px;
  text-align: center;
  color: #333;
}

/* Body Layout */
.builder-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* LEFT: Employee Roster */
.employee-roster {
  width: 260px;
  background: white;
  border-right: 2px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.roster-header {
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  background: #f5f5f5;
}

.roster-search {
  padding: 12px;
  border-bottom: 1px solid #e0e0e0;
}

.roster-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.roster-employee {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: grab;
  transition: all 0.2s;
  margin-bottom: 4px;
  border: 1px solid transparent;
}

.roster-employee:hover {
  background: #e3f2fd;
  border-color: #90caf9;
}

.roster-employee:active {
  cursor: grabbing;
  background: #bbdefb;
}

.employee-info {
  flex: 1;
  min-width: 0;
}

.employee-name {
  font-weight: 600;
  font-size: 0.875rem;
  color: #333;
}

.employee-role {
  font-size: 0.75rem;
  color: #666;
}

/* CENTER: Schedule Grid */
.schedule-grid {
  flex: 1;
  overflow: auto;
  position: relative;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.9);
  z-index: 10;
}

.grid-container {
  display: flex;
  flex-direction: column;
  min-width: fit-content;
}

/* Grid Rows */
.grid-row {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
}

.grid-row.grid-header {
  background: white;
  position: sticky;
  top: 0;
  z-index: 5;
  border-bottom: 2px solid #bdbdbd;
}

.grid-row.location-header {
  background: #f5f5f5;
  position: sticky;
  top: 52px;
  z-index: 4;
}

.grid-row.shift-row {
  background: white;
}

.grid-row.shift-row:nth-child(odd) {
  background: #fafafa;
}

.grid-row.shift-row:hover {
  background: #f0f7ff;
}

/* Grid Cells */
.grid-cell {
  border-right: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.grid-cell:last-child {
  border-right: none;
}

.shift-label-cell {
  width: 140px;
  min-width: 140px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  background: #fafafa;
  border-right: 2px solid #bdbdbd;
}

.shift-label-cell.header-cell {
  background: #f5f5f5;
}

.shift-label {
  display: flex;
  flex-direction: column;
}

.shift-role {
  font-weight: 600;
  font-size: 0.75rem;
  color: #333;
}

.shift-time {
  font-size: 0.65rem;
  color: #666;
}

.day-header-cell {
  width: calc((100% - 140px) / 7);
  min-width: 120px;
  padding: 8px;
  text-align: center;
}

.day-header-cell.is-today {
  background: #e3f2fd;
}

.day-name {
  font-weight: 700;
  font-size: 0.875rem;
  text-transform: uppercase;
  color: #333;
}

.day-date {
  font-size: 0.75rem;
  color: #666;
}

.location-cells {
  width: calc((100% - 140px) / 7);
  min-width: 120px;
  display: flex;
}

.location-label {
  flex: 1;
  text-align: center;
  font-size: 0.6rem;
  font-weight: 600;
  text-transform: uppercase;
  color: #888;
  padding: 4px 2px;
  border-right: 1px solid #eee;
}

.location-label:last-child {
  border-right: none;
}

.day-cells {
  width: calc((100% - 140px) / 7);
  min-width: 120px;
  display: flex;
}

.schedule-cell {
  flex: 1;
  min-height: 40px;
  border-right: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
}

.schedule-cell:last-child {
  border-right: none;
}

.schedule-cell:hover {
  background: #e3f2fd;
}

.schedule-cell.drag-over {
  background: #bbdefb;
  box-shadow: inset 0 0 0 2px #1976d2;
}

.schedule-cell.has-employee {
  background: #e8f5e9;
}

.cell-empty {
  opacity: 0.3;
}

.schedule-cell:hover .cell-empty {
  opacity: 0.7;
}

.cell-assigned {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 2px;
  position: relative;
}

.assigned-name {
  font-size: 0.65rem;
  font-weight: 600;
  color: #2e7d32;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.remove-btn {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
}

.schedule-cell:hover .remove-btn {
  opacity: 1;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px;
}

/* Scrollbars */
.roster-list::-webkit-scrollbar,
.schedule-grid::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.roster-list::-webkit-scrollbar-thumb,
.schedule-grid::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 4px;
}

.roster-list::-webkit-scrollbar-thumb:hover,
.schedule-grid::-webkit-scrollbar-thumb:hover {
  background: #aaa;
}
</style>
