<template>
  <div 
    class="roster-card" 
    :class="{ 'roster-card--inactive': !employee.is_active }"
    @click="$emit('click', employee)"
  >
    <!-- Card Header with Department Color Strip -->
    <div class="roster-card__header" :style="headerStyle">
      <!-- Clock Status Indicator -->
      <div class="roster-card__clock-status">
        <v-tooltip location="top">
          <template #activator="{ props }">
            <div 
              v-bind="props"
              class="clock-dot" 
              :class="clockStatusClass"
            />
          </template>
          <span>{{ clockStatusText }}</span>
        </v-tooltip>
      </div>
      
      <!-- Avatar -->
      <v-avatar 
        size="80" 
        class="roster-card__avatar"
        :color="employee.avatar_url ? undefined : 'white'"
      >
        <v-img 
          v-if="employee.avatar_url" 
          :src="employee.avatar_url" 
          :alt="fullName"
        />
        <span v-else class="text-h4 font-weight-bold" :style="{ color: departmentColor }">
          {{ initials }}
        </span>
      </v-avatar>
      
      <!-- Level Badge (Profile Level) -->
      <div class="roster-card__level">
        <span class="level-number">{{ employee.player_level || calculateLevel() }}</span>
        <span class="level-label">LVL</span>
      </div>
    </div>
    
    <!-- Card Body -->
    <div class="roster-card__body">
      <!-- Name -->
      <h3 class="roster-card__name">
        {{ displayName }}
      </h3>
      
      <!-- Position Badge (Color-coded by Department) -->
      <v-chip 
        :color="departmentColor" 
        size="small" 
        variant="flat"
        class="roster-card__position"
      >
        {{ employee.position?.title || 'Team Member' }}
      </v-chip>
      
      <!-- Stat Summary Row -->
      <div class="roster-card__stats">
        <div class="stat-item">
          <span class="stat-value">{{ employee.skill_stats?.total || 0 }}</span>
          <span class="stat-label">SKL</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ employee.skill_stats?.mastered_count || 0 }}</span>
          <span class="stat-label">MAS</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ tenure }}</span>
          <span class="stat-label">TEN</span>
        </div>
      </div>
      
      <!-- Top Skills Pills -->
      <div v-if="employee.top_skills?.length" class="roster-card__skills">
        <v-chip
          v-for="skill in employee.top_skills.slice(0, 3)"
          :key="skill.id"
          :color="getSkillColor(skill.level)"
          size="x-small"
          variant="tonal"
          class="skill-pill"
        >
          {{ skill.name }}
          <v-icon size="10" class="ml-1">{{ getSkillIcon(skill.level) }}</v-icon>
        </v-chip>
      </div>
      <div v-else class="roster-card__skills roster-card__skills--empty">
        <span class="text-caption text-grey">No skills yet</span>
      </div>
    </div>
    
    <!-- Card Footer -->
    <div class="roster-card__footer">
      <div class="d-flex align-center justify-space-between">
        <span class="text-caption text-grey">
          {{ employee.department?.name || 'Unassigned' }}
        </span>
        <v-icon 
          v-if="['super_admin', 'admin'].includes(employee.role)" 
          size="16" 
          :color="employee.role === 'super_admin' ? 'amber' : 'purple'"
          :title="employee.role === 'super_admin' ? 'Super Admin' : 'Admin'"
        >
          mdi-shield-crown
        </v-icon>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RosterCardProps, SkillLevel } from '~/types/database.types'
import { getDepartmentColor, getSkillCategory } from '~/types/database.types'

interface Props {
  employee: RosterCardProps
}

const props = defineProps<Props>()

defineEmits<{
  click: [employee: RosterCardProps]
}>()

// Computed
const fullName = computed(() => {
  return `${props.employee.first_name} ${props.employee.last_name}`.trim()
})

const displayName = computed(() => {
  return props.employee.preferred_name || fullName.value
})

const initials = computed(() => {
  const first = props.employee.first_name?.[0] || ''
  const last = props.employee.last_name?.[0] || ''
  return (first + last).toUpperCase() || 'U'
})

const departmentColor = computed(() => {
  return getDepartmentColor(props.employee.department?.name)
})

const headerStyle = computed(() => ({
  background: `linear-gradient(135deg, ${departmentColor.value} 0%, ${adjustColor(departmentColor.value, -20)} 100%)`
}))

const tenure = computed(() => {
  if (!props.employee.hire_date) return '-'
  
  const hire = new Date(props.employee.hire_date)
  const now = new Date()
  const years = Math.floor((now.getTime() - hire.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  
  if (years < 1) {
    const months = Math.floor((now.getTime() - hire.getTime()) / (30.44 * 24 * 60 * 60 * 1000))
    return months > 0 ? `${months}m` : '<1m'
  }
  return `${years}y`
})

const clockStatusClass = computed(() => {
  switch (props.employee.clock_status) {
    case 'clocked_in': return 'clock-dot--in'
    case 'clocked_out': return 'clock-dot--out'
    default: return 'clock-dot--unknown'
  }
})

const clockStatusText = computed(() => {
  switch (props.employee.clock_status) {
    case 'clocked_in': return 'On Shift'
    case 'clocked_out': return 'Off Duty'
    default: return 'Status Unknown'
  }
})

// Methods
function calculateLevel(): number {
  // Calculate overall level based on skills
  const stats = props.employee.skill_stats
  if (!stats || stats.total === 0) return 50
  
  // Base level 50, add points for skills
  const baseLevel = 50
  const skillBonus = Math.min(stats.total * 3, 30) // Max +30 from skill count
  const masteryBonus = stats.mastered_count * 5     // +5 per mastered skill
  const avgBonus = Math.round(stats.average_level * 2) // Up to +10 from avg
  
  return Math.min(99, baseLevel + skillBonus + masteryBonus + avgBonus)
}

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

function adjustColor(hex: string, percent: number): string {
  // Darken or lighten a hex color
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.max(0, Math.min(255, (num >> 16) + amt))
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt))
  const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt))
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`
}
</script>

<style scoped>
.roster-card {
  position: relative;
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
  border: 2px solid transparent;
}

.roster-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
  border-color: rgba(0, 0, 0, 0.08);
}

.roster-card--inactive {
  opacity: 0.6;
  filter: grayscale(40%);
}

.roster-card__header {
  position: relative;
  padding: 24px 16px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.roster-card__clock-status {
  position: absolute;
  top: 12px;
  left: 12px;
}

.clock-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.clock-dot--in {
  background: rgb(var(--v-theme-skill-mentor));
  animation: pulse 2s infinite;
}

.clock-dot--out {
  background: rgb(var(--v-theme-muted));
}

.clock-dot--unknown {
  background: #FFC107;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(76, 175, 80, 0); }
}

.roster-card__avatar {
  border: 4px solid white;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.roster-card__level {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  padding: 4px 8px;
  text-align: center;
  min-width: 44px;
}

.roster-card__level .level-number {
  display: block;
  color: #FFD700;
  font-size: 18px;
  font-weight: 800;
  line-height: 1;
}

.roster-card__level .level-label {
  display: block;
  color: rgba(255, 255, 255, 0.7);
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.roster-card__body {
  padding: 16px;
  text-align: center;
}

.roster-card__name {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 8px;
  line-height: 1.2;
}

.roster-card__position {
  margin-bottom: 12px;
  font-weight: 600;
}

.roster-card__stats {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 12px;
  padding: 8px 0;
  background: #f8f9fa;
  border-radius: 8px;
  margin-left: -8px;
  margin-right: -8px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 18px;
  font-weight: 800;
  color: #1a1a1a;
  line-height: 1;
}

.stat-label {
  display: block;
  font-size: 9px;
  font-weight: 600;
  color: rgb(var(--v-theme-text-secondary));
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 2px;
}

.roster-card__skills {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
  min-height: 24px;
}

.roster-card__skills--empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.skill-pill {
  font-size: 10px;
  font-weight: 600;
}

.roster-card__footer {
  padding: 8px 16px;
  background: #f8f9fa;
  border-top: 1px solid #eee;
}
</style>
