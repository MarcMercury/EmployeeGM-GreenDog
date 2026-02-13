<template>
  <v-card
    variant="outlined"
    rounded="lg"
    class="safety-log-card cursor-pointer hover-elevate"
    @click="$emit('click', log)"
  >
    <v-card-text class="pa-4">
      <!-- Header row -->
      <div class="d-flex align-center justify-space-between mb-2">
        <div class="d-flex align-center gap-2">
          <v-avatar :color="typeConfig?.color || 'grey'" size="36" variant="tonal">
            <v-icon size="20">{{ typeConfig?.icon || 'mdi-file' }}</v-icon>
          </v-avatar>
          <div>
            <div class="text-subtitle-2 font-weight-medium">{{ typeConfig?.label || log.log_type }}</div>
            <div class="text-caption text-grey">{{ locationLabel }}</div>
          </div>
        </div>
        <div class="d-flex align-center gap-2">
          <v-chip
            v-if="log.osha_recordable"
            size="x-small"
            color="error"
            variant="flat"
          >
            OSHA
          </v-chip>
          <v-chip
            :color="statusConfig?.color || 'grey'"
            :prepend-icon="statusConfig?.icon"
            size="small"
            variant="tonal"
          >
            {{ statusConfig?.label || log.status }}
          </v-chip>
        </div>
      </div>

      <!-- Summary line (first required field value) -->
      <div v-if="summaryText" class="text-body-2 text-grey-darken-1 mb-2 text-truncate">
        {{ summaryText }}
      </div>

      <!-- Footer -->
      <div class="d-flex align-center justify-space-between text-caption text-grey">
        <span>
          <v-icon size="12" class="mr-1">mdi-account</v-icon>
          {{ submitterName }}
        </span>
        <span>
          <v-icon size="12" class="mr-1">mdi-clock-outline</v-icon>
          {{ formattedDate }}
        </span>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { format, parseISO } from 'date-fns'
import type { SafetyLog } from '~/types/safety-log.types'
import {
  getSafetyLogTypeConfig,
  SAFETY_LOCATIONS,
  SAFETY_STATUSES,
} from '~/types/safety-log.types'

interface Props {
  log: SafetyLog
}

const props = defineProps<Props>()

defineEmits<{ click: [log: SafetyLog] }>()

const typeConfig = computed(() => getSafetyLogTypeConfig(props.log.log_type))
const statusConfig = computed(() => SAFETY_STATUSES.find(s => s.value === props.log.status))
const locationLabel = computed(() => SAFETY_LOCATIONS.find(l => l.value === props.log.location)?.label || props.log.location)

const submitterName = computed(() => {
  if (props.log.submitter) {
    return `${props.log.submitter.first_name} ${props.log.submitter.last_name}`
  }
  return 'Unknown'
})

const formattedDate = computed(() => {
  try {
    return format(parseISO(props.log.submitted_at), 'MMM d, yyyy h:mm a')
  } catch {
    return props.log.submitted_at
  }
})

const summaryText = computed(() => {
  const fd = props.log.form_data || {}
  // Grab the first non-empty string value from form_data for summary
  const firstField = typeConfig.value?.fields.find(f => f.required && fd[f.key])
  if (firstField) return String(fd[firstField.key])
  // Fallback: first string value
  for (const val of Object.values(fd)) {
    if (typeof val === 'string' && val.trim()) return val
  }
  return ''
})
</script>

<style scoped>
.safety-log-card {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.hover-elevate:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
</style>
