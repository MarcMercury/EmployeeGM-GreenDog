<script setup lang="ts">
import { onMounted, ref } from 'vue'

const authStore = useAuthStore()
const { currentUserProfile, isAdmin: appDataIsAdmin, fetchGlobalData } = useAppData()
const router = useRouter()
const supabase = useSupabaseClient()

// Collapsible section states
const sections = ref({
  people: true,
  operations: true,
  recruiting: false,
  growth: true,
  marketing: false,
  admin: true
})

const toggleSection = (section: keyof typeof sections.value) => {
  sections.value[section] = !sections.value[section]
}

// Fetch profile AND global data on mount
onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) {
    console.log('[Layout] Session found, fetching profile for:', session.user.email)
    // Fetch both auth profile AND global app data
    await Promise.all([
      authStore.fetchProfile(session.user.id),
      fetchGlobalData()
    ])
  }
})

// Use profile from either source - prefer currentUserProfile from useAppData
const profile = computed(() => currentUserProfile.value || authStore.profile)
const isAdmin = computed(() => appDataIsAdmin.value || authStore.profile?.role === 'admin')
const firstName = computed(() => profile.value?.first_name || 'User')
const initials = computed(() => {
  const p = profile.value
  if (!p) return 'U'
  return `${p.first_name?.[0] || ''}${p.last_name?.[0] || ''}`.toUpperCase() || 'U'
})

async function handleSignOut() {
  await authStore.signOut()
  router.push('/auth/login')
}
</script>

<template>
  <v-app>
    <div class="min-h-screen bg-gray-50">
    
      <!-- Fixed Sidebar -->
      <aside class="fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white border-r border-slate-800/50 flex flex-col shadow-2xl">
      
        <!-- Logo Header -->
        <div class="flex h-16 items-center px-6 bg-slate-950/80 backdrop-blur shrink-0 border-b border-slate-800/50">
          <span class="text-xl font-bold tracking-tight bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">🐾 TeamOS</span>
        </div>

        <!-- Navigation - Scrollable -->
        <nav class="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
        
          <!-- Dashboard -->
          <NuxtLink to="/" 
            class="nav-link group"
            active-class="nav-link-active">
            <div class="nav-icon-wrap group-hover:bg-blue-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
            </div>
            Dashboard
          </NuxtLink>

          <!-- Section: People & Skills (Collapsible) -->
          <div class="pt-4">
            <button 
              @click="toggleSection('people')"
              class="section-header group"
            >
              <span>👥 People & Skills</span>
              <svg 
                class="w-4 h-4 transition-transform duration-200" 
                :class="{ 'rotate-180': sections.people }"
                xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="section-content" :class="{ 'section-open': sections.people }">
              <NuxtLink to="/roster" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-blue-500/20">👥</div>
                Roster
              </NuxtLink>
              <NuxtLink to="/my-stats" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-purple-500/20">🏅</div>
                My Stats
              </NuxtLink>
              <NuxtLink to="/mentorship" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-amber-500/20">🤝</div>
                Mentorship
              </NuxtLink>
              <NuxtLink to="/org-chart" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-teal-500/20">🏢</div>
                Org Chart
              </NuxtLink>
            </div>
          </div>

          <!-- Section: Operations (Collapsible) -->
          <div class="pt-2">
            <button 
              @click="toggleSection('operations')"
              class="section-header group"
            >
              <span>📅 Operations</span>
              <svg 
                class="w-4 h-4 transition-transform duration-200" 
                :class="{ 'rotate-180': sections.operations }"
                xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="section-content" :class="{ 'section-open': sections.operations }">
              <NuxtLink to="/schedule" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-green-500/20">📆</div>
                Schedule
              </NuxtLink>
              <NuxtLink to="/time-off" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-sky-500/20">🏖️</div>
                Time Off
              </NuxtLink>
              <NuxtLink to="/my-ops" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-indigo-500/20">⏰</div>
                My Ops
              </NuxtLink>
            </div>
          </div>

          <!-- Section: Recruiting (Collapsible) -->
          <div class="pt-2">
            <button 
              @click="toggleSection('recruiting')"
              class="section-header group"
            >
              <span>🎯 Recruiting</span>
              <svg 
                class="w-4 h-4 transition-transform duration-200" 
                :class="{ 'rotate-180': sections.recruiting }"
                xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="section-content" :class="{ 'section-open': sections.recruiting }">
              <NuxtLink to="/recruiting" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-violet-500/20">📋</div>
                Pipeline
              </NuxtLink>
              <NuxtLink to="/recruiting/candidates" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-pink-500/20">👤</div>
                Candidates
              </NuxtLink>
              <NuxtLink to="/referrals" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-rose-500/20">🔗</div>
                Referrals
              </NuxtLink>
            </div>
          </div>

          <!-- Section: Growth (Collapsible) -->
          <div class="pt-2">
            <button 
              @click="toggleSection('growth')"
              class="section-header group"
            >
              <span>🎓 Growth</span>
              <svg 
                class="w-4 h-4 transition-transform duration-200" 
                :class="{ 'rotate-180': sections.growth }"
                xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="section-content" :class="{ 'section-open': sections.growth }">
              <NuxtLink to="/training" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-amber-500/20">📚</div>
                Training
              </NuxtLink>
              <NuxtLink to="/goals" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-emerald-500/20">🎯</div>
                Goals
              </NuxtLink>
              <NuxtLink to="/reviews" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-blue-500/20">📊</div>
                Reviews
              </NuxtLink>
              <NuxtLink to="/feedback" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-cyan-500/20">💬</div>
                Feedback
              </NuxtLink>
            </div>
          </div>

          <!-- Section: Marketing (Collapsible) -->
          <div class="pt-2">
            <button 
              @click="toggleSection('marketing')"
              class="section-header group"
            >
              <span>📣 Marketing</span>
              <svg 
                class="w-4 h-4 transition-transform duration-200" 
                :class="{ 'rotate-180': sections.marketing }"
                xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="section-content" :class="{ 'section-open': sections.marketing }">
              <NuxtLink to="/marketing" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-fuchsia-500/20">📈</div>
                Campaigns
              </NuxtLink>
              <NuxtLink to="/leads" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-orange-500/20">🔥</div>
                Leads
              </NuxtLink>
              <NuxtLink to="/growth/partners" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-lime-500/20">🤝</div>
                Partners
              </NuxtLink>
            </div>
          </div>

          <!-- Section: Admin (Collapsible) - Only for admins -->
          <template v-if="isAdmin">
            <div class="pt-2">
              <button 
                @click="toggleSection('admin')"
                class="section-header group"
              >
                <span>⚙️ Admin</span>
                <svg 
                  class="w-4 h-4 transition-transform duration-200" 
                  :class="{ 'rotate-180': sections.admin }"
                  xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="section-content" :class="{ 'section-open': sections.admin }">
                <NuxtLink to="/ops" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-red-500/20">🎛️</div>
                  Ops Center
                </NuxtLink>
                <NuxtLink to="/skills" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-yellow-500/20">⭐</div>
                  Skill Library
                </NuxtLink>
                <NuxtLink to="/settings" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-slate-500/20">⚙️</div>
                  Settings
                </NuxtLink>
              </div>
            </div>
          </template>

        </nav>

        <!-- User Profile Footer -->
        <div class="shrink-0 border-t border-slate-800/50 bg-slate-950/50 backdrop-blur p-4">
          <div class="flex items-center justify-between">
            <NuxtLink to="/profile" class="flex items-center gap-3 hover:opacity-80 transition-opacity group">
              <div class="h-10 w-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-sm font-bold shadow-lg group-hover:shadow-green-500/25 transition-shadow">
                {{ initials }}
              </div>
              <div class="text-sm">
                <div class="font-medium text-white">{{ firstName }}</div>
                <div class="text-xs" :class="isAdmin ? 'text-amber-400 font-semibold' : 'text-slate-400'">
                  {{ isAdmin ? '⭐ Admin' : 'Team Member' }}
                </div>
              </div>
            </NuxtLink>
            <button 
              @click="handleSignOut"
              class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all hover:scale-110"
              title="Sign Out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            </button>
          </div>
        </div>

      </aside>

      <!-- Main Content Area -->
      <main class="ml-64 min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div class="p-6 lg:p-8">
          <slot />
        </div>
      </main>

    </div>
  </v-app>
</template>

<style scoped>
/* Navigation Link Styles */
.nav-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.75rem;
  color: #cbd5e1;
  transition: all 0.2s ease;
  cursor: pointer;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.05);
  color: white;
}

.nav-link-active {
  background: linear-gradient(to right, #16a34a, #059669) !important;
  color: white !important;
  box-shadow: 0 10px 15px -3px rgba(34, 197, 94, 0.2);
}

.nav-icon-wrap {
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  background: rgba(30, 41, 59, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: background-color 0.2s;
}

/* Section Header */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: color 0.2s;
  background: none;
  border: none;
}

.section-header:hover {
  color: #e2e8f0;
}

/* Collapsible Section Content */
.section-content {
  overflow: hidden;
  max-height: 0;
  opacity: 0;
  transition: all 0.3s ease-in-out;
}

.section-open {
  max-height: 500px;
  opacity: 1;
  margin-top: 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

/* Custom Scrollbar */
.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>