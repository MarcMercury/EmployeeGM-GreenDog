<template>
  <v-app>
    <AppSidebar
      v-model="sidebarOpen"
      :rail="sidebarRail"
      @update:rail="sidebarRail = $event"
    />
    
    <v-main>
      <AppHeader 
        :title="pageTitle"
        @toggle-sidebar="sidebarOpen = !sidebarOpen"
      />
      
      <v-container fluid class="pa-4 pa-md-6">
        <slot />
      </v-container>
    </v-main>

    <!-- Global Snackbar Notifications -->
    <v-snackbar
      v-for="notification in notifications"
      :key="notification.id"
      :model-value="true"
      :color="notification.type"
      :timeout="notification.timeout"
      location="bottom right"
      @update:model-value="removeNotification(notification.id)"
    >
      {{ notification.message }}
      <template #actions>
        <v-btn
          variant="text"
          icon="mdi-close"
          @click="removeNotification(notification.id)"
        />
      </template>
    </v-snackbar>

    <!-- Page Loading Overlay -->
    <v-overlay
      :model-value="isPageLoading"
      class="align-center justify-center"
      persistent
    >
      <v-progress-circular
        color="primary"
        indeterminate
        size="64"
      />
    </v-overlay>
  </v-app>
</template>

<script setup lang="ts">
const uiStore = useUIStore()
const authStore = useAuthStore()
const route = useRoute()

const sidebarOpen = ref(true)
const sidebarRail = ref(false)

const notifications = computed(() => uiStore.notifications)
const isPageLoading = computed(() => uiStore.isPageLoading)

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    '/': 'Dashboard',
    '/profile': 'My Profile',
    '/employees': 'Team',
    '/schedule': 'Schedule',
    '/time-off': 'Time Off Requests',
    '/skills': 'Skills Management',
    '/marketing': 'Marketing',
    '/settings': 'Settings'
  }
  return titles[route.path] || ''
})

function removeNotification(id: string) {
  uiStore.removeNotification(id)
}

// Fetch profile on layout mount
onMounted(async () => {
  if (!authStore.profile) {
    await authStore.fetchProfile()
  }
})

// Handle responsive sidebar
const { width } = useWindowSize()
watch(width, (newWidth) => {
  if (newWidth < 1024) {
    sidebarRail.value = true
  }
}, { immediate: true })

function useWindowSize() {
  const width = ref(window.innerWidth)
  
  onMounted(() => {
    window.addEventListener('resize', () => {
      width.value = window.innerWidth
    })
  })
  
  return { width }
}
</script>

<style scoped>
.v-main {
  background-color: #f5f5f5;
  min-height: 100vh;
}
</style>
