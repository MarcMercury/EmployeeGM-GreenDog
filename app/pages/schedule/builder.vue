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
  color?: string
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
const rosterPositionFilter = ref<string | null>(null)

// Drag state
const draggedEmployee = ref<any>(null)
const dragOverCell = ref<string | null>(null)

// Shift editing state
const editDialog = ref(false)
const editingShift = ref<ShiftTemplate | null>(null)
const editForm = ref({
  role_name: '',
  name: '',
  raw_shift: '',
  start_time: '',
  end_time: '',
  color: '#f5f5f5'
})

// Publishing state
const isPublishing = ref(false)
const publishDialog = ref(false)

// Default shift templates
const defaultShiftTemplates: ShiftTemplate[] = [
  { id: 'd1', role_name: 'VET-SURGERY', name: 'Surgeon', raw_shift: '9-6:30', start_time: '09:00', end_time: '18:30', color: '#ff00ff' },
  { id: 'd2', role_name: 'Intern', name: 'Intern', raw_shift: '9-5:30', start_time: '09:00', end_time: '17:30', color: '#ff99ff' },
  { id: 'd3', role_name: 'Extern/Student', name: 'Student', raw_shift: '9-5:30', start_time: '09:00', end_time: '17:30', color: '#ffccff' },
  { id: 'd4', role_name: 'Surgery Lead', name: 'Surg Lead', raw_shift: '8:30-5', start_time: '08:30', end_time: '17:00', color: '#ff66cc' },
  { id: 'd5', role_name: 'Surgery Tech 1', name: 'Surg Tech 1', raw_shift: '9-5:30', start_time: '09:00', end_time: '17:30', color: '#ff99cc' },
  { id: 'd6', role_name: 'Surgery Tech 2', name: 'Surg Tech 2', raw_shift: '9-5:30', start_time: '09:00', end_time: '17:30', color: '#ffcccc' },
  { id: 'd7', role_name: 'VET-AP', name: 'AP Vet', raw_shift: '9-6:30', start_time: '09:00', end_time: '18:30', color: '#ffff00' },
  { id: 'd8', role_name: 'AP Lead', name: 'AP Lead', raw_shift: '10-6:30', start_time: '10:00', end_time: '18:30', color: '#ffff66' },
  { id: 'd9', role_name: 'AP Tech', name: 'AP Tech', raw_shift: '9-5:30', start_time: '09:00', end_time: '17:30', color: '#ffffcc' },
  { id: 'd10', role_name: 'VET-NAP', name: 'NAP Vet', raw_shift: '9-6:30', start_time: '09:00', end_time: '18:30', color: '#00ffff' },
  { id: 'd11', role_name: 'DA - NAP', name: 'DA NAP', raw_shift: '9-6:30', start_time: '09:00', end_time: '18:30', color: '#66ffff' },
  { id: 'd12', role_name: 'DA - TRAINING', name: 'DA Training', raw_shift: '9-6:30', start_time: '09:00', end_time: '18:30', color: '#99ffff' },
  { id: 'd13', role_name: 'Clinic Tech', name: 'Clinic Tech', raw_shift: '8:30-5', start_time: '08:30', end_time: '17:00', color: '#ccffff' },
  { id: 'd14', role_name: 'Float/Lead', name: 'Float Lead', raw_shift: '10-6:30', start_time: '10:00', end_time: '18:30', color: '#ffcc00' },
  { id: 'd15', role_name: 'Dentals', name: 'Dentals', raw_shift: '9-5:30', start_time: '09:00', end_time: '17:30', color: '#ff9900' },
  { id: 'd16', role_name: 'VET-IM', name: 'IM Vet', raw_shift: '9-6:30', start_time: '09:00', end_time: '18:30', color: '#00ff00' },
  { id: 'd17', role_name: 'IM Tech/DA', name: 'IM Tech', raw_shift: '9-5:30', start_time: '09:00', end_time: '17:30', color: '#99ff99' },
  { id: 'd18', role_name: 'VET-EXOTICS', name: 'Exotics Vet', raw_shift: '9-6:30', start_time: '09:00', end_time: '18:30', color: '#00ff99' },
  { id: 'd19', role_name: 'Exotics Tech', name: 'Exotics Tech', raw_shift: '9:30-6', start_time: '09:30', end_time: '18:00', color: '#99ffcc' },
  { id: 'd20', role_name: 'VET-MPMV', name: 'MPMV Vet', raw_shift: '9-6:30', start_time: '09:00', end_time: '18:30', color: '#0099ff' },
  { id: 'd21', role_name: 'Manager', name: 'Manager', raw_shift: '10-6:30', start_time: '10:00', end_time: '18:30', color: '#e0e0e0' },
  { id: 'd22', role_name: 'In House Admin', name: 'Admin', raw_shift: '9:30-6', start_time: '09:30', end_time: '18:00', color: '#d0d0d0' },
  { id: 'd23', role_name: 'Sch Admin', name: 'Scheduler', raw_shift: '9:30-6', start_time: '09:30', end_time: '18:00', color: '#c0c0c0' },
  { id: 'd24', role_name: 'Office Admin', name: 'Office Admin', raw_shift: '9-5:30', start_time: '09:00', end_time: '17:30', color: '#b0b0b0' },
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
  
  if (rosterPositionFilter.value) {
    result = result.filter(e => e.position?.id === rosterPositionFilter.value)
  }
  
  return result.sort((a, b) => (a.first_name || '').localeCompare(b.first_name || ''))
})

// Get shift count for employee in current week
function getWeekShiftCount(employeeId: string): number {
  return shifts.value.filter(s => s.employee_id === employeeId).length
}

// Get role color - uses template color if available
function getRoleColor(role: string, template?: ShiftTemplate): string {
  if (template?.color) return template.color
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

// Open shift edit dialog
function openShiftEdit(tmpl: ShiftTemplate) {
  editingShift.value = tmpl
  editForm.value = {
    role_name: tmpl.role_name,
    name: tmpl.name,
    raw_shift: tmpl.raw_shift || '',
    start_time: tmpl.start_time,
    end_time: tmpl.end_time,
    color: tmpl.color || getRoleColor(tmpl.role_name)
  }
  editDialog.value = true
}

// Save shift template changes
async function saveShiftEdit() {
  if (!editingShift.value) return
  
  // Update local template
  const idx = shiftTemplates.value.findIndex(t => t.id === editingShift.value!.id)
  if (idx >= 0) {
    shiftTemplates.value[idx] = {
      ...shiftTemplates.value[idx],
      role_name: editForm.value.role_name,
      name: editForm.value.name,
      raw_shift: editForm.value.raw_shift,
      start_time: editForm.value.start_time,
      end_time: editForm.value.end_time,
      color: editForm.value.color
    }
  }
  
  // If not a default template (has UUID), save to DB
  if (!editingShift.value.id.startsWith('d')) {
    try {
      await supabase
        .from('shift_templates')
        .update({
          role_name: editForm.value.role_name,
          name: editForm.value.name,
          raw_shift: editForm.value.raw_shift,
          start_time: editForm.value.start_time,
          end_time: editForm.value.end_time
        })
        .eq('id', editingShift.value.id)
      toast.success('Shift template updated')
    } catch {
      toast.error('Failed to save to database')
    }
  } else {
    toast.success('Shift template updated locally')
  }
  
  editDialog.value = false
  editingShift.value = null
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
    
    // Update all draft shifts to 'scheduled' status
    const { error } = await supabase
      .from('shifts')
      .update({ status: 'scheduled' })
      .in('id', draftShifts.map(s => s.id))
    
    if (error) throw error
    
    // Update local state
    shifts.value = shifts.value.map(s => 
      s.status === 'draft' ? { ...s, status: 'scheduled' } : s
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
const publishedShiftCount = computed(() => shifts.value.filter(s => s.status === 'scheduled').length)

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
                <td 
                  class="col-shift col-shift-clickable" 
                  :style="{ backgroundColor: tmpl.color || getRoleColor(tmpl.role_name, tmpl) }"
                  @click="openShiftEdit(tmpl)"
                >
                  <div class="shift-role">{{ tmpl.role_name }}</div>
                  <div class="shift-time">{{ tmpl.raw_shift }}</div>
                  <v-icon class="shift-edit-icon" size="12">mdi-pencil</v-icon>
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

    <!-- Edit Shift Dialog -->
    <v-dialog v-model="editDialog" max-width="450">
      <v-card>
        <v-card-title class="text-h6">Edit Shift Template</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="editForm.role_name"
            label="Role Name"
            density="compact"
            variant="outlined"
            class="mb-3"
          />
          <v-text-field
            v-model="editForm.name"
            label="Short Name"
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
          <v-btn color="primary" variant="flat" @click="saveShiftEdit">Save</v-btn>
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
