<script setup lang="ts">
/**
 * WizardEmployeeSelector - Employee assignment dialog for schedule slots
 * Extracted from pages/schedule/wizard.vue
 */
import type { DraftSlot, AvailableEmployee } from '~/types/schedule.types'

const props = defineProps<{
  draftId: string
  weekStart: Date
  locationId: string
}>()

const emit = defineEmits<{
  (e: 'assigned', payload: { slotId: string; employeeId: string }): void
  (e: 'notify', payload: { message: string; color: string }): void
}>()

const supabase = useSupabaseClient()

// State
const selectorDialog = ref(false)
const selectedSlot = ref<DraftSlot | null>(null)
const availableEmployees = ref<AvailableEmployee[]>([])
const isLoadingEmployees = ref(false)
const employeeSearch = ref('')

// Filtered employees based on search
const filteredEmployees = computed(() => {
  const search = employeeSearch.value.toLowerCase().trim()
  if (!search) return availableEmployees.value

  return availableEmployees.value.filter(emp => {
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase()
    const position = (emp.position_title || '').toLowerCase()
    return fullName.includes(search) || position.includes(search)
  })
})

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

// Open employee selector for a specific slot/day
async function open(slot: DraftSlot, _dayIndex?: number) {
  selectedSlot.value = slot
  selectorDialog.value = true
  isLoadingEmployees.value = true
  employeeSearch.value = ''

  try {
    const { data, error } = await supabase.rpc('get_available_employees_for_slot', {
      p_draft_id: props.draftId,
      p_slot_date: slot.slot_date,
      p_start_time: slot.start_time,
      p_end_time: slot.end_time,
      p_role_category: slot.role_category
    })

    if (error) throw error
    availableEmployees.value = data || []
  } catch (err) {
    console.error('Failed to load available employees:', err)
    availableEmployees.value = []
  } finally {
    isLoadingEmployees.value = false
  }
}

// Assign employee to slot
async function assignEmployee(employeeId: string) {
  if (!selectedSlot.value) return

  try {
    const { error } = await supabase.rpc('assign_employee_to_slot', {
      p_slot_id: selectedSlot.value.id,
      p_employee_id: employeeId
    })

    if (error) throw error

    selectorDialog.value = false
    emit('assigned', { slotId: selectedSlot.value.id, employeeId })
    emit('notify', { message: 'Employee assigned', color: 'success' })
  } catch (err) {
    console.error('Failed to assign employee:', err)
    emit('notify', { message: 'Failed to assign employee', color: 'error' })
  }
}

defineExpose({ open })
</script>

<template>
  <!-- Employee Selector Dialog -->
  <v-dialog v-model="selectorDialog" max-width="600" @after-leave="employeeSearch = ''">
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

      <!-- Search Field -->
      <div class="px-4 pt-4">
        <v-text-field
          v-model="employeeSearch"
          placeholder="Search by name or position..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          autofocus
          @keydown.esc="selectorDialog = false"
        />
      </div>

      <v-card-text v-if="isLoadingEmployees" class="text-center py-8">
        <v-progress-circular indeterminate color="primary" />
      </v-card-text>

      <v-list v-else lines="three" class="py-0 scrollable-md">
        <template v-if="filteredEmployees.length === 0">
          <v-list-item>
            <v-list-item-title class="text-center text-grey">
              No employees match "{{ employeeSearch }}"
            </v-list-item-title>
          </v-list-item>
        </template>
        <v-list-item
          v-for="emp in filteredEmployees"
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
</template>
