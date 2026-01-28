<script setup lang="ts">
/**
 * Dashboard / Command Center
 * Uses useAppData for global hydrated state
 * Supports Personal vs Company view toggle for admins
 */
definePageMeta({
  middleware: ['auth']
})

// Get global hydrated data
const { employees, skills, departments, loading, isAdmin, currentUserProfile, fetchGlobalData } = useAppData()
const client = useSupabaseClient()

// Dashboard view mode: 'personal' or 'company'
const viewMode = ref<'personal' | 'company'>('personal')

// Personal dashboard data
const myUpcomingShifts = ref<any[]>([])
const myPendingTimeOff = ref<any[]>([])
const myActiveGoals = ref<any[]>([])
const myTrainingProgress = ref<any[]>([])
const loadingPersonal = ref(false)

// Fetch personal dashboard data
async function fetchPersonalData() {
  if (!currentUserProfile.value?.id) return
  loadingPersonal.value = true
  
  try {
    const userId = currentUserProfile.value.id
    const today = new Date().toISOString().split('T')[0]
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    // Fetch upcoming shifts (next 7 days) - gracefully handle if table doesn't exist
    try {
      const { data: shifts } = await client
        .from('schedule_entries')
        .select('*, shift_template:shift_templates(*)')
        .eq('employee_id', userId)
        .gte('date', today)
        .lte('date', nextWeek)
        .order('date', { ascending: true })
        .limit(5)
      
      myUpcomingShifts.value = shifts || []
    } catch {
      myUpcomingShifts.value = []
    }
    
    // Fetch pending time off requests
    try {
      const { data: timeOff } = await client
        .from('time_off_requests')
        .select('*')
        .eq('employee_id', userId)
        .eq('status', 'pending')
        .order('start_date', { ascending: true })
        .limit(5)
      
      myPendingTimeOff.value = timeOff || []
    } catch {
      myPendingTimeOff.value = []
    }
    
    // Fetch active goals - use 'completed' boolean column instead of 'status'
    try {
      const { data: goals } = await client
        .from('employee_goals')
        .select('*')
        .eq('employee_id', userId)
        .eq('completed', false)
        .order('target_date', { ascending: true })
        .limit(5)
      
      myActiveGoals.value = goals || []
    } catch {
      myActiveGoals.value = []
    }
    
    // Fetch training progress - use user_id and correct status enum
    try {
      const { data: training } = await client
        .from('course_enrollments')
        .select('*, course:courses(*)')
        .eq('user_id', userId)
        .in('status', ['assigned', 'in_progress'])
        .order('assigned_at', { ascending: false })
        .limit(5)
      
      myTrainingProgress.value = training || []
    } catch {
      myTrainingProgress.value = []
    }
    
  } catch (err) {
    console.error('[Dashboard] Error fetching personal data:', err)
  } finally {
    loadingPersonal.value = false
  }
}

// Fetch data on mount
onMounted(async () => {
  console.log('[Dashboard] Fetching global data...')
  await fetchGlobalData()
  console.log('[Dashboard] Employees loaded:', employees.value.length)
  console.log('[Dashboard] isAdmin:', isAdmin.value)
  console.log('[Dashboard] currentUserProfile:', currentUserProfile.value)
  
  // Fetch personal data for personal view
  await fetchPersonalData()
})

// Watch view mode changes
watch(viewMode, async (newMode) => {
  if (newMode === 'personal' && myUpcomingShifts.value.length === 0) {
    await fetchPersonalData()
  }
})

// Greeting based on time of day
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
})

const firstName = computed(() => currentUserProfile.value?.first_name || 'there')

// Current date formatted
const currentDate = computed(() => {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

// Stats computed from employees (Company View)
const stats = computed(() => {
  const emps = employees.value || []
  const now = new Date()
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(now.getMonth() - 3)
  
  const newHires = emps.filter(e => 
    e.hire_date && new Date(e.hire_date) > threeMonthsAgo
  ).length

  const totalSkillRatings = emps.reduce((sum, e) => {
    return sum + (e.skills || []).reduce((s, skill) => s + (skill.rating || 0), 0)
  }, 0)
  
  const totalSkillCount = emps.reduce((sum, e) => sum + (e.skills?.length || 0), 0)
  const avgSkillLevel = totalSkillCount > 0 
    ? (totalSkillRatings / totalSkillCount).toFixed(1) 
    : '0.0'

  // Count mentors (employees with at least one skill at level 5)
  const mentorCount = emps.filter(e => 
    (e.skills || []).some(s => s.rating === 5)
  ).length

  return {
    totalStaff: emps.length,
    newHires,
    avgSkillLevel,
    mentorCount,
    departmentCount: departments.value?.length || 0,
    skillLibraryCount: skills.value?.length || 0
  }
})

// Personal stats computed from user profile (Personal View)
const personalStats = computed(() => {
  const profile = currentUserProfile.value
  if (!profile) return { skillCount: 0, avgSkillLevel: '0.0', upcomingShifts: 0, pendingRequests: 0, activeGoals: 0 }
  
  // Get user's skills from employees array
  const userEmployee = employees.value.find(e => e.id === profile.id)
  const userSkills = userEmployee?.skills || []
  
  const totalRating = userSkills.reduce((sum, s) => sum + s.rating, 0)
  const avgSkillLevel = userSkills.length > 0 
    ? (totalRating / userSkills.length).toFixed(1) 
    : '0.0'
  
  return {
    skillCount: userSkills.length,
    avgSkillLevel,
    upcomingShifts: myUpcomingShifts.value.length,
    pendingRequests: myPendingTimeOff.value.length,
    activeGoals: myActiveGoals.value.length,
    trainingInProgress: myTrainingProgress.value.length
  }
})

// Top departments by employee count
const topDepartments = computed(() => {
  const deptCounts: Record<string, { name: string; count: number }> = {}
  
  employees.value.forEach(emp => {
    if (emp.department) {
      const name = emp.department.name
      if (!deptCounts[name]) {
        deptCounts[name] = { name, count: 0 }
      }
      deptCounts[name].count++
    }
  })
  
  return Object.values(deptCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
})

// Recent hires (last 3 months)
const recentHires = computed(() => {
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  
  return employees.value
    .filter(e => e.hire_date && new Date(e.hire_date) > threeMonthsAgo)
    .sort((a, b) => new Date(b.hire_date!).getTime() - new Date(a.hire_date!).getTime())
    .slice(0, 5)
})

// Top skilled employees (mentors)
const topMentors = computed(() => {
  return employees.value
    .map(emp => ({
      ...emp,
      mentorSkillCount: emp.skills.filter(s => s.rating === 5).length,
      avgRating: emp.skills.length > 0 
        ? emp.skills.reduce((sum, s) => sum + s.rating, 0) / emp.skills.length 
        : 0
    }))
    .filter(emp => emp.mentorSkillCount > 0)
    .sort((a, b) => b.mentorSkillCount - a.mentorSkillCount || b.avgRating - a.avgRating)
    .slice(0, 5)
})

// Quick links - Personal view
const personalQuickLinks = [
  { icon: '👤', label: 'My Profile', href: '/profile', color: 'bg-purple-100 text-purple-600' },
  { icon: '📅', label: 'My Schedule', href: '/my-schedule', color: 'bg-green-100 text-green-600' },
  { icon: '🏖️', label: 'Time Off', href: '/my-schedule?tab=timeoff', color: 'bg-cyan-100 text-cyan-600' },
  { icon: '⭐', label: 'My Skills', href: '/people/my-skills', color: 'bg-amber-100 text-amber-600' },
  { icon: '🎯', label: 'My Goals', href: '/goals', color: 'bg-pink-100 text-pink-600' },
  { icon: '🎓', label: 'Training', href: '/training', color: 'bg-indigo-100 text-indigo-600' },
]

// Quick links - Company view (admin)
const companyQuickLinks = [
  { icon: '👥', label: 'Team Roster', href: '/roster', color: 'bg-blue-100 text-blue-600' },
  { icon: '📅', label: 'Team Schedule', href: '/schedule', color: 'bg-green-100 text-green-600' },
  { icon: '🏢', label: 'Org Chart', href: '/org-chart', color: 'bg-pink-100 text-pink-600' },
  { icon: '📈', label: 'Recruiting', href: '/recruiting', color: 'bg-teal-100 text-teal-600' },
  { icon: '🎓', label: 'Academy', href: '/academy', color: 'bg-amber-100 text-amber-600' },
  { icon: '⚙️', label: 'Settings', href: '/settings', color: 'bg-slate-100 text-slate-600' },
]

// Active quick links based on view mode
const activeQuickLinks = computed(() => 
  viewMode.value === 'personal' ? personalQuickLinks : companyQuickLinks
)

// Navigation
const router = useRouter()
const navigateTo = (path: string) => router.push(path)

// Format shift time helper
const formatShiftTime = (time: string) => {
  if (!time) return ''
  const [hours, minutes] = time.split(':')
  const h = parseInt(hours)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${minutes} ${ampm}`
}
</script>

<template>
  <div class="p-6 space-y-6 max-w-7xl mx-auto">
    
    <!-- Hero Header -->
    <div class="flex items-start justify-between flex-wrap gap-4">
      <div>
        <p class="text-slate-500 text-sm">{{ greeting }}, <span class="font-medium text-slate-700">{{ firstName }}</span>! 👋</p>
        <h1 class="text-2xl md:text-3xl font-bold text-slate-900 mt-1">
          {{ viewMode === 'personal' ? 'My Dashboard' : 'Company Dashboard' }}
        </h1>
        <p class="text-sm text-slate-400 mt-1">{{ currentDate }}</p>
      </div>
      
      <!-- View Toggle (Admin Only) + Quick Actions -->
      <div class="flex items-center gap-3">
        <!-- View Toggle for Admins -->
        <div v-if="isAdmin" class="flex items-center bg-slate-100 rounded-lg p-1">
          <button
            @click="viewMode = 'personal'"
            class="px-3 py-1.5 text-sm font-medium rounded-md transition-all"
            :class="viewMode === 'personal' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'"
          >
            👤 Personal
          </button>
          <button
            @click="viewMode = 'company'"
            class="px-3 py-1.5 text-sm font-medium rounded-md transition-all"
            :class="viewMode === 'company' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'"
          >
            🏢 Company
          </button>
        </div>
        
        <NuxtLink 
          :to="viewMode === 'personal' ? '/profile' : '/roster'"
          class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-sm"
        >
          <span>{{ viewMode === 'personal' ? '👤' : '👥' }}</span>
          {{ viewMode === 'personal' ? 'My Profile' : 'View Team' }}
        </NuxtLink>

      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading || loadingPersonal" class="flex items-center justify-center py-16">
      <div class="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      <span class="ml-3 text-slate-500">Loading dashboard...</span>
    </div>

    <template v-else>
    
      <!-- ======================= PERSONAL VIEW ======================= -->
      <template v-if="viewMode === 'personal'">
        
        <!-- Personal Stats Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <!-- Upcoming Shifts -->
          <UiGlassCard 
            variant="light" 
            :tilt-intensity="8"
            class="cursor-pointer"
            @click="navigateTo('/my-schedule')"
          >
            <div class="p-4">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-2xl shadow-lg">
                📅
              </div>
              <div class="mt-4">
                <div class="text-3xl font-bold text-gradient">{{ personalStats.upcomingShifts }}</div>
                <div class="text-sm text-slate-500 font-medium">Shifts This Week</div>
              </div>
            </div>
          </UiGlassCard>

          <!-- My Skills -->
          <UiGlassCard 
            variant="light" 
            :tilt-intensity="8"
            class="cursor-pointer"
            @click="navigateTo('/people/my-skills')"
          >
            <div class="p-4">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-2xl shadow-lg">
                ⭐
              </div>
              <div class="mt-4">
                <div class="text-3xl font-bold text-gradient-gold">{{ personalStats.skillCount }}</div>
                <div class="text-sm text-slate-500 font-medium">My Skills</div>
              </div>
            </div>
          </UiGlassCard>

          <!-- Active Goals -->
          <UiGlassCard 
            variant="light" 
            :tilt-intensity="8"
            class="cursor-pointer"
            @click="navigateTo('/goals')"
          >
            <div class="p-4">
              <div class="flex items-center justify-between">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-2xl shadow-lg">
                  🎯
                </div>
                <span v-if="personalStats.activeGoals > 0" class="text-xs font-bold text-pink-600 bg-pink-100 px-2.5 py-1 rounded-full">
                  Active
                </span>
              </div>
              <div class="mt-4">
                <div class="text-3xl font-bold text-gradient">{{ personalStats.activeGoals }}</div>
                <div class="text-sm text-slate-500 font-medium">Active Goals</div>
              </div>
            </div>
          </UiGlassCard>

          <!-- Training Progress -->
          <UiGlassCard 
            variant="light" 
            :tilt-intensity="8"
            class="cursor-pointer"
            @click="navigateTo('/training')"
          >
            <div class="p-4">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg">
                🎓
              </div>
              <div class="mt-4">
                <div class="text-3xl font-bold text-gradient">{{ personalStats.trainingInProgress }}</div>
                <div class="text-sm text-slate-500 font-medium">Courses In Progress</div>
              </div>
            </div>
          </UiGlassCard>
        </div>

        <!-- Personal Main Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <!-- Quick Links -->
          <UiGlassCard variant="light" :hover="false" :glow="false">
            <div class="p-5">
              <h2 class="text-lg font-semibold text-slate-900 mb-4">Quick Access</h2>
              <div class="grid grid-cols-3 gap-3">
                <NuxtLink 
                  v-for="link in activeQuickLinks" 
                  :key="link.href"
                  :to="link.href"
                  class="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/50 transition text-center group hover-lift"
                >
                  <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-xl shadow-sm group-hover:shadow-md transition">
                    {{ link.icon }}
                  </div>
                  <span class="text-xs font-medium text-slate-600 group-hover:text-slate-900">{{ link.label }}</span>
                </NuxtLink>
              </div>
            </div>
          </UiGlassCard>

          <!-- Upcoming Shifts -->
          <UiGlassCard variant="light" :hover="false" :glow="false">
            <div class="p-5">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-semibold text-slate-900">📅 Upcoming Shifts</h2>
                <NuxtLink to="/my-schedule" class="text-xs text-green-600 hover:text-green-700 font-medium">View all →</NuxtLink>
              </div>
              <div class="space-y-2">
                <div 
                  v-for="shift in myUpcomingShifts" 
                  :key="shift.id"
                  class="flex items-center justify-between p-3 rounded-xl bg-white/50 hover:bg-white/80 transition"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-sm font-bold">
                      {{ new Date(shift.date).getDate() }}
                    </div>
                    <div>
                      <div class="text-sm font-medium text-slate-900">
                        {{ new Date(shift.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) }}
                      </div>
                      <div class="text-xs text-slate-500">
                        {{ shift.shift_template?.name || 'Shift' }}
                      </div>
                    </div>
                  </div>
                  <div class="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
                    {{ formatShiftTime(shift.shift_template?.start_time || shift.start_time) }}
                  </div>
                </div>
                <div v-if="myUpcomingShifts.length === 0" class="text-sm text-slate-400 italic text-center py-4">
                  No upcoming shifts this week
                </div>
              </div>
            </div>
          </UiGlassCard>

          <!-- Pending Time Off / Active Goals -->
          <UiGlassCard variant="light" :hover="false" :glow="false">
            <div class="p-5">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-semibold text-slate-900">🎯 Active Goals</h2>
                <NuxtLink to="/goals" class="text-xs text-green-600 hover:text-green-700 font-medium">View all →</NuxtLink>
              </div>
              <div class="space-y-2">
                <div 
                  v-for="goal in myActiveGoals" 
                  :key="goal.id"
                  class="p-3 rounded-xl bg-white/50 hover:bg-white/80 transition cursor-pointer"
                  @click="navigateTo('/goals')"
                >
                  <div class="flex items-center gap-2 mb-1">
                    <span :class="goal.status === 'in_progress' ? 'text-blue-500' : 'text-slate-400'">●</span>
                    <span class="text-sm font-medium text-slate-900 truncate">{{ goal.title }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-slate-500">{{ goal.category || 'General' }}</span>
                    <span v-if="goal.target_date" class="text-xs text-slate-400">
                      Due {{ new Date(goal.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}
                    </span>
                  </div>
                </div>
                <div v-if="myActiveGoals.length === 0" class="text-sm text-slate-400 italic text-center py-4">
                  No active goals - set some goals to track your progress!
                </div>
              </div>
            </div>
          </UiGlassCard>
        </div>

        <!-- Training Progress Section -->
        <UiGlassCard v-if="myTrainingProgress.length > 0" variant="light" :hover="false" :glow="false" shimmer>
          <div class="p-5">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-slate-900">🎓 My Training</h2>
              <NuxtLink to="/training" class="text-xs text-green-600 hover:text-green-700 font-medium">View all →</NuxtLink>
            </div>
            <div class="flex gap-4 overflow-x-auto pb-2">
              <UiGlassCard 
                v-for="enrollment in myTrainingProgress" 
                :key="enrollment.id"
                variant="primary"
                :tilt-intensity="12"
                class="flex-shrink-0 w-56 cursor-pointer"
                @click="navigateTo('/training')"
              >
                <div class="p-4">
                  <div class="text-2xl mb-2">📚</div>
                  <div class="text-sm font-bold text-slate-900 truncate mb-1">{{ enrollment.course?.title || 'Course' }}</div>
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-slate-500">{{ enrollment.status === 'in_progress' ? 'In Progress' : 'Enrolled' }}</span>
                    <span v-if="enrollment.progress" class="text-xs font-bold text-green-600">{{ enrollment.progress }}%</span>
                  </div>
                </div>
              </UiGlassCard>
            </div>
          </div>
        </UiGlassCard>

        <!-- Time Off Requests -->
        <UiGlassCard v-if="myPendingTimeOff.length > 0" variant="light" :hover="false" :glow="false">
          <div class="p-5">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-slate-900">🏖️ Pending Time Off</h2>
              <NuxtLink to="/my-schedule?tab=timeoff" class="text-xs text-green-600 hover:text-green-700 font-medium">View all →</NuxtLink>
            </div>
            <div class="space-y-2">
              <div 
                v-for="request in myPendingTimeOff" 
                :key="request.id"
                class="flex items-center justify-between p-3 rounded-xl bg-amber-50/50 border border-amber-200/50"
              >
                <div>
                  <div class="text-sm font-medium text-slate-900">{{ request.request_type || 'Time Off' }}</div>
                  <div class="text-xs text-slate-500">
                    {{ new Date(request.start_date).toLocaleDateString() }} - {{ new Date(request.end_date).toLocaleDateString() }}
                  </div>
                </div>
                <span class="text-xs font-bold text-amber-600 bg-amber-100 px-2.5 py-1 rounded-full">
                  Pending
                </span>
              </div>
            </div>
          </div>
        </UiGlassCard>

      </template>
      
      <!-- ======================= COMPANY VIEW (Admin) ======================= -->
      <template v-else>
      
      <!-- Stats Grid - Glassmorphism Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <!-- Total Staff -->
        <UiGlassCard 
          variant="light" 
          :tilt-intensity="8"
          class="cursor-pointer"
          @click="navigateTo('/roster')"
        >
          <div class="p-4">
            <div class="flex items-center justify-between">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-2xl shadow-lg">
                👥
              </div>
              <span v-if="stats.newHires > 0" class="text-xs font-bold text-green-600 bg-green-100 px-2.5 py-1 rounded-full animate-pulse">
                +{{ stats.newHires }}
              </span>
            </div>
            <div class="mt-4">
              <div class="text-3xl font-bold text-gradient">{{ stats.totalStaff }}</div>
              <div class="text-sm text-slate-500 font-medium">Total Staff</div>
            </div>
          </div>
        </UiGlassCard>

        <!-- Avg Skill Level -->
        <UiGlassCard 
          variant="light" 
          :tilt-intensity="8"
          class="cursor-pointer"
          @click="navigateTo('/people/skill-stats')"
        >
          <div class="p-4">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg">
              ⭐
            </div>
            <div class="mt-4">
              <div class="text-3xl font-bold text-gradient">{{ stats.avgSkillLevel }}</div>
              <div class="text-sm text-slate-500 font-medium">Avg Skill Level</div>
            </div>
          </div>
        </UiGlassCard>

        <!-- Mentors -->
        <UiGlassCard 
          variant="light" 
          :tilt-intensity="8"
          class="cursor-pointer"
          @click="navigateTo('/mentorship')"
        >
          <div class="p-4">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-2xl shadow-lg">
              🏅
            </div>
            <div class="mt-4">
              <div class="text-3xl font-bold text-gradient-gold">{{ stats.mentorCount }}</div>
              <div class="text-sm text-slate-500 font-medium">Active Mentors</div>
            </div>
          </div>
        </UiGlassCard>

        <!-- Skill Library -->
        <UiGlassCard 
          variant="light" 
          :tilt-intensity="8"
          class="cursor-pointer"
          @click="navigateTo('/admin/skills-management')"
        >
          <div class="p-4">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-2xl shadow-lg">
              📚
            </div>
            <div class="mt-4">
              <div class="text-3xl font-bold text-gradient">{{ stats.skillLibraryCount }}</div>
              <div class="text-sm text-slate-500 font-medium">Skills in Library</div>
            </div>
          </div>
        </UiGlassCard>
      </div>

      <!-- Main Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Quick Links -->
        <UiGlassCard variant="light" :hover="false" :glow="false">
          <div class="p-5">
            <h2 class="text-lg font-semibold text-slate-900 mb-4">Quick Access</h2>
            <div class="grid grid-cols-3 gap-3">
              <NuxtLink 
                v-for="link in activeQuickLinks" 
                :key="link.href"
                :to="link.href"
                class="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/50 transition text-center group hover-lift"
              >
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-xl shadow-sm group-hover:shadow-md transition">
                  {{ link.icon }}
                </div>
                <span class="text-xs font-medium text-slate-600 group-hover:text-slate-900">{{ link.label }}</span>
              </NuxtLink>
            </div>
          </div>
        </UiGlassCard>

        <!-- Top Departments -->
        <UiGlassCard variant="light" :hover="false" :glow="false">
          <div class="p-5">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-slate-900">Departments</h2>
              <span class="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{{ stats.departmentCount }} total</span>
            </div>
            <div class="space-y-3">
              <div 
                v-for="(dept, index) in topDepartments" 
                :key="dept.name"
                class="flex items-center justify-between p-2 rounded-lg hover:bg-white/50 transition"
              >
                <div class="flex items-center gap-2">
                  <span class="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-bold">
                    {{ index + 1 }}
                  </span>
                  <span class="text-sm text-slate-700 font-medium">{{ dept.name }}</span>
                </div>
                <span class="text-sm font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-full">
                  {{ dept.count }}
                </span>
              </div>
              <div v-if="topDepartments.length === 0" class="text-sm text-slate-400 italic text-center py-4">
                No department data
              </div>
            </div>
          </div>
        </UiGlassCard>

        <!-- Top Mentors -->
        <UiGlassCard variant="light" :hover="false" :glow="false">
          <div class="p-5">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-slate-900">🏅 Top Mentors</h2>
              <NuxtLink to="/mentorship" class="text-xs text-green-600 hover:text-green-700 font-medium">View all →</NuxtLink>
            </div>
            <div class="space-y-2">
              <div 
                v-for="mentor in topMentors" 
                :key="mentor.id"
                class="flex items-center gap-3 p-2 rounded-xl hover:bg-white/50 transition cursor-pointer group"
                @click="navigateTo('/employees/' + mentor.id)"
              >
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm font-bold shadow-md group-hover:shadow-lg transition">
                  {{ mentor.initials }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-semibold text-slate-900 truncate">{{ mentor.full_name }}</div>
                  <div class="text-xs text-slate-500">{{ mentor.position?.title || 'Team Member' }}</div>
                </div>
                <div class="text-xs font-bold text-amber-600 bg-amber-100 px-2.5 py-1 rounded-full shadow-sm">
                  {{ mentor.mentorSkillCount }} ★5
                </div>
              </div>
              <div v-if="topMentors.length === 0" class="text-sm text-slate-400 italic text-center py-4">
                No mentors yet
              </div>
            </div>
          </div>
        </UiGlassCard>
      </div>

      <!-- Recent Hires - with shimmer effect -->
      <UiGlassCard variant="light" :hover="false" :glow="false" shimmer>
        <div class="p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-slate-900">🆕 Recent Hires</h2>
            <span class="text-xs text-slate-400 bg-green-100 text-green-700 px-2 py-1 rounded-full">Last 3 months</span>
          </div>
          
          <div v-if="recentHires.length > 0" class="flex gap-4 overflow-x-auto pb-2">
            <UiGlassCard 
              v-for="hire in recentHires" 
              :key="hire.id"
              variant="primary"
              :tilt-intensity="12"
              class="flex-shrink-0 w-52 cursor-pointer"
              @click="navigateTo('/employees/' + hire.id)"
            >
              <div class="p-4">
                <div class="flex items-center gap-3 mb-3">
                  <div class="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-sm font-bold shadow-lg">
                    {{ hire.initials }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-bold text-slate-900 truncate">{{ hire.full_name }}</div>
                    <div class="text-xs text-slate-500">{{ hire.position?.title || 'Team Member' }}</div>
                  </div>
                </div>
                <div class="flex items-center gap-2 text-xs text-green-600 font-medium">
                  <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Started {{ new Date(hire.hire_date!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}
                </div>
              </div>
            </UiGlassCard>
          </div>
          
          <div v-else class="text-sm text-slate-400 italic text-center py-6">
            No recent hires in the last 3 months
          </div>
        </div>
      </UiGlassCard>

      <!-- Admin Section - Premium Dark Glass -->
      <UiGlassCard v-if="isAdmin" variant="dark" :tilt-intensity="5">
        <div class="p-6 bg-gradient-to-r from-slate-900/80 to-slate-800/80 rounded-2xl">
          <div class="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-2xl">🔐</span>
                <h2 class="text-xl font-bold text-white">Admin Panel</h2>
              </div>
              <p class="text-sm text-slate-400 mt-1">Manage your organization settings and data</p>
            </div>
            <div class="flex gap-3">
              <NuxtLink 
                to="/settings"
                class="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl transition border border-white/10 hover:border-white/20"
              >
                ⚙️ Settings
              </NuxtLink>
              <NuxtLink 
                to="/growth/leads"
                class="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-green-500/25"
              >
                📈 Growth Hub
              </NuxtLink>
            </div>
          </div>
        </div>
      </UiGlassCard>
      
      <!-- Role-Based Dashboard Widgets -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <!-- Manager Widget - for admins and office admins -->
        <DashboardManagerWidget v-if="isAdmin || currentUserProfile?.role === 'office_admin'" />
        
        <!-- Admin Widget - for admins only -->
        <DashboardAdminWidget v-if="isAdmin" />
      </div>
      
      </template><!-- End Company View -->
    </template><!-- End v-else loading -->

  </div>
</template>

<style scoped>
/* Smooth hover effects */
.group:hover {
  transform: translateY(-1px);
}
</style>
