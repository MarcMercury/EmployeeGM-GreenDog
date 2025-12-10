<template>
  <div class="trophy-case">
    <!-- Header with stats -->
    <div class="trophy-header d-flex align-center justify-space-between mb-4">
      <div>
        <h3 class="text-h6 font-weight-bold">Trophy Case</h3>
        <p class="text-caption text-grey">
          {{ unlockedCount }} of {{ achievements.length }} unlocked
        </p>
      </div>
      <v-chip color="amber" variant="flat" size="small">
        <v-icon start size="14">mdi-trophy</v-icon>
        {{ totalPoints }} pts
      </v-chip>
    </div>

    <!-- Progress bar -->
    <v-progress-linear
      :model-value="progressPercent"
      color="amber"
      height="6"
      rounded
      class="mb-4"
    />

    <!-- Category Filter -->
    <v-chip-group
      v-model="selectedCategory"
      class="mb-4"
      mandatory
    >
      <v-chip
        value="all"
        filter
        size="small"
        variant="outlined"
      >
        All
      </v-chip>
      <v-chip
        v-for="category in categories"
        :key="category"
        :value="category"
        filter
        size="small"
        variant="outlined"
      >
        {{ formatCategory(category) }}
      </v-chip>
    </v-chip-group>

    <!-- Achievement Grid -->
    <div class="trophy-grid">
      <div
        v-for="achievement in filteredAchievements"
        :key="achievement.id"
        class="trophy-item"
        :class="{ 
          'trophy-item--locked': !achievement.is_unlocked,
          'trophy-item--unlocked': achievement.is_unlocked 
        }"
        @click="selectAchievement(achievement)"
      >
        <!-- Badge Icon -->
        <div 
          class="trophy-badge"
          :style="getBadgeStyle(achievement)"
        >
          <v-icon 
            :size="28" 
            :color="achievement.is_unlocked ? 'white' : 'grey-darken-1'"
          >
            {{ getAchievementIcon(achievement) }}
          </v-icon>
        </div>
        
        <!-- Trophy Name -->
        <span class="trophy-name">{{ achievement.name }}</span>
        
        <!-- Unlock indicator -->
        <v-icon 
          v-if="achievement.is_unlocked" 
          size="14" 
          color="success" 
          class="unlock-check"
        >
          mdi-check-circle
        </v-icon>
      </div>
    </div>

    <!-- Selected Achievement Dialog -->
    <v-dialog v-model="showDetail" max-width="400">
      <v-card v-if="selectedAchievement" class="achievement-detail">
        <div 
          class="achievement-header text-center pa-6"
          :style="getHeaderStyle(selectedAchievement)"
        >
          <v-icon 
            size="64" 
            :color="selectedAchievement.is_unlocked ? 'white' : 'grey-lighten-1'"
          >
            {{ getAchievementIcon(selectedAchievement) }}
          </v-icon>
        </div>
        
        <v-card-text class="text-center pt-4">
          <h3 class="text-h6 font-weight-bold mb-2">
            {{ selectedAchievement.name }}
          </h3>
          
          <p class="text-body-2 text-grey mb-4">
            {{ selectedAchievement.description }}
          </p>
          
          <v-chip
            :color="selectedAchievement.is_unlocked ? 'success' : 'grey'"
            variant="flat"
            size="small"
            class="mb-4"
          >
            <v-icon start size="14">
              {{ selectedAchievement.is_unlocked ? 'mdi-lock-open' : 'mdi-lock' }}
            </v-icon>
            {{ selectedAchievement.is_unlocked ? 'Unlocked' : 'Locked' }}
          </v-chip>
          
          <div v-if="selectedAchievement.is_unlocked && selectedAchievement.unlocked_at" class="text-caption text-grey">
            Earned {{ formatDate(selectedAchievement.unlocked_at) }}
          </div>
          
          <div class="d-flex justify-center align-center gap-2 mt-3">
            <v-chip color="amber" size="small" variant="tonal">
              <v-icon start size="14">mdi-star</v-icon>
              {{ selectedAchievement.points }} XP
            </v-chip>
            <v-chip size="small" variant="outlined">
              {{ formatCategory(selectedAchievement.category) }}
            </v-chip>
          </div>
        </v-card-text>
        
        <v-card-actions>
          <v-btn block variant="text" @click="showDetail = false">
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
interface Achievement {
  id: string
  name: string
  code: string
  description: string
  icon_url: string | null
  badge_color: string | null
  category: string
  points: number
  is_unlocked: boolean
  unlocked_at: string | null
}

interface Props {
  achievements: Achievement[]
  unlockedCount: number
}

const props = defineProps<Props>()

// State
const selectedCategory = ref('all')
const showDetail = ref(false)
const selectedAchievement = ref<Achievement | null>(null)

// Computed
const categories = computed(() => {
  const cats = new Set(props.achievements.map(a => a.category))
  return Array.from(cats).sort()
})

const filteredAchievements = computed(() => {
  if (selectedCategory.value === 'all') {
    return props.achievements
  }
  return props.achievements.filter(a => a.category === selectedCategory.value)
})

const totalPoints = computed(() => {
  return props.achievements
    .filter(a => a.is_unlocked)
    .reduce((sum, a) => sum + a.points, 0)
})

const progressPercent = computed(() => {
  if (props.achievements.length === 0) return 0
  return (props.unlockedCount / props.achievements.length) * 100
})

// Methods
function selectAchievement(achievement: Achievement) {
  selectedAchievement.value = achievement
  showDetail.value = true
}

function getBadgeStyle(achievement: Achievement) {
  if (!achievement.is_unlocked) {
    return {
      background: 'rgba(var(--v-theme-on-surface), 0.1)',
      opacity: 0.5
    }
  }
  
  const color = achievement.badge_color || getCategoryColor(achievement.category)
  return {
    background: `linear-gradient(135deg, ${color}, ${darkenColor(color)})`
  }
}

function getHeaderStyle(achievement: Achievement) {
  if (!achievement.is_unlocked) {
    return {
      background: 'linear-gradient(135deg, #424242, #212121)'
    }
  }
  
  const color = achievement.badge_color || getCategoryColor(achievement.category)
  return {
    background: `linear-gradient(135deg, ${color}, ${darkenColor(color)})`
  }
}

function getAchievementIcon(achievement: Achievement): string {
  // Map category to icons
  const categoryIcons: Record<string, string> = {
    skills: 'mdi-star-circle',
    training: 'mdi-school',
    attendance: 'mdi-calendar-check',
    performance: 'mdi-chart-line',
    tenure: 'mdi-clock-outline',
    special: 'mdi-trophy'
  }
  
  return categoryIcons[achievement.category] || 'mdi-medal'
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    skills: '#4CAF50',
    training: '#2196F3',
    attendance: '#00BCD4',
    performance: '#FF9800',
    tenure: '#9C27B0',
    special: '#FFD700'
  }
  return colors[category] || '#607D8B'
}

function darkenColor(hex: string): string {
  // Simple darken by reducing RGB values
  const rgb = parseInt(hex.slice(1), 16)
  const r = Math.max(0, (rgb >> 16) - 30)
  const g = Math.max(0, ((rgb >> 8) & 0x00FF) - 30)
  const b = Math.max(0, (rgb & 0x0000FF) - 30)
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`
}

function formatCategory(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}
</script>

<style scoped>
.trophy-case {
  padding: 16px;
}

.trophy-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 16px;
}

.trophy-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 8px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.trophy-item:hover {
  background: rgba(var(--v-theme-primary), 0.08);
  transform: translateY(-2px);
}

.trophy-item--locked {
  opacity: 0.6;
}

.trophy-item--unlocked .trophy-badge {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.trophy-badge {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.trophy-name {
  font-size: 0.7rem;
  font-weight: 500;
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.8);
  line-height: 1.2;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.unlock-check {
  position: absolute;
  top: 8px;
  right: 8px;
}

.achievement-detail .achievement-header {
  border-radius: 4px 4px 0 0;
}
</style>
