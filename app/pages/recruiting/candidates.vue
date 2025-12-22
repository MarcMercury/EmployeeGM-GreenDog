<template>
  <div class="candidates-page">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Recruiting Pipeline</h1>
        <p class="text-body-2 text-grey-darken-1">
          Manage applicants, interviews, and hiring workflow
        </p>
      </div>
      <div class="d-flex gap-2">
        <v-btn variant="outlined" prepend-icon="mdi-download" size="small" @click="exportCandidates">
          Export
        </v-btn>
        <v-btn color="primary" prepend-icon="mdi-plus" size="small" @click="openAddDialog">
          Add Candidate
        </v-btn>
      </div>
    </div>

    <!-- Stats Row -->
    <v-row class="mb-4">
      <v-col cols="6" sm="4" md="2">
        <v-card class="text-center pa-3" variant="tonal" color="primary">
          <div class="text-h5 font-weight-bold">{{ candidates.length }}</div>
          <div class="text-caption">Total Candidates</div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="4" md="2">
        <v-card class="text-center pa-3" variant="tonal" color="success">
          <div class="text-h5 font-weight-bold">{{ statusCounts.new }}</div>
          <div class="text-caption">New</div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="4" md="2">
        <v-card class="text-center pa-3" variant="tonal" color="secondary">
          <div class="text-h5 font-weight-bold">{{ statusCounts.screening }}</div>
          <div class="text-caption">Screening</div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="4" md="2">
        <v-card class="text-center pa-3" variant="tonal" color="warning">
          <div class="text-h5 font-weight-bold">{{ statusCounts.interview }}</div>
          <div class="text-caption">Interview</div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="4" md="2">
        <v-card class="text-center pa-3" variant="tonal" color="teal">
          <div class="text-h5 font-weight-bold">{{ statusCounts.offer }}</div>
          <div class="text-caption">Offer</div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="4" md="2">
        <v-card class="text-center pa-3" variant="tonal" color="info">
          <div class="text-h5 font-weight-bold">{{ statusCounts.hired }}</div>
          <div class="text-caption">Hired</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Filters -->
    <v-card class="mb-4" variant="outlined">
      <v-card-text class="py-3">
        <v-row align="center" dense>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="search"
              placeholder="Search candidates..."
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="6" md="2">
            <v-select
              v-model="statusFilter"
              :items="statusOptions"
              label="Status"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="6" md="2">
            <v-select
              v-model="positionFilter"
              :items="positionOptions"
              label="Position"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="5" class="d-flex justify-end">
            <v-btn-toggle v-model="quickFilter" density="compact" variant="outlined">
              <v-btn value="all" size="small">All</v-btn>
              <v-btn value="new" size="small" color="success">New</v-btn>
              <v-btn value="interview" size="small" color="warning">Interview</v-btn>
              <v-btn value="offer" size="small" color="teal">Offer</v-btn>
            </v-btn-toggle>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Candidates Table -->
    <v-card variant="outlined">
      <v-data-table
        :headers="tableHeaders"
        :items="filteredCandidates"
        :loading="loading"
        hover
        @click:row="(_e, { item }) => openCandidateDetail(item)"
      >
        <template #item.name="{ item }">
          <div class="d-flex align-center py-2">
            <v-avatar :color="getStatusColor(item.status)" size="36" class="mr-3">
              <span class="text-white text-caption font-weight-bold">{{ item.first_name[0] }}{{ item.last_name[0] }}</span>
            </v-avatar>
            <div>
              <div class="font-weight-medium">{{ item.first_name }} {{ item.last_name }}</div>
              <div class="text-caption text-grey">{{ item.email }}</div>
            </div>
          </div>
        </template>

        <template #item.position="{ item }">
          <span v-if="item.job_positions?.title">{{ item.job_positions.title }}</span>
          <span v-else class="text-grey">—</span>
        </template>

        <template #item.status="{ item }">
          <v-chip :color="getStatusColor(item.status)" size="x-small" variant="flat">
            {{ formatStatus(item.status) }}
          </v-chip>
        </template>

        <template #item.applied_at="{ item }">
          <span v-if="item.applied_at">{{ formatDate(item.applied_at) }}</span>
          <span v-else class="text-grey">—</span>
        </template>

        <template #item.phone="{ item }">
          <a v-if="item.phone" :href="`tel:${item.phone}`" class="text-decoration-none" @click.stop>
            {{ item.phone }}
          </a>
          <span v-else class="text-grey">—</span>
        </template>

        <template #item.actions="{ item }">
          <v-btn icon="mdi-eye" size="x-small" variant="text" title="View" @click.stop="openCandidateDetail(item)" />
          <v-btn v-if="item.phone" icon="mdi-phone" size="x-small" variant="text" title="Call" :href="`tel:${item.phone}`" @click.stop />
          <v-btn v-if="item.email" icon="mdi-email" size="x-small" variant="text" title="Email" :href="`mailto:${item.email}`" @click.stop />
          <v-btn icon="mdi-pencil" size="x-small" variant="text" title="Edit" @click.stop="openEditDialog(item)" />
        </template>
      </v-data-table>
    </v-card>

    <!-- Candidate Detail Dialog -->
    <v-dialog v-model="detailDialog" max-width="700" scrollable>
      <v-card v-if="selectedCandidate">
        <v-card-title class="d-flex align-center py-4 bg-primary">
          <v-avatar :color="getStatusColor(selectedCandidate.status)" size="40" class="mr-3">
            <span class="text-white font-weight-bold">{{ selectedCandidate.first_name[0] }}{{ selectedCandidate.last_name[0] }}</span>
          </v-avatar>
          <div class="text-white">
            <div class="font-weight-bold">{{ selectedCandidate.first_name }} {{ selectedCandidate.last_name }}</div>
            <div class="text-caption">{{ selectedCandidate.job_positions?.title || 'No position' }}</div>
          </div>
          <v-spacer />
          <v-chip :color="getStatusColor(selectedCandidate.status)" variant="elevated" size="small">
            {{ formatStatus(selectedCandidate.status) }}
          </v-chip>
        </v-card-title>

        <v-tabs v-model="detailTab" bg-color="grey-lighten-4">
          <v-tab value="bio"><v-icon start size="small">mdi-account</v-icon>Bio</v-tab>
          <v-tab value="skills"><v-icon start size="small">mdi-star</v-icon>Skills</v-tab>
          <v-tab value="notes"><v-icon start size="small">mdi-note-text</v-icon>Notes</v-tab>
        </v-tabs>

        <v-window v-model="detailTab">
          <!-- Bio Tab -->
          <v-window-item value="bio">
            <v-card-text>
              <v-row dense>
                <v-col cols="12" sm="6">
                  <v-text-field v-model="selectedCandidate.email" label="Email" prepend-inner-icon="mdi-email" variant="outlined" density="compact" readonly />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field v-model="selectedCandidate.phone" label="Phone" prepend-inner-icon="mdi-phone" variant="outlined" density="compact" readonly />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field :model-value="formatDate(selectedCandidate.applied_at)" label="Applied" prepend-inner-icon="mdi-calendar" variant="outlined" density="compact" readonly />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field :model-value="selectedCandidate.resume_url ? 'View Resume' : 'No resume'" label="Resume" prepend-inner-icon="mdi-file-document" variant="outlined" density="compact" readonly>
                    <template #append-inner>
                      <v-btn v-if="selectedCandidate.resume_url" icon="mdi-open-in-new" size="small" variant="text" :href="selectedCandidate.resume_url" target="_blank" />
                    </template>
                  </v-text-field>
                </v-col>
              </v-row>

              <v-divider class="my-4" />

              <div class="d-flex flex-wrap gap-2">
                <v-btn v-if="selectedCandidate.status === 'new'" color="secondary" prepend-icon="mdi-file-search" size="small" @click="updateStatus('screening')">
                  Start Screening
                </v-btn>
                <v-btn v-if="selectedCandidate.status === 'screening'" color="warning" prepend-icon="mdi-account-voice" size="small" @click="updateStatus('interview')">
                  Schedule Interview
                </v-btn>
                <v-btn v-if="selectedCandidate.status === 'interview'" color="teal" prepend-icon="mdi-handshake" size="small" @click="updateStatus('offer')">
                  Move to Offer
                </v-btn>
                <v-btn v-if="selectedCandidate.status === 'offer'" color="success" prepend-icon="mdi-check-circle" size="small" @click="updateStatus('hired')">
                  Mark Hired
                </v-btn>
                <v-btn v-if="!['hired', 'rejected'].includes(selectedCandidate.status)" color="grey" prepend-icon="mdi-close-circle" size="small" variant="outlined" @click="updateStatus('rejected')">
                  Reject
                </v-btn>
              </div>
            </v-card-text>
          </v-window-item>

          <!-- Skills Tab -->
          <v-window-item value="skills">
            <v-card-text>
              <p class="text-body-2 text-grey mb-4">Rate candidate skills (0-5 scale)</p>
              <v-row>
                <v-col v-for="skill in availableSkills.slice(0, 12)" :key="skill.id" cols="12" sm="6">
                  <div class="d-flex align-center mb-1">
                    <span class="text-body-2 font-weight-medium flex-grow-1">{{ skill.name }}</span>
                    <span class="text-caption text-grey">{{ getSkillRating(skill.id) }}/5</span>
                  </div>
                  <v-slider
                    :model-value="getSkillRating(skill.id)"
                    :max="5"
                    :step="1"
                    show-ticks="always"
                    tick-size="3"
                    color="primary"
                    thumb-label
                    @update:model-value="updateSkillRating(skill.id, $event)"
                  />
                </v-col>
              </v-row>
            </v-card-text>
          </v-window-item>

          <!-- Notes Tab -->
          <v-window-item value="notes">
            <v-card-text>
              <v-textarea
                v-model="candidateNotes"
                label="Admin Notes"
                variant="outlined"
                rows="6"
                placeholder="Add notes about this candidate..."
              />
              <v-btn color="primary" size="small" class="mt-2" @click="saveNotes">
                <v-icon start>mdi-content-save</v-icon>
                Save Notes
              </v-btn>
            </v-card-text>
          </v-window-item>
        </v-window>

        <v-divider />
        <v-card-actions class="pa-4">
          <v-btn variant="text" @click="detailDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Candidate Dialog -->
    <v-dialog v-model="addDialog" max-width="500">
      <v-card>
        <v-card-title class="bg-primary text-white py-4">
          <v-icon start>mdi-account-plus</v-icon>
          Add Candidate
        </v-card-title>
        <v-card-text class="pt-6">
          <v-form ref="addForm" v-model="addFormValid">
            <v-text-field
              v-model="newCandidate.first_name"
              label="First Name"
              :rules="[v => !!v || 'Required']"
              variant="outlined"
              density="compact"
              class="mb-3"
            />
            <v-text-field
              v-model="newCandidate.last_name"
              label="Last Name"
              :rules="[v => !!v || 'Required']"
              variant="outlined"
              density="compact"
              class="mb-3"
            />
            <v-text-field
              v-model="newCandidate.email"
              label="Email"
              type="email"
              :rules="[v => !!v || 'Required', v => /.+@.+\..+/.test(v) || 'Invalid email']"
              variant="outlined"
              density="compact"
              class="mb-3"
            />
            <v-text-field
              v-model="newCandidate.phone"
              label="Phone"
              variant="outlined"
              density="compact"
              class="mb-3"
            />
            <v-select
              v-model="newCandidate.target_position_id"
              :items="positions"
              item-title="title"
              item-value="id"
              label="Target Position"
              variant="outlined"
              density="compact"
              class="mb-3"
            />
            <v-text-field
              v-model="newCandidate.resume_url"
              label="Resume URL"
              variant="outlined"
              density="compact"
            />
          </v-form>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
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
  middleware: ['auth']
})

interface Candidate {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  target_position_id: string | null
  job_positions: { title: string } | null
  resume_url: string | null
  status: string
  notes: string | null
  applied_at: string
}

interface CandidateSkill {
  id: string
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
const positionFilter = ref<string | null>(null)
const quickFilter = ref('all')
const detailTab = ref('bio')
const detailDialog = ref(false)
const addDialog = ref(false)
const addFormValid = ref(false)
const addForm = ref()

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

const tableHeaders = [
  { title: 'Candidate', key: 'name', sortable: true },
  { title: 'Position', key: 'position', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Applied', key: 'applied_at', sortable: true },
  { title: 'Phone', key: 'phone', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const }
]

// Computed
const positionOptions = computed(() => {
  return positions.value.map(p => ({ title: p.title, value: p.id }))
})

const statusCounts = computed(() => {
  const counts = { new: 0, screening: 0, interview: 0, offer: 0, hired: 0, rejected: 0 }
  candidates.value.forEach(c => {
    if (counts[c.status as keyof typeof counts] !== undefined) {
      counts[c.status as keyof typeof counts]++
    }
  })
  return counts
})

const filteredCandidates = computed(() => {
  let result = candidates.value

  if (quickFilter.value !== 'all') {
    result = result.filter(c => c.status === quickFilter.value)
  }

  if (statusFilter.value) {
    result = result.filter(c => c.status === statusFilter.value)
  }

  if (positionFilter.value) {
    result = result.filter(c => c.target_position_id === positionFilter.value)
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
    new: 'success',
    screening: 'secondary',
    interview: 'warning',
    offer: 'teal',
    hired: 'info',
    rejected: 'grey'
  }
  return colors[status] || 'grey'
}

const formatStatus = (status: string) => status.charAt(0).toUpperCase() + status.slice(1)

const formatDate = (date: string | null) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const openCandidateDetail = async (candidate: Candidate) => {
  selectedCandidate.value = candidate
  candidateNotes.value = candidate.notes || ''
  detailTab.value = 'bio'
  detailDialog.value = true

  // Load candidate skills
  const { data } = await client
    .from('candidate_skills')
    .select('*')
    .eq('candidate_id', candidate.id)

  candidateSkills.value = data || []
}

const openEditDialog = (candidate: Candidate) => {
  openCandidateDetail(candidate)
}

const getSkillRating = (skillId: string) => {
  const skill = candidateSkills.value.find(s => s.skill_id === skillId)
  return skill?.rating || 0
}

const updateSkillRating = async (skillId: string, rating: number) => {
  if (!selectedCandidate.value) return

  const existing = candidateSkills.value.find(s => s.skill_id === skillId)

  if (existing) {
    await client.from('candidate_skills').update({ rating }).eq('id', existing.id)
    existing.rating = rating
  } else {
    const { data } = await client.from('candidate_skills').insert({
      candidate_id: selectedCandidate.value.id,
      skill_id: skillId,
      rating
    }).select().single()
    if (data) candidateSkills.value.push(data)
  }
}

const updateStatus = async (newStatus: string) => {
  if (!selectedCandidate.value) return

  const { error } = await client
    .from('candidates')
    .update({ status: newStatus })
    .eq('id', selectedCandidate.value.id)

  if (!error) {
    selectedCandidate.value.status = newStatus
    const idx = candidates.value.findIndex(c => c.id === selectedCandidate.value!.id)
    if (idx !== -1) candidates.value[idx].status = newStatus
    toast.success(`Status updated to ${formatStatus(newStatus)}`)
    if (newStatus === 'hired') confetti.fire()
  }
}

const saveNotes = async () => {
  if (!selectedCandidate.value) return

  const { error } = await client
    .from('candidates')
    .update({ notes: candidateNotes.value })
    .eq('id', selectedCandidate.value.id)

  if (!error) {
    selectedCandidate.value.notes = candidateNotes.value
    toast.success('Notes saved')
  }
}

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
  nextTick(() => addForm.value?.resetValidation())
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
    openCandidateDetail(data)
  } catch (error) {
    console.error('Error adding candidate:', error)
    toast.error('Failed to add candidate')
  } finally {
    saving.value = false
  }
}

const exportCandidates = () => {
  const csv = [
    ['Name', 'Email', 'Phone', 'Position', 'Status', 'Applied'],
    ...filteredCandidates.value.map(c => [
      `${c.first_name} ${c.last_name}`,
      c.email,
      c.phone || '',
      c.job_positions?.title || '',
      c.status,
      c.applied_at ? new Date(c.applied_at).toLocaleDateString() : ''
    ])
  ].map(row => row.join(',')).join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `candidates-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
}

const fetchData = async () => {
  loading.value = true
  try {
    const { data: candidatesData } = await client
      .from('candidates')
      .select(`*, job_positions:target_position_id(title)`)
      .order('applied_at', { ascending: false })

    candidates.value = candidatesData || []

    const { data: positionsData } = await client
      .from('job_positions')
      .select('id, title')
      .order('title')

    positions.value = positionsData || []

    const { data: skillsData } = await client
      .from('skill_library')
      .select('id, name')
      .order('name')

    availableSkills.value = skillsData || []

    // Check for pre-selected candidate from URL
    const preselectedId = route.query.id as string
    if (preselectedId) {
      const candidate = candidates.value.find(c => c.id === preselectedId)
      if (candidate) openCandidateDetail(candidate)
    }

    // Apply status filter from URL
    const statusFromUrl = route.query.status as string
    if (statusFromUrl && statusOptions.some(s => s.value === statusFromUrl)) {
      quickFilter.value = statusFromUrl
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
