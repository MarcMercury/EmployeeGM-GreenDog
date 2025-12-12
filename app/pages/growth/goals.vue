<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Goals</h1>
        <p class="text-body-1 text-grey-darken-1">
          Track and manage personal and team goals
        </p>
      </div>
      <v-btn v-if="isAdmin" color="primary" prepend-icon="mdi-plus" @click="showAddDialog = true">
        New Goal
      </v-btn>
    </div>

    <!-- Loading State -->
    <template v-if="loading">
      <v-row>
        <v-col v-for="i in 6" :key="i" cols="12" md="6" lg="4">
          <v-card rounded="lg" height="200">
            <v-card-text>
              <div class="skeleton-pulse mb-3" style="width: 60%; height: 24px; border-radius: 4px;"></div>
              <div class="skeleton-pulse mb-2" style="width: 100%; height: 16px; border-radius: 4px;"></div>
              <div class="skeleton-pulse mb-4" style="width: 80%; height: 16px; border-radius: 4px;"></div>
              <div class="skeleton-pulse" style="width: 100%; height: 8px; border-radius: 4px;"></div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- Content -->
    <template v-else>
      <!-- Filter Tabs -->
      <v-tabs v-model="activeTab" class="mb-4">
        <v-tab value="all">All Goals</v-tab>
        <v-tab value="my">My Goals</v-tab>
        <v-tab value="team">Team Goals</v-tab>
        <v-tab value="company">Company Goals</v-tab>
      </v-tabs>

      <!-- Goals Grid -->
      <v-row v-if="filteredGoals.length > 0">
        <v-col v-for="goal in filteredGoals" :key="goal.id" cols="12" md="6" lg="4">
          <v-card rounded="lg" class="goal-card h-100" :class="{ 'goal-completed': goal.status === 'completed' }">
            <v-card-title class="d-flex align-center justify-space-between pb-1">
              <span class="text-truncate" style="max-width: 80%;">{{ goal.title }}</span>
              <v-chip 
                :color="getStatusColor(goal.status)" 
                size="x-small" 
                variant="flat"
              >
                {{ goal.status }}
              </v-chip>
            </v-card-title>
            
            <v-card-subtitle class="pb-2">
              <v-icon size="14" class="mr-1">mdi-account</v-icon>
              {{ goal.owner_name || 'Unassigned' }}
              <span v-if="goal.target_date" class="ml-2">
                <v-icon size="14" class="mr-1">mdi-calendar</v-icon>
                {{ formatDate(goal.target_date) }}
              </span>
            </v-card-subtitle>

            <v-card-text>
              <p v-if="goal.description" class="text-body-2 text-grey-darken-1 mb-3 goal-description">
                {{ goal.description }}
              </p>
              
              <!-- Progress Bar -->
              <div class="mb-2">
                <div class="d-flex justify-space-between align-center mb-1">
                  <span class="text-caption text-grey">Progress</span>
                  <span class="text-caption font-weight-medium">{{ goal.progress_percent }}%</span>
                </div>
                <v-progress-linear
                  :model-value="goal.progress_percent"
                  :color="getProgressColor(goal.progress_percent)"
                  height="8"
                  rounded
                />
              </div>

              <!-- Visibility Badge -->
              <v-chip 
                :prepend-icon="getVisibilityIcon(goal.visibility)" 
                size="x-small" 
                variant="tonal"
                class="mt-1"
              >
                {{ goal.visibility }}
              </v-chip>
            </v-card-text>

            <v-card-actions>
              <v-btn variant="text" size="small" @click="viewGoal(goal)">
                View Details
              </v-btn>
              <v-spacer />
              <v-btn 
                v-if="canEditGoal(goal)"
                variant="text" 
                size="small" 
                color="primary"
                @click="openUpdateDialog(goal)"
              >
                Update
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>

      <!-- Empty State -->
      <v-card v-else rounded="lg" class="pa-8 text-center">
        <v-icon size="64" color="grey-lighten-1">mdi-target</v-icon>
        <h3 class="text-h6 mt-4">No Goals Found</h3>
        <p class="text-grey mt-2">
          {{ activeTab === 'my' ? "You haven't set any goals yet." : 'No goals match the current filter.' }}
        </p>
        <v-btn v-if="isAdmin" variant="flat" color="primary" class="mt-4" @click="showAddDialog = true">
          Create First Goal
        </v-btn>
      </v-card>
    </template>

    <!-- Goal Detail Dialog -->
    <v-dialog v-model="showDetailDialog" max-width="600">
      <v-card v-if="selectedGoal">
        <v-card-title class="d-flex align-center justify-space-between">
          <span>{{ selectedGoal.title }}</span>
          <v-chip :color="getStatusColor(selectedGoal.status)" size="small">
            {{ selectedGoal.status }}
          </v-chip>
        </v-card-title>
        <v-card-text>
          <p v-if="selectedGoal.description" class="text-body-1 mb-4">
            {{ selectedGoal.description }}
          </p>

          <v-row class="mb-4">
            <v-col cols="6">
              <div class="text-caption text-grey">Owner</div>
              <div class="font-weight-medium">{{ selectedGoal.owner_name || 'Unassigned' }}</div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-grey">Target Date</div>
              <div class="font-weight-medium">{{ selectedGoal.target_date ? formatDate(selectedGoal.target_date) : 'Not set' }}</div>
            </v-col>
          </v-row>

          <!-- Progress -->
          <div class="mb-4">
            <div class="d-flex justify-space-between mb-1">
              <span class="font-weight-medium">Progress</span>
              <span class="font-weight-bold">{{ selectedGoal.progress_percent }}%</span>
            </div>
            <v-progress-linear
              :model-value="selectedGoal.progress_percent"
              :color="getProgressColor(selectedGoal.progress_percent)"
              height="12"
              rounded
            />
          </div>

          <!-- Updates Timeline -->
          <div class="mt-6">
            <div class="d-flex align-center justify-space-between mb-3">
              <h4 class="text-subtitle-1 font-weight-bold">Updates</h4>
              <v-btn 
                v-if="canEditGoal(selectedGoal)"
                variant="tonal" 
                size="small" 
                color="primary"
                @click="showUpdateProgress = true"
              >
                Add Update
              </v-btn>
            </div>

            <div v-if="goalUpdates.length > 0" class="updates-timeline">
              <div v-for="update in goalUpdates" :key="update.id" class="update-item mb-3">
                <div class="d-flex align-center gap-2 mb-1">
                  <v-avatar size="24" color="primary">
                    <span class="text-white text-caption">{{ update.author_initials }}</span>
                  </v-avatar>
                  <span class="text-caption font-weight-medium">{{ update.author_name }}</span>
                  <span class="text-caption text-grey">{{ formatTimeAgo(update.created_at) }}</span>
                  <v-chip v-if="update.progress_percent != null" size="x-small" variant="tonal" color="primary">
                    {{ update.progress_percent }}%
                  </v-chip>
                </div>
                <p v-if="update.comment" class="text-body-2 ml-8">{{ update.comment }}</p>
              </div>
            </div>
            <div v-else class="text-center py-4 text-grey">
              No updates yet
            </div>
          </div>

          <!-- Add Update Form (inline) -->
          <v-expand-transition>
            <div v-if="showUpdateProgress" class="mt-4 pa-3 bg-grey-lighten-4 rounded">
              <v-slider
                v-model="updateForm.progress"
                :min="0"
                :max="100"
                step="5"
                thumb-label="always"
                color="primary"
                class="mb-2"
              />
              <v-textarea
                v-model="updateForm.comment"
                label="Update comment"
                variant="outlined"
                density="compact"
                rows="2"
                class="mb-2"
              />
              <div class="d-flex justify-end gap-2">
                <v-btn variant="text" size="small" @click="showUpdateProgress = false">Cancel</v-btn>
                <v-btn variant="flat" color="primary" size="small" :loading="saving" @click="submitUpdate">
                  Save Update
                </v-btn>
              </div>
            </div>
          </v-expand-transition>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDetailDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Goal Dialog -->
    <v-dialog v-model="showAddDialog" max-width="500">
      <v-card>
        <v-card-title>Create New Goal</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="goalForm.title"
            label="Goal Title"
            variant="outlined"
            class="mb-3"
            :rules="[v => !!v || 'Title is required']"
          />
          <v-textarea
            v-model="goalForm.description"
            label="Description"
            variant="outlined"
            rows="3"
            class="mb-3"
          />
          <v-select
            v-model="goalForm.owner_employee_id"
            :items="employeeOptions"
            item-title="name"
            item-value="id"
            label="Goal Owner"
            variant="outlined"
            class="mb-3"
            clearable
          />
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="goalForm.start_date"
                label="Start Date"
                type="date"
                variant="outlined"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="goalForm.target_date"
                label="Target Date"
                type="date"
                variant="outlined"
              />
            </v-col>
          </v-row>
          <v-select
            v-model="goalForm.visibility"
            :items="visibilityOptions"
            label="Visibility"
            variant="outlined"
            class="mt-3"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showAddDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="createGoal">Create Goal</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { format, formatDistanceToNow } from 'date-fns'

definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

const supabase = useSupabaseClient()
const { employees, isAdmin } = useAppData()
const userStore = useUserStore()
const toast = useToast()

// State
const loading = ref(true)
const saving = ref(false)
const goals = ref<any[]>([])
const goalUpdates = ref<any[]>([])
const activeTab = ref('all')

// Dialogs
const showAddDialog = ref(false)
const showDetailDialog = ref(false)
const showUpdateProgress = ref(false)
const selectedGoal = ref<any>(null)

// Forms
const goalForm = ref({
  title: '',
  description: '',
  owner_employee_id: null as string | null,
  start_date: '',
  target_date: '',
  visibility: 'private'
})

const updateForm = ref({
  progress: 0,
  comment: ''
})

const visibilityOptions = [
  { title: 'Private (Only owner)', value: 'private' },
  { title: 'Team (Department)', value: 'team' },
  { title: 'Company (Everyone)', value: 'company' }
]

// Computed
const currentEmployeeId = computed(() => userStore.employee?.id)

const employeeOptions = computed(() => 
  employees.value.map(e => ({ id: e.id, name: e.full_name }))
)

const filteredGoals = computed(() => {
  switch (activeTab.value) {
    case 'my':
      return goals.value.filter(g => g.owner_employee_id === currentEmployeeId.value)
    case 'team':
      return goals.value.filter(g => g.visibility === 'team')
    case 'company':
      return goals.value.filter(g => g.visibility === 'company')
    default:
      return goals.value
  }
})

// Methods
async function loadGoals() {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('goals')
      .select(`
        *,
        owner:employees!goals_owner_employee_id_fkey(first_name, last_name)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    goals.value = (data || []).map(g => ({
      ...g,
      owner_name: g.owner ? `${g.owner.first_name} ${g.owner.last_name}` : null
    }))
  } catch (err: any) {
    console.error('Failed to load goals:', err)
    toast.error('Failed to load goals')
  } finally {
    loading.value = false
  }
}

async function loadGoalUpdates(goalId: string) {
  const { data, error } = await supabase
    .from('goal_updates')
    .select(`
      *,
      author:employees!goal_updates_employee_id_fkey(first_name, last_name)
    `)
    .eq('goal_id', goalId)
    .order('created_at', { ascending: false })

  if (!error && data) {
    goalUpdates.value = data.map(u => ({
      ...u,
      author_name: u.author ? `${u.author.first_name} ${u.author.last_name}` : 'Unknown',
      author_initials: u.author ? `${u.author.first_name?.charAt(0)}${u.author.last_name?.charAt(0)}` : '?'
    }))
  }
}

async function createGoal() {
  if (!goalForm.value.title.trim()) {
    toast.error('Goal title is required')
    return
  }

  saving.value = true
  try {
    const { error } = await supabase
      .from('goals')
      .insert({
        title: goalForm.value.title,
        description: goalForm.value.description || null,
        owner_employee_id: goalForm.value.owner_employee_id,
        start_date: goalForm.value.start_date || null,
        target_date: goalForm.value.target_date || null,
        visibility: goalForm.value.visibility,
        status: 'active',
        progress_percent: 0
      })

    if (error) throw error

    toast.success('Goal created successfully')
    showAddDialog.value = false
    resetGoalForm()
    await loadGoals()
  } catch (err: any) {
    toast.error('Failed to create goal')
  } finally {
    saving.value = false
  }
}

async function submitUpdate() {
  if (!selectedGoal.value) return

  saving.value = true
  try {
    // Insert update record
    const { error: updateError } = await supabase
      .from('goal_updates')
      .insert({
        goal_id: selectedGoal.value.id,
        employee_id: currentEmployeeId.value,
        progress_percent: updateForm.value.progress,
        comment: updateForm.value.comment || null
      })

    if (updateError) throw updateError

    // Update goal progress
    const newStatus = updateForm.value.progress >= 100 ? 'completed' : 'active'
    const { error: goalError } = await supabase
      .from('goals')
      .update({ 
        progress_percent: updateForm.value.progress,
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null
      })
      .eq('id', selectedGoal.value.id)

    if (goalError) throw goalError

    // Refresh
    selectedGoal.value.progress_percent = updateForm.value.progress
    selectedGoal.value.status = newStatus
    await loadGoalUpdates(selectedGoal.value.id)
    await loadGoals()
    
    showUpdateProgress.value = false
    updateForm.value = { progress: 0, comment: '' }
    toast.success('Update saved')
  } catch (err: any) {
    toast.error('Failed to save update')
  } finally {
    saving.value = false
  }
}

function viewGoal(goal: any) {
  selectedGoal.value = goal
  updateForm.value.progress = goal.progress_percent || 0
  showDetailDialog.value = true
  showUpdateProgress.value = false
  loadGoalUpdates(goal.id)
}

function openUpdateDialog(goal: any) {
  selectedGoal.value = goal
  updateForm.value.progress = goal.progress_percent || 0
  showDetailDialog.value = true
  showUpdateProgress.value = true
  loadGoalUpdates(goal.id)
}

function canEditGoal(goal: any): boolean {
  return isAdmin.value || goal.owner_employee_id === currentEmployeeId.value
}

function resetGoalForm() {
  goalForm.value = {
    title: '',
    description: '',
    owner_employee_id: null,
    start_date: '',
    target_date: '',
    visibility: 'private'
  }
}

function formatDate(dateStr: string): string {
  return format(new Date(dateStr), 'MMM d, yyyy')
}

function formatTimeAgo(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'grey',
    active: 'primary',
    completed: 'success',
    cancelled: 'error',
    on_hold: 'warning'
  }
  return colors[status] || 'grey'
}

function getProgressColor(percent: number): string {
  if (percent >= 100) return 'success'
  if (percent >= 75) return 'primary'
  if (percent >= 50) return 'info'
  if (percent >= 25) return 'warning'
  return 'grey'
}

function getVisibilityIcon(visibility: string): string {
  const icons: Record<string, string> = {
    private: 'mdi-lock',
    team: 'mdi-account-group',
    company: 'mdi-domain'
  }
  return icons[visibility] || 'mdi-eye'
}

// Lifecycle
onMounted(() => {
  loadGoals()
})
</script>

<style scoped>
.goal-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.goal-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.goal-completed {
  opacity: 0.85;
  background: linear-gradient(135deg, #f1f8e9 0%, #fff 100%);
}

.goal-description {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.update-item {
  padding-left: 12px;
  border-left: 2px solid #e0e0e0;
}

.skeleton-pulse {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
