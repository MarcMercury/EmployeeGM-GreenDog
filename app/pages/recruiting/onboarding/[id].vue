<template>
  <div>
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="48" />
      <p class="text-grey mt-4">Loading onboarding data...</p>
    </div>

    <!-- Error State -->
    <v-card v-else-if="error" class="text-center pa-12" rounded="lg">
      <v-icon size="64" color="error">mdi-alert-circle</v-icon>
      <h3 class="text-h6 mt-4">{{ error }}</h3>
      <v-btn color="primary" class="mt-4" @click="navigateTo('/recruiting/onboarding')">
        Back to Onboarding
      </v-btn>
    </v-card>

    <!-- Main Content -->
    <div v-else-if="onboarding">
      <!-- Header -->
      <div class="d-flex align-center justify-space-between mb-6">
        <div class="d-flex align-center">
          <v-btn icon variant="text" class="mr-2" @click="navigateTo('/recruiting/onboarding')">
            <v-icon>mdi-arrow-left</v-icon>
          </v-btn>
          <div>
            <h1 class="text-h4 font-weight-bold mb-1">
              {{ candidate?.first_name }} {{ candidate?.last_name }}
            </h1>
            <p class="text-body-1 text-grey-darken-1 mb-0">
              {{ candidate?.job_positions?.title || 'New Hire' }} • Onboarding Wizard
            </p>
          </div>
        </div>
        <div class="d-flex align-center ga-2">
          <v-chip :color="statusColor" size="large">
            <v-icon start size="small">{{ statusIcon }}</v-icon>
            {{ statusLabel }}
          </v-chip>
          <v-btn
            v-if="onboarding.status === 'in_progress' && overallProgress === 100"
            color="success"
            size="large"
            prepend-icon="mdi-check-all"
            @click="completeOnboarding"
          >
            Complete Onboarding
          </v-btn>
        </div>
      </div>

      <!-- Progress Overview -->
      <v-card class="mb-6" rounded="lg">
        <v-card-text class="pa-4">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-body-1 font-weight-medium">Overall Progress</span>
            <span class="text-h5 font-weight-bold text-primary">{{ overallProgress }}%</span>
          </div>
          <v-progress-linear
            :model-value="overallProgress"
            :color="overallProgress === 100 ? 'success' : 'primary'"
            height="12"
            rounded
          />
          <div class="d-flex justify-space-between mt-2 text-caption text-grey">
            <span>{{ completedTasks }} of {{ totalTasks }} tasks completed</span>
            <span v-if="onboarding.target_start_date">
              Target Start: {{ formatDate(onboarding.target_start_date) }}
            </span>
          </div>
        </v-card-text>
      </v-card>

      <!-- Stage Stepper -->
      <v-card rounded="lg">
        <v-stepper
          v-model="currentStep"
          alt-labels
          flat
        >
          <v-stepper-header>
            <template v-for="(stage, index) in stages" :key="stage.id">
              <v-stepper-item
                :value="index + 1"
                :title="stage.name"
                :subtitle="`${getStageProgress(stage.id)}% complete`"
                :complete="getStageProgress(stage.id) === 100"
                :color="getStageProgress(stage.id) === 100 ? 'success' : 'primary'"
                :icon="stage.icon"
                editable
              />
              <v-divider v-if="index < stages.length - 1" />
            </template>
          </v-stepper-header>

          <v-stepper-window>
            <v-stepper-window-item
              v-for="(stage, index) in stages"
              :key="stage.id"
              :value="index + 1"
            >
              <v-card flat class="pa-4">
                <!-- Stage Header -->
                <div class="d-flex align-center justify-space-between mb-4">
                  <div>
                    <h2 class="text-h5 font-weight-bold">{{ stage.name }}</h2>
                    <p class="text-body-2 text-grey mb-0">{{ stage.description }}</p>
                  </div>
                  <v-chip
                    :color="getStageProgress(stage.id) === 100 ? 'success' : 'grey'"
                    size="small"
                  >
                    {{ getStageProgress(stage.id) }}% Complete
                  </v-chip>
                </div>

                <v-divider class="mb-4" />

                <!-- Tasks List -->
                <v-list class="pa-0">
                  <v-list-item
                    v-for="task in getTasksForStage(stage.id)"
                    :key="task.id"
                    class="px-0 py-3"
                    :class="{ 'bg-grey-lighten-4 rounded': task.is_completed }"
                  >
                    <template #prepend>
                      <v-checkbox-btn
                        v-if="task.task_type === 'checkbox' || task.task_type === 'form'"
                        :model-value="task.is_completed"
                        color="success"
                        :disabled="savingTask === task.id"
                        @update:model-value="toggleTask(task, $event)"
                      />
                      <v-avatar
                        v-else
                        :color="task.is_completed ? 'success' : 'grey-lighten-2'"
                        size="40"
                      >
                        <v-icon :color="task.is_completed ? 'white' : 'grey'">
                          {{ getTaskIcon(task.task_type) }}
                        </v-icon>
                      </v-avatar>
                    </template>

                    <v-list-item-title
                      :class="{
                        'text-decoration-line-through text-grey': task.is_completed,
                        'font-weight-medium': !task.is_completed
                      }"
                    >
                      {{ task.name }}
                      <v-chip v-if="task.is_required" size="x-small" color="error" class="ml-2">
                        Required
                      </v-chip>
                    </v-list-item-title>
                    <v-list-item-subtitle v-if="task.description">
                      {{ task.description }}
                    </v-list-item-subtitle>

                    <template #append>
                      <div class="d-flex align-center ga-2">
                        <!-- Task-specific actions -->
                        <template v-if="!task.is_completed">
                          <!-- Document Upload -->
                          <v-btn
                            v-if="task.task_type === 'document'"
                            size="small"
                            variant="outlined"
                            color="primary"
                            prepend-icon="mdi-upload"
                            @click="openDocumentUpload(task)"
                          >
                            Upload
                          </v-btn>

                          <!-- Signature/Acknowledgment -->
                          <v-btn
                            v-else-if="task.task_type === 'signature'"
                            size="small"
                            variant="outlined"
                            color="primary"
                            prepend-icon="mdi-signature-freehand"
                            @click="openSignatureDialog(task)"
                          >
                            Sign
                          </v-btn>

                          <!-- Send Notification -->
                          <v-btn
                            v-else-if="task.task_type === 'notification'"
                            size="small"
                            variant="outlined"
                            color="primary"
                            prepend-icon="mdi-send"
                            @click="sendNotification(task)"
                          >
                            Send
                          </v-btn>

                          <!-- Date Selection -->
                          <v-btn
                            v-else-if="task.task_type === 'date'"
                            size="small"
                            variant="outlined"
                            color="primary"
                            prepend-icon="mdi-calendar"
                            @click="openDatePicker(task)"
                          >
                            Set Date
                          </v-btn>

                          <!-- Asset Assignment -->
                          <v-btn
                            v-else-if="task.task_type === 'assignment'"
                            size="small"
                            variant="outlined"
                            color="primary"
                            prepend-icon="mdi-package-variant"
                            @click="openAssetDialog(task)"
                          >
                            Assign
                          </v-btn>
                        </template>

                        <!-- Completed indicator -->
                        <v-chip
                          v-if="task.is_completed"
                          size="small"
                          color="success"
                          variant="flat"
                        >
                          <v-icon start size="small">mdi-check</v-icon>
                          Done
                        </v-chip>

                        <!-- Loading indicator -->
                        <v-progress-circular
                          v-if="savingTask === task.id"
                          size="20"
                          width="2"
                          indeterminate
                          color="primary"
                        />
                      </div>
                    </template>
                  </v-list-item>
                </v-list>

                <!-- Stage Navigation -->
                <div class="d-flex justify-space-between mt-6">
                  <v-btn
                    v-if="index > 0"
                    variant="text"
                    prepend-icon="mdi-chevron-left"
                    @click="currentStep = index"
                  >
                    Previous: {{ stages[index - 1].name }}
                  </v-btn>
                  <v-spacer />
                  <v-btn
                    v-if="index < stages.length - 1"
                    color="primary"
                    append-icon="mdi-chevron-right"
                    @click="currentStep = index + 2"
                  >
                    Next: {{ stages[index + 1].name }}
                  </v-btn>
                </div>
              </v-card>
            </v-stepper-window-item>
          </v-stepper-window>
        </v-stepper>
      </v-card>

      <!-- Assigned Assets Section -->
      <v-card v-if="assets.length > 0" class="mt-6" rounded="lg">
        <v-card-title class="d-flex align-center pa-4">
          <v-icon start color="primary">mdi-package-variant</v-icon>
          Assigned Assets
        </v-card-title>
        <v-divider />
        <v-list>
          <v-list-item
            v-for="asset in assets"
            :key="asset.id"
            class="py-3"
          >
            <template #prepend>
              <v-avatar color="primary" variant="tonal">
                <v-icon>{{ getAssetIcon(asset.asset_type) }}</v-icon>
              </v-avatar>
            </template>
            <v-list-item-title>{{ asset.asset_name }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ asset.asset_type }} • {{ asset.serial_number || 'No serial' }}
            </v-list-item-subtitle>
            <template #append>
              <v-chip size="small" :color="getConditionColor(asset.condition)">
                {{ asset.condition }}
              </v-chip>
            </template>
          </v-list-item>
        </v-list>
      </v-card>

      <!-- Notes Section -->
      <v-card class="mt-6" rounded="lg">
        <v-card-title class="d-flex align-center pa-4">
          <v-icon start color="primary">mdi-note-text</v-icon>
          Notes
        </v-card-title>
        <v-divider />
        <v-card-text>
          <v-textarea
            v-model="onboarding.notes"
            placeholder="Add notes about this onboarding..."
            variant="outlined"
            rows="3"
            hide-details
            @blur="saveNotes"
          />
        </v-card-text>
      </v-card>
    </div>

    <!-- Document Upload Dialog -->
    <v-dialog v-model="documentDialog" max-width="500">
      <v-card rounded="lg">
        <v-card-title class="bg-primary text-white pa-4">
          <v-icon start>mdi-file-upload</v-icon>
          Upload Document
        </v-card-title>
        <v-card-text class="pa-4">
          <p v-if="selectedTask" class="mb-4">
            Upload document for: <strong>{{ selectedTask.name }}</strong>
          </p>
          <v-file-input
            v-model="documentFile"
            label="Select Document"
            variant="outlined"
            prepend-icon=""
            prepend-inner-icon="mdi-paperclip"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          />
          <v-text-field
            v-model="documentDescription"
            label="Description (optional)"
            variant="outlined"
          />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="documentDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="uploadingDocument"
            :disabled="!documentFile"
            @click="uploadDocument"
          >
            Upload
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Signature Dialog -->
    <v-dialog v-model="signatureDialog" max-width="500">
      <v-card rounded="lg">
        <v-card-title class="bg-primary text-white pa-4">
          <v-icon start>mdi-signature-freehand</v-icon>
          Acknowledge & Sign
        </v-card-title>
        <v-card-text class="pa-4">
          <p v-if="selectedTask" class="mb-4">
            <strong>{{ selectedTask.name }}</strong>
          </p>
          <p v-if="selectedTask?.description" class="text-body-2 text-grey mb-4">
            {{ selectedTask.description }}
          </p>
          <v-checkbox
            v-model="signatureConfirm"
            label="I confirm this task has been completed and acknowledged"
            color="primary"
          />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="signatureDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="savingTask === selectedTask?.id"
            :disabled="!signatureConfirm"
            @click="confirmSignature"
          >
            Confirm
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Date Picker Dialog -->
    <v-dialog v-model="dateDialog" max-width="400">
      <v-card rounded="lg">
        <v-card-title class="bg-primary text-white pa-4">
          <v-icon start>mdi-calendar</v-icon>
          Set Date
        </v-card-title>
        <v-card-text class="pa-4">
          <p v-if="selectedTask" class="mb-4">
            <strong>{{ selectedTask.name }}</strong>
          </p>
          <v-date-picker
            v-model="selectedDate"
            color="primary"
            width="100%"
          />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="dateDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="savingTask === selectedTask?.id"
            :disabled="!selectedDate"
            @click="confirmDate"
          >
            Confirm
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Asset Assignment Dialog -->
    <v-dialog v-model="assetDialog" max-width="500">
      <v-card rounded="lg">
        <v-card-title class="bg-primary text-white pa-4">
          <v-icon start>mdi-package-variant</v-icon>
          Assign Asset
        </v-card-title>
        <v-card-text class="pa-4">
          <p v-if="selectedTask" class="mb-4">
            <strong>{{ selectedTask.name }}</strong>
          </p>
          <v-select
            v-model="newAsset.asset_type"
            :items="assetTypes"
            item-title="text"
            item-value="value"
            label="Asset Type"
            variant="outlined"
            class="mb-3"
          />
          <v-text-field
            v-model="newAsset.asset_name"
            label="Asset Name"
            variant="outlined"
            placeholder="e.g., MacBook Pro 14"
          />
          <v-text-field
            v-model="newAsset.serial_number"
            label="Serial Number (optional)"
            variant="outlined"
          />
          <v-select
            v-model="newAsset.condition"
            :items="['new', 'good', 'fair', 'poor']"
            label="Condition"
            variant="outlined"
          />
          <v-textarea
            v-model="newAsset.notes"
            label="Notes (optional)"
            variant="outlined"
            rows="2"
          />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="assetDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="savingAsset"
            :disabled="!newAsset.asset_type || !newAsset.asset_name"
            @click="assignAsset"
          >
            Assign
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Complete Onboarding Dialog -->
    <v-dialog v-model="completeDialog" max-width="500">
      <v-card rounded="lg">
        <v-card-title class="bg-success text-white pa-4">
          <v-icon start>mdi-check-all</v-icon>
          Complete Onboarding
        </v-card-title>
        <v-card-text class="pa-4">
          <p class="text-body-1 mb-4">
            You are about to complete onboarding for
            <strong>{{ candidate?.first_name }} {{ candidate?.last_name }}</strong>.
          </p>
          <v-alert type="info" variant="tonal" class="mb-4">
            This will:
            <ul class="mt-2 mb-0">
              <li>Mark onboarding as complete</li>
              <li>Create an employee record if not exists</li>
              <li>Transfer all documents and skills</li>
              <li>Send a welcome notification</li>
            </ul>
          </v-alert>
          <v-text-field
            v-model="actualStartDate"
            label="Actual Start Date"
            type="date"
            variant="outlined"
          />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="completeDialog = false">Cancel</v-btn>
          <v-btn
            color="success"
            :loading="completing"
            @click="executeComplete"
          >
            Complete Onboarding
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'management']
})

interface Stage {
  id: string
  template_id: string
  name: string
  description: string
  icon: string
  sort_order: number
}

interface Task {
  id: string
  onboarding_id: string
  task_template_id: string
  stage_id: string
  name: string
  description: string
  task_type: string
  is_required: boolean
  is_completed: boolean
  completed_at: string | null
  completed_by: string | null
  document_id: string | null
  notes: string | null
  sort_order: number
}

interface Onboarding {
  id: string
  candidate_id: string
  template_id: string
  current_stage_id: string
  status: string
  started_at: string
  completed_at: string | null
  assigned_to: string | null
  target_start_date: string | null
  actual_start_date: string | null
  notes: string | null
}

interface Candidate {
  id: string
  first_name: string
  last_name: string
  email: string
  job_positions?: { title: string }
}

interface Asset {
  id: string
  asset_type: string
  asset_name: string
  serial_number: string | null
  condition: string
  notes: string | null
}

const route = useRoute()
const client = useSupabaseClient()
const userStore = useUserStore()

// State
const loading = ref(true)
const error = ref<string | null>(null)
const onboarding = ref<Onboarding | null>(null)
const candidate = ref<Candidate | null>(null)
const stages = ref<Stage[]>([])
const tasks = ref<Task[]>([])
const assets = ref<Asset[]>([])
const currentStep = ref(1)
const savingTask = ref<string | null>(null)

// Dialogs
const documentDialog = ref(false)
const signatureDialog = ref(false)
const dateDialog = ref(false)
const assetDialog = ref(false)
const completeDialog = ref(false)
const selectedTask = ref<Task | null>(null)

// Document upload
const documentFile = ref<File | null>(null)
const documentDescription = ref('')
const uploadingDocument = ref(false)

// Signature
const signatureConfirm = ref(false)

// Date picker
const selectedDate = ref<Date | null>(null)

// Asset assignment
const savingAsset = ref(false)
const newAsset = ref({
  asset_type: '',
  asset_name: '',
  serial_number: '',
  condition: 'new',
  notes: ''
})

const assetTypes = [
  { value: 'laptop', text: 'Laptop' },
  { value: 'phone', text: 'Phone' },
  { value: 'tablet', text: 'Tablet' },
  { value: 'uniform', text: 'Uniform' },
  { value: 'badge', text: 'Badge/ID' },
  { value: 'keys', text: 'Keys' },
  { value: 'vehicle', text: 'Vehicle' },
  { value: 'equipment', text: 'Equipment' },
  { value: 'other', text: 'Other' }
]

// Complete onboarding
const completing = ref(false)
const actualStartDate = ref('')

// Snackbar
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

// Computed
const statusColor = computed(() => {
  switch (onboarding.value?.status) {
    case 'completed': return 'success'
    case 'in_progress': return 'primary'
    case 'paused': return 'warning'
    case 'cancelled': return 'error'
    default: return 'grey'
  }
})

const statusIcon = computed(() => {
  switch (onboarding.value?.status) {
    case 'completed': return 'mdi-check-circle'
    case 'in_progress': return 'mdi-progress-clock'
    case 'paused': return 'mdi-pause-circle'
    case 'cancelled': return 'mdi-close-circle'
    default: return 'mdi-circle-outline'
  }
})

const statusLabel = computed(() => {
  switch (onboarding.value?.status) {
    case 'completed': return 'Completed'
    case 'in_progress': return 'In Progress'
    case 'paused': return 'Paused'
    case 'cancelled': return 'Cancelled'
    default: return 'Not Started'
  }
})

const totalTasks = computed(() => tasks.value.length)
const completedTasks = computed(() => tasks.value.filter(t => t.is_completed).length)
const overallProgress = computed(() => {
  if (totalTasks.value === 0) return 0
  return Math.round((completedTasks.value / totalTasks.value) * 100)
})

// Methods
const showNotification = (message: string, color = 'success') => {
  snackbarText.value = message
  snackbarColor.value = color
  snackbar.value = true
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const getTasksForStage = (stageId: string) => {
  return tasks.value
    .filter(t => t.stage_id === stageId)
    .sort((a, b) => a.sort_order - b.sort_order)
}

const getStageProgress = (stageId: string) => {
  const stageTasks = getTasksForStage(stageId)
  if (stageTasks.length === 0) return 0
  const completed = stageTasks.filter(t => t.is_completed).length
  return Math.round((completed / stageTasks.length) * 100)
}

const getTaskIcon = (taskType: string) => {
  switch (taskType) {
    case 'document': return 'mdi-file-document'
    case 'signature': return 'mdi-signature-freehand'
    case 'notification': return 'mdi-email'
    case 'date': return 'mdi-calendar'
    case 'assignment': return 'mdi-package-variant'
    case 'form': return 'mdi-form-select'
    default: return 'mdi-checkbox-marked-circle'
  }
}

const getAssetIcon = (assetType: string) => {
  switch (assetType) {
    case 'laptop': return 'mdi-laptop'
    case 'phone': return 'mdi-cellphone'
    case 'tablet': return 'mdi-tablet'
    case 'uniform': return 'mdi-tshirt-crew'
    case 'badge': return 'mdi-badge-account'
    case 'keys': return 'mdi-key'
    case 'vehicle': return 'mdi-car'
    case 'equipment': return 'mdi-tools'
    default: return 'mdi-package-variant'
  }
}

const getConditionColor = (condition: string) => {
  switch (condition) {
    case 'new': return 'success'
    case 'good': return 'primary'
    case 'fair': return 'warning'
    case 'poor': return 'error'
    default: return 'grey'
  }
}

// Task actions
const toggleTask = async (task: Task, completed: boolean) => {
  savingTask.value = task.id
  try {
    const { error: updateError } = await client
      .from('candidate_onboarding_tasks')
      .update({
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
        completed_by: completed ? userStore.profile?.id : null
      })
      .eq('id', task.id)

    if (updateError) throw updateError

    task.is_completed = completed
    task.completed_at = completed ? new Date().toISOString() : null
    showNotification(completed ? 'Task completed!' : 'Task marked incomplete')
  } catch (err) {
    console.error('Error updating task:', err)
    showNotification('Failed to update task', 'error')
  } finally {
    savingTask.value = null
  }
}

const openDocumentUpload = (task: Task) => {
  selectedTask.value = task
  documentFile.value = null
  documentDescription.value = ''
  documentDialog.value = true
}

const uploadDocument = async () => {
  if (!selectedTask.value || !candidate.value) return
  
  // Handle v-file-input which returns an array in Vuetify 3
  const fileInput = documentFile.value
  const file = Array.isArray(fileInput) ? fileInput[0] : fileInput
  
  if (!file) return

  uploadingDocument.value = true
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${candidate.value.id}/${Date.now()}.${fileExt}`

    // Upload to storage
    const { error: uploadError } = await client.storage
      .from('candidate-documents')
      .upload(fileName, file)

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = client.storage
      .from('candidate-documents')
      .getPublicUrl(fileName)

    // Create document record
    const { data: doc, error: docError } = await client
      .from('candidate_documents')
      .insert({
        candidate_id: candidate.value.id,
        file_name: file.name,
        file_url: publicUrl,
        file_type: file.type,
        file_size: file.size,
        description: documentDescription.value || selectedTask.value.name,
        category: 'general',
        uploader_id: userStore.profile?.auth_user_id
      })
      .select()
      .single()

    if (docError) throw docError

    // Mark task complete with document reference
    await client
      .from('candidate_onboarding_tasks')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
        completed_by: userStore.profile?.id,
        document_id: doc.id
      })
      .eq('id', selectedTask.value.id)

    selectedTask.value.is_completed = true
    documentDialog.value = false
    showNotification('Document uploaded and task completed!')
    await fetchData()
  } catch (err) {
    console.error('Error uploading document:', err)
    showNotification('Failed to upload document', 'error')
  } finally {
    uploadingDocument.value = false
  }
}

const openSignatureDialog = (task: Task) => {
  selectedTask.value = task
  signatureConfirm.value = false
  signatureDialog.value = true
}

const confirmSignature = async () => {
  if (!selectedTask.value) return
  await toggleTask(selectedTask.value, true)
  signatureDialog.value = false
}

const openDatePicker = (task: Task) => {
  selectedTask.value = task
  selectedDate.value = null
  dateDialog.value = true
}

const confirmDate = async () => {
  if (!selectedTask.value || !selectedDate.value) return

  savingTask.value = selectedTask.value.id
  try {
    // Update task with notes containing the date
    await client
      .from('candidate_onboarding_tasks')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
        completed_by: userStore.profile?.id,
        notes: selectedDate.value.toISOString().split('T')[0]
      })
      .eq('id', selectedTask.value.id)

    // If this is the "Set Start Date" task, update the onboarding target date
    if (selectedTask.value.name.toLowerCase().includes('start date') && onboarding.value) {
      await client
        .from('candidate_onboarding')
        .update({ target_start_date: selectedDate.value.toISOString().split('T')[0] })
        .eq('id', onboarding.value.id)
      onboarding.value.target_start_date = selectedDate.value.toISOString().split('T')[0]
    }

    selectedTask.value.is_completed = true
    dateDialog.value = false
    showNotification('Date set and task completed!')
    await fetchData()
  } catch (err) {
    console.error('Error setting date:', err)
    showNotification('Failed to set date', 'error')
  } finally {
    savingTask.value = null
  }
}

const sendNotification = async (task: Task) => {
  savingTask.value = task.id
  try {
    // Create notification record
    if (onboarding.value) {
      await client.from('onboarding_notifications').insert({
        onboarding_id: onboarding.value.id,
        task_id: task.id,
        notification_type: 'policy_sent',
        recipient_type: 'candidate',
        recipient_email: candidate.value?.email,
        subject: task.name,
        body: task.description,
        is_sent: true,
        sent_at: new Date().toISOString()
      })
    }

    // Mark task complete
    await toggleTask(task, true)
    showNotification('Notification sent!')
  } catch (err) {
    console.error('Error sending notification:', err)
    showNotification('Failed to send notification', 'error')
  }
}

const openAssetDialog = (task: Task) => {
  selectedTask.value = task
  newAsset.value = {
    asset_type: '',
    asset_name: '',
    serial_number: '',
    condition: 'new',
    notes: ''
  }
  assetDialog.value = true
}

const assignAsset = async () => {
  if (!selectedTask.value || !candidate.value) return

  savingAsset.value = true
  try {
    const { data: asset, error: assetError } = await client
      .from('employee_assets')
      .insert({
        candidate_id: candidate.value.id,
        asset_type: newAsset.value.asset_type,
        asset_name: newAsset.value.asset_name,
        serial_number: newAsset.value.serial_number || null,
        condition: newAsset.value.condition,
        notes: newAsset.value.notes || null,
        assigned_by: userStore.profile?.id
      })
      .select()
      .single()

    if (assetError) throw assetError

    assets.value.push(asset)

    // Mark task complete
    await toggleTask(selectedTask.value, true)
    assetDialog.value = false
    showNotification('Asset assigned and task completed!')
  } catch (err) {
    console.error('Error assigning asset:', err)
    showNotification('Failed to assign asset', 'error')
  } finally {
    savingAsset.value = false
  }
}

const saveNotes = async () => {
  if (!onboarding.value) return
  try {
    await client
      .from('candidate_onboarding')
      .update({ notes: onboarding.value.notes })
      .eq('id', onboarding.value.id)
  } catch (err) {
    console.error('Error saving notes:', err)
  }
}

const completeOnboarding = () => {
  actualStartDate.value = onboarding.value?.target_start_date || new Date().toISOString().split('T')[0]
  completeDialog.value = true
}

const executeComplete = async () => {
  if (!onboarding.value || !candidate.value) return

  completing.value = true
  try {
    // Update onboarding status
    await client
      .from('candidate_onboarding')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        actual_start_date: actualStartDate.value
      })
      .eq('id', onboarding.value.id)

    // Update candidate status
    await client
      .from('candidates')
      .update({
        onboarding_complete: true
      })
      .eq('id', candidate.value.id)

    onboarding.value.status = 'completed'
    completeDialog.value = false
    showNotification('Onboarding completed successfully!')

    // Navigate back to list after a delay
    setTimeout(() => {
      navigateTo('/recruiting/onboarding')
    }, 1500)
  } catch (err) {
    console.error('Error completing onboarding:', err)
    showNotification('Failed to complete onboarding', 'error')
  } finally {
    completing.value = false
  }
}

const fetchData = async () => {
  const id = route.params.id as string
  loading.value = true
  error.value = null

  try {
    // Fetch onboarding record
    const { data: onboardingData, error: onboardingError } = await client
      .from('candidate_onboarding')
      .select(`
        *,
        candidates:candidate_id(
          *,
          job_positions:target_position_id(title)
        )
      `)
      .eq('id', id)
      .single()

    if (onboardingError) {
      if (onboardingError.code === 'PGRST116') {
        error.value = 'Onboarding record not found'
      } else {
        throw onboardingError
      }
      return
    }

    onboarding.value = onboardingData
    candidate.value = onboardingData.candidates

    // Fetch stages for the template
    const { data: stagesData } = await client
      .from('onboarding_stages')
      .select('*')
      .eq('template_id', onboardingData.template_id)
      .order('sort_order')

    stages.value = stagesData || []

    // Fetch tasks for this onboarding
    const { data: tasksData } = await client
      .from('candidate_onboarding_tasks')
      .select('*')
      .eq('onboarding_id', id)
      .order('sort_order')

    tasks.value = tasksData || []

    // Find current stage step
    if (onboardingData.current_stage_id) {
      const stageIndex = stages.value.findIndex(s => s.id === onboardingData.current_stage_id)
      if (stageIndex >= 0) currentStep.value = stageIndex + 1
    }

    // Fetch assigned assets
    const { data: assetsData } = await client
      .from('employee_assets')
      .select('*')
      .eq('candidate_id', candidate.value?.id)

    assets.value = assetsData || []
  } catch (err) {
    console.error('Error fetching data:', err)
    error.value = 'Failed to load onboarding data'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>
