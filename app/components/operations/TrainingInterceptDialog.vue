<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="500"
    persistent
  >
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center bg-warning pa-4">
        <v-icon color="white" size="28" class="mr-2">mdi-alert-circle</v-icon>
        <span class="text-white">Qualification Required</span>
      </v-card-title>

      <v-card-text class="pa-4">
        <!-- Employee Info -->
        <div class="d-flex align-center mb-4">
          <v-avatar color="primary" size="40" class="mr-3">
            <span class="text-white">{{ getInitials(employeeName) }}</span>
          </v-avatar>
          <div>
            <div class="text-subtitle-1 font-weight-medium">{{ employeeName }}</div>
            <div class="text-caption text-grey">Cannot be assigned to this shift</div>
          </div>
        </div>

        <!-- Missing Skills -->
        <v-alert type="warning" variant="tonal" class="mb-4">
          <div class="text-body-2 font-weight-medium mb-2">Missing Required Skills:</div>
          <v-list density="compact" class="bg-transparent pa-0">
            <v-list-item
              v-for="skill in missingSkills"
              :key="skill.skill_id"
              class="px-0"
            >
              <template #prepend>
                <v-icon color="warning" size="18">mdi-close-circle</v-icon>
              </template>
              <v-list-item-title class="text-body-2">
                {{ skill.skill_name }}
              </v-list-item-title>
              <v-list-item-subtitle class="text-caption">
                Required: Level {{ skill.required_level }} | 
                Current: {{ skill.current_level !== null ? `Level ${skill.current_level}` : 'Not trained' }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-alert>

        <!-- Fast Track Option -->
        <v-card
          v-if="availableCourse"
          variant="outlined"
          color="primary"
          class="mb-4"
        >
          <v-card-text>
            <div class="d-flex align-center">
              <v-icon color="primary" size="32" class="mr-3">mdi-lightning-bolt</v-icon>
              <div class="flex-grow-1">
                <div class="text-subtitle-2 font-weight-medium">Fast Track Available</div>
                <div class="text-caption text-grey">
                  Assign training to unlock this shift type
                </div>
              </div>
            </div>

            <v-divider class="my-3" />

            <div class="d-flex align-center">
              <v-icon size="20" color="primary" class="mr-2">mdi-book-open-variant</v-icon>
              <div class="flex-grow-1">
                <div class="text-body-2 font-weight-medium">{{ availableCourse.title }}</div>
                <div class="text-caption text-grey">Due in 7 days • Auto-enrolled</div>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <!-- What happens next -->
        <div v-if="availableCourse" class="text-caption text-grey">
          <v-icon size="14" class="mr-1">mdi-information</v-icon>
          {{ employeeName.split(' ')[0] }} will receive a notification and the training 
          will be assigned immediately.
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-btn variant="text" @click="$emit('update:modelValue', false)">
          Cancel Assignment
        </v-btn>
        <v-spacer />
        <v-btn
          v-if="availableCourse"
          color="primary"
          variant="elevated"
          :loading="assigning"
          @click="assignTraining"
        >
          <v-icon start>mdi-school</v-icon>
          Assign Training & Schedule
        </v-btn>
        <v-btn
          v-else
          color="grey"
          variant="tonal"
          @click="$emit('update:modelValue', false)"
        >
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useIntegrationsStore, type SkillRequirement } from '~/stores/integrations'

const props = defineProps<{
  modelValue: boolean
  employeeId: string
  employeeName: string
  missingSkills: SkillRequirement[]
  shiftId?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'training-assigned': [result: { success: boolean; proceedWithShift: boolean }]
}>()

const integrationsStore = useIntegrationsStore()

// State
const assigning = ref(false)

// Computed
const availableCourse = computed(() => {
  // Find the first missing skill that has a course
  const skillWithCourse = props.missingSkills.find(s => s.course_id && s.course_title)
  if (skillWithCourse) {
    return {
      id: skillWithCourse.course_id!,
      title: skillWithCourse.course_title!
    }
  }
  return null
})

// Methods
function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase()
}

async function assignTraining() {
  if (!availableCourse.value) return
  
  assigning.value = true
  try {
    const result = await integrationsStore.fastTrackTraining(
      props.employeeId,
      availableCourse.value.id,
      `Required for shift assignment${props.shiftId ? ` (shift: ${props.shiftId})` : ''}`
    )
    
    emit('training-assigned', { 
      success: result.success, 
      proceedWithShift: false // Don't proceed with shift until training complete
    })
    emit('update:modelValue', false)
  } finally {
    assigning.value = false
  }
}
</script>
