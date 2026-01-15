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
        <!-- Row 1: Quick Filter Toggle -->
        <div class="d-flex justify-space-between align-center mb-3">
          <v-btn-toggle v-model="quickFilter" density="compact" variant="outlined">
            <v-btn value="all" size="small">All</v-btn>
            <v-btn value="new" size="small" color="success">New</v-btn>
            <v-btn value="screening" size="small" color="secondary">Screening</v-btn>
            <v-btn value="interview" size="small" color="warning">Interview</v-btn>
            <v-btn value="offer" size="small" color="teal">Offer</v-btn>
            <v-btn value="hired" size="small" color="info">Hired</v-btn>
          </v-btn-toggle>
          <v-btn
            v-if="hasActiveFilters"
            variant="text"
            size="small"
            color="primary"
            prepend-icon="mdi-filter-remove"
            @click="clearAllFilters"
          >
            Clear Filters
          </v-btn>
        </div>

        <!-- Row 2: Primary Filters -->
        <v-row align="center" dense>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="search"
              placeholder="Search by name, email, phone..."
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
          <v-col cols="6" md="2">
            <v-select
              v-model="locationFilter"
              :items="locationOptions"
              label="Location"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="6" md="3">
            <v-select
              v-model="departmentFilter"
              :items="departmentOptions"
              label="Department"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
        </v-row>

        <!-- Row 3: Advanced Filters (collapsible) -->
        <v-expand-transition>
          <div v-show="showAdvancedFilters" class="mt-3">
            <v-row align="center" dense>
              <v-col cols="6" md="2">
                <v-select
                  v-model="sourceFilter"
                  :items="sourceOptions"
                  label="Source"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
              <v-col cols="6" md="2">
                <v-select
                  v-model="candidateTypeFilter"
                  :items="candidateTypeOptions"
                  label="Type"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
              <v-col cols="6" md="2">
                <v-text-field
                  v-model="appliedDateFrom"
                  label="Applied From"
                  type="date"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
              <v-col cols="6" md="2">
                <v-text-field
                  v-model="appliedDateTo"
                  label="Applied To"
                  type="date"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
              <v-col cols="6" md="2">
                <v-select
                  v-model="experienceFilter"
                  :items="experienceOptions"
                  label="Experience"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
              <v-col cols="6" md="2">
                <v-select
                  v-model="interviewStatusFilter"
                  :items="interviewStatusOptions"
                  label="Interview Status"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
            </v-row>
          </div>
        </v-expand-transition>

        <!-- Toggle Advanced Filters -->
        <div class="d-flex justify-center mt-2">
          <v-btn
            variant="text"
            size="small"
            @click="showAdvancedFilters = !showAdvancedFilters"
          >
            <v-icon start>{{ showAdvancedFilters ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
            {{ showAdvancedFilters ? 'Hide Advanced Filters' : 'Show Advanced Filters' }}
          </v-btn>
        </div>
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

        <template #item.candidate_type="{ item }">
          <v-chip 
            v-if="item.candidate_type" 
            :color="getCandidateTypeColor(item.candidate_type)" 
            size="x-small" 
            variant="tonal"
          >
            {{ formatCandidateType(item.candidate_type) }}
          </v-chip>
          <span v-else class="text-grey">—</span>
        </template>

        <template #item.position="{ item }">
          <span v-if="item.job_positions?.title">{{ item.job_positions.title }}</span>
          <span v-else class="text-grey">—</span>
        </template>

        <template #item.location="{ item }">
          <span v-if="item.location?.name">{{ item.location.name }}</span>
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

        <template #item.actions="{ item }">
          <v-btn icon="mdi-eye" size="x-small" variant="text" title="View" @click.stop="openCandidateDetail(item)" />
          <v-btn icon="mdi-account-voice" size="x-small" variant="text" color="primary" title="Log Interview" @click.stop="openInterviewDialogFor(item)" />
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
          <v-tab value="interviews"><v-icon start size="small">mdi-account-voice</v-icon>Interviews</v-tab>
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
                <v-btn color="primary" prepend-icon="mdi-account-voice" size="small" @click="openInterviewDialog">
                  Log Interview
                </v-btn>
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

          <!-- Interviews Tab -->
          <v-window-item value="interviews">
            <v-card-text>
              <div class="d-flex align-center mb-4">
                <h3 class="text-subtitle-1 font-weight-bold">Interview History</h3>
                <v-spacer />
                <v-btn color="primary" size="small" prepend-icon="mdi-plus" @click="openInterviewDialog">
                  Log New Interview
                </v-btn>
              </div>

              <v-alert v-if="interviewsLoading" type="info" variant="tonal" density="compact" class="mb-4">
                <v-progress-circular indeterminate size="16" class="mr-2" />
                Loading interview history...
              </v-alert>

              <template v-else-if="candidateInterviews.length > 0">
                <v-timeline density="compact" side="end">
                  <v-timeline-item
                    v-for="interview in candidateInterviews"
                    :key="interview.id"
                    :dot-color="getInterviewStatusColor(interview.status)"
                    size="small"
                  >
                    <template #opposite>
                      <div class="text-caption text-grey">
                        {{ formatDate(interview.scheduled_at || interview.created_at) }}
                      </div>
                    </template>
                    <v-card variant="outlined" class="mb-2">
                      <v-card-text class="py-2 px-3">
                        <div class="d-flex align-center mb-1">
                          <v-chip size="x-small" :color="getInterviewTypeColor(interview.interview_type)" variant="tonal" class="mr-2">
                            {{ formatInterviewType(interview.interview_type) }}
                          </v-chip>
                          <v-chip size="x-small" :color="getInterviewStatusColor(interview.status)" variant="flat">
                            {{ interview.status }}
                          </v-chip>
                          <v-spacer />
                          <v-rating
                            v-if="interview.overall_score"
                            :model-value="interview.overall_score"
                            readonly
                            density="compact"
                            size="x-small"
                            color="amber"
                          />
                        </div>
                        <div v-if="interview.interviewer?.first_name" class="text-caption text-grey mb-1">
                          <v-icon size="x-small" class="mr-1">mdi-account-tie</v-icon>
                          Interviewer: {{ interview.interviewer.first_name }} {{ interview.interviewer.last_name }}
                        </div>
                        <div v-if="interview.recommendation" class="mt-2">
                          <v-chip 
                            size="x-small" 
                            :color="getRecommendationColor(interview.recommendation)"
                            variant="tonal"
                          >
                            {{ formatRecommendation(interview.recommendation) }}
                          </v-chip>
                        </div>
                        <div v-if="interview.notes" class="text-body-2 mt-2">
                          {{ interview.notes.substring(0, 150) }}{{ interview.notes.length > 150 ? '...' : '' }}
                        </div>
                        <v-expand-transition>
                          <div v-if="expandedInterview === interview.id" class="mt-3">
                            <v-divider class="mb-3" />
                            <v-row dense>
                              <v-col v-if="interview.strengths" cols="12" md="6">
                                <div class="text-caption font-weight-bold text-success mb-1">
                                  <v-icon size="x-small">mdi-plus-circle</v-icon> Strengths
                                </div>
                                <div class="text-body-2">{{ interview.strengths }}</div>
                              </v-col>
                              <v-col v-if="interview.concerns" cols="12" md="6">
                                <div class="text-caption font-weight-bold text-error mb-1">
                                  <v-icon size="x-small">mdi-minus-circle</v-icon> Concerns
                                </div>
                                <div class="text-body-2">{{ interview.concerns }}</div>
                              </v-col>
                            </v-row>
                            <v-row v-if="interview.technical_score || interview.communication_score || interview.cultural_fit_score" dense class="mt-2">
                              <v-col v-if="interview.technical_score" cols="4">
                                <div class="text-caption">Technical</div>
                                <v-rating :model-value="interview.technical_score" readonly size="x-small" color="blue" density="compact" />
                              </v-col>
                              <v-col v-if="interview.communication_score" cols="4">
                                <div class="text-caption">Communication</div>
                                <v-rating :model-value="interview.communication_score" readonly size="x-small" color="green" density="compact" />
                              </v-col>
                              <v-col v-if="interview.cultural_fit_score" cols="4">
                                <div class="text-caption">Cultural Fit</div>
                                <v-rating :model-value="interview.cultural_fit_score" readonly size="x-small" color="purple" density="compact" />
                              </v-col>
                            </v-row>
                          </div>
                        </v-expand-transition>
                        <v-btn 
                          variant="text" 
                          size="x-small" 
                          class="mt-1" 
                          @click="expandedInterview = expandedInterview === interview.id ? null : interview.id"
                        >
                          {{ expandedInterview === interview.id ? 'Show less' : 'Show more' }}
                          <v-icon end>{{ expandedInterview === interview.id ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                        </v-btn>
                      </v-card-text>
                    </v-card>
                  </v-timeline-item>
                </v-timeline>
              </template>

              <v-alert v-else type="info" variant="tonal" density="compact">
                <v-icon start>mdi-information</v-icon>
                No interviews logged yet. Click "Log New Interview" to add the first one.
              </v-alert>
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
          <v-spacer />
          <v-btn color="primary" prepend-icon="mdi-account-voice" @click="openInterviewDialog">
            Log Interview
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Interview Dialog -->
    <RecruitingInterviewDialog
      v-model="interviewDialogOpen"
      :candidate="selectedCandidate"
      :employees="employeesList"
      :show-forward="true"
      @saved="onInterviewSaved"
      @forwarded="onCandidateForwarded"
    />

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
  location_id: string | null
  location: { name: string } | null
  department_id: string | null
  department: { name: string } | null
  resume_url: string | null
  status: string
  notes: string | null
  applied_at: string
  source: string | null
  referral_source: string | null
  experience_years: number | null
  interview_status: string | null
  candidate_type: string | null
}

interface CandidateInterview {
  id: string
  candidate_id: string
  interview_type: string
  scheduled_at: string | null
  interviewer_employee_id: string | null
  interviewer?: { first_name: string; last_name: string } | null
  duration_minutes: number | null
  overall_score: number | null
  technical_score: number | null
  communication_score: number | null
  cultural_fit_score: number | null
  notes: string | null
  strengths: string | null
  concerns: string | null
  recommendation: string | null
  status: string
  round_number: number
  created_at: string
}

interface Employee {
  id: string
  full_name: string
  profile_id?: string
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
const locations = ref<{ id: string; name: string }[]>([])
const departments = ref<{ id: string; name: string }[]>([])
const selectedCandidate = ref<Candidate | null>(null)
const candidateNotes = ref('')
const loading = ref(true)
const saving = ref(false)
const search = ref('')
const statusFilter = ref<string | null>(null)
const positionFilter = ref<string | null>(null)
const locationFilter = ref<string | null>(null)
const departmentFilter = ref<string | null>(null)
const sourceFilter = ref<string | null>(null)
const candidateTypeFilter = ref<string | null>(null)
const experienceFilter = ref<string | null>(null)
const interviewStatusFilter = ref<string | null>(null)
const appliedDateFrom = ref<string | null>(null)
const appliedDateTo = ref<string | null>(null)
const quickFilter = ref('all')
const showAdvancedFilters = ref(false)
const detailTab = ref('bio')
const detailDialog = ref(false)
const addDialog = ref(false)
const addFormValid = ref(false)
const addForm = ref()

// Interview dialog state
const interviewDialogOpen = ref(false)
const candidateInterviews = ref<CandidateInterview[]>([])
const interviewsLoading = ref(false)
const expandedInterview = ref<string | null>(null)
const employeesList = ref<Employee[]>([])

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

const sourceOptions = [
  { title: 'Website', value: 'website' },
  { title: 'Referral', value: 'referral' },
  { title: 'Indeed', value: 'indeed' },
  { title: 'LinkedIn', value: 'linkedin' },
  { title: 'Walk-in', value: 'walk-in' },
  { title: 'Career Fair', value: 'career_fair' },
  { title: 'Other', value: 'other' }
]

const candidateTypeOptions = [
  { title: 'Applicant', value: 'applicant' },
  { title: 'Intern', value: 'intern' },
  { title: 'Extern', value: 'extern' },
  { title: 'Student', value: 'student' },
  { title: 'CE Attendee', value: 'ce_attendee' }
]

const experienceOptions = [
  { title: '0-1 years', value: '0-1' },
  { title: '1-3 years', value: '1-3' },
  { title: '3-5 years', value: '3-5' },
  { title: '5-10 years', value: '5-10' },
  { title: '10+ years', value: '10+' }
]

const interviewStatusOptions = [
  { title: 'Not Scheduled', value: 'not_scheduled' },
  { title: 'Scheduled', value: 'scheduled' },
  { title: 'Completed', value: 'completed' },
  { title: 'No Show', value: 'no_show' },
  { title: 'Rescheduled', value: 'rescheduled' }
]

const tableHeaders = [
  { title: 'Candidate', key: 'name', sortable: true },
  { title: 'Type', key: 'candidate_type', sortable: true },
  { title: 'Position', key: 'position', sortable: true },
  { title: 'Location', key: 'location', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Applied', key: 'applied_at', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const }
]

// Computed
const positionOptions = computed(() => {
  return positions.value.map(p => ({ title: p.title, value: p.id }))
})

const locationOptions = computed(() => {
  return locations.value.map(l => ({ title: l.name, value: l.id }))
})

const departmentOptions = computed(() => {
  return departments.value.map(d => ({ title: d.name, value: d.id }))
})

const hasActiveFilters = computed(() => {
  return !!(
    search.value ||
    statusFilter.value ||
    positionFilter.value ||
    locationFilter.value ||
    departmentFilter.value ||
    sourceFilter.value ||
    candidateTypeFilter.value ||
    experienceFilter.value ||
    interviewStatusFilter.value ||
    appliedDateFrom.value ||
    appliedDateTo.value ||
    (quickFilter.value && quickFilter.value !== 'all')
  )
})

const clearAllFilters = () => {
  search.value = ''
  statusFilter.value = null
  positionFilter.value = null
  locationFilter.value = null
  departmentFilter.value = null
  sourceFilter.value = null
  candidateTypeFilter.value = null
  experienceFilter.value = null
  interviewStatusFilter.value = null
  appliedDateFrom.value = null
  appliedDateTo.value = null
  quickFilter.value = 'all'
}

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

  // Quick filter (status toggle)
  if (quickFilter.value !== 'all') {
    result = result.filter(c => c.status === quickFilter.value)
  }

  // Status filter (dropdown)
  if (statusFilter.value) {
    result = result.filter(c => c.status === statusFilter.value)
  }

  // Position filter
  if (positionFilter.value) {
    result = result.filter(c => c.target_position_id === positionFilter.value)
  }

  // Location filter
  if (locationFilter.value) {
    result = result.filter(c => c.location_id === locationFilter.value)
  }

  // Department filter
  if (departmentFilter.value) {
    result = result.filter(c => c.department_id === departmentFilter.value)
  }

  // Source filter
  if (sourceFilter.value) {
    result = result.filter(c => 
      c.source === sourceFilter.value || 
      c.referral_source === sourceFilter.value
    )
  }

  // Candidate type filter
  if (candidateTypeFilter.value) {
    result = result.filter(c => c.candidate_type === candidateTypeFilter.value)
  }

  // Experience filter
  if (experienceFilter.value) {
    result = result.filter(c => {
      const years = c.experience_years ?? 0
      switch (experienceFilter.value) {
        case '0-1': return years >= 0 && years <= 1
        case '1-3': return years > 1 && years <= 3
        case '3-5': return years > 3 && years <= 5
        case '5-10': return years > 5 && years <= 10
        case '10+': return years > 10
        default: return true
      }
    })
  }

  // Interview status filter
  if (interviewStatusFilter.value) {
    result = result.filter(c => c.interview_status === interviewStatusFilter.value)
  }

  // Applied date range
  if (appliedDateFrom.value) {
    const fromDate = new Date(appliedDateFrom.value)
    result = result.filter(c => new Date(c.applied_at) >= fromDate)
  }
  if (appliedDateTo.value) {
    const toDate = new Date(appliedDateTo.value)
    toDate.setHours(23, 59, 59, 999)
    result = result.filter(c => new Date(c.applied_at) <= toDate)
  }

  // Search filter (name, email, phone)
  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter(c =>
      c.first_name.toLowerCase().includes(q) ||
      c.last_name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q))
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

const getCandidateTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    applicant: 'primary',
    intern: 'orange',
    extern: 'purple',
    student: 'cyan',
    ce_attendee: 'deep-purple'
  }
  return colors[type] || 'grey'
}

const formatCandidateType = (type: string) => {
  const labels: Record<string, string> = {
    applicant: 'Applicant',
    intern: 'Intern',
    extern: 'Extern',
    student: 'Student',
    ce_attendee: 'CE Attendee'
  }
  return labels[type] || type
}

const formatStatus = (status: string) => status.charAt(0).toUpperCase() + status.slice(1)

const getInterviewStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    scheduled: 'info',
    in_progress: 'warning',
    completed: 'success',
    cancelled: 'grey',
    no_show: 'error'
  }
  return colors[status] || 'grey'
}

const getInterviewTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    phone_screen: 'teal',
    video_call: 'blue',
    in_person: 'primary',
    technical: 'orange',
    working_interview: 'purple',
    panel: 'indigo',
    final: 'success'
  }
  return colors[type] || 'grey'
}

const formatInterviewType = (type: string) => {
  const labels: Record<string, string> = {
    phone_screen: 'Phone Screen',
    video_call: 'Video Call',
    in_person: 'In Person',
    technical: 'Technical',
    working_interview: 'Working Interview',
    panel: 'Panel',
    final: 'Final'
  }
  return labels[type] || type
}

const getRecommendationColor = (rec: string) => {
  const colors: Record<string, string> = {
    strong_yes: 'success',
    yes: 'teal',
    maybe: 'warning',
    no: 'error'
  }
  return colors[rec] || 'grey'
}

const formatRecommendation = (rec: string) => {
  const labels: Record<string, string> = {
    strong_yes: 'Strong Yes',
    yes: 'Yes',
    maybe: 'Maybe',
    no: 'No'
  }
  return labels[rec] || rec
}

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

  // Load candidate interviews
  loadCandidateInterviews(candidate.id)
}

const loadCandidateInterviews = async (candidateId: string) => {
  interviewsLoading.value = true
  try {
    const { data, error } = await client
      .from('candidate_interviews')
      .select(`
        *,
        interviewer:interviewer_employee_id(first_name, last_name)
      `)
      .eq('candidate_id', candidateId)
      .order('scheduled_at', { ascending: false })

    if (error) throw error
    candidateInterviews.value = data || []
  } catch (err) {
    console.error('Failed to load interviews:', err)
    candidateInterviews.value = []
  } finally {
    interviewsLoading.value = false
  }
}

const openInterviewDialog = () => {
  interviewDialogOpen.value = true
}

const openInterviewDialogFor = (candidate: any) => {
  selectedCandidate.value = candidate
  interviewDialogOpen.value = true
}

const onInterviewSaved = async (interview: any) => {
  // Reload interview list
  if (selectedCandidate.value) {
    await loadCandidateInterviews(selectedCandidate.value.id)
    // Update candidate status if not already in interview stage
    if (selectedCandidate.value.status === 'new' || selectedCandidate.value.status === 'screening') {
      await updateStatus('interview')
    }
  }
  toast.success('Interview logged successfully')
}

const onCandidateForwarded = async (data: { interview: any; forwardedTo: string }) => {
  toast.success('Candidate forwarded for review')
  // Reload interviews to show latest
  if (selectedCandidate.value) {
    await loadCandidateInterviews(selectedCandidate.value.id)
  }
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
      .select(`
        *,
        job_positions:target_position_id(title),
        location:location_id(name),
        department:department_id(name)
      `)
      .order('applied_at', { ascending: false })

    candidates.value = candidatesData || []

    const { data: positionsData } = await client
      .from('job_positions')
      .select('id, title')
      .order('title')

    positions.value = positionsData || []

    const { data: locationsData } = await client
      .from('locations')
      .select('id, name')
      .eq('is_active', true)
      .order('name')

    locations.value = locationsData || []

    const { data: departmentsData } = await client
      .from('departments')
      .select('id, name')
      .order('name')

    departments.value = departmentsData || []

    const { data: skillsData } = await client
      .from('skill_library')
      .select('id, name')
      .order('name')

    availableSkills.value = skillsData || []

    // Fetch employees for interview dialog
    const { data: employeesData } = await client
      .from('employees')
      .select('id, profile_id, first_name, last_name')
      .eq('employment_status', 'active')
      .order('first_name')

    employeesList.value = (employeesData || []).map(e => ({
      id: e.id,
      profile_id: e.profile_id,
      full_name: `${e.first_name} ${e.last_name}`
    }))

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
