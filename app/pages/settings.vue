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
                  <v-btn icon="mdi-pencil" size="small" variant="text" />
                  <v-btn icon="mdi-delete" size="small" variant="text" color="error" />
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
                  <v-btn variant="outlined" size="small">Export</v-btn>
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
                  <v-btn variant="outlined" size="small">Import</v-btn>
                </template>
              </v-list-item>

              <v-divider class="my-2" />

              <v-list-item>
                <template #prepend>
                  <v-icon color="warning">mdi-database-refresh</v-icon>
                </template>
                <v-list-item-title>Backup Database</v-list-item-title>
                <v-list-item-subtitle>Last backup: Never</v-list-item-subtitle>
                <template #append>
                  <v-btn variant="outlined" size="small" color="warning">Backup</v-btn>
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
          <v-btn variant="text" @click="addDepartmentDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="addDepartment">Add</v-btn>
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
const newDepartment = reactive({
  name: '',
  description: ''
})

function saveCompanyInfo() {
  uiStore.showSuccess('Settings saved')
}

async function addDepartment() {
  if (!newDepartment.name) {
    uiStore.showError('Department name is required')
    return
  }

  // Would need API endpoint
  uiStore.showInfo('Feature coming soon')
  addDepartmentDialog.value = false
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
