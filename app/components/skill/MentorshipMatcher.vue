<template>
  <v-card class="mentorship-matcher" variant="outlined">
    <v-tabs v-model="activeTab" color="primary" grow>
      <v-tab value="find">
        <v-icon start>mdi-magnify</v-icon>
        Find a Mentor
      </v-tab>
      <v-tab value="requests">
        <v-icon start>mdi-inbox</v-icon>
        Requests
        <v-badge
          v-if="pendingCount > 0"
          :content="pendingCount"
          color="error"
          inline
          class="ml-2"
        />
      </v-tab>
      <v-tab value="active">
        <v-icon start>mdi-account-group</v-icon>
        Active
        <v-badge
          v-if="activeMentorships.length > 0"
          :content="activeMentorships.length"
          color="success"
          inline
          class="ml-2"
        />
      </v-tab>
    </v-tabs>

    <v-window v-model="activeTab">
      <!-- Tab A: Find a Mentor -->
      <v-window-item value="find">
        <v-card-text>
          <!-- Goal Skills Selection -->
          <div v-if="goalSkills.length === 0" class="empty-state text-center py-8">
            <v-icon size="64" color="grey-lighten-2">mdi-target</v-icon>
            <h3 class="text-h6 mt-4">No Learning Goals Set</h3>
            <p class="text-body-2 text-grey mt-2">
              Mark skills as "Goals" in your skill list to find mentors.
            </p>
          </div>

          <div v-else>
            <p class="text-body-2 text-grey mb-4">
              Select a skill you want to learn to find available mentors.
            </p>

            <v-select
              v-model="selectedGoalSkill"
              :items="goalSkillOptions"
              label="Select a Learning Goal"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-target"
              hide-details
              class="mb-4"
            />

            <!-- Mentor Results -->
            <div v-if="selectedGoalSkill && !isLoadingMentors">
              <div v-if="mentors.length === 0" class="no-mentors text-center py-6">
                <v-icon size="48" color="grey-lighten-2">mdi-account-search</v-icon>
                <p class="text-body-2 text-grey mt-3">
                  No mentors available for this skill yet.
                </p>
              </div>

              <v-list v-else class="mentor-list">
                <v-list-item
                  v-for="mentor in mentors"
                  :key="mentor.id"
                  class="mentor-card mb-2 pa-3"
                  rounded="lg"
                >
                  <template #prepend>
                    <v-avatar 
                      :color="mentor.avatar_url ? undefined : 'primary'" 
                      size="48"
                    >
                      <v-img v-if="mentor.avatar_url" :src="mentor.avatar_url" />
                      <span v-else class="text-white font-weight-bold">
                        {{ getInitials(mentor) }}
                      </span>
                    </v-avatar>
                  </template>

                  <v-list-item-title class="font-weight-medium">
                    {{ mentor.first_name }} {{ mentor.last_name }}
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    {{ mentor.position || 'Team Member' }}
                    <span v-if="mentor.department">• {{ mentor.department }}</span>
                  </v-list-item-subtitle>

                  <template #append>
                    <div class="d-flex align-center gap-2">
                      <v-chip 
                        :color="getSkillLevelColor(mentor.skill_level)" 
                        size="small" 
                        variant="flat"
                      >
                        <v-icon start size="14">mdi-star</v-icon>
                        Lvl {{ mentor.skill_level }}
                      </v-chip>
                      <v-btn
                        color="primary"
                        size="small"
                        variant="elevated"
                        :loading="requestingMentor === mentor.employee_id"
                        :disabled="hasRequested(mentor.employee_id)"
                        @click="requestMentorship(mentor)"
                      >
                        {{ hasRequested(mentor.employee_id) ? 'Requested' : 'Request' }}
                      </v-btn>
                    </div>
                  </template>
                </v-list-item>
              </v-list>
            </div>

            <div v-if="isLoadingMentors" class="text-center py-6">
              <v-progress-circular indeterminate color="primary" size="32" />
              <p class="text-caption text-grey mt-2">Finding mentors...</p>
            </div>
          </div>
        </v-card-text>
      </v-window-item>

      <!-- Tab B: Mentorship Requests (Inbox) -->
      <v-window-item value="requests">
        <v-card-text>
          <div v-if="incomingRequests.length === 0 && outgoingRequests.length === 0" class="empty-state text-center py-8">
            <v-icon size="64" color="grey-lighten-2">mdi-inbox-outline</v-icon>
            <h3 class="text-h6 mt-4">No Pending Requests</h3>
            <p class="text-body-2 text-grey mt-2">
              You don't have any mentorship requests at the moment.
            </p>
          </div>

          <div v-else>
            <!-- Incoming Requests (I'm the mentor) -->
            <div v-if="incomingRequests.filter(r => r.status === 'pending').length > 0">
              <div class="section-header d-flex align-center gap-2 mb-3">
                <v-icon size="18" color="primary">mdi-inbox-arrow-down</v-icon>
                <span class="text-subtitle-2 font-weight-bold">Incoming Requests</span>
              </div>

              <v-list density="compact" class="request-list">
                <v-list-item
                  v-for="request in incomingRequests.filter(r => r.status === 'pending')"
                  :key="request.id"
                  class="request-item mb-2 pa-3"
                  rounded="lg"
                >
                  <template #prepend>
                    <v-avatar 
                      :color="request.mentee_avatar ? undefined : 'info'" 
                      size="40"
                    >
                      <v-img v-if="request.mentee_avatar" :src="request.mentee_avatar" />
                      <v-icon v-else color="white">mdi-account</v-icon>
                    </v-avatar>
                  </template>

                  <v-list-item-title class="font-weight-medium">
                    {{ request.mentee_name }}
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    Wants to learn <strong>{{ request.skill_name }}</strong>
                  </v-list-item-subtitle>

                  <template #append>
                    <div class="d-flex gap-2">
                      <v-btn
                        color="success"
                        size="small"
                        variant="flat"
                        :loading="processingRequest === request.id"
                        @click="acceptRequest(request.id)"
                      >
                        <v-icon start size="16">mdi-check</v-icon>
                        Accept
                      </v-btn>
                      <v-btn
                        color="error"
                        size="small"
                        variant="outlined"
                        :loading="processingRequest === request.id"
                        @click="declineRequest(request.id)"
                      >
                        Decline
                      </v-btn>
                    </div>
                  </template>
                </v-list-item>
              </v-list>
            </div>

            <!-- Outgoing Requests (I'm the mentee) -->
            <div v-if="outgoingRequests.filter(r => r.status === 'pending').length > 0" class="mt-4">
              <div class="section-header d-flex align-center gap-2 mb-3">
                <v-icon size="18" color="secondary">mdi-inbox-arrow-up</v-icon>
                <span class="text-subtitle-2 font-weight-bold">Your Requests</span>
              </div>

              <v-list density="compact" class="request-list">
                <v-list-item
                  v-for="request in outgoingRequests.filter(r => r.status === 'pending')"
                  :key="request.id"
                  class="request-item mb-2 pa-3"
                  rounded="lg"
                >
                  <template #prepend>
                    <v-avatar color="grey-lighten-3" size="40">
                      <v-icon color="grey">mdi-clock-outline</v-icon>
                    </v-avatar>
                  </template>

                  <v-list-item-title>
                    Waiting for <strong>{{ request.mentor_name }}</strong>
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    {{ request.skill_name }}
                  </v-list-item-subtitle>

                  <template #append>
                    <v-chip size="small" color="warning" variant="tonal">
                      Pending
                    </v-chip>
                  </template>
                </v-list-item>
              </v-list>
            </div>
          </div>
        </v-card-text>
      </v-window-item>

      <!-- Tab C: Active Mentorships -->
      <v-window-item value="active">
        <v-card-text>
          <div v-if="activeMentorships.length === 0" class="empty-state text-center py-8">
            <v-icon size="64" color="grey-lighten-2">mdi-account-multiple</v-icon>
            <h3 class="text-h6 mt-4">No Active Mentorships</h3>
            <p class="text-body-2 text-grey mt-2">
              Start by finding a mentor or accepting incoming requests.
            </p>
          </div>

          <v-list v-else class="active-list">
            <v-list-item
              v-for="mentorship in activeMentorships"
              :key="mentorship.id"
              class="active-item mb-2 pa-3"
              rounded="lg"
            >
              <template #prepend>
                <v-avatar color="success" size="40">
                  <v-icon color="white">mdi-account-supervisor</v-icon>
                </v-avatar>
              </template>

              <v-list-item-title class="font-weight-medium">
                {{ mentorship.skill_name }}
              </v-list-item-title>
              <v-list-item-subtitle>
                <span v-if="isMentor(mentorship)">
                  Teaching {{ mentorship.mentee_name }}
                </span>
                <span v-else>
                  Learning from {{ mentorship.mentor_name }}
                </span>
              </v-list-item-subtitle>

              <template #append>
                <v-chip size="small" color="success" variant="flat">
                  <v-icon start size="14">mdi-check-circle</v-icon>
                  Active
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-window-item>
    </v-window>
  </v-card>
</template>

<script setup lang="ts">
import type { GoalSkill, PotentialMentor, MentorshipRequest } from '~/types/skill.types'

interface Props {
  goalSkills: GoalSkill[]
  incomingRequests: MentorshipRequest[]
  outgoingRequests: MentorshipRequest[]
  activeMentorships: MentorshipRequest[]
  currentEmployeeId: string
  isLoadingMentors?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isLoadingMentors: false
})

const emit = defineEmits<{
  'fetch-mentors': [skillId: string]
  'request-mentorship': [skillId: string, mentorId: string]
  'accept-request': [requestId: string]
  'decline-request': [requestId: string]
}>()

// State
const activeTab = ref('find')
const selectedGoalSkill = ref<string | null>(null)
const mentors = ref<PotentialMentor[]>([])
const requestingMentor = ref<string | null>(null)
const processingRequest = ref<string | null>(null)
const requestedMentors = ref<Set<string>>(new Set())

// Computed
const pendingCount = computed(() => 
  props.incomingRequests.filter(r => r.status === 'pending').length
)

const goalSkillOptions = computed(() => 
  props.goalSkills.map(s => ({
    title: s.name,
    value: s.skill_id
  }))
)

// Watch for skill selection change
watch(selectedGoalSkill, async (skillId) => {
  if (skillId) {
    emit('fetch-mentors', skillId)
  } else {
    mentors.value = []
  }
})

// Methods
function getInitials(mentor: PotentialMentor): string {
  return `${mentor.first_name?.[0] || ''}${mentor.last_name?.[0] || ''}`.toUpperCase()
}

function getSkillLevelColor(level: number): string {
  if (level === 5) return 'success'
  if (level === 4) return 'info'
  return 'warning'
}

function hasRequested(mentorId: string): boolean {
  return requestedMentors.value.has(mentorId) ||
    props.outgoingRequests.some(r => 
      r.mentor_id === mentorId && 
      r.skill_id === selectedGoalSkill.value &&
      r.status === 'pending'
    )
}

async function requestMentorship(mentor: PotentialMentor) {
  if (!selectedGoalSkill.value) return
  
  requestingMentor.value = mentor.employee_id
  try {
    emit('request-mentorship', selectedGoalSkill.value, mentor.employee_id)
    requestedMentors.value.add(mentor.employee_id)
  } finally {
    requestingMentor.value = null
  }
}

async function acceptRequest(requestId: string) {
  processingRequest.value = requestId
  try {
    emit('accept-request', requestId)
  } finally {
    processingRequest.value = null
  }
}

async function declineRequest(requestId: string) {
  processingRequest.value = requestId
  try {
    emit('decline-request', requestId)
  } finally {
    processingRequest.value = null
  }
}

function isMentor(mentorship: MentorshipRequest): boolean {
  return mentorship.mentor_id === props.currentEmployeeId
}

// Expose method to update mentors from parent
function setMentors(newMentors: PotentialMentor[]) {
  mentors.value = newMentors
}

defineExpose({ setMentors })
</script>

<style scoped>
.mentorship-matcher {
  overflow: hidden;
}

.empty-state {
  padding: 32px 16px;
}

.mentor-list,
.request-list,
.active-list {
  background: transparent;
}

.mentor-card,
.request-item,
.active-item {
  background: rgba(var(--v-theme-surface-variant), 0.5);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  transition: all 0.2s ease;
}

.mentor-card:hover,
.request-item:hover,
.active-item:hover {
  background: rgba(var(--v-theme-primary), 0.05);
  border-color: rgba(var(--v-theme-primary), 0.2);
}

.section-header {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  padding-bottom: 8px;
}
</style>
