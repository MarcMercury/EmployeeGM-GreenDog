<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <h1 class="text-h5 font-weight-bold mb-1">Master Roster</h1>
        <p class="text-body-2 text-grey-darken-1 mb-0">
          All employee data in one place • {{ employees.length }} records
        </p>
      </div>
      <div class="d-flex gap-2">
        <v-btn
          variant="outlined"
          size="small"
          prepend-icon="mdi-download"
          @click="exportCSV"
        >
          Export CSV
        </v-btn>
        <v-btn
          variant="outlined"
          size="small"
          prepend-icon="mdi-refresh"
          :loading="loading"
          @click="fetchAllData"
        >
          Refresh
        </v-btn>
      </div>
    </div>

    <!-- Global Search -->
    <v-card class="mb-3" rounded="lg" elevation="0" border>
      <v-card-text class="pa-3">
        <v-row dense>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              label="Search by name, email, employee #, phone..."
              variant="outlined"
              density="compact"
              hide-details
              clearable
              single-line
            />
          </v-col>
          <v-col cols="6" md="3">
            <v-select
              v-model="statusFilter"
              :items="statusOptions"
              label="Status"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="6" md="3">
            <v-select
              v-model="deptFilter"
              :items="departmentOptions"
              label="Department"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Data Table -->
    <v-card rounded="lg" elevation="0" border>
      <v-data-table
        :headers="headers"
        :items="filteredEmployees"
        :search="search"
        :loading="loading"
        :items-per-page="50"
        :items-per-page-options="[25, 50, 100, -1]"
        density="compact"
        hover
        fixed-header
        height="calc(100vh - 320px)"
        class="master-roster-table"
        @click:row="(_, { item }) => openEditDialog(item)"
      >
        <!-- Employee Number -->
        <template #item.employee_number="{ item }">
          <code class="text-caption bg-grey-lighten-4 px-1 rounded">
            {{ item.employee_number || '—' }}
          </code>
        </template>

        <!-- Name -->
        <template #item.full_name="{ item }">
          <span class="font-weight-medium">{{ item.full_name }}</span>
        </template>

        <!-- Email -->
        <template #item.email="{ item }">
          <span class="text-caption">{{ item.email_work || item.email_personal || '—' }}</span>
        </template>

        <!-- Phone -->
        <template #item.phone="{ item }">
          <span class="text-caption">{{ item.phone_mobile || item.phone_work || '—' }}</span>
        </template>

        <!-- Department -->
        <template #item.department="{ item }">
          <span class="text-caption">{{ item.department?.name || '—' }}</span>
        </template>

        <!-- Position -->
        <template #item.position="{ item }">
          <span class="text-caption">{{ item.position?.title || '—' }}</span>
        </template>

        <!-- Status -->
        <template #item.employment_status="{ item }">
          <v-chip
            :color="getStatusColor(item.employment_status)"
            size="x-small"
            label
            density="compact"
          >
            {{ item.employment_status || 'active' }}
          </v-chip>
        </template>

        <!-- Pay -->
        <template #item.pay="{ item }">
          <span v-if="item.compensation" class="text-caption">
            {{ formatPay(item.compensation) }}
          </span>
          <span v-else class="text-grey text-caption">—</span>
        </template>

        <!-- DOB -->
        <template #item.date_of_birth="{ item }">
          <span class="text-caption">{{ formatDate(item.date_of_birth) }}</span>
        </template>

        <!-- Hire Date -->
        <template #item.hire_date="{ item }">
          <span class="text-caption">{{ formatDate(item.hire_date) }}</span>
        </template>

        <!-- Location -->
        <template #item.location="{ item }">
          <span class="text-caption">{{ item.location?.name || '—' }}</span>
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <v-btn
            icon
            size="x-small"
            variant="text"
            color="primary"
            @click.stop="openEditDialog(item)"
          >
            <v-icon size="16">mdi-pencil</v-icon>
          </v-btn>
        </template>

        <!-- Loading -->
        <template #loading>
          <v-skeleton-loader type="table-row@10" />
        </template>

        <!-- No Data -->
        <template #no-data>
          <div class="text-center py-8">
            <v-icon size="48" color="grey-lighten-1">mdi-account-group</v-icon>
            <p class="text-body-2 text-grey mt-2">No employees found</p>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Master Edit Dialog -->
    <v-dialog v-model="editDialog" max-width="900" scrollable>
      <v-card>
        <v-card-title class="d-flex align-center bg-primary text-white">
          <v-icon start>mdi-account-edit</v-icon>
          Edit Employee: {{ editingEmployee?.full_name }}
          <v-spacer />
          <v-btn icon variant="text" color="white" @click="editDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-text class="pa-4" style="max-height: 70vh; overflow-y: auto;">
          <v-form ref="editForm" v-model="formValid">
            <!-- Personal Information -->
            <p class="text-overline text-grey mb-2">PERSONAL INFORMATION</p>
            <v-row dense>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="editForm.first_name"
                  label="First Name"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Required']"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="editForm.last_name"
                  label="Last Name"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Required']"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="editForm.preferred_name"
                  label="Preferred Name"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="editForm.employee_number"
                  label="Employee #"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="editForm.date_of_birth"
                  label="Date of Birth"
                  type="date"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="editForm.hire_date"
                  label="Hire Date"
                  type="date"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <!-- Contact Information -->
            <p class="text-overline text-grey mb-2">CONTACT INFORMATION</p>
            <v-row dense>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="editForm.email_work"
                  label="Work Email"
                  type="email"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="editForm.email_personal"
                  label="Personal Email"
                  type="email"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="editForm.phone_mobile"
                  label="Mobile Phone"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="editForm.phone_work"
                  label="Work Phone"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <!-- Employment Information -->
            <p class="text-overline text-grey mb-2">EMPLOYMENT INFORMATION</p>
            <v-row dense>
              <v-col cols="12" md="4">
                <v-select
                  v-model="editForm.department_id"
                  :items="departments"
                  item-title="name"
                  item-value="id"
                  label="Department"
                  variant="outlined"
                  density="compact"
                  clearable
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="editForm.position_id"
                  :items="positions"
                  item-title="title"
                  item-value="id"
                  label="Position"
                  variant="outlined"
                  density="compact"
                  clearable
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="editForm.location_id"
                  :items="locations"
                  item-title="name"
                  item-value="id"
                  label="Location"
                  variant="outlined"
                  density="compact"
                  clearable
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="editForm.employment_type"
                  :items="employmentTypes"
                  label="Employment Type"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="editForm.employment_status"
                  :items="employmentStatuses"
                  label="Employment Status"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="editForm.manager_employee_id"
                  :items="managerOptions"
                  item-title="full_name"
                  item-value="id"
                  label="Manager"
                  variant="outlined"
                  density="compact"
                  clearable
                />
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <!-- Compensation -->
            <p class="text-overline text-grey mb-2">COMPENSATION</p>
            <v-row dense>
              <v-col cols="12" md="3">
                <v-select
                  v-model="editForm.pay_type"
                  :items="['Hourly', 'Salary']"
                  label="Pay Type"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field
                  v-model.number="editForm.pay_rate"
                  label="Pay Rate"
                  type="number"
                  prefix="$"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-select
                  v-model="editForm.comp_employment_status"
                  :items="['Full Time', 'Part Time', 'Contractor', 'Per Diem']"
                  label="Comp Status"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-checkbox
                  v-model="editForm.benefits_enrolled"
                  label="Benefits Enrolled"
                  density="compact"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model.number="editForm.ce_budget_total"
                  label="CE Budget Total"
                  type="number"
                  prefix="$"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model.number="editForm.ce_budget_used"
                  label="CE Budget Used"
                  type="number"
                  prefix="$"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="editForm.effective_date"
                  label="Effective Date"
                  type="date"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <!-- Profile / Auth -->
            <p class="text-overline text-grey mb-2">PROFILE & ACCESS</p>
            <v-row dense>
              <v-col cols="12" md="4">
                <v-select
                  v-model="editForm.profile_role"
                  :items="['admin', 'user']"
                  label="System Role"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-checkbox
                  v-model="editForm.profile_is_active"
                  label="Profile Active"
                  density="compact"
                  hide-details
                />
              </v-col>
            </v-row>

            <!-- Internal Notes -->
            <v-divider class="my-4" />
            <p class="text-overline text-grey mb-2">INTERNAL NOTES</p>
            <v-textarea
              v-model="editForm.notes_internal"
              label="Admin Notes"
              variant="outlined"
              density="compact"
              rows="2"
              auto-grow
            />
          </v-form>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-chip size="small" variant="tonal" color="grey">
            ID: {{ editingEmployee?.id?.slice(0, 8) }}...
          </v-chip>
          <v-btn
            v-if="editingEmployee?.profile?.id && canDisableLogin(editingEmployee)"
            color="error"
            variant="outlined"
            size="small"
            prepend-icon="mdi-lock-off"
            :loading="disablingLogin"
            class="ml-2"
            @click="confirmDisableLogin"
          >
            Disable Login
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="editDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="saving"
            :disabled="!formValid"
            @click="saveChanges"
          >
            Save All Changes
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarText }}
    </v-snackbar>

    <!-- Disable Login Confirmation Dialog -->
    <v-dialog v-model="disableLoginDialog" max-width="450">
      <v-card>
        <v-card-title class="bg-error text-white d-flex align-center">
          <v-icon start>mdi-lock-off</v-icon>
          Disable Login Access
        </v-card-title>
        <v-card-text class="pt-4">
          <v-alert type="warning" variant="tonal" class="mb-4">
            <strong>This action takes effect immediately.</strong>
          </v-alert>
          <p class="text-body-1 mb-2">
            You are about to disable login access for:
          </p>
          <p class="text-h6 font-weight-bold text-error mb-4">
            {{ editingEmployee?.full_name }}
          </p>
          <p class="text-body-2 text-grey-darken-1">
            Their password will be changed and they will be unable to access the system. 
            This is typically done when terminating an employee.
          </p>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="disableLoginDialog = false">
            Cancel
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            :loading="disablingLogin"
            @click="executeDisableLogin"
          >
            Disable Login Now
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin-only']
})

interface Employee {
  id: string
  profile_id: string | null
  employee_number: string | null
  first_name: string
  last_name: string
  preferred_name: string | null
  full_name: string
  email_work: string | null
  email_personal: string | null
  phone_work: string | null
  phone_mobile: string | null
  department_id: string | null
  position_id: string | null
  manager_employee_id: string | null
  location_id: string | null
  employment_type: string | null
  employment_status: string | null
  hire_date: string | null
  termination_date: string | null
  date_of_birth: string | null
  notes_internal: string | null
  department: { id: string; name: string } | null
  position: { id: string; title: string } | null
  location: { id: string; name: string } | null
  compensation: {
    id: string
    pay_type: string | null
    pay_rate: number | null
    employment_status: string | null
    benefits_enrolled: boolean
    ce_budget_total: number | null
    ce_budget_used: number | null
    effective_date: string | null
  } | null
  profile: {
    id: string
    role: string
    is_active: boolean
    email: string
  } | null
}

interface Department {
  id: string
  name: string
}

interface Position {
  id: string
  title: string
}

interface Location {
  id: string
  name: string
}

const supabase = useSupabaseClient()

// State
const loading = ref(true)
const saving = ref(false)
const search = ref('')
const statusFilter = ref<string | null>(null)
const deptFilter = ref<string | null>(null)
const employees = ref<Employee[]>([])
const departments = ref<Department[]>([])
const positions = ref<Position[]>([])
const locations = ref<Location[]>([])

// Dialog
const editDialog = ref(false)
const editingEmployee = ref<Employee | null>(null)
const formValid = ref(false)
const editForm = ref({
  // Employee fields
  first_name: '',
  last_name: '',
  preferred_name: '',
  employee_number: '',
  date_of_birth: '',
  hire_date: '',
  email_work: '',
  email_personal: '',
  phone_mobile: '',
  phone_work: '',
  department_id: null as string | null,
  position_id: null as string | null,
  location_id: null as string | null,
  employment_type: 'full-time',
  employment_status: 'active',
  manager_employee_id: null as string | null,
  notes_internal: '',
  // Compensation fields
  pay_type: 'Hourly',
  pay_rate: 0,
  comp_employment_status: 'Full Time',
  benefits_enrolled: false,
  ce_budget_total: 0,
  ce_budget_used: 0,
  effective_date: '',
  // Profile fields
  profile_role: 'user',
  profile_is_active: true
})

// Snackbar
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

// Disable Login
const disableLoginDialog = ref(false)
const disablingLogin = ref(false)

// Static options
const headers = [
  { title: 'Emp #', key: 'employee_number', sortable: true, width: '80px' },
  { title: 'Name', key: 'full_name', sortable: true },
  { title: 'Email', key: 'email', sortable: true },
  { title: 'Phone', key: 'phone', sortable: false },
  { title: 'Dept', key: 'department', sortable: true },
  { title: 'Position', key: 'position', sortable: true },
  { title: 'Status', key: 'employment_status', sortable: true, width: '100px' },
  { title: 'Pay', key: 'pay', sortable: true, width: '100px' },
  { title: 'DOB', key: 'date_of_birth', sortable: true, width: '100px' },
  { title: 'Hired', key: 'hire_date', sortable: true, width: '100px' },
  { title: 'Location', key: 'location', sortable: true },
  { title: '', key: 'actions', sortable: false, width: '50px', align: 'end' as const }
]

const statusOptions = [
  { title: 'Active', value: 'active' },
  { title: 'Inactive', value: 'inactive' },
  { title: 'On Leave', value: 'on-leave' },
  { title: 'Terminated', value: 'terminated' }
]

const employmentTypes = [
  { title: 'Full-Time', value: 'full-time' },
  { title: 'Part-Time', value: 'part-time' },
  { title: 'Contract', value: 'contract' },
  { title: 'Per Diem', value: 'per-diem' },
  { title: 'Intern', value: 'intern' }
]

const employmentStatuses = [
  { title: 'Active', value: 'active' },
  { title: 'Inactive', value: 'inactive' },
  { title: 'On Leave', value: 'on-leave' },
  { title: 'Terminated', value: 'terminated' }
]

// Computed
const departmentOptions = computed(() => 
  departments.value.map(d => ({ title: d.name, value: d.id }))
)

const managerOptions = computed(() =>
  employees.value
    .filter(e => e.id !== editingEmployee.value?.id)
    .map(e => ({ id: e.id, full_name: e.full_name }))
)

const filteredEmployees = computed(() => {
  let result = employees.value

  if (statusFilter.value) {
    result = result.filter(e => e.employment_status === statusFilter.value)
  }

  if (deptFilter.value) {
    result = result.filter(e => e.department_id === deptFilter.value)
  }

  return result
})

// Methods
const showNotification = (message: string, color = 'success') => {
  snackbarText.value = message
  snackbarColor.value = color
  snackbar.value = true
}

const getStatusColor = (status: string | null) => {
  const colors: Record<string, string> = {
    active: 'success',
    inactive: 'grey',
    'on-leave': 'warning',
    terminated: 'error'
  }
  return colors[status || 'active'] || 'grey'
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit'
  })
}

const formatPay = (comp: Employee['compensation']) => {
  if (!comp?.pay_rate) return '—'
  const rate = comp.pay_rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return comp.pay_type === 'Salary' ? `$${rate}/yr` : `$${rate}/hr`
}

const fetchAllData = async () => {
  loading.value = true
  try {
    const [empRes, deptRes, posRes, locRes] = await Promise.all([
      supabase
        .from('employees')
        .select(`
          *,
          department:departments(id, name),
          position:job_positions(id, title),
          location:locations(id, name),
          compensation:employee_compensation(*),
          profile:profiles(id, role, is_active, email)
        `)
        .order('last_name'),
      supabase.from('departments').select('id, name').order('name'),
      supabase.from('job_positions').select('id, title').order('title'),
      supabase.from('locations').select('id, name').order('name')
    ])

    if (empRes.error) throw empRes.error

    employees.value = (empRes.data || []).map((e: any) => ({
      ...e,
      full_name: `${e.first_name} ${e.last_name}`
    }))
    departments.value = deptRes.data || []
    positions.value = posRes.data || []
    locations.value = locRes.data || []
  } catch (err) {
    console.error('Error fetching data:', err)
    showNotification('Failed to load data', 'error')
  } finally {
    loading.value = false
  }
}

const openEditDialog = (employee: Employee) => {
  editingEmployee.value = employee
  
  // Populate form with employee data
  editForm.value = {
    first_name: employee.first_name,
    last_name: employee.last_name,
    preferred_name: employee.preferred_name || '',
    employee_number: employee.employee_number || '',
    date_of_birth: employee.date_of_birth || '',
    hire_date: employee.hire_date || '',
    email_work: employee.email_work || '',
    email_personal: employee.email_personal || '',
    phone_mobile: employee.phone_mobile || '',
    phone_work: employee.phone_work || '',
    department_id: employee.department_id,
    position_id: employee.position_id,
    location_id: employee.location_id,
    employment_type: employee.employment_type || 'full-time',
    employment_status: employee.employment_status || 'active',
    manager_employee_id: employee.manager_employee_id,
    notes_internal: employee.notes_internal || '',
    // Compensation
    pay_type: employee.compensation?.pay_type || 'Hourly',
    pay_rate: employee.compensation?.pay_rate || 0,
    comp_employment_status: employee.compensation?.employment_status || 'Full Time',
    benefits_enrolled: employee.compensation?.benefits_enrolled || false,
    ce_budget_total: employee.compensation?.ce_budget_total || 0,
    ce_budget_used: employee.compensation?.ce_budget_used || 0,
    effective_date: employee.compensation?.effective_date || new Date().toISOString().split('T')[0],
    // Profile
    profile_role: employee.profile?.role || 'user',
    profile_is_active: employee.profile?.is_active ?? true
  }
  
  editDialog.value = true
}

const saveChanges = async () => {
  if (!editingEmployee.value) return
  
  saving.value = true
  try {
    // 1. Update employees table
    const { error: empError } = await supabase
      .from('employees')
      .update({
        first_name: editForm.value.first_name,
        last_name: editForm.value.last_name,
        preferred_name: editForm.value.preferred_name || null,
        employee_number: editForm.value.employee_number || null,
        date_of_birth: editForm.value.date_of_birth || null,
        hire_date: editForm.value.hire_date || null,
        email_work: editForm.value.email_work || null,
        email_personal: editForm.value.email_personal || null,
        phone_mobile: editForm.value.phone_mobile || null,
        phone_work: editForm.value.phone_work || null,
        department_id: editForm.value.department_id,
        position_id: editForm.value.position_id,
        location_id: editForm.value.location_id,
        employment_type: editForm.value.employment_type,
        employment_status: editForm.value.employment_status,
        manager_employee_id: editForm.value.manager_employee_id,
        notes_internal: editForm.value.notes_internal || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingEmployee.value.id)

    if (empError) throw empError

    // 2. Update or insert compensation
    const compData = {
      employee_id: editingEmployee.value.id,
      pay_type: editForm.value.pay_type,
      pay_rate: editForm.value.pay_rate || null,
      employment_status: editForm.value.comp_employment_status,
      benefits_enrolled: editForm.value.benefits_enrolled,
      ce_budget_total: editForm.value.ce_budget_total || 0,
      ce_budget_used: editForm.value.ce_budget_used || 0,
      effective_date: editForm.value.effective_date || null
    }

    if (editingEmployee.value.compensation?.id) {
      // Update existing
      const { error: compError } = await supabase
        .from('employee_compensation')
        .update(compData)
        .eq('id', editingEmployee.value.compensation.id)
      if (compError) throw compError
    } else {
      // Insert new
      const { error: compError } = await supabase
        .from('employee_compensation')
        .insert(compData)
      if (compError) throw compError
    }

    // 3. Update profile if exists
    if (editingEmployee.value.profile_id) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          role: editForm.value.profile_role,
          is_active: editForm.value.profile_is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingEmployee.value.profile_id)
      
      if (profileError) throw profileError
    }

    showNotification('Employee updated successfully')
    editDialog.value = false
    await fetchAllData() // Refresh data
  } catch (err: any) {
    console.error('Error saving:', err)
    showNotification(err.message || 'Failed to save changes', 'error')
  } finally {
    saving.value = false
  }
}

const exportCSV = () => {
  const headers = ['Employee #', 'Name', 'Email', 'Phone', 'Department', 'Position', 'Status', 'Pay Type', 'Pay Rate', 'DOB', 'Hire Date', 'Location']
  const rows = filteredEmployees.value.map(e => [
    e.employee_number || '',
    e.full_name,
    e.email_work || e.email_personal || '',
    e.phone_mobile || e.phone_work || '',
    e.department?.name || '',
    e.position?.title || '',
    e.employment_status || '',
    e.compensation?.pay_type || '',
    e.compensation?.pay_rate || '',
    e.date_of_birth || '',
    e.hire_date || '',
    e.location?.name || ''
  ])

  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `master-roster-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
  showNotification('CSV exported')
}

// Disable Login Functions
const canDisableLogin = (employee: Employee) => {
  // Can disable if employee has a profile with auth_user_id linked
  // Don't show for current user (handled in API too)
  return employee.profile?.id
}

const confirmDisableLogin = () => {
  disableLoginDialog.value = true
}

const executeDisableLogin = async () => {
  if (!editingEmployee.value?.profile) return
  
  disablingLogin.value = true
  try {
    // Get the auth_user_id from the profile
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('auth_user_id')
      .eq('id', editingEmployee.value.profile.id)
      .single()
    
    if (fetchError || !profile?.auth_user_id) {
      throw new Error('Could not find auth user for this employee')
    }

    // Get current session token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('No active session')
    }

    // Call the API to disable login
    const response = await $fetch('/api/admin/disable-login', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      },
      body: {
        authUserId: profile.auth_user_id
      }
    })

    showNotification(`Login disabled for ${editingEmployee.value.full_name}`, 'success')
    disableLoginDialog.value = false
    editDialog.value = false
  } catch (err: any) {
    console.error('Error disabling login:', err)
    showNotification(err.data?.message || err.message || 'Failed to disable login', 'error')
  } finally {
    disablingLogin.value = false
  }
}

// Lifecycle
onMounted(() => {
  fetchAllData()
})
</script>

<style scoped>
.master-roster-table :deep(table) {
  font-size: 0.8125rem;
}

.master-roster-table :deep(th) {
  font-weight: 600 !important;
  white-space: nowrap;
  background: #f5f5f5 !important;
}

.master-roster-table :deep(td) {
  white-space: nowrap;
}

.master-roster-table :deep(tr:hover) {
  cursor: pointer;
}
</style>
