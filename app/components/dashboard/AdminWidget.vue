<script setup lang="ts">
/**
 * AdminWidget Component
 * 
 * Dashboard widget for admins showing:
 * - System health (integrations status)
 * - Recent audit logs
 * - Analytics snapshot
 */

const client = useSupabaseClient()

const loading = ref(true)
const error = ref<string | null>(null)

// Widget data
const systemHealth = ref({
  status: 'healthy' as 'healthy' | 'warning' | 'error',
  integrations: [] as { name: string; status: string; lastSync: string }[],
  uptime: '99.9%'
})

const auditLogs = ref<any[]>([])

const analytics = ref({
  activeUsers: 0,
  actionsToday: 0,
  pendingTasks: 0,
  errorRate: 0
})

async function fetchData() {
  loading.value = true
  error.value = null
  
  try {
    // Fetch integration statuses - gracefully handle missing table
    try {
      const { data: integrations } = await client
        .from('integrations')
        .select('*')
        .limit(5)
      
      systemHealth.value.integrations = (integrations || []).map(i => ({
        name: i.name,
        status: i.status || 'unknown',
        lastSync: i.last_sync_at || 'Never'
      }))
      
      // Check if any integration has issues
      const hasError = systemHealth.value.integrations.some(i => i.status === 'error')
      const hasWarning = systemHealth.value.integrations.some(i => i.status === 'warning')
      systemHealth.value.status = hasError ? 'error' : hasWarning ? 'warning' : 'healthy'
    } catch {
      // integrations table may not exist yet
      systemHealth.value.integrations = []
      systemHealth.value.status = 'healthy'
    }
    
    // Fetch recent audit logs - gracefully handle missing table
    try {
      const { data: logs } = await client
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)
      
      auditLogs.value = (logs || []).map(log => ({
        id: log.id,
        action: log.action,
        entity: log.table_name || log.entity_type,
        timestamp: log.created_at,
        icon: getActionIcon(log.action),
        color: getActionColor(log.action)
      }))
    } catch {
      // audit_logs table may not exist yet
      auditLogs.value = []
    }
    
    // Fetch analytics - use employees table with employment_status
    try {
      const { count: activeUserCount } = await client
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('employment_status', 'active')
      
      analytics.value.activeUsers = activeUserCount || 0
    } catch {
      analytics.value.activeUsers = 0
    }
    
    // Actions today from audit_logs
    try {
      const today = new Date().toISOString().split('T')[0]
      const { count: actionsToday } = await client
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today)
      
      analytics.value.actionsToday = actionsToday || 0
    } catch {
      analytics.value.actionsToday = 0
    }
    
  } catch (err: any) {
    console.error('[AdminWidget] Error:', err)
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function getActionIcon(action: string): string {
  const icons: Record<string, string> = {
    create: 'mdi-plus-circle',
    update: 'mdi-pencil',
    delete: 'mdi-delete',
    login: 'mdi-login',
    logout: 'mdi-logout',
    access_request: 'mdi-lock-open',
    default: 'mdi-information'
  }
  return icons[action] || icons.default
}

function getActionColor(action: string): string {
  const colors: Record<string, string> = {
    create: 'success',
    update: 'info',
    delete: 'error',
    login: 'primary',
    logout: 'grey',
    access_request: 'warning',
    default: 'grey'
  }
  return colors[action] || colors.default
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return date.toLocaleDateString()
}

onMounted(fetchData)
</script>

<template>
  <v-card variant="outlined" rounded="lg" class="h-100">
    <v-card-title class="d-flex align-center">
      <v-icon color="error" class="mr-2">mdi-shield-crown</v-icon>
      System Overview
      <v-spacer />
      <v-chip
        :color="systemHealth.status === 'healthy' ? 'success' : systemHealth.status === 'warning' ? 'warning' : 'error'"
        size="small"
        variant="tonal"
      >
        <v-icon start size="small">
          {{ systemHealth.status === 'healthy' ? 'mdi-check-circle' : systemHealth.status === 'warning' ? 'mdi-alert' : 'mdi-alert-circle' }}
        </v-icon>
        {{ systemHealth.status === 'healthy' ? 'All Systems OK' : systemHealth.status === 'warning' ? 'Warning' : 'Issues Detected' }}
      </v-chip>
    </v-card-title>
    
    <v-card-text v-if="loading">
      <v-skeleton-loader type="article" />
    </v-card-text>
    
    <v-card-text v-else-if="error">
      <v-alert type="error" variant="tonal">{{ error }}</v-alert>
    </v-card-text>
    
    <v-card-text v-else>
      <!-- Analytics Row -->
      <v-row dense class="mb-4">
        <v-col cols="3">
          <div class="text-center">
            <div class="text-h5 font-weight-bold text-primary">{{ analytics.activeUsers }}</div>
            <div class="text-caption text-medium-emphasis">Active Users</div>
          </div>
        </v-col>
        <v-col cols="3">
          <div class="text-center">
            <div class="text-h5 font-weight-bold text-success">{{ analytics.actionsToday }}</div>
            <div class="text-caption text-medium-emphasis">Actions Today</div>
          </div>
        </v-col>
        <v-col cols="3">
          <div class="text-center">
            <div class="text-h5 font-weight-bold text-info">{{ systemHealth.uptime }}</div>
            <div class="text-caption text-medium-emphasis">Uptime</div>
          </div>
        </v-col>
        <v-col cols="3">
          <div class="text-center">
            <div class="text-h5 font-weight-bold text-grey">{{ systemHealth.integrations.length }}</div>
            <div class="text-caption text-medium-emphasis">Integrations</div>
          </div>
        </v-col>
      </v-row>
      
      <v-divider class="mb-4" />
      
      <!-- Integrations Status -->
      <div v-if="systemHealth.integrations.length > 0" class="mb-4">
        <span class="text-subtitle-2 font-weight-bold">Integrations</span>
        <v-list density="compact" class="pa-0 mt-2">
          <v-list-item
            v-for="integration in systemHealth.integrations"
            :key="integration.name"
            class="px-0"
          >
            <template #prepend>
              <v-icon
                :color="integration.status === 'active' ? 'success' : integration.status === 'error' ? 'error' : 'warning'"
                size="small"
              >
                {{ integration.status === 'active' ? 'mdi-check-circle' : 'mdi-alert-circle' }}
              </v-icon>
            </template>
            <v-list-item-title class="text-body-2">{{ integration.name }}</v-list-item-title>
            <v-list-item-subtitle class="text-caption">
              Last sync: {{ integration.lastSync ? formatTime(integration.lastSync) : 'Never' }}
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </div>
      
      <!-- Recent Activity -->
      <div>
        <span class="text-subtitle-2 font-weight-bold">Recent Activity</span>
        <v-list v-if="auditLogs.length > 0" density="compact" class="pa-0 mt-2">
          <v-list-item
            v-for="log in auditLogs"
            :key="log.id"
            class="px-0"
          >
            <template #prepend>
              <v-icon :color="log.color" size="small">{{ log.icon }}</v-icon>
            </template>
            <v-list-item-title class="text-body-2 text-capitalize">
              {{ log.action.replace('_', ' ') }}
            </v-list-item-title>
            <v-list-item-subtitle class="text-caption">
              {{ log.entity }} • {{ formatTime(log.timestamp) }}
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
        <div v-else class="text-center text-medium-emphasis text-caption py-2">
          No recent activity
        </div>
      </div>
    </v-card-text>
    
    <v-card-actions>
      <v-btn variant="text" size="small" to="/admin/slack" prepend-icon="mdi-connection">
        Integrations
      </v-btn>
      <v-spacer />
      <v-btn variant="text" size="small" to="/activity" prepend-icon="mdi-history">
        Audit Log
      </v-btn>
    </v-card-actions>
  </v-card>
</template>
