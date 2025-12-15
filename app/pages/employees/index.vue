<template>
  <div class="employees-page">
    <!-- Desktop-First Header with 12-col grid -->
    <div class="page-header d-flex align-center justify-space-between mb-4">
      <div>
        <h1 class="text-h5 text-md-h4 font-weight-bold mb-1">Team Directory</h1>
        <p class="text-body-2 text-grey-darken-1">
          {{ filteredEmployees.length }} of {{ employees.length }} team members
        </p>
      </div>
      <v-btn
        v-if="isAdmin"
        color="primary"
        prepend-icon="mdi-plus"
        size="default"
        @click="addEmployeeDialog = true"
      >
        Add Employee
      </v-btn>
    </div>

    <!-- Desktop-First Filters (Dense Toolbar) -->
    <v-card rounded="lg" class="mb-4 filter-card" elevation="1">
      <v-card-text class="py-3">
        <v-row dense align="center">
          <v-col cols="12" sm="6" md="3" lg="3">
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              placeholder="Search employees..."
              variant="outlined"
              density="compact"
              hide-details
              clearable
              single-line
            />
          </v-col>
          <v-col cols="6" sm="3" md="2" lg="2">
            <v-select
              v-model="filterRole"
              :items="roleOptions"
              label="Role"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="6" sm="3" md="2" lg="2">
            <v-select
              v-model="filterDepartment"
              :items="departmentOptions"
              label="Department"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" sm="12" md="3" lg="3" class="d-flex justify-end gap-2">
            <!-- Desktop: Dense table view by default -->
            <v-btn-toggle v-model="viewMode" mandatory density="compact" color="primary" class="view-toggle">
              <v-btn value="table" size="small">
                <v-icon size="18">mdi-table</v-icon>
                <span class="ml-1 d-none d-md-inline text-caption">Table</span>
              </v-btn>
              <v-btn value="grid" size="small">
                <v-icon size="18">mdi-view-grid</v-icon>
                <span class="ml-1 d-none d-md-inline text-caption">Cards</span>
              </v-btn>
            </v-btn-toggle>
            <v-btn
              icon="mdi-refresh"
              size="small"
              variant="text"
              :loading="isLoading"
              @click="refresh"
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Skeleton Loading State (Never show spinners!) -->
    <UiSkeletonTable
      v-if="isLoading && employees.length === 0"
      :rows="8"
      :columns="3"
      :show-header="false"
      :show-filters="false"
    />

    <!-- Empty State - No Employees at All -->
    <UiEmptyState
      v-else-if="employees.length === 0"
      type="employees"
      title="No team members yet"
      description="Start building your team by adding your first employee."
      action-text="Add Your First Employee"
      action-icon="mdi-account-plus"
      @action="addEmployeeDialog = true"
    />

    <!-- Empty State - No Results from Filter -->
    <UiEmptyState
      v-else-if="filteredEmployees.length === 0"
      type="search"
      title="No matches found"
      description="Try adjusting your search terms or clearing filters."
      action-text="Clear Filters"
      action-icon="mdi-filter-remove"
      action-variant="outlined"
      @action="clearFilters"
    />

    <!-- DESKTOP-FIRST: Dense Data Table (default view) -->
    <v-card v-else-if="viewMode === 'table'" rounded="lg" elevation="1" class="employee-table-card">
      <v-data-table
        :headers="tableHeaders"
        :items="filteredEmployees"
        :search="search"
        :items-per-page="25"
        :items-per-page-options="[10, 25, 50, 100]"
        hover
        density="comfortable"
        class="employee-table desktop-dense-table"
        @click:row="(_, { item }) => viewEmployee(item.id)"
      >
        <!-- Employee Name + Avatar with Hover Card -->
        <template #item.name="{ item }">
          <EmployeeHoverCard :employee="item">
            <template #default="{ props }">
              <div class="d-flex align-center gap-2 py-1 hoverable-row" v-bind="props">
                <v-avatar size="32" :color="item.avatar_url ? undefined : 'primary'">
                  <v-img v-if="item.avatar_url" :src="item.avatar_url" />
                  <span v-else class="text-white text-caption font-weight-bold">
                    {{ item.initials }}
                  </span>
                </v-avatar>
                <div class="employee-name-cell">
                  <div class="font-weight-medium text-body-2">
                    {{ item.full_name }}
                  </div>
                  <div class="text-caption text-grey">{{ item.email }}</div>
                </div>
              </div>
            </template>
          </EmployeeHoverCard>
        </template>

        <!-- Position + Department -->
        <template #item.position="{ item }">
          <div>
            <div class="text-body-2">{{ item.position?.title || '—' }}</div>
            <div v-if="item.department" class="text-caption text-grey">
              {{ item.department.name }}
            </div>
          </div>
        </template>

        <!-- Hire Date + Tenure -->
        <template #item.hire_date="{ item }">
          <div v-if="item.hire_date">
            <div class="text-body-2">{{ formatDate(item.hire_date) }}</div>
            <div class="text-caption text-grey">{{ item.tenure_months }} mo</div>
          </div>
          <span v-else class="text-grey">—</span>
        </template>

        <!-- Skills Summary -->
        <template #item.skills="{ item }">
          <div class="d-flex align-center gap-1">
            <v-chip size="x-small" color="primary" variant="tonal">
              {{ item.total_skills }} skills
            </v-chip>
            <v-chip v-if="item.avg_skill_level > 0" size="x-small" variant="outlined">
              Avg {{ item.avg_skill_level }}
            </v-chip>
            <v-icon v-if="item.mentor_skills > 0" size="16" color="amber">mdi-star</v-icon>
          </div>
        </template>

        <!-- Role Badge -->
        <template #item.role="{ item }">
          <v-chip 
            :color="item.role === 'admin' ? 'purple' : 'blue'" 
            size="x-small" 
            variant="flat"
          >
            {{ item.role }}
          </v-chip>
        </template>

        <!-- Status -->
        <template #item.status="{ item }">
          <v-chip 
            :color="item.is_active ? 'success' : 'grey'" 
            size="x-small" 
            variant="flat"
          >
            {{ item.is_active ? 'Active' : 'Inactive' }}
          </v-chip>
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <div class="d-flex justify-end">
            <v-btn
              icon="mdi-eye"
              size="x-small"
              variant="text"
              @click.stop="viewEmployee(item.id)"
            />
            <v-btn
              v-if="isAdmin"
              icon="mdi-pencil"
              size="x-small"
              variant="text"
              @click.stop="editEmployee(item.id)"
            />
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Mobile Card Grid View (fallback) -->
    <v-row v-else class="card-grid">
      <v-col
        v-for="employee in filteredEmployees"
        :key="employee.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
        xl="2"
      >
        <EmployeeBaseballCard
          :profile="employee"
          @click="viewEmployee(employee.id)"
        />
      </v-col>
    </v-row>

    <!-- Add Employee Dialog -->
    <v-dialog v-model="addEmployeeDialog" max-width="600">
      <v-card>
        <v-card-title>
          <span class="text-h6">Add New Employee</span>
        </v-card-title>
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
              <v-col cols="12">
                <v-text-field
                  v-model="newEmployee.password"
                  label="Initial Password"
                  type="password"
                  :rules="[v => !!v || 'Required', v => v.length >= 6 || 'Min 6 characters']"
                />
              </v-col>
              <v-col cols="6">
                <v-select
                  v-model="newEmployee.role"
                  :items="['user', 'admin']"
                  label="Role"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="newEmployee.position"
                  label="Position"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="addEmployeeDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="isSaving" @click="createEmployee">
            Create Employee
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import type { HydratedEmployee } from '~/composables/useEmployeeData'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const router = useRouter()
const authStore = useAuthStore()
const uiStore = useUIStore()

// Use global employee data composable (hydration layer)
const { 
  employees, 
  departments,
  isLoading, 
  refresh: refreshEmployeeData 
} = useEmployeeData()

const isAdmin = computed(() => authStore.isAdmin)

const search = ref('')
const filterRole = ref<string | null>(null)
const filterDepartment = ref<string | null>(null)
// Desktop-first: Default to table view for high-density display
const viewMode = ref<'table' | 'grid'>('table')

const addEmployeeDialog = ref(false)
const addFormRef = ref()
const isSaving = ref(false)

const newEmployee = reactive({
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  role: 'user',
  position: ''
})

const roleOptions = [
  { title: 'Admin', value: 'admin' },
  { title: 'User', value: 'user' }
]

// Use departments from global hydration layer
const departmentOptions = computed(() => 
  departments.value.map(d => ({ title: d.name, value: d.id }))
)

// Desktop-first: More columns for dense information display
const tableHeaders = [
  { title: 'Employee', key: 'name', sortable: true, width: '220px' },
  { title: 'Position', key: 'position', sortable: true, width: '180px' },
  { title: 'Hire Date', key: 'hire_date', sortable: true, width: '120px' },
  { title: 'Skills', key: 'skills', sortable: false, width: '150px' },
  { title: 'Role', key: 'role', sortable: true, width: '80px' },
  { title: 'Status', key: 'status', sortable: true, width: '80px' },
  { title: '', key: 'actions', sortable: false, align: 'end' as const, width: '80px' }
]

const filteredEmployees = computed((): HydratedEmployee[] => {
  let result = employees.value

  if (search.value) {
    const query = search.value.toLowerCase()
    result = result.filter(e =>
      e.first_name?.toLowerCase().includes(query) ||
      e.last_name?.toLowerCase().includes(query) ||
      e.full_name.toLowerCase().includes(query) ||
      e.email.toLowerCase().includes(query) ||
      e.position?.title?.toLowerCase().includes(query)
    )
  }

  if (filterRole.value) {
    result = result.filter(e => e.role === filterRole.value)
  }

  if (filterDepartment.value) {
    result = result.filter(e => e.department?.id === filterDepartment.value)
  }

  return result
})

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: '2-digit' 
  })
}

function viewEmployee(id: string) {
  router.push(`/roster/${id}`)
}

function editEmployee(id: string) {
  router.push(`/roster/${id}`)
}

function clearFilters() {
  search.value = ''
  filterRole.value = null
  filterDepartment.value = null
}

async function refresh() {
  await refreshEmployeeData()
}

async function createEmployee() {
  const { valid } = await addFormRef.value.validate()
  if (!valid) return

  isSaving.value = true
  try {
    await authStore.signUp(
      newEmployee.email,
      newEmployee.password,
      newEmployee.first_name,
      newEmployee.last_name
    )
    
    addEmployeeDialog.value = false
    uiStore.showSuccess('Employee created successfully')
    await refreshEmployeeData()
    
    // Reset form
    Object.assign(newEmployee, {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      role: 'user',
      position: ''
    })
  } catch (error) {
    uiStore.showError(error instanceof Error ? error.message : 'Failed to create employee')
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.employees-page {
  /* Desktop-first grid system */
}

/* Filter card - compact on desktop */
.filter-card {
  background: rgba(255, 255, 255, 0.9);
}

.v-theme--dark .filter-card {
  background: rgba(30, 30, 40, 0.9);
}

/* Desktop-First: Dense Data Table Styling */
.employee-table-card {
  overflow: hidden;
}

.employee-table {
  cursor: pointer;
}

.desktop-dense-table :deep(tbody tr) {
  height: 48px; /* Dense row height */
}

.desktop-dense-table :deep(tbody tr:hover) {
  background-color: rgba(var(--v-theme-primary), 0.04) !important;
}

.desktop-dense-table :deep(th) {
  font-size: 0.75rem !important;
  font-weight: 600 !important;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(0, 0, 0, 0.6);
  white-space: nowrap;
}

.v-theme--dark .desktop-dense-table :deep(th) {
  color: rgba(255, 255, 255, 0.6);
}

.employee-name-cell {
  min-width: 150px;
}

/* Hoverable employee name - indicates interactivity */
.hoverable-row {
  cursor: pointer;
  border-radius: 8px;
  padding: 4px 8px;
  margin: -4px -8px;
  transition: background-color 0.15s ease;
}

.hoverable-row:hover {
  background-color: rgba(var(--v-theme-primary), 0.08);
}

/* View toggle */
.view-toggle {
  border-radius: 8px;
  overflow: hidden;
}

/* Card grid for mobile fallback */
.card-grid {
  margin: -8px;
}

.card-grid > * {
  padding: 8px;
}

/* Responsive: Show cards on mobile */
@media (max-width: 959px) {
  .employee-table-card {
    display: none;
  }
}
</style>
