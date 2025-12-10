<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="700"
    scrollable
  >
    <v-card v-if="goal">
      <!-- Header -->
      <v-card-title class="d-flex align-center bg-primary text-white pa-4">
        <div class="flex-grow-1">
          <div class="text-h6">{{ goal.title }}</div>
          <div class="text-caption">
            <v-chip
              :color="getStatusColor()"
              size="x-small"
              variant="elevated"
              class="mr-2"
            >
              {{ getRiskLabel() }}
            </v-chip>
            <span v-if="goal.target_date">
              Due {{ formatDate(goal.target_date) }}
            </span>
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="close" />
      </v-card-title>

      <v-card-text class="pa-4">
        <!-- Current Progress -->
        <v-card variant="outlined" class="mb-4">
          <v-card-text>
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-subtitle-2">Current Progress</span>
              <span class="text-h5 font-weight-bold">
                {{ Math.round(goal.progress_percent) }}%
              </span>
            </div>
            <v-progress-linear
              :model-value="goal.progress_percent"
              :color="getProgressColor()"
              height="12"
              rounded
            />
            <div class="d-flex justify-space-between text-caption text-grey mt-1">
              <span>Start</span>
              <span>Target: 100%</span>
            </div>
          </v-card-text>
        </v-card>

        <!-- Description -->
        <div v-if="goal.description" class="mb-4">
          <div class="text-subtitle-2 mb-2">Description</div>
          <p class="text-body-2">{{ goal.description }}</p>
        </div>

        <!-- Update Progress Form -->
        <v-card variant="tonal" color="primary" class="mb-4">
          <v-card-text>
            <div class="text-subtitle-2 mb-3">Update Progress</div>
            
            <div class="d-flex align-center gap-4 mb-3">
              <v-slider
                v-model="updateForm.progress"
                :min="0"
                :max="100"
                :step="5"
                thumb-label
                color="primary"
                class="flex-grow-1"
              >
                <template #thumb-label="{ modelValue }">
                  {{ modelValue }}%
                </template>
              </v-slider>
              <v-text-field
                v-model.number="updateForm.progress"
                type="number"
                variant="outlined"
                density="compact"
                suffix="%"
                style="max-width: 100px;"
                :min="0"
                :max="100"
              />
            </div>

            <v-textarea
              v-model="updateForm.comment"
              label="Progress Update (optional)"
              placeholder="What progress have you made? Any blockers?"
              variant="outlined"
              rows="2"
              class="mb-2"
            />

            <v-btn
              color="primary"
              :loading="updating"
              :disabled="updateForm.progress === goal.progress_percent"
              @click="submitUpdate"
            >
              <v-icon start>mdi-check</v-icon>
              Save Progress
            </v-btn>
          </v-card-text>
        </v-card>

        <!-- Update History -->
        <div>
          <div class="d-flex align-center justify-space-between mb-3">
            <span class="text-subtitle-2">Update History</span>
            <v-btn
              v-if="!showAllUpdates && updates.length > 3"
              variant="text"
              size="small"
              @click="showAllUpdates = true"
            >
              Show all ({{ updates.length }})
            </v-btn>
          </div>

          <div v-if="loadingUpdates" class="text-center py-4">
            <v-progress-circular indeterminate size="24" />
          </div>

          <v-timeline
            v-else-if="displayedUpdates.length > 0"
            density="compact"
            side="end"
          >
            <v-timeline-item
              v-for="update in displayedUpdates"
              :key="update.id"
              :dot-color="getUpdateDotColor(update)"
              size="small"
            >
              <template #opposite>
                <span class="text-caption text-grey">
                  {{ formatDateTime(update.created_at) }}
                </span>
              </template>

              <v-card variant="outlined" density="compact">
                <v-card-text class="py-2 px-3">
                  <div class="d-flex align-center gap-2 mb-1">
                    <v-avatar size="24" color="grey-lighten-2">
                      <span class="text-caption">
                        {{ getInitials(update.employee) }}
                      </span>
                    </v-avatar>
                    <span class="text-caption font-weight-medium">
                      {{ getFullName(update.employee) }}
                    </span>
                    <v-chip size="x-small" color="primary" variant="tonal">
                      {{ update.progress_percent }}%
                    </v-chip>
                  </div>
                  <p v-if="update.comment" class="text-body-2 mb-0">
                    {{ update.comment }}
                  </p>
                </v-card-text>
              </v-card>
            </v-timeline-item>
          </v-timeline>

          <v-alert v-else type="info" variant="tonal" density="compact">
            No updates yet. Be the first to log progress!
          </v-alert>
        </div>
      </v-card-text>

      <!-- Actions -->
      <v-divider />
      <v-card-actions class="pa-4">
        <v-btn
          v-if="goal.status === 'active'"
          variant="text"
          color="warning"
          @click="pauseGoal"
        >
          <v-icon start>mdi-pause</v-icon>
          Put On Hold
        </v-btn>
        <v-btn
          v-if="goal.status === 'on_hold'"
          variant="text"
          color="primary"
          @click="resumeGoal"
        >
          <v-icon start>mdi-play</v-icon>
          Resume
        </v-btn>
        <v-spacer />
        <v-btn variant="text" @click="editGoal">
          <v-icon start>mdi-pencil</v-icon>
          Edit Goal
        </v-btn>
        <v-btn
          v-if="goal.status === 'active' && goal.progress_percent >= 100"
          color="success"
          @click="completeGoal"
        >
          <v-icon start>mdi-check-circle</v-icon>
          Mark Complete
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePerformanceStore, type Goal, type GoalUpdate } from '~/stores/performance'

const props = defineProps<{
  modelValue: boolean
  goal: Goal | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'updated': []
}>()

const performanceStore = usePerformanceStore()

// State
const updating = ref(false)
const loadingUpdates = ref(false)
const showAllUpdates = ref(false)
const updateForm = ref({
  progress: 0,
  comment: ''
})

// Computed
const updates = computed(() => performanceStore.goalUpdates)
const displayedUpdates = computed(() => {
  if (showAllUpdates.value) return updates.value
  return updates.value.slice(0, 3)
})

// Watchers
watch(() => props.goal, async (newGoal) => {
  if (newGoal) {
    updateForm.value.progress = newGoal.progress_percent
    updateForm.value.comment = ''
    showAllUpdates.value = false
    
    // Load updates
    loadingUpdates.value = true
    try {
      await performanceStore.fetchGoalWithUpdates(newGoal.id)
    } finally {
      loadingUpdates.value = false
    }
  }
}, { immediate: true })

// Methods
function close() {
  emit('update:modelValue', false)
  performanceStore.resetCurrentGoal()
}

function getStatusColor(): string {
  if (!props.goal) return 'grey'
  if (props.goal.status !== 'active') return 'grey'
  return getRiskColor()
}

function getRiskColor(): string {
  if (!props.goal || !props.goal.target_date) return 'success'
  
  const now = new Date()
  const target = new Date(props.goal.target_date)
  const start = props.goal.start_date ? new Date(props.goal.start_date) : new Date(props.goal.created_at)
  const totalDays = (target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  const daysElapsed = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  const expectedProgress = Math.min((daysElapsed / totalDays) * 100, 100)
  
  if (props.goal.progress_percent >= expectedProgress - 10) return 'success'
  if (props.goal.progress_percent >= expectedProgress - 25) return 'warning'
  return 'error'
}

function getRiskLabel(): string {
  if (!props.goal) return ''
  if (props.goal.status === 'completed') return 'Completed'
  if (props.goal.status !== 'active') return props.goal.status
  
  const color = getRiskColor()
  if (color === 'success') return 'On Track'
  if (color === 'warning') return 'Behind'
  return 'At Risk'
}

function getProgressColor(): string {
  if (!props.goal) return 'primary'
  if (props.goal.progress_percent >= 100) return 'success'
  return getRiskColor()
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

function getInitials(employee?: { first_name: string; last_name: string }): string {
  if (!employee) return '?'
  return `${employee.first_name[0]}${employee.last_name[0]}`
}

function getFullName(employee?: { first_name: string; last_name: string }): string {
  if (!employee) return 'Unknown'
  return `${employee.first_name} ${employee.last_name}`
}

function getUpdateDotColor(update: GoalUpdate): string {
  if (!update.progress_percent) return 'grey'
  if (update.progress_percent >= 100) return 'success'
  if (update.progress_percent >= 75) return 'primary'
  if (update.progress_percent >= 50) return 'info'
  return 'warning'
}

async function submitUpdate() {
  if (!props.goal) return
  
  updating.value = true
  try {
    await performanceStore.updateGoalProgress(
      props.goal.id,
      updateForm.value.progress,
      updateForm.value.comment || undefined
    )
    updateForm.value.comment = ''
    emit('updated')
  } finally {
    updating.value = false
  }
}

async function pauseGoal() {
  if (!props.goal) return
  await performanceStore.updateGoal(props.goal.id, { status: 'on_hold' })
  emit('updated')
}

async function resumeGoal() {
  if (!props.goal) return
  await performanceStore.updateGoal(props.goal.id, { status: 'active' })
  emit('updated')
}

async function completeGoal() {
  if (!props.goal) return
  await performanceStore.updateGoal(props.goal.id, {
    status: 'completed',
    completed_at: new Date().toISOString()
  })
  emit('updated')
  close()
}

function editGoal() {
  // TODO: Open edit dialog
  console.log('Edit goal:', props.goal?.id)
}
</script>
