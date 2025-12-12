<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Skills Library</h1>
        <p class="text-body-1 text-grey-darken-1">
          Admin control center for skill definitions and employee ratings
        </p>
      </div>
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        @click="addSkillDialog = true"
      >
        Add New Skill
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

    <!-- View Toggle -->
    <div class="d-flex align-center justify-space-between mb-4">
      <v-btn-toggle v-model="viewMode" mandatory density="compact" color="primary">
        <v-btn value="library" prepend-icon="mdi-bookshelf">Skill Library</v-btn>
        <v-btn value="employees" prepend-icon="mdi-account-group">Employee Ratings</v-btn>
      </v-btn-toggle>
    </div>

    <!-- LIBRARY VIEW: Skills by Category -->
    <template v-if="viewMode === 'library'">
      <v-row>
        <v-col 
          v-for="category in categories" 
          :key="category"
          cols="12" 
          md="6"
        >
        <v-card rounded="lg" class="h-100">
          <v-card-title class="d-flex align-center justify-space-between">
            <span>{{ category }}</span>
            <v-chip size="small" color="primary" variant="tonal">
              {{ getSkillsByCategory(category).length }} skills
            </v-chip>
          </v-card-title>
          <v-card-text>
            <v-list v-if="getSkillsByCategory(category).length > 0" density="compact">
              <v-list-item
                v-for="skill in getSkillsByCategory(category)"
                :key="skill.id"
              >
                <v-list-item-title>{{ skill.name }}</v-list-item-title>
                <v-list-item-subtitle v-if="skill.description">
                  {{ skill.description }}
                </v-list-item-subtitle>
                <template #append>
                  <v-btn
                    icon="mdi-pencil"
                    size="small"
                    variant="text"
                    @click="editSkill(skill)"
                  />
                  <v-btn
                    icon="mdi-delete"
                    size="small"
                    variant="text"
                    color="error"
                    @click="confirmDeleteSkill(skill)"
                  />
                </template>
              </v-list-item>
            </v-list>
            <div v-else class="text-center py-4 text-grey">
              No skills in this category
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    </template>

    <!-- EMPLOYEE RATINGS VIEW -->
    <template v-else-if="viewMode === 'employees'">
      <!-- Employee Selector -->
      <v-card rounded="lg" class="mb-4">
        <v-card-text>
          <v-row align="center">
            <v-col cols="12" md="6">
              <v-autocomplete
                v-model="selectedEmployeeId"
                :items="employeeList"
                item-title="full_name"
                item-value="id"
                label="Select Employee"
                placeholder="Start typing to search..."
                prepend-inner-icon="mdi-account-search"
                variant="outlined"
                density="comfortable"
                clearable
                hide-details
                @update:model-value="loadEmployeeSkills"
              >
                <template #item="{ props, item }">
                  <v-list-item v-bind="props">
                    <template #prepend>
                      <v-avatar size="32" color="primary">
                        <v-img v-if="item.raw.avatar_url" :src="item.raw.avatar_url" />
                        <span v-else class="text-white text-body-2">
                          {{ item.raw.first_name?.charAt(0) }}{{ item.raw.last_name?.charAt(0) }}
                        </span>
                      </v-avatar>
                    </template>
                    <v-list-item-subtitle v-if="item.raw.position">
                      {{ item.raw.position }}
                    </v-list-item-subtitle>
                  </v-list-item>
                </template>
              </v-autocomplete>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="skillSearch"
                prepend-inner-icon="mdi-magnify"
                label="Filter Skills"
                variant="outlined"
                density="comfortable"
                hide-details
                clearable
              />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Skills Rating Table -->
      <v-card v-if="selectedEmployeeId" rounded="lg">
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Skills for {{ selectedEmployeeName }}</span>
          <v-chip color="primary" variant="tonal">
            {{ filteredEmployeeSkills.length }} skills
          </v-chip>
        </v-card-title>
        <v-card-text class="pa-0">
          <v-table>
            <thead>
              <tr>
                <th class="text-left">Skill</th>
                <th class="text-left">Category</th>
                <th class="text-center" style="width: 280px;">Rating</th>
                <th class="text-center" style="width: 100px;">Save</th>
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
                  <v-chip size="small" variant="tonal">{{ skillRating.category }}</v-chip>
                </td>
                <td class="text-center">
                  <v-btn-toggle 
                    v-model="skillRating.level" 
                    mandatory 
                    density="compact"
                    :color="getRatingColor(skillRating.level)"
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
                    icon="mdi-content-save"
                    size="small"
                    color="primary"
                    variant="tonal"
                    :loading="skillRating.saving"
                    @click="saveSkillRating(skillRating)"
                  />
                  <v-icon v-else color="grey-lighten-1" size="small">mdi-check</v-icon>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
      </v-card>

      <!-- No Employee Selected -->
      <v-card v-else rounded="lg">
        <v-card-text class="text-center py-12">
          <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-account-search</v-icon>
          <div class="text-h6 text-grey-darken-1 mb-2">Select an Employee</div>
          <div class="text-body-2 text-grey">
            Choose an employee above to view and edit their skill ratings
          </div>
        </v-card-text>
      </v-card>

    <!-- Add/Edit Skill Dialog -->
    <v-dialog v-model="addSkillDialog" max-width="500">
      <v-card>
        <v-card-title>
          {{ editingSkill ? 'Edit Skill' : 'Add New Skill' }}
        </v-card-title>
        <v-card-text>
          <v-form ref="formRef">
            <v-text-field
              v-model="skillForm.name"
              label="Skill Name"
              :rules="[v => !!v || 'Required']"
            />
            <v-combobox
              v-model="skillForm.category"
              :items="categories"
              label="Category"
              :rules="[v => !!v || 'Required']"
              hint="Select existing or type new category"
            />
            <v-textarea
              v-model="skillForm.description"
              label="Description (optional)"
              rows="3"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeSkillDialog">Cancel</v-btn>
          <v-btn color="primary" @click="saveSkill">
            {{ editingSkill ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>Delete Skill</v-card-title>
        <v-card-text>
          Are you sure you want to delete "{{ skillToDelete?.name }}"? 
          This will also remove it from all employee profiles.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" @click="deleteSkill">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import type { Skill } from '~/types/database.types'

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

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin']
})

const employeeStore = useEmployeeStore()
const uiStore = useUIStore()
const supabase = useSupabaseClient()

// View mode
const viewMode = ref<'library' | 'employees'>('library')

// Skill Library state
const addSkillDialog = ref(false)
const deleteDialog = ref(false)
const formRef = ref()
const editingSkill = ref<Skill | null>(null)
const skillToDelete = ref<Skill | null>(null)

const skillForm = reactive({
  name: '',
  category: '',
  description: ''
})

// Employee Ratings state
const selectedEmployeeId = ref<string | null>(null)
const skillSearch = ref('')
const employeeSkillRatings = ref<SkillRating[]>([])

const skills = computed(() => employeeStore.skills)
const categories = computed(() => employeeStore.skillCategories)

// Employee list for selector
const employeeList = computed(() => 
  employeeStore.employees.map(e => ({
    id: e.id,
    full_name: `${e.first_name} ${e.last_name}`,
    first_name: e.first_name,
    last_name: e.last_name,
    position: e.position || '',
    avatar_url: e.avatar_url
  }))
)

const selectedEmployeeName = computed(() => {
  const emp = employeeList.value.find(e => e.id === selectedEmployeeId.value)
  return emp?.full_name || ''
})

const filteredEmployeeSkills = computed(() => {
  if (!skillSearch.value) return employeeSkillRatings.value
  const search = skillSearch.value.toLowerCase()
  return employeeSkillRatings.value.filter(s => 
    s.skill_name.toLowerCase().includes(search) ||
    s.category.toLowerCase().includes(search)
  )
})

function getSkillsByCategory(category: string): Skill[] {
  return skills.value.filter(s => s.category === category)
}

function getRatingColor(level: number): string {
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

// Load skills for selected employee
async function loadEmployeeSkills() {
  if (!selectedEmployeeId.value) {
    employeeSkillRatings.value = []
    return
  }

  try {
    // Get all skills from library
    const allSkills = skills.value

    // Get employee's current skill ratings
    const { data: employeeSkills, error } = await supabase
      .from('employee_skills')
      .select('skill_id, level')
      .eq('employee_id', selectedEmployeeId.value)

    if (error) throw error

    // Create a map of existing skills
    const existingSkillsMap = new Map(
      (employeeSkills || []).map(es => [es.skill_id, es.level])
    )

    // Build full skill ratings list
    employeeSkillRatings.value = allSkills.map(skill => {
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
    uiStore.showError('Failed to load employee skills')
  }
}

// Watch for level changes to set isDirty
watch(employeeSkillRatings, (ratings) => {
  ratings.forEach(r => {
    r.isDirty = r.level !== r.originalLevel
  })
}, { deep: true })

// Save individual skill rating
async function saveSkillRating(skillRating: SkillRating) {
  if (!selectedEmployeeId.value) return

  skillRating.saving = true
  try {
    // Upsert the skill rating
    const { error } = await supabase
      .from('employee_skills')
      .upsert({
        employee_id: selectedEmployeeId.value,
        skill_id: skillRating.skill_id,
        level: skillRating.level,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'employee_id,skill_id'
      })

    if (error) throw error

    skillRating.originalLevel = skillRating.level
    skillRating.isDirty = false
    uiStore.showSuccess(`Saved ${skillRating.skill_name} rating`)
  } catch (err) {
    console.error('Error saving skill rating:', err)
    uiStore.showError('Failed to save skill rating')
  } finally {
    skillRating.saving = false
  }
}

function editSkill(skill: Skill) {
  editingSkill.value = skill
  Object.assign(skillForm, {
    name: skill.name,
    category: skill.category,
    description: skill.description || ''
  })
  addSkillDialog.value = true
}

function closeSkillDialog() {
  addSkillDialog.value = false
  editingSkill.value = null
  Object.assign(skillForm, { name: '', category: '', description: '' })
}

async function saveSkill() {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  try {
    if (editingSkill.value) {
      // Update skill
      const { error } = await supabase
        .from('skill_library')
        .update({
          name: skillForm.name,
          category: skillForm.category,
          description: skillForm.description || null
        })
        .eq('id', editingSkill.value.id)

      if (error) throw error
      uiStore.showSuccess('Skill updated')
      await employeeStore.fetchSkills()
    } else {
      await employeeStore.createSkill({
        name: skillForm.name,
        category: skillForm.category,
        description: skillForm.description || undefined
      })
      uiStore.showSuccess('Skill created')
    }
    closeSkillDialog()
  } catch {
    uiStore.showError('Failed to save skill')
  }
}

function confirmDeleteSkill(skill: Skill) {
  skillToDelete.value = skill
  deleteDialog.value = true
}

async function deleteSkill() {
  if (!skillToDelete.value) return
  
  try {
    const { error } = await supabase
      .from('skill_library')
      .delete()
      .eq('id', skillToDelete.value.id)

    if (error) throw error
    
    uiStore.showSuccess('Skill deleted')
    await employeeStore.fetchSkills()
    deleteDialog.value = false
    skillToDelete.value = null
  } catch {
    uiStore.showError('Failed to delete skill')
  }
}

onMounted(async () => {
  await Promise.all([
    employeeStore.fetchSkills(),
    employeeStore.fetchEmployees()
  ])
})
</script>
