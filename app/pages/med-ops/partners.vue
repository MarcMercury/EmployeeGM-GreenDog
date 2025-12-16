<template>
  <div class="med-ops-partners-page">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Med Ops Partners</h1>
        <p class="text-body-1 text-grey-darken-1">
          Directory of medical equipment manufacturers and suppliers
        </p>
      </div>
      <div class="d-flex gap-2">
        <v-btn-toggle v-model="showInactive" density="compact" variant="outlined">
          <v-btn :value="false">Active Only</v-btn>
          <v-btn :value="true">Show All</v-btn>
        </v-btn-toggle>
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          @click="openAddDialog"
        >
          Add Partner
        </v-btn>
      </div>
    </div>

    <!-- Search and Filters -->
    <v-card rounded="lg" class="mb-6">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              label="Search partners..."
              variant="outlined"
              density="compact"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="categoryFilter"
              :items="categories"
              label="Category"
              variant="outlined"
              density="compact"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-btn-toggle v-model="viewMode" mandatory density="compact">
              <v-btn value="grid" icon="mdi-view-grid" />
              <v-btn value="list" icon="mdi-view-list" />
            </v-btn-toggle>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Loading State -->
    <div v-if="loading" class="d-flex justify-center py-12">
      <v-progress-circular indeterminate color="primary" size="48" />
    </div>

    <!-- Empty State -->
    <v-card v-else-if="filteredPartners.length === 0" rounded="lg" class="pa-8 text-center">
      <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-factory</v-icon>
      <h3 class="text-h6 mb-2">No Partners Found</h3>
      <p class="text-body-2 text-grey mb-4">
        {{ partners.length === 0 ? 'Get started by adding your first partner.' : 'No partners match your current filters.' }}
      </p>
      <v-btn v-if="partners.length === 0" color="primary" prepend-icon="mdi-plus" @click="openAddDialog">
        Add Partner
      </v-btn>
    </v-card>

    <!-- Grid View -->
    <v-row v-else-if="viewMode === 'grid'">
      <v-col v-for="partner in filteredPartners" :key="partner.id" cols="12" sm="6" md="4" lg="3">
        <v-card rounded="lg" class="h-100 partner-card" :class="{ 'inactive-card': partner.status !== 'active' }" @click="openPartner(partner)">
          <div class="pa-4 text-center">
            <v-avatar size="64" :color="partner.color || 'primary'" class="mb-3">
              <v-icon size="32" color="white">{{ partner.icon || 'mdi-factory' }}</v-icon>
            </v-avatar>
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ partner.name }}</h3>
            <div class="d-flex justify-center gap-1 mb-2">
              <v-chip size="x-small" variant="tonal" color="primary">
                {{ partner.category || 'Other' }}
              </v-chip>
              <v-chip v-if="partner.status !== 'active'" size="x-small" variant="flat" color="warning">
                {{ partner.status }}
              </v-chip>
            </div>
            <p class="text-body-2 text-grey text-truncate">{{ partner.description }}</p>
          </div>
          <v-divider />
          <v-card-actions class="justify-center">
            <v-btn variant="text" size="small" prepend-icon="mdi-phone" @click.stop="callPartner(partner)">
              Contact
            </v-btn>
            <v-btn variant="text" size="small" prepend-icon="mdi-pencil" @click.stop="openEditDialog(partner)">
              Edit
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- List View -->
    <v-card v-else rounded="lg">
      <v-data-table
        :headers="tableHeaders"
        :items="filteredPartners"
        :search="search"
        hover
        @click:row="(_: any, { item }: { item: any }) => openPartner(item)"
      >
        <template #item.name="{ item }">
          <div class="d-flex align-center gap-3">
            <v-avatar :color="item.color || 'primary'" size="36">
              <v-icon size="18" color="white">{{ item.icon || 'mdi-factory' }}</v-icon>
            </v-avatar>
            <div>
              <div class="font-weight-medium">{{ item.name }}</div>
              <div class="text-caption text-grey">{{ item.category || 'Other' }}</div>
            </div>
          </div>
        </template>
        <template #item.status="{ item }">
          <v-chip 
            :color="item.status === 'active' ? 'success' : item.status === 'inactive' ? 'grey' : 'warning'" 
            size="small" 
            variant="flat"
          >
            {{ item.status }}
          </v-chip>
        </template>
        <template #item.contact="{ item }">
          <div class="text-body-2">{{ item.contact_name }}</div>
          <div class="text-caption text-grey">{{ item.phone }}</div>
        </template>
        <template #item.actions="{ item }">
          <v-btn icon="mdi-pencil" size="small" variant="text" @click.stop="openEditDialog(item)" />
          <v-btn icon="mdi-phone" size="small" variant="text" @click.stop="callPartner(item)" />
          <v-btn icon="mdi-email" size="small" variant="text" @click.stop="emailPartner(item)" />
          <v-btn icon="mdi-web" size="small" variant="text" @click.stop="visitWebsite(item)" />
        </template>
      </v-data-table>
    </v-card>

    <!-- Partner Detail Dialog -->
    <v-dialog v-model="partnerDialog" max-width="600">
      <v-card v-if="selectedPartner">
        <v-card-title class="d-flex align-center justify-space-between">
          <div class="d-flex align-center gap-3">
            <v-avatar :color="selectedPartner.color || 'primary'" size="48">
              <v-icon size="24" color="white">{{ selectedPartner.icon || 'mdi-factory' }}</v-icon>
            </v-avatar>
            <div>
              <div class="text-h6">{{ selectedPartner.name }}</div>
              <v-chip size="x-small" variant="tonal">{{ selectedPartner.category }}</v-chip>
            </div>
          </div>
          <v-btn icon="mdi-close" variant="text" @click="partnerDialog = false" />
        </v-card-title>
        
        <v-divider />
        
        <v-card-text>
          <div class="mb-4">{{ selectedPartner.description }}</div>
          
          <v-list density="compact" class="bg-transparent">
            <v-list-item v-if="selectedPartner.contact_name">
              <template #prepend>
                <v-icon>mdi-account</v-icon>
              </template>
              <v-list-item-title>{{ selectedPartner.contact_name }}</v-list-item-title>
              <v-list-item-subtitle>Primary Contact</v-list-item-subtitle>
            </v-list-item>
            
            <v-list-item v-if="selectedPartner.phone">
              <template #prepend>
                <v-icon>mdi-phone</v-icon>
              </template>
              <v-list-item-title>{{ selectedPartner.phone }}</v-list-item-title>
              <v-list-item-subtitle>Phone</v-list-item-subtitle>
            </v-list-item>
            
            <v-list-item v-if="selectedPartner.email">
              <template #prepend>
                <v-icon>mdi-email</v-icon>
              </template>
              <v-list-item-title>{{ selectedPartner.email }}</v-list-item-title>
              <v-list-item-subtitle>Email</v-list-item-subtitle>
            </v-list-item>
            
            <v-list-item v-if="selectedPartner.website">
              <template #prepend>
                <v-icon>mdi-web</v-icon>
              </template>
              <v-list-item-title>{{ selectedPartner.website }}</v-list-item-title>
              <v-list-item-subtitle>Website</v-list-item-subtitle>
            </v-list-item>
            
            <v-list-item v-if="selectedPartner.address">
              <template #prepend>
                <v-icon>mdi-map-marker</v-icon>
              </template>
              <v-list-item-title>{{ selectedPartner.address }}</v-list-item-title>
              <v-list-item-subtitle>Address</v-list-item-subtitle>
            </v-list-item>
          </v-list>

          <v-divider class="my-4" />

          <div class="text-subtitle-2 mb-2">Products & Services</div>
          <v-chip-group>
            <v-chip v-for="product in selectedPartner.products" :key="product" size="small" variant="outlined">
              {{ product }}
            </v-chip>
          </v-chip-group>
        </v-card-text>
        
        <v-card-actions>
          <v-btn variant="text" prepend-icon="mdi-pencil" @click="openEditDialog(selectedPartner)">Edit</v-btn>
          <v-spacer />
          <v-btn color="primary" prepend-icon="mdi-phone" @click="callPartner(selectedPartner)">
            Call
          </v-btn>
          <v-btn color="primary" variant="outlined" prepend-icon="mdi-email" @click="emailPartner(selectedPartner)">
            Email
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add/Edit Partner Dialog -->
    <v-dialog v-model="showPartnerForm" max-width="600" persistent>
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <span>{{ isEditing ? 'Edit Partner' : 'Add New Partner' }}</span>
          <v-btn icon="mdi-close" variant="text" @click="closeFormDialog" />
        </v-card-title>
        <v-divider />
        <v-card-text>
          <v-form ref="formRef">
            <v-row>
              <v-col cols="12" md="8">
                <v-text-field
                  v-model="partnerForm.name"
                  label="Company Name *"
                  variant="outlined"
                  :rules="[v => !!v || 'Required']"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="partnerForm.status"
                  :items="statusOptions"
                  label="Status"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>
            
            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="partnerForm.category"
                  :items="categories"
                  label="Category"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="partnerForm.website"
                  label="Website"
                  variant="outlined"
                  density="compact"
                  placeholder="www.example.com"
                />
              </v-col>
            </v-row>

            <v-textarea
              v-model="partnerForm.description"
              label="Description"
              variant="outlined"
              rows="2"
              density="compact"
              class="mb-2"
            />

            <v-divider class="my-3" />
            <div class="text-subtitle-2 mb-2">Primary Contact</div>

            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="partnerForm.contact_name"
                  label="Contact Name"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="partnerForm.phone"
                  label="Phone"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="partnerForm.email"
                  label="Email"
                  type="email"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="partnerForm.address"
                  label="Address"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>

            <v-divider class="my-3" />
            <div class="text-subtitle-2 mb-2">Display Options</div>

            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="partnerForm.icon"
                  :items="iconOptions"
                  label="Icon"
                  variant="outlined"
                  density="compact"
                >
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props">
                      <template #prepend>
                        <v-icon>{{ item.value }}</v-icon>
                      </template>
                    </v-list-item>
                  </template>
                  <template #selection="{ item }">
                    <v-icon class="mr-2">{{ item.value }}</v-icon>
                    {{ item.title }}
                  </template>
                </v-select>
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="partnerForm.color"
                  :items="colorOptions"
                  label="Color"
                  variant="outlined"
                  density="compact"
                >
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props">
                      <template #prepend>
                        <v-avatar :color="item.value" size="24" />
                      </template>
                    </v-list-item>
                  </template>
                  <template #selection="{ item }">
                    <v-avatar :color="item.value" size="20" class="mr-2" />
                    {{ item.title }}
                  </template>
                </v-select>
              </v-col>
            </v-row>

            <v-combobox
              v-model="partnerForm.products"
              label="Products & Services"
              variant="outlined"
              density="compact"
              chips
              multiple
              closable-chips
              hint="Press Enter to add items"
              persistent-hint
            />
          </v-form>
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-btn 
            v-if="isEditing" 
            color="error" 
            variant="text" 
            prepend-icon="mdi-delete"
            @click="confirmDelete"
          >
            Delete
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="closeFormDialog">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="savePartner">
            {{ isEditing ? 'Save Changes' : 'Add Partner' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteConfirm" max-width="400">
      <v-card>
        <v-card-title class="text-h6">Delete Partner?</v-card-title>
        <v-card-text>
          <p>Are you sure you want to delete <strong>{{ partnerForm.name }}</strong>?</p>
          <p class="text-caption text-grey mt-2">
            This action cannot be undone. Consider disabling the partner instead if you may need this record later.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-btn variant="text" @click="showDeleteConfirm = false">Cancel</v-btn>
          <v-spacer />
          <v-btn 
            color="warning" 
            variant="tonal"
            @click="disablePartner"
          >
            Disable Instead
          </v-btn>
          <v-btn 
            color="error" 
            :loading="deleting"
            @click="deletePartner"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '~/composables/useToast'

definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

useHead({
  title: 'Med Ops Partners'
})

const supabase = useSupabaseClient()
const { showSuccess, showError } = useToast()

// State
const search = ref('')
const categoryFilter = ref<string | null>(null)
const viewMode = ref('grid')
const partnerDialog = ref(false)
const showPartnerForm = ref(false)
const showDeleteConfirm = ref(false)
const showInactive = ref(false)
const selectedPartner = ref<any>(null)
const formRef = ref()
const isEditing = ref(false)
const saving = ref(false)
const deleting = ref(false)
const loading = ref(true)

// Form state
const partnerForm = reactive({
  id: '',
  name: '',
  category: 'Other',
  contact_name: '',
  phone: '',
  email: '',
  website: '',
  description: '',
  address: '',
  status: 'active',
  icon: 'mdi-factory',
  color: 'grey',
  products: [] as string[]
})

const categories = [
  'Imaging Equipment',
  'Surgical Instruments',
  'Laboratory',
  'Pharmaceuticals',
  'Anesthesia',
  'Dental',
  'Monitoring',
  'Consumables',
  'Software',
  'Other'
]

const statusOptions = [
  { title: 'Active', value: 'active' },
  { title: 'Inactive', value: 'inactive' },
  { title: 'Pending', value: 'pending' }
]

const iconOptions = [
  { title: 'Factory', value: 'mdi-factory' },
  { title: 'Flask', value: 'mdi-flask' },
  { title: 'Pill', value: 'mdi-pill' },
  { title: 'Radiology', value: 'mdi-radiology-box' },
  { title: 'Medical Bag', value: 'mdi-medical-bag' },
  { title: 'Gas Cylinder', value: 'mdi-gas-cylinder' },
  { title: 'Tooth', value: 'mdi-tooth' },
  { title: 'Test Tube', value: 'mdi-test-tube' },
  { title: 'Heart Pulse', value: 'mdi-heart-pulse' },
  { title: 'Hospital', value: 'mdi-hospital-building' },
  { title: 'Needle', value: 'mdi-needle' },
  { title: 'Microscope', value: 'mdi-microscope' }
]

const colorOptions = [
  { title: 'Grey', value: 'grey' },
  { title: 'Blue', value: 'blue' },
  { title: 'Green', value: 'green' },
  { title: 'Purple', value: 'purple' },
  { title: 'Teal', value: 'teal' },
  { title: 'Orange', value: 'orange' },
  { title: 'Cyan', value: 'cyan' },
  { title: 'Red', value: 'red' },
  { title: 'Pink', value: 'pink' },
  { title: 'Indigo', value: 'indigo' }
]

const tableHeaders = [
  { title: 'Partner', key: 'name' },
  { title: 'Status', key: 'status' },
  { title: 'Contact', key: 'contact' },
  { title: 'Email', key: 'email' },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const }
]

// Partners from database
const partners = ref<any[]>([])

// Load partners from database
async function loadPartners() {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('referral_partners')
      .select('*')
      .order('name')
    
    if (error) throw error
    partners.value = data || []
  } catch (err: any) {
    showError('Failed to load partners: ' + err.message)
    console.error('Error loading partners:', err)
  } finally {
    loading.value = false
  }
}

// Load on mount
onMounted(() => {
  loadPartners()
})

// Computed
const filteredPartners = computed(() => {
  return partners.value.filter(p => {
    const matchesSearch = !search.value || 
      p.name.toLowerCase().includes(search.value.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(search.value.toLowerCase())
    const matchesCategory = !categoryFilter.value || p.category === categoryFilter.value
    const matchesStatus = showInactive.value || p.status === 'active'
    return matchesSearch && matchesCategory && matchesStatus
  })
})

// Form helpers
function resetForm() {
  Object.assign(partnerForm, {
    id: '',
    name: '',
    category: 'Other',
    contact_name: '',
    phone: '',
    email: '',
    website: '',
    description: '',
    address: '',
    status: 'active',
    icon: 'mdi-factory',
    color: 'grey',
    products: []
  })
}

function openAddDialog() {
  resetForm()
  isEditing.value = false
  showPartnerForm.value = true
}

function openEditDialog(partner: any) {
  Object.assign(partnerForm, {
    id: partner.id,
    name: partner.name || '',
    category: partner.category || 'Other',
    contact_name: partner.contact_name || '',
    phone: partner.phone || '',
    email: partner.email || '',
    website: partner.website || '',
    description: partner.description || '',
    address: partner.address || '',
    status: partner.status || 'active',
    icon: partner.icon || 'mdi-factory',
    color: partner.color || 'grey',
    products: partner.products || []
  })
  isEditing.value = true
  partnerDialog.value = false
  showPartnerForm.value = true
}

function closeFormDialog() {
  showPartnerForm.value = false
  resetForm()
}

// Methods
function openPartner(partner: any) {
  selectedPartner.value = partner
  partnerDialog.value = true
}

function callPartner(partner: any) {
  if (partner?.phone) {
    window.open(`tel:${partner.phone}`, '_self')
  }
}

function emailPartner(partner: any) {
  if (partner?.email) {
    window.open(`mailto:${partner.email}`, '_blank')
  }
}

function visitWebsite(partner: any) {
  if (partner?.website) {
    const url = partner.website.startsWith('http') ? partner.website : `https://${partner.website}`
    window.open(url, '_blank')
  }
}

async function savePartner() {
  const { valid } = await formRef.value?.validate()
  if (!valid) return

  saving.value = true
  try {
    const partnerData = {
      name: partnerForm.name,
      category: partnerForm.category,
      contact_name: partnerForm.contact_name || null,
      phone: partnerForm.phone || null,
      email: partnerForm.email || null,
      website: partnerForm.website || null,
      description: partnerForm.description || null,
      address: partnerForm.address || null,
      status: partnerForm.status,
      icon: partnerForm.icon,
      color: partnerForm.color,
      products: partnerForm.products
    }

    if (isEditing.value) {
      // Update existing partner
      const { error } = await supabase
        .from('referral_partners')
        .update(partnerData)
        .eq('id', partnerForm.id)
      
      if (error) throw error
      showSuccess('Partner updated successfully')
    } else {
      // Create new partner
      const { error } = await supabase
        .from('referral_partners')
        .insert(partnerData)
      
      if (error) throw error
      showSuccess('Partner added successfully')
    }

    closeFormDialog()
    await loadPartners()
  } catch (err: any) {
    showError('Failed to save partner: ' + err.message)
    console.error('Error saving partner:', err)
  } finally {
    saving.value = false
  }
}

function confirmDelete() {
  showDeleteConfirm.value = true
}

async function deletePartner() {
  deleting.value = true
  try {
    const { error } = await supabase
      .from('referral_partners')
      .delete()
      .eq('id', partnerForm.id)
    
    if (error) throw error
    
    showSuccess('Partner deleted successfully')
    showDeleteConfirm.value = false
    closeFormDialog()
    await loadPartners()
  } catch (err: any) {
    showError('Failed to delete partner: ' + err.message)
    console.error('Error deleting partner:', err)
  } finally {
    deleting.value = false
  }
}

async function disablePartner() {
  deleting.value = true
  try {
    const { error } = await supabase
      .from('referral_partners')
      .update({ status: 'inactive' })
      .eq('id', partnerForm.id)
    
    if (error) throw error
    
    showSuccess('Partner disabled successfully')
    showDeleteConfirm.value = false
    closeFormDialog()
    await loadPartners()
  } catch (err: any) {
    showError('Failed to disable partner: ' + err.message)
    console.error('Error disabling partner:', err)
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.med-ops-partners-page {
  max-width: 1400px;
}

.partner-card {
  cursor: pointer;
  transition: all 0.2s;
}

.partner-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.inactive-card {
  opacity: 0.7;
}
</style>
