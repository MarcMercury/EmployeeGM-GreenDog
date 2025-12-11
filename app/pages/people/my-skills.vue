<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">My Skills</h1>
        <p class="text-body-1 text-grey-darken-1">
          Your personal skills scorecard and development tracker
        </p>
      </div>
      <div class="d-flex align-center gap-2">
        <v-chip color="primary" variant="flat">
          <v-icon start>mdi-star</v-icon>
          {{ totalSkills }} Skills
        </v-chip>
        <v-chip :color="overallScoreColor" variant="flat">
          <v-icon start>mdi-chart-line</v-icon>
          {{ overallScore }}% Proficiency
        </v-chip>
      </div>
    </div>

    <!-- Loading State -->
    <template v-if="loading">
      <v-row>
        <v-col v-for="i in 4" :key="i" cols="12" md="6">
          <v-card rounded="lg" class="mb-4">
            <v-card-title>
              <div class="skeleton-pulse" style="width: 150px; height: 20px; border-radius: 4px;"></div>
            </v-card-title>
            <v-card-text>
              <div v-for="j in 3" :key="j" class="d-flex align-center gap-3 mb-3">
                <div class="skeleton-pulse" style="width: 100%; height: 40px; border-radius: 4px;"></div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- Content -->
    <template v-else>
      <!-- Skills Summary Cards -->
      <v-row class="mb-6">
        <v-col cols="6" sm="3">
          <v-card rounded="lg" color="primary" variant="flat">
            <v-card-text class="text-center text-white">
              <v-icon size="32" class="mb-2 opacity-80">mdi-lightbulb</v-icon>
              <div class="text-h4 font-weight-bold">{{ totalSkills }}</div>
              <div class="text-body-2 opacity-80">Total Skills</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card rounded="lg" color="success" variant="flat">
            <v-card-text class="text-center text-white">
              <v-icon size="32" class="mb-2 opacity-80">mdi-medal</v-icon>
              <div class="text-h4 font-weight-bold">{{ masteredSkills }}</div>
              <div class="text-body-2 opacity-80">Mastered (5★)</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card rounded="lg" color="warning" variant="flat">
            <v-card-text class="text-center text-white">
              <v-icon size="32" class="mb-2 opacity-80">mdi-trending-up</v-icon>
              <div class="text-h4 font-weight-bold">{{ developingSkills }}</div>
              <div class="text-body-2 opacity-80">Developing</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card rounded="lg" color="info" variant="flat">
            <v-card-text class="text-center text-white">
              <v-icon size="32" class="mb-2 opacity-80">mdi-school</v-icon>
              <div class="text-h4 font-weight-bold">{{ learningSkills }}</div>
              <div class="text-body-2 opacity-80">Learning</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Skills by Category -->
      <v-row v-if="skillsByCategory.length > 0">
        <v-col v-for="category in skillsByCategory" :key="category.name" cols="12" md="6">
          <v-card rounded="lg" class="mb-4">
            <v-card-title class="d-flex align-center">
              <v-icon :color="getCategoryColor(category.name)" start>{{ getCategoryIcon(category.name) }}</v-icon>
              {{ category.name }}
              <v-spacer />
              <v-chip size="small" variant="flat" :color="getCategoryColor(category.name)">
                {{ category.avgLevel.toFixed(1) }} avg
              </v-chip>
            </v-card-title>

            <v-expansion-panels variant="accordion" class="px-4 pb-4">
              <v-expansion-panel v-for="skill in category.skills" :key="skill.id" elevation="0">
                <v-expansion-panel-title>
                  <div class="d-flex align-center justify-space-between flex-grow-1 pr-4">
                    <span>{{ skill.skill_library?.name || 'Unknown' }}</span>
                    <v-rating
                      :model-value="skill.level"
                      readonly
                      density="compact"
                      size="small"
                      color="amber"
                    />
                  </div>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <div class="text-body-2 text-grey mb-2">
                    {{ skill.skill_library?.description || 'No description available' }}
                  </div>
                  <div class="d-flex align-center justify-space-between">
                    <span class="text-caption">
                      <v-icon size="14" start>mdi-calendar</v-icon>
                      Last updated: {{ formatDate(skill.updated_at || skill.created_at) }}
                    </span>
                    <v-chip 
                      :color="getLevelColor(skill.level)" 
                      size="x-small"
                      variant="flat"
                    >
                      {{ getLevelLabel(skill.level) }}
                    </v-chip>
                  </div>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-card>
        </v-col>
      </v-row>

      <!-- Empty State -->
      <v-card v-else rounded="lg" class="text-center py-12">
        <v-icon size="64" color="grey-lighten-1">mdi-lightbulb-off</v-icon>
        <h3 class="text-h6 mt-4">No skills recorded yet</h3>
        <p class="text-grey mb-4">Your skills will appear here once they're assessed</p>
        <v-btn color="primary" variant="outlined" @click="navigateTo('/development')">
          Go to Development
        </v-btn>
      </v-card>

      <!-- Skill Radar Chart (Visual) -->
      <v-card v-if="skillsByCategory.length >= 3" rounded="lg" class="mt-6">
        <v-card-title>
          <v-icon start>mdi-radar</v-icon>
          Skills Overview
        </v-card-title>
        <v-card-text>
          <div class="d-flex flex-wrap justify-center gap-4">
            <div v-for="category in skillsByCategory" :key="category.name" class="text-center">
              <v-progress-circular
                :model-value="(category.avgLevel / 5) * 100"
                :color="getCategoryColor(category.name)"
                :size="100"
                :width="12"
              >
                <div>
                  <div class="text-h6 font-weight-bold">{{ category.avgLevel.toFixed(1) }}</div>
                  <div class="text-caption text-grey">/ 5</div>
                </div>
              </v-progress-circular>
              <div class="text-body-2 mt-2">{{ category.name }}</div>
              <div class="text-caption text-grey">{{ category.skills.length }} skills</div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

interface EmployeeSkill {
  id: string
  level: number
  created_at: string
  updated_at?: string
  skill_library?: {
    name: string
    category: string
    description?: string
  }
}

const client = useSupabaseClient()
const user = useSupabaseUser()

// State
const skills = ref<EmployeeSkill[]>([])
const loading = ref(true)

// Computed
const totalSkills = computed(() => skills.value.length)

const masteredSkills = computed(() => 
  skills.value.filter(s => s.level === 5).length
)

const developingSkills = computed(() => 
  skills.value.filter(s => s.level >= 3 && s.level < 5).length
)

const learningSkills = computed(() => 
  skills.value.filter(s => s.level < 3).length
)

const overallScore = computed(() => {
  if (skills.value.length === 0) return 0
  const avg = skills.value.reduce((sum, s) => sum + s.level, 0) / skills.value.length
  return Math.round(avg * 20)
})

const overallScoreColor = computed(() => {
  if (overallScore.value >= 80) return 'success'
  if (overallScore.value >= 60) return 'warning'
  return 'grey'
})

const skillsByCategory = computed(() => {
  const categories: Record<string, EmployeeSkill[]> = {}
  
  skills.value.forEach(skill => {
    const category = skill.skill_library?.category || 'Other'
    if (!categories[category]) {
      categories[category] = []
    }
    categories[category].push(skill)
  })
  
  return Object.entries(categories)
    .map(([name, skills]) => ({
      name,
      skills: skills.sort((a, b) => b.level - a.level),
      avgLevel: skills.reduce((sum, s) => sum + s.level, 0) / skills.length
    }))
    .sort((a, b) => b.avgLevel - a.avgLevel)
})

// Methods
const getCategoryIcon = (category: string) => {
  const icons: Record<string, string> = {
    'Technical': 'mdi-wrench',
    'Service': 'mdi-account-heart',
    'Leadership': 'mdi-account-star',
    'Communication': 'mdi-message',
    'Safety': 'mdi-shield-check',
    'Equipment': 'mdi-tools',
    'Other': 'mdi-star'
  }
  return icons[category] || 'mdi-star'
}

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    'Technical': 'blue',
    'Service': 'pink',
    'Leadership': 'purple',
    'Communication': 'teal',
    'Safety': 'orange',
    'Equipment': 'brown',
    'Other': 'grey'
  }
  return colors[category] || 'primary'
}

const getLevelColor = (level: number) => {
  if (level === 5) return 'success'
  if (level >= 3) return 'warning'
  return 'info'
}

const getLevelLabel = (level: number) => {
  const labels: Record<number, string> = {
    1: 'Novice',
    2: 'Beginner',
    3: 'Intermediate',
    4: 'Advanced',
    5: 'Expert'
  }
  return labels[level] || 'Unknown'
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const fetchSkills = async () => {
  loading.value = true
  try {
    // Get current user's employee record
    const { data: employee } = await client
      .from('employees')
      .select('id')
      .eq('email', user.value?.email)
      .single()
    
    if (!employee) {
      loading.value = false
      return
    }
    
    // Fetch skills
    const { data, error } = await client
      .from('employee_skills')
      .select(`
        *,
        skill_library:skill_id(name, category, description)
      `)
      .eq('employee_id', employee.id)
      .order('level', { ascending: false })
    
    if (error) throw error
    skills.value = data || []
  } catch (error) {
    console.error('Error fetching skills:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchSkills()
})
</script>

<style scoped>
.skeleton-pulse {
  background: linear-gradient(
    90deg,
    rgba(var(--v-theme-surface-variant), 0.3) 0%,
    rgba(var(--v-theme-surface-variant), 0.5) 50%,
    rgba(var(--v-theme-surface-variant), 0.3) 100%
  );
  background-size: 200% 100%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
