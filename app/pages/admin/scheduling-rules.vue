<script setup lang="ts">
/**
 * Scheduling Rules Management Page
 * Configure constraints for schedule validation
 * Part of Scheduling System Phase 2
 */

definePageMeta({
  middleware: ['auth', 'admin'],
  layout: 'default'
})

import type { SchedulingRule } from '~/types/schedule.types'

// Composables
const supabase = useSupabaseClient()
const toast = useToast()
const { locations, departments, positions } = useAppData()

// State
const rules = ref<SchedulingRule[]>([])
const isLoading = ref(true)
const showInactive = ref(false)

// Dialog state
const ruleDialog = ref(false)
const deleteDialog = ref(false)
const editingRule = ref<SchedulingRule | null>(null)
const deletingRule = ref<SchedulingRule | null>(null)

// Rule type options
const ruleTypes = [
  { 
    value: 'max_hours_per_week', 
    title: 'Max Hours Per Week',
    description: 'Limit total weekly hours',
    icon: 'mdi-calendar-week',
    params: [
      { key: 'max_hours', label: 'Max Hours', type: 'number', default: 40 },
      { key: 'warning_at', label: 'Warning At', type: 'number', default: 35 }
    ]
  },
  { 
    value: 'max_hours_per_day', 
    title: 'Max Hours Per Day',
    description: 'Limit single shift length',
    icon: 'mdi-clock-outline',
    params: [{ key: 'max_hours', label: 'Max Hours', type: 'number', default: 10 }]
  },
  { 
    value: 'min_rest_between_shifts', 
    title: 'Min Rest Between Shifts',
    description: 'Required rest period',
    icon: 'mdi-bed',
    params: [{ key: 'min_hours', label: 'Min Hours', type: 'number', default: 8 }]
  },
  { 
    value: 'max_consecutive_days', 
    title: 'Max Consecutive Days',
    description: 'Limit work streaks',
    icon: 'mdi-calendar-range',
    params: [{ key: 'max_days', label: 'Max Days', type: 'number', default: 6 }]
  },
  { 
    value: 'overtime_threshold', 
    title: 'Overtime Threshold',
    description: 'Flag overtime hours',
    icon: 'mdi-currency-usd',
    params: [{ key: 'threshold_hours', label: 'Threshold Hours', type: 'number', default: 40 }]
  },
  { 
    value: 'break_requirement', 
    title: 'Break Requirement',
    description: 'Required break for long shifts',
    icon: 'mdi-coffee',
    params: [
      { key: 'shift_hours', label: 'Shift Hours Threshold', type: 'number', default: 6 },
      { key: 'break_minutes', label: 'Break Minutes', type: 'number', default: 30 }
    ]
  },
  { 
    value: 'skill_required', 
    title: 'Skill Required',
    description: 'Require specific skill for assignment',
    icon: 'mdi-school',
    params: [
      { key: 'skill_name', label: 'Skill Name', type: 'text', default: '' },
      { key: 'min_level', label: 'Minimum Level', type: 'number', default: 1 }
    ]
  },
  { 
    value: 'custom', 
    title: 'Custom Rule',
    description: 'Custom validation logic',
    icon: 'mdi-cog',
    params: []
  }
]

const severityOptions = [
  { value: 'error', title: 'Error (Blocks)', color: 'error' },
  { value: 'warning', title: 'Warning (Allows)', color: 'warning' },
  { value: 'info', title: 'Info (Notifies)', color: 'info' }
]

// Form state
const ruleForm = ref({
  name: '',
  description: '',
  rule_type: 'max_hours_per_week',
  parameters: {} as Record<string, any>,
  location_id: null as string | null,
  department_id: null as string | null,
  position_id: null as string | null,
  is_active: true,
  severity: 'warning' as 'error' | 'warning' | 'info'
})

// Computed
const filteredRules = computed(() => {
  if (showInactive.value) return rules.value
  return rules.value.filter(r => r.is_active)
})

const currentRuleType = computed(() => {
  return ruleTypes.find(t => t.value === ruleForm.value.rule_type)
})

// Load rules
async function loadRules() {
  isLoading.value = true
  try {
    const { data, error } = await supabase
      .from('scheduling_rules')
      .select(`
        *,
        location:location_id (id, name),
        department:department_id (id, name),
        position:position_id (id, title)
      `)
      .order('rule_type')
      .order('name')
    
    if (error) throw error
    rules.value = data || []
  } catch (error: any) {
    toast.error('Failed to load rules', error.message)
  } finally {
    isLoading.value = false
  }
}

// Get rule type info
function getRuleTypeInfo(type: string) {
  return ruleTypes.find(t => t.value === type) || ruleTypes[ruleTypes.length - 1]
}

// Open rule dialog
function openRuleDialog(rule?: SchedulingRule) {
  if (rule) {
    editingRule.value = rule
    ruleForm.value = {
      name: rule.name,
      description: rule.description || '',
      rule_type: rule.rule_type,
      parameters: { ...rule.parameters },
      location_id: rule.location_id,
      department_id: rule.department_id,
      position_id: rule.position_id,
      is_active: rule.is_active,
      severity: rule.severity
    }
  } else {
    editingRule.value = null
    const defaultType = ruleTypes[0]
    const defaultParams: Record<string, any> = {}
    defaultType.params.forEach(p => {
      defaultParams[p.key] = p.default
    })
    
    ruleForm.value = {
      name: '',
      description: '',
      rule_type: defaultType.value,
      parameters: defaultParams,
      location_id: null,
      department_id: null,
      position_id: null,
      is_active: true,
      severity: 'warning'
    }
  }
  ruleDialog.value = true
}

// Handle rule type change
function onRuleTypeChange() {
  const typeInfo = currentRuleType.value
  if (!typeInfo) return
  
  const newParams: Record<string, any> = {}
  typeInfo.params.forEach(p => {
    newParams[p.key] = ruleForm.value.parameters[p.key] ?? p.default
  })
  ruleForm.value.parameters = newParams
  
  // Auto-generate name if empty
  if (!ruleForm.value.name || ruleForm.value.name === editingRule.value?.name) {
    ruleForm.value.name = typeInfo.title
  }
}

// Save rule
async function saveRule() {
  try {
    const payload = {
      name: ruleForm.value.name,
      description: ruleForm.value.description || null,
      rule_type: ruleForm.value.rule_type,
      parameters: ruleForm.value.parameters,
      location_id: ruleForm.value.location_id,
      department_id: ruleForm.value.department_id,
      position_id: ruleForm.value.position_id,
      is_active: ruleForm.value.is_active,
      severity: ruleForm.value.severity
    }
    
    if (editingRule.value) {
      const { error } = await supabase
        .from('scheduling_rules')
        .update(payload)
        .eq('id', editingRule.value.id)
      
      if (error) throw error
      toast.success('Rule updated')
    } else {
      const { error } = await supabase
        .from('scheduling_rules')
        .insert(payload)
      
      if (error) throw error
      toast.success('Rule created')
    }
    
    ruleDialog.value = false
    await loadRules()
  } catch (error: any) {
    toast.error('Failed to save rule', error.message)
  }
}

// Delete rule
function confirmDelete(rule: SchedulingRule) {
  deletingRule.value = rule
  deleteDialog.value = true
}

async function deleteRule() {
  if (!deletingRule.value) return
  
  try {
    const { error } = await supabase
      .from('scheduling_rules')
      .delete()
      .eq('id', deletingRule.value.id)
    
    if (error) throw error
    
    toast.success('Rule deleted')
    deleteDialog.value = false
    deletingRule.value = null
    await loadRules()
  } catch (error: any) {
    toast.error('Failed to delete rule', error.message)
  }
}

// Toggle active
async function toggleActive(rule: SchedulingRule) {
  try {
    const { error } = await supabase
      .from('scheduling_rules')
      .update({ is_active: !rule.is_active })
      .eq('id', rule.id)
    
    if (error) throw error
    
    toast.success(rule.is_active ? 'Rule disabled' : 'Rule enabled')
    await loadRules()
  } catch (error: any) {
    toast.error('Failed to update rule', error.message)
  }
}

// Format parameters for display
function formatParameters(params: Record<string, any>): string {
  return Object.entries(params)
    .map(([key, val]) => `${key.replace(/_/g, ' ')}: ${val}`)
    .join(', ')
}

// Initialize
onMounted(loadRules)
</script>

<template>
  <div class="p-6 max-w-6xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Scheduling Rules
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          Configure validation constraints for shift assignments
        </p>
      </div>
      
      <div class="flex items-center gap-4">
        <v-switch
          v-model="showInactive"
          label="Show disabled"
          hide-details
          density="compact"
          color="primary"
        />
        
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          @click="openRuleDialog()"
        >
          Add Rule
        </v-btn>
      </div>
    </div>
    
    <!-- Info Alert -->
    <v-alert
      type="info"
      variant="tonal"
      class="mb-6"
      closable
    >
      <strong>How rules work:</strong> When assigning an employee to a shift, the system 
      validates against all active rules. <strong>Error</strong> rules block the assignment, 
      <strong>Warning</strong> rules show a notice but allow it, and <strong>Info</strong> 
      rules just log for tracking.
    </v-alert>
    
    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <v-progress-circular indeterminate color="primary" size="48" />
    </div>
    
    <!-- Rules List -->
    <div v-else class="space-y-3">
      <v-card
        v-for="rule in filteredRules"
        :key="rule.id"
        :class="{ 'opacity-50': !rule.is_active }"
      >
        <v-card-text>
          <div class="flex items-start gap-4">
            <!-- Icon -->
            <v-avatar 
              :color="rule.severity === 'error' ? 'error' : rule.severity === 'warning' ? 'warning' : 'info'"
              variant="tonal"
              size="48"
            >
              <v-icon :icon="getRuleTypeInfo(rule.rule_type).icon" />
            </v-avatar>
            
            <!-- Info -->
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <h3 class="text-lg font-semibold">{{ rule.name }}</h3>
                <v-chip 
                  size="small" 
                  :color="rule.severity === 'error' ? 'error' : rule.severity === 'warning' ? 'warning' : 'info'"
                >
                  {{ rule.severity }}
                </v-chip>
                <v-chip v-if="!rule.is_active" size="small" color="grey">
                  Disabled
                </v-chip>
              </div>
              
              <p v-if="rule.description" class="text-gray-600 dark:text-gray-400 mt-1">
                {{ rule.description }}
              </p>
              
              <div class="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span class="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                  {{ rule.rule_type }}
                </span>
                <span v-if="Object.keys(rule.parameters).length">
                  {{ formatParameters(rule.parameters) }}
                </span>
              </div>
              
              <!-- Scope chips -->
              <div v-if="rule.location || rule.department || rule.position" class="flex gap-2 mt-2">
                <v-chip v-if="rule.location" size="small" variant="outlined">
                  <v-icon start size="small">mdi-map-marker</v-icon>
                  {{ rule.location.name }}
                </v-chip>
                <v-chip v-if="rule.department" size="small" variant="outlined">
                  <v-icon start size="small">mdi-domain</v-icon>
                  {{ rule.department.name }}
                </v-chip>
                <v-chip v-if="rule.position" size="small" variant="outlined">
                  <v-icon start size="small">mdi-badge-account</v-icon>
                  {{ rule.position.title }}
                </v-chip>
              </div>
              <div v-else class="text-sm text-gray-400 mt-2">
                Applies to: All locations, departments, positions
              </div>
            </div>
            
            <!-- Actions -->
            <div class="flex items-center gap-1">
              <v-btn
                icon="mdi-pencil"
                variant="text"
                size="small"
                @click="openRuleDialog(rule)"
              />
              <v-btn
                :icon="rule.is_active ? 'mdi-toggle-switch' : 'mdi-toggle-switch-off'"
                variant="text"
                size="small"
                :color="rule.is_active ? 'success' : 'grey'"
                @click="toggleActive(rule)"
              />
              <v-btn
                icon="mdi-delete"
                variant="text"
                size="small"
                color="error"
                @click="confirmDelete(rule)"
              />
            </div>
          </div>
        </v-card-text>
      </v-card>
      
      <!-- Empty state -->
      <div v-if="!filteredRules.length" class="text-center py-12">
        <v-icon size="64" color="grey">mdi-shield-check</v-icon>
        <h3 class="text-lg font-medium mt-4">No rules configured</h3>
        <p class="text-gray-500 mt-1">
          Add scheduling rules to enforce constraints
        </p>
        <v-btn
          color="primary"
          class="mt-4"
          @click="openRuleDialog()"
        >
          Create First Rule
        </v-btn>
      </div>
    </div>
    
    <!-- Rule Dialog -->
    <v-dialog v-model="ruleDialog" max-width="600">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start>{{ editingRule ? 'mdi-pencil' : 'mdi-plus' }}</v-icon>
          {{ editingRule ? 'Edit Rule' : 'New Rule' }}
        </v-card-title>
        
        <v-card-text>
          <v-form @submit.prevent="saveRule">
            <v-row>
              <v-col cols="12">
                <v-select
                  v-model="ruleForm.rule_type"
                  :items="ruleTypes"
                  item-title="title"
                  item-value="value"
                  label="Rule Type"
                  @update:model-value="onRuleTypeChange"
                >
                  <template #item="{ item, props }">
                    <v-list-item v-bind="props">
                      <template #prepend>
                        <v-icon :icon="item.raw.icon" />
                      </template>
                      <template #subtitle>
                        {{ item.raw.description }}
                      </template>
                    </v-list-item>
                  </template>
                </v-select>
              </v-col>
              
              <v-col cols="8">
                <v-text-field
                  v-model="ruleForm.name"
                  label="Rule Name"
                  required
                />
              </v-col>
              
              <v-col cols="4">
                <v-select
                  v-model="ruleForm.severity"
                  :items="severityOptions"
                  item-title="title"
                  item-value="value"
                  label="Severity"
                >
                  <template #item="{ item, props }">
                    <v-list-item v-bind="props" :class="`text-${item.raw.color}`" />
                  </template>
                </v-select>
              </v-col>
              
              <v-col cols="12">
                <v-textarea
                  v-model="ruleForm.description"
                  label="Description"
                  rows="2"
                />
              </v-col>
              
              <!-- Dynamic parameters based on rule type -->
              <v-col 
                v-for="param in currentRuleType?.params" 
                :key="param.key" 
                cols="6"
              >
                <v-text-field
                  v-model="ruleForm.parameters[param.key]"
                  :label="param.label"
                  :type="param.type === 'number' ? 'number' : 'text'"
                />
              </v-col>
              
              <v-col cols="12">
                <v-divider class="my-2" />
                <p class="text-sm text-gray-500 mb-2">Scope (optional - leave blank for global)</p>
              </v-col>
              
              <v-col cols="4">
                <v-select
                  v-model="ruleForm.location_id"
                  :items="locations"
                  item-title="name"
                  item-value="id"
                  label="Location"
                  clearable
                />
              </v-col>
              
              <v-col cols="4">
                <v-select
                  v-model="ruleForm.department_id"
                  :items="departments"
                  item-title="name"
                  item-value="id"
                  label="Department"
                  clearable
                />
              </v-col>
              
              <v-col cols="4">
                <v-select
                  v-model="ruleForm.position_id"
                  :items="positions"
                  item-title="title"
                  item-value="id"
                  label="Position"
                  clearable
                />
              </v-col>
              
              <v-col cols="12">
                <v-switch
                  v-model="ruleForm.is_active"
                  label="Active"
                  color="success"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer />
          <v-btn @click="ruleDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveRule">
            {{ editingRule ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <!-- Delete Confirmation -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title class="text-error">
          <v-icon start color="error">mdi-alert</v-icon>
          Delete Rule?
        </v-card-title>
        
        <v-card-text>
          Are you sure you want to delete <strong>{{ deletingRule?.name }}</strong>?
        </v-card-text>
        
        <v-card-actions>
          <v-spacer />
          <v-btn @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" @click="deleteRule">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
