<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">{{ isViewingOther ? viewingEmployeeName + "'s Skills" : 'My Skills' }}</h1>
        <p class="text-body-1 text-grey-darken-1">
          {{ isViewingOther 
            ? (isAdmin ? 'Click any skill rating to edit' : 'View skill ratings and proficiency') 
            : 'Your personal skills scorecard and development tracker' 
          }}
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
              <div class="text-h4 font-weight-bold">{{ totalSkillsAvailable }}</div>
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
          <v-card rounded="lg" color="grey-darken-1" variant="flat">
            <v-card-text class="text-center text-white">
              <v-icon size="32" class="mb-2 opacity-80">mdi-book-open-blank-variant</v-icon>
              <div class="text-h4 font-weight-bold">{{ unratedSkills }}</div>
              <div class="text-body-2 opacity-80">Not Rated</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Skills by Category - Collapsible Sections -->
      <v-expansion-panels v-if="hasSkillsByCategory" variant="accordion" multiple v-model="openPanels" class="mb-6">
        <v-expansion-panel v-for="category in skillsByCategory" :key="category.name" class="mb-2">
          <v-expansion-panel-title>
            <div class="d-flex align-center flex-grow-1">
              <v-icon :color="getCategoryColor(category.name)" class="mr-3">{{ getCategoryIcon(category.name) }}</v-icon>
              <span class="text-subtitle-1 font-weight-bold">{{ category.name }}</span>
              <v-spacer />
              <v-chip size="small" variant="flat" :color="getCategoryColor(category.name)" class="mr-2">
                {{ category.skills.length }} skill{{ category.skills.length !== 1 ? 's' : '' }}
              </v-chip>
              <v-chip size="small" variant="tonal" color="primary">
                {{ category.ratedAvg > 0 ? category.ratedAvg.toFixed(1) : '0.0' }} avg
              </v-chip>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-list density="compact" class="bg-transparent">
              <v-list-item
                v-for="skill in category.skills"
                :key="skill.skillId"
                class="rounded mb-1 px-0"
              >
                <template #prepend>
                  <v-avatar size="32" :color="getLevelColor(skill.rating)" variant="tonal">
                    <span class="text-caption font-weight-bold">{{ skill.rating }}</span>
                  </v-avatar>
                </template>
                
                <v-list-item-title>
                  {{ skill.name }}
                  <v-chip v-if="skill.rating === 0" size="x-small" variant="outlined" color="grey" class="ml-2">
                    Not Rated
                  </v-chip>
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ skill.description || 'No description available' }}
                </v-list-item-subtitle>
                
                <template #append>
                  <div class="d-flex align-center gap-2">
                    <v-rating
                      :model-value="skill.rating"
                      :readonly="!canEditSkills"
                      :hover="canEditSkills"
                      density="compact"
                      size="x-small"
                      color="amber"
                      empty-icon="mdi-star-outline"
                      full-icon="mdi-star"
                      @update:model-value="(val) => updateSkillRating(skill, val)"
                    />
                    <v-chip 
                      v-if="skill.rating > 0"
                      :color="getLevelColor(skill.rating)" 
                      size="x-small"
                      variant="flat"
                    >
                      {{ getLevelLabel(skill.rating) }}
                    </v-chip>
                    <v-icon v-if="canEditSkills" size="14" color="grey" class="ml-1">mdi-pencil</v-icon>
                  </div>
                </template>
              </v-list-item>
            </v-list>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <!-- Empty State -->
      <v-card v-else rounded="lg" class="text-center py-12">
        <v-icon size="64" color="grey-lighten-1">mdi-book-open-variant</v-icon>
        <h3 class="text-h6 mt-4">Loading Skills Library...</h3>
        <p class="text-grey mb-4">Your skills are being loaded</p>
      </v-card>

      <!-- Skill Radar Chart (Visual) -->
      <v-card v-if="hasMultipleCategories" rounded="lg" class="mt-6">
        <v-card-title>
          <v-icon start>mdi-radar</v-icon>
          Skills Overview
        </v-card-title>
        <v-card-text>
          <div class="d-flex flex-wrap justify-center gap-4">
            <div v-for="category in skillsByCategory" :key="category.name" class="text-center">
              <v-progress-circular
                :model-value="(category.ratedAvg / 5) * 100"
                :color="getCategoryColor(category.name)"
                :size="100"
                :width="12"
              >
                <div>
                  <div class="text-h6 font-weight-bold">{{ category.ratedAvg > 0 ? category.ratedAvg.toFixed(1) : '0.0' }}</div>
                  <div class="text-caption text-grey">/ 5</div>
                </div>
              </v-progress-circular>
              <div class="text-body-2 mt-2">{{ category.name }}</div>
              <div class="text-caption text-grey">
                {{ category.skills.filter(s => s.rating > 0).length }} / {{ category.skills.length }} rated
              </div>
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

interface SkillLibraryItem {
  id: string
  name: string
  category: string
  description?: string
}

interface EmployeeSkillRating {
  skill_id: string
  rating: number
}

interface MergedSkill {
  skillId: string
  name: string
  category: string
  description?: string
  rating: number
}

const client = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()
const authStore = useAuthStore()
const uiStore = useUIStore()

// Check if viewing another employee's skills (via query param)
const viewingEmployeeId = computed(() => route.query.employee as string | undefined)
const isViewingOther = computed(() => !!viewingEmployeeId.value)
const isAdmin = computed(() => authStore.isAdmin)
const canEditSkills = computed(() => isAdmin.value && isViewingOther.value)

// State
const allSkills = ref<SkillLibraryItem[]>([])
const employeeRatings = ref<Record<string, number>>({})
const loading = ref(true)
const openPanels = ref<number[]>([]) // All panels collapsed by default
const currentEmployeeId = ref<string | null>(null)
const viewingEmployeeName = ref('')

// Computed
const mergedSkills = computed(() => {
  return allSkills.value.map(skill => ({
    skillId: skill.id,
    name: skill.name,
    category: skill.category,
    description: skill.description,
    rating: employeeRatings.value[skill.id] || 0
  }))
})

const totalSkillsAvailable = computed(() => mergedSkills.value.length)
const totalSkills = computed(() => ratedSkills.value.length)

const ratedSkills = computed(() => mergedSkills.value.filter(s => s.rating > 0))

const masteredSkills = computed(() => 
  ratedSkills.value.filter(s => s.rating === 5).length
)

const developingSkills = computed(() => 
  ratedSkills.value.filter(s => s.rating >= 3 && s.rating < 5).length
)

const unratedSkills = computed(() => 
  mergedSkills.value.filter(s => s.rating === 0).length
)

const overallScore = computed(() => {
  const rated = ratedSkills.value
  if (rated.length === 0) return 0
  const avg = rated.reduce((sum, s) => sum + s.rating, 0) / rated.length
  return Math.round(avg * 20)
})

const overallScoreColor = computed(() => {
  if (overallScore.value >= 80) return 'success'
  if (overallScore.value >= 60) return 'warning'
  return 'grey'
})

const skillsByCategory = computed(() => {
  const categories: Record<string, MergedSkill[]> = {}
  
  mergedSkills.value.forEach(skill => {
    const category = skill.category || 'Other'
    if (!categories[category]) {
      categories[category] = []
    }
    categories[category].push(skill)
  })
  
  return Object.entries(categories)
    .map(([name, skills]) => {
      const ratedInCategory = skills.filter(s => s.rating > 0)
      return {
        name,
        skills: skills.sort((a, b) => {
          // Sort: rated skills first (by rating desc), then unrated alphabetically
          if (a.rating === 0 && b.rating === 0) return a.name.localeCompare(b.name)
          if (a.rating === 0) return 1
          if (b.rating === 0) return -1
          return b.rating - a.rating
        }),
        ratedAvg: ratedInCategory.length > 0 
          ? ratedInCategory.reduce((sum, s) => sum + s.rating, 0) / ratedInCategory.length 
          : 0
      }
    })
    .sort((a, b) => b.ratedAvg - a.ratedAvg)
})

const hasSkillsByCategory = computed(() => skillsByCategory.value.length > 0)
const hasMultipleCategories = computed(() => skillsByCategory.value.length >= 3)

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
    let employeeId: string | null = null
    
    // If viewing another employee (admin viewing team member)
    if (viewingEmployeeId.value) {
      employeeId = viewingEmployeeId.value
      currentEmployeeId.value = employeeId
      
      // Fetch employee name for display
      const { data: empData } = await client
        .from('employees')
        .select('first_name, last_name')
        .eq('id', employeeId)
        .single()
      
      if (empData) {
        viewingEmployeeName.value = `${empData.first_name} ${empData.last_name}`
      }
    } else {
      // Get current user's employee record
      const email = user.value?.email
      if (!email) {
        loading.value = false
        return
      }
      
      const { data: employee } = await client
        .from('employees')
        .select('id')
        .eq('email_work', email)
        .single() as { data: { id: string } | null }
      
      employeeId = employee?.id || null
      currentEmployeeId.value = employeeId
    }
    
    // Fetch ALL skills from library
    const { data: skillsData, error: skillsError } = await client
      .from('skill_library')
      .select('id, name, category, description')
      .order('category')
      .order('name')
    
    if (skillsError) throw skillsError
    allSkills.value = skillsData || []
    
    // Fetch employee's skill levels if they have an employee record
    if (employeeId) {
      const { data: ratingsData, error: ratingsError } = await client
        .from('employee_skills')
        .select('skill_id, level')
        .eq('employee_id', employeeId)
      
      if (ratingsError) throw ratingsError
      
      // Build lookup map
      const ratingsMap: Record<string, number> = {}
      ratingsData?.forEach((r: any) => {
        ratingsMap[r.skill_id] = r.level || 0
      })
      employeeRatings.value = ratingsMap
    }
    
    // Panels start collapsed by default (openPanels is already empty)
  } catch (error) {
    console.error('Error fetching skills:', error)
  } finally {
    loading.value = false
  }
}

// Admin function to update a skill rating
async function updateSkillRating(skill: MergedSkill, newLevel: number) {
  if (!canEditSkills.value || !currentEmployeeId.value) return
  
  try {
    // Upsert the skill rating
    const { error } = await client
      .from('employee_skills')
      .upsert({
        employee_id: currentEmployeeId.value,
        skill_id: skill.skillId,
        level: newLevel,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'employee_id,skill_id'
      })
    
    if (error) throw error
    
    // Update local state
    employeeRatings.value[skill.skillId] = newLevel
    
    uiStore.showSuccess(`Updated ${skill.name} to Level ${newLevel}`)
  } catch (err) {
    console.error('Error updating skill rating:', err)
    uiStore.showError('Failed to update skill rating')
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
