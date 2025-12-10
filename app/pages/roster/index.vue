<script setup lang="ts">
/**
 * Team Roster Page
 * Uses useAppData for global hydrated employee data
 */
definePageMeta({
  middleware: ['auth']
})

// 1. Get our "Omni-Present" data
const { employees, skills, loading } = useAppData()
const authStore = useAuthStore()
const isAdmin = computed(() => authStore.isAdmin)

// 2. Local State for Filtering
const searchQuery = ref('')
const selectedDept = ref('All')
const showAddDialog = ref(false)

// 3. Computed: Filter the Master List
const filteredEmployees = computed(() => {
  if (!employees.value) return []
  
  return employees.value.filter(emp => {
    // Search Logic (Name or Title)
    const searchLower = searchQuery.value.toLowerCase()
    const matchesSearch = 
      emp.first_name?.toLowerCase().includes(searchLower) || 
      emp.last_name?.toLowerCase().includes(searchLower) ||
      emp.full_name?.toLowerCase().includes(searchLower) ||
      emp.position?.title?.toLowerCase().includes(searchLower) ||
      emp.email?.toLowerCase().includes(searchLower)

    // Department Filter
    const matchesDept = selectedDept.value === 'All' || emp.department?.name === selectedDept.value

    return matchesSearch && matchesDept
  })
})

// 4. Helper: Extract Unique Departments for the dropdown
const departments = computed(() => {
  const depts = new Set(employees.value.map(e => e.department?.name).filter(Boolean))
  return ['All', ...Array.from(depts).sort()]
})

// 5. Helper: Get Top Skills (sorted by rating, top 2)
const getTopSkills = (empSkills: typeof employees.value[0]['skills']) => {
  if (!empSkills || empSkills.length === 0) return []
  
  // Sort by rating (5 first) and take top 2
  return [...empSkills]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 2)
}

// 6. Helper: Get status badge color
const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800'
    case 'on_leave': return 'bg-amber-100 text-amber-800'
    case 'terminated': return 'bg-red-100 text-red-800'
    default: return 'bg-slate-100 text-slate-800'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active': return 'Active'
    case 'on_leave': return 'On Leave'
    case 'terminated': return 'Inactive'
    default: return status
  }
}

// Navigation
const router = useRouter()
const viewProfile = (empId: string) => {
  router.push(`/employees/${empId}`)
}
</script>

<template>
  <div class="space-y-6 p-6">
    
    <!-- Page Header -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Team Roster</h1>
        <p class="text-sm text-slate-500">Manage your staff, view skills, and track status.</p>
      </div>
      <div class="flex gap-3">
        <!-- Stats Card -->
        <div class="px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm text-center">
          <div class="text-xs text-slate-400 uppercase font-bold tracking-wide">Total Staff</div>
          <div class="text-xl font-bold text-slate-900">{{ employees.length }}</div>
        </div>
        <!-- Add Employee Button -->
        <button 
          v-if="isAdmin"
          class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-sm"
          @click="showAddDialog = true"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Employee
        </button>
      </div>
    </div>

    <!-- Filters Bar -->
    <div class="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex-wrap">
      <!-- Search -->
      <div class="relative flex-1 min-w-[200px] max-w-md">
        <svg class="absolute left-3 top-2.5 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Search by name, role, or email..." 
          class="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
      </div>
      
      <!-- Department Filter -->
      <select 
        v-model="selectedDept" 
        class="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option v-for="dept in departments" :key="dept" :value="dept">
          {{ dept === 'All' ? 'All Departments' : dept }}
        </option>
      </select>

      <!-- Results Count -->
      <div class="text-sm text-slate-500 ml-auto">
        Showing <span class="font-medium text-slate-700">{{ filteredEmployees.length }}</span> of {{ employees.length }}
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <div class="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      <span class="ml-3 text-slate-500">Loading roster...</span>
    </div>

    <!-- Data Table -->
    <div v-else class="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      <table class="w-full text-left border-collapse">
        <thead class="bg-slate-50 border-b border-slate-200">
          <tr>
            <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
            <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role & Dept</th>
            <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
            <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Top Skills</th>
            <th class="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          
          <tr 
            v-for="emp in filteredEmployees" 
            :key="emp.id" 
            class="hover:bg-slate-50 transition-colors group cursor-pointer"
            @click="viewProfile(emp.id)"
          >
            <!-- Employee Info -->
            <td class="px-6 py-3 whitespace-nowrap">
              <div class="flex items-center gap-3">
                <div class="h-9 w-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 overflow-hidden flex-shrink-0 ring-2 ring-white shadow-sm">
                  <img 
                    v-if="emp.avatar_url" 
                    :src="emp.avatar_url" 
                    :alt="emp.full_name"
                    class="h-full w-full object-cover"
                  >
                  <div v-else class="h-full w-full flex items-center justify-center text-xs font-bold text-white">
                    {{ emp.initials }}
                  </div>
                </div>
                <div>
                  <div class="text-sm font-medium text-slate-900">{{ emp.full_name }}</div>
                  <div class="text-xs text-slate-500">{{ emp.email }}</div>
                </div>
              </div>
            </td>

            <!-- Role & Department -->
            <td class="px-6 py-3 whitespace-nowrap">
              <div class="text-sm text-slate-900">{{ emp.position?.title || 'Unassigned' }}</div>
              <div class="text-xs text-slate-500">{{ emp.department?.name || 'General' }}</div>
            </td>

            <!-- Status Badge -->
            <td class="px-6 py-3 whitespace-nowrap">
              <span 
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                :class="getStatusColor(emp.employment_status)"
              >
                {{ getStatusLabel(emp.employment_status) }}
              </span>
            </td>

            <!-- Top Skills -->
            <td class="px-6 py-3">
              <div class="flex gap-2 flex-wrap">
                <span 
                  v-for="skill in getTopSkills(emp.skills)" 
                  :key="skill.skill_id"
                  class="inline-flex items-center px-2 py-1 rounded text-xs bg-slate-100 text-slate-700 border border-slate-200"
                >
                  {{ skill.skill_name }} 
                  <span class="ml-1 text-amber-500 font-bold">★{{ skill.rating }}</span>
                </span>
                <span v-if="!emp.skills?.length" class="text-xs text-slate-400 italic">No skills rated</span>
              </div>
            </td>

            <!-- Actions -->
            <td class="px-6 py-3 whitespace-nowrap text-right">
              <button 
                class="text-slate-400 hover:text-blue-600 font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                @click.stop="viewProfile(emp.id)"
              >
                View Profile →
              </button>
            </td>
          </tr>

        </tbody>
      </table>

      <!-- Empty State -->
      <div v-if="filteredEmployees.length === 0 && !loading" class="p-12 text-center">
        <svg class="mx-auto h-12 w-12 text-slate-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <h3 class="mt-4 text-sm font-medium text-slate-900">No employees found</h3>
        <p class="mt-1 text-sm text-slate-500">Try adjusting your search or filter criteria.</p>
        <button 
          class="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline" 
          @click="searchQuery = ''; selectedDept = 'All'"
        >
          Clear all filters
        </button>
      </div>
    </div>

    <!-- Add Employee Dialog (placeholder for future) -->
    <Teleport to="body">
      <div 
        v-if="showAddDialog" 
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="showAddDialog = false"
      >
        <div class="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
          <h2 class="text-lg font-semibold text-slate-900 mb-4">Add New Employee</h2>
          <p class="text-sm text-slate-500 mb-4">This feature is coming soon. You'll be able to add new team members directly from here.</p>
          <div class="flex justify-end">
            <button 
              class="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
              @click="showAddDialog = false"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<style scoped>
/* Smooth table row transitions */
tbody tr {
  transition: background-color 0.15s ease;
}

/* Hover effect for action button */
.group:hover .group-hover\:opacity-100 {
  opacity: 1;
}
</style>
