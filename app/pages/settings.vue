<script setup lang="ts">
/**
 * Settings page — redirects to the unified System Settings page.
 * Keeps a lightweight personal preferences panel for non-admin users.
 */

definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

useHead({ title: 'Settings' })

const uiStore = useUIStore()
const user = useSupabaseUser()

const darkMode = computed({
  get: () => uiStore.isDarkMode,
  set: (value: boolean) => uiStore.setTheme(value ? 'dark' : 'light')
})

const notifications = ref(true)

// Check if user has admin access
const isAdmin = computed(() => {
  const role = (user.value as any)?.user_metadata?.role
  return ['super_admin', 'admin'].includes(role)
})
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <div class="mb-6">
      <h1 class="text-h4 font-weight-bold mb-1">Settings</h1>
      <p class="text-body-1 text-grey-darken-1">
        Personal preferences and application settings
      </p>
    </div>

    <!-- Personal Preferences -->
    <v-card rounded="lg" class="mb-6">
      <v-card-title>Preferences</v-card-title>
      <v-card-text>
        <v-list>
          <v-list-item>
            <template #prepend>
              <v-icon color="primary">mdi-theme-light-dark</v-icon>
            </template>
            <v-list-item-title>Dark Mode</v-list-item-title>
            <v-list-item-subtitle>Toggle dark theme</v-list-item-subtitle>
            <template #append>
              <v-switch v-model="darkMode" hide-details color="primary" />
            </template>
          </v-list-item>
          <v-divider class="my-2" />
          <v-list-item>
            <template #prepend>
              <v-icon color="primary">mdi-bell</v-icon>
            </template>
            <v-list-item-title>Notifications</v-list-item-title>
            <v-list-item-subtitle>Enable push notifications</v-list-item-subtitle>
            <template #append>
              <v-switch v-model="notifications" hide-details color="primary" />
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <!-- Admin Quick Access -->
    <v-card v-if="isAdmin" rounded="lg" class="mb-6">
      <v-card-title>System Administration</v-card-title>
      <v-card-text>
        <p class="text-body-2 text-grey mb-4">
          System-level settings have been consolidated into the System Settings dashboard.
        </p>
        <v-row dense>
          <v-col cols="12" sm="6">
            <v-btn
              to="/admin/system-health"
              block
              variant="outlined"
              prepend-icon="mdi-cog"
              class="justify-start"
            >
              System Settings
            </v-btn>
          </v-col>
          <v-col cols="12" sm="6">
            <v-btn
              to="/admin/system-health?tab=organization"
              block
              variant="outlined"
              prepend-icon="mdi-domain"
              class="justify-start"
            >
              Organization
            </v-btn>
          </v-col>
          <v-col cols="12" sm="6">
            <v-btn
              to="/admin/users"
              block
              variant="outlined"
              prepend-icon="mdi-account-group"
              class="justify-start"
            >
              User Management
            </v-btn>
          </v-col>
          <v-col cols="12" sm="6">
            <v-btn
              to="/admin/email-templates"
              block
              variant="outlined"
              prepend-icon="mdi-email-edit"
              class="justify-start"
            >
              Email Templates
            </v-btn>
          </v-col>
          <v-col cols="12" sm="6">
            <v-btn
              to="/admin/system-health?tab=integrations"
              block
              variant="outlined"
              prepend-icon="mdi-connection"
              class="justify-start"
            >
              Integrations & Data
            </v-btn>
          </v-col>
          <v-col cols="12" sm="6">
            <v-btn
              to="/admin/system-health?tab=audit"
              block
              variant="outlined"
              prepend-icon="mdi-shield-search"
              class="justify-start"
            >
              Audit Log
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </div>
</template>
