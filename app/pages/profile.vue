<template>
  <div class="profile-page">
    <!-- Loading State -->
    <div v-if="userStore.isLoading" class="d-flex justify-center align-center" style="min-height: 400px;">
      <v-progress-circular indeterminate color="primary" size="64" />
    </div>

    <!-- Error State -->
    <v-alert v-else-if="userStore.error" type="error" class="mb-4">
      {{ userStore.error }}
      <template #append>
        <v-btn variant="text" @click="userStore.fetchUserData()">Retry</v-btn>
      </template>
    </v-alert>

    <!-- Baseball Card -->
    <v-card v-else class="baseball-card mx-auto" max-width="600" elevation="8">
      <!-- Card Header with Avatar -->
      <div class="card-header bg-primary pa-6 text-center">
        <v-avatar size="120" class="avatar-border mb-4">
          <v-img v-if="userStore.profile?.avatar_url" :src="userStore.profile.avatar_url" cover />
          <span v-else class="text-h3 text-primary font-weight-bold bg-white" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
            {{ userStore.initials }}
          </span>
        </v-avatar>
        
        <h1 class="text-h4 text-white font-weight-bold mb-1">
          {{ userStore.fullName }}
        </h1>
        <p class="text-h6 text-white opacity-80 mb-0">
          {{ userStore.jobTitle }}
        </p>
      </div>

      <!-- Badges Section -->
      <div class="d-flex justify-center flex-wrap gap-2 pa-4 bg-grey-lighten-4">
        <v-chip
          v-if="userStore.departmentName"
          color="primary"
          variant="flat"
          prepend-icon="mdi-hospital-building"
        >
          {{ userStore.departmentName }}
        </v-chip>
        <v-chip
          v-if="userStore.locationName"
          color="secondary"
          variant="flat"
          prepend-icon="mdi-map-marker"
        >
          {{ userStore.locationName }}
        </v-chip>
        <v-chip
          v-if="userStore.isAdmin"
          color="warning"
          variant="flat"
          prepend-icon="mdi-shield-crown"
        >
          Admin
        </v-chip>
      </div>

      <!-- Stats Grid -->
      <v-card-text class="pa-4">
        <v-row dense>
          <!-- Tenure -->
          <v-col cols="4">
            <v-card variant="tonal" color="primary" class="text-center pa-3">
              <v-icon size="28" class="mb-1">mdi-calendar-clock</v-icon>
              <div class="text-h6 font-weight-bold">{{ userStore.tenure || 'N/A' }}</div>
              <div class="text-caption text-medium-emphasis">Tenure</div>
            </v-card>
          </v-col>

          <!-- Role -->
          <v-col cols="4">
            <v-card variant="tonal" color="secondary" class="text-center pa-3">
              <v-icon size="28" class="mb-1">mdi-badge-account</v-icon>
              <div class="text-h6 font-weight-bold">{{ userStore.profile?.role === 'admin' ? 'Admin' : 'User' }}</div>
              <div class="text-caption text-medium-emphasis">Role</div>
            </v-card>
          </v-col>

          <!-- Status -->
          <v-col cols="4">
            <v-card variant="tonal" color="success" class="text-center pa-3">
              <v-icon size="28" class="mb-1">mdi-briefcase-check</v-icon>
              <div class="text-h6 font-weight-bold">{{ userStore.employmentType }}</div>
              <div class="text-caption text-medium-emphasis">Status</div>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>

      <!-- Bio Section -->
      <v-card-text v-if="userStore.profile?.bio" class="pt-0">
        <v-divider class="mb-4" />
        <div class="text-subtitle-2 text-medium-emphasis mb-1">About</div>
        <p class="text-body-1 mb-0">{{ userStore.profile.bio }}</p>
      </v-card-text>

      <!-- Contact Info -->
      <v-card-text class="pt-0">
        <v-divider class="mb-4" />
        <v-list density="compact" class="bg-transparent">
          <v-list-item prepend-icon="mdi-email" :subtitle="userStore.profile?.email || 'Not set'">
            <v-list-item-title class="text-caption text-medium-emphasis">Email</v-list-item-title>
          </v-list-item>
          <v-list-item prepend-icon="mdi-phone" :subtitle="userStore.employee?.phone_mobile || 'Not set'">
            <v-list-item-title class="text-caption text-medium-emphasis">Mobile</v-list-item-title>
          </v-list-item>
          <v-list-item prepend-icon="mdi-calendar" :subtitle="formattedHireDate">
            <v-list-item-title class="text-caption text-medium-emphasis">Start Date</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card-text>

      <!-- Edit Button -->
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn
          color="primary"
          variant="elevated"
          prepend-icon="mdi-pencil"
          @click="openEditDialog"
        >
          Edit Profile
        </v-btn>
      </v-card-actions>
    </v-card>

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
      Profile updated successfully!
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

const userStore = useUserStore()

// Edit dialog state
const editDialog = ref(false)
const isSaving = ref(false)
const showSuccess = ref(false)
const editForm = ref()

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
  } finally {
    isSaving.value = false
  }
}

// Fetch user data on mount
onMounted(async () => {
  await userStore.fetchUserData()
})
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
