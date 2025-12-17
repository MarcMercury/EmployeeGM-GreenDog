<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth']
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
  }
])

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
        <h1 class="text-h4 font-weight-bold">Marketing Command Center</h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Manage partnerships, influencers, and inventory from one place
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
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
