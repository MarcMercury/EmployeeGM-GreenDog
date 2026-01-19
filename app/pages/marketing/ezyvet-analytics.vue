<template>
  <div class="ezyvet-analytics-page">
    <!-- Page Header -->
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">EzyVet Analytics</h1>
        <p class="text-subtitle-1 text-grey">
          Business intelligence dashboard for client data insights
        </p>
      </div>
      <div class="d-flex gap-2">
        <v-btn
          color="primary"
          variant="outlined"
          prepend-icon="mdi-database"
          :to="'/marketing/ezyvet-crm'"
        >
          CRM Data
        </v-btn>
        <v-btn
          color="primary"
          variant="outlined"
          prepend-icon="mdi-printer"
          @click="printReport"
        >
          Print Report
        </v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-refresh"
          :loading="loading"
          @click="loadAnalytics"
        >
          Refresh
        </v-btn>
      </div>
    </div>

    <!-- Global Filters -->
    <v-card class="mb-6" elevation="2">
      <v-card-text>
        <v-row dense align="center">
          <v-col cols="12" md="3">
            <v-select
              v-model="filters.division"
              :items="divisions"
              label="Division"
              variant="outlined"
              density="compact"
              clearable
              hide-details
              prepend-inner-icon="mdi-domain"
              @update:model-value="loadAnalytics"
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="filters.startDate"
              type="date"
              label="From Date"
              variant="outlined"
              density="compact"
              hide-details
              prepend-inner-icon="mdi-calendar-start"
              @update:model-value="loadAnalytics"
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
              @update:model-value="loadAnalytics"
            />
          </v-col>
          <v-col cols="12" md="3" class="d-flex align-center">
            <v-btn
              variant="text"
              size="small"
              @click="resetFilters"
              :disabled="!hasActiveFilters"
            >
              Reset Filters
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="64" />
      <div class="text-h6 mt-4">Loading analytics...</div>
    </div>

    <!-- Analytics Content -->
    <div v-else-if="analytics">
      <!-- KPI Cards Row -->
      <v-row class="mb-6">
        <v-col cols="12" sm="6" md="3">
          <v-card class="pa-4 kpi-card" elevation="2">
            <div class="d-flex align-center">
              <v-avatar color="primary" size="56" class="mr-4">
                <v-icon color="white" size="28">mdi-currency-usd</v-icon>
              </v-avatar>
              <div>
                <div class="text-h4 font-weight-bold text-primary">
                  {{ formatCurrency(analytics.kpis.totalRevenue) }}
                </div>
                <div class="text-body-2 text-grey">Total Revenue YTD</div>
              </div>
            </div>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card class="pa-4 kpi-card" elevation="2">
            <div class="d-flex align-center">
              <v-avatar color="success" size="56" class="mr-4">
                <v-icon color="white" size="28">mdi-account-check</v-icon>
              </v-avatar>
              <div>
                <div class="text-h4 font-weight-bold text-success">
                  {{ formatNumber(analytics.kpis.activeContacts) }}
                </div>
                <div class="text-body-2 text-grey">Active Clients (12 Months)</div>
              </div>
            </div>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card class="pa-4 kpi-card" elevation="2">
            <div class="d-flex align-center">
              <v-avatar color="info" size="56" class="mr-4">
                <v-icon color="white" size="28">mdi-chart-line</v-icon>
              </v-avatar>
              <div>
                <div class="text-h4 font-weight-bold text-info">
                  {{ formatCurrency(analytics.kpis.arpu) }}
                </div>
                <div class="text-body-2 text-grey">ARPU ($25+ Clients)</div>
              </div>
            </div>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card class="pa-4 kpi-card" elevation="2">
            <div class="d-flex align-center">
              <v-avatar color="warning" size="56" class="mr-4">
                <v-icon color="white" size="28">mdi-account-group</v-icon>
              </v-avatar>
              <div>
                <div class="text-h4 font-weight-bold text-warning">
                  {{ formatNumber(analytics.kpis.totalContacts) }}
                </div>
                <div class="text-body-2 text-grey">Total Clients</div>
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Charts Row 1 -->
      <v-row class="mb-6">
        <!-- Revenue Distribution Histogram -->
        <v-col cols="12" md="6">
          <v-card elevation="2">
            <v-card-title>
              <v-icon class="mr-2">mdi-chart-histogram</v-icon>
              Revenue Distribution ($25+)
            </v-card-title>
            <v-card-text>
              <ClientOnly>
                <apexchart
                  type="bar"
                  height="350"
                  :options="revenueDistributionOptions"
                  :series="revenueDistributionSeries"
                />
              </ClientOnly>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Breed Revenue -->
        <v-col cols="12" md="6">
          <v-card elevation="2">
            <v-card-title>
              <v-icon class="mr-2">mdi-paw</v-icon>
              Top 10 Breeds by Revenue
            </v-card-title>
            <v-card-text>
              <ClientOnly>
                <apexchart
                  type="bar"
                  height="350"
                  :options="breedOptions"
                  :series="breedSeries"
                />
              </ClientOnly>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Charts Row 2 -->
      <v-row class="mb-6">
        <!-- Recency Analysis -->
        <v-col cols="12">
          <v-card elevation="2">
            <v-card-title>
              <v-icon class="mr-2">mdi-clock-outline</v-icon>
              Recency Analysis (Last Visit)
              <v-spacer />
              <span class="text-body-2 text-grey">
                Total: {{ formatNumber(recencyTotal) }} clients
              </span>
            </v-card-title>
            <v-card-text>
              <ClientOnly>
                <apexchart
                  type="bar"
                  height="350"
                  :options="recencyOptions"
                  :series="recencySeries"
                />
              </ClientOnly>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Division Performance Table -->
      <v-card elevation="2" class="mb-6">
        <v-card-title>
          <v-icon class="mr-2">mdi-domain</v-icon>
          Division Performance
        </v-card-title>
        <v-card-text>
          <v-data-table
            :headers="divisionHeaders"
            :items="analytics.divisionBreakdown"
            density="comfortable"
            :items-per-page="10"
          >
            <template #item.totalRevenue="{ item }">
              <span class="font-weight-bold text-primary">
                {{ formatCurrency(item.totalRevenue) }}
              </span>
            </template>
            <template #item.avgRevenue="{ item }">
              {{ formatCurrency(item.avgRevenue) }}
            </template>
            <template #item.activeRate="{ item }">
              <v-chip
                :color="getActiveRateColor(item.activeClients, item.totalClients)"
                size="small"
              >
                {{ Math.round((item.activeClients / item.totalClients) * 100) }}%
              </v-chip>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>

      <!-- Department Performance Table -->
      <v-card elevation="2" class="mb-6">
        <v-card-title>
          <v-icon class="mr-2">mdi-office-building</v-icon>
          Department Performance
        </v-card-title>
        <v-card-text>
          <v-data-table
            :headers="departmentHeaders"
            :items="analytics.departmentBreakdown"
            density="comfortable"
            :items-per-page="10"
          >
            <template #item.totalRevenue="{ item }">
              <span class="font-weight-bold text-primary">
                {{ formatCurrency(item.totalRevenue) }}
              </span>
            </template>
            <template #item.avgRevenue="{ item }">
              {{ formatCurrency(item.avgRevenue) }}
            </template>
            <template #item.activeRate="{ item }">
              <v-chip
                :color="getActiveRateColor(item.activeClients, item.totalClients)"
                size="small"
              >
                {{ Math.round((item.activeClients / item.totalClients) * 100) }}%
              </v-chip>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </div>

    <!-- No Data State -->
    <v-card v-else-if="!loading && !error" class="pa-12 text-center" elevation="2">
      <v-icon size="80" color="grey">mdi-chart-box-outline</v-icon>
      <div class="text-h5 mt-4">No Analytics Data</div>
      <div class="text-grey mt-2">
        Import contacts via the EzyVet CRM page to see analytics.
      </div>
      <v-btn
        color="primary"
        class="mt-6"
        :to="'/marketing/ezyvet-crm'"
      >
        Go to CRM
      </v-btn>
    </v-card>

    <!-- Error State -->
    <v-alert v-if="error" type="error" class="mt-4">
      {{ error }}
    </v-alert>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

// State
const loading = ref(false)
const error = ref<string | null>(null)
const analytics = ref<any>(null)
const divisions = ref<string[]>([])

// Filters
const filters = ref({
  division: null as string | null,
  startDate: '',
  endDate: ''
})

const hasActiveFilters = computed(() => {
  return filters.value.division || filters.value.startDate || filters.value.endDate
})

// Load analytics data
async function loadAnalytics() {
  loading.value = true
  error.value = null

  try {
    const params = new URLSearchParams()
    if (filters.value.division) params.append('division', filters.value.division)
    if (filters.value.startDate) params.append('startDate', filters.value.startDate)
    if (filters.value.endDate) params.append('endDate', filters.value.endDate)

    const data = await $fetch(`/api/marketing/ezyvet-analytics?${params.toString()}`)
    
    if (data.success) {
      analytics.value = data
      divisions.value = data.divisions || []
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load analytics'
    console.error('Analytics error:', err)
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.value = {
    division: null,
    startDate: '',
    endDate: ''
  }
  loadAnalytics()
}

function printReport() {
  window.print()
}

// ========================================
// CHART CONFIGURATIONS
// ========================================

// Revenue Distribution Chart
const revenueDistributionOptions = computed(() => ({
  chart: {
    type: 'bar',
    toolbar: { show: true }
  },
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '70%',
      borderRadius: 4,
      dataLabels: { position: 'top' }
    }
  },
  dataLabels: {
    enabled: true,
    formatter: (val: number) => val,
    offsetY: -20,
    style: { fontSize: '12px', colors: ['#304758'] }
  },
  xaxis: {
    categories: analytics.value?.revenueDistribution?.map((d: any) => d.label) || [],
    labels: { rotate: -45, style: { fontSize: '11px' } }
  },
  yaxis: {
    title: { text: 'Number of Clients' }
  },
  fill: {
    type: 'gradient',
    gradient: {
      shade: 'light',
      type: 'vertical',
      shadeIntensity: 0.25,
      opacityFrom: 0.85,
      opacityTo: 0.85
    }
  },
  colors: ['#1976D2'],
  title: {
    text: 'How much do clients spend?',
    align: 'center',
    style: { fontSize: '14px', color: '#666' }
  }
}))

const revenueDistributionSeries = computed(() => [{
  name: 'Clients',
  data: analytics.value?.revenueDistribution?.map((d: any) => d.count) || []
}])

// Breed Revenue Chart
const breedOptions = computed(() => ({
  chart: {
    type: 'bar',
    toolbar: { show: true }
  },
  plotOptions: {
    bar: {
      horizontal: true,
      borderRadius: 4,
      dataLabels: { position: 'center' }
    }
  },
  dataLabels: {
    enabled: true,
    formatter: (val: number) => formatCurrency(val),
    style: { fontSize: '11px', colors: ['#fff'] }
  },
  xaxis: {
    categories: analytics.value?.breedData?.map((d: any) => d.breed) || [],
    labels: { formatter: (val: number) => formatCurrencyShort(val) }
  },
  yaxis: {
    labels: { style: { fontSize: '12px' } }
  },
  colors: ['#4CAF50'],
  tooltip: {
    y: { formatter: (val: number) => formatCurrency(val) }
  }
}))

const breedSeries = computed(() => [{
  name: 'Revenue',
  data: analytics.value?.breedData?.map((d: any) => d.totalRevenue) || []
}])

// Recency total for display
const recencyTotal = computed(() => {
  if (!analytics.value?.recencyChart) return 0
  return analytics.value.recencyChart.reduce((sum: number, d: any) => sum + (d.count || 0), 0)
})

// Recency Analysis Chart
const recencyOptions = computed(() => ({
  chart: {
    type: 'bar',
    toolbar: { show: true },
    stacked: false
  },
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '60%',
      borderRadius: 4
    }
  },
  dataLabels: {
    enabled: true,
    formatter: (val: number) => val,
    style: { fontSize: '12px', colors: ['#fff'] }
  },
  xaxis: {
    categories: analytics.value?.recencyChart?.map((d: any) => d.label) || [],
    labels: { rotate: -45, style: { fontSize: '11px' } }
  },
  yaxis: {
    title: { text: 'Number of Clients' }
  },
  colors: analytics.value?.recencyChart?.map((d: any) => d.color) || [],
  fill: { opacity: 1 },
  tooltip: {
    y: { formatter: (val: number) => `${val} clients` }
  }
}))

const recencySeries = computed(() => [{
  name: 'Clients',
  data: analytics.value?.recencyChart?.map((d: any) => d.count) || []
}])

// Division table headers
const divisionHeaders = [
  { title: 'Division', key: 'division', sortable: true },
  { title: 'Total Clients', key: 'totalClients', sortable: true },
  { title: 'Active Clients', key: 'activeClients', sortable: true },
  { title: 'Active Rate', key: 'activeRate', sortable: false },
  { title: 'Total Revenue', key: 'totalRevenue', sortable: true },
  { title: 'Avg Revenue', key: 'avgRevenue', sortable: true }
]

// Department table headers
const departmentHeaders = [
  { title: 'Department', key: 'department', sortable: true },
  { title: 'Total Clients', key: 'totalClients', sortable: true },
  { title: 'Active Clients', key: 'activeClients', sortable: true },
  { title: 'Active Rate', key: 'activeRate', sortable: false },
  { title: 'Total Revenue', key: 'totalRevenue', sortable: true },
  { title: 'Avg Revenue', key: 'avgRevenue', sortable: true }
]

// ========================================
// FORMATTING HELPERS
// ========================================

function formatNumber(num: number): string {
  return num?.toLocaleString() || '0'
}

function formatCurrency(value: number | null): string {
  const num = value || 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num)
}

function formatCurrencyShort(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value}`
}

function getActiveRateColor(active: number, total: number): string {
  if (total === 0) return 'grey'
  const rate = (active / total) * 100
  if (rate >= 80) return 'success'
  if (rate >= 50) return 'warning'
  return 'error'
}

// Initialize
onMounted(() => {
  loadAnalytics()
})
</script>

<style scoped>
.gap-2 {
  gap: 8px;
}

.kpi-card {
  transition: transform 0.2s ease;
}

.kpi-card:hover {
  transform: translateY(-2px);
}

@media print {
  .v-btn {
    display: none !important;
  }
  
  .v-card {
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
</style>
