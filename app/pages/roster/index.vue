<template>
  <div class="roster-page">
    <!-- Page Header -->
    <div class="roster-header d-flex align-center justify-space-between mb-4 flex-wrap gap-3">
      <div class="d-flex align-center gap-4">
        <div>
          <h1 class="text-h4 font-weight-bold mb-1">Team Directory</h1>
          <p class="text-body-2 text-grey">
            {{ activeEmployees.length }} active • {{ clockedInCount }} on shift
          </p>
        </div>
      </div>
      
      <div class="d-flex align-center gap-2">
        <v-btn-toggle v-model="viewMode" mandatory density="compact" color="primary" rounded="lg">
          <v-btn value="cards" size="small">
            <v-icon start>mdi-view-grid</v-icon>
            Cards
          </v-btn>
          <v-btn value="table" size="small">
            <v-icon start>mdi-table</v-icon>
            Table
          </v-btn>
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
              placeholder="Search by name, position, or skill..."
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
          <v-col cols="12" md="4" class="d-flex align-center gap-2 justify-end">
            <v-chip-group v-model="filterQuick" class="flex-grow-0">
              <v-chip filter value="clocked_in" size="small" color="success">
                <v-icon start size="14">mdi-clock-check</v-icon>
                On Shift
              </v-chip>
              <v-chip filter value="mentors" size="small" color="amber-darken-2">
                <v-icon start size="14">mdi-star</v-icon>
                Mentors
              </v-chip>
              <v-chip filter value="new" size="small" color="info">
                <v-icon start size="14">mdi-account-plus</v-icon>
                New
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

    <!-- Cards Grid View (Depth Chart Style) -->
    <div v-else-if="viewMode === 'cards'" class="roster-grid">
      <RosterRosterCard
        v-for="employee in filteredEmployees"
        :key="employee.id"
        :employee="employee"
        @click="openDrawer"
      />
    </div>

    <!-- Table View -->
    <v-card v-else flat>
      <v-data-table
        :headers="tableHeaders"
        :items="filteredEmployees"
        :search="search"
        hover
        class="roster-table"
        @click:row="(_, { item }) => openDrawer(item)"
      >
        <template #item.name="{ item }">
          <div class="d-flex align-center gap-3 py-2">
            <div class="position-relative">
              <v-avatar size="44" :color="item.avatar_url ? undefined : getDepartmentColor(item.department?.name)">
                <v-img v-if="item.avatar_url" :src="item.avatar_url" />
                <span v-else class="text-white font-weight-medium">
                  {{ getInitials(item) }}
                </span>
              </v-avatar>
              <div 
                class="clock-indicator" 
                :class="item.clock_status === 'clocked_in' ? 'clock-indicator--in' : 'clock-indicator--out'"
              />
            </div>
            <div>
              <div class="font-weight-medium">
                {{ item.first_name }} {{ item.last_name }}
              </div>
              <div class="text-caption text-grey">{{ item.email }}</div>
            </div>
          </div>
        </template>

        <template #item.position="{ item }">
          <v-chip 
            :color="getDepartmentColor(item.department?.name)" 
            size="small"
            variant="flat"
          >
            {{ item.position?.title || 'Unassigned' }}
          </v-chip>
        </template>

        <template #item.department="{ item }">
          <span class="text-body-2">{{ item.department?.name || '-' }}</span>
        </template>

        <template #item.skills="{ item }">
          <div class="d-flex align-center gap-1">
            <span class="font-weight-bold">{{ item.skill_stats.total }}</span>
            <span class="text-caption text-grey">skills</span>
            <v-chip 
              v-if="item.skill_stats.mastered_count > 0" 
              size="x-small" 
              color="success" 
              variant="tonal"
              class="ml-1"
            >
              {{ item.skill_stats.mastered_count }} ★
            </v-chip>
          </div>
        </template>

        <template #item.level="{ item }">
          <div class="level-badge">
            <span class="level-badge__number">{{ item.player_level }}</span>
            <span class="level-badge__label">LVL</span>
          </div>
        </template>

        <template #item.status="{ item }">
          <v-chip 
            :color="item.clock_status === 'clocked_in' ? 'success' : 'grey'" 
            size="small" 
            variant="flat"
          >
            {{ item.clock_status === 'clocked_in' ? 'On Shift' : 'Off' }}
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
    <RosterRosterDrawer
      v-model="drawerOpen"
      :employee="selectedEmployee"
      @edit="editEmployee"
      @message="messageEmployee"
      @endorse="handleEndorse"
    />

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
                  v-model="newEmployee.department_id"
                  :items="departmentOptions"
                  label="Department"
                  variant="outlined"
                  density="compact"
                  clearable
                />
              </v-col>
              <v-col cols="6">
                <v-select
                  v-model="newEmployee.position_id"
                  :items="positionOptions"
                  label="Position"
                  variant="outlined"
                  density="compact"
                  clearable
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

    <!-- Snackbar for notifications -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import type { RosterCardProps } from '~/types/database.types'
import { getDepartmentColor } from '~/types/database.types'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const router = useRouter()
const authStore = useAuthStore()
const rosterStore = useRosterStore()
const uiStore = useUIStore()

// State
const search = ref('')
const viewMode = ref<'cards' | 'table'>('cards')
const filterDepartment = ref<string | null>(null)
const filterPosition = ref<string | null>(null)
const filterQuick = ref<string | null>(null)
const drawerOpen = ref(false)
const selectedEmployee = ref<RosterCardProps | null>(null)
const addEmployeeDialog = ref(false)
const addFormRef = ref()
const isSaving = ref(false)

const snackbar = reactive({
  show: false,
  message: '',
  color: 'success'
})

const newEmployee = reactive({
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  department_id: null as string | null,
  position_id: null as string | null
})

// Computed
const isAdmin = computed(() => authStore.isAdmin)
const isLoading = computed(() => rosterStore.isLoading)
const activeEmployees = computed(() => rosterStore.activeEmployees)
const clockedInCount = computed(() => rosterStore.clockedInCount)

const departmentOptions = computed(() => 
  rosterStore.departments.map(d => ({ title: d.name, value: d.name }))
)

const positionOptions = computed(() => 
  rosterStore.positions.map(p => ({ title: p.title, value: p.title }))
)

const tableHeaders = [
  { title: 'Employee', key: 'name', sortable: true },
  { title: 'Position', key: 'position', sortable: true },
  { title: 'Department', key: 'department', sortable: true },
  { title: 'Skills', key: 'skills', sortable: false },
  { title: 'Level', key: 'level', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: '', key: 'actions', sortable: false, align: 'end' as const }
]

const filteredEmployees = computed(() => {
  let result = rosterStore.employees

  // Search filter
  if (search.value) {
    const query = search.value.toLowerCase()
    result = result.filter(e =>
      e.first_name?.toLowerCase().includes(query) ||
      e.last_name?.toLowerCase().includes(query) ||
      e.email.toLowerCase().includes(query) ||
      e.position?.title?.toLowerCase().includes(query) ||
      e.department?.name?.toLowerCase().includes(query) ||
      e.all_skills.some(s => s.name.toLowerCase().includes(query))
    )
  }

  // Department filter
  if (filterDepartment.value) {
    result = result.filter(e => e.department?.name === filterDepartment.value)
  }

  // Position filter
  if (filterPosition.value) {
    result = result.filter(e => e.position?.title === filterPosition.value)
  }

  // Quick filters
  if (filterQuick.value === 'clocked_in') {
    result = result.filter(e => e.clock_status === 'clocked_in')
  } else if (filterQuick.value === 'mentors') {
    result = result.filter(e => e.skill_stats.mastered_count > 0)
  } else if (filterQuick.value === 'new') {
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    result = result.filter(e => 
      e.hire_date && new Date(e.hire_date) > threeMonthsAgo
    )
  }

  return result
})

// Methods
function getInitials(employee: RosterCardProps): string {
  const first = employee.first_name?.[0] || ''
  const last = employee.last_name?.[0] || ''
  return (first + last).toUpperCase() || 'U'
}

async function openDrawer(employee: RosterCardProps) {
  selectedEmployee.value = employee
  drawerOpen.value = true
  
  // Fetch detailed data
  try {
    await rosterStore.fetchEmployeeDetail(employee.employee_id)
    selectedEmployee.value = rosterStore.selectedEmployee
  } catch (err) {
    console.error('Error loading employee details:', err)
  }
}

function editEmployee(employee: RosterCardProps) {
  drawerOpen.value = false
  router.push(`/employees/${employee.id}`)
}

function messageEmployee(employee: RosterCardProps) {
  // TODO: Implement messaging
  snackbar.message = `Messaging ${employee.first_name} - Coming soon!`
  snackbar.color = 'info'
  snackbar.show = true
}

async function handleEndorse(employee: RosterCardProps, skillId: string) {
  try {
    await rosterStore.endorseSkill(employee.employee_id, skillId)
    snackbar.message = 'Skill endorsed successfully!'
    snackbar.color = 'success'
    snackbar.show = true
  } catch (err) {
    snackbar.message = 'Failed to endorse skill'
    snackbar.color = 'error'
    snackbar.show = true
  }
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
    await rosterStore.fetchRoster()
    
    // Reset form
    Object.assign(newEmployee, {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      department_id: null,
      position_id: null
    })
  } catch (error) {
    uiStore.showError(error instanceof Error ? error.message : 'Failed to add team member')
  } finally {
    isSaving.value = false
  }
}

// Lifecycle
onMounted(() => {
  rosterStore.fetchRoster()
})
</script>

<style scoped>
.roster-page {
  max-width: 1600px;
  margin: 0 auto;
}

.filters-bar {
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: white;
}

.roster-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

@media (min-width: 1200px) {
  .roster-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1600px) {
  .roster-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.roster-table {
  cursor: pointer;
}

.roster-table :deep(tbody tr:hover) {
  background-color: rgba(var(--v-theme-primary), 0.04) !important;
}

.clock-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid white;
}

.clock-indicator--in {
  background: #4CAF50;
}

.clock-indicator--out {
  background: #9E9E9E;
}

.level-badge {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(135deg, #1a1a1a, #333);
  border-radius: 8px;
  padding: 4px 10px;
  min-width: 44px;
}

.level-badge__number {
  color: #FFD700;
  font-size: 16px;
  font-weight: 800;
  line-height: 1;
}

.level-badge__label {
  color: rgba(255, 255, 255, 0.6);
  font-size: 8px;
  font-weight: 600;
  text-transform: uppercase;
}
</style>
