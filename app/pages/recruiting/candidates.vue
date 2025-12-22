<template>
  <div class="candidates-page">
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Candidates</h1>
        <p class="text-body-1 text-grey-darken-1">
          Manage applicants and interview ratings
        </p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openAddDialog">
        Add Candidate
      </v-btn>
    </div>

    <v-row>
      <!-- Left: Candidate List -->
      <v-col cols="12" md="5" lg="4">
        <v-card rounded="lg" class="h-100">
          <!-- Filters -->
          <v-card-text class="pb-0">
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              placeholder="Search candidates..."
              variant="outlined"
              density="compact"
              hide-details
              clearable
              class="mb-3"
            />
            <v-select
              v-model="statusFilter"
              :items="statusOptions"
              label="Filter by Status"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-card-text>

          <v-divider class="mt-3" />

          <!-- Candidate List -->
          <v-list class="candidate-list" nav>
            <v-list-item
              v-for="candidate in filteredCandidates"
              :key="candidate.id"
              :active="selectedCandidate?.id === candidate.id"
              @click="selectCandidate(candidate)"
            >
              <template #prepend>
                <v-avatar :color="getStatusColor(candidate.status)" size="40">
                  <span class="text-white font-weight-bold text-caption">
                    {{ candidate.first_name[0] }}{{ candidate.last_name[0] }}
                  </span>
                </v-avatar>
              </template>
              <v-list-item-title class="font-weight-medium">
                {{ candidate.first_name }} {{ candidate.last_name }}
              </v-list-item-title>
              <v-list-item-subtitle>
                {{ candidate.job_positions?.title || 'No position' }}
              </v-list-item-subtitle>
              <template #append>
                <v-chip :color="getStatusColor(candidate.status)" size="x-small" label>
                  {{ formatStatus(candidate.status) }}
                </v-chip>
              </template>
            </v-list-item>

            <v-list-item v-if="filteredCandidates.length === 0 && !loading && search">
              <UiEmptyState
                type="search"
                title="No matches found"
                :description="`No candidates match '${search}'`"
                class="py-6"
              />
            </v-list-item>

            <v-list-item v-else-if="filteredCandidates.length === 0 && !loading">
              <UiEmptyState
                type="candidates"
                title="No candidates yet"
                description="Start building your talent pipeline"
                actionLabel="Add Candidate"
                @action="openAddDialog"
                class="py-6"
              />
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>

      <!-- Right: Candidate Details -->
      <v-col cols="12" md="7" lg="8">
        <v-card v-if="!selectedCandidate" rounded="lg" class="h-100 d-flex align-center justify-center">
          <v-card-text class="text-center py-12">
            <v-icon size="64" color="grey-lighten-1">mdi-account-search</v-icon>
            <h3 class="text-h6 mt-4 text-grey">Select a candidate to view details</h3>
          </v-card-text>
        </v-card>

        <v-card v-else rounded="lg">
          <!-- Candidate Header -->
          <v-card-title class="d-flex align-center pa-4">
            <v-avatar :color="getStatusColor(selectedCandidate.status)" size="56" class="mr-4">
              <span class="text-white font-weight-bold text-h6">
                {{ selectedCandidate.first_name[0] }}{{ selectedCandidate.last_name[0] }}
              </span>
            </v-avatar>
            <div class="flex-grow-1">
              <h2 class="text-h5 font-weight-bold">
                {{ selectedCandidate.first_name }} {{ selectedCandidate.last_name }}
              </h2>
              <p class="text-body-2 text-grey mb-0">
                {{ selectedCandidate.job_positions?.title || 'General Position' }}
              </p>
            </div>
            <v-chip :color="getStatusColor(selectedCandidate.status)" label class="mr-2">
              {{ formatStatus(selectedCandidate.status) }}
            </v-chip>
            <v-btn 
              color="primary" 
              variant="tonal"
              class="mr-2"
              :to="`/recruiting/${selectedCandidate.id}`"
            >
              <v-icon start>mdi-account-details</v-icon>
              Full Profile
            </v-btn>
            <v-menu>
              <template #activator="{ props }">
                <v-btn icon="mdi-dots-vertical" variant="text" v-bind="props" />
              </template>
              <v-list density="compact">
                <v-list-item
                  v-for="status in statusOptions.filter(s => s.value !== selectedCandidate.status)"
                  :key="status.value"
                  @click="updateStatus(status.value)"
                >
                  <template #prepend>
                    <v-icon :color="getStatusColor(status.value)" size="18">mdi-circle</v-icon>
                  </template>
                  <v-list-item-title>Move to {{ status.title }}</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </v-card-title>

          <v-divider />

          <!-- Tabs -->
          <v-tabs v-model="detailTab" color="primary">
            <v-tab value="bio">
              <v-icon start size="18">mdi-account</v-icon>
              Bio
            </v-tab>
            <v-tab value="skills">
              <v-icon start size="18">mdi-star</v-icon>
              Skills Rating
            </v-tab>
          </v-tabs>

          <v-divider />

          <v-window v-model="detailTab">
            <!-- Bio Tab -->
            <v-window-item value="bio">
              <v-card-text>
                <v-row>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="selectedCandidate.email"
                      label="Email"
                      prepend-inner-icon="mdi-email"
                      variant="outlined"
                      density="compact"
                      readonly
                    />
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="selectedCandidate.phone"
                      label="Phone"
                      prepend-inner-icon="mdi-phone"
                      variant="outlined"
                      density="compact"
                      readonly
                    />
                  </v-col>
                  <v-col cols="12">
                    <v-text-field
                      v-model="selectedCandidate.resume_url"
                      label="Resume URL"
                      prepend-inner-icon="mdi-file-document"
                      variant="outlined"
                      density="compact"
                      readonly
                    >
                      <template #append-inner>
                        <v-btn
                          v-if="selectedCandidate.resume_url"
                          icon="mdi-open-in-new"
                          size="small"
                          variant="text"
                          :href="selectedCandidate.resume_url"
                          target="_blank"
                        />
                      </template>
                    </v-text-field>
                  </v-col>
                  <v-col cols="12">
                    <v-textarea
                      v-model="candidateNotes"
                      label="Admin Notes"
                      prepend-inner-icon="mdi-note-text"
                      variant="outlined"
                      rows="4"
                      @blur="saveNotes"
                    />
                  </v-col>
                </v-row>

                <div class="d-flex gap-2 mt-4">
                  <v-btn
                    v-if="selectedCandidate.status === 'interview'"
                    color="success"
                    prepend-icon="mdi-handshake"
                    @click="updateStatus('offer')"
                  >
                    Move to Offer
                  </v-btn>
                  <v-btn
                    v-if="selectedCandidate.status === 'new'"
                    color="purple"
                    prepend-icon="mdi-file-search"
                    @click="updateStatus('screening')"
                  >
                    Start Screening
                  </v-btn>
                  <v-btn
                    v-if="selectedCandidate.status === 'screening'"
                    color="warning"
                    prepend-icon="mdi-account-voice"
                    @click="updateStatus('interview')"
                  >
                    Schedule Interview
                  </v-btn>
                </div>
              </v-card-text>
            </v-window-item>

            <!-- Skills Rating Tab -->
            <v-window-item value="skills">
              <v-card-text>
                <p class="text-body-2 text-grey mb-4">
                  Rate the candidate's skills during the interview (0-5 scale)
                </p>

                <v-row>
                  <v-col v-for="skill in availableSkills.slice(0, 12)" :key="skill.id" cols="12" sm="6">
                    <div class="d-flex align-center mb-2">
                      <span class="text-body-2 font-weight-medium flex-grow-1">{{ skill.name }}</span>
                      <span class="text-caption text-grey mr-2">{{ getSkillRating(skill.id) }}/5</span>
                    </div>
                    <v-slider
                      :model-value="getSkillRating(skill.id)"
                      :max="5"
                      :step="1"
                      :ticks="[0,1,2,3,4,5]"
                      show-ticks="always"
                      tick-size="4"
                      color="primary"
                      track-color="grey-lighten-2"
                      thumb-label
                      @update:model-value="updateSkillRating(skill.id, $event)"
                    />
                  </v-col>
                </v-row>

                <v-alert v-if="availableSkills.length === 0" type="info" variant="tonal" class="mt-4">
                  No skills available. Add skills to the Skill Library first.
                </v-alert>
              </v-card-text>
            </v-window-item>
          </v-window>
        </v-card>
      </v-col>
    </v-row>

    <!-- Add Candidate Dialog -->
    <v-dialog v-model="addDialog" max-width="500">
      <v-card rounded="lg">
        <v-card-title class="bg-primary text-white py-4">
          <v-icon start>mdi-account-plus</v-icon>
          Add Candidate
        </v-card-title>
        <v-card-text class="pt-6">
          <v-form ref="addForm" v-model="addFormValid" @submit.prevent="saveCandidate">
            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="newCandidate.first_name"
                  label="First Name *"
                  :rules="[v => !!v || 'Required']"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="newCandidate.last_name"
                  label="Last Name *"
                  :rules="[v => !!v || 'Required']"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="newCandidate.email"
                  label="Email *"
                  type="email"
                  :rules="[v => !!v || 'Required', v => /.+@.+/.test(v) || 'Invalid email']"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="newCandidate.phone"
                  label="Phone"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12">
                <v-select
                  v-model="newCandidate.target_position_id"
                  :items="positions"
                  item-title="title"
                  item-value="id"
                  label="Target Position"
                  variant="outlined"
                  density="compact"
                  clearable
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="newCandidate.resume_url"
                  label="Resume URL"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="addDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" :disabled="!addFormValid" @click="saveCandidate">
            Add Candidate
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin']
})

interface Candidate {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  resume_url: string | null
  target_position_id: string | null
  status: string
  notes: string | null
  applied_at: string
  job_positions?: { title: string }
}

interface CandidateSkill {
  candidate_id: string
  skill_id: string
  rating: number
}

interface Skill {
  id: string
  name: string
}

const client = useSupabaseClient()
const route = useRoute()
const toast = useToast()
const confetti = useConfetti()

// State
const candidates = ref<Candidate[]>([])
const candidateSkills = ref<CandidateSkill[]>([])
const availableSkills = ref<Skill[]>([])
const positions = ref<{ id: string; title: string }[]>([])
const selectedCandidate = ref<Candidate | null>(null)
const candidateNotes = ref('')
const loading = ref(true)
const saving = ref(false)
const search = ref('')
const statusFilter = ref<string | null>(null)
const detailTab = ref('bio')
const addDialog = ref(false)
const addFormValid = ref(false)

const newCandidate = reactive({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  target_position_id: null as string | null,
  resume_url: ''
})

const statusOptions = [
  { title: 'New', value: 'new' },
  { title: 'Screening', value: 'screening' },
  { title: 'Interview', value: 'interview' },
  { title: 'Offer', value: 'offer' },
  { title: 'Hired', value: 'hired' },
  { title: 'Rejected', value: 'rejected' }
]

// Computed
const filteredCandidates = computed(() => {
  let result = candidates.value

  if (statusFilter.value) {
    result = result.filter(c => c.status === statusFilter.value)
  }

  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter(c =>
      c.first_name.toLowerCase().includes(q) ||
      c.last_name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    )
  }

  return result
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

const formatStatus = (status: string) => status.charAt(0).toUpperCase() + status.slice(1)

// Use global toast composable instead of local snackbar

const selectCandidate = async (candidate: Candidate) => {
  selectedCandidate.value = candidate
  candidateNotes.value = candidate.notes || ''
  detailTab.value = 'bio'

  // Load candidate skills
  const { data } = await client
    .from('candidate_skills')
    .select('*')
    .eq('candidate_id', candidate.id)

  candidateSkills.value = data || []
}

const getSkillRating = (skillId: string) => {
  const skill = candidateSkills.value.find(s => s.skill_id === skillId)
  return skill?.rating || 0
}

const updateSkillRating = async (skillId: string, rating: number) => {
  if (!selectedCandidate.value) return

  try {
    const existingSkill = candidateSkills.value.find(s => s.skill_id === skillId)
    
    if (existingSkill) {
      await client
        .from('candidate_skills')
        .update({ rating })
        .eq('candidate_id', selectedCandidate.value.id)
        .eq('skill_id', skillId)
      existingSkill.rating = rating
    } else {
      await client
        .from('candidate_skills')
        .insert({
          candidate_id: selectedCandidate.value.id,
          skill_id: skillId,
          rating
        })
      candidateSkills.value.push({
        candidate_id: selectedCandidate.value.id,
        skill_id: skillId,
        rating
      })
    }
  } catch (error) {
    console.error('Error updating skill:', error)
    toast.error('Failed to update skill rating')
  }
}

const updateStatus = async (status: string) => {
  if (!selectedCandidate.value) return

  // Optimistic UI: Update local state IMMEDIATELY
  const previousStatus = selectedCandidate.value.status
  selectedCandidate.value.status = status
  const idx = candidates.value.findIndex(c => c.id === selectedCandidate.value?.id)
  if (idx !== -1) candidates.value[idx].status = status

  // 🎉 HIRED! Trigger celebration confetti!
  if (status === 'hired') {
    confetti.hire()
    toast.success(`🎉 ${selectedCandidate.value.first_name} has been hired!`)
  }

  try {
    const { error } = await client
      .from('candidates')
      .update({ status })
      .eq('id', selectedCandidate.value.id)

    if (error) throw error

    // Create onboarding checklist when moving to offer
    if (status === 'offer') {
      await client
        .from('onboarding_checklist')
        .upsert({
          candidate_id: selectedCandidate.value.id,
          contract_sent: false,
          contract_signed: false,
          background_check: false,
          uniform_ordered: false,
          email_created: false
        })
      toast.info('Onboarding checklist created')
    } else if (status !== 'hired') {
      toast.success(`Candidate moved to ${formatStatus(status)}`)
    }
  } catch (error) {
    // REVERT on error (Optimistic UI rollback)
    console.error('Error updating status:', error)
    selectedCandidate.value.status = previousStatus
    if (idx !== -1) candidates.value[idx].status = previousStatus
    toast.error('Failed to update status. Changes reverted.')
  }
}

const saveNotes = async () => {
  if (!selectedCandidate.value) return

  try {
    await client
      .from('candidates')
      .update({ notes: candidateNotes.value })
      .eq('id', selectedCandidate.value.id)

    selectedCandidate.value.notes = candidateNotes.value
  } catch (error) {
    console.error('Error saving notes:', error)
  }
}

const addForm = ref()

const openAddDialog = () => {
  Object.assign(newCandidate, {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    target_position_id: null,
    resume_url: ''
  })
  addFormValid.value = false
  addDialog.value = true
  // Reset form validation state
  nextTick(() => {
    addForm.value?.resetValidation()
  })
}

const saveCandidate = async () => {
  saving.value = true
  try {
    const { data, error } = await client
      .from('candidates')
      .insert({
        first_name: newCandidate.first_name,
        last_name: newCandidate.last_name,
        email: newCandidate.email,
        phone: newCandidate.phone || null,
        target_position_id: newCandidate.target_position_id,
        resume_url: newCandidate.resume_url || null,
        status: 'new'
      })
      .select(`*, job_positions:target_position_id(title)`)
      .single()

    if (error) throw error

    candidates.value.unshift(data)
    addDialog.value = false
    toast.success('Candidate added successfully')
    selectCandidate(data)
  } catch (error) {
    console.error('Error adding candidate:', error)
    toast.error('Failed to add candidate')
  } finally {
    saving.value = false
  }
}

const fetchData = async () => {
  loading.value = true
  try {
    // Fetch candidates
    const { data: candidatesData } = await client
      .from('candidates')
      .select(`*, job_positions:target_position_id(title)`)
      .order('applied_at', { ascending: false })

    candidates.value = candidatesData || []

    // Fetch positions
    const { data: positionsData } = await client
      .from('job_positions')
      .select('id, title')
      .order('title')

    positions.value = positionsData || []

    // Fetch skills for rating
    const { data: skillsData } = await client
      .from('skill_library')
      .select('id, name')
      .order('name')

    availableSkills.value = skillsData || []

    // Check for pre-selected candidate from URL
    const preselectedId = route.query.id as string
    if (preselectedId) {
      const candidate = candidates.value.find(c => c.id === preselectedId)
      if (candidate) selectCandidate(candidate)
    }

    // Apply status filter from URL
    const statusFromUrl = route.query.status as string
    if (statusFromUrl && statusOptions.some(s => s.value === statusFromUrl)) {
      statusFilter.value = statusFromUrl
    }
  } catch (error) {
    console.error('Error fetching data:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.candidates-page {
  height: calc(100vh - 100px);
}

.candidate-list {
  max-height: calc(100vh - 280px);
  overflow-y: auto;
}
</style>
