<script setup lang="ts">
/**
 * Dashboard / Command Center
 * Uses useAppData for global hydrated state
 */
definePageMeta({
  middleware: ['auth']
})

// Get global hydrated data
const { employees, skills, departments, loading, isAdmin, currentUserProfile } = useAppData()

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

// Stats computed from employees
const stats = computed(() => {
  const emps = employees.value || []
  const now = new Date()
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(now.getMonth() - 3)
  
  const newHires = emps.filter(e => 
    e.hire_date && new Date(e.hire_date) > threeMonthsAgo
  ).length

  const totalSkillRatings = emps.reduce((sum, e) => {
    return sum + e.skills.reduce((s, skill) => s + skill.rating, 0)
  }, 0)
  
  const totalSkillCount = emps.reduce((sum, e) => sum + e.skills.length, 0)
  const avgSkillLevel = totalSkillCount > 0 
    ? (totalSkillRatings / totalSkillCount).toFixed(1) 
    : '0.0'

  // Count mentors (employees with at least one skill at level 5)
  const mentorCount = emps.filter(e => 
    e.skills.some(s => s.rating === 5)
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

// Quick links
const quickLinks = [
  { icon: '👥', label: 'Team Roster', href: '/roster', color: 'bg-blue-100 text-blue-600' },
  { icon: '📅', label: 'Schedule', href: '/schedule', color: 'bg-green-100 text-green-600' },
  { icon: '⭐', label: 'Skills', href: '/skills', color: 'bg-purple-100 text-purple-600' },
  { icon: '🎓', label: 'Training', href: '/training', color: 'bg-amber-100 text-amber-600' },
  { icon: '📊', label: 'My Stats', href: '/my-stats', color: 'bg-teal-100 text-teal-600' },
  { icon: '🏢', label: 'Org Chart', href: '/org-chart', color: 'bg-pink-100 text-pink-600' },
]

// Navigation
const router = useRouter()
const navigateTo = (path: string) => router.push(path)
</script>

<template>
  <div class="p-6 space-y-6 max-w-7xl mx-auto">
    
    <!-- Hero Header -->
    <div class="flex items-start justify-between flex-wrap gap-4">
      <div>
        <p class="text-slate-500 text-sm">{{ greeting }}, <span class="font-medium text-slate-700">{{ firstName }}</span>! 👋</p>
        <h1 class="text-2xl md:text-3xl font-bold text-slate-900 mt-1">Command Center</h1>
        <p class="text-sm text-slate-400 mt-1">{{ currentDate }}</p>
      </div>
      
      <!-- Quick Actions -->
      <div class="flex gap-2">
        <NuxtLink 
          to="/roster"
          class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-sm"
        >
          <span>👥</span>
          View Team
        </NuxtLink>
        <NuxtLink 
          v-if="isAdmin"
          to="/settings"
          class="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition"
        >
          <span>⚙️</span>
          Settings
        </NuxtLink>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <div class="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      <span class="ml-3 text-slate-500">Loading dashboard...</span>
    </div>

    <template v-else>
      <!-- Stats Grid -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <!-- Total Staff -->
        <div 
          class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition cursor-pointer"
          @click="navigateTo('/roster')"
        >
          <div class="flex items-center justify-between">
            <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-xl">👥</div>
            <span v-if="stats.newHires > 0" class="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              +{{ stats.newHires }} new
            </span>
          </div>
          <div class="mt-3">
            <div class="text-2xl font-bold text-slate-900">{{ stats.totalStaff }}</div>
            <div class="text-sm text-slate-500">Total Staff</div>
          </div>
        </div>

        <!-- Avg Skill Level -->
        <div 
          class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition cursor-pointer"
          @click="navigateTo('/skills')"
        >
          <div class="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-xl">⭐</div>
          <div class="mt-3">
            <div class="text-2xl font-bold text-slate-900">{{ stats.avgSkillLevel }}</div>
            <div class="text-sm text-slate-500">Avg Skill Level</div>
          </div>
        </div>

        <!-- Mentors -->
        <div 
          class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition cursor-pointer"
          @click="navigateTo('/mentorship')"
        >
          <div class="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-xl">🏅</div>
          <div class="mt-3">
            <div class="text-2xl font-bold text-slate-900">{{ stats.mentorCount }}</div>
            <div class="text-sm text-slate-500">Active Mentors</div>
          </div>
        </div>

        <!-- Skill Library -->
        <div 
          class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition cursor-pointer"
          @click="navigateTo('/skills')"
        >
          <div class="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center text-xl">📚</div>
          <div class="mt-3">
            <div class="text-2xl font-bold text-slate-900">{{ stats.skillLibraryCount }}</div>
            <div class="text-sm text-slate-500">Skills in Library</div>
          </div>
        </div>
      </div>

      <!-- Main Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Quick Links -->
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 class="text-lg font-semibold text-slate-900 mb-4">Quick Access</h2>
          <div class="grid grid-cols-3 gap-3">
            <NuxtLink 
              v-for="link in quickLinks" 
              :key="link.href"
              :to="link.href"
              class="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-slate-50 transition text-center group"
            >
              <div :class="['w-10 h-10 rounded-lg flex items-center justify-center text-xl', link.color]">
                {{ link.icon }}
              </div>
              <span class="text-xs font-medium text-slate-600 group-hover:text-slate-900">{{ link.label }}</span>
            </NuxtLink>
          </div>
        </div>

        <!-- Top Departments -->
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-slate-900">Departments</h2>
            <span class="text-xs text-slate-400">{{ stats.departmentCount }} total</span>
          </div>
          <div class="space-y-3">
            <div 
              v-for="dept in topDepartments" 
              :key="dept.name"
              class="flex items-center justify-between"
            >
              <span class="text-sm text-slate-700">{{ dept.name }}</span>
              <span class="text-sm font-medium text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                {{ dept.count }} staff
              </span>
            </div>
            <div v-if="topDepartments.length === 0" class="text-sm text-slate-400 italic text-center py-4">
              No department data
            </div>
          </div>
        </div>

        <!-- Top Mentors -->
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-slate-900">🏅 Top Mentors</h2>
            <NuxtLink to="/mentorship" class="text-xs text-blue-600 hover:underline">View all</NuxtLink>
          </div>
          <div class="space-y-3">
            <div 
              v-for="mentor in topMentors" 
              :key="mentor.id"
              class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition cursor-pointer"
              @click="navigateTo(\`/employees/\${mentor.id}\`)"
            >
              <div class="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-xs font-bold">
                {{ mentor.initials }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-slate-900 truncate">{{ mentor.full_name }}</div>
                <div class="text-xs text-slate-500">{{ mentor.position?.title || 'Team Member' }}</div>
              </div>
              <div class="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">
                {{ mentor.mentorSkillCount }} ★5
              </div>
            </div>
            <div v-if="topMentors.length === 0" class="text-sm text-slate-400 italic text-center py-4">
              No mentors yet
            </div>
          </div>
        </div>

      </div>

      <!-- Recent Hires -->
      <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-slate-900">🆕 Recent Hires</h2>
          <span class="text-xs text-slate-400">Last 3 months</span>
        </div>
        
        <div v-if="recentHires.length > 0" class="flex gap-4 overflow-x-auto pb-2">
          <div 
            v-for="hire in recentHires" 
            :key="hire.id"
            class="flex-shrink-0 w-48 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            @click="navigateTo(\`/employees/\${hire.id}\`)"
          >
            <div class="flex items-center gap-3 mb-2">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-sm font-bold">
                {{ hire.initials }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-slate-900 truncate">{{ hire.full_name }}</div>
              </div>
            </div>
            <div class="text-xs text-slate-500">{{ hire.position?.title || 'Team Member' }}</div>
            <div class="text-xs text-slate-400 mt-1">
              Started {{ new Date(hire.hire_date!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}
            </div>
          </div>
        </div>
        
        <div v-else class="text-sm text-slate-400 italic text-center py-6">
          No recent hires in the last 3 months
        </div>
      </div>

      <!-- Admin Section -->
      <div v-if="isAdmin" class="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-5 shadow-lg">
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 class="text-lg font-semibold text-white">🔐 Admin Panel</h2>
            <p class="text-sm text-slate-400 mt-1">Manage your organization settings and data</p>
          </div>
          <div class="flex gap-2">
            <NuxtLink 
              to="/settings"
              class="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition"
            >
              ⚙️ Settings
            </NuxtLink>
            <NuxtLink 
              to="/leads"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
            >
              📈 Leads & Marketing
            </NuxtLink>
          </div>
        </div>
      </div>
    </template>

  </div>
</template>

<style scoped>
/* Smooth hover effects */
.group:hover {
  transform: translateY(-1px);
}
</style>
