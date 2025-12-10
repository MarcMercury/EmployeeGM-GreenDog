<template>
  <div class="review-form-builder">
    <!-- Section Groups -->
    <template v-for="(section, sectionIndex) in sections" :key="sectionIndex">
      <v-card variant="outlined" class="mb-4">
        <v-card-title v-if="section.name" class="text-subtitle-1 bg-grey-lighten-4">
          {{ section.name }}
        </v-card-title>

        <v-card-text>
          <div
            v-for="question in section.questions"
            :key="question.key"
            class="question-item mb-6"
          >
            <!-- Question Label -->
            <div class="d-flex align-center mb-2">
              <span class="text-subtitle-2">{{ question.label }}</span>
              <v-chip
                v-if="question.required"
                size="x-small"
                color="error"
                variant="text"
                class="ml-2"
              >
                Required
              </v-chip>
            </div>
            
            <!-- Help Text -->
            <p v-if="question.helpText" class="text-caption text-grey mb-2">
              {{ question.helpText }}
            </p>

            <!-- Read-Only Display (for viewing other's responses) -->
            <template v-if="readOnly">
              <v-card
                v-if="getResponse(question.key)"
                variant="tonal"
                color="grey-lighten-4"
                class="pa-3"
              >
                <!-- Rating Display -->
                <div v-if="question.type === 'rating'">
                  <v-rating
                    :model-value="getResponse(question.key)?.answer_value || 0"
                    readonly
                    color="amber"
                    density="compact"
                  />
                </div>
                <!-- Text Display -->
                <div v-else class="text-body-2" style="white-space: pre-wrap;">
                  {{ getResponse(question.key)?.answer_text || 'No response' }}
                </div>
              </v-card>
              <v-alert v-else type="info" variant="tonal" density="compact">
                No response yet
              </v-alert>
            </template>

            <!-- Editable Inputs -->
            <template v-else>
              <!-- Text Input -->
              <v-text-field
                v-if="question.type === 'text'"
                :model-value="answers[question.key]?.text || ''"
                @update:model-value="updateAnswer(question.key, 'text', $event)"
                variant="outlined"
                density="comfortable"
                :placeholder="question.helpText"
                :error="isRequired(question) && !answers[question.key]?.text"
              />

              <!-- Textarea -->
              <v-textarea
                v-else-if="question.type === 'textarea'"
                :model-value="answers[question.key]?.text || ''"
                @update:model-value="updateAnswer(question.key, 'text', $event)"
                variant="outlined"
                rows="4"
                :placeholder="question.helpText"
                :error="isRequired(question) && !answers[question.key]?.text"
                auto-grow
              >
                <template #append-inner>
                  <v-tooltip location="top">
                    <template #activator="{ props }">
                      <v-icon v-bind="props" size="small" color="grey">
                        mdi-markdown
                      </v-icon>
                    </template>
                    Markdown supported
                  </v-tooltip>
                </template>
              </v-textarea>

              <!-- Rating -->
              <div v-else-if="question.type === 'rating'" class="d-flex align-center gap-4">
                <v-rating
                  :model-value="answers[question.key]?.value || 0"
                  @update:model-value="updateAnswer(question.key, 'value', $event)"
                  color="amber"
                  hover
                  length="5"
                  size="large"
                />
                <v-chip
                  v-if="answers[question.key]?.value"
                  color="primary"
                  variant="tonal"
                >
                  {{ getRatingLabel(answers[question.key]?.value) }}
                </v-chip>
              </div>

              <!-- Select -->
              <v-select
                v-else-if="question.type === 'select'"
                :model-value="answers[question.key]?.text || ''"
                @update:model-value="updateAnswer(question.key, 'text', $event)"
                :items="question.options || []"
                variant="outlined"
                density="comfortable"
                :error="isRequired(question) && !answers[question.key]?.text"
              />

              <!-- Multi-Select -->
              <v-select
                v-else-if="question.type === 'multiselect'"
                :model-value="parseMultiSelect(answers[question.key]?.text)"
                @update:model-value="updateAnswer(question.key, 'text', JSON.stringify($event))"
                :items="question.options || []"
                variant="outlined"
                density="comfortable"
                multiple
                chips
                closable-chips
              />
            </template>
          </div>
        </v-card-text>
      </v-card>
    </template>

    <!-- Validation Summary -->
    <v-alert
      v-if="!readOnly && missingRequired.length > 0"
      type="warning"
      variant="tonal"
      class="mb-4"
    >
      <div class="text-subtitle-2">Missing required fields:</div>
      <ul class="text-body-2 mb-0">
        <li v-for="field in missingRequired" :key="field">{{ field }}</li>
      </ul>
    </v-alert>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ReviewQuestion, ReviewResponse } from '~/stores/performance'

const props = defineProps<{
  questions: ReviewQuestion[]
  responses?: ReviewResponse[]
  role: 'employee' | 'manager'
  readOnly?: boolean
}>()

const emit = defineEmits<{
  'update:answers': [answers: Record<string, { text?: string; value?: number }>]
  'save': [questionKey: string, text?: string, value?: number]
}>()

// State - answers keyed by question.key
const answers = ref<Record<string, { text?: string; value?: number }>>({})

// Initialize answers from responses
watch(() => props.responses, (newResponses) => {
  if (newResponses) {
    const answerMap: Record<string, { text?: string; value?: number }> = {}
    newResponses
      .filter(r => r.responder_role === props.role)
      .forEach(r => {
        if (r.question_key) {
          answerMap[r.question_key] = {
            text: r.answer_text || undefined,
            value: r.answer_value ?? undefined
          }
        }
      })
    answers.value = answerMap
  }
}, { immediate: true })

// Computed
const sections = computed(() => {
  // Group questions by section
  const sectionMap = new Map<string, ReviewQuestion[]>()
  
  // Filter questions for this role
  const roleQuestions = props.questions.filter(q => 
    !q.forRoles || q.forRoles.includes(props.role)
  )

  roleQuestions.forEach(q => {
    const sectionName = q.section || 'General'
    if (!sectionMap.has(sectionName)) {
      sectionMap.set(sectionName, [])
    }
    sectionMap.get(sectionName)!.push(q)
  })

  return Array.from(sectionMap.entries()).map(([name, questions]) => ({
    name: name === 'General' ? '' : name,
    questions
  }))
})

const missingRequired = computed(() => {
  const missing: string[] = []
  
  props.questions
    .filter(q => q.required && (!q.forRoles || q.forRoles.includes(props.role)))
    .forEach(q => {
      const answer = answers.value[q.key]
      if (!answer || (!answer.text && answer.value === undefined)) {
        missing.push(q.label)
      }
    })
  
  return missing
})

// Methods
function getResponse(questionKey: string): ReviewResponse | undefined {
  return props.responses?.find(
    r => r.question_key === questionKey && r.responder_role === props.role
  )
}

function isRequired(question: ReviewQuestion): boolean {
  return question.required === true
}

function updateAnswer(key: string, type: 'text' | 'value', value: any) {
  if (!answers.value[key]) {
    answers.value[key] = {}
  }
  
  if (type === 'text') {
    answers.value[key].text = value
  } else {
    answers.value[key].value = value
  }

  // Emit for parent to handle auto-save
  emit('save', key, answers.value[key].text, answers.value[key].value)
  emit('update:answers', { ...answers.value })
}

function getRatingLabel(value: number | undefined): string {
  if (!value) return ''
  const labels = ['', 'Needs Improvement', 'Below Expectations', 'Meets Expectations', 'Exceeds Expectations', 'Outstanding']
  return labels[value] || ''
}

function parseMultiSelect(value: string | undefined): string[] {
  if (!value) return []
  try {
    return JSON.parse(value)
  } catch {
    return []
  }
}

// Expose validation
defineExpose({
  isValid: computed(() => missingRequired.value.length === 0),
  answers
})
</script>

<style scoped>
.question-item:last-child {
  margin-bottom: 0 !important;
}
</style>
