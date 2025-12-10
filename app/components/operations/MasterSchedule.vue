<template>
  <v-card class="master-schedule" rounded="lg" elevation="2">
    <!-- Header -->
    <v-card-title class="d-flex align-center justify-space-between flex-wrap ga-2 pa-4">
      <div class="d-flex align-center ga-2">
        <v-btn icon="mdi-chevron-left" variant="text" size="small" @click="navigatePrevious" />
        <span class="text-h6">{{ headerTitle }}</span>
        <v-btn icon="mdi-chevron-right" variant="text" size="small" @click="navigateNext" />
      </div>

      <div class="d-flex align-center ga-2 flex-wrap">
        <v-btn variant="outlined" size="small" @click="goToToday">Today</v-btn>
        
        <v-chip-group v-model="viewMode" mandatory selected-class="text-primary">
          <v-chip value="day" size="small" variant="outlined">Day</v-chip>
          <v-chip value="week" size="small" variant="outlined">Week</v-chip>
        </v-chip-group>

        <v-divider vertical class="mx-2 d-none d-md-block" />

        <v-btn
          v-if="draftCount > 0"
          color="success"
          size="small"
          prepend-icon="mdi-publish"
          @click="publishDrafts"
          :loading="isPublishing"
        >
          Publish ({{ draftCount }})
        </v-btn>

        <v-btn
          color="primary"
          size="small"
          prepend-icon="mdi-plus"
          @click="openCreateDialog"
        >
          Add Shift
        </v-btn>
      </div>
    </v-card-title>

    <v-divider />

    <!-- Resource Calendar Grid -->
    <div class="schedule-grid" ref="gridRef">
      <!-- Time Header Row -->
      <div class="grid-header">
        <div class="resource-label-header">
          <span class="text-caption text-grey">Employee</span>
        </div>
        <div 
          v-for="col in columns" 
          :key="col.key" 
          class="time-header"
          :class="{ 'today': col.isToday }"
        >
          <template v-if="viewMode === 'week'">
            <span class="day-name text-caption">{{ col.dayName }}</span>
            <span class="day-number" :class="{ 'today-number': col.isToday }">{{ col.dayNumber }}</span>
          </template>
          <template v-else>
            <span class="hour-label text-caption">{{ col.hour }}:00</span>
          </template>
        </div>
      </div>

      <!-- Resource Rows (Employees) -->
      <div class="grid-body" @dragover.prevent @drop="handleGridDrop">
        <template v-for="resource in resources" :key="resource.id">
          <div 
            class="resource-row"
            :data-employee-id="resource.id"
          >
            <!-- Employee Label -->
            <div class="resource-label">
              <v-avatar size="28" class="mr-2">
                <v-img v-if="resource.avatar" :src="resource.avatar" />
                <span v-else class="text-caption">{{ resource.initials }}</span>
              </v-avatar>
              <div class="resource-info">
                <span class="resource-name text-body-2">{{ resource.name }}</span>
                <span class="resource-dept text-caption text-grey">{{ resource.department }}</span>
              </div>
            </div>

            <!-- Time Cells -->
            <div 
              v-for="col in columns" 
              :key="col.key"
              class="time-cell"
              :class="{ 'today-cell': col.isToday }"
              :data-date="col.date"
              :data-hour="col.hour"
              @click="handleCellClick(resource.id, col)"
              @dragover.prevent
              @drop="handleCellDrop($event, resource.id, col)"
            >
              <!-- Shift Blocks -->
              <div
                v-for="shift in getShiftsForCell(resource.id, col)"
                :key="shift.id"
                class="shift-block"
                :class="[
                  `status-${shift.status}`,
                  { 'is-dragging': draggingShiftId === shift.id }
                ]"
                :style="getShiftStyle(shift, col)"
                :title="getShiftTooltip(shift)"
                draggable="true"
                @dragstart="handleDragStart($event, shift)"
                @dragend="handleDragEnd"
                @click.stop="openEditDialog(shift)"
              >
                <div class="shift-content">
                  <span class="shift-time">{{ formatShiftTime(shift) }}</span>
                  <span v-if="shift.location" class="shift-location text-caption">{{ shift.location.name }}</span>
                </div>
                <v-icon 
                  v-if="shift.status === 'draft'" 
                  size="12" 
                  class="draft-indicator"
                >
                  mdi-pencil
                </v-icon>
              </div>
            </div>
          </div>
        </template>

        <!-- Unassigned Row -->
        <div class="resource-row unassigned-row">
          <div class="resource-label">
            <v-icon size="24" color="grey" class="mr-2">mdi-account-question</v-icon>
            <span class="text-body-2 text-grey">Open Shifts</span>
          </div>
          <div 
            v-for="col in columns" 
            :key="col.key"
            class="time-cell"
            :class="{ 'today-cell': col.isToday }"
            :data-date="col.date"
            @dragover.prevent
            @drop="handleCellDrop($event, null, col)"
          >
            <div
              v-for="shift in getUnassignedShifts(col)"
              :key="shift.id"
              class="shift-block open-shift"
              :style="getShiftStyle(shift, col)"
              draggable="true"
              @dragstart="handleDragStart($event, shift)"
              @dragend="handleDragEnd"
              @click.stop="openEditDialog(shift)"
            >
              <span class="shift-time">{{ formatShiftTime(shift) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Conflict Alert -->
    <v-snackbar v-model="showConflict" color="error" location="top" timeout="5000">
      <v-icon class="mr-2">mdi-alert-circle</v-icon>
      {{ conflictMessage }}
      <template #actions>
        <v-btn variant="text" @click="showConflict = false">Close</v-btn>
      </template>
    </v-snackbar>

    <!-- Create/Edit Shift Dialog -->
    <v-dialog v-model="shiftDialog" max-width="500" persistent>
      <v-card>
        <v-card-title>
          {{ editingShift ? 'Edit Shift' : 'Create Shift' }}
        </v-card-title>
        <v-card-text>
          <v-form ref="shiftFormRef" v-model="formValid">
            <v-select
              v-model="shiftForm.employee_id"
              :items="employeeOptions"
              item-title="name"
              item-value="id"
              label="Employee"
              clearable
              hint="Leave empty for open shift"
              persistent-hint
            />

            <v-row class="mt-2">
              <v-col cols="6">
                <v-text-field
                  v-model="shiftForm.start_date"
                  label="Date"
                  type="date"
                  :rules="[v => !!v || 'Required']"
                />
              </v-col>
              <v-col cols="6">
                <v-select
                  v-model="shiftForm.status"
                  :items="statusOptions"
                  label="Status"
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="shiftForm.start_time"
                  label="Start Time"
                  type="time"
                  :rules="[v => !!v || 'Required']"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="shiftForm.end_time"
                  label="End Time"
                  type="time"
                  :rules="[v => !!v || 'Required']"
                />
              </v-col>
            </v-row>

            <v-select
              v-model="shiftForm.location_id"
              :items="locationOptions"
              item-title="name"
              item-value="id"
              label="Location"
              clearable
              class="mt-2"
            />

            <v-select
              v-model="shiftForm.department_id"
              :items="departmentOptions"
              item-title="name"
              item-value="id"
              label="Department"
              clearable
              class="mt-2"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-btn
            v-if="editingShift"
            color="error"
            variant="text"
            @click="deleteShift"
            :loading="isDeleting"
          >
            Delete
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
          <v-btn 
            color="primary" 
            @click="saveShift"
            :loading="isSaving"
            :disabled="!formValid"
          >
            {{ editingShift ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Training Intercept Dialog (Integration 2: Just-in-Time Training) -->
    <TrainingInterceptDialog
      v-model="showTrainingIntercept"
      :employee-id="interceptEmployeeId"
      :employee-name="interceptEmployeeName"
      :missing-skills="interceptMissingSkills"
      @training-assigned="handleTrainingAssigned"
    />
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useOperationsStore, type Shift } from '~/stores/operations'
import { useEmployeeStore } from '~/stores/employee'
import { useUserStore } from '~/stores/user'
import { useIntegrationsStore } from '~/stores/integrations'
import TrainingInterceptDialog from './TrainingInterceptDialog.vue'

// Props
const props = defineProps<{
  editable?: boolean
}>()

// Stores
const opsStore = useOperationsStore()
const employeeStore = useEmployeeStore()
const userStore = useUserStore()
const integrationsStore = useIntegrationsStore()

// State
const viewMode = ref<'day' | 'week'>('week')
const currentDate = ref(new Date())
const shiftDialog = ref(false)
const editingShift = ref<Shift | null>(null)
const shiftFormRef = ref()
const formValid = ref(false)
const isSaving = ref(false)
const isDeleting = ref(false)
const isPublishing = ref(false)
const draggingShiftId = ref<string | null>(null)
const showConflict = ref(false)
const conflictMessage = ref('')

// Training intercept state
const showTrainingIntercept = ref(false)
const interceptMissingSkills = ref<{ skill_id: string; skill_name: string; required_level: number; current_level: number | null; is_met: boolean; course_id?: string; course_title?: string }[]>([])
const interceptEmployeeId = ref<string>('')
const interceptEmployeeName = ref<string>('')
const interceptShiftId = ref<string | null>(null)

const shiftForm = ref({
  employee_id: null as string | null,
  start_date: '',
  start_time: '09:00',
  end_time: '17:00',
  status: 'draft',
  location_id: null as string | null,
  department_id: null as string | null
})

const statusOptions = [
  { title: 'Draft', value: 'draft' },
  { title: 'Published', value: 'published' }
]

// Computed
const headerTitle = computed(() => {
  if (viewMode.value === 'day') {
    return currentDate.value.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }
  // Week view - show week range
  const start = getWeekStart(currentDate.value)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${startStr} - ${endStr}`
})

const columns = computed(() => {
  if (viewMode.value === 'week') {
    const start = getWeekStart(currentDate.value)
    const cols = []
    const today = new Date().toDateString()
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      cols.push({
        key: d.toISOString().split('T')[0],
        date: d.toISOString().split('T')[0],
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: d.getDate(),
        isToday: d.toDateString() === today
      })
    }
    return cols
  } else {
    // Day view - hours
    const cols = []
    const dateStr = currentDate.value.toISOString().split('T')[0]
    const today = new Date().toDateString()
    
    for (let h = 6; h <= 22; h++) {
      cols.push({
        key: `${dateStr}-${h}`,
        date: dateStr,
        hour: h,
        isToday: currentDate.value.toDateString() === today
      })
    }
    return cols
  }
})

const resources = computed(() => {
  // Get all employees with their info
  return employeeStore.employees.map(emp => ({
    id: emp.id,
    name: emp.profile ? `${emp.profile.first_name || ''} ${emp.profile.last_name || ''}`.trim() : 'Unknown',
    initials: emp.profile 
      ? `${emp.profile.first_name?.[0] || ''}${emp.profile.last_name?.[0] || ''}` 
      : '?',
    avatar: emp.profile?.avatar_url,
    department: emp.department?.name || 'No Dept'
  }))
})

const draftCount = computed(() => opsStore.draftShifts.length)

const employeeOptions = computed(() => [
  { name: '— Open Shift —', id: null },
  ...resources.value.map(r => ({ name: r.name, id: r.id }))
])

const locationOptions = ref<{ id: string; name: string }[]>([])
const departmentOptions = ref<{ id: string; name: string }[]>([])

// Methods
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

function navigatePrevious() {
  const d = new Date(currentDate.value)
  if (viewMode.value === 'week') {
    d.setDate(d.getDate() - 7)
  } else {
    d.setDate(d.getDate() - 1)
  }
  currentDate.value = d
}

function navigateNext() {
  const d = new Date(currentDate.value)
  if (viewMode.value === 'week') {
    d.setDate(d.getDate() + 7)
  } else {
    d.setDate(d.getDate() + 1)
  }
  currentDate.value = d
}

function goToToday() {
  currentDate.value = new Date()
}

function getShiftsForCell(employeeId: string, col: { date: string; hour?: number }): Shift[] {
  return opsStore.shifts.filter(s => {
    if (s.employee_id !== employeeId) return false
    
    const shiftDate = s.start_at.split('T')[0]
    if (viewMode.value === 'week') {
      return shiftDate === col.date
    } else {
      // Day view - check hour overlap
      const shiftStart = new Date(s.start_at)
      const shiftEnd = new Date(s.end_at)
      const cellHour = col.hour || 0
      return (
        shiftDate === col.date &&
        shiftStart.getHours() <= cellHour &&
        shiftEnd.getHours() > cellHour
      )
    }
  })
}

function getUnassignedShifts(col: { date: string }): Shift[] {
  return opsStore.shifts.filter(s => {
    if (s.employee_id !== null) return false
    const shiftDate = s.start_at.split('T')[0]
    return shiftDate === col.date
  })
}

function getShiftStyle(shift: Shift, _col: { date: string; hour?: number }) {
  // For week view, calculate width based on duration
  if (viewMode.value === 'week') {
    return {}
  }
  
  // For day view, calculate position and width
  const start = new Date(shift.start_at)
  const end = new Date(shift.end_at)
  const startHour = start.getHours() + start.getMinutes() / 60
  const endHour = end.getHours() + end.getMinutes() / 60
  const duration = endHour - startHour
  
  return {
    width: `${duration * 100}%`,
    left: '0'
  }
}

function formatShiftTime(shift: Shift): string {
  const start = new Date(shift.start_at)
  const end = new Date(shift.end_at)
  const startStr = start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const endStr = end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return `${startStr} - ${endStr}`
}

function getShiftTooltip(shift: Shift): string {
  const time = formatShiftTime(shift)
  const location = shift.location?.name || 'No location'
  const status = shift.status.charAt(0).toUpperCase() + shift.status.slice(1)
  return `${time}\n${location}\nStatus: ${status}`
}

// Drag and Drop
function handleDragStart(event: DragEvent, shift: Shift) {
  if (!props.editable) return
  draggingShiftId.value = shift.id
  event.dataTransfer?.setData('text/plain', shift.id)
}

function handleDragEnd() {
  draggingShiftId.value = null
}

async function handleCellDrop(event: DragEvent, employeeId: string | null, col: { date: string }) {
  if (!props.editable) return
  
  const shiftId = event.dataTransfer?.getData('text/plain')
  if (!shiftId) return

  const shift = opsStore.shifts.find(s => s.id === shiftId)
  if (!shift) return

  // If employee changed, check conflicts
  if (shift.employee_id !== employeeId && employeeId) {
    try {
      const conflict = await opsStore.checkConflicts(
        employeeId,
        shift.start_at,
        shift.end_at,
        shift.id
      )
      
      if (conflict.hasConflict) {
        conflictMessage.value = conflict.message || 'Scheduling conflict detected'
        showConflict.value = true
        return
      }
    } catch (err) {
      console.error('Conflict check failed:', err)
    }
  }

  // Update shift assignment
  try {
    await opsStore.updateShift(shiftId, {
      employee_id: employeeId,
      is_open_shift: employeeId === null
    })
  } catch (err) {
    conflictMessage.value = err instanceof Error ? err.message : 'Failed to move shift'
    showConflict.value = true
  }
}

function handleGridDrop(_event: DragEvent) {
  // Grid-level drop handler
}

function handleCellClick(employeeId: string, col: { date: string }) {
  if (!props.editable) return
  
  shiftForm.value = {
    employee_id: employeeId,
    start_date: col.date,
    start_time: '09:00',
    end_time: '17:00',
    status: 'draft',
    location_id: null,
    department_id: null
  }
  editingShift.value = null
  shiftDialog.value = true
}

function openCreateDialog() {
  const today = new Date().toISOString().split('T')[0]
  shiftForm.value = {
    employee_id: null,
    start_date: today,
    start_time: '09:00',
    end_time: '17:00',
    status: 'draft',
    location_id: null,
    department_id: null
  }
  editingShift.value = null
  shiftDialog.value = true
}

function openEditDialog(shift: Shift) {
  if (!props.editable) return
  
  const startDate = shift.start_at.split('T')[0]
  const startTime = new Date(shift.start_at).toTimeString().slice(0, 5)
  const endTime = new Date(shift.end_at).toTimeString().slice(0, 5)
  
  shiftForm.value = {
    employee_id: shift.employee_id,
    start_date: startDate,
    start_time: startTime,
    end_time: endTime,
    status: shift.status,
    location_id: shift.location_id,
    department_id: shift.department_id
  }
  editingShift.value = shift
  shiftDialog.value = true
}

function closeDialog() {
  shiftDialog.value = false
  editingShift.value = null
}

async function saveShift() {
  if (!shiftFormRef.value) return
  const { valid } = await shiftFormRef.value.validate()
  if (!valid) return

  // Check skill qualifications before saving (Integration 2: Just-in-Time Training)
  if (shiftForm.value.employee_id && shiftForm.value.department_id) {
    const qualResult = await integrationsStore.checkShiftQualifications(
      shiftForm.value.employee_id,
      { department_id: shiftForm.value.department_id }
    )
    
    if (!qualResult.qualified && qualResult.missing.length > 0) {
      // Show training intercept dialog
      interceptMissingSkills.value = qualResult.missing
      interceptEmployeeId.value = shiftForm.value.employee_id
      
      // Get employee name
      const employee = resources.value.find(r => r.id === shiftForm.value.employee_id)
      interceptEmployeeName.value = employee?.name || 'Employee'
      
      interceptShiftId.value = editingShift.value?.id || null
      showTrainingIntercept.value = true
      return
    }
  }

  await performSaveShift()
}

async function performSaveShift() {
  isSaving.value = true

  try {
    const startAt = `${shiftForm.value.start_date}T${shiftForm.value.start_time}:00`
    const endAt = `${shiftForm.value.start_date}T${shiftForm.value.end_time}:00`

    if (editingShift.value) {
      await opsStore.updateShift(editingShift.value.id, {
        employee_id: shiftForm.value.employee_id,
        start_at: startAt,
        end_at: endAt,
        status: shiftForm.value.status as Shift['status'],
        location_id: shiftForm.value.location_id,
        department_id: shiftForm.value.department_id,
        is_open_shift: shiftForm.value.employee_id === null
      })
    } else {
      await opsStore.createShift({
        employee_id: shiftForm.value.employee_id,
        start_at: startAt,
        end_at: endAt,
        status: shiftForm.value.status as Shift['status'],
        location_id: shiftForm.value.location_id,
        department_id: shiftForm.value.department_id,
        is_open_shift: shiftForm.value.employee_id === null,
        created_by_employee_id: userStore.currentEmployee?.id
      })
    }

    closeDialog()
  } catch (err) {
    conflictMessage.value = err instanceof Error ? err.message : 'Failed to save shift'
    showConflict.value = true
  } finally {
    isSaving.value = false
  }
}

async function handleTrainingAssigned(result: { success: boolean; proceedWithShift: boolean }) {
  // Training was assigned via the intercept dialog
  showTrainingIntercept.value = false
  
  if (result.proceedWithShift) {
    // Proceed to save the shift
    await performSaveShift()
  }
}

async function deleteShift() {
  if (!editingShift.value) return
  
  isDeleting.value = true
  try {
    await opsStore.deleteShift(editingShift.value.id)
    closeDialog()
  } catch (err) {
    conflictMessage.value = err instanceof Error ? err.message : 'Failed to delete shift'
    showConflict.value = true
  } finally {
    isDeleting.value = false
  }
}

async function publishDrafts() {
  const draftIds = opsStore.draftShifts.map(s => s.id)
  if (draftIds.length === 0) return

  isPublishing.value = true
  try {
    await opsStore.publishShifts(draftIds)
  } catch (err) {
    conflictMessage.value = err instanceof Error ? err.message : 'Failed to publish shifts'
    showConflict.value = true
  } finally {
    isPublishing.value = false
  }
}

async function loadShifts() {
  const start = getWeekStart(currentDate.value)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  
  await opsStore.fetchShifts(
    start.toISOString(),
    end.toISOString()
  )
}

async function loadResources() {
  const supabase = useSupabaseClient()
  
  // Load locations
  const { data: locations } = await supabase
    .from('locations')
    .select('id, name')
    .order('name')
  locationOptions.value = locations || []
  
  // Load departments
  const { data: departments } = await supabase
    .from('departments')
    .select('id, name')
    .order('name')
  departmentOptions.value = departments || []
}

// Watchers
watch([currentDate, viewMode], () => {
  loadShifts()
})

// Lifecycle
onMounted(async () => {
  await Promise.all([
    loadShifts(),
    loadResources(),
    employeeStore.fetchEmployees()
  ])
})
</script>

<style scoped>
.master-schedule {
  overflow: hidden;
}

.schedule-grid {
  overflow-x: auto;
}

.grid-header {
  display: flex;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  background: rgb(var(--v-theme-surface));
  position: sticky;
  top: 0;
  z-index: 10;
}

.resource-label-header {
  min-width: 180px;
  max-width: 180px;
  padding: 12px 16px;
  border-right: 1px solid rgba(var(--v-border-color), 0.12);
  display: flex;
  align-items: center;
}

.time-header {
  flex: 1;
  min-width: 120px;
  padding: 8px 4px;
  text-align: center;
  border-right: 1px solid rgba(var(--v-border-color), 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.time-header.today {
  background: rgba(var(--v-theme-primary), 0.08);
}

.day-name {
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.day-number {
  font-weight: 600;
  font-size: 1.1rem;
}

.today-number {
  background: rgb(var(--v-theme-primary));
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.grid-body {
  min-height: 400px;
}

.resource-row {
  display: flex;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.08);
  min-height: 60px;
}

.resource-row:hover {
  background: rgba(var(--v-theme-primary), 0.02);
}

.unassigned-row {
  background: rgba(var(--v-theme-surface-variant), 0.3);
}

.resource-label {
  min-width: 180px;
  max-width: 180px;
  padding: 8px 16px;
  border-right: 1px solid rgba(var(--v-border-color), 0.12);
  display: flex;
  align-items: center;
  background: rgb(var(--v-theme-surface));
  position: sticky;
  left: 0;
  z-index: 5;
}

.resource-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.resource-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.resource-dept {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.time-cell {
  flex: 1;
  min-width: 120px;
  padding: 4px;
  border-right: 1px solid rgba(var(--v-border-color), 0.08);
  position: relative;
  cursor: pointer;
  transition: background 0.2s;
}

.time-cell:hover {
  background: rgba(var(--v-theme-primary), 0.05);
}

.today-cell {
  background: rgba(var(--v-theme-primary), 0.04);
}

.shift-block {
  background: rgb(var(--v-theme-primary));
  color: white;
  border-radius: 6px;
  padding: 4px 8px;
  margin: 2px 0;
  cursor: grab;
  position: relative;
  font-size: 0.75rem;
  transition: transform 0.15s, box-shadow 0.15s;
}

.shift-block:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.shift-block.is-dragging {
  opacity: 0.5;
  cursor: grabbing;
}

.shift-block.status-draft {
  background: rgb(var(--v-theme-warning));
  border: 2px dashed rgba(255,255,255,0.5);
}

.shift-block.status-published {
  background: rgb(var(--v-theme-primary));
}

.shift-block.status-completed {
  background: rgb(var(--v-theme-success));
}

.shift-block.status-cancelled {
  background: rgba(var(--v-theme-on-surface), 0.3);
  text-decoration: line-through;
}

.shift-block.open-shift {
  background: rgb(var(--v-theme-info));
  border: 2px dashed white;
}

.shift-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.shift-time {
  font-weight: 600;
}

.shift-location {
  opacity: 0.9;
}

.draft-indicator {
  position: absolute;
  top: 2px;
  right: 2px;
  opacity: 0.8;
}

.hour-label {
  font-weight: 500;
}

@media (max-width: 768px) {
  .resource-label-header,
  .resource-label {
    min-width: 120px;
    max-width: 120px;
  }
  
  .time-cell,
  .time-header {
    min-width: 80px;
  }
  
  .resource-info {
    display: none;
  }
}
</style>
