<template>
  <v-container fluid>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Feedback</h1>
        <p class="text-body-2 text-grey">Give and receive continuous feedback</p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="showGiveDialog = true">
        Give Feedback
      </v-btn>
    </div>

    <!-- Tabs -->
    <v-tabs v-model="activeTab" color="primary" class="mb-4">
      <v-tab value="received">
        Received
        <v-badge
          v-if="unreadCount > 0"
          :content="unreadCount"
          color="error"
          inline
          class="ml-2"
        />
      </v-tab>
      <v-tab value="given">Given</v-tab>
    </v-tabs>

    <v-window v-model="activeTab">
      <!-- Received Feedback -->
      <v-window-item value="received">
        <div v-if="loading" class="d-flex justify-center py-8">
          <v-progress-circular indeterminate color="primary" />
        </div>

        <v-card v-else-if="feedbackReceived.length === 0" class="text-center pa-8">
          <v-icon size="64" color="grey-lighten-1">mdi-message-text-outline</v-icon>
          <h3 class="text-h6 mt-4">No Feedback Yet</h3>
          <p class="text-body-2 text-grey">
            Feedback from your colleagues will appear here
          </p>
        </v-card>

        <v-timeline v-else density="compact" side="end">
          <v-timeline-item
            v-for="item in feedbackReceived"
            :key="item.id"
            :dot-color="getTypeColor(item.type)"
            size="small"
          >
            <template #opposite>
              <span class="text-caption text-grey">
                {{ formatDate(item.created_at) }}
              </span>
            </template>

            <v-card variant="outlined" class="feedback-card">
              <v-card-text>
                <div class="d-flex align-center gap-2 mb-2">
                  <v-avatar :color="getTypeColor(item.type)" size="32">
                    <v-icon size="16" color="white">
                      {{ getTypeIcon(item.type) }}
                    </v-icon>
                  </v-avatar>
                  <div class="flex-grow-1">
                    <span class="text-subtitle-2">
                      {{ getFullName(item.from_employee) }}
                    </span>
                    <v-chip
                      v-if="item.type"
                      size="x-small"
                      :color="getTypeColor(item.type)"
                      variant="tonal"
                      class="ml-2"
                    >
                      {{ formatType(item.type) }}
                    </v-chip>
                  </div>
                  <v-chip
                    v-if="item.is_public"
                    size="x-small"
                    color="primary"
                    variant="outlined"
                  >
                    <v-icon start size="10">mdi-eye</v-icon>
                    Shared
                  </v-chip>
                </div>

                <p class="text-body-1 feedback-message">
                  {{ item.message }}
                </p>
              </v-card-text>
            </v-card>
          </v-timeline-item>
        </v-timeline>
      </v-window-item>

      <!-- Given Feedback -->
      <v-window-item value="given">
        <div v-if="loading" class="d-flex justify-center py-8">
          <v-progress-circular indeterminate color="primary" />
        </div>

        <v-card v-else-if="feedbackGiven.length === 0" class="text-center pa-8">
          <v-icon size="64" color="grey-lighten-1">mdi-send-outline</v-icon>
          <h3 class="text-h6 mt-4">No Feedback Given</h3>
          <p class="text-body-2 text-grey">
            Your feedback to others will appear here
          </p>
          <v-btn color="primary" class="mt-4" @click="showGiveDialog = true">
            <v-icon start>mdi-plus</v-icon>
            Give Feedback
          </v-btn>
        </v-card>

        <v-timeline v-else density="compact" side="end">
          <v-timeline-item
            v-for="item in feedbackGiven"
            :key="item.id"
            :dot-color="getTypeColor(item.type)"
            size="small"
          >
            <template #opposite>
              <span class="text-caption text-grey">
                {{ formatDate(item.created_at) }}
              </span>
            </template>

            <v-card variant="outlined" class="feedback-card">
              <v-card-text>
                <div class="d-flex align-center gap-2 mb-2">
                  <v-avatar color="primary" size="32">
                    <span class="text-caption">
                      {{ getInitials(item.to_employee) }}
                    </span>
                  </v-avatar>
                  <div class="flex-grow-1">
                    <span class="text-caption text-grey">To: </span>
                    <span class="text-subtitle-2">
                      {{ getFullName(item.to_employee) }}
                    </span>
                    <v-chip
                      v-if="item.type"
                      size="x-small"
                      :color="getTypeColor(item.type)"
                      variant="tonal"
                      class="ml-2"
                    >
                      {{ formatType(item.type) }}
                    </v-chip>
                  </div>
                  <v-chip
                    size="x-small"
                    :color="item.is_public ? 'primary' : 'grey'"
                    variant="outlined"
                  >
                    <v-icon start size="10">
                      {{ item.is_public ? 'mdi-eye' : 'mdi-eye-off' }}
                    </v-icon>
                    {{ item.is_public ? 'Shared' : 'Private' }}
                  </v-chip>
                </div>

                <p class="text-body-1 feedback-message">
                  {{ item.message }}
                </p>
              </v-card-text>
            </v-card>
          </v-timeline-item>
        </v-timeline>
      </v-window-item>
    </v-window>

    <!-- Give Feedback Dialog -->
    <v-dialog v-model="showGiveDialog" max-width="500" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start color="primary">mdi-message-plus</v-icon>
          Give Feedback
        </v-card-title>

        <v-card-text>
          <!-- Recipient Select -->
          <v-autocomplete
            v-model="feedbackForm.to_employee_id"
            :items="employees"
            :item-title="(e) => `${e.first_name} ${e.last_name}`"
            item-value="id"
            label="Select Colleague"
            placeholder="Search by name..."
            variant="outlined"
            prepend-inner-icon="mdi-account-search"
            :loading="loadingEmployees"
            :rules="[v => !!v || 'Please select a colleague']"
            class="mb-4"
          >
            <template #item="{ item, props }">
              <v-list-item v-bind="props">
                <template #prepend>
                  <v-avatar color="primary" size="32">
                    <span class="text-caption">
                      {{ item.raw.first_name[0] }}{{ item.raw.last_name[0] }}
                    </span>
                  </v-avatar>
                </template>
                <v-list-item-subtitle>
                  {{ item.raw.position_title || 'Team Member' }}
                </v-list-item-subtitle>
              </v-list-item>
            </template>
          </v-autocomplete>

          <!-- Feedback Type -->
          <v-select
            v-model="feedbackForm.type"
            :items="feedbackTypes"
            item-title="label"
            item-value="value"
            label="Type of Feedback"
            variant="outlined"
            class="mb-4"
          >
            <template #item="{ item, props }">
              <v-list-item v-bind="props">
                <template #prepend>
                  <v-icon :color="item.raw.color">{{ item.raw.icon }}</v-icon>
                </template>
              </v-list-item>
            </template>
            <template #selection="{ item }">
              <v-icon :color="item.raw.color" class="mr-2">{{ item.raw.icon }}</v-icon>
              {{ item.raw.label }}
            </template>
          </v-select>

          <!-- Message -->
          <v-textarea
            v-model="feedbackForm.message"
            label="Your Feedback"
            placeholder="Be specific and constructive..."
            variant="outlined"
            rows="4"
            :rules="[v => !!v || 'Please enter your feedback']"
            counter="500"
            maxlength="500"
            class="mb-4"
          />

          <!-- Visibility -->
          <v-switch
            v-model="feedbackForm.is_public"
            color="primary"
            hide-details
          >
            <template #label>
              <div class="d-flex align-center gap-2">
                <v-icon size="small">
                  {{ feedbackForm.is_public ? 'mdi-eye' : 'mdi-eye-off' }}
                </v-icon>
                <span>
                  {{ feedbackForm.is_public ? 'Share with employee' : 'Manager only (private)' }}
                </span>
              </div>
            </template>
          </v-switch>

          <v-alert
            v-if="!feedbackForm.is_public"
            type="info"
            variant="tonal"
            density="compact"
            class="mt-4"
          >
            Private feedback is only visible to the employee's manager and HR.
          </v-alert>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeGiveDialog">
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            :loading="submitting"
            :disabled="!isFormValid"
            @click="submitFeedback"
          >
            <v-icon start>mdi-send</v-icon>
            Send Feedback
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePerformanceStore } from '~/stores/performance'

const performanceStore = usePerformanceStore()

// State
const activeTab = ref('received')
const showGiveDialog = ref(false)
const submitting = ref(false)
const loadingEmployees = ref(false)
const employees = ref<any[]>([])

const feedbackForm = ref({
  to_employee_id: null as string | null,
  type: 'praise',
  message: '',
  is_public: true
})

const feedbackTypes = [
  { value: 'praise', label: 'Praise', icon: 'mdi-thumb-up', color: 'success' },
  { value: 'recognition', label: 'Recognition', icon: 'mdi-star', color: 'primary' },
  { value: 'suggestion', label: 'Suggestion', icon: 'mdi-lightbulb', color: 'info' },
  { value: 'concern', label: 'Concern', icon: 'mdi-alert-circle', color: 'warning' },
  { value: 'general', label: 'General', icon: 'mdi-message-text', color: 'grey' }
]

// Computed
const loading = computed(() => performanceStore.loading)
const feedbackReceived = computed(() => performanceStore.feedbackReceived)
const feedbackGiven = computed(() => performanceStore.feedbackGiven)
const unreadCount = computed(() => 0) // TODO: Implement read tracking

const isFormValid = computed(() => {
  return feedbackForm.value.to_employee_id && feedbackForm.value.message.trim()
})

// Methods
function getTypeColor(type: string | null): string {
  const found = feedbackTypes.find(t => t.value === type)
  return found?.color || 'grey'
}

function getTypeIcon(type: string | null): string {
  const found = feedbackTypes.find(t => t.value === type)
  return found?.icon || 'mdi-message-text'
}

function formatType(type: string): string {
  const found = feedbackTypes.find(t => t.value === type)
  return found?.label || type
}

function getFullName(employee?: { first_name: string; last_name: string }): string {
  if (!employee) return 'Anonymous'
  return `${employee.first_name} ${employee.last_name}`
}

function getInitials(employee?: { first_name: string; last_name: string }): string {
  if (!employee) return '?'
  return `${employee.first_name[0]}${employee.last_name[0]}`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))

  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

function closeGiveDialog() {
  showGiveDialog.value = false
  // Reset form
  feedbackForm.value = {
    to_employee_id: null,
    type: 'praise',
    message: '',
    is_public: true
  }
}

async function loadEmployees() {
  loadingEmployees.value = true
  try {
    const supabase = useSupabaseClient()
    const { data, error } = await supabase
      .from('employees')
      .select('id, first_name, last_name, position_title')
      .order('first_name')

    if (error) throw error
    employees.value = data || []
  } catch (err) {
    console.error('loadEmployees error:', err)
  } finally {
    loadingEmployees.value = false
  }
}

async function submitFeedback() {
  if (!isFormValid.value || !feedbackForm.value.to_employee_id) return
  
  submitting.value = true
  try {
    await performanceStore.giveFeedback(
      feedbackForm.value.to_employee_id,
      feedbackForm.value.message,
      feedbackForm.value.type,
      feedbackForm.value.is_public
    )
    closeGiveDialog()
  } finally {
    submitting.value = false
  }
}

// Lifecycle
onMounted(async () => {
  await performanceStore.fetchFeedback()
  await loadEmployees()
})
</script>

<style scoped>
.feedback-card {
  max-width: 500px;
}

.feedback-message {
  white-space: pre-wrap;
  margin: 0;
}
</style>
