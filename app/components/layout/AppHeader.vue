<template>
  <v-app-bar flat color="transparent" class="app-header" height="64">
    <!-- Sidebar toggle for rail mode -->
    <v-app-bar-nav-icon @click="$emit('toggle-sidebar')" />

    <!-- Title - always visible on desktop -->
    <v-toolbar-title class="text-h6 font-weight-medium">
      <slot name="title">
        {{ title }}
      </slot>
      <span v-if="subtitle" class="text-caption text-grey ml-2 d-none d-lg-inline">{{ subtitle }}</span>
    </v-toolbar-title>

    <v-spacer />

    <!-- Search - wider on desktop -->
    <v-text-field
      v-if="showSearch"
      v-model="searchQuery"
      placeholder="Search employees, skills, schedules..."
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      density="compact"
      hide-details
      single-line
      class="search-field mr-4"
      style="max-width: 400px; min-width: 280px;"
      @keyup.enter="$emit('search', searchQuery)"
    />

    <!-- Notifications -->
    <v-menu v-if="showNotifications">
      <template #activator="{ props }">
        <v-btn icon v-bind="props" class="mr-2">
          <v-badge 
            :content="notificationCount" 
            :model-value="notificationCount > 0"
            color="error"
          >
            <v-icon>mdi-bell</v-icon>
          </v-badge>
        </v-btn>
      </template>
      <v-card min-width="300">
        <v-card-title class="text-subtitle-1">Notifications</v-card-title>
        <v-divider />
        <v-list v-if="notifications.length > 0">
          <v-list-item 
            v-for="notification in notifications" 
            :key="notification.id"
            :subtitle="notification.message"
          >
            <template #prepend>
              <v-icon :color="getNotificationColor(notification.type)">
                {{ getNotificationIcon(notification.type) }}
              </v-icon>
            </template>
          </v-list-item>
        </v-list>
        <v-card-text v-else class="text-center text-grey">
          No new notifications
        </v-card-text>
      </v-card>
    </v-menu>

    <!-- Theme Toggle -->
    <v-btn icon class="mr-2" @click="toggleTheme">
      <v-icon>{{ isDark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
    </v-btn>

    <!-- Direct Sign Out Button (always visible) -->
    <v-btn 
      v-if="profile"
      icon 
      class="mr-2"
      title="Sign Out"
      @click="handleSignOut"
    >
      <v-icon>mdi-logout</v-icon>
    </v-btn>

    <!-- User Menu -->
    <v-menu v-if="profile">
      <template #activator="{ props }">
        <v-btn 
          v-bind="props" 
          variant="text"
          class="user-menu-btn"
        >
          <v-avatar size="32" :color="profile.avatar_url ? undefined : 'primary'">
            <v-img v-if="profile.avatar_url" :src="profile.avatar_url" />
            <span v-else class="text-white text-body-2">{{ initials }}</span>
          </v-avatar>
          <span class="ml-2 d-none d-md-inline">{{ fullName }}</span>
          <v-icon end>mdi-chevron-down</v-icon>
        </v-btn>
      </template>
      <v-card>
        <v-list density="compact">
          <v-list-item :to="`/employees/${profile.id}`" prepend-icon="mdi-account">
            My Profile
          </v-list-item>
          <v-list-item to="/settings" prepend-icon="mdi-cog" v-if="isAdmin">
            Settings
          </v-list-item>
          <v-divider />
          <v-list-item prepend-icon="mdi-logout" @click="handleSignOut">
            Sign Out
          </v-list-item>
        </v-list>
      </v-card>
    </v-menu>
  </v-app-bar>
</template>

<script setup lang="ts">
import type { ToastNotification } from '~/types'

interface Props {
  title?: string
  subtitle?: string
  showSearch?: boolean
  showNotifications?: boolean
}

withDefaults(defineProps<Props>(), {
  title: '',
  subtitle: '',
  showSearch: true,
  showNotifications: true
})

defineEmits<{
  'toggle-sidebar': []
  search: [query: string]
}>()

const authStore = useAuthStore()
const uiStore = useUIStore()
const router = useRouter()

const searchQuery = ref('')

const profile = computed(() => authStore.profile)
const fullName = computed(() => authStore.fullName)
const initials = computed(() => authStore.initials)
const isAdmin = computed(() => authStore.isAdmin)

const isDark = computed(() => uiStore.isDarkMode)
const notifications = computed(() => uiStore.notifications)
const notificationCount = computed(() => notifications.value.length)

function toggleTheme() {
  uiStore.toggleTheme()
}

function getNotificationColor(type: ToastNotification['type']): string {
  const colors = {
    success: 'success',
    error: 'error',
    warning: 'warning',
    info: 'info'
  }
  return colors[type]
}

function getNotificationIcon(type: ToastNotification['type']): string {
  const icons = {
    success: 'mdi-check-circle',
    error: 'mdi-alert-circle',
    warning: 'mdi-alert',
    info: 'mdi-information'
  }
  return icons[type]
}

async function handleSignOut() {
  await authStore.signOut()
  router.push('/auth/login')
}
</script>

<style scoped>
.app-header {
  border-bottom: 1px solid rgba(0, 0, 0, 0.08) !important;
}

.search-field :deep(.v-field) {
  border-radius: 24px;
}

.user-menu-btn {
  text-transform: none;
}
</style>
