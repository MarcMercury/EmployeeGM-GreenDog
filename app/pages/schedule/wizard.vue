<script setup lang="ts">
/**
 * Schedule Wizard - Service-Based Schedule Builder
 * 
 * 4-Step Wizard Flow:
 * 1. SCOPE: Select week, location, operational days, services
 * 2. STAFFING MATRIX: Assign employees to service slots (ghost cards)
 * 3. VALIDATION: AI/Logic checks for conflicts and understaffing
 * 4. PUBLISH: Finalize and notify employees
 */
import { format, addDays, startOfWeek, parseISO } from 'date-fns'

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
  icon: string
  requires_dvm: boolean
  min_staff_count: number
  sort_order: number
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

interface DraftSlot {
  id: string
  draft_id: string
  service_id: string
  staffing_requirement_id: string | null
  role_category: string
  role_label: string
  is_required: boolean
  priority: number
  slot_date: string
  start_time: string
  end_time: string
  employee_id: string | null
  is_filled: boolean
  has_conflict: boolean
  conflict_reason: string | null
  ai_suggested_employee_id: string | null
  ai_confidence: number | null
  service?: Service
  employee?: { first_name: string; last_name: string }
}

interface AvailableEmployee {
  employee_id: string
  first_name: string
  last_name: string
  position_title: string
  is_available: boolean
  conflict_reason: string | null
  current_week_hours: number
  reliability_score: number
  availability_type: string
  availability_note: string | null
  preference_level: number
}

interface ValidationResult {
  errors: Array<{ type: string; severity: string; message: string; date?: string }>
  warnings: Array<{ type: string; severity: string; message: string }>
  coverage_score: number
  total_slots: number
  filled_slots: number
  is_valid: boolean
}

interface ScheduleTemplate {
  id: string
  name: string
  description: string | null
  location_id: string | null
  location_name: string | null
  operational_days: number[]
  service_count: number
  slot_count: number
  is_default: boolean
  usage_count: number
  last_used_at: string | null
  created_at: string
}

interface DashboardLocation {
  location_id: string
  location_name: string
  location_code: string
  draft_id: string | null
  draft_status: string
  total_slots: number
  filled_slots: number
  required_slots: number
  required_filled: number
  coverage_percentage: number
  has_draft: boolean
  published_at: string | null
  last_updated: string | null
}

// Composables
const supabase = useSupabaseClient()
const toast = useToast()
const { employees, locations } = useAppData()

// Wizard state
const currentStep = ref(1)
const isLoading = ref(false)
const isSaving = ref(false)

// Step 1: Scope
const selectedWeekStart = ref(startOfWeek(new Date(), { weekStartsOn: 0 }))
const selectedLocationId = ref<string | null>(null)
const operationalDays = ref<number[]>([1, 2, 3, 4, 5]) // Mon-Fri default
const selectedServiceIds = ref<string[]>([])

// Data
const services = ref<Service[]>([])
const staffingRequirements = ref<StaffingRequirement[]>([])
const draftId = ref<string | null>(null)
const draftSlots = ref<DraftSlot[]>([])
const validationResult = ref<ValidationResult | null>(null)

// Employee selector
const selectorDialog = ref(false)
const selectedSlot = ref<DraftSlot | null>(null)
const availableEmployees = ref<AvailableEmployee[]>([])
const isLoadingEmployees = ref(false)

// Quick action states
const isCopyingWeek = ref(false)
const isAutoFilling = ref(false)

// Time editing dialog
const timeEditDialog = ref(false)
const editingSlot = ref<DraftSlot | null>(null)
const editStartTime = ref('')
const editEndTime = ref('')
const isSavingTime = ref(false)

// Templates
const templates = ref<ScheduleTemplate[]>([])
const templatesDialog = ref(false)
const saveTemplateDialog = ref(false)
const templateName = ref('')
const templateDescription = ref('')
const templateLocationSpecific = ref(false)
const isSavingTemplate = ref(false)
const isApplyingTemplate = ref(false)
const isLoadingTemplates = ref(false)

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

const canPublish = computed(() => 
  validationResult.value?.is_valid === true
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

// Toggle day
function toggleDay(day: number) {
  const idx = operationalDays.value.indexOf(day)
  if (idx >= 0) {
    operationalDays.value.splice(idx, 1)
  } else {
    operationalDays.value.push(day)
    operationalDays.value.sort()
  }
}

// Toggle service
function toggleService(serviceId: string) {
  const idx = selectedServiceIds.value.indexOf(serviceId)
  if (idx >= 0) {
    selectedServiceIds.value.splice(idx, 1)
  } else {
    selectedServiceIds.value.push(serviceId)
  }
}

// Select all services
function selectAllServices() {
  selectedServiceIds.value = services.value.map(s => s.id)
}

// Clear all services
function clearAllServices() {
  selectedServiceIds.value = []
}

// Create draft and move to step 2
async function createDraftAndProceed() {
  if (!canProceedToStep2.value) return
  
  isLoading.value = true
  try {
    // Call RPC to create/update draft
    const { data, error } = await supabase.rpc('create_schedule_draft', {
      p_location_id: selectedLocationId.value,
      p_week_start: format(selectedWeekStart.value, 'yyyy-MM-dd'),
      p_operational_days: operationalDays.value,
      p_service_ids: selectedServiceIds.value
    })
    
    if (error) throw error
    
    draftId.value = data
    
    // Load generated slots
    await loadDraftSlots()
    
    currentStep.value = 2
    toast.success('Draft created! Now assign employees to slots.')
  } catch (err) {
    console.error('Failed to create draft:', err)
    toast.error('Failed to create schedule draft')
  } finally {
    isLoading.value = false
  }
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
      .order('slot_date, priority, sort_order')
    
    if (error) throw error
    draftSlots.value = data || []
  } catch (err) {
    console.error('Failed to load draft slots:', err)
  }
}

// Open employee selector for a slot
async function openEmployeeSelector(slot: DraftSlot) {
  selectedSlot.value = slot
  selectorDialog.value = true
  isLoadingEmployees.value = true
  
  try {
    const { data, error } = await supabase.rpc('get_available_employees_for_slot', {
      p_draft_id: draftId.value,
      p_slot_date: slot.slot_date,
      p_start_time: slot.start_time,
      p_end_time: slot.end_time,
      p_role_category: slot.role_category
    })
    
    if (error) throw error
    availableEmployees.value = data || []
  } catch (err) {
    console.error('Failed to load available employees:', err)
    // Fallback to all employees
    availableEmployees.value = (employees.value || []).map(e => ({
      employee_id: e.id,
      first_name: e.first_name,
      last_name: e.last_name,
      position_title: e.position?.title || 'Staff',
      is_available: true,
      conflict_reason: null,
      current_week_hours: 0,
      reliability_score: 80
    }))
  } finally {
    isLoadingEmployees.value = false
  }
}

// Assign employee to slot
async function assignEmployee(employeeId: string) {
  if (!selectedSlot.value) return
  
  isSaving.value = true
  try {
    const { error } = await supabase.rpc('assign_employee_to_slot', {
      p_slot_id: selectedSlot.value.id,
      p_employee_id: employeeId
    })
    
    if (error) throw error
    
    // Update local state
    const slot = draftSlots.value.find(s => s.id === selectedSlot.value?.id)
    if (slot) {
      slot.employee_id = employeeId
      const emp = employees.value?.find(e => e.id === employeeId)
      if (emp) {
        slot.employee = { first_name: emp.first_name, last_name: emp.last_name }
      }
    }
    
    selectorDialog.value = false
    toast.success('Employee assigned')
  } catch (err) {
    console.error('Failed to assign employee:', err)
    toast.error('Failed to assign employee')
  } finally {
    isSaving.value = false
  }
}

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

// Get availability display info
function getAvailabilityDisplay(emp: AvailableEmployee): { icon: string; color: string; text: string } {
  switch (emp.availability_type) {
    case 'preferred':
      return { icon: 'mdi-star', color: 'success', text: 'Prefers this day' }
    case 'available':
      return { icon: 'mdi-check-circle', color: 'success', text: 'Available' }
    case 'avoid':
      return { icon: 'mdi-alert', color: 'warning', text: emp.availability_note || 'Prefers not to work' }
    case 'unavailable':
      return { icon: 'mdi-close-circle', color: 'error', text: emp.availability_note || 'Not available' }
    default:
      return { icon: 'mdi-help-circle-outline', color: 'grey', text: 'No preference set' }
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
    currentStep.value = 3
  } catch (err) {
    console.error('Validation failed:', err)
    toast.error('Failed to validate schedule')
  } finally {
    isLoading.value = false
  }
}

// Publish draft (Step 4)
async function publishDraft() {
  if (!draftId.value || !canPublish.value) return
  
  isLoading.value = true
  try {
    const { error } = await supabase.rpc('publish_schedule_draft', {
      p_draft_id: draftId.value
    })
    
    if (error) throw error
    
    currentStep.value = 4
    toast.success('Schedule published! Employees have been notified.')
    
    // Optional: Send Slack notification
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
  selectedServiceIds.value = []
}

// ============================================================
// TEMPLATES FUNCTIONS
// ============================================================

// Load available templates
async function loadTemplates() {
  isLoadingTemplates.value = true
  try {
    const { data, error } = await supabase.rpc('list_schedule_templates', {
      p_location_id: selectedLocationId.value
    })
    
    if (error) throw error
    templates.value = data || []
  } catch (err) {
    console.error('Failed to load templates:', err)
    templates.value = []
  } finally {
    isLoadingTemplates.value = false
  }
}

// Open templates dialog
async function openTemplatesDialog() {
  await loadTemplates()
  templatesDialog.value = true
}

// Apply template to current draft
async function applyTemplate(template: ScheduleTemplate) {
  if (!selectedLocationId.value) {
    toast.error('Please select a location first')
    return
  }
  
  isApplyingTemplate.value = true
  try {
    const { data, error } = await supabase.rpc('apply_template_to_draft', {
      p_template_id: template.id,
      p_location_id: selectedLocationId.value,
      p_week_start: format(selectedWeekStart.value, 'yyyy-MM-dd')
    })
    
    if (error) throw error
    
    draftId.value = data
    operationalDays.value = [...template.operational_days]
    
    // Load the applied slots
    await loadDraftSlots()
    
    templatesDialog.value = false
    currentStep.value = 2
    toast.success(`Applied template "${template.name}" - ${template.slot_count} slots created`)
  } catch (err) {
    console.error('Failed to apply template:', err)
    toast.error('Failed to apply template')
  } finally {
    isApplyingTemplate.value = false
  }
}

// Open save template dialog
function openSaveTemplateDialog() {
  templateName.value = `${selectedLocation.value?.name || 'Schedule'} Template`
  templateDescription.value = ''
  templateLocationSpecific.value = false
  saveTemplateDialog.value = true
}

// Save current draft as template
async function saveAsTemplate() {
  if (!draftId.value || !templateName.value.trim()) {
    toast.error('Please provide a template name')
    return
  }
  
  isSavingTemplate.value = true
  try {
    const { data, error } = await supabase.rpc('save_template_from_draft', {
      p_draft_id: draftId.value,
      p_name: templateName.value.trim(),
      p_description: templateDescription.value.trim() || null,
      p_location_specific: templateLocationSpecific.value
    })
    
    if (error) throw error
    
    saveTemplateDialog.value = false
    toast.success('Template saved successfully!')
  } catch (err) {
    console.error('Failed to save template:', err)
    toast.error('Failed to save template')
  } finally {
    isSavingTemplate.value = false
  }
}

// Delete a template
async function deleteTemplate(template: ScheduleTemplate) {
  if (!confirm(`Delete template "${template.name}"?`)) return
  
  try {
    const { error } = await supabase.rpc('delete_schedule_template', {
      p_template_id: template.id
    })
    
    if (error) throw error
    
    templates.value = templates.value.filter(t => t.id !== template.id)
    toast.success('Template deleted')
  } catch (err) {
    console.error('Failed to delete template:', err)
    toast.error('Failed to delete template')
  }
}

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
    validated: 'info',
    building: 'warning',
    draft: 'grey',
    none: 'grey-lighten-1'
  }
  return colors[status] || 'grey'
}

// Get status label for dashboard
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    published: 'Published',
    validated: 'Validated',
    building: 'In Progress',
    draft: 'Draft',
    none: 'Not Started'
  }
  return labels[status] || status
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
  
  // Set default location
  if (locations.value?.length && !selectedLocationId.value) {
    selectedLocationId.value = locations.value[0].id
  }
  
  isLoading.value = false
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
            : 'Build your weekly schedule in 4 easy steps' 
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
          @click="openTemplatesDialog"
        >
          <v-icon start>mdi-file-document-outline</v-icon>
          Templates
        </v-btn>
        
        <v-btn
          v-if="viewMode === 'wizard' && currentStep > 1 && currentStep < 4"
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
          <v-btn icon="mdi-chevron-left" variant="text" @click="changeWeek(-1); loadDashboard()" />
          <v-chip size="large" color="primary" variant="flat">
            {{ weekLabel }}
          </v-chip>
          <v-btn icon="mdi-chevron-right" variant="text" @click="changeWeek(1); loadDashboard()" />
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
        { title: 'Validate', subtitle: 'Check Conflicts' },
        { title: 'Publish', subtitle: 'Go Live' }
      ]"
      alt-labels
      flat
      class="mb-6"
    />

    <!-- Loading -->
    <div v-if="isLoading" class="d-flex justify-center align-center" style="min-height: 400px;">
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
                  <v-btn icon="mdi-chevron-left" variant="text" @click="changeWeek(-1)" />
                  <v-chip size="large" color="primary" variant="flat">
                    {{ weekLabel }}
                  </v-chip>
                  <v-btn icon="mdi-chevron-right" variant="text" @click="changeWeek(1)" />
                </div>
                <v-btn block variant="outlined" size="small" @click="goToThisWeek">
                  Go to This Week
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Location Selection -->
          <v-col cols="12" md="4">
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

          <!-- Operational Days -->
          <v-col cols="12" md="4">
            <v-card rounded="lg" class="h-100">
              <v-card-title class="text-subtitle-1">
                <v-icon start color="primary">mdi-calendar-check</v-icon>
                Operational Days
              </v-card-title>
              <v-card-text>
                <div class="d-flex flex-wrap gap-2">
                  <v-chip
                    v-for="(label, idx) in dayLabels"
                    :key="idx"
                    :color="operationalDays.includes(idx) ? 'primary' : 'grey'"
                    :variant="operationalDays.includes(idx) ? 'flat' : 'outlined'"
                    @click="toggleDay(idx)"
                    class="cursor-pointer"
                  >
                    {{ label }}
                  </v-chip>
                </div>
                <p class="text-caption text-grey mt-3">
                  {{ operationalDays.length }} days selected
                </p>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Services Selection -->
          <v-col cols="12">
            <v-card rounded="lg">
              <v-card-title class="d-flex align-center justify-space-between">
                <span class="text-subtitle-1">
                  <v-icon start color="primary">mdi-medical-bag</v-icon>
                  Select Services to Staff
                </span>
                <div class="d-flex gap-2">
                  <v-btn size="small" variant="text" @click="selectAllServices">Select All</v-btn>
                  <v-btn size="small" variant="text" color="grey" @click="clearAllServices">Clear</v-btn>
                </div>
              </v-card-title>
              <v-card-text>
                <div class="services-grid">
                  <v-card
                    v-for="service in services"
                    :key="service.id"
                    :color="selectedServiceIds.includes(service.id) ? 'primary' : undefined"
                    :variant="selectedServiceIds.includes(service.id) ? 'tonal' : 'outlined'"
                    rounded="lg"
                    class="service-card cursor-pointer"
                    @click="toggleService(service.id)"
                  >
                    <v-card-text class="text-center pa-3">
                      <v-icon :color="service.color" size="32" class="mb-2">
                        {{ service.icon || 'mdi-medical-bag' }}
                      </v-icon>
                      <div class="text-body-2 font-weight-medium">{{ service.name }}</div>
                      <div class="text-caption text-grey">
                        {{ service.requires_dvm ? 'Requires DVM' : 'No DVM' }}
                      </div>
                    </v-card-text>
                  </v-card>
                </div>
                
                <v-alert v-if="selectedServiceIds.length === 0" type="info" variant="tonal" class="mt-4">
                  Select at least one service to continue
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
              @click="openSaveTemplateDialog"
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
                  @click="openEmployeeSelector(slot)"
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
                  :color="validationResult?.is_valid ? 'success' : 'error'" 
                  class="mr-2"
                >
                  {{ validationResult?.is_valid ? 'mdi-check-circle' : 'mdi-alert-circle' }}
                </v-icon>
                Validation Results
              </v-card-title>
              <v-card-text>
                <!-- Coverage Score -->
                <div class="text-center mb-6">
                  <v-progress-circular
                    :model-value="validationResult?.coverage_score || 0"
                    :size="120"
                    :width="12"
                    :color="(validationResult?.coverage_score || 0) >= 80 ? 'success' : (validationResult?.coverage_score || 0) >= 50 ? 'warning' : 'error'"
                  >
                    <div class="text-h4 font-weight-bold">
                      {{ Math.round(validationResult?.coverage_score || 0) }}%
                    </div>
                  </v-progress-circular>
                  <div class="text-body-2 text-grey mt-2">Coverage Score</div>
                  <div class="text-caption">
                    {{ validationResult?.filled_slots }} of {{ validationResult?.total_slots }} slots filled
                  </div>
                </div>

                <!-- Status -->
                <v-alert
                  :type="validationResult?.is_valid ? 'success' : 'error'"
                  variant="tonal"
                  class="mb-4"
                >
                  {{ validationResult?.is_valid 
                    ? 'Schedule is ready to publish!' 
                    : 'Please fix the errors before publishing.' 
                  }}
                </v-alert>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-card rounded="lg" class="h-100">
              <v-card-title>Issues Found</v-card-title>
              <v-card-text>
                <!-- Errors -->
                <div v-if="validationResult?.errors?.length" class="mb-4">
                  <div class="text-subtitle-2 text-error mb-2">
                    <v-icon size="16" color="error" class="mr-1">mdi-close-circle</v-icon>
                    {{ validationResult.errors.length }} Error(s)
                  </div>
                  <v-list density="compact" class="bg-transparent">
                    <v-list-item
                      v-for="(err, idx) in validationResult.errors"
                      :key="idx"
                      class="px-0"
                    >
                      <template #prepend>
                        <v-icon color="error" size="small">mdi-alert</v-icon>
                      </template>
                      <v-list-item-title class="text-body-2">
                        {{ err.message }}
                      </v-list-item-title>
                    </v-list-item>
                  </v-list>
                </div>

                <!-- Warnings -->
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

                <!-- No Issues -->
                <div v-if="!validationResult?.errors?.length && !validationResult?.warnings?.length" class="text-center py-4">
                  <v-icon size="48" color="success">mdi-check-decagram</v-icon>
                  <p class="text-body-2 text-grey mt-2">No issues found!</p>
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
              color="success"
              size="large"
              :disabled="!canPublish"
              :loading="isLoading"
              @click="publishDraft"
            >
              <v-icon start>mdi-publish</v-icon>
              Publish Schedule
            </v-btn>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- Step 4: Published -->
      <v-window-item :value="4">
        <v-card rounded="lg" class="text-center pa-8">
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
      </v-window-item>
    </v-window>
    </template>

    <!-- Employee Selector Dialog -->
    <v-dialog v-model="selectorDialog" max-width="600">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-account-search</v-icon>
          Select Employee
          <v-spacer />
          <v-chip v-if="selectedSlot" size="small" :color="getRoleCategoryColor(selectedSlot.role_category)">
            {{ selectedSlot.role_label }}
          </v-chip>
        </v-card-title>
        
        <v-divider />
        
        <v-card-text v-if="isLoadingEmployees" class="text-center py-8">
          <v-progress-circular indeterminate color="primary" />
        </v-card-text>
        
        <v-list v-else lines="three" class="py-0">
          <v-list-item
            v-for="emp in availableEmployees"
            :key="emp.employee_id"
            :disabled="!emp.is_available"
            @click="emp.is_available && assignEmployee(emp.employee_id)"
          >
            <template #prepend>
              <v-avatar :color="emp.is_available ? 'primary' : 'grey'" size="40">
                <span class="text-white font-weight-bold">
                  {{ emp.first_name?.charAt(0) }}{{ emp.last_name?.charAt(0) }}
                </span>
              </v-avatar>
            </template>
            
            <v-list-item-title :class="{ 'text-grey': !emp.is_available }">
              {{ emp.first_name }} {{ emp.last_name }}
            </v-list-item-title>
            
            <v-list-item-subtitle>
              {{ emp.position_title }}
              <template v-if="emp.conflict_reason">
                • <span class="text-error">{{ emp.conflict_reason }}</span>
              </template>
            </v-list-item-subtitle>
            
            <!-- Availability Status Row -->
            <v-list-item-subtitle class="mt-1">
              <v-chip 
                size="x-small" 
                :color="getAvailabilityDisplay(emp).color"
                variant="tonal"
                class="mr-1"
              >
                <v-icon size="12" start>{{ getAvailabilityDisplay(emp).icon }}</v-icon>
                {{ getAvailabilityDisplay(emp).text }}
              </v-chip>
            </v-list-item-subtitle>
            
            <template #append>
              <div class="text-right">
                <div class="text-caption">{{ emp.current_week_hours?.toFixed(1) || 0 }}h this week</div>
                <v-chip 
                  size="x-small" 
                  :color="emp.reliability_score >= 90 ? 'success' : emp.reliability_score >= 70 ? 'warning' : 'error'"
                  variant="tonal"
                >
                  {{ Math.round(emp.reliability_score) }}% reliable
                </v-chip>
              </div>
            </template>
          </v-list-item>
        </v-list>
        
        <v-divider />
        
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="selectorDialog = false">Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <!-- Time Edit Dialog -->
    <v-dialog v-model="timeEditDialog" max-width="360">
      <v-card>
        <v-card-title>
          <v-icon class="mr-2">mdi-clock-edit-outline</v-icon>
          Edit Shift Time
        </v-card-title>
        
        <v-card-text>
          <div v-if="editingSlot" class="mb-4">
            <v-chip size="small" :color="getRoleCategoryColor(editingSlot.role_category)" class="mb-2">
              {{ editingSlot.role_label }}
            </v-chip>
          </div>
          
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="editStartTime"
                label="Start Time"
                type="time"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="editEndTime"
                label="End Time"
                type="time"
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="timeEditDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="isSavingTime" @click="saveSlotTimes">
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <!-- Templates Dialog -->
    <v-dialog v-model="templatesDialog" max-width="700">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-file-document-multiple-outline</v-icon>
          Schedule Templates
          <v-spacer />
          <v-btn 
            v-if="draftId" 
            variant="tonal" 
            color="primary" 
            size="small"
            @click="templatesDialog = false; openSaveTemplateDialog()"
          >
            <v-icon start>mdi-content-save</v-icon>
            Save Current as Template
          </v-btn>
        </v-card-title>
        
        <v-divider />
        
        <v-card-text v-if="isLoadingTemplates" class="text-center py-8">
          <v-progress-circular indeterminate color="primary" />
        </v-card-text>
        
        <v-list v-else-if="templates.length > 0" lines="three">
          <v-list-item
            v-for="template in templates"
            :key="template.id"
            :disabled="isApplyingTemplate"
            @click="applyTemplate(template)"
          >
            <template #prepend>
              <v-avatar color="secondary" variant="tonal">
                <v-icon>mdi-file-document-outline</v-icon>
              </v-avatar>
            </template>
            
            <v-list-item-title class="font-weight-medium">
              {{ template.name }}
              <v-chip v-if="template.is_default" size="x-small" color="primary" class="ml-2">
                Default
              </v-chip>
            </v-list-item-title>
            
            <v-list-item-subtitle>
              {{ template.description || 'No description' }}
            </v-list-item-subtitle>
            
            <v-list-item-subtitle class="mt-1">
              <v-chip size="x-small" variant="outlined" class="mr-1">
                {{ template.slot_count }} slots
              </v-chip>
              <v-chip size="x-small" variant="outlined" class="mr-1">
                {{ template.service_count }} services
              </v-chip>
              <v-chip v-if="template.location_name" size="x-small" variant="outlined">
                {{ template.location_name }}
              </v-chip>
              <v-chip v-else size="x-small" variant="outlined" color="success">
                Any Location
              </v-chip>
            </v-list-item-subtitle>
            
            <template #append>
              <div class="d-flex flex-column align-end">
                <div class="text-caption text-grey mb-1">
                  Used {{ template.usage_count }} times
                </div>
                <v-btn 
                  icon="mdi-delete" 
                  size="x-small" 
                  variant="text" 
                  color="error"
                  @click.stop="deleteTemplate(template)"
                />
              </div>
            </template>
          </v-list-item>
        </v-list>
        
        <v-card-text v-else class="text-center py-8">
          <v-icon size="48" color="grey">mdi-file-document-outline</v-icon>
          <p class="text-body-2 text-grey mt-2">No templates found</p>
          <p class="text-caption text-grey">
            Build a schedule and save it as a template to reuse it later
          </p>
        </v-card-text>
        
        <v-divider />
        
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="templatesDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <!-- Save Template Dialog -->
    <v-dialog v-model="saveTemplateDialog" max-width="450">
      <v-card>
        <v-card-title>
          <v-icon class="mr-2">mdi-content-save-outline</v-icon>
          Save as Template
        </v-card-title>
        
        <v-card-text>
          <v-text-field
            v-model="templateName"
            label="Template Name"
            placeholder="e.g., Standard Monday-Friday"
            variant="outlined"
            density="compact"
            :rules="[(v: string) => !!v.trim() || 'Name is required']"
            class="mb-3"
          />
          
          <v-textarea
            v-model="templateDescription"
            label="Description (optional)"
            placeholder="Describe when to use this template..."
            variant="outlined"
            density="compact"
            rows="2"
            class="mb-3"
          />
          
          <v-checkbox
            v-model="templateLocationSpecific"
            label="Location-specific template"
            hint="If checked, this template will only be available for the current location"
            persistent-hint
            density="compact"
          />
        </v-card-text>
        
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="saveTemplateDialog = false">Cancel</v-btn>
          <v-btn 
            color="primary" 
            :loading="isSavingTemplate" 
            :disabled="!templateName.trim()"
            @click="saveAsTemplate"
          >
            Save Template
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
</style>
