<script setup lang="ts">
/**
 * Schedule Builder
 * 
 * LAYOUT:
 * - LEFT SIDEBAR: Employee Roster (independent, filterable, drag source)
 * - MAIN GRID: Shifts as ROWS, Days/Locations as COLUMNS
 */
import { format, addDays, startOfWeek, isSameDay } from 'date-fns'

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
}

// Composables
const { employees, locations, positions } = useAppData()
const toast = useToast()
const supabase = useSupabaseClient()

// State
const currentWeekStart = ref(startOfWeek(new Date(), { weekStartsOn: 0 }))
const shiftTemplates = ref<ShiftTemplate[]>([])
const shifts = ref<any[]>([])
const isLoading = ref(true)

// Roster filters
const rosterSearch = ref('')
const rosterPositionFilter = ref<string | null>(null)

// Drag state
const draggedEmployee = ref<any>(null)
const dragOverCell = ref<string | null>(null)

// Default shift templates
const defaultShiftTemplates: ShiftTemplate[] = [
  { id: 'd1', role_name: 'VET-SURGERY', name: 'Surgeon', raw_shift: '9-6:30', start_time: '09:00', end_time: '18:30' },
  { id: 'd2', role_name: 'Intern', name: 'Intern', raw_shift: '9-5:30', start_time: '09:00', end_time: '17:30' },
  { id: 'd3', role_name: 'Extern/Student', name: 'Student', raw_shift: '9-5:30', start_time: '09:00', end_time: '17:30' },
  { id: 'd4', role_name: 'Surgery Lead', name: 'Surg Lead', raw_shift: '8:30-5', start_time: '08:30', end_time: '17:00' },
  { id: 'd5', role_name: 'Surgery Tech 1', name: 'Surg Tech 1', raw_shift: '9-5:30', start_time: '09:00', end_time: '17:30' },
  { id: 'd6', role_name: 'Surgery Tech 2', name: 'Surg Tech 2', raw_shift: '9-5:30', start_time: '09:00', end_time: '17:30' },
  { id: 'd7', role_name: 'VET-AP', name: 'AP Vet', raw_shift: '9-6:30', start_time: '09:00', end_time: '18:30' },
  { id: 'd8', role_name: 'AP Lead', name: 'AP Lead', raw_shift: '10-6:30', start_time: '10:00', end_time: '18:30' },
  { id: 'd9', role_name: 'AP Tech', name: 'AP Tech', raw_shift: '9-5:30', start_time: '09:00', end_time: '17:30' },
  { id: 'd10', role_name: 'VET-NAP', name: 'NAP Vet', raw_shift: '9-6:30', start_time: '09:00', end_time: '18:30' },
  { id: 'd11', role_name: 'DA - NAP', name: 'DA NAP', raw_shift: '9-6:30', start_time: '09:00', end_time: '18:30' },
  { id: 'd12', role_name: 'DA - TRAINING', name: 'DA Training', raw_shift: '9-6:30', start_time: '09:00', end_time: '18:30' },
  { id: 'd13', role_name: 'Clinic Tech', name: 'Clinic Tech', raw_shift: '8:30-5', start_time: '08:30', end_time: '17:00' },
  { id: 'd14', role_name: 'Float/Lead', name: 'Float Lead', raw_shift: '10-6:30', start_time: '10:00', end_time: '18:30' },
  { id: 'd15', role_name: 'Dentals', name: 'Dentals', raw_shift: '9-5:30', start_time: '09:00', end_time: '17:30' },
  { id: 'd16', role_name: 'VET-IM', name: 'IM Vet', raw_shift: '9-6:30', start_time: '09:00', end_time: '18:30' },
  { id: 'd17', role_name: 'IM Tech/DA', name: 'IM Tech', raw_shift: '9-5:30', start_time: '09:00', end_time: '17:30' },
  { id: 'd18', role_name: 'VET-EXOTICS', name: 'Exotics Vet', raw_shift: '9-6:30', start_time: '09:00', end_time: '18:30' },
  { id: 'd19', role_name: 'Exotics Tech', name: 'Exotics Tech', raw_shift: '9:30-6', start_time: '09:30', end_time: '18:00' },
  { id: 'd20', role_name: 'VET-MPMV', name: 'MPMV Vet', raw_shift: '9-6:30', start_time: '09:00', end_time: '18:30' },
  { id: 'd21', role_name: 'Manager', name: 'Manager', raw_shift: '10-6:30', start_time: '10:00', end_time: '18:30' },
  { id: 'd22', role_name: 'In House Admin', name: 'Admin', raw_shift: '9:30-6', start_time: '09:30', end_time: '18:00' },
  { id: 'd23', role_name: 'Sch Admin', name: 'Scheduler', raw_shift: '9:30-6', start_time: '09:30', end_time: '18:00' },
  { id: 'd24', role_name: 'Office Admin', name: 'Office Admin', raw_shift: '9-5:30', start_time: '09:00', end_time: '17:30' },
]

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

// Active locations
const activeLocations = computed(() => locations.value || [])

// Position options for filter
const positionOptions = computed(() => {
  const pos = positions.value || []
  return [{ title: 'All Positions', value: null }, ...pos.map(p => ({ title: p.title, value: p.id }))]
})

// Filtered roster employees
const rosterEmployees = computed(() => {
  let result = (employees.value || []).filter(e => e.is_active)
  
  if (rosterSearch.value) {
    const search = rosterSearch.value.toLowerCase()
    result = result.filter(e => 
      e.full_name?.toLowerCase().includes(search) ||
      e.first_name?.toLowerCase().includes(search) ||
      e.last_name?.toLowerCase().includes(search)
    )
  }
  
  if (rosterPositionFilter.value) {
    result = result.filter(e => e.position?.id === rosterPositionFilter.value)
  }
  
  return result.sort((a, b) => (a.first_name || '').localeCompare(b.first_name || ''))
})

// Get shift count for employee in current week
function getWeekShiftCount(employeeId: string): number {
  return shifts.value.filter(s => s.employee_id === employeeId).length
}

// Get role color
function getRoleColor(role: string): string {
  const r = (role || '').toLowerCase()
  if (r.includes('surgery') || r.includes('surg')) return '#ff00ff'
  if (r.includes('intern')) return '#ff99ff'
  if (r.includes('extern') || r.includes('student')) return '#ffccff'
  if (r.includes('ap') && r.includes('lead')) return '#ffff00'
  if (r.includes('ap') && r.includes('tech')) return '#ffffcc'
  if (r.includes('vet-ap') || r.includes('ap vet')) return '#ffff00'
  if (r.includes('nap')) return '#00ffff'
  if (r.includes('da')) return '#99ffff'
  if (r.includes('clinic tech')) return '#ccffff'
  if (r.includes('float') || r.includes('lead')) return '#ffcc00'
  if (r.includes('dental')) return '#ff9900'
  if (r.includes('im') && r.includes('vet')) return '#00ff00'
  if (r.includes('im') && r.includes('tech')) return '#99ff99'
  if (r.includes('exotic') && r.includes('vet')) return '#00ff99'
  if (r.includes('exotic') && r.includes('tech')) return '#99ffcc'
  if (r.includes('mpmv')) return '#0099ff'
  if (r.includes('manager')) return '#e0e0e0'
  if (r.includes('admin')) return '#d0d0d0'
  return '#f5f5f5'
}

// Load shift templates from DB or use defaults
async function loadShiftTemplates() {
  try {
    const { data, error } = await supabase
      .from('shift_templates')
      .select('*')
      .eq('is_active', true)
      .order('start_time')
    
    if (error || !data || data.length === 0) {
      shiftTemplates.value = defaultShiftTemplates
    } else {
      shiftTemplates.value = data
    }
  } catch {
    shiftTemplates.value = defaultShiftTemplates
  }
}

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
  } catch (err) {
    console.error('Load shifts error:', err)
    shifts.value = []
  } finally {
    isLoading.value = false
  }
}

// Get cell key
function getCellKey(shiftId: string, date: Date, locId: string): string {
  return `${shiftId}-${format(date, 'yyyy-MM-dd')}-${locId}`
}

// Get assigned employee for cell
function getCellAssignment(shiftTemplate: ShiftTemplate, date: Date, locId: string) {
  const dateStr = format(date, 'yyyy-MM-dd')
  return shifts.value.find(s => 
    s.location_id === locId &&
    s.start_at?.startsWith(dateStr) &&
    s.role_required === shiftTemplate.role_name
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

async function onDrop(template: ShiftTemplate, date: Date, locId: string, e: DragEvent) {
  e.preventDefault()
  if (!draggedEmployee.value) return
  
  const dateStr = format(date, 'yyyy-MM-dd')
  const startAt = `${dateStr}T${template.start_time}:00`
  const endAt = `${dateStr}T${template.end_time}:00`
  
  try {
    const { data, error } = await supabase
      .from('shifts')
      .insert({
        employee_id: draggedEmployee.value.id,
        location_id: locId,
        start_at: startAt,
        end_at: endAt,
        role_required: template.role_name,
        status: 'draft'
      })
      .select(`*, employees:employee_id(first_name, last_name)`)
      .single()
    
    if (error) throw error
    shifts.value.push(data)
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

watch(currentWeekStart, loadShifts)
onMounted(async () => {
  await loadShiftTemplates()
  await loadShifts()
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
      <div class="header-nav">
        <v-btn icon size="small" variant="text" @click="prevWeek"><v-icon>mdi-chevron-left</v-icon></v-btn>
        <v-btn size="small" variant="tonal" @click="goToday">TODAY</v-btn>
        <span class="week-label">Week {{ weekNum }} • {{ format(currentWeekStart, 'MMM d') }} - {{ format(addDays(currentWeekStart, 6), 'MMM d, yyyy') }}</span>
        <v-btn icon size="small" variant="text" @click="nextWeek"><v-icon>mdi-chevron-right</v-icon></v-btn>
      </div>
    </header>

    <div class="main-layout">
      <!-- LEFT: Roster Sidebar -->
      <aside class="roster">
        <div class="roster-header">
          <div class="roster-title">TEAM ROSTER</div>
          <v-text-field
            v-model="rosterSearch"
            placeholder="Search..."
            density="compact"
            variant="outlined"
            hide-details
            prepend-inner-icon="mdi-magnify"
            clearable
            class="roster-search"
          />
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
            draggable="true"
            @dragstart="onDragStart(emp, $event)"
            @dragend="onDragEnd"
          >
            <v-avatar size="24" :color="emp.avatar_url ? undefined : 'primary'">
              <v-img v-if="emp.avatar_url" :src="emp.avatar_url" />
              <span v-else class="text-white text-caption">{{ emp.initials }}</span>
            </v-avatar>
            <span class="roster-name">{{ emp.first_name }} {{ emp.last_name?.charAt(0) }}.</span>
            <v-chip size="x-small" :color="getWeekShiftCount(emp.id) > 0 ? 'primary' : 'grey'" variant="flat">
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
              <tr v-for="tmpl in shiftTemplates" :key="tmpl.id" class="row-shift">
                <td class="col-shift" :style="{ backgroundColor: getRoleColor(tmpl.role_name) }">
                  <div class="shift-role">{{ tmpl.role_name }}</div>
                  <div class="shift-time">{{ tmpl.raw_shift }}</div>
                </td>
                <template v-for="day in weekDays" :key="`cells-${tmpl.id}-${day.toISOString()}`">
                  <td 
                    v-for="loc in activeLocations"
                    :key="getCellKey(tmpl.id, day, loc.id)"
                    class="col-cell"
                    :class="{ 
                      'drag-over': dragOverCell === getCellKey(tmpl.id, day, loc.id),
                      'has-emp': getCellAssignment(tmpl, day, loc.id),
                      'today': isSameDay(day, new Date())
                    }"
                    @dragover="onDragOver(getCellKey(tmpl.id, day, loc.id), $event)"
                    @dragleave="onDragLeave"
                    @drop="onDrop(tmpl, day, loc.id, $event)"
                  >
                    <template v-if="getCellAssignment(tmpl, day, loc.id)">
                      <div class="cell-emp">
                        <span>{{ getCellAssignment(tmpl, day, loc.id)?.employees?.first_name }}</span>
                        <button class="cell-remove" @click="removeAssignment(getCellAssignment(tmpl, day, loc.id)!.id)">×</button>
                      </div>
                    </template>
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
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
.week-label {
  font-weight: 500;
  padding: 0 12px;
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
.roster-search {
  margin-bottom: 6px;
}
.roster-search :deep(.v-field) {
  font-size: 11px;
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
}
.roster-item:hover {
  background: #e3f2fd;
}
.roster-item:active {
  cursor: grabbing;
  background: #bbdefb;
}
.roster-name {
  flex: 1;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
.shift-role {
  font-weight: 700;
  font-size: 10px;
  color: #000;
}
.shift-time {
  font-size: 9px;
  color: #333;
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
</style>
