<template>
  <div>
    <!-- Header with Navigation -->
    <div class="d-flex align-center gap-2 mb-4">
      <v-btn icon="mdi-arrow-left" variant="text" aria-label="Go back" @click="navigateTo('/recruiting')" />
      <div>
        <div class="d-flex align-center gap-2">
          <h1 class="text-h5 font-weight-bold">Shadow Profile</h1>
          <v-chip color="purple" variant="flat" size="small" prepend-icon="mdi-ghost">
            Draft Mode
          </v-chip>
        </div>
        <p class="text-body-2 text-grey">Pre-hire employee preview • Not yet in system</p>
      </div>
    </div>

    <!-- Loading State -->
    <template v-if="loading">
      <v-row>
        <v-col cols="12" md="4">
          <v-card rounded="lg">
            <v-card-text class="text-center py-8">
              <div class="skeleton-pulse mx-auto mb-4" style="width: 120px; height: 120px; border-radius: 50%;"></div>
              <div class="skeleton-pulse mx-auto mb-2" style="width: 60%; height: 24px; border-radius: 4px;"></div>
              <div class="skeleton-pulse mx-auto" style="width: 40%; height: 16px; border-radius: 4px;"></div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="8">
          <v-card rounded="lg">
            <v-card-text>
              <div class="skeleton-pulse mb-4" style="width: 100%; height: 200px; border-radius: 8px;"></div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- Content -->
    <template v-else-if="candidate">
      <v-row>
        <!-- Left: Baseball Card Preview -->
        <v-col cols="12" md="4">
          <!-- Draft Employee Card -->
          <v-card rounded="lg" class="shadow-card mb-4">
            <div class="draft-banner pa-2 text-center">
              <v-icon size="16" class="mr-1">mdi-ghost</v-icon>
              EMPLOYEE PREVIEW
            </div>
            <v-card-text class="text-center pt-6">
              <v-avatar size="100" :color="getStatusColor(candidate.status)" class="mb-4 elevation-4">
                <span class="text-h3 text-white font-weight-bold">
                  {{ candidate.first_name?.[0] }}{{ candidate.last_name?.[0] }}
                </span>
              </v-avatar>
              <h2 class="text-h5 font-weight-bold mb-1">
                {{ candidate.first_name }} {{ candidate.last_name }}
              </h2>
              <p class="text-body-1 text-grey mb-3">
                {{ candidate.job_positions?.title || 'Position TBD' }}
              </p>
              
              <v-chip :color="getStatusColor(candidate.status)" variant="flat" class="mb-4">
                {{ formatStatus(candidate.status) }}
              </v-chip>
              
              <v-divider class="my-4" />
              
              <!-- Quick Stats -->
              <v-row dense class="text-center">
                <v-col cols="4">
                  <div class="text-h5 font-weight-bold text-primary">{{ candidateSkills.length }}</div>
                  <div class="text-caption text-grey">Skills</div>
                </v-col>
                <v-col cols="4">
                  <div class="text-h5 font-weight-bold text-success">{{ skillMatch }}%</div>
                  <div class="text-caption text-grey">Match</div>
                </v-col>
                <v-col cols="4">
                  <div class="text-h5 font-weight-bold text-warning">{{ daysInPipeline }}</div>
                  <div class="text-caption text-grey">Days</div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Contact Info -->
          <v-card rounded="lg" class="mb-4">
            <v-card-title class="text-body-1">
              <v-icon start size="20">mdi-card-account-details</v-icon>
              Contact Information
            </v-card-title>
            <v-card-text>
              <div class="d-flex align-center gap-2 mb-3">
                <v-icon size="18" color="grey">mdi-email</v-icon>
                <span>{{ candidate.email || 'Not provided' }}</span>
              </div>
              <div class="d-flex align-center gap-2 mb-3">
                <v-icon size="18" color="grey">mdi-phone</v-icon>
                <span>{{ candidate.phone || 'Not provided' }}</span>
              </div>
              <div class="d-flex align-center gap-2">
                <v-icon size="18" color="grey">mdi-calendar</v-icon>
                <span>Applied {{ formatDate(candidate.applied_at) }}</span>
              </div>
            </v-card-text>
          </v-card>

          <!-- Actions -->
          <v-card rounded="lg">
            <v-card-title class="text-body-1">
              <v-icon start size="20">mdi-cog</v-icon>
              Actions
            </v-card-title>
            <v-card-text class="d-flex flex-column gap-2">
              <v-btn
                v-if="candidate.status === 'hired'"
                color="success"
                block
                prepend-icon="mdi-account-convert"
                :loading="converting"
                @click="confirmHire"
              >
                Convert to Employee
              </v-btn>
              <v-btn
                v-else-if="candidate.status === 'offer'"
                color="primary"
                block
                prepend-icon="mdi-check-circle"
                @click="updateStatus('hired')"
              >
                Mark as Hired
              </v-btn>
              <v-btn
                v-else
                color="primary"
                block
                prepend-icon="mdi-arrow-right"
                @click="advancePipeline"
              >
                Advance Pipeline
              </v-btn>
              <v-btn
                v-if="candidate.status !== 'rejected'"
                color="error"
                variant="outlined"
                block
                prepend-icon="mdi-close-circle"
                @click="updateStatus('rejected')"
              >
                Reject Candidate
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Right: Detailed Info -->
        <v-col cols="12" md="8">
          <!-- Skills Comparison -->
          <v-card rounded="lg" class="mb-4">
            <v-card-title class="d-flex align-center justify-space-between">
              <span>
                <v-icon start>mdi-chart-box</v-icon>
                Skills Assessment
              </span>
              <v-chip v-if="skillMatch >= 70" color="success" size="small" variant="flat">
                Strong Match
              </v-chip>
              <v-chip v-else-if="skillMatch >= 50" color="warning" size="small" variant="flat">
                Moderate Match
              </v-chip>
              <v-chip v-else color="error" size="small" variant="flat">
                Skills Gap
              </v-chip>
            </v-card-title>
            <v-divider />
            <v-card-text v-if="candidateSkills.length === 0" class="text-center py-8">
              <v-icon size="48" color="grey-lighten-1">mdi-lightbulb-off</v-icon>
              <p class="text-body-1 text-grey mt-2">No skills assessed yet</p>
              <v-btn color="primary" variant="outlined" class="mt-2" @click="showSkillDialog = true">
                Add Skills
              </v-btn>
            </v-card-text>
            <v-list v-else>
              <v-list-item v-for="skill in candidateSkills" :key="skill.id">
                <template #prepend>
                  <v-icon :color="getSkillColor(skill.skill_level)">mdi-circle</v-icon>
                </template>
                <v-list-item-title>{{ skill.skill_library?.name || 'Unknown Skill' }}</v-list-item-title>
                <template #append>
                  <div class="d-flex align-center gap-2">
                    <v-rating
                      :model-value="skill.skill_level"
                      readonly
                      density="compact"
                      size="small"
                      color="amber"
                    />
                    <span class="text-caption">{{ skill.skill_level }}/5</span>
                  </div>
                </template>
              </v-list-item>
            </v-list>
            <v-card-actions v-if="candidateSkills.length > 0">
              <v-spacer />
              <v-btn variant="text" color="primary" @click="showSkillDialog = true">
                <v-icon start>mdi-plus</v-icon>
                Add More Skills
              </v-btn>
            </v-card-actions>
          </v-card>

          <!-- Pipeline Timeline -->
          <v-card rounded="lg" class="mb-4">
            <v-card-title>
              <v-icon start>mdi-timeline</v-icon>
              Pipeline Progress
            </v-card-title>
            <v-divider />
            <v-card-text>
              <v-timeline density="compact" side="end">
                <v-timeline-item
                  v-for="step in pipelineSteps"
                  :key="step.status"
                  :dot-color="getPipelineStepColor(step.status)"
                  size="small"
                >
                  <template #icon>
                    <v-icon v-if="isPipelineStepComplete(step.status)" size="14">mdi-check</v-icon>
                    <v-icon v-else-if="candidate.status === step.status" size="14">mdi-circle</v-icon>
                  </template>
                  <div :class="{ 'font-weight-bold': candidate.status === step.status }">
                    {{ step.label }}
                    <span v-if="candidate.status === step.status" class="text-primary ml-2">(Current)</span>
                  </div>
                </v-timeline-item>
              </v-timeline>
            </v-card-text>
          </v-card>

          <!-- Notes -->
          <v-card rounded="lg">
            <v-card-title>
              <v-icon start>mdi-note-text</v-icon>
              Interview Notes
            </v-card-title>
            <v-divider />
            <v-card-text>
              <v-textarea
                v-model="notes"
                placeholder="Add notes about interviews, assessments, or other observations..."
                variant="outlined"
                rows="4"
                hide-details
              />
              <div class="d-flex justify-end mt-2">
                <v-btn color="primary" variant="flat" :loading="savingNotes" @click="saveNotes">
                  Save Notes
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- Not Found -->
    <template v-else>
      <v-card rounded="lg" class="text-center py-12">
        <v-icon size="64" color="grey-lighten-1">mdi-account-search</v-icon>
        <h2 class="text-h5 mt-4">Candidate Not Found</h2>
        <p class="text-grey">This candidate may have been removed or the link is invalid.</p>
        <v-btn color="primary" class="mt-4" @click="navigateTo('/recruiting')">
          Back to Pipeline
        </v-btn>
      </v-card>
    </template>

    <!-- Add Skill Dialog -->
    <v-dialog v-model="showSkillDialog" max-width="500">
      <v-card>
        <v-card-title>Add Skill Assessment</v-card-title>
        <v-card-text>
          <v-autocomplete
            v-model="newSkill.skill_id"
            :items="availableSkills"
            item-title="name"
            item-value="id"
            label="Select Skill"
            variant="outlined"
            class="mb-4"
          />
          <p class="text-body-2 mb-2">Skill Level</p>
          <v-rating
            v-model="newSkill.level"
            hover
            length="5"
            color="amber"
            active-color="amber"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showSkillDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="addSkill">Add</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Confirm Hire Dialog -->
    <v-dialog v-model="showHireDialog" max-width="500">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start color="success">mdi-account-convert</v-icon>
          Convert to Employee
        </v-card-title>
        <v-card-text>
          <p class="mb-4">
            This will convert <strong>{{ candidate?.first_name }} {{ candidate?.last_name }}</strong> 
            from a candidate to a full employee in the system.
          </p>
          <v-alert type="info" variant="tonal" density="compact">
            All candidate data, skills, and notes will be transferred to their employee profile.
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showHireDialog = false">Cancel</v-btn>
          <v-btn color="success" :loading="converting" @click="hireCandidate">
            Confirm Hire
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import type { Candidate, CandidateSkill } from '~/types/recruiting.types'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'management']
})

const route = useRoute()
const client = useSupabaseClient()
const toast = useToast()

// State
const candidate = ref<Candidate | null>(null)
const candidateSkills = ref<CandidateSkill[]>([])
const availableSkills = ref<{ id: string; name: string }[]>([])
const positionRequiredSkills = ref<{ skill_id: string; required_level: number; skill_name: string }[]>([])
const loading = ref(true)
const converting = ref(false)
const savingNotes = ref(false)
const notes = ref('')
const showSkillDialog = ref(false)
const showHireDialog = ref(false)
const newSkill = ref({ skill_id: '', level: 3 })

// Pipeline steps
const pipelineSteps = [
  { status: 'new', label: 'New Application' },
  { status: 'screening', label: 'Screening' },
  { status: 'interview', label: 'Interview' },
  { status: 'offer', label: 'Offer Extended' },
  { status: 'hired', label: 'Hired' }
]

// Computed
const daysInPipeline = computed(() => {
  if (!candidate.value) return 0
  const diff = Date.now() - new Date(candidate.value.applied_at).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
})

const skillMatch = computed(() => {
  if (candidateSkills.value.length === 0) return 0
  // If position has required skills, compare against those
  if (positionRequiredSkills.value.length > 0) {
    let totalScore = 0
    let maxScore = 0
    for (const req of positionRequiredSkills.value) {
      maxScore += req.required_level
      const candidateSkill = candidateSkills.value.find(cs => cs.skill_id === req.skill_id)
      if (candidateSkill) {
        totalScore += Math.min(candidateSkill.skill_level, req.required_level)
      }
    }
    return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
  }
  // Fallback: average level as percentage
  const avg = candidateSkills.value.reduce((sum, s) => sum + s.skill_level, 0) / candidateSkills.value.length
  return Math.round(avg * 20)
})

// Methods
const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    new: 'info',
    screening: 'purple',
    interview: 'warning',
    offer: 'success',
    hired: 'primary',
    rejected: 'grey'
  }
  return colors[status] || 'grey'
}

const formatStatus = (status: string) => {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

const getSkillColor = (level: number) => {
  if (level >= 4) return 'success'
  if (level >= 3) return 'warning'
  return 'grey'
}

const getPipelineStepColor = (status: string) => {
  if (!candidate.value) return 'grey'
  const stepIndex = pipelineSteps.findIndex(s => s.status === status)
  const currentIndex = pipelineSteps.findIndex(s => s.status === candidate.value!.status)
  
  if (stepIndex < currentIndex) return 'success'
  if (stepIndex === currentIndex) return 'primary'
  return 'grey'
}

const isPipelineStepComplete = (status: string) => {
  if (!candidate.value) return false
  const stepIndex = pipelineSteps.findIndex(s => s.status === status)
  const currentIndex = pipelineSteps.findIndex(s => s.status === candidate.value!.status)
  return stepIndex < currentIndex
}

const advancePipeline = () => {
  if (!candidate.value) return
  const currentIndex = pipelineSteps.findIndex(s => s.status === candidate.value!.status)
  if (currentIndex < pipelineSteps.length - 1) {
    updateStatus(pipelineSteps[currentIndex + 1].status)
  }
}

const updateStatus = async (status: string) => {
  if (!candidate.value) return
  
  try {
    const { error } = await client
      .from('candidates')
      .update({ status })
      .eq('id', candidate.value.id)
    
    if (error) throw error
    
    candidate.value.status = status
    toast.success(`Status updated to ${formatStatus(status)}`)
  } catch (error) {
    console.error('Error updating status:', error)
    toast.error('Failed to update status')
  }
}

const confirmHire = () => {
  showHireDialog.value = true
}

const hireCandidate = async () => {
  if (!candidate.value) return
  converting.value = true
  
  try {
    // Use the RPC function that properly migrates all candidate data
    const { data: newEmployeeId, error: rpcError } = await client
      .rpc('promote_candidate_to_employee', {
        p_candidate_id: candidate.value.id,
        p_employment_type: candidate.value.target_position_type || 'full_time',
        p_job_title_id: candidate.value.target_position_id || null,
        p_start_date: candidate.value.desired_start_date || new Date().toISOString().split('T')[0],
        p_starting_wage: parseFloat(candidate.value.desired_salary) || 0,
        p_pay_type: 'Hourly',
        p_department_id: null,
        p_location_id: null
      })
    
    if (rpcError) throw rpcError
    
    toast.success(`${candidate.value.first_name} ${candidate.value.last_name} is now an employee!`)
    showHireDialog.value = false
    
    // Navigate to new employee profile
    navigateTo(`/roster/${newEmployeeId}`)
  } catch (error) {
    console.error('Error converting candidate:', error)
    toast.error('Failed to convert candidate to employee')
  } finally {
    converting.value = false
  }
}

const addSkill = async () => {
  if (!candidate.value || !newSkill.value.skill_id) return
  
  try {
    const { error } = await client
      .from('candidate_skills')
      .insert({
        candidate_id: candidate.value.id,
        skill_id: newSkill.value.skill_id,
        skill_level: newSkill.value.level
      } as any)
    
    if (error) throw error
    
    await fetchCandidateSkills()
    showSkillDialog.value = false
    newSkill.value = { skill_id: '', level: 3 }
    toast.success('Skill added')
  } catch (error) {
    console.error('Error adding skill:', error)
    toast.error('Failed to add skill')
  }
}

const saveNotes = async () => {
  if (!candidate.value) return
  savingNotes.value = true
  
  try {
    const { error } = await client
      .from('candidates')
      .update({ notes: notes.value })
      .eq('id', candidate.value.id)
    
    if (error) throw error
    toast.success('Notes saved')
  } catch (error) {
    console.error('Error saving notes:', error)
    toast.error('Failed to save notes')
  } finally {
    savingNotes.value = false
  }
}

const fetchCandidate = async () => {
  loading.value = true
  try {
    const { data, error } = await client
      .from('candidates')
      .select(`
        *,
        job_positions:target_position_id(title)
      `)
      .eq('id', route.params.id)
      .single()
    
    if (error) throw error
    candidate.value = data
    notes.value = data?.notes || ''
  } catch (error) {
    console.error('Error fetching candidate:', error)
  } finally {
    loading.value = false
  }
}

const fetchCandidateSkills = async () => {
  try {
    const { data, error } = await client
      .from('candidate_skills')
      .select(`
        *,
        skill_library:skill_id(name, category)
      `)
      .eq('candidate_id', route.params.id)
    
    if (error) throw error
    candidateSkills.value = data || []
  } catch (error) {
    console.error('Error fetching skills:', error)
  }
}

const fetchAvailableSkills = async () => {
  try {
    const { data, error } = await client
      .from('skill_library')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
    
    if (error) throw error
    availableSkills.value = data || []
  } catch (error) {
    console.error('Error fetching available skills:', error)
  }
}

const fetchPositionRequiredSkills = async () => {
  if (!candidate.value?.target_position_id) return
  try {
    const { data, error } = await client
      .from('position_required_skills')
      .select(`
        skill_id,
        required_level,
        skill:skill_library(name)
      `)
      .eq('position_id', candidate.value.target_position_id)

    if (error) throw error
    positionRequiredSkills.value = (data || []).map((d: any) => ({
      skill_id: d.skill_id,
      required_level: d.required_level,
      skill_name: d.skill?.name || 'Unknown'
    }))
  } catch (error) {
    console.error('Error fetching position required skills:', error)
  }
}

onMounted(async () => {
  await fetchCandidate()
  fetchCandidateSkills()
  fetchAvailableSkills()
  fetchPositionRequiredSkills()
})
</script>

<style scoped>
.shadow-card {
  position: relative;
  overflow: hidden;
}

.draft-banner {
  background: linear-gradient(135deg, #9c27b0, #673ab7);
  color: white;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1px;
}

.skeleton-pulse {
  background: linear-gradient(
    90deg,
    rgba(var(--v-theme-surface-variant), 0.3) 0%,
    rgba(var(--v-theme-surface-variant), 0.5) 50%,
    rgba(var(--v-theme-surface-variant), 0.3) 100%
  );
  background-size: 200% 100%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
