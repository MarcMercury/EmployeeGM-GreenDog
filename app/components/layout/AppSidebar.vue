<template>
  <v-navigation-drawer
    :model-value="!isMobile || drawerOpen"
    :rail="rail && !isMobile"
    :temporary="isMobile"
    :permanent="!isMobile"
    :width="280"
    :rail-width="80"
    color="grey-darken-4"
    class="app-sidebar"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <!-- Logo/Header -->
    <div class="sidebar-header pa-4">
      <div class="d-flex align-center gap-3">
        <v-avatar color="primary" size="40">
          <v-icon color="white" size="24">mdi-paw</v-icon>
        </v-avatar>
        <div v-if="!rail" class="text-white">
          <div class="text-subtitle-1 font-weight-bold">TeamOS</div>
          <div class="text-caption text-grey">Green Dog Dental</div>
        </div>
      </div>
    </div>

    <v-divider class="border-opacity-10" />

    <!-- Navigation Groups -->
    <v-list 
      v-model:opened="openGroups" 
      nav 
      density="compact" 
      class="px-2 mt-2"
    >
      <!-- ===== Activity Hub - Global Access ===== -->
      <v-list-item
        v-if="hasPageAccess('/activity')"
        to="/activity"
        prepend-icon="mdi-bell"
        title="Activity Hub"
        rounded="lg"
        class="nav-item mb-1"
      />

      <!-- ===== Marketplace - Global Access ===== -->
      <v-list-item
        v-if="hasPageAccess('/marketplace')"
        to="/marketplace"
        prepend-icon="mdi-store"
        title="Marketplace"
        rounded="lg"
        class="nav-item mb-2"
      />

      <!-- ===== My Workspace Group - Database-driven Access ===== -->
      <v-list-group v-if="hasSectionAccess('My Workspace') && !rail" value="my-workspace">
        <template #activator="{ props: activatorProps }">
          <v-list-item
            v-bind="activatorProps"
            prepend-icon="mdi-account-circle"
            title="My Workspace"
            rounded="lg"
            class="nav-item"
          />
        </template>
        <v-list-item v-if="hasPageAccess('/profile')" to="/profile" title="My Profile" prepend-icon="mdi-account-card" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/contact-list')" to="/contact-list" title="Contact List" prepend-icon="mdi-contacts" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/my-schedule')" to="/my-schedule" title="My Schedule" prepend-icon="mdi-calendar-account" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/people/my-skills')" to="/people/my-skills" title="My Skills" prepend-icon="mdi-lightbulb" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/development')" to="/development" title="My Growth" prepend-icon="mdi-chart-line" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/academy/my-training')" to="/academy/my-training" title="My Training" prepend-icon="mdi-school" density="compact" rounded="lg" class="nav-item ml-4" />
      </v-list-group>
      <v-list-item v-else-if="hasSectionAccess('My Workspace')" to="/profile" prepend-icon="mdi-account-circle" title="My" rounded="lg" class="nav-item mb-1" />

      <!-- ===== Management Group ===== -->
      <v-list-group v-if="hasSectionAccess('Management') && !rail" value="management">
        <template #activator="{ props: activatorProps }">
          <v-list-item
            v-bind="activatorProps"
            prepend-icon="mdi-clipboard-text"
            title="Management"
            rounded="lg"
            class="nav-item"
          />
        </template>
        <v-list-item v-if="hasPageAccess('/roster')" to="/roster" title="Roster" prepend-icon="mdi-account-group" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/skills-library')" to="/skills-library" title="Skill Library" prepend-icon="mdi-book-open-variant" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/people/skill-stats')" to="/people/skill-stats" title="Skill Stats" prepend-icon="mdi-chart-bar" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/med-ops/facilities')" to="/med-ops/facilities" title="Facilities Resources" prepend-icon="mdi-office-building" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/academy/course-manager')" to="/academy/course-manager" title="Course Manager" prepend-icon="mdi-book-education" density="compact" rounded="lg" class="nav-item ml-4" />
      </v-list-group>
      <v-list-item v-else-if="hasSectionAccess('Management')" to="/roster" prepend-icon="mdi-clipboard-text" title="Mgmt" rounded="lg" class="nav-item mb-1" />

      <!-- ===== Med Ops Group ===== -->
      <v-list-group v-if="hasSectionAccess('Med Ops') && !rail" value="med-ops">
        <template #activator="{ props: activatorProps }">
          <v-list-item
            v-bind="activatorProps"
            prepend-icon="mdi-medical-bag"
            title="Med Ops"
            rounded="lg"
            class="nav-item"
          />
        </template>
        <v-list-item v-if="hasPageAccess('/med-ops/wiki')" to="/med-ops/wiki" title="Wiki" prepend-icon="mdi-book-open-page-variant" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/med-ops/calculators')" to="/med-ops/calculators" title="Drug Calculators" prepend-icon="mdi-calculator" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/med-ops/boards')" to="/med-ops/boards" title="Medical Boards" prepend-icon="mdi-clipboard-pulse" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/med-ops/partners')" to="/med-ops/partners" title="Med Ops Partners" prepend-icon="mdi-handshake" density="compact" rounded="lg" class="nav-item ml-4" />
      </v-list-group>
      <v-list-item v-else-if="hasSectionAccess('Med Ops')" to="/med-ops/wiki" prepend-icon="mdi-medical-bag" title="Med" rounded="lg" class="nav-item mb-1" />

      <!-- ===== HR Group - Database-driven Access ===== -->
      <v-list-group v-if="hasHrAccess && !rail" value="hr">
        <template #activator="{ props: activatorProps }">
          <v-list-item
            v-bind="activatorProps"
            prepend-icon="mdi-briefcase"
            title="HR"
            rounded="lg"
            class="nav-item"
          />
        </template>
        <v-list-item v-if="hasPageAccess('/schedule')" to="/schedule" title="Schedule Overview" prepend-icon="mdi-calendar-clock" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/schedule/wizard')" to="/schedule/wizard" title="Schedule Wizard" prepend-icon="mdi-wizard-hat" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/schedule/services')" to="/schedule/services" title="Service Settings" prepend-icon="mdi-medical-bag" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/time-off')" to="/time-off" title="Time Off Approvals" prepend-icon="mdi-calendar-remove" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/recruiting')" to="/recruiting" title="Recruiting Pipeline" prepend-icon="mdi-account-search" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/export-payroll')" to="/export-payroll" title="Export Payroll" prepend-icon="mdi-cash-multiple" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/admin/master-roster')" to="/admin/master-roster" title="Master Roster" prepend-icon="mdi-table-account" density="compact" rounded="lg" class="nav-item ml-4" />
      </v-list-group>
      <v-list-item v-else-if="hasHrAccess" to="/schedule" prepend-icon="mdi-briefcase" title="HR" rounded="lg" class="nav-item mb-1" />

      <!-- ===== Marketing Group - Database-driven Access ===== -->
      <v-list-group v-if="hasMarketingAccess && !rail" value="marketing">
        <template #activator="{ props: activatorProps }">
          <v-list-item
            v-bind="activatorProps"
            prepend-icon="mdi-bullhorn"
            title="Marketing"
            rounded="lg"
            class="nav-item"
          />
        </template>
        <v-list-item v-if="hasPageAccess('/marketing/calendar')" to="/marketing/calendar" title="Calendar" prepend-icon="mdi-calendar-month" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/growth/events')" to="/growth/events" title="Events" prepend-icon="mdi-calendar-star" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/growth/leads')" to="/growth/leads" title="Event Leads" prepend-icon="mdi-account-star" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/marketing/partners')" to="/marketing/partners" title="Partners" prepend-icon="mdi-handshake" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/marketing/influencers')" to="/marketing/influencers" title="Influencers" prepend-icon="mdi-account-star-outline" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/marketing/inventory')" to="/marketing/inventory" title="Inventory" prepend-icon="mdi-package-variant" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/marketing/resources')" to="/marketing/resources" title="Resources" prepend-icon="mdi-folder-multiple" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/marketing/partnerships')" to="/marketing/partnerships" title="Referral CRM" prepend-icon="mdi-handshake-outline" density="compact" rounded="lg" class="nav-item ml-4" />
      </v-list-group>
      <v-list-item v-else-if="hasMarketingAccess" to="/marketing/calendar" prepend-icon="mdi-bullhorn" title="Marketing" rounded="lg" class="nav-item mb-1" />

      <!-- ===== CRM & Analytics Group - Database-driven Access ===== -->
      <v-list-group v-if="hasSectionAccess('CRM & Analytics') && !rail" value="crm-analytics">
        <template #activator="{ props: activatorProps }">
          <v-list-item
            v-bind="activatorProps"
            prepend-icon="mdi-chart-box"
            title="CRM & Analytics"
            rounded="lg"
            class="nav-item"
          />
        </template>
        <v-list-item v-if="hasPageAccess('/marketing/ezyvet-crm')" to="/marketing/ezyvet-crm" title="EzyVet CRM" prepend-icon="mdi-database-import" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/marketing/ezyvet-analytics')" to="/marketing/ezyvet-analytics" title="EzyVet Analytics" prepend-icon="mdi-chart-areaspline" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/marketing/list-hygiene')" to="/marketing/list-hygiene" title="List Hygiene" prepend-icon="mdi-broom" density="compact" rounded="lg" class="nav-item ml-4" />
      </v-list-group>

      <!-- ===== GDU (Education) Group - Database-driven Access ===== -->
      <v-list-group v-if="hasEducationAccess && !rail" value="gdu">
        <template #activator="{ props: activatorProps }">
          <v-list-item
            v-bind="activatorProps"
            prepend-icon="mdi-school"
            title="GDU"
            rounded="lg"
            class="nav-item"
          />
        </template>
        <v-list-item v-if="hasPageAccess('/gdu')" to="/gdu" title="GDU Dash" prepend-icon="mdi-view-dashboard" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/gdu/students')" to="/gdu/students" title="Student CRM" prepend-icon="mdi-account-school" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/gdu/visitors')" to="/gdu/visitors" title="Visitor CRM" prepend-icon="mdi-account-group" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/gdu/events')" to="/gdu/events" title="CE Events" prepend-icon="mdi-calendar-star" density="compact" rounded="lg" class="nav-item ml-4" />
      </v-list-group>
      <v-list-item v-else-if="hasEducationAccess" to="/gdu" prepend-icon="mdi-school" title="GDU" rounded="lg" class="nav-item mb-1" />

      <!-- ===== Admin Ops Group - Database-driven Access ===== -->
      <v-list-group v-if="hasAdminAccess && !rail" value="admin-ops">
        <template #activator="{ props: activatorProps }">
          <v-list-item
            v-bind="activatorProps"
            prepend-icon="mdi-cog"
            title="Admin Ops"
            rounded="lg"
            class="nav-item"
          />
        </template>
        <v-list-item v-if="hasPageAccess('/admin/users')" to="/admin/users" title="User Management" prepend-icon="mdi-account-cog" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/admin/email-templates')" to="/admin/email-templates" title="Email Templates" prepend-icon="mdi-email-edit" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/admin/skills-management')" to="/admin/skills-management" title="Skills Management" prepend-icon="mdi-bookshelf" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/admin/system-health')" to="/admin/system-health" title="System Settings" prepend-icon="mdi-cog" density="compact" rounded="lg" class="nav-item ml-4" />
      </v-list-group>
      <v-list-item v-else-if="hasAdminAccess" to="/admin/system-health" prepend-icon="mdi-cog" title="Admin" rounded="lg" class="nav-item mb-1" />
    </v-list>

    <template #append>
      <v-divider class="border-opacity-10" />

      <!-- User Section -->
      <div class="pa-3">
        <v-list-item
          v-if="profile"
          class="pa-2 nav-item"
          rounded="lg"
          to="/profile"
        >
          <template #prepend>
            <v-avatar size="36" color="primary">
              <v-img v-if="profile.avatar_url" :src="profile.avatar_url" />
              <span v-else class="text-white font-weight-bold text-caption">{{ initials }}</span>
            </v-avatar>
          </template>
          <template v-if="!rail">
            <v-list-item-title class="text-white text-body-2">{{ fullName }}</v-list-item-title>
            <v-list-item-subtitle class="text-grey text-caption">
              <v-chip v-if="isAdmin" size="x-small" color="warning" variant="flat" class="mr-1">Admin</v-chip>
              <v-chip v-else-if="isManager" size="x-small" color="purple" variant="flat" class="mr-1">Manager</v-chip>
              <v-chip v-else-if="isSupervisor" size="x-small" color="teal" variant="flat" class="mr-1">Supervisor</v-chip>
              <v-chip v-else-if="hasHrAccess" size="x-small" color="info" variant="flat" class="mr-1">HR</v-chip>
              <v-chip v-else-if="hasMarketingAccess" size="x-small" color="success" variant="flat" class="mr-1">Marketing</v-chip>
              <span v-else>User</span>
            </v-list-item-subtitle>
          </template>
        </v-list-item>

        <v-btn
          v-if="!rail"
          variant="outlined"
          color="grey"
          block
          size="small"
          class="mt-2"
          @click="handleSignOut"
        >
          <v-icon start size="small">mdi-logout</v-icon>
          Sign Out
        </v-btn>
      </div>

      <!-- Rail Toggle -->
      <div class="pa-2 text-center">
        <v-btn
          :icon="rail ? 'mdi-chevron-right' : 'mdi-chevron-left'"
          variant="text"
          color="grey"
          size="small"
          @click="$emit('update:rail', !rail)"
        />
      </div>
    </template>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import type { UserRole } from '~/types'

interface PageAccessInfo {
  id: string
  path: string
  name: string
  section: string
  sort_order: number
  access_level: 'full' | 'view' | 'none'
}

interface Props {
  modelValue: boolean
  rail: boolean
  temporary: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: true,
  rail: false,
  temporary: false
})
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:rail': [value: boolean]
}>()

// Track which groups are open - start with all collapsed to save space
const openGroups = ref<string[]>([])

// Drawer state
const drawerOpen = computed(() => props.modelValue)
const isMobile = computed(() => props.temporary)

const authStore = useAuthStore()
const router = useRouter()

// Page access from API - drives navigation visibility
const pageAccessList = ref<PageAccessInfo[]>([])
const accessLoading = ref(true)

// Debug log immediately when script runs
console.log('[Sidebar] Component script loaded, accessLoading initial:', true)

// Load page access from the user-specific API endpoint
async function loadPageAccess() {
  console.log('[Sidebar] loadPageAccess() called')
  accessLoading.value = true
  try {
    console.log('[Sidebar] Calling /api/user/page-access...')
    const response = await $fetch('/api/user/page-access', { method: 'GET' })
    console.log('[Sidebar] API response received:', response)
    if (response.success && response.pages) {
      pageAccessList.value = response.pages
      console.log('[Sidebar] Loaded page access for role:', response.role, 'pages:', response.pages.length)
      
      // Debug: Log Marketing pages access
      const marketingPages = response.pages.filter((p: PageAccessInfo) => p.section === 'Marketing')
      console.log('[Sidebar] Marketing pages:', marketingPages.map((p: PageAccessInfo) => `${p.name}: ${p.access_level}`))
      
      // Debug: Log HR pages access
      const hrPages = response.pages.filter((p: PageAccessInfo) => p.section === 'HR')
      console.log('[Sidebar] HR pages:', hrPages.map((p: PageAccessInfo) => `${p.name}: ${p.access_level}`))
    } else {
      console.log('[Sidebar] API response missing success or pages:', response)
    }
  } catch (err) {
    console.error('[Sidebar] Failed to load page access:', err)
    // On error, default to empty - will hide sections that require access
    pageAccessList.value = []
  } finally {
    accessLoading.value = false
    console.log('[Sidebar] accessLoading set to false, pageAccessList length:', pageAccessList.value.length)
  }
}

// Load access on mount
onMounted(async () => {
  console.log('[Sidebar] onMounted triggered')
  await loadPageAccess()
})

const profile = computed(() => authStore.profile)
const userRole = computed<UserRole>(() => authStore.userRole || 'user')
const fullName = computed(() => authStore.fullName)
const initials = computed(() => authStore.initials)

// Helper to check if user has access to a specific page path
function hasPageAccess(path: string): boolean {
  const role = userRole.value
  // Super admin always has access
  if (role === 'super_admin') return true
  
  // Still loading - show nothing yet
  if (accessLoading.value) return false
  
  const pageInfo = pageAccessList.value.find(p => p.path === path)
  if (!pageInfo) return false
  
  return pageInfo.access_level === 'full' || pageInfo.access_level === 'view'
}

// Helper to check if user has access to ANY page in a section
function hasSectionAccess(sectionName: string): boolean {
  const role = userRole.value
  // Super admin always has access
  if (role === 'super_admin') return true
  
  // Still loading - show nothing yet
  if (accessLoading.value) return false
  
  // Get all pages in this section
  const sectionPages = pageAccessList.value.filter(p => p.section === sectionName)
  
  // If no pages in this section, hide it
  if (sectionPages.length === 0) return false
  
  // Check if user has access to any page in this section
  return sectionPages.some(p => p.access_level === 'full' || p.access_level === 'view')
}

// Section access computed properties - MUST directly access reactive refs for proper reactivity
const isAdmin = computed(() => authStore.isAdmin)
const isManager = computed(() => userRole.value === 'manager')
const isSupervisor = computed(() => userRole.value === 'sup_admin')

// These computed properties DIRECTLY access the refs for proper Vue reactivity
const hasHrAccess = computed(() => {
  const role = userRole.value
  if (role === 'super_admin') return true
  if (accessLoading.value) return false
  const pages = pageAccessList.value.filter(p => p.section === 'HR')
  if (pages.length === 0) return false
  return pages.some(p => p.access_level === 'full' || p.access_level === 'view')
})

const hasRecruitingAccess = computed(() => {
  const role = userRole.value
  if (role === 'super_admin') return true
  if (accessLoading.value) return false
  const page = pageAccessList.value.find(p => p.path === '/recruiting')
  if (!page) return false
  return page.access_level === 'full' || page.access_level === 'view'
})

const hasMarketingAccess = computed(() => {
  const role = userRole.value
  if (role === 'super_admin') return true
  if (accessLoading.value) return false
  const pages = pageAccessList.value.filter(p => p.section === 'Marketing')
  if (pages.length === 0) return false
  return pages.some(p => p.access_level === 'full' || p.access_level === 'view')
})

const hasEducationAccess = computed(() => {
  const role = userRole.value
  if (role === 'super_admin') return true
  if (accessLoading.value) return false
  const pages = pageAccessList.value.filter(p => p.section === 'GDU')
  if (pages.length === 0) return false
  return pages.some(p => p.access_level === 'full' || p.access_level === 'view')
})

const hasAdminAccess = computed(() => {
  const role = userRole.value
  if (role === 'super_admin') return true
  if (accessLoading.value) return false
  const pages = pageAccessList.value.filter(p => p.section === 'Admin Ops')
  if (pages.length === 0) return false
  return pages.some(p => p.access_level === 'full' || p.access_level === 'view')
})

async function handleSignOut() {
  await authStore.signOut()
  router.push('/auth/login')
}
</script>

<style scoped>
.app-sidebar {
  border: none !important;
  z-index: 1006 !important;
}

/* Force sidebar visible on desktop */
@media (min-width: 960px) {
  .app-sidebar {
    transform: translateX(0) !important;
    visibility: visible !important;
    display: flex !important;
    position: fixed !important;
    left: 0 !important;
    top: 0 !important;
    height: 100vh !important;
    width: 280px !important;
  }
  
  .app-sidebar.v-navigation-drawer--rail {
    width: 80px !important;
  }
}

.sidebar-header {
  min-height: 64px;
  display: flex;
  align-items: center;
}

.nav-item {
  color: rgba(255, 255, 255, 0.7) !important;
  margin-bottom: 2px;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.08) !important;
  color: rgba(255, 255, 255, 0.9) !important;
}

.nav-item.v-list-item--active {
  background: rgba(var(--v-theme-primary), 0.2) !important;
  color: rgb(var(--v-theme-primary)) !important;
}

/* Compact group styling */
:deep(.v-list-group__items) {
  --indent-padding: 0px !important;
}

:deep(.v-list-group__header) {
  min-height: 40px !important;
}

/* Chevron icon styling for groups */
:deep(.v-list-group__header .v-list-item__append) {
  opacity: 0.6;
}

:deep(.v-list-group--open > .v-list-group__header .v-list-item__append) {
  opacity: 1;
}
</style>
