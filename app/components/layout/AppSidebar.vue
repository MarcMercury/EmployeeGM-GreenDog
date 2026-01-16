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

    <!-- Navigation Groups - Collapsible -->
    <v-list 
      v-model:opened="openGroups" 
      nav 
      density="compact" 
      class="px-2 mt-2"
    >
      <!-- Dashboard - Always visible -->
      <v-list-item
        to="/"
        prepend-icon="mdi-view-dashboard"
        title="Dashboard"
        rounded="lg"
        class="nav-item mb-1"
      />

      <!-- Contact List Group - Collapsible -->
      <v-list-group v-if="!rail" value="contacts">
        <template #activator="{ props: activatorProps }">
          <v-list-item
            v-bind="activatorProps"
            prepend-icon="mdi-account-group"
            title="Contact List"
            rounded="lg"
            class="nav-item"
          />
        </template>
        <v-list-item to="/roster" title="All Staff" prepend-icon="mdi-badge-account-horizontal" density="compact" rounded="lg" class="nav-item ml-4" />
      </v-list-group>
      <v-list-item v-else to="/roster" prepend-icon="mdi-account-group" title="Contacts" rounded="lg" class="nav-item mb-1" />

      <!-- People & Skills Group - Collapsible -->
      <v-list-group v-if="!rail" value="skills">
        <template #activator="{ props: activatorProps }">
          <v-list-item
            v-bind="activatorProps"
            prepend-icon="mdi-hexagon-multiple"
            title="People & Skills"
            rounded="lg"
            class="nav-item"
          />
        </template>
        <v-list-item to="/profile" title="My Profile" prepend-icon="mdi-account-card" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item to="/development" title="My Growth" prepend-icon="mdi-chart-line" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item to="/people/my-skills" title="My Skills" prepend-icon="mdi-lightbulb" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasHrAccess" to="/people/skill-stats" title="Skill Stats" prepend-icon="mdi-chart-bar" density="compact" rounded="lg" class="nav-item ml-4" />
      </v-list-group>
      <v-list-item v-else to="/profile" prepend-icon="mdi-hexagon-multiple" title="Skills" rounded="lg" class="nav-item mb-1" />

      <!-- Operations Group - Collapsible -->
      <v-list-group v-if="!rail" value="operations">
        <template #activator="{ props: activatorProps }">
          <v-list-item
            v-bind="activatorProps"
            prepend-icon="mdi-calendar-clock"
            title="Operations"
            rounded="lg"
            class="nav-item"
          />
        </template>
        <v-list-item to="/schedule" title="Schedule" prepend-icon="mdi-calendar" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasScheduleManageAccess" to="/schedule/builder" title="Schedule Builder" prepend-icon="mdi-view-dashboard-edit" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item to="/time-off" title="Time Off" prepend-icon="mdi-calendar-remove" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item to="/training" title="Training" prepend-icon="mdi-school" density="compact" rounded="lg" class="nav-item ml-4" />
      </v-list-group>
      <v-list-item v-else to="/schedule" prepend-icon="mdi-calendar-clock" title="Ops" rounded="lg" class="nav-item mb-1" />

      <!-- Recruiting Group - HR/Manager Access -->
      <v-list-group v-if="hasRecruitingAccess && !rail" value="recruiting">
        <template #activator="{ props: activatorProps }">
          <v-list-item
            v-bind="activatorProps"
            prepend-icon="mdi-account-search"
            title="Recruiting"
            rounded="lg"
            class="nav-item"
          />
        </template>
        <v-list-item to="/recruiting" title="Pipeline" prepend-icon="mdi-view-dashboard" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item to="/recruiting/candidates" title="Candidates" prepend-icon="mdi-account-multiple-plus" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item to="/recruiting/onboarding" title="Onboarding" prepend-icon="mdi-clipboard-check-multiple" density="compact" rounded="lg" class="nav-item ml-4" />
      </v-list-group>
      <v-list-item v-else-if="hasRecruitingAccess" to="/recruiting" prepend-icon="mdi-account-search" title="Recruiting" rounded="lg" class="nav-item mb-1" />

      <!-- Marketing Group - Marketing Access -->
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
        <!-- Command Center - Marketing Hub -->
        <v-list-item to="/marketing/command-center" title="Command Center" prepend-icon="mdi-view-dashboard" density="compact" rounded="lg" class="nav-item ml-4" />
        <!-- Calendar - visible to marketing roles -->
        <v-list-item to="/marketing/calendar" title="Calendar" prepend-icon="mdi-calendar-month" density="compact" rounded="lg" class="nav-item ml-4" />
        <!-- Events and Leads -->
        <v-list-item to="/growth/events" title="Events" prepend-icon="mdi-calendar-star" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item to="/growth/leads" title="Leads CRM" prepend-icon="mdi-account-star" density="compact" rounded="lg" class="nav-item ml-4" />
        <!-- EzyVet Ecosystem -->
        <v-list-item to="/marketing/ezyvet-crm" title="EzyVet CRM" prepend-icon="mdi-database-import" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item to="/marketing/ezyvet-analytics" title="EzyVet Analytics" prepend-icon="mdi-chart-areaspline" density="compact" rounded="lg" class="nav-item ml-4" />
        <!-- Marketing Hubs -->
        <v-list-item to="/marketing/partners" title="Partners" prepend-icon="mdi-handshake" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item to="/marketing/influencers" title="Influencers" prepend-icon="mdi-account-star-outline" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item to="/marketing/inventory" title="Inventory" prepend-icon="mdi-package-variant" density="compact" rounded="lg" class="nav-item ml-4" />
        <!-- Visible to all marketing roles -->
        <v-list-item to="/marketing/resources" title="Resources" prepend-icon="mdi-folder-multiple" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item to="/marketing/partnerships" title="Referrals" prepend-icon="mdi-handshake-outline" density="compact" rounded="lg" class="nav-item ml-4" />
      </v-list-group>
      <v-list-item v-else-if="hasMarketingAccess" to="/marketing/calendar" prepend-icon="mdi-bullhorn" title="Marketing" rounded="lg" class="nav-item mb-1" />

      <!-- GDU (Education) Group - Education Access -->
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
        <v-list-item to="/gdu" title="Dashboard" prepend-icon="mdi-view-dashboard" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item to="/gdu/students" title="Student Contacts" prepend-icon="mdi-account-school" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item to="/gdu/visitors" title="CE Course Contacts" prepend-icon="mdi-certificate" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item to="/gdu/events" title="CE Events" prepend-icon="mdi-calendar-star" density="compact" rounded="lg" class="nav-item ml-4" />
      </v-list-group>
      <v-list-item v-else-if="hasEducationAccess" to="/gdu" prepend-icon="mdi-school" title="GDU" rounded="lg" class="nav-item mb-1" />
    </v-list>

    <template #append>
      <v-divider class="border-opacity-10" />
      
      <!-- Admin Settings - Only for admin roles -->
      <v-list v-if="hasAdminAccess" nav density="compact" class="px-2">
        <v-list-item
          to="/admin/skills-management"
          prepend-icon="mdi-bookshelf"
          title="Skill Library"
          rounded="lg"
          class="nav-item"
        />
        <v-list-item
          to="/settings"
          prepend-icon="mdi-cog"
          title="Settings"
          rounded="lg"
          class="nav-item"
        />
      </v-list>

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
import { computed, ref } from 'vue'
import { SECTION_ACCESS } from '~/types'
import type { UserRole } from '~/types'

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

const profile = computed(() => authStore.profile)
const userRole = computed<UserRole>(() => authStore.userRole || 'user')
const fullName = computed(() => authStore.fullName)
const initials = computed(() => authStore.initials)

// Role-based access helpers using the centralized SECTION_ACCESS matrix
const isAdmin = computed(() => authStore.isAdmin)
const isManager = computed(() => userRole.value === 'manager')
const hasHrAccess = computed(() => SECTION_ACCESS.hr.includes(userRole.value))
const hasRecruitingAccess = computed(() => SECTION_ACCESS.recruiting.includes(userRole.value))
const hasMarketingAccess = computed(() => SECTION_ACCESS.marketing.includes(userRole.value))
const hasEducationAccess = computed(() => SECTION_ACCESS.education.includes(userRole.value))
const hasScheduleManageAccess = computed(() => SECTION_ACCESS.schedules_manage.includes(userRole.value))
const hasAdminAccess = computed(() => SECTION_ACCESS.admin.includes(userRole.value))

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
