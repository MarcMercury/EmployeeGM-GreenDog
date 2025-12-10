<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="550"
    persistent
  >
    <v-card v-if="criteria">
      <!-- Header -->
      <v-card-title class="d-flex align-center bg-success text-white pa-4">
        <v-avatar color="white" size="48" class="mr-3">
          <v-icon color="success" size="28">mdi-trophy</v-icon>
        </v-avatar>
        <div>
          <div class="text-h6">Promotion Eligible!</div>
          <div class="text-caption">This review meets promotion criteria</div>
        </div>
      </v-card-title>

      <v-card-text class="pa-4">
        <!-- Employee Info -->
        <v-card variant="outlined" class="mb-4">
          <v-card-text class="d-flex align-center">
            <v-avatar color="primary" size="48" class="mr-3">
              <span class="text-h6 text-white">
                {{ getInitials(criteria.employee_name) }}
              </span>
            </v-avatar>
            <div class="flex-grow-1">
              <div class="text-subtitle-1 font-weight-bold">{{ criteria.employee_name }}</div>
              <div class="text-caption text-grey">{{ criteria.current_position }}</div>
            </div>
            <v-chip color="success" variant="tonal">
              <v-icon start size="16">mdi-star</v-icon>
              {{ criteria.rating.toFixed(1) }} Rating
            </v-chip>
          </v-card-text>
        </v-card>

        <!-- Criteria Checklist -->
        <div class="text-subtitle-2 mb-2">Promotion Criteria Met:</div>
        <v-list density="compact" class="mb-4">
          <v-list-item>
            <template #prepend>
              <v-icon :color="criteria.criteria_details.rating_met ? 'success' : 'error'" size="20">
                {{ criteria.criteria_details.rating_met ? 'mdi-check-circle' : 'mdi-close-circle' }}
              </v-icon>
            </template>
            <v-list-item-title class="text-body-2">
              Performance Rating ≥ 4.0
            </v-list-item-title>
          </v-list-item>
          <v-list-item>
            <template #prepend>
              <v-icon :color="criteria.criteria_details.tenure_met ? 'success' : 'error'" size="20">
                {{ criteria.criteria_details.tenure_met ? 'mdi-check-circle' : 'mdi-close-circle' }}
              </v-icon>
            </template>
            <v-list-item-title class="text-body-2">
              Tenure ≥ 6 months
            </v-list-item-title>
          </v-list-item>
          <v-list-item>
            <template #prepend>
              <v-icon :color="criteria.criteria_details.skills_met ? 'success' : 'error'" size="20">
                {{ criteria.criteria_details.skills_met ? 'mdi-check-circle' : 'mdi-close-circle' }}
              </v-icon>
            </template>
            <v-list-item-title class="text-body-2">
              Required skills achieved
            </v-list-item-title>
          </v-list-item>
        </v-list>

        <!-- Promotion Preview -->
        <v-card color="primary" variant="tonal" class="mb-4">
          <v-card-text>
            <div class="text-overline text-primary mb-2">Proposed Changes</div>
            
            <!-- Title Change -->
            <div class="d-flex align-center justify-space-between mb-3">
              <div class="text-body-2">
                <v-icon size="16" class="mr-1">mdi-briefcase</v-icon>
                Title
              </div>
              <div class="d-flex align-center">
                <span class="text-body-2">{{ criteria.current_position }}</span>
                <v-icon size="16" class="mx-2">mdi-arrow-right</v-icon>
                <v-chip color="success" size="small" variant="elevated">
                  {{ criteria.recommended_position || 'Same' }}
                </v-chip>
              </div>
            </div>

            <!-- Pay Change -->
            <div class="d-flex align-center justify-space-between">
              <div class="text-body-2">
                <v-icon size="16" class="mr-1">mdi-currency-usd</v-icon>
                Hourly Rate
              </div>
              <div class="d-flex align-center">
                <span class="text-body-2">${{ (criteria.current_hourly_rate || 0).toFixed(2) }}/hr</span>
                <v-icon size="16" class="mx-2">mdi-arrow-right</v-icon>
                <v-text-field
                  v-model.number="newHourlyRate"
                  type="number"
                  density="compact"
                  variant="outlined"
                  prefix="$"
                  suffix="/hr"
                  style="max-width: 120px"
                  hide-details
                  :min="criteria.current_hourly_rate || 0"
                  step="0.50"
                />
              </div>
            </div>
          </v-card-text>
        </v-card>

        <!-- Additional Actions -->
        <v-alert type="info" variant="tonal" density="compact" class="mb-0">
          <div class="text-body-2">This will also:</div>
          <ul class="text-caption mb-0 pl-4">
            <li>Add a "Level Up" badge to their profile</li>
            <li>Send a congratulations notification</li>
            <li>Log the change in audit history</li>
          </ul>
        </v-alert>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-btn variant="text" @click="$emit('skip')">
          Skip Promotion
        </v-btn>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">
          Cancel
        </v-btn>
        <v-btn
          color="success"
          variant="elevated"
          :loading="applying"
          :disabled="!canApply"
          @click="applyPromotion"
        >
          <v-icon start>mdi-check</v-icon>
          Apply Promotion
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Not Eligible State -->
    <v-card v-else-if="!loading">
      <v-card-title>Review Complete</v-card-title>
      <v-card-text>
        <v-alert type="info" variant="tonal">
          This employee does not currently meet the criteria for automatic promotion.
          You can manually adjust their position and pay from the HR settings.
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="$emit('update:modelValue', false)">Close</v-btn>
      </v-card-actions>
    </v-card>

    <!-- Loading State -->
    <v-card v-else>
      <v-card-text class="text-center pa-8">
        <v-progress-circular indeterminate color="primary" size="48" />
        <p class="mt-4 text-body-2">Checking promotion eligibility...</p>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useIntegrationsStore, type PromotionCriteria } from '~/stores/integrations'

const props = defineProps<{
  modelValue: boolean
  reviewId: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'applied': [result: { success: boolean }]
  'skip': []
}>()

const integrationsStore = useIntegrationsStore()

// State
const loading = ref(false)
const applying = ref(false)
const criteria = ref<PromotionCriteria | null>(null)
const newHourlyRate = ref(0)

// Computed
const canApply = computed(() => {
  return criteria.value?.meets_criteria && 
         criteria.value?.recommended_position_id &&
         newHourlyRate.value > 0
})

// Methods
function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase()
}

async function checkCriteria() {
  if (!props.reviewId) return
  
  loading.value = true
  try {
    criteria.value = await integrationsStore.checkPromotionCriteria(props.reviewId)
    if (criteria.value?.recommended_hourly_rate) {
      newHourlyRate.value = criteria.value.recommended_hourly_rate
    }
  } finally {
    loading.value = false
  }
}

async function applyPromotion() {
  if (!criteria.value || !criteria.value.recommended_position_id || !props.reviewId) return
  
  applying.value = true
  try {
    const result = await integrationsStore.applyPromotion(
      criteria.value.employee_id,
      criteria.value.recommended_position_id,
      newHourlyRate.value,
      props.reviewId
    )
    
    emit('applied', result)
    emit('update:modelValue', false)
  } finally {
    applying.value = false
  }
}

// Watch for dialog open
watch(() => props.modelValue, (open) => {
  if (open && props.reviewId) {
    checkCriteria()
  }
})
</script>
