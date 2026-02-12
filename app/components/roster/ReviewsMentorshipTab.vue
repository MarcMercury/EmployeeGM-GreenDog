<template>
  <div>
    <!-- Sub-tabs for Reviews and Mentorship -->
    <v-tabs v-model="subTab" color="primary" class="mb-4">
      <v-tab value="reviews">
        <v-icon start size="18">mdi-clipboard-check</v-icon>
        My Reviews
        <v-badge v-if="pendingReviewsCount > 0" :content="pendingReviewsCount" color="warning" inline class="ml-2" />
      </v-tab>
      <v-tab v-if="hasDirectReports || isAdmin" value="team-reviews">
        Team Reviews
        <v-badge v-if="pendingTeamReviewsCount > 0" :content="pendingTeamReviewsCount" color="error" inline class="ml-2" />
      </v-tab>
      <v-tab value="mentorship">
        <v-icon start size="18">mdi-account-supervisor</v-icon>
        Mentorship
        <v-badge v-if="pendingMentorshipCount > 0" :content="pendingMentorshipCount" color="warning" inline class="ml-2" />
      </v-tab>
    </v-tabs>

    <v-window v-model="subTab">
      <!-- ==================== MY REVIEWS ==================== -->
      <v-window-item value="reviews">
        <!-- Request Review Button (own profile only) -->
        <div v-if="isOwnProfile" class="d-flex justify-end mb-4">
          <v-btn color="primary" prepend-icon="mdi-clipboard-plus" size="small" @click="showRequestReviewDialog = true">
            Request Review
          </v-btn>
        </div>

        <v-card v-if="myReviews.length === 0" class="text-center pa-8 bg-white shadow-sm rounded-xl" elevation="0">
          <v-icon size="64" color="grey-lighten-1">mdi-clipboard-text-outline</v-icon>
          <h3 class="text-h6 mt-4">No Active Reviews</h3>
          <p class="text-body-2 text-grey">
            {{ isOwnProfile ? 'Click "Request Review" above to start a self-assessment.' : 'No reviews available for this employee.' }}
          </p>
        </v-card>

        <v-row v-else>
          <v-col v-for="review in myReviews" :key="review.id" cols="12" md="6">
            <v-card class="review-card bg-white shadow-sm rounded-xl" elevation="0" @click="openReview(review, 'employee')">
              <v-card-title class="d-flex align-center">
                <v-avatar :color="getReviewStageColor(review.current_stage)" size="40" class="mr-3">
                  <v-icon color="white" size="20">{{ getReviewStageIcon(review.current_stage) }}</v-icon>
                </v-avatar>
                <div>
                  <div class="text-subtitle-1">{{ review.cycle?.name || 'Performance Review' }}</div>
                  <div class="text-caption text-grey">{{ getReviewStageLabel(review.current_stage) }}</div>
                </div>
              </v-card-title>
              <v-card-text>
                <v-progress-linear :model-value="getReviewProgress(review)" color="primary" height="8" rounded class="mb-2" />
                <div class="d-flex justify-space-between text-caption">
                  <span>{{ getReviewProgress(review) }}% Complete</span>
                  <span v-if="review.cycle?.due_date">Due {{ formatDate(review.cycle.due_date) }}</span>
                </div>
              </v-card-text>
              <v-card-actions>
                <v-chip :color="getReviewStatusColor(review.status)" size="small" variant="tonal">{{ review.status }}</v-chip>
                <v-spacer />
                <v-btn color="primary" variant="text" append-icon="mdi-chevron-right">
                  {{ review.current_stage === 'self_review' ? 'Continue' : 'View' }}
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- ==================== TEAM REVIEWS ==================== -->
      <v-window-item value="team-reviews">
        <v-card v-if="directReportReviews.length === 0" class="text-center pa-8 bg-white shadow-sm rounded-xl" elevation="0">
          <v-icon size="64" color="grey-lighten-1">mdi-account-group-outline</v-icon>
          <h3 class="text-h6 mt-4">No Team Reviews</h3>
          <p class="text-body-2 text-grey">Your direct reports' reviews will appear here</p>
        </v-card>

        <v-list v-else lines="two" class="bg-transparent">
          <v-list-item
            v-for="review in directReportReviews"
            :key="review.id"
            @click="openReview(review, 'manager')"
            class="review-list-item mb-2 bg-white rounded-xl"
          >
            <template #prepend>
              <v-avatar color="primary" size="48">
                <span class="text-subtitle-2">{{ getInitials(review.employee) }}</span>
              </v-avatar>
            </template>
            <v-list-item-title class="font-weight-medium">{{ getFullName(review.employee) }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ review.employee?.position_title || 'Team Member' }}
              <v-chip :color="getReviewStageColor(review.current_stage)" size="x-small" variant="tonal" class="ml-2">
                {{ getReviewStageLabel(review.current_stage) }}
              </v-chip>
            </v-list-item-subtitle>
            <template #append>
              <div class="d-flex align-center gap-2">
                <v-chip v-if="reviewNeedsAction(review)" color="warning" size="small" variant="elevated">Action Required</v-chip>
                <v-btn icon="mdi-chevron-right" variant="text" size="small" />
              </div>
            </template>
          </v-list-item>
        </v-list>
      </v-window-item>

      <!-- ==================== MENTORSHIP ==================== -->
      <v-window-item value="mentorship">
        <v-row>
          <!-- Find a Mentor (own profile only) -->
          <v-col v-if="isOwnProfile" cols="12" md="6">
            <v-card class="bg-white shadow-sm rounded-xl" elevation="0">
              <v-card-title class="text-subtitle-1 font-weight-bold">
                <v-icon start color="info">mdi-account-search</v-icon>
                Find a Mentor
              </v-card-title>
              <v-card-text>
                <v-select
                  v-model="selectedSkillFilter"
                  :items="skillFilterOptions"
                  label="Filter by skill I want to learn"
                  variant="outlined"
                  density="compact"
                  clearable
                  class="mb-4"
                />
                <div v-if="filteredMentors.length === 0" class="text-center py-6">
                  <v-icon size="40" color="grey-lighten-1">mdi-account-search</v-icon>
                  <p class="text-caption text-grey mt-2">
                    {{ selectedSkillFilter ? 'No mentors found for this skill' : 'Select a skill to find mentors' }}
                  </p>
                </div>
                <v-list v-else density="compact" class="bg-transparent">
                  <v-list-item v-for="mentor in filteredMentors" :key="mentor.id" class="mb-2">
                    <template #prepend>
                      <v-avatar size="36" :color="mentor.avatar_url ? undefined : 'secondary'">
                        <v-img v-if="mentor.avatar_url" :src="mentor.avatar_url" />
                        <span v-else class="text-white text-caption">{{ mentor.initials }}</span>
                      </v-avatar>
                    </template>
                    <v-list-item-title class="text-body-2 font-weight-medium">{{ mentor.full_name }}</v-list-item-title>
                    <v-list-item-subtitle class="text-caption">{{ mentor.position?.title || 'Team Member' }}</v-list-item-subtitle>
                    <template #append>
                      <v-btn
                        size="x-small"
                        color="primary"
                        variant="tonal"
                        :loading="requestingMentor === mentor.id"
                        :disabled="hasRequestedMentor(mentor.id)"
                        @click="requestMentorship(mentor)"
                      >
                        {{ hasRequestedMentor(mentor.id) ? 'Requested' : 'Request' }}
                      </v-btn>
                    </template>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- My Mentorships -->
          <v-col cols="12" :md="isOwnProfile ? 6 : 12">
            <v-card class="bg-white shadow-sm rounded-xl mb-4" elevation="0">
              <v-card-title class="text-subtitle-1 font-weight-bold">
                <v-icon start color="info">mdi-school</v-icon>
                Learning From Others
              </v-card-title>
              <v-card-text>
                <div v-if="learningMentorships.length === 0" class="text-center py-4 bg-grey-lighten-5 rounded-lg">
                  <p class="text-grey mb-0 text-caption">No active mentorships</p>
                </div>
                <v-list v-else density="compact" class="bg-transparent">
                  <v-list-item v-for="rel in learningMentorships" :key="rel.id">
                    <template #prepend>
                      <v-avatar size="32" color="secondary">
                        <span class="text-white text-caption">{{ rel.mentor_initials }}</span>
                      </v-avatar>
                    </template>
                    <v-list-item-title class="text-body-2">{{ rel.mentor_name }}</v-list-item-title>
                    <v-list-item-subtitle class="text-caption">{{ rel.skill_name }}</v-list-item-subtitle>
                    <template #append>
                      <v-chip :color="getMentorshipStatusColor(rel.status)" size="x-small">{{ rel.status }}</v-chip>
                    </template>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>

            <v-card class="bg-white shadow-sm rounded-xl" elevation="0">
              <v-card-title class="text-subtitle-1 font-weight-bold">
                <v-icon start color="success">mdi-teach</v-icon>
                Teaching Others
                <v-badge v-if="pendingTeachingRequests.length > 0" :content="pendingTeachingRequests.length" color="warning" inline class="ml-2" />
              </v-card-title>
              <v-card-text>
                <div v-if="teachingMentorships.length === 0" class="text-center py-4 bg-grey-lighten-5 rounded-lg">
                  <p class="text-grey mb-0 text-caption">No teaching relationships yet</p>
                </div>
                <v-list v-else density="compact" class="bg-transparent">
                  <v-list-item v-for="rel in teachingMentorships" :key="rel.id">
                    <template #prepend>
                      <v-avatar size="32" color="primary">
                        <span class="text-white text-caption">{{ rel.mentee_initials }}</span>
                      </v-avatar>
                    </template>
                    <v-list-item-title class="text-body-2">{{ rel.mentee_name }}</v-list-item-title>
                    <v-list-item-subtitle class="text-caption">Wants to learn: {{ rel.skill_name }}</v-list-item-subtitle>
                    <template #append>
                      <div v-if="rel.status === 'pending'" class="d-flex gap-1">
                        <v-btn size="x-small" color="success" variant="flat" :loading="processingRequest === rel.id" @click="handleMentorshipRequest(rel, 'accept')">
                          Accept
                        </v-btn>
                        <v-btn size="x-small" color="error" variant="outlined" :loading="processingRequest === rel.id" @click="handleMentorshipRequest(rel, 'decline')">
                          Decline
                        </v-btn>
                      </div>
                      <v-chip v-else :color="getMentorshipStatusColor(rel.status)" size="x-small">{{ rel.status }}</v-chip>
                    </template>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>
    </v-window>

    <!-- Review Detail Dialog -->
    <ReviewDetailDialog
      v-model="showReviewDialog"
      :review="selectedReview"
      :view-mode="reviewViewMode"
      @close="closeReview"
      @updated="onReviewUpdated"
    />

    <!-- Request Review Dialog -->
    <v-dialog v-model="showRequestReviewDialog" max-width="700" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start color="primary">mdi-clipboard-plus</v-icon>
          Request Performance Review
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" aria-label="Close" @click="showRequestReviewDialog = false" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6">
          <v-alert type="info" variant="tonal" class="mb-6">
            <strong>Self-Assessment Request</strong><br>
            This will notify your manager that you'd like a performance review.
          </v-alert>

          <div class="mb-6">
            <div class="text-subtitle-2 font-weight-bold mb-2">Topics You'd Like to Discuss</div>
            <v-combobox
              v-model="reviewRequest.topics"
              :items="reviewTopicSuggestions"
              label="Select or type topics"
              multiple chips closable-chips
              variant="outlined" density="comfortable"
              hint="Select from suggestions or type your own"
              persistent-hint
            />
          </div>

          <div class="mb-6">
            <div class="text-subtitle-2 font-weight-bold mb-2">Skill Categories to Review</div>
            <v-select
              v-model="reviewRequest.skillCategories"
              :items="skillCategoryOptions"
              label="Select skill categories"
              multiple chips closable-chips
              variant="outlined" density="comfortable"
            />
          </div>

          <div class="mb-6">
            <div class="text-subtitle-2 font-weight-bold mb-2">Specific Skills (Optional)</div>
            <v-text-field v-model="reviewRequest.specificSkills" label="Enter specific skills" variant="outlined" density="comfortable" />
          </div>

          <div class="mb-4">
            <div class="text-subtitle-2 font-weight-bold mb-2">Additional Notes (Optional)</div>
            <v-textarea v-model="reviewRequest.notes" label="Additional context..." variant="outlined" rows="3" counter="500" maxlength="500" />
          </div>

          <div>
            <div class="text-subtitle-2 font-weight-bold mb-2">Preferred Due Date (Optional)</div>
            <v-text-field v-model="reviewRequest.dueDate" type="date" variant="outlined" density="comfortable" :min="minReviewDate" />
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-btn variant="text" @click="showRequestReviewDialog = false">Cancel</v-btn>
          <v-spacer />
          <v-btn
            color="primary" variant="flat"
            :loading="submittingReviewRequest"
            :disabled="reviewRequest.topics.length === 0"
            @click="submitReviewRequest"
          >
            <v-icon start>mdi-send</v-icon>
            Submit Request
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color">{{ snackbar.message }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import ReviewDetailDialog from '~/components/performance/ReviewDetailDialog.vue'

const props = defineProps<{
  employeeId: string
  isOwnProfile: boolean
  isAdmin: boolean
  mentorships: any[]
  skills: any[]
}>()

const client = useSupabaseClient()
const authStore = useAuthStore()
const performanceStore = usePerformanceStore()
const { employees } = useAppData()

// State
const subTab = ref('reviews')
const showReviewDialog = ref(false)
const selectedReview = ref<any>(null)
const reviewViewMode = ref<'employee' | 'manager'>('employee')
const showRequestReviewDialog = ref(false)
const submittingReviewRequest = ref(false)
const selectedSkillFilter = ref<string | null>(null)
const requestingMentor = ref<string | null>(null)
const processingRequest = ref<string | null>(null)
const mentorshipRequests = ref<any[]>([])
const currentEmployee = ref<any>(null)

const reviewRequest = reactive({
  topics: [] as string[],
  skillCategories: [] as string[],
  specificSkills: '',
  notes: '',
  dueDate: ''
})

const snackbar = reactive({ show: false, message: '', color: 'success' })

const reviewTopicSuggestions = [
  'Career Growth & Development', 'Role & Responsibilities', 'Work-Life Balance',
  'Training & Education Needs', 'Team Collaboration', 'Communication Skills',
  'Technical Skills Assessment', 'Goal Setting & Alignment', 'Compensation Discussion',
  'Promotion Readiness', 'Project Feedback', 'Manager Support & Feedback'
]

const skillCategoryOptions = [
  'Clinical', 'Surgical', 'Anesthesia', 'Dentistry', 'Pharmacy', 'Emergency',
  'Imaging', 'Animal Care', 'Nutrition', 'Client Services', 'Administrative',
  'Safety & Compliance', 'Specialized', 'Species Expertise'
]

const minReviewDate = computed(() => new Date().toISOString().split('T')[0])

// Computed - Reviews
const myReviews = computed(() => performanceStore.myReviews)
const directReportReviews = computed(() => performanceStore.directReportReviews)
const hasDirectReports = computed(() => directReportReviews.value.length > 0)
const pendingReviewsCount = computed(() =>
  myReviews.value.filter(r => r.status === 'in_progress' || r.current_stage === 'self_review').length
)
const pendingTeamReviewsCount = computed(() =>
  directReportReviews.value.filter(r => r.current_stage === 'manager_review').length
)

// Computed - Mentorship  
const skillFilterOptions = computed(() => {
  // Show skills where the employee has low rating — suggest finding mentors
  return props.skills
    .filter(s => (s.level || 0) < 4)
    .map(s => ({
      title: `${s.skill?.name || 'Unknown'} (Current: ${s.level || 0}/5)`,
      value: s.skill?.id || s.skill_id
    }))
})

const filteredMentors = computed(() => {
  if (!selectedSkillFilter.value) return []
  const skillId = selectedSkillFilter.value
  return employees.value
    .filter(emp => emp.id !== props.employeeId)
    .map(emp => {
      const teachableSkills = (emp.skills || []).filter((s: any) => (s.level || s.rating || 0) >= 4)
      const matchingSkill = teachableSkills.find((s: any) => (s.skill_id || s.skill?.id) === skillId)
      return {
        ...emp,
        initials: `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`,
        full_name: `${emp.first_name} ${emp.last_name}`,
        teachable_skills: teachableSkills,
        matchingSkill
      }
    })
    .filter(emp => emp.matchingSkill)
})

const pendingMentorshipCount = computed(() =>
  mentorshipRequests.value.filter(r => r.status === 'pending' && r.mentor_id === currentEmployee.value?.id).length
)

const learningMentorships = computed(() =>
  mentorshipRequests.value
    .filter(r => r.mentee_id === currentEmployee.value?.id)
    .map(r => ({
      ...r,
      mentor_name: r.mentor ? `${r.mentor.first_name} ${r.mentor.last_name}` : 'Unknown',
      mentor_initials: `${r.mentor?.first_name?.[0] || ''}${r.mentor?.last_name?.[0] || ''}`,
      skill_name: r.skill?.name || 'Unknown Skill'
    }))
)

const teachingMentorships = computed(() =>
  mentorshipRequests.value
    .filter(r => r.mentor_id === currentEmployee.value?.id)
    .map(r => ({
      ...r,
      mentee_name: r.mentee ? `${r.mentee.first_name} ${r.mentee.last_name}` : 'Unknown',
      mentee_initials: `${r.mentee?.first_name?.[0] || ''}${r.mentee?.last_name?.[0] || ''}`,
      skill_name: r.skill?.name || 'Unknown Skill'
    }))
)

const pendingTeachingRequests = computed(() => teachingMentorships.value.filter(r => r.status === 'pending'))

// Methods
function showNotification(message: string, color = 'success') {
  snackbar.message = message
  snackbar.color = color
  snackbar.show = true
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getReviewStageColor(stage: string | null): string {
  const colors: Record<string, string> = { self_review: 'info', manager_review: 'warning', calibration: 'purple', delivery: 'success', acknowledged: 'grey' }
  return colors[stage || ''] || 'grey'
}

function getReviewStageIcon(stage: string | null): string {
  const icons: Record<string, string> = { self_review: 'mdi-account-edit', manager_review: 'mdi-clipboard-check', calibration: 'mdi-scale-balance', delivery: 'mdi-send', acknowledged: 'mdi-check-all' }
  return icons[stage || ''] || 'mdi-file-document'
}

function getReviewStageLabel(stage: string | null): string {
  const labels: Record<string, string> = { self_review: 'Self Review', manager_review: 'Manager Review', calibration: 'Calibration', delivery: 'Pending Acknowledgment', acknowledged: 'Completed' }
  return labels[stage || ''] || 'Draft'
}

function getReviewStatusColor(status: string): string {
  const colors: Record<string, string> = { in_progress: 'info', submitted: 'success', completed: 'grey' }
  return colors[status] || 'grey'
}

function getReviewProgress(review: any): number {
  const progress: Record<string, number> = { self_review: 20, manager_review: 50, calibration: 70, delivery: 90, acknowledged: 100 }
  return progress[review.current_stage] || 0
}

function reviewNeedsAction(review: any): boolean {
  return review.current_stage === 'manager_review'
}

function getInitials(employee: any): string {
  if (!employee) return '?'
  return `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`
}

function getFullName(employee: any): string {
  if (!employee) return 'Unknown'
  return `${employee.first_name} ${employee.last_name}`
}

function getMentorshipStatusColor(status: string): string {
  const colors: Record<string, string> = { pending: 'warning', active: 'success', completed: 'info', declined: 'error' }
  return colors[status] || 'grey'
}

function openReview(review: any, mode: 'employee' | 'manager') {
  selectedReview.value = review
  reviewViewMode.value = mode
  showReviewDialog.value = true
}

function closeReview() {
  showReviewDialog.value = false
  selectedReview.value = null
}

function onReviewUpdated() {
  performanceStore.fetchMyReviews()
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

async function submitReviewRequest() {
  if (reviewRequest.topics.length === 0) {
    showNotification('Please select at least one topic', 'error')
    return
  }
  submittingReviewRequest.value = true
  try {
    const { error } = await client
      .from('review_requests')
      .insert({
        employee_id: props.employeeId,
        request_type: 'self_initiated',
        topics: reviewRequest.topics,
        skill_categories: reviewRequest.skillCategories.length > 0 ? reviewRequest.skillCategories : null,
        notes: [reviewRequest.notes, reviewRequest.specificSkills ? `Specific skills: ${reviewRequest.specificSkills}` : ''].filter(Boolean).join('\n') || null,
        due_date: reviewRequest.dueDate || null,
        status: 'pending'
      })
    if (error) throw error
    reviewRequest.topics = []
    reviewRequest.skillCategories = []
    reviewRequest.specificSkills = ''
    reviewRequest.notes = ''
    reviewRequest.dueDate = ''
    showRequestReviewDialog.value = false
    showNotification('Review request submitted! Your manager will be notified.')
  } catch (err: any) {
    console.error('Error submitting review request:', err)
    showNotification(err.message || 'Failed to submit review request', 'error')
  } finally {
    submittingReviewRequest.value = false
  }
}

async function fetchCurrentEmployee() {
  try {
    const profileId = authStore.profile?.id
    if (!profileId) return
    const { data: employee } = await client
      .from('employees')
      .select('id, first_name, last_name, preferred_name, position:job_positions(id, title)')
      .eq('profile_id', profileId)
      .single()
    if (employee) {
      currentEmployee.value = employee
    }
  } catch (err) {
    console.error('Error fetching current employee:', err)
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
        skill:skill_library(id, name)
      `)
      .or(`mentee_id.eq.${currentEmployee.value.id},mentor_id.eq.${currentEmployee.value.id}`)
    mentorshipRequests.value = data || []
  } catch (err) {
    console.error('Error fetching mentorship requests:', err)
  }
}

// Lifecycle
onMounted(async () => {
  await fetchCurrentEmployee()
  await Promise.all([
    fetchMentorshipRequests(),
    performanceStore.fetchMyReviews()
  ])
})
</script>

<style scoped>
.review-card {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
.review-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
.review-list-item {
  cursor: pointer;
  transition: background-color 0.2s;
}
.review-list-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
}
</style>
