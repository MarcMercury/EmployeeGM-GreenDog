<script setup lang="ts">
/**
 * Service Staffing Requirements Settings
 * 
 * Admin UI to configure what roles/positions each service needs
 * This defines the "skeleton crew" that generates ghost slots in the wizard
 */

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
  description: string | null
  requires_dvm: boolean
  min_staff_count: number
  is_active: boolean
  sort_order: number
}

interface StaffingRequirement {
  id: string
  service_id: string
  role_category: string
  role_label: string
  min_count: number
  max_count: number | null
  is_required: boolean
  priority: number
  sort_order: number
}

// Composables
const supabase = useSupabaseClient()
const toast = useToast()

// State
const services = ref<Service[]>([])
const requirements = ref<StaffingRequirement[]>([])
const selectedServiceId = ref<string | null>(null)
const isLoading = ref(true)
const isSaving = ref(false)

// Dialogs
const serviceDialog = ref(false)
const requirementDialog = ref(false)
const deleteDialog = ref(false)

// Forms
const editingService = ref<Service | null>(null)
const editingRequirement = ref<StaffingRequirement | null>(null)
const deleteTarget = ref<{ type: 'service' | 'requirement'; id: string; name: string } | null>(null)

const serviceForm = ref({
  name: '',
  code: '',
  description: '',
  color: '#6366F1',
  icon: 'mdi-medical-bag',
  requires_dvm: false,
  min_staff_count: 1,
  sort_order: 0
})

const requirementForm = ref({
  role_category: 'Tech',
  role_label: '',
  min_count: 1,
  max_count: null as number | null,
  is_required: true,
  priority: 1,
  sort_order: 0
})

// Options
const roleCategories = ['DVM', 'Lead', 'Tech', 'DA', 'Admin', 'Intern', 'Float', 'Other']
const iconOptions = [
  'mdi-medical-bag', 'mdi-tooth', 'mdi-heart-pulse', 'mdi-stethoscope',
  'mdi-phone-in-talk', 'mdi-headset', 'mdi-van-utility', 'mdi-turtle',
  'mdi-radioactive', 'mdi-package-variant', 'mdi-wrench', 'mdi-account-tie',
  'mdi-desktop-classic', 'mdi-bullhorn', 'mdi-dog', 'mdi-cat', 'mdi-paw'
]
const colorOptions = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6',
  '#EC4899', '#14B8A6', '#22C55E', '#0EA5E9', '#64748B', '#78716C'
]

// Computed
const selectedService = computed(() => 
  services.value.find(s => s.id === selectedServiceId.value)
)

const serviceRequirements = computed(() => 
  requirements.value
    .filter(r => r.service_id === selectedServiceId.value)
    .sort((a, b) => a.priority - b.priority || a.sort_order - b.sort_order)
)

const totalMinStaff = computed(() => 
  serviceRequirements.value.reduce((sum, r) => sum + r.min_count, 0)
)

// Load data
async function loadServices() {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('sort_order, name')
    
    if (error) throw error
    services.value = data || []
    
    // Select first service if none selected
    if (!selectedServiceId.value && services.value.length > 0) {
      selectedServiceId.value = services.value[0].id
    }
  } catch (err) {
    console.error('Failed to load services:', err)
    toast.error('Failed to load services')
  }
}

async function loadRequirements() {
  try {
    const { data, error } = await supabase
      .from('service_staffing_requirements')
      .select('*')
      .order('priority, sort_order')
    
    if (error) throw error
    requirements.value = data || []
  } catch (err) {
    console.error('Failed to load requirements:', err)
  }
}

// Service CRUD
function openAddService() {
  editingService.value = null
  serviceForm.value = {
    name: '',
    code: '',
    description: '',
    color: '#6366F1',
    icon: 'mdi-medical-bag',
    requires_dvm: false,
    min_staff_count: 1,
    sort_order: services.value.length
  }
  serviceDialog.value = true
}

function openEditService(service: Service) {
  editingService.value = service
  serviceForm.value = {
    name: service.name,
    code: service.code,
    description: service.description || '',
    color: service.color,
    icon: service.icon,
    requires_dvm: service.requires_dvm,
    min_staff_count: service.min_staff_count,
    sort_order: service.sort_order
  }
  serviceDialog.value = true
}

async function saveService() {
  if (!serviceForm.value.name.trim()) {
    toast.warning('Service name is required')
    return
  }
  
  isSaving.value = true
  try {
    const payload = {
      name: serviceForm.value.name.trim(),
      code: serviceForm.value.code.trim().toUpperCase() || serviceForm.value.name.trim().toUpperCase().replace(/\s+/g, '_'),
      description: serviceForm.value.description.trim() || null,
      color: serviceForm.value.color,
      icon: serviceForm.value.icon,
      requires_dvm: serviceForm.value.requires_dvm,
      min_staff_count: serviceForm.value.min_staff_count,
      sort_order: serviceForm.value.sort_order
    }
    
    if (editingService.value) {
      const { error } = await supabase
        .from('services')
        .update(payload)
        .eq('id', editingService.value.id)
      
      if (error) throw error
      toast.success('Service updated')
    } else {
      const { error } = await supabase
        .from('services')
        .insert(payload)
      
      if (error) throw error
      toast.success('Service created')
    }
    
    await loadServices()
    serviceDialog.value = false
  } catch (err) {
    console.error('Failed to save service:', err)
    toast.error('Failed to save service')
  } finally {
    isSaving.value = false
  }
}

function confirmDeleteService(service: Service) {
  deleteTarget.value = { type: 'service', id: service.id, name: service.name }
  deleteDialog.value = true
}

// Requirement CRUD
function openAddRequirement() {
  if (!selectedServiceId.value) return
  
  editingRequirement.value = null
  requirementForm.value = {
    role_category: 'Tech',
    role_label: '',
    min_count: 1,
    max_count: null,
    is_required: true,
    priority: serviceRequirements.value.length + 1,
    sort_order: serviceRequirements.value.length
  }
  requirementDialog.value = true
}

function openEditRequirement(req: StaffingRequirement) {
  editingRequirement.value = req
  requirementForm.value = {
    role_category: req.role_category,
    role_label: req.role_label,
    min_count: req.min_count,
    max_count: req.max_count,
    is_required: req.is_required,
    priority: req.priority,
    sort_order: req.sort_order
  }
  requirementDialog.value = true
}

async function saveRequirement() {
  if (!requirementForm.value.role_label.trim()) {
    toast.warning('Role label is required')
    return
  }
  
  isSaving.value = true
  try {
    const payload = {
      service_id: selectedServiceId.value,
      role_category: requirementForm.value.role_category,
      role_label: requirementForm.value.role_label.trim(),
      min_count: requirementForm.value.min_count,
      max_count: requirementForm.value.max_count || null,
      is_required: requirementForm.value.is_required,
      priority: requirementForm.value.priority,
      sort_order: requirementForm.value.sort_order
    }
    
    if (editingRequirement.value) {
      const { error } = await supabase
        .from('service_staffing_requirements')
        .update(payload)
        .eq('id', editingRequirement.value.id)
      
      if (error) throw error
      toast.success('Requirement updated')
    } else {
      const { error } = await supabase
        .from('service_staffing_requirements')
        .insert(payload)
      
      if (error) throw error
      toast.success('Requirement added')
    }
    
    await loadRequirements()
    requirementDialog.value = false
  } catch (err) {
    console.error('Failed to save requirement:', err)
    toast.error('Failed to save requirement')
  } finally {
    isSaving.value = false
  }
}

function confirmDeleteRequirement(req: StaffingRequirement) {
  deleteTarget.value = { type: 'requirement', id: req.id, name: req.role_label }
  deleteDialog.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  
  isSaving.value = true
  try {
    const table = deleteTarget.value.type === 'service' ? 'services' : 'service_staffing_requirements'
    
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', deleteTarget.value.id)
    
    if (error) throw error
    
    toast.success(`${deleteTarget.value.type === 'service' ? 'Service' : 'Requirement'} deleted`)
    
    if (deleteTarget.value.type === 'service') {
      if (selectedServiceId.value === deleteTarget.value.id) {
        selectedServiceId.value = null
      }
      await loadServices()
    } else {
      await loadRequirements()
    }
    
    deleteDialog.value = false
  } catch (err) {
    console.error('Failed to delete:', err)
    toast.error('Failed to delete')
  } finally {
    isSaving.value = false
  }
}

// Toggle service active status
async function toggleServiceActive(service: Service) {
  try {
    const { error } = await supabase
      .from('services')
      .update({ is_active: !service.is_active })
      .eq('id', service.id)
    
    if (error) throw error
    
    service.is_active = !service.is_active
    toast.success(service.is_active ? 'Service activated' : 'Service deactivated')
  } catch (err) {
    console.error('Failed to toggle service:', err)
  }
}

// Get category color
function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    DVM: 'red',
    Lead: 'purple',
    Tech: 'blue',
    DA: 'green',
    Admin: 'orange',
    Intern: 'grey',
    Float: 'teal',
    Other: 'grey'
  }
  return colors[category] || 'grey'
}

// Initialize
onMounted(async () => {
  isLoading.value = true
  await Promise.all([loadServices(), loadRequirements()])
  isLoading.value = false
})
</script>

<template>
  <div class="service-settings pa-4">
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Service Staffing Settings</h1>
        <p class="text-body-2 text-grey-darken-1 mb-0">
          Configure the staffing requirements for each service offered at your clinics
        </p>
      </div>
      <v-btn color="primary" @click="openAddService">
        <v-icon start>mdi-plus</v-icon>
        Add Service
      </v-btn>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="d-flex justify-center align-center" style="min-height: 400px;">
      <v-progress-circular indeterminate color="primary" size="48" />
    </div>

    <v-row v-else>
      <!-- Services List (Left) -->
      <v-col cols="12" md="4">
        <v-card rounded="lg">
          <v-card-title class="text-subtitle-1">
            <v-icon start color="primary">mdi-medical-bag</v-icon>
            Services ({{ services.length }})
          </v-card-title>
          <v-divider />
          <v-list lines="two" class="py-0">
            <v-list-item
              v-for="service in services"
              :key="service.id"
              :active="selectedServiceId === service.id"
              @click="selectedServiceId = service.id"
              class="service-item"
            >
              <template #prepend>
                <v-avatar :color="service.color" size="40">
                  <v-icon color="white">{{ service.icon }}</v-icon>
                </v-avatar>
              </template>
              
              <v-list-item-title class="font-weight-medium">
                {{ service.name }}
                <v-chip v-if="!service.is_active" size="x-small" color="grey" class="ml-2">
                  Inactive
                </v-chip>
              </v-list-item-title>
              
              <v-list-item-subtitle>
                {{ service.code }}
                <span v-if="service.requires_dvm" class="text-error">• Requires DVM</span>
              </v-list-item-subtitle>
              
              <template #append>
                <v-menu>
                  <template #activator="{ props }">
                    <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="props" />
                  </template>
                  <v-list density="compact">
                    <v-list-item @click="openEditService(service)">
                      <template #prepend><v-icon>mdi-pencil</v-icon></template>
                      <v-list-item-title>Edit</v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="toggleServiceActive(service)">
                      <template #prepend>
                        <v-icon>{{ service.is_active ? 'mdi-eye-off' : 'mdi-eye' }}</v-icon>
                      </template>
                      <v-list-item-title>{{ service.is_active ? 'Deactivate' : 'Activate' }}</v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="confirmDeleteService(service)" class="text-error">
                      <template #prepend><v-icon color="error">mdi-delete</v-icon></template>
                      <v-list-item-title>Delete</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>

      <!-- Staffing Requirements (Right) -->
      <v-col cols="12" md="8">
        <v-card v-if="selectedService" rounded="lg">
          <v-card-title class="d-flex align-center justify-space-between">
            <div class="d-flex align-center gap-2">
              <v-avatar :color="selectedService.color" size="36">
                <v-icon color="white" size="20">{{ selectedService.icon }}</v-icon>
              </v-avatar>
              <div>
                <span class="text-subtitle-1 font-weight-bold">{{ selectedService.name }}</span>
                <div class="text-caption text-grey">{{ totalMinStaff }} minimum staff required</div>
              </div>
            </div>
            <v-btn color="primary" size="small" @click="openAddRequirement">
              <v-icon start>mdi-plus</v-icon>
              Add Role
            </v-btn>
          </v-card-title>
          
          <v-divider />
          
          <v-card-text v-if="selectedService.description" class="pb-0">
            <p class="text-body-2 text-grey">{{ selectedService.description }}</p>
          </v-card-text>
          
          <v-card-text v-if="serviceRequirements.length === 0" class="text-center py-8">
            <v-icon size="48" color="grey-lighten-1">mdi-account-group-outline</v-icon>
            <p class="text-body-2 text-grey mt-2">No staffing requirements defined</p>
            <v-btn variant="outlined" size="small" class="mt-2" @click="openAddRequirement">
              Add First Role
            </v-btn>
          </v-card-text>
          
          <v-table v-else density="comfortable">
            <thead>
              <tr>
                <th>Role</th>
                <th>Category</th>
                <th class="text-center">Min</th>
                <th class="text-center">Max</th>
                <th class="text-center">Required</th>
                <th class="text-center">Priority</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="req in serviceRequirements" :key="req.id">
                <td class="font-weight-medium">{{ req.role_label }}</td>
                <td>
                  <v-chip size="small" :color="getCategoryColor(req.role_category)" variant="tonal">
                    {{ req.role_category }}
                  </v-chip>
                </td>
                <td class="text-center">{{ req.min_count }}</td>
                <td class="text-center">{{ req.max_count || '—' }}</td>
                <td class="text-center">
                  <v-icon :color="req.is_required ? 'success' : 'grey'" size="small">
                    {{ req.is_required ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                  </v-icon>
                </td>
                <td class="text-center">{{ req.priority }}</td>
                <td class="text-right">
                  <v-btn icon="mdi-pencil" variant="text" size="small" @click="openEditRequirement(req)" />
                  <v-btn icon="mdi-delete" variant="text" size="small" color="error" @click="confirmDeleteRequirement(req)" />
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>

        <v-card v-else rounded="lg" class="text-center pa-8">
          <v-icon size="64" color="grey-lighten-1">mdi-arrow-left</v-icon>
          <p class="text-h6 text-grey mt-4">Select a service to view requirements</p>
        </v-card>
      </v-col>
    </v-row>

    <!-- Service Dialog -->
    <v-dialog v-model="serviceDialog" max-width="500">
      <v-card>
        <v-card-title>
          {{ editingService ? 'Edit Service' : 'Add Service' }}
        </v-card-title>
        <v-card-text>
          <v-row dense>
            <v-col cols="12">
              <v-text-field
                v-model="serviceForm.name"
                label="Service Name"
                variant="outlined"
                density="compact"
                :rules="[(v: any) => !!v || 'Required']"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="serviceForm.code"
                label="Code"
                variant="outlined"
                density="compact"
                hint="Auto-generated if empty"
                persistent-hint
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model.number="serviceForm.min_staff_count"
                label="Min Staff"
                type="number"
                variant="outlined"
                density="compact"
                min="1"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="serviceForm.description"
                label="Description"
                variant="outlined"
                density="compact"
                rows="2"
              />
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="serviceForm.icon"
                :items="iconOptions"
                label="Icon"
                variant="outlined"
                density="compact"
              >
                <template #selection="{ item }">
                  <v-icon>{{ item.value }}</v-icon>
                  <span class="ml-2">{{ item.value.replace('mdi-', '') }}</span>
                </template>
                <template #item="{ item, props }">
                  <v-list-item v-bind="props">
                    <template #prepend>
                      <v-icon>{{ item.value }}</v-icon>
                    </template>
                  </v-list-item>
                </template>
              </v-select>
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="serviceForm.color"
                :items="colorOptions"
                label="Color"
                variant="outlined"
                density="compact"
              >
                <template #selection="{ item }">
                  <v-avatar :color="item.value" size="20" class="mr-2" />
                  {{ item.value }}
                </template>
                <template #item="{ item, props }">
                  <v-list-item v-bind="props">
                    <template #prepend>
                      <v-avatar :color="item.value" size="24" />
                    </template>
                  </v-list-item>
                </template>
              </v-select>
            </v-col>
            <v-col cols="12">
              <v-checkbox
                v-model="serviceForm.requires_dvm"
                label="Requires DVM (Veterinarian)"
                density="compact"
                hide-details
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="serviceDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="isSaving" @click="saveService">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Requirement Dialog -->
    <v-dialog v-model="requirementDialog" max-width="450">
      <v-card>
        <v-card-title>
          {{ editingRequirement ? 'Edit Role' : 'Add Role' }}
        </v-card-title>
        <v-card-text>
          <v-row dense>
            <v-col cols="12">
              <v-text-field
                v-model="requirementForm.role_label"
                label="Role Label"
                variant="outlined"
                density="compact"
                placeholder="e.g., Surgery Lead, AP Tech 1"
                :rules="[(v: any) => !!v || 'Required']"
              />
            </v-col>
            <v-col cols="12">
              <v-select
                v-model="requirementForm.role_category"
                :items="roleCategories"
                label="Category"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model.number="requirementForm.min_count"
                label="Minimum Count"
                type="number"
                variant="outlined"
                density="compact"
                min="0"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model.number="requirementForm.max_count"
                label="Maximum Count"
                type="number"
                variant="outlined"
                density="compact"
                min="0"
                hint="Leave empty for unlimited"
                persistent-hint
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model.number="requirementForm.priority"
                label="Fill Priority"
                type="number"
                variant="outlined"
                density="compact"
                min="1"
                hint="1 = fill first"
                persistent-hint
              />
            </v-col>
            <v-col cols="6" class="d-flex align-center">
              <v-checkbox
                v-model="requirementForm.is_required"
                label="Required Role"
                density="compact"
                hide-details
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="requirementDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="isSaving" @click="saveRequirement">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title class="text-error">
          <v-icon color="error" class="mr-2">mdi-alert</v-icon>
          Confirm Delete
        </v-card-title>
        <v-card-text>
          Are you sure you want to delete <strong>{{ deleteTarget?.name }}</strong>?
          <span v-if="deleteTarget?.type === 'service'">
            This will also delete all staffing requirements for this service.
          </span>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" :loading="isSaving" @click="confirmDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.service-settings {
  max-width: 1400px;
  margin: 0 auto;
}

.service-item {
  border-left: 3px solid transparent;
  transition: border-color 0.2s;
}

.service-item:hover {
  background: rgba(0,0,0,0.02);
}

.service-item.v-list-item--active {
  border-left-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.08);
}
</style>
