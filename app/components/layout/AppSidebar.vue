<template>
  <v-navigation-drawer
    v-model="drawerVisible"
    :rail="rail && !isMobile"
    :temporary="isMobile"
    :permanent="!isMobile"
    :width="280"
    :rail-width="80"
    color="grey-darken-4"
    class="app-sidebar"
    @update:model-value="handleDrawerUpdate"
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
    <v-list nav density="comfortable" class="px-2 mt-2">
      <!-- Dashboard -->
      <v-list-item
        to="/"
        prepend-icon="mdi-view-dashboard"
        title="Dashboard"
        subtitle="Home Base"
        rounded="lg"
        class="nav-item mb-1"
        :class="{ 'show-subtitle': !rail }"
      />

      <!-- Roster Group -->
      <v-list-group v-if="!rail" value="roster">
        <template #activator="{ props }">
          <v-list-item
            v-bind="props"
            prepend-icon="mdi-badge-account-horizontal"
            title="Roster"
            rounded="lg"
            class="nav-item"
          />
        </template>
        <v-list-item to="/employees" title="All Staff" prepend-icon="mdi-account-group" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item to="/org-chart" title="Org Chart" prepend-icon="mdi-sitemap" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item to="/profile" title="My Profile" prepend-icon="mdi-account-card" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="isAdmin" to="/employees?filter=admins" title="Admins" prepend-icon="mdi-shield-account" density="compact" rounded="lg" class="nav-item ml-4" />
      </v-list-group>
      <v-list-item v-else to="/employees" prepend-icon="mdi-badge-account-horizontal" title="Roster" rounded="lg" class="nav-item mb-1" />

      <!-- Skill Engine Group -->
      <v-list-group v-if="!rail" value="skills">
        <template #activator="{ props }">
          <v-list-item
            v-bind="props"
            prepend-icon="mdi-hexagon-multiple"
            title="Skill Engine"
            rounded="lg"
            class="nav-item"
          />
        </template>
        <v-list-item to="/my-stats" title="My Stats" prepend-icon="mdi-chart-arc" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item to="/mentorship" title="Mentorship Hub" prepend-icon="mdi-account-supervisor" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="isAdmin" to="/skills" title="Skill Library" prepend-icon="mdi-star-circle" density="compact" rounded="lg" class="nav-item ml-4" />
      </v-list-group>
      <v-list-item v-else to="/my-stats" prepend-icon="mdi-hexagon-multiple" title="Skills" rounded="lg" class="nav-item mb-1" />

      <!-- Operations Group -->
      <v-list-group v-if="!rail" value="operations">
        <template #activator="{ props }">
          <v-list-item
            v-bind="props"
            prepend-icon="mdi-calendar-clock"
            title="Operations"
            rounded="lg"
            class="nav-item"
          />
        </template>
        <v-list-item to="/my-ops" title="My Ops" prepend-icon="mdi-clock-check" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item v-if="isAdmin" to="/ops" title="Ops Center" prepend-icon="mdi-calendar-month" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item to="/schedule" title="Schedule" prepend-icon="mdi-calendar" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item to="/time-off" title="Time Off" prepend-icon="mdi-calendar-remove" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item to="/training" title="Training" prepend-icon="mdi-school" density="compact" rounded="lg" class="nav-item ml-4" />
      </v-list-group>
      <v-list-item v-else to="/my-ops" prepend-icon="mdi-calendar-clock" title="Ops" rounded="lg" class="nav-item mb-1" />

      <!-- Performance & Reviews Group -->
      <v-list-group v-if="!rail" value="performance">
        <template #activator="{ props }">
          <v-list-item
            v-bind="props"
            prepend-icon="mdi-chart-timeline-variant"
            title="Performance"
            rounded="lg"
            class="nav-item"
          />
        </template>
        <v-list-item to="/goals" title="My Goals" prepend-icon="mdi-flag" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item to="/reviews" title="Reviews" prepend-icon="mdi-clipboard-check" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item to="/feedback" title="Feedback" prepend-icon="mdi-message-text" density="compact" rounded="lg" class="nav-item ml-4" />
      </v-list-group>
      <v-list-item v-else to="/goals" prepend-icon="mdi-chart-timeline-variant" title="Performance" rounded="lg" class="nav-item mb-1" />

      <!-- Growth Group (Admin Only) -->
      <template v-if="isAdmin">
        <v-list-group v-if="!rail" value="growth">
          <template #activator="{ props }">
            <v-list-item
              v-bind="props"
              prepend-icon="mdi-rocket-launch"
              title="Growth"
              rounded="lg"
              class="nav-item"
            />
          </template>
          <v-list-item to="/marketing" title="Events" prepend-icon="mdi-calendar-star" density="compact" rounded="lg" class="nav-item ml-4" />
          <v-list-item to="/leads" title="Lead CRM" prepend-icon="mdi-account-star" density="compact" rounded="lg" class="nav-item ml-4" />
        </v-list-group>
        <v-list-item v-else to="/marketing" prepend-icon="mdi-rocket-launch" title="Growth" rounded="lg" class="nav-item mb-1" />
      </template>
    </v-list>

    <template #append>
      <v-divider class="border-opacity-10" />
      
      <!-- Admin Settings (Admin Only) -->
      <v-list v-if="isAdmin" nav density="compact" class="px-2">
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
import { computed, ref, watch, onMounted } from 'vue'

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

// Use prop for mobile detection (passed from parent for consistency)
const isMobile = computed(() => props.temporary)

// Internal drawer state - always true on desktop
const drawerVisible = ref(true)

// Sync internal state with prop for mobile
watch(() => props.modelValue, (newVal) => {
  if (isMobile.value) {
    drawerVisible.value = newVal
  }
}, { immediate: true })

// Ensure drawer is always visible on desktop
watch(isMobile, (mobile) => {
  if (!mobile) {
    drawerVisible.value = true
  }
}, { immediate: true })

// On mount, ensure desktop sidebar is visible
onMounted(() => {
  if (!isMobile.value) {
    drawerVisible.value = true
  }
})

function handleDrawerUpdate(val: boolean) {
  if (isMobile.value) {
    emit('update:modelValue', val)
  }
  // On desktop, always keep visible
  if (!isMobile.value && !val) {
    drawerVisible.value = true
  }
}

const authStore = useAuthStore()
const router = useRouter()

const profile = computed(() => authStore.profile)
const isAdmin = computed(() => authStore.isAdmin)
const fullName = computed(() => authStore.fullName)
const initials = computed(() => authStore.initials)

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

/* Force sidebar visible on desktop - override Vuetify hidden states */
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
  min-height: 72px;
  display: flex;
  align-items: center;
}

.nav-item {
  color: rgba(255, 255, 255, 0.7) !important;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.08) !important;
  color: rgba(255, 255, 255, 0.9) !important;
}

.nav-item.v-list-item--active {
  background: rgba(var(--v-theme-primary), 0.2) !important;
  color: rgb(var(--v-theme-primary)) !important;
}

.nav-item .v-list-item-subtitle {
  display: none;
}

.nav-item.show-subtitle .v-list-item-subtitle {
  display: block;
  font-size: 0.7rem;
  opacity: 0.6;
}
</style>
