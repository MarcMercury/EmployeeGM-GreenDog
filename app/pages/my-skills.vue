<template>
  <div class="my-skills-page">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-6">
    <div>
      <h1 class="text-h4 font-weight-bold mb-1">My Skills</h1>
      <p class="text-body-1 text-grey-darken-1">
        {{ showAllSkills ? `Viewing all ${totalLibrarySkills} skills` : `Your ${totalSkills} assigned skills` }} across {{ totalCategories }} categories
      </p>
      </div>
      <v-btn
        color="primary"
        prepend-icon="mdi-target"
        @click="showGoalDialog = true"
      >
        Set Learning Goal
      </v-btn>
    </div>

    <!-- Stats Row -->
    <v-row class="mb-6">
    <v-col cols="6" sm="3">
      <v-card variant="tonal" color="primary" rounded="lg">
        <v-card-text class="text-center">
        <v-icon size="24" class="mb-1">mdi-star</v-icon>
        <div class="text-h5 font-weight-bold">{{ totalSkills }}</div>
        <div class="text-caption">Total Skills</div>
        </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="6" sm="3">
      <v-card variant="tonal" color="success" rounded="lg">
        <v-card-text class="text-center">
        <v-icon size="24" class="mb-1">mdi-school</v-icon>
        <div class="text-h5 font-weight-bold">{{ mentorSkillsCount }}</div>
        <div class="text-caption">Mentor Level</div>
        </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="6" sm="3">
      <v-card variant="tonal" color="warning" rounded="lg">
        <v-card-text class="text-center">
        <v-icon size="24" class="mb-1">mdi-target</v-icon>
        <div class="text-h5 font-weight-bold">{{ goalSkillsCount }}</div>
        <div class="text-caption">Learning Goals</div>
        </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="6" sm="3">
      <v-card variant="tonal" color="info" rounded="lg">
        <v-card-text class="text-center">
        <v-icon size="24" class="mb-1">mdi-trending-up</v-icon>
        <div class="text-h5 font-weight-bold">{{ averageLevel.toFixed(1) }}</div>
        <div class="text-caption">Avg Level</div>
        </v-card-text>
      </v-card>
    </v-col>
    </v-row>

    <!-- Filters Section -->
    <v-card class="mb-6" variant="outlined" rounded="lg">
    <v-card-text>
      <v-row dense align="center">
        <v-col cols="12" sm="4">
        <v-text-field
          v-model="searchQuery"
          prepend-inner-icon="mdi-magnify"
          label="Search skills..."
          variant="outlined"
          density="compact"
          hide-details
          clearable
        />
        </v-col>
        <v-col cols="12" sm="3">
        <v-select
          v-model="filterLevel"
          :items="levelFilterOptions"
          label="Skill Level"
          variant="outlined"
          density="compact"
          hide-details
          clearable
        />
        </v-col>
        <v-col cols="12" sm="3">
        <v-select
          v-model="filterCategory"
          :items="allCategories"
          label="Category"
          variant="outlined"
          density="compact"
          hide-details
          clearable
        />
        </v-col>
        <v-col cols="12" sm="2">
        <v-checkbox
          v-model="showGoalsOnly"
          label="Goals Only"
          density="compact"
          hide-details
          color="warning"
        />
        </v-col>
        <v-col cols="12" sm="2">
        <v-checkbox
          v-model="showAllSkills"
          label="Show All Skills"
          density="compact"
          hide-details
          color="primary"
        />
        </v-col>
      </v-row>
      <div v-if="hasActiveFilters" class="d-flex align-center gap-2 mt-3">
        <span class="text-caption text-grey">Active filters:</span>
        <v-chip
        v-if="searchQuery"
        size="small"
        closable
        @click:close="searchQuery = ''"
        >
        Search: "{{ searchQuery }}"
        </v-chip>
        <v-chip
        v-if="filterLevel !== null"
        size="small"
        closable
        @click:close="filterLevel = null"
        >
        Level: {{ levelFilterOptions.find(l => l.value === filterLevel)?.title }}
        </v-chip>
        <v-chip
        v-if="filterCategory"
        size="small"
        closable
        @click:close="filterCategory = null"
        >
        {{ filterCategory }}
        </v-chip>
        <v-chip
        v-if="showGoalsOnly"
        size="small"
        color="warning"
        closable
        @click:close="showGoalsOnly = false"
        >
        Goals Only
        </v-chip>
        <v-btn
        variant="text"
        size="small"
        color="primary"
        @click="clearFilters"
        >
        Clear All
        </v-btn>
      </div>
    </v-card-text>
    </v-card>

    <!-- Loading State -->
    <div v-if="loading" class="d-flex justify-center py-12">
    <v-progress-circular indeterminate color="primary" size="48" />
    </div>

    <!-- Empty State -->
    <v-card v-else-if="hasNoSkills" class="text-center pa-8">
    <v-icon size="64" color="grey-lighten-1">mdi-star-outline</v-icon>
    <h3 class="text-h6 mt-4">No skills assigned yet</h3>
    <p class="text-body-2 text-grey">Contact your manager to assign skills or set learning goals</p>
    </v-card>

    <!-- No Results State (with filters) -->
    <v-card v-else-if="hasNoFilteredCategories" class="text-center pa-8">
    <v-icon size="64" color="grey-lighten-1">mdi-filter-off</v-icon>
    <h3 class="text-h6 mt-4">No skills match your filters</h3>
    <p class="text-body-2 text-grey mb-4">Try adjusting your search or filter criteria</p>
    <v-btn color="primary" variant="outlined" @click="clearFilters">Clear Filters</v-btn>
    </v-card>

    <!-- Skills by Category (Collapsible) -->
    <template v-else>
    <v-expansion-panels v-model="expandedPanels" multiple>
      <v-expansion-panel
        v-for="category in filteredCategories"
        :key="category"
        rounded="lg"
        class="mb-3"
      >
        <v-expansion-panel-title>
        <div class="d-flex align-center gap-3 w-100">
          <v-icon :color="getCategoryColor(category)">{{ getCategoryIcon(category) }}</v-icon>
          <span class="text-subtitle-1 font-weight-medium">{{ category }}</span>
          <v-spacer />
          <v-chip size="small" variant="tonal" :color="getCategoryColor(category)">
            {{ getFilteredSkillsByCategory(category).length }} skills
          </v-chip>
        </div>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
        <v-list density="compact" class="bg-transparent">
          <v-list-item
            v-for="skill in getFilteredSkillsByCategory(category)"
            :key="skill.id"
            class="py-3"
          >
            <template #prepend>
              <v-avatar :color="getLevelColor(skill.level)" size="32">
                <span class="text-caption font-weight-bold text-white">{{ skill.level }}</span>
              </v-avatar>
            </template>

            <v-list-item-title class="d-flex align-center gap-2">
              {{ skill.name }}
              <v-chip
                v-if="skill.is_goal"
                size="x-small"
                color="warning"
                variant="flat"
              >
                <v-icon start size="10">mdi-target</v-icon>
                Goal
              </v-chip>
              <v-chip
                v-if="skill.level >= 5"
                size="x-small"
                color="success"
                variant="flat"
              >
                <v-icon start size="10">mdi-school</v-icon>
                Mentor
              </v-chip>
            </v-list-item-title>

            <v-list-item-subtitle v-if="skill.description">
              {{ skill.description }}
            </v-list-item-subtitle>

            <template #append>
              <div class="d-flex align-center gap-2">
                <v-rating
                  :model-value="skill.level"
                  readonly
                  density="compact"
                  size="small"
                  color="amber"
                  :length="5"
                />
                <v-chip size="x-small" :color="getLevelColor(skill.level)" variant="outlined">
                  {{ getLevelLabel(skill.level) }}
                </v-chip>
              </div>
            </template>
          </v-list-item>
        </v-list>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
    </template>

    <!-- Set Goal Dialog -->
    <v-dialog v-model="showGoalDialog" max-width="500">
    <v-card>
      <v-card-title>Set Learning Goal</v-card-title>
      <v-card-text>
        <p class="text-body-2 text-grey mb-4">
        Select a skill you'd like to learn or improve. This will be visible to mentors.
        </p>
        <v-autocomplete
        v-model="selectedGoalSkill"
        :items="availableGoalSkills"
        item-title="name"
        item-value="id"
        label="Select Skill"
        variant="outlined"
        :loading="loadingSkillLibrary"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="showGoalDialog = false">Cancel</v-btn>
        <v-btn color="primary" @click="addGoalSkill" :loading="savingGoal" :disabled="!selectedGoalSkill">
        Set as Goal
        </v-btn>
      </v-card-actions>
    </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
    {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

useHead({
  title: 'My Skills'
})

const supabase = useSupabaseClient()
const userStore = useUserStore()

// State
const loading = ref(true)
const mySkills = ref<any[]>([])
const allSkillLibrary = ref<any[]>([])
const expandedPanels = ref<number[]>([])
const showGoalDialog = ref(false)
const selectedGoalSkill = ref<string | null>(null)
const availableGoalSkills = ref<any[]>([])
const loadingSkillLibrary = ref(false)
const savingGoal = ref(false)
const showAllSkills = ref(true)  // Toggle to show all skills (default true)

// Filter state
const searchQuery = ref('')
const filterLevel = ref<number | null>(null)
const filterCategory = ref<string | null>(null)
const showGoalsOnly = ref(false)

const snackbar = reactive({
  show: false,
  message: '',
  color: 'success'
})

// Level filter options
const levelFilterOptions = [
  { title: 'Untrained (0)', value: 0 },
  { title: 'Learning (1)', value: 1 },
  { title: 'Developing (2)', value: 2 },
  { title: 'Proficient (3)', value: 3 },
  { title: 'Expert (4)', value: 4 },
  { title: 'Mentor (5)', value: 5 }
]

// Computed - with defensive checks to prevent undefined errors
// When showAllSkills is true, merge all library skills with employee's levels
const displayedSkills = computed(() => {
  if (!showAllSkills.value) {
    // Only show skills the employee has
    return mySkills.value || []
  }
  
  // Merge all skills from library with employee's skill levels
  const employeeSkillMap = new Map(
    (mySkills.value || []).map((s: any) => [s.skill_id, s])
  )
  
  return (allSkillLibrary.value || []).map((libSkill: any) => {
    const empSkill = employeeSkillMap.get(libSkill.id)
    return {
      id: empSkill?.id || `lib-${libSkill.id}`,
      skill_id: libSkill.id,
      level: empSkill?.level || 0,
      is_goal: empSkill?.is_goal || false,
      name: libSkill.name,
      category: libSkill.category || 'Other',
      description: libSkill.description
    }
  })
})

const totalSkills = computed(() => (displayedSkills.value || []).filter(s => s.level > 0).length)
const totalLibrarySkills = computed(() => (allSkillLibrary.value || []).length)

const mentorSkillsCount = computed(() => 
  (displayedSkills.value || []).filter(s => s.level >= 5).length
)

const goalSkillsCount = computed(() => 
  (displayedSkills.value || []).filter(s => s.is_goal).length
)

const averageLevel = computed(() => {
  const skills = (displayedSkills.value || []).filter(s => s.level > 0)
  if (skills.length === 0) return 0
  const sum = skills.reduce((acc, s) => acc + (s.level || 0), 0)
  return sum / skills.length
})

const categories = computed(() => {
  const skills = displayedSkills.value || []
  const cats = [...new Set(skills.map(s => s.category || 'Other'))]
  return cats.sort()
})

// Total categories count (safe accessor)
const totalCategories = computed(() => (categories.value || []).length)

// All categories for filter dropdown
const allCategories = computed(() => categories.value || [])

// Check for empty skills (safe accessor)
const hasNoSkills = computed(() => (displayedSkills.value || []).length === 0)

// Check if any filters are active
const hasActiveFilters = computed(() => {
  return !!searchQuery.value || filterLevel.value !== null || !!filterCategory.value || showGoalsOnly.value
})

// Filtered skills based on search and filters
const filteredSkills = computed(() => {
  let result = displayedSkills.value || []

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(s => 
      s.name?.toLowerCase().includes(query) ||
      s.category?.toLowerCase().includes(query) ||
      s.description?.toLowerCase().includes(query)
    )
  }

  // Filter by level
  if (filterLevel.value !== null) {
    result = result.filter(s => s.level === filterLevel.value)
  }

  // Filter by category
  if (filterCategory.value) {
    result = result.filter(s => s.category === filterCategory.value)
  }

  // Filter by goals only
  if (showGoalsOnly.value) {
    result = result.filter(s => s.is_goal)
  }

  return result
})

// Get unique categories from filtered skills
const filteredCategories = computed(() => {
  const skills = filteredSkills.value || []
  const cats = [...new Set(skills.map(s => s.category || 'Other'))]
  return cats.sort()
})

// Check for empty filtered categories (must be after filteredCategories is defined)
const hasNoFilteredCategories = computed(() => (filteredCategories.value || []).length === 0)

// Methods
function getSkillsByCategory(category: string) {
  return (displayedSkills.value || [])
    .filter(s => (s.category || 'Other') === category)
    .sort((a, b) => (b.level || 0) - (a.level || 0))
}

function getFilteredSkillsByCategory(category: string) {
  return (filteredSkills.value || [])
    .filter(s => (s.category || 'Other') === category)
    .sort((a, b) => (b.level || 0) - (a.level || 0))
}

function clearFilters() {
  searchQuery.value = ''
  filterLevel.value = null
  filterCategory.value = null
  showGoalsOnly.value = false
}

function getCategoryColor(category: string) {
  const colors: Record<string, string> = {
    'Clinical Skills': 'red',
    'Diagnostics & Imaging': 'blue',
    'Surgical & Procedural': 'purple',
    'Emergency & Critical Care': 'orange',
    'Pharmacy & Treatment': 'green',
    'Specialty Skills': 'teal',
    'Client Service': 'indigo',
    'Operations & Admin': 'amber',
    'HR / People Ops': 'pink',
    'Practice Management': 'cyan',
    'Training & Education': 'deep-purple',
    'Leadership Skills': 'deep-orange',
    'Financial Skills': 'lime',
    'Inventory Skills': 'brown',
    'Facilities Skills': 'blue-grey',
    'Technology Skills': 'light-blue',
    'Soft Skills': 'purple',
    'Gameplay Attributes': 'success',
    'Creative / Marketing': 'pink',
    'Legal / Compliance': 'grey',
    'Remote Work Skills': 'primary',
    'Clinical': 'red',
    'Technical': 'blue',
    'Administrative': 'amber',
    'Medical': 'green',
    'Safety': 'orange',
    'Other': 'grey'
  }
  return colors[category] || 'primary'
}

function getCategoryIcon(category: string) {
  const icons: Record<string, string> = {
    'Clinical Skills': 'mdi-stethoscope',
    'Diagnostics & Imaging': 'mdi-microscope',
    'Surgical & Procedural': 'mdi-hospital-box',
    'Emergency & Critical Care': 'mdi-ambulance',
    'Pharmacy & Treatment': 'mdi-pill',
    'Specialty Skills': 'mdi-medal',
    'Client Service': 'mdi-account-heart',
    'Operations & Admin': 'mdi-clipboard-list',
    'HR / People Ops': 'mdi-account-group',
    'Practice Management': 'mdi-office-building',
    'Training & Education': 'mdi-school',
    'Leadership Skills': 'mdi-crown',
    'Financial Skills': 'mdi-currency-usd',
    'Inventory Skills': 'mdi-package-variant',
    'Facilities Skills': 'mdi-tools',
    'Technology Skills': 'mdi-laptop',
    'Soft Skills': 'mdi-account-voice',
    'Gameplay Attributes': 'mdi-gamepad-variant',
    'Creative / Marketing': 'mdi-palette',
    'Legal / Compliance': 'mdi-scale-balance',
    'Remote Work Skills': 'mdi-home-city',
    'Clinical': 'mdi-stethoscope',
    'Technical': 'mdi-cog',
    'Soft Skills': 'mdi-account-group',
    'Administrative': 'mdi-file-document',
    'Medical': 'mdi-medical-bag',
    'Safety': 'mdi-shield-check',
    'Other': 'mdi-star'
  }
  return icons[category] || 'mdi-star'
}

function getLevelColor(level: number) {
  if (level >= 5) return 'success'
  if (level >= 4) return 'teal'
  if (level >= 3) return 'primary'
  if (level >= 2) return 'warning'
  if (level >= 1) return 'orange'
  return 'grey'  // Level 0 - untrained
}

function getLevelLabel(level: number) {
  if (level >= 5) return 'Mentor'
  if (level >= 4) return 'Expert'
  if (level >= 3) return 'Proficient'
  if (level >= 2) return 'Developing'
  if (level >= 1) return 'Learning'
  return 'New'
}

async function fetchMySkills() {
  loading.value = true
  try {
    // First, load all skills from the library
    const { data: libraryData, error: libraryError } = await supabase
      .from('skill_library')
      .select('id, name, category, description')
      .order('category')
      .order('name')
    
    if (libraryError) {
      console.error('[MySkills] Error loading skill library:', libraryError)
    } else {
      allSkillLibrary.value = libraryData || []
    }
    
    const employeeId = userStore.employee?.id
    if (!employeeId) {
    // No employee record - this is a valid state, not an error
    console.log('[MySkills] No employee ID found, user may not have an employee record')
    mySkills.value = []
    loading.value = false
    return
    }

    const { data, error } = await supabase
    .from('employee_skills')
    .select(`
      id,
      level,
      is_goal,
      skill:skill_library(id, name, category, description)
    `)
    .eq('employee_id', employeeId)
    .order('level', { ascending: false })

    if (error) {
    console.error('[MySkills] Supabase error:', error.message, error.code, error.details)
    throw error
    }

    mySkills.value = (data || []).map((s: any) => ({
    id: s.id,
    skill_id: s.skill?.id,
    level: s.level || 0,
    is_goal: s.is_goal || false,
    name: s.skill?.name || 'Unknown',
    category: s.skill?.category || 'Other',
    description: s.skill?.description
    }))

    // Expand first 2 categories by default
    expandedPanels.value = [0, 1]
  } catch (err: any) {
    console.error('[MySkills] Error fetching skills:', err)
    snackbar.message = err?.message || 'Failed to load skills'
    snackbar.color = 'error'
    snackbar.show = true
  } finally {
    loading.value = false
  }
}

async function loadSkillLibrary() {
  loadingSkillLibrary.value = true
  try {
    const { data, error } = await supabase
    .from('skill_library')
    .select('id, name, category')
    .order('category')
    .order('name')

    if (error) throw error

    // Filter out skills user already has as goals
    const existingSkillIds = new Set(mySkills.value.map((s: any) => s.skill_id))
    availableGoalSkills.value = (data || []).filter((s: any) => !existingSkillIds.has(s.id))
  } catch (err) {
    console.error('Error loading skill library:', err)
  } finally {
    loadingSkillLibrary.value = false
  }
}

async function addGoalSkill() {
  if (!selectedGoalSkill.value) return
  
  savingGoal.value = true
  try {
    const employeeId = userStore.employee?.id
    if (!employeeId) throw new Error('No employee ID')

    // Check if skill already exists for this employee
    const { data: existing } = await supabase
    .from('employee_skills')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('skill_id', selectedGoalSkill.value)
    .single() as { data: { id: string } | null }

    if (existing) {
    // Update existing to mark as goal
    const { error: updateError } = await (supabase as any)
      .from('employee_skills')
      .update({ is_goal: true })
      .eq('id', existing.id)
    if (updateError) throw updateError
    } else {
    // Create new skill with is_goal = true
    const { error: insertError } = await (supabase as any)
      .from('employee_skills')
      .insert({
        employee_id: employeeId,
        skill_id: selectedGoalSkill.value,
        level: 0,
        is_goal: true
      })
    if (insertError) throw insertError
    }

    snackbar.message = 'Learning goal added!'
    snackbar.color = 'success'
    snackbar.show = true
    
    showGoalDialog.value = false
    selectedGoalSkill.value = null
    await fetchMySkills()
  } catch (err) {
    console.error('Error adding goal:', err)
    snackbar.message = 'Failed to add goal'
    snackbar.color = 'error'
    snackbar.show = true
  } finally {
    savingGoal.value = false
  }
}

// Watch for dialog open to load skill library
watch(showGoalDialog, (open) => {
  if (open) {
    loadSkillLibrary()
  }
})

// Initialize
onMounted(async () => {
  try {
    await userStore.fetchUserData()
    await fetchMySkills()
  } catch (err) {
    console.error('[MySkills] Error during initialization:', err)
    loading.value = false
    snackbar.message = 'Failed to initialize page'
    snackbar.color = 'error'
    snackbar.show = true
  }
})
</script>

<style scoped>
.my-skills-page {
  max-width: 1200px;
}
</style>
