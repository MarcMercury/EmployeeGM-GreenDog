<template>
  <div class="my-skills-page">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">My Skills</h1>
        <p class="text-body-1 text-grey-darken-1">
          Your complete skill profile with {{ totalSkills }} skills across {{ categories.length }} categories
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

    <!-- Loading State -->
    <div v-if="loading" class="d-flex justify-center py-12">
      <v-progress-circular indeterminate color="primary" size="48" />
    </div>

    <!-- Empty State -->
    <v-card v-else-if="mySkills.length === 0" class="text-center pa-8">
      <v-icon size="64" color="grey-lighten-1">mdi-star-outline</v-icon>
      <h3 class="text-h6 mt-4">No skills assigned yet</h3>
      <p class="text-body-2 text-grey">Contact your manager to assign skills or set learning goals</p>
    </v-card>

    <!-- Skills by Category (Collapsible) -->
    <template v-else>
      <v-expansion-panels v-model="expandedPanels" multiple>
        <v-expansion-panel
          v-for="category in categories"
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
                {{ getSkillsByCategory(category).length }} skills
              </v-chip>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-list density="compact" class="bg-transparent">
              <v-list-item
                v-for="skill in getSkillsByCategory(category)"
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
const expandedPanels = ref<number[]>([])
const showGoalDialog = ref(false)
const selectedGoalSkill = ref<string | null>(null)
const availableGoalSkills = ref<any[]>([])
const loadingSkillLibrary = ref(false)
const savingGoal = ref(false)

const snackbar = reactive({
  show: false,
  message: '',
  color: 'success'
})

// Computed
const totalSkills = computed(() => mySkills.value.length)

const mentorSkillsCount = computed(() => 
  mySkills.value.filter(s => s.level >= 5).length
)

const goalSkillsCount = computed(() => 
  mySkills.value.filter(s => s.is_goal).length
)

const averageLevel = computed(() => {
  if (mySkills.value.length === 0) return 0
  const sum = mySkills.value.reduce((acc, s) => acc + (s.level || 0), 0)
  return sum / mySkills.value.length
})

const categories = computed(() => {
  const cats = [...new Set(mySkills.value.map(s => s.category || 'Other'))]
  return cats.sort()
})

// Methods
function getSkillsByCategory(category: string) {
  return mySkills.value
    .filter(s => (s.category || 'Other') === category)
    .sort((a, b) => (b.level || 0) - (a.level || 0))
}

function getCategoryColor(category: string) {
  const colors: Record<string, string> = {
    'Clinical': 'red',
    'Technical': 'blue',
    'Soft Skills': 'purple',
    'Administrative': 'amber',
    'Medical': 'green',
    'Safety': 'orange',
    'Other': 'grey'
  }
  return colors[category] || 'primary'
}

function getCategoryIcon(category: string) {
  const icons: Record<string, string> = {
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
  return 'orange'
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
    const employeeId = userStore.employee?.id
    if (!employeeId) return

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

    if (error) throw error

    mySkills.value = (data || []).map((s: any) => ({
      id: s.id,
      skill_id: s.skill?.id,
      level: s.level,
      is_goal: s.is_goal,
      name: s.skill?.name || 'Unknown',
      category: s.skill?.category || 'Other',
      description: s.skill?.description
    }))

    // Expand first 2 categories by default
    expandedPanels.value = [0, 1]
  } catch (err) {
    console.error('Error fetching skills:', err)
    snackbar.message = 'Failed to load skills'
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
    const existingSkillIds = new Set(mySkills.value.map(s => s.skill_id))
    availableGoalSkills.value = (data || []).filter(s => !existingSkillIds.has(s.id))
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
      .single()

    if (existing) {
      // Update existing to mark as goal
      await supabase
        .from('employee_skills')
        .update({ is_goal: true })
        .eq('id', existing.id)
    } else {
      // Create new skill with is_goal = true
      await supabase
        .from('employee_skills')
        .insert({
          employee_id: employeeId,
          skill_id: selectedGoalSkill.value,
          level: 0,
          is_goal: true
        })
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
  await userStore.fetchUserData()
  await fetchMySkills()
})
</script>

<style scoped>
.my-skills-page {
  max-width: 1200px;
}
</style>
