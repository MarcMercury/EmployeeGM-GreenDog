<template>
  <v-app :theme="isDark ? 'dark' : 'light'">
    <!-- Sidebar Navigation -->
    <v-navigation-drawer
      v-model="sidebarOpen"
      :rail="sidebarRail && !isMobile"
      :temporary="isMobile"
      :permanent="!isMobile"
      color="primary"
      class="app-sidebar"
      width="256"
    >
      <!-- Logo/Header -->
      <div class="sidebar-header pa-4">
        <div class="d-flex align-center gap-3">
          <v-avatar color="white" size="40">
            <v-icon color="primary" size="24">mdi-paw</v-icon>
          </v-avatar>
          <div v-if="!sidebarRail || isMobile" class="text-white">
            <div class="text-subtitle-1 font-weight-bold">Employee GM</div>
            <div class="text-caption opacity-70">Green Dog Dental</div>
          </div>
        </div>
      </div>

      <v-divider class="opacity-30" />

      <!-- Navigation Items -->
      <v-list nav density="comfortable" class="px-2 mt-2">
        <v-list-item
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="sidebarRail && !isMobile ? '' : item.title"
          rounded="lg"
          class="nav-item mb-1"
          color="white"
        >
          <v-tooltip v-if="sidebarRail && !isMobile" activator="parent" location="end">
            {{ item.title }}
          </v-tooltip>
        </v-list-item>
      </v-list>

      <template #append>
        <v-divider class="opacity-30" />
        
        <!-- User Section -->
        <div class="pa-4">
          <v-list-item
            v-if="profile"
            class="pa-0 nav-item"
            rounded="lg"
            to="/profile"
          >
            <template #prepend>
              <v-avatar size="36" color="white">
                <v-img v-if="profile.avatar_url" :src="profile.avatar_url" />
                <span v-else class="text-primary font-weight-bold text-body-2">{{ initials }}</span>
              </v-avatar>
            </template>
            <v-list-item-title v-if="!sidebarRail || isMobile" class="text-white text-body-2">
              {{ fullName }}
            </v-list-item-title>
            <v-list-item-subtitle v-if="!sidebarRail || isMobile" class="text-white opacity-70 text-caption">
              {{ profile.role || 'Employee' }}
            </v-list-item-subtitle>
          </v-list-item>

          <!-- Sign Out -->
          <v-btn
            v-if="!sidebarRail || isMobile"
            variant="outlined"
            color="white"
            block
            class="mt-3"
            @click="handleSignOut"
          >
            <v-icon start>mdi-logout</v-icon>
            Sign Out
          </v-btn>
          <v-btn
            v-else
            icon="mdi-logout"
            variant="text"
            color="white"
            class="mt-2"
            @click="handleSignOut"
          >
            <v-tooltip activator="parent" location="end">Sign Out</v-tooltip>
          </v-btn>
        </div>

        <!-- Rail Toggle -->
        <div class="pa-2 text-center" v-if="!isMobile">
          <v-btn
            :icon="sidebarRail ? 'mdi-chevron-right' : 'mdi-chevron-left'"
            variant="text"
            color="white"
            size="small"
            @click="sidebarRail = !sidebarRail"
          />
        </div>
      </template>
    </v-navigation-drawer>
    
    <v-main class="app-main">
      <!-- Premium App Bar -->
      <AppHeader 
        :title="pageTitle"
        :subtitle="pageSubtitle"
        @toggle-sidebar="toggleSidebar"
      />
      
      <!-- Page Content with Transitions -->
      <v-container fluid class="page-container pa-4 pa-md-6 pa-lg-8">
        <!-- Breadcrumbs -->
        <v-breadcrumbs 
          v-if="breadcrumbs.length > 1" 
          :items="breadcrumbs"
          class="px-0 pt-0 pb-4"
        >
          <template #divider>
            <v-icon size="small">mdi-chevron-right</v-icon>
          </template>
        </v-breadcrumbs>

        <!-- Page Transition Wrapper -->
        <Transition name="page" mode="out-in">
          <div :key="route.path">
            <slot />
          </div>
        </Transition>
      </v-container>

      <!-- Floating Action Button (for quick actions) -->
      <v-fab
        v-if="showFab"
        icon="mdi-plus"
        color="primary"
        location="bottom end"
        size="large"
        class="fab-button"
        @click="handleFabClick"
      />
    </v-main>

    <!-- Global Snackbar Notifications -->
    <v-snackbar
      v-for="notification in notifications"
      :key="notification.id"
      :model-value="true"
      :color="notification.type"
      :timeout="notification.timeout"
      location="bottom right"
      multi-line
      class="premium-snackbar"
      @update:model-value="removeNotification(notification.id)"
    >
      <div class="d-flex align-center">
        <v-icon class="mr-2">{{ getNotificationIcon(notification.type) }}</v-icon>
        {{ notification.message }}
      </div>
      <template #actions>
        <v-btn
          variant="text"
          icon="mdi-close"
          size="small"
          @click="removeNotification(notification.id)"
        />
      </template>
    </v-snackbar>

    <!-- Premium Page Loading Overlay -->
    <v-overlay
      :model-value="isPageLoading"
      class="align-center justify-center loading-overlay"
      persistent
      scrim="rgba(0,0,0,0.7)"
    >
      <div class="text-center">
        <v-progress-circular
          color="primary"
          indeterminate
          size="64"
          width="4"
        />
        <p class="text-white mt-4 text-body-1">Loading...</p>
      </div>
    </v-overlay>

    <!-- Command Palette (Ctrl/Cmd + K) -->
    <v-dialog v-model="commandPaletteOpen" max-width="600" class="command-palette">
      <v-card>
        <v-text-field
          v-model="commandSearch"
          placeholder="Type a command or search..."
          prepend-inner-icon="mdi-magnify"
          variant="solo"
          hide-details
          autofocus
          class="command-input"
        />
        <v-divider />
        <v-list density="compact" max-height="400" class="py-0">
          <v-list-subheader>Quick Actions</v-list-subheader>
          <v-list-item
            v-for="action in filteredCommands"
            :key="action.id"
            :prepend-icon="action.icon"
            :title="action.title"
            :subtitle="action.subtitle"
            @click="executeCommand(action)"
          >
            <template #append>
              <v-chip v-if="action.shortcut" size="x-small" variant="outlined">
                {{ action.shortcut }}
              </v-chip>
            </template>
          </v-list-item>
        </v-list>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup lang="ts">
import type { ToastNotification, NavItem } from '~/types'

interface CommandAction {
  id: string
  title: string
  subtitle?: string
  icon: string
  shortcut?: string
  action: () => void
}

const supabase = useSupabaseClient()
const uiStore = useUIStore()
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

// Reactive state
const sidebarOpen = ref(true)
const sidebarRail = ref(false)
const commandPaletteOpen = ref(false)
const commandSearch = ref('')
const windowWidth = ref(1200)

// Profile computed
const profile = computed(() => authStore.profile)
const fullName = computed(() => {
  if (!profile.value) return 'User'
  return `${profile.value.first_name || ''} ${profile.value.last_name || ''}`.trim() || profile.value.email
})
const initials = computed(() => {
  if (!profile.value) return 'U'
  const first = profile.value.first_name?.[0] || ''
  const last = profile.value.last_name?.[0] || ''
  return (first + last).toUpperCase() || profile.value.email[0].toUpperCase()
})

// Navigation items
const navItems: NavItem[] = [
  { title: 'Home', icon: 'mdi-home', to: '/' },
  { title: 'Profile', icon: 'mdi-account-card', to: '/profile' },
  { title: 'Team', icon: 'mdi-account-group', to: '/employees' },
  { title: 'Schedule', icon: 'mdi-calendar', to: '/schedule' },
  { title: 'Time Off', icon: 'mdi-calendar-remove', to: '/time-off' },
  { title: 'Skills', icon: 'mdi-star-circle', to: '/skills' },
  { title: 'Training', icon: 'mdi-school', to: '/training' },
  { title: 'Marketing', icon: 'mdi-bullhorn', to: '/marketing' },
  { title: 'Leads', icon: 'mdi-account-star', to: '/leads' },
  { title: 'Settings', icon: 'mdi-cog', to: '/settings' }
]

// Computed properties
const notifications = computed(() => uiStore.notifications)
const isPageLoading = computed(() => uiStore.isPageLoading)
const isDark = computed(() => uiStore.isDarkMode)
const isAdmin = computed(() => authStore.isAdmin)

const isMobile = computed(() => windowWidth.value < 768)

// Page metadata
const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Welcome back!' },
  '/profile': { title: 'My Profile', subtitle: 'View and edit your information' },
  '/employees': { title: 'Team Directory', subtitle: 'Browse all team members' },
  '/schedule': { title: 'Schedule', subtitle: 'Manage work schedules' },
  '/time-off': { title: 'Time Off', subtitle: 'Request and manage time off' },
  '/skills': { title: 'Skills & Growth', subtitle: 'Track your professional development' },
  '/training': { title: 'Training', subtitle: 'Courses and certifications' },
  '/marketing': { title: 'Marketing', subtitle: 'Campaigns and outreach' },
  '/leads': { title: 'Leads', subtitle: 'Manage potential clients' },
  '/settings': { title: 'Admin Settings', subtitle: 'System configuration' }
}

const pageTitle = computed(() => {
  const basePath = '/' + route.path.split('/')[1]
  return pageTitles[basePath]?.title || pageTitles[route.path]?.title || 'Employee GM'
})

const pageSubtitle = computed(() => {
  const basePath = '/' + route.path.split('/')[1]
  return pageTitles[basePath]?.subtitle || pageTitles[route.path]?.subtitle || ''
})

// Breadcrumbs
const breadcrumbs = computed(() => {
  const crumbs = [{ title: 'Home', to: '/' }]
  const pathParts = route.path.split('/').filter(Boolean)
  
  let currentPath = ''
  pathParts.forEach((part, index) => {
    currentPath += '/' + part
    const isLast = index === pathParts.length - 1
    const title = part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ')
    crumbs.push({
      title,
      to: isLast ? undefined : currentPath,
      disabled: isLast
    })
  })
  
  return crumbs
})

// Show FAB based on current page
const showFab = computed(() => {
  const fabPages = ['/employees', '/schedule', '/leads', '/marketing']
  return fabPages.includes(route.path) && isAdmin.value
})

// Command palette actions
const commandActions: CommandAction[] = [
  { id: 'home', title: 'Go to Dashboard', icon: 'mdi-home', shortcut: 'G H', action: () => router.push('/') },
  { id: 'profile', title: 'My Profile', icon: 'mdi-account', shortcut: 'G P', action: () => router.push('/profile') },
  { id: 'team', title: 'Team Directory', icon: 'mdi-account-group', shortcut: 'G T', action: () => router.push('/employees') },
  { id: 'schedule', title: 'Schedule', icon: 'mdi-calendar', shortcut: 'G S', action: () => router.push('/schedule') },
  { id: 'skills', title: 'Skills & Growth', icon: 'mdi-star-circle', action: () => router.push('/skills') },
  { id: 'theme', title: 'Toggle Theme', subtitle: 'Switch between light and dark mode', icon: 'mdi-theme-light-dark', shortcut: 'Ctrl T', action: () => uiStore.toggleTheme() },
  { id: 'signout', title: 'Sign Out', icon: 'mdi-logout', action: () => authStore.signOut().then(() => router.push('/auth/login')) }
]

const filteredCommands = computed(() => {
  if (!commandSearch.value) return commandActions
  const search = commandSearch.value.toLowerCase()
  return commandActions.filter(cmd => 
    cmd.title.toLowerCase().includes(search) || 
    cmd.subtitle?.toLowerCase().includes(search)
  )
})

// Methods
function toggleSidebar() {
  if (isMobile.value) {
    sidebarOpen.value = !sidebarOpen.value
  } else {
    sidebarRail.value = !sidebarRail.value
  }
}

async function handleSignOut() {
  try {
    await supabase.auth.signOut()
    authStore.$reset()
    router.push('/auth/login')
  } catch (error) {
    console.error('Sign out error:', error)
  }
}

function removeNotification(id: string) {
  uiStore.removeNotification(id)
}

function getNotificationIcon(type: ToastNotification['type']): string {
  const icons: Record<string, string> = {
    success: 'mdi-check-circle',
    error: 'mdi-alert-circle',
    warning: 'mdi-alert',
    info: 'mdi-information'
  }
  return icons[type]
}

function handleFabClick() {
  // Context-aware FAB action
  const actions: Record<string, () => void> = {
    '/employees': () => router.push('/employees/new'),
    '/schedule': () => uiStore.showInfo('Create new schedule (coming soon)'),
    '/leads': () => uiStore.showInfo('Add new lead (coming soon)'),
    '/marketing': () => uiStore.showInfo('Create campaign (coming soon)')
  }
  actions[route.path]?.()
}

function executeCommand(action: CommandAction) {
  commandPaletteOpen.value = false
  commandSearch.value = ''
  action.action()
}

// Keyboard shortcuts
function handleKeydown(e: KeyboardEvent) {
  // Cmd/Ctrl + K for command palette
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    commandPaletteOpen.value = true
  }
  // Escape to close command palette
  if (e.key === 'Escape' && commandPaletteOpen.value) {
    commandPaletteOpen.value = false
  }
}

// Lifecycle
onMounted(async () => {
  // Initialize window width
  windowWidth.value = window.innerWidth
  
  // Fetch profile if needed
  if (!authStore.profile) {
    await authStore.fetchProfile()
  }
  
  // Window resize handler
  const handleResize = () => {
    windowWidth.value = window.innerWidth
    // Auto handle sidebar on mobile
    if (windowWidth.value < 768) {
      sidebarOpen.value = false
    } else {
      sidebarOpen.value = true
    }
  }
  
  window.addEventListener('resize', handleResize)
  window.addEventListener('keydown', handleKeydown)
  
  // Initial setup
  if (windowWidth.value < 768) {
    sidebarOpen.value = false
  }
  
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    window.removeEventListener('keydown', handleKeydown)
  })
})

// Watch for route changes to close mobile drawer
watch(() => route.path, () => {
  if (isMobile.value) {
    sidebarOpen.value = false
  }
})
</script>

<style scoped>
.app-main {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  min-height: 100vh;
  transition: background 0.3s ease;
}

.v-theme--dark .app-main {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

/* Sidebar Styles */
.app-sidebar {
  border: none !important;
}

.sidebar-header {
  min-height: 72px;
  display: flex;
  align-items: center;
}

.nav-item {
  color: rgba(255, 255, 255, 0.85) !important;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1) !important;
}

.nav-item.v-list-item--active {
  background: rgba(255, 255, 255, 0.2) !important;
  color: white !important;
}

.page-container {
  max-width: 1600px;
  margin: 0 auto;
}

/* Page Transitions */
.page-enter-active,
.page-leave-active {
  transition: all 0.25s ease-out;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* FAB Button */
.fab-button {
  position: fixed !important;
  bottom: 24px;
  right: 24px;
  z-index: 100;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

/* Premium Snackbar */
.premium-snackbar :deep(.v-snackbar__wrapper) {
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

/* Loading Overlay */
.loading-overlay :deep(.v-overlay__content) {
  backdrop-filter: blur(4px);
}

/* Command Palette */
.command-palette :deep(.v-card) {
  border-radius: 16px;
  overflow: hidden;
}

.command-input :deep(.v-field) {
  border-radius: 0;
}

/* Smooth scrollbar */
.page-container {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
}

.page-container::-webkit-scrollbar {
  width: 6px;
}

.page-container::-webkit-scrollbar-track {
  background: transparent;
}

.page-container::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}
</style>
