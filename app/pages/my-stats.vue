<template>
  <div class="my-stats">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap gap-4">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">{{ firstName }}'s Stats</h1>
        <p class="text-body-2 text-grey">
          Track your skills, find mentors, and earn achievements
        </p>
      </div>
      <div class="d-flex gap-2">
        <v-btn
          color="primary"
          variant="tonal"
          prepend-icon="mdi-plus"
          @click="showAddSkillDialog = true"
        >
          Add Skill
        </v-btn>
      </div>
    </div>

    <!-- Skeleton Loading State (Never show spinners!) -->
    <div v-if="isLoading">
      <v-row>
        <!-- Left Column Skeleton -->
        <v-col cols="12" lg="5">
          <!-- Radar Chart Skeleton -->
          <v-card variant="outlined" class="mb-4">
            <v-card-title>
              <div class="skeleton-pulse" style="width: 120px; height: 24px; border-radius: 4px;"></div>
            </v-card-title>
            <v-card-text class="d-flex justify-center">
              <div class="skeleton-pulse" style="width: 280px; height: 280px; border-radius: 50%;"></div>
            </v-card-text>
          </v-card>

          <!-- Level Skeleton -->
          <v-card variant="outlined" class="mb-4">
            <v-card-title>
              <div class="skeleton-pulse" style="width: 150px; height: 24px; border-radius: 4px;"></div>
            </v-card-title>
            <v-card-text>
              <div class="skeleton-pulse mb-3" style="width: 100%; height: 60px; border-radius: 8px;"></div>
              <div class="skeleton-pulse" style="width: 100%; height: 12px; border-radius: 6px;"></div>
            </v-card-text>
          </v-card>

          <!-- Trophy Skeleton -->
          <v-card variant="outlined">
            <v-card-title>
              <div class="skeleton-pulse" style="width: 100px; height: 24px; border-radius: 4px;"></div>
            </v-card-title>
            <v-card-text>
              <div class="d-flex gap-2">
                <div v-for="i in 6" :key="i" class="skeleton-pulse" style="width: 40px; height: 40px; border-radius: 8px;"></div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Right Column Skeleton -->
        <v-col cols="12" lg="7">
          <v-card variant="outlined" class="mb-4">
            <v-card-title>
              <div class="skeleton-pulse" style="width: 100px; height: 24px; border-radius: 4px;"></div>
            </v-card-title>
            <v-card-text>
              <div v-for="i in 5" :key="i" class="d-flex align-center gap-3 mb-3">
                <div class="skeleton-pulse" style="width: 40px; height: 40px; border-radius: 8px;"></div>
                <div class="flex-grow-1">
                  <div class="skeleton-pulse mb-1" style="width: 60%; height: 16px; border-radius: 4px;"></div>
                  <div class="skeleton-pulse" style="width: 100%; height: 8px; border-radius: 4px;"></div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <template v-else>
      <!-- Main Layout -->
      <v-row>
        <!-- Left Column: Visuals -->
        <v-col cols="12" lg="5">
          <!-- Radar Chart Card -->
          <v-card variant="outlined" class="mb-4">
            <v-card-title class="d-flex align-center">
              <v-icon color="primary" class="mr-2">mdi-hexagon-multiple</v-icon>
              Skill Balance
            </v-card-title>
            <v-card-text>
              <SkillSkillHexagon
                v-if="radarData.length > 0"
                :categories="radarData"
                :size="280"
              />
              <div v-else class="text-center py-8">
                <v-icon size="64" color="grey-lighten-2">mdi-hexagon-outline</v-icon>
                <p class="text-body-2 text-grey mt-3">
                  Add skills to see your skill balance chart
                </p>
              </div>
            </v-card-text>
          </v-card>

          <!-- Level & XP Card -->
          <v-card variant="outlined" class="mb-4">
            <v-card-title class="d-flex align-center">
              <v-icon color="amber" class="mr-2">mdi-star-circle</v-icon>
              Level & Experience
            </v-card-title>
            <v-card-text>
              <SkillLevelProgress
                :current-level="currentLevel"
                :total-x-p="totalXP"
                :xp-progress="xpProgress"
                :xp-to-next-level="xpToNextLevel"
              />
            </v-card-text>
          </v-card>

          <!-- Trophy Case Card -->
          <v-card variant="outlined">
            <v-card-title class="d-flex align-center justify-space-between">
              <div>
                <v-icon color="amber-darken-2" class="mr-2">mdi-trophy</v-icon>
                Trophy Case
              </div>
              <v-btn 
                variant="text" 
                size="small" 
                color="primary"
                @click="showTrophyDialog = true"
              >
                View All
              </v-btn>
            </v-card-title>
            <v-card-text>
              <!-- Mini Trophy Preview -->
              <div class="trophy-preview d-flex gap-2 flex-wrap">
                <div
                  v-for="achievement in achievements.filter(a => a.is_unlocked).slice(0, 6)"
                  :key="achievement.id"
                  class="trophy-mini"
                  :title="achievement.name"
                >
                  <v-icon size="24" color="amber">
                    {{ getCategoryIcon(achievement.category) }}
                  </v-icon>
                </div>
                <div v-if="unlockedCount === 0" class="text-center w-100 py-4">
                  <p class="text-caption text-grey">No achievements yet</p>
                </div>
              </div>
              <div class="text-caption text-grey mt-3">
                {{ unlockedCount }} of {{ achievements.length }} unlocked
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Right Column: Skill Management & Mentorship -->
        <v-col cols="12" lg="7">
          <!-- Skill Categories Accordion -->
          <v-card variant="outlined" class="mb-4">
            <v-card-title class="d-flex align-center justify-space-between">
              <div>
                <v-icon color="success" class="mr-2">mdi-format-list-bulleted</v-icon>
                My Skills
              </div>
              <v-chip size="small" color="primary" variant="tonal">
                {{ mySkills.length }} total
              </v-chip>
            </v-card-title>
            <v-card-text class="pa-0">
              <v-expansion-panels variant="accordion">
                <v-expansion-panel
                  v-for="category in skillCategories"
                  :key="category.name"
                >
                  <v-expansion-panel-title>
                    <div class="d-flex align-center justify-space-between w-100 pr-4">
                      <span class="font-weight-medium">{{ category.name }}</span>
                      <div class="d-flex align-center gap-2">
                        <v-chip size="x-small" variant="outlined">
                          {{ category.skills.length }} skills
                        </v-chip>
                        <v-chip size="x-small" :color="getLevelColor(category.avgLevel)" variant="flat">
                          Avg: {{ category.avgLevel.toFixed(1) }}
                        </v-chip>
                      </div>
                    </div>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <v-list density="compact" class="bg-transparent">
                      <v-list-item
                        v-for="skill in category.skills"
                        :key="skill.id"
                        class="skill-item px-0"
                      >
                        <template #prepend>
                          <v-icon 
                            :color="getLevelColor(skill.level)" 
                            size="20"
                          >
                            {{ skill.level >= 4 ? 'mdi-star' : 'mdi-circle-outline' }}
                          </v-icon>
                        </template>
                        
                        <v-list-item-title>{{ skill.name }}</v-list-item-title>
                        
                        <template #append>
                          <div class="d-flex align-center gap-2">
                            <!-- Skill Level Rating -->
                            <SkillSkillRating
                              :level="skill.level"
                              :max="5"
                              size="small"
                              readonly
                            />
                            
                            <!-- Goal Toggle -->
                            <v-btn
                              :icon="skill.is_goal ? 'mdi-target' : 'mdi-target-variant'"
                              :color="skill.is_goal ? 'warning' : 'grey'"
                              size="x-small"
                              variant="text"
                              @click="toggleGoal(skill)"
                              title="Toggle learning goal"
                            />
                          </div>
                        </template>
                      </v-list-item>
                    </v-list>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
              
              <div v-if="skillCategories.length === 0" class="text-center py-8">
                <v-icon size="48" color="grey-lighten-2">mdi-star-outline</v-icon>
                <p class="text-body-2 text-grey mt-3">
                  No skills added yet. Start building your profile!
                </p>
              </div>
            </v-card-text>
          </v-card>

          <!-- Mentorship Exchange Card -->
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
      </v-row>
    </template>

    <!-- Add Skill Dialog -->
    <v-dialog v-model="showAddSkillDialog" max-width="500">
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>Add Skill to Profile</span>
          <v-btn icon="mdi-close" variant="text" size="small" @click="showAddSkillDialog = false" />
        </v-card-title>
        <v-divider />
        <v-card-text>
          <v-autocomplete
            v-model="selectedSkillToAdd"
            :items="availableSkills"
            item-title="name"
            item-value="id"
            label="Select a Skill"
            variant="outlined"
            density="comfortable"
            :loading="isLoadingSkillLibrary"
            clearable
            class="mb-4"
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props">
                <template #subtitle>
                  {{ item.raw.category }}
                </template>
              </v-list-item>
            </template>
          </v-autocomplete>

          <div v-if="selectedSkillToAdd">
            <p class="text-subtitle-2 mb-2">Your Current Level (self-assessment)</p>
            <p class="text-caption text-grey mb-3">
              You can rate yourself up to level 3. Higher levels require manager endorsement.
            </p>
            <v-slider
              v-model="newSkillLevel"
              :min="0"
              :max="3"
              :step="1"
              :ticks="{ 0: 'None', 1: 'Learning', 2: 'Developing', 3: 'Competent' }"
              show-ticks="always"
              tick-size="4"
              color="primary"
              class="mb-4"
            />
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showAddSkillDialog = false">Cancel</v-btn>
          <v-btn 
            color="primary" 
            variant="elevated"
            :disabled="!selectedSkillToAdd"
            :loading="isSavingSkill"
            @click="addSkillToProfile"
          >
            Add Skill
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Full Trophy Case Dialog -->
    <v-dialog v-model="showTrophyDialog" max-width="600" scrollable>
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>All Achievements</span>
          <v-btn icon="mdi-close" variant="text" size="small" @click="showTrophyDialog = false" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-0">
          <SkillTrophyCase
            :achievements="achievements"
            :unlocked-count="unlockedCount"
          />
        </v-card-text>
      </v-card>
    </v-dialog>

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

// Personalization
const firstName = computed(() => authStore.profile?.first_name || 'My')

// State
const showAddSkillDialog = ref(false)
const showTrophyDialog = ref(false)
const selectedSkillToAdd = ref<string | null>(null)
const newSkillLevel = ref(1)
const isSavingSkill = ref(false)
const isLoadingSkillLibrary = ref(false)
const mentorshipMatcherRef = ref()

const snackbar = reactive({
  show: false,
  message: '',
  color: 'success'
})

// Computed from store
const isLoading = computed(() => skillEngineStore.isLoading)
const isLoadingMentors = computed(() => skillEngineStore.isLoadingMentors)
const mySkills = computed(() => skillEngineStore.mySkills)
const skillCategories = computed(() => skillEngineStore.skillCategories)
const radarData = computed(() => skillEngineStore.radarData)
const myGoalSkills = computed(() => skillEngineStore.myGoalSkills)

const totalXP = computed(() => skillEngineStore.totalXP)
const currentLevel = computed(() => skillEngineStore.currentLevel)
const xpProgress = computed(() => skillEngineStore.xpProgress)
const xpToNextLevel = computed(() => skillEngineStore.xpToNextLevel)

const achievements = computed(() => skillEngineStore.achievements)
const unlockedCount = computed(() => skillEngineStore.unlockedCount)

const incomingRequests = computed(() => skillEngineStore.incomingRequests)
const outgoingRequests = computed(() => skillEngineStore.outgoingRequests)
const activeMentorships = computed(() => skillEngineStore.activeMentorships)

const skillLibrary = computed(() => skillEngineStore.skillLibrary)

// Available skills (not already in user's profile)
const availableSkills = computed(() => {
  const mySkillIds = new Set(mySkills.value.map(s => s.skill_id))
  return skillLibrary.value.filter(s => !mySkillIds.has(s.id))
})

// Current employee ID for mentorship matching
const currentEmployeeId = computed(() => authStore.user?.id || '')

// Methods
function getLevelColor(level: number): string {
  if (level >= 4) return 'success'
  if (level >= 2) return 'info'
  return 'warning'
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    skills: 'mdi-star-circle',
    training: 'mdi-school',
    attendance: 'mdi-calendar-check',
    performance: 'mdi-chart-line',
    tenure: 'mdi-clock-outline',
    special: 'mdi-trophy'
  }
  return icons[category] || 'mdi-medal'
}

async function toggleGoal(skill: { id: string; skill_id: string; is_goal: boolean }) {
  try {
    await skillEngineStore.toggleSkillGoal(skill.skill_id, skill.id)
    snackbar.message = skill.is_goal 
      ? 'Skill removed from learning goals' 
      : 'Skill added to learning goals'
    snackbar.color = 'success'
    snackbar.show = true
  } catch (err) {
    snackbar.message = 'Failed to update goal'
    snackbar.color = 'error'
    snackbar.show = true
  }
}

async function addSkillToProfile() {
  if (!selectedSkillToAdd.value) return

  isSavingSkill.value = true
  try {
    await skillEngineStore.selfRateSkill(selectedSkillToAdd.value, newSkillLevel.value)
    showAddSkillDialog.value = false
    selectedSkillToAdd.value = null
    newSkillLevel.value = 1
    snackbar.message = 'Skill added to your profile!'
    snackbar.color = 'success'
    snackbar.show = true
  } catch (err) {
    snackbar.message = 'Failed to add skill'
    snackbar.color = 'error'
    snackbar.show = true
  } finally {
    isSavingSkill.value = false
  }
}

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

// Initialize on mount
onMounted(async () => {
  await skillEngineStore.initialize()
})
</script>

<style scoped>
.my-stats {
  max-width: 1400px;
}

.trophy-preview {
  min-height: 48px;
}

.trophy-mini {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(var(--v-theme-warning), 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.trophy-mini:hover {
  transform: scale(1.1);
}

.skill-item {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}

.skill-item:last-child {
  border-bottom: none;
}

.w-100 {
  width: 100%;
}

/* Skeleton Loading Animation */
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
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.v-theme--dark .skeleton-pulse {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 100%
  );
  background-size: 200% 100%;
}
</style>
