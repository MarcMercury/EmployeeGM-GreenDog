<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'marketing-admin']
})

const supabase = useSupabaseClient()

// Reactive refresh trigger
const refreshKey = ref(0)

// Fetch summary stats with watch for real-time updates
const { data: partnerStats, refresh: refreshPartners } = await useAsyncData('partner-stats', async () => {
  const { data: partners } = await supabase
    .from('marketing_partners')
    .select('id, status, partner_type')
  
  const total = partners?.length || 0
  const active = partners?.filter(p => p.status === 'active').length || 0
  const chambers = partners?.filter(p => p.partner_type === 'chamber').length || 0
  const rescues = partners?.filter(p => p.partner_type === 'rescue').length || 0
  
  return { total, active, chambers, rescues }
}, { watch: [refreshKey] })

const { data: influencerStats, refresh: refreshInfluencers } = await useAsyncData('influencer-stats', async () => {
  const { data: influencers } = await supabase
    .from('marketing_influencers')
    .select('id, status, follower_count')
  
  const total = influencers?.length || 0
  const active = influencers?.filter(i => i.status === 'active').length || 0
  const totalReach = influencers?.reduce((sum, i) => sum + (i.follower_count || 0), 0) || 0
  
  return { total, active, totalReach }
}, { watch: [refreshKey] })

const { data: inventoryStats, refresh: refreshInventory } = await useAsyncData('inventory-stats', async () => {
  const { data: inventory } = await supabase
    .from('marketing_inventory')
    .select('id, is_low_stock, item_name')
  
  const total = inventory?.length || 0
  const lowStock = inventory?.filter(i => i.is_low_stock).length || 0
  
  return { total, lowStock }
}, { watch: [refreshKey] })

const { data: referralStats, refresh: refreshReferrals } = await useAsyncData('referral-stats', async () => {
  const { data: referrals } = await supabase
    .from('referral_partners')
    .select('id, status, tier, clinic_type')
  
  const total = referrals?.length || 0
  const active = referrals?.filter(r => r.status === 'active').length || 0
  const platinum = referrals?.filter(r => r.tier === 'platinum').length || 0
  const gold = referrals?.filter(r => r.tier === 'gold').length || 0
  
  return { total, active, platinum, gold }
}, { watch: [refreshKey] })

// Fetch current month event stats
const { data: eventStats, refresh: refreshEvents } = await useAsyncData('event-stats', async () => {
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  
  const { data: events } = await supabase
    .from('marketing_events')
    .select('id, event_date, visitors_count, revenue_generated, leads_collected')
    .gte('event_date', firstOfMonth)
    .lte('event_date', lastOfMonth)
  
  const { data: leads } = await supabase
    .from('marketing_leads')
    .select('id, event_id, created_at')
    .gte('created_at', firstOfMonth + 'T00:00:00')
    .lte('created_at', lastOfMonth + 'T23:59:59')
  
  const totalEvents = events?.length || 0
  const totalVisitors = events?.reduce((sum, e) => sum + (e.visitors_count || 0), 0) || 0
  const totalRevenue = events?.reduce((sum, e) => sum + (e.revenue_generated || 0), 0) || 0
  const totalLeads = leads?.length || 0
  
  return { totalEvents, totalVisitors, totalRevenue, totalLeads }
}, { watch: [refreshKey] })

// Refresh all data
const isRefreshing = ref(false)
async function refreshAll() {
  isRefreshing.value = true
  refreshKey.value++
  await Promise.all([
    refreshPartners(),
    refreshInfluencers(),
    refreshInventory(),
    refreshReferrals(),
    refreshEvents()
  ])
  isRefreshing.value = false
}

// Auto-refresh every 60 seconds when page is visible
let refreshInterval: NodeJS.Timeout | null = null
onMounted(() => {
  refreshInterval = setInterval(() => {
    if (document.visibilityState === 'visible') {
      refreshAll()
    }
  }, 60000)
})
onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval)
})

// Current month name for Events tile
const currentMonthName = computed(() => {
  return new Date().toLocaleDateString('en-US', { month: 'short' })
})

// View mode toggle
const viewMode = ref<'grid' | 'list'>('grid')

// Hub data for list view
const hubItems = computed(() => [
  {
    name: 'Partnerships',
    icon: 'mdi-handshake',
    color: 'primary',
    to: '/marketing/partners',
    stats: [
      { label: 'Total', value: partnerStats.value?.total || 0 },
      { label: 'Active', value: partnerStats.value?.active || 0, color: 'success' }
    ]
  },
  {
    name: 'Influencers',
    icon: 'mdi-star-circle',
    color: 'secondary',
    to: '/marketing/influencers',
    stats: [
      { label: 'Total', value: influencerStats.value?.total || 0 },
      { label: 'Reach', value: formatNumber(influencerStats.value?.totalReach || 0), color: 'info' }
    ]
  },
  {
    name: 'Inventory',
    icon: 'mdi-package-variant-closed',
    color: 'warning',
    to: '/marketing/inventory',
    stats: [
      { label: 'Items', value: inventoryStats.value?.total || 0 },
      { label: 'Low Stock', value: inventoryStats.value?.lowStock || 0, color: (inventoryStats.value?.lowStock || 0) > 0 ? 'error' : 'success' }
    ]
  },
  {
    name: 'Referrals',
    icon: 'mdi-account-group',
    color: 'success',
    to: '/marketing/partnerships',
    stats: [
      { label: 'Total', value: referralStats.value?.total || 0 },
      { label: 'Plat/Gold', value: `${referralStats.value?.platinum || 0}/${referralStats.value?.gold || 0}`, color: 'amber' }
    ]
  },
  {
    name: `Events (${currentMonthName.value})`,
    icon: 'mdi-calendar-star',
    color: 'info',
    to: '/growth/events',
    stats: [
      { label: 'Events', value: eventStats.value?.totalEvents || 0 },
      { label: 'Visitors', value: eventStats.value?.totalVisitors || 0, color: 'success' },
      { label: 'Leads', value: eventStats.value?.totalLeads || 0, color: 'secondary' },
      { label: 'Revenue', value: `$${formatNumber(eventStats.value?.totalRevenue || 0)}`, color: 'warning' }
    ]
  }
])

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

// Quick action items - condensed
const quickActions = [
  { label: 'Add Partner', icon: 'mdi-plus', color: 'primary', to: '/marketing/partners?action=add' },
  { label: 'Add Influencer', icon: 'mdi-account-plus', color: 'secondary', to: '/marketing/influencers?action=add' },
  { label: 'Add Inventory', icon: 'mdi-package-variant-plus', color: 'warning', to: '/marketing/inventory?action=add' },
  { label: 'Add Referral', icon: 'mdi-account-plus', color: 'success', to: '/marketing/partnerships?action=add' },
  { label: 'Low Stock', icon: 'mdi-alert-circle', color: 'error', to: '/marketing/inventory?filter=low_stock' },
  { label: 'Create Event', icon: 'mdi-calendar-plus', color: 'info', to: '/growth/events?action=add' }
]
</script>

<template>
  <v-container fluid class="pa-4">
    <!-- Compact Header -->
    <div class="d-flex align-center mb-4">
      <div>
        <h1 class="text-h5 font-weight-bold">Marketing Dash</h1>
        <p class="text-caption text-medium-emphasis mb-0">
          Partnerships, referrals, influencers & inventory
        </p>
      </div>
      <v-spacer />
      <v-btn
        icon
        variant="text"
        size="small"
        :loading="isRefreshing"
        @click="refreshAll"
        class="mr-2"
      >
        <v-icon>mdi-refresh</v-icon>
        <v-tooltip activator="parent" location="bottom">Refresh Data</v-tooltip>
      </v-btn>
      <v-btn-toggle v-model="viewMode" mandatory density="compact" variant="outlined" class="mr-3">
        <v-btn value="grid" size="small">
          <v-icon>mdi-view-grid</v-icon>
        </v-btn>
        <v-btn value="list" size="small">
          <v-icon>mdi-view-list</v-icon>
        </v-btn>
      </v-btn-toggle>
      <v-btn size="small" variant="outlined" prepend-icon="mdi-calendar" to="/marketing/calendar" class="mr-2">
        Calendar
      </v-btn>
      <v-btn size="small" variant="outlined" prepend-icon="mdi-folder" to="/marketing/resources">
        Resources
      </v-btn>
    </div>

    <!-- Grid View: 6-column compact tiles -->
    <v-row v-if="viewMode === 'grid'" dense>
      <v-col v-for="hub in hubItems" :key="hub.name" cols="6" sm="4" md="3" lg="2">
        <v-card :to="hub.to" hover class="hub-card-compact h-100" density="compact">
          <v-card-text class="pa-3">
            <div class="d-flex align-center gap-2 mb-2">
              <v-avatar :color="hub.color" size="28">
                <v-icon :icon="hub.icon" size="16" color="white" />
              </v-avatar>
              <span class="text-body-2 font-weight-medium text-truncate">{{ hub.name }}</span>
            </div>
            <div class="d-flex flex-wrap gap-2">
              <div v-for="stat in hub.stats" :key="stat.label" class="text-center flex-grow-1">
                <div class="text-subtitle-2 font-weight-bold" :class="stat.color ? `text-${stat.color}` : ''">
                  {{ stat.value }}
                </div>
                <div class="text-caption text-medium-emphasis">{{ stat.label }}</div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- List View: Compact table -->
    <v-card v-else variant="outlined">
      <v-table density="compact" hover>
        <thead>
          <tr>
            <th style="width: 40px"></th>
            <th>Hub</th>
            <th class="text-center">Stats</th>
            <th style="width: 80px" class="text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="hub in hubItems" :key="hub.name" class="cursor-pointer" @click="$router.push(hub.to)">
            <td>
              <v-avatar :color="hub.color" size="28">
                <v-icon :icon="hub.icon" size="16" color="white" />
              </v-avatar>
            </td>
            <td>
              <span class="font-weight-medium">{{ hub.name }}</span>
            </td>
            <td>
              <div class="d-flex justify-center gap-4">
                <div v-for="stat in hub.stats" :key="stat.label" class="text-center">
                  <span class="font-weight-bold" :class="stat.color ? `text-${stat.color}` : ''">
                    {{ stat.value }}
                  </span>
                  <span class="text-caption text-medium-emphasis ml-1">{{ stat.label }}</span>
                </div>
              </div>
            </td>
            <td class="text-center">
              <v-btn :to="hub.to" variant="text" size="small" density="compact" color="primary">
                <v-icon>mdi-arrow-right</v-icon>
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Quick Actions - Compact inline buttons -->
    <v-card class="mt-3" density="compact">
      <v-card-text class="py-2">
        <div class="d-flex align-center flex-wrap gap-2">
          <span class="text-caption text-medium-emphasis mr-2">
            <v-icon size="16">mdi-lightning-bolt</v-icon> Quick:
          </span>
          <v-btn
            v-for="action in quickActions"
            :key="action.label"
            :color="action.color"
            :to="action.to"
            :prepend-icon="action.icon"
            variant="tonal"
            size="small"
            density="compact"
          >
            {{ action.label }}
          </v-btn>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<style scoped>
.hub-card-compact {
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
}

.hub-card-compact:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  border-color: rgb(var(--v-theme-primary));
}

.cursor-pointer {
  cursor: pointer;
}

.cursor-pointer:hover {
  background-color: rgba(var(--v-theme-primary), 0.04);
}
</style>
