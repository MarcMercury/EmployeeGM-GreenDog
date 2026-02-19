<template>
  <div class="profile-page">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">My Profile</h1>
        <p class="text-body-1 text-grey-darken-1">
          Your personal profile and skill dashboard
        </p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="userStore.isLoading && !userStore.profile" class="d-flex justify-center align-center min-h-400">
      <v-progress-circular indeterminate color="primary" size="64" />
    </div>

    <!-- Error State -->
    <v-alert v-else-if="userStore.error" type="error" class="mb-4">
      {{ userStore.error }}
      <template #append>
        <v-btn variant="text" @click="userStore.fetchUserData()">Retry</v-btn>
      </template>
    </v-alert>

    <!-- Main Content -->
    <template v-else>
      <v-row>
        <!-- Left Column: Profile Card -->
        <v-col cols="12" md="4">
          <v-card class="baseball-card" elevation="4" rounded="lg">
            <!-- Card Header with Avatar -->
            <div class="card-header bg-primary pa-6 text-center">
              <v-avatar size="100" class="avatar-border mb-3">
                <v-img v-if="userStore.profile?.avatar_url" :src="userStore.profile.avatar_url" cover />
                <span v-else class="text-h3 text-primary font-weight-bold bg-white" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                  {{ userStore.initials }}
                </span>
              </v-avatar>
              
              <h2 class="text-h5 text-white font-weight-bold mb-1">
                {{ userStore.fullName }}
              </h2>
              <p class="text-body-1 text-white opacity-80 mb-0">
                {{ userStore.jobTitle }}
              </p>
            </div>

            <!-- Badges Section -->
            <div class="d-flex justify-center flex-wrap gap-2 pa-3 bg-grey-lighten-4">
              <v-chip
                v-if="userStore.departmentName"
                color="primary"
                variant="flat"
                size="small"
                prepend-icon="mdi-hospital-building"
              >
                {{ userStore.departmentName }}
              </v-chip>
              <v-chip
                v-if="userStore.locationName"
                color="secondary"
                variant="flat"
                size="small"
                prepend-icon="mdi-map-marker"
              >
                {{ userStore.locationName }}
              </v-chip>
              <v-chip
                v-if="userStore.isAdmin"
                color="warning"
                variant="flat"
                size="small"
                prepend-icon="mdi-shield-crown"
              >
                Admin
              </v-chip>
            </div>

            <!-- Quick Stats -->
            <v-card-text class="pa-4">
              <v-row dense>
                <v-col cols="4">
                  <div class="text-center">
                    <v-icon color="primary" class="mb-1">mdi-calendar-clock</v-icon>
                    <div class="text-body-1 font-weight-bold">{{ userStore.tenure || 'N/A' }}</div>
                    <div class="text-caption text-grey">Tenure</div>
                  </div>
                </v-col>
                <v-col cols="4">
                  <div class="text-center">
                    <v-icon color="amber" class="mb-1">mdi-star-circle</v-icon>
                    <div class="text-body-1 font-weight-bold">{{ currentLevel }}</div>
                    <div class="text-caption text-grey">Level</div>
                  </div>
                </v-col>
                <v-col cols="4">
                  <div class="text-center">
                    <v-icon color="success" class="mb-1">mdi-lightbulb</v-icon>
                    <div class="text-body-1 font-weight-bold">{{ mySkills.length }}</div>
                    <div class="text-caption text-grey">Skills</div>
                  </div>
                </v-col>
              </v-row>
            </v-card-text>

            <v-divider />

            <!-- Contact Info -->
            <v-list density="compact" class="bg-transparent">
              <v-list-item prepend-icon="mdi-email">
                <v-list-item-subtitle class="text-caption">Email</v-list-item-subtitle>
                <v-list-item-title class="text-body-2">{{ userStore.profile?.email || 'Not set' }}</v-list-item-title>
              </v-list-item>
              <v-list-item prepend-icon="mdi-phone">
                <v-list-item-subtitle class="text-caption">Mobile</v-list-item-subtitle>
                <v-list-item-title class="text-body-2">{{ userStore.employee?.phone_mobile || 'Not set' }}</v-list-item-title>
              </v-list-item>
              <v-list-item prepend-icon="mdi-calendar">
                <v-list-item-subtitle class="text-caption">Start Date</v-list-item-subtitle>
                <v-list-item-title class="text-body-2">{{ formattedHireDate }}</v-list-item-title>
              </v-list-item>
            </v-list>

            <!-- Bio Section -->
            <v-card-text v-if="userStore.profile?.bio" class="pt-0">
              <v-divider class="mb-3" />
              <div class="text-caption text-grey mb-1">About</div>
              <p class="text-body-2 mb-0">{{ userStore.profile.bio }}</p>
            </v-card-text>

            <!-- Edit Button -->
            <v-card-actions class="pa-4 pt-0">
              <v-btn
                color="primary"
                variant="tonal"
                block
                prepend-icon="mdi-pencil"
                @click="openEditDialog"
              >
                Edit Profile
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>

        <!-- Right Column: Skills & Stats -->
        <v-col cols="12" md="8">
          <!-- Level Progress -->
          <v-card rounded="lg" class="mb-4">
            <v-card-title class="d-flex align-center">
              <v-icon color="amber" class="mr-2">mdi-star-circle</v-icon>
              Level & Experience
            </v-card-title>
            <v-card-text>
              <div class="d-flex align-center gap-4 mb-2">
                <v-avatar color="amber" size="64">
                  <span class="text-h4 text-white font-weight-bold">{{ currentLevel }}</span>
                </v-avatar>
                <div class="flex-grow-1">
                  <div class="d-flex justify-space-between mb-1">
                    <span class="text-body-2 font-weight-medium">Level {{ currentLevel }}</span>
                    <span class="text-caption text-grey">{{ totalXP }} XP total</span>
                  </div>
                  <v-progress-linear
                    :model-value="xpProgress"
                    color="amber"
                    height="12"
                    rounded
                  />
                  <div class="text-caption text-grey mt-1">
                    {{ xpToNextLevel }} XP to next level
                  </div>
                </div>
              </div>
            </v-card-text>
          </v-card>

          <!-- My Goals -->
          <v-card rounded="lg" class="mb-4">
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon color="primary" class="mr-2">mdi-target</v-icon>
                My Goals
              </div>
              <v-btn color="primary" variant="text" size="small" @click="showGoalDialog = true">
                <v-icon start size="small">mdi-plus</v-icon>
                Add Goal
              </v-btn>
            </v-card-title>
            <v-card-text>
              <div v-if="goalsLoading" class="d-flex justify-center py-4">
                <v-progress-circular indeterminate color="primary" size="24" />
              </div>
              <div v-else-if="myGoals.length === 0" class="text-center py-6">
                <v-icon size="48" color="grey-lighten-2">mdi-flag-outline</v-icon>
                <p class="text-body-2 text-grey mt-3">No goals set yet</p>
                <v-btn color="primary" variant="tonal" class="mt-2" @click="showGoalDialog = true">
                  Create Your First Goal
                </v-btn>
              </div>
              <v-list v-else density="compact" class="bg-transparent">
                <v-list-item
                  v-for="goal in myGoals"
                  :key="goal.id"
                  class="px-0"
                >
                  <template #prepend>
                    <v-checkbox-btn
                      :model-value="goal.completed"
                      color="success"
                      @update:model-value="toggleGoalComplete(goal)"
                    />
                  </template>
                  <v-list-item-title 
                    class="text-body-2"
                    :class="{ 'text-decoration-line-through text-grey': goal.completed }"
                  >
                    {{ goal.title }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption">
                    <v-chip :color="getGoalCategoryColor(goal.category)" size="x-small" variant="tonal">
                      {{ goal.category }}
                    </v-chip>
                    <span v-if="goal.target_date" class="ml-2 text-grey">
                      Due: {{ formatDate(goal.target_date) }}
                    </span>
                  </v-list-item-subtitle>
                  <template #append>
                    <v-progress-circular
                      :model-value="goal.progress"
                      :color="goal.completed ? 'success' : 'primary'"
                      size="30"
                      width="3"
                    >
                      <span class="text-caption">{{ goal.progress }}%</span>
                    </v-progress-circular>
                  </template>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>

          <!-- My Skills Summary -->
          <v-card rounded="lg">
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon color="success" class="mr-2">mdi-format-list-bulleted</v-icon>
                My Skills
              </div>
              <v-btn color="primary" variant="text" to="/my-skills" size="small">
                View All Skills
              </v-btn>
            </v-card-title>
            <v-card-text>
              <div v-if="skillsLoading" class="d-flex justify-center py-8">
                <v-progress-circular indeterminate color="primary" />
              </div>
              <div v-else-if="mySkills.length === 0" class="text-center py-8">
                <v-icon size="48" color="grey-lighten-2">mdi-star-outline</v-icon>
                <p class="text-body-2 text-grey mt-3">No skills added yet</p>
                <v-btn color="primary" variant="tonal" to="/admin/skills-management?tab=library" class="mt-2">
                  Browse Skills
                </v-btn>
              </div>
              <v-list v-else density="compact" class="bg-transparent">
                <v-list-item
                  v-for="skill in mySkills.slice(0, 8)"
                  :key="skill.id"
                  class="px-0"
                >
                  <template #prepend>
                    <v-icon :color="getLevelColor(skill.level)" size="20">
                      {{ skill.level >= 4 ? 'mdi-star' : 'mdi-circle-outline' }}
                    </v-icon>
                  </template>
                  <v-list-item-title class="text-body-2">{{ skill.name }}</v-list-item-title>
                  <template #append>
                    <v-rating
                      :model-value="skill.level"
                      readonly
                      density="compact"
                      size="x-small"
                      color="amber"
                    />
                  </template>
                </v-list-item>
                <v-list-item v-if="mySkills.length > 8" class="text-center">
                  <v-btn variant="text" color="primary" size="small" to="/admin/skills-management?tab=library">
                    +{{ mySkills.length - 8 }} more skills
                  </v-btn>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- Edit Dialog -->
    <v-dialog v-model="editDialog" max-width="500" persistent>
      <v-card>
        <v-card-title class="d-flex align-center pa-4">
          <v-icon class="mr-2">mdi-account-edit</v-icon>
          Edit Profile
        </v-card-title>

        <v-card-text>
          <v-form ref="editForm" @submit.prevent="saveProfile">
            <v-text-field
              v-model="editData.preferred_name"
              label="Preferred Name"
              hint="How you'd like to be called"
              persistent-hint
              class="mb-4"
            />

            <v-text-field
              v-model="editData.phone_mobile"
              label="Mobile Phone"
              type="tel"
              prepend-inner-icon="mdi-phone"
              class="mb-4"
            />

            <v-textarea
              v-model="editData.bio"
              label="Bio"
              rows="3"
              hint="Tell us a bit about yourself"
              persistent-hint
              class="mb-4"
            />

            <v-text-field
              v-model="editData.avatar_url"
              label="Avatar URL"
              hint="Link to your profile picture"
              persistent-hint
              prepend-inner-icon="mdi-image"
            />
          </v-form>
        </v-card-text>

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="closeEditDialog">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            :loading="isSaving"
            @click="saveProfile"
          >
            Save Changes
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Success Snackbar -->
    <v-snackbar v-model="showSuccess" color="success" timeout="3000">
      <v-icon class="mr-2">mdi-check-circle</v-icon>
      Profile saved successfully!
    </v-snackbar>

    <!-- Error Snackbar -->
    <v-snackbar v-model="showError" color="error" timeout="5000">
      <v-icon class="mr-2">mdi-alert-circle</v-icon>
      {{ errorMessage }}
    </v-snackbar>

    <!-- Goal Dialog -->
    <v-dialog v-model="showGoalDialog" max-width="500">
      <v-card>
        <v-card-title>
          <v-icon class="mr-2">mdi-target</v-icon>
          {{ editingGoal ? 'Edit Goal' : 'Add New Goal' }}
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="goalForm.title"
            label="Goal Title *"
            variant="outlined"
            class="mb-3"
          />
          <v-textarea
            v-model="goalForm.description"
            label="Description"
            variant="outlined"
            rows="2"
            class="mb-3"
          />
          <v-row>
            <v-col cols="12" md="6">
              <v-select
                v-model="goalForm.category"
                :items="goalCategories"
                label="Category"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="goalForm.target_date"
                label="Target Date"
                type="date"
                variant="outlined"
              />
            </v-col>
          </v-row>
          <v-slider
            v-model="goalForm.progress"
            label="Progress"
            :max="100"
            :step="10"
            thumb-label
            class="mt-2"
          />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="closeGoalDialog">Cancel</v-btn>
          <v-btn color="primary" @click="saveGoal" :loading="savingGoal">Save Goal</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

const userStore = useUserStore()
const client = useSupabaseClient()
const toast = useToast()
const router = useRouter()

// Redirect to employee profile if user has an employee record
onMounted(async () => {
  console.log('[ProfilePage] Loading user data...')
  await userStore.fetchUserData()
  
  console.log('[ProfilePage] Employee check:', userStore.employee?.id, userStore.employee?.first_name)
  
  // If user has an employee ID, redirect to the enhanced profile view
  if (userStore.employee?.id) {
    console.log('[ProfilePage] Redirecting to /roster/', userStore.employee.id)
    await navigateTo(`/roster/${userStore.employee.id}`, { replace: true })
    return
  }
  
  console.log('[ProfilePage] No employee ID found, showing basic profile')
  // In emergency mode skip Supabase-dependent skill/goal fetches
  const { isEmergencyMode } = useEmergencyAuth()
  if (isEmergencyMode.value) {
    skillsLoading.value = false
    goalsLoading.value = false
    return
  }
  // Otherwise load skills and goals for the basic profile
  await Promise.all([fetchMySkills(), fetchMyGoals()])
})

// Edit dialog state
const editDialog = ref(false)
const isSaving = ref(false)
const showSuccess = ref(false)
const showError = ref(false)
const errorMessage = ref('')
const editForm = ref()
const mySkills = ref<any[]>([])
const skillsLoading = ref(true)

// Goals state
const myGoals = ref<any[]>([])
const goalsLoading = ref(true)
const showGoalDialog = ref(false)
const editingGoal = ref<any>(null)
const savingGoal = ref(false)
const goalCategories = ['Professional Development', 'Skills', 'Certification', 'Leadership', 'Personal', 'Team', 'Other']

const goalForm = ref({
  title: '',
  description: '',
  category: 'Professional Development',
  target_date: '',
  progress: 0
})

const editData = ref({
  preferred_name: '',
  phone_mobile: '',
  bio: '',
  avatar_url: ''
})

// Computed
const formattedHireDate = computed(() => {
  if (!userStore.employee?.hire_date) return 'Not set'
  return new Date(userStore.employee.hire_date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

const currentLevel = computed(() => {
  // Calculate level from total skills and their levels
  if (mySkills.value.length === 0) return 1
  const totalPoints = mySkills.value.reduce((sum, s) => sum + (s.level || 0), 0)
  return Math.max(1, Math.floor(totalPoints / 5) + 1)
})

const totalXP = computed(() => {
  return mySkills.value.reduce((sum, s) => sum + ((s.level || 0) * 100), 0)
})

const xpProgress = computed(() => {
  const xpForCurrentLevel = (currentLevel.value - 1) * 500
  const xpForNextLevel = currentLevel.value * 500
  const progressXP = totalXP.value - xpForCurrentLevel
  const levelRange = xpForNextLevel - xpForCurrentLevel
  return Math.min(100, Math.round((progressXP / levelRange) * 100))
})

const xpToNextLevel = computed(() => {
  const xpForNextLevel = currentLevel.value * 500
  return Math.max(0, xpForNextLevel - totalXP.value)
})

// Methods
function getLevelColor(level: number) {
  if (level >= 5) return 'success'
  if (level >= 4) return 'teal'
  if (level >= 3) return 'warning'
  if (level >= 2) return 'orange'
  return 'grey'
}

// Methods
function openEditDialog() {
  editData.value = {
    preferred_name: userStore.employee?.preferred_name || '',
    phone_mobile: userStore.employee?.phone_mobile || '',
    bio: userStore.profile?.bio || '',
    avatar_url: userStore.profile?.avatar_url || ''
  }
  editDialog.value = true
}

function closeEditDialog() {
  editDialog.value = false
}

async function saveProfile() {
  isSaving.value = true
  try {
    await userStore.updateProfile({
      preferred_name: editData.value.preferred_name || null,
      phone_mobile: editData.value.phone_mobile || null,
      bio: editData.value.bio || null,
      avatar_url: editData.value.avatar_url || null
    })
    showSuccess.value = true
    closeEditDialog()
  } catch (err) {
    console.error('Failed to save profile:', err)
    toast.error('Failed to save profile. Please try again.')
    errorMessage.value = err instanceof Error ? err.message : 'Failed to save profile. Please try again.'
    showError.value = true
  } finally {
    isSaving.value = false
  }
}

// fetchMySkills moved to be called from onMounted at top of script
async function fetchMySkills() {
  skillsLoading.value = true
  try {
    // Get employee ID from user store
    const employeeId = userStore.employee?.id
    if (!employeeId) return
    
    const { data, error } = await client
      .from('employee_skills')
      .select(`
        id,
        level,
        skill:skill_library(id, name, category)
      `)
      .eq('employee_id', employeeId)
      .order('level', { ascending: false })
    
    if (error) throw error
    
    mySkills.value = (data || []).map((s: any) => ({
      id: s.id,
      level: s.level,
      name: s.skill?.name || 'Unknown',
      category: s.skill?.category || 'Other'
    }))
  } catch (err) {
    console.error('Error fetching skills:', err)
  } finally {
    skillsLoading.value = false
  }
}

async function fetchMyGoals() {
  goalsLoading.value = true
  try {
    const employeeId = userStore.employee?.id
    if (!employeeId) {
      // Use sample goals if no employee ID
      myGoals.value = []
      return
    }
    
    const { data, error } = await client
      .from('employee_goals')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
    
    if (error) {
      // Table might not exist yet, use empty array
      console.log('Goals table not available:', error.message)
      myGoals.value = []
      return
    }
    
    myGoals.value = data || []
  } catch (err) {
    console.error('Error fetching goals:', err)
    myGoals.value = []
  } finally {
    goalsLoading.value = false
  }
}

function getGoalCategoryColor(category: string) {
  const colors: Record<string, string> = {
    'Professional Development': 'primary',
    'Skills': 'success',
    'Certification': 'warning',
    'Leadership': 'purple',
    'Personal': 'info',
    'Team': 'teal',
    'Other': 'grey'
  }
  return colors[category] || 'grey'
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function closeGoalDialog() {
  showGoalDialog.value = false
  editingGoal.value = null
  goalForm.value = {
    title: '',
    description: '',
    category: 'Professional Development',
    target_date: '',
    progress: 0
  }
}

async function saveGoal() {
  if (!goalForm.value.title) {
    toast.error('Please enter a goal title')
    return
  }
  
  savingGoal.value = true
  try {
    const employeeId = userStore.employee?.id
    if (!employeeId) throw new Error('No employee ID')
    
    const goalData = {
      employee_id: employeeId,
      title: goalForm.value.title,
      description: goalForm.value.description,
      category: goalForm.value.category,
      target_date: goalForm.value.target_date || null,
      progress: goalForm.value.progress,
      completed: goalForm.value.progress >= 100
    }
    
    if (editingGoal.value) {
      const { error } = await client
        .from('employee_goals')
        .update(goalData)
        .eq('id', editingGoal.value.id)
      
      if (error) throw error
    } else {
      const { error } = await client
        .from('employee_goals')
        .insert(goalData)
      
      if (error) throw error
    }
    
    await fetchMyGoals()
    closeGoalDialog()
    toast.success('Goal saved successfully')
  } catch (err) {
    console.error('Error saving goal:', err)
    toast.error('Failed to save goal. Goals table may not exist yet.')
  } finally {
    savingGoal.value = false
  }
}

async function toggleGoalComplete(goal: any) {
  try {
    const newCompleted = !goal.completed
    const { error } = await client
      .from('employee_goals')
      .update({ 
        completed: newCompleted,
        progress: newCompleted ? 100 : goal.progress
      })
      .eq('id', goal.id)
    
    if (error) throw error
    
    goal.completed = newCompleted
    if (newCompleted) goal.progress = 100
  } catch (err) {
    console.error('Error updating goal:', err)
  }
}
</script>

<style scoped>
.baseball-card {
  border-radius: 16px;
  overflow: hidden;
}

.card-header {
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, rgb(var(--v-theme-primary-darken-1)) 100%);
}

.avatar-border {
  border: 4px solid white;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.profile-page {
  padding-top: 16px;
}
</style>
