<template>
  <div class="growth-page">
    <!-- Page Header -->
    <div class="mb-6">
      <h1 class="text-h4 font-weight-bold mb-1">My Growth</h1>
      <p class="text-body-2 text-grey-darken-1">Track your skills, find mentors, and level up</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="d-flex justify-center align-center" style="min-height: 50vh;">
      <v-progress-circular indeterminate color="primary" size="64" />
    </div>

    <template v-else>
      <!-- 2-Column Layout -->
      <v-row>
        <!-- Column 1: The Mirror (Stats & Skills) - 40% -->
        <v-col cols="12" md="5">
          <!-- Player Card Header -->
          <v-card rounded="lg" class="mb-4 player-card">
            <div class="player-card-header pa-4 text-center">
              <v-avatar size="80" :color="currentEmployee?.avatar_url ? undefined : 'primary'" class="mb-3 elevation-4">
                <v-img v-if="currentEmployee?.avatar_url" :src="currentEmployee.avatar_url" />
                <span v-else class="text-h4 text-white font-weight-bold">{{ currentEmployee?.initials || '?' }}</span>
              </v-avatar>
              <h2 class="text-h6 font-weight-bold mb-1">{{ currentEmployee?.full_name || 'Employee' }}</h2>
              <p class="text-body-2 text-grey mb-3">{{ currentEmployee?.position?.title || 'Team Member' }}</p>
              
              <!-- XP Progress Bar -->
              <div class="xp-bar-container mx-auto" style="max-width: 250px;">
                <div class="d-flex justify-space-between text-caption mb-1">
                  <span>Level {{ currentLevel }}</span>
                  <span>{{ totalPoints }} / {{ nextLevelPoints }} XP</span>
                </div>
                <v-progress-linear
                  :model-value="levelProgress"
                  color="primary"
                  height="8"
                  rounded
                />
                <p class="text-caption text-grey mt-1">{{ pointsToNextLevel }} XP to Level {{ currentLevel + 1 }}</p>
              </div>
            </div>
          </v-card>

          <!-- Skill Hexagon (Radar Chart) -->
          <v-card rounded="lg" class="mb-4">
            <v-card-title class="text-subtitle-1 font-weight-bold pb-0">
              <v-icon start color="primary">mdi-radar</v-icon>
              Skill Hexagon
            </v-card-title>
            <v-card-text>
              <ClientOnly>
                <SkillHexagon 
                  v-if="skillCategories.length > 0"
                  :categories="skillCategories" 
                  :size="300"
                />
                <div v-else class="text-center py-8">
                  <v-icon size="48" color="grey-lighten-1">mdi-chart-radar</v-icon>
                  <p class="text-grey mt-2">No skills recorded yet</p>
                  <v-btn color="primary" variant="tonal" size="small" class="mt-2" to="/skills">
                    Add Skills
                  </v-btn>
                </div>
              </ClientOnly>
            </v-card-text>
          </v-card>

          <!-- Skill Gaps (To-Do List) -->
          <v-card rounded="lg">
            <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center">
              <v-icon start color="warning">mdi-target</v-icon>
              Skill Gaps
              <v-spacer />
              <v-chip size="x-small" color="warning" variant="tonal">{{ skillGaps.length }} areas</v-chip>
            </v-card-title>
            <v-divider />
            <v-list v-if="skillGaps.length > 0" density="compact" class="pa-0">
              <v-list-item 
                v-for="gap in skillGaps" 
                :key="gap.id"
                :class="{ 'bg-primary-lighten-5': selectedGap?.id === gap.id }"
                @click="selectGap(gap)"
              >
                <template #prepend>
                  <v-icon size="20" :color="gap.is_goal ? 'success' : 'warning'">
                    {{ gap.is_goal ? 'mdi-flag' : 'mdi-arrow-up-bold' }}
                  </v-icon>
                </template>
                <v-list-item-title class="text-body-2">{{ gap.skill_name }}</v-list-item-title>
                <v-list-item-subtitle>
                  <div class="d-flex align-center gap-1">
                    <v-rating
                      :model-value="gap.rating"
                      readonly
                      density="compact"
                      size="12"
                      color="amber"
                      active-color="amber"
                    />
                    <span class="text-caption">({{ gap.rating }}/5)</span>
                  </div>
                </v-list-item-subtitle>
                <template #append>
                  <v-btn 
                    size="x-small" 
                    variant="tonal" 
                    color="primary"
                    @click.stop="findMentorForSkill(gap)"
                  >
                    Find Mentor
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>
            <div v-else class="text-center py-8">
              <v-icon size="48" color="success">mdi-check-circle</v-icon>
              <p class="text-grey mt-2">All skills are looking great!</p>
            </div>
          </v-card>
        </v-col>

        <!-- Column 2: The Network (Mentorship Hub) - 60% -->
        <v-col cols="12" md="7">
          <v-card rounded="lg">
            <v-tabs v-model="mentorshipTab" color="primary" grow>
              <v-tab value="find">
                <v-icon start size="18">mdi-account-search</v-icon>
                Find a Mentor
              </v-tab>
              <v-tab value="active">
                <v-icon start size="18">mdi-account-group</v-icon>
                My Mentorships
                <v-badge 
                  v-if="pendingRequests > 0" 
                  :content="pendingRequests" 
                  color="warning" 
                  inline 
                  class="ml-2"
                />
              </v-tab>
            </v-tabs>

            <v-window v-model="mentorshipTab">
              <!-- Find a Mentor Tab -->
              <v-window-item value="find">
                <div class="pa-4">
                  <!-- Filter by skill gap -->
                  <v-select
                    v-model="selectedSkillFilter"
                    :items="skillFilterOptions"
                    label="Filter by skill I want to learn"
                    variant="outlined"
                    density="compact"
                    clearable
                    class="mb-4"
                  />

                  <!-- Mentor Cards -->
                  <div v-if="filteredMentors.length === 0" class="text-center py-8">
                    <v-icon size="48" color="grey-lighten-1">mdi-account-search</v-icon>
                    <p class="text-grey mt-2">
                      {{ selectedSkillFilter ? 'No mentors found for this skill' : 'Select a skill to find mentors' }}
                    </p>
                  </div>

                  <v-row v-else>
                    <v-col 
                      v-for="mentor in filteredMentors" 
                      :key="mentor.id"
                      cols="12"
                      sm="6"
                    >
                      <v-card variant="outlined" rounded="lg" class="mentor-card">
                        <v-card-text class="text-center pb-2">
                          <v-avatar size="56" :color="mentor.avatar_url ? undefined : 'secondary'" class="mb-2">
                            <v-img v-if="mentor.avatar_url" :src="mentor.avatar_url" />
                            <span v-else class="text-white font-weight-bold">{{ mentor.initials }}</span>
                          </v-avatar>
                          <h4 class="text-subtitle-2 font-weight-bold">{{ mentor.full_name }}</h4>
                          <p class="text-caption text-grey mb-2">{{ mentor.position?.title || 'Team Member' }}</p>
                          
                          <!-- Skills they can teach -->
                          <div class="d-flex flex-wrap gap-1 justify-center mb-2">
                            <v-chip 
                              v-for="skill in mentor.teachable_skills.slice(0, 3)" 
                              :key="skill.skill_id"
                              size="x-small"
                              color="success"
                              variant="tonal"
                            >
                              {{ skill.skill_name }} ({{ skill.rating }})
                            </v-chip>
                          </div>
                        </v-card-text>
                        <v-card-actions class="pa-3 pt-0">
                          <v-btn 
                            block 
                            color="primary" 
                            variant="tonal"
                            size="small"
                            :loading="requestingMentor === mentor.id"
                            :disabled="hasRequestedMentor(mentor.id)"
                            @click="requestMentorship(mentor)"
                          >
                            <v-icon start size="16">mdi-account-plus</v-icon>
                            {{ hasRequestedMentor(mentor.id) ? 'Requested' : 'Request Mentorship' }}
                          </v-btn>
                        </v-card-actions>
                      </v-card>
                    </v-col>
                  </v-row>
                </div>
              </v-window-item>

              <!-- My Mentorships Tab -->
              <v-window-item value="active">
                <div class="pa-4">
                  <!-- Learning (I am the Mentee) -->
                  <h4 class="text-subtitle-2 font-weight-bold mb-3 d-flex align-center">
                    <v-icon start color="info">mdi-school</v-icon>
                    Learning From Others
                  </h4>
                  
                  <div v-if="learningMentorships.length === 0" class="text-center py-4 mb-4 bg-grey-lighten-5 rounded-lg">
                    <p class="text-grey mb-0">No active mentorships. Find a mentor above!</p>
                  </div>
                  
                  <v-list v-else density="compact" class="mb-4">
                    <v-list-item v-for="rel in learningMentorships" :key="rel.id">
                      <template #prepend>
                        <v-avatar size="36" color="secondary">
                          <span class="text-white text-caption">{{ rel.mentor_initials }}</span>
                        </v-avatar>
                      </template>
                      <v-list-item-title class="text-body-2">{{ rel.mentor_name }}</v-list-item-title>
                      <v-list-item-subtitle>{{ rel.skill_name }}</v-list-item-subtitle>
                      <template #append>
                        <v-chip :color="getMentorshipStatusColor(rel.status)" size="x-small">
                          {{ rel.status }}
                        </v-chip>
                      </template>
                    </v-list-item>
                  </v-list>

                  <v-divider class="my-4" />

                  <!-- Teaching (I am the Mentor) -->
                  <h4 class="text-subtitle-2 font-weight-bold mb-3 d-flex align-center">
                    <v-icon start color="success">mdi-teach</v-icon>
                    Teaching Others
                    <v-badge 
                      v-if="pendingTeachingRequests.length > 0" 
                      :content="pendingTeachingRequests.length" 
                      color="warning" 
                      inline 
                      class="ml-2"
                    />
                  </h4>
                  
                  <div v-if="teachingMentorships.length === 0" class="text-center py-4 bg-grey-lighten-5 rounded-lg">
                    <p class="text-grey mb-0">No teaching relationships yet</p>
                  </div>
                  
                  <v-list v-else density="compact">
                    <v-list-item v-for="rel in teachingMentorships" :key="rel.id">
                      <template #prepend>
                        <v-avatar size="36" color="primary">
                          <span class="text-white text-caption">{{ rel.mentee_initials }}</span>
                        </v-avatar>
                      </template>
                      <v-list-item-title class="text-body-2">{{ rel.mentee_name }}</v-list-item-title>
                      <v-list-item-subtitle>Wants to learn: {{ rel.skill_name }}</v-list-item-subtitle>
                      <template #append>
                        <div v-if="rel.status === 'pending'" class="d-flex gap-1">
                          <v-btn 
                            size="x-small" 
                            color="success" 
                            variant="flat"
                            :loading="processingRequest === rel.id"
                            @click="handleMentorshipRequest(rel, 'accept')"
                          >
                            Accept
                          </v-btn>
                          <v-btn 
                            size="x-small" 
                            color="error" 
                            variant="outlined"
                            :loading="processingRequest === rel.id"
                            @click="handleMentorshipRequest(rel, 'decline')"
                          >
                            Decline
                          </v-btn>
                        </div>
                        <v-chip v-else :color="getMentorshipStatusColor(rel.status)" size="x-small">
                          {{ rel.status }}
                        </v-chip>
                      </template>
                    </v-list-item>
                  </v-list>
                </div>
              </v-window-item>
            </v-window>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import SkillHexagon from '~/components/skill/SkillHexagon.vue'

definePageMeta({
  middleware: ['auth']
})

const client = useSupabaseClient()
const authStore = useAuthStore()
const { employees } = useAppData()

// State
const loading = ref(true)
const currentEmployee = ref<any>(null)
const mySkills = ref<any[]>([])
const allEmployeeSkills = ref<any[]>([])
const mentorshipRequests = ref<any[]>([])
const mentorshipTab = ref('find')
const selectedGap = ref<any>(null)
const selectedSkillFilter = ref<string | null>(null)
const requestingMentor = ref<string | null>(null)
const processingRequest = ref<string | null>(null)

// Points/Level
const totalPoints = ref(0)
const currentLevel = ref(1)

// Snackbar
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

// Computed
const nextLevelPoints = computed(() => currentLevel.value * 100)
const levelProgress = computed(() => (totalPoints.value % 100))
const pointsToNextLevel = computed(() => nextLevelPoints.value - (totalPoints.value % 100))

const skillCategories = computed(() => {
  if (!mySkills.value.length) return []
  
  const categoryMap = new Map<string, { total: number; count: number }>()
  
  mySkills.value.forEach((skill: any) => {
    const cat = skill.category || 'General'
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, { total: 0, count: 0 })
    }
    const current = categoryMap.get(cat)!
    current.total += skill.rating || 0
    current.count++
  })
  
  return Array.from(categoryMap.entries()).map(([name, data]) => ({
    category: name,
    value: data.total / data.count,
    fullMark: 5
  }))
})

const skillGaps = computed(() => {
  return mySkills.value.filter(s => s.is_goal || s.rating < 3)
})

const skillFilterOptions = computed(() => {
  return skillGaps.value.map(s => ({
    title: s.skill_name,
    value: s.skill_id
  }))
})

const filteredMentors = computed(() => {
  if (!selectedSkillFilter.value) return []
  
  const skillId = selectedSkillFilter.value
  const myEmployeeId = currentEmployee.value?.id
  
  // Find employees with high rating (>=4) in this skill
  const mentorCandidates = employees.value
    .filter(emp => emp.id !== myEmployeeId)
    .map(emp => {
      const teachableSkills = (emp.skills || []).filter((s: any) => s.rating >= 4)
      const matchingSkill = teachableSkills.find((s: any) => s.skill_id === skillId)
      
      return {
        ...emp,
        initials: `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`,
        full_name: `${emp.first_name} ${emp.last_name}`,
        teachable_skills: teachableSkills.map((s: any) => ({
          skill_id: s.skill_id,
          skill_name: s.skill?.name || s.skill_name,
          rating: s.rating
        })),
        matchingSkill
      }
    })
    .filter(emp => emp.matchingSkill)
  
  return mentorCandidates
})

const pendingRequests = computed(() => {
  return mentorshipRequests.value.filter(r => 
    r.status === 'pending' && r.mentor_id === currentEmployee.value?.id
  ).length
})

const learningMentorships = computed(() => {
  return mentorshipRequests.value
    .filter(r => r.mentee_id === currentEmployee.value?.id)
    .map(r => ({
      ...r,
      mentor_name: r.mentor?.full_name || 'Unknown',
      mentor_initials: `${r.mentor?.first_name?.[0] || ''}${r.mentor?.last_name?.[0] || ''}`,
      skill_name: r.skill?.name || 'Unknown Skill'
    }))
})

const teachingMentorships = computed(() => {
  return mentorshipRequests.value
    .filter(r => r.mentor_id === currentEmployee.value?.id)
    .map(r => ({
      ...r,
      mentee_name: r.mentee?.full_name || 'Unknown',
      mentee_initials: `${r.mentee?.first_name?.[0] || ''}${r.mentee?.last_name?.[0] || ''}`,
      skill_name: r.skill?.name || 'Unknown Skill'
    }))
})

const pendingTeachingRequests = computed(() => {
  return teachingMentorships.value.filter(r => r.status === 'pending')
})

// Methods
function showNotification(message: string, color = 'success') {
  snackbarText.value = message
  snackbarColor.value = color
  snackbar.value = true
}

function getMentorshipStatusColor(status: string): string {
  switch (status) {
    case 'pending': return 'warning'
    case 'active': return 'success'
    case 'completed': return 'info'
    case 'declined': return 'error'
    default: return 'grey'
  }
}

function selectGap(gap: any) {
  selectedGap.value = gap
  selectedSkillFilter.value = gap.skill_id
  mentorshipTab.value = 'find'
}

function findMentorForSkill(skill: any) {
  selectedSkillFilter.value = skill.skill_id
  mentorshipTab.value = 'find'
}

function hasRequestedMentor(mentorId: string): boolean {
  return mentorshipRequests.value.some(r => 
    r.mentor_id === mentorId && 
    r.mentee_id === currentEmployee.value?.id &&
    r.skill_id === selectedSkillFilter.value
  )
}

async function requestMentorship(mentor: any) {
  if (!selectedSkillFilter.value || !currentEmployee.value) return
  
  requestingMentor.value = mentor.id
  try {
    const { error } = await (client as any)
      .from('mentorship_requests')
      .insert({
        mentee_id: currentEmployee.value.id,
        mentor_id: mentor.id,
        skill_id: selectedSkillFilter.value,
        status: 'pending'
      })
    
    if (error) throw error
    
    showNotification(`Mentorship request sent to ${mentor.full_name}!`)
    await fetchMentorshipRequests()
  } catch (err: any) {
    showNotification(err.message || 'Failed to send request', 'error')
  } finally {
    requestingMentor.value = null
  }
}

async function handleMentorshipRequest(request: any, action: 'accept' | 'decline') {
  processingRequest.value = request.id
  try {
    const newStatus = action === 'accept' ? 'active' : 'declined'
    
    const { error } = await (client as any)
      .from('mentorship_requests')
      .update({ status: newStatus })
      .eq('id', request.id)
    
    if (error) throw error
    
    showNotification(`Request ${action === 'accept' ? 'accepted' : 'declined'}`)
    await fetchMentorshipRequests()
  } catch (err: any) {
    showNotification(err.message || 'Failed to process request', 'error')
  } finally {
    processingRequest.value = null
  }
}

async function fetchCurrentEmployee() {
  try {
    // Get current user's profile
    const profileId = authStore.profile?.id
    if (!profileId) return
    
    // Get employee record using profile id directly
    const { data: employee } = await client
      .from('employees')
      .select(`
        *,
        position:positions(id, title),
        department:departments(id, name)
      `)
      .eq('profile_id', profileId)
      .single()
    
    if (employee) {
      const emp = employee as any
      emp.full_name = `${emp.first_name} ${emp.last_name}`
      emp.initials = `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`
      currentEmployee.value = emp
    }
  } catch (err) {
    console.error('Error fetching current employee:', err)
  }
}

async function fetchMySkills() {
  if (!currentEmployee.value) return
  
  try {
    const { data } = await client
      .from('employee_skills')
      .select(`
        id,
        rating,
        is_goal,
        skill_id,
        skill:skills(id, name, category)
      `)
      .eq('employee_id', currentEmployee.value.id)
    
    mySkills.value = (data || []).map((s: any) => ({
      ...s,
      skill_name: s.skill?.name,
      category: s.skill?.category
    }))
  } catch (err) {
    console.error('Error fetching skills:', err)
  }
}

async function fetchPoints() {
  if (!currentEmployee.value) return
  
  try {
    const { data } = await client
      .from('points_log')
      .select('points')
      .eq('employee_id', currentEmployee.value.id)
    
    totalPoints.value = (data || []).reduce((sum: number, p: any) => sum + (p.points || 0), 0)
    currentLevel.value = Math.floor(totalPoints.value / 100) + 1
  } catch (err) {
    console.error('Error fetching points:', err)
  }
}

async function fetchMentorshipRequests() {
  if (!currentEmployee.value) return
  
  try {
    const { data } = await (client as any)
      .from('mentorship_requests')
      .select(`
        *,
        mentor:employees!mentorship_requests_mentor_id_fkey(id, first_name, last_name),
        mentee:employees!mentorship_requests_mentee_id_fkey(id, first_name, last_name),
        skill:skills(id, name)
      `)
      .or(`mentee_id.eq.${currentEmployee.value.id},mentor_id.eq.${currentEmployee.value.id}`)
    
    mentorshipRequests.value = (data || []).map((r: any) => ({
      ...r,
      mentor: r.mentor ? { ...r.mentor, full_name: `${r.mentor.first_name} ${r.mentor.last_name}` } : null,
      mentee: r.mentee ? { ...r.mentee, full_name: `${r.mentee.first_name} ${r.mentee.last_name}` } : null
    }))
  } catch (err) {
    console.error('Error fetching mentorship requests:', err)
  }
}

// Initialize
onMounted(async () => {
  loading.value = true
  try {
    await fetchCurrentEmployee()
    await Promise.all([
      fetchMySkills(),
      fetchPoints(),
      fetchMentorshipRequests()
    ])
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.growth-page {
  min-height: 100%;
}

.player-card-header {
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.1) 0%, rgba(var(--v-theme-primary), 0.05) 100%);
}

.mentor-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.mentor-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.bg-primary-lighten-5 {
  background-color: rgba(var(--v-theme-primary), 0.05) !important;
}
</style>
