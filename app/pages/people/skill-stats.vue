<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Skill Stats</h1>
        <p class="text-body-1 text-grey-darken-1">
          Company-wide skill health and coverage analysis
        </p>
      </div>
      <v-btn color="primary" variant="outlined" prepend-icon="mdi-download" @click="exportReport">
        Export Report
      </v-btn>
    </div>

    <!-- Loading State -->
    <template v-if="loading">
      <v-row class="mb-6">
        <v-col v-for="i in 4" :key="i" cols="12" sm="6" md="3">
          <v-card rounded="lg">
            <v-card-text>
              <div class="skeleton-pulse mb-2" style="width: 40%; height: 12px; border-radius: 4px;"></div>
              <div class="skeleton-pulse" style="width: 60%; height: 32px; border-radius: 4px;"></div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- Content -->
    <template v-else>
      <!-- Top-Level Health Metrics -->
      <UiStatsRow
        :stats="[
          { value: totalEmployees, label: 'Total Employees', color: 'primary', icon: 'mdi-account-group' },
          { value: totalSkills, label: 'Skills in Library', color: 'info', icon: 'mdi-lightbulb' },
          { value: averageSkillLevel.toFixed(1), label: 'Avg. Skill Level', color: 'success', icon: 'mdi-chart-line', format: 'none' },
          { value: skillCoverage + '%', label: 'Skill Coverage', color: coverageColor, icon: 'mdi-percent', format: 'none' }
        ]"
        layout="4-col"
        tile-size="tall"
      />

      <!-- Employee Skills Editor -->
      <v-card rounded="lg" class="mt-6">
        <v-card-title>
          <v-icon start color="primary">mdi-account-edit</v-icon>
          Edit Employee Skills
        </v-card-title>
        <v-divider />
        <v-card-text>
          <!-- Employee Search -->
          <v-autocomplete
            v-model="selectedEmployeeId"
            :items="employeeList"
            item-title="full_name"
            item-value="id"
            label="Search Employee"
            placeholder="Start typing to search..."
            prepend-inner-icon="mdi-account-search"
            variant="outlined"
            density="comfortable"
            clearable
            hide-details
            class="mb-4"
            @update:model-value="loadEmployeeSkills"
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props">
                <template #prepend>
                  <v-avatar size="32" color="primary">
                    <v-img v-if="item.raw.avatar_url" :src="item.raw.avatar_url" />
                    <span v-else class="text-white text-body-2">
                      {{ item.raw.first_name?.[0] }}{{ item.raw.last_name?.[0] }}
                    </span>
                  </v-avatar>
                </template>
                <v-list-item-subtitle v-if="item.raw.position">
                  {{ item.raw.position }}
                </v-list-item-subtitle>
              </v-list-item>
            </template>
          </v-autocomplete>

          <!-- Skills Rating Table -->
          <template v-if="selectedEmployeeId">
            <div class="d-flex align-center justify-space-between mb-3">
              <div class="text-subtitle-1 font-weight-medium">
                Skills for {{ selectedEmployeeName }}
                <span v-if="filteredEmployeeSkills.length !== employeeSkillRatings.length" class="text-caption text-grey ml-2">
                  ({{ filteredEmployeeSkills.length }} of {{ employeeSkillRatings.length }})
                </span>
              </div>
              <div class="d-flex align-center gap-2">
                <v-select
                  v-model="selectedCategory"
                  :items="availableCategories"
                  label="Category"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                  style="min-width: 180px"
                  prepend-inner-icon="mdi-filter-variant"
                />
                <v-text-field
                  v-model="skillSearchQuery"
                  prepend-inner-icon="mdi-magnify"
                  placeholder="Filter skills..."
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                  style="max-width: 250px"
                />
                <v-btn
                  v-if="hasUnsavedChanges"
                  color="primary"
                  prepend-icon="mdi-content-save-all"
                  :loading="savingAll"
                  @click="saveAllChanges"
                >
                  Save All
                </v-btn>
              </div>
            </div>

            <v-table density="compact">
              <thead>
                <tr>
                  <th class="text-left">Skill</th>
                  <th class="text-left">Category</th>
                  <th class="text-center" style="width: 280px;">Rating</th>
                  <th class="text-center" style="width: 120px;">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="skillRating in filteredEmployeeSkills" :key="skillRating.skill_id">
                  <td>
                    <div class="font-weight-medium">{{ skillRating.skill_name }}</div>
                    <div v-if="skillRating.skill_description" class="text-caption text-grey">
                      {{ skillRating.skill_description }}
                    </div>
                  </td>
                  <td>
                    <v-chip size="small" variant="tonal" :color="getCategoryColor(skillRating.category)">
                      {{ skillRating.category }}
                    </v-chip>
                  </td>
                  <td class="text-center">
                    <v-btn-toggle 
                      v-model="skillRating.level" 
                      mandatory 
                      density="compact"
                      :color="getRatingColor(skillRating.level)"
                      @update:model-value="markDirty(skillRating)"
                    >
                      <v-btn :value="0" size="small">0</v-btn>
                      <v-btn :value="1" size="small">1</v-btn>
                      <v-btn :value="2" size="small">2</v-btn>
                      <v-btn :value="3" size="small">3</v-btn>
                      <v-btn :value="4" size="small">4</v-btn>
                      <v-btn :value="5" size="small">5</v-btn>
                    </v-btn-toggle>
                  </td>
                  <td class="text-center">
                    <v-btn
                      v-if="skillRating.isDirty"
                      color="primary"
                      size="small"
                      variant="tonal"
                      :loading="skillRating.saving"
                      @click="saveSkillRating(skillRating)"
                    >
                      Save
                    </v-btn>
                    <v-icon v-else-if="skillRating.saving" color="primary" size="small">
                      mdi-loading mdi-spin
                    </v-icon>
                    <v-icon v-else color="success" size="small">mdi-check-circle</v-icon>
                  </td>
                </tr>
              </tbody>
            </v-table>
            
            <div v-if="filteredEmployeeSkills.length === 0" class="text-center py-8">
              <v-icon size="48" color="grey-lighten-1">mdi-magnify-close</v-icon>
              <p class="text-body-2 text-grey mt-2">No skills matching your search</p>
            </div>
          </template>

          <!-- No Employee Selected -->
          <div v-else class="text-center py-8">
            <v-icon size="48" color="grey-lighten-1">mdi-account-search</v-icon>
            <p class="text-body-1 text-grey mt-2">Search for an employee to view and edit their skills</p>
          </div>
        </v-card-text>
      </v-card>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin']
})

interface SkillRating {
  skill_id: string
  skill_name: string
  skill_description?: string
  category: string
  level: number
  originalLevel: number
  isDirty: boolean
  saving: boolean
}

const client = useSupabaseClient()
const toast = useToast()

// State
const loading = ref(true)
const totalEmployees = ref(0)
const totalSkills = ref(0)
const employeeSkills = ref<any[]>([])
const skillLibrary = ref<any[]>([])
const employees = ref<any[]>([])

// Employee Skills Editor State
const selectedEmployeeId = ref<string | null>(null)
const skillSearchQuery = ref('')
const selectedCategory = ref<string | null>(null)
const employeeSkillRatings = ref<SkillRating[]>([])
const savingAll = ref(false)

// Computed
const averageSkillLevel = computed(() => {
  if (employeeSkills.value.length === 0) return 0
  const total = employeeSkills.value.reduce((sum, es) => sum + es.level, 0)
  return total / employeeSkills.value.length
})

const skillCoverage = computed(() => {
  if (totalSkills.value === 0 || totalEmployees.value === 0) return 0
  // Calculate how many unique skill-employee combinations exist vs possible
  const uniqueSkillsWithEmployees = new Set(employeeSkills.value.map(es => es.skill_id)).size
  return Math.round((uniqueSkillsWithEmployees / totalSkills.value) * 100)
})

const coverageColor = computed(() => {
  if (skillCoverage.value >= 80) return 'success'
  if (skillCoverage.value >= 50) return 'warning'
  return 'error'
})

const skillLevelDistribution = computed(() => {
  const levels = [
    { level: 5, label: 'Expert', color: 'success', count: 0 },
    { level: 4, label: 'Advanced', color: 'teal', count: 0 },
    { level: 3, label: 'Intermediate', color: 'warning', count: 0 },
    { level: 2, label: 'Beginner', color: 'orange', count: 0 },
    { level: 1, label: 'Novice', color: 'grey', count: 0 }
  ]
  
  employeeSkills.value.forEach(es => {
    const levelObj = levels.find(l => l.level === es.level)
    if (levelObj) levelObj.count++
  })
  
  const total = employeeSkills.value.length || 1
  return levels.map(l => ({
    ...l,
    percentage: Math.round((l.count / total) * 100)
  }))
})

const categoryStats = computed(() => {
  const categories: Record<string, { skills: Set<string>; levels: number[] }> = {}
  
  employeeSkills.value.forEach(es => {
    const skill = skillLibrary.value.find(s => s.id === es.skill_id)
    if (!skill) return
    
    const category = skill.category || 'Other'
    if (!categories[category]) {
      categories[category] = { skills: new Set(), levels: [] }
    }
    categories[category].skills.add(skill.id)
    categories[category].levels.push(es.level)
  })
  
  return Object.entries(categories)
    .map(([name, data]) => ({
      name,
      skillCount: data.skills.size,
      avgLevel: data.levels.reduce((a, b) => a + b, 0) / data.levels.length
    }))
    .sort((a, b) => b.avgLevel - a.avgLevel)
})

// Employee Skills Editor Computed
const employeeList = computed(() => 
  employees.value.map(e => ({
    id: e.id,
    full_name: `${e.first_name} ${e.last_name}`,
    first_name: e.first_name,
    last_name: e.last_name,
    position: '',
    avatar_url: null
  }))
)

const selectedEmployeeName = computed(() => {
  const emp = employeeList.value.find(e => e.id === selectedEmployeeId.value)
  return emp?.full_name || ''
})

const availableCategories = computed(() => {
  const categories = new Set(employeeSkillRatings.value.map(s => s.category))
  return Array.from(categories).sort()
})

const filteredEmployeeSkills = computed(() => {
  let filtered = employeeSkillRatings.value
  
  // Filter by category if selected
  if (selectedCategory.value) {
    filtered = filtered.filter(s => s.category === selectedCategory.value)
  }
  
  // Filter by search query
  if (skillSearchQuery.value) {
    const search = skillSearchQuery.value.toLowerCase()
    filtered = filtered.filter(s => 
      s.skill_name.toLowerCase().includes(search) ||
      s.category.toLowerCase().includes(search)
    )
  }
  
  return filtered
})

const hasUnsavedChanges = computed(() => {
  return employeeSkillRatings.value.some(s => s.isDirty)
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

const getRatingColor = (level: number): string => {
  const colors: Record<number, string> = {
    0: 'grey',
    1: 'red-lighten-2',
    2: 'orange',
    3: 'blue',
    4: 'teal',
    5: 'green'
  }
  return colors[level] || 'grey'
}

// Employee Skills Editor Methods
const loadEmployeeSkills = async () => {
  if (!selectedEmployeeId.value) {
    employeeSkillRatings.value = []
    return
  }

  try {
    // Get employee's current skill ratings
    const { data: empSkills, error } = await client
      .from('employee_skills')
      .select('skill_id, level')
      .eq('employee_id', selectedEmployeeId.value)

    if (error) throw error

    // Create a map of existing skills
    const existingSkillsMap = new Map(
      (empSkills || []).map(es => [es.skill_id, es.level])
    )

    // Build full skill ratings list
    employeeSkillRatings.value = skillLibrary.value.map(skill => {
      const existingLevel = existingSkillsMap.get(skill.id) ?? 0
      return {
        skill_id: skill.id,
        skill_name: skill.name,
        skill_description: skill.description || undefined,
        category: skill.category,
        level: existingLevel,
        originalLevel: existingLevel,
        isDirty: false,
        saving: false
      }
    }).sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category)
      return a.skill_name.localeCompare(b.skill_name)
    })
  } catch (err) {
    console.error('Error loading employee skills:', err)
    toast.error('Failed to load employee skills')
  }
}

const markDirty = (skillRating: SkillRating) => {
  skillRating.isDirty = skillRating.level !== skillRating.originalLevel
}

const saveSkillRating = async (skillRating: SkillRating) => {
  if (!selectedEmployeeId.value) return

  skillRating.saving = true
  try {
    console.log('Attempting to save skill:', {
      employee_id: selectedEmployeeId.value,
      skill_id: skillRating.skill_id,
      level: skillRating.level
    })

    // First check if record exists
    const { data: existing, error: checkError } = await client
      .from('employee_skills')
      .select('id')
      .eq('employee_id', selectedEmployeeId.value)
      .eq('skill_id', skillRating.skill_id)
      .maybeSingle()

    if (checkError) {
      console.error('Check error:', checkError)
      throw checkError
    }

    console.log('Existing record check:', existing)

    let saveError

    if (existing?.id) {
      // Update existing record
      console.log('Updating existing record:', existing.id)
      const { error } = await client
        .from('employee_skills')
        .update({ level: skillRating.level })
        .eq('id', existing.id)
      
      saveError = error
    } else {
      // Insert new record
      console.log('Inserting new record')
      const { error } = await client
        .from('employee_skills')
        .insert({
          employee_id: selectedEmployeeId.value,
          skill_id: skillRating.skill_id,
          level: skillRating.level
        })
      
      saveError = error
    }

    if (saveError) {
      console.error('Save error details:', {
        message: saveError.message,
        code: saveError.code,
        details: saveError.details,
        hint: saveError.hint,
        fullError: JSON.stringify(saveError)
      })
      throw saveError
    }

    console.log('Skill saved successfully:', { 
      skill: skillRating.skill_name, 
      level: skillRating.level
    })

    // Update local state to reflect saved changes
    skillRating.originalLevel = skillRating.level
    skillRating.isDirty = false
    
    // Show success toast for individual saves
    toast.success(`Saved ${skillRating.skill_name}: Level ${skillRating.level}`)
    
    // Refresh global stats (but don't reload employee skills as local state is already updated)
    await fetchData()
  } catch (err: any) {
    console.error('Error saving skill rating:', err)
    toast.error(err?.message || 'Failed to save skill rating')
  } finally {
    skillRating.saving = false
  }
}

const saveAllChanges = async () => {
  const dirtySkills = employeeSkillRatings.value.filter(s => s.isDirty)
  if (dirtySkills.length === 0) return

  savingAll.value = true
  try {
    // Save all dirty skills in parallel
    await Promise.all(dirtySkills.map(s => saveSkillRating(s)))
    toast.success(`Saved ${dirtySkills.length} skill rating(s)`)
  } catch (err) {
    console.error('Error saving all changes:', err)
  } finally {
    savingAll.value = false
  }
}

const exportReport = () => {
  // Generate CSV of skill stats
  const lines = [
    'Skill Stats Report',
    `Generated: ${new Date().toLocaleDateString()}`,
    '',
    'Summary',
    `Total Employees,${totalEmployees.value}`,
    `Total Skills,${totalSkills.value}`,
    `Average Skill Level,${averageSkillLevel.value.toFixed(2)}`,
    `Skill Coverage,${skillCoverage.value}%`
  ]
  
  const csv = lines.join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `skill-stats-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
  
  toast.success('Report exported successfully')
}

const fetchData = async () => {
  loading.value = true
  try {
    // Fetch all data in parallel
    const [empRes, skillRes, esRes] = await Promise.all([
      client.from('employees').select('id, first_name, last_name'),
      client.from('skill_library').select('id, name, category, description'),
      client.from('employee_skills').select('employee_id, skill_id, level')
    ])
    
    employees.value = empRes.data || []
    skillLibrary.value = skillRes.data || []
    employeeSkills.value = esRes.data || []
    
    totalEmployees.value = employees.value.length
    totalSkills.value = skillLibrary.value.length
  } catch (error) {
    console.error('Error fetching data:', error)
    toast.error('Failed to load skill stats')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
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
