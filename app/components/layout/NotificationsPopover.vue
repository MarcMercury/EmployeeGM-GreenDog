<template>
  <v-menu
    v-model="isOpen"
    :close-on-content-click="false"
    location="bottom end"
    max-width="400"
  >
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        icon
        variant="text"
      >
        <v-badge
          :content="unreadCount"
          :model-value="unreadCount > 0"
          color="error"
          overlap
        >
          <v-icon>mdi-bell-outline</v-icon>
        </v-badge>
      </v-btn>
    </template>

    <v-card width="380">
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between py-3">
        <span class="text-subtitle-1">Notifications</span>
        <v-btn
          v-if="unreadCount > 0"
          variant="text"
          size="small"
          color="primary"
          @click="markAllRead"
        >
          Mark all read
        </v-btn>
      </v-card-title>

      <v-divider />

      <!-- Loading -->
      <div v-if="loading" class="d-flex justify-center py-6">
        <v-progress-circular indeterminate size="24" />
      </div>

      <!-- Empty State -->
      <v-card-text v-else-if="notifications.length === 0" class="text-center py-6">
        <v-icon size="40" color="grey-lighten-1">mdi-bell-check-outline</v-icon>
        <p class="text-body-2 text-grey mt-2">No notifications</p>
      </v-card-text>

      <!-- Notifications List -->
      <v-list v-else lines="three" density="compact" class="py-0" max-height="400" style="overflow-y: auto;">
        <template v-for="(notification, index) in notifications" :key="notification.id">
          <v-list-item
            :class="{ 'bg-grey-lighten-4': !notification.is_read }"
            class="notification-item py-2"
            @click="handleClick(notification)"
          >
            <template #prepend>
              <v-avatar :color="getTypeColor(notification.type)" size="36">
                <v-icon color="white" size="18">{{ getTypeIcon(notification.type) }}</v-icon>
              </v-avatar>
            </template>

            <v-list-item-title class="text-body-2 font-weight-medium">
              {{ notification.title }}
            </v-list-item-title>

            <v-list-item-subtitle class="text-caption">
              {{ notification.body }}
            </v-list-item-subtitle>

            <template #append>
              <div class="d-flex flex-column align-end">
                <span class="text-caption text-grey">
                  {{ formatTime(notification.created_at) }}
                </span>
                <v-icon
                  v-if="!notification.is_read"
                  size="8"
                  color="primary"
                  class="mt-1"
                >
                  mdi-circle
                </v-icon>
              </div>
            </template>
          </v-list-item>

          <v-divider v-if="index < notifications.length - 1" />
        </template>
      </v-list>

      <!-- Action Buttons -->
      <v-divider v-if="hasActionableNotifications" />
      <v-card-actions v-if="hasActionableNotifications">
        <v-spacer />
        <v-btn
          variant="text"
          color="primary"
          size="small"
          @click="viewAll"
        >
          View All
          <v-icon end size="14">mdi-arrow-right</v-icon>
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useIntegrationsStore, type Notification } from '~/stores/integrations'
import { useRouter } from 'vue-router'

const integrationsStore = useIntegrationsStore()
const router = useRouter()

// State
const isOpen = ref(false)

// Computed
const loading = computed(() => integrationsStore.loading)
const notifications = computed(() => integrationsStore.notifications.slice(0, 10))
const unreadCount = computed(() => integrationsStore.unreadCount)
const hasActionableNotifications = computed(() => 
  notifications.value.some(n => n.data?.action_url)
)

// Methods
function getTypeIcon(type: string | null): string {
  const icons: Record<string, string> = {
    promotion: 'mdi-trophy',
    training_assigned: 'mdi-school',
    kudos: 'mdi-thumb-up',
    shift_swap: 'mdi-swap-horizontal',
    time_off: 'mdi-calendar-remove',
    review: 'mdi-clipboard-check',
    mentorship: 'mdi-account-supervisor',
    certification: 'mdi-certificate'
  }
  return icons[type || ''] || 'mdi-bell'
}

function getTypeColor(type: string | null): string {
  const colors: Record<string, string> = {
    promotion: 'success',
    training_assigned: 'info',
    kudos: 'amber',
    shift_swap: 'primary',
    time_off: 'warning',
    review: 'purple',
    mentorship: 'teal',
    certification: 'green'
  }
  return colors[type || ''] || 'grey'
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

async function handleClick(notification: Notification) {
  // Mark as read
  if (!notification.is_read) {
    await integrationsStore.markAsRead(notification.id)
  }
  
  // Navigate if there's an action URL
  if (notification.data?.action_url) {
    isOpen.value = false
    router.push(notification.data.action_url)
  }
}

async function markAllRead() {
  await integrationsStore.markAllAsRead()
}

function viewAll() {
  isOpen.value = false
  router.push('/notifications')
}

// Watch for open state to fetch fresh notifications
watch(isOpen, (open) => {
  if (open) {
    integrationsStore.fetchNotifications()
  }
})

// Lifecycle
onMounted(() => {
  integrationsStore.fetchNotifications()
})
</script>

<style scoped>
.notification-item {
  cursor: pointer;
  transition: background-color 0.2s;
}

.notification-item:hover {
  background-color: rgba(0, 0, 0, 0.04) !important;
}
</style>
