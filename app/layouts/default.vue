<template>
  <v-app :theme="isDark ? 'dark' : 'light'">
    <!-- Premium Sidebar Navigation -->
    <AppSidebar
      v-model="sidebarOpen"
      :rail="!isMobile && sidebarRail"
      :temporary="isMobile"
      @update:rail="sidebarRail = $event"
    />
    
    <v-main class="app-main" :style="{ marginLeft: sidebarMargin }">
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
import type { ToastNotification } from '~/types'

interface CommandAction {
  id: string
  title: string
  subtitle?: string
  icon: string
  shortcut?: string
  action: () => void
}

const uiStore = useUIStore()
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

// Reactive state - Desktop-first defaults
const sidebarOpen = ref(true)
const sidebarRail = ref(false)
const commandPaletteOpen = ref(false)
const commandSearch = ref('')
const windowWidth = ref(1920) // Desktop-first default for SSR

// Computed properties
const notifications = computed(() => uiStore.notifications)
const isPageLoading = computed(() => uiStore.isPageLoading)
const isDark = computed(() => uiStore.isDarkMode)
const isAdmin = computed(() => authStore.isAdmin)

// Desktop-first breakpoints: only treat as mobile below 960px
const isMobile = computed(() => windowWidth.value < 960)
const isTablet = computed(() => windowWidth.value >= 960 && windowWidth.value < 1280)

// Calculate sidebar margin for main content - Desktop-first
const sidebarMargin = computed(() => {
  if (isMobile.value) return '0px'
  if (sidebarRail.value) return '72px' // Slightly wider rail for desktop
  return '256px'
})

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
  
  // Window resize handler - Desktop-first
  const handleResize = () => {
    windowWidth.value = window.innerWidth
    // Only collapse sidebar on truly mobile devices (< 960px)
    if (windowWidth.value < 960) {
      sidebarOpen.value = false
    } else {
      // Keep sidebar expanded on desktop
      sidebarOpen.value = true
      sidebarRail.value = false
    }
  }
  
  window.addEventListener('resize', handleResize)
  window.addEventListener('keydown', handleKeydown)
  
  // Initial setup - Desktop-first: keep sidebar open unless truly mobile
  if (windowWidth.value < 960) {
    sidebarOpen.value = false
  } else {
    sidebarOpen.value = true
  }
  
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    window.removeEventListener('keydown', handleKeydown)
  })
})

// Watch for route changes to close mobile drawer
// Only close sidebar on route change if on mobile
watch(() => route.path, () => {
  if (isMobile.value && windowWidth.value < 960) {
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
