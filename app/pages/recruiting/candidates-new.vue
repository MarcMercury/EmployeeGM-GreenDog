<template>
  <div class="candidates-page">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-4 flex-wrap gap-3">
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
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openAddDialog">
          Add Candidate
        </v-btn>
      </div>
    </div>

    <!-- Stats Row -->
    <v-row class="mb-4">
      <v-col cols="6" sm="4" md="2">
        <v-card class="text-center pa-3 stat-card" color="primary">
          <div class="text-h5 font-weight-bold text-white">{{ candidates.length }}</div>
          <div class="text-caption text-white">Total Candidates</div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="4" md="2">
        <v-card class="text-center pa-3 stat-card" color="success">
          <div class="text-h5 font-weight-bold text-white">{{ statusCounts.new }}</div>
          <div class="text-caption text-white">New</div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="4" md="2">
        <v-card class="text-center pa-3 stat-card" color="purple">
          <div class="text-h5 font-weight-bold text-white">{{ statusCounts.screening }}</div>
          <div class="text-caption text-white">Screening</div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="4" md="2">
        <v-card class="text-center pa-3 stat-card" color="warning">
          <div class="text-h5 font-weight-bold text-grey-darken-4">{{ statusCounts.interview }}</div>
          <div class="text-caption text-grey-darken-2">Interview</div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="4" md="2">
        <v-card class="text-center pa-3 stat-card" color="teal">
          <div class="text-h5 font-weight-bold text-white">{{ statusCounts.offer }}</div>
          <div class="text-caption text-white">Offer</div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="4" md="2">
        <v-card class="text-center pa-3 stat-card" color="amber">
          <div class="text-h5 font-weight-bold text-grey-darken-4">{{ statusCounts.hired }}</div>
          <div class="text-caption text-grey-darken-2">Hired</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Filters -->
    <v-card class="mb-4" variant="outlined" rounded="lg">
      <v-card-text class="py-3">
        <v-row align="center" dense>
          <v-col cols="12" md="4">
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
          <v-col cols="12" md="4" class="d-flex justify-end">
            <v-btn-toggle v-model="quickFilter" density="compact" variant="outlined">
              <v-btn value="all" size="small">All</v-btn>
              <v-btn value="new" size="small" color="info">New</v-btn>
              <v-btn value="action" size="small" color="warning">Needs Action</v-btn>
            </v-btn-toggle>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Candidates Table -->
    <v-card variant="outlined" rounded="lg">
      <v-data-table
        :headers="tableHeaders"
        :items="filteredCandidates"
        :loading="loading"
        hover
        item-value="id"
        @click:row="(_e: Event, { item }: { item: Candidate }) => openCandidateDetail(item)"
      >
        <!-- Candidate Name Column -->
        <template #item.name="{ item }">
          <div class="d-flex align-center py-2">
            <v-avatar :color="getStatusColor(item.status)" size="40" class="mr-3">
              <span class="text-white font-weight-bold text-caption">
                {{ item.first_name[0] }}{{ item.last_name[0] }}
              </span>
            </v-avatar>
            <div>
              <div class="font-weight-medium">{{ item.first_name }} {{ item.last_name }}</div>
              <div class="text-caption text-grey">{{ item.source || 'Direct Application' }}</div>
            </div>
          </div>
        </template>

        <!-- Position Column -->
        <template #item.position="{ item }">
          <span v-if="item.job_positions?.title">{{ item.job_positions.title }}</span>
          <span v-else class="text-grey">—</span>
        </template>

        <!-- Status Column -->
        <template #item.status="{ item }">
          <v-chip :color="getStatusColor(item.status)" size="small" variant="flat">
            {{ formatStatus(item.status) }}
          </v-chip>
        </template>

        <!-- Contact Column -->
        <template #item.contact="{ item }">
          <div class="d-flex gap-1">
            <v-btn
              v-if="item.email"
              icon
              size="x-small"
              variant="text"
              color="primary"
              :href="`mailto:${item.email}`"
              @click.stop
            >
              <v-icon size="16">mdi-email</v-icon>
              <v-tooltip activator="parent" location="top">{{ item.email }}</v-tooltip>
            </v-btn>
            <v-btn
              v-if="item.phone"
              icon
              size="x-small"
              variant="text"
              color="success"
              :href="`tel:${item.phone}`"
              @click.stop
            >
              <v-icon size="16">mdi-phone</v-icon>
              <v-tooltip activator="parent" location="top">{{ item.phone }}</v-tooltip>
            </v-btn>
            <span v-if="!item.email && !item.phone" class="text-grey text-caption">No contact</span>
          </div>
        </template>

        <!-- Applied Date Column -->
        <template #item.applied_at="{ item }">
          <span class="text-caption">{{ formatDate(item.applied_at) }}</span>
        </template>

        <!-- Resume Column -->
        <template #item.resume="{ item }">
          <v-btn
            v-if="item.resume_url"
            icon
            size="x-small"
            variant="text"
            color="info"
            :href="item.resume_url"
            target="_blank"
            @click.stop
          >
            <v-icon size="16">mdi-file-document</v-icon>
            <v-tooltip activator="parent" location="top">View Resume</v-tooltip>
          </v-btn>
          <span v-else class="text-grey">—</span>
        </template>

        <!-- Actions Column -->
        <template #item.actions="{ item }">
          <div class="d-flex gap-0">
            <v-btn icon size="x-small" variant="text" title="View Profile" @click.stop="openCandidateDetail(item)">
              <v-icon size="18">mdi-eye</v-icon>
            </v-btn>
            <v-btn 
              v-if="item.email" 
              icon 
              size="x-small" 
              variant="text" 
              :href="`mailto:${item.email}`"
              @click.stop
            >
              <v-icon size="18">mdi-email</v-icon>
            </v-btn>
            <v-btn icon size="x-small" variant="text" title="Schedule Interview" @click.stop="scheduleInterview(item)">
              <v-icon size="18">mdi-calendar</v-icon>
            </v-btn>
            <v-btn icon size="x-small" variant="text" title="Edit" @click.stop="openEditDialog(item)">
              <v-icon size="18">mdi-pencil</v-icon>
            </v-btn>
          </div>
        </template>

        <!-- Empty State -->
        <template #no-data>
          <UiEmptyState
            v-if="search || statusFilter || positionFilter"
            type="search"
            title="No matches found"
            description="Try adjusting your search or filters"
            actionLabel="Clear filters"
            @action="clearFilters"
            class="py-8"
          />
          <UiEmptyState
            v-else
            type="candidates"
            title="No candidates yet"
            description="Start building your talent pipeline"
            actionLabel="Add Candidate"
            @action="openAddDialog"
            class="py-8"
          />
        </template>
      </v-data-table>
    </v-card>

    <!-- Candidate Detail Dialog -->
    <v-dialog v-model="detailDialog" max-width="900" scrollable>
      <v-card v-if="selectedCandidate" rounded="lg">
        <v-card-title class="d-flex align-center justify-space-between pa-4">
          <div class="d-flex align-center gap-3">
            <v-avatar :color="getStatusColor(selectedCandidate.status)" size="56">
              <span class="text-white font-weight-bold text-h6">
                {{ selectedCandidate.first_name[0] }}{{ selectedCandidate.last_name[0] }}
              </span>
            </v-avatar>
            <div>
              <h2 class="text-h5 font-weight-bold">
                {{ selectedCandidate.first_name }} {{ selectedCandidate.last_name }}
              </h2>
              <p class="text-body-2 text-grey mb-0">
                {{ selectedCandidate.job_positions?.title || 'General Application' }}
              </p>
            </div>
          </div>
          <div class="d-flex align-center gap-2">
            <v-chip :color="getStatusColor(selectedCandidate.status)" label>
              {{ formatStatus(selectedCandidate.status) }}
            </v-chip>
            <v-btn icon variant="text" @click="detailDialog = false">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </div>
        </v-card-title>

        <v-divider />

        <v-tabs v-model="detailTab" color="primary">
          <v-tab value="bio">
            <v-icon start size="18">mdi-account</v-icon>
            Bio
          </v-tab>
          <v-tab value="skills">
            <v-icon start size="18">mdi-star</v-icon>
            Skills Rating
          </v-tab>
          <v-tab value="timeline">
            <v-icon start size="18">mdi-timeline</v-icon>
            Timeline
          </v-tab>
        </v-tabs>

        <v-divider />

        <v-card-text style="max-height: 60vh; overflow-y: auto;">
          <v-window v-model="detailTab">
            <!-- Bio Tab -->
            <v-window-item value="bio">
              <v-row class="mt-2">
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
                    :model-value="selectedCandidate.resume_url"
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

              <!-- Status Actions -->
              <div class="d-flex gap-2 mt-4 flex-wrap">
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
                <v-btn
                  v-if="selectedCandidate.status === 'interview'"
                  color="success"
                  prepend-icon="mdi-handshake"
                  @click="updateStatus('offer')"
                >
                  Move to Offer
                </v-btn>
                <v-btn
                  v-if="selectedCandidate.status === 'offer'"
                  color="primary"
                  prepend-icon="mdi-account-check"
                  @click="updateStatus('hired')"
                >
                  Mark Hired
                </v-btn>
                <v-btn
                  v-if="!['rejected', 'hired'].includes(selectedCandidate.status)"
                  color="grey"
                  variant="outlined"
                  prepend-icon="mdi-close"
                  @click="updateStatus('rejected')"
                >
                  Reject
                </v-btn>
              </div>
            </v-window-item>

            <!-- Skills Tab -->
            <v-window-item value="skills">
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
            </v-window-item>

            <!-- Timeline Tab -->
            <v-window-item value="timeline">
              <v-timeline density="compact" side="end">
                <v-timeline-item dot-color="primary" size="small">
                  <div class="text-body-2">
                    <strong>Applied</strong>
                    <div class="text-caption text-grey">{{ formatDate(selectedCandidate.applied_at) }}</div>
                  </div>
                </v-timeline-item>
                <v-timeline-item 
                  v-if="['screening', 'interview', 'offer', 'hired'].includes(selectedCandidate.status)"
                  dot-color="purple" 
                  size="small"
                >
                  <div class="text-body-2">
                    <strong>Screening Started</strong>
                  </div>
                </v-timeline-item>
                <v-timeline-item 
                  v-if="['interview', 'offer', 'hired'].includes(selectedCandidate.status)"
                  dot-color="warning" 
                  size="small"
                >
                  <div class="text-body-2">
                    <strong>Interview Scheduled</strong>
                  </div>
                </v-timeline-item>
                <v-timeline-item 
                  v-if="['offer', 'hired'].includes(selectedCandidate.status)"
                  dot-color="success" 
                  size="small"
                >
                  <div class="text-body-2">
                    <strong>Offer Extended</strong>
                  </div>
                </v-timeline-item>
                <v-timeline-item 
                  v-if="selectedCandidate.status === 'hired'"
                  dot-color="primary" 
                  size="small"
                >
                  <div class="text-body-2">
                    <strong>Hired! 🎉</strong>
                  </div>
                </v-timeline-item>
                <v-timeline-item 
                  v-if="selectedCandidate.status === 'rejected'"
                  dot-color="grey" 
                  size="small"
                >
                  <div class="text-body-2">
                    <strong>Not Selected</strong>
                  </div>
                </v-timeline-item>
              </v-timeline>
            </v-window-item>
          </v-window>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Add/Edit Candidate Dialog -->
    <v-dialog v-model="addDialog" max-width="500">
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center bg-primary text-white py-4">
          <v-icon start>{{ editingCandidate ? 'mdi-pencil' : 'mdi-account-plus' }}</v-icon>
          {{ editingCandidate ? 'Edit Candidate' : 'Add Candidate' }}
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
                <v-select
                  v-model="newCandidate.source"
                  :items="sourceOptions"
                  label="Source"
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
            {{ editingCandidate ? 'Update' : 'Add' }} Candidate
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
  source?: string | null
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
const editingCandidate = ref<Candidate | null>(null)
const candidateNotes = ref('')
const loading = ref(true)
const saving = ref(false)

// Filters
const search = ref('')
const statusFilter = ref<string | null>(null)
const positionFilter = ref<string | null>(null)
const quickFilter = ref('all')

// Dialogs
const addDialog = ref(false)
const detailDialog = ref(false)
const detailTab = ref('bio')
const addFormValid = ref(false)

const newCandidate = reactive({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  target_position_id: null as string | null,
  source: null as string | null,
  resume_url: ''
})

// Options
const statusOptions = [
  { title: 'New', value: 'new' },
  { title: 'Screening', value: 'screening' },
  { title: 'Interview', value: 'interview' },
  { title: 'Offer', value: 'offer' },
  { title: 'Hired', value: 'hired' },
  { title: 'Rejected', value: 'rejected' }
]

const sourceOptions = [
  'Indeed',
  'LinkedIn',
  'ZipRecruiter',
  'GreenDog Website',
  'Personal Referral',
  'MASH Referral',
  'Shadow Interview',
  'Job Fair',
  'University Partner',
  'Walk-in',
  'Other'
]

const positionOptions = computed(() => 
  positions.value.map(p => ({ title: p.title, value: p.id }))
)

// Table headers
const tableHeaders = [
  { title: 'Candidate', key: 'name', sortable: true },
  { title: 'Position', key: 'position', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Contact', key: 'contact', sortable: false },
  { title: 'Applied', key: 'applied_at', sortable: true },
  { title: 'Resume', key: 'resume', sortable: false, align: 'center' as const },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const }
]

// Computed
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

  // Quick filter
  if (quickFilter.value === 'new') {
    result = result.filter(c => c.status === 'new')
  } else if (quickFilter.value === 'action') {
    result = result.filter(c => ['screening', 'interview', 'offer'].includes(c.status))
  }

  // Status filter
  if (statusFilter.value) {
    result = result.filter(c => c.status === statusFilter.value)
  }

  // Position filter
  if (positionFilter.value) {
    result = result.filter(c => c.target_position_id === positionFilter.value)
  }

  // Search
  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter(c =>
      c.first_name.toLowerCase().includes(q) ||
      c.last_name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
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

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  })
}

const clearFilters = () => {
  search.value = ''
  statusFilter.value = null
  positionFilter.value = null
  quickFilter.value = 'all'
}

const openCandidateDetail = (candidate: Candidate) => {
  selectedCandidate.value = candidate
  candidateNotes.value = candidate.notes || ''
  detailTab.value = 'bio'
  detailDialog.value = true
  loadCandidateSkills(candidate.id)
}

const loadCandidateSkills = async (candidateId: string) => {
  const { data } = await client
    .from('candidate_skills')
    .select('*')
    .eq('candidate_id', candidateId)
  candidateSkills.value = data || []
}

const getSkillRating = (skillId: string) => {
  const skill = candidateSkills.value.find(s => s.skill_id === skillId)
  return skill?.rating || 0
}

const updateSkillRating = async (skillId: string, rating: number) => {
  if (!selectedCandidate.value) return

  const candidateId = selectedCandidate.value.id
  const existing = candidateSkills.value.find(s => s.skill_id === skillId)

  if (existing) {
    await client
      .from('candidate_skills')
      .update({ rating })
      .eq('candidate_id', candidateId)
      .eq('skill_id', skillId)
  } else {
    await client
      .from('candidate_skills')
      .insert({ candidate_id: candidateId, skill_id: skillId, rating })
  }

  await loadCandidateSkills(candidateId)
}

const updateStatus = async (status: string) => {
  if (!selectedCandidate.value) return
  
  const previousStatus = selectedCandidate.value.status
  selectedCandidate.value.status = status
  
  const idx = candidates.value.findIndex(c => c.id === selectedCandidate.value?.id)
  if (idx !== -1) candidates.value[idx].status = status

  try {
    const { error } = await client
      .from('candidates')
      .update({ status })
      .eq('id', selectedCandidate.value.id)

    if (error) throw error

    if (status === 'hired') {
      confetti.fire()
      toast.success('Congratulations! Candidate hired! 🎉')
    } else if (status === 'offer') {
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
    } else {
      toast.success(`Candidate moved to ${formatStatus(status)}`)
    }
  } catch (error) {
    console.error('Error updating status:', error)
    selectedCandidate.value.status = previousStatus
    if (idx !== -1) candidates.value[idx].status = previousStatus
    toast.error('Failed to update status')
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

const openAddDialog = () => {
  editingCandidate.value = null
  Object.assign(newCandidate, {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    target_position_id: null,
    source: null,
    resume_url: ''
  })
  addFormValid.value = false
  addDialog.value = true
}

const openEditDialog = (candidate: Candidate) => {
  editingCandidate.value = candidate
  Object.assign(newCandidate, {
    first_name: candidate.first_name,
    last_name: candidate.last_name,
    email: candidate.email,
    phone: candidate.phone || '',
    target_position_id: candidate.target_position_id,
    source: candidate.source || null,
    resume_url: candidate.resume_url || ''
  })
  addDialog.value = true
}

const addForm = ref()

const saveCandidate = async () => {
  saving.value = true
  try {
    const payload = {
      first_name: newCandidate.first_name,
      last_name: newCandidate.last_name,
      email: newCandidate.email,
      phone: newCandidate.phone || null,
      target_position_id: newCandidate.target_position_id,
      source: newCandidate.source || null,
      resume_url: newCandidate.resume_url || null,
      status: 'new'
    }

    if (editingCandidate.value) {
      const { error } = await client
        .from('candidates')
        .update(payload)
        .eq('id', editingCandidate.value.id)
      if (error) throw error
      toast.success('Candidate updated')
    } else {
      const { data, error } = await client
        .from('candidates')
        .insert(payload)
        .select(`*, job_positions:target_position_id(title)`)
        .single()
      if (error) throw error
      candidates.value.unshift(data)
      toast.success('Candidate added successfully')
    }

    addDialog.value = false
    await fetchData()
  } catch (error) {
    console.error('Error saving candidate:', error)
    toast.error('Failed to save candidate')
  } finally {
    saving.value = false
  }
}

const scheduleInterview = (candidate: Candidate) => {
  // Navigate to interviews page or open scheduling modal
  navigateTo(`/recruiting/interviews?candidate=${candidate.id}`)
}

const exportCandidates = () => {
  const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Position', 'Status', 'Source', 'Applied']
  const rows = filteredCandidates.value.map(c => [
    c.first_name,
    c.last_name,
    c.email,
    c.phone || '',
    c.job_positions?.title || '',
    c.status,
    c.source || '',
    c.applied_at
  ])
  
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `candidates-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
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

useHead({ title: 'Recruiting Pipeline' })
</script>

<style scoped>
.candidates-page {
  min-height: calc(100vh - 100px);
}

.stat-card {
  border-radius: 8px;
}

:deep(.v-data-table tr) {
  cursor: pointer;
}
</style>
