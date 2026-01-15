<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Skills Management</h1>
        <p class="text-body-1 text-grey-darken-1">
          Create, edit, and manage the company skill library
        </p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="showAddDialog = true">
        Add Skill
      </v-btn>
    </div>

    <!-- Skill Level Legend -->
    <v-card rounded="lg" class="mb-6">
      <v-card-title class="text-subtitle-1 d-flex align-center gap-2">
        <v-icon>mdi-information-outline</v-icon>
        Skill Rating Definitions
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" sm="6" md="4" lg="2">
            <div class="d-flex align-center gap-2">
              <v-avatar color="grey" size="32">
                <span class="text-white font-weight-bold">0</span>
              </v-avatar>
              <div>
                <div class="font-weight-medium text-body-2">Untrained</div>
                <div class="text-caption text-grey">No training started</div>
              </div>
            </div>
          </v-col>
          <v-col cols="12" sm="6" md="4" lg="2">
            <div class="d-flex align-center gap-2">
              <v-avatar color="red-lighten-2" size="32">
                <span class="text-white font-weight-bold">1</span>
              </v-avatar>
              <div>
                <div class="font-weight-medium text-body-2">Initial Training</div>
                <div class="text-caption text-grey">Reading/learning phase</div>
              </div>
            </div>
          </v-col>
          <v-col cols="12" sm="6" md="4" lg="2">
            <div class="d-flex align-center gap-2">
              <v-avatar color="orange" size="32">
                <span class="text-white font-weight-bold">2</span>
              </v-avatar>
              <div>
                <div class="font-weight-medium text-body-2">Formal Training</div>
                <div class="text-caption text-grey">Quizzes, mentorship</div>
              </div>
            </div>
          </v-col>
          <v-col cols="12" sm="6" md="4" lg="2">
            <div class="d-flex align-center gap-2">
              <v-avatar color="blue" size="32">
                <span class="text-white font-weight-bold">3</span>
              </v-avatar>
              <div>
                <div class="font-weight-medium text-body-2">Supervised</div>
                <div class="text-caption text-grey">Can perform supervised</div>
              </div>
            </div>
          </v-col>
          <v-col cols="12" sm="6" md="4" lg="2">
            <div class="d-flex align-center gap-2">
              <v-avatar color="teal" size="32">
                <span class="text-white font-weight-bold">4</span>
              </v-avatar>
              <div>
                <div class="font-weight-medium text-body-2">Independent</div>
                <div class="text-caption text-grey">Can perform unsupervised</div>
              </div>
            </div>
          </v-col>
          <v-col cols="12" sm="6" md="4" lg="2">
            <div class="d-flex align-center gap-2">
              <v-avatar color="green" size="32">
                <span class="text-white font-weight-bold">5</span>
              </v-avatar>
              <div>
                <div class="font-weight-medium text-body-2">Mentor</div>
                <div class="text-caption text-grey">Can teach others</div>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Stats Row -->
    <UiStatsRow
      :stats="[
        { value: skills.length, label: 'Total Skills', color: 'primary', icon: 'mdi-lightbulb' },
        { value: categoryCount, label: 'Categories', color: 'info', icon: 'mdi-view-grid' },
        { value: coreSkillsCount, label: 'Core Skills', color: 'success', icon: 'mdi-star' },
        { value: totalAssignments, label: 'Total Assignments', color: 'warning', icon: 'mdi-account-group' }
      ]"
      layout="4-col"
      tile-size="tall"
    />

    <!-- Loading State -->
    <template v-if="loading">
      <v-row>
        <v-col cols="12" md="4">
          <v-card rounded="lg" height="400">
            <v-card-text>
              <div class="skeleton-pulse mb-4" style="width: 100%; height: 40px; border-radius: 4px;"></div>
              <div v-for="i in 6" :key="i" class="skeleton-pulse mb-2" style="width: 100%; height: 48px; border-radius: 4px;"></div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="8">
          <v-card rounded="lg" height="400">
            <v-card-text class="d-flex align-center justify-center h-100">
              <div class="text-center">
                <div class="skeleton-pulse mx-auto mb-4" style="width: 64px; height: 64px; border-radius: 50%;"></div>
                <div class="skeleton-pulse mx-auto" style="width: 200px; height: 20px; border-radius: 4px;"></div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- Content: Two-Pane Layout -->
    <template v-else>
      <v-row>
        <!-- Left Pane: Categories & Skills List -->
        <v-col cols="12" md="4">
          <v-card rounded="lg" class="h-100">
            <v-card-title class="d-flex align-center gap-2">
              <v-icon>mdi-view-list</v-icon>
              Skill Library
            </v-card-title>
            
            <!-- Search -->
            <div class="px-4 pb-2">
              <v-text-field
                v-model="searchQuery"
                prepend-inner-icon="mdi-magnify"
                placeholder="Search skills..."
                variant="outlined"
                density="compact"
                hide-details
                clearable
              />
            </div>

            <v-divider />

            <!-- Skills List by Category -->
            <div style="max-height: 500px; overflow-y: auto;">
              <v-expansion-panels v-model="expandedCategory" variant="accordion">
                <v-expansion-panel
                  v-for="category in filteredCategories"
                  :key="category.name"
                  :value="category.name"
                >
                  <v-expansion-panel-title>
                    <div class="d-flex align-center gap-2">
                      <v-icon :color="getCategoryColor(category.name)" size="20">
                        {{ getCategoryIcon(category.name) }}
                      </v-icon>
                      <span class="font-weight-medium">{{ category.name }}</span>
                      <v-chip size="x-small" variant="flat" color="grey-lighten-3">
                        {{ category.skills.length }}
                      </v-chip>
                    </div>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <v-list density="compact" class="py-0">
                      <v-list-item
                        v-for="skill in category.skills"
                        :key="skill.id"
                        :active="selectedSkill?.id === skill.id"
                        @click="selectSkill(skill)"
                        class="rounded mb-1"
                      >
                        <v-list-item-title>{{ skill.name }}</v-list-item-title>
                        <template #append>
                          <v-chip size="x-small" variant="text" color="grey">
                            {{ skill.employee_count || 0 }} users
                          </v-chip>
                        </template>
                      </v-list-item>
                    </v-list>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>

              <!-- Empty Search Results -->
              <div v-if="searchQuery && filteredCategories.length === 0" class="text-center py-8">
                <v-icon size="48" color="grey-lighten-1">mdi-magnify-close</v-icon>
                <p class="text-body-2 text-grey mt-2">No skills matching "{{ searchQuery }}"</p>
              </div>

              <!-- Empty State -->
              <div v-if="!searchQuery && skills.length === 0" class="text-center py-8">
                <v-icon size="48" color="grey-lighten-1">mdi-lightbulb-off</v-icon>
                <p class="text-body-2 text-grey mt-2">No skills defined yet</p>
                <v-btn color="primary" size="small" class="mt-2" @click="showAddDialog = true">
                  Add First Skill
                </v-btn>
              </div>
            </div>
          </v-card>
        </v-col>

        <!-- Right Pane: Skill Details / Editor -->
        <v-col cols="12" md="8">
          <v-card rounded="lg" class="h-100">
            <!-- No Selection State -->
            <template v-if="!selectedSkill">
              <v-card-text class="d-flex align-center justify-center h-100">
                <div class="text-center py-12">
                  <v-icon size="64" color="grey-lighten-1">mdi-cursor-default-click</v-icon>
                  <h3 class="text-h6 mt-4">Select a Skill</h3>
                  <p class="text-grey">Choose a skill from the list to view or edit details</p>
                </div>
              </v-card-text>
            </template>

            <!-- Skill Editor -->
            <template v-else>
              <v-card-title class="d-flex align-center justify-space-between">
                <span class="d-flex align-center gap-2">
                  <v-icon :color="getCategoryColor(selectedSkill.category)">
                    {{ getCategoryIcon(selectedSkill.category) }}
                  </v-icon>
                  Edit Skill
                </span>
                <v-btn
                  icon="mdi-close"
                  variant="text"
                  size="small"
                  @click="selectedSkill = null"
                />
              </v-card-title>
              <v-divider />

              <v-card-text>
                <v-form ref="editFormRef" @submit.prevent="saveSkill">
                  <v-text-field
                    v-model="editForm.name"
                    label="Skill Name"
                    variant="outlined"
                    :rules="[v => !!v || 'Name is required']"
                    class="mb-4"
                  />

                  <v-select
                    v-model="editForm.category"
                    :items="categoryOptions"
                    label="Category"
                    variant="outlined"
                    class="mb-4"
                  />

                  <v-textarea
                    v-model="editForm.description"
                    label="Description"
                    variant="outlined"
                    rows="3"
                    class="mb-4"
                    placeholder="Describe what this skill entails and how proficiency is measured..."
                  />

                  <v-switch
                    v-model="editForm.is_core"
                    label="Core Skill (required for all employees)"
                    color="primary"
                    hide-details
                    class="mb-4"
                  />

                  <!-- Skill Stats -->
                  <v-card variant="outlined" rounded="lg" class="mb-4">
                    <v-card-title class="text-body-1">
                      <v-icon start size="20">mdi-chart-bar</v-icon>
                      Usage Stats
                    </v-card-title>
                    <v-card-text>
                      <v-row dense>
                        <v-col cols="6">
                          <div class="text-h5 font-weight-bold text-primary">
                            {{ selectedSkill.employee_count || 0 }}
                          </div>
                          <div class="text-caption text-grey">Employees with skill</div>
                        </v-col>
                        <v-col cols="6">
                          <div class="text-h5 font-weight-bold text-success">
                            {{ selectedSkill.avg_level?.toFixed(1) || '0.0' }}
                          </div>
                          <div class="text-caption text-grey">Avg. Level</div>
                        </v-col>
                      </v-row>
                    </v-card-text>
                  </v-card>

                  <div class="d-flex justify-space-between">
                    <v-btn
                      color="error"
                      variant="outlined"
                      prepend-icon="mdi-delete"
                      @click="confirmDelete"
                    >
                      Delete
                    </v-btn>
                    <v-btn
                      color="primary"
                      type="submit"
                      :loading="saving"
                    >
                      Save Changes
                    </v-btn>
                  </div>
                </v-form>
              </v-card-text>
            </template>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- Add Skill Dialog -->
    <v-dialog v-model="showAddDialog" max-width="500">
      <v-card>
        <v-card-title>
          <v-icon start color="primary">mdi-plus-circle</v-icon>
          Add New Skill
        </v-card-title>
        <v-card-text>
          <v-form ref="addFormRef">
            <v-text-field
              v-model="newSkill.name"
              label="Skill Name"
              variant="outlined"
              class="mb-4"
              placeholder="e.g., Customer Service"
              :rules="[v => !!v || 'Skill name is required']"
            />
            <v-select
              v-model="newSkill.category"
              :items="categoryOptions"
              label="Category"
              variant="outlined"
              class="mb-4"
            />
            <v-textarea
              v-model="newSkill.description"
              label="Description"
              variant="outlined"
              rows="3"
              placeholder="Describe what this skill entails..."
            />
            <v-switch
              v-model="newSkill.is_core"
              label="Core Skill (required for all employees)"
              color="primary"
              hide-details
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeAddDialog">Cancel</v-btn>
          <v-btn color="primary" :loading="creating" @click="createSkill">
            Create Skill
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start color="error">mdi-alert</v-icon>
          Delete Skill
        </v-card-title>
        <v-card-text>
          <p>Are you sure you want to delete <strong>{{ selectedSkill?.name }}</strong>?</p>
          <v-alert v-if="selectedSkill?.employee_count" type="warning" variant="tonal" density="compact" class="mt-2">
            This skill is assigned to {{ selectedSkill.employee_count }} employee(s). Their skill records will be removed.
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDeleteDialog = false">Cancel</v-btn>
          <v-btn color="error" :loading="deleting" @click="deleteSkill">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin']
})

interface Skill {
  id: string
  name: string
  category: string
  description?: string
  is_core?: boolean
  employee_count?: number
  avg_level?: number
}

const client = useSupabaseClient()
const toast = useToast()

// State
const skills = ref<Skill[]>([])
const loading = ref(true)
const saving = ref(false)
const creating = ref(false)
const deleting = ref(false)
const searchQuery = ref('')
const selectedSkill = ref<Skill | null>(null)
const expandedCategory = ref<string | null>(null)
const showAddDialog = ref(false)
const showDeleteDialog = ref(false)

const categoryOptions = ['Technical', 'Service', 'Leadership', 'Communication', 'Safety', 'Equipment', 'Other']

const newSkill = ref({
  name: '',
  category: 'Technical',
  description: '',
  is_core: false
})

const editForm = ref({
  name: '',
  category: '',
  description: '',
  is_core: false
})

const editFormRef = ref()
const addFormRef = ref()

// Watch selected skill to populate edit form
watch(selectedSkill, (skill) => {
  if (skill) {
    editForm.value = {
      name: skill.name,
      category: skill.category,
      description: skill.description || '',
      is_core: skill.is_core || false
    }
  }
})

// Computed
const categoryCount = computed(() => {
  const cats = new Set(skills.value.map(s => s.category))
  return cats.size
})

const coreSkillsCount = computed(() => {
  return skills.value.filter(s => s.is_core).length
})

const totalAssignments = computed(() => {
  return skills.value.reduce((sum, s) => sum + (s.employee_count || 0), 0)
})

const skillsByCategory = computed(() => {
  const categories: Record<string, Skill[]> = {}
  
  skills.value.forEach(skill => {
    const category = skill.category || 'Other'
    if (!categories[category]) {
      categories[category] = []
    }
    categories[category].push(skill)
  })
  
  return Object.entries(categories)
    .map(([name, skills]) => ({
      name,
      skills: skills.sort((a, b) => a.name.localeCompare(b.name))
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
})

const filteredCategories = computed(() => {
  if (!searchQuery.value) return skillsByCategory.value
  
  const query = searchQuery.value.toLowerCase()
  return skillsByCategory.value
    .map(category => ({
      ...category,
      skills: category.skills.filter(s => 
        s.name.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query)
      )
    }))
    .filter(category => category.skills.length > 0)
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

const selectSkill = (skill: Skill) => {
  selectedSkill.value = skill
}

const fetchSkills = async () => {
  loading.value = true
  try {
    // Get skills
    const { data, error } = await client
      .from('skill_library')
      .select('*')
      .order('name')
    
    if (error) throw error
    
    // Get employee counts and average levels for each skill
    const { data: skillStats } = await client
      .from('employee_skills')
      .select('skill_id, level')
    
    const statsMap: Record<string, { count: number; total: number }> = {}
    skillStats?.forEach(stat => {
      if (!statsMap[stat.skill_id]) {
        statsMap[stat.skill_id] = { count: 0, total: 0 }
      }
      statsMap[stat.skill_id].count++
      statsMap[stat.skill_id].total += stat.level
    })
    
    skills.value = (data || []).map(skill => ({
      ...skill,
      employee_count: statsMap[skill.id]?.count || 0,
      avg_level: statsMap[skill.id] 
        ? statsMap[skill.id].total / statsMap[skill.id].count 
        : 0
    }))
  } catch (error) {
    console.error('Error fetching skills:', error)
    toast.error('Failed to load skills')
  } finally {
    loading.value = false
  }
}

const createSkill = async () => {
  const { valid } = await addFormRef.value?.validate()
  if (!valid) return
  
  creating.value = true
  try {
    const { error } = await client
      .from('skill_library')
      .insert({
        name: newSkill.value.name,
        category: newSkill.value.category,
        description: newSkill.value.description || null,
        is_core: newSkill.value.is_core
      } as any)
    
    if (error) throw error
    
    toast.success('Skill created successfully')
    closeAddDialog()
    await fetchSkills()
  } catch (error: any) {
    console.error('Error creating skill:', error)
    if (error.code === '23505') {
      toast.error('A skill with this name already exists in this category')
    } else {
      toast.error('Failed to create skill')
    }
  } finally {
    creating.value = false
  }
}

const closeAddDialog = () => {
  showAddDialog.value = false
  newSkill.value = { name: '', category: 'Technical', description: '', is_core: false }
}

const saveSkill = async () => {
  const { valid } = await editFormRef.value?.validate()
  if (!valid || !selectedSkill.value) return
  
  saving.value = true
  try {
    const { error } = await client
      .from('skill_library')
      .update({
        name: editForm.value.name,
        category: editForm.value.category,
        description: editForm.value.description || null,
        is_core: editForm.value.is_core
      } as any)
      .eq('id', selectedSkill.value.id)
    
    if (error) throw error
    
    toast.success('Skill updated successfully')
    await fetchSkills()
    
    // Update selected skill reference
    selectedSkill.value = skills.value.find(s => s.id === selectedSkill.value?.id) || null
  } catch (error: any) {
    console.error('Error saving skill:', error)
    if (error.code === '23505') {
      toast.error('A skill with this name already exists in this category')
    } else {
      toast.error('Failed to save skill')
    }
  } finally {
    saving.value = false
  }
}

const confirmDelete = () => {
  showDeleteDialog.value = true
}

const deleteSkill = async () => {
  if (!selectedSkill.value) return
  
  deleting.value = true
  try {
    // Delete the skill (employee_skills will cascade delete due to FK constraint)
    const { error } = await client
      .from('skill_library')
      .delete()
      .eq('id', selectedSkill.value.id)
    
    if (error) throw error
    
    toast.success('Skill deleted successfully')
    showDeleteDialog.value = false
    selectedSkill.value = null
    await fetchSkills()
  } catch (error) {
    console.error('Error deleting skill:', error)
    toast.error('Failed to delete skill')
  } finally {
    deleting.value = false
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
