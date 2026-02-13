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
          <div class="text-subtitle-1 font-weight-bold">GDD</div>
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

      <!-- ===== Resources Group - Collapsable ===== -->
      <v-list-group v-if="hasSectionAccess('Resources') && !rail" value="resources">
        <template #activator="{ props: activatorProps }">
          <v-list-item
            v-bind="activatorProps"
            prepend-icon="mdi-bookshelf"
            title="Resources"
            rounded="lg"
            class="nav-item"
          />
        </template>
        <v-list-item v-if="hasPageAccess('/wiki')" to="/wiki" title="Wiki" prepend-icon="mdi-book-open-page-variant" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/med-ops/facilities')" to="/med-ops/facilities" title="Facility Resources" prepend-icon="mdi-office-building" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/contact-list')" to="/contact-list" title="Contact List" prepend-icon="mdi-contacts" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/marketing/list-hygiene')" to="/marketing/list-hygiene" title="List Hygiene" prepend-icon="mdi-broom" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/marketplace')" to="/marketplace" title="Marketplace" prepend-icon="mdi-store" density="compact" rounded="lg" class="nav-item ml-4" />
      </v-list-group>
      <v-list-item v-else-if="hasSectionAccess('Resources')" to="/wiki" prepend-icon="mdi-bookshelf" title="Resources" rounded="lg" class="nav-item mb-1" />

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
        <v-list-item v-if="hasPageAccess('/my-schedule')" to="/my-schedule" title="My Schedule" prepend-icon="mdi-calendar-account" density="compact" rounded="lg" class="nav-item ml-4" />
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
        <v-list-item v-if="hasPageAccess('/admin/skills-management')" to="/admin/skills-management" title="Skills Management" prepend-icon="mdi-bookshelf" density="compact" rounded="lg" class="nav-item ml-4" />
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
        <v-list-item v-if="hasPageAccess('/med-ops/calculators')" to="/med-ops/calculators" title="Drug Calculators" prepend-icon="mdi-calculator" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/med-ops/boards')" to="/med-ops/boards" title="Medical Boards" prepend-icon="mdi-clipboard-pulse" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/med-ops/partners')" to="/med-ops/partners" title="Med Ops Partners" prepend-icon="mdi-handshake" density="compact" rounded="lg" class="nav-item ml-4" />
      </v-list-group>
      <v-list-item v-else-if="hasMedOpsAccess" to="/med-ops/calculators" prepend-icon="mdi-medical-bag" title="Med" rounded="lg" class="nav-item mb-1" />

      <!-- ===== HR Group - Page-level access control ===== -->
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
        <v-list-item v-if="hasPageAccess('/admin/payroll/review')" to="/admin/payroll/review" title="Payroll Review" prepend-icon="mdi-cash-check" density="compact" rounded="lg" class="nav-item ml-4" />

        <v-list-item v-if="hasPageAccess('/admin/intake')" to="/admin/intake" title="Intake Management" prepend-icon="mdi-clipboard-flow" density="compact" rounded="lg" class="nav-item ml-4" />
      </v-list-group>
      <v-list-item v-else-if="hasHrAccess" to="/schedule" prepend-icon="mdi-briefcase" title="HR" rounded="lg" class="nav-item mb-1" />

      <!-- ===== Marketing Group - Visible to: super_admin, admin, manager, marketing_admin ===== -->
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

      <!-- ===== CRM & Analytics Group - SECTION_ACCESS driven ===== -->
      <v-list-group v-if="hasCrmAccess && !rail" value="crm-analytics">
        <template #activator="{ props: activatorProps }">
          <v-list-item
            v-bind="activatorProps"
            prepend-icon="mdi-chart-box"
            title="CRM & Analytics"
            rounded="lg"
            class="nav-item"
          />
        </template>
        <v-list-item v-if="hasPageAccess('/marketing/sauron')" to="/marketing/sauron" title="Sauron" prepend-icon="mdi-eye" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/marketing/ezyvet-analytics')" to="/marketing/ezyvet-analytics" title="EzyVet Analytics" prepend-icon="mdi-chart-areaspline" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/marketing/appointment-analysis')" to="/marketing/appointment-analysis" title="Appointment Analysis" prepend-icon="mdi-calendar-search" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/marketing/invoice-analysis')" to="/marketing/invoice-analysis" title="Invoice Analysis" prepend-icon="mdi-receipt-text-check" density="compact" rounded="lg" class="nav-item ml-4" />
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
        <v-list-item v-if="hasPageAccess('/admin/agents')" to="/admin/agents" title="AI Agents" prepend-icon="mdi-robot" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/admin/email-templates')" to="/admin/email-templates" title="Email Templates" prepend-icon="mdi-email-edit" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/admin/services')" to="/admin/services" title="Services" prepend-icon="mdi-medical-bag" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/admin/scheduling-rules')" to="/admin/scheduling-rules" title="Scheduling Rules" prepend-icon="mdi-calendar-clock" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/admin/skills-management')" to="/admin/skills-management" title="Skills Management" prepend-icon="mdi-bookshelf" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="hasPageAccess('/admin/slack')" to="/admin/slack" title="Slack Integration" prepend-icon="mdi-slack" density="compact" rounded="lg" class="nav-item ml-4" />
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
import { computed, ref } from 'vue'
import type { UserRole } from '~/types'
import { SECTION_ACCESS } from '~/types'

// PAGE-LEVEL ACCESS - Extracted directly from database page_access table
// Each path maps to the roles that have 'full' or 'view' access
const PAGE_ACCESS: Record<string, readonly string[]> = {
  // Global
  '/': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin', 'office_admin', 'sup_admin', 'user'],
  '/activity': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin', 'office_admin', 'sup_admin', 'user'],
  '/wiki': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin', 'office_admin', 'sup_admin', 'user'],
  '/marketplace': ['super_admin', 'sup_admin'],
  
  // My Workspace
  '/profile': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin', 'office_admin', 'sup_admin', 'user'],
  '/contact-list': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin', 'office_admin', 'sup_admin', 'user'],
  '/my-schedule': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin', 'office_admin', 'sup_admin', 'user'],
  '/people/my-skills': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin', 'office_admin', 'sup_admin', 'user'],
  '/development': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin', 'office_admin', 'sup_admin', 'user'],
  '/academy/my-training': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin', 'office_admin', 'sup_admin', 'user'],
  
  // Management
  '/roster': ['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin'],
  '/skills-library': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin', 'office_admin', 'sup_admin', 'user'],
  '/people/skill-stats': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin', 'sup_admin'],
  '/med-ops/facilities': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin', 'office_admin', 'sup_admin', 'user'],
  '/academy/course-manager': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin', 'office_admin', 'sup_admin'],
  
  // Med Ops
  '/med-ops/wiki': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin', 'office_admin', 'sup_admin', 'user'],
  '/med-ops/calculators': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin', 'office_admin', 'sup_admin', 'user'],
  '/med-ops/boards': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin', 'office_admin', 'sup_admin', 'user'],
  '/med-ops/partners': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin', 'office_admin', 'sup_admin', 'user'],
  
  // HR
  '/schedule': ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin', 'sup_admin'],
  '/schedule/wizard': ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin', 'sup_admin'],
  '/schedule/builder': ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin', 'sup_admin'],
  '/schedule/services': ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin', 'sup_admin'],
  '/time-off': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin', 'office_admin', 'sup_admin'],
  '/recruiting': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin', 'office_admin', 'sup_admin'],
  '/export-payroll': ['super_admin', 'admin', 'manager', 'hr_admin', 'office_admin', 'sup_admin'],

  
  // Marketing
  '/marketing/calendar': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin', 'office_admin', 'sup_admin', 'user'],
  '/marketing/resources': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin', 'office_admin', 'sup_admin', 'user'],
  '/marketing/inventory': ['super_admin', 'admin', 'manager', 'marketing_admin', 'user'],
  '/marketing/partners': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin', 'office_admin'],
  '/marketing/influencers': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin'],
  '/marketing/partnerships': ['super_admin', 'admin', 'manager', 'marketing_admin'],
  '/marketing/command-center': ['super_admin', 'admin', 'manager', 'marketing_admin'],
  '/growth/events': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin', 'office_admin'],
  '/growth/leads': ['super_admin', 'admin', 'manager', 'marketing_admin'],
  
  // CRM & Analytics
  '/marketing/sauron': ['super_admin', 'admin', 'manager', 'marketing_admin', 'sup_admin'],
  '/marketing/ezyvet-analytics': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin', 'office_admin', 'sup_admin'],
  '/marketing/appointment-analysis': ['super_admin', 'admin', 'manager', 'marketing_admin', 'sup_admin'],
  '/marketing/list-hygiene': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin', 'office_admin', 'sup_admin'],
  '/marketing/invoice-analysis': ['super_admin', 'admin', 'manager', 'marketing_admin', 'sup_admin'],
  
  // GDU
  '/gdu': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin', 'office_admin', 'sup_admin'],
  '/gdu/students': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin', 'office_admin', 'sup_admin'],
  '/gdu/visitors': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin', 'office_admin', 'sup_admin'],
  '/gdu/events': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin', 'office_admin', 'sup_admin'],
  
  // Admin Ops
  '/admin/users': ['super_admin', 'admin'],
  '/admin/agents': ['super_admin', 'admin'],
  '/admin/email-templates': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin', 'office_admin'],
  '/admin/services': ['super_admin', 'admin'],
  '/admin/scheduling-rules': ['super_admin', 'admin'],
  '/admin/skills-management': ['super_admin', 'admin', 'manager', 'hr_admin', 'marketing_admin', 'office_admin'],
  '/admin/slack': ['super_admin', 'admin'],
  '/admin/system-health': ['super_admin', 'admin'],
  '/settings': ['super_admin', 'admin'],

  // HR admin pages
  '/admin/intake': ['super_admin', 'admin'],
  '/admin/payroll/review': ['super_admin', 'admin'],
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

const profile = computed(() => authStore.profile)
const userRole = computed<UserRole>(() => authStore.userRole || 'user')
const fullName = computed(() => authStore.fullName)
const initials = computed(() => authStore.initials)

// PAGE-LEVEL ACCESS CHECK - checks specific page path
function hasPageAccess(path: string): boolean {
  const role = userRole.value
  if (!role) return false
  const allowedRoles = PAGE_ACCESS[path]
  if (!allowedRoles) return false
  return allowedRoles.includes(role)
}

// SECTION ACCESS - true if user has access to ANY page in that section
function hasSectionAccess(sectionName: string): boolean {
  const role = userRole.value
  if (!role) return false
  
  // Map sections to their pages
  const sectionPages: Record<string, string[]> = {
    'Resources': ['/wiki', '/med-ops/facilities', '/contact-list', '/marketing/list-hygiene', '/marketplace'],
    'My Workspace': ['/profile', '/my-schedule', '/academy/my-training'],
    'Management': ['/roster', '/skills-library', '/people/skill-stats', '/academy/course-manager'],
    'Med Ops': ['/med-ops/calculators', '/med-ops/boards', '/med-ops/partners'],
    'HR': ['/schedule', '/schedule/wizard', '/schedule/services', '/time-off', '/recruiting', '/export-payroll', '/admin/intake', '/admin/payroll/review'],
    'Marketing': ['/marketing/calendar', '/marketing/resources', '/marketing/inventory', '/marketing/partners', '/marketing/influencers', '/marketing/partnerships', '/growth/events', '/growth/leads'],
    'CRM & Analytics': ['/marketing/sauron', '/marketing/ezyvet-analytics', '/marketing/appointment-analysis', '/marketing/invoice-analysis'],
    'GDU': ['/gdu', '/gdu/students', '/gdu/visitors', '/gdu/events'],
    'Admin Ops': ['/admin/users', '/admin/agents', '/admin/email-templates', '/admin/services', '/admin/scheduling-rules', '/admin/skills-management', '/admin/slack', '/admin/system-health', '/settings'],
  }
  
  const pages = sectionPages[sectionName]
  if (!pages) return false
  
  // User has section access if they have access to at least one page in that section
  return pages.some(page => hasPageAccess(page))
}

// Section access computed properties — use SECTION_ACCESS from ~/types as single source of truth
const isAdmin = computed(() => authStore.isAdmin)
const isManager = computed(() => userRole.value === 'manager')
const isSupervisor = computed(() => userRole.value === 'sup_admin')
const hasMedOpsAccess = computed(() => SECTION_ACCESS.med_ops.includes(userRole.value))
const hasHrAccess = computed(() => SECTION_ACCESS.hr.includes(userRole.value))
const hasMarketingAccess = computed(() => SECTION_ACCESS.marketing.includes(userRole.value))
const hasEducationAccess = computed(() => SECTION_ACCESS.education.includes(userRole.value))
const hasAdminAccess = computed(() => SECTION_ACCESS.admin.includes(userRole.value))
const hasCrmAccess = computed(() => SECTION_ACCESS.crm_analytics.includes(userRole.value))

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
