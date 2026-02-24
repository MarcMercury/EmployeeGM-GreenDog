<template>
  <div class="performance-analysis-page">
    <!-- ═══ Page Header ═══ -->
    <div class="d-flex justify-space-between align-center mb-4">
      <div>
        <h1 class="text-h4 font-weight-bold">Performance Analysis</h1>
        <p class="text-subtitle-2 text-grey">
          Appointment demand, revenue &amp; operational insights across all locations
        </p>
      </div>
      <div class="d-flex gap-2">
        <v-menu>
          <template #activator="{ props }">
            <v-btn v-bind="props" color="primary" prepend-icon="mdi-upload" variant="outlined" size="small">
              Upload Data
            </v-btn>
          </template>
          <v-list density="compact">
            <v-list-subheader class="text-caption">EzyVet Exports</v-list-subheader>
            <v-list-item prepend-icon="mdi-receipt-text" @click="showInvoiceUpload = true">
              <v-list-item-title>Invoice Lines Report</v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-clock-check-outline" @click="showStatusUpload = true">
              <v-list-item-title>Appointment Status Report</v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-table-large" @click="showTrackingUpload = true">
              <v-list-item-title>Appointment Tracking (Batch)</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
        <v-btn color="primary" prepend-icon="mdi-refresh" :loading="loading" size="small" @click="loadData">
          Refresh
        </v-btn>
      </div>
    </div>

    <!-- ═══ Global Filters ═══ -->
    <v-card class="mb-5" elevation="1">
      <v-card-text class="py-3">
        <v-row dense align="center">
          <v-col cols="12" md="3">
            <v-select
              v-model="locationFilter"
              :items="locationOptions"
              label="Location"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              placeholder="All Locations"
            />
          </v-col>
          <v-col cols="6" md="2">
            <v-text-field v-model="dateRange.start" type="date" label="From" density="compact" variant="outlined" hide-details />
          </v-col>
          <v-col cols="6" md="2">
            <v-text-field v-model="dateRange.end" type="date" label="To" density="compact" variant="outlined" hide-details />
          </v-col>
          <v-col cols="12" md="5">
            <div class="d-flex flex-wrap gap-1">
              <v-chip
                v-for="preset in datePresets" :key="preset.label"
                :color="isActivePreset(preset) ? 'primary' : 'default'"
                :variant="isActivePreset(preset) ? 'elevated' : 'outlined'"
                size="small" class="cursor-pointer"
                @click="applyPreset(preset)"
              >
                {{ preset.label }}
              </v-chip>
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- ═══ Loading ═══ -->
    <div v-if="loading" class="text-center pa-12">
      <v-progress-circular indeterminate color="primary" size="48" />
      <p class="text-grey mt-4">Loading analytics...</p>
    </div>

    <template v-else-if="data">
      <!-- ═══ KPI Cards ═══ -->
      <v-row class="mb-5">
        <v-col cols="6" md="3">
          <v-card class="pa-4" elevation="2">
            <div class="d-flex align-center">
              <v-avatar color="deep-purple-darken-1" size="44" class="mr-3">
                <v-icon color="white" size="22">mdi-calendar-check</v-icon>
              </v-avatar>
              <div>
                <div class="text-h5 font-weight-bold">{{ fmt(kpis.totalAppointments) }}</div>
                <div class="text-caption text-grey">Appointments</div>
              </div>
            </div>
          </v-card>
        </v-col>
        <v-col cols="6" md="3">
          <v-card class="pa-4" elevation="2">
            <div class="d-flex align-center">
              <v-avatar color="green-darken-1" size="44" class="mr-3">
                <v-icon color="white" size="22">mdi-currency-usd</v-icon>
              </v-avatar>
              <div>
                <div class="text-h5 font-weight-bold">${{ fmtCur(kpis.totalRevenue) }}</div>
                <div class="text-caption text-grey">Total Revenue</div>
              </div>
            </div>
          </v-card>
        </v-col>
        <v-col cols="6" md="3">
          <v-card class="pa-4" elevation="2">
            <div class="d-flex align-center">
              <v-avatar color="blue-darken-1" size="44" class="mr-3">
                <v-icon color="white" size="22">mdi-account-group</v-icon>
              </v-avatar>
              <div>
                <div class="text-h5 font-weight-bold">{{ fmt(kpis.uniqueClients) }}</div>
                <div class="text-caption text-grey">Unique Clients</div>
              </div>
            </div>
          </v-card>
        </v-col>
        <v-col cols="6" md="3">
          <v-card class="pa-4" elevation="2">
            <div class="d-flex align-center">
              <v-avatar color="orange-darken-1" size="44" class="mr-3">
                <v-icon color="white" size="22">mdi-cash-multiple</v-icon>
              </v-avatar>
              <div>
                <div class="text-h5 font-weight-bold">${{ fmtCur(kpis.avgRevenuePerAppt) }}</div>
                <div class="text-caption text-grey">Revenue / Appointment</div>
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- ═══ Tabs ═══ -->
      <v-tabs v-model="activeTab" color="deep-purple" class="mb-5">
        <v-tab value="overview"><v-icon start size="18">mdi-view-dashboard</v-icon>Overview</v-tab>
        <v-tab value="appointments"><v-icon start size="18">mdi-calendar-check</v-icon>Appointments</v-tab>
        <v-tab value="revenue"><v-icon start size="18">mdi-currency-usd</v-icon>Revenue</v-tab>
      </v-tabs>

      <v-window v-model="activeTab">
        <!-- ═══════════════════════════════════════════════════════════
             OVERVIEW TAB
             ═══════════════════════════════════════════════════════════ -->
        <v-window-item value="overview">
          <!-- Appointments by Location -->
          <v-row class="mb-5">
            <v-col cols="12" md="6">
              <v-card elevation="2">
                <v-card-title class="text-subtitle-1 font-weight-bold pb-0">
                  <v-icon start size="18" class="mr-1">mdi-map-marker</v-icon>
                  Appointments by Location
                </v-card-title>
                <v-card-text>
                  <ClientOnly>
                    <apexchart v-if="hasLocBarData" type="bar" height="280" :options="locBarOptions" :series="locBarSeries" :key="'locbar'+chartKey" />
                  </ClientOnly>
                  <div v-if="!hasLocBarData" class="text-center text-grey pa-8">No data</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card elevation="2">
                <v-card-title class="text-subtitle-1 font-weight-bold pb-0">
                  <v-icon start size="18" class="mr-1">mdi-cash-multiple</v-icon>
                  Revenue per Appointment by Location
                </v-card-title>
                <v-card-text>
                  <ClientOnly>
                    <apexchart v-if="hasRevPerApptData" type="bar" height="280" :options="revPerApptOptions" :series="revPerApptSeries" :key="'rpa'+chartKey" />
                  </ClientOnly>
                  <div v-if="!hasRevPerApptData" class="text-center text-grey pa-8">No data</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Monthly Trend — Revenue + Appointments -->
          <v-card class="mb-5" elevation="2">
            <v-card-title class="text-subtitle-1 font-weight-bold pb-0">
              <v-icon start size="18" class="mr-1">mdi-chart-timeline-variant</v-icon>
              Monthly Trend
              <v-chip class="ml-2" size="x-small" color="green" variant="outlined">Revenue</v-chip>
              <v-chip class="ml-1" size="x-small" color="deep-purple" variant="outlined">Appointments</v-chip>
            </v-card-title>
            <v-card-text>
              <ClientOnly>
                <apexchart v-if="monthlyTrendSeries.length" type="line" height="320" :options="monthlyTrendOptions" :series="monthlyTrendSeries" :key="'mtrend'+chartKey" />
              </ClientOnly>
              <div v-if="!monthlyTrendSeries.length" class="text-center text-grey pa-8">No trend data</div>
            </v-card-text>
          </v-card>

          <!-- Service Category + Day of Week -->
          <v-row class="mb-5">
            <v-col cols="12" md="6">
              <v-card elevation="2">
                <v-card-title class="text-subtitle-1 font-weight-bold pb-0">
                  <v-icon start size="18" class="mr-1">mdi-tag-multiple</v-icon>
                  Service Category Distribution
                </v-card-title>
                <v-card-text>
                  <ClientOnly>
                    <apexchart v-if="svcCatSeries.length" type="donut" height="320" :options="svcCatOptions" :series="svcCatSeries" :key="'svccat'+chartKey" />
                  </ClientOnly>
                  <div v-if="!svcCatSeries.length" class="text-center text-grey pa-8">No data</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card elevation="2">
                <v-card-title class="text-subtitle-1 font-weight-bold pb-0">
                  <v-icon start size="18" class="mr-1">mdi-calendar-week</v-icon>
                  Demand by Day of Week
                </v-card-title>
                <v-card-text>
                  <ClientOnly>
                    <apexchart v-if="dowSeries.length" type="bar" height="320" :options="dowOptions" :series="dowSeries" :key="'dow'+chartKey" />
                  </ClientOnly>
                  <div v-if="!dowSeries.length" class="text-center text-grey pa-8">No data</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-window-item>

        <!-- ═══════════════════════════════════════════════════════════
             APPOINTMENTS TAB
             ═══════════════════════════════════════════════════════════ -->
        <v-window-item value="appointments">
          <!-- Appointment Type Breakdown -->
          <v-card class="mb-5" elevation="2">
            <v-card-title class="text-subtitle-1 font-weight-bold pb-0 d-flex align-center">
              <v-icon start size="18" class="mr-1">mdi-format-list-numbered</v-icon>
              Appointment Types
              <v-spacer />
              <v-select
                v-model="typeLocationFilter"
                :items="['All Locations', ...clinicLocations]"
                density="compact" variant="outlined" hide-details
                style="max-width: 200px"
                class="ml-3"
              />
            </v-card-title>
            <v-card-text>
              <ClientOnly>
                <apexchart v-if="typeSeries[0]?.data?.length" type="bar" height="420" :options="typeOptions" :series="typeSeries" :key="'type'+chartKey+typeLocationFilter" />
              </ClientOnly>
              <div v-if="!typeSeries[0]?.data?.length" class="text-center text-grey pa-8">No appointment type data</div>
            </v-card-text>
          </v-card>

          <!-- Weekly Appointment Volume Trend -->
          <v-card class="mb-5" elevation="2">
            <v-card-title class="text-subtitle-1 font-weight-bold pb-0">
              <v-icon start size="18" class="mr-1">mdi-trending-up</v-icon>
              Weekly Appointment Volume
            </v-card-title>
            <v-card-text>
              <ClientOnly>
                <apexchart v-if="weeklyTrendSeries.length" type="area" height="300" :options="weeklyTrendOptions" :series="weeklyTrendSeries" :key="'wtrend'+chartKey" />
              </ClientOnly>
              <div v-if="!weeklyTrendSeries.length" class="text-center text-grey pa-8">No trend data</div>
            </v-card-text>
          </v-card>

          <!-- Demand by Day of Week (with location comparison) -->
          <v-card class="mb-5" elevation="2">
            <v-card-title class="text-subtitle-1 font-weight-bold pb-0 d-flex align-center">
              <v-icon start size="18" class="mr-1">mdi-calendar-week</v-icon>
              Demand by Day of Week
              <v-spacer />
              <v-select
                v-model="dowLocationFilter"
                :items="dayOfWeekLocationOptions"
                density="compact" variant="outlined" hide-details
                style="max-width: 220px"
                class="ml-3"
              />
            </v-card-title>
            <v-card-text>
              <ClientOnly>
                <apexchart v-if="dowDetailSeries.length" type="bar" height="320" :options="dowDetailOptions" :series="dowDetailSeries" :key="'dowdet'+chartKey+dowLocationFilter" />
              </ClientOnly>
              <div v-if="!dowDetailSeries.length" class="text-center text-grey pa-8">No data</div>
            </v-card-text>
          </v-card>
        </v-window-item>

        <!-- ═══════════════════════════════════════════════════════════
             REVENUE TAB
             ═══════════════════════════════════════════════════════════ -->
        <v-window-item value="revenue">
          <!-- Monthly Revenue by Location -->
          <v-card class="mb-5" elevation="2">
            <v-card-title class="text-subtitle-1 font-weight-bold pb-0">
              <v-icon start size="18" class="mr-1">mdi-chart-line</v-icon>
              Monthly Revenue Trend
            </v-card-title>
            <v-card-text>
              <ClientOnly>
                <apexchart v-if="revTrendSeries.length" type="area" height="320" :options="revTrendOptions" :series="revTrendSeries" :key="'revtrend'+chartKey" />
              </ClientOnly>
              <div v-if="!revTrendSeries.length" class="text-center text-grey pa-8">No revenue data</div>
            </v-card-text>
          </v-card>

          <!-- Top Product Groups + Top Staff -->
          <v-row class="mb-5">
            <v-col cols="12" md="6">
              <v-card elevation="2">
                <v-card-title class="text-subtitle-1 font-weight-bold pb-0">
                  <v-icon start size="18" class="mr-1">mdi-package-variant</v-icon>
                  Top Product Groups
                </v-card-title>
                <v-card-text>
                  <ClientOnly>
                    <apexchart v-if="pgSeries[0]?.data?.length" type="bar" height="380" :options="pgOptions" :series="pgSeries" :key="'pg'+chartKey" />
                  </ClientOnly>
                  <div v-if="!pgSeries[0]?.data?.length" class="text-center text-grey pa-8">No data</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card elevation="2">
                <v-card-title class="text-subtitle-1 font-weight-bold pb-0">
                  <v-icon start size="18" class="mr-1">mdi-account-star</v-icon>
                  Top Staff by Revenue
                </v-card-title>
                <v-card-text>
                  <ClientOnly>
                    <apexchart v-if="staffSeries[0]?.data?.length" type="bar" height="380" :options="staffOptions" :series="staffSeries" :key="'staff'+chartKey" />
                  </ClientOnly>
                  <div v-if="!staffSeries[0]?.data?.length" class="text-center text-grey pa-8">No data</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Revenue per Appointment cross-reference -->
          <v-card class="mb-5" elevation="2">
            <v-card-title class="text-subtitle-1 font-weight-bold pb-0">
              <v-icon start size="18" class="mr-1">mdi-swap-horizontal</v-icon>
              Revenue / Appointment Cross-Reference
            </v-card-title>
            <v-card-text>
              <v-table density="comfortable">
                <thead>
                  <tr>
                    <th>Location</th>
                    <th class="text-right">Appointments</th>
                    <th class="text-right">Revenue</th>
                    <th class="text-right">Rev / Appointment</th>
                    <th class="text-right">Avg Duration (min)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="loc in clinicLocations" :key="loc">
                    <td class="font-weight-medium">{{ loc }}</td>
                    <td class="text-right">{{ fmt(rpaTable[loc]?.appointments || 0) }}</td>
                    <td class="text-right">${{ fmtCur(rpaTable[loc]?.revenue || 0) }}</td>
                    <td class="text-right font-weight-bold">${{ fmtCur(rpaTable[loc]?.perAppt || 0) }}</td>
                    <td class="text-right">{{ data.avgDurationByLocation?.[loc] || '—' }}</td>
                  </tr>
                  <tr class="bg-grey-lighten-4 font-weight-bold">
                    <td>Total / Average</td>
                    <td class="text-right">{{ fmt(kpis.totalAppointments) }}</td>
                    <td class="text-right">${{ fmtCur(kpis.totalRevenue) }}</td>
                    <td class="text-right">${{ fmtCur(kpis.avgRevenuePerAppt) }}</td>
                    <td class="text-right">—</td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-card>
        </v-window-item>
      </v-window>
    </template>

    <div v-else class="text-center pa-12 text-grey">
      <v-icon size="64" color="grey-lighten-1">mdi-chart-areaspline</v-icon>
      <p class="mt-4">No data loaded. Click Refresh to load analytics.</p>
    </div>

    <!-- ═══ UPLOAD DIALOGS ═══ -->

    <!-- Invoice Upload -->
    <v-dialog v-model="showInvoiceUpload" max-width="600" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start>mdi-receipt-text</v-icon>Invoice Lines Upload
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="showInvoiceUpload = false" />
        </v-card-title>
        <v-card-text>
          <v-file-input
            v-model="invFile"
            accept=".csv,.xls,.xlsx,.tsv"
            label="Select Invoice Lines file"
            prepend-icon="mdi-file-table"
            variant="outlined"
            density="compact"
            show-size
          />
          <p class="text-caption text-grey mt-1">Upload EzyVet Invoice Lines export (CSV/XLS/XLSX). Duplicates are automatically skipped.</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showInvoiceUpload = false">Cancel</v-btn>
          <v-btn color="primary" :loading="uploadingInvoice" :disabled="!invFile" @click="uploadInvoice">Upload</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Status Upload -->
    <v-dialog v-model="showStatusUpload" max-width="600" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start>mdi-clock-check-outline</v-icon>Appointment Status Upload
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="showStatusUpload = false" />
        </v-card-title>
        <v-card-text>
          <v-file-input
            v-model="statusFile"
            accept=".xls,.xlsx,.csv"
            label="Select Appointment Status file"
            prepend-icon="mdi-file-table"
            variant="outlined"
            density="compact"
            show-size
          />
          <v-select
            v-model="statusDupAction"
            :items="[{title:'Skip duplicates',value:'skip'},{title:'Replace duplicates',value:'replace'}]"
            label="Duplicate handling"
            density="compact" variant="outlined" class="mt-2"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showStatusUpload = false">Cancel</v-btn>
          <v-btn color="primary" :loading="uploadingStatus" :disabled="!statusFile" @click="uploadStatus">Upload</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Tracking Batch Upload -->
    <v-dialog v-model="showTrackingUpload" max-width="700" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start>mdi-table-large</v-icon>Appointment Tracking — Batch Upload
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="closeTrackingUpload" />
        </v-card-title>
        <v-card-text>
          <v-file-input
            v-model="trackingFiles"
            accept=".csv,.xls,.xlsx"
            label="Select tracking files"
            prepend-icon="mdi-file-multiple"
            variant="outlined"
            density="compact"
            multiple
            show-size
            @update:model-value="onTrackingFilesSelected"
          />
          <v-select
            v-model="trackingDupAction"
            :items="[{title:'Skip duplicates',value:'skip'},{title:'Replace duplicates',value:'replace'}]"
            label="Duplicate handling"
            density="compact" variant="outlined" class="mt-2"
          />

          <!-- File status list -->
          <div v-if="trackingBatch.length" class="mt-3">
            <v-list density="compact" class="pa-0">
              <v-list-item v-for="(f, i) in trackingBatch" :key="i" class="px-0">
                <template #prepend>
                  <v-icon :color="f.status === 'done' ? 'success' : f.status === 'error' ? 'error' : f.status === 'uploading' ? 'primary' : 'grey'" size="18">
                    {{ f.status === 'done' ? 'mdi-check-circle' : f.status === 'error' ? 'mdi-alert-circle' : f.status === 'uploading' ? 'mdi-loading mdi-spin' : 'mdi-circle-outline' }}
                  </v-icon>
                </template>
                <v-list-item-title class="text-body-2">{{ f.name }}</v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                  <template v-if="f.status === 'done'">{{ f.inserted }} inserted, {{ f.skipped }} skipped</template>
                  <template v-else-if="f.status === 'error'">{{ f.error }}</template>
                  <template v-else-if="f.status === 'uploading'">Uploading...</template>
                  <template v-else>Pending</template>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
            <v-progress-linear v-if="trackingProcessing" :model-value="(trackingCurrentIdx + 1) / trackingBatch.length * 100" color="primary" class="mt-2" />
          </div>

          <div v-if="trackingCompleted" class="mt-3">
            <v-alert type="info" variant="tonal" density="compact">
              Batch complete: {{ trackingTotalInserted }} records from {{ trackingBatch.filter(f => f.status === 'done').length }} file(s).
              <template v-if="trackingTotalErrors"> {{ trackingTotalErrors }} file(s) had errors.</template>
            </v-alert>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeTrackingUpload">Close</v-btn>
          <v-btn color="primary" :loading="trackingProcessing" :disabled="!trackingBatch.length || trackingCompleted" @click="runTrackingBatch">
            Upload {{ trackingBatch.length }} File(s)
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000" location="bottom right">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const route = useRoute()

// ── State ────────────────────────────────────────────────────────────────

const loading = ref(false)
const data = ref<any>(null)
const activeTab = ref((route.query.tab as string) || 'overview')
const chartKey = ref(0) // force re-render

// Global filters
const locationFilter = ref<string | null>(null)
const clinicLocations = computed(() => data.value?.locations || ['Sherman Oaks', 'Van Nuys', 'Venice'])
const locationOptions = computed(() => ['All Locations', 'Compare Locations', ...clinicLocations.value])

// Per-chart filters
const typeLocationFilter = ref('All Locations')
const dowLocationFilter = ref('Compare Locations')
const dayOfWeekLocationOptions = computed(() => ['All Locations', 'Compare Locations', ...clinicLocations.value])

// Date range
const now = new Date()
const lastCompleteMonth = new Date(now.getFullYear(), now.getMonth(), 0)
const dateRange = reactive({
  start: new Date(lastCompleteMonth.getTime() - 179 * 86400000).toISOString().split('T')[0],
  end: lastCompleteMonth.toISOString().split('T')[0],
})

const datePresets = [
  { label: 'Last 30d', days: 30 },
  { label: 'Last 90d', days: 90 },
  { label: '6 Months', days: 180 },
  { label: '12 Months', days: 365 },
  { label: 'YTD', days: -1 },
  { label: 'All Time', days: -2 },
]

function isActivePreset(p: { days: number }) {
  if (p.days === -2) return dateRange.start === '2024-01-01'
  if (p.days === -1) return dateRange.start === now.getFullYear() + '-01-01'
  const lcm = lastCompleteMonth
  return dateRange.start === new Date(lcm.getTime() - (p.days - 1) * 86400000).toISOString().split('T')[0]
}

function applyPreset(p: { days: number }) {
  dateRange.end = lastCompleteMonth.toISOString().split('T')[0]
  if (p.days === -2) dateRange.start = '2024-01-01'
  else if (p.days === -1) dateRange.start = now.getFullYear() + '-01-01'
  else dateRange.start = new Date(lastCompleteMonth.getTime() - (p.days - 1) * 86400000).toISOString().split('T')[0]
  loadData()
}

// Upload state
const showInvoiceUpload = ref(false)
const showStatusUpload = ref(false)
const showTrackingUpload = ref(false)
const invFile = ref<File | null>(null)
const statusFile = ref<File | null>(null)
const trackingFiles = ref<File[]>([])
const uploadingInvoice = ref(false)
const uploadingStatus = ref(false)
const statusDupAction = ref('skip')
const trackingDupAction = ref('skip')

interface BatchFile { name: string; file: File; status: 'pending' | 'uploading' | 'done' | 'error'; inserted: number; skipped: number; error: string }
const trackingBatch = ref<BatchFile[]>([])
const trackingProcessing = ref(false)
const trackingCompleted = ref(false)
const trackingCurrentIdx = ref(-1)
const trackingTotalInserted = ref(0)
const trackingTotalErrors = ref(0)

const snackbar = reactive({ show: false, message: '', color: 'success' })

// ── Helpers ──────────────────────────────────────────────────────────────

function fmt(n: number) { return (n || 0).toLocaleString() }
function fmtCur(n: number | string | null) {
  if (n === null || n === undefined) return '0'
  const v = typeof n === 'string' ? parseFloat(n) : n
  return isNaN(v) ? '0' : v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function notify(message: string, color = 'success') { snackbar.message = message; snackbar.color = color; snackbar.show = true }

const LOC_COLORS: Record<string, string> = {
  'Sherman Oaks': '#7C3AED',
  'Van Nuys': '#3B82F6',
  'Venice': '#10B981',
}

// ── KPIs (location-filtered) ─────────────────────────────────────────────

const kpis = computed(() => {
  if (!data.value) return { totalAppointments: 0, totalRevenue: 0, uniqueClients: 0, avgRevenuePerAppt: 0 }
  const loc = locationFilter.value
  if (!loc || loc === 'All Locations' || loc === 'Compare Locations') return data.value.kpis

  const appts = data.value.apptsByLocation?.[loc] || 0
  const rev = data.value.revenueByLocation?.[loc] || 0
  const clients = data.value.clientsByLocation?.[loc] || 0
  return {
    totalAppointments: appts,
    totalRevenue: rev,
    uniqueClients: clients,
    avgRevenuePerAppt: appts > 0 ? Math.round(rev / appts * 100) / 100 : 0,
  }
})

const rpaTable = computed(() => data.value?.revenuePerAppt || {})

// ── Helper: extract location-specific value from byLocation map ─────────

function locVal(byLocation: Record<string, number> | undefined, fallbackTotal: number): number {
  if (!byLocation) return fallbackTotal
  const loc = locationFilter.value
  if (!loc || loc === 'All Locations' || loc === 'Compare Locations') return fallbackTotal
  return byLocation[loc] || 0
}

function isCompare(): boolean {
  return locationFilter.value === 'Compare Locations'
}
function isSingleLoc(): boolean {
  const loc = locationFilter.value
  return !!loc && loc !== 'All Locations' && loc !== 'Compare Locations'
}
function activeLoc(): string {
  return locationFilter.value || ''
}

// ═════════════════════════════════════════════════════════════════════════
// CHART COMPUTEDS — All react to locationFilter
// ═════════════════════════════════════════════════════════════════════════

const CHART_THEME = { theme: 'dark' as const }

// ── Data presence helpers for template ──
const hasLocBarData = computed(() => (locBarSeries.value[0]?.data?.length ?? 0) > 0)
const hasRevPerApptData = computed(() => (revPerApptSeries.value[0]?.data?.length ?? 0) > 0)

// ── Appointments by Location (bar) ──
const locBarSeries = computed(() => {
  if (!data.value) return [{ name: 'Appointments', data: [] }]
  const locs = clinicLocations.value
  return [{ name: 'Appointments', data: locs.map((l: string) => data.value.apptsByLocation?.[l] || 0) }]
})
const locBarOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
  colors: clinicLocations.value.map((l: string) => LOC_COLORS[l] || '#888'),
  plotOptions: { bar: { borderRadius: 6, distributed: true, columnWidth: '55%' } },
  xaxis: { categories: clinicLocations.value },
  yaxis: { title: { text: 'Appointments' } },
  dataLabels: { enabled: true, style: { fontSize: '12px' } },
  tooltip: { ...CHART_THEME },
  legend: { show: false },
}))

// ── Revenue per Appointment by Location ──
const revPerApptSeries = computed(() => {
  if (!data.value?.revenuePerAppt) return [{ name: 'Rev/Appt', data: [] }]
  const rpa = data.value.revenuePerAppt
  return [{ name: 'Rev/Appt', data: clinicLocations.value.map((l: string) => rpa[l]?.perAppt || 0) }]
})
const revPerApptOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
  colors: clinicLocations.value.map((l: string) => LOC_COLORS[l] || '#888'),
  plotOptions: { bar: { borderRadius: 6, distributed: true, columnWidth: '55%' } },
  xaxis: { categories: clinicLocations.value },
  yaxis: { title: { text: 'Revenue ($)' }, labels: { formatter: (v: number) => '$' + Math.round(v) } },
  dataLabels: { enabled: true, formatter: (v: number) => '$' + Math.round(v), style: { fontSize: '12px' } },
  tooltip: { ...CHART_THEME, y: { formatter: (v: number) => '$' + v.toFixed(2) } },
  legend: { show: false },
}))

// ── Monthly Trend (dual-axis: revenue + appointments) ──
const monthlyTrendSeries = computed(() => {
  if (!data.value?.monthlyTrend?.length) return []
  const trend = data.value.monthlyTrend
  const loc = locationFilter.value

  if (isCompare()) {
    // Show each location as separate series
    const series: any[] = []
    for (const l of clinicLocations.value) {
      series.push({
        name: `${l} Revenue`,
        type: 'line',
        data: trend.map((m: any) => m.revenueByLocation?.[l] || 0),
      })
    }
    for (const l of clinicLocations.value) {
      series.push({
        name: `${l} Appts`,
        type: 'column',
        data: trend.map((m: any) => m.appointmentsByLocation?.[l] || 0),
      })
    }
    return series
  }

  return [
    {
      name: 'Revenue',
      type: 'area',
      data: trend.map((m: any) => isSingleLoc() ? (m.revenueByLocation?.[activeLoc()] || 0) : m.revenue),
    },
    {
      name: 'Appointments',
      type: 'column',
      data: trend.map((m: any) => isSingleLoc() ? (m.appointmentsByLocation?.[activeLoc()] || 0) : m.appointments),
    },
  ]
})
const monthlyTrendOptions = computed(() => {
  const labels = (data.value?.monthlyTrend || []).map((m: any) => m.label)
  const isComp = isCompare()

  return {
    chart: { toolbar: { show: false }, fontFamily: 'inherit', stacked: false },
    colors: isComp
      ? [...clinicLocations.value.map((l: string) => LOC_COLORS[l] || '#888'), ...clinicLocations.value.map((l: string) => LOC_COLORS[l] || '#888')]
      : ['#10B981', '#7C3AED'],
    stroke: { width: isComp ? [2, 2, 2, 0, 0, 0] : [2, 0], curve: 'smooth' as const },
    fill: isComp ? {} : { type: ['gradient', 'solid'], gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
    xaxis: { categories: labels, labels: { rotate: -45, style: { fontSize: '10px' } } },
    yaxis: isComp ? [
      { title: { text: 'Revenue ($)' }, labels: { formatter: (v: number) => '$' + (v / 1000).toFixed(0) + 'k' } },
    ] : [
      { title: { text: 'Revenue ($)' }, labels: { formatter: (v: number) => '$' + (v / 1000).toFixed(0) + 'k' } },
      { opposite: true, title: { text: 'Appointments' } },
    ],
    dataLabels: { enabled: false },
    tooltip: { ...CHART_THEME, shared: true },
    legend: { position: 'top' as const, fontSize: '11px' },
    plotOptions: { bar: { borderRadius: 3, columnWidth: isComp ? '80%' : '50%' } },
  }
})

// ── Service Category Distribution (donut) ──
const svcCatSeries = computed(() => {
  if (!data.value?.serviceCategories?.length) return []
  return data.value.serviceCategories.map((c: any) => locVal(c.byLocation, c.total))
    .filter((v: number) => v > 0)
})
const svcCatOptions = computed(() => {
  const cats = (data.value?.serviceCategories || [])
    .filter((c: any) => locVal(c.byLocation, c.total) > 0)
  return {
    chart: { type: 'donut', fontFamily: 'inherit' },
    labels: cats.map((c: any) => c.category),
    colors: ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#8B5CF6', '#14B8A6', '#F97316'],
    legend: { position: 'bottom' as const, fontSize: '11px' },
    dataLabels: { enabled: true, formatter: (val: number) => `${Math.round(val)}%` },
    tooltip: { ...CHART_THEME },
  }
})

// ── Day of Week (overview — always compare locations) ──
const dowSeries = computed(() => {
  if (!data.value?.dayOfWeek?.length) return []
  if (isSingleLoc()) {
    return [{ name: activeLoc(), data: data.value.dayOfWeek.map((d: any) => d.byLocation?.[activeLoc()] || 0) }]
  }
  // Compare mode: one series per location
  return clinicLocations.value.map((loc: string) => ({
    name: loc,
    data: data.value.dayOfWeek.map((d: any) => d.byLocation?.[loc] || 0),
  }))
})
const dowOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
  colors: isSingleLoc() ? [LOC_COLORS[activeLoc()] || '#888'] : clinicLocations.value.map((l: string) => LOC_COLORS[l]),
  xaxis: { categories: (data.value?.dayOfWeek || []).map((d: any) => d.day?.substring(0, 3)) },
  yaxis: { title: { text: 'Appointments' } },
  plotOptions: { bar: { borderRadius: 3, columnWidth: '60%' } },
  dataLabels: { enabled: true, style: { fontSize: '10px' } },
  tooltip: { ...CHART_THEME },
  legend: { position: 'top' as const, fontSize: '11px' },
}))

// ── Appointment Types (Appointments tab, with its own location filter) ──
const typeSeries = computed(() => {
  if (!data.value?.appointmentTypes?.length) return [{ name: 'Count', data: [] }]
  const locF = typeLocationFilter.value
  const top = data.value.appointmentTypes.slice(0, 20)
  if (locF === 'All Locations') {
    return [{ name: 'All Locations', data: top.map((t: any) => t.total) }]
  }
  return [{ name: locF, data: top.map((t: any) => t.byLocation?.[locF] || 0) }]
})
const typeOptions = computed(() => {
  const top = (data.value?.appointmentTypes || []).slice(0, 20)
  return {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
    colors: ['#7C3AED'],
    plotOptions: { bar: { borderRadius: 4, horizontal: true } },
    xaxis: { title: { text: 'Count' } },
    yaxis: { labels: { style: { fontSize: '11px' }, maxWidth: 200 } },
    dataLabels: { enabled: true, style: { fontSize: '10px' } },
    tooltip: { ...CHART_THEME },
    labels: top.map((t: any) => t.type),
  }
})

// ── Weekly Appointment Trend ──
const weeklyTrendSeries = computed(() => {
  if (!data.value?.weeklyTrend?.length) return []
  const trend = data.value.weeklyTrend

  if (isCompare()) {
    return clinicLocations.value.map((loc: string) => ({
      name: loc,
      data: trend.map((w: any) => w.byLocation?.[loc] || 0),
    }))
  }

  return [{
    name: isSingleLoc() ? activeLoc() : 'All Locations',
    data: trend.map((w: any) => isSingleLoc() ? (w.byLocation?.[activeLoc()] || 0) : w.total),
  }]
})
const weeklyTrendOptions = computed(() => ({
  chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit' },
  colors: isCompare()
    ? clinicLocations.value.map((l: string) => LOC_COLORS[l])
    : [isSingleLoc() ? (LOC_COLORS[activeLoc()] || '#7C3AED') : '#7C3AED'],
  fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
  stroke: { curve: 'smooth' as const, width: 2 },
  xaxis: {
    categories: (data.value?.weeklyTrend || []).map((w: any) => w.week),
    labels: { rotate: -45, style: { fontSize: '10px' } },
  },
  yaxis: { title: { text: 'Appointments' } },
  dataLabels: { enabled: false },
  tooltip: { ...CHART_THEME, shared: true },
  legend: { position: 'top' as const, fontSize: '11px' },
}))

// ── Day of Week Detail (Appointments tab — with its own location dropdown) ──
const dowDetailSeries = computed(() => {
  if (!data.value?.dayOfWeek?.length) return []
  const locF = dowLocationFilter.value

  if (locF === 'Compare Locations') {
    return clinicLocations.value.map((loc: string) => ({
      name: loc,
      data: data.value.dayOfWeek.map((d: any) => d.byLocation?.[loc] || 0),
    }))
  }
  if (locF === 'All Locations') {
    return [{ name: 'All Locations', data: data.value.dayOfWeek.map((d: any) => d.total) }]
  }
  return [{ name: locF, data: data.value.dayOfWeek.map((d: any) => d.byLocation?.[locF] || 0) }]
})
const dowDetailOptions = computed(() => {
  const locF = dowLocationFilter.value
  const isComp = locF === 'Compare Locations'
  return {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
    colors: isComp
      ? clinicLocations.value.map((l: string) => LOC_COLORS[l])
      : [locF !== 'All Locations' ? (LOC_COLORS[locF] || '#3B82F6') : '#3B82F6'],
    xaxis: { categories: (data.value?.dayOfWeek || []).map((d: any) => d.day?.substring(0, 3)) },
    yaxis: { title: { text: 'Appointments' } },
    plotOptions: { bar: { borderRadius: 4, columnWidth: isComp ? '80%' : '50%' } },
    dataLabels: { enabled: true, style: { fontSize: '10px' } },
    tooltip: { ...CHART_THEME },
    legend: { position: 'top' as const, fontSize: '11px', show: isComp },
  }
})

// ── Revenue Trend (Revenue tab) ──
const revTrendSeries = computed(() => {
  if (!data.value?.monthlyTrend?.length) return []
  const trend = data.value.monthlyTrend

  if (isCompare()) {
    return clinicLocations.value.map((loc: string) => ({
      name: loc,
      data: trend.map((m: any) => m.revenueByLocation?.[loc] || 0),
    }))
  }
  return [{
    name: isSingleLoc() ? activeLoc() : 'All Locations',
    data: trend.map((m: any) => isSingleLoc() ? (m.revenueByLocation?.[activeLoc()] || 0) : m.revenue),
  }]
})
const revTrendOptions = computed(() => ({
  chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit' },
  colors: isCompare()
    ? clinicLocations.value.map((l: string) => LOC_COLORS[l])
    : [isSingleLoc() ? (LOC_COLORS[activeLoc()] || '#10B981') : '#10B981'],
  fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
  stroke: { curve: 'smooth' as const, width: 2 },
  xaxis: {
    categories: (data.value?.monthlyTrend || []).map((m: any) => m.label),
    labels: { rotate: -45, style: { fontSize: '10px' } },
  },
  yaxis: { title: { text: 'Revenue ($)' }, labels: { formatter: (v: number) => '$' + (v / 1000).toFixed(0) + 'k' } },
  dataLabels: { enabled: false },
  tooltip: { ...CHART_THEME, shared: true, y: { formatter: (v: number) => '$' + (v || 0).toLocaleString() } },
  legend: { position: 'top' as const, fontSize: '11px' },
}))

// ── Product Groups (Revenue tab) ──
const pgSeries = computed(() => {
  if (!data.value?.topProductGroups?.length) return [{ name: 'Revenue', data: [] }]
  const pgs = data.value.topProductGroups.slice(0, 12)

  if (isSingleLoc()) {
    return [{ name: activeLoc(), data: pgs.map((p: any) => p.byLocation?.[activeLoc()] || 0) }]
  }
  if (isCompare()) {
    return clinicLocations.value.map((loc: string) => ({
      name: loc,
      data: pgs.map((p: any) => p.byLocation?.[loc] || 0),
    }))
  }
  return [{ name: 'All Locations', data: pgs.map((p: any) => p.revenue) }]
})
const pgOptions = computed(() => {
  const pgs = (data.value?.topProductGroups || []).slice(0, 12)
  return {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', stacked: isCompare() },
    colors: isCompare()
      ? clinicLocations.value.map((l: string) => LOC_COLORS[l])
      : [isSingleLoc() ? (LOC_COLORS[activeLoc()] || '#3B82F6') : '#3B82F6'],
    plotOptions: { bar: { borderRadius: 3, horizontal: true } },
    xaxis: { title: { text: 'Revenue ($)' }, labels: { formatter: (v: number) => '$' + (v / 1000).toFixed(0) + 'k' } },
    yaxis: { labels: { style: { fontSize: '10px' }, maxWidth: 180 } },
    dataLabels: { enabled: false },
    tooltip: { ...CHART_THEME, y: { formatter: (v: number) => '$' + (v || 0).toLocaleString() } },
    legend: { position: 'top' as const, fontSize: '11px', show: isCompare() },
    labels: pgs.map((p: any) => p.group),
  }
})

// ── Top Staff (Revenue tab) ──
const staffSeries = computed(() => {
  if (!data.value?.topStaff?.length) return [{ name: 'Revenue', data: [] }]
  let staffList = data.value.topStaff

  if (isSingleLoc()) {
    staffList = staffList.filter((s: any) => (s.byLocation?.[activeLoc()] || 0) > 0)
      .sort((a: any, b: any) => (b.byLocation?.[activeLoc()] || 0) - (a.byLocation?.[activeLoc()] || 0))
    return [{ name: activeLoc(), data: staffList.slice(0, 15).map((s: any) => s.byLocation?.[activeLoc()] || 0) }]
  }
  return [{ name: 'All Locations', data: staffList.slice(0, 15).map((s: any) => s.revenue) }]
})
const staffOptions = computed(() => {
  let staffList = data.value?.topStaff || []
  if (isSingleLoc()) {
    staffList = staffList.filter((s: any) => (s.byLocation?.[activeLoc()] || 0) > 0)
      .sort((a: any, b: any) => (b.byLocation?.[activeLoc()] || 0) - (a.byLocation?.[activeLoc()] || 0))
  }
  return {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
    colors: [isSingleLoc() ? (LOC_COLORS[activeLoc()] || '#EC4899') : '#EC4899'],
    plotOptions: { bar: { borderRadius: 3, horizontal: true } },
    xaxis: { title: { text: 'Revenue ($)' }, labels: { formatter: (v: number) => '$' + (v / 1000).toFixed(0) + 'k' } },
    yaxis: { labels: { style: { fontSize: '10px' }, maxWidth: 180 } },
    dataLabels: { enabled: false },
    tooltip: { ...CHART_THEME, y: { formatter: (v: number) => '$' + (v || 0).toLocaleString() } },
    labels: staffList.slice(0, 15).map((s: any) => s.name),
  }
})

// ── Data Loading ─────────────────────────────────────────────────────────

let _debounce: ReturnType<typeof setTimeout> | null = null

async function loadData() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (dateRange.start) params.set('startDate', dateRange.start)
    if (dateRange.end) params.set('endDate', dateRange.end)
    data.value = await $fetch(`/api/analytics/performance?${params.toString()}`)
    chartKey.value++
  } catch (err: any) {
    notify('Failed to load data: ' + (err.data?.message || err.message || 'Unknown'), 'error')
  } finally {
    loading.value = false
  }
}

watch(() => [dateRange.start, dateRange.end], () => {
  if (_debounce) clearTimeout(_debounce)
  _debounce = setTimeout(() => loadData(), 500)
})

// ── Upload Functions ─────────────────────────────────────────────────────

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const raw = reader.result as string
      const parts = raw.split(',')
      resolve(parts.length > 1 ? parts[1] as string : raw)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function uploadInvoice() {
  if (!invFile.value) return
  uploadingInvoice.value = true
  try {
    const fileData = await fileToBase64(invFile.value)
    const result = await $fetch('/api/invoices/upload', { method: 'POST', body: { fileData, fileName: invFile.value.name } }) as any
    notify(`Uploaded ${result.inserted || 0} invoice lines. ${result.duplicatesSkipped || 0} duplicates skipped.`)
    showInvoiceUpload.value = false; invFile.value = null
    await loadData()
  } catch (err: any) { notify('Upload failed: ' + (err.data?.message || err.message), 'error') }
  finally { uploadingInvoice.value = false }
}

async function uploadStatus() {
  if (!statusFile.value) return
  uploadingStatus.value = true
  try {
    const fileData = await fileToBase64(statusFile.value)
    const result = await $fetch('/api/appointments/upload-status', { method: 'POST', body: { fileData, fileName: statusFile.value.name, duplicateAction: statusDupAction.value } }) as any
    notify(`Uploaded ${result.inserted || 0} status records.`)
    showStatusUpload.value = false; statusFile.value = null
    await loadData()
  } catch (err: any) { notify('Upload failed: ' + (err.data?.message || err.message), 'error') }
  finally { uploadingStatus.value = false }
}

function onTrackingFilesSelected(files: File | File[] | null) {
  const list = Array.isArray(files) ? files : files ? [files] : []
  trackingBatch.value = list.map(f => ({ name: f.name, file: f, status: 'pending', inserted: 0, skipped: 0, error: '' }))
  trackingCompleted.value = false
  trackingCurrentIdx.value = -1
  trackingTotalInserted.value = 0
  trackingTotalErrors.value = 0
}

function closeTrackingUpload() {
  showTrackingUpload.value = false
  trackingFiles.value = []
  trackingBatch.value = []
  trackingProcessing.value = false
  trackingCompleted.value = false
  if (trackingTotalInserted.value > 0) loadData()
}

async function runTrackingBatch() {
  if (!trackingBatch.value.length) return
  trackingProcessing.value = true
  trackingCompleted.value = false
  trackingTotalInserted.value = 0
  trackingTotalErrors.value = 0

  const batch = trackingBatch.value
  for (let idx = 0; idx < batch.length; idx++) {
    const entry = batch[idx] as BatchFile
    trackingCurrentIdx.value = idx
    entry.status = 'uploading'
    try {
      const fileData = await fileToBase64(entry.file)
      const res = await $fetch('/api/appointments/upload-tracking', {
        method: 'POST',
        body: { fileData, fileName: entry.name, duplicateAction: trackingDupAction.value },
      }) as any
      entry.status = 'done'
      entry.inserted = res.inserted || 0
      entry.skipped = res.skippedDuplicates || 0
      trackingTotalInserted.value += entry.inserted
    } catch (err: any) {
      entry.status = 'error'
      entry.error = err.data?.message || err.message || 'Failed'
      trackingTotalErrors.value++
    }
  }
  trackingProcessing.value = false
  trackingCompleted.value = true
  notify(`Batch complete: ${trackingTotalInserted.value} records from ${trackingBatch.value.filter(f => f.status === 'done').length} file(s).`,
    trackingTotalErrors.value ? 'warning' : 'success')
}

// ── Init ─────────────────────────────────────────────────────────────────

onMounted(() => { loadData() })
</script>

<style scoped>
.performance-analysis-page { max-width: 1400px; margin: 0 auto; }
.cursor-pointer { cursor: pointer; }
</style>
