<script setup lang="ts">
// Simple CSS-forced sidebar - no complex state management needed
// NuxtLink handles active state automatically with 'active-class'
const authStore = useAuthStore()
const router = useRouter()

const profile = computed(() => authStore.profile)
const isAdmin = computed(() => authStore.isAdmin)
const initials = computed(() => authStore.initials || 'U')
const fullName = computed(() => authStore.fullName || 'User')

async function handleSignOut() {
  await authStore.signOut()
  router.push('/auth/login')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    
    <!-- Fixed Sidebar - Always visible on desktop via CSS -->
    <aside class="fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white border-r border-slate-800 flex flex-col">
      
      <!-- Logo Header -->
      <div class="flex h-16 items-center px-6 bg-slate-950 shrink-0">
        <span class="text-xl font-bold tracking-tight text-white">🐾 TeamOS</span>
      </div>

      <!-- Navigation - Scrollable if needed -->
      <nav class="flex-1 overflow-y-auto p-4 space-y-1">
        
        <!-- Dashboard -->
        <NuxtLink to="/" 
          class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          active-class="!bg-blue-600 !text-white shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
          Dashboard
        </NuxtLink>

        <!-- Section: People & Skills -->
        <div class="pt-5 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          👥 People & Skills
        </div>

        <NuxtLink to="/employees" 
          class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          active-class="!bg-blue-600 !text-white shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Roster
        </NuxtLink>

        <NuxtLink to="/my-stats" 
          class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          active-class="!bg-blue-600 !text-white shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
          My Stats
        </NuxtLink>

        <NuxtLink to="/mentorship" 
          class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          active-class="!bg-blue-600 !text-white shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Mentorship
        </NuxtLink>

        <!-- Section: Operations -->
        <div class="pt-5 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          📅 Operations
        </div>

        <NuxtLink to="/schedule" 
          class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          active-class="!bg-blue-600 !text-white shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          Schedule
        </NuxtLink>

        <NuxtLink to="/time-off" 
          class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          active-class="!bg-blue-600 !text-white shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
          Time Off
        </NuxtLink>

        <NuxtLink to="/my-ops" 
          class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          active-class="!bg-blue-600 !text-white shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          My Ops
        </NuxtLink>

        <!-- Section: Growth -->
        <div class="pt-5 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          🎓 Growth
        </div>

        <NuxtLink to="/training" 
          class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          active-class="!bg-blue-600 !text-white shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          Training
        </NuxtLink>

        <NuxtLink to="/goals" 
          class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          active-class="!bg-blue-600 !text-white shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          Goals
        </NuxtLink>

        <NuxtLink to="/reviews" 
          class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          active-class="!bg-blue-600 !text-white shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          Reviews
        </NuxtLink>

        <!-- Admin Section -->
        <template v-if="isAdmin">
          <div class="pt-5 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            ⚙️ Admin
          </div>

          <NuxtLink to="/ops" 
            class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            active-class="!bg-blue-600 !text-white shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            Ops Center
          </NuxtLink>

          <NuxtLink to="/skills" 
            class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            active-class="!bg-blue-600 !text-white shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            Skill Library
          </NuxtLink>

          <NuxtLink to="/org-chart" 
            class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            active-class="!bg-blue-600 !text-white shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="6" x="8" y="2" rx="1"/><rect width="6" height="6" x="2" y="14" rx="1"/><rect width="6" height="6" x="16" y="14" rx="1"/><path d="M12 8v4"/><path d="M12 12h6v2"/><path d="M12 12H6v2"/></svg>
            Org Chart
          </NuxtLink>

          <NuxtLink to="/settings" 
            class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            active-class="!bg-blue-600 !text-white shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            Settings
          </NuxtLink>
        </template>

      </nav>

      <!-- User Profile Footer -->
      <div class="shrink-0 border-t border-slate-800 bg-slate-900 p-4">
        <div class="flex items-center justify-between">
          <NuxtLink to="/profile" class="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div class="h-9 w-9 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
              {{ initials }}
            </div>
            <div class="text-sm">
              <div class="font-medium text-white">{{ fullName }}</div>
              <div class="text-xs text-slate-400">{{ isAdmin ? 'Admin' : 'Team Member' }}</div>
            </div>
          </NuxtLink>
          <button 
            @click="handleSignOut"
            class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Sign Out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
          </button>
        </div>
      </div>

    </aside>

    <!-- Main Content Area -->
    <main class="ml-64 min-h-screen bg-gray-50">
      <div class="p-6 lg:p-8">
        <slot />
      </div>
    </main>

  </div>
</template>

<style scoped>
/* Ensure active states work with NuxtLink */
.router-link-active:not(.router-link-exact-active) {
  /* For nested routes, only highlight if exact match */
}
</style>
