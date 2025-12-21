<template>
  <div class="mobile-nav-container">
    <!-- Mobile Header Bar (shown on mobile only) -->
    <header class="mobile-header d-flex d-lg-none align-center px-4 py-2">
      <button @click="$emit('toggle-sidebar')" class="mobile-menu-btn mr-3">
        <v-icon>mdi-menu</v-icon>
      </button>
      <span class="text-h6 font-weight-bold text-primary">🐾 TeamOS</span>
      <v-spacer />
      <NuxtLink to="/activity" class="mobile-notification-btn position-relative">
        <v-icon size="24">mdi-bell</v-icon>
        <span 
          v-if="notificationCount > 0" 
          class="notification-badge"
        >
          {{ notificationCount > 9 ? '9+' : notificationCount }}
        </span>
      </NuxtLink>
    </header>

    <!-- Bottom Navigation Bar (shown on mobile only) -->
    <nav class="bottom-nav d-flex d-lg-none">
      <NuxtLink 
        v-for="item in navItems" 
        :key="item.path"
        :to="item.path" 
        class="bottom-nav-item"
        :class="{ 'active': isActive(item.path) }"
      >
        <div class="nav-icon">{{ item.icon }}</div>
        <span class="nav-label">{{ item.label }}</span>
      </NuxtLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
interface Props {
  notificationCount?: number
}

withDefaults(defineProps<Props>(), {
  notificationCount: 0
})

defineEmits(['toggle-sidebar'])

const route = useRoute()

const navItems = [
  { path: '/', icon: '🏠', label: 'Home' },
  { path: '/my-schedule', icon: '📅', label: 'Schedule' },
  { path: '/profile', icon: '👤', label: 'Profile' },
  { path: '/roster', icon: '👥', label: 'Team' },
  { path: '/activity', icon: '🔔', label: 'Activity' }
]

const isActive = (path: string) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}
</script>

<style scoped>
/* Mobile Header */
.mobile-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: linear-gradient(to right, #1e293b, #0f172a);
  color: white;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.mobile-menu-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  padding: 8px;
  color: white;
  cursor: pointer;
  transition: background 0.2s;
}

.mobile-menu-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.mobile-notification-btn {
  padding: 8px;
  color: white;
  text-decoration: none;
}

.notification-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 16px;
  height: 16px;
  background: #ef4444;
  color: white;
  font-size: 10px;
  font-weight: bold;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

/* Bottom Navigation */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: white;
  border-top: 1px solid #e5e7eb;
  z-index: 100;
  padding: 4px 8px;
  padding-bottom: max(4px, env(safe-area-inset-bottom));
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.05);
}

.bottom-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: #6b7280;
  padding: 4px;
  border-radius: 12px;
  transition: all 0.2s;
  -webkit-tap-highlight-color: transparent;
}

.bottom-nav-item:active {
  transform: scale(0.95);
}

.bottom-nav-item.active {
  color: #16a34a;
}

.bottom-nav-item.active .nav-icon {
  background: rgba(22, 163, 74, 0.1);
  transform: scale(1.1);
}

.nav-icon {
  font-size: 20px;
  width: 40px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  transition: all 0.2s;
}

.nav-label {
  font-size: 10px;
  font-weight: 600;
  margin-top: 2px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* Large screens - hide mobile nav */
@media (min-width: 1024px) {
  .mobile-header,
  .bottom-nav {
    display: none !important;
  }
}
</style>
