<script setup lang="ts">
/**
 * Schedule Builder v4 - The "Cockpit"
 * 
 * LAYOUT per user specs:
 * - LEFT: Shift Templates (ROWS) from shift_templates table
 * - TOP: Days of week (columns) with Location sub-columns beneath
 * - RIGHT: Employee Bench (drag source)
 * - CELLS: Drop zones for employee assignments
 */
import { format, addDays, startOfWeek, isSameDay, parseISO, subDays } from 'date-fns'
import type { ScheduleShift, ScheduleEmployee } from '~/composables/useScheduleRules'

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

// Stores and composables
const scheduleStore = useScheduleBuilderStore()
const { employees, locations, isAdmin, departments, positions } = useAppData()
const { validateAssignment, getEmployeeHours } = useScheduleRules()
const toast = useToast()
const supabase = useSupabaseClient()

// --- State ---
const currentWeekStart = ref(startOfWeek(new Date(), { weekStartsOn: 1 }))
const shiftTemplates = ref<ShiftTemplate[]>([])
const isLoadingTemplates = ref(true)

// Sidebar filters
const employeeSearch = ref('')
const filterDepartment = ref<string | null>(null)
const filterPosition = ref<string | null>(null)

// Grid options - location visibility
const visibleLocations = ref<string[]>([])
const showLocationPicker = ref(false)

// Drag state
const draggedEmployee = ref<ScheduleEmployee | null>(null)
const dragOverCellKey = ref<string | null>(null)

// Dialogs
const showDiscardDialog = ref(false)
const showPublishDialog = ref(false)
const showAutoSuggestDialog = ref(false)

// Reliability data
const employeeReliability = ref<Map<string, number>>(new Map())

// --- Load Shift Templates ---
const loadShiftTemplates = async () => {
  isLoadingTemplates.value = true
  try {
    const { data, error } = await supabase
      .from('shift_templates')
      .select('*')
      .eq('is_active', true)
      .order('start_time')
      .order('role_name')
    
    if (error) throw error
    shiftTemplates.value = data || []
  } catch (err) {
    console.error('Error loading shift templates:', err)
    toast.error('Failed to load shift templates')
  } finally {
    isLoadingTemplates.value = false
  }
}

// --- Load Reliability Scores ---
const loadReliabilityScores = async () => {
  const employeeIds = (employees.value || []).map(e => e.id)
  if (employeeIds.length === 0) return
  
  try {
    const ninetyDaysAgo = subDays(new Date(), 90)
    
    const { data: shiftsData } = await supabase
      .from('shifts')
      .select('id, employee_id, start_at, status')
      .in('employee_id', employeeIds)
      .gte('start_at', ninetyDaysAgo.toISOString())
      .lt('start_at', new Date().toISOString())
    
    const { data: punchesData } = await supabase
      .from('time_punches')
      .select('employee_id, punch_type, punched_at')
      .in('employee_id', employeeIds)
      .gte('punched_at', ninetyDaysAgo.toISOString())
    
    const reliabilityMap = new Map<string, number>()
    
    for (const empId of employeeIds) {
      const empShifts = (shiftsData || []).filter(s => s.employee_id === empId)
      const empPunches = (punchesData || []).filter(p => p.employee_id === empId && p.punch_type === 'in')
      
      let onTime = 0
      let total = 0
      
      for (const shift of empShifts) {
        const shiftStart = parseISO(shift.start_at)
        if (shiftStart >= new Date()) continue
        total++
        
        const clockIn = empPunches.find(p => {
          const punchTime = parseISO(p.punched_at)
          const diffMinutes = (punchTime.getTime() - shiftStart.getTime()) / (1000 * 60)
          return diffMinutes >= -60 && diffMinutes <= 30
        })
        
        if (clockIn) {
          const punchTime = parseISO(clockIn.punched_at)
          const lateMinutes = (punchTime.getTime() - shiftStart.getTime()) / (1000 * 60)
          if (lateMinutes <= 5) onTime++
        }
      }
      
      reliabilityMap.set(empId, total > 0 ? Math.round((onTime / total) * 100) : 100)
    }
    
    employeeReliability.value = reliabilityMap
  } catch (err) {
    console.error('Error loading reliability:', err)
  }
}

// --- Computed ---
const weekDays = computed(() => {
  const days = []
  for (let i = 0; i < 7; i++) {
    days.push(addDays(currentWeekStart.value, i))
  }
  return days
})

const departmentOptions = computed(() => 
  (departments.value || []).map(d => ({ title: d.name, value: d.id }))
)

const positionOptions = computed(() => 
  (positions.value || []).map(p => ({ title: p.title, value: p.id }))
)

const filteredEmployees = computed(() => {
  let result = (employees.value || []).filter(e => e.is_active)
  
  if (employeeSearch.value) {
    const search = employeeSearch.value.toLowerCase()
    result = result.filter(e => 
      e.full_name?.toLowerCase().includes(search) ||
      (e.position?.title || '').toLowerCase().includes(search)
    )
  }
  
  if (filterDepartment.value) {
    result = result.filter(e => e.department?.id === filterDepartment.value)
  }
  
  if (filterPosition.value) {
    result = result.filter(e => e.position?.id === filterPosition.value)
  }
  
  return result
})

const activeLocations = computed(() => {
  const locs = locations.value || []
  if (visibleLocations.value.length === 0) {
    return locs
  }
  return locs.filter(l => visibleLocations.value.includes(l.id))
})

// Get shift for a specific cell
const getShiftForCell = (templateId: string, locationId: string, dateStr: string): ScheduleShift | null => {
  const template = shiftTemplates.value.find(t => t.id === templateId)
  if (!template) return null
  
  return (scheduleStore.draftShifts || []).find(s => 
    s.location_id === locationId &&
    s.start_at?.startsWith(dateStr) &&
    s.role_required === template.role_name &&
    format(parseISO(s.start_at), 'HH:mm') === template.start_time
  ) || null
}

const getCellKey = (templateId: string, locationId: string, date: Date): string => {
  return `${templateId}-${locationId}-${format(date, 'yyyy-MM-dd')}`
}

const getEmployeeShiftCount = (employeeId: string): number => {
  return (scheduleStore.draftShifts || []).filter(s => s.employee_id === employeeId).length
}

const getEmployee = (employeeId: string | null) => {
  if (!employeeId) return null
  return (employees.value || []).find(e => e.id === employeeId)
}

const getReliabilityScore = (employeeId: string): number => {
  return employeeReliability.value.get(employeeId) ?? 100
}

const getReliabilityColor = (score: number): string => {
  if (score >= 95) return 'success'
  if (score >= 80) return 'warning'
  return 'error'
}

// --- Drag & Drop ---
const handleDragStart = (employee: any, event: DragEvent) => {
  draggedEmployee.value = {
    id: employee.id,
    first_name: employee.first_name,
    last_name: employee.last_name,
    full_name: employee.full_name,
    initials: employee.initials,
    avatar_url: employee.avatar_url,
    position: employee.position,
    hoursScheduled: getEmployeeHours(employee.id, scheduleStore.draftShifts)
  }
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

const handleDropOnCell = async (template: ShiftTemplate, location: any, date: Date, event: DragEvent) => {
  event.preventDefault()
  
  if (!draggedEmployee.value) return
  
  const dateStr = format(date, 'yyyy-MM-dd')
  let shift = getShiftForCell(template.id, location.id, dateStr)
  
  // If no shift exists for this cell, create one
  if (!shift) {
    const shiftId = scheduleStore.addShift(
      location.id,
      location.name,
      date,
      template.start_time,
      template.end_time,
      template.role_name
    )
    shift = scheduleStore.draftShifts.find(s => s.id === shiftId) || null
  }
  
  if (!shift) {
    toast.error('Failed to create shift')
    handleDragEnd()
    return
  }
  
  // Validate and assign
  const validation = validateAssignment(
    draggedEmployee.value,
    shift,
    scheduleStore.draftShifts
  )
  
  if (validation.type === 'error') {
    toast.error(validation.message || 'Cannot assign employee')
  } else {
    if (validation.type === 'warning') {
      toast.warning(validation.message || 'Warning')
    }
    scheduleStore.assignEmployee(shift.id, draggedEmployee.value.id)
    toast.success(`Assigned ${draggedEmployee.value.first_name}`)
  }
  
  handleDragEnd()
}

const unassignFromCell = (shift: ScheduleShift) => {
  scheduleStore.unassignEmployee(shift.id)
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

// --- Auto-Suggest ---
const autoSuggest = () => {
  const openShifts = scheduleStore.draftShifts.filter(s => 
    !s.employee_id && s.status !== 'closed_clinic'
  )
  
  if (openShifts.length === 0) {
    toast.info('No open shifts to fill')
    return
  }
  
  let assigned = 0
  
  openShifts.forEach(shift => {
    const available = (employees.value || []).filter(emp => {
      if (!emp.is_active) return false
      
      if (shift.role_required) {
        const empTitle = emp.position?.title || ''
        if (!empTitle.toLowerCase().includes(shift.role_required.toLowerCase())) {
          return false
        }
      }
      
      const validation = validateAssignment(
        { id: emp.id, first_name: emp.first_name, last_name: emp.last_name, full_name: emp.full_name, initials: emp.initials, position: emp.position },
        shift,
        scheduleStore.draftShifts
      )
      
      return validation.valid
    })
    
    if (available.length > 0) {
      available.sort((a, b) => 
        getEmployeeHours(a.id, scheduleStore.draftShifts) - 
        getEmployeeHours(b.id, scheduleStore.draftShifts)
      )
      
      scheduleStore.assignEmployee(shift.id, available[0].id)
      assigned++
    }
  })
  
  toast.success(`Auto-assigned ${assigned} shift${assigned !== 1 ? 's' : ''}`)
  showAutoSuggestDialog.value = false
}

// --- Save/Publish ---
const handleSave = async () => {
  const success = await scheduleStore.saveDraft()
  if (success) {
    toast.success('Schedule saved')
  } else {
    toast.error('Failed to save')
  }
}

const handleDiscard = () => {
  scheduleStore.discardChanges()
  showDiscardDialog.value = false
  toast.info('Changes discarded')
}

const handlePublish = async () => {
  const success = await scheduleStore.publishSchedule()
  if (success) {
    showPublishDialog.value = false
    toast.success('Schedule published!')
  } else {
    toast.error('Failed to publish')
  }
}

// --- Lifecycle ---
watch(currentWeekStart, async (newWeek) => {
  await scheduleStore.loadWeek(newWeek)
}, { immediate: true })

onMounted(async () => {
  visibleLocations.value = (locations.value || []).map(l => l.id)
  await Promise.all([
    loadShiftTemplates(),
    loadReliabilityScores()
  ])
})
</script>

<template>
  <div class="schedule-cockpit">
    <!-- Loading Overlay -->
    <div v-if="scheduleStore.isLoading || isLoadingTemplates" class="loading-overlay">
      <v-progress-circular indeterminate color="primary" size="48" />
      <span class="mt-4 text-grey">Loading schedule...</span>
    </div>

    <!-- Header Bar -->
    <header class="cockpit-header">
      <div class="header-left">
        <h1 class="text-h5 font-weight-bold">Schedule Builder</h1>
        <v-chip color="error" variant="flat" size="x-small" class="ml-2">ADMIN</v-chip>
      </div>

      <div class="header-center">
        <v-btn icon="mdi-chevron-left" size="small" variant="text" @click="previousWeek" />
        <v-btn variant="tonal" size="x-small" class="mx-1" @click="goToToday">Today</v-btn>
        <span class="week-label">
          {{ format(currentWeekStart, 'MMM d') }} – {{ format(addDays(currentWeekStart, 6), 'MMM d, yyyy') }}
        </span>
        <v-btn icon="mdi-chevron-right" size="small" variant="text" @click="nextWeek" />
      </div>

      <div class="header-right">
        <v-chip variant="tonal" size="small" color="success" class="mr-1">
          <v-icon start size="14">mdi-account-check</v-icon>
          {{ scheduleStore.shiftStats.filled }}
        </v-chip>
        <v-chip variant="tonal" size="small" color="warning" class="mr-1">
          <v-icon start size="14">mdi-account-clock</v-icon>
          {{ scheduleStore.shiftStats.open }}
        </v-chip>
        
        <v-divider vertical class="mx-2" />
        
        <v-btn variant="text" size="small" prepend-icon="mdi-auto-fix" @click="showAutoSuggestDialog = true">
          Auto-Fill
        </v-btn>
        
        <v-btn variant="text" size="small" prepend-icon="mdi-eye-settings" @click="showLocationPicker = true">
          Locations
        </v-btn>
      </div>
    </header>

    <!-- Main Body -->
    <div class="cockpit-body">
      <!-- LEFT: Shift Templates Column -->
      <aside class="shifts-column">
        <div class="shifts-header">
          <span class="text-caption font-weight-bold">SHIFTS</span>
          <span class="text-caption text-grey ml-auto">{{ shiftTemplates.length }}</span>
        </div>
        <div class="shifts-list">
          <div
            v-for="template in shiftTemplates"
            :key="template.id"
            class="shift-row-label"
          >
            <div class="shift-name">{{ template.role_name }}</div>
            <div class="shift-time">{{ template.raw_shift || `${template.start_time}-${template.end_time}` }}</div>
          </div>
        </div>
      </aside>

      <!-- CENTER: Schedule Grid -->
      <main class="schedule-grid">
        <!-- Day Headers (top row) -->
        <div class="grid-header-days">
          <div 
            v-for="day in weekDays" 
            :key="day.toISOString()"
            class="day-header-group"
            :style="{ width: `${100 / weekDays.length}%` }"
          >
            <div class="day-header" :class="{ 'is-today': isSameDay(day, new Date()) }">
              <div class="day-name">{{ format(day, 'EEE') }}</div>
              <div class="day-date">{{ format(day, 'M/d') }}</div>
            </div>
          </div>
        </div>

        <!-- Location Sub-Headers -->
        <div class="grid-header-locations">
          <div 
            v-for="day in weekDays" 
            :key="`loc-${day.toISOString()}`"
            class="location-group"
            :style="{ width: `${100 / weekDays.length}%` }"
          >
            <div 
              v-for="loc in activeLocations" 
              :key="`${day.toISOString()}-${loc.id}`"
              class="location-header"
              :style="{ width: `${100 / activeLocations.length}%` }"
            >
              {{ loc.name?.substring(0, 8) }}
            </div>
          </div>
        </div>

        <!-- Grid Body: Shift Template Rows -->
        <div class="grid-body">
          <div 
            v-for="template in shiftTemplates"
            :key="template.id"
            class="template-row"
          >
            <!-- Cells for each day + location -->
            <div 
              v-for="day in weekDays" 
              :key="`row-${template.id}-${day.toISOString()}`"
              class="day-cells-group"
              :style="{ width: `${100 / weekDays.length}%` }"
            >
              <div 
                v-for="loc in activeLocations"
                :key="getCellKey(template.id, loc.id, day)"
                class="schedule-cell"
                :class="{ 
                  'drag-over': dragOverCellKey === getCellKey(template.id, loc.id, day),
                  'has-employee': getShiftForCell(template.id, loc.id, format(day, 'yyyy-MM-dd'))?.employee_id
                }"
                :style="{ width: `${100 / activeLocations.length}%` }"
                @dragover="handleDragOverCell(getCellKey(template.id, loc.id, day), $event)"
                @dragleave="handleDragLeaveCell"
                @drop="handleDropOnCell(template, loc, day, $event)"
              >
                <template v-if="getShiftForCell(template.id, loc.id, format(day, 'yyyy-MM-dd'))?.employee_id">
                  <div class="cell-employee">
                    <span class="emp-name">
                      {{ getEmployee(getShiftForCell(template.id, loc.id, format(day, 'yyyy-MM-dd'))?.employee_id)?.first_name }}
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
                    <v-icon size="10" color="grey-lighten-1">mdi-plus</v-icon>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- RIGHT: Employee Bench -->
      <aside class="employee-bench">
        <div class="bench-header">
          <div class="d-flex align-center justify-space-between mb-1">
            <span class="text-caption font-weight-bold text-grey-darken-2">TEAM BENCH</span>
            <v-chip size="x-small" variant="tonal">{{ filteredEmployees.length }}</v-chip>
          </div>
          <v-text-field
            v-model="employeeSearch"
            placeholder="Search..."
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            hide-details
            class="mb-1 compact-input"
          />
          <div class="d-flex gap-1">
            <v-select
              v-model="filterDepartment"
              :items="departmentOptions"
              placeholder="Dept"
              variant="outlined"
              density="compact"
              hide-details
              clearable
              class="flex-grow-1 compact-input"
            />
            <v-select
              v-model="filterPosition"
              :items="positionOptions"
              placeholder="Role"
              variant="outlined"
              density="compact"
              hide-details
              clearable
              class="flex-grow-1 compact-input"
            />
          </div>
        </div>

        <div class="bench-list">
          <div
            v-for="emp in filteredEmployees"
            :key="emp.id"
            class="bench-employee"
            draggable="true"
            @dragstart="handleDragStart(emp, $event)"
            @dragend="handleDragEnd"
          >
            <v-avatar size="20" :color="emp.avatar_url ? undefined : 'primary'" class="mr-1">
              <v-img v-if="emp.avatar_url" :src="emp.avatar_url" />
              <span v-else class="text-white" style="font-size: 8px;">{{ emp.initials }}</span>
            </v-avatar>
            <div class="employee-info">
              <div class="employee-name">{{ emp.first_name }} {{ emp.last_name?.charAt(0) }}.</div>
              <div class="employee-role">{{ emp.position?.title?.substring(0, 15) || 'Staff' }}</div>
            </div>
            <div class="employee-badges">
              <span 
                class="reliability-badge"
                :class="[`reliability-${getReliabilityColor(getReliabilityScore(emp.id))}`]"
              >
                {{ getReliabilityScore(emp.id) }}%
              </span>
              <v-chip 
                size="x-small" 
                :color="getEmployeeShiftCount(emp.id) >= 5 ? 'warning' : 'grey'" 
                variant="tonal"
                class="workload-badge"
              >
                {{ getEmployeeShiftCount(emp.id) }}
              </v-chip>
            </div>
          </div>
          
          <div v-if="filteredEmployees.length === 0" class="text-center py-4 text-grey text-caption">
            No employees match filters
          </div>
        </div>
        
        <div class="bench-footer">
          <div class="legend">
            <span class="legend-item"><span class="dot dot-success"></span>≥95%</span>
            <span class="legend-item"><span class="dot dot-warning"></span>80-94%</span>
            <span class="legend-item"><span class="dot dot-error"></span>&lt;80%</span>
          </div>
        </div>
      </aside>
    </div>

    <!-- Unsaved Changes Bar -->
    <Teleport to="body">
      <Transition name="slide-up">
        <div v-if="scheduleStore.hasUnsavedChanges" class="unsaved-bar">
          <v-icon color="warning" size="18">mdi-alert-circle</v-icon>
          <span class="ml-2 text-body-2">Unsaved changes</span>
          <v-spacer />
          <v-btn variant="text" size="small" @click="showDiscardDialog = true">Discard</v-btn>
          <v-btn 
            variant="tonal" 
            color="primary" 
            size="small" 
            class="ml-2"
            :loading="scheduleStore.isSaving"
            @click="handleSave"
          >
            Save Draft
          </v-btn>
          <v-btn 
            variant="flat" 
            color="success" 
            size="small" 
            class="ml-2"
            @click="showPublishDialog = true"
          >
            Publish
          </v-btn>
        </div>
      </Transition>
    </Teleport>

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

    <!-- Auto-Suggest Dialog -->
    <v-dialog v-model="showAutoSuggestDialog" max-width="400">
      <v-card>
        <v-card-title>
          <v-icon class="mr-2">mdi-auto-fix</v-icon>
          Auto-Fill Open Shifts
        </v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-4">
            Auto-assign employees to open shifts based on role matching and availability.
          </p>
          <v-alert type="info" variant="tonal" density="compact">
            {{ scheduleStore.shiftStats.open }} open shifts to fill
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showAutoSuggestDialog = false">Cancel</v-btn>
          <v-btn color="primary" prepend-icon="mdi-magic-staff" @click="autoSuggest">Auto-Fill</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Discard Dialog -->
    <v-dialog v-model="showDiscardDialog" max-width="400">
      <v-card>
        <v-card-title>Discard Changes?</v-card-title>
        <v-card-text>All unsaved changes will be lost.</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDiscardDialog = false">Cancel</v-btn>
          <v-btn color="error" @click="handleDiscard">Discard</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Publish Dialog -->
    <v-dialog v-model="showPublishDialog" max-width="500">
      <v-card>
        <v-card-title>Publish Schedule?</v-card-title>
        <v-card-text>
          <p class="mb-4">Publishing will notify all assigned employees.</p>
          <div class="d-flex gap-2 flex-wrap mb-4">
            <v-chip color="success">{{ scheduleStore.shiftStats.filled }} Filled</v-chip>
            <v-chip v-if="scheduleStore.shiftStats.open > 0" color="warning">{{ scheduleStore.shiftStats.open }} Open</v-chip>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showPublishDialog = false">Cancel</v-btn>
          <v-btn color="success" :loading="scheduleStore.isPublishing" @click="handlePublish">Publish</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.schedule-cockpit {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px);
  background: #f5f5f5;
  position: relative;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.95);
  z-index: 100;
}

/* Header */
.cockpit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.header-left, .header-center, .header-right {
  display: flex;
  align-items: center;
}

.week-label {
  font-weight: 500;
  font-size: 0.85rem;
  min-width: 180px;
  text-align: center;
}

/* Body Layout */
.cockpit-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* LEFT: Shift Templates Column */
.shifts-column {
  width: 140px;
  background: #fafafa;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.shifts-header {
  height: 52px; /* Match day header + location header */
  display: flex;
  align-items: flex-end;
  padding: 4px 8px;
  border-bottom: 1px solid #e0e0e0;
  background: white;
}

.shifts-list {
  flex: 1;
  overflow-y: auto;
}

.shift-row-label {
  height: 36px;
  padding: 2px 6px;
  border-bottom: 1px solid #eee;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.shift-name {
  font-size: 0.65rem;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shift-time {
  font-size: 0.55rem;
  color: #888;
}

/* CENTER: Schedule Grid */
.schedule-grid {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.grid-header-days {
  display: flex;
  background: white;
  border-bottom: 1px solid #ddd;
  flex-shrink: 0;
}

.day-header-group {
  border-right: 1px solid #e0e0e0;
}

.day-header-group:last-child {
  border-right: none;
}

.day-header {
  padding: 4px;
  text-align: center;
}

.day-header.is-today {
  background: #e3f2fd;
}

.day-name {
  font-weight: 600;
  font-size: 0.7rem;
  text-transform: uppercase;
}

.day-date {
  font-size: 0.65rem;
  color: #666;
}

.grid-header-locations {
  display: flex;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.location-group {
  display: flex;
  border-right: 1px solid #e0e0e0;
}

.location-group:last-child {
  border-right: none;
}

.location-header {
  font-size: 0.55rem;
  font-weight: 600;
  text-align: center;
  padding: 2px;
  color: #666;
  text-transform: uppercase;
  border-right: 1px solid #eee;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.location-header:last-child {
  border-right: none;
}

.grid-body {
  flex: 1;
  overflow: auto;
}

.template-row {
  display: flex;
  height: 36px;
  border-bottom: 1px solid #eee;
}

.day-cells-group {
  display: flex;
  border-right: 1px solid #e0e0e0;
}

.day-cells-group:last-child {
  border-right: none;
}

.schedule-cell {
  border-right: 1px solid #eee;
  background: white;
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
  background: #f0f7ff;
}

.schedule-cell.drag-over {
  background: #e3f2fd;
  box-shadow: inset 0 0 0 2px #1976d2;
}

.schedule-cell.has-employee {
  background: #e8f5e9;
}

.cell-empty {
  opacity: 0.3;
}

.schedule-cell:hover .cell-empty {
  opacity: 0.6;
}

.cell-employee {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0 2px;
}

.emp-name {
  font-size: 0.55rem;
  font-weight: 600;
  color: #1976d2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.remove-btn {
  opacity: 0;
  transition: opacity 0.15s;
}

.schedule-cell:hover .remove-btn {
  opacity: 1;
}

/* RIGHT: Employee Bench */
.employee-bench {
  width: 200px;
  background: white;
  border-left: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.bench-header {
  padding: 6px;
  border-bottom: 1px solid #e0e0e0;
}

.compact-input :deep(.v-field) {
  font-size: 0.7rem;
  min-height: 28px;
}

.bench-list {
  flex: 1;
  overflow-y: auto;
  padding: 2px;
}

.bench-employee {
  display: flex;
  align-items: center;
  padding: 4px;
  border-radius: 4px;
  cursor: grab;
  font-size: 0.65rem;
  transition: background 0.15s;
  gap: 4px;
  border-bottom: 1px solid #f5f5f5;
}

.bench-employee:hover {
  background: #f0f7ff;
}

.bench-employee:active {
  cursor: grabbing;
  background: #e3f2fd;
}

.employee-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.employee-name {
  font-weight: 600;
  font-size: 0.65rem;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.employee-role {
  font-size: 0.55rem;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.employee-badges {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.reliability-badge {
  font-size: 0.5rem;
  font-weight: 600;
  padding: 1px 3px;
  border-radius: 3px;
}

.reliability-success { background: #e8f5e9; color: #2e7d32; }
.reliability-warning { background: #fff3e0; color: #ef6c00; }
.reliability-error { background: #ffebee; color: #c62828; }

.workload-badge {
  min-width: 16px;
  height: 14px !important;
  font-size: 0.55rem !important;
}

.bench-footer {
  padding: 4px 6px;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
}

.legend {
  display: flex;
  justify-content: center;
  gap: 8px;
  font-size: 0.55rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 2px;
  color: #666;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.dot-success { background: #4caf50; }
.dot-warning { background: #ff9800; }
.dot-error { background: #f44336; }

/* Unsaved Bar */
.unsaved-bar {
  position: fixed;
  bottom: 0;
  left: 264px;
  right: 0;
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: white;
  border-top: 1px solid #e0e0e0;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.1);
  z-index: 100;
}

.slide-up-enter-active, .slide-up-leave-active {
  transition: transform 0.3s ease;
}

.slide-up-enter-from, .slide-up-leave-to {
  transform: translateY(100%);
}

/* Scrollbars */
.shifts-list::-webkit-scrollbar,
.grid-body::-webkit-scrollbar,
.bench-list::-webkit-scrollbar {
  width: 4px;
}

.shifts-list::-webkit-scrollbar-thumb,
.grid-body::-webkit-scrollbar-thumb,
.bench-list::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 2px;
}
</style>
