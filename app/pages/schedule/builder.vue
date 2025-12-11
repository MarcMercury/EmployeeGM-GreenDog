<script setup lang="ts">
/**
 * Schedule Builder - Admin Only
 * Drag-and-drop schedule creation with conflict detection
 */
definePageMeta({
  middleware: ['auth', 'admin-only']
})

import { format, addDays, startOfWeek, endOfWeek, isSameDay } from 'date-fns'

const scheduleStore = useScheduleBuilderStore()
const { employees, isAdmin } = useAppData()
const { validateAssignment, getValidationClass, getEmployeeHours } = useScheduleRules()

// Week navigation
const currentWeekStart = ref(startOfWeek(new Date(), { weekStartsOn: 1 }))

// Days of the week
const weekDays = computed(() => {
  const days = []
  for (let i = 0; i < 7; i++) {
    days.push(addDays(currentWeekStart.value, i))
  }
  return days
})

// Load schedule on mount and week change
watch(currentWeekStart, (newWeek) => {
  scheduleStore.loadWeek(newWeek)
}, { immediate: true })

// Navigate weeks
const previousWeek = () => {
  currentWeekStart.value = addDays(currentWeekStart.value, -7)
}

const nextWeek = () => {
  currentWeekStart.value = addDays(currentWeekStart.value, 7)
}

const goToToday = () => {
  currentWeekStart.value = startOfWeek(new Date(), { weekStartsOn: 1 })
}

// Get shifts for a specific day
const getShiftsForDay = (date: Date) => {
  const dateStr = format(date, 'yyyy-MM-dd')
  return scheduleStore.shiftsByDate[dateStr] || []
}

// Drag and drop
const draggedEmployeeId = ref<string | null>(null)
const dragOverSlotId = ref<string | null>(null)

const handleDragStart = (employeeId: string) => {
  draggedEmployeeId.value = employeeId
}

const handleDragEnd = () => {
  draggedEmployeeId.value = null
  dragOverSlotId.value = null
}

const handleDragOver = (shiftId: string, e: DragEvent) => {
  e.preventDefault()
  dragOverSlotId.value = shiftId
}

const handleDrop = async (shift: any, e: DragEvent) => {
  e.preventDefault()
  if (!draggedEmployeeId.value) return

  const employee = employees.value.find((emp: any) => emp.id === draggedEmployeeId.value)
  if (!employee) return

  // Validate assignment
  const validation = validateAssignment(
    employee,
    shift,
    scheduleStore.draftShifts
  )

  if (validation.valid) {
    scheduleStore.assignEmployee(shift.id, draggedEmployeeId.value)
  } else {
    // Show warning but allow override for warnings
    if (validation.type === 'warning') {
      scheduleStore.assignEmployee(shift.id, draggedEmployeeId.value)
    }
    // Block if error
  }

  handleDragEnd()
}

// Confirm dialog
const showDiscardDialog = ref(false)
const showPublishDialog = ref(false)

const handleDiscard = () => {
  scheduleStore.discardChanges()
  showDiscardDialog.value = false
}

const handleSave = async () => {
  const success = await scheduleStore.saveDraft()
  if (success) {
    // Show success toast
  }
}

const handlePublish = async () => {
  const success = await scheduleStore.publishSchedule()
  if (success) {
    showPublishDialog.value = false
    // Show success toast
  }
}

// Employee hours for the week
const getHoursForEmployee = (employeeId: string) => {
  return getEmployeeHours(employeeId, scheduleStore.draftShifts)
}
</script>

<template>
  <ClientOnly>
    <div class="schedule-builder min-h-[calc(100vh-64px)]">
      <!-- Loading State -->
      <div v-if="scheduleStore.isLoading" class="d-flex flex-column justify-center align-center py-12 h-full">
        <v-progress-circular indeterminate color="primary" size="48" />
        <span class="mt-4 text-grey">Loading schedule...</span>
      </div>

      <!-- Error State -->
      <v-alert v-else-if="scheduleStore.error" type="error" class="ma-4">
        {{ scheduleStore.error }}
        <v-btn variant="text" size="small" @click="scheduleStore.loadWeek(currentWeekStart)">
          Retry
        </v-btn>
      </v-alert>

      <!-- Main Content -->
      <template v-else>
        <!-- Header -->
        <div class="builder-header">
          <div class="header-left">
            <h1 class="text-h5 font-weight-bold">Schedule Builder</h1>
            <v-chip color="primary" variant="flat" size="small" class="ml-2">
              Admin Only
            </v-chip>
          </div>

          <div class="header-center">
            <v-btn icon="mdi-chevron-left" variant="text" @click="previousWeek" />
            <v-btn variant="tonal" size="small" class="mx-2" @click="goToToday">
              Today
            </v-btn>
            <span class="week-range">
              {{ format(currentWeekStart, 'MMM d') }} - {{ format(addDays(currentWeekStart, 6), 'MMM d, yyyy') }}
            </span>
            <v-btn icon="mdi-chevron-right" variant="text" @click="nextWeek" />
          </div>

          <div class="header-right">
            <v-chip variant="outlined" size="small" class="mr-2">
              <v-icon start size="small">mdi-account-check</v-icon>
              {{ scheduleStore.shiftStats.filled }} Filled
            </v-chip>
            <v-chip variant="outlined" size="small" color="warning" class="mr-2">
              <v-icon start size="small">mdi-account-clock</v-icon>
              {{ scheduleStore.shiftStats.open }} Open
            </v-chip>
          </div>
        </div>

        <!-- Main content: Resource Bench + Grid -->
        <div class="builder-content">
          <!-- Resource Bench (Left sidebar) -->
          <div class="resource-bench">
            <div class="bench-header">
              <h3 class="text-subtitle-1 font-weight-medium">Team Roster</h3>
              <v-text-field
                density="compact"
                variant="outlined"
                placeholder="Filter..."
                prepend-inner-icon="mdi-magnify"
                hide-details
                class="mt-2"
              />
            </div>

        <div class="bench-employees">
          <div
            v-for="emp in employees"
            :key="emp.id"
            class="employee-card"
            draggable="true"
            @dragstart="handleDragStart(emp.id)"
            @dragend="handleDragEnd"
          >
            <v-avatar size="36" color="primary" class="mr-3">
              <span class="text-white text-caption">
                {{ emp.first_name?.charAt(0) }}{{ emp.last_name?.charAt(0) }}
              </span>
            </v-avatar>
            <div class="employee-info">
              <div class="font-weight-medium">
                {{ emp.first_name }} {{ emp.last_name }}
              </div>
              <div class="text-caption text-grey">
                {{ emp.position?.title || 'Employee' }}
              </div>
            </div>
            <div class="employee-hours">
              <v-chip size="x-small" :color="getHoursForEmployee(emp.id) > 40 ? 'error' : 'grey'">
                {{ getHoursForEmployee(emp.id).toFixed(1) }}h
              </v-chip>
            </div>
          </div>

          <div v-if="employees.length === 0" class="text-center pa-4 text-grey">
            No employees found
          </div>
        </div>
      </div>

      <!-- Schedule Grid (Main area) -->
      <div class="schedule-grid">
        <v-progress-linear v-if="scheduleStore.isLoading" indeterminate color="primary" />

        <!-- Day Headers -->
        <div class="grid-header">
          <div v-for="day in weekDays" :key="day.toISOString()" class="day-header">
            <div class="day-name" :class="{ 'is-today': isSameDay(day, new Date()) }">
              {{ format(day, 'EEE') }}
            </div>
            <div class="day-date">{{ format(day, 'MMM d') }}</div>
          </div>
        </div>

        <!-- Shifts Grid -->
        <div class="grid-body">
          <div v-for="day in weekDays" :key="day.toISOString()" class="day-column">
            <!-- Shift slots -->
            <div
              v-for="shift in getShiftsForDay(day)"
              :key="shift.id"
              class="shift-slot"
              :class="{
                'is-filled': shift.employee_id != null,
                'is-open': shift.employee_id == null && shift.status !== 'closed_clinic',
                'is-closed': shift.status === 'closed_clinic',
                'drag-over': dragOverSlotId === shift.id,
                [getValidationClass(draggedEmployeeId ? validateAssignment(employees.find(e => e.id === draggedEmployeeId)!, shift, scheduleStore.draftShifts) : null)]: draggedEmployeeId
              }"
              @dragover="handleDragOver(shift.id, $event)"
              @dragleave="dragOverSlotId = null"
              @drop="handleDrop(shift, $event)"
            >
              <div class="shift-time">
                {{ format(new Date(shift.start_at), 'h:mm a') }} - 
                {{ format(new Date(shift.end_at), 'h:mm a') }}
              </div>
              <div class="shift-location text-caption">
                {{ shift.location_name || 'Location' }}
              </div>

              <!-- Assigned employee -->
              <div v-if="shift.employee_id" class="assigned-employee">
                <v-chip
                  size="small"
                  closable
                  @click:close="scheduleStore.unassignEmployee(shift.id)"
                >
                  {{ employees.find(e => e.id === shift.employee_id)?.first_name }}
                </v-chip>
              </div>

              <!-- Empty state -->
              <div v-else-if="shift.status !== 'closed_clinic'" class="empty-slot">
                <v-icon size="small" color="grey">mdi-account-plus</v-icon>
                <span class="text-caption">Drop here</span>
              </div>

              <!-- Closed state -->
              <div v-else class="closed-slot">
                <v-icon size="small" color="grey">mdi-cancel</v-icon>
                <span class="text-caption">Closed</span>
              </div>
            </div>

            <!-- No shifts for day - Show empty slot placeholder -->
            <div v-if="getShiftsForDay(day).length === 0" class="empty-day-placeholder">
              <v-icon size="24" color="grey-lighten-1">mdi-calendar-blank</v-icon>
              <span class="text-caption text-grey mt-1">No shifts scheduled</span>
              <v-btn 
                variant="text" 
                size="x-small" 
                color="primary"
                class="mt-2"
              >
                + Add Shift
              </v-btn>
            </div>
          </div>
        </div>
        
        <!-- Empty Week State -->
        <div v-if="scheduleStore.draftShifts.length === 0 && !scheduleStore.isLoading" class="empty-week-overlay">
          <v-icon size="64" color="grey-lighten-1">mdi-calendar-clock</v-icon>
          <h3 class="text-h6 mt-4">No Shifts This Week</h3>
          <p class="text-body-2 text-grey mt-2">
            Shifts haven't been created for {{ format(currentWeekStart, 'MMM d') }} - {{ format(addDays(currentWeekStart, 6), 'MMM d') }}
          </p>
          <v-btn color="primary" class="mt-4" prepend-icon="mdi-plus">
            Create Shifts
          </v-btn>
        </div>
      </div>
    </div>

    <!-- Unsaved Changes Bar -->
    <Teleport to="body">
      <Transition name="slide-up">
        <div v-if="scheduleStore.hasUnsavedChanges" class="unsaved-bar">
          <v-icon color="warning" class="mr-2">mdi-alert-circle</v-icon>
          <span>You have unsaved changes</span>
          <v-spacer />
          <v-btn
            variant="text"
            size="small"
            @click="showDiscardDialog = true"
          >
            Discard
          </v-btn>
          <v-btn
            variant="tonal"
            color="primary"
            size="small"
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

    <!-- Discard Dialog -->
    <v-dialog v-model="showDiscardDialog" max-width="400">
      <v-card>
        <v-card-title>Discard Changes?</v-card-title>
        <v-card-text>
          All unsaved changes will be lost. This cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDiscardDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="handleDiscard">Discard</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Publish Dialog -->
    <v-dialog v-model="showPublishDialog" max-width="500">
      <v-card>
        <v-card-title>Publish Schedule?</v-card-title>
        <v-card-text>
          <p class="mb-4">
            Publishing will notify all assigned employees of their shifts for:
          </p>
          <v-chip color="primary" class="mr-2">
            {{ format(currentWeekStart, 'MMM d') }} - {{ format(addDays(currentWeekStart, 6), 'MMM d') }}
          </v-chip>
          <v-alert type="info" variant="tonal" class="mt-4">
            <strong>{{ scheduleStore.shiftStats.filled }}</strong> filled shifts will be published.
            <span v-if="scheduleStore.shiftStats.open > 0" class="text-warning">
              ({{ scheduleStore.shiftStats.open }} shifts still open)
            </span>
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showPublishDialog = false">Cancel</v-btn>
          <v-btn
            color="success"
            variant="flat"
            :loading="scheduleStore.isPublishing"
            @click="handlePublish"
          >
            Publish & Notify
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    </template>
  </div>
  
  <!-- SSR Fallback -->
  <template #fallback>
    <div class="d-flex flex-column justify-center align-center min-h-[calc(100vh-64px)] bg-grey-lighten-4">
      <v-progress-circular indeterminate color="primary" size="48" />
      <span class="mt-4 text-grey">Loading Schedule Builder...</span>
    </div>
  </template>
  </ClientOnly>
</template>

<style scoped>
.schedule-builder {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px);
  background: #f5f5f5;
}

.builder-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-center {
  display: flex;
  align-items: center;
}

.week-range {
  font-weight: 500;
  min-width: 180px;
  text-align: center;
}

.builder-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Resource Bench */
.resource-bench {
  width: 280px;
  background: white;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
}

.bench-header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.bench-employees {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.employee-card {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  background: #fafafa;
  border-radius: 8px;
  cursor: grab;
  transition: all 0.2s;
}

.employee-card:hover {
  background: #f0f0f0;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.employee-card:active {
  cursor: grabbing;
}

.employee-info {
  flex: 1;
  min-width: 0;
}

.employee-hours {
  flex-shrink: 0;
}

/* Schedule Grid */
.schedule-grid {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.grid-header {
  display: flex;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

.day-header {
  flex: 1;
  padding: 12px;
  text-align: center;
  border-right: 1px solid #e0e0e0;
}

.day-header:last-child {
  border-right: none;
}

.day-name {
  font-weight: 600;
  font-size: 0.875rem;
}

.day-name.is-today {
  color: #1976D2;
}

.day-date {
  font-size: 0.75rem;
  color: #666;
}

.grid-body {
  display: flex;
  flex: 1;
  overflow-y: auto;
}

.day-column {
  flex: 1;
  padding: 8px;
  border-right: 1px solid #e0e0e0;
  min-height: 100%;
}

.day-column:last-child {
  border-right: none;
}

/* Shift slots */
.shift-slot {
  background: white;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  border: 2px dashed #e0e0e0;
  transition: all 0.2s;
}

.shift-slot.is-filled {
  border-style: solid;
  border-color: #4CAF50;
  background: #E8F5E9;
}

.shift-slot.is-open {
  border-color: #FF9800;
}

.shift-slot.is-closed {
  border-color: #9E9E9E;
  background: #f5f5f5;
  opacity: 0.7;
}

.shift-slot.drag-over {
  border-color: #1976D2;
  background: #E3F2FD;
  transform: scale(1.02);
}

.shift-slot.validation-error {
  border-color: #f44336;
  background: #FFEBEE;
}

.shift-slot.validation-warning {
  border-color: #FF9800;
  background: #FFF3E0;
}

.shift-time {
  font-weight: 500;
  font-size: 0.875rem;
}

.shift-location {
  color: #666;
  margin-bottom: 8px;
}

.assigned-employee {
  margin-top: 8px;
}

.empty-slot,
.closed-slot {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #9e9e9e;
  margin-top: 8px;
}

.no-shifts {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

/* Empty day placeholder */
.empty-day-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  min-height: 120px;
  border: 2px dashed #e0e0e0;
  border-radius: 8px;
  margin: 4px;
  background: #fafafa;
}

/* Empty week overlay */
.empty-week-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 32px;
  background: rgba(255,255,255,0.95);
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.1);
}

/* Schedule grid relative positioning */
.schedule-grid {
  position: relative;
}

/* Unsaved changes bar */
.unsaved-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  padding: 12px 24px;
  background: white;
  border-top: 1px solid #e0e0e0;
  box-shadow: 0 -4px 12px rgba(0,0,0,0.1);
  z-index: 100;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>
