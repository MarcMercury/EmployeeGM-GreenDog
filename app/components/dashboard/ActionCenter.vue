<template>
  <v-card rounded="lg" elevation="2">
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-center ga-2">
        <v-icon color="primary">mdi-inbox</v-icon>
        <span>Action Center</span>
        <v-badge
          v-if="totalPending > 0"
          :content="totalPending"
          color="error"
          inline
        />
      </div>
      <v-btn
        icon="mdi-refresh"
        variant="text"
        size="small"
        @click="refresh"
        :loading="loading"
      />
    </v-card-title>

    <v-divider />

    <!-- Filter Tabs -->
    <v-tabs v-model="activeTab" density="compact" color="primary">
      <v-tab value="all">
        All
        <v-badge
          v-if="pendingActions.length > 0"
          :content="pendingActions.length"
          color="primary"
          inline
          class="ml-1"
        />
      </v-tab>
      <v-tab value="shifts">
        <v-icon start size="16">mdi-swap-horizontal</v-icon>
        Shifts
      </v-tab>
      <v-tab value="reviews">
        <v-icon start size="16">mdi-clipboard-check</v-icon>
        Reviews
      </v-tab>
      <v-tab value="training">
        <v-icon start size="16">mdi-school</v-icon>
        Training
      </v-tab>
    </v-tabs>

    <v-divider />

    <!-- Loading State -->
    <div v-if="loading" class="d-flex justify-center py-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <!-- Empty State -->
    <v-card-text v-else-if="filteredItems.length === 0" class="text-center py-8">
      <v-icon size="48" color="grey-lighten-1">mdi-check-circle-outline</v-icon>
      <p class="text-body-2 text-grey mt-2">All caught up! No pending actions.</p>
    </v-card-text>

    <!-- Action Items List -->
    <v-list v-else lines="three" class="py-0">
      <template v-for="(item, index) in filteredItems" :key="item.id">
        <v-list-item
          :class="getPriorityClass(item.priority)"
          class="action-item"
        >
          <template #prepend>
            <v-avatar :color="getTypeColor(item.type)" size="40">
              <v-icon color="white" size="20">{{ getTypeIcon(item.type) }}</v-icon>
            </v-avatar>
          </template>

          <v-list-item-title class="font-weight-medium">
            {{ item.title }}
          </v-list-item-title>

          <v-list-item-subtitle>
            <div class="d-flex align-center ga-2 mb-1">
              <span v-if="item.from_employee" class="text-caption">
                From: {{ item.from_employee.first_name }} {{ item.from_employee.last_name }}
              </span>
              <v-chip
                :color="getPriorityColor(item.priority)"
                size="x-small"
                variant="tonal"
              >
                {{ item.priority }}
              </v-chip>
            </div>
            {{ item.description }}
          </v-list-item-subtitle>

          <template #append>
            <div class="d-flex flex-column align-end ga-1">
              <span class="text-caption text-grey">
                {{ formatTime(item.created_at) }}
              </span>
              
              <div class="d-flex ga-1">
                <!-- Primary Action -->
                <v-btn
                  :color="getActionColor(item.type)"
                  size="small"
                  variant="tonal"
                  @click="handleAction(item, 'primary')"
                  :loading="processingId === item.id"
                >
                  {{ item.action_label || 'View' }}
                </v-btn>
                
                <!-- Secondary Action (Deny) -->
                <v-btn
                  v-if="item.secondary_action_label"
                  color="grey"
                  size="small"
                  variant="text"
                  @click="handleAction(item, 'secondary')"
                >
                  {{ item.secondary_action_label }}
                </v-btn>
              </div>
            </div>
          </template>
        </v-list-item>

        <v-divider v-if="index < filteredItems.length - 1" />
      </template>
    </v-list>

    <!-- View All Link -->
    <v-card-actions v-if="filteredItems.length > 0">
      <v-spacer />
      <v-btn variant="text" color="primary" size="small" @click="viewAll">
        View All Actions
        <v-icon end size="14">mdi-arrow-right</v-icon>
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useIntegrationsStore, type ActionItem } from '~/stores/integrations'
import { useRouter } from 'vue-router'

const integrationsStore = useIntegrationsStore()
const router = useRouter()

// State
const activeTab = ref('all')
const processingId = ref<string | null>(null)

// Computed
const loading = computed(() => integrationsStore.loading)
const pendingActions = computed(() => integrationsStore.pendingActions)

const totalPending = computed(() => pendingActions.value.length)

const filteredItems = computed(() => {
  const items = pendingActions.value
  
  switch (activeTab.value) {
    case 'shifts':
      return items.filter(i => i.type === 'shift_swap' || i.type === 'time_off' || i.type === 'timesheet')
    case 'reviews':
      return items.filter(i => i.type === 'review' || i.type === 'promotion')
    case 'training':
      return items.filter(i => i.type === 'training' || i.type === 'mentorship')
    default:
      return items.slice(0, 10) // Show first 10 in "all" tab
  }
})

// Methods
function getTypeIcon(type: ActionItem['type']): string {
  const icons: Record<string, string> = {
    shift_swap: 'mdi-swap-horizontal',
    time_off: 'mdi-calendar-remove',
    review: 'mdi-clipboard-check',
    training: 'mdi-school',
    mentorship: 'mdi-account-supervisor',
    timesheet: 'mdi-clock-check',
    promotion: 'mdi-trophy'
  }
  return icons[type] || 'mdi-bell'
}

function getTypeColor(type: ActionItem['type']): string {
  const colors: Record<string, string> = {
    shift_swap: 'info',
    time_off: 'warning',
    review: 'purple',
    training: 'success',
    mentorship: 'teal',
    timesheet: 'blue-grey',
    promotion: 'amber'
  }
  return colors[type] || 'grey'
}

function getPriorityColor(priority: ActionItem['priority']): string {
  const colors: Record<string, string> = {
    urgent: 'error',
    high: 'warning',
    medium: 'info',
    low: 'grey'
  }
  return colors[priority] || 'grey'
}

function getPriorityClass(priority: ActionItem['priority']): string {
  if (priority === 'urgent') return 'urgent-item'
  if (priority === 'high') return 'high-priority-item'
  return ''
}

function getActionColor(type: ActionItem['type']): string {
  if (type === 'review') return 'primary'
  if (type === 'training') return 'success'
  return 'primary'
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

async function handleAction(item: ActionItem, actionType: 'primary' | 'secondary') {
  processingId.value = item.id
  
  try {
    if (actionType === 'primary' && item.action_url) {
      // Navigate to the action URL
      await router.push(item.action_url)
    } else if (actionType === 'secondary') {
      // Handle deny/dismiss action
      await integrationsStore.dismissActionItem(item.id)
    }
  } finally {
    processingId.value = null
  }
}

function viewAll() {
  // Could navigate to a dedicated action center page
  router.push('/ops')
}

async function refresh() {
  await integrationsStore.fetchActionItems()
}

// Lifecycle
onMounted(() => {
  refresh()
})
</script>

<style scoped>
.action-item {
  transition: background-color 0.2s;
}

.action-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.urgent-item {
  border-left: 3px solid rgb(var(--v-theme-error));
  background-color: rgba(var(--v-theme-error), 0.05);
}

.high-priority-item {
  border-left: 3px solid rgb(var(--v-theme-warning));
}
</style>
