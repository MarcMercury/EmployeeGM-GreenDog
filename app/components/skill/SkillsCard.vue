<template>
  <v-card class="skill-card" :elevation="2" rounded="lg">
    <v-card-title class="d-flex align-center justify-space-between">
      <span>Skills Assessment</span>
      <v-chip :color="overallColor" variant="tonal" size="small">
        Overall: {{ overallLevel.toFixed(1) }}
      </v-chip>
    </v-card-title>

    <v-card-text>
      <!-- Skill Categories Tabs -->
      <v-tabs v-model="selectedCategory" color="primary" grow class="mb-4">
        <v-tab 
          v-for="cat in categories" 
          :key="cat" 
          :value="cat"
        >
          {{ cat }}
          <v-chip size="x-small" class="ml-2" :color="getCategoryCount(cat) > 0 ? 'primary' : 'grey'">
            {{ getCategoryCount(cat) }}
          </v-chip>
        </v-tab>
      </v-tabs>

      <!-- Skills List -->
      <v-window v-model="selectedCategory">
        <v-window-item 
          v-for="cat in categories" 
          :key="cat" 
          :value="cat"
        >
          <div v-if="getSkillsByCategory(cat).length === 0" class="text-center py-8">
            <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-clipboard-text-outline</v-icon>
            <p class="text-grey">No {{ cat.toLowerCase() }} skills recorded</p>
            <v-btn 
              v-if="editable" 
              variant="outlined" 
              color="primary" 
              class="mt-2"
              @click="addSkillDialog = true"
            >
              Add Skill
            </v-btn>
          </div>

          <v-list v-else>
            <v-list-item 
              v-for="empSkill in getSkillsByCategory(cat)" 
              :key="empSkill.id"
              class="px-0"
            >
              <SkillRating
                :skill="empSkill.skill"
                :level="empSkill.level"
                :notes="empSkill.notes"
                :editable="editable"
                @update:level="(level) => updateSkill(empSkill, level)"
              />
            </v-list-item>
          </v-list>
        </v-window-item>
      </v-window>
    </v-card-text>

    <v-divider v-if="editable" />

    <v-card-actions v-if="editable">
      <v-btn 
        variant="text" 
        color="primary" 
        prepend-icon="mdi-plus"
        @click="addSkillDialog = true"
      >
        Add Skill
      </v-btn>
    </v-card-actions>

    <!-- Add Skill Dialog -->
    <v-dialog v-model="addSkillDialog" max-width="500">
      <v-card>
        <v-card-title>Add Skill</v-card-title>
        <v-card-text>
          <v-select
            v-model="newSkillId"
            :items="availableSkills"
            item-title="name"
            item-value="id"
            label="Select Skill"
            variant="outlined"
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props">
                <template #subtitle>
                  {{ item.raw.category }}
                </template>
              </v-list-item>
            </template>
          </v-select>

          <v-slider
            v-model="newSkillLevel"
            :min="0"
            :max="5"
            :step="1"
            :ticks="tickLabels"
            show-ticks="always"
            tick-size="4"
            label="Skill Level"
            class="mt-4"
          />

          <v-textarea
            v-model="newSkillNotes"
            label="Notes (optional)"
            variant="outlined"
            rows="2"
            class="mt-2"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="addSkillDialog = false">Cancel</v-btn>
          <v-btn 
            color="primary" 
            :disabled="!newSkillId"
            @click="addSkill"
          >
            Add
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import type { EmployeeSkill, Skill, SkillLevel } from '~/types/database.types'

interface EmployeeSkillWithSkill extends EmployeeSkill {
  skill: Skill
}

interface Props {
  employeeSkills: EmployeeSkillWithSkill[]
  allSkills: Skill[]
  editable?: boolean
  profileId: string
}

const props = withDefaults(defineProps<Props>(), {
  editable: false
})

const emit = defineEmits<{
  updateSkill: [skillId: string, level: SkillLevel, notes?: string]
  addSkill: [skillId: string, level: SkillLevel, notes?: string]
}>()

const selectedCategory = ref<string>('')
const addSkillDialog = ref(false)
const newSkillId = ref<string | null>(null)
const newSkillLevel = ref<number>(1)
const newSkillNotes = ref('')

const tickLabels = {
  0: '0',
  1: '1',
  2: '2',
  3: '3',
  4: '4',
  5: '5'
}

const categories = computed(() => {
  const cats = new Set(props.allSkills.map(s => s.category))
  return Array.from(cats).sort()
})

// Set initial category
watch(categories, (cats) => {
  if (cats.length > 0 && !selectedCategory.value) {
    selectedCategory.value = cats[0]
  }
}, { immediate: true })

const overallLevel = computed(() => {
  if (props.employeeSkills.length === 0) return 0
  const sum = props.employeeSkills.reduce((acc, s) => acc + s.level, 0)
  return sum / props.employeeSkills.length
})

const overallColor = computed(() => {
  if (overallLevel.value <= 2) return 'orange'
  if (overallLevel.value <= 4) return 'blue'
  return 'green'
})

const availableSkills = computed(() => {
  const existingIds = new Set(props.employeeSkills.map(s => s.skill_id))
  return props.allSkills.filter(s => !existingIds.has(s.id))
})

function getSkillsByCategory(category: string): EmployeeSkillWithSkill[] {
  return props.employeeSkills.filter(s => s.skill.category === category)
}

function getCategoryCount(category: string): number {
  return getSkillsByCategory(category).length
}

function updateSkill(empSkill: EmployeeSkillWithSkill, level: SkillLevel) {
  emit('updateSkill', empSkill.skill_id, level, empSkill.notes || undefined)
}

function addSkill() {
  if (newSkillId.value) {
    emit('addSkill', newSkillId.value, newSkillLevel.value as SkillLevel, newSkillNotes.value || undefined)
    addSkillDialog.value = false
    newSkillId.value = null
    newSkillLevel.value = 1
    newSkillNotes.value = ''
  }
}
</script>

<style scoped>
.skill-card {
  height: 100%;
}
</style>
