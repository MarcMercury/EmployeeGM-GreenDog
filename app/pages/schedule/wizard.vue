<script setup lang="ts">
/**
 * Schedule Wizard - Service-Based Schedule Builder
 * 
 * 5-Step Wizard Flow:
 * 1. SCOPE: Select week, location, operational days, services
 * 2. STAFFING MATRIX: Assign employees to service slots (ghost cards)
 * 3. VALIDATE: AI/Logic checks for conflicts and understaffing → Submit for Review
 * 4. REVIEW: Reviewer edits and approves the schedule
 * 5. PUBLISH: Finalize, push to shifts, notify employees
 */
import { format, addDays, startOfWeek, parseISO } from 'date-fns'
import type { Service, StaffingRequirement, DraftSlot, WizardValidationResult, DashboardLocation, ScheduleDraftStatus } from '~/types/schedule.types'

definePageMeta({
  middleware: ['auth', 'schedule-access'],
  layout: 'default'
})

// Composables
const supabase = useSupabaseClient()
const toast = useToast()
const route = useRoute()
const { employees, locations } = useAppData()

// Wizard state
const currentStep = ref(1)
const isLoading = ref(false)
const isSaving = ref(false)

// Step 1: Scope
const selectedWeekStart = ref(startOfWeek(new Date(), { weekStartsOn: 0 }))
const selectedLocationId = ref<string | null>(null)
// serviceDaysMatrix: { "0": ["service-id-1"], "1": ["service-id-1", "service-id-2"], ... }
// Key is day of week (0=Sun, 6=Sat), value is array of service IDs
const serviceDaysMatrix = ref<Record<string, string[]>>({})
// Computed from matrix for backward compatibility
const operationalDays = computed(() => {
  return Object.keys(serviceDaysMatrix.value)
    .filter(day => serviceDaysMatrix.value[day]?.length > 0)
    .map(day => parseInt(day))
    .sort((a, b) => a - b)
})
const selectedServiceIds = computed(() => {
  const allIds = new Set<string>()
  Object.values(serviceDaysMatrix.value).forEach(ids => {
    ids.forEach(id => allIds.add(id))
  })
  return Array.from(allIds)
})

// Data
const services = ref<Service[]>([])
const staffingRequirements = ref<StaffingRequirement[]>([])
const draftId = ref<string | null>(null)
const draftSlots = ref<DraftSlot[]>([])
const validationResult = ref<WizardValidationResult | null>(null)

// Employee selector
const employeeSelectorRef = ref<{ open: (slot: DraftSlot) => void } | null>(null)

// Templates manager
const templatesManagerRef = ref<{ openBrowser: () => void; openSave: () => void } | null>(null)

// Quick action states
const isCopyingWeek = ref(false)
const isAutoFilling = ref(false)

// Time editing dialog
const timeEditDialog = ref(false)
const editingSlot = ref<DraftSlot | null>(null)
const editStartTime = ref('')
const editEndTime = ref('')
const isSavingTime = ref(false)

// Review/Approval state
const isSubmitting = ref(false)
const isApproving = ref(false)
const isRequestingChanges = ref(false)
const reviewNotes = ref('')
const approvalNotes = ref('')
const draftStatus = ref<ScheduleDraftStatus | string>('building')
const draftSubmittedBy = ref<string | null>(null)
const draftSubmittedByName = ref('')
const draftSubmittedAt = ref<string | null>(null)
const draftApprovedBy = ref<string | null>(null)
const draftApprovedByName = ref('')
const draftApprovedAt = ref<string | null>(null)
const draftReviewNotes = ref('')

// Realtime subscription for collaborative editing
const realtimeChannel = ref<ReturnType<typeof supabase.channel> | null>(null)

// Snackbar notification bridge for child components
const showNotification = (message: string, color = 'success') => {
  if (color === 'error') toast.error(message)
  else if (color === 'warning') toast.warning(message)
  else toast.success(message)
}

// Handle template applied event
const handleTemplateApplied = () => {
  loadDraftSlots()
}

// Multi-Location Dashboard
const viewMode = ref<'wizard' | 'dashboard'>('wizard')
const dashboardData = ref<DashboardLocation[]>([])
const isLoadingDashboard = ref(false)

// Day labels
const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Computed
const weekLabel = computed(() => {
  const start = format(selectedWeekStart.value, 'MMM d')
  const end = format(addDays(selectedWeekStart.value, 6), 'MMM d, yyyy')
  return `${start} - ${end}`
})

const selectedLocation = computed(() => 
  locations.value?.find(l => l.id === selectedLocationId.value)
)

const selectedServices = computed(() => 
  services.value.filter(s => selectedServiceIds.value.includes(s.id))
)

const operationalDates = computed(() => {
  return operationalDays.value.map(day => 
    addDays(selectedWeekStart.value, day)
  ).sort((a, b) => a.getTime() - b.getTime())
})

// Slots grouped by service then by date
const slotsByServiceAndDate = computed(() => {
  const result = new Map<string, Map<string, DraftSlot[]>>()
  
  for (const service of selectedServices.value) {
    const dateMap = new Map<string, DraftSlot[]>()
    
    for (const date of operationalDates.value) {
      const dateStr = format(date, 'yyyy-MM-dd')
      const slots = draftSlots.value.filter(
        s => s.service_id === service.id && s.slot_date === dateStr
      ).sort((a, b) => a.priority - b.priority)
      dateMap.set(dateStr, slots)
    }
    
    result.set(service.id, dateMap)
  }
  
  return result
})

// Coverage stats
const coverageStats = computed(() => {
  const total = draftSlots.value.length
  const filled = draftSlots.value.filter(s => s.employee_id).length
  const required = draftSlots.value.filter(s => s.is_required).length
  const requiredFilled = draftSlots.value.filter(s => s.is_required && s.employee_id).length
  
  return {
    total,
    filled,
    required,
    requiredFilled,
    percentage: total > 0 ? Math.round((filled / total) * 100) : 0,
    requiredPercentage: required > 0 ? Math.round((requiredFilled / required) * 100) : 0
  }
})

// Step validation
const canProceedToStep2 = computed(() => 
  selectedLocationId.value && 
  operationalDays.value.length > 0 && 
  selectedServiceIds.value.length > 0
)

const canProceedToStep3 = computed(() => 
  draftSlots.value.length > 0 && 
  coverageStats.value.requiredPercentage >= 50 // At least 50% required slots filled
)

const canSubmitForReview = computed(() =>
  validationResult.value?.is_valid === true && 
  draftStatus.value !== 'submitted_for_review' &&
  draftStatus.value !== 'approved' &&
  draftStatus.value !== 'published'
)

const canApprove = computed(() =>
  draftStatus.value === 'submitted_for_review'
)

const canPublish = computed(() => 
  draftStatus.value === 'approved'
)

// Load services
async function loadServices() {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
    
    if (error) throw error
    services.value = data || []
  } catch (err) {
    console.error('Failed to load services:', err)
    toast.error('Failed to load services')
  }
}

// Load staffing requirements
async function loadStaffingRequirements() {
  try {
    const { data, error } = await supabase
      .from('service_staffing_requirements')
      .select('*')
      .order('priority, sort_order')
    
    if (error) throw error
    staffingRequirements.value = data || []
  } catch (err) {
    console.error('Failed to load staffing requirements:', err)
  }
}

// Navigate week
function changeWeek(delta: number) {
  selectedWeekStart.value = addDays(selectedWeekStart.value, delta * 7)
}

function goToThisWeek() {
  selectedWeekStart.value = startOfWeek(new Date(), { weekStartsOn: 0 })
}

// Toggle service on a specific day in the matrix
function toggleServiceDay(day: number, serviceId: string) {
  const dayKey = day.toString()
  if (!serviceDaysMatrix.value[dayKey]) {
    serviceDaysMatrix.value[dayKey] = []
  }
  
  const idx = serviceDaysMatrix.value[dayKey].indexOf(serviceId)
  if (idx >= 0) {
    serviceDaysMatrix.value[dayKey].splice(idx, 1)
    // Clean up empty days
    if (serviceDaysMatrix.value[dayKey].length === 0) {
      delete serviceDaysMatrix.value[dayKey]
    }
  } else {
    serviceDaysMatrix.value[dayKey].push(serviceId)
  }
}

// Check if a service is enabled for a specific day
function isServiceEnabledForDay(day: number, serviceId: string): boolean {
  return serviceDaysMatrix.value[day.toString()]?.includes(serviceId) || false
}

// Toggle all services for a day (column toggle)
function toggleAllServicesForDay(day: number) {
  const dayKey = day.toString()
  const allServiceIds = services.value.map(s => s.id)
  const currentDayServices = serviceDaysMatrix.value[dayKey] || []
  
  if (currentDayServices.length === allServiceIds.length) {
    // All selected, clear the day
    delete serviceDaysMatrix.value[dayKey]
  } else {
    // Select all services for this day
    serviceDaysMatrix.value[dayKey] = [...allServiceIds]
  }
}

// Toggle a service for all days (row toggle)
function toggleServiceAllDays(serviceId: string) {
  const allDays = [0, 1, 2, 3, 4, 5, 6]
  const daysWithService = allDays.filter(day => 
    serviceDaysMatrix.value[day.toString()]?.includes(serviceId)
  )
  
  if (daysWithService.length === allDays.length) {
    // Service is on all days, remove from all
    allDays.forEach(day => {
      const dayKey = day.toString()
      if (serviceDaysMatrix.value[dayKey]) {
        const idx = serviceDaysMatrix.value[dayKey].indexOf(serviceId)
        if (idx >= 0) {
          serviceDaysMatrix.value[dayKey].splice(idx, 1)
          if (serviceDaysMatrix.value[dayKey].length === 0) {
            delete serviceDaysMatrix.value[dayKey]
          }
        }
      }
    })
  } else {
    // Add service to all days
    allDays.forEach(day => {
      const dayKey = day.toString()
      if (!serviceDaysMatrix.value[dayKey]) {
        serviceDaysMatrix.value[dayKey] = []
      }
      if (!serviceDaysMatrix.value[dayKey].includes(serviceId)) {
        serviceDaysMatrix.value[dayKey].push(serviceId)
      }
    })
  }
}

// Quick select: Weekdays (Mon-Fri) for all services
function selectWeekdaysAllServices() {
  const weekdays = [1, 2, 3, 4, 5]
  const allServiceIds = services.value.map(s => s.id)
  serviceDaysMatrix.value = {}
  weekdays.forEach(day => {
    serviceDaysMatrix.value[day.toString()] = [...allServiceIds]
  })
}

// Clear all selections
function clearAllSelections() {
  serviceDaysMatrix.value = {}
}

// Create draft and move to step 2
async function createDraftAndProceed() {
  if (!canProceedToStep2.value) return
  
  isLoading.value = true
  try {
    // Call RPC to create/update draft with the service-days matrix
    const { data, error } = await supabase.rpc('create_schedule_draft', {
      p_location_id: selectedLocationId.value,
      p_week_start: format(selectedWeekStart.value, 'yyyy-MM-dd'),
      p_operational_days: operationalDays.value,
      p_service_ids: selectedServiceIds.value,
      p_service_days_matrix: serviceDaysMatrix.value
    })
    
    if (error) throw error
    
    // RPC returns { success: true, draft_id: "uuid" }
    draftId.value = data?.draft_id || data
    draftStatus.value = 'building'
    
    // Load generated slots
    await loadDraftSlots()
    
    // Start realtime for collaborative editing
    setupRealtime()
    
    currentStep.value = 2
    toast.success('Draft created! Now assign employees to slots.')
  } catch (err) {
    console.error('Failed to create draft:', err)
    toast.error('Failed to create schedule draft')
  } finally {
    isLoading.value = false
  }
}

// Load existing draft for a week/location (if one exists)
async function loadExistingDraft(weekStart: Date, locationId: string) {
  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  
  const { data, error } = await supabase
    .from('schedule_drafts')
    .select(`
      *,
      submitter:submitted_by(first_name, last_name),
      reviewer:reviewed_by(first_name, last_name),
      approver:approved_by(first_name, last_name)
    `)
    .eq('location_id', locationId)
    .eq('week_start', weekStartStr)
    .neq('status', 'archived')
    .single()
  
  if (error || !data) {
    // No existing draft - stay on step 1
    return false
  }
  
  // Found existing draft - load its data
  draftId.value = data.id
  draftStatus.value = data.status
  
  // Load review metadata
  draftSubmittedBy.value = data.submitted_by
  draftSubmittedByName.value = data.submitter ? `${data.submitter.first_name} ${data.submitter.last_name}` : ''
  draftSubmittedAt.value = data.submitted_at
  draftApprovedBy.value = data.approved_by
  draftApprovedByName.value = data.approver ? `${data.approver.first_name} ${data.approver.last_name}` : ''
  draftApprovedAt.value = data.approved_at
  draftReviewNotes.value = data.review_notes || ''
  
  // Restore the service days matrix
  if (data.service_days_matrix && Object.keys(data.service_days_matrix).length > 0) {
    serviceDaysMatrix.value = data.service_days_matrix
  } else if (data.selected_service_ids && data.operational_days) {
    // Fallback: rebuild matrix from old format (all services on all days)
    const matrix: Record<string, string[]> = {}
    for (const day of data.operational_days) {
      matrix[day.toString()] = [...data.selected_service_ids]
    }
    serviceDaysMatrix.value = matrix
  }
  
  // Load the draft slots
  await loadDraftSlots()
  
  // Start realtime subscription for collaborative editing
  setupRealtime()
  
  // Determine which step to go to based on draft status
  if (data.status === 'published') {
    currentStep.value = 5
  } else if (data.status === 'approved') {
    currentStep.value = 5  // Show publish step
  } else if (data.status === 'submitted_for_review') {
    currentStep.value = 4  // Review step
  } else if (data.status === 'validated') {
    currentStep.value = 3  // Validation step
  } else if (draftSlots.value.length > 0) {
    currentStep.value = 2  // Has slots, go to staffing
  } else {
    currentStep.value = 1  // No slots yet, stay on scope
  }
  
  toast.info(`Loaded existing draft for ${format(weekStart, 'MMM d, yyyy')}`)
  return true
}

// Load draft slots
async function loadDraftSlots() {
  if (!draftId.value) return
  
  try {
    const { data, error } = await supabase
      .from('draft_slots')
      .select(`
        *,
        service:service_id(id, name, code, color, icon),
        employee:employee_id(first_name, last_name)
      `)
      .eq('draft_id', draftId.value)
      .order('slot_date')
      .order('priority')
    
    if (error) throw error
    draftSlots.value = data || []
  } catch (err) {
    console.error('Failed to load draft slots:', err)
  }
}

// Open employee selector for a slot
// Clear employee from slot
async function clearSlot(slot: DraftSlot) {
  try {
    const { error } = await supabase
      .from('draft_slots')
      .update({ employee_id: null, assigned_at: null })
      .eq('id', slot.id)
    
    if (error) throw error
    
    slot.employee_id = null
    slot.employee = undefined
  } catch (err) {
    console.error('Failed to clear slot:', err)
  }
}

// Open time edit dialog
function openTimeEdit(slot: DraftSlot, event: Event) {
  event.stopPropagation()
  editingSlot.value = slot
  editStartTime.value = slot.start_time || '09:00'
  editEndTime.value = slot.end_time || '17:30'
  timeEditDialog.value = true
}

// Save time changes
async function saveSlotTimes() {
  if (!editingSlot.value) return
  
  isSavingTime.value = true
  try {
    const { error } = await supabase.rpc('update_slot_times', {
      p_slot_id: editingSlot.value.id,
      p_start_time: editStartTime.value,
      p_end_time: editEndTime.value
    })
    
    if (error) throw error
    
    // Update local state
    editingSlot.value.start_time = editStartTime.value
    editingSlot.value.end_time = editEndTime.value
    
    timeEditDialog.value = false
    toast.success('Shift time updated')
  } catch (err) {
    console.error('Failed to update times:', err)
    toast.error('Failed to update shift time')
  } finally {
    isSavingTime.value = false
  }
}

// Copy from previous week
async function copyPreviousWeek() {
  if (!draftId.value) return
  
  isCopyingWeek.value = true
  try {
    const { data, error } = await supabase.rpc('copy_previous_week_schedule', {
      p_draft_id: draftId.value
    })
    
    if (error) throw error
    
    if (data?.success) {
      await loadDraftSlots()
      toast.success(`Copied ${data.slots_filled} assignments from previous week`)
    } else {
      toast.warning(data?.error || 'No assignments found to copy')
    }
  } catch (err) {
    console.error('Failed to copy previous week:', err)
    toast.error('Failed to copy from previous week')
  } finally {
    isCopyingWeek.value = false
  }
}

// AI Auto-fill
async function aiAutoFill() {
  if (!draftId.value) return
  
  isAutoFilling.value = true
  try {
    const { data, error } = await supabase.rpc('ai_auto_fill_draft', {
      p_draft_id: draftId.value,
      p_respect_availability: true,
      p_balance_hours: true
    })
    
    if (error) throw error
    
    if (data?.success) {
      await loadDraftSlots()
      toast.success(`AI filled ${data.slots_filled} slots (${data.slots_skipped} skipped)`)
    } else {
      toast.warning(data?.error || 'No suitable employees found')
    }
  } catch (err) {
    console.error('Failed to auto-fill:', err)
    toast.error('Failed to auto-fill schedule')
  } finally {
    isAutoFilling.value = false
  }
}

// Clear all assignments
async function clearAllAssignments() {
  if (!draftId.value) return
  
  if (!confirm('Are you sure you want to clear all assignments?')) return
  
  isLoading.value = true
  try {
    const { data, error } = await supabase.rpc('clear_draft_assignments', {
      p_draft_id: draftId.value
    })
    
    if (error) throw error
    
    await loadDraftSlots()
    toast.info(`Cleared ${data?.slots_cleared || 0} assignments`)
  } catch (err) {
    console.error('Failed to clear assignments:', err)
    toast.error('Failed to clear assignments')
  } finally {
    isLoading.value = false
  }
}

// Validate draft (Step 3)
async function validateDraft() {
  if (!draftId.value) return
  
  isLoading.value = true
  try {
    const { data, error } = await supabase.rpc('validate_schedule_draft', {
      p_draft_id: draftId.value
    })
    
    if (error) throw error
    
    validationResult.value = data
    draftStatus.value = data?.is_valid ? 'validated' : 'reviewing'
    currentStep.value = 3
  } catch (err) {
    console.error('Validation failed:', err)
    toast.error('Failed to validate schedule')
  } finally {
    isLoading.value = false
  }
}

// Submit for review (Step 3 → Step 4)
async function submitForReview() {
  if (!draftId.value || !canSubmitForReview.value) return
  
  isSubmitting.value = true
  try {
    const { data, error } = await supabase.rpc('submit_draft_for_review', {
      p_draft_id: draftId.value,
      p_notes: reviewNotes.value || ''
    })
    
    if (error) throw error
    
    if (data?.success) {
      draftStatus.value = 'submitted_for_review'
      draftSubmittedByName.value = data.submitted_by || ''
      draftSubmittedAt.value = data.submitted_at || null
      currentStep.value = 4
      toast.success('Schedule submitted for review!')
      
      // Send Slack notification
      try {
        await $fetch('/api/slack/notifications/queue', {
          method: 'POST',
          body: {
            triggerType: 'schedule_submitted_for_review',
            channel: '#schedule',
            message: `📋 Schedule Submitted for Review: ${weekLabel.value} at ${selectedLocation.value?.name} by ${data.submitted_by}`,
            metadata: { draft_id: draftId.value, week_start: format(selectedWeekStart.value, 'yyyy-MM-dd') }
          }
        })
      } catch (slackErr) {
        console.warn('Slack notification failed:', slackErr)
      }
    } else {
      toast.error(data?.error || 'Failed to submit for review')
    }
  } catch (err) {
    console.error('Submit for review failed:', err)
    toast.error('Failed to submit for review')
  } finally {
    isSubmitting.value = false
  }
}

// Approve schedule (Step 4 → Step 5)
async function approveDraft() {
  if (!draftId.value || !canApprove.value) return
  
  isApproving.value = true
  try {
    const { data, error } = await supabase.rpc('approve_schedule_draft', {
      p_draft_id: draftId.value,
      p_notes: approvalNotes.value || ''
    })
    
    if (error) throw error
    
    if (data?.success) {
      draftStatus.value = 'approved'
      draftApprovedByName.value = data.approved_by || ''
      draftApprovedAt.value = data.approved_at || null
      currentStep.value = 5
      toast.success('Schedule approved! Ready to publish.')
      
      // Notify the submitter that the schedule is approved
      try {
        await $fetch('/api/slack/notifications/queue', {
          method: 'POST',
          body: {
            triggerType: 'schedule_approved',
            channel: '#schedule',
            message: `✅ Schedule Approved: ${weekLabel.value} at ${selectedLocation.value?.name} approved by ${data.approved_by}. Ready to publish!`,
            metadata: { 
              draft_id: draftId.value,
              week_start: format(selectedWeekStart.value, 'yyyy-MM-dd'),
              submitted_by_id: data.submitted_by_id
            }
          }
        })
      } catch (slackErr) {
        console.warn('Slack notification failed:', slackErr)
      }
    } else {
      toast.error(data?.error || 'Failed to approve schedule')
    }
  } catch (err) {
    console.error('Approval failed:', err)
    toast.error('Failed to approve schedule')
  } finally {
    isApproving.value = false
  }
}

// Request changes (send back to building)
async function requestChanges() {
  if (!draftId.value) return
  
  if (!approvalNotes.value.trim()) {
    toast.warning('Please provide notes explaining what changes are needed')
    return
  }
  
  isRequestingChanges.value = true
  try {
    const { data, error } = await supabase.rpc('request_schedule_changes', {
      p_draft_id: draftId.value,
      p_notes: approvalNotes.value
    })
    
    if (error) throw error
    
    if (data?.success) {
      draftStatus.value = 'building'
      validationResult.value = null
      currentStep.value = 2
      toast.info('Changes requested. Schedule sent back for editing.')
      
      // Notify the submitter
      try {
        await $fetch('/api/slack/notifications/queue', {
          method: 'POST',
          body: {
            triggerType: 'schedule_changes_requested',
            channel: '#schedule',
            message: `🔄 Changes Requested: ${weekLabel.value} at ${selectedLocation.value?.name} — ${approvalNotes.value}`,
            metadata: { draft_id: draftId.value }
          }
        })
      } catch (slackErr) {
        console.warn('Slack notification failed:', slackErr)
      }
      
      approvalNotes.value = ''
    } else {
      toast.error(data?.error || 'Failed to request changes')
    }
  } catch (err) {
    console.error('Request changes failed:', err)
    toast.error('Failed to request changes')
  } finally {
    isRequestingChanges.value = false
  }
}

// Publish draft (Step 5)
async function publishDraft() {
  if (!draftId.value || !canPublish.value) return
  
  isLoading.value = true
  try {
    const { error } = await supabase.rpc('publish_schedule_draft', {
      p_draft_id: draftId.value
    })
    
    if (error) throw error
    
    draftStatus.value = 'published'
    currentStep.value = 5
    toast.success('Schedule published! Employees have been notified.')
    
    // Send Slack notification
    try {
      await $fetch('/api/slack/notifications/queue', {
        method: 'POST',
        body: {
          triggerType: 'schedule_published',
          channel: '#schedule',
          message: `📅 Schedule Published: ${weekLabel.value} at ${selectedLocation.value?.name}`,
          metadata: { week_start: format(selectedWeekStart.value, 'yyyy-MM-dd') }
        }
      })
    } catch (slackErr) {
      console.warn('Slack notification failed:', slackErr)
    }
  } catch (err) {
    console.error('Publish failed:', err)
    toast.error('Failed to publish schedule')
  } finally {
    isLoading.value = false
  }
}

// Go back a step
function goBack() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

// Reset wizard
function resetWizard() {
  currentStep.value = 1
  draftId.value = null
  draftSlots.value = []
  validationResult.value = null
  serviceDaysMatrix.value = {}
  draftStatus.value = 'building'
  draftSubmittedBy.value = null
  draftSubmittedByName.value = ''
  draftSubmittedAt.value = null
  draftApprovedBy.value = null
  draftApprovedByName.value = ''
  draftApprovedAt.value = null
  draftReviewNotes.value = ''
  reviewNotes.value = ''
  approvalNotes.value = ''
  cleanupRealtime()
}

// ============================================================
// TEMPLATES FUNCTIONS
// ============================================================

// ============================================================
// DASHBOARD FUNCTIONS
// ============================================================

// Load dashboard data for all locations
async function loadDashboard() {
  isLoadingDashboard.value = true
  try {
    const { data, error } = await supabase.rpc('get_schedule_dashboard', {
      p_week_start: format(selectedWeekStart.value, 'yyyy-MM-dd')
    })
    
    if (error) throw error
    dashboardData.value = data || []
  } catch (err) {
    console.error('Failed to load dashboard:', err)
    dashboardData.value = []
  } finally {
    isLoadingDashboard.value = false
  }
}

// Switch to wizard for a specific location from dashboard
function openLocationWizard(loc: DashboardLocation) {
  selectedLocationId.value = loc.location_id
  
  if (loc.has_draft && loc.draft_id) {
    // Load existing draft
    draftId.value = loc.draft_id
    loadDraftSlots().then(() => {
      currentStep.value = 2
      viewMode.value = 'wizard'
    })
  } else {
    // Start fresh
    viewMode.value = 'wizard'
  }
}

// Toggle between wizard and dashboard
function toggleViewMode() {
  if (viewMode.value === 'wizard') {
    viewMode.value = 'dashboard'
    loadDashboard()
  } else {
    viewMode.value = 'wizard'
  }
}

// Get status color for dashboard
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    published: 'success',
    approved: 'info',
    submitted_for_review: 'purple',
    validated: 'info',
    building: 'warning',
    reviewing: 'orange',
    draft: 'grey',
    none: 'grey-lighten-1'
  }
  return colors[status] || 'grey'
}

// Get status label for dashboard
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    published: 'Published',
    approved: 'Approved',
    submitted_for_review: 'In Review',
    validated: 'Validated',
    building: 'In Progress',
    reviewing: 'Needs Fixes',
    draft: 'Draft',
    none: 'Not Started'
  }
  return labels[status] || status
}

// ============================================================
// REALTIME COLLABORATIVE EDITING
// ============================================================
function setupRealtime() {
  if (!draftId.value || realtimeChannel.value) return
  
  realtimeChannel.value = supabase
    .channel(`draft-${draftId.value}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'draft_slots',
        filter: `draft_id=eq.${draftId.value}`
      },
      async (payload) => {
        // Another user changed a slot — refresh the slot list
        console.log('[Realtime] Draft slot changed:', payload.eventType)
        await loadDraftSlots()
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'schedule_drafts',
        filter: `id=eq.${draftId.value}`
      },
      (payload) => {
        // Draft status changed (e.g., another user approved it)
        const newStatus = (payload.new as any)?.status
        if (newStatus && newStatus !== draftStatus.value) {
          console.log('[Realtime] Draft status changed:', draftStatus.value, '→', newStatus)
          draftStatus.value = newStatus
          
          // Auto-navigate to the correct step
          if (newStatus === 'approved') {
            toast.success('Schedule has been approved! Ready to publish.')
            currentStep.value = 5
          } else if (newStatus === 'submitted_for_review') {
            toast.info('Schedule submitted for review')
            currentStep.value = 4
          } else if (newStatus === 'building') {
            toast.info('Changes have been requested — schedule sent back for editing')
            currentStep.value = 2
          } else if (newStatus === 'published') {
            toast.success('Schedule has been published!')
            currentStep.value = 5
          }
        }
      }
    )
    .subscribe()
}

function cleanupRealtime() {
  if (realtimeChannel.value) {
    supabase.removeChannel(realtimeChannel.value)
    realtimeChannel.value = null
  }
}

// Get role color based on category
function getRoleCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    DVM: '#EF4444',
    Lead: '#8B5CF6',
    Tech: '#3B82F6',
    DA: '#10B981',
    Admin: '#F59E0B',
    Intern: '#6B7280',
    Float: '#14B8A6'
  }
  return colors[category] || '#6B7280'
}

// Format shift time (HH:MM -> h:mma)
function formatShiftTime(time: string): string {
  if (!time) return ''
  const [hours, minutes] = time.split(':').map(Number)
  const h = hours % 12 || 12
  const ampm = hours < 12 ? 'a' : 'p'
  return minutes === 0 ? `${h}${ampm}` : `${h}:${minutes.toString().padStart(2, '0')}${ampm}`
}

// Initialize
onMounted(async () => {
  isLoading.value = true
  await Promise.all([loadServices(), loadStaffingRequirements()])
  
  // Check for URL query params (coming from Command Center)
  const queryWeek = route.query.week as string | undefined
  const queryLocation = route.query.location as string | undefined
  
  if (queryWeek && queryLocation) {
    // Set the week and location from query params
    selectedWeekStart.value = parseISO(queryWeek)
    selectedLocationId.value = queryLocation
    
    // Try to load existing draft for this week/location
    await loadExistingDraft(selectedWeekStart.value, queryLocation)
  } else {
    // No query params - use defaults
    if (locations.value?.length && !selectedLocationId.value) {
      selectedLocationId.value = locations.value[0].id
    }
  }
  
  isLoading.value = false
})

onUnmounted(() => {
  cleanupRealtime()
})
</script>

<template>
  <div class="schedule-wizard pa-4">
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">
          {{ viewMode === 'dashboard' ? 'Schedule Dashboard' : 'Schedule Wizard' }}
        </h1>
        <p class="text-body-2 text-grey-darken-1 mb-0">
          {{ viewMode === 'dashboard' 
            ? 'Overview of all locations for the selected week' 
            : 'Build your weekly schedule in 5 easy steps' 
          }}
        </p>
      </div>
      
      <div class="d-flex gap-2">
        <!-- View Mode Toggle -->
        <v-btn-toggle v-model="viewMode" mandatory variant="outlined" density="compact">
          <v-btn value="wizard" size="small">
            <v-icon start>mdi-wizard-hat</v-icon>
            Wizard
          </v-btn>
          <v-btn value="dashboard" size="small" @click="loadDashboard">
            <v-icon start>mdi-view-dashboard</v-icon>
            Dashboard
          </v-btn>
        </v-btn-toggle>
        
        <!-- Templates Button -->
        <v-btn 
          variant="outlined" 
          color="secondary"
          @click="templatesManagerRef?.openBrowser()"
        >
          <v-icon start>mdi-file-document-outline</v-icon>
          Templates
        </v-btn>
        
        <v-btn
          v-if="viewMode === 'wizard' && currentStep > 1 && currentStep < 5"
          variant="text"
          color="grey"
          @click="resetWizard"
        >
          <v-icon start>mdi-refresh</v-icon>
          Start Over
        </v-btn>
      </div>
    </div>

    <!-- Dashboard View -->
    <template v-if="viewMode === 'dashboard'">
      <!-- Week Navigation -->
      <v-card rounded="lg" class="mb-4">
        <v-card-text class="d-flex align-center justify-center gap-4 py-3">
          <v-btn icon="mdi-chevron-left" variant="text" aria-label="Previous" @click="changeWeek(-1); loadDashboard()" />
          <v-chip size="large" color="primary" variant="flat">
            {{ weekLabel }}
          </v-chip>
          <v-btn icon="mdi-chevron-right" variant="text" aria-label="Next" @click="changeWeek(1); loadDashboard()" />
          <v-btn variant="outlined" size="small" @click="goToThisWeek(); loadDashboard()">
            This Week
          </v-btn>
        </v-card-text>
      </v-card>
      
      <!-- Dashboard Loading -->
      <div v-if="isLoadingDashboard" class="d-flex justify-center align-center py-12">
        <v-progress-circular indeterminate color="primary" size="48" />
      </div>
      
      <!-- Dashboard Grid -->
      <v-row v-else>
        <v-col 
          v-for="loc in dashboardData" 
          :key="loc.location_id" 
          cols="12" 
          md="6" 
          lg="4"
        >
          <v-card rounded="lg" class="h-100 dashboard-location-card" @click="openLocationWizard(loc)">
            <v-card-title class="d-flex align-center justify-space-between">
              <span>{{ loc.location_name }}</span>
              <v-chip 
                size="small" 
                :color="getStatusColor(loc.draft_status)"
                variant="flat"
              >
                {{ getStatusLabel(loc.draft_status) }}
              </v-chip>
            </v-card-title>
            
            <v-card-text>
              <!-- Coverage Progress -->
              <div class="mb-4">
                <div class="d-flex justify-space-between mb-1">
                  <span class="text-caption">Coverage</span>
                  <span class="text-caption font-weight-bold">{{ loc.coverage_percentage }}%</span>
                </div>
                <v-progress-linear
                  :model-value="loc.coverage_percentage"
                  :color="loc.coverage_percentage >= 80 ? 'success' : loc.coverage_percentage >= 50 ? 'warning' : 'error'"
                  height="8"
                  rounded
                />
              </div>
              
              <!-- Stats -->
              <div class="d-flex justify-space-around text-center">
                <div>
                  <div class="text-h6 font-weight-bold">{{ loc.filled_slots }}</div>
                  <div class="text-caption text-grey">Filled</div>
                </div>
                <div>
                  <div class="text-h6 font-weight-bold">{{ loc.total_slots }}</div>
                  <div class="text-caption text-grey">Total</div>
                </div>
                <div>
                  <div class="text-h6 font-weight-bold">{{ loc.required_filled }}/{{ loc.required_slots }}</div>
                  <div class="text-caption text-grey">Required</div>
                </div>
              </div>
              
              <!-- Last Updated -->
              <div v-if="loc.last_updated" class="text-caption text-grey mt-4 text-center">
                Last updated: {{ format(parseISO(loc.last_updated), 'MMM d, h:mm a') }}
              </div>
            </v-card-text>
            
            <v-card-actions>
              <v-btn 
                block 
                :color="loc.has_draft ? 'primary' : 'grey'" 
                variant="tonal"
              >
                <v-icon start>{{ loc.has_draft ? 'mdi-pencil' : 'mdi-plus' }}</v-icon>
                {{ loc.has_draft ? 'Continue Editing' : 'Start Schedule' }}
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
        
        <!-- Empty State -->
        <v-col v-if="dashboardData.length === 0" cols="12">
          <v-alert type="info" variant="tonal">
            No locations found. Make sure locations are configured in the system.
          </v-alert>
        </v-col>
      </v-row>
    </template>

    <!-- Wizard View -->
    <template v-else>

    <!-- Stepper Progress -->
    <v-stepper
      v-model="currentStep"
      :items="[
        { title: 'Scope', subtitle: 'Week & Services' },
        { title: 'Staffing', subtitle: 'Assign Employees' },
        { title: 'Validate', subtitle: 'Check & Submit' },
        { title: 'Review', subtitle: 'Approve' },
        { title: 'Publish', subtitle: 'Go Live' }
      ]"
      alt-labels
      flat
      class="mb-6"
    />

    <!-- Loading -->
    <div v-if="isLoading" class="d-flex justify-center align-center min-h-400">
      <v-progress-circular indeterminate color="primary" size="48" />
    </div>

    <!-- Step 1: Scope -->
    <v-window v-else v-model="currentStep">
      <v-window-item :value="1">
        <v-row>
          <!-- Week Selection -->
          <v-col cols="12" md="4">
            <v-card rounded="lg" class="h-100">
              <v-card-title class="text-subtitle-1">
                <v-icon start color="primary">mdi-calendar-range</v-icon>
                Select Week
              </v-card-title>
              <v-card-text>
                <div class="d-flex align-center justify-center gap-2 mb-4">
                  <v-btn icon="mdi-chevron-left" variant="text" aria-label="Previous" @click="changeWeek(-1)" />
                  <v-chip size="large" color="primary" variant="flat">
                    {{ weekLabel }}
                  </v-chip>
                  <v-btn icon="mdi-chevron-right" variant="text" aria-label="Next" @click="changeWeek(1)" />
                </div>
                <v-btn block variant="outlined" size="small" @click="goToThisWeek">
                  Go to This Week
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Location Selection -->
          <v-col cols="12" md="8">
            <v-card rounded="lg" class="h-100">
              <v-card-title class="text-subtitle-1">
                <v-icon start color="primary">mdi-map-marker</v-icon>
                Select Location
              </v-card-title>
              <v-card-text>
                <v-select
                  v-model="selectedLocationId"
                  :items="locations"
                  item-title="name"
                  item-value="id"
                  label="Clinic Location"
                  variant="outlined"
                  density="compact"
                  :rules="[(v: any) => !!v || 'Location is required']"
                />
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Service-Day Matrix Grid -->
          <v-col cols="12">
            <v-card rounded="lg">
              <v-card-title class="d-flex align-center justify-space-between">
                <span class="text-subtitle-1">
                  <v-icon start color="primary">mdi-grid</v-icon>
                  Service Schedule Matrix
                </span>
                <div class="d-flex gap-2">
                  <v-btn size="small" variant="tonal" color="primary" @click="selectWeekdaysAllServices">
                    <v-icon start size="16">mdi-calendar-week</v-icon>
                    Mon-Fri All
                  </v-btn>
                  <v-btn size="small" variant="text" color="grey" @click="clearAllSelections">
                    <v-icon start size="16">mdi-eraser</v-icon>
                    Clear All
                  </v-btn>
                </div>
              </v-card-title>
              <v-card-text>
                <p class="text-body-2 text-grey mb-4">
                  Check the boxes to select which services should be staffed on each day of the week.
                </p>
                
                <!-- Matrix Grid -->
                <div class="scope-matrix-wrapper">
                  <table class="scope-matrix">
                    <!-- Header Row - Days of Week -->
                    <thead>
                      <tr>
                        <th class="service-header-cell">
                          <span class="text-body-2 font-weight-medium">Services</span>
                        </th>
                        <th 
                          v-for="(label, dayIdx) in dayLabels" 
                          :key="dayIdx"
                          class="day-header-cell"
                          @click="toggleAllServicesForDay(dayIdx)"
                        >
                          <div class="day-header-content">
                            <span class="font-weight-bold">{{ label }}</span>
                            <v-icon 
                              size="14" 
                              class="ml-1"
                              :color="serviceDaysMatrix[dayIdx.toString()]?.length === services.length ? 'primary' : 'grey-lighten-1'"
                            >
                              {{ serviceDaysMatrix[dayIdx.toString()]?.length === services.length ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline' }}
                            </v-icon>
                          </div>
                          <div class="text-caption text-grey">
                            {{ serviceDaysMatrix[dayIdx.toString()]?.length || 0 }} services
                          </div>
                        </th>
                      </tr>
                    </thead>
                    
                    <!-- Body - Service Rows -->
                    <tbody>
                      <tr v-for="service in services" :key="service.id">
                        <!-- Service Name Cell -->
                        <td 
                          class="service-name-cell"
                          @click="toggleServiceAllDays(service.id)"
                        >
                          <div class="d-flex align-center">
                            <v-icon :color="service.color" size="20" class="mr-2">
                              {{ service.icon || 'mdi-medical-bag' }}
                            </v-icon>
                            <div>
                              <div class="text-body-2 font-weight-medium">{{ service.name }}</div>
                              <div class="text-caption text-grey">
                                {{ service.requires_dvm ? 'DVM Required' : '' }}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        <!-- Day Checkbox Cells -->
                        <td 
                          v-for="(label, dayIdx) in dayLabels"
                          :key="`${service.id}-${dayIdx}`"
                          class="checkbox-cell"
                          @click="toggleServiceDay(dayIdx, service.id)"
                        >
                          <v-checkbox
                            :model-value="isServiceEnabledForDay(dayIdx, service.id)"
                            hide-details
                            density="compact"
                            :color="service.color"
                            @click.stop="toggleServiceDay(dayIdx, service.id)"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <!-- Summary Stats -->
                <div class="d-flex align-center gap-4 mt-4 pt-3 border-t">
                  <v-chip size="small" color="primary" variant="tonal">
                    <v-icon start size="14">mdi-calendar</v-icon>
                    {{ operationalDays.length }} days
                  </v-chip>
                  <v-chip size="small" color="secondary" variant="tonal">
                    <v-icon start size="14">mdi-medical-bag</v-icon>
                    {{ selectedServiceIds.length }} services
                  </v-chip>
                  <v-chip size="small" color="info" variant="tonal">
                    <v-icon start size="14">mdi-checkbox-marked</v-icon>
                    {{ Object.values(serviceDaysMatrix).reduce((sum, arr) => sum + arr.length, 0) }} total slots
                  </v-chip>
                </div>
                
                <v-alert v-if="selectedServiceIds.length === 0" type="info" variant="tonal" class="mt-4">
                  Select at least one service on at least one day to continue
                </v-alert>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Proceed Button -->
          <v-col cols="12" class="text-right">
            <v-btn
              color="primary"
              size="large"
              :disabled="!canProceedToStep2"
              :loading="isLoading"
              @click="createDraftAndProceed"
            >
              Continue to Staffing
              <v-icon end>mdi-arrow-right</v-icon>
            </v-btn>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- Step 2: Staffing Matrix -->
      <v-window-item :value="2">
        <!-- Coverage Stats Bar -->
        <v-card variant="tonal" color="primary" rounded="lg" class="mb-4">
          <v-card-text class="d-flex align-center justify-space-between py-3">
            <div class="d-flex align-center gap-4">
              <div>
                <span class="text-h5 font-weight-bold">{{ coverageStats.filled }}/{{ coverageStats.total }}</span>
                <span class="text-body-2 ml-2">Slots Filled</span>
              </div>
              <v-divider vertical class="mx-2" />
              <div>
                <span class="text-h5 font-weight-bold">{{ coverageStats.requiredFilled }}/{{ coverageStats.required }}</span>
                <span class="text-body-2 ml-2">Required Roles</span>
              </div>
              <v-divider vertical class="mx-2" />
              <v-progress-linear
                :model-value="coverageStats.percentage"
                :color="coverageStats.percentage >= 80 ? 'success' : coverageStats.percentage >= 50 ? 'warning' : 'error'"
                height="20"
                rounded
                style="width: 200px;"
              >
                <template #default>
                  {{ coverageStats.percentage }}% Coverage
                </template>
              </v-progress-linear>
            </div>
            <div class="d-flex gap-2">
              <v-btn variant="text" @click="goBack">
                <v-icon start>mdi-arrow-left</v-icon>
                Back
              </v-btn>
              <v-btn
                color="primary"
                :disabled="!canProceedToStep3"
                @click="validateDraft"
              >
                Validate Schedule
                <v-icon end>mdi-check-circle</v-icon>
              </v-btn>
            </div>
          </v-card-text>
        </v-card>

        <!-- Quick Actions Bar -->
        <v-card variant="outlined" rounded="lg" class="mb-4">
          <v-card-text class="d-flex align-center gap-2 py-2">
            <span class="text-body-2 text-grey mr-2">Quick Actions:</span>
            
            <v-btn
              variant="tonal"
              color="secondary"
              size="small"
              :loading="isCopyingWeek"
              @click="copyPreviousWeek"
            >
              <v-icon start>mdi-content-copy</v-icon>
              Copy Previous Week
            </v-btn>
            
            <v-btn
              variant="tonal"
              color="primary"
              size="small"
              :loading="isAutoFilling"
              @click="aiAutoFill"
            >
              <v-icon start>mdi-auto-fix</v-icon>
              AI Auto-Fill
            </v-btn>
            
            <v-btn
              variant="tonal"
              color="secondary"
              size="small"
              @click="templatesManagerRef?.openSave()"
            >
              <v-icon start>mdi-content-save-outline</v-icon>
              Save Template
            </v-btn>
            
            <v-spacer />
            
            <v-btn
              variant="text"
              color="error"
              size="small"
              @click="clearAllAssignments"
            >
              <v-icon start>mdi-eraser</v-icon>
              Clear All
            </v-btn>
          </v-card-text>
        </v-card>

        <!-- Staffing Matrix Grid -->
        <div class="staffing-matrix">
          <!-- Header Row - Dates -->
          <div class="matrix-header">
            <div class="service-label-cell">Service / Role</div>
            <div
              v-for="date in operationalDates"
              :key="date.toISOString()"
              class="date-header-cell"
            >
              <div class="text-body-2 font-weight-bold">{{ format(date, 'EEE') }}</div>
              <div class="text-caption">{{ format(date, 'MMM d') }}</div>
            </div>
          </div>

          <!-- Service Rows -->
          <div
            v-for="service in selectedServices"
            :key="service.id"
            class="service-section"
          >
            <!-- Service Header -->
            <div class="service-header" :style="{ borderLeftColor: service.color }">
              <v-icon :color="service.color" size="20" class="mr-2">{{ service.icon }}</v-icon>
              <span class="font-weight-bold">{{ service.name }}</span>
            </div>

            <!-- Slots Grid -->
            <div class="slots-row">
              <div class="service-label-cell"></div>
              <div
                v-for="date in operationalDates"
                :key="date.toISOString()"
                class="slots-cell"
              >
                <!-- Ghost Cards for this service/date -->
                <div
                  v-for="slot in slotsByServiceAndDate.get(service.id)?.get(format(date, 'yyyy-MM-dd')) || []"
                  :key="slot.id"
                  class="slot-card"
                  :class="{ 
                    'slot-filled': slot.employee_id,
                    'slot-required': slot.is_required && !slot.employee_id,
                    'slot-optional': !slot.is_required && !slot.employee_id
                  }"
                  :style="{ borderLeftColor: getRoleCategoryColor(slot.role_category) }"
                  @click="employeeSelectorRef?.open(slot)"
                >
                  <div class="slot-role text-caption font-weight-medium">
                    {{ slot.role_label }}
                  </div>
                  
                  <!-- Shift Time Display - Clickable to edit -->
                  <div 
                    class="slot-time text-caption text-grey-darken-1 slot-time-editable"
                    @click.stop="openTimeEdit(slot, $event)"
                    title="Click to edit time"
                  >
                    <v-icon size="10" class="mr-1">mdi-clock-outline</v-icon>
                    {{ formatShiftTime(slot.start_time) }} - {{ formatShiftTime(slot.end_time) }}
                  </div>
                  
                  <div v-if="slot.employee" class="slot-employee">
                    {{ slot.employee.first_name }} {{ slot.employee.last_name?.charAt(0) }}.
                  </div>
                  <div v-else class="slot-empty">
                    <v-icon size="16" :color="slot.is_required ? 'error' : 'grey'">
                      {{ slot.is_required ? 'mdi-alert-circle' : 'mdi-plus-circle-outline' }}
                    </v-icon>
                    <span class="text-caption">{{ slot.is_required ? 'Required' : 'Optional' }}</span>
                  </div>
                  
                  <!-- Clear button if filled -->
                  <v-btn
                    v-if="slot.employee_id"
                    icon="mdi-close"
                    size="x-small"
                    variant="text"
                    class="slot-clear-btn"
                    @click.stop="clearSlot(slot)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </v-window-item>

      <!-- Step 3: Validation -->
      <v-window-item :value="3">
        <v-row>
          <v-col cols="12" md="6">
            <v-card rounded="lg" class="h-100">
              <v-card-title class="d-flex align-center">
                <v-icon 
                  :color="validationResult?.is_valid ? 'success' : 'warning'" 
                  class="mr-2"
                >
                  {{ validationResult?.is_valid ? 'mdi-check-circle' : 'mdi-alert-circle' }}
                </v-icon>
                Schedule Summary
              </v-card-title>
              <v-card-text>
                <!-- Staffing Summary -->
                <div class="text-center mb-6">
                  <v-progress-circular
                    :model-value="validationResult?.coverage_score || 0"
                    :size="120"
                    :width="12"
                    :color="(validationResult?.coverage_score || 0) >= 80 ? 'success' : (validationResult?.coverage_score || 0) >= 50 ? 'warning' : 'grey'"
                  >
                    <div class="text-h4 font-weight-bold">
                      {{ Math.round(validationResult?.coverage_score || 0) }}%
                    </div>
                  </v-progress-circular>
                  <div class="text-body-2 text-grey mt-2">Staffing Coverage</div>
                  <div class="text-caption">
                    {{ validationResult?.filled_slots || 0 }} of {{ validationResult?.total_slots || 0 }} slots assigned
                  </div>
                </div>

                <!-- Status -->
                <v-alert
                  :type="validationResult?.is_valid ? 'success' : 'warning'"
                  variant="tonal"
                  class="mb-4"
                >
                  <template v-if="validationResult?.is_valid">
                    <strong>Ready to publish!</strong> All required positions are filled.
                  </template>
                  <template v-else>
                    <strong>{{ validationResult?.required_unfilled || 0 }} required position(s)</strong> still need to be filled before publishing.
                  </template>
                </v-alert>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-card rounded="lg" class="h-100">
              <v-card-title>Alerts & Warnings</v-card-title>
              <v-card-text>
                <!-- Required Unfilled - Main blocking issue -->
                <div v-if="validationResult?.required_unfilled > 0" class="mb-4">
                  <v-alert type="error" variant="tonal" class="mb-2">
                    <strong>{{ validationResult.required_unfilled }} required position(s) unfilled</strong>
                    <div class="text-caption mt-1">Go back to Staffing to assign employees</div>
                  </v-alert>
                </div>

                <!-- Warnings (overtime, consecutive days, etc) -->
                <div v-if="validationResult?.warnings?.length">
                  <div class="text-subtitle-2 text-warning mb-2">
                    <v-icon size="16" color="warning" class="mr-1">mdi-alert-outline</v-icon>
                    {{ validationResult.warnings.length }} Warning(s)
                  </div>
                  <v-list density="compact" class="bg-transparent">
                    <v-list-item
                      v-for="(warn, idx) in validationResult.warnings"
                      :key="idx"
                      class="px-0"
                    >
                      <template #prepend>
                        <v-icon color="warning" size="small">mdi-information</v-icon>
                      </template>
                      <v-list-item-title class="text-body-2">
                        {{ warn.message }}
                      </v-list-item-title>
                    </v-list-item>
                  </v-list>
                </div>

                <!-- All Good -->
                <div v-if="validationResult?.is_valid && !validationResult?.warnings?.length" class="text-center py-4">
                  <v-icon size="48" color="success">mdi-check-decagram</v-icon>
                  <p class="text-body-2 text-grey mt-2">All positions filled, no warnings!</p>
                </div>
                
                <!-- Valid but with warnings -->
                <div v-else-if="validationResult?.is_valid && validationResult?.warnings?.length" class="text-center py-4 mt-4">
                  <v-icon size="32" color="success">mdi-check-circle</v-icon>
                  <p class="text-body-2 text-grey mt-1">Warnings won't block publishing</p>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Actions -->
          <v-col cols="12" class="d-flex justify-space-between">
            <v-btn variant="text" @click="currentStep = 2">
              <v-icon start>mdi-arrow-left</v-icon>
              Back to Staffing
            </v-btn>
            <v-btn
              color="primary"
              size="large"
              :disabled="!canSubmitForReview"
              :loading="isSubmitting"
              @click="submitForReview"
            >
              <v-icon start>mdi-send</v-icon>
              Submit for Review
            </v-btn>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- Step 4: Review & Approve -->
      <v-window-item :value="4">
        <v-row>
          <!-- Review Status -->
          <v-col cols="12">
            <v-alert
              v-if="draftStatus === 'submitted_for_review'"
              type="info"
              variant="tonal"
              prominent
            >
              <template #prepend>
                <v-icon size="32">mdi-clipboard-check-outline</v-icon>
              </template>
              <div class="text-h6 mb-1">Schedule Submitted for Review</div>
              <div class="text-body-2">
                Submitted by <strong>{{ draftSubmittedByName }}</strong>
                <span v-if="draftSubmittedAt"> on {{ format(parseISO(draftSubmittedAt), 'MMM d, yyyy h:mm a') }}</span>
              </div>
              <div v-if="draftReviewNotes" class="text-body-2 mt-2">
                <strong>Notes:</strong> {{ draftReviewNotes }}
              </div>
            </v-alert>
          </v-col>

          <!-- Coverage Summary -->
          <v-col cols="12" md="4">
            <v-card rounded="lg" class="h-100">
              <v-card-title class="text-subtitle-1">
                <v-icon start color="primary">mdi-chart-donut</v-icon>
                Coverage Summary
              </v-card-title>
              <v-card-text class="text-center">
                <v-progress-circular
                  :model-value="coverageStats.percentage"
                  :size="100"
                  :width="10"
                  :color="coverageStats.percentage >= 80 ? 'success' : coverageStats.percentage >= 50 ? 'warning' : 'error'"
                >
                  <div class="text-h5 font-weight-bold">{{ coverageStats.percentage }}%</div>
                </v-progress-circular>
                <div class="text-body-2 text-grey mt-2">
                  {{ coverageStats.filled }}/{{ coverageStats.total }} slots filled
                </div>
                <div class="text-caption text-grey">
                  {{ coverageStats.requiredFilled }}/{{ coverageStats.required }} required
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Validation Summary -->
          <v-col cols="12" md="8">
            <v-card rounded="lg" class="h-100">
              <v-card-title class="text-subtitle-1">
                <v-icon start color="primary">mdi-clipboard-list</v-icon>
                Schedule Review
              </v-card-title>
              <v-card-text>
                <p class="text-body-2 text-grey mb-4">
                  Review the staffing assignments below. You can edit slots directly from here, then approve or request changes.
                </p>

                <!-- Inline staffing preview (collapsed service rows) -->
                <div v-for="service in selectedServices" :key="service.id" class="mb-3">
                  <div class="d-flex align-center mb-1">
                    <v-icon :color="service.color" size="18" class="mr-2">{{ service.icon }}</v-icon>
                    <span class="text-body-2 font-weight-bold">{{ service.name }}</span>
                  </div>
                  <div class="d-flex flex-wrap gap-2">
                    <template v-for="date in operationalDates" :key="date.toISOString()">
                      <template v-for="slot in slotsByServiceAndDate.get(service.id)?.get(format(date, 'yyyy-MM-dd')) || []" :key="slot.id">
                        <v-chip
                          size="small"
                          :color="slot.employee_id ? 'success' : (slot.is_required ? 'error' : 'grey')"
                          variant="tonal"
                          @click="employeeSelectorRef?.open(slot)"
                        >
                          <span class="text-caption">{{ format(date, 'EEE') }}:</span>&nbsp;
                          <span v-if="slot.employee" class="font-weight-medium">
                            {{ slot.employee.first_name }} {{ slot.employee.last_name?.charAt(0) }}.
                          </span>
                          <span v-else class="text-grey">{{ slot.role_label }}</span>
                        </v-chip>
                      </template>
                    </template>
                  </div>
                </div>

                <!-- Reviewer notes -->
                <v-textarea
                  v-model="approvalNotes"
                  label="Review Notes (optional for approval, required for requesting changes)"
                  variant="outlined"
                  density="compact"
                  rows="2"
                  class="mt-4"
                  placeholder="Add any notes about this schedule..."
                />
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Review Actions -->
          <v-col cols="12" class="d-flex justify-space-between">
            <v-btn
              variant="outlined"
              color="error"
              :loading="isRequestingChanges"
              @click="requestChanges"
            >
              <v-icon start>mdi-undo</v-icon>
              Request Changes
            </v-btn>
            <v-btn
              color="success"
              size="large"
              :disabled="!canApprove"
              :loading="isApproving"
              @click="approveDraft"
            >
              <v-icon start>mdi-check-decagram</v-icon>
              Approve Schedule
            </v-btn>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- Step 5: Publish -->
      <v-window-item :value="5">
        <!-- Approved - Ready to Publish -->
        <v-card v-if="draftStatus === 'approved'" rounded="lg" class="text-center pa-8">
          <v-icon size="80" color="success" class="mb-4">mdi-check-decagram</v-icon>
          <h2 class="text-h4 font-weight-bold mb-2">Schedule Approved!</h2>
          <p class="text-body-1 text-grey mb-2">
            The schedule for {{ weekLabel }} at {{ selectedLocation?.name }} has been approved.
          </p>
          <p v-if="draftApprovedByName" class="text-body-2 text-grey mb-6">
            Approved by <strong>{{ draftApprovedByName }}</strong>
            <span v-if="draftApprovedAt"> on {{ format(parseISO(draftApprovedAt), 'MMM d, yyyy h:mm a') }}</span>
          </p>
          
          <v-btn
            color="success"
            size="x-large"
            :loading="isLoading"
            @click="publishDraft"
          >
            <v-icon start>mdi-publish</v-icon>
            Publish Schedule
          </v-btn>
        </v-card>

        <!-- Published Success -->
        <v-card v-else-if="draftStatus === 'published'" rounded="lg" class="text-center pa-8">
          <v-icon size="80" color="success" class="mb-4">mdi-check-circle</v-icon>
          <h2 class="text-h4 font-weight-bold mb-2">Schedule Published!</h2>
          <p class="text-body-1 text-grey mb-6">
            The schedule for {{ weekLabel }} at {{ selectedLocation?.name }} has been published.<br>
            Employees have been notified of their shifts.
          </p>
          
          <div class="d-flex justify-center gap-4">
            <v-btn variant="outlined" @click="resetWizard">
              <v-icon start>mdi-plus</v-icon>
              Create Another Schedule
            </v-btn>
            <v-btn color="primary" to="/schedule">
              View All Schedules
              <v-icon end>mdi-arrow-right</v-icon>
            </v-btn>
          </div>
        </v-card>

        <!-- Fallback: waiting for approval -->
        <v-card v-else rounded="lg" class="text-center pa-8">
          <v-icon size="80" color="info" class="mb-4">mdi-clock-outline</v-icon>
          <h2 class="text-h5 font-weight-bold mb-2">Awaiting Approval</h2>
          <p class="text-body-1 text-grey mb-6">
            This schedule is pending review and approval before it can be published.
          </p>
          <v-btn variant="outlined" to="/schedule">
            <v-icon start>mdi-arrow-left</v-icon>
            Back to Schedules
          </v-btn>
        </v-card>
      </v-window-item>
    </v-window>
    </template>

    <!-- Employee Selector Dialog -->
    <ScheduleWizardEmployeeSelector
      ref="employeeSelectorRef"
      :draft-id="draftId || ''"
      :week-start="selectedWeekStart"
      :location-id="selectedLocationId"
      @assigned="loadDraftSlots()"
      @notify="showNotification($event.message, $event.color)"
    />

    <!-- Templates Manager (Browse & Save) -->
    <ScheduleWizardTemplatesManager
      ref="templatesManagerRef"
      :week-start="selectedWeekStart"
      :location-id="selectedLocationId"
      :draft-id="draftId"
      @applied="handleTemplateApplied"
      @notify="showNotification($event.message, $event.color)"
    />
  </div>
</template>

<style scoped>
.schedule-wizard {
  max-width: 1600px;
  margin: 0 auto;
}

/* Services Grid */
.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}

.service-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.service-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

/* Staffing Matrix */
.staffing-matrix {
  overflow-x: auto;
  background: white;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
}

.matrix-header {
  display: flex;
  background: #f5f5f5;
  border-bottom: 2px solid #e0e0e0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.service-label-cell {
  min-width: 180px;
  padding: 12px 16px;
  font-weight: 600;
  border-right: 1px solid #e0e0e0;
}

.date-header-cell {
  flex: 1;
  min-width: 140px;
  padding: 12px;
  text-align: center;
  border-right: 1px solid #e0e0e0;
}

.date-header-cell:last-child {
  border-right: none;
}

.service-section {
  border-bottom: 1px solid #e0e0e0;
}

.service-section:last-child {
  border-bottom: none;
}

.service-header {
  padding: 10px 16px;
  background: #fafafa;
  border-left: 4px solid;
  display: flex;
  align-items: center;
}

.slots-row {
  display: flex;
}

.slots-cell {
  flex: 1;
  min-width: 140px;
  padding: 8px;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.slots-cell:last-child {
  border-right: none;
}

/* Slot Cards (Ghost Cards) */
.slot-card {
  background: #f9f9f9;
  border: 1px dashed #ccc;
  border-left: 3px solid;
  border-radius: 6px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.slot-card:hover {
  background: #f0f0f0;
  border-style: solid;
}

.slot-card.slot-filled {
  background: #e8f5e9;
  border: 1px solid #4caf50;
  border-left: 3px solid;
}

.slot-card.slot-required {
  background: #ffebee;
  border-color: #ef5350;
}

.slot-card.slot-optional {
  background: #fafafa;
  border-color: #9e9e9e;
}

.slot-role {
  color: #666;
}

.slot-time {
  font-size: 0.7rem;
  margin-top: -2px;
  margin-bottom: 2px;
}

.slot-time-editable {
  cursor: pointer;
  padding: 2px 4px;
  margin: -2px -4px;
  border-radius: 4px;
  transition: background 0.15s;
}

.slot-time-editable:hover {
  background: rgba(0, 0, 0, 0.08);
}

.slot-employee {
  font-weight: 600;
  color: #2e7d32;
}

.slot-empty {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #999;
}

.slot-clear-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  opacity: 0;
}

.slot-card:hover .slot-clear-btn {
  opacity: 1;
}

/* Responsive */
@media (max-width: 960px) {
  .service-label-cell {
    min-width: 120px;
  }
  
  .date-header-cell,
  .slots-cell {
    min-width: 110px;
  }
}

/* Dashboard Cards */
.dashboard-location-card {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.dashboard-location-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
}

/* Scope Matrix Grid */
.scope-matrix-wrapper {
  overflow-x: auto;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.scope-matrix {
  width: 100%;
  border-collapse: collapse;
  min-width: 700px;
}

.scope-matrix th,
.scope-matrix td {
  border-bottom: 1px solid #e0e0e0;
  border-right: 1px solid #e0e0e0;
}

.scope-matrix th:last-child,
.scope-matrix td:last-child {
  border-right: none;
}

.scope-matrix tbody tr:last-child td {
  border-bottom: none;
}

.service-header-cell {
  padding: 12px 16px;
  background: #f5f5f5;
  text-align: left;
  min-width: 180px;
  position: sticky;
  left: 0;
  z-index: 2;
}

.day-header-cell {
  padding: 8px 12px;
  background: #f5f5f5;
  text-align: center;
  cursor: pointer;
  transition: background 0.2s;
  min-width: 85px;
}

.day-header-cell:hover {
  background: #e8e8e8;
}

.day-header-content {
  display: flex;
  align-items: center;
  justify-content: center;
}

.service-name-cell {
  padding: 10px 16px;
  background: white;
  cursor: pointer;
  transition: background 0.2s;
  position: sticky;
  left: 0;
  z-index: 1;
}

.service-name-cell:hover {
  background: #f5f5f5;
}

.checkbox-cell {
  text-align: center;
  padding: 4px;
  cursor: pointer;
  transition: background 0.15s;
}

.checkbox-cell:hover {
  background: #f0f7ff;
}

.border-t {
  border-top: 1px solid #e0e0e0;
}
</style>
