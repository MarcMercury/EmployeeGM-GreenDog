<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'marketing-admin']
})

const supabase = useSupabaseClient()

// Fetch summary stats
const { data: partnerStats } = await useAsyncData('partner-stats', async () => {
  const { data: partners } = await supabase
    .from('marketing_partners')
    .select('id, status, partner_type')
  
  const total = partners?.length || 0
  const active = partners?.filter(p => p.status === 'active').length || 0
  const chambers = partners?.filter(p => p.partner_type === 'chamber').length || 0
  const rescues = partners?.filter(p => p.partner_type === 'rescue').length || 0
  
  return { total, active, chambers, rescues }
})

const { data: influencerStats } = await useAsyncData('influencer-stats', async () => {
  const { data: influencers } = await supabase
    .from('marketing_influencers')
    .select('id, status, follower_count')
  
  const total = influencers?.length || 0
  const active = influencers?.filter(i => i.status === 'active').length || 0
  const totalReach = influencers?.reduce((sum, i) => sum + (i.follower_count || 0), 0) || 0
  
  return { total, active, totalReach }
})

const { data: inventoryStats } = await useAsyncData('inventory-stats', async () => {
  const { data: inventory } = await supabase
    .from('marketing_inventory')
    .select('id, is_low_stock, item_name')
  
  const total = inventory?.length || 0
  const lowStock = inventory?.filter(i => i.is_low_stock).length || 0
  
  return { total, lowStock }
})

const { data: referralStats } = await useAsyncData('referral-stats', async () => {
  const { data: referrals } = await supabase
    .from('referral_partners')
    .select('id, status, tier, clinic_type')
  
  const total = referrals?.length || 0
  const active = referrals?.filter(r => r.status === 'active').length || 0
  const platinum = referrals?.filter(r => r.tier === 'platinum').length || 0
  const gold = referrals?.filter(r => r.tier === 'gold').length || 0
  
  return { total, active, platinum, gold }
})

// Fetch current month event stats
const { data: eventStats } = await useAsyncData('event-stats', async () => {
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
})

const hubs = computed(() => [
  {
    title: 'Partnership CRM Hub',
    subtitle: 'Chambers, Vendors, Rescues & More',
    icon: 'mdi-handshake',
    color: 'primary',
    to: '/marketing/partners',
    stats: [
      { label: 'Total Partners', value: partnerStats.value?.total || 0 },
      { label: 'Active', value: partnerStats.value?.active || 0 },
      { label: 'Chambers', value: partnerStats.value?.chambers || 0 },
      { label: 'Rescues', value: partnerStats.value?.rescues || 0 }
    ]
  },
  {
    title: 'Influencer Roster Hub',
    subtitle: 'Social Media Collaborations',
    icon: 'mdi-star-circle',
    color: 'secondary',
    to: '/marketing/influencers',
    stats: [
      { label: 'Total Influencers', value: influencerStats.value?.total || 0 },
      { label: 'Active', value: influencerStats.value?.active || 0 },
      { label: 'Total Reach', value: formatNumber(influencerStats.value?.totalReach || 0) }
    ]
  },
  {
    title: 'Marketing Inventory Hub',
    subtitle: 'Swag, Materials & Supplies',
    icon: 'mdi-package-variant-closed',
    color: 'warning',
    to: '/marketing/inventory',
    stats: [
      { label: 'Total Items', value: inventoryStats.value?.total || 0 },
      { label: 'Low Stock', value: inventoryStats.value?.lowStock || 0, alert: (inventoryStats.value?.lowStock || 0) > 0 }
    ]
  },
  {
    title: 'Referral Partners Hub',
    subtitle: 'Medical Partner CRM',
    icon: 'mdi-account-group',
    color: 'success',
    to: '/marketing/partnerships',
    stats: [
      { label: 'Total Partners', value: referralStats.value?.total || 0 },
      { label: 'Active', value: referralStats.value?.active || 0 },
      { label: 'Platinum', value: referralStats.value?.platinum || 0 },
      { label: 'Gold', value: referralStats.value?.gold || 0 }
    ]
  }
])

// Current month name for Events tile
const currentMonthName = computed(() => {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}
</script>

<template>
  <v-container fluid class="pa-6">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Marketing Dash</h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Manage partnerships, referrals, influencers, and inventory from one place
        </p>
      </div>
      <v-spacer />
      <v-btn
        color="primary"
        variant="outlined"
        prepend-icon="mdi-calendar"
        to="/marketing/calendar"
        class="mr-2"
      >
        Calendar
      </v-btn>
      <v-btn
        color="primary"
        variant="outlined"
        prepend-icon="mdi-folder"
        to="/marketing/resources"
      >
        Resources
      </v-btn>
    </div>

    <!-- Hub Cards -->
    <v-row>
      <v-col
        v-for="hub in hubs"
        :key="hub.title"
        cols="12"
        md="4"
      >
        <v-card
          :to="hub.to"
          hover
          class="h-100"
        >
          <v-card-item>
            <template #prepend>
              <v-avatar :color="hub.color" size="48">
                <v-icon :icon="hub.icon" size="24" color="white" />
              </v-avatar>
            </template>
            <v-card-title>{{ hub.title }}</v-card-title>
            <v-card-subtitle>{{ hub.subtitle }}</v-card-subtitle>
          </v-card-item>
          
          <v-divider />
          
          <v-card-text>
            <v-row dense>
              <v-col
                v-for="stat in hub.stats"
                :key="stat.label"
                :cols="12 / hub.stats.length"
                class="text-center"
              >
                <div
                  class="text-h5 font-weight-bold"
                  :class="{ 'text-error': stat.alert }"
                >
                  {{ stat.value }}
                  <v-icon
                    v-if="stat.alert"
                    icon="mdi-alert"
                    size="small"
                    color="error"
                  />
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ stat.label }}
                </div>
              </v-col>
            </v-row>
          </v-card-text>
          
          <v-card-actions>
            <v-spacer />
            <v-btn
              :color="hub.color"
              variant="text"
              append-icon="mdi-arrow-right"
            >
              View All
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Events Stats Tile - Current Month Summary -->
    <v-row class="mt-4">
      <v-col cols="12" md="4">
        <v-card to="/growth/events" hover class="h-100">
          <v-card-item>
            <template #prepend>
              <v-avatar color="info" size="48">
                <v-icon icon="mdi-calendar-star" size="24" color="white" />
              </v-avatar>
            </template>
            <v-card-title>Events Performance</v-card-title>
            <v-card-subtitle>{{ currentMonthName }}</v-card-subtitle>
          </v-card-item>
          
          <v-divider />
          
          <v-card-text>
            <v-row dense>
              <v-col cols="3" class="text-center">
                <div class="text-h5 font-weight-bold">{{ eventStats?.totalEvents || 0 }}</div>
                <div class="text-caption text-medium-emphasis">Events</div>
              </v-col>
              <v-col cols="3" class="text-center">
                <div class="text-h5 font-weight-bold">{{ eventStats?.totalVisitors || 0 }}</div>
                <div class="text-caption text-medium-emphasis">Visitors</div>
              </v-col>
              <v-col cols="3" class="text-center">
                <div class="text-h5 font-weight-bold">{{ eventStats?.totalLeads || 0 }}</div>
                <div class="text-caption text-medium-emphasis">Leads</div>
              </v-col>
              <v-col cols="3" class="text-center">
                <div class="text-h5 font-weight-bold">${{ formatNumber(eventStats?.totalRevenue || 0) }}</div>
                <div class="text-caption text-medium-emphasis">Revenue</div>
              </v-col>
            </v-row>
          </v-card-text>
          
          <v-card-actions>
            <v-spacer />
            <v-btn color="info" variant="text" append-icon="mdi-arrow-right">
              View All
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Quick Actions -->
    <v-row class="mt-4">
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon icon="mdi-lightning-bolt" class="mr-2" />
            Quick Actions
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" sm="6" md="3">
                <v-btn
                  block
                  color="primary"
                  variant="tonal"
                  prepend-icon="mdi-plus"
                  to="/marketing/partners?action=add"
                >
                  Add Partner
                </v-btn>
              </v-col>
              <v-col cols="12" sm="6" md="3">
                <v-btn
                  block
                  color="secondary"
                  variant="tonal"
                  prepend-icon="mdi-account-plus"
                  to="/marketing/influencers?action=add"
                >
                  Add Influencer
                </v-btn>
              </v-col>
              <v-col cols="12" sm="6" md="3">
                <v-btn
                  block
                  color="warning"
                  variant="tonal"
                  prepend-icon="mdi-package-variant-plus"
                  to="/marketing/inventory?action=add"
                >
                  Add Inventory Item
                </v-btn>
              </v-col>
              <v-col cols="12" sm="6" md="3">
                <v-btn
                  block
                  color="info"
                  variant="tonal"
                  prepend-icon="mdi-alert-circle"
                  to="/marketing/inventory?filter=low_stock"
                >
                  View Low Stock
                </v-btn>
              </v-col>
              <v-col cols="12" sm="6" md="3">
                <v-btn
                  block
                  color="success"
                  variant="tonal"
                  prepend-icon="mdi-account-plus"
                  to="/marketing/partnerships?action=add"
                >
                  Add Referral
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
