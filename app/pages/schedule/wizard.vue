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
}

interface ValidationResult {
  errors: Array<{ type: string; severity: string; message: string; date?: string }>
  warnings: Array<{ type: string; severity: string; message: string }>
  coverage_score: number
  total_slots: number
  filled_slots: number
  is_valid: boolean
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
        <h1 class="text-h4 font-weight-bold mb-1">Schedule Wizard</h1>
        <p class="text-body-2 text-grey-darken-1 mb-0">
          Build your weekly schedule in 4 easy steps
        </p>
      </div>
      
      <v-btn
        v-if="currentStep > 1 && currentStep < 4"
        variant="text"
        color="grey"
        @click="resetWizard"
      >
        <v-icon start>mdi-refresh</v-icon>
        Start Over
      </v-btn>
    </div>

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
                  
                  <!-- Shift Time Display -->
                  <div class="slot-time text-caption text-grey-darken-1">
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
        
        <v-list v-else lines="two" class="py-0">
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
            
            <template #append>
              <div class="text-right">
                <div class="text-caption">{{ emp.current_week_hours }}h this week</div>
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
</style>
