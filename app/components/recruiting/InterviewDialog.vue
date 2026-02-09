<template>
  <v-dialog v-model="dialogVisible" max-width="800" scrollable persistent>
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center py-4 bg-primary">
        <v-avatar :color="getStatusColor(candidate?.status)" size="40" class="mr-3">
          <span class="text-white font-weight-bold">{{ candidate?.first_name?.[0] }}{{ candidate?.last_name?.[0] }}</span>
        </v-avatar>
        <div class="text-white">
          <div class="font-weight-bold">Log Interview: {{ candidate?.first_name }} {{ candidate?.last_name }}</div>
          <div class="text-caption">{{ candidate?.job_positions?.title || 'No position' }}</div>
        </div>
        <v-spacer />
        <v-chip :color="getStatusColor(candidate?.status)" variant="elevated" size="small" class="mr-2">
          {{ formatStatus(candidate?.status) }}
        </v-chip>
        <v-btn icon="mdi-close" variant="text" color="white" size="small" aria-label="Close" @click="close" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-6 scrollable-70vh">
        <!-- Interview Details Section -->
        <div class="mb-6">
          <h3 class="text-subtitle-1 font-weight-bold mb-4">
            <v-icon start color="primary">mdi-calendar-clock</v-icon>
            Interview Details
          </h3>
          <v-row dense>
            <v-col cols="12" md="6">
              <v-select
                v-model="interviewForm.interview_type"
                :items="interviewTypeOptions"
                label="Interview Type"
                prepend-inner-icon="mdi-clipboard-list"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="interviewForm.scheduled_at"
                label="Interview Date/Time"
                type="datetime-local"
                prepend-inner-icon="mdi-calendar"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-autocomplete
                v-model="interviewForm.interviewer_employee_id"
                :items="employees"
                item-title="full_name"
                item-value="id"
                label="Interviewer"
                prepend-inner-icon="mdi-account-tie"
                variant="outlined"
                density="compact"
                clearable
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="interviewForm.duration_minutes"
                label="Duration (minutes)"
                type="number"
                prepend-inner-icon="mdi-timer"
                variant="outlined"
                density="compact"
                min="0"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="interviewForm.location"
                label="Location/Room"
                prepend-inner-icon="mdi-map-marker"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="interviewForm.video_link"
                label="Video Link (optional)"
                prepend-inner-icon="mdi-video"
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>
        </div>

        <v-divider class="mb-6" />

        <!-- Scores Section -->
        <div class="mb-6">
          <h3 class="text-subtitle-1 font-weight-bold mb-4">
            <v-icon start color="amber">mdi-star</v-icon>
            Candidate Scores
          </h3>
          <v-row>
            <!-- Overall Score -->
            <v-col cols="12">
              <div class="d-flex align-center mb-4 pa-3 bg-grey-lighten-4 rounded">
                <v-icon color="amber" class="mr-3">mdi-star-circle</v-icon>
                <div class="flex-grow-1">
                  <div class="text-subtitle-2 font-weight-bold">Overall Score</div>
                  <v-rating
                    v-model="interviewForm.overall_score"
                    color="amber"
                    active-color="amber"
                    density="comfortable"
                    size="large"
                    hover
                  />
                </div>
                <span class="text-h5 font-weight-bold text-amber">{{ interviewForm.overall_score }}/5</span>
              </div>
            </v-col>

            <!-- Category Scores -->
            <v-col cols="12" md="4">
              <div class="text-body-2 font-weight-medium mb-1">Technical Skills</div>
              <v-rating
                v-model="interviewForm.technical_score"
                density="compact"
                color="blue"
                active-color="blue"
              />
            </v-col>
            <v-col cols="12" md="4">
              <div class="text-body-2 font-weight-medium mb-1">Communication</div>
              <v-rating
                v-model="interviewForm.communication_score"
                density="compact"
                color="green"
                active-color="green"
              />
            </v-col>
            <v-col cols="12" md="4">
              <div class="text-body-2 font-weight-medium mb-1">Cultural Fit</div>
              <v-rating
                v-model="interviewForm.cultural_fit_score"
                density="compact"
                color="purple"
                active-color="purple"
              />
            </v-col>
          </v-row>
        </div>

        <v-divider class="mb-6" />

        <!-- Notes Section -->
        <div class="mb-6">
          <h3 class="text-subtitle-1 font-weight-bold mb-4">
            <v-icon start color="secondary">mdi-note-text</v-icon>
            Interview Notes
          </h3>
          
          <v-textarea
            v-model="interviewForm.notes"
            label="Interview Notes"
            placeholder="Key discussion points, questions asked, candidate responses..."
            variant="outlined"
            rows="4"
            auto-grow
            class="mb-4"
          />

          <v-row>
            <v-col cols="12" md="6">
              <h4 class="text-body-2 font-weight-medium mb-2 text-success">
                <v-icon size="small" class="mr-1">mdi-plus-circle</v-icon>
                Strengths
              </h4>
              <v-textarea
                v-model="interviewForm.strengths"
                placeholder="What stands out positively about this candidate..."
                variant="outlined"
                rows="3"
              />
            </v-col>
            <v-col cols="12" md="6">
              <h4 class="text-body-2 font-weight-medium mb-2 text-error">
                <v-icon size="small" class="mr-1">mdi-minus-circle</v-icon>
                Concerns
              </h4>
              <v-textarea
                v-model="interviewForm.concerns"
                placeholder="Areas of concern or things to follow up on..."
                variant="outlined"
                rows="3"
              />
            </v-col>
          </v-row>
        </div>

        <v-divider class="mb-6" />

        <!-- Recommendation Section -->
        <div>
          <h3 class="text-subtitle-1 font-weight-bold mb-4">
            <v-icon start color="teal">mdi-thumb-up</v-icon>
            Recommendation
          </h3>
          <v-btn-toggle 
            v-model="interviewForm.recommendation" 
            mandatory 
            color="primary" 
            variant="outlined"
            class="mb-4"
          >
            <v-btn value="strong_yes" color="success">
              <v-icon start>mdi-thumb-up</v-icon>
              Strong Yes
            </v-btn>
            <v-btn value="yes" color="teal">
              <v-icon start>mdi-check</v-icon>
              Yes
            </v-btn>
            <v-btn value="maybe" color="warning">
              <v-icon start>mdi-help</v-icon>
              Maybe
            </v-btn>
            <v-btn value="no" color="error">
              <v-icon start>mdi-close</v-icon>
              No
            </v-btn>
          </v-btn-toggle>

          <!-- Interview Status -->
          <v-select
            v-model="interviewForm.status"
            :items="statusOptions"
            label="Interview Status"
            prepend-inner-icon="mdi-flag"
            variant="outlined"
            density="compact"
            class="mt-4"
          />
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4 d-flex flex-wrap gap-2">
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-spacer />
        <v-btn 
          color="primary" 
          variant="elevated"
          :loading="saving" 
          @click="saveInterview"
        >
          <v-icon start>mdi-content-save</v-icon>
          Save Interview
        </v-btn>
        <v-btn 
          v-if="props.showForward"
          color="secondary" 
          variant="elevated"
          :loading="saving" 
          @click="saveAndForward"
        >
          <v-icon start>mdi-send</v-icon>
          Save & Forward
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Forward Dialog -->
    <v-dialog v-model="showForwardDialog" max-width="500" persistent>
      <v-card>
        <v-card-title class="d-flex align-center bg-secondary">
          <v-icon start color="white">mdi-share</v-icon>
          <span class="text-white">Forward Candidate for Review</span>
        </v-card-title>
        <v-card-text class="pt-6">
          <v-alert type="info" variant="tonal" density="compact" class="mb-4">
            The selected employee will receive a notification to review this candidate.
          </v-alert>

          <v-autocomplete
            v-model="forwardTo"
            :items="employees"
            item-title="full_name"
            item-value="id"
            label="Send to Employee"
            prepend-inner-icon="mdi-account"
            variant="outlined"
            class="mb-4"
          />

          <v-textarea
            v-model="forwardNotes"
            label="Notes for Reviewer (Optional)"
            placeholder="Any context or specific areas to evaluate..."
            variant="outlined"
            rows="3"
          />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-btn variant="text" @click="showForwardDialog = false">Cancel</v-btn>
          <v-spacer />
          <v-btn 
            color="secondary" 
            :disabled="!forwardTo"
            :loading="forwarding"
            @click="confirmForward"
          >
            <v-icon start>mdi-send</v-icon>
            Forward
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup lang="ts">
import type { Candidate, RecruitingEmployee, InterviewForm } from '~/types/recruiting.types'

const props = defineProps<{
  modelValue: boolean
  candidate: Candidate | null
  employees: RecruitingEmployee[]
  showForward?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved', interview: any): void
  (e: 'forwarded', data: { interview: any; forwardedTo: string }): void
}>()

const client = useSupabaseClient()
const userStore = useUserStore()
const toast = useToast()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const saving = ref(false)
const forwarding = ref(false)
const showForwardDialog = ref(false)
const forwardTo = ref<string | null>(null)
const forwardNotes = ref('')
const savedInterviewId = ref<string | null>(null)

const interviewForm = reactive<InterviewForm>({
  interview_type: 'initial',
  scheduled_at: new Date().toISOString().slice(0, 16),
  interviewer_employee_id: null,
  duration_minutes: 30,
  location: '',
  video_link: '',
  overall_score: 0,
  technical_score: 0,
  communication_score: 0,
  cultural_fit_score: 0,
  notes: '',
  strengths: '',
  concerns: '',
  recommendation: 'neutral',
  status: 'completed'
})

const interviewTypeOptions = [
  { title: 'Phone Screen', value: 'phone_screen' },
  { title: 'Initial Interview', value: 'initial' },
  { title: 'Technical Assessment', value: 'technical' },
  { title: 'Working Interview', value: 'working_interview' },
  { title: 'Panel Interview', value: 'panel' },
  { title: 'Final Interview', value: 'final' },
  { title: 'Other', value: 'other' }
]

const statusOptions = [
  { title: 'Scheduled', value: 'scheduled' },
  { title: 'In Progress', value: 'in_progress' },
  { title: 'Completed', value: 'completed' },
  { title: 'Cancelled', value: 'cancelled' },
  { title: 'No Show', value: 'no_show' }
]

// Set default interviewer to current user
watch(() => props.modelValue, (open) => {
  if (open && userStore.employee?.id) {
    interviewForm.interviewer_employee_id = userStore.employee.id
    interviewForm.scheduled_at = new Date().toISOString().slice(0, 16)
  }
}, { immediate: true })

function getStatusColor(status: string | undefined) {
  const colors: Record<string, string> = {
    'new': 'info',
    'screening': 'purple',
    'interview': 'warning',
    'offer': 'success',
    'hired': 'primary',
    'rejected': 'grey'
  }
  return colors[status || ''] || 'grey'
}

function formatStatus(status: string | undefined) {
  if (!status) return 'Unknown'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function resetForm() {
  Object.assign(interviewForm, {
    interview_type: 'initial',
    scheduled_at: new Date().toISOString().slice(0, 16),
    interviewer_employee_id: userStore.employee?.id || null,
    duration_minutes: 30,
    location: '',
    video_link: '',
    overall_score: 0,
    technical_score: 0,
    communication_score: 0,
    cultural_fit_score: 0,
    notes: '',
    strengths: '',
    concerns: '',
    recommendation: 'neutral',
    status: 'completed'
  })
  forwardTo.value = null
  forwardNotes.value = ''
  savedInterviewId.value = null
}

function close() {
  resetForm()
  dialogVisible.value = false
}

async function saveInterview() {
  if (!props.candidate) return
  
  saving.value = true
  try {
    // Count existing interviews to determine round number
    const { count, error: countError } = await client
      .from('candidate_interviews')
      .select('*', { count: 'exact', head: true })
      .eq('candidate_id', props.candidate.id)
    
    if (countError) throw countError
    
    const roundNumber = (count || 0) + 1
    
    // Insert new interview record
    const { data, error } = await client
      .from('candidate_interviews')
      .insert({
        candidate_id: props.candidate.id,
        interview_type: interviewForm.interview_type,
        scheduled_at: interviewForm.scheduled_at || null,
        interviewer_employee_id: interviewForm.interviewer_employee_id,
        duration_minutes: interviewForm.duration_minutes || null,
        location: interviewForm.location || null,
        video_link: interviewForm.video_link || null,
        overall_score: interviewForm.overall_score || null,
        technical_score: interviewForm.technical_score || null,
        communication_score: interviewForm.communication_score || null,
        cultural_fit_score: interviewForm.cultural_fit_score || null,
        notes: interviewForm.notes || null,
        strengths: interviewForm.strengths || null,
        concerns: interviewForm.concerns || null,
        recommendation: interviewForm.recommendation,
        status: interviewForm.status,
        round_number: roundNumber,
        completed_at: interviewForm.status === 'completed' ? new Date().toISOString() : null
      })
      .select()
      .single()
    
    if (error) throw error
    
    // Also update the candidate's interview fields for quick access
    await client
      .from('candidates')
      .update({
        interview_date: interviewForm.scheduled_at || null,
        interviewed_by: interviewForm.interviewer_employee_id,
        overall_score: interviewForm.overall_score || null,
        interview_status: interviewForm.status === 'completed' ? 'completed' : 'scheduled'
      })
      .eq('id', props.candidate.id)
    
    savedInterviewId.value = data.id
    toast.success('Interview logged successfully')
    emit('saved', data)
    close()
    
  } catch (err: any) {
    console.error('Failed to save interview:', err)
    toast.error('Failed to save interview: ' + (err.message || 'Unknown error'))
  } finally {
    saving.value = false
  }
}

async function saveAndForward() {
  if (!props.candidate) return
  
  // First save the interview
  saving.value = true
  try {
    // Count existing interviews
    const { count, error: countError } = await client
      .from('candidate_interviews')
      .select('*', { count: 'exact', head: true })
      .eq('candidate_id', props.candidate.id)
    
    if (countError) throw countError
    
    const roundNumber = (count || 0) + 1
    
    // Insert interview record
    const { data, error } = await client
      .from('candidate_interviews')
      .insert({
        candidate_id: props.candidate.id,
        interview_type: interviewForm.interview_type,
        scheduled_at: interviewForm.scheduled_at || null,
        interviewer_employee_id: interviewForm.interviewer_employee_id,
        duration_minutes: interviewForm.duration_minutes || null,
        location: interviewForm.location || null,
        video_link: interviewForm.video_link || null,
        overall_score: interviewForm.overall_score || null,
        technical_score: interviewForm.technical_score || null,
        communication_score: interviewForm.communication_score || null,
        cultural_fit_score: interviewForm.cultural_fit_score || null,
        notes: interviewForm.notes || null,
        strengths: interviewForm.strengths || null,
        concerns: interviewForm.concerns || null,
        recommendation: interviewForm.recommendation,
        status: interviewForm.status,
        round_number: roundNumber,
        completed_at: interviewForm.status === 'completed' ? new Date().toISOString() : null
      })
      .select()
      .single()
    
    if (error) throw error
    
    savedInterviewId.value = data.id
    
    // Update candidate
    await client
      .from('candidates')
      .update({
        interview_date: interviewForm.scheduled_at || null,
        interviewed_by: interviewForm.interviewer_employee_id,
        overall_score: interviewForm.overall_score || null,
        interview_status: interviewForm.status === 'completed' ? 'completed' : 'scheduled'
      })
      .eq('id', props.candidate.id)
    
    toast.success('Interview logged')
    
    // Show forward dialog
    showForwardDialog.value = true
    
  } catch (err: any) {
    console.error('Failed to save interview:', err)
    toast.error('Failed to save interview: ' + (err.message || 'Unknown error'))
  } finally {
    saving.value = false
  }
}

async function confirmForward() {
  if (!props.candidate || !forwardTo.value) return
  
  forwarding.value = true
  try {
    const { error } = await client
      .from('candidate_forwards')
      .insert({
        candidate_id: props.candidate.id,
        forwarded_by_employee_id: userStore.employee?.id,
        forwarded_to_employee_id: forwardTo.value,
        notes: forwardNotes.value || null
      })
    
    if (error) throw error
    
    toast.success('Candidate forwarded for review')
    emit('forwarded', { 
      interview: { id: savedInterviewId.value }, 
      forwardedTo: forwardTo.value 
    })
    showForwardDialog.value = false
    close()
    
  } catch (err: any) {
    console.error('Failed to forward:', err)
    toast.error('Failed to forward candidate: ' + (err.message || 'Unknown error'))
  } finally {
    forwarding.value = false
  }
}
</script>
