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
            <v-skeleton-loader v-if="loadingCompany" type="article" />
            <template v-else>
              <!-- Company Logo Upload -->
              <div class="d-flex align-center gap-4 mb-4">
                <v-avatar size="80" color="grey-lighten-3" rounded="lg">
                  <v-img v-if="companyLogo" :src="companyLogo" cover />
                  <v-icon v-else size="40" color="grey">mdi-domain</v-icon>
                </v-avatar>
                <div>
                  <p class="text-body-1 font-weight-medium mb-1">Company Logo</p>
                  <p class="text-caption text-grey mb-2">PNG or JPG, max 2MB</p>
                  <v-btn 
                    size="small" 
                    variant="outlined" 
                    prepend-icon="mdi-upload" 
                    :loading="uploadingLogo"
                    @click="triggerLogoUpload"
                  >
                    Upload Logo
                  </v-btn>
                  <v-btn 
                    v-if="companyLogo" 
                    size="small" 
                    variant="text" 
                    color="error"
                    icon="mdi-delete"
                    class="ml-2"
                    @click="removeLogo"
                  />
                  <input 
                    ref="logoInput" 
                    type="file" 
                    accept="image/png,image/jpeg,image/jpg" 
                    hidden 
                    @change="handleLogoUpload" 
                  />
                </div>
              </div>
              
              <v-divider class="mb-4" />
              
              <v-text-field
                v-model="companyName"
                label="Display Name"
                variant="outlined"
                class="mb-3"
              />
              <v-text-field
                v-model="companyLegalName"
                label="Legal Name"
                variant="outlined"
                class="mb-3"
              />
              <v-select
                v-model="companyTimezone"
                :items="timezoneOptions"
                label="Timezone"
                variant="outlined"
                class="mb-3"
              />
              <v-btn color="primary" @click="saveCompanyInfo">
                Save Changes
              </v-btn>
            </template>
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

const supabase = useSupabaseClient()
const toast = useToast()

// UI Store for theme
const uiStore = useUIStore()

const darkMode = computed({
  get: () => uiStore.isDarkMode,
  set: (value) => uiStore.setTheme(value ? 'dark' : 'light')
})

const notifications = ref(true)

// Company settings from database
const companySettingsId = ref<string | null>(null)
const companyName = ref('')
const companyLegalName = ref('')
const companyTimezone = ref('America/Los_Angeles')
const companyAddress = ref<any>({})
const companyLogo = ref<string | null>(null)
const uploadingLogo = ref(false)
const logoInput = ref<HTMLInputElement | null>(null)
const loadingCompany = ref(true)

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

// Load company settings from Supabase
async function loadCompanySettings() {
  loadingCompany.value = true
  try {
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1)
      .single()
    
    if (!error && data) {
      companySettingsId.value = data.id
      companyName.value = data.display_name || ''
      companyLegalName.value = data.legal_name || ''
      companyTimezone.value = data.timezone || 'America/Los_Angeles'
      companyAddress.value = data.primary_address || {}
      companyLogo.value = data.logo_url || null
    }
  } catch (err) {
    console.error('Failed to load company settings:', err)
  } finally {
    loadingCompany.value = false
  }
}

async function saveCompanyInfo() {
  try {
    const updateData = {
      display_name: companyName.value,
      legal_name: companyLegalName.value,
      timezone: companyTimezone.value,
      primary_address: companyAddress.value,
      updated_at: new Date().toISOString()
    }

    if (companySettingsId.value) {
      const { error } = await supabase
        .from('company_settings')
        .update(updateData)
        .eq('id', companySettingsId.value)
      
      if (error) throw error
    } else {
      // Create new if doesn't exist
      const { data, error } = await supabase
        .from('company_settings')
        .insert(updateData)
        .select()
        .single()
      
      if (error) throw error
      companySettingsId.value = data.id
    }
    
    toast.success('Company settings saved')
  } catch (err) {
    toast.error('Failed to save settings')
  }
}

function triggerLogoUpload() {
  logoInput.value?.click()
}

async function handleLogoUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // Validate file type
  if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
    toast.error('Please upload a PNG or JPG image')
    return
  }

  // Validate file size (2MB max)
  if (file.size > 2 * 1024 * 1024) {
    toast.error('Image must be less than 2MB')
    return
  }

  uploadingLogo.value = true
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `company-logo-${Date.now()}.${fileExt}`
    const filePath = `logos/${fileName}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('company-assets')
      .upload(filePath, file, { upsert: true })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('company-assets')
      .getPublicUrl(filePath)

    const logoUrl = urlData.publicUrl

    // Update company settings with logo URL
    if (companySettingsId.value) {
      const { error } = await supabase
        .from('company_settings')
        .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
        .eq('id', companySettingsId.value)

      if (error) throw error
    }

    companyLogo.value = logoUrl
    toast.success('Logo uploaded successfully')
  } catch (err) {
    console.error('Logo upload error:', err)
    toast.error('Failed to upload logo')
  } finally {
    uploadingLogo.value = false
    // Reset input
    if (input) input.value = ''
  }
}

async function removeLogo() {
  if (!companyLogo.value || !companySettingsId.value) return

  try {
    // Update company settings to remove logo URL
    const { error } = await supabase
      .from('company_settings')
      .update({ logo_url: null, updated_at: new Date().toISOString() })
      .eq('id', companySettingsId.value)

    if (error) throw error

    companyLogo.value = null
    toast.success('Logo removed')
  } catch (err) {
    console.error('Remove logo error:', err)
    toast.error('Failed to remove logo')
  }
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
    toast.error('Department name is required')
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
      toast.success('Department updated')
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
      toast.success('Department added')
    }
    
    closeDepartmentDialog()
  } catch {
    toast.error(editingDepartment.value ? 'Failed to update department' : 'Failed to add department')
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
    toast.success('Department deleted')
  } catch {
    toast.error('Failed to delete department')
  }
}

async function addDepartment() {
  // Redirect to saveDepartment for backward compatibility
  await saveDepartment()
}

async function exportData() {
  try {
    // Fetch employees with related data
    const { data: employees } = await supabase
      .from('employees')
      .select(`
        first_name,
        last_name,
        email_work,
        phone_mobile,
        hire_date,
        employment_status,
        position:job_positions(title),
        department:departments(name)
      `)
      .eq('employment_status', 'active')
    
    if (!employees || employees.length === 0) {
      toast.info('No data to export')
      return
    }
    
    // Convert to CSV
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Hire Date', 'Department', 'Position']
    const rows = employees.map((e: any) => [
      e.first_name || '',
      e.last_name || '',
      e.email_work || '',
      e.phone_mobile || '',
      e.hire_date || '',
      e.department?.name || '',
      e.position?.title || ''
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
    
    toast.success('Data exported successfully')
  } catch {
    toast.error('Failed to export data')
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
    toast.info(`File "${file.name}" loaded. Import processing coming soon.`)
    console.log('CSV content:', content.substring(0, 500))
  }
  reader.readAsText(file)
  input.value = '' // Reset for next selection
}

async function backupDatabase() {
  toast.info('Creating backup...')
  
  try {
    // Fetch all main tables for backup
    const [employeesRes, deptRes, shiftRes, companyRes] = await Promise.all([
      supabase.from('employees').select('*'),
      supabase.from('departments').select('*'),
      supabase.from('shifts').select('*'),
      supabase.from('company_settings').select('*')
    ])
    
    const backup = {
      timestamp: new Date().toISOString(),
      employees: employeesRes.data || [],
      departments: deptRes.data || [],
      shifts: shiftRes.data || [],
      company_settings: companyRes.data || []
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
    toast.success('Backup created successfully')
  } catch {
    toast.error('Failed to create backup')
  }
}

// Timezone options
const timezoneOptions = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'Pacific/Honolulu',
  'America/Anchorage'
]

onMounted(async () => {
  // Fetch company settings
  await loadCompanySettings()
  
  // Fetch departments
  const { data } = await supabase
    .from('departments')
    .select('*')
    .order('name')
  
  if (data) {
    departments.value = data as Department[]
  }
})
</script>
