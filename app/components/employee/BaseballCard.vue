<template>
  <div class="baseball-card" :class="{ 'mini': mini }">
    <!-- Card Header -->
    <div class="baseball-card-header">
      <v-avatar 
        :size="mini ? 60 : 100" 
        class="mb-2"
        :color="profile.avatar_url ? undefined : 'primary lighten-2'"
      >
        <v-img 
          v-if="profile.avatar_url" 
          :src="profile.avatar_url" 
          :alt="fullName"
        />
        <span v-else class="text-h4 font-weight-bold text-white">
          {{ initials }}
        </span>
      </v-avatar>
      
      <h2 class="text-h5 font-weight-bold mb-1">{{ fullName }}</h2>
      <p class="text-body-2 opacity-80 mb-2">{{ profile.position || 'Team Member' }}</p>
      
      <div class="d-flex justify-center gap-2">
        <span :class="['role-badge', profile.role]">
          {{ profile.role }}
        </span>
      </div>
    </div>

    <!-- Card Body -->
    <div class="pa-4" v-if="!mini">
      <!-- Quick Stats -->
      <div class="stats-grid mb-4">
        <div class="stat-item">
          <div class="stat-value">{{ stats.totalSkills }}</div>
          <div class="stat-label">Skills</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ stats.averageSkillLevel }}</div>
          <div class="stat-label">Avg Level</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ stats.mentorSkills }}</div>
          <div class="stat-label">Mastered</div>
        </div>
        <div class="stat-item" v-if="profile.hire_date">
          <div class="stat-value">{{ tenure }}</div>
          <div class="stat-label">Tenure</div>
        </div>
      </div>

      <!-- Skills Preview -->
      <div v-if="topSkills.length > 0" class="mb-4">
        <h4 class="text-subtitle-2 text-grey-darken-1 mb-2">TOP SKILLS</h4>
        <div class="d-flex flex-wrap gap-2">
          <v-chip
            v-for="skill in topSkills"
            :key="skill.id"
            :color="getSkillColor(skill.level)"
            size="small"
            variant="tonal"
          >
            {{ skill.skill.name }}
            <v-icon end size="x-small">
              {{ getSkillIcon(skill.level) }}
            </v-icon>
          </v-chip>
        </div>
      </div>

      <!-- Department -->
      <div v-if="profile.department" class="text-center">
        <v-chip 
          color="secondary" 
          variant="outlined"
          size="small"
          prepend-icon="mdi-domain"
        >
          {{ profile.department?.name || 'No Department' }}
        </v-chip>
      </div>
    </div>

    <!-- Card Actions -->
    <v-divider v-if="showActions && !mini" />
    <v-card-actions v-if="showActions && !mini" class="pa-3">
      <v-btn 
        variant="text" 
        color="primary" 
        :to="`/roster/${profile.id}`"
        size="small"
      >
        View Profile
      </v-btn>
      <v-spacer />
      <v-btn 
        v-if="isAdmin"
        variant="text" 
        color="secondary"
        :to="`/roster/${profile.id}`"
        size="small"
      >
        Edit
      </v-btn>
    </v-card-actions>

    <!-- Mini Card Click Handler -->
    <div 
      v-if="mini && clickable" 
      class="baseball-card-overlay"
      @click="$emit('click', profile)"
    />
  </div>
</template>

<script setup lang="ts">
import type { ProfileWithSkills, EmployeeSkill, SkillLevel } from '~/types/database.types'
import { getSkillCategory } from '~/types/database.types'

interface Props {
  profile: ProfileWithSkills
  mini?: boolean
  showActions?: boolean
  clickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  mini: false,
  showActions: true,
  clickable: true
})

defineEmits<{
  click: [profile: ProfileWithSkills]
}>()

const authStore = useAuthStore()
const isAdmin = computed(() => authStore.isAdmin)

const fullName = computed(() => {
  const { first_name, last_name, email } = props.profile
  return `${first_name || ''} ${last_name || ''}`.trim() || email
})

const initials = computed(() => {
  const first = props.profile.first_name?.[0] || ''
  const last = props.profile.last_name?.[0] || ''
  return (first + last).toUpperCase() || props.profile.email[0].toUpperCase()
})

const stats = computed(() => {
  const skills = props.profile.employee_skills || []
  const totalSkills = skills.length
  const averageSkillLevel = totalSkills > 0 
    ? Math.round((skills.reduce((sum, s) => sum + s.level, 0) / totalSkills) * 10) / 10
    : 0
  const mentorSkills = skills.filter(s => s.level === 5).length

  return {
    totalSkills,
    averageSkillLevel,
    mentorSkills
  }
})

const topSkills = computed(() => {
  const skills = props.profile.employee_skills || []
  return [...skills]
    .sort((a, b) => b.level - a.level)
    .slice(0, 4)
})

const tenure = computed(() => {
  if (!props.profile.hire_date) return '-'
  
  const hire = new Date(props.profile.hire_date)
  const now = new Date()
  const years = Math.floor((now.getTime() - hire.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  
  if (years < 1) {
    const months = Math.floor((now.getTime() - hire.getTime()) / (30.44 * 24 * 60 * 60 * 1000))
    return `${months}mo`
  }
  return `${years}yr`
})

function getSkillColor(level: SkillLevel): string {
  const category = getSkillCategory(level)
  switch (category) {
    case 'learning': return 'orange'
    case 'competent': return 'blue'
    case 'mentor': return 'green'
  }
}

function getSkillIcon(level: SkillLevel): string {
  const category = getSkillCategory(level)
  switch (category) {
    case 'learning': return 'mdi-school'
    case 'competent': return 'mdi-check-circle'
    case 'mentor': return 'mdi-star'
  }
}
</script>

<style scoped>
.baseball-card {
  position: relative;
  max-width: 340px;
  width: 100%;
}

.baseball-card.mini {
  max-width: 180px;
}

.baseball-card.mini .baseball-card-header {
  padding: 16px 12px;
}

.baseball-card-overlay {
  position: absolute;
  inset: 0;
  cursor: pointer;
  z-index: 1;
}

.baseball-card.mini:hover {
  cursor: pointer;
}
</style>
