<template>
  <v-menu
    :model-value="showMenu"
    :open-on-hover="!isMobile"
    :open-on-click="isMobile"
    :close-delay="300"
    :open-delay="400"
    location="top"
    :offset="[0, 8]"
    max-width="320"
    @update:model-value="showMenu = $event"
  >
    <template #activator="{ props }">
      <slot :props="props" />
    </template>

    <v-card class="employee-hover-card" elevation="8" rounded="lg">
      <!-- Header with gradient -->
      <div class="hover-card-header pa-4">
        <div class="d-flex align-center gap-3">
          <v-avatar :size="56" :color="employee.avatar_url ? undefined : 'primary'">
            <v-img v-if="employee.avatar_url" :src="employee.avatar_url" cover />
            <span v-else class="text-white text-h6 font-weight-bold">
              {{ employee.initials }}
            </span>
          </v-avatar>
          <div class="flex-grow-1">
            <h3 class="text-h6 font-weight-bold text-white mb-0">
              {{ employee.full_name }}
            </h3>
            <p class="text-body-2 text-grey-lighten-2 mb-0">
              {{ employee.position?.title || 'Team Member' }}
            </p>
          </div>
        </div>
      </div>

      <v-divider />

      <!-- Quick Stats -->
      <v-card-text class="pa-3">
        <div class="d-flex justify-space-around text-center mb-3">
          <div>
            <div class="text-h5 font-weight-bold text-primary">
              {{ skillLevel }}
            </div>
            <div class="text-caption text-grey">Level</div>
          </div>
          <v-divider vertical class="mx-2" />
          <div>
            <div class="text-h5 font-weight-bold text-success">
              {{ employee.skills?.length || 0 }}
            </div>
            <div class="text-caption text-grey">Skills</div>
          </div>
          <v-divider vertical class="mx-2" />
          <div>
            <div class="text-h5 font-weight-bold text-info">
              {{ tenureText }}
            </div>
            <div class="text-caption text-grey">Tenure</div>
          </div>
        </div>

        <!-- Status Badge -->
        <div class="d-flex align-center justify-center gap-2 mb-3">
          <v-chip 
            :color="employee.is_active ? 'success' : 'grey'" 
            size="small" 
            variant="flat"
          >
            <v-icon start size="12">
              {{ employee.is_active ? 'mdi-check-circle' : 'mdi-pause-circle' }}
            </v-icon>
            {{ employee.is_active ? 'Active' : 'Inactive' }}
          </v-chip>
          <v-chip 
            v-if="employee.department" 
            size="small" 
            variant="outlined"
          >
            {{ employee.department.name }}
          </v-chip>
        </div>

        <!-- Top Skills Preview -->
        <div v-if="topSkills.length > 0" class="mb-2">
          <div class="text-caption text-grey mb-1">Top Skills</div>
          <div class="d-flex flex-wrap gap-1">
            <v-chip
              v-for="skill in topSkills"
              :key="skill.skill_id"
              size="x-small"
              color="primary"
              variant="tonal"
            >
              {{ skill.skill_name }} ({{ skill.rating }})
            </v-chip>
          </div>
        </div>
      </v-card-text>

      <v-divider />

      <!-- Quick Actions -->
      <v-card-actions class="pa-2">
        <v-btn 
          variant="text" 
          color="primary" 
          size="small"
          :to="`/roster/${employee.id}`"
          block
        >
          <v-icon start size="16">mdi-account</v-icon>
          View Profile
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import type { AppEmployee } from '~/composables/useAppData'

interface Props {
  employee: AppEmployee
}

const props = defineProps<Props>()

const showMenu = ref(false)

// Detect mobile
const isMobile = computed(() => {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 960
})

// Calculate skill level (average of all skills)
const skillLevel = computed(() => {
  const skills = props.employee.skills || []
  if (skills.length === 0) return 1
  const avg = skills.reduce((sum, s) => sum + s.rating, 0) / skills.length
  return Math.round(avg)
})

// Format tenure
const tenureText = computed(() => {
  const months = props.employee.tenure_months
  if (months < 1) return 'New'
  if (months < 12) return `${months}mo`
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  if (remainingMonths === 0) return `${years}yr`
  return `${years}y${remainingMonths}m`
})

// Top 3 skills by rating
const topSkills = computed(() => {
  const skills = props.employee.skills || []
  return [...skills]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3)
})
</script>

<style scoped>
.employee-hover-card {
  min-width: 280px;
  overflow: hidden;
}

.hover-card-header {
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, rgb(var(--v-theme-primary-darken-1)) 100%);
}

/* Dark mode adjustment */
.v-theme--dark .hover-card-header {
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.9) 0%, rgba(var(--v-theme-primary), 0.7) 100%);
}
</style>
