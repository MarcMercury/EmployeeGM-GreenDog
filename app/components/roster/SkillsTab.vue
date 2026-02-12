<template>
  <v-row>
    <!-- Skills Summary Stats -->
    <v-col cols="12">
      <v-card class="bg-white shadow-sm rounded-xl mb-4" elevation="0">
        <v-card-text class="d-flex justify-space-around text-center py-4">
          <div>
            <div class="text-h4 font-weight-bold text-primary">{{ allSkillsFlat.length }}</div>
            <div class="text-caption text-grey">All Skills</div>
          </div>
          <v-divider vertical />
          <div>
            <div class="text-h4 font-weight-bold text-success">{{ ratedSkillsCount }}</div>
            <div class="text-caption text-grey">Rated</div>
          </div>
          <v-divider vertical />
          <div>
            <div class="text-h4 font-weight-bold text-info">{{ categoryList.length }}</div>
            <div class="text-caption text-grey">Categories</div>
          </div>
          <v-divider vertical />
          <div>
            <div class="text-h4 font-weight-bold text-warning">{{ masteredCount }}</div>
            <div class="text-caption text-grey">Advanced+</div>
          </div>
        </v-card-text>
      </v-card>
    </v-col>

    <!-- Full Skill Matrix by Category (ALL skills) -->
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

        <!-- Loading -->
        <v-card-text v-if="loadingLibrary" class="d-flex justify-center py-8">
          <v-progress-circular indeterminate color="primary" />
        </v-card-text>

        <!-- Skill Categories Accordion -->
        <v-card-text v-else-if="categoryList.length > 0">
          <v-expansion-panels variant="accordion" class="skill-accordion">
            <v-expansion-panel
              v-for="category in categoryList"
              :key="category"
            >
              <v-expansion-panel-title>
                <div class="d-flex align-center">
                  <v-icon color="green-darken-3" size="20" class="mr-3">
                    {{ getCategoryIcon(category) }}
                  </v-icon>
                  <span class="font-weight-medium">{{ category }}</span>
                  <v-chip size="x-small" variant="tonal" class="ml-3">
                    {{ mergedSkillsByCategory[category]?.length || 0 }}
                  </v-chip>
                </div>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-list density="compact" class="bg-transparent">
                  <v-list-item
                    v-for="skill in mergedSkillsByCategory[category]"
                    :key="skill.id"
                    class="px-0 skill-row"
                  >
                    <template #prepend>
                      <v-avatar
                        size="32"
                        :color="skill.rating > 0 ? getSkillLevelColor(skill.rating) : 'grey-lighten-2'"
                        variant="tonal"
                      >
                        <span class="text-caption font-weight-bold">{{ skill.rating || '—' }}</span>
                      </v-avatar>
                    </template>

                    <v-list-item-title class="text-body-2 font-weight-medium">
                      <!-- Skill name is a link to find training for this skill -->
                      <NuxtLink
                        :to="`/academy/catalog?skill=${skill.id}`"
                        class="skill-link"
                        :title="`Find training for ${skill.name}`"
                      >
                        {{ skill.name }}
                        <v-icon size="12" class="ml-1 link-icon">mdi-school</v-icon>
                      </NuxtLink>

                      <v-icon
                        v-if="skill.isGoal"
                        size="14"
                        color="warning"
                        class="ml-1"
                        title="Learning Goal"
                      >
                        mdi-flag
                      </v-icon>
                      <v-icon
                        v-if="skill.certifiedAt"
                        size="14"
                        color="success"
                        class="ml-1"
                        title="Certified"
                      >
                        mdi-check-decagram
                      </v-icon>

                      <!-- Course available indicator -->
                      <v-chip
                        v-if="skill.courseCount > 0"
                        size="x-small"
                        variant="tonal"
                        color="info"
                        class="ml-2"
                      >
                        {{ skill.courseCount }} {{ skill.courseCount === 1 ? 'course' : 'courses' }}
                      </v-chip>
                    </v-list-item-title>

                    <v-list-item-subtitle class="text-caption">
                      {{ skill.rating > 0 ? getSkillLevelLabel(skill.rating) : 'Not yet rated' }}
                    </v-list-item-subtitle>

                    <template #append>
                      <v-rating
                        :model-value="skill.rating"
                        readonly
                        density="compact"
                        size="small"
                        color="amber"
                        active-color="amber-darken-2"
                        empty-icon="mdi-star-outline"
                        full-icon="mdi-star"
                        half-icon="mdi-star-half-full"
                        :length="5"
                      />
                    </template>
                  </v-list-item>
                </v-list>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card-text>

        <v-card-text v-else class="text-center py-8">
          <v-icon size="48" color="grey-lighten-2">mdi-star-outline</v-icon>
          <p class="text-body-2 text-grey mt-2">No skills available</p>
        </v-card-text>
      </v-card>
    </v-col>

    <!-- Right Column: Mentorships + Goals -->
    <v-col cols="12" md="4">
      <!-- Mentorship Relationships -->
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
/**
 * SkillsTab — Shows ALL skills from the skill library grouped by category.
 *
 * For each skill the employee's current rating (star rating 0-5) is shown.
 * Every skill name is a link to the course catalog filtered by that skill,
 * so employees can discover training/courses available for any skill.
 */

const supabase = useSupabaseClient()

const props = defineProps<{
  /** The employee's current skill records (from employee_skills) */
  skills: any[]
  mentorships: any[]
  employeeId: string
}>()

// ------- Full skill library fetch -------
const loadingLibrary = ref(true)
const skillLibrary = ref<any[]>([])
const courseCounts = ref<Record<string, number>>({})

onMounted(async () => {
  await Promise.all([fetchSkillLibrary(), fetchCourseCounts()])
  loadingLibrary.value = false
})

async function fetchSkillLibrary() {
  try {
    const { data } = await supabase
      .from('skill_library')
      .select('id, name, category, description')
      .eq('is_active', true)
      .order('category')
      .order('name')

    skillLibrary.value = data || []
  } catch (err) {
    console.error('[SkillsTab] Error loading skill library:', err)
  }
}

/** Pre-fetch how many active courses exist per skill_id */
async function fetchCourseCounts() {
  try {
    const { data } = await supabase
      .from('training_courses')
      .select('skill_id')
      .eq('is_active', true)
      .not('skill_id', 'is', null)

    const counts: Record<string, number> = {}
    ;(data || []).forEach((c: any) => {
      if (c.skill_id) counts[c.skill_id] = (counts[c.skill_id] || 0) + 1
    })
    courseCounts.value = counts
  } catch (err) {
    console.error('[SkillsTab] Error loading course counts:', err)
  }
}

// ------- Build a lookup from employee_skills -------
const employeeSkillMap = computed(() => {
  const map: Record<string, { level: number; isGoal: boolean; certifiedAt: string | null }> = {}
  props.skills.forEach(es => {
    const skillId = es.skill_id || es.skill?.id
    if (skillId) {
      map[skillId] = {
        level: es.level || 0,
        isGoal: es.is_goal || false,
        certifiedAt: es.certified_at || null,
      }
    }
  })
  return map
})

// ------- Merge library + employee ratings -------
interface MergedSkillRow {
  id: string
  name: string
  category: string
  description?: string
  rating: number
  isGoal: boolean
  certifiedAt: string | null
  courseCount: number
}

const allSkillsFlat = computed<MergedSkillRow[]>(() =>
  skillLibrary.value.map(lib => {
    const emp = employeeSkillMap.value[lib.id]
    return {
      id: lib.id,
      name: lib.name,
      category: lib.category || 'Uncategorized',
      description: lib.description,
      rating: emp?.level || 0,
      isGoal: emp?.isGoal || false,
      certifiedAt: emp?.certifiedAt || null,
      courseCount: courseCounts.value[lib.id] || 0,
    }
  })
)

const mergedSkillsByCategory = computed(() => {
  const grouped: Record<string, MergedSkillRow[]> = {}
  allSkillsFlat.value.forEach(skill => {
    const cat = skill.category
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(skill)
  })
  // Within each category, sort rated skills first (desc), then unrated alphabetically
  Object.keys(grouped).forEach(cat => {
    grouped[cat]!.sort((a, b) => {
      if (a.rating !== b.rating) return b.rating - a.rating
      return a.name.localeCompare(b.name)
    })
  })
  return grouped
})

const categoryList = computed(() => Object.keys(mergedSkillsByCategory.value).sort())
const ratedSkillsCount = computed(() => allSkillsFlat.value.filter(s => s.rating > 0).length)
const masteredCount = computed(() => allSkillsFlat.value.filter(s => s.rating >= 4).length)
const goalSkills = computed(() => props.skills.filter(s => s.is_goal))

// ------- Helpers -------
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
    'Clinical Skills': 'mdi-medical-bag',
    'Clinical': 'mdi-medical-bag',
    'Technical': 'mdi-cog',
    'Administrative': 'mdi-file-document',
    'Leadership Skills': 'mdi-account-group',
    'Leadership': 'mdi-account-group',
    'Communication': 'mdi-forum',
    'Client Service': 'mdi-account-heart',
    'Client Communication': 'mdi-account-heart',
    'Safety': 'mdi-shield-check',
    'Compliance': 'mdi-clipboard-check',
    'Software': 'mdi-desktop-classic',
    'Equipment': 'mdi-wrench',
    'Technology & Equipment': 'mdi-wrench',
    'Training & Education': 'mdi-school',
    'Soft Skills': 'mdi-head-lightbulb',
    'Diagnostics & Imaging': 'mdi-microscope',
    'Surgical & Procedural': 'mdi-needle',
    'Emergency & Critical Care': 'mdi-ambulance',
    'Pharmacy & Treatment': 'mdi-pill',
    'HR / People Ops': 'mdi-account-cog',
    'Administrative & Operations': 'mdi-office-building',
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

<style scoped>
.skill-link {
  color: inherit;
  text-decoration: none;
  transition: color 0.15s;
}
.skill-link:hover {
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
}
.skill-link .link-icon {
  opacity: 0;
  transition: opacity 0.15s;
}
.skill-link:hover .link-icon {
  opacity: 1;
}
.skill-row:hover {
  background: rgba(var(--v-theme-primary), 0.04);
}
</style>
