<template>
  <v-card variant="outlined" rounded="lg">
    <v-card-text class="pa-4 pa-sm-6">
      <!-- Header -->
      <div class="d-flex align-center justify-space-between mb-4">
        <div class="d-flex align-center gap-3">
          <v-avatar :color="typeConfig?.color || 'grey'" size="48" variant="tonal">
            <v-icon size="28">{{ typeConfig?.icon || 'mdi-file' }}</v-icon>
          </v-avatar>
          <div>
            <h3 class="text-h6 font-weight-bold">{{ typeConfig?.label || log.log_type }}</h3>
            <div class="text-body-2 text-grey">
              {{ locationLabel }} · {{ formattedDate }}
            </div>
          </div>
        </div>
        <div class="d-flex align-center gap-2">
          <v-chip
            v-if="log.osha_recordable"
            color="error"
            variant="flat"
            size="small"
            prepend-icon="mdi-alert"
          >
            OSHA Recordable
          </v-chip>
          <v-chip
            :color="statusConfig?.color || 'grey'"
            :prepend-icon="statusConfig?.icon"
            variant="tonal"
          >
            {{ statusConfig?.label || log.status }}
          </v-chip>
        </div>
      </div>

      <v-divider class="mb-4" />

      <!-- Submitted By -->
      <div class="d-flex align-center gap-2 mb-4">
        <v-icon size="18" color="grey">mdi-account</v-icon>
        <span class="text-body-2 text-grey-darken-1">
          Submitted by <strong>{{ submitterName }}</strong>
        </span>
      </div>

      <!-- Form Data Fields -->
      <v-row dense>
        <v-col
          v-for="field in displayFields"
          :key="field.key"
          cols="12"
          :sm="field.cols || 12"
        >
          <div class="mb-3">
            <div class="text-caption text-grey text-uppercase mb-1">{{ field.label }}</div>
            <!-- Boolean display -->
            <v-chip
              v-if="field.type === 'boolean'"
              :color="formDataValue(field.key) ? 'success' : 'grey'"
              variant="tonal"
              size="small"
              :prepend-icon="formDataValue(field.key) ? 'mdi-check-circle' : 'mdi-close-circle'"
            >
              {{ formDataValue(field.key) ? 'Yes' : 'No' }}
            </v-chip>
            <!-- Multiselect chips -->
            <div v-else-if="field.type === 'multiselect'" class="d-flex flex-wrap gap-1">
              <v-chip
                v-for="item in (formDataValue(field.key) || [])"
                :key="item"
                size="small"
                variant="tonal"
              >
                {{ item }}
              </v-chip>
              <span v-if="isEmptyArray(formDataValue(field.key))" class="text-body-2 text-grey">—</span>
            </div>
            <!-- Text display -->
            <div v-else class="text-body-2">
              {{ formDataValue(field.key) || '—' }}
            </div>
          </div>
        </v-col>
      </v-row>

      <!-- Review section (managers+) -->
      <template v-if="log.reviewed_by || canReview">
        <v-divider class="my-4" />

        <div v-if="log.reviewed_by" class="mb-4">
          <div class="text-caption text-grey text-uppercase mb-1">Reviewed By</div>
          <div class="text-body-2">
            {{ reviewerName }} · {{ formattedReviewDate }}
          </div>
          <div v-if="log.review_notes" class="text-body-2 mt-1">
            <em>"{{ log.review_notes }}"</em>
          </div>
        </div>

        <!-- Review Actions for managers -->
        <div v-if="canReview && log.status !== 'reviewed'" class="d-flex gap-2">
          <v-textarea
            v-model="reviewNotes"
            label="Review Notes (optional)"
            variant="outlined"
            density="compact"
            rows="2"
            class="flex-grow-1"
            hide-details
          />
        </div>
        <div v-if="canReview && log.status !== 'reviewed'" class="d-flex gap-2 mt-3">
          <v-btn
            color="success"
            variant="outlined"
            prepend-icon="mdi-check-all"
            @click="$emit('review', { status: 'reviewed', review_notes: reviewNotes })"
          >
            Mark Reviewed
          </v-btn>
          <v-btn
            color="error"
            variant="outlined"
            prepend-icon="mdi-flag"
            @click="$emit('review', { status: 'flagged', review_notes: reviewNotes })"
          >
            Flag
          </v-btn>
        </div>
      </template>

      <!-- Compliance badge -->
      <v-alert
        v-if="typeConfig?.complianceStandards?.length"
        type="info"
        variant="tonal"
        density="compact"
        class="mt-4"
        icon="mdi-shield-check"
      >
        <div class="text-caption">
          <strong>Compliance:</strong> {{ typeConfig.complianceStandards.join(' · ') }}
        </div>
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { format, parseISO } from 'date-fns'
import type { SafetyLog } from '~/types/safety-log.types'
import {
  getSafetyLogTypeConfig,
  SAFETY_LOCATIONS,
  SAFETY_STATUSES,
} from '~/types/safety-log.types'
import { useCustomSafetyLogTypes } from '~/composables/useCustomSafetyLogTypes'

interface Props {
  log: SafetyLog
  canReview?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  canReview: false,
})

defineEmits<{
  review: [payload: { status: string; review_notes: string }]
}>()

const { findType } = useCustomSafetyLogTypes()
const reviewNotes = ref('')

// Look up built-in first, then custom types
const typeConfig = computed(() => getSafetyLogTypeConfig(props.log.log_type) || findType(props.log.log_type))
const statusConfig = computed(() => SAFETY_STATUSES.find(s => s.value === props.log.status))
const locationLabel = computed(() => SAFETY_LOCATIONS.find(l => l.value === props.log.location)?.label || props.log.location)
const displayFields = computed(() => typeConfig.value?.fields || [])

const submitterName = computed(() => {
  if (props.log.submitter) return `${props.log.submitter.first_name} ${props.log.submitter.last_name}`
  return 'Unknown'
})

const reviewerName = computed(() => {
  if (props.log.reviewer) return `${props.log.reviewer.first_name} ${props.log.reviewer.last_name}`
  return 'Unknown'
})

const formattedDate = computed(() => {
  try { return format(parseISO(props.log.submitted_at), 'MMM d, yyyy h:mm a') }
  catch { return props.log.submitted_at }
})

const formattedReviewDate = computed(() => {
  try { return props.log.reviewed_at ? format(parseISO(props.log.reviewed_at), 'MMM d, yyyy h:mm a') : '' }
  catch { return '' }
})

function formDataValue(key: string): unknown {
  return props.log.form_data?.[key]
}

function isEmptyArray(val: unknown): boolean {
  return !Array.isArray(val) || val.length === 0
}
</script>
