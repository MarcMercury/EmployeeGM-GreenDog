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

    <!-- Filters Card -->
    <v-card rounded="lg" class="mb-4" elevation="1">
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
    <v-card v-else-if="viewMode === 'table'" rounded="lg" elevation="1">
      <v-data-table
        :headers="tableHeaders"
        :items="filteredEmployees"
        :items-per-page="25"
        :items-per-page-options="[10, 25, 50, 100]"
        hover
        density="comfortable"
        :class="['roster-table', { 'roster-table--clickable': isAdmin }]"
        @click:row="(_, { item }) => isAdmin && viewEmployee(item.id)"
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
          :class="['employee-card', 'h-100', { 'employee-card--clickable': isAdmin }]"
          @click="isAdmin && viewEmployee(emp.id)"
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
    <v-dialog v-model="showAddDialog" max-width="600">
      <v-card>
        <v-card-title class="d-flex align-center">
          <span>Add New Employee</span>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" @click="showAddDialog = false" />
        </v-card-title>
        <v-divider />
        <v-card-text>
          <v-form ref="addFormRef">
            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="newEmployee.first_name"
                  label="First Name"
                  :rules="[v => !!v || 'Required']"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="newEmployee.last_name"
                  label="Last Name"
                  :rules="[v => !!v || 'Required']"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="newEmployee.email"
                  label="Email"
                  type="email"
                  :rules="[v => !!v || 'Required', v => /.+@.+/.test(v) || 'Invalid email']"
                />
              </v-col>
              <v-col cols="6">
                <v-select
                  v-model="newEmployee.department_id"
                  :items="departmentsList"
                  item-title="name"
                  item-value="id"
                  label="Department"
                />
              </v-col>
              <v-col cols="6">
                <v-select
                  v-model="newEmployee.position_id"
                  :items="positionsList"
                  item-title="title"
                  item-value="id"
                  label="Position"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showAddDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" :loading="isSaving" @click="createEmployee">
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

const newEmployee = reactive({
  first_name: '',
  last_name: '',
  email: '',
  department_id: null as string | null,
  position_id: null as string | null
})

// Table headers
const tableHeaders = [
  { title: 'Employee', key: 'name', sortable: true },
  { title: 'Position', key: 'position', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Skills', key: 'skills', sortable: false },
  { title: 'Location', key: 'location', sortable: true },
  { title: '', key: 'actions', sortable: false, align: 'end' as const }
]

// Department filter options
const departments = computed(() => {
  const depts = new Set(employees.value.map(e => e.department?.name).filter(Boolean))
  return ['All', ...Array.from(depts).sort()]
})

// Status options
const statusOptions = ['active', 'on_leave', 'inactive', 'terminated']

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

async function createEmployee() {
  const { valid } = await addFormRef.value?.validate()
  if (!valid) return
  
  isSaving.value = true
  try {
    const client = useSupabaseClient()
    
    const { error } = await client
      .from('employees')
      .insert({
        first_name: newEmployee.first_name,
        last_name: newEmployee.last_name,
        email_work: newEmployee.email,
        department_id: newEmployee.department_id,
        position_id: newEmployee.position_id,
        employment_status: 'active'
      })
    
    if (error) throw error
    
    showAddDialog.value = false
    uiStore.showSuccess('Employee added successfully')
    await refreshData()
    
    // Reset form
    Object.assign(newEmployee, {
      first_name: '',
      last_name: '',
      email: '',
      department_id: null,
      position_id: null
    })
  } catch (error: any) {
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
