<template>
  <v-container fluid>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Performance Reviews</h1>
        <p class="text-body-2 text-grey">Manage your reviews and direct reports</p>
      </div>
      <v-chip v-if="activeCycle" color="primary" variant="tonal">
        {{ activeCycle.name }}
      </v-chip>
    </div>

    <!-- Tabs -->
    <v-tabs v-model="activeTab" color="primary" class="mb-4">
      <v-tab value="my-reviews">My Reviews</v-tab>
      <v-tab v-if="hasDirectReports" value="team-reviews">
        Team Reviews
        <v-badge
          v-if="pendingTeamCount > 0"
          :content="pendingTeamCount"
          color="error"
          inline
          class="ml-2"
        />
      </v-tab>
    </v-tabs>

    <v-window v-model="activeTab">
      <!-- My Reviews Tab -->
      <v-window-item value="my-reviews">
        <div v-if="loading" class="d-flex justify-center py-8">
          <v-progress-circular indeterminate color="primary" />
        </div>

        <v-card v-else-if="myReviews.length === 0" class="text-center pa-8">
          <v-icon size="64" color="grey-lighten-1">mdi-clipboard-text-outline</v-icon>
          <h3 class="text-h6 mt-4">No Active Reviews</h3>
          <p class="text-body-2 text-grey">
            You'll see your performance reviews here when a cycle begins
          </p>
        </v-card>

        <v-row v-else>
          <v-col
            v-for="review in myReviews"
            :key="review.id"
            cols="12"
            md="6"
          >
            <v-card class="review-card" @click="openReview(review, 'employee')">
              <v-card-title class="d-flex align-center">
                <v-avatar
                  :color="getStageColor(review.current_stage)"
                  size="40"
                  class="mr-3"
                >
                  <v-icon color="white" size="20">
                    {{ getStageIcon(review.current_stage) }}
                  </v-icon>
                </v-avatar>
                <div>
                  <div class="text-subtitle-1">
                    {{ review.cycle?.name || 'Performance Review' }}
                  </div>
                  <div class="text-caption text-grey">
                    {{ getStageLabel(review.current_stage) }}
                  </div>
                </div>
              </v-card-title>

              <v-card-text>
                <v-progress-linear
                  :model-value="getReviewProgress(review)"
                  color="primary"
                  height="8"
                  rounded
                  class="mb-2"
                />
                <div class="d-flex justify-space-between text-caption">
                  <span>{{ getReviewProgress(review) }}% Complete</span>
                  <span v-if="review.cycle?.due_date">
                    Due {{ formatDate(review.cycle.due_date) }}
                  </span>
                </div>
              </v-card-text>

              <v-card-actions>
                <v-chip
                  :color="getStatusColor(review.status)"
                  size="small"
                  variant="tonal"
                >
                  {{ review.status }}
                </v-chip>
                <v-spacer />
                <v-btn
                  color="primary"
                  variant="text"
                  append-icon="mdi-chevron-right"
                >
                  {{ review.current_stage === 'self_review' ? 'Continue' : 'View' }}
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- Team Reviews Tab -->
      <v-window-item value="team-reviews">
        <div v-if="loading" class="d-flex justify-center py-8">
          <v-progress-circular indeterminate color="primary" />
        </div>

        <v-card v-else-if="directReportReviews.length === 0" class="text-center pa-8">
          <v-icon size="64" color="grey-lighten-1">mdi-account-group-outline</v-icon>
          <h3 class="text-h6 mt-4">No Team Reviews</h3>
          <p class="text-body-2 text-grey">
            Your direct reports' reviews will appear here
          </p>
        </v-card>

        <v-list v-else lines="two">
          <v-list-item
            v-for="review in directReportReviews"
            :key="review.id"
            @click="openReview(review, 'manager')"
            class="review-list-item mb-2"
          >
            <template #prepend>
              <v-avatar color="primary" size="48">
                <span class="text-subtitle-2">
                  {{ getInitials(review.employee) }}
                </span>
              </v-avatar>
            </template>

            <v-list-item-title class="font-weight-medium">
              {{ getFullName(review.employee) }}
            </v-list-item-title>

            <v-list-item-subtitle>
              {{ review.employee?.position_title || 'Team Member' }}
              <v-chip
                :color="getStageColor(review.current_stage)"
                size="x-small"
                variant="tonal"
                class="ml-2"
              >
                {{ getStageLabel(review.current_stage) }}
              </v-chip>
            </v-list-item-subtitle>

            <template #append>
              <div class="d-flex align-center gap-2">
                <v-chip
                  v-if="needsAction(review)"
                  color="warning"
                  size="small"
                  variant="elevated"
                >
                  Action Required
                </v-chip>
                <v-btn icon="mdi-chevron-right" variant="text" size="small" />
              </div>
            </template>
          </v-list-item>
        </v-list>
      </v-window-item>
    </v-window>

    <!-- Review Detail Dialog -->
    <v-dialog
      v-model="showReviewDialog"
      fullscreen
      transition="dialog-bottom-transition"
    >
      <v-card v-if="selectedReview">
        <!-- Dialog Header -->
        <v-toolbar color="primary">
          <v-btn icon="mdi-close" @click="closeReview" />
          <v-toolbar-title>
            {{ viewMode === 'employee' ? 'My Review' : `Review: ${getFullName(selectedReview.employee)}` }}
          </v-toolbar-title>
          <v-spacer />
          <v-chip variant="elevated" class="mr-2">
            {{ getStageLabel(selectedReview.current_stage) }}
          </v-chip>
        </v-toolbar>

        <v-container fluid class="pa-0">
          <v-row no-gutters>
            <!-- Employee View: Self-Review Form -->
            <template v-if="viewMode === 'employee'">
              <v-col cols="12">
                <div class="pa-6">
                  <h2 class="text-h5 mb-4">Self Assessment</h2>
                  
                  <ReviewFormBuilder
                    v-if="selectedReview.template?.form_schema"
                    ref="employeeFormRef"
                    :questions="selectedReview.template.form_schema"
                    :responses="selectedReview.responses"
                    role="employee"
                    :read-only="selectedReview.current_stage !== 'self_review'"
                    @save="handleSaveResponse"
                  />

                  <v-alert
                    v-if="selectedReview.current_stage !== 'self_review'"
                    type="info"
                    variant="tonal"
                    class="mt-4"
                  >
                    Your self-review has been submitted. It is now with your manager.
                  </v-alert>

                  <!-- Manager's Assessment (visible after delivery) -->
                  <template v-if="selectedReview.current_stage === 'delivery' || selectedReview.current_stage === 'acknowledged'">
                    <v-divider class="my-6" />
                    <h2 class="text-h5 mb-4">Manager's Assessment</h2>
                    
                    <ReviewFormBuilder
                      :questions="selectedReview.template?.form_schema || []"
                      :responses="selectedReview.responses"
                      role="manager"
                      read-only
                    />

                    <!-- Overall Rating -->
                    <v-card v-if="selectedReview.overall_rating" variant="tonal" color="primary" class="mt-4">
                      <v-card-text class="text-center">
                        <div class="text-overline">Overall Rating</div>
                        <v-rating
                          :model-value="selectedReview.overall_rating"
                          readonly
                          color="amber"
                          size="large"
                        />
                        <div class="text-h6 mt-2">
                          {{ getRatingLabel(selectedReview.overall_rating) }}
                        </div>
                      </v-card-text>
                    </v-card>
                  </template>

                  <!-- Actions -->
                  <v-card-actions class="mt-6 pa-0">
                    <v-btn variant="text" @click="closeReview">
                      Close
                    </v-btn>
                    <v-spacer />
                    <v-btn
                      v-if="selectedReview.current_stage === 'self_review'"
                      color="primary"
                      :loading="submitting"
                      @click="submitSelfReview"
                    >
                      <v-icon start>mdi-send</v-icon>
                      Submit Self-Review
                    </v-btn>
                    <v-btn
                      v-if="canSign('employee')"
                      color="success"
                      :loading="signing"
                      @click="signReview('employee')"
                    >
                      <v-icon start>mdi-signature</v-icon>
                      Sign & Acknowledge
                    </v-btn>
                  </v-card-actions>
                </div>
              </v-col>
            </template>

            <!-- Manager View: Split Screen -->
            <template v-else>
              <!-- Left: Employee's Self-Review (Read-Only) -->
              <v-col cols="12" md="6" class="border-e">
                <div class="pa-6">
                  <h2 class="text-h5 mb-4">
                    <v-icon start>mdi-account</v-icon>
                    Employee Self-Assessment
                  </h2>
                  
                  <v-alert
                    v-if="!selectedReview.employee_submitted_at"
                    type="info"
                    variant="tonal"
                    class="mb-4"
                  >
                    Employee has not submitted their self-review yet.
                  </v-alert>

                  <ReviewFormBuilder
                    v-else-if="selectedReview.template?.form_schema"
                    :questions="selectedReview.template.form_schema"
                    :responses="selectedReview.responses"
                    role="employee"
                    read-only
                  />

                  <!-- Feedback History -->
                  <v-divider class="my-6" />
                  <h3 class="text-subtitle-1 mb-3">
                    <v-icon start size="small">mdi-message-text</v-icon>
                    Recent Feedback
                  </h3>
                  <FeedbackList
                    :feedback="employeeFeedback"
                    compact
                  />
                </div>
              </v-col>

              <!-- Right: Manager's Assessment -->
              <v-col cols="12" md="6">
                <div class="pa-6">
                  <h2 class="text-h5 mb-4">
                    <v-icon start>mdi-clipboard-check</v-icon>
                    Manager Assessment
                  </h2>

                  <ReviewFormBuilder
                    v-if="selectedReview.template?.form_schema"
                    ref="managerFormRef"
                    :questions="selectedReview.template.form_schema"
                    :responses="selectedReview.responses"
                    role="manager"
                    :read-only="selectedReview.manager_submitted_at !== null"
                    @save="handleSaveResponse"
                  />

                  <!-- Overall Rating -->
                  <v-card variant="outlined" class="mt-4">
                    <v-card-text>
                      <div class="text-subtitle-2 mb-2">Overall Rating</div>
                      <v-rating
                        v-model="overallRating"
                        color="amber"
                        hover
                        length="5"
                        size="large"
                        :readonly="selectedReview.manager_submitted_at !== null"
                      />
                      <div class="text-caption text-grey mt-1">
                        {{ getRatingLabel(overallRating) }}
                      </div>

                      <v-textarea
                        v-model="summaryComment"
                        label="Summary Comments"
                        variant="outlined"
                        rows="3"
                        class="mt-4"
                        :readonly="selectedReview.manager_submitted_at !== null"
                      />
                    </v-card-text>
                  </v-card>

                  <!-- Actions -->
                  <v-card-actions class="mt-6 pa-0">
                    <v-btn variant="text" @click="closeReview">
                      Close
                    </v-btn>
                    <v-spacer />
                    <v-btn
                      v-if="selectedReview.current_stage === 'manager_review'"
                      color="primary"
                      :loading="submitting"
                      @click="submitManagerReview"
                    >
                      <v-icon start>mdi-send</v-icon>
                      Submit & Share with Employee
                    </v-btn>
                    <v-btn
                      v-if="canSign('manager')"
                      color="success"
                      :loading="signing"
                      @click="signReview('manager')"
                    >
                      <v-icon start>mdi-signature</v-icon>
                      Sign & Finalize
                    </v-btn>
                  </v-card-actions>
                </div>
              </v-col>
            </template>
          </v-row>
        </v-container>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePerformanceStore, type PerformanceReview, type Feedback } from '~/stores/performance'
import { useAuthStore } from '~/stores/auth'
import ReviewFormBuilder from './ReviewFormBuilder.vue'
import FeedbackList from './FeedbackList.vue'

const performanceStore = usePerformanceStore()
const authStore = useAuthStore()

// State
const activeTab = ref('my-reviews')
const showReviewDialog = ref(false)
const selectedReview = ref<PerformanceReview | null>(null)
const viewMode = ref<'employee' | 'manager'>('employee')
const submitting = ref(false)
const signing = ref(false)
const overallRating = ref(0)
const summaryComment = ref('')
const employeeFeedback = ref<Feedback[]>([])

const employeeFormRef = ref<InstanceType<typeof ReviewFormBuilder> | null>(null)
const managerFormRef = ref<InstanceType<typeof ReviewFormBuilder> | null>(null)

// Computed
const loading = computed(() => performanceStore.loading)
const activeCycle = computed(() => performanceStore.activeCycle)
const myReviews = computed(() => performanceStore.myReviews)
const directReportReviews = computed(() => performanceStore.directReportReviews)
const hasDirectReports = computed(() => directReportReviews.value.length > 0 || authStore.isAdmin)
const pendingTeamCount = computed(() => performanceStore.pendingDirectReportReviews.length)

// Methods
function getStageColor(stage: string | null): string {
  switch (stage) {
    case 'self_review': return 'info'
    case 'manager_review': return 'warning'
    case 'calibration': return 'purple'
    case 'delivery': return 'primary'
    case 'acknowledged': return 'success'
    default: return 'grey'
  }
}

function getStageIcon(stage: string | null): string {
  switch (stage) {
    case 'self_review': return 'mdi-account-edit'
    case 'manager_review': return 'mdi-account-supervisor'
    case 'calibration': return 'mdi-scale-balance'
    case 'delivery': return 'mdi-email-send'
    case 'acknowledged': return 'mdi-check-decagram'
    default: return 'mdi-clipboard-text'
  }
}

function getStageLabel(stage: string | null): string {
  switch (stage) {
    case 'self_review': return 'Self Review'
    case 'manager_review': return 'Manager Review'
    case 'calibration': return 'Calibration'
    case 'delivery': return 'Pending Acknowledgment'
    case 'acknowledged': return 'Completed'
    default: return 'Draft'
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed': return 'success'
    case 'submitted': return 'info'
    case 'in_progress': return 'warning'
    case 'cancelled': return 'error'
    default: return 'grey'
  }
}

function getReviewProgress(review: PerformanceReview): number {
  switch (review.current_stage) {
    case 'self_review': return 25
    case 'manager_review': return 50
    case 'calibration': return 65
    case 'delivery': return 80
    case 'acknowledged': return 100
    default: return 0
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
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

function getRatingLabel(value: number): string {
  const labels = ['', 'Needs Improvement', 'Below Expectations', 'Meets Expectations', 'Exceeds Expectations', 'Outstanding']
  return labels[value] || ''
}

function needsAction(review: PerformanceReview): boolean {
  return review.current_stage === 'manager_review' && !review.manager_submitted_at
}

function canSign(role: 'employee' | 'manager'): boolean {
  if (!selectedReview.value) return false
  if (selectedReview.value.current_stage !== 'delivery' && selectedReview.value.current_stage !== 'acknowledged') {
    return false
  }
  // Check if already signed
  const signoffs = selectedReview.value.signoffs || []
  return !signoffs.some(s => s.role === role)
}

async function openReview(review: PerformanceReview, mode: 'employee' | 'manager') {
  viewMode.value = mode
  
  // Load full review with responses
  await performanceStore.fetchReviewWithResponses(review.id)
  selectedReview.value = performanceStore.currentReview
  
  // Set initial values
  overallRating.value = selectedReview.value?.overall_rating || 0
  summaryComment.value = selectedReview.value?.summary_comment || ''
  
  // If manager view, load feedback for the employee
  if (mode === 'manager' && review.employee_id) {
    const lastCycleDate = review.cycle?.period_start || new Date().toISOString()
    employeeFeedback.value = await performanceStore.fetchFeedbackForEmployee(
      review.employee_id,
      lastCycleDate
    )
  }
  
  showReviewDialog.value = true
}

function closeReview() {
  showReviewDialog.value = false
  selectedReview.value = null
  performanceStore.resetCurrentReview()
}

async function handleSaveResponse(questionKey: string, text?: string, value?: number) {
  if (!selectedReview.value) return
  
  const role = viewMode.value
  await performanceStore.saveReviewResponse(
    selectedReview.value.id,
    questionKey,
    role,
    text,
    value
  )
}

async function submitSelfReview() {
  if (!selectedReview.value) return
  
  // Validate form
  if (employeeFormRef.value && !employeeFormRef.value.isValid) {
    // Show validation error
    return
  }
  
  submitting.value = true
  try {
    await performanceStore.submitSelfReview(selectedReview.value.id)
    // Refresh review data
    await performanceStore.fetchReviewWithResponses(selectedReview.value.id)
    selectedReview.value = performanceStore.currentReview
  } finally {
    submitting.value = false
  }
}

async function submitManagerReview() {
  if (!selectedReview.value) return
  
  submitting.value = true
  try {
    await performanceStore.submitManagerReview(
      selectedReview.value.id,
      overallRating.value || undefined,
      summaryComment.value || undefined
    )
    // Refresh review data
    await performanceStore.fetchReviewWithResponses(selectedReview.value.id)
    selectedReview.value = performanceStore.currentReview
  } finally {
    submitting.value = false
  }
}

async function signReview(role: 'employee' | 'manager') {
  if (!selectedReview.value) return
  
  signing.value = true
  try {
    await performanceStore.signReview(selectedReview.value.id, role)
    // Refresh review data
    await performanceStore.fetchReviewWithResponses(selectedReview.value.id)
    selectedReview.value = performanceStore.currentReview
    
    // Refresh lists
    await Promise.all([
      performanceStore.fetchMyReviews(),
      performanceStore.fetchDirectReportReviews()
    ])
  } finally {
    signing.value = false
  }
}

// Lifecycle
onMounted(async () => {
  await Promise.all([
    performanceStore.fetchReviewCycles(),
    performanceStore.fetchMyReviews(),
    performanceStore.fetchDirectReportReviews(),
    performanceStore.fetchTemplates()
  ])
})
</script>

<style scoped>
.review-card {
  cursor: pointer;
  transition: all 0.2s;
}

.review-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.review-list-item {
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  cursor: pointer;
  transition: all 0.2s;
}

.review-list-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.border-e {
  border-right: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
