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

    <!-- Notifications (DB-backed unread notifications) -->
    <v-menu v-if="showNotifications" :close-on-content-click="false" max-width="380">
      <template #activator="{ props }">
        <v-btn icon v-bind="props" class="mr-2" aria-label="Notifications" @click="loadDbNotifications">
          <v-badge 
            :content="dbUnreadCount" 
            :model-value="dbUnreadCount > 0"
            color="error"
          >
            <v-icon>mdi-bell</v-icon>
          </v-badge>
        </v-btn>
      </template>
      <v-card min-width="340">
        <v-card-title class="d-flex align-center text-subtitle-1">
          Notifications
          <v-spacer />
          <v-btn
            v-if="dbUnreadCount > 0"
            variant="text"
            size="x-small"
            color="primary"
            @click="markAllDbRead"
          >
            Mark all read
          </v-btn>
        </v-card-title>
        <v-divider />
        <v-list v-if="dbNotifications.length > 0" density="compact" class="py-0" style="max-height: 360px; overflow-y: auto;">
          <v-list-item 
            v-for="n in dbNotifications" 
            :key="n.id"
            :to="n.data?.url || n.data?.action_url || '/activity'"
            :class="{ 'bg-blue-lighten-5': !n.is_read }"
            @click="markDbRead(n)"
          >
            <template #prepend>
              <v-icon size="20" :color="n.is_read ? 'grey' : 'primary'">
                {{ getDbNotificationIcon(n.category || n.type) }}
              </v-icon>
            </template>
            <v-list-item-title class="text-body-2 font-weight-medium">{{ n.title }}</v-list-item-title>
            <v-list-item-subtitle class="text-caption">{{ formatTimeAgo(n.created_at) }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
        <v-card-text v-else class="text-center text-grey py-6">
          No new notifications
        </v-card-text>
        <v-divider />
        <v-card-actions class="justify-center">
          <v-btn variant="text" size="small" color="primary" to="/activity">View All Activity</v-btn>
        </v-card-actions>
      </v-card>
    </v-menu>

    <!-- Theme Toggle -->
    <v-btn icon class="mr-2" aria-label="Toggle theme" @click="toggleTheme">
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
          <v-list-item to="/profile" prepend-icon="mdi-account">
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
import type { IntegrationNotification } from '~/types/integrations.types'

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
const integrationsStore = useIntegrationsStore()
const router = useRouter()
const supabase = useSupabaseClient()

const searchQuery = ref('')

const profile = computed(() => authStore.profile)
const fullName = computed(() => authStore.fullName)
const initials = computed(() => authStore.initials)
const isAdmin = computed(() => authStore.isAdmin)

const isDark = computed(() => uiStore.isDarkMode)

// ── DB-backed notifications ──
const dbNotifications = ref<(IntegrationNotification & { category?: string })[]>([])
const dbUnreadCount = computed(() => dbNotifications.value.filter(n => !n.is_read).length)

async function loadDbNotifications() {
  if (!authStore.profile?.id) return
  try {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('profile_id', authStore.profile.id)
      .is('closed_at', null)
      .order('created_at', { ascending: false })
      .limit(15)
    dbNotifications.value = (data || []) as any[]
  } catch { /* ignore */ }
}

async function markDbRead(n: IntegrationNotification) {
  if (n.is_read) return
  try {
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', n.id)
    const item = dbNotifications.value.find(x => x.id === n.id)
    if (item) { item.is_read = true; item.read_at = new Date().toISOString() }
  } catch { /* ignore */ }
}

async function markAllDbRead() {
  if (!authStore.profile?.id) return
  const unreadIds = dbNotifications.value.filter(n => !n.is_read).map(n => n.id)
  if (!unreadIds.length) return
  try {
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in('id', unreadIds)
    dbNotifications.value.forEach(n => { n.is_read = true; n.read_at = new Date().toISOString() })
  } catch { /* ignore */ }
}

function getDbNotificationIcon(type: string | null | undefined): string {
  const iconMap: Record<string, string> = {
    schedule: 'mdi-calendar',
    schedule_assigned: 'mdi-calendar-plus',
    schedule_published: 'mdi-calendar-check',
    schedule_removed: 'mdi-calendar-remove',
    skills: 'mdi-star',
    skill_added: 'mdi-star-plus',
    skill_improved: 'mdi-trending-up',
    profile: 'mdi-account',
    profile_updated: 'mdi-account-edit',
    role_changed: 'mdi-shield-account',
    training: 'mdi-school',
    training_assigned: 'mdi-book-open',
    hr: 'mdi-briefcase',
    admin_alert: 'mdi-alert',
    team_change_alert: 'mdi-account-group',
    pto: 'mdi-palm-tree',
    pto_approved: 'mdi-check-circle',
    pto_denied: 'mdi-close-circle',
    pto_submitted: 'mdi-clock-outline',
    pto_request_admin: 'mdi-clipboard-text',
    pto_request_manager: 'mdi-clipboard-account',
    marketing: 'mdi-bullhorn',
    system: 'mdi-cog',
    coach_nudge: 'mdi-lightbulb',
    review_reminder: 'mdi-clipboard-check',
    kudos: 'mdi-thumb-up',
    promotion: 'mdi-trophy',
    compliance_alert: 'mdi-shield-alert',
    attendance_alert: 'mdi-clock-alert',
    payroll_alert: 'mdi-cash-check',
    engagement_alert: 'mdi-chart-line',
  }
  return iconMap[type || ''] || 'mdi-bell'
}

function formatTimeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function toggleTheme() {
  uiStore.toggleTheme()
}

async function handleSignOut() {
  await authStore.signOut()
  router.push('/auth/login')
}

// Load notifications on mount
onMounted(() => {
  loadDbNotifications()
})
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
