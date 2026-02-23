<template>
  <div class="practice-analytics-page">
    <!-- Page Header -->
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Practice Analytics</h1>
        <p class="text-subtitle-1 text-grey">
          Unified key performance metrics across revenue, appointments, clients &amp; referrals
        </p>
        <div v-if="syncStatus" class="text-caption mt-1" :class="syncStatus.isStale ? 'text-warning' : 'text-success'">
          <v-icon size="14" class="mr-1">{{ syncStatus.hasApiData ? 'mdi-cloud-check' : 'mdi-cloud-off-outline' }}</v-icon>
          {{ syncStatus.hasApiData ? `Auto-sync active (${syncStatus.mode})` : 'Manual mode — configure ezyVet API for auto-sync' }}
          <span v-if="syncStatus.isStale && syncStatus.hasApiData" class="ml-1 text-warning">(data may be stale)</span>
        </div>
      </div>
      <div class="d-flex gap-2">
        <v-btn
          color="success"
          prepend-icon="mdi-cloud-sync"
          :loading="syncing"
          @click="syncAll"
        >
          Sync All Data
        </v-btn>
        <v-btn
          color="primary"
          variant="outlined"
          prepend-icon="mdi-printer"
          @click="window.print()"
        >
          Print Report
        </v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-refresh"
          :loading="loading"
          @click="loadDashboard"
        >
          Refresh
        </v-btn>
      </div>
    </div>

    <!-- Date Range Filter -->
    <v-card class="mb-6" elevation="2">
      <v-card-text>
        <v-row dense align="center">
          <v-col cols="12" md="3">
            <v-text-field
              v-model="filters.startDate"
              type="date"
              label="From Date"
              variant="outlined"
              density="compact"
              hide-details
              prepend-inner-icon="mdi-calendar-start"
              @update:model-value="loadDashboard"
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="filters.endDate"
              type="date"
              label="To Date"
              variant="outlined"
              density="compact"
              hide-details
              prepend-inner-icon="mdi-calendar-end"
              @update:model-value="loadDashboard"
            />
          </v-col>
          <v-col cols="12" md="6">
            <div class="d-flex gap-2 flex-wrap">
              <v-chip
                v-for="preset in datePresets"
                :key="preset.label"
                :color="isActivePreset(preset) ? 'primary' : 'default'"
                :variant="isActivePreset(preset) ? 'flat' : 'outlined'"
                size="small"
                @click="applyPreset(preset)"
              >
                {{ preset.label }}
              </v-chip>
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Loading State -->
    <div v-if="loading" class="text-center pa-12">
      <v-progress-circular indeterminate color="primary" size="64" />
      <div class="text-h6 mt-4 text-grey">Loading practice analytics...</div>
    </div>

    <!-- Dashboard Content -->
    <div v-else-if="data">

      <!-- ===== TOP-LEVEL KPI CARDS ===== -->
      <v-row class="mb-6">
        <v-col cols="12" sm="6" md="3">
          <v-card class="pa-4" elevation="2">
            <div class="d-flex align-center">
              <v-avatar color="green-darken-1" size="48" class="mr-3">
                <v-icon color="white">mdi-currency-usd</v-icon>
              </v-avatar>
              <div>
                <div class="text-h5 font-weight-bold">${{ formatCurrency(data.kpis.revenue.totalRevenue) }}</div>
                <div class="text-caption text-grey">Total Revenue</div>
                <v-chip
                  v-if="data.kpis.revenue.revenueChangePct !== 0"
                  :color="data.kpis.revenue.revenueChangePct > 0 ? 'success' : 'error'"
                  size="x-small"
                  label
                  class="mt-1"
                >
                  {{ data.kpis.revenue.revenueChangePct > 0 ? '+' : '' }}{{ data.kpis.revenue.revenueChangePct }}%
                </v-chip>
              </div>
            </div>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card class="pa-4" elevation="2">
            <div class="d-flex align-center">
              <v-avatar color="blue-darken-1" size="48" class="mr-3">
                <v-icon color="white">mdi-calendar-check</v-icon>
              </v-avatar>
              <div>
                <div class="text-h5 font-weight-bold">{{ formatNumber(data.kpis.appointments.totalAppointments) }}</div>
                <div class="text-caption text-grey">Appointments</div>
                <div class="text-caption text-grey">{{ data.kpis.appointments.avgPerDay }}/day avg</div>
              </div>
            </div>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card class="pa-4" elevation="2">
            <div class="d-flex align-center">
              <v-avatar color="purple-darken-1" size="48" class="mr-3">
                <v-icon color="white">mdi-account-group</v-icon>
              </v-avatar>
              <div>
                <div class="text-h5 font-weight-bold">{{ formatNumber(data.kpis.clients.activeContacts) }}</div>
                <div class="text-caption text-grey">Active Clients</div>
                <div class="text-caption text-grey">{{ data.kpis.clients.retentionRate12Mo || data.kpis.clients.retentionRate3Mo }}% 12-mo retention</div>
              </div>
            </div>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card class="pa-4" elevation="2">
            <div class="d-flex align-center">
              <v-avatar color="teal-darken-1" size="48" class="mr-3">
                <v-icon color="white">mdi-handshake</v-icon>
              </v-avatar>
              <div>
                <div class="text-h5 font-weight-bold">{{ formatNumber(data.kpis.referrals.totalReferrals) }}</div>
                <div class="text-caption text-grey">Referral Partners</div>
                <div class="text-caption text-grey">${{ formatCurrency(data.kpis.referrals.totalReferralRevenue) }} revenue</div>
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Secondary KPIs -->
      <v-row class="mb-6">
        <v-col cols="12" sm="6" md="3">
          <v-card class="pa-4" elevation="1">
            <div class="text-h6 font-weight-bold">${{ formatCurrency(data.kpis.revenue.avgRevenuePerInvoice) }}</div>
            <div class="text-caption text-grey">Avg Revenue / Invoice</div>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card class="pa-4" elevation="1">
            <div class="text-h6 font-weight-bold">{{ formatNumber(data.kpis.revenue.uniqueInvoices) }}</div>
            <div class="text-caption text-grey">Unique Invoices</div>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card class="pa-4" elevation="1">
            <div class="text-h6 font-weight-bold">{{ formatNumber(data.kpis.clients.recentVisitors) }}</div>
            <div class="text-caption text-grey">Recent Visitors (90d)</div>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card class="pa-4" elevation="1">
            <div class="text-h6 font-weight-bold text-error">{{ formatNumber(data.kpis.clients.lapsedClients) }}</div>
            <div class="text-caption text-grey">Lapsed Clients (&gt;1yr)</div>
          </v-card>
        </v-col>
      </v-row>

      <!-- ===== CHARTS ROW 1: Revenue ===== -->
      <v-row class="mb-6">
        <v-col cols="12" md="8">
          <v-card elevation="2">
            <v-card-title class="d-flex align-center">
              <v-icon class="mr-2" color="success">mdi-chart-line</v-icon>
              Monthly Revenue Trend
            </v-card-title>
            <v-card-text>
              <ClientOnly>
                <apexchart
                  v-if="data.charts.monthlyRevenue.length"
                  type="area"
                  height="300"
                  :options="monthlyRevenueOptions"
                  :series="monthlyRevenueSeries"
                />
                <div v-else class="text-center text-grey pa-8">No revenue data for selected period</div>
              </ClientOnly>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="4">
          <v-card elevation="2" class="fill-height">
            <v-card-title class="d-flex align-center">
              <v-icon class="mr-2" color="info">mdi-chart-donut</v-icon>
              Revenue by Department
            </v-card-title>
            <v-card-text>
              <ClientOnly>
                <apexchart
                  v-if="data.charts.departmentRevenue.length"
                  type="donut"
                  height="280"
                  :options="deptDonutOptions"
                  :series="deptDonutSeries"
                />
                <div v-else class="text-center text-grey pa-8">No department data</div>
              </ClientOnly>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- ===== CHARTS ROW 2: Staff & Appointments ===== -->
      <v-row class="mb-6">
        <v-col cols="12" md="6">
          <v-card elevation="2">
            <v-card-title class="d-flex align-center">
              <v-icon class="mr-2" color="purple">mdi-account-star</v-icon>
              Top Staff by Revenue
            </v-card-title>
            <v-card-text>
              <ClientOnly>
                <apexchart
                  v-if="data.charts.topStaff.length"
                  type="bar"
                  height="300"
                  :options="staffBarOptions"
                  :series="staffBarSeries"
                />
                <div v-else class="text-center text-grey pa-8">No staff data</div>
              </ClientOnly>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card elevation="2">
            <v-card-title class="d-flex align-center">
              <v-icon class="mr-2" color="blue">mdi-calendar-month</v-icon>
              Appointments by Type
            </v-card-title>
            <v-card-text>
              <ClientOnly>
                <apexchart
                  v-if="data.charts.appointmentsByType.length"
                  type="bar"
                  height="300"
                  :options="apptTypeOptions"
                  :series="apptTypeSeries"
                />
                <div v-else class="text-center text-grey pa-8">No appointment data</div>
              </ClientOnly>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- ===== CHARTS ROW 3: Clients & Referrals ===== -->
      <v-row class="mb-6">
        <v-col cols="12" md="6">
          <v-card elevation="2">
            <v-card-title class="d-flex align-center">
              <v-icon class="mr-2" color="amber">mdi-clock-outline</v-icon>
              Client Retention Bands
            </v-card-title>
            <v-card-text>
              <ClientOnly>
                <apexchart
                  v-if="data.charts.clientRetention.length"
                  type="bar"
                  height="280"
                  :options="retentionBarOptions"
                  :series="retentionBarSeries"
                />
                <div v-else class="text-center text-grey pa-8">No client data</div>
              </ClientOnly>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card elevation="2">
            <v-card-title class="d-flex align-center">
              <v-icon class="mr-2" color="teal">mdi-handshake-outline</v-icon>
              Referral Partner Tiers
            </v-card-title>
            <v-card-text>
              <div v-if="data.kpis.referrals.totalPartners > 0">
                <v-row dense>
                  <v-col v-for="(count, tier) in data.kpis.referrals.tierBreakdown" :key="tier" cols="6" sm="4">
                    <v-card variant="outlined" class="pa-3 text-center">
                      <div class="text-h5 font-weight-bold">{{ count }}</div>
                      <div class="text-caption text-grey">{{ tier }}</div>
                    </v-card>
                  </v-col>
                </v-row>
                <div class="mt-4 text-center">
                  <div class="text-h4 font-weight-bold text-teal">${{ formatCurrency(data.kpis.referrals.totalReferralRevenue) }}</div>
                  <div class="text-caption text-grey">Total Referral Revenue</div>
                </div>
              </div>
              <div v-else class="text-center text-grey pa-8">No referral data yet</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- ===== DATA SOURCE STATUS ===== -->
      <v-card class="mb-6" elevation="1">
        <v-card-title class="text-subtitle-1">
          <v-icon class="mr-2" size="small">mdi-database-sync</v-icon>
          Data Sources
        </v-card-title>
        <v-card-text>
          <v-row dense>
            <v-col v-for="(info, syncType) in syncStatus?.lastSyncByType" :key="syncType" cols="12" sm="6" md="3">
              <v-card variant="tonal" class="pa-3">
                <div class="d-flex align-center mb-1">
                  <v-icon size="16" color="success" class="mr-1">mdi-check-circle</v-icon>
                  <span class="text-caption font-weight-bold text-uppercase">{{ syncType }}</span>
                </div>
                <div class="text-caption text-grey">Last: {{ formatDateTime(info.lastSync) }}</div>
                <div class="text-caption text-grey">{{ info.recordsSynced?.toLocaleString() || 0 }} records</div>
              </v-card>
            </v-col>
            <v-col v-if="!syncStatus?.hasApiData" cols="12">
              <v-alert type="info" variant="tonal" density="compact">
                <strong>API not configured.</strong> Data is from manual CSV uploads.
                <NuxtLink to="/marketing/ezyvet-integration" class="ml-1">Set up ezyVet API →</NuxtLink>
              </v-alert>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Quick Links -->
      <v-row class="mb-6">
        <v-col cols="12" sm="6" md="3">
          <NuxtLink to="/marketing/performance-analysis" class="text-decoration-none">
            <v-card class="pa-4 text-center" elevation="1" hover>
              <v-icon size="32" color="deep-purple">mdi-chart-bar-stacked</v-icon>
              <div class="text-body-2 mt-2">Performance Analysis</div>
            </v-card>
          </NuxtLink>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <NuxtLink to="/marketing/ezyvet-analytics" class="text-decoration-none">
            <v-card class="pa-4 text-center" elevation="1" hover>
              <v-icon size="32" color="purple">mdi-chart-box</v-icon>
              <div class="text-body-2 mt-2">Client Analytics</div>
            </v-card>
          </NuxtLink>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <NuxtLink to="/marketing/partnerships" class="text-decoration-none">
            <v-card class="pa-4 text-center" elevation="1" hover>
              <v-icon size="32" color="teal">mdi-handshake</v-icon>
              <div class="text-body-2 mt-2">Referral CRM</div>
            </v-card>
          </NuxtLink>
        </v-col>
      </v-row>
    </div>

    <!-- No Data State -->
    <v-card v-else-if="!loading && !error" class="pa-12 text-center" elevation="2">
      <v-icon size="80" color="grey">mdi-chart-areaspline</v-icon>
      <div class="text-h5 mt-4">No Analytics Data</div>
      <div class="text-grey mt-2 mb-6">
        Sync data from ezyVet to populate the unified dashboard, or upload CSV data to each individual report.
      </div>
      <v-btn color="success" prepend-icon="mdi-cloud-sync" :loading="syncing" @click="syncAll">
        Sync All Data from ezyVet
      </v-btn>
    </v-card>

    <!-- Error State -->
    <v-alert v-if="error" type="error" class="mt-4" closable @click:close="error = null">
      {{ error }}
    </v-alert>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="5000" location="top">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'marketing-admin'],
})

// ── State ────────────────────────────────────────────────────────────────

const loading = ref(false)
const syncing = ref(false)
const error = ref<string | null>(null)
const data = ref<any>(null)
const syncStatus = ref<any>(null)

// Default date range: end-of-last-complete-month (consistent with Sauron, Invoice, Appointment)
const endOfLastMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 0)
const filters = reactive({
  startDate: new Date(endOfLastMonth.getTime() - 89 * 86400000).toISOString().split('T')[0],
  endDate: endOfLastMonth.toISOString().split('T')[0],
})

const snackbar = reactive({
  show: false,
  message: '',
  color: 'success',
})

// ── Date Presets ─────────────────────────────────────────────────────────

const datePresets = [
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 90 Days', days: 90 },
  { label: 'Last 6 Months', days: 180 },
  { label: 'Last 12 Months', days: 365 },
  { label: 'YTD', days: -1 },
]

function isActivePreset(preset: { days: number }): boolean {
  if (preset.days === -1) {
    return filters.startDate === new Date().getFullYear() + '-01-01'
  }
  const lcm = endOfLastMonth
  const expectedStart = new Date(lcm.getTime() - (preset.days - 1) * 86400000).toISOString().split('T')[0]
  return filters.startDate === expectedStart
}

function applyPreset(preset: { days: number }) {
  // Anchor to end-of-last-complete-month (consistent with other analytics pages)
  const lcm = endOfLastMonth
  filters.endDate = lcm.toISOString().split('T')[0]
  if (preset.days === -1) {
    filters.startDate = new Date().getFullYear() + '-01-01'
  } else {
    filters.startDate = new Date(lcm.getTime() - (preset.days - 1) * 86400000).toISOString().split('T')[0]
  }
  loadDashboard()
}

// ── Chart Computed ───────────────────────────────────────────────────────

const monthlyRevenueSeries = computed(() => [{
  name: 'Revenue',
  data: (data.value?.charts?.monthlyRevenue || []).map((d: any) => d.revenue),
}])

const monthlyRevenueOptions = computed(() => ({
  chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit' },
  colors: ['#10B981'],
  fill: { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0.1 } },
  stroke: { curve: 'smooth', width: 2 },
  xaxis: {
    categories: (data.value?.charts?.monthlyRevenue || []).map((d: any) => d.month),
    labels: { rotate: -45, style: { fontSize: '10px' } },
  },
  yaxis: { labels: { formatter: (v: number) => '$' + (v / 1000).toFixed(0) + 'k' } },
  dataLabels: { enabled: false },
  tooltip: { theme: 'dark', y: { formatter: (v: number) => '$' + v.toLocaleString() } },
}))

const deptDonutSeries = computed(() =>
  (data.value?.charts?.departmentRevenue || []).map((d: any) => d.revenue)
)

const deptDonutOptions = computed(() => ({
  chart: { type: 'donut', fontFamily: 'inherit' },
  labels: (data.value?.charts?.departmentRevenue || []).map((d: any) => d.department),
  colors: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#14B8A6', '#F97316', '#6366F1'],
  legend: { position: 'bottom', fontSize: '11px' },
  dataLabels: { enabled: true, formatter: (val: number) => `${Math.round(val)}%` },
  tooltip: { theme: 'dark', y: { formatter: (v: number) => '$' + v.toLocaleString() } },
}))

const staffBarSeries = computed(() => [{
  name: 'Revenue',
  data: (data.value?.charts?.topStaff || []).map((d: any) => d.revenue),
}])

const staffBarOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
  colors: ['#8B5CF6'],
  xaxis: {
    categories: (data.value?.charts?.topStaff || []).map((d: any) => d.name),
    labels: { formatter: (v: number) => '$' + (v / 1000).toFixed(0) + 'k' },
  },
  plotOptions: { bar: { borderRadius: 4, horizontal: true } },
  dataLabels: { enabled: false },
  tooltip: { theme: 'dark', y: { formatter: (v: number) => '$' + v.toLocaleString() } },
}))

const apptTypeSeries = computed(() => [{
  name: 'Count',
  data: (data.value?.charts?.appointmentsByType || []).map((d: any) => d.count),
}])

const apptTypeOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
  colors: ['#3B82F6'],
  xaxis: {
    categories: (data.value?.charts?.appointmentsByType || []).map((d: any) => d.type),
    labels: { rotate: -45, style: { fontSize: '10px' } },
  },
  plotOptions: { bar: { borderRadius: 4 } },
  dataLabels: { enabled: true, style: { fontSize: '10px' } },
  tooltip: { theme: 'dark' },
}))

const retentionBarSeries = computed(() => [{
  name: 'Clients',
  data: (data.value?.charts?.clientRetention || []).map((d: any) => d.count),
}])

const retentionBarOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
  colors: ['#F59E0B'],
  xaxis: {
    categories: (data.value?.charts?.clientRetention || []).map((d: any) => d.label),
  },
  plotOptions: { bar: { borderRadius: 4 } },
  dataLabels: { enabled: true, style: { fontSize: '10px' } },
  tooltip: { theme: 'dark' },
}))

// ── Helpers ──────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  return n?.toLocaleString() ?? '0'
}

function formatCurrency(n: number): string {
  if (n === null || n === undefined) return '0.00'
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDateTime(d: string | null): string {
  if (!d) return 'Never'
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function showNotification(message: string, color = 'success') {
  snackbar.message = message
  snackbar.color = color
  snackbar.show = true
}

// ── Data Loading ─────────────────────────────────────────────────────────

async function loadDashboard() {
  loading.value = true
  error.value = null
  try {
    const params = new URLSearchParams({
      startDate: filters.startDate,
      endDate: filters.endDate,
    })
    const result = await $fetch(`/api/analytics/practice-overview?${params.toString()}`) as any

    if (result.success) {
      data.value = result
      syncStatus.value = result.syncStatus
    }
  } catch (err: any) {
    error.value = err.data?.message || err.message || 'Failed to load analytics'
  } finally {
    loading.value = false
  }
}

// ── Sync All ─────────────────────────────────────────────────────────────

async function syncAll() {
  syncing.value = true
  try {
    const result = await $fetch('/api/ezyvet/sync-analytics', {
      method: 'POST',
      body: { syncType: 'all' },
    }) as any

    if (result.success) {
      const first = Object.values(result.results)[0] as any
      const invoicesSynced = first?.invoices?.upserted || 0
      const contactsSynced = first?.contacts?.upserted || 0
      const partnersUpdated = first?.referrals?.partnersUpdated || 0

      showNotification(
        `Synced ${invoicesSynced.toLocaleString()} invoices, ${contactsSynced.toLocaleString()} contacts, ${partnersUpdated} referral partners`,
        'success'
      )
      await loadDashboard()
    }
  } catch (err: any) {
    const msg = err.data?.message || err.message || 'Sync failed'
    if (msg.includes('No active ezyVet clinic')) {
      showNotification('ezyVet API not configured. Set up credentials in the ezyVet Integration page.', 'warning')
    } else {
      showNotification('Sync failed: ' + msg, 'error')
    }
  } finally {
    syncing.value = false
  }
}

// ── Init ─────────────────────────────────────────────────────────────────

onMounted(() => {
  loadDashboard()
})
</script>

<style scoped>
.practice-analytics-page {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
