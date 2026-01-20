<template>
  <div class="roster-page">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-4 flex-wrap gap-4">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Team Roster</h1>
        <p class="text-body-2 text-grey-darken-1">
          {{ filteredEmployees.length }} of {{ employees.length }} team members
        </p>
      </div>
      <v-btn
        v-if="isAdmin"
        color="primary"
        prepend-icon="mdi-plus"
        @click="showAddDialog = true"
      >
        Add Employee
      </v-btn>
    </div>

    <!-- Stats Row -->
    <UiStatsRow
      :stats="[
        { value: stats.total, label: 'Total Team', color: 'primary' },
        { value: stats.active, label: 'Active', color: 'success' },
        { value: stats.onLeave, label: 'On Leave', color: 'warning' },
        { value: stats.inactive, label: 'Inactive', color: 'secondary' }
      ]"
      layout="4-col"
    />

    <!-- Filters Card -->
    <v-card class="mb-4" variant="outlined">
      <v-card-text class="py-3">
        <v-row dense align="center">
          <v-col cols="12" sm="6" md="4">
            <v-text-field
              v-model="searchQuery"
              prepend-inner-icon="mdi-magnify"
              placeholder="Search by name, role, email..."
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="6" sm="3" md="2">
            <v-select
              v-model="selectedDept"
              :items="departments"
              label="Department"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="6" sm="3" md="2">
            <v-select
              v-model="selectedStatus"
              :items="statusOptions"
              label="Status"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="4" class="d-flex justify-end gap-2">
            <v-btn-toggle v-model="viewMode" mandatory density="compact" color="primary">
              <v-btn value="table" size="small">
                <v-icon size="18">mdi-table</v-icon>
              </v-btn>
              <v-btn value="cards" size="small">
                <v-icon size="18">mdi-view-grid</v-icon>
              </v-btn>
            </v-btn-toggle>
            <v-btn
              icon="mdi-refresh"
              size="small"
              variant="text"
              :loading="loading"
              @click="refreshData"
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Loading State -->
    <div v-if="loading && employees.length === 0" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="48" />
      <p class="text-grey mt-4">Loading team members...</p>
    </div>

    <!-- Empty State -->
    <UiEmptyState
      v-else-if="filteredEmployees.length === 0 && searchQuery"
      type="search"
      title="No matches found"
      :description="`No employees match '${searchQuery}'`"
      actionLabel="Clear filters"
      @action="clearFilters"
      class="my-8"
    />

    <UiEmptyState
      v-else-if="filteredEmployees.length === 0"
      type="employees"
      title="No employees found"
      description="Try adjusting your filters or add a new team member"
      :actionLabel="isAdmin ? 'Add Employee' : undefined"
      @action="showAddDialog = true"
      class="my-8"
    />

    <!-- Table View -->
    <v-card v-else-if="viewMode === 'table'" variant="outlined">
      <v-data-table
        :headers="tableHeaders"
        :items="filteredEmployees"
        :items-per-page="25"
        :items-per-page-options="[10, 25, 50, 100]"
        hover
        density="comfortable"
        :class="['roster-table', 'roster-table--clickable']"
        @click:row="(_, { item }) => viewEmployee(item.id)"
      >
        <!-- Employee Name + Avatar -->
        <template #item.name="{ item }">
          <div class="d-flex align-center gap-3 py-2">
            <v-avatar size="40" :color="item.avatar_url ? undefined : 'primary'">
              <v-img v-if="item.avatar_url" :src="item.avatar_url" />
              <span v-else class="text-white font-weight-bold">{{ item.initials }}</span>
            </v-avatar>
            <div>
              <div class="font-weight-medium">{{ item.full_name }}</div>
              <div class="text-caption text-grey">{{ item.email }}</div>
            </div>
          </div>
        </template>

        <!-- Position & Department -->
        <template #item.position="{ item }">
          <div>
            <div class="text-body-2">{{ item.position?.title || '—' }}</div>
            <div v-if="item.department" class="text-caption text-grey">
              {{ item.department.name }}
            </div>
          </div>
        </template>

        <!-- Status -->
        <template #item.status="{ item }">
          <v-chip 
            :color="getStatusColor(item.employment_status)" 
            size="small" 
            variant="flat"
          >
            {{ getStatusLabel(item.employment_status) }}
          </v-chip>
        </template>

        <!-- Skills Summary -->
        <template #item.skills="{ item }">
          <div class="d-flex gap-1 flex-wrap">
            <template v-if="item.skills && item.skills.length > 0">
              <v-chip 
                v-for="skill in getTopSkills(item.skills, 2)" 
                :key="skill.skill_id"
                size="x-small"
                variant="tonal"
                color="primary"
              >
                {{ skill.skill_name }}
                <v-icon end size="12" color="amber">mdi-star</v-icon>
                {{ skill.rating }}
              </v-chip>
              <v-chip v-if="item.skills.length > 2" size="x-small" variant="outlined">
                +{{ item.skills.length - 2 }}
              </v-chip>
            </template>
            <span v-else class="text-caption text-grey-lighten-1">No skills</span>
          </div>
        </template>

        <!-- Location -->
        <template #item.location="{ item }">
          <span v-if="item.location" class="text-body-2">{{ item.location.name }}</span>
          <span v-else class="text-grey">—</span>
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <div v-if="isAdmin" class="d-flex justify-end">
            <v-btn
              icon="mdi-eye"
              size="x-small"
              variant="text"
              @click.stop="viewEmployee(item.id)"
              title="View Profile"
            />
            <v-btn
              icon="mdi-pencil"
              size="x-small"
              variant="text"
              @click.stop="editEmployee(item)"
              title="Edit"
            />
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Card Grid View -->
    <v-row v-else>
      <v-col
        v-for="emp in filteredEmployees"
        :key="emp.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <v-card 
          rounded="lg" 
          elevation="2" 
          class="employee-card h-100 employee-card--clickable cursor-pointer"
          @click="viewEmployee(emp.id)"
        >
          <v-card-text class="text-center pb-2">
            <v-avatar size="72" :color="emp.avatar_url ? undefined : 'primary'" class="mb-3">
              <v-img v-if="emp.avatar_url" :src="emp.avatar_url" />
              <span v-else class="text-h5 text-white font-weight-bold">{{ emp.initials }}</span>
            </v-avatar>
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ emp.full_name }}</h3>
            <p class="text-caption text-grey mb-2">{{ emp.position?.title || 'Unassigned' }}</p>
            <v-chip 
              v-if="emp.department" 
              size="x-small" 
              variant="tonal"
              color="secondary"
            >
              {{ emp.department.name }}
            </v-chip>
          </v-card-text>
          <v-divider />
          <v-card-text class="py-2">
            <div class="d-flex justify-space-between align-center">
              <v-chip 
                :color="getStatusColor(emp.employment_status)" 
                size="x-small" 
                variant="flat"
              >
                {{ getStatusLabel(emp.employment_status) }}
              </v-chip>
              <span class="text-caption text-grey">
                {{ emp.skills?.length || 0 }} skills
              </span>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Add Employee Dialog -->
    <v-dialog v-model="showAddDialog" max-width="800" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start color="primary">mdi-account-plus</v-icon>
          <span>Add New Employee</span>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" @click="closeAddDialog" />
        </v-card-title>
        <v-divider />
        
        <!-- Stepper for organized form sections -->
        <v-stepper v-model="addStep" :items="['Basic Info', 'Employment', 'Contact', 'Additional']" alt-labels>
          <template v-slot:item.1>
            <v-card flat>
              <v-card-text>
                <h3 class="text-h6 mb-4">Basic Information</h3>
                <v-row>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="newEmployee.first_name"
                      label="First Name *"
                      variant="outlined"
                      :rules="[v => !!v || 'Required']"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="newEmployee.last_name"
                      label="Last Name *"
                      variant="outlined"
                      :rules="[v => !!v || 'Required']"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="newEmployee.preferred_name"
                      label="Preferred Name / Nickname"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="newEmployee.employee_number"
                      label="Employee Number"
                      variant="outlined"
                      hint="Leave blank to auto-generate"
                      persistent-hint
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="newEmployee.date_of_birth"
                      label="Date of Birth"
                      variant="outlined"
                      type="date"
                    />
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </template>

          <template v-slot:item.2>
            <v-card flat>
              <v-card-text>
                <h3 class="text-h6 mb-4">Employment Details</h3>
                <v-row>
                  <v-col cols="12" md="6">
                    <v-select
                      v-model="newEmployee.department_id"
                      :items="departmentsList"
                      item-title="name"
                      item-value="id"
                      label="Department"
                      variant="outlined"
                      clearable
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-select
                      v-model="newEmployee.position_id"
                      :items="positionsList"
                      item-title="title"
                      item-value="id"
                      label="Position / Job Title"
                      variant="outlined"
                      clearable
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-select
                      v-model="newEmployee.manager_employee_id"
                      :items="managerOptions"
                      item-title="full_name"
                      item-value="id"
                      label="Reports To (Manager)"
                      variant="outlined"
                      clearable
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-select
                      v-model="newEmployee.location_id"
                      :items="locationsList"
                      item-title="name"
                      item-value="id"
                      label="Primary Location"
                      variant="outlined"
                      clearable
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-select
                      v-model="newEmployee.employment_type"
                      :items="employmentTypes"
                      label="Employment Type"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-select
                      v-model="newEmployee.employment_status"
                      :items="employmentStatuses"
                      label="Status"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="newEmployee.hire_date"
                      label="Hire Date"
                      variant="outlined"
                      type="date"
                    />
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </template>

          <template v-slot:item.3>
            <v-card flat>
              <v-card-text>
                <h3 class="text-h6 mb-4">Contact Information</h3>
                <v-row>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="newEmployee.email_work"
                      label="Work Email *"
                      variant="outlined"
                      type="email"
                      :rules="[v => !!v || 'Required', v => /.+@.+/.test(v) || 'Invalid email']"
                      prepend-inner-icon="mdi-email"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="newEmployee.email_personal"
                      label="Personal Email"
                      variant="outlined"
                      type="email"
                      prepend-inner-icon="mdi-email-outline"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="newEmployee.phone_work"
                      label="Work Phone"
                      variant="outlined"
                      prepend-inner-icon="mdi-phone"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="newEmployee.phone_mobile"
                      label="Mobile Phone"
                      variant="outlined"
                      prepend-inner-icon="mdi-cellphone"
                    />
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </template>

          <template v-slot:item.4>
            <v-card flat>
              <v-card-text>
                <h3 class="text-h6 mb-4">Additional Information</h3>
                <v-row>
                  <v-col cols="12">
                    <v-textarea
                      v-model="newEmployee.notes_internal"
                      label="Internal Notes"
                      variant="outlined"
                      rows="3"
                      hint="Private notes visible only to admins"
                      persistent-hint
                    />
                  </v-col>
                  <v-col cols="12">
                    <v-checkbox
                      v-model="newEmployee.send_invite"
                      label="Send email invitation to set up account"
                      color="primary"
                      hide-details
                    />
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </template>
        </v-stepper>

        <v-divider />
        <v-card-actions class="pa-4">
          <v-btn v-if="addStep > 1" variant="text" @click="addStep--">
            <v-icon start>mdi-chevron-left</v-icon>
            Back
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="closeAddDialog">Cancel</v-btn>
          <v-btn v-if="addStep < 4" color="primary" variant="flat" @click="addStep++">
            Next
            <v-icon end>mdi-chevron-right</v-icon>
          </v-btn>
          <v-btn v-else color="primary" variant="flat" :loading="isSaving" @click="createEmployee">
            <v-icon start>mdi-account-plus</v-icon>
            Add Employee
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

// Get global app data
const { employees, departments: departmentsList, positions: positionsList, loading, fetchGlobalData } = useAppData()
const authStore = useAuthStore()
const router = useRouter()
const uiStore = useUIStore()

const isAdmin = computed(() => authStore.isAdmin)

// Local state
const searchQuery = ref('')
const selectedDept = ref<string | null>(null)
const selectedStatus = ref<string | null>(null)
const viewMode = ref<'table' | 'cards'>('table')
const showAddDialog = ref(false)
const isSaving = ref(false)
const addFormRef = ref()
const addStep = ref(1)

// Load locations
const supabase = useSupabaseClient()
const locationsList = ref<{ id: string; name: string }[]>([])

// Employment type and status options
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
  { title: 'On Leave', value: 'on-leave' }
]

// Manager options (current employees who can be managers)
const managerOptions = computed(() => 
  employees.value.map(emp => ({
    id: emp.id,
    full_name: `${emp.first_name} ${emp.last_name}`
  }))
)

const newEmployee = reactive({
  first_name: '',
  last_name: '',
  preferred_name: '',
  employee_number: '',
  date_of_birth: '',
  email_work: '',
  email_personal: '',
  phone_work: '',
  phone_mobile: '',
  department_id: null as string | null,
  position_id: null as string | null,
  manager_employee_id: null as string | null,
  location_id: null as string | null,
  employment_type: 'full-time',
  employment_status: 'active',
  hire_date: new Date().toISOString().split('T')[0],
  notes_internal: '',
  send_invite: true
})

// Table headers
const tableHeaders = [
  { title: 'Employee', key: 'name', sortable: true, value: (item: any) => item.full_name || '' },
  { title: 'Position', key: 'position', sortable: true, value: (item: any) => item.position?.title || '' },
  { title: 'Status', key: 'status', sortable: true, value: (item: any) => item.employment_status || '' },
  { title: 'Skills', key: 'skills', sortable: false },
  { title: 'Location', key: 'location', sortable: true, value: (item: any) => item.location?.name || '' },
  { title: '', key: 'actions', sortable: false, align: 'end' as const }
]

// Department filter options
const departments = computed(() => {
  const depts = new Set(employees.value.map(e => e.department?.name).filter(Boolean))
  return ['All', ...Array.from(depts).sort()]
})

// Status options
const statusOptions = ['active', 'on_leave', 'inactive', 'terminated']

// Stats computed
const stats = computed(() => {
  const all = employees.value || []
  return {
    total: all.length,
    active: all.filter(e => e.employment_status === 'active').length,
    onLeave: all.filter(e => e.employment_status === 'on_leave').length,
    inactive: all.filter(e => e.employment_status === 'inactive' || e.employment_status === 'terminated').length,
    byDepartment: departmentsList.value?.slice(0, 5).map(d => ({
      name: d.name,
      count: all.filter(e => e.department?.name === d.name).length
    })) || []
  }
})

// Filtered employees
const filteredEmployees = computed(() => {
  if (!employees.value) return []
  
  return employees.value.filter(emp => {
    // Search filter
    const searchLower = searchQuery.value?.toLowerCase() || ''
    const matchesSearch = !searchQuery.value || 
      emp.first_name?.toLowerCase().includes(searchLower) ||
      emp.last_name?.toLowerCase().includes(searchLower) ||
      emp.full_name?.toLowerCase().includes(searchLower) ||
      emp.email?.toLowerCase().includes(searchLower) ||
      emp.position?.title?.toLowerCase().includes(searchLower)
    
    // Department filter
    const matchesDept = !selectedDept.value || 
      selectedDept.value === 'All' || 
      emp.department?.name === selectedDept.value
    
    // Status filter
    const matchesStatus = !selectedStatus.value || 
      emp.employment_status === selectedStatus.value
    
    return matchesSearch && matchesDept && matchesStatus
  })
})

// Helpers
function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'success'
    case 'on_leave': return 'warning'
    case 'terminated': return 'error'
    default: return 'grey'
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'active': return 'Active'
    case 'on_leave': return 'On Leave'
    case 'terminated': return 'Inactive'
    default: return status
  }
}

function getTopSkills(skills: any[], count = 2) {
  if (!skills || skills.length === 0) return []
  return [...skills].sort((a, b) => b.rating - a.rating).slice(0, count)
}

function clearFilters() {
  searchQuery.value = ''
  selectedDept.value = null
  selectedStatus.value = null
}

function viewEmployee(id: string) {
  router.push(`/roster/${id}`)
}

function editEmployee(emp: any) {
  router.push(`/roster/${emp.id}`)
}

async function refreshData() {
  await fetchGlobalData(true)
}

function closeAddDialog() {
  showAddDialog.value = false
  addStep.value = 1
  // Reset form
  Object.assign(newEmployee, {
    first_name: '',
    last_name: '',
    preferred_name: '',
    employee_number: '',
    date_of_birth: '',
    email_work: '',
    email_personal: '',
    phone_work: '',
    phone_mobile: '',
    department_id: null,
    position_id: null,
    manager_employee_id: null,
    location_id: null,
    employment_type: 'full-time',
    employment_status: 'active',
    hire_date: new Date().toISOString().split('T')[0],
    notes_internal: '',
    send_invite: true
  })
}

async function loadLocations() {
  try {
    const { data, error } = await supabase
      .from('locations')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
    
    if (!error && data) {
      locationsList.value = data
    }
  } catch (err) {
    console.error('Failed to load locations:', err)
  }
}

async function createEmployee() {
  // Basic validation
  if (!newEmployee.first_name || !newEmployee.last_name || !newEmployee.email_work) {
    uiStore.showError('Please fill in all required fields (First Name, Last Name, Work Email)')
    return
  }
  
  // Email validation
  if (!/.+@.+\..+/.test(newEmployee.email_work)) {
    uiStore.showError('Please enter a valid work email address')
    return
  }
  
  isSaving.value = true
  try {
    // 1. First create a profile for the new employee
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        email: newEmployee.email_work,
        first_name: newEmployee.first_name,
        last_name: newEmployee.last_name,
        phone: newEmployee.phone_mobile || newEmployee.phone_work || null,
        role: 'user',
        is_active: true
      })
      .select()
      .single()
    
    if (profileError) {
      throw new Error(`Failed to create profile: ${profileError.message}`)
    }
    
    // 2. Create the employee record with profile link
    const insertData: Record<string, any> = {
      profile_id: profileData.id,
      first_name: newEmployee.first_name,
      last_name: newEmployee.last_name,
      email_work: newEmployee.email_work,
      employment_status: newEmployee.employment_status,
      employment_type: newEmployee.employment_type,
      needs_user_account: newEmployee.send_invite // Track if account is needed
    }
    
    // Add optional fields only if provided
    if (newEmployee.preferred_name) insertData.preferred_name = newEmployee.preferred_name
    if (newEmployee.employee_number) insertData.employee_number = newEmployee.employee_number
    if (newEmployee.date_of_birth) insertData.date_of_birth = newEmployee.date_of_birth
    if (newEmployee.email_personal) insertData.email_personal = newEmployee.email_personal
    if (newEmployee.phone_work) insertData.phone_work = newEmployee.phone_work
    if (newEmployee.phone_mobile) insertData.phone_mobile = newEmployee.phone_mobile
    if (newEmployee.department_id) insertData.department_id = newEmployee.department_id
    if (newEmployee.position_id) insertData.position_id = newEmployee.position_id
    if (newEmployee.manager_employee_id) insertData.manager_employee_id = newEmployee.manager_employee_id
    if (newEmployee.location_id) insertData.location_id = newEmployee.location_id
    if (newEmployee.hire_date) insertData.hire_date = newEmployee.hire_date
    if (newEmployee.notes_internal) insertData.notes_internal = newEmployee.notes_internal
    
    const { data, error } = await supabase
      .from('employees')
      .insert(insertData)
      .select()
      .single()
    
    if (error) throw error
    
    // 3. Send email invitation if requested
    if (newEmployee.send_invite && data) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          const response = await $fetch('/api/admin/users/invite', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`
            },
            body: {
              email: newEmployee.email_work,
              firstName: newEmployee.first_name,
              lastName: newEmployee.last_name,
              employeeId: data.id,
              profileId: profileData.id
            }
          })
          
          if (response.success) {
            uiStore.showSuccess(`${newEmployee.first_name} ${newEmployee.last_name} added and invitation sent!`)
          } else {
            uiStore.showSuccess(`${newEmployee.first_name} ${newEmployee.last_name} added! (Invitation could not be sent)`)
          }
        } else {
          uiStore.showSuccess(`${newEmployee.first_name} ${newEmployee.last_name} added! (Login required to send invitation)`)
        }
      } catch (inviteError: any) {
        console.error('Failed to send invitation:', inviteError)
        uiStore.showSuccess(`${newEmployee.first_name} ${newEmployee.last_name} added! (Invitation failed: ${inviteError.data?.message || inviteError.message || 'Unknown error'})`)
      }
    } else {
      uiStore.showSuccess(`${newEmployee.first_name} ${newEmployee.last_name} added successfully!`)
    }
    
    closeAddDialog()
    await refreshData()
  } catch (error: any) {
    console.error('Create employee error:', error)
    uiStore.showError(error.message || 'Failed to create employee')
  } finally {
    isSaving.value = false
  }
}

// Initialize data on mount
onMounted(async () => {
  if (employees.value.length === 0) {
    await fetchGlobalData()
  }
  await loadLocations()
})
</script>

<style scoped>
.roster-page {
  min-height: 100%;
}

.roster-table :deep(tbody tr) {
  cursor: default;
}

.roster-table--clickable :deep(tbody tr) {
  cursor: pointer;
}

.roster-table--clickable :deep(tbody tr:hover) {
  background-color: rgba(var(--v-theme-primary), 0.04) !important;
}

.employee-card {
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: default;
}

.employee-card--clickable {
  cursor: pointer;
}

.employee-card--clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
