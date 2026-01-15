<template>
  <div class="global-settings-page">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Global Settings</h1>
        <p class="text-body-1 text-grey-darken-1">
          Manage application-wide settings and configurations
        </p>
      </div>
      <v-chip color="warning" variant="flat">
        <v-icon start>mdi-shield-crown</v-icon>
        Admin Only
      </v-chip>
    </div>

    <!-- Settings Tabs -->
    <v-tabs v-model="activeTab" color="primary" class="mb-6">
      <v-tab value="company">Company</v-tab>
      <v-tab value="departments">Departments</v-tab>
      <v-tab value="positions">Positions</v-tab>
      <v-tab value="locations">Locations</v-tab>
      <v-tab value="roles">Roles</v-tab>
      <v-tab value="integrations">Integrations</v-tab>
      <v-tab value="database">Database</v-tab>
    </v-tabs>

    <v-window v-model="activeTab">
      <!-- Company Settings -->
      <v-window-item value="company">
        <v-row>
          <v-col cols="12" md="8">
            <v-card rounded="lg">
              <v-card-title>Company Information</v-card-title>
              <v-card-text>
                <v-row>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="company.name"
                      label="Company Name"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="company.website"
                      label="Website"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="company.email"
                      label="Contact Email"
                      type="email"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="company.phone"
                      label="Phone Number"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12">
                    <v-textarea
                      v-model="company.address"
                      label="Address"
                      variant="outlined"
                      rows="2"
                    />
                  </v-col>
                </v-row>
              </v-card-text>
              <v-card-actions class="pa-4">
                <v-spacer />
                <v-btn color="primary" @click="saveCompany">Save Changes</v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
          
          <v-col cols="12" md="4">
            <v-card rounded="lg">
              <v-card-title>Branding</v-card-title>
              <v-card-text class="text-center">
                <v-avatar size="100" color="grey-lighten-2" class="mb-4">
                  <v-icon size="48" v-if="!company.logo">mdi-image</v-icon>
                  <v-img v-else :src="company.logo" />
                </v-avatar>
                <div>
                  <v-btn variant="outlined" size="small" @click="uploadLogo">Upload Logo</v-btn>
                  <input ref="logoInput" type="file" accept="image/*" hidden @change="handleLogoUpload" />
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- Departments -->
      <v-window-item value="departments">
        <v-card rounded="lg">
          <v-card-title class="d-flex align-center justify-space-between">
            <span>Departments</span>
            <v-btn color="primary" prepend-icon="mdi-plus" @click="showAddDepartment = true">
              Add Department
            </v-btn>
          </v-card-title>
          <v-data-table
            :headers="departmentHeaders"
            :items="departments"
            :loading="loadingDepartments"
          >
            <template #item.employee_count="{ item }">
              <v-chip size="small" variant="tonal">{{ item.employee_count }} employees</v-chip>
            </template>
            <template #item.actions="{ item }">
              <v-btn icon="mdi-pencil" size="small" variant="text" @click="editDepartment(item)" />
              <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="deleteDepartment(item)" />
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>

      <!-- Positions -->
      <v-window-item value="positions">
        <v-card rounded="lg">
          <v-card-title class="d-flex align-center justify-space-between">
            <span>Positions</span>
            <v-btn color="primary" prepend-icon="mdi-plus" @click="showAddPosition = true">
              Add Position
            </v-btn>
          </v-card-title>
          <v-data-table
            :headers="positionHeaders"
            :items="positions"
            :loading="loadingPositions"
          >
            <template #item.department="{ item }">
              <v-chip size="small" variant="outlined">{{ item.department_name }}</v-chip>
            </template>
            <template #item.actions="{ item }">
              <v-btn icon="mdi-pencil" size="small" variant="text" @click="editPosition(item)" />
              <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="deletePosition(item)" />
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>

      <!-- Locations -->
      <v-window-item value="locations">
        <v-card rounded="lg">
          <v-card-title class="d-flex align-center justify-space-between">
            <span>Locations</span>
            <v-btn color="primary" prepend-icon="mdi-plus" @click="showAddLocation = true">
              Add Location
            </v-btn>
          </v-card-title>
          <v-data-table
            :headers="locationHeaders"
            :items="locations"
            :loading="loadingLocations"
          >
            <template #item.is_active="{ item }">
              <v-chip :color="item.is_active ? 'success' : 'grey'" size="small" variant="flat">
                {{ item.is_active ? 'Active' : 'Inactive' }}
              </v-chip>
            </template>
            <template #item.actions="{ item }">
              <v-btn icon="mdi-pencil" size="small" variant="text" @click="editLocation(item)" />
              <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="deleteLocation(item)" />
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>

      <!-- Roles -->
      <v-window-item value="roles">
        <v-card rounded="lg">
          <v-card-title>User Roles & Permissions</v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item v-for="role in roles" :key="role.id">
                <template #prepend>
                  <v-avatar :color="role.color" size="40">
                    <v-icon color="white">{{ role.icon }}</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-bold">{{ role.name }}</v-list-item-title>
                <v-list-item-subtitle>{{ role.description }}</v-list-item-subtitle>
                <template #append>
                  <v-chip size="small" variant="outlined">{{ role.user_count }} users</v-chip>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-window-item>

      <!-- Integrations -->
      <v-window-item value="integrations">
        <v-row>
          <v-col v-for="integration in integrations" :key="integration.id" cols="12" md="4">
            <v-card rounded="lg">
              <v-card-text class="text-center">
                <v-avatar size="64" :color="integration.connected ? 'success' : 'grey'" class="mb-3">
                  <v-icon size="32" color="white">{{ integration.icon }}</v-icon>
                </v-avatar>
                <h3 class="text-subtitle-1 font-weight-bold">{{ integration.name }}</h3>
                <p class="text-body-2 text-grey">{{ integration.description }}</p>
                <v-chip 
                  :color="integration.connected ? 'success' : 'grey'" 
                  size="small" 
                  variant="tonal"
                  class="mt-2"
                >
                  {{ integration.connected ? 'Connected' : 'Not Connected' }}
                </v-chip>
              </v-card-text>
              <v-card-actions>
                <v-btn 
                  :color="integration.connected ? 'error' : 'primary'" 
                  variant="text" 
                  block
                  @click="toggleIntegration(integration)"
                >
                  {{ integration.connected ? 'Disconnect' : 'Connect' }}
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- Database -->
      <v-window-item value="database">
        <v-alert type="warning" variant="tonal" class="mb-6">
          <v-icon start>mdi-alert</v-icon>
          Database operations require careful consideration. Changes may affect application functionality.
        </v-alert>
        
        <v-card rounded="lg" class="mb-4">
          <v-card-title>Create Migration</v-card-title>
          <v-card-text>
            <v-text-field
              v-model="migration.name"
              label="Migration Name"
              placeholder="e.g., add_employee_status_field"
              variant="outlined"
              class="mb-3"
            />
            <v-textarea
              v-model="migration.sql"
              label="SQL Statement"
              placeholder="ALTER TABLE employees ADD COLUMN status VARCHAR(50);"
              variant="outlined"
              rows="6"
              font-family="monospace"
            />
          </v-card-text>
          <v-card-actions class="pa-4">
            <v-btn variant="outlined" prepend-icon="mdi-content-copy" @click="copyMigration">
              Copy to Clipboard
            </v-btn>
            <v-spacer />
            <v-btn color="primary" prepend-icon="mdi-download" @click="downloadMigration">
              Download Migration File
            </v-btn>
          </v-card-actions>
        </v-card>

        <v-card rounded="lg">
          <v-card-title>Recent Migrations</v-card-title>
          <v-list>
            <v-list-item v-for="m in recentMigrations" :key="m.name">
              <template #prepend>
                <v-icon :color="m.applied ? 'success' : 'warning'">
                  {{ m.applied ? 'mdi-check-circle' : 'mdi-clock' }}
                </v-icon>
              </template>
              <v-list-item-title>{{ m.name }}</v-list-item-title>
              <v-list-item-subtitle>{{ m.date }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card>
      </v-window-item>
    </v-window>

    <!-- Add Department Dialog -->
    <v-dialog v-model="showAddDepartment" max-width="400">
      <v-card>
        <v-card-title>{{ editingDepartment ? 'Edit Department' : 'Add Department' }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newDepartment.name"
            label="Department Name"
            variant="outlined"
          />
          <v-textarea
            v-model="newDepartment.description"
            label="Description"
            variant="outlined"
            rows="2"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showAddDepartment = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveDepartment">{{ editingDepartment ? 'Save' : 'Add' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add/Edit Position Dialog -->
    <v-dialog v-model="showAddPosition" max-width="400">
      <v-card>
        <v-card-title>{{ editingPosition ? 'Edit Position' : 'Add Position' }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newPosition.title"
            label="Position Title"
            variant="outlined"
            class="mb-3"
          />
          <v-select
            v-model="newPosition.department_id"
            :items="departments"
            item-title="name"
            item-value="id"
            label="Department"
            variant="outlined"
            class="mb-3"
          />
          <v-select
            v-model="newPosition.level"
            :items="['Entry', 'Mid', 'Senior', 'Lead', 'Manager']"
            label="Level"
            variant="outlined"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showAddPosition = false">Cancel</v-btn>
          <v-btn color="primary" @click="savePosition">{{ editingPosition ? 'Save' : 'Add' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add/Edit Location Dialog -->
    <v-dialog v-model="showAddLocation" max-width="400">
      <v-card>
        <v-card-title>{{ editingLocation ? 'Edit Location' : 'Add Location' }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newLocation.name"
            label="Location Name"
            variant="outlined"
            class="mb-3"
          />
          <v-textarea
            v-model="newLocation.address"
            label="Address"
            variant="outlined"
            rows="2"
            class="mb-3"
          />
          <v-switch
            v-model="newLocation.is_active"
            label="Active"
            color="success"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showAddLocation = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveLocation">{{ editingLocation ? 'Save' : 'Add' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin']
})

useHead({
  title: 'Global Settings'
})

const supabase = useSupabaseClient()

// State
const activeTab = ref('company')
const showAddDepartment = ref(false)
const showAddPosition = ref(false)
const showAddLocation = ref(false)
const loadingDepartments = ref(false)
const loadingPositions = ref(false)
const loadingLocations = ref(false)
const editingDepartment = ref<any>(null)
const editingPosition = ref<any>(null)
const editingLocation = ref<any>(null)
const logoInput = ref<HTMLInputElement | null>(null)

const snackbar = reactive({
  show: false,
  message: '',
  color: 'success'
})

// Company data
const company = reactive({
  name: 'Green Dog Veterinary',
  website: 'www.greendog.vet',
  email: 'info@greendog.vet',
  phone: '555-123-4567',
  address: '123 Pet Care Lane, Animal City, AC 12345',
  logo: ''
})

// Table headers
const departmentHeaders = [
  { title: 'Name', key: 'name' },
  { title: 'Description', key: 'description' },
  { title: 'Employees', key: 'employee_count' },
  { title: 'Actions', key: 'actions', sortable: false }
]

const positionHeaders = [
  { title: 'Title', key: 'title' },
  { title: 'Department', key: 'department' },
  { title: 'Level', key: 'level' },
  { title: 'Actions', key: 'actions', sortable: false }
]

const locationHeaders = [
  { title: 'Name', key: 'name' },
  { title: 'Address', key: 'address' },
  { title: 'Status', key: 'is_active' },
  { title: 'Actions', key: 'actions', sortable: false }
]

// Data
const departments = ref([
  { id: '1', name: 'Veterinary Services', description: 'Core medical services', employee_count: 15 },
  { id: '2', name: 'Administration', description: 'Administrative staff', employee_count: 5 },
  { id: '3', name: 'Surgery', description: 'Surgical department', employee_count: 8 },
  { id: '4', name: 'Emergency', description: '24/7 emergency care', employee_count: 12 }
])

const positions = ref([
  { id: '1', title: 'Veterinarian', department_name: 'Veterinary Services', level: 'Senior' },
  { id: '2', title: 'Vet Tech', department_name: 'Veterinary Services', level: 'Mid' },
  { id: '3', title: 'Receptionist', department_name: 'Administration', level: 'Entry' },
  { id: '4', title: 'Surgeon', department_name: 'Surgery', level: 'Senior' }
])

const locations = ref([
  { id: '1', name: 'Main Hospital', address: '123 Pet Care Lane', is_active: true },
  { id: '2', name: 'Downtown Clinic', address: '456 Main Street', is_active: true },
  { id: '3', name: 'Mobile Unit', address: 'Various Locations', is_active: true }
])

const roles = [
  { id: 'admin', name: 'Administrator', description: 'Full system access', icon: 'mdi-shield-crown', color: 'warning', user_count: 3 },
  { id: 'user', name: 'User', description: 'Standard employee access', icon: 'mdi-account', color: 'primary', user_count: 45 }
]

const integrations = [
  { id: 'slack', name: 'Slack', description: 'Team communication', icon: 'mdi-slack', connected: false },
  { id: 'calendar', name: 'Google Calendar', description: 'Calendar sync', icon: 'mdi-google', connected: true },
  { id: 'quickbooks', name: 'QuickBooks', description: 'Accounting integration', icon: 'mdi-currency-usd', connected: false }
]

const newDepartment = reactive({
  name: '',
  description: ''
})

const newPosition = reactive({
  title: '',
  department_id: '',
  level: 'Mid'
})

const newLocation = reactive({
  name: '',
  address: '',
  is_active: true
})

const migration = reactive({
  name: '',
  sql: ''
})

const recentMigrations = [
  { name: '027_employee_documents.sql', date: 'Dec 10, 2024', applied: true },
  { name: '026_public_lead_capture.sql', date: 'Dec 8, 2024', applied: true },
  { name: '025_partner_crm_fields.sql', date: 'Dec 5, 2024', applied: true }
]

// Load data from database
onMounted(async () => {
  await Promise.all([
    loadDepartments(),
    loadPositions(),
    loadLocations(),
    loadCompanySettings()
  ])
})

async function loadCompanySettings() {
  const { data } = await supabase
    .from('company_settings')
    .select('*')
    .eq('id', 'default')
    .maybeSingle()
  
  if (data) {
    company.name = data.company_name || company.name
    company.website = data.website || company.website
    company.email = data.contact_email || company.email
    company.phone = data.phone || company.phone
    company.address = data.address || company.address
    company.logo = data.logo_url || ''
  }
}

async function loadDepartments() {
  loadingDepartments.value = true
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('id, name, description')
      .order('name')
    
    if (error) throw error
    
    departments.value = (data || []).map(d => ({
      ...d,
      employee_count: 0 // Could be calculated with a join
    }))
  } catch (err) {
    console.error('Error loading departments:', err)
  } finally {
    loadingDepartments.value = false
  }
}

async function loadPositions() {
  loadingPositions.value = true
  try {
    const { data, error } = await supabase
      .from('job_positions')
      .select('id, title, level, department_id, departments(name)')
      .order('title')
    
    if (error) throw error
    
    positions.value = (data || []).map((p: any) => ({
      id: p.id,
      title: p.title,
      department_name: p.departments?.name || '',
      level: p.level || 'Mid'
    }))
  } catch (err) {
    console.error('Error loading positions:', err)
  } finally {
    loadingPositions.value = false
  }
}

async function loadLocations() {
  loadingLocations.value = true
  try {
    const { data, error } = await supabase
      .from('locations')
      .select('id, name, address, is_active')
      .order('name')
    
    if (error) throw error
    
    locations.value = data || []
  } catch (err) {
    console.error('Error loading locations:', err)
  } finally {
    loadingLocations.value = false
  }
}

// Methods
async function saveCompany() {
  try {
    const { error } = await supabase
      .from('company_settings')
      .upsert({
        id: 'default',
        company_name: company.name,
        website: company.website,
        contact_email: company.email,
        phone: company.phone,
        address: company.address,
        logo_url: company.logo
      })
    
    if (error) throw error
    snackbar.message = 'Company settings saved'
    snackbar.color = 'success'
    snackbar.show = true
  } catch (err: any) {
    console.error('Error saving company:', err)
    snackbar.message = 'Failed to save company settings'
    snackbar.color = 'error'
    snackbar.show = true
  }
}

function uploadLogo() {
  logoInput.value?.click()
}

async function handleLogoUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  
  try {
    const fileName = `company-logo-${Date.now()}.${file.name.split('.').pop()}`
    const { error: uploadError } = await supabase.storage
      .from('company-assets')
      .upload(fileName, file, { upsert: true })
    
    if (uploadError) throw uploadError
    
    const { data: urlData } = supabase.storage
      .from('company-assets')
      .getPublicUrl(fileName)
    
    company.logo = urlData.publicUrl
    snackbar.message = 'Logo uploaded successfully'
    snackbar.color = 'success'
    snackbar.show = true
  } catch (err: any) {
    console.error('Error uploading logo:', err)
    snackbar.message = 'Failed to upload logo'
    snackbar.color = 'error'
    snackbar.show = true
  }
}

function toggleIntegration(integration: any) {
  if (integration.id === 'slack') {
    navigateTo('/admin/slack')
    return
  }
  
  integration.connected = !integration.connected
  snackbar.message = integration.connected 
    ? `${integration.name} connected` 
    : `${integration.name} disconnected`
  snackbar.color = 'success'
  snackbar.show = true
}

async function saveDepartment() {
  if (!newDepartment.name) return
  
  try {
    if (editingDepartment.value) {
      const { error } = await supabase
        .from('departments')
        .update({ name: newDepartment.name, description: newDepartment.description })
        .eq('id', editingDepartment.value.id)
      
      if (error) throw error
      
      const idx = departments.value.findIndex(d => d.id === editingDepartment.value.id)
      if (idx !== -1) {
        departments.value[idx].name = newDepartment.name
        departments.value[idx].description = newDepartment.description
      }
      snackbar.message = 'Department updated'
    } else {
      const { data, error } = await supabase
        .from('departments')
        .insert({ name: newDepartment.name, description: newDepartment.description })
        .select()
        .single()
      
      if (error) throw error
      
      departments.value.push({
        id: data.id,
        name: data.name,
        description: data.description,
        employee_count: 0
      })
      snackbar.message = 'Department added'
    }
    
    showAddDepartment.value = false
    editingDepartment.value = null
    newDepartment.name = ''
    newDepartment.description = ''
    snackbar.color = 'success'
    snackbar.show = true
  } catch (err: any) {
    console.error('Error saving department:', err)
    snackbar.message = 'Failed to save department'
    snackbar.color = 'error'
    snackbar.show = true
  }
}

function editDepartment(item: any) {
  editingDepartment.value = item
  newDepartment.name = item.name
  newDepartment.description = item.description || ''
  showAddDepartment.value = true
}

async function deleteDepartment(item: any) {
  try {
    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', item.id)
    
    if (error) throw error
    
    departments.value = departments.value.filter(d => d.id !== item.id)
    snackbar.message = 'Department deleted'
    snackbar.color = 'info'
    snackbar.show = true
  } catch (err: any) {
    console.error('Error deleting department:', err)
    snackbar.message = 'Failed to delete department'
    snackbar.color = 'error'
    snackbar.show = true
  }
}

async function savePosition() {
  if (!newPosition.title) return
  
  try {
    const dept = departments.value.find(d => d.id === newPosition.department_id)
    
    if (editingPosition.value) {
      const { error } = await supabase
        .from('job_positions')
        .update({ 
          title: newPosition.title, 
          department_id: newPosition.department_id,
          level: newPosition.level 
        })
        .eq('id', editingPosition.value.id)
      
      if (error) throw error
      
      const idx = positions.value.findIndex(p => p.id === editingPosition.value.id)
      if (idx !== -1) {
        positions.value[idx].title = newPosition.title
        positions.value[idx].department_name = dept?.name || ''
        positions.value[idx].level = newPosition.level
      }
      snackbar.message = 'Position updated'
    } else {
      const { data, error } = await supabase
        .from('job_positions')
        .insert({ 
          title: newPosition.title, 
          department_id: newPosition.department_id || null,
          level: newPosition.level,
          is_active: true
        })
        .select()
        .single()
      
      if (error) throw error
      
      positions.value.push({
        id: data.id,
        title: data.title,
        department_name: dept?.name || '',
        level: data.level
      })
      snackbar.message = 'Position added'
    }
    
    showAddPosition.value = false
    editingPosition.value = null
    newPosition.title = ''
    newPosition.department_id = ''
    newPosition.level = 'Mid'
    snackbar.color = 'success'
    snackbar.show = true
  } catch (err: any) {
    console.error('Error saving position:', err)
    snackbar.message = 'Failed to save position'
    snackbar.color = 'error'
    snackbar.show = true
  }
}

function editPosition(item: any) {
  editingPosition.value = item
  newPosition.title = item.title
  newPosition.department_id = departments.value.find(d => d.name === item.department_name)?.id || ''
  newPosition.level = item.level
  showAddPosition.value = true
}

async function deletePosition(item: any) {
  try {
    const { error } = await supabase
      .from('job_positions')
      .delete()
      .eq('id', item.id)
    
    if (error) throw error
    
    positions.value = positions.value.filter(p => p.id !== item.id)
    snackbar.message = 'Position deleted'
    snackbar.color = 'info'
    snackbar.show = true
  } catch (err: any) {
    console.error('Error deleting position:', err)
    snackbar.message = 'Failed to delete position'
    snackbar.color = 'error'
    snackbar.show = true
  }
}

async function saveLocation() {
  if (!newLocation.name) return
  
  try {
    if (editingLocation.value) {
      const { error } = await supabase
        .from('locations')
        .update({ 
          name: newLocation.name, 
          address: newLocation.address,
          is_active: newLocation.is_active 
        })
        .eq('id', editingLocation.value.id)
      
      if (error) throw error
      
      const idx = locations.value.findIndex(l => l.id === editingLocation.value.id)
      if (idx !== -1) {
        locations.value[idx].name = newLocation.name
        locations.value[idx].address = newLocation.address
        locations.value[idx].is_active = newLocation.is_active
      }
      snackbar.message = 'Location updated'
    } else {
      const { data, error } = await supabase
        .from('locations')
        .insert({ 
          name: newLocation.name, 
          address: newLocation.address,
          is_active: newLocation.is_active
        })
        .select()
        .single()
      
      if (error) throw error
      
      locations.value.push({
        id: data.id,
        name: data.name,
        address: data.address,
        is_active: data.is_active
      })
      snackbar.message = 'Location added'
    }
    
    showAddLocation.value = false
    editingLocation.value = null
    newLocation.name = ''
    newLocation.address = ''
    newLocation.is_active = true
    snackbar.color = 'success'
    snackbar.show = true
  } catch (err: any) {
    console.error('Error saving location:', err)
    snackbar.message = 'Failed to save location'
    snackbar.color = 'error'
    snackbar.show = true
  }
}

function editLocation(item: any) {
  editingLocation.value = item
  newLocation.name = item.name
  newLocation.address = item.address || ''
  newLocation.is_active = item.is_active
  showAddLocation.value = true
}

async function deleteLocation(item: any) {
  try {
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', item.id)
    
    if (error) throw error
    
    locations.value = locations.value.filter(l => l.id !== item.id)
    snackbar.message = 'Location deleted'
    snackbar.color = 'info'
    snackbar.show = true
  } catch (err: any) {
    console.error('Error deleting location:', err)
    snackbar.message = 'Failed to delete location'
    snackbar.color = 'error'
    snackbar.show = true
  }
}

function copyMigration() {
  navigator.clipboard.writeText(migration.sql)
  snackbar.message = 'Migration SQL copied to clipboard'
  snackbar.color = 'success'
  snackbar.show = true
}

function downloadMigration() {
  if (!migration.name || !migration.sql) {
    snackbar.message = 'Please enter migration name and SQL'
    snackbar.color = 'warning'
    snackbar.show = true
    return
  }
  
  const blob = new Blob([migration.sql], { type: 'text/plain' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${migration.name}.sql`
  link.click()
  
  snackbar.message = 'Migration file downloaded'
  snackbar.color = 'success'
  snackbar.show = true
}
</script>

<style scoped>
.global-settings-page {
  max-width: 1200px;
}
</style>
