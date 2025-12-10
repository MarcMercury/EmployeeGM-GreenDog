<template>
  <v-navigation-drawer
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :rail="rail"
    permanent
    color="grey-darken-4"
    class="app-sidebar"
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
        <v-list-item to="/schedule" title="Schedule" prepend-icon="mdi-calendar" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item to="/time-off" title="Time Off" prepend-icon="mdi-calendar-remove" density="compact" rounded="lg" class="nav-item ml-4" />
        <v-list-item to="/training" title="Training" prepend-icon="mdi-school" density="compact" rounded="lg" class="nav-item ml-4" />
      </v-list-group>
      <v-list-item v-else to="/schedule" prepend-icon="mdi-calendar-clock" title="Ops" rounded="lg" class="nav-item mb-1" />

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
interface Props {
  modelValue: boolean
  rail: boolean
}

defineProps<Props>()
defineEmits<{
  'update:modelValue': [value: boolean]
  'update:rail': [value: boolean]
}>()

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
