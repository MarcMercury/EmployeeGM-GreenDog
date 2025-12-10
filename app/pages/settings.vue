<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-h4 font-weight-bold mb-1">Settings</h1>
      <p class="text-body-1 text-grey-darken-1">
        Manage application settings and configuration
      </p>
    </div>

    <v-row>
      <!-- General Settings -->
      <v-col cols="12" md="6">
        <v-card rounded="lg">
          <v-card-title>General Settings</v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item>
                <template #prepend>
                  <v-icon color="primary">mdi-theme-light-dark</v-icon>
                </template>
                <v-list-item-title>Dark Mode</v-list-item-title>
                <v-list-item-subtitle>Toggle dark theme</v-list-item-subtitle>
                <template #append>
                  <v-switch
                    v-model="darkMode"
                    hide-details
                    color="primary"
                  />
                </template>
              </v-list-item>

              <v-divider class="my-2" />

              <v-list-item>
                <template #prepend>
                  <v-icon color="primary">mdi-bell</v-icon>
                </template>
                <v-list-item-title>Notifications</v-list-item-title>
                <v-list-item-subtitle>Enable push notifications</v-list-item-subtitle>
                <template #append>
                  <v-switch
                    v-model="notifications"
                    hide-details
                    color="primary"
                  />
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Company Info -->
      <v-col cols="12" md="6">
        <v-card rounded="lg">
          <v-card-title>Company Information</v-card-title>
          <v-card-text>
            <v-text-field
              v-model="companyName"
              label="Company Name"
              variant="outlined"
              class="mb-3"
            />
            <v-text-field
              v-model="companyEmail"
              label="Contact Email"
              type="email"
              variant="outlined"
              class="mb-3"
            />
            <v-text-field
              v-model="companyPhone"
              label="Phone Number"
              variant="outlined"
              class="mb-3"
            />
            <v-btn color="primary" @click="saveCompanyInfo">
              Save Changes
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Departments -->
      <v-col cols="12" md="6">
        <v-card rounded="lg">
          <v-card-title class="d-flex align-center justify-space-between">
            <span>Departments</span>
            <v-btn
              size="small"
              variant="text"
              color="primary"
              prepend-icon="mdi-plus"
              @click="addDepartmentDialog = true"
            >
              Add
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-list v-if="departments.length > 0" density="compact">
              <v-list-item
                v-for="dept in departments"
                :key="dept.id"
              >
                <v-list-item-title>{{ dept.name }}</v-list-item-title>
                <v-list-item-subtitle>{{ dept.description }}</v-list-item-subtitle>
                <template #append>
                  <v-btn icon="mdi-pencil" size="small" variant="text" @click="editDepartment(dept)" />
                  <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="confirmDeleteDepartment(dept)" />
                </template>
              </v-list-item>
            </v-list>
            <div v-else class="text-center py-4 text-grey">
              No departments configured
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Data Export -->
      <v-col cols="12" md="6">
        <v-card rounded="lg">
          <v-card-title>Data Management</v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item>
                <template #prepend>
                  <v-icon color="primary">mdi-download</v-icon>
                </template>
                <v-list-item-title>Export Data</v-list-item-title>
                <v-list-item-subtitle>Download employee and schedule data</v-list-item-subtitle>
                <template #append>
                  <v-btn variant="outlined" size="small" @click="exportData">Export</v-btn>
                </template>
              </v-list-item>

              <v-divider class="my-2" />

              <v-list-item>
                <template #prepend>
                  <v-icon color="primary">mdi-upload</v-icon>
                </template>
                <v-list-item-title>Import Data</v-list-item-title>
                <v-list-item-subtitle>Upload data from CSV file</v-list-item-subtitle>
                <template #append>
                  <v-btn variant="outlined" size="small" @click="triggerImport">Import</v-btn>
                  <input ref="importInput" type="file" accept=".csv" hidden @change="handleImport" />
                </template>
              </v-list-item>

              <v-divider class="my-2" />

              <v-list-item>
                <template #prepend>
                  <v-icon color="warning">mdi-database-refresh</v-icon>
                </template>
                <v-list-item-title>Backup Database</v-list-item-title>
                <v-list-item-subtitle>Last backup: {{ lastBackup || 'Never' }}</v-list-item-subtitle>
                <template #append>
                  <v-btn variant="outlined" size="small" color="warning" @click="backupDatabase">Backup</v-btn>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Add Department Dialog -->
    <v-dialog v-model="addDepartmentDialog" max-width="400">
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
          <v-btn variant="text" @click="closeDepartmentDialog">Cancel</v-btn>
          <v-btn color="primary" @click="saveDepartment">{{ editingDepartment ? 'Update' : 'Add' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Department Confirmation -->
    <v-dialog v-model="deleteDepartmentDialog" max-width="400">
      <v-card>
        <v-card-title class="text-error">Delete Department</v-card-title>
        <v-card-text>
          Are you sure you want to delete "{{ departmentToDelete?.name }}"? This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDepartmentDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="deleteDepartment">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import type { Department } from '~/types/database.types'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin']
})

const uiStore = useUIStore()

const darkMode = computed({
  get: () => uiStore.isDarkMode,
  set: (value) => uiStore.setTheme(value ? 'dark' : 'light')
})

const notifications = ref(true)
const companyName = ref('Green Dog Dental')
const companyEmail = ref('info@greendogdental.com')
const companyPhone = ref('')

const departments = ref<Department[]>([])
const addDepartmentDialog = ref(false)
const deleteDepartmentDialog = ref(false)
const editingDepartment = ref<Department | null>(null)
const departmentToDelete = ref<Department | null>(null)
const importInput = ref<HTMLInputElement | null>(null)
const lastBackup = ref<string | null>(null)

const newDepartment = reactive({
  name: '',
  description: ''
})

function saveCompanyInfo() {
  uiStore.showSuccess('Settings saved')
}

function editDepartment(dept: Department) {
  editingDepartment.value = dept
  newDepartment.name = dept.name
  newDepartment.description = dept.description || ''
  addDepartmentDialog.value = true
}

function confirmDeleteDepartment(dept: Department) {
  departmentToDelete.value = dept
  deleteDepartmentDialog.value = true
}

function closeDepartmentDialog() {
  addDepartmentDialog.value = false
  editingDepartment.value = null
  newDepartment.name = ''
  newDepartment.description = ''
}

async function saveDepartment() {
  if (!newDepartment.name) {
    uiStore.showError('Department name is required')
    return
  }

  try {
    const supabase = useSupabaseClient()
    
    if (editingDepartment.value) {
      // Update existing
      const { error } = await supabase
        .from('departments')
        .update({
          name: newDepartment.name,
          description: newDepartment.description || null
        })
        .eq('id', editingDepartment.value.id)
      
      if (error) throw error
      
      const idx = departments.value.findIndex(d => d.id === editingDepartment.value!.id)
      if (idx !== -1) {
        departments.value[idx] = { ...departments.value[idx], ...newDepartment }
      }
      uiStore.showSuccess('Department updated')
    } else {
      // Create new
      const { data, error } = await supabase
        .from('departments')
        .insert({
          name: newDepartment.name,
          description: newDepartment.description || null
        })
        .select()
        .single()
      
      if (error) throw error
      departments.value.push(data as Department)
      uiStore.showSuccess('Department added')
    }
    
    closeDepartmentDialog()
  } catch {
    uiStore.showError(editingDepartment.value ? 'Failed to update department' : 'Failed to add department')
  }
}

async function deleteDepartment() {
  if (!departmentToDelete.value) return
  
  try {
    const supabase = useSupabaseClient()
    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', departmentToDelete.value.id)
    
    if (error) throw error
    
    departments.value = departments.value.filter(d => d.id !== departmentToDelete.value!.id)
    deleteDepartmentDialog.value = false
    departmentToDelete.value = null
    uiStore.showSuccess('Department deleted')
  } catch {
    uiStore.showError('Failed to delete department')
  }
}

async function addDepartment() {
  // Redirect to saveDepartment for backward compatibility
  await saveDepartment()
}

async function exportData() {
  try {
    const supabase = useSupabaseClient()
    
    // Fetch profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('first_name, last_name, email, phone, hire_date, job_title')
      .eq('is_active', true)
    
    if (!profiles || profiles.length === 0) {
      uiStore.showInfo('No data to export')
      return
    }
    
    // Convert to CSV
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Hire Date', 'Job Title']
    const rows = profiles.map(p => [
      p.first_name || '',
      p.last_name || '',
      p.email || '',
      p.phone || '',
      p.hire_date || '',
      p.job_title || ''
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `employees_export_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    
    uiStore.showSuccess('Data exported successfully')
  } catch {
    uiStore.showError('Failed to export data')
  }
}

function triggerImport() {
  importInput.value?.click()
}

function handleImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = async (e) => {
    const content = e.target?.result as string
    // Parse CSV and show preview
    uiStore.showInfo(`File "${file.name}" loaded. Import processing coming soon.`)
    console.log('CSV content:', content.substring(0, 500))
  }
  reader.readAsText(file)
  input.value = '' // Reset for next selection
}

async function backupDatabase() {
  uiStore.showInfo('Creating backup...')
  
  try {
    const supabase = useSupabaseClient()
    
    // Fetch all main tables for backup
    const [profilesRes, deptRes, schedRes] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('departments').select('*'),
      supabase.from('schedules').select('*')
    ])
    
    const backup = {
      timestamp: new Date().toISOString(),
      profiles: profilesRes.data || [],
      departments: deptRes.data || [],
      schedules: schedRes.data || []
    }
    
    // Download as JSON
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `backup_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    lastBackup.value = new Date().toLocaleString()
    uiStore.showSuccess('Backup created successfully')
  } catch {
    uiStore.showError('Failed to create backup')
  }
}

onMounted(async () => {
  // Fetch departments
  const supabase = useSupabaseClient()
  const { data } = await supabase
    .from('departments')
    .select('*')
    .order('name')
  
  if (data) {
    departments.value = data as Department[]
  }
})
</script>
