<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Skills Management</h1>
        <p class="text-body-1 text-grey-darken-1">
          Manage skill categories and definitions
        </p>
      </div>
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        @click="addSkillDialog = true"
      >
        Add Skill
      </v-btn>
    </div>

    <!-- Skill Legend -->
    <v-card rounded="lg" class="mb-6">
      <v-card-title class="text-subtitle-1">Skill Level Legend</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <div class="d-flex align-center gap-3">
              <v-avatar color="orange" size="40">
                <v-icon color="white">mdi-school</v-icon>
              </v-avatar>
              <div>
                <div class="font-weight-bold">Learning (0-2)</div>
                <div class="text-caption text-grey">Still developing proficiency</div>
              </div>
            </div>
          </v-col>
          <v-col cols="12" md="4">
            <div class="d-flex align-center gap-3">
              <v-avatar color="blue" size="40">
                <v-icon color="white">mdi-check-circle</v-icon>
              </v-avatar>
              <div>
                <div class="font-weight-bold">Competent (3-4)</div>
                <div class="text-caption text-grey">Can perform independently</div>
              </div>
            </div>
          </v-col>
          <v-col cols="12" md="4">
            <div class="d-flex align-center gap-3">
              <v-avatar color="green" size="40">
                <v-icon color="white">mdi-star</v-icon>
              </v-avatar>
              <div>
                <div class="font-weight-bold">Mentor (5)</div>
                <div class="text-caption text-grey">Can teach others</div>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Skills by Category -->
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

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin']
})

const employeeStore = useEmployeeStore()
const uiStore = useUIStore()

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

const skills = computed(() => employeeStore.skills)
const categories = computed(() => employeeStore.skillCategories)

function getSkillsByCategory(category: string): Skill[] {
  return skills.value.filter(s => s.category === category)
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
      // Update skill - would need API endpoint
      uiStore.showInfo('Edit feature coming soon')
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
  
  // Would need API endpoint
  uiStore.showInfo('Delete feature coming soon')
  deleteDialog.value = false
  skillToDelete.value = null
}

onMounted(() => {
  employeeStore.fetchSkills()
})
</script>
