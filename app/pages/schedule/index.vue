<template>
  <div class="schedule-command-center">
    <!-- Header -->
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 gap-2">
      <div>
        <h1 class="text-h5 font-weight-bold mb-1">Schedule Command Center</h1>
        <p class="text-body-2 text-grey-darken-1 mb-0">
          Week of {{ formatWeekRange(currentWeekStart) }} • {{ totalShiftsThisWeek }} shifts scheduled
        </p>
      </div>
      <div class="d-flex flex-wrap align-center gap-2">
        <v-btn-group density="compact" variant="outlined">
          <v-btn icon="mdi-chevron-left" size="small" @click="changeWeek(-1)" />
          <v-btn size="small" @click="goToThisWeek">Today</v-btn>
          <v-btn icon="mdi-chevron-right" size="small" @click="changeWeek(1)" />
        </v-btn-group>
        
        <!-- Quick Actions Menu -->
        <v-menu>
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
        
        <v-btn
          color="primary"
          size="small"
          prepend-icon="mdi-publish"
          :loading="publishing"
          @click="publishWeek"
        >
          Publish Week
        </v-btn>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="d-flex justify-center align-center" style="min-height: 500px;">
      <v-progress-circular indeterminate color="primary" size="48" />
    </div>

    <!-- 3-Zone Layout -->
    <v-row v-else dense class="schedule-zones">
      
      <!-- ═══════════════════════════════════════════════════════════════
           ZONE 1: Employee Roster (Far Left Sidebar)
           ═══════════════════════════════════════════════════════════════ -->
      <v-col cols="12" md="2" class="zone-roster">
        <v-card rounded="lg" class="h-100" elevation="1">
          <v-card-title class="py-2 px-3 text-subtitle-2 bg-blue-grey-lighten-5">
            <v-icon size="18" class="mr-1">mdi-account-group</v-icon>
            Team Roster
            <v-chip size="x-small" class="ml-2">{{ employees.length }}</v-chip>
          </v-card-title>
          <v-divider />
          
          <!-- Search -->
          <div class="px-2 py-2">
            <v-text-field
              v-model="employeeSearch"
              placeholder="Search..."
              variant="outlined"
              density="compact"
              hide-details
              prepend-inner-icon="mdi-magnify"
              clearable
            />
          </div>

          <!-- Employee List -->
          <v-virtual-scroll
            :items="filteredEmployees"
            :height="gridHeight - 120"
            item-height="48"
          >
            <template #default="{ item: emp }">
              <div
                class="employee-chip pa-2 mx-2 mb-1 d-flex align-center rounded cursor-grab"
                :class="{ 'employee-chip-assigned': getEmployeeShiftCount(emp.id) > 0 }"
                draggable="true"
                @dragstart="handleEmployeeDragStart($event, emp)"
                @dragend="handleDragEnd"
              >
                <v-avatar size="28" :color="getAvatarColor(emp.id)" class="mr-2">
                  <span class="text-caption text-white font-weight-bold">
                    {{ getInitials(emp.first_name, emp.last_name) }}
                  </span>
                </v-avatar>
                <div class="flex-grow-1 text-truncate">
                  <span class="text-body-2 font-weight-medium">
                    {{ emp.first_name }} {{ emp.last_name?.charAt(0) }}.
                  </span>
                  <div class="text-caption text-grey">{{ emp.position?.title || 'Staff' }}</div>
                </div>
                <v-chip
                  size="x-small"
                  :color="getEmployeeShiftCount(emp.id) > 0 ? 'primary' : 'grey'"
                  variant="flat"
                >
                  {{ getEmployeeShiftCount(emp.id) }}
                </v-chip>
              </div>
            </template>
          </v-virtual-scroll>
        </v-card>
      </v-col>

      <!-- ═══════════════════════════════════════════════════════════════
           ZONE 2: Shift Template Bank (Middle Left)
           ═══════════════════════════════════════════════════════════════ -->
      <v-col cols="12" md="2" class="zone-templates">
        <v-card rounded="lg" class="h-100" elevation="1">
          <v-card-title class="py-2 px-3 text-subtitle-2 bg-amber-lighten-5">
            <v-icon size="18" class="mr-1">mdi-clock-outline</v-icon>
            Shift Templates
            <v-chip size="x-small" class="ml-2">{{ shiftTemplates.length }}</v-chip>
          </v-card-title>
          <v-divider />

          <!-- Template List -->
          <div class="pa-2 template-list" :style="{ height: gridHeight - 60 + 'px', overflowY: 'auto' }">
            <div
              v-for="template in shiftTemplates"
              :key="template.id"
              class="template-chip pa-2 mb-2 rounded cursor-grab"
              :style="{ borderLeftColor: getTemplateColor(template.role_name) }"
              draggable="true"
              @dragstart="handleTemplateDragStart($event, template)"
              @dragend="handleDragEnd"
            >
              <div class="d-flex align-center justify-space-between mb-1">
                <span class="text-body-2 font-weight-bold text-truncate">{{ template.name }}</span>
                <v-chip size="x-small" variant="tonal" :color="getTemplateColor(template.role_name)">
                  {{ formatTime(template.start_time) }}
                </v-chip>
              </div>
              <div class="d-flex align-center gap-1 text-caption text-grey">
                <v-icon size="12">mdi-clock-start</v-icon>
                {{ formatTime(template.start_time) }} - {{ formatTime(template.end_time) }}
              </div>
              <div v-if="template.role_name" class="text-caption text-grey mt-1">
                <v-icon size="12">mdi-badge-account</v-icon>
                {{ template.role_name }}
              </div>
            </div>

            <!-- Add Template Button -->
            <v-btn
              block
              variant="outlined"
              color="grey"
              size="small"
              class="mt-2"
              prepend-icon="mdi-plus"
              @click="showTemplateDialog = true"
            >
              New Template
            </v-btn>
          </div>
        </v-card>
      </v-col>

      <!-- ═══════════════════════════════════════════════════════════════
           ZONE 3: Location Grid (The Main Stage)
           ═══════════════════════════════════════════════════════════════ -->
      <v-col cols="12" md="8" class="zone-grid">
        <v-card rounded="lg" class="h-100" elevation="1">
          <v-card-title class="py-2 px-3 text-subtitle-2 bg-green-lighten-5 d-flex align-center">
            <v-icon size="18" class="mr-1">mdi-calendar-month</v-icon>
            Weekly Schedule Grid
            <v-spacer />
            <v-btn-toggle
              v-model="gridView"
              mandatory
              density="compact"
              color="primary"
              variant="outlined"
            >
              <v-btn value="week" size="x-small">Week</v-btn>
              <v-btn value="day" size="x-small">Day</v-btn>
            </v-btn-toggle>
          </v-card-title>
          <v-divider />

          <!-- Grid Content -->
          <div class="schedule-grid" :style="{ height: gridHeight - 60 + 'px' }">
            <!-- Location Headers -->
            <div class="grid-header">
              <div class="grid-cell grid-header-cell day-label"></div>
              <div
                v-for="loc in locations"
                :key="loc.id"
                class="grid-cell grid-header-cell location-header"
                :style="{ backgroundColor: getLocationColor(loc.id) + '20' }"
              >
                <v-tooltip :text="loc.name" location="top">
                  <template #activator="{ props }">
                    <span v-bind="props" class="font-weight-bold">
                      {{ getLocationAbbrev(loc.name) }}
                    </span>
                  </template>
                </v-tooltip>
                <div class="text-caption text-grey">{{ loc.city || '' }}</div>
              </div>
            </div>

            <!-- Day Rows -->
            <div class="grid-body">
              <div
                v-for="(day, dayIndex) in weekDays"
                :key="day.date"
                class="grid-row"
                :class="{ 'grid-row-today': isToday(day.date) }"
              >
                <!-- Day Label -->
                <div class="grid-cell day-label" :class="{ 'font-weight-bold': isToday(day.date) }">
                  <div class="text-body-2">{{ day.dayName }}</div>
                  <div class="text-caption" :class="isToday(day.date) ? 'text-primary' : 'text-grey'">
                    {{ day.dateShort }}
                  </div>
                </div>

                <!-- Location Cells -->
                <div
                  v-for="loc in locations"
                  :key="`${day.date}-${loc.id}`"
                  class="grid-cell shift-cell"
                  :class="{ 'drag-over': dragOverCell === `${day.date}-${loc.id}` }"
                  @dragover.prevent="handleDragOver($event, day.date, loc.id)"
                  @dragleave="handleDragLeave"
                  @drop="handleDrop($event, day.date, loc.id)"
                  @click="openAddShiftDialog(day.date, loc.id)"
                >
                  <!-- Shifts in this cell -->
                  <div
                    v-for="shift in getShiftsForCell(day.date, loc.id)"
                    :key="shift.id"
                    class="shift-card"
                    :class="{ 
                      'shift-open': shift.is_open_shift,
                      'shift-published': shift.is_published
                    }"
                    :style="{ borderLeftColor: getShiftColor(shift) }"
                    @click.stop="openEditShiftDialog(shift)"
                  >
                    <div class="d-flex align-center justify-space-between">
                      <span class="shift-time text-caption font-weight-medium">
                        {{ formatShiftTime(shift.start_at) }}
                      </span>
                      <v-icon v-if="shift.is_open_shift" size="12" color="warning">mdi-alert-circle</v-icon>
                      <v-icon v-else-if="shift.is_published" size="12" color="success">mdi-check-circle</v-icon>
                    </div>
                    <div class="shift-employee text-truncate">
                      {{ getShiftEmployeeName(shift) }}
                    </div>
                    <div v-if="shift.role_required" class="text-caption text-grey text-truncate">
                      {{ shift.role_required }}
                    </div>
                  </div>

                  <!-- Empty State / Drop Zone Indicator -->
                  <div v-if="getShiftsForCell(day.date, loc.id).length === 0" class="empty-cell-hint">
                    <v-icon size="16" color="grey-lighten-1">mdi-plus</v-icon>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- ═══════════════════════════════════════════════════════════════
         DIALOGS
         ═══════════════════════════════════════════════════════════════ -->

    <!-- Add/Edit Shift Dialog -->
    <v-dialog v-model="shiftDialog" max-width="500">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">{{ editingShift ? 'mdi-pencil' : 'mdi-plus' }}</v-icon>
          {{ editingShift ? 'Edit Shift' : 'Add Shift' }}
        </v-card-title>
        <v-card-text>
          <v-form ref="shiftFormRef">
            <v-row dense>
              <v-col cols="12">
                <v-autocomplete
                  v-model="shiftForm.employee_id"
                  :items="employees"
                  :item-title="(e: any) => `${e.first_name} ${e.last_name}`"
                  item-value="id"
                  label="Employee"
                  variant="outlined"
                  density="compact"
                  clearable
                  prepend-inner-icon="mdi-account"
                  hint="Leave empty for Open Shift"
                  persistent-hint
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="shiftForm.date"
                  label="Date"
                  type="date"
                  variant="outlined"
                  density="compact"
                  :rules="[(v: any) => !!v || 'Required']"
                />
              </v-col>
              <v-col cols="6">
                <v-select
                  v-model="shiftForm.location_id"
                  :items="locations"
                  item-title="name"
                  item-value="id"
                  label="Location"
                  variant="outlined"
                  density="compact"
                  :rules="[(v: any) => !!v || 'Required']"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="shiftForm.start_time"
                  label="Start Time"
                  type="time"
                  variant="outlined"
                  density="compact"
                  :rules="[(v: any) => !!v || 'Required']"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="shiftForm.end_time"
                  label="End Time"
                  type="time"
                  variant="outlined"
                  density="compact"
                  :rules="[(v: any) => !!v || 'Required']"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="shiftForm.role_required"
                  label="Role Required (optional)"
                  variant="outlined"
                  density="compact"
                  placeholder="e.g., Vet Tech, DVM"
                />
              </v-col>
              <v-col cols="12">
                <v-checkbox
                  v-model="shiftForm.is_published"
                  label="Publish immediately"
                  density="compact"
                  hide-details
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-btn
            v-if="editingShift"
            color="error"
            variant="text"
            @click="deleteShift"
          >
            Delete
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="closeShiftDialog">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="saveShift">
            {{ editingShift ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Template Dialog -->
    <v-dialog v-model="showTemplateDialog" max-width="450">
      <v-card>
        <v-card-title>
          <v-icon class="mr-2">mdi-clock-plus</v-icon>
          New Shift Template
        </v-card-title>
        <v-card-text>
          <v-form ref="templateFormRef">
            <v-text-field
              v-model="templateForm.name"
              label="Template Name"
              variant="outlined"
              density="compact"
              placeholder="e.g., Morning - Vet Tech"
              :rules="[(v: any) => !!v || 'Required']"
            />
            <v-row dense>
              <v-col cols="6">
                <v-text-field
                  v-model="templateForm.start_time"
                  label="Start Time"
                  type="time"
                  variant="outlined"
                  density="compact"
                  :rules="[(v: any) => !!v || 'Required']"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="templateForm.end_time"
                  label="End Time"
                  type="time"
                  variant="outlined"
                  density="compact"
                  :rules="[(v: any) => !!v || 'Required']"
                />
              </v-col>
            </v-row>
            <v-text-field
              v-model="templateForm.role_name"
              label="Role Name (optional)"
              variant="outlined"
              density="compact"
              placeholder="e.g., Vet Tech"
            />
          </v-form>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="showTemplateDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="savingTemplate" @click="saveTemplate">Create</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { format, startOfWeek, addDays, parseISO, isToday as checkIsToday } from 'date-fns'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'schedule-access']
})

// Types
interface Employee {
  id: string
  first_name: string
  last_name: string
  position?: { title: string }
}

interface ShiftTemplate {
  id: string
  name: string
  start_time: string
  end_time: string
  role_name?: string
  location_id?: string
}

interface Shift {
  id: string
  employee_id?: string
  location_id: string
  start_at: string
  end_at: string
  status: string
  role_required?: string
  is_open_shift: boolean
  is_published: boolean
}

interface Location {
  id: string
  name: string
  city?: string
  code?: string
}

const supabase = useSupabaseClient()

// State
const loading = ref(true)
const saving = ref(false)
const savingTemplate = ref(false)
const publishing = ref(false)
const employees = ref<Employee[]>([])
const shiftTemplates = ref<ShiftTemplate[]>([])
const shifts = ref<Shift[]>([])
const locations = ref<Location[]>([])
const currentWeekStart = ref(startOfWeek(new Date(), { weekStartsOn: 1 }))
const gridView = ref('week')
const employeeSearch = ref('')
const gridHeight = ref(600)

// Drag state
const dragOverCell = ref<string | null>(null)
const dragData = ref<{ type: 'employee' | 'template', data: any } | null>(null)

// Dialogs
const shiftDialog = ref(false)
const showTemplateDialog = ref(false)
const editingShift = ref<Shift | null>(null)
const shiftFormRef = ref()
const templateFormRef = ref()

const shiftForm = ref({
  employee_id: null as string | null,
  location_id: '',
  date: '',
  start_time: '09:00',
  end_time: '17:00',
  role_required: '',
  is_published: false
})

const templateForm = ref({
  name: '',
  start_time: '09:00',
  end_time: '17:00',
  role_name: ''
})

// Snackbar
const snackbar = ref({ show: false, message: '', color: 'success' })

// Computed
const filteredEmployees = computed(() => {
  if (!employeeSearch.value) return employees.value
  const search = employeeSearch.value.toLowerCase()
  return employees.value.filter(e => 
    `${e.first_name} ${e.last_name}`.toLowerCase().includes(search)
  )
})

const weekDays = computed(() => {
  const days = []
  for (let i = 0; i < 7; i++) {
    const date = addDays(currentWeekStart.value, i)
    days.push({
      date: format(date, 'yyyy-MM-dd'),
      dayName: format(date, 'EEE'),
      dateShort: format(date, 'M/d')
    })
  }
  return days
})

const totalShiftsThisWeek = computed(() => shifts.value.length)

// Methods
function getInitials(firstName: string, lastName: string) {
  return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase()
}

function getAvatarColor(id: string) {
  const colors = ['blue', 'green', 'purple', 'orange', 'teal', 'pink', 'indigo', 'cyan']
  const index = id.charCodeAt(0) % colors.length
  return colors[index]
}

function getLocationAbbrev(name: string) {
  // Map known locations
  const abbrevMap: Record<string, string> = {
    'Sherman Oaks': 'SO',
    'Venice': 'VEN',
    'Valley': 'VAL',
    'Encino': 'ENC',
    'Santa Monica': 'SM'
  }
  return abbrevMap[name] || name.substring(0, 3).toUpperCase()
}

function getLocationColor(locationId: string) {
  const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#00BCD4']
  const index = locations.value.findIndex(l => l.id === locationId)
  return colors[index % colors.length]
}

function getTemplateColor(roleName?: string) {
  if (!roleName) return 'grey'
  const role = roleName.toLowerCase()
  if (role.includes('dvm') || role.includes('vet')) return 'green'
  if (role.includes('tech')) return 'blue'
  if (role.includes('assist')) return 'purple'
  if (role.includes('recept') || role.includes('csr')) return 'orange'
  return 'grey'
}

function formatTime(time?: string) {
  if (!time) return ''
  const [hours, minutes] = time.split(':')
  const h = parseInt(hours)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${minutes} ${ampm}`
}

function formatShiftTime(datetime: string) {
  try {
    return format(parseISO(datetime), 'h:mm a')
  } catch {
    return ''
  }
}

function formatWeekRange(start: Date) {
  const end = addDays(start, 6)
  return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`
}

function isToday(dateStr: string) {
  try {
    return checkIsToday(parseISO(dateStr))
  } catch {
    return false
  }
}

function getEmployeeShiftCount(employeeId: string) {
  return shifts.value.filter(s => s.employee_id === employeeId).length
}

function getShiftsForCell(date: string, locationId: string) {
  return shifts.value.filter(s => {
    const shiftDate = s.start_at.split('T')[0]
    return shiftDate === date && s.location_id === locationId
  })
}

function getShiftEmployeeName(shift: Shift) {
  if (shift.is_open_shift || !shift.employee_id) return '⚠️ OPEN'
  const emp = employees.value.find(e => e.id === shift.employee_id)
  return emp ? `${emp.first_name} ${emp.last_name?.charAt(0)}.` : 'Unassigned'
}

function getShiftColor(shift: Shift) {
  if (shift.is_open_shift) return '#FF9800'
  if (shift.is_published) return '#4CAF50'
  return '#9E9E9E'
}

// Week navigation
function changeWeek(delta: number) {
  currentWeekStart.value = addDays(currentWeekStart.value, delta * 7)
  fetchShifts()
}

function goToThisWeek() {
  currentWeekStart.value = startOfWeek(new Date(), { weekStartsOn: 1 })
  fetchShifts()
}

// Drag & Drop
function handleEmployeeDragStart(event: DragEvent, employee: Employee) {
  dragData.value = { type: 'employee', data: employee }
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData('text/plain', JSON.stringify({ type: 'employee', id: employee.id }))
  }
}

function handleTemplateDragStart(event: DragEvent, template: ShiftTemplate) {
  dragData.value = { type: 'template', data: template }
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData('text/plain', JSON.stringify({ type: 'template', id: template.id }))
  }
}

function handleDragOver(event: DragEvent, date: string, locationId: string) {
  event.preventDefault()
  dragOverCell.value = `${date}-${locationId}`
}

function handleDragLeave() {
  dragOverCell.value = null
}

function handleDragEnd() {
  dragData.value = null
  dragOverCell.value = null
}

async function handleDrop(event: DragEvent, date: string, locationId: string) {
  event.preventDefault()
  dragOverCell.value = null

  if (!dragData.value) return

  if (dragData.value.type === 'employee') {
    // Drop employee - open dialog to create shift
    shiftForm.value = {
      employee_id: dragData.value.data.id,
      location_id: locationId,
      date: date,
      start_time: '09:00',
      end_time: '17:00',
      role_required: dragData.value.data.position?.title || '',
      is_published: false
    }
    editingShift.value = null
    shiftDialog.value = true
  } else if (dragData.value.type === 'template') {
    // Drop template - create open shift
    const template = dragData.value.data as ShiftTemplate
    shiftForm.value = {
      employee_id: null,
      location_id: locationId,
      date: date,
      start_time: template.start_time || '09:00',
      end_time: template.end_time || '17:00',
      role_required: template.role_name || '',
      is_published: false
    }
    editingShift.value = null
    shiftDialog.value = true
  }

  dragData.value = null
}

// Shift CRUD
function openAddShiftDialog(date: string, locationId: string) {
  shiftForm.value = {
    employee_id: null,
    location_id: locationId,
    date: date,
    start_time: '09:00',
    end_time: '17:00',
    role_required: '',
    is_published: false
  }
  editingShift.value = null
  shiftDialog.value = true
}

function openEditShiftDialog(shift: Shift) {
  const shiftDate = shift.start_at.split('T')[0]
  const startTime = format(parseISO(shift.start_at), 'HH:mm')
  const endTime = format(parseISO(shift.end_at), 'HH:mm')
  
  shiftForm.value = {
    employee_id: shift.employee_id || null,
    location_id: shift.location_id,
    date: shiftDate,
    start_time: startTime,
    end_time: endTime,
    role_required: shift.role_required || '',
    is_published: shift.is_published
  }
  editingShift.value = shift
  shiftDialog.value = true
}

function closeShiftDialog() {
  shiftDialog.value = false
  editingShift.value = null
}

async function saveShift() {
  if (!shiftFormRef.value) return
  const { valid } = await shiftFormRef.value.validate()
  if (!valid) return

  saving.value = true
  try {
    const startAt = `${shiftForm.value.date}T${shiftForm.value.start_time}:00`
    const endAt = `${shiftForm.value.date}T${shiftForm.value.end_time}:00`
    
    const shiftData = {
      employee_id: shiftForm.value.employee_id || null,
      location_id: shiftForm.value.location_id,
      start_at: startAt,
      end_at: endAt,
      role_required: shiftForm.value.role_required || null,
      is_open_shift: !shiftForm.value.employee_id,
      is_published: shiftForm.value.is_published,
      status: shiftForm.value.is_published ? 'published' : 'draft'
    }

    if (editingShift.value) {
      const { error } = await supabase
        .from('shifts')
        .update(shiftData)
        .eq('id', editingShift.value.id)
      if (error) throw error
      snackbar.value = { show: true, message: 'Shift updated', color: 'success' }
    } else {
      const { error } = await supabase
        .from('shifts')
        .insert(shiftData)
      if (error) throw error
      snackbar.value = { show: true, message: 'Shift created', color: 'success' }
    }

    closeShiftDialog()
    await fetchShifts()
  } catch (err: any) {
    snackbar.value = { show: true, message: err.message || 'Failed to save shift', color: 'error' }
  } finally {
    saving.value = false
  }
}

async function deleteShift() {
  if (!editingShift.value) return
  
  saving.value = true
  try {
    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('id', editingShift.value.id)
    
    if (error) throw error
    snackbar.value = { show: true, message: 'Shift deleted', color: 'success' }
    closeShiftDialog()
    await fetchShifts()
  } catch (err: any) {
    snackbar.value = { show: true, message: err.message || 'Failed to delete shift', color: 'error' }
  } finally {
    saving.value = false
  }
}

// Template CRUD
async function saveTemplate() {
  if (!templateFormRef.value) return
  const { valid } = await templateFormRef.value.validate()
  if (!valid) return

  savingTemplate.value = true
  try {
    const { error } = await supabase
      .from('shift_templates')
      .insert({
        name: templateForm.value.name,
        start_time: templateForm.value.start_time,
        end_time: templateForm.value.end_time,
        role_name: templateForm.value.role_name || null,
        is_active: true
      })
    
    if (error) throw error
    snackbar.value = { show: true, message: 'Template created', color: 'success' }
    showTemplateDialog.value = false
    templateForm.value = { name: '', start_time: '09:00', end_time: '17:00', role_name: '' }
    await fetchTemplates()
  } catch (err: any) {
    snackbar.value = { show: true, message: err.message || 'Failed to create template', color: 'error' }
  } finally {
    savingTemplate.value = false
  }
}

// Publish week
async function publishWeek() {
  publishing.value = true
  try {
    const unpublishedIds = shifts.value
      .filter(s => !s.is_published)
      .map(s => s.id)
    
    if (unpublishedIds.length === 0) {
      snackbar.value = { show: true, message: 'All shifts already published', color: 'info' }
      return
    }

    const { error } = await supabase
      .from('shifts')
      .update({ 
        is_published: true, 
        status: 'published'
      })
      .in('id', unpublishedIds)
    
    if (error) throw error
    snackbar.value = { show: true, message: `Published ${unpublishedIds.length} shifts`, color: 'success' }
    await fetchShifts()
  } catch (err: any) {
    snackbar.value = { show: true, message: err.message || 'Failed to publish', color: 'error' }
  } finally {
    publishing.value = false
  }
}

// Data fetching
async function fetchEmployees() {
  const { data } = await supabase
    .from('employees')
    .select('id, first_name, last_name, position:job_positions(title)')
    .eq('employment_status', 'active')
    .order('first_name')
  employees.value = data || []
}

async function fetchTemplates() {
  const { data } = await supabase
    .from('shift_templates')
    .select('*')
    .eq('is_active', true)
    .order('start_time')
  shiftTemplates.value = data || []
}

async function fetchLocations() {
  const { data } = await supabase
    .from('locations')
    .select('*')
    .eq('is_active', true)
    .order('name')
  locations.value = data || []
}

async function fetchShifts() {
  const weekEnd = addDays(currentWeekStart.value, 7)
  const { data } = await supabase
    .from('shifts')
    .select('*')
    .gte('start_at', currentWeekStart.value.toISOString())
    .lt('start_at', weekEnd.toISOString())
    .order('start_at')
  shifts.value = data || []
}

async function fetchAllData() {
  loading.value = true
  try {
    await Promise.all([
      fetchEmployees(),
      fetchTemplates(),
      fetchLocations(),
      fetchShifts()
    ])
  } finally {
    loading.value = false
  }
}

// Calculate grid height
function updateGridHeight() {
  gridHeight.value = Math.max(500, window.innerHeight - 200)
}

onMounted(() => {
  updateGridHeight()
  window.addEventListener('resize', updateGridHeight)
  fetchAllData()
})

onUnmounted(() => {
  window.removeEventListener('resize', updateGridHeight)
})
</script>

<style scoped>
.schedule-command-center {
  height: calc(100vh - 100px);
  display: flex;
  flex-direction: column;
}

.schedule-zones {
  flex: 1;
  min-height: 0;
}

/* Zone styling */
.zone-roster .v-card,
.zone-templates .v-card,
.zone-grid .v-card {
  display: flex;
  flex-direction: column;
}

/* Employee chips */
.employee-chip {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  transition: all 0.2s;
}

.employee-chip:hover {
  background: #e3f2fd;
  border-color: #90caf9;
}

.employee-chip-assigned {
  background: #e8f5e9;
  border-color: #a5d6a7;
}

.cursor-grab {
  cursor: grab;
}

.cursor-grab:active {
  cursor: grabbing;
}

/* Template chips */
.template-chip {
  background: #fff8e1;
  border: 1px solid #ffe082;
  border-left-width: 4px;
  transition: all 0.2s;
}

.template-chip:hover {
  background: #fff3c4;
  transform: translateX(2px);
}

/* Schedule Grid */
.schedule-grid {
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.grid-header {
  display: flex;
  position: sticky;
  top: 0;
  z-index: 10;
  background: white;
  border-bottom: 2px solid #e0e0e0;
}

.grid-body {
  flex: 1;
}

.grid-row {
  display: flex;
  border-bottom: 1px solid #eeeeee;
  min-height: 80px;
}

.grid-row-today {
  background: rgba(33, 150, 243, 0.05);
}

.grid-cell {
  border-right: 1px solid #eeeeee;
  padding: 4px;
}

.grid-header-cell {
  padding: 8px;
  font-weight: 600;
  text-align: center;
  background: #fafafa;
}

.day-label {
  min-width: 70px;
  max-width: 70px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: #fafafa;
}

.location-header {
  flex: 1;
  min-width: 150px;
}

.shift-cell {
  flex: 1;
  min-width: 150px;
  min-height: 70px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.shift-cell:hover {
  background: rgba(0, 0, 0, 0.02);
}

.shift-cell.drag-over {
  background: rgba(33, 150, 243, 0.15);
  outline: 2px dashed #2196f3;
}

/* Shift cards */
.shift-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-left-width: 3px;
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.shift-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.shift-open {
  background: #fff3e0;
  border-color: #ffb74d;
}

.shift-published {
  background: #e8f5e9;
}

.shift-time {
  color: #666;
}

.shift-employee {
  font-weight: 500;
  font-size: 12px;
}

.empty-cell-hint {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.shift-cell:hover .empty-cell-hint {
  opacity: 1;
}

/* Responsive adjustments */
@media (max-width: 1200px) {
  .zone-roster,
  .zone-templates {
    display: none;
  }
  
  .zone-grid {
    flex: 0 0 100%;
    max-width: 100%;
  }
}
</style>
