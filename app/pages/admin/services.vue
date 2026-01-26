<script setup lang="ts">
/**
 * Services Management Page
 * Admin CRUD for services and staffing requirements
 * Part of Scheduling System Phase 2
 */
import { format } from 'date-fns'

definePageMeta({
  middleware: ['auth', 'admin-only'],
  layout: 'default'
})

// Types
interface StaffingRequirement {
  id: string
  service_id: string
  role_category: string
  role_label: string
  min_count: number
  max_count: number | null
  is_required: boolean
  priority: number
  position_id: string | null
  sort_order: number
}

interface Service {
  id: string
  name: string
  code: string | null
  description: string | null
  department_id: string | null
  default_duration_minutes: number
  color: string
  icon: string
  requires_dvm: boolean
  min_staff_count: number
  max_staff_count: number | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
  staffing_requirements?: StaffingRequirement[]
}

// Composables
const supabase = useSupabaseClient()
const toast = useToast()
const { departments, positions } = useAppData()

// State
const services = ref<Service[]>([])
const isLoading = ref(true)
const showInactive = ref(false)

// Dialog state
const serviceDialog = ref(false)
const deleteDialog = ref(false)
const requirementDialog = ref(false)
const editingService = ref<Service | null>(null)
const editingRequirement = ref<StaffingRequirement | null>(null)
const deletingService = ref<Service | null>(null)

// Form state
const serviceForm = ref({
  name: '',
  code: '',
  description: '',
  department_id: null as string | null,
  default_duration_minutes: 480,
  color: '#6366f1',
  icon: 'mdi-medical-bag',
  requires_dvm: false,
  min_staff_count: 1,
  max_staff_count: null as number | null,
  is_active: true,
  sort_order: 0
})

const requirementForm = ref({
  service_id: '',
  role_category: '',
  role_label: '',
  min_count: 1,
  max_count: null as number | null,
  is_required: true,
  priority: 1,
  position_id: null as string | null,
  sort_order: 0
})

// Role categories
const roleCategories = ['DVM', 'Lead', 'Tech', 'DA', 'Admin', 'Intern', 'Other']

// Icon options
const iconOptions = [
  { title: 'Medical Bag', value: 'mdi-medical-bag' },
  { title: 'Hospital', value: 'mdi-hospital' },
  { title: 'Needle', value: 'mdi-needle' },
  { title: 'Stethoscope', value: 'mdi-stethoscope' },
  { title: 'Heart Pulse', value: 'mdi-heart-pulse' },
  { title: 'Tooth', value: 'mdi-tooth' },
  { title: 'Turtle (Exotics)', value: 'mdi-turtle' },
  { title: 'Van (Mobile)', value: 'mdi-van-utility' },
  { title: 'Desk (Admin)', value: 'mdi-desk' },
  { title: 'Account Switch', value: 'mdi-account-switch' },
  { title: 'Paw', value: 'mdi-paw' },
  { title: 'Dog', value: 'mdi-dog' },
  { title: 'Cat', value: 'mdi-cat' },
  { title: 'Pill', value: 'mdi-pill' },
  { title: 'Clipboard', value: 'mdi-clipboard-pulse' }
]

// Computed
const filteredServices = computed(() => {
  if (showInactive.value) return services.value
  return services.value.filter(s => s.is_active)
})

// Load services
async function loadServices() {
  isLoading.value = true
  try {
    const { data, error } = await supabase
      .from('services')
      .select(`
        *,
        departments:department_id (id, name)
      `)
      .order('sort_order')
      .order('name')
    
    if (error) throw error
    
    // Load staffing requirements for each service
    const servicesWithReqs = await Promise.all(
      (data || []).map(async (service: any) => {
        const { data: reqs } = await supabase
          .from('service_staffing_requirements')
          .select('*')
          .eq('service_id', service.id)
          .order('sort_order')
          .order('priority')
        
        return {
          ...service,
          staffing_requirements: reqs || []
        }
      })
    )
    
    services.value = servicesWithReqs
  } catch (error: any) {
    toast.error('Failed to load services', error.message)
  } finally {
    isLoading.value = false
  }
}

// Open service dialog
function openServiceDialog(service?: Service) {
  if (service) {
    editingService.value = service
    serviceForm.value = {
      name: service.name,
      code: service.code || '',
      description: service.description || '',
      department_id: service.department_id,
      default_duration_minutes: service.default_duration_minutes,
      color: service.color,
      icon: service.icon,
      requires_dvm: service.requires_dvm,
      min_staff_count: service.min_staff_count,
      max_staff_count: service.max_staff_count,
      is_active: service.is_active,
      sort_order: service.sort_order
    }
  } else {
    editingService.value = null
    serviceForm.value = {
      name: '',
      code: '',
      description: '',
      department_id: null,
      default_duration_minutes: 480,
      color: '#6366f1',
      icon: 'mdi-medical-bag',
      requires_dvm: false,
      min_staff_count: 1,
      max_staff_count: null,
      is_active: true,
      sort_order: services.value.length
    }
  }
  serviceDialog.value = true
}

// Save service
async function saveService() {
  try {
    const payload = {
      name: serviceForm.value.name,
      code: serviceForm.value.code || null,
      description: serviceForm.value.description || null,
      department_id: serviceForm.value.department_id,
      default_duration_minutes: serviceForm.value.default_duration_minutes,
      color: serviceForm.value.color,
      icon: serviceForm.value.icon,
      requires_dvm: serviceForm.value.requires_dvm,
      min_staff_count: serviceForm.value.min_staff_count,
      max_staff_count: serviceForm.value.max_staff_count,
      is_active: serviceForm.value.is_active,
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
    
    serviceDialog.value = false
    await loadServices()
  } catch (error: any) {
    toast.error('Failed to save service', error.message)
  }
}

// Delete service
function confirmDelete(service: Service) {
  deletingService.value = service
  deleteDialog.value = true
}

async function deleteService() {
  if (!deletingService.value) return
  
  try {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', deletingService.value.id)
    
    if (error) throw error
    
    toast.success('Service deleted')
    deleteDialog.value = false
    deletingService.value = null
    await loadServices()
  } catch (error: any) {
    toast.error('Failed to delete service', error.message)
  }
}

// Toggle service active status
async function toggleActive(service: Service) {
  try {
    const { error } = await supabase
      .from('services')
      .update({ is_active: !service.is_active })
      .eq('id', service.id)
    
    if (error) throw error
    
    toast.success(service.is_active ? 'Service deactivated' : 'Service activated')
    await loadServices()
  } catch (error: any) {
    toast.error('Failed to update service', error.message)
  }
}

// Staffing Requirements
function openRequirementDialog(service: Service, requirement?: StaffingRequirement) {
  if (requirement) {
    editingRequirement.value = requirement
    requirementForm.value = {
      service_id: service.id,
      role_category: requirement.role_category,
      role_label: requirement.role_label,
      min_count: requirement.min_count,
      max_count: requirement.max_count,
      is_required: requirement.is_required,
      priority: requirement.priority,
      position_id: requirement.position_id,
      sort_order: requirement.sort_order
    }
  } else {
    editingRequirement.value = null
    requirementForm.value = {
      service_id: service.id,
      role_category: '',
      role_label: '',
      min_count: 1,
      max_count: null,
      is_required: true,
      priority: (service.staffing_requirements?.length || 0) + 1,
      position_id: null,
      sort_order: (service.staffing_requirements?.length || 0)
    }
  }
  requirementDialog.value = true
}

async function saveRequirement() {
  try {
    const payload = {
      service_id: requirementForm.value.service_id,
      role_category: requirementForm.value.role_category,
      role_label: requirementForm.value.role_label,
      min_count: requirementForm.value.min_count,
      max_count: requirementForm.value.max_count,
      is_required: requirementForm.value.is_required,
      priority: requirementForm.value.priority,
      position_id: requirementForm.value.position_id,
      sort_order: requirementForm.value.sort_order
    }
    
    if (editingRequirement.value) {
      const { error } = await supabase
        .from('service_staffing_requirements')
        .update(payload)
        .eq('id', editingRequirement.value.id)
      
      if (error) throw error
      toast.success('Staffing requirement updated')
    } else {
      const { error } = await supabase
        .from('service_staffing_requirements')
        .insert(payload)
      
      if (error) throw error
      toast.success('Staffing requirement added')
    }
    
    requirementDialog.value = false
    await loadServices()
  } catch (error: any) {
    toast.error('Failed to save requirement', error.message)
  }
}

async function deleteRequirement(req: StaffingRequirement) {
  try {
    const { error } = await supabase
      .from('service_staffing_requirements')
      .delete()
      .eq('id', req.id)
    
    if (error) throw error
    
    toast.success('Staffing requirement removed')
    await loadServices()
  } catch (error: any) {
    toast.error('Failed to delete requirement', error.message)
  }
}

// Move service order
async function moveService(service: Service, direction: 'up' | 'down') {
  const currentIndex = services.value.findIndex(s => s.id === service.id)
  const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
  
  if (newIndex < 0 || newIndex >= services.value.length) return
  
  const otherService = services.value[newIndex]
  
  try {
    await Promise.all([
      supabase.from('services').update({ sort_order: newIndex }).eq('id', service.id),
      supabase.from('services').update({ sort_order: currentIndex }).eq('id', otherService.id)
    ])
    
    await loadServices()
  } catch (error: any) {
    toast.error('Failed to reorder', error.message)
  }
}

// Initialize
onMounted(loadServices)
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Services Management
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          Configure services and staffing requirements for schedule builder
        </p>
      </div>
      
      <div class="flex items-center gap-4">
        <v-switch
          v-model="showInactive"
          label="Show inactive"
          hide-details
          density="compact"
          color="primary"
        />
        
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          @click="openServiceDialog()"
        >
          Add Service
        </v-btn>
      </div>
    </div>
    
    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <v-progress-circular indeterminate color="primary" size="48" />
    </div>
    
    <!-- Services Grid -->
    <div v-else class="grid gap-4">
      <v-card
        v-for="service in filteredServices"
        :key="service.id"
        :class="{ 'opacity-50': !service.is_active }"
        class="relative"
      >
        <!-- Color bar -->
        <div 
          class="absolute left-0 top-0 bottom-0 w-2 rounded-l"
          :style="{ backgroundColor: service.color }"
        />
        
        <v-card-text class="pl-6">
          <div class="flex items-start gap-4">
            <!-- Icon -->
            <v-avatar :color="service.color" size="48">
              <v-icon :icon="service.icon" color="white" />
            </v-avatar>
            
            <!-- Info -->
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <h3 class="text-lg font-semibold">{{ service.name }}</h3>
                <v-chip v-if="service.code" size="small" variant="outlined">
                  {{ service.code }}
                </v-chip>
                <v-chip v-if="service.requires_dvm" size="small" color="purple">
                  <v-icon start size="small">mdi-doctor</v-icon>
                  DVM Required
                </v-chip>
                <v-chip v-if="!service.is_active" size="small" color="grey">
                  Inactive
                </v-chip>
              </div>
              
              <p v-if="service.description" class="text-gray-600 dark:text-gray-400 mt-1">
                {{ service.description }}
              </p>
              
              <div class="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span>
                  <v-icon size="small">mdi-account-group</v-icon>
                  Staff: {{ service.min_staff_count }}
                  <template v-if="service.max_staff_count">
                    - {{ service.max_staff_count }}
                  </template>
                </span>
                <span>
                  <v-icon size="small">mdi-clock</v-icon>
                  {{ Math.floor(service.default_duration_minutes / 60) }}h shift
                </span>
              </div>
              
              <!-- Staffing Requirements -->
              <div class="mt-4">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-sm font-medium">Staffing Requirements</span>
                  <v-btn
                    size="x-small"
                    variant="text"
                    icon="mdi-plus"
                    @click="openRequirementDialog(service)"
                  />
                </div>
                
                <div v-if="service.staffing_requirements?.length" class="flex flex-wrap gap-2">
                  <v-chip
                    v-for="req in service.staffing_requirements"
                    :key="req.id"
                    size="small"
                    :color="req.is_required ? 'primary' : 'grey'"
                    :variant="req.is_required ? 'flat' : 'outlined'"
                    closable
                    @click="openRequirementDialog(service, req)"
                    @click:close="deleteRequirement(req)"
                  >
                    {{ req.role_label || req.role_category }}
                    <template v-if="req.min_count > 1 || req.max_count">
                      ({{ req.min_count }}<template v-if="req.max_count">-{{ req.max_count }}</template>)
                    </template>
                  </v-chip>
                </div>
                <p v-else class="text-sm text-gray-400 italic">
                  No staffing requirements defined
                </p>
              </div>
            </div>
            
            <!-- Actions -->
            <div class="flex items-center gap-1">
              <v-btn
                icon="mdi-chevron-up"
                variant="text"
                size="small"
                :disabled="services.indexOf(service) === 0"
                @click="moveService(service, 'up')"
              />
              <v-btn
                icon="mdi-chevron-down"
                variant="text"
                size="small"
                :disabled="services.indexOf(service) === services.length - 1"
                @click="moveService(service, 'down')"
              />
              <v-btn
                icon="mdi-pencil"
                variant="text"
                size="small"
                @click="openServiceDialog(service)"
              />
              <v-btn
                :icon="service.is_active ? 'mdi-eye-off' : 'mdi-eye'"
                variant="text"
                size="small"
                @click="toggleActive(service)"
              />
              <v-btn
                icon="mdi-delete"
                variant="text"
                size="small"
                color="error"
                @click="confirmDelete(service)"
              />
            </div>
          </div>
        </v-card-text>
      </v-card>
      
      <!-- Empty state -->
      <div v-if="!filteredServices.length" class="text-center py-12">
        <v-icon size="64" color="grey">mdi-medical-bag</v-icon>
        <h3 class="text-lg font-medium mt-4">No services found</h3>
        <p class="text-gray-500 mt-1">
          {{ showInactive ? 'No services exist yet.' : 'All services are inactive.' }}
        </p>
        <v-btn
          color="primary"
          class="mt-4"
          @click="openServiceDialog()"
        >
          Create First Service
        </v-btn>
      </div>
    </div>
    
    <!-- Service Dialog -->
    <v-dialog v-model="serviceDialog" max-width="600">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start>{{ editingService ? 'mdi-pencil' : 'mdi-plus' }}</v-icon>
          {{ editingService ? 'Edit Service' : 'New Service' }}
        </v-card-title>
        
        <v-card-text>
          <v-form @submit.prevent="saveService">
            <v-row>
              <v-col cols="8">
                <v-text-field
                  v-model="serviceForm.name"
                  label="Service Name"
                  placeholder="e.g., Surgery, Dental, NAP"
                  required
                />
              </v-col>
              <v-col cols="4">
                <v-text-field
                  v-model="serviceForm.code"
                  label="Code"
                  placeholder="SURG"
                  hint="Short identifier"
                />
              </v-col>
              
              <v-col cols="12">
                <v-textarea
                  v-model="serviceForm.description"
                  label="Description"
                  rows="2"
                />
              </v-col>
              
              <v-col cols="6">
                <v-select
                  v-model="serviceForm.department_id"
                  :items="departments"
                  item-title="name"
                  item-value="id"
                  label="Department"
                  clearable
                />
              </v-col>
              
              <v-col cols="6">
                <v-select
                  v-model="serviceForm.icon"
                  :items="iconOptions"
                  label="Icon"
                >
                  <template #item="{ item, props }">
                    <v-list-item v-bind="props">
                      <template #prepend>
                        <v-icon :icon="item.value" />
                      </template>
                    </v-list-item>
                  </template>
                  <template #selection="{ item }">
                    <v-icon :icon="item.value" class="mr-2" />
                    {{ item.title }}
                  </template>
                </v-select>
              </v-col>
              
              <v-col cols="6">
                <v-text-field
                  v-model="serviceForm.color"
                  label="Color"
                  type="color"
                />
              </v-col>
              
              <v-col cols="6">
                <v-text-field
                  v-model.number="serviceForm.default_duration_minutes"
                  label="Default Duration (minutes)"
                  type="number"
                />
              </v-col>
              
              <v-col cols="4">
                <v-text-field
                  v-model.number="serviceForm.min_staff_count"
                  label="Min Staff"
                  type="number"
                  min="1"
                />
              </v-col>
              
              <v-col cols="4">
                <v-text-field
                  v-model.number="serviceForm.max_staff_count"
                  label="Max Staff"
                  type="number"
                  min="1"
                />
              </v-col>
              
              <v-col cols="4">
                <v-text-field
                  v-model.number="serviceForm.sort_order"
                  label="Sort Order"
                  type="number"
                />
              </v-col>
              
              <v-col cols="6">
                <v-switch
                  v-model="serviceForm.requires_dvm"
                  label="Requires DVM"
                  color="purple"
                />
              </v-col>
              
              <v-col cols="6">
                <v-switch
                  v-model="serviceForm.is_active"
                  label="Active"
                  color="success"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer />
          <v-btn @click="serviceDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveService">
            {{ editingService ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <!-- Staffing Requirement Dialog -->
    <v-dialog v-model="requirementDialog" max-width="500">
      <v-card>
        <v-card-title>
          {{ editingRequirement ? 'Edit Staffing Requirement' : 'Add Staffing Requirement' }}
        </v-card-title>
        
        <v-card-text>
          <v-form @submit.prevent="saveRequirement">
            <v-row>
              <v-col cols="6">
                <v-select
                  v-model="requirementForm.role_category"
                  :items="roleCategories"
                  label="Role Category"
                  required
                />
              </v-col>
              
              <v-col cols="6">
                <v-text-field
                  v-model="requirementForm.role_label"
                  label="Display Label"
                  placeholder="e.g., Lead Surgeon"
                />
              </v-col>
              
              <v-col cols="12">
                <v-select
                  v-model="requirementForm.position_id"
                  :items="positions"
                  item-title="title"
                  item-value="id"
                  label="Job Position (optional)"
                  clearable
                />
              </v-col>
              
              <v-col cols="4">
                <v-text-field
                  v-model.number="requirementForm.min_count"
                  label="Min Count"
                  type="number"
                  min="0"
                />
              </v-col>
              
              <v-col cols="4">
                <v-text-field
                  v-model.number="requirementForm.max_count"
                  label="Max Count"
                  type="number"
                  min="1"
                />
              </v-col>
              
              <v-col cols="4">
                <v-text-field
                  v-model.number="requirementForm.priority"
                  label="Priority"
                  type="number"
                  hint="Fill order (1=first)"
                />
              </v-col>
              
              <v-col cols="6">
                <v-switch
                  v-model="requirementForm.is_required"
                  label="Required"
                  color="primary"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer />
          <v-btn @click="requirementDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveRequirement">
            {{ editingRequirement ? 'Update' : 'Add' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <!-- Delete Confirmation -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title class="text-error">
          <v-icon start color="error">mdi-alert</v-icon>
          Delete Service?
        </v-card-title>
        
        <v-card-text>
          Are you sure you want to delete <strong>{{ deletingService?.name }}</strong>?
          This will also delete all staffing requirements for this service.
        </v-card-text>
        
        <v-card-actions>
          <v-spacer />
          <v-btn @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" @click="deleteService">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
</script>
