<template>
  <v-container fluid>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">My Goals</h1>
        <p class="text-body-2 text-grey">Track your OKRs and objectives</p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="showCreateDialog = true">
        New Goal
      </v-btn>
    </div>

    <!-- Stats Cards -->
    <v-row class="mb-6">
      <v-col cols="6" sm="3">
        <v-card variant="tonal" color="primary" class="text-center pa-4">
          <div class="text-h4 font-weight-bold">{{ activeGoals.length }}</div>
          <div class="text-caption">Active Goals</div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card variant="tonal" color="success" class="text-center pa-4">
          <div class="text-h4 font-weight-bold">{{ onTrackCount }}</div>
          <div class="text-caption">On Track</div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card variant="tonal" color="error" class="text-center pa-4">
          <div class="text-h4 font-weight-bold">{{ atRiskCount }}</div>
          <div class="text-caption">At Risk</div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card variant="tonal" color="grey" class="text-center pa-4">
          <div class="text-h4 font-weight-bold">{{ completedGoals.length }}</div>
          <div class="text-caption">Completed</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Filter Tabs -->
    <v-tabs v-model="activeTab" color="primary" class="mb-4">
      <v-tab value="active">Active</v-tab>
      <v-tab value="completed">Completed</v-tab>
      <v-tab value="all">All Goals</v-tab>
    </v-tabs>

    <!-- Loading -->
    <div v-if="loading" class="d-flex justify-center py-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <!-- Empty State -->
    <v-card v-else-if="filteredGoals.length === 0" class="text-center pa-8">
      <v-icon size="64" color="grey-lighten-1">mdi-flag-outline</v-icon>
      <h3 class="text-h6 mt-4">No goals yet</h3>
      <p class="text-body-2 text-grey">Create your first goal to start tracking progress</p>
      <v-btn color="primary" class="mt-4" @click="showCreateDialog = true">
        <v-icon start>mdi-plus</v-icon>
        Create Goal
      </v-btn>
    </v-card>

    <!-- Goals List -->
    <v-card v-else>
      <v-list lines="three">
        <template v-for="(goal, index) in filteredGoals" :key="goal.id">
          <v-list-item @click="openGoal(goal)" class="goal-item py-4">
            <template #prepend>
              <v-avatar :color="getStatusColor(goal)" size="40">
                <v-icon color="white" size="20">
                  {{ getStatusIcon(goal) }}
                </v-icon>
              </v-avatar>
            </template>

            <v-list-item-title class="text-subtitle-1 font-weight-medium mb-1">
              {{ goal.title }}
            </v-list-item-title>

            <v-list-item-subtitle>
              <div class="d-flex align-center gap-2 mb-2">
                <v-chip
                  :color="getRiskColor(goal)"
                  size="x-small"
                  variant="tonal"
                >
                  {{ getRiskLabel(goal) }}
                </v-chip>
                <v-chip
                  v-if="goal.target_date"
                  size="x-small"
                  variant="outlined"
                >
                  <v-icon start size="12">mdi-calendar</v-icon>
                  {{ formatDate(goal.target_date) }}
                </v-chip>
                <v-chip
                  :color="getVisibilityColor(goal.visibility)"
                  size="x-small"
                  variant="tonal"
                >
                  {{ goal.visibility }}
                </v-chip>
              </div>
              <p class="text-truncate" style="max-width: 500px;">
                {{ goal.description }}
              </p>
            </v-list-item-subtitle>

            <template #append>
              <div class="d-flex align-center gap-4">
                <!-- Progress Circle -->
                <div class="text-center">
                  <v-progress-circular
                    :model-value="goal.progress_percent"
                    :color="getProgressColor(goal)"
                    :size="56"
                    :width="6"
                  >
                    <span class="text-caption font-weight-bold">
                      {{ Math.round(goal.progress_percent) }}%
                    </span>
                  </v-progress-circular>
                </div>
                <v-btn
                  icon="mdi-chevron-right"
                  variant="text"
                  size="small"
                />
              </div>
            </template>
          </v-list-item>

          <v-divider v-if="index < filteredGoals.length - 1" />
        </template>
      </v-list>
    </v-card>

    <!-- Goal Progress Modal -->
    <GoalProgressModal
      v-model="showProgressModal"
      :goal="selectedGoal"
      @updated="onGoalUpdated"
    />

    <!-- Create Goal Dialog -->
    <v-dialog v-model="showCreateDialog" max-width="600" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start>mdi-flag-plus</v-icon>
          Create New Goal
        </v-card-title>

        <v-card-text>
          <v-text-field
            v-model="newGoal.title"
            label="Goal Title"
            placeholder="What do you want to achieve?"
            variant="outlined"
            :rules="[v => !!v || 'Title is required']"
            class="mb-4"
          />

          <v-textarea
            v-model="newGoal.description"
            label="Description"
            placeholder="Describe your goal and key results..."
            variant="outlined"
            rows="3"
            class="mb-4"
          />

          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="newGoal.start_date"
                label="Start Date"
                type="date"
                variant="outlined"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="newGoal.target_date"
                label="Target Date"
                type="date"
                variant="outlined"
              />
            </v-col>
          </v-row>

          <v-select
            v-model="newGoal.visibility"
            :items="visibilityOptions"
            label="Visibility"
            variant="outlined"
            class="mb-4"
          />

          <v-select
            v-model="newGoal.aligns_to_goal_id"
            :items="alignmentOptions"
            item-title="title"
            item-value="id"
            label="Aligns to (optional)"
            variant="outlined"
            clearable
          />
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showCreateDialog = false">
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            :loading="creating"
            :disabled="!newGoal.title"
            @click="createGoal"
          >
            Create Goal
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePerformanceStore, type Goal } from '~/stores/performance'
import GoalProgressModal from './GoalProgressModal.vue'

const performanceStore = usePerformanceStore()

// State
const activeTab = ref('active')
const showProgressModal = ref(false)
const showCreateDialog = ref(false)
const selectedGoal = ref<Goal | null>(null)
const creating = ref(false)

const newGoal = ref({
  title: '',
  description: '',
  start_date: '',
  target_date: '',
  visibility: 'private' as const,
  aligns_to_goal_id: null as string | null
})

const visibilityOptions = [
  { title: 'Private (Only me)', value: 'private' },
  { title: 'Team (My team)', value: 'team' },
  { title: 'Company (Everyone)', value: 'company' }
]

// Computed
const loading = computed(() => performanceStore.loading)
const activeGoals = computed(() => performanceStore.activeGoals)
const completedGoals = computed(() => performanceStore.completedGoals)
const onTrackCount = computed(() => performanceStore.onTrackGoals.length)
const atRiskCount = computed(() => performanceStore.atRiskGoals.length)

const filteredGoals = computed(() => {
  switch (activeTab.value) {
    case 'active':
      return activeGoals.value
    case 'completed':
      return completedGoals.value
    default:
      return performanceStore.goals
  }
})

const alignmentOptions = computed(() => {
  // Allow aligning to company-wide or team goals
  return performanceStore.goals.filter(g => 
    g.visibility !== 'private' && g.status === 'active'
  )
})

// Methods
function getStatusColor(goal: Goal): string {
  switch (goal.status) {
    case 'completed': return 'success'
    case 'active': return 'primary'
    case 'on_hold': return 'warning'
    case 'cancelled': return 'grey'
    default: return 'grey'
  }
}

function getStatusIcon(goal: Goal): string {
  switch (goal.status) {
    case 'completed': return 'mdi-check'
    case 'active': return 'mdi-flag'
    case 'on_hold': return 'mdi-pause'
    case 'cancelled': return 'mdi-close'
    default: return 'mdi-flag-outline'
  }
}

function getRiskColor(goal: Goal): string {
  if (goal.status !== 'active') return 'grey'
  if (!goal.target_date) return 'success'
  
  const now = new Date()
  const target = new Date(goal.target_date)
  const start = goal.start_date ? new Date(goal.start_date) : new Date(goal.created_at)
  const totalDays = (target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  const daysElapsed = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  const expectedProgress = Math.min((daysElapsed / totalDays) * 100, 100)
  
  if (goal.progress_percent >= expectedProgress - 10) return 'success'
  if (goal.progress_percent >= expectedProgress - 25) return 'warning'
  return 'error'
}

function getRiskLabel(goal: Goal): string {
  if (goal.status === 'completed') return 'Completed'
  if (goal.status !== 'active') return goal.status
  
  const color = getRiskColor(goal)
  if (color === 'success') return 'On Track'
  if (color === 'warning') return 'Behind'
  return 'At Risk'
}

function getProgressColor(goal: Goal): string {
  if (goal.progress_percent >= 100) return 'success'
  return getRiskColor(goal)
}

function getVisibilityColor(visibility: string): string {
  switch (visibility) {
    case 'company': return 'primary'
    case 'team': return 'info'
    default: return 'grey'
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function openGoal(goal: Goal) {
  selectedGoal.value = goal
  showProgressModal.value = true
}

function onGoalUpdated() {
  // Refresh goals list
  performanceStore.fetchGoals()
}

async function createGoal() {
  if (!newGoal.value.title) return
  
  creating.value = true
  try {
    await performanceStore.createGoal({
      title: newGoal.value.title,
      description: newGoal.value.description || null,
      start_date: newGoal.value.start_date || null,
      target_date: newGoal.value.target_date || null,
      visibility: newGoal.value.visibility,
      aligns_to_goal_id: newGoal.value.aligns_to_goal_id
    })
    
    showCreateDialog.value = false
    // Reset form
    newGoal.value = {
      title: '',
      description: '',
      start_date: '',
      target_date: '',
      visibility: 'private',
      aligns_to_goal_id: null
    }
  } finally {
    creating.value = false
  }
}

// Lifecycle
onMounted(() => {
  performanceStore.fetchGoals()
})
</script>

<style scoped>
.goal-item {
  cursor: pointer;
  transition: background-color 0.2s;
}

.goal-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
}
</style>
