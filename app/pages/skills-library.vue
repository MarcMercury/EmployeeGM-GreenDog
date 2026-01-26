<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Skills Library</h1>
        <p class="text-body-1 text-grey-darken-1">
          Comprehensive skill taxonomy with level descriptions and development paths
        </p>
      </div>
      <div class="d-flex align-center gap-2">
        <v-chip color="primary" variant="flat">
          <v-icon start>mdi-book-open-variant</v-icon>
          {{ totalSkills }} Skills
        </v-chip>
        <v-chip color="secondary" variant="flat">
          <v-icon start>mdi-folder-open</v-icon>
          {{ categories.length }} Categories
        </v-chip>
      </div>
    </div>

    <!-- Search and Filter -->
    <v-card rounded="lg" class="mb-6">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="searchQuery"
              prepend-inner-icon="mdi-magnify"
              label="Search skills..."
              variant="outlined"
              density="comfortable"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="selectedCategory"
              :items="['All Categories', ...categories]"
              label="Filter by Category"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="2" class="d-flex align-center">
            <v-btn-toggle v-model="viewMode" mandatory density="comfortable" color="primary">
              <v-btn value="grid" icon="mdi-view-grid" />
              <v-btn value="list" icon="mdi-format-list-bulleted" />
            </v-btn-toggle>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Level Legend -->
    <v-card rounded="lg" class="mb-6">
      <v-card-title class="d-flex align-center">
        <v-icon start color="primary">mdi-school</v-icon>
        Skill Level Guide
        <v-spacer />
        <v-btn
          variant="text"
          size="small"
          @click="showLegend = !showLegend"
        >
          {{ showLegend ? 'Hide' : 'Show' }}
          <v-icon end>{{ showLegend ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
        </v-btn>
      </v-card-title>
      <v-expand-transition>
        <v-card-text v-show="showLegend">
          <v-row>
            <v-col v-for="level in levelDescriptions" :key="level.value" cols="12" sm="6" md="4" lg="2">
              <v-card :color="level.color" variant="tonal" rounded="lg" class="text-center pa-3 h-100">
                <v-avatar :color="level.color" class="mb-2">
                  <span class="text-h6 font-weight-bold">{{ level.value }}</span>
                </v-avatar>
                <div class="font-weight-bold">{{ level.label }}</div>
                <div class="text-caption mt-1">{{ level.description }}</div>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </v-expand-transition>
    </v-card>

    <!-- Loading State -->
    <template v-if="loading">
      <v-row>
        <v-col v-for="i in 6" :key="i" cols="12" md="6" lg="4">
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

    <!-- Grid View -->
    <template v-else-if="viewMode === 'grid'">
      <v-row>
        <v-col v-for="category in filteredSkillsByCategory" :key="category.name" cols="12" md="6" lg="4">
          <v-card rounded="lg" class="h-100">
            <v-card-title class="d-flex align-center">
              <v-icon :color="getCategoryColor(category.name)" class="mr-2">{{ getCategoryIcon(category.name) }}</v-icon>
              {{ category.name }}
              <v-spacer />
              <v-chip size="small" color="primary" variant="flat">
                {{ category.skills.length }}
              </v-chip>
            </v-card-title>
            <v-divider />
            <v-card-text class="pa-0" style="max-height: 400px; overflow-y: auto;">
              <v-list density="compact" class="py-0">
                <v-list-item
                  v-for="skill in category.skills"
                  :key="skill.id"
                  @click="openSkillDialog(skill)"
                  :ripple="true"
                  class="skill-item"
                >
                  <v-list-item-title class="text-body-2">
                    {{ skill.name }}
                  </v-list-item-title>
                  <template #append>
                    <v-icon size="small" color="grey">mdi-chevron-right</v-icon>
                  </template>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- List View -->
    <template v-else>
      <v-expansion-panels variant="accordion" multiple v-model="openPanels">
        <v-expansion-panel v-for="category in filteredSkillsByCategory" :key="category.name" class="mb-2">
          <v-expansion-panel-title>
            <div class="d-flex align-center flex-grow-1">
              <v-icon :color="getCategoryColor(category.name)" class="mr-3">{{ getCategoryIcon(category.name) }}</v-icon>
              <span class="text-subtitle-1 font-weight-bold">{{ category.name }}</span>
              <v-spacer />
              <v-chip size="small" variant="flat" :color="getCategoryColor(category.name)" class="mr-2">
                {{ category.skills.length }} skill{{ category.skills.length !== 1 ? 's' : '' }}
              </v-chip>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-list density="comfortable" class="bg-transparent">
              <v-list-item
                v-for="skill in category.skills"
                :key="skill.id"
                @click="openSkillDialog(skill)"
                :ripple="true"
                class="rounded mb-2 skill-item-list"
              >
                <v-list-item-title class="font-weight-medium">
                  {{ skill.name }}
                </v-list-item-title>
                <v-list-item-subtitle v-if="skill.description">
                  {{ skill.description }}
                </v-list-item-subtitle>
                <template #append>
                  <v-btn variant="text" color="primary" size="small" @click.stop="openSkillDialog(skill)">
                    View Levels
                    <v-icon end size="small">mdi-arrow-right</v-icon>
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </template>

    <!-- Empty State -->
    <v-card v-if="!loading && filteredSkillsByCategory.length === 0" rounded="lg" class="text-center py-12">
      <v-icon size="64" color="grey-lighten-1">mdi-book-search</v-icon>
      <h3 class="text-h6 mt-4">No Skills Found</h3>
      <p class="text-grey mb-4">Try adjusting your search or filter criteria</p>
      <v-btn color="primary" variant="tonal" @click="resetFilters">
        Reset Filters
      </v-btn>
    </v-card>

    <!-- Skill Detail Dialog -->
    <v-dialog v-model="skillDialog" max-width="700" scrollable>
      <v-card v-if="selectedSkill" rounded="lg">
        <v-card-title class="d-flex align-center py-4 px-6">
          <v-icon :color="getCategoryColor(selectedSkill.category)" class="mr-3" size="large">{{ getCategoryIcon(selectedSkill.category) }}</v-icon>
          <div>
            <div class="text-h5 font-weight-bold">{{ selectedSkill.name }}</div>
            <v-chip size="small" :color="getCategoryColor(selectedSkill.category)" variant="flat" class="mt-1">
              {{ selectedSkill.category }}
            </v-chip>
          </div>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" @click="skillDialog = false" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-6">
          <!-- Description -->
          <div v-if="selectedSkill.description" class="mb-6">
            <h4 class="text-subtitle-2 text-grey mb-2">Description</h4>
            <p class="text-body-1">{{ selectedSkill.description }}</p>
          </div>

          <!-- Level Descriptions -->
          <h4 class="text-subtitle-2 text-grey mb-4">Skill Level Progression</h4>
          <v-timeline side="end" density="compact">
            <v-timeline-item
              v-for="level in [0, 1, 2, 3, 4, 5]"
              :key="level"
              :dot-color="getLevelColor(level)"
              size="small"
            >
              <template #opposite>
                <div class="d-flex align-center">
                  <v-avatar :color="getLevelColor(level)" size="32" class="mr-2">
                    <span class="font-weight-bold">{{ level }}</span>
                  </v-avatar>
                  <span class="font-weight-bold">{{ getLevelLabel(level) }}</span>
                </div>
              </template>
              <v-card variant="tonal" :color="getLevelColor(level)" class="pa-3">
                <p class="text-body-2 mb-0">
                  {{ getSkillLevelDescription(selectedSkill, level) }}
                </p>
              </v-card>
            </v-timeline-item>
          </v-timeline>

          <!-- Related Courses -->
          <div v-if="relatedCourses.length > 0" class="mt-6">
            <h4 class="text-subtitle-2 text-grey mb-3">
              <v-icon start size="small">mdi-school</v-icon>
              Related Courses
            </h4>
            <v-chip-group>
              <v-chip
                v-for="course in relatedCourses"
                :key="course.id"
                :to="`/academy/catalog?course=${course.id}`"
                color="primary"
                variant="outlined"
              >
                {{ course.title }}
                <v-icon end size="small">mdi-arrow-right</v-icon>
              </v-chip>
            </v-chip-group>
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="skillDialog = false">Close</v-btn>
          <v-btn color="primary" variant="flat" :to="'/people/my-skills'" v-if="isAuthenticated">
            <v-icon start>mdi-star</v-icon>
            Rate My Skill
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
  description?: string | null
  level_descriptions?: Record<string, string> | null
  is_active?: boolean
}

interface CategoryGroup {
  name: string
  skills: SkillLibraryItem[]
}

interface Course {
  id: string
  title: string
  skill_id?: string
}

const client = useSupabaseClient()
const user = useSupabaseUser()

// State
const loading = ref(true)
const skillLibrary = ref<SkillLibraryItem[]>([])
const courses = ref<Course[]>([])
const searchQuery = ref('')
const selectedCategory = ref('All Categories')
const viewMode = ref<'grid' | 'list'>('grid')
const showLegend = ref(true)
const openPanels = ref<number[]>([])

// Dialog state
const skillDialog = ref(false)
const selectedSkill = ref<SkillLibraryItem | null>(null)

// Computed
const isAuthenticated = computed(() => !!user.value)

const totalSkills = computed(() => skillLibrary.value.length)

const categories = computed(() => {
  const cats = [...new Set(skillLibrary.value.map(s => s.category))].sort()
  return cats
})

const skillsByCategory = computed<CategoryGroup[]>(() => {
  const grouped: Record<string, SkillLibraryItem[]> = {}
  
  for (const skill of skillLibrary.value) {
    if (!grouped[skill.category]) {
      grouped[skill.category] = []
    }
    grouped[skill.category].push(skill)
  }
  
  return Object.entries(grouped)
    .map(([name, skills]) => ({
      name,
      skills: skills.sort((a, b) => a.name.localeCompare(b.name))
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
})

const filteredSkillsByCategory = computed<CategoryGroup[]>(() => {
  let filtered = skillsByCategory.value
  
  // Filter by category
  if (selectedCategory.value !== 'All Categories') {
    filtered = filtered.filter(cat => cat.name === selectedCategory.value)
  }
  
  // Filter by search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.map(cat => ({
      name: cat.name,
      skills: cat.skills.filter(s => 
        s.name.toLowerCase().includes(query) ||
        (s.description?.toLowerCase().includes(query))
      )
    })).filter(cat => cat.skills.length > 0)
  }
  
  return filtered
})

const relatedCourses = computed(() => {
  if (!selectedSkill.value) return []
  return courses.value.filter(c => c.skill_id === selectedSkill.value?.id)
})

// Level descriptions for the legend
const levelDescriptions = [
  { value: 0, label: 'Untrained', description: 'No exposure or awareness', color: 'grey' },
  { value: 1, label: 'Novice', description: 'Knows theory, observes others', color: 'blue-grey' },
  { value: 2, label: 'Apprentice', description: 'Performs with supervision', color: 'blue' },
  { value: 3, label: 'Professional', description: 'Works independently', color: 'teal' },
  { value: 4, label: 'Advanced', description: 'Handles complex cases', color: 'green' },
  { value: 5, label: 'Mentor', description: 'Teaches and certifies others', color: 'amber-darken-2' }
]

// Methods
function getLevelLabel(level: number): string {
  const labels: Record<number, string> = {
    0: 'Untrained',
    1: 'Novice',
    2: 'Apprentice',
    3: 'Professional',
    4: 'Advanced',
    5: 'Mentor'
  }
  return labels[level] || 'Unknown'
}

function getLevelColor(level: number): string {
  const colors: Record<number, string> = {
    0: 'grey',
    1: 'blue-grey',
    2: 'blue',
    3: 'teal',
    4: 'green',
    5: 'amber-darken-2'
  }
  return colors[level] || 'grey'
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'Clinical Skills': 'mdi-stethoscope',
    'Administrative': 'mdi-file-document',
    'Anesthesia': 'mdi-needle',
    'Animal Care': 'mdi-paw',
    'Client Service': 'mdi-account-heart',
    'Creative / Marketing': 'mdi-palette',
    'Dentistry': 'mdi-tooth',
    'Diagnostics & Imaging': 'mdi-microscope',
    'Emergency': 'mdi-ambulance',
    'Emergency & Critical Care': 'mdi-hospital-box',
    'Facilities Skills': 'mdi-home-city',
    'Financial Skills': 'mdi-currency-usd',
    'HR / People Ops': 'mdi-account-group',
    'Imaging': 'mdi-radioactive',
    'Inventory Skills': 'mdi-package-variant',
    'Leadership Skills': 'mdi-account-star',
    'Pharmacy Skills': 'mdi-pill',
    'Soft Skills': 'mdi-hand-heart',
    'Specialty Medicine': 'mdi-medical-bag',
    'Surgery': 'mdi-content-cut',
    'Technology Skills': 'mdi-laptop',
    'Wellness': 'mdi-heart-pulse'
  }
  return icons[category] || 'mdi-lightbulb'
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'Clinical Skills': 'blue',
    'Administrative': 'grey-darken-1',
    'Anesthesia': 'purple',
    'Animal Care': 'orange',
    'Client Service': 'pink',
    'Creative / Marketing': 'deep-purple',
    'Dentistry': 'cyan',
    'Diagnostics & Imaging': 'indigo',
    'Emergency': 'red',
    'Emergency & Critical Care': 'red-darken-3',
    'Facilities Skills': 'brown',
    'Financial Skills': 'green-darken-2',
    'HR / People Ops': 'teal',
    'Imaging': 'light-blue',
    'Inventory Skills': 'amber',
    'Leadership Skills': 'deep-orange',
    'Pharmacy Skills': 'lime-darken-2',
    'Soft Skills': 'pink-lighten-2',
    'Specialty Medicine': 'indigo-darken-2',
    'Surgery': 'blue-grey-darken-2',
    'Technology Skills': 'cyan-darken-2',
    'Wellness': 'light-green'
  }
  return colors[category] || 'primary'
}

function getSkillLevelDescription(skill: SkillLibraryItem, level: number): string {
  // Check if skill has specific level descriptions
  if (skill.level_descriptions && skill.level_descriptions[String(level)]) {
    return skill.level_descriptions[String(level)]
  }
  
  // Fall back to generic descriptions
  const genericDescriptions: Record<number, string> = {
    0: 'No training or exposure to this skill.',
    1: 'Basic awareness and understanding of concepts. Observes others performing.',
    2: 'Can perform basic tasks with supervision and guidance.',
    3: 'Performs independently with standard cases. Reliable and consistent.',
    4: 'Handles complex or difficult cases. Troubleshoots problems.',
    5: 'Expert level. Teaches and mentors others. Creates protocols and standards.'
  }
  return genericDescriptions[level] || 'No description available.'
}

function openSkillDialog(skill: SkillLibraryItem) {
  selectedSkill.value = skill
  skillDialog.value = true
}

function resetFilters() {
  searchQuery.value = ''
  selectedCategory.value = 'All Categories'
}

async function loadSkillLibrary() {
  loading.value = true
  try {
    // Load skills
    const { data: skills, error: skillsError } = await client
      .from('skill_library')
      .select('id, name, category, description, level_descriptions, is_active')
      .order('category')
      .order('name')
    
    if (skillsError) throw skillsError
    
    // Filter to active skills only if is_active column exists
    skillLibrary.value = (skills || []).filter(s => s.is_active !== false) as SkillLibraryItem[]
    
    // Load courses for skill linking
    const { data: courseData, error: coursesError } = await client
      .from('training_courses')
      .select('id, title, skill_id')
      .not('skill_id', 'is', null)
    
    if (!coursesError && courseData) {
      courses.value = courseData as Course[]
    }
  } catch (err) {
    console.error('Error loading skill library:', err)
  } finally {
    loading.value = false
  }
}

// Initial load
onMounted(() => {
  loadSkillLibrary()
})
</script>

<style scoped>
.skeleton-pulse {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skill-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.skill-item-list:hover {
  background-color: rgba(var(--v-theme-primary), 0.08);
}

.v-timeline-item :deep(.v-timeline-item__body) {
  width: 100%;
}
</style>
