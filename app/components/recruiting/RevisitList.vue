<template>
  <div>
    <!-- Summary Stats -->
    <UiStatsRow :stats="revisitStats" layout="4-col" class="mb-6" />

    <!-- Two-panel layout -->
    <v-row>
      <!-- ==================== LEFT: High-Potential Candidates ==================== -->
      <v-col cols="12" lg="6">
        <v-card rounded="lg" class="fill-height">
          <v-card-title class="d-flex align-center gap-2 pb-0">
            <v-icon color="amber">mdi-star-shooting</v-icon>
            High-Potential Candidates
            <v-chip size="small" color="amber" variant="tonal">
              {{ highPotentialCandidates.length }}
            </v-chip>
            <v-spacer />
            <v-btn-toggle v-model="hpSortBy" density="compact" variant="outlined" mandatory>
              <v-btn value="score" size="x-small">Score</v-btn>
              <v-btn value="recent" size="x-small">Recent</v-btn>
              <v-btn value="rounds" size="x-small">Rounds</v-btn>
            </v-btn-toggle>
          </v-card-title>
          <v-card-subtitle class="text-caption">
            Candidates who scored well but weren't hired — worth reconsidering
          </v-card-subtitle>

          <v-card-text>
            <!-- Filters -->
            <v-row dense class="mb-3">
              <v-col cols="6">
                <v-select
                  v-model="hpPositionFilter"
                  :items="positionFilterOptions"
                  label="Position"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </v-col>
              <v-col cols="6">
                <v-select
                  v-model="hpMinScore"
                  :items="scoreFilterOptions"
                  label="Min Score"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </v-col>
            </v-row>

            <template v-if="loading">
              <v-skeleton-loader v-for="i in 4" :key="i" type="list-item-avatar-two-line" class="mb-2" />
            </template>

            <template v-else-if="sortedHighPotential.length === 0">
              <div class="text-center py-8">
                <v-icon size="48" color="grey-lighten-2">mdi-account-search</v-icon>
                <p class="text-body-2 text-grey mt-2">No high-potential candidates found matching filters</p>
              </div>
            </template>

            <v-list v-else lines="three" class="pa-0">
              <v-list-item
                v-for="candidate in sortedHighPotential"
                :key="candidate.id"
                :to="`/recruiting/${candidate.id}`"
                rounded="lg"
                class="mb-2 revisit-item"
              >
                <template #prepend>
                  <v-badge
                    v-if="candidate.flagged_revisit"
                    dot
                    color="amber"
                    location="bottom end"
                    offset-x="-2"
                    offset-y="-2"
                  >
                    <v-avatar :color="getScoreColor(candidate.revisit_score)" size="44">
                      <span class="text-white font-weight-bold text-body-2">
                        {{ candidate.revisit_score }}
                      </span>
                    </v-avatar>
                  </v-badge>
                  <v-avatar v-else :color="getScoreColor(candidate.revisit_score)" size="44">
                    <span class="text-white font-weight-bold text-body-2">
                      {{ candidate.revisit_score }}
                    </span>
                  </v-avatar>
                </template>

                <v-list-item-title class="font-weight-medium">
                  {{ candidate.first_name }} {{ candidate.last_name }}
                  <v-chip
                    v-if="candidate.flagged_revisit"
                    size="x-small"
                    color="amber"
                    variant="flat"
                    class="ml-2"
                    prepend-icon="mdi-flag"
                  >
                    Flagged
                  </v-chip>
                </v-list-item-title>

                <v-list-item-subtitle>
                  <div class="d-flex align-center gap-2 flex-wrap mt-1">
                    <v-chip size="x-small" variant="outlined">
                      {{ candidate.job_positions?.title || 'No position' }}
                    </v-chip>
                    <v-chip size="x-small" color="blue" variant="tonal">
                      {{ candidate.interview_rounds }} round{{ candidate.interview_rounds !== 1 ? 's' : '' }}
                    </v-chip>
                    <v-chip size="x-small" :color="getRecommendationColor(candidate.best_recommendation)" variant="tonal">
                      {{ formatRecommendation(candidate.best_recommendation) }}
                    </v-chip>
                    <v-rating
                      :model-value="candidate.best_overall_score"
                      density="compact"
                      size="x-small"
                      color="amber"
                      readonly
                      half-increments
                    />
                  </div>
                  <div v-if="candidate.revisit_reason" class="text-caption text-grey-darken-1 mt-1">
                    <v-icon size="x-small" class="mr-1">mdi-message-text</v-icon>
                    {{ candidate.revisit_reason }}
                  </div>
                </v-list-item-subtitle>

                <template #append>
                  <div class="text-right">
                    <div class="text-caption text-grey">
                      {{ candidate.last_interview_at ? timeAgo(candidate.last_interview_at) : 'No interviews' }}
                    </div>
                    <v-chip
                      v-if="candidate.matching_gap_skills.length > 0"
                      size="x-small"
                      color="success"
                      variant="tonal"
                      class="mt-1"
                    >
                      Fills {{ candidate.matching_gap_skills.length }} gap{{ candidate.matching_gap_skills.length !== 1 ? 's' : '' }}
                    </v-chip>
                  </div>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- ==================== RIGHT: Skill Gap Fillers ==================== -->
      <v-col cols="12" lg="6">
        <v-card rounded="lg" class="fill-height">
          <v-card-title class="d-flex align-center gap-2 pb-0">
            <v-icon color="success">mdi-puzzle</v-icon>
            Skill Gap Fillers
            <v-chip size="small" color="success" variant="tonal">
              {{ skillGapCandidates.length }}
            </v-chip>
            <v-spacer />
            <v-btn-toggle v-model="sgSortBy" density="compact" variant="outlined" mandatory>
              <v-btn value="gaps" size="x-small">Gap Count</v-btn>
              <v-btn value="score" size="x-small">Score</v-btn>
            </v-btn-toggle>
          </v-card-title>
          <v-card-subtitle class="text-caption">
            Past candidates whose skills could fill current organizational gaps
          </v-card-subtitle>

          <v-card-text>
            <!-- Top Org Gaps Summary -->
            <div v-if="!loading && topOrgGaps.length > 0" class="mb-4">
              <div class="text-caption font-weight-medium text-grey-darken-1 mb-2">
                Top Organizational Skill Gaps
              </div>
              <div class="d-flex flex-wrap gap-1">
                <v-chip
                  v-for="gap in topOrgGaps"
                  :key="gap.skill_id"
                  size="small"
                  :color="sgSkillFilter === gap.skill_id ? 'primary' : 'default'"
                  :variant="sgSkillFilter === gap.skill_id ? 'flat' : 'tonal'"
                  class="cursor-pointer"
                  @click="sgSkillFilter = sgSkillFilter === gap.skill_id ? null : gap.skill_id"
                >
                  {{ gap.skill_name }}
                  <template #append>
                    <span class="ml-1 text-caption">({{ gap.employee_count }})</span>
                  </template>
                </v-chip>
              </div>
            </div>

            <template v-if="loading">
              <v-skeleton-loader v-for="i in 4" :key="i" type="list-item-avatar-two-line" class="mb-2" />
            </template>

            <template v-else-if="sortedSkillGapCandidates.length === 0">
              <div class="text-center py-8">
                <v-icon size="48" color="grey-lighten-2">mdi-puzzle-outline</v-icon>
                <p class="text-body-2 text-grey mt-2">
                  {{ sgSkillFilter ? 'No candidates match this skill gap' : 'No skill gap matches found' }}
                </p>
                <p class="text-caption text-grey">
                  Ensure candidates have skills assessed and the Gap Analyzer agent has run
                </p>
              </div>
            </template>

            <v-list v-else lines="three" class="pa-0">
              <v-list-item
                v-for="candidate in sortedSkillGapCandidates"
                :key="candidate.id"
                :to="`/recruiting/${candidate.id}`"
                rounded="lg"
                class="mb-2 revisit-item"
              >
                <template #prepend>
                  <v-avatar color="success" size="44">
                    <span class="text-white font-weight-bold text-body-2">
                      {{ candidate.matching_gap_skills.length }}
                    </span>
                  </v-avatar>
                </template>

                <v-list-item-title class="font-weight-medium">
                  {{ candidate.first_name }} {{ candidate.last_name }}
                  <v-chip
                    v-if="candidate.best_overall_score >= 4"
                    size="x-small"
                    color="amber"
                    variant="tonal"
                    class="ml-2"
                  >
                    Top Scorer
                  </v-chip>
                </v-list-item-title>

                <v-list-item-subtitle>
                  <div class="d-flex align-center gap-2 flex-wrap mt-1">
                    <v-chip size="x-small" variant="outlined">
                      {{ candidate.job_positions?.title || 'No position' }}
                    </v-chip>
                    <v-rating
                      :model-value="candidate.best_overall_score"
                      density="compact"
                      size="x-small"
                      color="amber"
                      readonly
                      half-increments
                    />
                  </div>
                  <!-- Matching skills chips -->
                  <div class="d-flex flex-wrap gap-1 mt-1">
                    <v-chip
                      v-for="skill in candidate.matching_gap_skills.slice(0, 5)"
                      :key="skill.skill_id"
                      size="x-small"
                      color="success"
                      variant="tonal"
                    >
                      {{ skill.skill_name }}
                      <template #append>
                        <v-icon size="x-small" class="ml-1">mdi-star</v-icon>
                        {{ skill.candidate_rating }}
                      </template>
                    </v-chip>
                    <v-chip
                      v-if="candidate.matching_gap_skills.length > 5"
                      size="x-small"
                      variant="tonal"
                    >
                      +{{ candidate.matching_gap_skills.length - 5 }} more
                    </v-chip>
                  </div>
                </v-list-item-subtitle>

                <template #append>
                  <div class="text-right">
                    <div class="text-caption text-grey">
                      {{ candidate.last_interview_at ? timeAgo(candidate.last_interview_at) : '' }}
                    </div>
                    <v-chip
                      v-if="candidate.revisit_score >= 70"
                      size="x-small"
                      color="amber"
                      variant="tonal"
                      class="mt-1"
                    >
                      Score: {{ candidate.revisit_score }}
                    </v-chip>
                  </div>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import type { RevisitCandidate, SkillGapMatch, Candidate } from '~/types/recruiting.types'

const client = useSupabaseClient()
const toast = useToast()

// State
const loading = ref(true)
const allRevisitCandidates = ref<RevisitCandidate[]>([])
const orgGaps = ref<{ skill_id: string; skill_name: string; category: string; employee_count: number; avg_gap: number }[]>([])

// High-Potential filters & sort
const hpSortBy = ref<'score' | 'recent' | 'rounds'>('score')
const hpPositionFilter = ref<string | null>(null)
const hpMinScore = ref<number>(0)

// Skill Gap filters & sort
const sgSortBy = ref<'gaps' | 'score'>('gaps')
const sgSkillFilter = ref<string | null>(null)

const scoreFilterOptions = [
  { title: 'Any Score', value: 0 },
  { title: '3+ Stars', value: 3 },
  { title: '4+ Stars', value: 4 },
  { title: '5 Stars', value: 5 }
]

// Computed: position filter options from loaded data
const positionFilterOptions = computed(() => {
  const positions = allRevisitCandidates.value
    .map(c => c.job_positions?.title)
    .filter((t): t is string => !!t)
  const unique = [...new Set(positions)]
  return [{ title: 'All Positions', value: null }, ...unique.map(p => ({ title: p, value: p }))]
})

// Computed: high-potential candidates (scored well, not hired)
const highPotentialCandidates = computed(() => {
  return allRevisitCandidates.value.filter(c => {
    // Must meet minimum score
    if (c.best_overall_score < (hpMinScore.value || 0)) return false
    // Must match position filter
    if (hpPositionFilter.value && c.job_positions?.title !== hpPositionFilter.value) return false
    return true
  })
})

const sortedHighPotential = computed(() => {
  const list = [...highPotentialCandidates.value]
  switch (hpSortBy.value) {
    case 'score':
      return list.sort((a, b) => b.revisit_score - a.revisit_score)
    case 'recent':
      return list.sort((a, b) => {
        const aDate = a.last_interview_at ? new Date(a.last_interview_at).getTime() : 0
        const bDate = b.last_interview_at ? new Date(b.last_interview_at).getTime() : 0
        return bDate - aDate
      })
    case 'rounds':
      return list.sort((a, b) => b.interview_rounds - a.interview_rounds)
    default:
      return list
  }
})

// Computed: skill gap candidates (have skills matching org gaps)
const skillGapCandidates = computed(() => {
  let list = allRevisitCandidates.value.filter(c => c.matching_gap_skills.length > 0)
  if (sgSkillFilter.value) {
    list = list.filter(c => c.matching_gap_skills.some(s => s.skill_id === sgSkillFilter.value))
  }
  return list
})

const sortedSkillGapCandidates = computed(() => {
  const list = [...skillGapCandidates.value]
  switch (sgSortBy.value) {
    case 'gaps':
      return list.sort((a, b) => b.matching_gap_skills.length - a.matching_gap_skills.length)
    case 'score':
      return list.sort((a, b) => b.revisit_score - a.revisit_score)
    default:
      return list
  }
})

// Top org gaps for the quick filter bar
const topOrgGaps = computed(() => {
  return orgGaps.value.slice(0, 8)
})

// Summary stats
const revisitStats = computed(() => [
  {
    value: allRevisitCandidates.value.length,
    label: 'Revisit Pool',
    color: 'primary',
    icon: 'mdi-account-reactivate'
  },
  {
    value: allRevisitCandidates.value.filter(c => c.flagged_revisit).length,
    label: 'Flagged by Interviewers',
    color: 'amber',
    icon: 'mdi-flag'
  },
  {
    value: skillGapCandidates.value.length,
    label: 'Fill Skill Gaps',
    color: 'success',
    icon: 'mdi-puzzle'
  },
  {
    value: orgGaps.value.length,
    label: 'Org Skill Gaps',
    color: 'warning',
    icon: 'mdi-alert-circle'
  }
])

// Helpers
function getScoreColor(score: number): string {
  if (score >= 80) return 'success'
  if (score >= 60) return 'amber-darken-2'
  if (score >= 40) return 'warning'
  return 'grey'
}

function getRecommendationColor(rec: string | null): string {
  const colors: Record<string, string> = {
    strong_yes: 'success',
    yes: 'teal',
    maybe: 'warning',
    neutral: 'grey',
    no: 'orange',
    strong_no: 'error'
  }
  return colors[rec || ''] || 'grey'
}

function formatRecommendation(rec: string | null): string {
  const labels: Record<string, string> = {
    strong_yes: 'Strong Yes',
    yes: 'Yes',
    maybe: 'Maybe',
    neutral: 'Neutral',
    no: 'No',
    strong_no: 'Strong No'
  }
  return labels[rec || ''] || 'Unknown'
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

/**
 * Compute a revisit score (0-100) based on multiple factors:
 * - Interview scores (weighted heavily)
 * - Number of rounds (further = more invested)
 * - Recommendation strength
 * - Explicit revisit flag
 * - Skill gap match count
 */
function computeRevisitScore(
  bestScore: number,
  roundCount: number,
  bestRec: string | null,
  flagged: boolean,
  gapMatches: number
): number {
  let score = 0

  // Interview score component (0-35 points)
  score += Math.min(35, (bestScore / 5) * 35)

  // Rounds component (0-20 points) — more rounds = more invested in candidate
  score += Math.min(20, roundCount * 5)

  // Recommendation component (0-25 points)
  const recScores: Record<string, number> = {
    strong_yes: 25,
    yes: 20,
    maybe: 12,
    neutral: 8,
    no: 3,
    strong_no: 0
  }
  score += recScores[bestRec || ''] ?? 5

  // Explicit flag bonus (0-10 points)
  if (flagged) score += 10

  // Skill gap match bonus (0-10 points)
  score += Math.min(10, gapMatches * 3)

  return Math.min(100, Math.round(score))
}

// Data fetching
async function fetchRevisitData() {
  loading.value = true
  try {
    // Fetch all non-hired, non-new candidates with their interviews and skills
    const [candidatesResult, interviewsResult, skillsResult, gapsResult] = await Promise.all([
      client
        .from('candidates')
        .select(`
          *,
          job_positions:target_position_id(title)
        `)
        .in('status', ['rejected', 'screening', 'interview', 'offer'])
        .order('applied_at', { ascending: false }),

      client
        .from('candidate_interviews')
        .select('*')
        .eq('status', 'completed')
        .order('scheduled_at', { ascending: false }),

      client
        .from('candidate_skills')
        .select(`
          *,
          skill_library:skill_id(id, name, category)
        `),

      client
        .from('employee_skill_gaps')
        .select('skill_id, skill_name, category, gap, employee_id')
        .gte('gap', 1)
    ])

    if (candidatesResult.error) throw candidatesResult.error
    if (interviewsResult.error) throw interviewsResult.error

    const candidates = (candidatesResult.data || []) as Candidate[]
    const interviews = interviewsResult.data || []
    const candidateSkills = skillsResult.data || []
    const gaps = gapsResult.data || []

    // Build lookup maps
    const interviewsByCandidate = new Map<string, typeof interviews>()
    for (const iv of interviews) {
      if (!interviewsByCandidate.has(iv.candidate_id)) {
        interviewsByCandidate.set(iv.candidate_id, [])
      }
      interviewsByCandidate.get(iv.candidate_id)!.push(iv)
    }

    const skillsByCandidate = new Map<string, typeof candidateSkills>()
    for (const cs of candidateSkills) {
      if (!skillsByCandidate.has(cs.candidate_id)) {
        skillsByCandidate.set(cs.candidate_id, [])
      }
      skillsByCandidate.get(cs.candidate_id)!.push(cs)
    }

    // Aggregate org skill gaps: which skills have the most employees with gaps
    const gapAgg = new Map<string, { skill_id: string; skill_name: string; category: string; employee_count: number; total_gap: number }>()
    for (const g of gaps) {
      const existing = gapAgg.get(g.skill_id)
      if (existing) {
        existing.employee_count++
        existing.total_gap += g.gap
      } else {
        gapAgg.set(g.skill_id, {
          skill_id: g.skill_id,
          skill_name: g.skill_name,
          category: g.category,
          employee_count: 1,
          total_gap: g.gap
        })
      }
    }

    orgGaps.value = Array.from(gapAgg.values())
      .map(g => ({ ...g, avg_gap: g.total_gap / g.employee_count }))
      .sort((a, b) => b.employee_count - a.employee_count)

    const gapSkillIds = new Set(gaps.map(g => g.skill_id))

    // Build revisit candidates
    const revisitList: RevisitCandidate[] = []

    for (const candidate of candidates) {
      const ivs = interviewsByCandidate.get(candidate.id) || []
      const skills = skillsByCandidate.get(candidate.id) || []

      // Compute interview metrics
      const bestScore = ivs.reduce((max, iv) => Math.max(max, iv.overall_score || 0), 0)
      const roundCount = ivs.length

      // Best recommendation (ordered by strength)
      const recOrder = ['strong_yes', 'yes', 'maybe', 'neutral', 'no', 'strong_no']
      const bestRec = ivs.reduce((best: string | null, iv) => {
        if (!iv.recommendation) return best
        if (!best) return iv.recommendation
        return recOrder.indexOf(iv.recommendation) < recOrder.indexOf(best) ? iv.recommendation : best
      }, null)

      // Check for explicit revisit flag (stored in interview notes/strengths as convention)
      const flaggedIv = ivs.find(iv => iv.revisit_eligible === true)
      const flagged = !!flaggedIv
      const revisitReason = flaggedIv?.revisit_reason || null

      // Furthest stage reached
      const stageOrder = ['new', 'screening', 'interview', 'offer']
      const furthestStage = stageOrder.includes(candidate.status)
        ? candidate.status
        : ivs.length > 0 ? 'interview' : candidate.status

      // Last interview date
      const lastInterview = ivs.length > 0
        ? ivs.reduce((latest, iv) => {
            const d = iv.scheduled_at || iv.created_at
            return d > (latest || '') ? d : latest
          }, '' as string)
        : null

      // Find skill gap matches
      const matchingGaps: SkillGapMatch[] = []
      for (const cs of skills) {
        const lib = (cs as any).skill_library
        if (lib && gapSkillIds.has(lib.id) && (cs.rating || 0) >= 3) {
          const gapInfo = gapAgg.get(lib.id)
          if (gapInfo) {
            matchingGaps.push({
              skill_id: lib.id,
              skill_name: lib.name,
              category: lib.category,
              candidate_rating: cs.rating || 0,
              org_gap_count: gapInfo.employee_count,
              avg_gap_size: gapInfo.total_gap / gapInfo.employee_count
            })
          }
        }
      }

      // Compute revisit score
      const revisitScore = computeRevisitScore(bestScore, roundCount, bestRec, flagged, matchingGaps.length)

      // Only include candidates that are worth revisiting:
      // - Had at least 1 interview, OR
      // - Were explicitly flagged, OR
      // - Match skill gaps
      if (roundCount > 0 || flagged || matchingGaps.length > 0) {
        revisitList.push({
          ...candidate,
          best_overall_score: bestScore,
          best_recommendation: bestRec,
          interview_rounds: roundCount,
          furthest_stage: furthestStage,
          flagged_revisit: flagged,
          revisit_reason: revisitReason,
          revisit_score: revisitScore,
          matching_gap_skills: matchingGaps,
          last_interview_at: lastInterview
        })
      }
    }

    allRevisitCandidates.value = revisitList.sort((a, b) => b.revisit_score - a.revisit_score)
  } catch (err: any) {
    console.error('Error fetching revisit data:', err)
    toast.error('Failed to load revisit candidates.')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchRevisitData()
})

defineExpose({ refresh: fetchRevisitData })
</script>

<style scoped>
.revisit-item {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  transition: all 0.2s ease;
}

.revisit-item:hover {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.04);
}

.cursor-pointer {
  cursor: pointer;
}
</style>
