<script setup lang="ts">
import { format } from 'date-fns'
import type { AISuggestedShift, AISuggestionResult } from '~/types/schedule.types'

const props = defineProps<{
  weekStart: Date
  locationId: string
}>()

const emit = defineEmits<{
  applied: []
  notify: [payload: { message: string; color: string }]
}>()

const supabase = useSupabaseClient()

// State
const aiSuggestDialog = ref(false)
const isLoadingAISuggestions = ref(false)
const aiSuggestions = ref<AISuggestionResult | null>(null)
const aiError = ref<string | null>(null)
const isApplyingAISuggestions = ref(false)

// Request AI schedule suggestions
async function requestAISuggestions() {
  isLoadingAISuggestions.value = true
  aiError.value = null
  aiSuggestions.value = null
  aiSuggestDialog.value = true

  try {
    const result = await $fetch('/api/ai/schedule-suggest', {
      method: 'POST',
      body: {
        weekStart: format(props.weekStart, 'yyyy-MM-dd'),
        locationId: props.locationId || null
      }
    })

    // Mark all suggestions as selected by default
    aiSuggestions.value = {
      ...result as AISuggestionResult,
      shifts: ((result as AISuggestionResult).shifts || []).map(s => ({ ...s, selected: true }))
    }
  } catch (err: any) {
    console.error('AI suggest error:', err)
    aiError.value = err?.data?.message || err?.message || 'Failed to get AI suggestions'
  } finally {
    isLoadingAISuggestions.value = false
  }
}

// Toggle selection of a suggested shift
function toggleSuggestionSelection(index: number) {
  if (aiSuggestions.value?.shifts[index]) {
    aiSuggestions.value.shifts[index].selected = !aiSuggestions.value.shifts[index].selected
  }
}

// Select/deselect all suggestions
function selectAllSuggestions(selected: boolean) {
  if (aiSuggestions.value?.shifts) {
    aiSuggestions.value.shifts = aiSuggestions.value.shifts.map(s => ({ ...s, selected }))
  }
}

// Count of selected suggestions
const selectedSuggestionsCount = computed(() => {
  return aiSuggestions.value?.shifts.filter(s => s.selected).length || 0
})

// Apply selected AI suggestions
async function applyAISuggestions() {
  if (!aiSuggestions.value || selectedSuggestionsCount.value === 0) {
    emit('notify', { message: 'No suggestions selected', color: 'warning' })
    return
  }

  isApplyingAISuggestions.value = true

  try {
    const selectedShifts = aiSuggestions.value.shifts.filter(s => s.selected)

    // Create shifts from suggestions
    const newShifts = selectedShifts.map(s => ({
      employee_id: s.employeeId,
      location_id: props.locationId || null,
      start_at: `${s.date}T${s.startTime}:00`,
      end_at: `${s.date}T${s.endTime}:00`,
      role_required: s.role,
      status: 'draft',
      ai_suggested: true,
      ai_confidence: s.confidence,
      ai_reasoning: s.reasoning,
      assignment_source: 'ai_suggested'
    }))

    const { error } = await supabase.from('shifts').insert(newShifts)

    if (error) throw error

    emit('notify', { message: `Applied ${selectedShifts.length} AI-suggested shifts!`, color: 'success' })
    aiSuggestDialog.value = false
    aiSuggestions.value = null
    emit('applied')
  } catch (err) {
    console.error('Apply AI suggestions error:', err)
    emit('notify', { message: 'Failed to apply suggestions', color: 'error' })
  } finally {
    isApplyingAISuggestions.value = false
  }
}

// Get confidence color
function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'success'
  if (confidence >= 0.6) return 'warning'
  return 'error'
}

// Public method to open dialog
function open() {
  requestAISuggestions()
}

defineExpose({ open })
</script>

<template>
  <v-dialog v-model="aiSuggestDialog" max-width="700" scrollable>
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon color="purple" class="mr-2">mdi-robot</v-icon>
        AI Schedule Suggestions
        <v-spacer />
        <v-chip v-if="aiSuggestions" color="purple" size="small" variant="tonal">
          {{ selectedSuggestionsCount }}/{{ aiSuggestions.shifts.length }} selected
        </v-chip>
      </v-card-title>

      <v-card-text class="pa-0">
        <!-- Loading state -->
        <div v-if="isLoadingAISuggestions" class="text-center py-8">
          <v-progress-circular indeterminate color="purple" size="48" />
          <p class="mt-4 text-body-2 text-grey">Analyzing team availability and generating suggestions...</p>
          <p class="text-caption text-grey">This may take 10-30 seconds</p>
        </div>

        <!-- Error state -->
        <v-alert v-else-if="aiError" type="error" variant="tonal" class="ma-4">
          <v-alert-title>Failed to get suggestions</v-alert-title>
          {{ aiError }}
        </v-alert>

        <!-- Suggestions list -->
        <div v-else-if="aiSuggestions" class="suggestions-content">
          <!-- Summary -->
          <div class="pa-4 bg-grey-lighten-4">
            <p class="text-body-2 mb-2">{{ aiSuggestions.summary }}</p>
            <div v-if="aiSuggestions.warnings.length" class="mt-2">
              <v-chip
                v-for="(warning, i) in aiSuggestions.warnings"
                :key="i"
                color="warning"
                size="small"
                variant="tonal"
                class="mr-1 mb-1"
              >
                <v-icon start size="small">mdi-alert</v-icon>
                {{ warning }}
              </v-chip>
            </div>
          </div>

          <!-- Select all controls -->
          <div class="d-flex align-center pa-3 border-b">
            <v-btn size="small" variant="text" @click="selectAllSuggestions(true)">Select All</v-btn>
            <v-btn size="small" variant="text" @click="selectAllSuggestions(false)">Deselect All</v-btn>
          </div>

          <!-- Shifts list -->
          <v-list density="compact" class="suggestions-list">
            <v-list-item
              v-for="(shift, idx) in aiSuggestions.shifts"
              :key="idx"
              :class="{ 'bg-purple-lighten-5': shift.selected }"
              @click="toggleSuggestionSelection(idx)"
            >
              <template #prepend>
                <v-checkbox-btn
                  :model-value="shift.selected"
                  color="purple"
                  @click.stop="toggleSuggestionSelection(idx)"
                />
              </template>

              <v-list-item-title class="d-flex align-center gap-2">
                <span class="font-weight-medium">{{ shift.employeeName }}</span>
                <v-chip size="x-small" variant="outlined">{{ shift.role }}</v-chip>
              </v-list-item-title>

              <v-list-item-subtitle>
                {{ format(new Date(shift.date), 'EEE, MMM d') }} • {{ shift.startTime }} - {{ shift.endTime }}
              </v-list-item-subtitle>

              <template #append>
                <v-tooltip :text="shift.reasoning" location="left">
                  <template #activator="{ props: tooltipProps }">
                    <v-chip
                      v-bind="tooltipProps"
                      :color="getConfidenceColor(shift.confidence)"
                      size="small"
                      variant="tonal"
                    >
                      {{ Math.round(shift.confidence * 100) }}%
                    </v-chip>
                  </template>
                </v-tooltip>
              </template>
            </v-list-item>
          </v-list>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="aiSuggestDialog = false" :disabled="isApplyingAISuggestions">
          Cancel
        </v-btn>
        <v-btn
          color="purple"
          variant="flat"
          @click="applyAISuggestions"
          :loading="isApplyingAISuggestions"
          :disabled="!aiSuggestions || selectedSuggestionsCount === 0"
        >
          <v-icon start>mdi-check</v-icon>
          Apply {{ selectedSuggestionsCount }} Suggestions
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
