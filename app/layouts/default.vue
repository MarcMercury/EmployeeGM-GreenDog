<script setup lang="ts">
const authStore = useAuthStore()
const { currentUserProfile, isAdmin: appDataIsAdmin, fetchGlobalData, initialized } = useAppData()
const supabase = useSupabaseClient()

// Sidebar collapsed state
const sidebarCollapsed = ref(false)

// Collapsible section states - all collapsed by default
// NEW 3-TIER STRUCTURE: My Workspace (all), Management (manager+), Admin Ops (admin)
const sections = ref({
  myWorkspace: false,    // Personal: My Schedule, My Skills, My Growth, My Time Off, My Training
  management: false,     // Manager+: Roster, Team Schedule, Recruiting, Approvals
  medOps: false,         // All users: Med Ops tools
  marketing: false,      // All/Admin: Marketing tools
  gdu: false,            // GDU: Green Dog University - Education module
  adminOps: false        // Admin only: Settings, Course Manager, Payroll, Skill Library
})

const toggleSection = (section: keyof typeof sections.value) => {
  sections.value[section] = !sections.value[section]
}

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
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

// Unread notification count
const unreadNotificationCount = ref(0)
let notificationChannel: ReturnType<typeof supabase.channel> | null = null

const fetchUnreadCount = async () => {
  if (!profile.value?.id) return
  
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
    
    if (!error) {
      unreadNotificationCount.value = count || 0
    }
  } catch (err) {
    console.error('[Layout] Error fetching notification count:', err)
  }
}

// Watch for profile changes to fetch notifications
watch(() => profile.value?.id, (newId) => {
  if (newId) {
    fetchUnreadCount()
    
    // Subscribe to realtime notification changes
    if (notificationChannel) {
      supabase.removeChannel(notificationChannel)
    }
    
    notificationChannel = supabase
      .channel('notifications-count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => fetchUnreadCount()
      )
      .subscribe()
  }
}, { immediate: true })

onUnmounted(() => {
  if (notificationChannel) {
    supabase.removeChannel(notificationChannel)
  }
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
    
      <!-- Fixed Sidebar - Collapsible -->
      <aside 
        class="fixed inset-y-0 left-0 z-50 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white border-r border-slate-800/50 flex flex-col shadow-2xl transition-all duration-300"
        :class="sidebarCollapsed ? 'w-16' : 'w-64'"
      >
      
        <!-- Logo Header with Toggle -->
        <div class="flex h-16 items-center justify-between px-4 bg-slate-950/80 backdrop-blur shrink-0 border-b border-slate-800/50">
          <span v-if="!sidebarCollapsed" class="text-xl font-bold tracking-tight bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">🐾 TeamOS</span>
          <span v-else class="text-xl">🐾</span>
          <button 
            @click="toggleSidebar"
            class="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
            :title="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          >
            <svg 
              class="w-5 h-5 text-slate-400 transition-transform duration-300"
              :class="{ 'rotate-180': sidebarCollapsed }"
              xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            >
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        </div>

        <!-- Navigation - Scrollable -->
        <nav class="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
        
          <!-- Dashboard -->
          <NuxtLink to="/" class="nav-link group" :class="{ 'justify-center': sidebarCollapsed }">
            <div class="nav-icon-wrap group-hover:bg-blue-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
            </div>
            <span v-if="!sidebarCollapsed">Dashboard</span>
          </NuxtLink>

          <!-- Activity Hub -->
          <NuxtLink to="/activity" class="nav-link group" :class="{ 'justify-center': sidebarCollapsed }">
            <div class="nav-icon-wrap group-hover:bg-amber-500/20 relative">
              🔔
              <span v-if="unreadNotificationCount > 0" class="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {{ unreadNotificationCount > 99 ? '99+' : unreadNotificationCount }}
              </span>
            </div>
            <span v-if="!sidebarCollapsed">Activity Hub</span>
          </NuxtLink>

          <!-- Collapsed mode: just show icons -->
          <template v-if="sidebarCollapsed">
            <NuxtLink to="/activity" class="nav-link group justify-center" title="Activity Hub">
              <div class="nav-icon-wrap group-hover:bg-amber-500/20 relative">
                🔔
                <span v-if="unreadNotificationCount > 0" class="absolute -top-1 -right-1 min-w-[14px] h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {{ unreadNotificationCount > 9 ? '9+' : unreadNotificationCount }}
                </span>
              </div>
            </NuxtLink>
            <NuxtLink to="/roster" class="nav-link group justify-center" title="Roster">
              <div class="nav-icon-wrap group-hover:bg-blue-500/20">👥</div>
            </NuxtLink>
            <NuxtLink to="/profile" class="nav-link group justify-center" title="Profile">
              <div class="nav-icon-wrap group-hover:bg-purple-500/20">👤</div>
            </NuxtLink>
            <NuxtLink to="/schedule" class="nav-link group justify-center" title="Schedule">
              <div class="nav-icon-wrap group-hover:bg-green-500/20">📅</div>
            </NuxtLink>
            <NuxtLink to="/marketing/calendar" class="nav-link group justify-center" title="Calendar">
              <div class="nav-icon-wrap group-hover:bg-indigo-500/20">📆</div>
            </NuxtLink>
            <NuxtLink to="/marketing/resources" class="nav-link group justify-center" title="Resources">
              <div class="nav-icon-wrap group-hover:bg-lime-500/20">📦</div>
            </NuxtLink>
            <NuxtLink to="/marketing/partnerships" class="nav-link group justify-center" title="Partnerships">
              <div class="nav-icon-wrap group-hover:bg-cyan-500/20">🤝</div>
            </NuxtLink>
          </template>

          <!-- Expanded mode: full navigation -->
          <template v-else>
          
          <!-- ==========================================
               SECTION 1: MY WORKSPACE (All Users)
               Personal data: My Schedule, My Skills, My Growth, My Time Off
               ========================================== -->
          <div class="pt-4">
            <button 
              @click="toggleSection('myWorkspace')"
              class="section-header group"
            >
              <span>👤 My Workspace</span>
              <svg 
                class="w-4 h-4 transition-transform duration-200" 
                :class="{ 'rotate-180': sections.myWorkspace }"
                xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="section-content" :class="{ 'section-open': sections.myWorkspace }">
              <NuxtLink to="/profile" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-purple-500/20">👤</div>
                My Profile
              </NuxtLink>
              <NuxtLink to="/my-schedule" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-indigo-500/20">📆</div>
                My Schedule
              </NuxtLink>
              <NuxtLink to="/people/my-skills" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-amber-500/20">⭐</div>
                My Skills
              </NuxtLink>
              <NuxtLink to="/development" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-emerald-500/20">📈</div>
                My Growth
              </NuxtLink>
              <NuxtLink to="/academy/my-training" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-orange-500/20">🎓</div>
                My Training
              </NuxtLink>
            </div>
          </div>

          <!-- ==========================================
               SECTION 2: MANAGEMENT (Manager/Admin Only)
               Team view: Roster, Team Schedule, Recruiting, Approvals
               ========================================== -->
          <template v-if="isAdmin">
            <div class="pt-2">
              <button 
                @click="toggleSection('management')"
                class="section-header group"
              >
                <span>👥 Management</span>
                <svg 
                  class="w-4 h-4 transition-transform duration-200" 
                  :class="{ 'rotate-180': sections.management }"
                  xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="section-content" :class="{ 'section-open': sections.management }">
                <NuxtLink to="/roster" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-blue-500/20">👥</div>
                  Roster
                </NuxtLink>
                <NuxtLink to="/org-chart" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-teal-500/20">🏢</div>
                  Org Chart
                </NuxtLink>
                <NuxtLink to="/schedule/builder" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-emerald-500/20">📅</div>
                  Team Schedule
                </NuxtLink>
                <NuxtLink to="/time-off" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-sky-500/20">✅</div>
                  Time Off Approvals
                </NuxtLink>
                <NuxtLink to="/recruiting" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-violet-500/20">🎯</div>
                  Recruiting Pipeline
                </NuxtLink>
                <NuxtLink to="/recruiting/interviews" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-pink-500/20">🎤</div>
                  Interviews
                </NuxtLink>
                <NuxtLink to="/people/skill-stats" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-violet-500/20">📈</div>
                  Skill Stats
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
              <NuxtLink to="/med-ops/facilities" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-orange-500/20">🔧</div>
                Facilities Resources
              </NuxtLink>
              <NuxtLink to="/med-ops/wiki" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-teal-500/20">📚</div>
                Wiki
              </NuxtLink>
            </div>
          </div>

          <!-- Section: Marketing (Collapsible) - ALL USERS -->
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
              <!-- Command Center -->
              <NuxtLink to="/marketing/command-center" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-purple-500/20">🎯</div>
                Command Center
              </NuxtLink>
              
              <!-- Calendar: Visible to all -->
              <NuxtLink to="/marketing/calendar" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-indigo-500/20">📅</div>
                Calendar
              </NuxtLink>
              
              <!-- Admin-only: Events, Leads -->
              <template v-if="isAdmin">
                <NuxtLink to="/growth/events" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-pink-500/20">🎪</div>
                  Events
                </NuxtLink>
                <NuxtLink to="/growth/leads" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-orange-500/20">🔥</div>
                  Leads
                </NuxtLink>
              </template>
              
              <!-- Marketing Hubs -->
              <NuxtLink to="/marketing/partners" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-teal-500/20">🤝</div>
                Partners
              </NuxtLink>
              <NuxtLink to="/marketing/inventory" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-amber-500/20">📦</div>
                Inventory
              </NuxtLink>
              
              <!-- Visible to all: Resources, Partnerships -->
              <NuxtLink to="/marketing/resources" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-lime-500/20">📁</div>
                Resources
              </NuxtLink>
              <NuxtLink to="/marketing/partnerships" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-cyan-500/20">🤝</div>
                Partnerships
              </NuxtLink>
            </div>
          </div>

          <!-- ==========================================
               SECTION: GDU - Green Dog University
               Visitor CRM, CE Events, Education
               ========================================== -->
          <template v-if="isAdmin">
            <div class="pt-2">
              <button 
                @click="toggleSection('gdu')"
                class="section-header group"
              >
                <span>🎓 GDU</span>
                <svg 
                  class="w-4 h-4 transition-transform duration-200" 
                  :class="{ 'rotate-180': sections.gdu }"
                  xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="section-content" :class="{ 'section-open': sections.gdu }">
                <NuxtLink to="/gdu" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-purple-500/20">🏠</div>
                  Dashboard
                </NuxtLink>
                <NuxtLink to="/gdu/visitors" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-blue-500/20">👥</div>
                  Visitor CRM
                </NuxtLink>
                <NuxtLink to="/gdu/events" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-green-500/20">📅</div>
                  CE Events
                </NuxtLink>
                <NuxtLink to="/gdu/events/new" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-amber-500/20">✨</div>
                  New CE Event
                </NuxtLink>
              </div>
            </div>
          </template>

          <!-- ==========================================
               SECTION 3: ADMIN OPS (Admin Only)
               Global Settings, Integrations, Course Manager, Payroll
               ========================================== -->
          <template v-if="isAdmin">
            <div class="pt-2">
              <button 
                @click="toggleSection('adminOps')"
                class="section-header group"
              >
                <span>⚙️ Admin Ops</span>
                <svg 
                  class="w-4 h-4 transition-transform duration-200" 
                  :class="{ 'rotate-180': sections.adminOps }"
                  xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="section-content" :class="{ 'section-open': sections.adminOps }">
                <NuxtLink to="/settings" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-slate-500/20">🌐</div>
                  Global Settings
                </NuxtLink>
                <NuxtLink to="/admin/skills-management" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-yellow-500/20">📚</div>
                  Skills Management
                </NuxtLink>
                <NuxtLink to="/academy/course-manager" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-amber-500/20">🎓</div>
                  Course Manager
                </NuxtLink>
                <NuxtLink to="/export-payroll" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-green-500/20">💰</div>
                  Export Payroll
                </NuxtLink>
                <NuxtLink to="/admin/master-roster" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-purple-500/20">📋</div>
                  Master Roster
                </NuxtLink>
              </div>
            </div>
          </template>

          </template><!-- End of v-else (expanded mode) -->

        </nav>

        <!-- User Profile Footer -->
        <div class="shrink-0 border-t border-slate-800/50 bg-slate-950/50 backdrop-blur p-4" :class="{ 'p-2': sidebarCollapsed }">
          <!-- User Info -->
          <NuxtLink to="/profile" class="flex items-center gap-3 hover:opacity-80 transition-opacity group mb-3" :class="{ 'justify-center mb-2': sidebarCollapsed }">
            <div class="h-10 w-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-sm font-bold shadow-lg group-hover:shadow-green-500/25 transition-shadow" :class="{ 'h-8 w-8': sidebarCollapsed }">
              {{ initials }}
            </div>
            <div v-if="!sidebarCollapsed" class="text-sm flex-1">
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
            :class="{ 'px-2 py-2': sidebarCollapsed }"
            :title="sidebarCollapsed ? 'Log Out' : ''"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            <span v-if="!sidebarCollapsed">Log Out</span>
          </button>
        </div>

      </aside>

      <!-- Main Content Area -->
      <main 
        class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 transition-all duration-300"
        :class="sidebarCollapsed ? 'ml-16' : 'ml-64'"
      >
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
  pointer-events: none;
  transition: all 0.3s ease-in-out;
}

.section-open {
  max-height: 500px;
  opacity: 1;
  margin-top: 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  pointer-events: auto;
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