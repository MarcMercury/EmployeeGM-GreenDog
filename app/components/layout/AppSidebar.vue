<template>
  <v-navigation-drawer
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :rail="rail"
    :permanent="!temporary"
    :temporary="temporary"
    color="primary"
    class="app-sidebar"
  >
    <!-- Logo/Header -->
    <div class="sidebar-header pa-4">
      <div class="d-flex align-center gap-3">
        <v-avatar color="white" size="40">
          <v-icon color="primary" size="24">mdi-paw</v-icon>
        </v-avatar>
        <div v-if="!rail" class="text-white">
          <div class="text-subtitle-1 font-weight-bold">Employee GM</div>
          <div class="text-caption opacity-70">Green Dog Dental</div>
        </div>
      </div>
    </div>

    <v-divider class="opacity-30" />

    <!-- Navigation Items -->
    <v-list nav density="comfortable" class="px-2 mt-2">
      <v-list-item
        v-for="item in filteredNavItems"
        :key="item.to"
        :to="item.to"
        :prepend-icon="item.icon"
        :title="rail ? '' : item.title"
        rounded="lg"
        class="nav-item mb-1"
        color="white"
      >
        <v-tooltip v-if="rail" activator="parent" location="end">{{ item.title }}</v-tooltip>
      </v-list-item>
    </v-list>

    <template #append>
      <v-divider class="opacity-30" />
      
      <!-- User Section -->
      <div class="pa-4">
        <!-- Loading state -->
        <div v-if="isLoading" class="text-center py-2">
          <v-progress-circular indeterminate color="white" size="24" />
        </div>
        
        <!-- User profile -->
        <v-list-item
          v-else-if="profile"
          class="pa-0 nav-item"
          rounded="lg"
          :to="`/profile`"
        >
          <template #prepend>
            <v-avatar size="36" color="white">
              <v-img v-if="profile.avatar_url" :src="profile.avatar_url" />
              <span v-else class="text-primary font-weight-bold text-body-2">{{ initials }}</span>
            </v-avatar>
          </template>
          <v-list-item-title v-if="!rail" class="text-white text-body-2">
            {{ fullName }}
          </v-list-item-title>
          <v-list-item-subtitle v-if="!rail" class="text-white opacity-70 text-caption">
            {{ profile.role || 'Employee' }}
          </v-list-item-subtitle>
        </v-list-item>

        <!-- Sign Out Button -->
        <v-btn
          v-if="!rail"
          variant="outlined"
          color="white"
          block
          class="mt-3"
          :loading="isSigningOut"
          @click="handleSignOut"
        >
          <v-icon start>mdi-logout</v-icon>
          Sign Out
        </v-btn>
        
        <!-- Rail mode sign out -->
        <v-btn
          v-else
          icon="mdi-logout"
          variant="text"
          color="white"
          size="small"
          class="mt-2"
          @click="handleSignOut"
        >
          <v-icon>mdi-logout</v-icon>
          <v-tooltip activator="parent" location="end">Sign Out</v-tooltip>
        </v-btn>
      </div>

      <!-- Rail Toggle -->
      <div class="pa-2 text-center">
        <v-btn
          :icon="rail ? 'mdi-chevron-right' : 'mdi-chevron-left'"
          variant="text"
          color="white"
          size="small"
          @click="$emit('update:rail', !rail)"
        >
          <v-tooltip activator="parent" location="end">
            {{ rail ? 'Expand' : 'Collapse' }}
          </v-tooltip>
        </v-btn>
      </div>
    </template>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import type { NavItem } from '~/types'

interface Props {
  modelValue: boolean
  rail: boolean
  temporary?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  temporary: false
})

defineEmits<{
  'update:modelValue': [value: boolean]
  'update:rail': [value: boolean]
}>()

const supabase = useSupabaseClient()
const authStore = useAuthStore()
const router = useRouter()

const isSigningOut = ref(false)
const isLoading = computed(() => authStore.isLoading)
const profile = computed(() => authStore.profile)
const isAdmin = computed(() => authStore.isAdmin)

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

const navItems: NavItem[] = [
  { title: 'Home', icon: 'mdi-home', to: '/' },
  { title: 'Profile', icon: 'mdi-account-card', to: '/profile' },
  { title: 'Directory', icon: 'mdi-account-group', to: '/employees' },
  { title: 'Schedule', icon: 'mdi-calendar', to: '/schedule' },
  { title: 'Time Off', icon: 'mdi-calendar-remove', to: '/time-off' },
  { title: 'Skills', icon: 'mdi-star-circle', to: '/skills' },
  { title: 'Training', icon: 'mdi-school', to: '/training' },
  { title: 'Marketing', icon: 'mdi-bullhorn', to: '/marketing', requiresAdmin: true },
  { title: 'Leads', icon: 'mdi-account-star', to: '/leads', requiresAdmin: true },
  { title: 'Settings', icon: 'mdi-cog', to: '/settings', requiresAdmin: true }
]

const filteredNavItems = computed(() => {
  return navItems.filter(item => {
    if (item.requiresAdmin && !isAdmin.value) return false
    return true
  })
})

async function handleSignOut() {
  isSigningOut.value = true
  try {
    await supabase.auth.signOut()
    authStore.$reset()
    await router.push('/auth/login')
  } catch (error) {
    console.error('Sign out error:', error)
  } finally {
    isSigningOut.value = false
  }
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
  color: rgba(255, 255, 255, 0.85) !important;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1) !important;
}

.nav-item.v-list-item--active {
  background: rgba(255, 255, 255, 0.2) !important;
  color: white !important;
}
</style>
