<script setup lang="ts">
/**
 * System Health Dashboard
 * Real-time monitoring of API, DB, Auth, and environment health.
 * Shows service checks, latency, database metrics, table statistics,
 * compliance alerts, and quick actions.
 */

const supabase = useSupabaseClient()

const refreshInterval = ref<ReturnType<typeof setInterval> | null>(null)
const autoRefresh = ref(true)
const lastRefresh = ref(new Date())

// Fetch system health from API
const { data: health, pending: healthPending, refresh: refreshHealth } = await useFetch('/api/system-health', {
  lazy: true
})

// Database health via RPC
const dbHealth = ref<any>(null)
const dbHealthPending = ref(false)

async function fetchDbHealth() {
  dbHealthPending.value = true
  try {
    const { data, error } = await supabase.rpc('check_database_health')
    if (!error) dbHealth.value = data
  } catch (e) {
    console.error('Failed to fetch DB health:', e)
  }
  dbHealthPending.value = false
}

// Table statistics
const tableStats = ref<any[]>([])
const tableStatsPending = ref(false)

async function fetchTableStats() {
  tableStatsPending.value = true
  try {
    const { data, error } = await supabase.rpc('get_table_statistics')
    if (!error && data) tableStats.value = data
  } catch (e) {
    console.error('Table stats not available:', e)
  }
  tableStatsPending.value = false
}

// Refresh all health data
async function refreshAll() {
  lastRefresh.value = new Date()
  await Promise.all([refreshHealth(), fetchDbHealth(), fetchTableStats()])
}

// Helpers
const overallStatus = computed(() => health.value?.status ?? 'unknown')

const statusColor = computed(() => {
  const m: Record<string, string> = { healthy: 'bg-green-500', degraded: 'bg-yellow-500', error: 'bg-red-500', unknown: 'bg-gray-400' }
  return m[overallStatus.value] || m.unknown
})

const statusIcon = computed(() => {
  const m: Record<string, string> = { healthy: '✅', degraded: '⚠️', error: '❌', unknown: '❓' }
  return m[overallStatus.value] || m.unknown
})

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function timeSince(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  return `${Math.floor(seconds / 60)}m ago`
}

onMounted(() => {
  refreshAll()
  if (autoRefresh.value) {
    refreshInterval.value = setInterval(() => {
      if (autoRefresh.value) refreshAll()
    }, 30000)
  }
})

onUnmounted(() => {
  if (refreshInterval.value) clearInterval(refreshInterval.value)
})

defineExpose({ refreshAll })
</script>

<template>
  <div>
    <!-- Refresh Controls -->
    <div class="flex items-center justify-end gap-3 mb-4">
      <span class="text-xs text-slate-400">{{ timeSince(lastRefresh) }}</span>
      <button
        class="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
        :class="{ 'animate-spin': healthPending || dbHealthPending }"
        @click="refreshAll"
      >
        <v-icon size="20">mdi-refresh</v-icon>
      </button>
      <label class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
        <input v-model="autoRefresh" type="checkbox" class="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500" />
        <span>Auto</span>
      </label>
    </div>

    <!-- Overall Status Banner -->
    <div class="rounded-xl p-4 sm:p-6 mb-6 text-white shadow-lg transition-all" :class="statusColor">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-3xl sm:text-4xl">{{ statusIcon }}</span>
          <div>
            <h2 class="text-xl sm:text-2xl font-bold capitalize">{{ overallStatus }}</h2>
            <p class="text-white/80 text-sm">
              <span v-if="health?.uptime">Up {{ formatUptime(health.uptime) }}</span>
              <span v-else>Checking...</span>
            </p>
          </div>
        </div>
        <div class="text-right text-sm text-white/70">
          <div>{{ health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : '-' }}</div>
          <div class="text-xs">v{{ health?.version || '1.0.0' }}</div>
        </div>
      </div>
    </div>

    <!-- Service Checks Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <template v-if="health?.checks">
        <div
          v-for="check in health.checks"
          :key="check.name"
          class="bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
        >
          <div class="flex items-start justify-between">
            <div>
              <h3 class="font-semibold text-slate-800 capitalize flex items-center gap-2">
                <span v-if="check.status === 'ok'" class="text-green-500">●</span>
                <span v-else-if="check.status === 'degraded'" class="text-yellow-500">●</span>
                <span v-else class="text-red-500">●</span>
                {{ check.name }}
              </h3>
              <p v-if="check.message" class="text-xs text-slate-500 mt-1 line-clamp-2">{{ check.message }}</p>
            </div>
            <span
              v-if="check.latency !== undefined"
              class="text-xs px-2 py-1 rounded-full"
              :class="{
                'bg-green-100 text-green-700': check.latency < 200,
                'bg-yellow-100 text-yellow-700': check.latency >= 200 && check.latency < 500,
                'bg-red-100 text-red-700': check.latency >= 500
              }"
            >{{ check.latency }}ms</span>
          </div>
        </div>
      </template>
      <template v-else>
        <div v-for="i in 3" :key="i" class="bg-white rounded-xl p-4 shadow-sm border border-slate-200 animate-pulse">
          <div class="h-4 bg-slate-200 rounded w-24 mb-2" />
          <div class="h-3 bg-slate-100 rounded w-16" />
        </div>
      </template>
    </div>

    <!-- Database Metrics -->
    <div class="mb-6">
      <h2 class="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
        <span>📊</span> Database Metrics
      </h2>

      <div v-if="dbHealth?.metrics" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-200 text-center">
          <div class="text-2xl sm:text-3xl font-bold text-green-600">{{ formatNumber(dbHealth.metrics.active_employees || 0) }}</div>
          <div class="text-xs text-slate-500 mt-1">Active Employees</div>
        </div>
        <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-200 text-center">
          <div class="text-2xl sm:text-3xl font-bold text-amber-600">{{ formatNumber(dbHealth.metrics.pending_time_off || 0) }}</div>
          <div class="text-xs text-slate-500 mt-1">Pending Time Off</div>
        </div>
        <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-200 text-center">
          <div class="text-2xl sm:text-3xl font-bold text-blue-600">{{ formatNumber(dbHealth.metrics.unread_notifications || 0) }}</div>
          <div class="text-xs text-slate-500 mt-1">Unread Notifications</div>
        </div>
        <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-200 text-center">
          <div class="text-2xl sm:text-3xl font-bold text-purple-600">{{ formatNumber(dbHealth.metrics.recent_audit_entries || 0) }}</div>
          <div class="text-xs text-slate-500 mt-1">Recent Audits (1hr)</div>
        </div>
      </div>

      <div v-else-if="dbHealthPending" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div v-for="i in 4" :key="i" class="bg-white rounded-xl p-4 shadow-sm border border-slate-200 animate-pulse">
          <div class="h-8 bg-slate-200 rounded w-16 mx-auto mb-2" />
          <div class="h-3 bg-slate-100 rounded w-20 mx-auto" />
        </div>
      </div>

      <div v-else class="bg-slate-100 rounded-xl p-6 text-center text-slate-500">
        <p>Database metrics unavailable</p>
        <button class="mt-2 text-sm text-green-600 hover:underline" @click="fetchDbHealth">Retry</button>
      </div>
    </div>

    <!-- Data Integrity Issues -->
    <div v-if="dbHealth?.issues?.orphaned_profiles > 0" class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
      <div class="flex items-start gap-3">
        <span class="text-2xl">⚠️</span>
        <div>
          <h3 class="font-semibold text-amber-800">Data Integrity Issue</h3>
          <p class="text-sm text-amber-700 mt-1">
            Found {{ dbHealth.issues.orphaned_profiles }} orphaned profile(s) with no matching auth user.
          </p>
          <NuxtLink to="/admin/users" class="inline-block mt-2 text-sm text-amber-800 font-medium hover:underline">
            Review Users →
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Table Statistics -->
    <details class="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
      <summary class="p-4 cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between">
        <span class="font-semibold text-slate-800 flex items-center gap-2"><span>🗄️</span> Table Statistics</span>
        <v-icon size="20">mdi-chevron-down</v-icon>
      </summary>
      <div class="border-t border-slate-100 p-4">
        <div v-if="tableStats.length" class="overflow-x-auto -mx-4 px-4">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-slate-500 border-b">
                <th class="pb-2 font-medium">Table</th>
                <th class="pb-2 font-medium text-right">Rows</th>
                <th class="pb-2 font-medium text-right hidden sm:table-cell">Size</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="table in tableStats" :key="table.table_name" class="hover:bg-slate-50">
                <td class="py-2 font-mono text-xs">{{ table.table_name }}</td>
                <td class="py-2 text-right">{{ formatNumber(table.row_count || 0) }}</td>
                <td class="py-2 text-right hidden sm:table-cell text-slate-500">{{ table.total_size || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else-if="tableStatsPending" class="text-center py-8 text-slate-400">Loading table statistics...</div>
        <div v-else class="text-center py-8 text-slate-400"><p>Table statistics not available</p></div>
      </div>
    </details>

    <!-- Quick Navigation -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
      <h3 class="font-semibold text-slate-800 mb-3">Quick Actions</h3>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <NuxtLink to="/admin/users" class="flex flex-col items-center gap-2 p-4 rounded-lg bg-slate-50 hover:bg-green-50 hover:text-green-700 transition-colors text-center">
          <v-icon size="28" color="green">mdi-account-group</v-icon>
          <span class="text-sm font-medium">User Management</span>
        </NuxtLink>
        <NuxtLink to="/admin/email-templates" class="flex flex-col items-center gap-2 p-4 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-700 transition-colors text-center">
          <v-icon size="28" color="blue">mdi-email-edit</v-icon>
          <span class="text-sm font-medium">Email Templates</span>
        </NuxtLink>
        <NuxtLink to="/admin/slack" class="flex flex-col items-center gap-2 p-4 rounded-lg bg-slate-50 hover:bg-purple-50 hover:text-purple-700 transition-colors text-center">
          <v-icon size="28" color="purple">mdi-slack</v-icon>
          <span class="text-sm font-medium">Slack</span>
        </NuxtLink>
        <NuxtLink to="/admin/agents" class="flex flex-col items-center gap-2 p-4 rounded-lg bg-slate-50 hover:bg-amber-50 hover:text-amber-700 transition-colors text-center">
          <v-icon size="28" color="amber">mdi-robot</v-icon>
          <span class="text-sm font-medium">AI Agents</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Compliance Alerts -->
    <DashboardComplianceAlertsWidget :max-items="5" />
  </div>
</template>

<style scoped>
button, a, summary { min-height: 44px; }
button:active, a:active { transform: scale(0.98); }
.line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
details summary::-webkit-details-marker { display: none; }
details[open] summary .v-icon { transform: rotate(180deg); }
</style>
