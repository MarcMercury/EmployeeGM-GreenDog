<template>
  <v-form ref="formRef" @submit.prevent="handleSubmit" class="safety-form-renderer">
    <!-- Location Selector -->
    <v-row dense class="mb-4">
      <v-col cols="12" sm="6">
        <v-select
          v-model="formLocation"
          :items="SAFETY_LOCATIONS"
          item-title="label"
          item-value="value"
          label="Location *"
          variant="outlined"
          density="comfortable"
          :rules="[v => !!v || 'Location is required']"
          prepend-inner-icon="mdi-map-marker"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field
          :model-value="formDate"
          label="Submission Date"
          variant="outlined"
          density="comfortable"
          readonly
          prepend-inner-icon="mdi-calendar"
          hint="Auto-filled"
          persistent-hint
        />
      </v-col>
    </v-row>

    <!-- OSHA Recordable Toggle (shown when config.hasOshaToggle is true) -->
    <v-row v-if="config?.hasOshaToggle" dense class="mb-4">
      <v-col cols="12">
        <v-card variant="outlined" rounded="lg" class="pa-3">
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-subtitle-2 font-weight-medium">OSHA Recordable?</div>
              <div class="text-caption text-grey">Mark if this qualifies as an OSHA 300 Log entry</div>
            </div>
            <v-switch
              v-model="oshaRecordable"
              color="error"
              hide-details
              density="compact"
            />
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Dynamic Form Fields -->
    <v-row dense>
      <v-col
        v-for="field in config?.fields || []"
        :key="field.key"
        :cols="12"
        :sm="field.cols || 12"
      >
        <!-- Text Input -->
        <v-text-field
          v-if="field.type === 'text'"
          v-model="formData[field.key]"
          :label="field.label + (field.required ? ' *' : '')"
          :placeholder="field.placeholder"
          :hint="field.hint"
          :persistent-hint="!!field.hint"
          :rules="field.required ? [v => !!v || `${field.label} is required`] : []"
          variant="outlined"
          density="comfortable"
        />

        <!-- Textarea -->
        <v-textarea
          v-if="field.type === 'textarea'"
          v-model="formData[field.key]"
          :label="field.label + (field.required ? ' *' : '')"
          :placeholder="field.placeholder"
          :hint="field.hint"
          :persistent-hint="!!field.hint"
          :rules="field.required ? [v => !!v || `${field.label} is required`] : []"
          variant="outlined"
          density="comfortable"
          rows="3"
          auto-grow
        />

        <!-- Select -->
        <v-select
          v-if="field.type === 'select'"
          v-model="formData[field.key]"
          :items="field.options || []"
          :label="field.label + (field.required ? ' *' : '')"
          :hint="field.hint"
          :persistent-hint="!!field.hint"
          :rules="field.required ? [v => !!v || `${field.label} is required`] : []"
          variant="outlined"
          density="comfortable"
          clearable
        />

        <!-- Multi-select -->
        <v-select
          v-if="field.type === 'multiselect'"
          v-model="formData[field.key]"
          :items="field.options || []"
          :label="field.label"
          :hint="field.hint"
          :persistent-hint="!!field.hint"
          variant="outlined"
          density="comfortable"
          multiple
          chips
          closable-chips
        />

        <!-- Boolean Toggle -->
        <v-card
          v-if="field.type === 'boolean'"
          variant="outlined"
          rounded="lg"
          class="pa-3"
        >
          <div class="d-flex align-center justify-space-between">
            <span class="text-body-2">{{ field.label }}</span>
            <v-switch
              v-model="formData[field.key]"
              color="primary"
              hide-details
              density="compact"
            />
          </div>
        </v-card>

        <!-- Date -->
        <v-text-field
          v-if="field.type === 'date'"
          v-model="formData[field.key]"
          :label="field.label + (field.required ? ' *' : '')"
          :hint="field.hint"
          :persistent-hint="!!field.hint"
          :rules="field.required ? [v => !!v || `${field.label} is required`] : []"
          type="date"
          variant="outlined"
          density="comfortable"
        />

        <!-- Number -->
        <v-text-field
          v-if="field.type === 'number'"
          v-model.number="formData[field.key]"
          :label="field.label + (field.required ? ' *' : '')"
          :hint="field.hint"
          :persistent-hint="!!field.hint"
          :rules="field.required ? [v => v != null || `${field.label} is required`] : []"
          type="number"
          variant="outlined"
          density="comfortable"
        />

        <!-- File Upload placeholder (uses photo_urls) -->
        <v-file-input
          v-if="field.type === 'file'"
          v-model="fileInputs[field.key]"
          :label="field.label"
          :hint="field.hint"
          :persistent-hint="!!field.hint"
          variant="outlined"
          density="comfortable"
          prepend-icon=""
          prepend-inner-icon="mdi-camera"
          accept="image/*"
          multiple
          show-size
        />
      </v-col>
    </v-row>

    <!-- Compliance Standards Info -->
    <v-alert
      v-if="config?.complianceStandards?.length"
      type="info"
      variant="tonal"
      density="compact"
      class="mt-4 mb-2"
      icon="mdi-shield-check"
    >
      <div class="text-caption">
        <strong>Compliance:</strong> {{ config.complianceStandards.join(' · ') }}
      </div>
    </v-alert>

    <!-- Submit / Cancel -->
    <div class="d-flex justify-end gap-3 mt-6">
      <v-btn variant="outlined" @click="$emit('cancel')" :disabled="submitting">
        Cancel
      </v-btn>
      <v-btn
        color="primary"
        type="submit"
        :loading="submitting"
        prepend-icon="mdi-check"
        size="large"
        min-width="160"
      >
        Submit Log
      </v-btn>
    </div>
  </v-form>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { format } from 'date-fns'
import {
  type SafetyLogType,
  type SafetyLogLocation,
  type SafetyLogTypeConfig,
  SAFETY_LOCATIONS,
  getSafetyLogTypeConfig,
} from '~/types/safety-log.types'

interface Props {
  logType: SafetyLogType
  initialLocation?: SafetyLogLocation | null
  submitting?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  initialLocation: null,
  submitting: false,
})

const emit = defineEmits<{
  submit: [payload: { location: SafetyLogLocation; form_data: Record<string, unknown>; osha_recordable: boolean }]
  cancel: []
}>()

const { findType } = useCustomSafetyLogTypes()
const formRef = ref()
// Look up built-in first, then custom types
const config = computed<SafetyLogTypeConfig | undefined>(() =>
  getSafetyLogTypeConfig(props.logType) || findType(props.logType)
)

// Form state
const formLocation = ref<SafetyLogLocation | null>(props.initialLocation)
const formDate = computed(() => format(new Date(), 'yyyy-MM-dd'))
const oshaRecordable = ref(false)
const formData = reactive<Record<string, any>>({})
const fileInputs = reactive<Record<string, File[]>>({})

// Initialize boolean fields with defaults
watch(config, (cfg) => {
  if (cfg) {
    for (const field of cfg.fields) {
      if (field.type === 'boolean' && formData[field.key] === undefined) {
        formData[field.key] = false
      }
      if (field.type === 'multiselect' && formData[field.key] === undefined) {
        formData[field.key] = []
      }
    }
  }
}, { immediate: true })

async function handleSubmit() {
  const { valid } = await formRef.value.validate()
  
  // Debug what's happening
  console.log('[SafetyLogFormRenderer] handleSubmit called', {
    valid,
    formLocation: formLocation.value,
    formData,
    config: config.value,
  })

  if (!valid) {
    console.warn('[SafetyLogFormRenderer] Form validation failed')
    return
  }

  if (!formLocation.value) {
    console.error('[SafetyLogFormRenderer] Location not selected!')
    return
  }

  console.log('[SafetyLogFormRenderer] Submitting with payload:', {
    location: formLocation.value,
    form_data: formData,
    osha_recordable: oshaRecordable.value,
  })

  emit('submit', {
    location: formLocation.value,
    form_data: { ...formData },
    osha_recordable: oshaRecordable.value,
  })
}
</script>

<style scoped>
.safety-form-renderer {
  max-width: 800px;
}
</style>
