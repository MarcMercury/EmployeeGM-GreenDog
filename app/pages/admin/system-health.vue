<script setup lang="ts">
/**
 * System Settings & Health Dashboard
 *
 * Unified admin console decomposed into focused sub-components:
 *   1. Health     – live API/DB/Auth monitoring, metrics, table stats
 *   2. Organization – Company info, Departments, Positions (with skills), Locations
 *   3. Integrations – Connection status, data backup/export, migration tools
 *   4. Audit & Config – Audit trail viewer, app_settings key-value store
 *
 * Removed duplicate tabs:
 *   - Roles tab → use /admin/users (full RBAC with role assignment)
 *   - Emails tab → use /admin/email-templates (dedicated template manager)
 */

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin']
})

useHead({ title: 'System Settings' })

const route = useRoute()

const activeTab = ref(route.query.tab?.toString() || 'health')

// Preserve tab in URL for deep-linking
watch(activeTab, (tab) => {
  const url = new URL(window.location.href)
  url.searchParams.set('tab', tab)
  window.history.replaceState({}, '', url.toString())
})

const tabs = [
  { value: 'health', icon: 'mdi-heart-pulse', label: 'Health' },
  { value: 'organization', icon: 'mdi-domain', label: 'Organization' },
  { value: 'integrations', icon: 'mdi-connection', label: 'Integrations & Data' },
  { value: 'audit', icon: 'mdi-shield-search', label: 'Audit & Config' }
]
</script>

<template>
  <div class="max-w-7xl mx-auto">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold text-slate-800 flex items-center gap-2">
          <v-icon color="primary" size="32">mdi-cog</v-icon>
          <span>System Settings</span>
        </h1>
        <p class="text-slate-500 text-sm mt-1">
          Manage system health, organization structure, integrations, and audit trail
        </p>
      </div>
      <div class="d-flex gap-2 align-center">
        <v-chip color="warning" variant="flat" size="small">
          <v-icon start size="14">mdi-shield-crown</v-icon>
          Admin Only
        </v-chip>
        <v-btn
          variant="outlined"
          size="small"
          prepend-icon="mdi-account-group"
          to="/admin/users"
        >
          User Management
        </v-btn>
        <v-btn
          variant="outlined"
          size="small"
          prepend-icon="mdi-email-edit"
          to="/admin/email-templates"
        >
          Email Templates
        </v-btn>
      </div>
    </div>

    <!-- Tab Navigation -->
    <v-tabs v-model="activeTab" color="primary" class="mb-6" show-arrows>
      <v-tab v-for="tab in tabs" :key="tab.value" :value="tab.value">
        <v-icon start>{{ tab.icon }}</v-icon>
        {{ tab.label }}
      </v-tab>
    </v-tabs>

    <v-window v-model="activeTab">
      <!-- Health Dashboard -->
      <v-window-item value="health">
        <AdminSystemHealthDashboard />
      </v-window-item>

      <!-- Organization Settings -->
      <v-window-item value="organization">
        <AdminSystemOrganizationSettings />
      </v-window-item>

      <!-- Integrations & Data -->
      <v-window-item value="integrations">
        <AdminSystemIntegrationsData />
      </v-window-item>

      <!-- Audit & Config -->
      <v-window-item value="audit">
        <AdminSystemAuditSettings />
      </v-window-item>
    </v-window>
  </div>
</template>
