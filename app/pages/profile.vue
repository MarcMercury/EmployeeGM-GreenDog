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
    <div v-if="userStore.isLoading && !userStore.profile" class="d-flex justify-center align-center" style="min-height: 400px;">
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

          <!-- My Skills Summary -->
          <v-card rounded="lg">
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon color="success" class="mr-2">mdi-format-list-bulleted</v-icon>
                My Skills
              </div>
              <v-btn color="primary" variant="text" to="/skills" size="small">
                Manage Skills
              </v-btn>
            </v-card-title>
            <v-card-text>
              <div v-if="skillsLoading" class="d-flex justify-center py-8">
                <v-progress-circular indeterminate color="primary" />
              </div>
              <div v-else-if="mySkills.length === 0" class="text-center py-8">
                <v-icon size="48" color="grey-lighten-2">mdi-star-outline</v-icon>
                <p class="text-body-2 text-grey mt-3">No skills added yet</p>
                <v-btn color="primary" variant="tonal" to="/skills" class="mt-2">
                  Add Skills
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
                  <v-btn variant="text" color="primary" size="small" to="/skills">
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

// Edit dialog state
const editDialog = ref(false)
const isSaving = ref(false)
const showSuccess = ref(false)
const showError = ref(false)
const errorMessage = ref('')
const editForm = ref()
const mySkills = ref<any[]>([])
const skillsLoading = ref(true)

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

// Fetch user data on mount
onMounted(async () => {
  await userStore.fetchUserData()
  await fetchMySkills()
})

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
