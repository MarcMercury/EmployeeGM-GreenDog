<template>
  <v-dialog
    :model-value="modelValue"
    fullscreen
    transition="dialog-bottom-transition"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card v-if="review">
      <!-- Dialog Header -->
      <v-toolbar color="primary">
        <v-btn icon="mdi-close" @click="$emit('close')" />
        <v-toolbar-title>
          {{ viewMode === 'employee' ? 'My Review' : `Review: ${getFullName(review.employee)}` }}
        </v-toolbar-title>
        <v-spacer />
        <v-chip variant="elevated" class="mr-2">
          {{ getStageLabel(review.current_stage) }}
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
                  v-if="review.template?.form_schema"
                  ref="employeeFormRef"
                  :questions="review.template.form_schema"
                  :responses="review.responses"
                  role="employee"
                  :read-only="review.current_stage !== 'self_review'"
                  @save="handleSaveResponse"
                />

                <v-alert
                  v-if="review.current_stage !== 'self_review'"
                  type="info"
                  variant="tonal"
                  class="mt-4"
                >
                  Your self-review has been submitted. It is now with your manager.
                </v-alert>

                <!-- Manager's Assessment (visible after delivery) -->
                <template v-if="review.current_stage === 'delivery' || review.current_stage === 'acknowledged'">
                  <v-divider class="my-6" />
                  <h2 class="text-h5 mb-4">Manager's Assessment</h2>
                  
                  <ReviewFormBuilder
                    :questions="review.template?.form_schema || []"
                    :responses="review.responses"
                    role="manager"
                    read-only
                  />

                  <!-- Overall Rating -->
                  <v-card v-if="review.overall_rating" variant="tonal" color="primary" class="mt-4">
                    <v-card-text class="text-center">
                      <div class="text-overline">Overall Rating</div>
                      <v-rating
                        :model-value="review.overall_rating"
                        readonly
                        color="amber"
                        size="large"
                      />
                      <div class="text-h6 mt-2">
                        {{ getRatingLabel(review.overall_rating) }}
                      </div>
                    </v-card-text>
                  </v-card>
                </template>

                <!-- Actions -->
                <v-card-actions class="mt-6 pa-0">
                  <v-btn variant="text" @click="$emit('close')">
                    Close
                  </v-btn>
                  <v-spacer />
                  <v-btn
                    v-if="review.current_stage === 'self_review'"
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
                  v-if="!review.employee_submitted_at"
                  type="info"
                  variant="tonal"
                  class="mb-4"
                >
                  Employee has not submitted their self-review yet.
                </v-alert>

                <ReviewFormBuilder
                  v-else-if="review.template?.form_schema"
                  :questions="review.template.form_schema"
                  :responses="review.responses"
                  role="employee"
                  read-only
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
                  v-if="review.template?.form_schema"
                  ref="managerFormRef"
                  :questions="review.template.form_schema"
                  :responses="review.responses"
                  role="manager"
                  :read-only="review.manager_submitted_at !== null"
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
                      :readonly="review.manager_submitted_at !== null"
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
                      :readonly="review.manager_submitted_at !== null"
                    />
                  </v-card-text>
                </v-card>

                <!-- Actions -->
                <v-card-actions class="mt-6 pa-0">
                  <v-btn variant="text" @click="$emit('close')">
                    Close
                  </v-btn>
                  <v-spacer />
                  <v-btn
                    v-if="review.current_stage === 'manager_review'"
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
</template>

<script setup lang="ts">
import ReviewFormBuilder from './ReviewFormBuilder.vue'

const props = defineProps<{
  modelValue: boolean
  review: any
  viewMode: 'employee' | 'manager'
}>()

const emit = defineEmits(['update:modelValue', 'close', 'updated'])

const performanceStore = usePerformanceStore()

const submitting = ref(false)
const signing = ref(false)
const overallRating = ref(0)
const summaryComment = ref('')

const employeeFormRef = ref<InstanceType<typeof ReviewFormBuilder> | null>(null)
const managerFormRef = ref<InstanceType<typeof ReviewFormBuilder> | null>(null)

// Initialize values when review changes
watch(() => props.review, (newReview) => {
  if (newReview) {
    overallRating.value = newReview.overall_rating || 0
    summaryComment.value = newReview.summary_comment || ''
  }
}, { immediate: true })

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

function getFullName(employee: any): string {
  if (!employee) return 'Unknown'
  return `${employee.first_name} ${employee.last_name}`
}

function getRatingLabel(value: number): string {
  const labels = ['', 'Needs Improvement', 'Below Expectations', 'Meets Expectations', 'Exceeds Expectations', 'Outstanding']
  return labels[value] || ''
}

function canSign(role: 'employee' | 'manager'): boolean {
  if (!props.review) return false
  if (props.review.current_stage !== 'delivery' && props.review.current_stage !== 'acknowledged') {
    return false
  }
  const signoffs = props.review.signoffs || []
  return !signoffs.some((s: any) => s.role === role)
}

async function handleSaveResponse(questionKey: string, text?: string, value?: number) {
  if (!props.review) return
  
  await performanceStore.saveReviewResponse(
    props.review.id,
    questionKey,
    props.viewMode,
    text,
    value
  )
}

async function submitSelfReview() {
  if (!props.review) return
  
  submitting.value = true
  try {
    await performanceStore.submitSelfReview(props.review.id)
    emit('updated')
  } finally {
    submitting.value = false
  }
}

async function submitManagerReview() {
  if (!props.review) return
  
  submitting.value = true
  try {
    await performanceStore.submitManagerReview(
      props.review.id,
      overallRating.value || undefined,
      summaryComment.value || undefined
    )
    emit('updated')
  } finally {
    submitting.value = false
  }
}

async function signReview(role: 'employee' | 'manager') {
  if (!props.review) return
  
  signing.value = true
  try {
    await performanceStore.signReview(props.review.id, role)
    emit('updated')
  } finally {
    signing.value = false
  }
}
</script>

<style scoped>
.border-e {
  border-right: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
