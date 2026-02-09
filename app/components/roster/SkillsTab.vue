<template>
  <v-row>
    <!-- Skills Summary Stats -->
    <v-col cols="12">
      <v-card class="bg-white shadow-sm rounded-xl mb-4" elevation="0">
        <v-card-text class="d-flex justify-space-around text-center py-4">
          <div>
            <div class="text-h4 font-weight-bold text-primary">{{ totalSkills }}</div>
            <div class="text-caption text-grey">Total Skills</div>
          </div>
          <v-divider vertical />
          <div>
            <div class="text-h4 font-weight-bold text-success">{{ masteredSkills }}</div>
            <div class="text-caption text-grey">Advanced+</div>
          </div>
          <v-divider vertical />
          <div>
            <div class="text-h4 font-weight-bold text-info">{{ skillCategoryList.length }}</div>
            <div class="text-caption text-grey">Categories</div>
          </div>
          <v-divider vertical />
          <div>
            <div class="text-h4 font-weight-bold text-warning">{{ activeMentorships.length }}</div>
            <div class="text-caption text-grey">Mentorships</div>
          </div>
        </v-card-text>
      </v-card>
    </v-col>

    <!-- Skill Matrix by Category -->
    <v-col cols="12" md="8">
      <v-card class="bg-white shadow-sm rounded-xl" elevation="0">
        <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold">
          <v-icon start size="20" color="primary">mdi-view-grid</v-icon>
          Skill Matrix
          <v-spacer />
          <v-chip size="x-small" variant="tonal" color="primary">
            By Category
          </v-chip>
        </v-card-title>
        <v-card-text v-if="skills.length > 0">
          <v-expansion-panels variant="accordion" class="skill-accordion">
            <v-expansion-panel
              v-for="category in skillCategoryList"
              :key="category"
            >
              <v-expansion-panel-title>
                <div class="d-flex align-center">
                  <v-icon :color="getSkillLevelColor(3)" size="20" class="mr-3">
                    {{ getCategoryIcon(category) }}
                  </v-icon>
                  <span class="font-weight-medium">{{ category }}</span>
                  <v-chip size="x-small" variant="tonal" class="ml-3">
                    {{ skillsByCategory[category]?.length || 0 }}
                  </v-chip>
                </div>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-list density="compact" class="bg-transparent">
                  <v-list-item 
                    v-for="empSkill in skillsByCategory[category]" 
                    :key="empSkill.id"
                    class="px-0"
                  >
                    <template #prepend>
                      <v-avatar 
                        size="32" 
                        :color="getSkillLevelColor(empSkill.level)" 
                        variant="tonal"
                      >
                        <span class="text-caption font-weight-bold">{{ empSkill.level }}</span>
                      </v-avatar>
                    </template>
                    <v-list-item-title class="text-body-2 font-weight-medium">
                      {{ empSkill.skill?.name || 'Unknown Skill' }}
                      <v-icon 
                        v-if="empSkill.is_goal" 
                        size="14" 
                        color="warning" 
                        class="ml-1"
                        title="Learning Goal"
                      >
                        mdi-flag
                      </v-icon>
                      <v-icon 
                        v-if="empSkill.certified_at" 
                        size="14" 
                        color="success" 
                        class="ml-1"
                        title="Certified"
                      >
                        mdi-check-decagram
                      </v-icon>
                    </v-list-item-title>
                    <v-list-item-subtitle class="text-caption">
                      {{ getSkillLevelLabel(empSkill.level) }}
                    </v-list-item-subtitle>
                    <template #append>
                      <div style="width: 100px;">
                        <v-progress-linear
                          :model-value="(empSkill.level / 5) * 100"
                          :color="getSkillLevelColor(empSkill.level)"
                          height="8"
                          rounded
                        />
                      </div>
                    </template>
                  </v-list-item>
                </v-list>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card-text>
        <v-card-text v-else class="text-center py-8">
          <v-icon size="48" color="grey-lighten-2">mdi-star-outline</v-icon>
          <p class="text-body-2 text-grey mt-2">No skills recorded yet</p>
        </v-card-text>
      </v-card>
    </v-col>

    <!-- Mentorship Relationships -->
    <v-col cols="12" md="4">
      <v-card class="bg-white shadow-sm rounded-xl" elevation="0">
        <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold">
          <v-icon start size="20" color="info">mdi-account-supervisor</v-icon>
          Mentorships
        </v-card-title>
        <v-card-text v-if="mentorships.length > 0">
          <v-list density="compact" class="bg-transparent">
            <v-list-item 
              v-for="mentorship in mentorships" 
              :key="mentorship.id"
              class="px-0 mb-2"
            >
              <template #prepend>
                <v-avatar size="36" color="info" variant="tonal">
                  <v-icon size="18">
                    {{ mentorship.mentor?.id === employeeId ? 'mdi-school' : 'mdi-account-student' }}
                  </v-icon>
                </v-avatar>
              </template>
              <v-list-item-title class="text-body-2 font-weight-medium">
                {{ getMentorshipRole(mentorship) }}
                <span class="text-primary">
                  {{ mentorship.mentor?.id === employeeId 
                     ? getMentorshipName(mentorship.mentee) 
                     : getMentorshipName(mentorship.mentor) }}
                </span>
              </v-list-item-title>
              <v-list-item-subtitle class="text-caption">
                <v-icon size="12" class="mr-1">mdi-star</v-icon>
                {{ mentorship.skill?.name || 'General' }}
              </v-list-item-subtitle>
              <template #append>
                <v-chip 
                  :color="getMentorshipStatusColor(mentorship.status)"
                  size="x-small"
                  variant="flat"
                >
                  {{ mentorship.status }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-text v-else class="text-center py-6">
          <v-icon size="40" color="grey-lighten-2">mdi-account-supervisor-outline</v-icon>
          <p class="text-caption text-grey mt-2">No mentorships</p>
        </v-card-text>
      </v-card>

      <!-- Skill Goals Section -->
      <v-card class="bg-white shadow-sm rounded-xl mt-4" elevation="0">
        <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold">
          <v-icon start size="20" color="warning">mdi-flag</v-icon>
          Learning Goals
        </v-card-title>
        <v-card-text>
          <div v-if="goalSkills.length > 0">
            <v-chip
              v-for="goal in goalSkills"
              :key="goal.id"
              :color="getSkillLevelColor(goal.level)"
              variant="tonal"
              size="small"
              class="ma-1"
            >
              <v-icon start size="12">mdi-flag</v-icon>
              {{ goal.skill?.name }}
              <span class="ml-1 text-caption">(L{{ goal.level }})</span>
            </v-chip>
          </div>
          <div v-else class="text-center py-4">
            <v-icon size="32" color="grey-lighten-2">mdi-flag-outline</v-icon>
            <p class="text-caption text-grey mt-1">No learning goals set</p>
          </div>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
const props = defineProps<{
  skills: any[]
  mentorships: any[]
  employeeId: string
}>()

// Computed
const skillsByCategory = computed(() => {
  const grouped: Record<string, any[]> = {}
  props.skills.forEach(skill => {
    const cat = skill.skill?.category || 'Uncategorized'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(skill)
  })
  Object.keys(grouped).forEach(cat => {
    grouped[cat]!.sort((a, b) => (b.level || 0) - (a.level || 0))
  })
  return grouped
})

const skillCategoryList = computed(() => Object.keys(skillsByCategory.value).sort())
const totalSkills = computed(() => props.skills.length)
const masteredSkills = computed(() => props.skills.filter(s => s.level >= 4).length)
const activeMentorships = computed(() => props.mentorships.filter(m => m.status === 'active'))
const goalSkills = computed(() => props.skills.filter(s => s.is_goal))

// Helpers
function getSkillLevelLabel(level: number): string {
  const labels: Record<number, string> = { 0: 'Novice', 1: 'Beginner', 2: 'Intermediate', 3: 'Proficient', 4: 'Advanced', 5: 'Expert' }
  return labels[level] || 'Unknown'
}

function getSkillLevelColor(level: number): string {
  const colors: Record<number, string> = { 0: 'grey', 1: 'blue-grey', 2: 'info', 3: 'primary', 4: 'success', 5: 'warning' }
  return colors[level] || 'grey'
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'Clinical': 'mdi-medical-bag', 'Technical': 'mdi-cog', 'Administrative': 'mdi-file-document',
    'Leadership': 'mdi-account-group', 'Communication': 'mdi-forum', 'Safety': 'mdi-shield-check',
    'Compliance': 'mdi-clipboard-check', 'Software': 'mdi-desktop-classic', 'Equipment': 'mdi-wrench'
  }
  return icons[category] || 'mdi-star'
}

function getMentorshipName(person: any): string {
  if (!person) return 'Unknown'
  const name = person.preferred_name || person.first_name
  return `${name} ${person.last_name?.charAt(0) || ''}.`
}

function getMentorshipRole(mentorship: any): string {
  return mentorship.mentor?.id === props.employeeId ? 'Mentoring' : 'Learning from'
}

function getMentorshipStatusColor(status: string): string {
  const colors: Record<string, string> = { 'pending': 'warning', 'active': 'success', 'completed': 'info', 'cancelled': 'grey' }
  return colors[status] || 'grey'
}
</script>
