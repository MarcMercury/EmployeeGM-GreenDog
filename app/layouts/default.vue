<script setup lang="ts">
import { SECTION_ACCESS } from '~/types'
import type { UserRole } from '~/types'

const authStore = useAuthStore()
const { currentUserProfile, isAdmin: appDataIsAdmin, fetchGlobalData, initialized } = useAppData()
const supabase = useSupabaseClient()

// Connection state for offline resilience
const { isOnline, connectionQuality, queuedActions } = useConnectionState()
const { isStale, staleDuration } = useStaleDataWarning()

// Sidebar collapsed state
const sidebarCollapsed = ref(false)

// Collapsible section states - all collapsed by default
// 4-TIER ROLE STRUCTURE: admin, office_admin, marketing_admin, user
const sections = ref({
  myWorkspace: false,    // All users: My Profile (skills/goals/reviews), My Schedule, My Training
  management: false,     // admin, office_admin: Roster, Team Schedule, Recruiting, Approvals
  hr: false,             // HR Admin + Admin: Team Schedule, Time Off, Recruiting, Payroll
  medOps: false,         // All users (view), admin/office_admin (edit)
  marketing: false,      // Marketing content & partnerships
  crmAnalytics: false,   // CRM systems & analytics
  gdu: false,            // admin, marketing_admin: GDU University
  adminOps: false        // admin only: Settings, Course Manager, Payroll, Skill Library
})

const toggleSection = (section: keyof typeof sections.value) => {
  sections.value[section] = !sections.value[section]
}

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

// Only fetch data once using callOnce to prevent hydration issues
await callOnce(async () => {
  // Skip Supabase session check if we're in emergency mode (Supabase is down)
  const { isEmergencyMode } = useEmergencyAuth()
  if (isEmergencyMode.value) {
    console.log('[Layout] Emergency mode active — skipping Supabase session check')
    return
  }

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      console.log('[Layout] Session found, fetching data for:', session.user.email)
      await Promise.all([
        authStore.fetchProfile(session.user.id),
        fetchGlobalData()
      ])
    }
  } catch (err) {
    console.warn('[Layout] Session check failed:', err)
  }
})

// Use profile from either source - prefer currentUserProfile from useAppData
const profile = computed(() => currentUserProfile.value || authStore.profile)

// Role-based access computed properties
const userRole = computed(() => profile.value?.role || 'user')
const isAdmin = computed(() => appDataIsAdmin.value || ['super_admin', 'admin'].includes(userRole.value))
const isSuperAdmin = computed(() => userRole.value === 'super_admin')
const isOfficeAdmin = computed(() => userRole.value === 'office_admin' || isSuperAdmin.value)
const isMarketingAdmin = computed(() => userRole.value === 'marketing_admin' || isSuperAdmin.value)

// Section access checks — single source of truth from SECTION_ACCESS in ~/types
const hasManagementAccess = computed(() => SECTION_ACCESS.management?.includes(userRole.value as UserRole) ?? false)
const hasHrAccess = computed(() => SECTION_ACCESS.hr?.includes(userRole.value as UserRole) ?? false)
const hasMarketingEditAccess = computed(() => SECTION_ACCESS.marketing?.includes(userRole.value as UserRole) ?? false)
const hasMarketingViewAccess = computed(() => SECTION_ACCESS.marketing_view?.includes(userRole.value as UserRole) ?? false)
const hasCrmAnalyticsAccess = computed(() => SECTION_ACCESS.crm_analytics?.includes(userRole.value as UserRole) ?? false)
const hasGduAccess = computed(() => SECTION_ACCESS.education?.includes(userRole.value as UserRole) ?? false)
const hasAdminOpsAccess = computed(() => SECTION_ACCESS.admin?.includes(userRole.value as UserRole) ?? false)
const hasScheduleManageAccess = computed(() => SECTION_ACCESS.schedules_manage?.includes(userRole.value as UserRole) ?? false)

// Display helpers
const firstName = computed(() => profile.value?.first_name || 'User')
const initials = computed(() => {
  const p = profile.value
  if (!p) return 'U'
  return `${p.first_name?.[0] || ''}${p.last_name?.[0] || ''}`.toUpperCase() || 'U'
})

const roleDisplay = computed(() => {
  const displays: Record<string, { label: string, class: string }> = {
    super_admin: { label: '👑 Super Admin', class: 'text-amber-500 font-bold' },
    admin: { label: '⭐ Admin', class: 'text-amber-400 font-semibold' },
    manager: { label: '👔 Manager', class: 'text-emerald-400 font-semibold' },
    hr_admin: { label: '👥 HR Admin', class: 'text-cyan-400 font-semibold' },
    sup_admin: { label: '🧑‍💼 Supervisor', class: 'text-teal-400 font-semibold' },
    office_admin: { label: '🏢 Office Admin', class: 'text-blue-400 font-semibold' },
    marketing_admin: { label: '📣 Marketing', class: 'text-purple-400 font-semibold' },
    user: { label: 'Team Member', class: 'text-slate-400' }
  }
  return displays[userRole.value] ?? displays.user!
})

// Unread notification count
const unreadNotificationCount = ref(0)
let notificationChannel: ReturnType<typeof supabase.channel> | null = null

const fetchUnreadCount = async () => {
  if (!profile.value?.id) return
  // Skip Supabase query when using emergency admin (fake non-UUID IDs)
  if ((profile.value as any)?.is_emergency) return
  
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profile.value.id)
      .eq('is_read', false)
      .is('closed_at', null)
    
    if (!error) {
      unreadNotificationCount.value = count || 0
    }
  } catch (err) {
    console.error('[Layout] Error fetching notification count:', err)
  }
}

// Watch for profile changes to fetch notifications
watch(() => profile.value?.id, (newId) => {
  if (newId && !(profile.value as any)?.is_emergency) {
    fetchUnreadCount()
    
    // Subscribe to realtime notification changes
    if (notificationChannel) {
      supabase.removeChannel(notificationChannel)
    }
    
    notificationChannel = supabase
      .channel('notifications-count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `profile_id=eq.${newId}` },
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
    // Clear emergency auth if active
    const { isEmergencyMode, emergencyLogout } = useEmergencyAuth()
    if (isEmergencyMode.value) {
      await emergencyLogout()
    }
    await supabase.auth.signOut()
    authStore.$reset()
    window.location.href = '/auth/login'
  } catch (e) {
    console.error('[Layout] Sign out error:', e)
    // Still clear emergency auth on error
    try { await useEmergencyAuth().emergencyLogout() } catch {}
    window.location.href = '/auth/login'
  }
}

// Mobile sidebar state
const mobileMenuOpen = ref(false)

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

const closeMobileMenu = () => {
  mobileMenuOpen.value = false
}
</script>

<template>
  <v-app>
    <div class="min-h-screen bg-gray-50">
    
      <!-- Mobile Navigation Component -->
      <LayoutMobileNav 
        :notification-count="unreadNotificationCount"
        @toggle-sidebar="toggleMobileMenu"
      />
      
      <!-- Mobile Sidebar Overlay -->
      <Transition name="fade">
        <div 
          v-if="mobileMenuOpen" 
          class="mobile-overlay lg:hidden"
          @click="closeMobileMenu"
        />
      </Transition>
    
      <!-- Fixed Sidebar - Collapsible (hidden on mobile by default) -->
      <aside 
        class="fixed inset-y-0 left-0 z-50 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white border-r border-slate-800/50 flex flex-col shadow-2xl transition-all duration-300"
        :class="[
          sidebarCollapsed ? 'w-16' : 'w-64',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        ]"
      >
      
        <!-- Logo Header with Toggle -->
        <div class="flex h-16 items-center justify-between px-4 bg-slate-950/80 backdrop-blur shrink-0 border-b border-slate-800/50">
          <span v-if="!sidebarCollapsed" class="text-xl font-bold tracking-tight bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">🐾 GDD</span>
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

          <!-- Wiki -->
          <NuxtLink to="/wiki" class="nav-link group" :class="{ 'justify-center': sidebarCollapsed }" active-class="nav-link-active">
            <div class="nav-icon-wrap group-hover:bg-teal-500/20">📚</div>
            <span v-if="!sidebarCollapsed">Wiki</span>
          </NuxtLink>

          <!-- Marketplace (Super Admin only) -->
          <NuxtLink v-if="isSuperAdmin" to="/marketplace" class="nav-link group" :class="{ 'justify-center': sidebarCollapsed }" active-class="nav-link-active">
            <div class="nav-icon-wrap group-hover:bg-amber-500/20">🦴</div>
            <span v-if="!sidebarCollapsed">Marketplace</span>
          </NuxtLink>

          <!-- Collapsed mode: just show icons -->
          <template v-if="sidebarCollapsed">
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
            <NuxtLink to="/marketing/partnerships" class="nav-link group justify-center" title="Referrals">
              <div class="nav-icon-wrap group-hover:bg-cyan-500/20">🤝</div>
            </NuxtLink>
          </template>

          <!-- Expanded mode: full navigation -->
          <template v-else>
          
          <!-- ==========================================
               SECTION 1: MY WORKSPACE (All Users)
               Personal hub: My Profile (skills, goals, reviews), My Schedule, My Training
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
              <NuxtLink to="/academy/my-training" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-orange-500/20">🎓</div>
                My Training
              </NuxtLink>
            </div>
          </div>

          <!-- ==========================================
               SECTION 2: MANAGEMENT (Admin + Office Admin)
               Team view: Roster, Team Schedule, Recruiting, Approvals
               ========================================== -->
          <template v-if="hasManagementAccess">
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
                <NuxtLink to="/admin/skills-management" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-amber-500/20">📚</div>
                  Skills Management
                </NuxtLink>
                <NuxtLink v-if="hasGduAccess" to="/academy/course-manager" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-purple-500/20">🎓</div>
                  Course Manager
                </NuxtLink>
              </div>
            </div>
          </template>

          <!-- ==========================================
               SECTION: HR (HR Admin + Admin)
               Team Schedule, Time Off, Recruiting, Payroll, Master Roster
               ========================================== -->
          <template v-if="hasHrAccess">
            <div class="pt-2">
              <button 
                @click="toggleSection('hr')"
                class="section-header group"
              >
                <span>💼 HR</span>
                <svg 
                  class="w-4 h-4 transition-transform duration-200" 
                  :class="{ 'rotate-180': sections.hr }"
                  xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="section-content" :class="{ 'section-open': sections.hr }">
                <NuxtLink v-if="hasScheduleManageAccess" to="/schedule" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-emerald-500/20">📅</div>
                  Team Schedule
                </NuxtLink>
                <NuxtLink to="/time-off" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-sky-500/20">🏖️</div>
                  Time Off Approvals
                </NuxtLink>
                <NuxtLink to="/recruiting" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-violet-500/20">🎯</div>
                  Recruiting Pipeline
                </NuxtLink>
                <NuxtLink v-if="isAdmin" to="/export-payroll" class="nav-link group" active-class="nav-link-active">
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
              <NuxtLink to="/med-ops/boards" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-blue-500/20">📋</div>
                Medical Boards
              </NuxtLink>
              <NuxtLink v-if="userRole !== 'user'" to="/med-ops/safety/manage-types" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-green-500/20">⚙️</div>
                Manage Log Types
              </NuxtLink>
            </div>
          </div>

          <!-- Section: Marketing (Collapsible) — visible to marketing_view roles -->
          <template v-if="hasMarketingViewAccess">
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
              
              <!-- Events - admin/marketing_admin only -->
              <template v-if="hasMarketingEditAccess">
                <NuxtLink to="/growth/events" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-pink-500/20">🎪</div>
                  Events
                </NuxtLink>
                <NuxtLink to="/growth/leads" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-orange-500/20">🔥</div>
                  Event Leads
                </NuxtLink>
                <NuxtLink to="/marketing/partners" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-teal-500/20">🤝</div>
                  Partners
                </NuxtLink>
                <NuxtLink to="/marketing/influencers" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-pink-500/20">⭐</div>
                  Influencers
                </NuxtLink>
                <NuxtLink to="/marketing/inventory" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-amber-500/20">📦</div>
                  Inventory
                </NuxtLink>
              </template>
              
              <!-- Visible to all: Resources -->
              <NuxtLink to="/marketing/resources" class="nav-link group" active-class="nav-link-active">
                <div class="nav-icon-wrap group-hover:bg-lime-500/20">📁</div>
                Resources
              </NuxtLink>
              
              <!-- Referral CRM - admin/marketing_admin only -->
              <template v-if="hasMarketingEditAccess">
                <NuxtLink to="/marketing/partnerships" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-cyan-500/20">🤝</div>
                  Referral CRM
                </NuxtLink>
              </template>
            </div>
          </div>
          </template>

          <!-- Section: CRM & Analytics (Collapsible) - crm_analytics access roles -->
          <template v-if="hasCrmAnalyticsAccess">
            <div class="pt-2">
              <button 
                @click="toggleSection('crmAnalytics')"
                class="section-header group"
              >
                <span>📊 CRM & Analytics</span>
                <svg 
                  class="w-4 h-4 transition-transform duration-200" 
                  :class="{ 'rotate-180': sections.crmAnalytics }"
                  xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="section-content" :class="{ 'section-open': sections.crmAnalytics }">
                <NuxtLink to="/marketing/practice-analytics" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-emerald-500/20">📈</div>
                  Practice Analytics
                </NuxtLink>
                <NuxtLink to="/marketing/sauron" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-amber-500/20">👁️</div>
                  Sauron
                </NuxtLink>
                <NuxtLink to="/marketing/ezyvet-analytics" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-violet-500/20">📊</div>
                  EzyVet Analytics
                </NuxtLink>
                <NuxtLink to="/marketing/appointment-analysis" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-amber-500/20">📅</div>
                  Appointment Analysis
                </NuxtLink>
                <NuxtLink to="/marketing/invoice-analysis" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-green-500/20">🧾</div>
                  Invoice Analysis
                </NuxtLink>
              </div>
            </div>
          </template>

          <!-- ==========================================
               SECTION: GDU - Green Dog University
               Access: admin, marketing_admin
               ========================================== -->
          <template v-if="hasGduAccess">
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
                <NuxtLink to="/gdu/students" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-indigo-500/20">🎓</div>
                  Student CRM
                </NuxtLink>
                <NuxtLink to="/gdu/visitors" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-blue-500/20">👥</div>
                  CE Attendees
                </NuxtLink>
                <NuxtLink to="/gdu/events" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-green-500/20">📅</div>
                  CE Events
                </NuxtLink>
              </div>
            </div>
          </template>

          <!-- ==========================================
               SECTION 3: ADMIN OPS (Admin Only)
               Global Settings, Integrations, Course Manager, Payroll
               ========================================== -->
          <template v-if="hasAdminOpsAccess">
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
                <NuxtLink v-if="isSuperAdmin" to="/admin/users" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-red-500/20">👥</div>
                  User Management
                </NuxtLink>
                <NuxtLink to="/admin/email-templates" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-indigo-500/20">📧</div>
                  Email Templates
                </NuxtLink>
                <NuxtLink to="/admin/services" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-orange-500/20">🏥</div>
                  Services
                </NuxtLink>
                <NuxtLink to="/admin/system-health" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-cyan-500/20">⚙️</div>
                  System Settings
                </NuxtLink>
                <NuxtLink to="/admin/agents" class="nav-link group" active-class="nav-link-active">
                  <div class="nav-icon-wrap group-hover:bg-purple-500/20">🤖</div>
                  AI Agents
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
              <div class="text-xs" :class="roleDisplay.class">
                {{ roleDisplay.label }}
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
        :class="[
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        ]"
      >
        <!-- Connection Status Banners -->
        <Transition name="slide-down">
          <div 
            v-if="!isOnline" 
            class="bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium shadow-lg"
          >
            <span class="inline-flex items-center gap-2">
              <svg class="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3"/>
              </svg>
              You're offline. Changes will sync when you reconnect.
              <span v-if="queuedActions.length > 0" class="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {{ queuedActions.length }} pending
              </span>
            </span>
          </div>
        </Transition>
        
        <Transition name="slide-down">
          <div 
            v-if="isOnline && connectionQuality === 'slow'" 
            class="bg-yellow-500 text-white px-4 py-1.5 text-center text-xs font-medium"
          >
            <span class="inline-flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Slow connection detected
            </span>
          </div>
        </Transition>
        
        <Transition name="slide-down">
          <div 
            v-if="isStale && isOnline" 
            class="bg-blue-500 text-white px-4 py-1.5 text-center text-xs font-medium cursor-pointer hover:bg-blue-600 transition-colors"
            @click="() => globalThis.location.reload()"
          >
            <span class="inline-flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Data may be stale ({{ staleDuration }}). Click to refresh.
            </span>
          </div>
        </Transition>

        <!-- Mobile top padding to account for header, desktop has no extra padding -->
        <div class="pt-14 pb-20 lg:pt-0 lg:pb-0">
          <div class="p-4 lg:p-6 xl:p-8">
            <slot />
          </div>
        </div>
      </main>

    </div>
  </v-app>
</template>

<style scoped>
/* Mobile Overlay */
.mobile-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  z-index: 40;
}

/* Fade transition for overlay */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

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

/* Slide-down transition for connection banners */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>