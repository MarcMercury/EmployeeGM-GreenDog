<script setup lang="ts">
/**
 * Schedule Builder v3 - The "Cockpit"
 * Ultra high-density admin scheduling interface for 100+ employees
 * 
 * Features:
 * - Super compact employee sidebar ("The Bench") with workload counters & reliability scores
 * - Location-based grid with shift slots organized by day
 * - Drag-and-drop with conflict prevention (double-booking, overtime)
 * - Save as Template / Load Template for recurring schedules
 * - Close Clinic functionality (right-click header)
 * - Attendance color coding (late = yellow, absent = red, PTO = purple, on-time = green)
 * - Auto-suggest "Magic Wand" for intelligent shift filling
 */
import { format, addDays, startOfWeek, isSameDay, parseISO, subDays } from 'date-fns'
import type { ScheduleShift, ScheduleEmployee } from '~/composables/useScheduleRules'

definePageMeta({
  middleware: ['auth', 'admin-only'],
  layout: 'default'
})

// Stores and composables
const scheduleStore = useScheduleBuilderStore()
const { employees, locations, isAdmin, departments, positions } = useAppData()
const { validateAssignment, getEmployeeHours, calculateHours } = useScheduleRules()
const toast = useToast()
const supabase = useSupabaseClient()

// Attendance/reliability data
const employeeReliability = ref<Map<string, { score: number; onTime: number; late: number; absent: number; total: number }>>(new Map())
const shiftAttendance = ref<Map<string, 'on-time' | 'late' | 'absent' | 'pto' | 'pending'>>(new Map())

// --- State ---
const currentWeekStart = ref(startOfWeek(new Date(), { weekStartsOn: 1 }))

// Sidebar filters
const employeeSearch = ref('')
const filterDepartment = ref<string | null>(null)
const filterPosition = ref<string | null>(null)

// Grid options
const visibleLocations = ref<string[]>([])
const showLocationPicker = ref(false)

// Drag state
const draggedEmployee = ref<ScheduleEmployee | null>(null)
const dragOverSlotKey = ref<string | null>(null)
const dropValidation = ref<{ valid: boolean; message: string | null } | null>(null)

// Dialogs
const showTemplateDialog = ref(false)
const showLoadTemplateDialog = ref(false)
const templateName = ref('')
const templates = ref<{ id: string; name: string; description: string | null }[]>([])
const selectedTemplateId = ref<string | null>(null)

// Add Shift Dialog
const showAddShiftDialog = ref(false)
const addShiftLocation = ref<any>(null)
const addShiftDate = ref<Date | null>(null)
const addShiftForm = ref({
  startTime: '09:00',
  endTime: '17:00',
  roleRequired: ''
})

// Generate Base Schedule Dialog
const showGenerateDialog = ref(false)
const selectedLocationForGenerate = ref<string | null>(null)
const isGenerating = ref(false)

// Context menu
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  locationId: '',
  date: '',
  locationName: ''
})

// Dialogs
const showDiscardDialog = ref(false)
const showPublishDialog = ref(false)
const showAutoSuggestDialog = ref(false)

// Employee detail drawer
const showEmployeeDrawer = ref(false)
const selectedEmployeeForDrawer = ref<string | null>(null)

// --- Load Reliability Scores ---
const loadReliabilityScores = async () => {
  const employeeIds = (employees.value || []).map(e => e.id)
  if (employeeIds.length === 0) return
  
  try {
    // Get shifts from last 90 days
    const ninetyDaysAgo = subDays(new Date(), 90)
    
    const { data: shiftsData } = await supabase
      .from('shifts')
      .select('id, employee_id, start_at, status')
      .in('employee_id', employeeIds)
      .gte('start_at', ninetyDaysAgo.toISOString())
      .lt('start_at', new Date().toISOString())
    
    const { data: punchesData } = await supabase
      .from('time_punches')
      .select('employee_id, punch_type, punched_at, shift_id')
      .in('employee_id', employeeIds)
      .gte('punched_at', ninetyDaysAgo.toISOString())
    
    // Calculate reliability per employee
    const reliabilityMap = new Map<string, { score: number; onTime: number; late: number; absent: number; total: number }>()
    
    for (const empId of employeeIds) {
      const empShifts = (shiftsData || []).filter(s => s.employee_id === empId)
      const empPunches = (punchesData || []).filter(p => p.employee_id === empId && p.punch_type === 'in')
      
      let onTime = 0
      let late = 0
      let absent = 0
      
      for (const shift of empShifts) {
        const shiftStart = parseISO(shift.start_at)
        const clockIn = empPunches.find(p => {
          const punchTime = parseISO(p.punched_at)
          // Find punch within 2 hours of shift start
          const diffMinutes = (punchTime.getTime() - shiftStart.getTime()) / (1000 * 60)
          return diffMinutes >= -120 && diffMinutes <= 120
        })
        
        if (!clockIn) {
          // Check if shift is marked as missed/absent
          if (shift.status === 'missed' || shift.status === 'cancelled') {
            absent++
          } else if (shiftStart < new Date()) {
            absent++
          }
        } else {
          const punchTime = parseISO(clockIn.punched_at)
          const lateMinutes = (punchTime.getTime() - shiftStart.getTime()) / (1000 * 60)
          if (lateMinutes > 5) {
            late++
          } else {
            onTime++
          }
        }
      }
      
      const total = onTime + late + absent
      const score = total > 0 ? Math.round((onTime / total) * 100) : 100
      
      reliabilityMap.set(empId, { score, onTime, late, absent, total })
    }
    
    employeeReliability.value = reliabilityMap
  } catch (err) {
    console.error('Error loading reliability scores:', err)
  }
}

// --- Load Shift Attendance Data ---
const loadShiftAttendance = async () => {
  const shifts = scheduleStore.draftShifts || []
  if (shifts.length === 0) return
  
  const pastShifts = shifts.filter(s => parseISO(s.start_at) < new Date() && s.employee_id)
  if (pastShifts.length === 0) return
  
  try {
    const { data: punchesData } = await supabase
      .from('time_punches')
      .select('employee_id, punch_type, punched_at')
      .in('employee_id', pastShifts.map(s => s.employee_id).filter(Boolean))
      .gte('punched_at', format(currentWeekStart.value, 'yyyy-MM-dd'))
    
    const { data: timeOffData } = await supabase
      .from('time_off_requests')
      .select('employee_id, start_date, end_date, status')
      .eq('status', 'approved')
      .gte('end_date', format(currentWeekStart.value, 'yyyy-MM-dd'))
      .lte('start_date', format(addDays(currentWeekStart.value, 6), 'yyyy-MM-dd'))
    
    const attendanceMap = new Map<string, 'on-time' | 'late' | 'absent' | 'pto' | 'pending'>()
    
    for (const shift of pastShifts) {
      const shiftStart = parseISO(shift.start_at)
      const shiftDate = format(shiftStart, 'yyyy-MM-dd')
      
      // Check if on PTO
      const ptoRequest = (timeOffData || []).find(pto => 
        pto.employee_id === shift.employee_id &&
        shiftDate >= pto.start_date &&
        shiftDate <= pto.end_date
      )
      
      if (ptoRequest) {
        attendanceMap.set(shift.id, 'pto')
        continue
      }
      
      // Find clock-in punch
      const clockIn = (punchesData || []).find(p => {
        if (p.employee_id !== shift.employee_id || p.punch_type !== 'in') return false
        const punchTime = parseISO(p.punched_at)
        const diffMinutes = (punchTime.getTime() - shiftStart.getTime()) / (1000 * 60)
        return diffMinutes >= -60 && diffMinutes <= 120
      })
      
      if (!clockIn) {
        attendanceMap.set(shift.id, 'absent')
      } else {
        const punchTime = parseISO(clockIn.punched_at)
        const lateMinutes = (punchTime.getTime() - shiftStart.getTime()) / (1000 * 60)
        attendanceMap.set(shift.id, lateMinutes > 5 ? 'late' : 'on-time')
      }
    }
    
    shiftAttendance.value = attendanceMap
  } catch (err) {
    console.error('Error loading shift attendance:', err)
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

// All unique department names
const departmentOptions = computed(() => 
  (departments.value || []).map(d => ({ title: d.name, value: d.id }))
)

// All unique position titles
const positionOptions = computed(() => 
  (positions.value || []).map(p => ({ title: p.title, value: p.id }))
)

// Filtered employees for the bench
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

// Visible locations for the grid
const activeLocations = computed(() => {
  const locs = locations.value || []
  if (visibleLocations.value.length === 0) {
    // Show all locations by default
    return locs
  }
  return locs.filter(l => visibleLocations.value.includes(l.id))
})

// Get shifts grouped by location and day
const shiftMatrix = computed(() => {
  const matrix: Record<string, Record<string, ScheduleShift[]>> = {}
  const locs = activeLocations.value || []
  const days = weekDays.value || []
  const shifts = scheduleStore.draftShifts || []
  
  locs.forEach(loc => {
    matrix[loc.id] = {}
    days.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd')
      matrix[loc.id][dateStr] = shifts.filter(s => 
        s.location_id === loc.id && 
        s.start_at?.startsWith(dateStr)
      ).sort((a, b) => (a.start_at || '').localeCompare(b.start_at || ''))
    })
  })
  
  return matrix
})

// Check if location/day is closed
const isLocationDayClosed = (locationId: string, dateStr: string): boolean => {
  const shifts = shiftMatrix.value[locationId]?.[dateStr] || []
  return shifts.length > 0 && shifts.every(s => s.status === 'closed_clinic')
}

// Get workload count (shifts assigned) for an employee this week
const getEmployeeShiftCount = (employeeId: string): number => {
  return (scheduleStore.draftShifts || []).filter(s => s.employee_id === employeeId).length
}

// Get employee by ID
const getEmployee = (employeeId: string | null) => {
  if (!employeeId) return null
  return (employees.value || []).find(e => e.id === employeeId)
}

// Get reliability score for employee
const getEmployeeReliability = (employeeId: string): number => {
  return employeeReliability.value.get(employeeId)?.score ?? 100
}

// Get reliability color
const getReliabilityColor = (score: number): string => {
  if (score >= 95) return 'success'
  if (score >= 80) return 'warning'
  return 'error'
}

// Open employee detail drawer
const openEmployeeDrawer = (employeeId: string) => {
  selectedEmployeeForDrawer.value = employeeId
  showEmployeeDrawer.value = true
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
  dragOverSlotKey.value = null
  dropValidation.value = null
}

const handleDragOver = (shift: ScheduleShift, event: DragEvent) => {
  event.preventDefault()
  const key = `${shift.id}`
  dragOverSlotKey.value = key
  
  if (draggedEmployee.value) {
    const validation = validateAssignment(
      draggedEmployee.value,
      shift,
      scheduleStore.draftShifts
    )
    dropValidation.value = { valid: validation.valid || validation.type === 'warning', message: validation.message }
  }
}

const handleDragLeave = () => {
  dragOverSlotKey.value = null
  dropValidation.value = null
}

const handleDrop = (shift: ScheduleShift, event: DragEvent) => {
  event.preventDefault()
  
  if (!draggedEmployee.value) return
  
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
    toast.success(`Assigned ${draggedEmployee.value.first_name} to shift`)
  }
  
  handleDragEnd()
}

const unassignEmployee = (shiftId: string) => {
  scheduleStore.unassignEmployee(shiftId)
}

const removeShift = (shiftId: string) => {
  scheduleStore.removeShift(shiftId)
}

// --- Add Shift ---
const openAddShiftDialog = (location: any, day: Date) => {
  addShiftLocation.value = location
  addShiftDate.value = day
  addShiftForm.value = {
    startTime: '09:00',
    endTime: '17:00',
    roleRequired: ''
  }
  showAddShiftDialog.value = true
}

const addShift = () => {
  if (!addShiftLocation.value || !addShiftDate.value) return
  
  scheduleStore.addShift(
    addShiftLocation.value.id,
    addShiftLocation.value.name,
    addShiftDate.value,
    addShiftForm.value.startTime,
    addShiftForm.value.endTime,
    addShiftForm.value.roleRequired || undefined
  )
  
  showAddShiftDialog.value = false
}

// --- Generate Base Schedule from Templates ---
const generateBaseSchedule = async () => {
  if (!selectedLocationForGenerate.value) {
    toast.error('Please select a location')
    return
  }
  
  const location = locations.value.find(l => l.id === selectedLocationForGenerate.value)
  if (!location) return
  
  isGenerating.value = true
  try {
    const addedCount = await scheduleStore.generateFromTemplates(
      currentWeekStart.value,
      location.id,
      location.name
    )
    
    if (addedCount > 0) {
      toast.success(`Generated ${addedCount} shift slots from templates`)
    } else {
      toast.info('No new shifts added - schedule already has shifts for this week')
    }
    
    showGenerateDialog.value = false
  } catch (err: any) {
    toast.error(err.message || 'Failed to generate schedule')
  } finally {
    isGenerating.value = false
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

// --- Context Menu (Close Clinic) ---
const openContextMenu = (event: MouseEvent, locationId: string, date: Date) => {
  event.preventDefault()
  const loc = locations.value.find(l => l.id === locationId)
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    locationId,
    date: format(date, 'yyyy-MM-dd'),
    locationName: loc?.name || 'Location'
  }
}

const closeContextMenu = () => {
  contextMenu.value.show = false
}

const toggleClinicClosed = () => {
  const { locationId, date } = contextMenu.value
  const isClosed = isLocationDayClosed(locationId, date)
  
  if (isClosed) {
    scheduleStore.reopenLocation(locationId, date)
    toast.success('Clinic reopened')
  } else {
    scheduleStore.closeLocation(locationId, date)
    toast.info('Clinic marked as closed')
  }
  
  closeContextMenu()
}

// --- Templates ---
const loadTemplates = async () => {
  const { data } = await supabase
    .from('schedule_templates')
    .select('id, name, description')
    .eq('is_active', true)
    .order('name')
  
  templates.value = data || []
}

const saveAsTemplate = async () => {
  if (!templateName.value.trim()) {
    toast.error('Please enter a template name')
    return
  }
  
  try {
    // Create template
    const { data: template, error: templateError } = await supabase
      .from('schedule_templates')
      .insert({
        name: templateName.value.trim(),
        description: `Week of ${format(currentWeekStart.value, 'MMM d, yyyy')}`
      })
      .select()
      .single()
    
    if (templateError) throw templateError
    
    // Save template shifts
    const templateShifts = scheduleStore.draftShifts.map(shift => {
      const shiftDate = parseISO(shift.start_at)
      const dayOfWeek = (shiftDate.getDay() + 6) % 7 // Convert to Mon=0, Sun=6
      
      return {
        template_id: template.id,
        day_of_week: dayOfWeek,
        start_time: format(parseISO(shift.start_at), 'HH:mm:ss'),
        end_time: format(parseISO(shift.end_at), 'HH:mm:ss'),
        location_id: shift.location_id,
        role_required: shift.role_required,
        employee_id: shift.employee_id
      }
    })
    
    const { error: shiftsError } = await supabase
      .from('schedule_template_shifts')
      .insert(templateShifts)
    
    if (shiftsError) throw shiftsError
    
    toast.success(`Template "${templateName.value}" saved!`)
    templateName.value = ''
    showTemplateDialog.value = false
    await loadTemplates()
  } catch (err) {
    console.error('Error saving template:', err)
    toast.error('Failed to save template')
  }
}

const applyTemplate = async () => {
  if (!selectedTemplateId.value) return
  
  try {
    const { data: templateShifts } = await supabase
      .from('schedule_template_shifts')
      .select('*')
      .eq('template_id', selectedTemplateId.value)
    
    if (!templateShifts?.length) {
      toast.error('Template has no shifts')
      return
    }
    
    // Create shifts from template for current week
    const newShifts = templateShifts.map(ts => {
      const targetDay = addDays(currentWeekStart.value, ts.day_of_week)
      const [startHour, startMin] = ts.start_time.split(':').map(Number)
      const [endHour, endMin] = ts.end_time.split(':').map(Number)
      
      const startAt = new Date(targetDay)
      startAt.setHours(startHour, startMin, 0, 0)
      
      const endAt = new Date(targetDay)
      endAt.setHours(endHour, endMin, 0, 0)
      
      return {
        location_id: ts.location_id,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        role_required: ts.role_required,
        employee_id: ts.employee_id,
        status: 'draft',
        is_open_shift: !ts.employee_id,
        is_published: false
      }
    })
    
    const { error } = await supabase
      .from('shifts')
      .insert(newShifts)
    
    if (error) throw error
    
    toast.success('Template applied! Reloading schedule...')
    showLoadTemplateDialog.value = false
    selectedTemplateId.value = null
    await scheduleStore.loadWeek(currentWeekStart.value)
  } catch (err) {
    console.error('Error applying template:', err)
    toast.error('Failed to apply template')
  }
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
    // Find available employees
    const available = employees.value.filter(emp => {
      if (!emp.is_active) return false
      
      // Check if role matches
      if (shift.role_required) {
        const empTitle = emp.position?.title || ''
        if (!empTitle.toLowerCase().includes(shift.role_required.toLowerCase())) {
          return false
        }
      }
      
      // Check for conflicts
      const validation = validateAssignment(
        {
          id: emp.id,
          first_name: emp.first_name,
          last_name: emp.last_name,
          full_name: emp.full_name,
          initials: emp.initials,
          position: emp.position
        },
        shift,
        scheduleStore.draftShifts
      )
      
      return validation.valid
    })
    
    if (available.length > 0) {
      // Sort by least hours worked this week
      available.sort((a, b) => 
        getEmployeeHours(a.id, scheduleStore.draftShifts) - 
        getEmployeeHours(b.id, scheduleStore.draftShifts)
      )
      
      scheduleStore.assignEmployee(shift.id, available[0].id)
      assigned++
    }
  })
  
  if (assigned > 0) {
    toast.success(`Auto-assigned ${assigned} shift${assigned > 1 ? 's' : ''}`)
  } else {
    toast.warning('No suitable employees found for open shifts')
  }
  
  showAutoSuggestDialog.value = false
}

// --- Save/Publish ---
const handleSave = async () => {
  const success = await scheduleStore.saveDraft()
  if (success) {
    toast.success('Schedule saved')
  } else {
    toast.error('Failed to save schedule')
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
    toast.success('Schedule published! Employees will be notified.')
  } else {
    toast.error('Failed to publish schedule')
  }
}

// --- Shift slot styling based on attendance (for past shifts) ---
const getShiftStatusClass = (shift: ScheduleShift): string => {
  if (shift.status === 'closed_clinic') return 'slot-closed'
  if (!shift.employee_id) return 'slot-open'
  
  const shiftStart = parseISO(shift.start_at)
  const now = new Date()
  
  // Future shift - just show as filled
  if (shiftStart > now) {
    return 'slot-filled'
  }
  
  // Past shift - check attendance from our loaded data
  const attendance = shiftAttendance.value.get(shift.id)
  
  switch (attendance) {
    case 'on-time':
      return 'slot-ontime'
    case 'late':
      return 'slot-late'
    case 'absent':
      return 'slot-absent'
    case 'pto':
      return 'slot-pto'
    default:
      return 'slot-filled'
  }
}

// Get attendance icon for shift
const getAttendanceIcon = (shift: ScheduleShift): string | null => {
  const shiftStart = parseISO(shift.start_at)
  if (shiftStart > new Date() || !shift.employee_id) return null
  
  const attendance = shiftAttendance.value.get(shift.id)
  
  switch (attendance) {
    case 'on-time':
      return 'mdi-check-circle'
    case 'late':
      return 'mdi-clock-alert'
    case 'absent':
      return 'mdi-close-circle'
    case 'pto':
      return 'mdi-palm-tree'
    default:
      return null
  }
}

// Get attendance color for shift
const getAttendanceColor = (shift: ScheduleShift): string => {
  const attendance = shiftAttendance.value.get(shift.id)
  switch (attendance) {
    case 'on-time':
      return 'success'
    case 'late':
      return 'warning'
    case 'pto':
      return 'purple'
    case 'absent':
      return 'error'
    default:
      return 'grey'
  }
}

// Format time for display
const formatShiftTime = (startAt: string, endAt: string): string => {
  return `${format(parseISO(startAt), 'h:mm a')} - ${format(parseISO(endAt), 'h:mm a')}`
}

// --- Lifecycle ---
watch(currentWeekStart, async (newWeek) => {
  await scheduleStore.loadWeek(newWeek)
  // Reload attendance data for the new week
  await loadShiftAttendance()
}, { immediate: true })

onMounted(async () => {
  // Initialize visible locations to all
  visibleLocations.value = (locations.value || []).map(l => l.id)
  await Promise.all([
    loadTemplates(),
    loadReliabilityScores()
  ])
})

// Click outside to close context menu
const handleClickOutside = () => {
  if (contextMenu.value.show) {
    closeContextMenu()
  }
}
</script>

<template>
  <div class="schedule-cockpit" @click="handleClickOutside">
    <!-- Loading Overlay -->
    <div v-if="scheduleStore.isLoading" class="loading-overlay">
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
        <!-- Stats -->
        <v-chip variant="tonal" size="small" color="success" class="mr-1">
          <v-icon start size="14">mdi-account-check</v-icon>
          {{ scheduleStore.shiftStats.filled }}
        </v-chip>
        <v-chip variant="tonal" size="small" color="warning" class="mr-1">
          <v-icon start size="14">mdi-account-clock</v-icon>
          {{ scheduleStore.shiftStats.open }}
        </v-chip>
        <v-chip v-if="scheduleStore.shiftStats.closed > 0" variant="tonal" size="small" color="grey">
          <v-icon start size="14">mdi-cancel</v-icon>
          {{ scheduleStore.shiftStats.closed }}
        </v-chip>
        
        <v-divider vertical class="mx-2" />
        
        <!-- Smart Tools -->
        <v-btn 
          variant="tonal" 
          size="small" 
          color="primary"
          prepend-icon="mdi-calendar-plus"
          @click="showGenerateDialog = true"
        >
          Generate Base
        </v-btn>
        
        <v-btn 
          variant="text" 
          size="small" 
          prepend-icon="mdi-auto-fix"
          @click="showAutoSuggestDialog = true"
        >
          Auto-Fill
        </v-btn>
        
        <v-menu>
          <template #activator="{ props }">
            <v-btn variant="text" size="small" prepend-icon="mdi-content-save-cog" v-bind="props">
              Templates
            </v-btn>
          </template>
          <v-list density="compact">
            <v-list-item prepend-icon="mdi-content-save" @click="showTemplateDialog = true">
              <v-list-item-title>Save as Template</v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-download" @click="showLoadTemplateDialog = true; loadTemplates()">
              <v-list-item-title>Load Template</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
        
        <v-btn 
          variant="text" 
          size="small" 
          prepend-icon="mdi-eye-settings"
          @click="showLocationPicker = true"
        >
          View
        </v-btn>
      </div>
    </header>

    <!-- Main Content -->
    <div class="cockpit-body">
      <!-- LEFT: Employee Bench -->
      <aside class="employee-bench">
        <div class="bench-header">
          <div class="d-flex align-center justify-space-between mb-1">
            <span class="text-caption font-weight-bold text-grey-darken-2">TEAM BENCH</span>
            <v-chip size="x-small" variant="tonal">{{ filteredEmployees.length }}</v-chip>
          </div>
          <v-text-field
            v-model="employeeSearch"
            placeholder="Search team..."
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
            @click.right.prevent="openEmployeeDrawer(emp.id)"
          >
            <div class="employee-avatar">
              <v-avatar size="20" :color="emp.avatar_url ? undefined : 'primary'">
                <v-img v-if="emp.avatar_url" :src="emp.avatar_url" />
                <span v-else class="text-white" style="font-size: 8px;">{{ emp.initials }}</span>
              </v-avatar>
            </div>
            <div class="employee-info">
              <div class="employee-name">
                {{ emp.first_name }} {{ emp.last_name?.charAt(0) }}.
              </div>
              <div class="employee-role">
                {{ emp.position?.title?.substring(0, 12) || 'Staff' }}
              </div>
            </div>
            <div class="employee-badges">
              <v-tooltip location="top">
                <template #activator="{ props }">
                  <span 
                    v-bind="props"
                    class="reliability-badge"
                    :class="[`reliability-${getReliabilityColor(getEmployeeReliability(emp.id))}`]"
                  >
                    {{ getEmployeeReliability(emp.id) }}%
                  </span>
                </template>
                Reliability Score (On-Time %)
              </v-tooltip>
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
            <span class="legend-item"><span class="dot dot-success"></span>On-time</span>
            <span class="legend-item"><span class="dot dot-warning"></span>Late</span>
            <span class="legend-item"><span class="dot dot-error"></span>Absent</span>
          </div>
        </div>
      </aside>

      <!-- RIGHT: Schedule Grid -->
      <main class="schedule-grid">
        <!-- Grid Header: Days + Locations -->
        <div class="grid-header">
          <div class="location-header-spacer"></div>
          <div 
            v-for="day in weekDays" 
            :key="day.toISOString()" 
            class="day-header"
            :class="{ 'is-today': isSameDay(day, new Date()) }"
          >
            <div class="day-name">{{ format(day, 'EEE') }}</div>
            <div class="day-date">{{ format(day, 'M/d') }}</div>
          </div>
        </div>

        <!-- Grid Body: Location rows -->
        <div class="grid-body">
          <div 
            v-for="location in activeLocations" 
            :key="location.id"
            class="location-row"
          >
            <!-- Location Label -->
            <div class="location-label">
              <v-icon size="14" class="mr-1">mdi-map-marker</v-icon>
              {{ location.name }}
            </div>
            
            <!-- Day Columns -->
            <div 
              v-for="day in weekDays" 
              :key="`${location.id}-${day.toISOString()}`"
              class="day-cell"
              :class="{ 
                'is-closed': isLocationDayClosed(location.id, format(day, 'yyyy-MM-dd')),
                'is-today': isSameDay(day, new Date())
              }"
              @contextmenu="openContextMenu($event, location.id, day)"
            >
              <!-- Shift Slots -->
              <div 
                v-for="shift in shiftMatrix[location.id]?.[format(day, 'yyyy-MM-dd')] || []"
                :key="shift.id"
                class="shift-slot"
                :class="[
                  getShiftStatusClass(shift),
                  { 'drag-over': dragOverSlotKey === shift.id }
                ]"
                @dragover="handleDragOver(shift, $event)"
                @dragleave="handleDragLeave"
                @drop="handleDrop(shift, $event)"
              >
                <div class="d-flex align-center justify-space-between">
                  <div class="shift-time">
                    {{ format(parseISO(shift.start_at), 'h:mma') }}-{{ format(parseISO(shift.end_at), 'h:mma') }}
                  </div>
                  <div class="d-flex align-center gap-1">
                    <v-icon 
                      v-if="getAttendanceIcon(shift)" 
                      :icon="getAttendanceIcon(shift)" 
                      size="10"
                      :color="getAttendanceColor(shift)"
                    />
                    <v-btn
                      v-if="!shift.employee_id"
                      icon="mdi-delete"
                      size="x-small"
                      variant="text"
                      density="compact"
                      color="error"
                      @click.stop="removeShift(shift.id)"
                    />
                  </div>
                </div>
                <div v-if="shift.role_required" class="shift-role">{{ shift.role_required }}</div>
                
                <!-- Assigned Employee -->
                <div v-if="shift.employee_id" class="shift-employee">
                  <span class="emp-name">{{ getEmployee(shift.employee_id)?.first_name }}</span>
                  <v-btn 
                    icon="mdi-close" 
                    size="x-small" 
                    variant="text"
                    density="compact"
                    @click.stop="unassignEmployee(shift.id)"
                  />
                </div>
                
                <!-- Empty Slot -->
                <div v-else-if="shift.status !== 'closed_clinic'" class="shift-empty">
                  <v-icon size="12">mdi-account-plus</v-icon>
                </div>
                
                <!-- Closed Slot -->
                <div v-else class="shift-closed">
                  <v-icon size="12">mdi-cancel</v-icon>
                </div>
              </div>
              
              <!-- Add Shift Button (always visible in each cell) -->
              <v-btn
                v-if="!isLocationDayClosed(location.id, format(day, 'yyyy-MM-dd'))"
                size="x-small"
                variant="text"
                color="primary"
                class="add-shift-btn"
                @click="openAddShiftDialog(location, day)"
              >
                <v-icon size="14">mdi-plus</v-icon>
              </v-btn>
            </div>
          </div>
          
          <!-- No locations message -->
          <div v-if="activeLocations.length === 0" class="no-locations">
            <v-icon size="48" color="grey-lighten-2">mdi-map-marker-off</v-icon>
            <div class="text-body-2 text-grey mt-2">No locations selected</div>
            <v-btn variant="text" size="small" @click="showLocationPicker = true">
              Select Locations
            </v-btn>
          </div>
        </div>
      </main>
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

    <!-- Context Menu -->
    <v-menu 
      v-model="contextMenu.show" 
      :style="{ position: 'absolute', left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      :close-on-content-click="true"
    >
      <v-list density="compact">
        <v-list-item @click="toggleClinicClosed">
          <template #prepend>
            <v-icon>{{ isLocationDayClosed(contextMenu.locationId, contextMenu.date) ? 'mdi-door-open' : 'mdi-cancel' }}</v-icon>
          </template>
          <v-list-item-title>
            {{ isLocationDayClosed(contextMenu.locationId, contextMenu.date) ? 'Reopen Clinic' : 'Close Clinic' }}
          </v-list-item-title>
          <v-list-item-subtitle>{{ contextMenu.locationName }} - {{ contextMenu.date }}</v-list-item-subtitle>
        </v-list-item>
      </v-list>
    </v-menu>

    <!-- Location Picker Dialog -->
    <v-dialog v-model="showLocationPicker" max-width="400">
      <v-card>
        <v-card-title>View Options</v-card-title>
        <v-card-text>
          <div class="text-subtitle-2 mb-2">Show Locations</div>
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
          <v-btn variant="text" @click="visibleLocations = locations.map(l => l.id)">Show All</v-btn>
          <v-spacer />
          <v-btn color="primary" @click="showLocationPicker = false">Done</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Save Template Dialog -->
    <v-dialog v-model="showTemplateDialog" max-width="400">
      <v-card>
        <v-card-title>Save as Template</v-card-title>
        <v-card-text>
          <p class="text-body-2 text-grey mb-4">
            Save this week's schedule as a reusable template.
          </p>
          <v-text-field
            v-model="templateName"
            label="Template Name"
            placeholder="e.g., Standard Summer Week"
            variant="outlined"
            :rules="[v => !!v || 'Name required']"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showTemplateDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveAsTemplate">Save Template</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Load Template Dialog -->
    <v-dialog v-model="showLoadTemplateDialog" max-width="400">
      <v-card>
        <v-card-title>Load Template</v-card-title>
        <v-card-text>
          <p class="text-body-2 text-grey mb-4">
            Apply a saved template to this week. This will add shifts from the template.
          </p>
          <v-select
            v-model="selectedTemplateId"
            :items="templates"
            item-title="name"
            item-value="id"
            label="Select Template"
            variant="outlined"
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props">
                <v-list-item-subtitle v-if="item.raw.description">
                  {{ item.raw.description }}
                </v-list-item-subtitle>
              </v-list-item>
            </template>
          </v-select>
          <v-alert v-if="templates.length === 0" type="info" variant="tonal" density="compact">
            No templates saved yet. Create one using "Save as Template".
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showLoadTemplateDialog = false">Cancel</v-btn>
          <v-btn color="primary" :disabled="!selectedTemplateId" @click="applyTemplate">
            Apply Template
          </v-btn>
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
            The system will analyze open shifts and suggest the best available employees based on:
          </p>
          <v-list density="compact">
            <v-list-item prepend-icon="mdi-briefcase-check">Role matching</v-list-item>
            <v-list-item prepend-icon="mdi-clock-alert">No time conflicts</v-list-item>
            <v-list-item prepend-icon="mdi-scale-balance">Balanced workload (least hours first)</v-list-item>
          </v-list>
          <v-alert type="info" variant="tonal" density="compact" class="mt-4">
            {{ scheduleStore.shiftStats.open }} open shift{{ scheduleStore.shiftStats.open !== 1 ? 's' : '' }} to fill
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showAutoSuggestDialog = false">Cancel</v-btn>
          <v-btn color="primary" prepend-icon="mdi-magic-staff" @click="autoSuggest">
            Auto-Fill
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Generate Base Schedule Dialog -->
    <v-dialog v-model="showGenerateDialog" max-width="500">
      <v-card>
        <v-card-title>
          <v-icon class="mr-2" color="primary">mdi-calendar-plus</v-icon>
          Generate Base Schedule
        </v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-4">
            This will create the standard clinic shifts for the selected week from the shift templates. 
            These are the base shifts that the clinic operates with every week.
          </p>
          
          <v-select
            v-model="selectedLocationForGenerate"
            :items="locations"
            item-title="name"
            item-value="id"
            label="Select Location"
            variant="outlined"
            class="mb-3"
            :rules="[v => !!v || 'Location is required']"
          />
          
          <v-alert type="info" variant="tonal" density="compact">
            <strong>Week:</strong> {{ format(currentWeekStart, 'MMM d') }} – {{ format(addDays(currentWeekStart, 6), 'MMM d, yyyy') }}
          </v-alert>
          
          <v-alert v-if="scheduleStore.draftShifts.length > 0" type="warning" variant="tonal" density="compact" class="mt-3">
            Existing shifts for this week will be preserved. Only days without shifts will be populated.
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showGenerateDialog = false">Cancel</v-btn>
          <v-btn 
            color="primary" 
            :loading="isGenerating"
            :disabled="!selectedLocationForGenerate"
            @click="generateBaseSchedule"
          >
            Generate Shifts
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Discard Dialog -->
    <v-dialog v-model="showDiscardDialog" max-width="400">
      <v-card>
        <v-card-title>Discard Changes?</v-card-title>
        <v-card-text>
          All unsaved changes will be lost.
        </v-card-text>
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
          <p class="mb-4">
            Publishing will notify all assigned employees of their shifts.
          </p>
          <div class="d-flex gap-2 flex-wrap mb-4">
            <v-chip color="success">{{ scheduleStore.shiftStats.filled }} Filled</v-chip>
            <v-chip v-if="scheduleStore.shiftStats.open > 0" color="warning">
              {{ scheduleStore.shiftStats.open }} Open
            </v-chip>
          </div>
          <v-alert v-if="scheduleStore.shiftStats.open > 0" type="warning" variant="tonal" density="compact">
            Some shifts are still open. Consider using Auto-Fill first.
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showPublishDialog = false">Cancel</v-btn>
          <v-btn 
            color="success" 
            :loading="scheduleStore.isPublishing"
            @click="handlePublish"
          >
            Publish & Notify
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Shift Dialog -->
    <v-dialog v-model="showAddShiftDialog" max-width="400">
      <v-card>
        <v-card-title>
          <v-icon class="mr-2">mdi-plus-circle</v-icon>
          Add Shift
        </v-card-title>
        <v-card-subtitle v-if="addShiftLocation && addShiftDate">
          {{ addShiftLocation.name }} - {{ format(addShiftDate, 'EEE, MMM d') }}
        </v-card-subtitle>
        <v-card-text>
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="addShiftForm.startTime"
                label="Start Time"
                type="time"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="addShiftForm.endTime"
                label="End Time"
                type="time"
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>
          <v-text-field
            v-model="addShiftForm.roleRequired"
            label="Role Required (optional)"
            placeholder="e.g., Hygienist, Assistant"
            variant="outlined"
            density="compact"
          />
          <v-alert type="info" variant="tonal" density="compact" class="mt-2">
            After adding, drag an employee from the bench to assign them.
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showAddShiftDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="addShift">Add Shift</v-btn>
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
  background: #f8f9fa;
  position: relative;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.9);
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

.header-left {
  display: flex;
  align-items: center;
}

.header-center {
  display: flex;
  align-items: center;
  gap: 4px;
}

.week-label {
  font-weight: 500;
  font-size: 0.85rem;
  min-width: 180px;
  text-align: center;
}

.header-right {
  display: flex;
  align-items: center;
}

/* Body: Bench + Grid */
.cockpit-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Employee Bench - Ultra Compact for 100+ employees */
.employee-bench {
  width: 220px;
  background: white;
  border-right: 1px solid #e0e0e0;
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

.compact-input :deep(.v-field__input) {
  padding: 4px 8px;
  min-height: 28px;
}

.bench-list {
  flex: 1;
  overflow-y: auto;
  padding: 2px;
}

/* Ultra-compact employee card for high density */
.bench-employee {
  display: flex;
  align-items: center;
  padding: 3px 4px;
  border-radius: 4px;
  cursor: grab;
  font-size: 0.65rem;
  transition: background 0.15s;
  gap: 4px;
  border-bottom: 1px solid #f5f5f5;
}

.bench-employee:hover {
  background: #f0f7ff;
  border-color: #e0e0e0;
}

.bench-employee:active {
  cursor: grabbing;
  background: #e3f2fd;
}

.employee-avatar {
  flex-shrink: 0;
}

.employee-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.employee-name {
  font-weight: 600;
  font-size: 0.68rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #333;
  line-height: 1.2;
}

.employee-role {
  font-size: 0.55rem;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.1;
}

.employee-badges {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.reliability-badge {
  font-size: 0.55rem;
  font-weight: 600;
  padding: 1px 3px;
  border-radius: 3px;
}

.reliability-success {
  background: #e8f5e9;
  color: #2e7d32;
}

.reliability-warning {
  background: #fff3e0;
  color: #ef6c00;
}

.reliability-error {
  background: #ffebee;
  color: #c62828;
}

.workload-badge {
  flex-shrink: 0;
  min-width: 18px;
  height: 16px !important;
  font-size: 0.6rem !important;
}

.bench-footer {
  padding: 4px 6px;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
  font-size: 0.6rem;
}

.legend {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 3px;
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
  flex-shrink: 0;
}

.location-header-spacer {
  width: 90px;
  flex-shrink: 0;
  border-right: 1px solid #e0e0e0;
}

.day-header {
  flex: 1;
  padding: 4px;
  text-align: center;
  border-right: 1px solid #e0e0e0;
  min-width: 90px;
}

.day-header:last-child {
  border-right: none;
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

.grid-body {
  flex: 1;
  overflow: auto;
}

.location-row {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  min-height: 50px;
}

.location-label {
  width: 90px;
  padding: 6px;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  color: #666;
  background: #fafafa;
  border-right: 1px solid #e0e0e0;
  display: flex;
  align-items: flex-start;
  flex-shrink: 0;
}

.day-cell {
  flex: 1;
  padding: 3px;
  border-right: 1px solid #e0e0e0;
  min-width: 90px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.day-cell:last-child {
  border-right: none;
}

.day-cell.is-today {
  background: #f3f8ff;
}

.day-cell.is-closed {
  background: repeating-linear-gradient(
    45deg,
    #f5f5f5,
    #f5f5f5 5px,
    #e8e8e8 5px,
    #e8e8e8 10px
  );
  pointer-events: none;
}

.add-shift-btn {
  opacity: 0.4;
  transition: opacity 0.2s;
  margin-top: 2px;
}

.day-cell:hover .add-shift-btn {
  opacity: 1;
}

.no-locations {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
}

/* Shift Slots - Compact */
.shift-slot {
  padding: 3px 5px;
  border-radius: 3px;
  font-size: 0.6rem;
  border: 1px solid #e0e0e0;
  background: white;
  transition: all 0.15s;
}

.shift-slot.slot-open {
  border-color: #ff9800;
  border-style: dashed;
  background: #fffaf0;
}

.shift-slot.slot-filled {
  border-color: #4caf50;
  background: #f1f8f2;
}

.shift-slot.slot-closed {
  border-color: #9e9e9e;
  background: #f5f5f5;
  opacity: 0.6;
}

.shift-slot.slot-ontime {
  border-color: #4caf50;
  background: #e8f5e9;
  border-left: 3px solid #4caf50;
}

.shift-slot.slot-late {
  border-color: #ff9800;
  background: #fff3e0;
  border-left: 3px solid #ff9800;
}

.shift-slot.slot-absent {
  border-color: #f44336;
  background: #ffebee;
  border-left: 3px solid #f44336;
}

.shift-slot.slot-pto {
  border-color: #9c27b0;
  background: #f3e5f5;
  border-left: 3px solid #9c27b0;
}

.shift-slot.drag-over {
  border-color: #1976d2;
  background: #e3f2fd;
  transform: scale(1.02);
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
}

.shift-time {
  font-weight: 500;
  color: #333;
  font-size: 0.58rem;
}

.shift-role {
  color: #666;
  font-size: 0.55rem;
}

.shift-employee {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1px;
}

.emp-name {
  font-weight: 600;
  color: #1976d2;
  font-size: 0.6rem;
}

.shift-empty,
.shift-closed {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  margin-top: 2px;
}

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

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

/* Scrollbar styling for bench */
.bench-list::-webkit-scrollbar {
  width: 4px;
}

.bench-list::-webkit-scrollbar-track {
  background: #f5f5f5;
}

.bench-list::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 2px;
}

.bench-list::-webkit-scrollbar-thumb:hover {
  background: #aaa;
}
</style>
