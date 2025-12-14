<script setup lang="ts">
const authStore = useAuthStore()
const { currentUserProfile, isAdmin: appDataIsAdmin, fetchGlobalData, initialized } = useAppData()
const supabase = useSupabaseClient()

// Collapsible section states
const sections = ref({
  people: true,
  growth: true,
  operations: true,
  adminOps: false,
  medOps: false,
  recruiting: false,
  marketing: true,
  admin: true
})

const toggleSection = (section: keyof typeof sections.value) => {
  sections.value[section] = !sections.value[section]
}

// Only fetch data once using callOnce to prevent hydration issues
await callOnce(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) {
    console.log('[Layout] Session found, fetching data for:', session.user.email)
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
  console.log('[Layout] Signing out...')
  try {
    await supabase.auth.signOut()
    authStore.$reset()
    window.location.href = '/auth/login'
  } catch (e) {
    console.error('[Layout] Sign out error:', e)
    window.location.href = '/auth/login'
  }
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
              <NuxtLink to="/profile" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-purple-500/20">👤</div>
                My Profile
              </NuxtLink>
              <NuxtLink to="/development" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-emerald-500/20">📈</div>
                My Growth
              </NuxtLink>
              <NuxtLink to="/people/my-skills" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-amber-500/20">⭐</div>
                My Skills
              </NuxtLink>
              <NuxtLink to="/org-chart" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-teal-500/20">🏢</div>
                Org Chart
              </NuxtLink>
              <template v-if="isAdmin">
                <NuxtLink to="/people/skill-matrix" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-indigo-500/20">📊</div>
                  Skill Matrix
                  <span class="ml-auto text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Admin</span>
                </NuxtLink>
                <NuxtLink to="/people/skill-stats" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-violet-500/20">📈</div>
                  Skill Stats
                  <span class="ml-auto text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Admin</span>
                </NuxtLink>
              </template>
            </div>
          </div>

          <!-- Section: Training (Collapsible) -->
          <div class="pt-2">
            <button 
              @click="toggleSection('growth')"
              class="section-header group"
            >
              <span>🎓 Training</span>
              <svg 
                class="w-4 h-4 transition-transform duration-200" 
                :class="{ 'rotate-180': sections.growth }"
                xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="section-content" :class="{ 'section-open': sections.growth }">
              <NuxtLink to="/academy/my-training" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-amber-500/20">📚</div>
                Academy
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
              <NuxtLink to="/my-schedule" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-indigo-500/20">📆</div>
                My Schedule
              </NuxtLink>
              <NuxtLink to="/my-time-off" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-sky-500/20">🏖️</div>
                My Time Off
              </NuxtLink>
            </div>
          </div>

          <!-- Section: Admin OPS (Collapsible) - ADMIN ONLY -->
          <template v-if="isAdmin">
            <div class="pt-2">
              <button 
                @click="toggleSection('adminOps')"
                class="section-header group"
              >
                <span>🛠️ Admin Ops</span>
                <svg 
                  class="w-4 h-4 transition-transform duration-200" 
                  :class="{ 'rotate-180': sections.adminOps }"
                  xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="section-content" :class="{ 'section-open': sections.adminOps }">
                <NuxtLink to="/schedule/builder" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-emerald-500/20">📅</div>
                  Schedule Builder
                  <span class="ml-auto text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Admin</span>
                </NuxtLink>
                <NuxtLink to="/skills" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-yellow-500/20">📖</div>
                  Skill Library
                </NuxtLink>
                <NuxtLink to="/academy/course-manager" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-amber-500/20">🎓</div>
                  Course Manager
                </NuxtLink>
                <NuxtLink to="/time-off" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-sky-500/20">🏖️</div>
                  Manage Time Off
                </NuxtLink>
                <NuxtLink to="/export-payroll" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-green-500/20">💰</div>
                  Export Payroll
                </NuxtLink>
              </div>
            </div>
          </template>

          <!-- Section: Med OPS (Collapsible) - ALL USERS -->
          <div class="pt-2">
            <button 
              @click="toggleSection('medOps')"
              class="section-header group"
            >
              <span>🏥 Med Ops</span>
              <svg 
                class="w-4 h-4 transition-transform duration-200" 
                :class="{ 'rotate-180': sections.medOps }"
                xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="section-content" :class="{ 'section-open': sections.medOps }">
              <NuxtLink to="/med-ops/calculators" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-red-500/20">💊</div>
                Drug Calculators
              </NuxtLink>
              <NuxtLink to="/med-ops/boards" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-blue-500/20">📋</div>
                Medical Boards
              </NuxtLink>
              <NuxtLink to="/med-ops/partners" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-purple-500/20">🏭</div>
                Med Ops Partners
              </NuxtLink>
              <NuxtLink to="/med-ops/wiki" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-teal-500/20">📚</div>
                Wiki
              </NuxtLink>
            </div>
          </div>

          <!-- Section: Recruiting (Collapsible) - ADMIN ONLY -->
          <template v-if="isAdmin">
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
                <NuxtLink to="/recruiting/interviews" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-pink-500/20">🎤</div>
                  Interviews
                </NuxtLink>
              </div>
            </div>
          </template>

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
              <!-- Calendar: Visible to all -->
              <NuxtLink to="/marketing/calendar" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-indigo-500/20">📅</div>
                Calendar
              </NuxtLink>
              
              <!-- Admin-only: Events, Leads, Campaigns -->
              <template v-if="isAdmin">
                <NuxtLink to="/growth/events" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-pink-500/20">🎪</div>
                  Events
                </NuxtLink>
                <NuxtLink to="/growth/leads" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-orange-500/20">🔥</div>
                  Leads
                </NuxtLink>
                <NuxtLink to="/growth/campaigns" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-fuchsia-500/20">📈</div>
                  Campaigns
                </NuxtLink>
              </template>
              
              <!-- Visible to all: Resources, Partnerships -->
              <NuxtLink to="/marketing/resources" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-lime-500/20">📦</div>
                Resources
              </NuxtLink>
              <NuxtLink to="/marketing/partnerships" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-cyan-500/20">🤝</div>
                Partnerships
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
                <NuxtLink to="/admin/global-settings" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-slate-500/20">🌐</div>
                  Global Settings
                </NuxtLink>
                <NuxtLink to="/settings" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-amber-500/20">⚙️</div>
                  App Settings
                </NuxtLink>
              </div>
            </div>
          </template>

        </nav>

        <!-- User Profile Footer -->
        <div class="shrink-0 border-t border-slate-800/50 bg-slate-950/50 backdrop-blur p-4">
          <!-- User Info -->
          <NuxtLink to="/profile" class="flex items-center gap-3 hover:opacity-80 transition-opacity group mb-3">
            <div class="h-10 w-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-sm font-bold shadow-lg group-hover:shadow-green-500/25 transition-shadow">
              {{ initials }}
            </div>
            <div class="text-sm flex-1">
              <div class="font-medium text-white">{{ firstName }}</div>
              <div class="text-xs" :class="isAdmin ? 'text-amber-400 font-semibold' : 'text-slate-400'">
                {{ isAdmin ? '⭐ Admin' : 'Team Member' }}
              </div>
            </div>
          </NuxtLink>
          
          <!-- Logout Button - Prominent -->
          <button 
            @click="handleSignOut"
            class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-all font-medium text-sm border border-red-500/20 hover:border-red-500/30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            Log Out
          </button>
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