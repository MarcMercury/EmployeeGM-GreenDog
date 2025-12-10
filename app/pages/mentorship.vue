<template>
  <div class="mentorship-hub">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap gap-4">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Mentorship Hub</h1>
        <p class="text-body-2 text-grey">
          Connect with mentors and mentees to grow your skills
        </p>
      </div>
    </div>

    <!-- Stats Row -->
    <v-row class="mb-6">
      <v-col cols="6" md="3">
        <v-card variant="outlined" class="text-center pa-4">
          <v-icon size="32" color="primary" class="mb-2">mdi-account-supervisor</v-icon>
          <div class="text-h5 font-weight-bold">{{ activeMentorships.length }}</div>
          <div class="text-caption text-grey">Active Mentorships</div>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card variant="outlined" class="text-center pa-4">
          <v-icon size="32" color="warning" class="mb-2">mdi-inbox</v-icon>
          <div class="text-h5 font-weight-bold">{{ pendingCount }}</div>
          <div class="text-caption text-grey">Pending Requests</div>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card variant="outlined" class="text-center pa-4">
          <v-icon size="32" color="success" class="mb-2">mdi-star</v-icon>
          <div class="text-h5 font-weight-bold">{{ mentorableSkillsCount }}</div>
          <div class="text-caption text-grey">Skills You Can Mentor</div>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card variant="outlined" class="text-center pa-4">
          <v-icon size="32" color="info" class="mb-2">mdi-target</v-icon>
          <div class="text-h5 font-weight-bold">{{ goalSkillsCount }}</div>
          <div class="text-caption text-grey">Learning Goals</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Main Content -->
    <v-row>
      <!-- Mentorship Matcher -->
      <v-col cols="12" md="7">
        <SkillMentorshipMatcher
          :goal-skills="myGoalSkills"
          :incoming-requests="incomingRequests"
          :outgoing-requests="outgoingRequests"
          :active-mentorships="activeMentorships"
          :current-employee-id="currentEmployeeId"
          :is-loading-mentors="isLoadingMentors"
          ref="mentorshipMatcherRef"
          @fetch-mentors="handleFetchMentors"
          @request-mentorship="handleRequestMentorship"
          @accept-request="handleAcceptRequest"
          @decline-request="handleDeclineRequest"
        />
      </v-col>

      <!-- Your Mentor Skills -->
      <v-col cols="12" md="5">
        <v-card variant="outlined">
          <v-card-title class="d-flex align-center">
            <v-icon color="success" class="mr-2">mdi-school</v-icon>
            Skills You Can Teach
          </v-card-title>
          <v-card-text>
            <div v-if="mentorableSkills.length === 0" class="text-center py-6">
              <v-icon size="48" color="grey-lighten-2">mdi-star-outline</v-icon>
              <p class="text-body-2 text-grey mt-3">
                Reach level 4 or 5 in a skill to become a mentor
              </p>
            </div>
            
            <v-list v-else density="compact" class="bg-transparent">
              <v-list-item
                v-for="skill in mentorableSkills"
                :key="skill.id"
              >
                <template #prepend>
                  <v-icon color="success" size="20">mdi-star</v-icon>
                </template>
                
                <v-list-item-title>{{ skill.name }}</v-list-item-title>
                <v-list-item-subtitle>{{ skill.category }}</v-list-item-subtitle>
                
                <template #append>
                  <v-chip 
                    :color="skill.level === 5 ? 'success' : 'info'" 
                    size="small" 
                    variant="flat"
                  >
                    Lvl {{ skill.level }}
                  </v-chip>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <!-- Quick Actions -->
        <v-card variant="outlined" class="mt-4">
          <v-card-title>Quick Actions</v-card-title>
          <v-card-text>
            <v-btn 
              block 
              color="primary" 
              variant="tonal" 
              prepend-icon="mdi-target"
              to="/my-stats"
              class="mb-2"
            >
              Manage Learning Goals
            </v-btn>
            <v-btn 
              block 
              color="secondary" 
              variant="outlined" 
              prepend-icon="mdi-star"
              to="/my-stats"
            >
              View My Skills
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const skillEngineStore = useSkillEngineStore()
const authStore = useAuthStore()

// Refs
const mentorshipMatcherRef = ref()

// Snackbar
const snackbar = reactive({
  show: false,
  message: '',
  color: 'success'
})

// Computed
const isLoadingMentors = computed(() => skillEngineStore.isLoadingMentors)
const myGoalSkills = computed(() => skillEngineStore.myGoalSkills)
const mentorableSkills = computed(() => skillEngineStore.mentorableSkills)
const incomingRequests = computed(() => skillEngineStore.incomingRequests)
const outgoingRequests = computed(() => skillEngineStore.outgoingRequests)
const activeMentorships = computed(() => skillEngineStore.activeMentorships)

const currentEmployeeId = computed(() => authStore.user?.id || '')

const pendingCount = computed(() => 
  incomingRequests.value.filter(r => r.status === 'pending').length
)

const mentorableSkillsCount = computed(() => mentorableSkills.value.length)
const goalSkillsCount = computed(() => myGoalSkills.value.length)

// Methods
async function handleFetchMentors(skillId: string) {
  const mentors = await skillEngineStore.getMentorsForSkill(skillId)
  mentorshipMatcherRef.value?.setMentors(mentors)
}

async function handleRequestMentorship(skillId: string, mentorId: string) {
  try {
    await skillEngineStore.requestMentorship(skillId, mentorId)
    snackbar.message = 'Mentorship request sent!'
    snackbar.color = 'success'
    snackbar.show = true
  } catch (err) {
    snackbar.message = 'Failed to send request'
    snackbar.color = 'error'
    snackbar.show = true
  }
}

async function handleAcceptRequest(requestId: string) {
  try {
    await skillEngineStore.acceptMentorship(requestId)
    snackbar.message = 'Mentorship accepted!'
    snackbar.color = 'success'
    snackbar.show = true
  } catch (err) {
    snackbar.message = 'Failed to accept request'
    snackbar.color = 'error'
    snackbar.show = true
  }
}

async function handleDeclineRequest(requestId: string) {
  try {
    await skillEngineStore.declineMentorship(requestId)
    snackbar.message = 'Request declined'
    snackbar.color = 'info'
    snackbar.show = true
  } catch (err) {
    snackbar.message = 'Failed to decline request'
    snackbar.color = 'error'
    snackbar.show = true
  }
}

// Initialize
onMounted(async () => {
  // Initialize if not already done
  if (skillEngineStore.mySkills.length === 0) {
    await skillEngineStore.initialize()
  } else {
    // Just refresh mentorship data
    await skillEngineStore.fetchMentorshipRequests()
  }
})
</script>

<style scoped>
.mentorship-hub {
  max-width: 1400px;
}
</style>
