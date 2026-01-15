<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Pending User Accounts</h1>
        <p class="text-body-1 text-grey-darken-1">
          Create login credentials for newly hired employees
        </p>
      </div>
      <v-chip color="warning" size="large">
        {{ pendingEmployees.length }} Pending
      </v-chip>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="48" />
      <p class="text-grey mt-4">Loading pending accounts...</p>
    </div>

    <!-- Empty State -->
    <v-card v-else-if="pendingEmployees.length === 0" rounded="lg" class="text-center pa-12">
      <v-icon size="64" color="grey-lighten-1">mdi-account-check</v-icon>
      <h3 class="text-h6 mt-4">All accounts created</h3>
      <p class="text-grey mb-4">
        No employees are waiting for user account creation
      </p>
      <v-btn color="primary" @click="navigateTo('/roster')">
        View Employee Roster
      </v-btn>
    </v-card>

    <!-- Pending Employees Table -->
    <v-card v-else rounded="lg">
      <v-data-table
        :headers="headers"
        :items="pendingEmployees"
        :loading="loading"
        class="elevation-0"
      >
        <!-- Name Column -->
        <template #item.display_name="{ item }">
          <div class="d-flex align-center py-2">
            <v-avatar color="primary" size="40" class="mr-3">
              <span class="text-white font-weight-bold text-body-2">
                {{ item.first_name[0] }}{{ item.last_name[0] }}
              </span>
            </v-avatar>
            <div>
              <div class="font-weight-medium">{{ item.display_name }}</div>
              <div class="text-caption text-grey">{{ item.employee_number }}</div>
            </div>
          </div>
        </template>

        <!-- Position Column -->
        <template #item.position_title="{ item }">
          <div>
            <div>{{ item.position_title || 'Not assigned' }}</div>
            <div class="text-caption text-grey">{{ item.department_name || '' }}</div>
          </div>
        </template>

        <!-- Email Column -->
        <template #item.email_work="{ item }">
          <div class="text-body-2">{{ item.email_work }}</div>
        </template>

        <!-- Hire Date Column -->
        <template #item.hire_date="{ item }">
          <v-chip size="small" :color="isStartingSoon(item.hire_date) ? 'warning' : 'default'">
            {{ formatDate(item.hire_date) }}
          </v-chip>
        </template>

        <!-- Onboarding Status -->
        <template #item.onboarding_status="{ item }">
          <v-chip 
            size="small" 
            :color="item.onboarding_status === 'completed' ? 'success' : 'grey'"
          >
            {{ formatStatus(item.onboarding_status) }}
          </v-chip>
        </template>

        <!-- Actions Column -->
        <template #item.actions="{ item }">
          <v-btn
            color="primary"
            size="small"
            prepend-icon="mdi-account-plus"
            @click="openCreateDialog(item)"
          >
            Create User
          </v-btn>
        </template>
      </v-data-table>
    </v-card>

    <!-- Create User Dialog -->
    <v-dialog v-model="showCreateDialog" max-width="600" persistent>
      <v-card rounded="lg">
        <v-card-title class="bg-primary text-white py-4">
          <v-icon start>mdi-account-plus</v-icon>
          Create User Account
        </v-card-title>
        
        <v-card-text class="pt-6" v-if="selectedEmployee">
          <!-- Employee Info -->
          <v-alert type="info" variant="tonal" class="mb-4">
            <div class="d-flex align-center">
              <v-avatar color="primary" size="48" class="mr-4">
                <span class="text-white font-weight-bold">
                  {{ selectedEmployee.first_name[0] }}{{ selectedEmployee.last_name[0] }}
                </span>
              </v-avatar>
              <div>
                <div class="font-weight-bold">{{ selectedEmployee.display_name }}</div>
                <div class="text-body-2">{{ selectedEmployee.position_title }} • {{ selectedEmployee.location_name }}</div>
                <div class="text-caption">{{ selectedEmployee.email_work }}</div>
              </div>
            </div>
          </v-alert>

          <!-- Step 1: Verify Information -->
          <div v-if="createStep === 1">
            <h4 class="text-subtitle-1 font-weight-bold mb-3">Step 1: Verify Employee Information</h4>
            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="createForm.email"
                  label="Login Email"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Email required', v => /.+@.+/.test(v) || 'Valid email required']"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="createForm.phone"
                  label="Mobile Phone"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="createForm.role"
                  :items="roleOptions"
                  item-title="title"
                  item-value="value"
                  label="User Role"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="createForm.location_id"
                  :items="locations"
                  item-title="name"
                  item-value="id"
                  label="Primary Location"
                  variant="outlined"
                  density="compact"
                  clearable
                />
              </v-col>
            </v-row>
          </div>

          <!-- Step 2: Set Password -->
          <div v-if="createStep === 2">
            <h4 class="text-subtitle-1 font-weight-bold mb-3">Step 2: Set Initial Password</h4>
            <v-row dense>
              <v-col cols="12">
                <v-text-field
                  v-model="createForm.password"
                  :type="showPassword ? 'text' : 'password'"
                  label="Initial Password"
                  variant="outlined"
                  density="compact"
                  :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                  @click:append-inner="showPassword = !showPassword"
                  hint="Employee will be required to change on first login"
                  persistent-hint
                />
              </v-col>
              <v-col cols="12">
                <v-btn 
                  variant="outlined" 
                  size="small" 
                  @click="generatePassword"
                  prepend-icon="mdi-refresh"
                >
                  Generate Strong Password
                </v-btn>
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <v-checkbox
              v-model="createForm.sendWelcomeEmail"
              label="Send welcome email with login instructions"
              hide-details
            />
            <v-checkbox
              v-model="createForm.requirePasswordChange"
              label="Require password change on first login"
              hide-details
            />
          </div>

          <!-- Step 3: Confirm -->
          <div v-if="createStep === 3">
            <h4 class="text-subtitle-1 font-weight-bold mb-3">Step 3: Confirm & Create</h4>
            
            <v-list lines="two" class="bg-grey-lighten-4 rounded">
              <v-list-item>
                <template #prepend>
                  <v-icon color="primary">mdi-email</v-icon>
                </template>
                <v-list-item-title>Login Email</v-list-item-title>
                <v-list-item-subtitle>{{ createForm.email }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <template #prepend>
                  <v-icon color="primary">mdi-shield-account</v-icon>
                </template>
                <v-list-item-title>Role</v-list-item-title>
                <v-list-item-subtitle>{{ roleOptions.find(r => r.value === createForm.role)?.title }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <template #prepend>
                  <v-icon color="primary">mdi-key</v-icon>
                </template>
                <v-list-item-title>Initial Password</v-list-item-title>
                <v-list-item-subtitle>{{ createForm.password }}</v-list-item-subtitle>
                <template #append>
                  <v-btn icon size="small" @click="copyPassword">
                    <v-icon>mdi-content-copy</v-icon>
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>

            <v-alert type="warning" variant="tonal" class="mt-4" density="compact">
              <strong>Important:</strong> Save the password before creating the account. 
              You'll need to share it securely with the employee.
            </v-alert>
          </div>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-btn variant="text" @click="closeCreateDialog">Cancel</v-btn>
          <v-spacer />
          <v-btn 
            v-if="createStep > 1" 
            variant="outlined" 
            @click="createStep--"
          >
            Back
          </v-btn>
          <v-btn 
            v-if="createStep < 3" 
            color="primary" 
            @click="createStep++"
            :disabled="!canProceed"
          >
            Next
          </v-btn>
          <v-btn 
            v-if="createStep === 3" 
            color="success" 
            :loading="creating"
            @click="createUserAccount"
          >
            <v-icon start>mdi-account-check</v-icon>
            Create Account
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Success Dialog -->
    <v-dialog v-model="showSuccessDialog" max-width="500">
      <v-card rounded="lg" class="text-center pa-6">
        <v-icon size="80" color="success">mdi-check-circle</v-icon>
        <h2 class="text-h5 mt-4">Account Created!</h2>
        <p class="text-body-1 text-grey mt-2">
          User account for {{ createdEmployee?.display_name }} has been created successfully.
        </p>
        
        <v-alert type="info" variant="tonal" class="mt-4 text-left">
          <div class="text-body-2">
            <strong>Login Email:</strong> {{ createdCredentials?.email }}<br>
            <strong>Password:</strong> {{ createdCredentials?.password }}
          </div>
        </v-alert>

        <v-btn 
          color="primary" 
          class="mt-4" 
          @click="showSuccessDialog = false"
        >
          Done
        </v-btn>
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

interface PendingEmployee {
  employee_id: string
  employee_number: string
  first_name: string
  last_name: string
  display_name: string
  email_work: string
  email_personal: string | null
  phone_mobile: string | null
  hire_date: string
  employment_status: string
  onboarding_status: string
  needs_user_account: boolean
  profile_id: string
  auth_user_id: string | null
  profile_role: string
  position_title: string | null
  department_name: string | null
  location_name: string | null
}

const supabase = useSupabaseClient()

// State
const loading = ref(true)
const pendingEmployees = ref<PendingEmployee[]>([])
const locations = ref<{ id: string; name: string }[]>([])
const showCreateDialog = ref(false)
const showSuccessDialog = ref(false)
const selectedEmployee = ref<PendingEmployee | null>(null)
const createdEmployee = ref<PendingEmployee | null>(null)
const createdCredentials = ref<{ email: string; password: string } | null>(null)
const createStep = ref(1)
const creating = ref(false)
const showPassword = ref(false)

const snackbar = reactive({
  show: false,
  message: '',
  color: 'success'
})

const createForm = ref({
  email: '',
  phone: '',
  role: 'user',
  location_id: null as string | null,
  password: '',
  sendWelcomeEmail: true,
  requirePasswordChange: true
})

const roleOptions = [
  { title: 'Standard User', value: 'user' },
  { title: 'Manager', value: 'manager' },
  { title: 'Marketing Admin', value: 'marketing_admin' },
  { title: 'Administrator', value: 'admin' }
]

const headers = [
  { title: 'Employee', key: 'display_name', sortable: true },
  { title: 'Position', key: 'position_title', sortable: true },
  { title: 'Email', key: 'email_work', sortable: true },
  { title: 'Start Date', key: 'hire_date', sortable: true },
  { title: 'Onboarding', key: 'onboarding_status', sortable: true },
  { title: '', key: 'actions', sortable: false, align: 'end' as const }
]

// Computed
const canProceed = computed(() => {
  if (createStep.value === 1) {
    return createForm.value.email && createForm.value.role
  }
  if (createStep.value === 2) {
    return createForm.value.password && createForm.value.password.length >= 8
  }
  return true
})

// Methods
function showNotification(message: string, color = 'success') {
  snackbar.message = message
  snackbar.color = color
  snackbar.show = true
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Not set'
  return new Date(dateStr).toLocaleDateString()
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function isStartingSoon(dateStr: string | null): boolean {
  if (!dateStr) return false
  const startDate = new Date(dateStr)
  const today = new Date()
  const daysUntilStart = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return daysUntilStart <= 7 && daysUntilStart >= 0
}

function generatePassword(): void {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const special = '!@#$%'
  let password = 'GD'
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  password += special.charAt(Math.floor(Math.random() * special.length))
  createForm.value.password = password
}

function copyPassword(): void {
  navigator.clipboard.writeText(createForm.value.password)
  showNotification('Password copied to clipboard')
}

function openCreateDialog(employee: PendingEmployee): void {
  selectedEmployee.value = employee
  createStep.value = 1
  createForm.value = {
    email: employee.email_work,
    phone: employee.phone_mobile || '',
    role: 'user',
    location_id: null,
    password: '',
    sendWelcomeEmail: true,
    requirePasswordChange: true
  }
  generatePassword()
  showCreateDialog.value = true
}

function closeCreateDialog(): void {
  showCreateDialog.value = false
  selectedEmployee.value = null
  createStep.value = 1
}

async function createUserAccount(): Promise<void> {
  if (!selectedEmployee.value) return
  
  creating.value = true
  
  try {
    // 1. Create auth user via Supabase Admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: createForm.value.email,
      password: createForm.value.password,
      email_confirm: true,
      user_metadata: {
        first_name: selectedEmployee.value.first_name,
        last_name: selectedEmployee.value.last_name
      }
    })
    
    if (authError) throw authError
    
    // 2. Update profile with auth_user_id and role
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        auth_user_id: authData.user.id,
        role: createForm.value.role,
        phone: createForm.value.phone || null
      })
      .eq('id', selectedEmployee.value.profile_id)
    
    if (profileError) throw profileError
    
    // 3. Update employee record
    const { error: empError } = await supabase
      .from('employees')
      .update({
        needs_user_account: false,
        user_created_at: new Date().toISOString(),
        onboarding_status: 'completed',
        location_id: createForm.value.location_id || undefined
      })
      .eq('id', selectedEmployee.value.employee_id)
    
    if (empError) throw empError
    
    // 4. Add system note
    await supabase.from('employee_notes').insert({
      employee_id: selectedEmployee.value.employee_id,
      note: `User account created with role: ${createForm.value.role}. Email: ${createForm.value.email}`,
      note_type: 'system',
      hr_only: true
    })
    
    // Store for success dialog
    createdEmployee.value = selectedEmployee.value
    createdCredentials.value = {
      email: createForm.value.email,
      password: createForm.value.password
    }
    
    // Close create dialog and show success
    showCreateDialog.value = false
    showSuccessDialog.value = true
    
    // Refresh list
    await fetchPendingEmployees()
    
  } catch (error: any) {
    console.error('Error creating user account:', error)
    showNotification(error.message || 'Failed to create user account', 'error')
  } finally {
    creating.value = false
  }
}

async function fetchPendingEmployees(): Promise<void> {
  loading.value = true
  try {
    // Try using the view first
    let { data, error } = await supabase
      .from('pending_user_accounts')
      .select('*')
      .order('hire_date', { ascending: false })
    
    if (error) {
      // Fallback to direct query if view doesn't exist
      console.log('View not available, using fallback query')
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('employees')
        .select(`
          id,
          employee_number,
          first_name,
          last_name,
          email_work,
          email_personal,
          phone_mobile,
          hire_date,
          employment_status,
          onboarding_status,
          needs_user_account,
          profile_id,
          profiles:profile_id(id, auth_user_id, role),
          job_positions:position_id(title),
          departments:department_id(name),
          locations:location_id(name)
        `)
        .eq('needs_user_account', true)
        .eq('employment_status', 'active')
        .order('hire_date', { ascending: false })
      
      if (fallbackError) throw fallbackError
      
      // Transform to expected format
      data = (fallbackData || [])
        .filter((e: any) => !e.profiles?.auth_user_id)
        .map((e: any) => ({
          employee_id: e.id,
          employee_number: e.employee_number,
          first_name: e.first_name,
          last_name: e.last_name,
          display_name: `${e.first_name} ${e.last_name}`,
          email_work: e.email_work,
          email_personal: e.email_personal,
          phone_mobile: e.phone_mobile,
          hire_date: e.hire_date,
          employment_status: e.employment_status,
          onboarding_status: e.onboarding_status || 'pending',
          needs_user_account: e.needs_user_account,
          profile_id: e.profile_id,
          auth_user_id: e.profiles?.auth_user_id,
          profile_role: e.profiles?.role,
          position_title: e.job_positions?.title,
          department_name: e.departments?.name,
          location_name: e.locations?.name
        }))
    }
    
    pendingEmployees.value = data || []
  } catch (error) {
    console.error('Error fetching pending employees:', error)
    showNotification('Failed to load pending accounts', 'error')
  } finally {
    loading.value = false
  }
}

async function fetchLocations(): Promise<void> {
  const { data } = await supabase
    .from('locations')
    .select('id, name')
    .eq('is_active', true)
    .order('name')
  locations.value = data || []
}

onMounted(() => {
  fetchPendingEmployees()
  fetchLocations()
})
</script>
