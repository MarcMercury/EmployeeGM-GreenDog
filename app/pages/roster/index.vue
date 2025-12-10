<template>
  <div class="roster-page">
    <!-- Top Action Bar -->
    <div class="roster-header d-flex align-center justify-space-between mb-4">
      <div class="d-flex align-center gap-4">
        <h1 class="text-h4 font-weight-bold">Roster</h1>
        <v-chip color="primary" variant="tonal" size="small">
          {{ activeEmployees.length }} Active
        </v-chip>
      </div>
      
      <div class="d-flex align-center gap-2">
        <v-btn-toggle v-model="viewMode" mandatory density="compact" color="primary" rounded="lg">
          <v-btn value="cards" icon="mdi-view-grid" size="small" />
          <v-btn value="table" icon="mdi-table" size="small" />
        </v-btn-toggle>
        
        <v-btn
          v-if="isAdmin"
          color="primary"
          prepend-icon="mdi-account-plus"
          variant="elevated"
          @click="addEmployeeDialog = true"
        >
          Add Member
        </v-btn>
      </div>
    </div>

    <!-- Filters Bar -->
    <v-card class="filters-bar mb-6" flat>
      <v-card-text class="pa-3">
        <v-row dense align="center">
          <v-col cols="12" md="4">
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              placeholder="Search by name, role, or skill..."
              variant="solo-filled"
              density="compact"
              hide-details
              clearable
              bg-color="grey-lighten-4"
              flat
            />
          </v-col>
          <v-col cols="6" md="2">
            <v-select
              v-model="filterDepartment"
              :items="departmentOptions"
              label="Department"
              variant="solo-filled"
              density="compact"
              hide-details
              clearable
              bg-color="grey-lighten-4"
              flat
            />
          </v-col>
          <v-col cols="6" md="2">
            <v-select
              v-model="filterPosition"
              :items="positionOptions"
              label="Position"
              variant="solo-filled"
              density="compact"
              hide-details
              clearable
              bg-color="grey-lighten-4"
              flat
            />
          </v-col>
          <v-col cols="6" md="2">
            <v-select
              v-model="filterStatus"
              :items="statusOptions"
              label="Status"
              variant="solo-filled"
              density="compact"
              hide-details
              clearable
              bg-color="grey-lighten-4"
              flat
            />
          </v-col>
          <v-col cols="6" md="2" class="d-flex justify-end">
            <v-chip-group v-model="filterQuick" column>
              <v-chip filter value="mentors" size="small" color="green">
                Mentors
              </v-chip>
              <v-chip filter value="new" size="small" color="blue">
                New Hires
              </v-chip>
            </v-chip-group>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="48" />
      <p class="text-grey mt-4">Loading roster...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredEmployees.length === 0" class="text-center py-12">
      <v-icon size="80" color="grey-lighten-2">mdi-account-group-outline</v-icon>
      <h3 class="text-h6 mt-4 text-grey-darken-1">No team members found</h3>
      <p class="text-body-2 text-grey">Adjust filters or add new team members</p>
    </div>

    <!-- Cards Grid View -->
    <v-row v-else-if="viewMode === 'cards'" class="roster-grid">
      <v-col
        v-for="employee in filteredEmployees"
        :key="employee.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
        xl="2"
      >
        <v-card 
          class="roster-card" 
          hover
          @click="openDrawer(employee)"
        >
          <div class="roster-card-header" :class="getStatusClass(employee)">
            <v-avatar 
              size="72" 
              class="roster-avatar"
              :color="employee.avatar_url ? undefined : 'white'"
            >
              <v-img v-if="employee.avatar_url" :src="employee.avatar_url" />
              <span v-else class="text-h5 font-weight-bold" :style="{ color: 'var(--v-theme-primary)' }">
                {{ getInitials(employee) }}
              </span>
            </v-avatar>
            
            <!-- Status indicator -->
            <v-chip 
              class="status-chip" 
              :color="employee.is_active ? 'success' : 'grey'" 
              size="x-small"
              variant="elevated"
            >
              {{ employee.is_active ? 'Active' : 'Inactive' }}
            </v-chip>
          </div>
          
          <v-card-text class="text-center pt-2 pb-3">
            <h3 class="text-subtitle-1 font-weight-bold mb-0">
              {{ employee.first_name }} {{ employee.last_name }}
            </h3>
            <p class="text-caption text-grey-darken-1 mb-2">
              {{ employee.position || 'Team Member' }}
            </p>
            
            <!-- Quick Stats -->
            <div class="d-flex justify-center gap-4 mt-2">
              <div class="text-center">
                <div class="text-h6 font-weight-bold text-primary">
                  {{ getEmployeeStats(employee).totalSkills }}
                </div>
                <div class="text-caption text-grey">Skills</div>
              </div>
              <div class="text-center">
                <div class="text-h6 font-weight-bold" :class="getMentorColor(employee)">
                  {{ getEmployeeStats(employee).mentorSkills }}
                </div>
                <div class="text-caption text-grey">Mastered</div>
              </div>
            </div>
            
            <!-- Role Badge -->
            <v-chip 
              v-if="employee.role === 'admin'" 
              color="purple" 
              size="x-small" 
              variant="tonal"
              class="mt-2"
            >
              Admin
            </v-chip>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Table View -->
    <v-card v-else flat>
      <v-data-table
        :headers="tableHeaders"
        :items="filteredEmployees"
        hover
        class="roster-table"
        @click:row="(_, { item }) => openDrawer(item)"
      >
        <template #item.name="{ item }">
          <div class="d-flex align-center gap-3 py-2">
            <v-avatar size="40" :color="item.avatar_url ? undefined : 'primary'">
              <v-img v-if="item.avatar_url" :src="item.avatar_url" />
              <span v-else class="text-white font-weight-medium">
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

        <template #item.position="{ item }">
          <span class="text-body-2">{{ item.position || '-' }}</span>
        </template>

        <template #item.skills="{ item }">
          <div class="d-flex align-center gap-2">
            <v-chip size="small" color="primary" variant="tonal">
              {{ getEmployeeStats(item).totalSkills }} skills
            </v-chip>
            <v-chip 
              v-if="getEmployeeStats(item).mentorSkills > 0" 
              size="small" 
              color="success" 
              variant="tonal"
            >
              {{ getEmployeeStats(item).mentorSkills }} mastered
            </v-chip>
          </div>
        </template>

        <template #item.tenure="{ item }">
          <span class="text-body-2">{{ calculateTenure(item.hire_date) }}</span>
        </template>

        <template #item.status="{ item }">
          <v-chip 
            :color="item.is_active ? 'success' : 'grey'" 
            size="small" 
            variant="flat"
          >
            {{ item.is_active ? 'Active' : 'Inactive' }}
          </v-chip>
        </template>

        <template #item.actions="{ item }">
          <v-btn
            icon="mdi-chevron-right"
            size="small"
            variant="text"
            @click.stop="openDrawer(item)"
          />
        </template>
      </v-data-table>
    </v-card>

    <!-- Employee Detail Drawer -->
    <v-navigation-drawer
      v-model="drawerOpen"
      location="right"
      width="420"
      temporary
      class="employee-drawer"
    >
      <template v-if="selectedEmployee">
        <div class="drawer-header pa-6" :class="getStatusClass(selectedEmployee)">
          <div class="d-flex justify-space-between align-start mb-4">
            <v-btn 
              icon="mdi-close" 
              variant="text" 
              size="small"
              @click="drawerOpen = false"
            />
            <div class="d-flex gap-1">
              <v-btn 
                icon="mdi-open-in-new" 
                variant="text" 
                size="small"
                :to="`/employees/${selectedEmployee.id}`"
              />
              <v-btn 
                v-if="isAdmin"
                icon="mdi-pencil" 
                variant="text" 
                size="small"
                @click="editEmployee(selectedEmployee.id)"
              />
            </div>
          </div>
          
          <div class="text-center">
            <v-avatar 
              size="100" 
              class="mb-3 elevation-3"
              :color="selectedEmployee.avatar_url ? undefined : 'white'"
            >
              <v-img v-if="selectedEmployee.avatar_url" :src="selectedEmployee.avatar_url" />
              <span v-else class="text-h4 font-weight-bold" :style="{ color: 'var(--v-theme-primary)' }">
                {{ getInitials(selectedEmployee) }}
              </span>
            </v-avatar>
            
            <h2 class="text-h5 font-weight-bold mb-1">
              {{ selectedEmployee.first_name }} {{ selectedEmployee.last_name }}
            </h2>
            <p class="text-body-1 opacity-90 mb-2">
              {{ selectedEmployee.position || 'Team Member' }}
            </p>
            
            <div class="d-flex justify-center gap-2">
              <v-chip 
                :color="selectedEmployee.is_active ? 'success' : 'grey'" 
                size="small"
                variant="elevated"
              >
                {{ selectedEmployee.is_active ? 'Active' : 'Inactive' }}
              </v-chip>
              <v-chip 
                v-if="selectedEmployee.role === 'admin'" 
                color="purple" 
                size="small"
                variant="elevated"
              >
                Admin
              </v-chip>
            </div>
          </div>
        </div>
        
        <v-divider />
        
        <!-- Stats Grid -->
        <div class="pa-4">
          <h4 class="text-overline text-grey mb-3">STATS</h4>
          <v-row dense>
            <v-col cols="4">
              <div class="stat-box text-center pa-3 rounded-lg">
                <div class="text-h5 font-weight-bold text-primary">
                  {{ getEmployeeStats(selectedEmployee).totalSkills }}
                </div>
                <div class="text-caption text-grey">Skills</div>
              </div>
            </v-col>
            <v-col cols="4">
              <div class="stat-box text-center pa-3 rounded-lg">
                <div class="text-h5 font-weight-bold text-success">
                  {{ getEmployeeStats(selectedEmployee).mentorSkills }}
                </div>
                <div class="text-caption text-grey">Mastered</div>
              </div>
            </v-col>
            <v-col cols="4">
              <div class="stat-box text-center pa-3 rounded-lg">
                <div class="text-h5 font-weight-bold text-blue">
                  {{ calculateTenure(selectedEmployee.hire_date) }}
                </div>
                <div class="text-caption text-grey">Tenure</div>
              </div>
            </v-col>
          </v-row>
        </div>
        
        <v-divider />
        
        <!-- Contact Info -->
        <div class="pa-4">
          <h4 class="text-overline text-grey mb-3">CONTACT</h4>
          <v-list density="compact" class="bg-transparent">
            <v-list-item prepend-icon="mdi-email-outline">
              <v-list-item-title class="text-body-2">
                {{ selectedEmployee.email }}
              </v-list-item-title>
            </v-list-item>
            <v-list-item v-if="selectedEmployee.phone" prepend-icon="mdi-phone-outline">
              <v-list-item-title class="text-body-2">
                {{ selectedEmployee.phone }}
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </div>
        
        <v-divider />
        
        <!-- Top Skills -->
        <div class="pa-4">
          <h4 class="text-overline text-grey mb-3">TOP SKILLS</h4>
          <div v-if="topSkills.length > 0" class="d-flex flex-wrap gap-2">
            <v-chip
              v-for="skill in topSkills"
              :key="skill.id"
              :color="getSkillColor(skill.level)"
              size="small"
              variant="tonal"
            >
              {{ skill.skill?.name || 'Unknown' }}
              <template #append>
                <v-icon size="x-small" class="ml-1">
                  {{ getSkillIcon(skill.level) }}
                </v-icon>
              </template>
            </v-chip>
          </div>
          <p v-else class="text-body-2 text-grey">No skills recorded yet</p>
        </div>
        
        <v-divider />
        
        <!-- Quick Actions -->
        <div class="pa-4">
          <h4 class="text-overline text-grey mb-3">ACTIONS</h4>
          <v-row dense>
            <v-col cols="6">
              <v-btn
                block
                variant="tonal"
                color="primary"
                prepend-icon="mdi-calendar"
                size="small"
                :to="`/schedule?employee=${selectedEmployee.id}`"
              >
                Schedule
              </v-btn>
            </v-col>
            <v-col cols="6">
              <v-btn
                block
                variant="tonal"
                color="secondary"
                prepend-icon="mdi-school"
                size="small"
                :to="`/skills?employee=${selectedEmployee.id}`"
              >
                Skills
              </v-btn>
            </v-col>
          </v-row>
        </div>
      </template>
    </v-navigation-drawer>

    <!-- Add Employee Dialog -->
    <v-dialog v-model="addEmployeeDialog" max-width="500">
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center pa-4">
          <span class="text-h6">Add Team Member</span>
          <v-btn icon="mdi-close" variant="text" size="small" @click="addEmployeeDialog = false" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <v-form ref="addFormRef">
            <v-row dense>
              <v-col cols="6">
                <v-text-field
                  v-model="newEmployee.first_name"
                  label="First Name"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Required']"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="newEmployee.last_name"
                  label="Last Name"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Required']"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="newEmployee.email"
                  label="Email"
                  type="email"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Required', v => /.+@.+/.test(v) || 'Invalid email']"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="newEmployee.password"
                  label="Initial Password"
                  type="password"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Required', v => v.length >= 6 || 'Min 6 characters']"
                />
              </v-col>
              <v-col cols="6">
                <v-select
                  v-model="newEmployee.role"
                  :items="['user', 'admin']"
                  label="Role"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="newEmployee.position"
                  label="Position"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="addEmployeeDialog = false">Cancel</v-btn>
          <v-btn 
            color="primary" 
            variant="elevated" 
            :loading="isSaving" 
            @click="createEmployee"
          >
            Add Member
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import type { ProfileWithSkills, EmployeeSkill, SkillLevel } from '~/types/database.types'
import { getSkillCategory } from '~/types/database.types'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const router = useRouter()
const authStore = useAuthStore()
const employeeStore = useEmployeeStore()
const uiStore = useUIStore()

// State
const search = ref('')
const viewMode = ref<'cards' | 'table'>('cards')
const filterDepartment = ref<string | null>(null)
const filterPosition = ref<string | null>(null)
const filterStatus = ref<string | null>(null)
const filterQuick = ref<string | null>(null)
const drawerOpen = ref(false)
const selectedEmployee = ref<ProfileWithSkills | null>(null)
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

// Computed
const isAdmin = computed(() => authStore.isAdmin)
const isLoading = computed(() => employeeStore.isLoading)
const employees = computed(() => employeeStore.employees)
const activeEmployees = computed(() => employees.value.filter(e => e.is_active))

const departmentOptions = computed(() => {
  const depts = new Set(employees.value.map(e => e.department?.name).filter(Boolean))
  return Array.from(depts).map(d => ({ title: d, value: d }))
})

const positionOptions = computed(() => {
  const positions = new Set(employees.value.map(e => e.position).filter(Boolean))
  return Array.from(positions).map(p => ({ title: p, value: p }))
})

const statusOptions = [
  { title: 'Active', value: 'active' },
  { title: 'Inactive', value: 'inactive' }
]

const tableHeaders = [
  { title: 'Employee', key: 'name', sortable: true },
  { title: 'Position', key: 'position', sortable: true },
  { title: 'Skills', key: 'skills', sortable: false },
  { title: 'Tenure', key: 'tenure', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: '', key: 'actions', sortable: false, align: 'end' as const }
]

const filteredEmployees = computed(() => {
  let result = employees.value

  // Search filter
  if (search.value) {
    const query = search.value.toLowerCase()
    result = result.filter(e =>
      e.first_name?.toLowerCase().includes(query) ||
      e.last_name?.toLowerCase().includes(query) ||
      e.email.toLowerCase().includes(query) ||
      e.position?.toLowerCase().includes(query) ||
      e.employee_skills?.some(s => s.skill?.name?.toLowerCase().includes(query))
    )
  }

  // Department filter
  if (filterDepartment.value) {
    result = result.filter(e => e.department?.name === filterDepartment.value)
  }

  // Position filter
  if (filterPosition.value) {
    result = result.filter(e => e.position === filterPosition.value)
  }

  // Status filter
  if (filterStatus.value) {
    result = result.filter(e => 
      filterStatus.value === 'active' ? e.is_active : !e.is_active
    )
  }

  // Quick filters
  if (filterQuick.value === 'mentors') {
    result = result.filter(e => 
      e.employee_skills?.some(s => s.level === 5)
    )
  } else if (filterQuick.value === 'new') {
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    result = result.filter(e => 
      e.hire_date && new Date(e.hire_date) > threeMonthsAgo
    )
  }

  return result
})

const topSkills = computed(() => {
  if (!selectedEmployee.value?.employee_skills) return []
  return [...selectedEmployee.value.employee_skills]
    .sort((a, b) => b.level - a.level)
    .slice(0, 6)
})

// Methods
function getInitials(employee: ProfileWithSkills): string {
  const first = employee.first_name?.[0] || ''
  const last = employee.last_name?.[0] || ''
  return (first + last).toUpperCase() || employee.email[0].toUpperCase()
}

function getEmployeeStats(employee: ProfileWithSkills) {
  const skills = employee.employee_skills || []
  return {
    totalSkills: skills.length,
    averageSkillLevel: skills.length > 0 
      ? Math.round((skills.reduce((sum, s) => sum + s.level, 0) / skills.length) * 10) / 10
      : 0,
    mentorSkills: skills.filter(s => s.level === 5).length
  }
}

function calculateTenure(hireDate: string | null): string {
  if (!hireDate) return '-'
  
  const hire = new Date(hireDate)
  const now = new Date()
  const years = Math.floor((now.getTime() - hire.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  
  if (years < 1) {
    const months = Math.floor((now.getTime() - hire.getTime()) / (30.44 * 24 * 60 * 60 * 1000))
    return `${months}mo`
  }
  return `${years}yr`
}

function getStatusClass(employee: ProfileWithSkills): string {
  return employee.is_active ? 'status-active' : 'status-inactive'
}

function getMentorColor(employee: ProfileWithSkills): string {
  const stats = getEmployeeStats(employee)
  if (stats.mentorSkills >= 3) return 'text-success'
  if (stats.mentorSkills >= 1) return 'text-blue'
  return 'text-grey'
}

function getSkillColor(level: SkillLevel): string {
  const category = getSkillCategory(level)
  switch (category) {
    case 'learning': return 'orange'
    case 'competent': return 'blue'
    case 'mentor': return 'green'
  }
}

function getSkillIcon(level: SkillLevel): string {
  const category = getSkillCategory(level)
  switch (category) {
    case 'learning': return 'mdi-school'
    case 'competent': return 'mdi-check-circle'
    case 'mentor': return 'mdi-star'
  }
}

function openDrawer(employee: ProfileWithSkills) {
  selectedEmployee.value = employee
  drawerOpen.value = true
}

function editEmployee(id: string) {
  drawerOpen.value = false
  router.push(`/employees/${id}`)
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
    uiStore.showSuccess('Team member added successfully')
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
    uiStore.showError(error instanceof Error ? error.message : 'Failed to add team member')
  } finally {
    isSaving.value = false
  }
}

// Lifecycle
onMounted(() => {
  employeeStore.fetchEmployees()
})
</script>

<style scoped>
.roster-page {
  max-width: 1600px;
  margin: 0 auto;
}

.filters-bar {
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.roster-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
  overflow: hidden;
}

.roster-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.roster-card-header {
  position: relative;
  padding: 24px 16px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.roster-card-header.status-active {
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, rgba(var(--v-theme-primary), 0.8) 100%);
}

.roster-card-header.status-inactive {
  background: linear-gradient(135deg, #757575 0%, #9e9e9e 100%);
}

.roster-avatar {
  border: 3px solid white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.status-chip {
  position: absolute;
  top: 8px;
  right: 8px;
}

.stat-box {
  background: rgba(0, 0, 0, 0.03);
}

.roster-table {
  cursor: pointer;
}

.roster-table :deep(tbody tr:hover) {
  background-color: rgba(var(--v-theme-primary), 0.04) !important;
}

.employee-drawer {
  border-left: 1px solid rgba(0, 0, 0, 0.12);
}

.drawer-header {
  color: white;
}

.drawer-header.status-active {
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, rgba(var(--v-theme-primary), 0.85) 100%);
}

.drawer-header.status-inactive {
  background: linear-gradient(135deg, #757575 0%, #9e9e9e 100%);
}

.drawer-header .v-btn {
  color: white;
}
</style>
