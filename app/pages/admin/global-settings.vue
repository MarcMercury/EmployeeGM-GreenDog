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
                  <v-btn variant="outlined" size="small">Upload Logo</v-btn>
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
        <v-card-title>Add Department</v-card-title>
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
          <v-btn color="primary" @click="addDepartment">Add</v-btn>
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

const migration = reactive({
  name: '',
  sql: ''
})

const recentMigrations = [
  { name: '027_employee_documents.sql', date: 'Dec 10, 2024', applied: true },
  { name: '026_public_lead_capture.sql', date: 'Dec 8, 2024', applied: true },
  { name: '025_partner_crm_fields.sql', date: 'Dec 5, 2024', applied: true }
]

// Methods
function saveCompany() {
  snackbar.message = 'Company settings saved'
  snackbar.color = 'success'
  snackbar.show = true
}

async function addDepartment() {
  if (!newDepartment.name) return
  
  departments.value.push({
    id: Date.now().toString(),
    ...newDepartment,
    employee_count: 0
  })
  
  showAddDepartment.value = false
  newDepartment.name = ''
  newDepartment.description = ''
  
  snackbar.message = 'Department added'
  snackbar.color = 'success'
  snackbar.show = true
}

function editDepartment(item: any) {
  // Implementation
}

function deleteDepartment(item: any) {
  departments.value = departments.value.filter(d => d.id !== item.id)
  snackbar.message = 'Department deleted'
  snackbar.color = 'info'
  snackbar.show = true
}

function editPosition(item: any) {}
function deletePosition(item: any) {}
function editLocation(item: any) {}
function deleteLocation(item: any) {}

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
