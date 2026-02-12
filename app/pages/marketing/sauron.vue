<template>
  <div class="sauron-page">
    <!-- Page Header -->
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <div class="d-flex align-center gap-3">
          <h1 class="text-h4 font-weight-bold">Sauron</h1>
          <v-chip color="amber-darken-2" variant="flat" size="small" class="font-weight-bold">
            One Report to Rule Them All
          </v-chip>
        </div>
        <p class="text-subtitle-1 text-grey mt-1">
          Unified executive overview — every metric, every insight, one page
        </p>
        <div v-if="lastRefresh" class="text-caption text-grey mt-1">
          <v-icon size="14" class="mr-1">mdi-eye</v-icon>
          Last refreshed: {{ formatDateTime(lastRefresh) }}
        </div>
      </div>
      <div class="d-flex gap-2">
        <v-btn
          color="amber-darken-2"
          variant="outlined"
          prepend-icon="mdi-printer"
          @click="printReport"
        >
          Print
        </v-btn>
        <v-btn
          color="amber-darken-2"
          prepend-icon="mdi-refresh"
          :loading="loading"
          @click="refreshAll"
        >
          Refresh
        </v-btn>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !hasData" class="d-flex justify-center align-center" style="min-height: 400px">
      <div class="text-center">
        <v-progress-circular indeterminate color="amber-darken-2" size="64" width="6" class="mb-4" />
        <div class="text-h6 text-grey">The Eye is gathering all data...</div>
      </div>
    </div>

    <!-- Main Content -->
    <template v-else>
      <!-- =========================================
           SECTION 1: THE PULSE — Top-Level Health KPIs
           ========================================= -->
      <div class="mb-6">
        <div class="d-flex align-center gap-2 mb-3">
          <v-icon color="red-darken-2" size="20">mdi-heart-pulse</v-icon>
          <h2 class="text-h6 font-weight-bold">The Pulse</h2>
          <span class="text-caption text-grey ml-2">Business health at a glance</span>
        </div>
        <v-row dense>
          <v-col cols="6" sm="4" md="2" v-for="kpi in pulseKpis" :key="kpi.label">
            <v-card class="h-100 pulse-card" :class="kpi.alertClass" variant="outlined">
              <v-card-text class="pa-3 text-center">
                <v-icon :color="kpi.color" size="28" class="mb-1">{{ kpi.icon }}</v-icon>
                <div class="text-h5 font-weight-bold" :class="`text-${kpi.color}`">{{ kpi.value }}</div>
                <div class="text-caption text-medium-emphasis">{{ kpi.label }}</div>
                <v-chip v-if="kpi.trend" :color="kpi.trendColor" variant="text" size="x-small" class="mt-1">
                  <v-icon size="12" start>{{ kpi.trendIcon }}</v-icon>
                  {{ kpi.trend }}
                </v-chip>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <!-- =========================================
           SECTION 2: KEY OBSERVATIONS — AI-style insights
           ========================================= -->
      <v-card class="mb-6" variant="outlined">
        <v-card-title class="d-flex align-center gap-2 pb-0">
          <v-icon color="amber-darken-2" size="20">mdi-lightbulb-on</v-icon>
          Key Observations
          <v-chip size="x-small" color="amber-darken-2" variant="tonal" class="ml-1">
            {{ observations.length }}
          </v-chip>
        </v-card-title>
        <v-card-text>
          <div v-if="observations.length === 0" class="text-center text-grey py-4">
            No observations yet — refresh to analyze data
          </div>
          <v-list v-else density="compact" class="pa-0">
            <v-list-item
              v-for="(obs, i) in observations"
              :key="i"
              :prepend-icon="obs.icon"
              class="px-0"
            >
              <template #prepend>
                <v-avatar :color="obs.severity === 'critical' ? 'red' : obs.severity === 'warning' ? 'orange' : obs.severity === 'success' ? 'green' : 'blue'" size="32" variant="tonal">
                  <v-icon size="18">{{ obs.icon }}</v-icon>
                </v-avatar>
              </template>
              <v-list-item-title class="text-body-2 font-weight-medium text-wrap">
                {{ obs.title }}
              </v-list-item-title>
              <v-list-item-subtitle class="text-caption text-wrap">
                {{ obs.detail }}
              </v-list-item-subtitle>
              <template #append>
                <v-chip :color="obs.severity === 'critical' ? 'red' : obs.severity === 'warning' ? 'orange' : obs.severity === 'success' ? 'green' : 'info'" size="x-small" variant="tonal">
                  {{ obs.category }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>

      <!-- =========================================
           SECTION 3: DOMAIN DEEP-DIVES — Expandable panels
           ========================================= -->
      <v-expansion-panels variant="accordion" class="mb-6">
        <!-- Revenue & Invoices -->
        <v-expansion-panel>
          <v-expansion-panel-title>
            <div class="d-flex align-center gap-2">
              <v-avatar color="green" size="28" variant="tonal"><v-icon size="16">mdi-currency-usd</v-icon></v-avatar>
              <span class="font-weight-medium">Revenue & Invoices</span>
              <v-chip size="x-small" color="green" variant="tonal" class="ml-2">
                ${{ formatCompact(invoiceData.totalRevenue) }}
              </v-chip>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-row dense>
              <v-col cols="6" sm="3">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-green">${{ formatCurrency(invoiceData.totalRevenue) }}</div>
                  <div class="text-caption">Total Revenue</div>
                </div>
              </v-col>
              <v-col cols="6" sm="3">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-blue">{{ formatNumber(invoiceData.uniqueInvoices) }}</div>
                  <div class="text-caption">Invoices</div>
                </div>
              </v-col>
              <v-col cols="6" sm="3">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-purple">{{ formatNumber(invoiceData.uniqueClients) }}</div>
                  <div class="text-caption">Unique Clients</div>
                </div>
              </v-col>
              <v-col cols="6" sm="3">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-amber">${{ invoiceData.uniqueClients > 0 ? formatCurrency(invoiceData.totalRevenue / invoiceData.uniqueClients) : '0' }}</div>
                  <div class="text-caption">Rev / Client</div>
                </div>
              </v-col>
            </v-row>
            <v-divider class="my-3" />
            <div class="text-caption text-grey">
              Top departments: 
              <v-chip v-for="dept in invoiceData.topDepartments.slice(0, 5)" :key="dept.name" size="x-small" variant="tonal" class="mr-1 mb-1">
                {{ dept.name }}: ${{ formatCompact(dept.revenue) }}
              </v-chip>
            </div>
            <div class="text-right mt-2">
              <v-btn variant="text" size="small" color="green" to="/marketing/invoice-analysis" append-icon="mdi-arrow-right">
                Full Invoice Analysis
              </v-btn>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <!-- Client Health (EzyVet) -->
        <v-expansion-panel>
          <v-expansion-panel-title>
            <div class="d-flex align-center gap-2">
              <v-avatar color="violet" size="28" variant="tonal"><v-icon size="16">mdi-account-heart</v-icon></v-avatar>
              <span class="font-weight-medium">Client Health</span>
              <v-chip size="x-small" color="violet" variant="tonal" class="ml-2">
                {{ formatNumber(clientData.totalClients) }} clients
              </v-chip>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-row dense>
              <v-col cols="6" sm="3">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-green">{{ formatNumber(clientData.activeClients) }}</div>
                  <div class="text-caption">Active (12mo)</div>
                </div>
              </v-col>
              <v-col cols="6" sm="3">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-orange">{{ formatNumber(clientData.atRisk) }}</div>
                  <div class="text-caption">At Risk (6-12mo)</div>
                </div>
              </v-col>
              <v-col cols="6" sm="3">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-red">{{ formatNumber(clientData.lapsed) }}</div>
                  <div class="text-caption">Lapsed (12mo+)</div>
                </div>
              </v-col>
              <v-col cols="6" sm="3">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-blue">{{ clientData.retentionRate }}%</div>
                  <div class="text-caption">Retention Rate</div>
                </div>
              </v-col>
            </v-row>
            <v-divider class="my-3" />
            <v-row dense>
              <v-col cols="6" sm="4">
                <div class="text-center">
                  <div class="text-subtitle-1 font-weight-bold">${{ formatCurrency(clientData.avgRevenue) }}</div>
                  <div class="text-caption">Avg Revenue/Client</div>
                </div>
              </v-col>
              <v-col cols="6" sm="4">
                <div class="text-center">
                  <div class="text-subtitle-1 font-weight-bold">{{ clientData.highValueClients }}</div>
                  <div class="text-caption">High Value ($500+)</div>
                </div>
              </v-col>
              <v-col cols="6" sm="4">
                <div class="text-center">
                  <div class="text-subtitle-1 font-weight-bold">{{ clientData.divisions }}</div>
                  <div class="text-caption">Divisions</div>
                </div>
              </v-col>
            </v-row>
            <div class="text-right mt-2">
              <v-btn variant="text" size="small" color="violet" to="/marketing/ezyvet-analytics" append-icon="mdi-arrow-right">
                Full Client Analytics
              </v-btn>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <!-- Appointments -->
        <v-expansion-panel>
          <v-expansion-panel-title>
            <div class="d-flex align-center gap-2">
              <v-avatar color="blue" size="28" variant="tonal"><v-icon size="16">mdi-calendar-check</v-icon></v-avatar>
              <span class="font-weight-medium">Appointments</span>
              <v-chip size="x-small" color="blue" variant="tonal" class="ml-2">
                {{ formatNumber(appointmentData.totalAppointments) }} total
              </v-chip>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-row dense>
              <v-col cols="6" sm="3">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-blue">{{ formatNumber(appointmentData.totalAppointments) }}</div>
                  <div class="text-caption">Total Appointments</div>
                </div>
              </v-col>
              <v-col cols="6" sm="3">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-teal">{{ appointmentData.uniqueTypes }}</div>
                  <div class="text-caption">Service Types</div>
                </div>
              </v-col>
              <v-col cols="6" sm="3">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-indigo">{{ appointmentData.locations }}</div>
                  <div class="text-caption">Locations</div>
                </div>
              </v-col>
              <v-col cols="6" sm="3">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-amber">{{ appointmentData.peakDay || '—' }}</div>
                  <div class="text-caption">Busiest Day</div>
                </div>
              </v-col>
            </v-row>
            <v-divider class="my-3" />
            <div class="text-caption text-grey">
              Top appointment types:
              <v-chip v-for="t in appointmentData.topTypes.slice(0, 5)" :key="t.name" size="x-small" variant="tonal" class="mr-1 mb-1">
                {{ t.name }}: {{ t.count }}
              </v-chip>
            </div>
            <div class="text-right mt-2">
              <v-btn variant="text" size="small" color="blue" to="/marketing/appointment-analysis" append-icon="mdi-arrow-right">
                Full Appointment Analysis
              </v-btn>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <!-- Partnerships & Referrals -->
        <v-expansion-panel>
          <v-expansion-panel-title>
            <div class="d-flex align-center gap-2">
              <v-avatar color="teal" size="28" variant="tonal"><v-icon size="16">mdi-handshake</v-icon></v-avatar>
              <span class="font-weight-medium">Partnerships & Referrals</span>
              <v-chip size="x-small" color="teal" variant="tonal" class="ml-2">
                {{ partnerData.totalPartners + referralData.totalPartners }} partners
              </v-chip>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <h4 class="text-subtitle-2 font-weight-bold mb-2">Marketing Partners (Pet Businesses)</h4>
            <v-row dense class="mb-3">
              <v-col cols="6" sm="3">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-primary">{{ partnerData.totalPartners }}</div>
                  <div class="text-caption">Total</div>
                </div>
              </v-col>
              <v-col cols="6" sm="3">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-green">{{ partnerData.active }}</div>
                  <div class="text-caption">Active</div>
                </div>
              </v-col>
              <v-col cols="6" sm="3">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-orange">{{ partnerData.prospects }}</div>
                  <div class="text-caption">Prospects</div>
                </div>
              </v-col>
              <v-col cols="6" sm="3">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-red">{{ partnerData.needsFollowup }}</div>
                  <div class="text-caption">Needs Follow-up</div>
                </div>
              </v-col>
            </v-row>
            <v-divider class="my-3" />
            <h4 class="text-subtitle-2 font-weight-bold mb-2">Referral Clinics (Medical)</h4>
            <v-row dense>
              <v-col cols="6" sm="3">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-cyan">{{ referralData.totalPartners }}</div>
                  <div class="text-caption">Total Clinics</div>
                </div>
              </v-col>
              <v-col cols="6" sm="3">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-green">{{ referralData.active }}</div>
                  <div class="text-caption">Active</div>
                </div>
              </v-col>
              <v-col cols="6" sm="3">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-amber">{{ referralData.platinum }} / {{ referralData.gold }}</div>
                  <div class="text-caption">Platinum / Gold</div>
                </div>
              </v-col>
              <v-col cols="6" sm="3">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-green">${{ formatCompact(referralData.totalRevenue) }}</div>
                  <div class="text-caption">Total Revenue</div>
                </div>
              </v-col>
            </v-row>
            <div class="text-right mt-2">
              <v-btn variant="text" size="small" color="primary" to="/marketing/partners" append-icon="mdi-arrow-right" class="mr-2">
                Partners
              </v-btn>
              <v-btn variant="text" size="small" color="teal" to="/marketing/partnerships" append-icon="mdi-arrow-right">
                Referral CRM
              </v-btn>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <!-- Events & Leads -->
        <v-expansion-panel>
          <v-expansion-panel-title>
            <div class="d-flex align-center gap-2">
              <v-avatar color="pink" size="28" variant="tonal"><v-icon size="16">mdi-calendar-star</v-icon></v-avatar>
              <span class="font-weight-medium">Events & Leads</span>
              <v-chip size="x-small" color="pink" variant="tonal" class="ml-2">
                {{ eventData.totalEvents }} events · {{ leadData.totalLeads }} leads
              </v-chip>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-row dense>
              <v-col cols="6" sm="2">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-pink">{{ eventData.totalEvents }}</div>
                  <div class="text-caption">Total Events</div>
                </div>
              </v-col>
              <v-col cols="6" sm="2">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-blue">{{ eventData.upcoming }}</div>
                  <div class="text-caption">Upcoming</div>
                </div>
              </v-col>
              <v-col cols="6" sm="2">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-green">{{ formatNumber(eventData.totalVisitors) }}</div>
                  <div class="text-caption">Visitors</div>
                </div>
              </v-col>
              <v-col cols="6" sm="2">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-amber">${{ formatCompact(eventData.totalRevenue) }}</div>
                  <div class="text-caption">Event Revenue</div>
                </div>
              </v-col>
              <v-col cols="6" sm="2">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-purple">{{ leadData.totalLeads }}</div>
                  <div class="text-caption">Total Leads</div>
                </div>
              </v-col>
              <v-col cols="6" sm="2">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-green">{{ leadData.converted }}</div>
                  <div class="text-caption">Converted</div>
                </div>
              </v-col>
            </v-row>
            <v-divider class="my-3" />
            <v-row dense>
              <v-col cols="4">
                <div class="text-center">
                  <div class="text-subtitle-1 font-weight-bold text-orange">{{ leadData.newLeads }}</div>
                  <div class="text-caption">New</div>
                </div>
              </v-col>
              <v-col cols="4">
                <div class="text-center">
                  <div class="text-subtitle-1 font-weight-bold text-blue">{{ leadData.contacted }}</div>
                  <div class="text-caption">Contacted</div>
                </div>
              </v-col>
              <v-col cols="4">
                <div class="text-center">
                  <div class="text-subtitle-1 font-weight-bold text-red">{{ leadData.lost }}</div>
                  <div class="text-caption">Lost</div>
                </div>
              </v-col>
            </v-row>
            <div v-if="leadData.totalLeads > 0" class="mt-3">
              <div class="text-caption text-grey mb-1">Lead Conversion Funnel</div>
              <v-progress-linear
                :model-value="leadData.conversionRate"
                color="green"
                height="20"
                rounded
              >
                <template #default>
                  <span class="text-caption font-weight-bold white--text">{{ leadData.conversionRate }}% conversion</span>
                </template>
              </v-progress-linear>
            </div>
            <div class="text-right mt-2">
              <v-btn variant="text" size="small" color="pink" to="/growth/events" append-icon="mdi-arrow-right" class="mr-2">
                Events
              </v-btn>
              <v-btn variant="text" size="small" color="purple" to="/growth/leads" append-icon="mdi-arrow-right">
                Leads
              </v-btn>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>

        <!-- Influencers & Inventory -->
        <v-expansion-panel>
          <v-expansion-panel-title>
            <div class="d-flex align-center gap-2">
              <v-avatar color="orange" size="28" variant="tonal"><v-icon size="16">mdi-star-circle</v-icon></v-avatar>
              <span class="font-weight-medium">Influencers & Inventory</span>
              <v-chip size="x-small" color="orange" variant="tonal" class="ml-2">
                {{ influencerData.total }} influencers · {{ inventoryData.total }} items
              </v-chip>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-row dense>
              <v-col cols="6" sm="3">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-orange">{{ influencerData.total }}</div>
                  <div class="text-caption">Influencers</div>
                </div>
              </v-col>
              <v-col cols="6" sm="3">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-green">{{ influencerData.active }}</div>
                  <div class="text-caption">Active</div>
                </div>
              </v-col>
              <v-col cols="6" sm="3">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold text-blue">{{ formatCompact(influencerData.totalReach) }}</div>
                  <div class="text-caption">Total Reach</div>
                </div>
              </v-col>
              <v-col cols="6" sm="3">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold" :class="inventoryData.lowStock > 0 ? 'text-red' : 'text-green'">
                    {{ inventoryData.lowStock }}
                  </div>
                  <div class="text-caption">Low Stock Items</div>
                </div>
              </v-col>
            </v-row>
            <div class="text-right mt-2">
              <v-btn variant="text" size="small" color="orange" to="/marketing/influencers" append-icon="mdi-arrow-right" class="mr-2">
                Influencers
              </v-btn>
              <v-btn variant="text" size="small" color="amber" to="/marketing/inventory" append-icon="mdi-arrow-right">
                Inventory
              </v-btn>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <!-- =========================================
           SECTION 4: Data Coverage Summary
           ========================================= -->
      <v-card variant="outlined" class="mb-6">
        <v-card-title class="d-flex align-center gap-2 pb-0">
          <v-icon color="grey" size="20">mdi-database</v-icon>
          Data Coverage
        </v-card-title>
        <v-card-text>
          <v-row dense>
            <v-col cols="6" sm="4" md="2" v-for="source in dataSources" :key="source.name">
              <div class="text-center pa-2">
                <v-icon :color="source.count > 0 ? 'green' : 'grey'" size="20">
                  {{ source.count > 0 ? 'mdi-check-circle' : 'mdi-alert-circle-outline' }}
                </v-icon>
                <div class="text-subtitle-2 font-weight-bold">{{ formatNumber(source.count) }}</div>
                <div class="text-caption text-medium-emphasis">{{ source.name }}</div>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'marketing-admin']
})

useHead({ title: 'Sauron — Executive Report' })

const supabase = useSupabaseClient()
const loading = ref(false)
const lastRefresh = ref<string | null>(null)

// ============ DATA STATE ============

const invoiceData = ref({
  totalRevenue: 0,
  uniqueInvoices: 0,
  uniqueClients: 0,
  totalLines: 0,
  topDepartments: [] as { name: string; revenue: number }[],
  monthlyTrend: [] as { month: string; revenue: number }[]
})

const clientData = ref({
  totalClients: 0,
  activeClients: 0,
  atRisk: 0,
  lapsed: 0,
  retentionRate: 0,
  avgRevenue: 0,
  highValueClients: 0,
  divisions: 0
})

const appointmentData = ref({
  totalAppointments: 0,
  uniqueTypes: 0,
  locations: 0,
  peakDay: '',
  topTypes: [] as { name: string; count: number }[]
})

const partnerData = ref({
  totalPartners: 0,
  active: 0,
  prospects: 0,
  needsFollowup: 0
})

const referralData = ref({
  totalPartners: 0,
  active: 0,
  platinum: 0,
  gold: 0,
  totalReferrals: 0,
  totalRevenue: 0
})

const eventData = ref({
  totalEvents: 0,
  upcoming: 0,
  totalVisitors: 0,
  totalRevenue: 0
})

const leadData = ref({
  totalLeads: 0,
  newLeads: 0,
  contacted: 0,
  converted: 0,
  qualified: 0,
  lost: 0,
  conversionRate: 0
})

const influencerData = ref({
  total: 0,
  active: 0,
  totalReach: 0
})

const inventoryData = ref({
  total: 0,
  lowStock: 0
})

const observations = ref<Array<{
  icon: string
  title: string
  detail: string
  severity: 'critical' | 'warning' | 'success' | 'info'
  category: string
}>>([])

// ============ COMPUTED ============

const hasData = computed(() => {
  return clientData.value.totalClients > 0 ||
    invoiceData.value.totalLines > 0 ||
    appointmentData.value.totalAppointments > 0 ||
    partnerData.value.totalPartners > 0
})

const pulseKpis = computed(() => [
  {
    label: 'Total Revenue',
    value: `$${formatCompact(invoiceData.value.totalRevenue)}`,
    icon: 'mdi-currency-usd',
    color: 'green',
    alertClass: ''
  },
  {
    label: 'Active Clients',
    value: formatNumber(clientData.value.activeClients),
    icon: 'mdi-account-group',
    color: 'blue',
    alertClass: ''
  },
  {
    label: 'Retention',
    value: `${clientData.value.retentionRate}%`,
    icon: 'mdi-shield-check',
    color: clientData.value.retentionRate >= 70 ? 'green' : clientData.value.retentionRate >= 50 ? 'orange' : 'red',
    alertClass: clientData.value.retentionRate < 50 ? 'border-red' : '',
    trend: clientData.value.retentionRate >= 70 ? 'Healthy' : clientData.value.retentionRate >= 50 ? 'Monitor' : 'Critical',
    trendColor: clientData.value.retentionRate >= 70 ? 'green' : clientData.value.retentionRate >= 50 ? 'orange' : 'red',
    trendIcon: clientData.value.retentionRate >= 70 ? 'mdi-check' : 'mdi-alert'
  },
  {
    label: 'Appointments',
    value: formatCompact(appointmentData.value.totalAppointments),
    icon: 'mdi-calendar-check',
    color: 'indigo',
    alertClass: ''
  },
  {
    label: 'Leads',
    value: formatNumber(leadData.value.totalLeads),
    icon: 'mdi-fire',
    color: 'orange',
    alertClass: '',
    trend: leadData.value.conversionRate > 0 ? `${leadData.value.conversionRate}% conv.` : undefined,
    trendColor: leadData.value.conversionRate >= 20 ? 'green' : 'orange',
    trendIcon: 'mdi-trending-up'
  },
  {
    label: 'At Risk Clients',
    value: formatNumber(clientData.value.atRisk + clientData.value.lapsed),
    icon: 'mdi-alert-circle',
    color: (clientData.value.atRisk + clientData.value.lapsed) > 0 ? 'red' : 'green',
    alertClass: (clientData.value.atRisk + clientData.value.lapsed) > 50 ? 'border-red' : '',
    trend: (clientData.value.atRisk + clientData.value.lapsed) > 0 ? 'Action needed' : 'All good',
    trendColor: (clientData.value.atRisk + clientData.value.lapsed) > 0 ? 'red' : 'green',
    trendIcon: (clientData.value.atRisk + clientData.value.lapsed) > 0 ? 'mdi-alert' : 'mdi-check'
  }
])

const dataSources = computed(() => [
  { name: 'CRM Contacts', count: clientData.value.totalClients },
  { name: 'Invoice Lines', count: invoiceData.value.totalLines },
  { name: 'Appointments', count: appointmentData.value.totalAppointments },
  { name: 'Partners', count: partnerData.value.totalPartners },
  { name: 'Referral Clinics', count: referralData.value.totalPartners },
  { name: 'Events', count: eventData.value.totalEvents },
  { name: 'Leads', count: leadData.value.totalLeads },
  { name: 'Influencers', count: influencerData.value.total },
  { name: 'Inventory', count: inventoryData.value.total }
])

// ============ DATA FETCHERS ============

async function fetchInvoiceData() {
  const { data: lines } = await supabase
    .from('invoice_lines')
    .select('total_earned, department, invoice_number, client_code, invoice_date')

  if (!lines?.length) return

  const totalRevenue = lines.reduce((s, l) => s + (Number(l.total_earned) || 0), 0)
  const uniqueInvoices = new Set(lines.map(l => l.invoice_number)).size
  const uniqueClients = new Set(lines.map(l => l.client_code)).size

  // Top departments by revenue
  const deptMap = new Map<string, number>()
  for (const l of lines) {
    const dept = l.department || 'Unknown'
    deptMap.set(dept, (deptMap.get(dept) || 0) + (Number(l.total_earned) || 0))
  }
  const topDepartments = [...deptMap.entries()]
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue)

  invoiceData.value = { totalRevenue, uniqueInvoices, uniqueClients, totalLines: lines.length, topDepartments, monthlyTrend: [] }
}

async function fetchClientData() {
  const { data: contacts } = await supabase
    .from('ezyvet_crm_contacts')
    .select('id, last_visit, total_revenue, division')

  if (!contacts?.length) return

  const now = new Date()
  const sixMonthsAgo = new Date(now); sixMonthsAgo.setMonth(now.getMonth() - 6)
  const twelveMonthsAgo = new Date(now); twelveMonthsAgo.setMonth(now.getMonth() - 12)

  let active = 0, atRisk = 0, lapsed = 0
  let highValue = 0
  const divisionSet = new Set<string>()
  let totalRev = 0

  for (const c of contacts) {
    const lastVisit = c.last_visit ? new Date(c.last_visit) : null
    const rev = Number(c.total_revenue) || 0
    totalRev += rev

    if (c.division) divisionSet.add(c.division)
    if (rev >= 500) highValue++

    if (lastVisit && lastVisit >= twelveMonthsAgo) {
      if (lastVisit >= sixMonthsAgo) active++
      else atRisk++
    } else {
      lapsed++
    }
  }

  const total = contacts.length
  const retentionRate = total > 0 ? Math.round(((active + atRisk) / total) * 100) : 0
  const avgRevenue = total > 0 ? totalRev / total : 0

  clientData.value = {
    totalClients: total,
    activeClients: active,
    atRisk,
    lapsed,
    retentionRate,
    avgRevenue,
    highValueClients: highValue,
    divisions: divisionSet.size
  }
}

async function fetchAppointmentData() {
  const { data: appts } = await supabase
    .from('appointment_data')
    .select('id, appointment_type, location, day_of_week')

  if (!appts?.length) return

  const uniqueTypes = new Set(appts.map(a => a.appointment_type)).size
  const locations = new Set(appts.map(a => a.location).filter(Boolean)).size

  // Count by type
  const typeMap = new Map<string, number>()
  for (const a of appts) {
    const t = a.appointment_type || 'Unknown'
    typeMap.set(t, (typeMap.get(t) || 0) + 1)
  }
  const topTypes = [...typeMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  // Peak day
  const dayMap = new Map<string, number>()
  for (const a of appts) {
    if (a.day_of_week) dayMap.set(a.day_of_week, (dayMap.get(a.day_of_week) || 0) + 1)
  }
  let peakDay = ''
  let peakCount = 0
  for (const [day, count] of dayMap) {
    if (count > peakCount) { peakDay = day; peakCount = count }
  }

  appointmentData.value = { totalAppointments: appts.length, uniqueTypes, locations, peakDay, topTypes }
}

async function fetchPartnerData() {
  const { data: partners } = await supabase
    .from('marketing_partners')
    .select('id, status')

  if (!partners) return

  partnerData.value = {
    totalPartners: partners.length,
    active: partners.filter(p => p.status === 'active').length,
    prospects: partners.filter(p => p.status === 'prospect').length,
    needsFollowup: partners.filter(p => p.status === 'needs_followup' || p.status === 'follow_up').length
  }
}

async function fetchReferralData() {
  const { data: refs } = await supabase
    .from('referral_partners')
    .select('id, status, tier, total_referrals_all_time, total_revenue_all_time')

  if (!refs) return

  referralData.value = {
    totalPartners: refs.length,
    active: refs.filter(r => r.status === 'active').length,
    platinum: refs.filter(r => r.tier === 'platinum').length,
    gold: refs.filter(r => r.tier === 'gold').length,
    totalReferrals: refs.reduce((s, r) => s + (r.total_referrals_all_time || 0), 0),
    totalRevenue: refs.reduce((s, r) => s + (Number(r.total_revenue_all_time) || 0), 0)
  }
}

async function fetchEventData() {
  const { data: events } = await supabase
    .from('marketing_events')
    .select('id, event_date, visitors_count, revenue_generated, status')

  if (!events) return

  const now = new Date().toISOString().split('T')[0]
  eventData.value = {
    totalEvents: events.length,
    upcoming: events.filter(e => e.event_date && e.event_date >= now).length,
    totalVisitors: events.reduce((s, e) => s + (e.visitors_count || 0), 0),
    totalRevenue: events.reduce((s, e) => s + (Number(e.revenue_generated) || 0), 0)
  }
}

async function fetchLeadData() {
  const { data: leads } = await supabase
    .from('marketing_leads')
    .select('id, status')

  if (!leads) return

  const total = leads.length
  const converted = leads.filter(l => l.status === 'converted').length
  leadData.value = {
    totalLeads: total,
    newLeads: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    converted,
    qualified: leads.filter(l => l.status === 'qualified').length,
    lost: leads.filter(l => l.status === 'lost').length,
    conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0
  }
}

async function fetchInfluencerData() {
  const { data: influencers } = await supabase
    .from('marketing_influencers')
    .select('id, status, follower_count')

  if (!influencers) return

  influencerData.value = {
    total: influencers.length,
    active: influencers.filter(i => i.status === 'active').length,
    totalReach: influencers.reduce((s, i) => s + (i.follower_count || 0), 0)
  }
}

async function fetchInventoryData() {
  const { data: items } = await supabase
    .from('marketing_inventory')
    .select('id, is_low_stock')

  if (!items) return

  inventoryData.value = {
    total: items.length,
    lowStock: items.filter(i => i.is_low_stock).length
  }
}

// ============ OBSERVATIONS ENGINE ============

function generateObservations() {
  const obs: typeof observations.value = []

  // Revenue observations
  if (invoiceData.value.totalRevenue > 0) {
    const revPerClient = invoiceData.value.uniqueClients > 0
      ? invoiceData.value.totalRevenue / invoiceData.value.uniqueClients
      : 0
    if (revPerClient > 500) {
      obs.push({
        icon: 'mdi-trophy',
        title: `Strong revenue per client: $${formatCurrency(revPerClient)}`,
        detail: `Across ${formatNumber(invoiceData.value.uniqueClients)} unique clients generating $${formatCurrency(invoiceData.value.totalRevenue)} total revenue.`,
        severity: 'success',
        category: 'Revenue'
      })
    }
    if (invoiceData.value.topDepartments.length > 0) {
      const topDept = invoiceData.value.topDepartments[0]
      const pct = Math.round((topDept.revenue / invoiceData.value.totalRevenue) * 100)
      if (pct > 50) {
        obs.push({
          icon: 'mdi-alert-circle',
          title: `Revenue concentration risk: ${topDept.name} = ${pct}% of total`,
          detail: `$${formatCurrency(topDept.revenue)} from one department. Consider diversifying service revenue.`,
          severity: 'warning',
          category: 'Revenue'
        })
      }
    }
  }

  // Client health observations
  if (clientData.value.totalClients > 0) {
    if (clientData.value.lapsed > clientData.value.activeClients) {
      obs.push({
        icon: 'mdi-account-alert',
        title: `More lapsed clients (${formatNumber(clientData.value.lapsed)}) than active (${formatNumber(clientData.value.activeClients)})`,
        detail: 'Majority of clients have not visited in 12+ months. Reactivation campaigns urgently recommended.',
        severity: 'critical',
        category: 'Client Health'
      })
    } else if (clientData.value.atRisk > clientData.value.activeClients * 0.3) {
      obs.push({
        icon: 'mdi-account-clock',
        title: `${formatNumber(clientData.value.atRisk)} clients sliding toward lapse`,
        detail: `${Math.round((clientData.value.atRisk / clientData.value.totalClients) * 100)}% of clients visited 6-12 months ago. Targeted outreach could recover them.`,
        severity: 'warning',
        category: 'Client Health'
      })
    }
    if (clientData.value.retentionRate >= 75) {
      obs.push({
        icon: 'mdi-shield-check',
        title: `Client retention is strong at ${clientData.value.retentionRate}%`,
        detail: `${formatNumber(clientData.value.activeClients + clientData.value.atRisk)} of ${formatNumber(clientData.value.totalClients)} clients seen within the last 12 months.`,
        severity: 'success',
        category: 'Client Health'
      })
    }
    if (clientData.value.highValueClients > 0) {
      const pct = Math.round((clientData.value.highValueClients / clientData.value.totalClients) * 100)
      obs.push({
        icon: 'mdi-diamond-stone',
        title: `${formatNumber(clientData.value.highValueClients)} high-value clients ($500+ lifetime)`,
        detail: `${pct}% of the client base. These are your VIPs — ensure they get priority experience and retention focus.`,
        severity: 'info',
        category: 'Client Health'
      })
    }
  }

  // Appointment observations
  if (appointmentData.value.totalAppointments > 0 && appointmentData.value.peakDay) {
    obs.push({
      icon: 'mdi-calendar-check',
      title: `Peak appointment day: ${appointmentData.value.peakDay}`,
      detail: `${formatNumber(appointmentData.value.totalAppointments)} appointments across ${appointmentData.value.uniqueTypes} types at ${appointmentData.value.locations} locations.`,
      severity: 'info',
      category: 'Appointments'
    })
  }

  // Partnership observations
  if (partnerData.value.needsFollowup > 0) {
    obs.push({
      icon: 'mdi-phone-alert',
      title: `${partnerData.value.needsFollowup} marketing partners need follow-up`,
      detail: `Out of ${partnerData.value.totalPartners} total partners. Timely follow-up drives partnership health.`,
      severity: 'warning',
      category: 'Partnerships'
    })
  }
  if (referralData.value.platinum + referralData.value.gold > 0) {
    obs.push({
      icon: 'mdi-medal',
      title: `${referralData.value.platinum} Platinum + ${referralData.value.gold} Gold referral partners`,
      detail: `Top-tier clinics generating $${formatCompact(referralData.value.totalRevenue)} revenue from ${formatNumber(referralData.value.totalReferrals)} total referrals.`,
      severity: 'success',
      category: 'Referrals'
    })
  }

  // Lead conversion observations
  if (leadData.value.totalLeads > 0) {
    if (leadData.value.conversionRate < 10) {
      obs.push({
        icon: 'mdi-trending-down',
        title: `Lead conversion rate is low: ${leadData.value.conversionRate}%`,
        detail: `Only ${leadData.value.converted} of ${leadData.value.totalLeads} leads converted. Review lead quality and follow-up processes.`,
        severity: 'warning',
        category: 'Leads'
      })
    } else if (leadData.value.conversionRate >= 25) {
      obs.push({
        icon: 'mdi-trending-up',
        title: `Excellent lead conversion: ${leadData.value.conversionRate}%`,
        detail: `${leadData.value.converted} converted from ${leadData.value.totalLeads} total leads. Keep up the event strategy.`,
        severity: 'success',
        category: 'Leads'
      })
    }
    if (leadData.value.newLeads > leadData.value.contacted + leadData.value.converted) {
      obs.push({
        icon: 'mdi-email-alert',
        title: `${leadData.value.newLeads} leads not yet contacted`,
        detail: `More uncontacted leads than engaged ones. Prioritize outreach to capture interest while fresh.`,
        severity: 'warning',
        category: 'Leads'
      })
    }
  }

  // Inventory observations
  if (inventoryData.value.lowStock > 0) {
    obs.push({
      icon: 'mdi-package-variant-closed-remove',
      title: `${inventoryData.value.lowStock} inventory items are low stock`,
      detail: `Out of ${inventoryData.value.total} tracked items. Reorder before events or outreach campaigns.`,
      severity: inventoryData.value.lowStock > 5 ? 'critical' : 'warning',
      category: 'Inventory'
    })
  }

  // Events observations
  if (eventData.value.upcoming > 0) {
    obs.push({
      icon: 'mdi-calendar-star',
      title: `${eventData.value.upcoming} upcoming events scheduled`,
      detail: `Past events drew ${formatNumber(eventData.value.totalVisitors)} visitors and $${formatCompact(eventData.value.totalRevenue)} in revenue.`,
      severity: 'info',
      category: 'Events'
    })
  }

  // Cross-domain insight: event ROI vs client acquisition
  if (eventData.value.totalRevenue > 0 && leadData.value.converted > 0) {
    const costPerConversion = eventData.value.totalRevenue / leadData.value.converted
    obs.push({
      icon: 'mdi-chart-timeline-variant',
      title: `Event revenue per converted lead: $${formatCurrency(costPerConversion)}`,
      detail: `${leadData.value.converted} conversions from events generating $${formatCompact(eventData.value.totalRevenue)}. Compare against client lifetime value to measure ROI.`,
      severity: 'info',
      category: 'Cross-Domain'
    })
  }

  // Sort: critical first, then warning, info, success
  const severityOrder = { critical: 0, warning: 1, info: 2, success: 3 }
  obs.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  observations.value = obs
}

// ============ REFRESH ALL ============

async function refreshAll() {
  loading.value = true
  try {
    await Promise.all([
      fetchInvoiceData(),
      fetchClientData(),
      fetchAppointmentData(),
      fetchPartnerData(),
      fetchReferralData(),
      fetchEventData(),
      fetchLeadData(),
      fetchInfluencerData(),
      fetchInventoryData()
    ])
    generateObservations()
    lastRefresh.value = new Date().toISOString()
  } catch (err) {
    console.error('[Sauron] Refresh error:', err)
  } finally {
    loading.value = false
  }
}

// ============ HELPERS ============

function formatNumber(n: number): string {
  return n.toLocaleString()
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function formatCurrency(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  })
}

function printReport() {
  window.print()
}

// ============ INIT ============
await refreshAll()
</script>

<style scoped>
.sauron-page {
  max-width: 1200px;
  margin: 0 auto;
}

.pulse-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.pulse-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.border-red {
  border-color: rgb(var(--v-theme-error)) !important;
  border-width: 2px !important;
}

@media print {
  .v-btn, .v-expansion-panel-title svg {
    display: none !important;
  }

  .v-expansion-panel-text {
    display: block !important;
    height: auto !important;
  }
}
</style>
