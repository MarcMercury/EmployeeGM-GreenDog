<template>
  <div class="level-progress">
    <!-- Level Badge Circle -->
    <div class="level-badge-wrapper">
      <div class="level-badge">
        <svg viewBox="0 0 100 100" class="progress-ring">
          <!-- Background circle -->
          <circle
            cx="50"
            cy="50"
            r="45"
            class="progress-ring__background"
          />
          <!-- Progress arc -->
          <circle
            cx="50"
            cy="50"
            r="45"
            class="progress-ring__progress"
            :style="progressStyle"
          />
        </svg>
        <div class="level-content">
          <span class="level-number">{{ currentLevel }}</span>
          <span class="level-label">LVL</span>
        </div>
      </div>
    </div>
    
    <!-- XP Details -->
    <div class="xp-details">
      <div class="xp-header">
        <span class="xp-title">Experience Points</span>
        <v-chip size="x-small" color="primary" variant="tonal">
          <v-icon start size="12">mdi-star</v-icon>
          {{ formatNumber(totalXP) }} XP
        </v-chip>
      </div>
      
      <div class="xp-bar-container">
        <div class="xp-bar">
          <div 
            class="xp-bar__fill" 
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
        <div class="xp-labels">
          <span class="xp-current">{{ formatNumber(xpProgress) }}</span>
          <span class="xp-divider">/</span>
          <span class="xp-target">{{ formatNumber(xpToNextLevel) }}</span>
        </div>
      </div>
      
      <div class="next-level-info">
        <v-icon size="14" color="grey">mdi-arrow-up</v-icon>
        <span class="text-caption text-grey">
          {{ formatNumber(xpToNextLevel - xpProgress) }} XP to Level {{ currentLevel + 1 }}
        </span>
      </div>
    </div>
    
    <!-- Recent XP Gains (optional) -->
    <div v-if="recentGains.length > 0" class="recent-gains">
      <div class="recent-gains__header">
        <span class="text-caption font-weight-bold">Recent XP</span>
      </div>
      <div class="recent-gains__list">
        <div 
          v-for="gain in recentGains.slice(0, 3)" 
          :key="gain.id"
          class="gain-item"
        >
          <v-icon size="14" :color="getGainColor(gain.source_type)">
            {{ getGainIcon(gain.source_type) }}
          </v-icon>
          <span class="gain-reason">{{ gain.reason }}</span>
          <span class="gain-points">+{{ gain.points }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { XPGain } from '~/types/skill.types'

interface Props {
  currentLevel: number
  totalXP: number
  xpProgress: number
  xpToNextLevel: number
  recentGains?: XPGain[]
}

const props = withDefaults(defineProps<Props>(), {
  recentGains: () => []
})

// Calculate progress percentage
const progressPercent = computed(() => {
  if (props.xpToNextLevel === 0) return 100
  return Math.min((props.xpProgress / props.xpToNextLevel) * 100, 100)
})

// SVG progress ring style
const progressStyle = computed(() => {
  const circumference = 2 * Math.PI * 45 // r = 45
  const offset = circumference - (progressPercent.value / 100) * circumference
  return {
    strokeDasharray: `${circumference}`,
    strokeDashoffset: `${offset}`
  }
})

// Format large numbers
function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}

// Get icon for XP source type
function getGainIcon(sourceType: string): string {
  const icons: Record<string, string> = {
    achievement: 'mdi-trophy',
    skill: 'mdi-star',
    training: 'mdi-school',
    manual: 'mdi-hand-coin',
    attendance: 'mdi-calendar-check',
    performance: 'mdi-chart-line'
  }
  return icons[sourceType] || 'mdi-plus-circle'
}

// Get color for XP source type
function getGainColor(sourceType: string): string {
  const colors: Record<string, string> = {
    achievement: 'amber',
    skill: 'success',
    training: 'info',
    manual: 'purple',
    attendance: 'teal',
    performance: 'orange'
  }
  return colors[sourceType] || 'grey'
}
</script>

<style scoped>
.level-progress {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.level-badge-wrapper {
  display: flex;
  justify-content: center;
}

.level-badge {
  position: relative;
  width: 100px;
  height: 100px;
}

.progress-ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.progress-ring__background {
  fill: none;
  stroke: rgba(var(--v-theme-on-surface), 0.1);
  stroke-width: 6;
}

.progress-ring__progress {
  fill: none;
  stroke: rgb(var(--v-theme-primary));
  stroke-width: 6;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.5s ease;
}

.level-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.level-number {
  font-size: 2rem;
  font-weight: 800;
  color: rgb(var(--v-theme-primary));
  line-height: 1;
}

.level-label {
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 2px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  text-transform: uppercase;
}

.xp-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.xp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.xp-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.8);
}

.xp-bar-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.xp-bar {
  height: 8px;
  background: rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.xp-bar__fill {
  height: 100%;
  background: linear-gradient(90deg, rgb(var(--v-theme-primary)), #4CAF50);
  border-radius: 4px;
  transition: width 0.5s ease;
}

.xp-labels {
  display: flex;
  justify-content: flex-end;
  gap: 2px;
  font-size: 0.75rem;
}

.xp-current {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

.xp-divider {
  color: rgba(var(--v-theme-on-surface), 0.3);
}

.xp-target {
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.next-level-info {
  display: flex;
  align-items: center;
  gap: 4px;
}

.recent-gains {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  padding-top: 12px;
}

.recent-gains__header {
  margin-bottom: 8px;
}

.recent-gains__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.gain-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
}

.gain-reason {
  flex: 1;
  color: rgba(var(--v-theme-on-surface), 0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gain-points {
  font-weight: 600;
  color: rgb(var(--v-theme-success));
}
</style>
