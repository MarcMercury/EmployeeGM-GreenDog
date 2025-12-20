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
      <v-btn size="small" variant="outlined" prepend-icon="mdi-calendar" to="/marketing/calendar" class="mr-2">
        Calendar
      </v-btn>
      <v-btn size="small" variant="outlined" prepend-icon="mdi-folder" to="/marketing/resources">
        Resources
      </v-btn>
    </div>

    <!-- All Hub Cards in a 5-column grid -->
    <v-row dense>
      <!-- Partnership Hub -->
      <v-col cols="12" sm="6" lg="2" xl="2">
        <v-card to="/marketing/partners" hover class="h-100" density="compact">
          <v-card-item class="pb-1">
            <template #prepend>
              <v-avatar color="primary" size="36">
                <v-icon icon="mdi-handshake" size="20" color="white" />
              </v-avatar>
            </template>
            <v-card-title class="text-subtitle-1">Partnerships</v-card-title>
          </v-card-item>
          <v-card-text class="pt-0">
            <div class="d-flex justify-space-between text-center">
              <div>
                <div class="text-h6 font-weight-bold">{{ partnerStats?.total || 0 }}</div>
                <div class="text-caption text-medium-emphasis">Total</div>
              </div>
              <div>
                <div class="text-h6 font-weight-bold text-success">{{ partnerStats?.active || 0 }}</div>
                <div class="text-caption text-medium-emphasis">Active</div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Influencer Hub -->
      <v-col cols="12" sm="6" lg="2" xl="2">
        <v-card to="/marketing/influencers" hover class="h-100" density="compact">
          <v-card-item class="pb-1">
            <template #prepend>
              <v-avatar color="secondary" size="36">
                <v-icon icon="mdi-star-circle" size="20" color="white" />
              </v-avatar>
            </template>
            <v-card-title class="text-subtitle-1">Influencers</v-card-title>
          </v-card-item>
          <v-card-text class="pt-0">
            <div class="d-flex justify-space-between text-center">
              <div>
                <div class="text-h6 font-weight-bold">{{ influencerStats?.total || 0 }}</div>
                <div class="text-caption text-medium-emphasis">Total</div>
              </div>
              <div>
                <div class="text-h6 font-weight-bold text-info">{{ formatNumber(influencerStats?.totalReach || 0) }}</div>
                <div class="text-caption text-medium-emphasis">Reach</div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Inventory Hub -->
      <v-col cols="12" sm="6" lg="2" xl="2">
        <v-card to="/marketing/inventory" hover class="h-100" density="compact">
          <v-card-item class="pb-1">
            <template #prepend>
              <v-avatar color="warning" size="36">
                <v-icon icon="mdi-package-variant-closed" size="20" color="white" />
              </v-avatar>
            </template>
            <v-card-title class="text-subtitle-1">Inventory</v-card-title>
          </v-card-item>
          <v-card-text class="pt-0">
            <div class="d-flex justify-space-between text-center">
              <div>
                <div class="text-h6 font-weight-bold">{{ inventoryStats?.total || 0 }}</div>
                <div class="text-caption text-medium-emphasis">Items</div>
              </div>
              <div>
                <div class="text-h6 font-weight-bold" :class="(inventoryStats?.lowStock || 0) > 0 ? 'text-error' : 'text-success'">
                  {{ inventoryStats?.lowStock || 0 }}
                  <v-icon v-if="(inventoryStats?.lowStock || 0) > 0" icon="mdi-alert" size="14" color="error" />
                </div>
                <div class="text-caption text-medium-emphasis">Low</div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Referral Partners Hub -->
      <v-col cols="12" sm="6" lg="2" xl="2">
        <v-card to="/marketing/partnerships" hover class="h-100" density="compact">
          <v-card-item class="pb-1">
            <template #prepend>
              <v-avatar color="success" size="36">
                <v-icon icon="mdi-account-group" size="20" color="white" />
              </v-avatar>
            </template>
            <v-card-title class="text-subtitle-1">Referrals</v-card-title>
          </v-card-item>
          <v-card-text class="pt-0">
            <div class="d-flex justify-space-between text-center">
              <div>
                <div class="text-h6 font-weight-bold">{{ referralStats?.total || 0 }}</div>
                <div class="text-caption text-medium-emphasis">Total</div>
              </div>
              <div>
                <div class="text-h6 font-weight-bold text-amber">{{ referralStats?.platinum || 0 }}/{{ referralStats?.gold || 0 }}</div>
                <div class="text-caption text-medium-emphasis">Plat/Gold</div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Events Performance Hub -->
      <v-col cols="12" sm="6" lg="4" xl="4">
        <v-card to="/growth/events" hover class="h-100" density="compact">
          <v-card-item class="pb-1">
            <template #prepend>
              <v-avatar color="info" size="36">
                <v-icon icon="mdi-calendar-star" size="20" color="white" />
              </v-avatar>
            </template>
            <v-card-title class="text-subtitle-1">Events ({{ currentMonthName }})</v-card-title>
          </v-card-item>
          <v-card-text class="pt-0">
            <div class="d-flex justify-space-between text-center">
              <div>
                <div class="text-h6 font-weight-bold">{{ eventStats?.totalEvents || 0 }}</div>
                <div class="text-caption text-medium-emphasis">Events</div>
              </div>
              <div>
                <div class="text-h6 font-weight-bold text-success">{{ eventStats?.totalVisitors || 0 }}</div>
                <div class="text-caption text-medium-emphasis">Visitors</div>
              </div>
              <div>
                <div class="text-h6 font-weight-bold text-secondary">{{ eventStats?.totalLeads || 0 }}</div>
                <div class="text-caption text-medium-emphasis">Leads</div>
              </div>
              <div>
                <div class="text-h6 font-weight-bold text-warning">${{ formatNumber(eventStats?.totalRevenue || 0) }}</div>
                <div class="text-caption text-medium-emphasis">Revenue</div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

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
