<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Team</h1>
        <p class="text-body-1 text-grey-darken-1">
          {{ employees.length }} team members
        </p>
      </div>
      <v-btn
        v-if="isAdmin"
        color="primary"
        prepend-icon="mdi-plus"
        @click="addEmployeeDialog = true"
      >
        Add Employee
      </v-btn>
    </div>

    <!-- Filters -->
    <v-card rounded="lg" class="mb-6">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              label="Search employees..."
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="3">
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
          <v-col cols="12" md="3">
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
          <v-col cols="12" md="2">
            <v-btn-toggle v-model="viewMode" mandatory density="compact" color="primary">
              <v-btn value="grid" icon="mdi-view-grid" />
              <v-btn value="list" icon="mdi-view-list" />
            </v-btn-toggle>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="48" />
      <p class="text-grey mt-4">Loading team members...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredEmployees.length === 0" class="text-center py-12">
      <v-icon size="64" color="grey-lighten-1">mdi-account-group</v-icon>
      <h3 class="text-h6 mt-4">No employees found</h3>
      <p class="text-grey">Try adjusting your search or filters</p>
    </div>

    <!-- Grid View -->
    <v-row v-else-if="viewMode === 'grid'">
      <v-col
        v-for="employee in filteredEmployees"
        :key="employee.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <EmployeeBaseballCard
          :profile="employee"
          @click="viewEmployee(employee.id)"
        />
      </v-col>
    </v-row>

    <!-- List View -->
    <v-card v-else rounded="lg">
      <v-data-table
        :headers="tableHeaders"
        :items="filteredEmployees"
        :search="search"
        hover
        class="employee-table"
        @click:row="(_, { item }) => viewEmployee(item.id)"
      >
        <template #item.name="{ item }">
          <div class="d-flex align-center gap-3">
            <v-avatar size="40" :color="item.avatar_url ? undefined : 'primary'">
              <v-img v-if="item.avatar_url" :src="item.avatar_url" />
              <span v-else class="text-white font-weight-bold">
                {{ getInitials(item) }}
              </span>
            </v-avatar>
            <div>
              <div class="font-weight-medium">
                {{ item.first_name }} {{ item.last_name }}
              </div>
              <div class="text-caption text-grey">{{ item.email }}</div>
            </div>
          </div>
        </template>

        <template #item.role="{ item }">
          <v-chip :color="item.role === 'admin' ? 'purple' : 'blue'" size="small" variant="tonal">
            {{ item.role }}
          </v-chip>
        </template>

        <template #item.skills="{ item }">
          <div class="d-flex align-center gap-1">
            <span class="text-body-2">{{ item.employee_skills?.length || 0 }}</span>
            <v-icon size="16" color="grey">mdi-star</v-icon>
          </div>
        </template>

        <template #item.status="{ item }">
          <v-chip :color="item.is_active ? 'success' : 'grey'" size="small" variant="flat">
            {{ item.is_active ? 'Active' : 'Inactive' }}
          </v-chip>
        </template>

        <template #item.actions="{ item }">
          <v-btn
            icon="mdi-eye"
            size="small"
            variant="text"
            @click.stop="viewEmployee(item.id)"
          />
          <v-btn
            v-if="isAdmin"
            icon="mdi-pencil"
            size="small"
            variant="text"
            @click.stop="editEmployee(item.id)"
          />
        </template>
      </v-data-table>
    </v-card>

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
import type { ProfileWithSkills } from '~/types/database.types'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const router = useRouter()
const authStore = useAuthStore()
const employeeStore = useEmployeeStore()
const uiStore = useUIStore()

const isAdmin = computed(() => authStore.isAdmin)
const isLoading = computed(() => employeeStore.isLoading)

const search = ref('')
const filterRole = ref<string | null>(null)
const filterDepartment = ref<string | null>(null)
const viewMode = ref<'grid' | 'list'>('grid')

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

const departmentOptions = computed(() => {
  // Will be populated from departments
  return []
})

const tableHeaders = [
  { title: 'Employee', key: 'name', sortable: true },
  { title: 'Position', key: 'position', sortable: true },
  { title: 'Role', key: 'role', sortable: true },
  { title: 'Skills', key: 'skills', sortable: false },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const }
]

const employees = computed(() => employeeStore.employees)

const filteredEmployees = computed(() => {
  let result = employees.value

  if (search.value) {
    const query = search.value.toLowerCase()
    result = result.filter(e =>
      e.first_name?.toLowerCase().includes(query) ||
      e.last_name?.toLowerCase().includes(query) ||
      e.email.toLowerCase().includes(query) ||
      e.position?.toLowerCase().includes(query)
    )
  }

  if (filterRole.value) {
    result = result.filter(e => e.role === filterRole.value)
  }

  if (filterDepartment.value) {
    result = result.filter(e => e.department_id === filterDepartment.value)
  }

  return result
})

function getInitials(employee: ProfileWithSkills): string {
  const first = employee.first_name?.[0] || ''
  const last = employee.last_name?.[0] || ''
  return (first + last).toUpperCase() || employee.email[0].toUpperCase()
}

function viewEmployee(id: string) {
  router.push(`/employees/${id}`)
}

function editEmployee(id: string) {
  router.push(`/employees/${id}/edit`)
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
    await employeeStore.fetchEmployees()
    
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

onMounted(() => {
  employeeStore.fetchEmployees()
})
</script>

<style scoped>
.employee-table {
  cursor: pointer;
}

.employee-table :deep(tbody tr:hover) {
  background-color: rgba(0, 0, 0, 0.02);
}
</style>
