<template>
  <div class="practice-analytics-page">
    <!-- Page Header -->
    <div class="d-flex justify-space-between align-center mb-4">
      <div>
        <h1 class="text-h4 font-weight-bold">Practice Analytics</h1>
        <p class="text-subtitle-2 text-grey">
          Unified performance metrics — revenue, appointments &amp; clients across all locations
        </p>
        <div v-if="syncStatus" class="text-caption mt-1" :class="syncStatus.isStale ? 'text-warning' : 'text-success'">
          <v-icon size="14" class="mr-1">{{ syncStatus.hasApiData ? 'mdi-cloud-check' : 'mdi-cloud-off-outline' }}</v-icon>
          {{ syncStatus.hasApiData ? `Auto-sync active (${syncStatus.mode})` : 'Manual mode — configure ezyVet API for auto-sync' }}
          <span v-if="syncStatus.isStale && syncStatus.hasApiData" class="ml-1 text-warning">(data may be stale)</span>
        </div>
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
        <v-btn color="success" prepend-icon="mdi-cloud-sync" :loading="syncing" size="small" @click="syncAll">
          Sync All
        </v-btn>
        <v-btn color="primary" variant="outlined" prepend-icon="mdi-printer" size="small" @click="printReport">
          Print
        </v-btn>
        <v-btn color="primary" prepend-icon="mdi-refresh" :loading="loading" size="small" @click="loadAll">
          Refresh
        </v-btn>
      </div>
    </div>

    <!-- Global Filters -->
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
          <v-col cols="6" md="3">
            <v-text-field v-model="dateRange.start" type="date" label="From" density="compact" variant="outlined" hide-details />
          </v-col>
          <v-col cols="6" md="3">
            <v-text-field v-model="dateRange.end" type="date" label="To" density="compact" variant="outlined" hide-details />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Loading -->
    <div v-if="loading" class="text-center pa-12">
      <v-progress-circular indeterminate color="primary" size="56" />
      <p class="text-grey mt-4">Loading analytics...</p>
    </div>

    <template v-else-if="hasData">
      <!-- ═══ KPI Cards ═══ -->
      <v-row class="mb-5">
        <v-col cols="6" md="3">
          <v-card class="pa-4" elevation="2">
            <div class="d-flex align-center">
              <v-avatar color="green-darken-1" size="44" class="mr-3">
                <v-icon color="white" size="22">mdi-currency-usd</v-icon>
              </v-avatar>
              <div>
                <div class="text-h5 font-weight-bold">${{ fmtCur(kpis.totalRevenue) }}</div>
                <div class="text-caption text-grey">Total Revenue</div>
                <v-chip
                  v-if="overviewData?.kpis?.revenue?.revenueChangePct"
                  :color="overviewData.kpis.revenue.revenueChangePct > 0 ? 'success' : 'error'"
                  size="x-small" label class="mt-1"
                >
                  {{ overviewData.kpis.revenue.revenueChangePct > 0 ? '+' : '' }}{{ overviewData.kpis.revenue.revenueChangePct }}%
                </v-chip>
              </div>
            </div>
          </v-card>
        </v-col>
        <v-col cols="6" md="3">
          <v-card class="pa-4" elevation="2">
            <div class="d-flex align-center">
              <v-avatar color="deep-purple-darken-1" size="44" class="mr-3">
                <v-icon color="white" size="22">mdi-calendar-check</v-icon>
              </v-avatar>
              <div>
                <div class="text-h5 font-weight-bold">{{ fmt(kpis.totalAppointments) }}</div>
                <div class="text-caption text-grey">Appointments</div>
                <div v-if="avgApptsPerDay > 0" class="text-caption text-grey">
                  {{ fmtDec(avgApptsPerDay) }}/day avg
                </div>
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
                <div class="text-caption text-grey">from invoices in range</div>
              </div>
            </div>
          </v-card>
        </v-col>
        <v-col cols="6" md="3">
          <v-card class="pa-4" elevation="2">
            <div class="d-flex align-center">
              <v-avatar color="teal-darken-1" size="44" class="mr-3">
                <v-icon color="white" size="22">mdi-receipt-text-outline</v-icon>
              </v-avatar>
              <div>
                <div class="text-h5 font-weight-bold">${{ fmtCur(kpis.avgRevenuePerAppt) }}</div>
                <div class="text-caption text-grey">Revenue / Appointment</div>
                <div class="text-caption text-grey">{{ fmt(overviewData?.kpis?.revenue?.uniqueInvoices || 0) }} invoices</div>
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Secondary KPIs (all derived from date-filtered data) -->
      <v-row class="mb-5">
        <v-col cols="6" sm="3">
          <v-card class="pa-3" elevation="1">
            <div class="text-h6 font-weight-bold">${{ fmtCur(avgRevenuePerDay) }}</div>
            <div class="text-caption text-grey">Avg Revenue / Day</div>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card class="pa-3" elevation="1">
            <div class="text-h6 font-weight-bold">{{ fmtDec(avgApptsPerDay) }}</div>
            <div class="text-caption text-grey">Avg Appointments / Day</div>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card class="pa-3" elevation="1">
            <div class="text-h6 font-weight-bold">{{ fmt(overviewData?.kpis?.revenue?.uniqueInvoices || 0) }}</div>
            <div class="text-caption text-grey">Unique Invoices</div>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card class="pa-3" elevation="1">
            <div class="text-h6 font-weight-bold">{{ daysInRange }}</div>
            <div class="text-caption text-grey">Days in Range</div>
          </v-card>
        </v-col>
      </v-row>

      <!-- ═══ TABS ═══ -->
      <v-tabs v-model="activeTab" color="deep-purple" class="mb-5">
        <v-tab value="overview"><v-icon start size="18">mdi-view-dashboard</v-icon>Overview</v-tab>
        <v-tab value="appointments"><v-icon start size="18">mdi-calendar-check</v-icon>Appointments</v-tab>
        <v-tab value="revenue"><v-icon start size="18">mdi-currency-usd</v-icon>Revenue</v-tab>
        <v-tab value="actions"><v-icon start size="18">mdi-lightbulb-on</v-icon>Recommended Actions</v-tab>
      </v-tabs>

      <v-window v-model="activeTab">

        <!-- ══════════════════════════════════════════════════════
             OVERVIEW TAB
             ══════════════════════════════════════════════════════ -->
        <v-window-item value="overview">
          <!-- Location Comparison -->
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

          <!-- Monthly Trend — Dual axis: Revenue + Appointments -->
          <v-card class="mb-5" elevation="2">
            <v-card-title class="text-subtitle-1 font-weight-bold pb-0">
              <v-icon start size="18" class="mr-1">mdi-chart-timeline-variant</v-icon>
              Monthly Trend
              <v-chip class="ml-2" size="x-small" color="green" variant="outlined">Revenue (Sep 2025+)</v-chip>
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

        <!-- ══════════════════════════════════════════════════════
             APPOINTMENTS TAB
             ══════════════════════════════════════════════════════ -->
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
                style="max-width: 200px" class="ml-3"
              />
            </v-card-title>
            <v-card-text>
              <ClientOnly>
                <apexchart v-if="typeSeries[0]?.data?.length" type="bar" height="420" :options="typeOptions" :series="typeSeries" :key="'type'+chartKey+typeLocationFilter" />
              </ClientOnly>
              <div v-if="!typeSeries[0]?.data?.length" class="text-center text-grey pa-8">No appointment type data</div>
            </v-card-text>
          </v-card>

          <!-- Weekly Volume Trend -->
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

          <!-- Day of Week Detail -->
          <v-card class="mb-5" elevation="2">
            <v-card-title class="text-subtitle-1 font-weight-bold pb-0 d-flex align-center">
              <v-icon start size="18" class="mr-1">mdi-calendar-week</v-icon>
              Demand by Day of Week
              <v-spacer />
              <v-select
                v-model="dowLocationFilter"
                :items="dayOfWeekLocationOptions"
                density="compact" variant="outlined" hide-details
                style="max-width: 220px" class="ml-3"
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

        <!-- ══════════════════════════════════════════════════════
             REVENUE TAB
             ══════════════════════════════════════════════════════ -->
        <v-window-item value="revenue">
          <!-- Monthly Revenue Trend -->
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

          <!-- Department Revenue + Product Groups -->
          <v-row class="mb-5">
            <v-col cols="12" md="6">
              <v-card elevation="2">
                <v-card-title class="text-subtitle-1 font-weight-bold pb-0">
                  <v-icon start size="18" class="mr-1">mdi-chart-donut</v-icon>
                  Revenue by Department
                </v-card-title>
                <v-card-text>
                  <ClientOnly>
                    <apexchart
                      v-if="deptDonutSeries.length"
                      type="donut" height="300"
                      :options="deptDonutOptions"
                      :series="deptDonutSeries"
                      :key="'dept'+chartKey"
                    />
                  </ClientOnly>
                  <div v-if="!deptDonutSeries.length" class="text-center text-grey pa-8">No department data</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card elevation="2">
                <v-card-title class="text-subtitle-1 font-weight-bold pb-0">
                  <v-icon start size="18" class="mr-1">mdi-package-variant</v-icon>
                  Top Product Groups
                </v-card-title>
                <v-card-text>
                  <ClientOnly>
                    <apexchart v-if="pgSeries[0]?.data?.length" type="bar" height="300" :options="pgOptions" :series="pgSeries" :key="'pg'+chartKey" />
                  </ClientOnly>
                  <div v-if="!pgSeries[0]?.data?.length" class="text-center text-grey pa-8">No data</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Top Staff -->
          <v-card class="mb-5" elevation="2">
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

          <!-- Revenue / Appointment Cross-Reference Table -->
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
                    <td class="text-right">{{ perfData?.avgDurationByLocation?.[loc] || '—' }}</td>
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

        <!-- ══════════════════════════════════════════════════════
             RECOMMENDED ACTIONS TAB
             ══════════════════════════════════════════════════════ -->
        <v-window-item value="actions">
          <!-- Data Source Status -->
          <v-card class="mb-5" elevation="2">
            <v-card-title class="text-subtitle-1 font-weight-bold pb-0">
              <v-icon start size="18" class="mr-1">mdi-database-sync</v-icon>
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

          <!-- Actionable Insights -->
          <v-card class="mb-5" elevation="2">
            <v-card-title class="text-subtitle-1 font-weight-bold pb-0">
              <v-icon start size="18" class="mr-1">mdi-lightbulb-on-outline</v-icon>
              Insights &amp; Actions
            </v-card-title>
            <v-card-text>
              <v-list density="compact">
                <v-list-item v-if="weakestLocation" prepend-icon="mdi-map-marker-alert" class="text-info">
                  <v-list-item-title class="font-weight-medium">{{ weakestLocation.name }} has lowest rev/appt (${{ fmtCur(weakestLocation.perAppt) }})</v-list-item-title>
                  <v-list-item-subtitle>Review appointment mix and upsell opportunities at this location.</v-list-item-subtitle>
                </v-list-item>
                <v-list-item v-if="slowestDay" prepend-icon="mdi-calendar-clock" class="text-info">
                  <v-list-item-title class="font-weight-medium">{{ slowestDay }} is the slowest weekday</v-list-item-title>
                  <v-list-item-subtitle>Consider promotions or shifting availability to boost this day.</v-list-item-subtitle>
                </v-list-item>

                <v-list-item v-if="!overviewData && !perfData" prepend-icon="mdi-database-off" class="text-grey">
                  <v-list-item-title class="font-weight-medium">No data loaded</v-list-item-title>
                  <v-list-item-subtitle>Upload data or sync from ezyVet to see recommendations.</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>

          <!-- Quick Links -->
          <v-card class="mb-5" elevation="1">
            <v-card-title class="text-subtitle-1 font-weight-bold pb-0">
              <v-icon start size="18" class="mr-1">mdi-link-variant</v-icon>
              Related Pages
            </v-card-title>
            <v-card-text>
              <v-row dense>
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
                <v-col cols="12" sm="6" md="3">
                  <NuxtLink to="/marketing/sauron" class="text-decoration-none">
                    <v-card class="pa-4 text-center" elevation="1" hover>
                      <v-icon size="32" color="deep-purple">mdi-eye</v-icon>
                      <div class="text-body-2 mt-2">Sauron Dashboard</div>
                    </v-card>
                  </NuxtLink>
                </v-col>
                <v-col cols="12" sm="6" md="3">
                  <NuxtLink to="/marketing/ezyvet-integration" class="text-decoration-none">
                    <v-card class="pa-4 text-center" elevation="1" hover>
                      <v-icon size="32" color="green">mdi-api</v-icon>
                      <div class="text-body-2 mt-2">ezyVet Integration</div>
                    </v-card>
                  </NuxtLink>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-window-item>
      </v-window>
    </template>

    <!-- No Data State -->
    <v-card v-else-if="!loading && !error" class="pa-12 text-center" elevation="2">
      <v-icon size="80" color="grey">mdi-chart-areaspline</v-icon>
      <div class="text-h5 mt-4">No Analytics Data</div>
      <div class="text-grey mt-2 mb-6">
        Sync from ezyVet or upload CSV data to populate the dashboard.
      </div>
      <v-btn color="success" prepend-icon="mdi-cloud-sync" :loading="syncing" @click="syncAll">
        Sync All Data from ezyVet
      </v-btn>
    </v-card>

    <!-- Error -->
    <v-alert v-if="error" type="error" class="mt-4" closable @click:close="error = null">{{ error }}</v-alert>

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
            variant="outlined" density="compact" show-size
          />
          <p class="text-caption text-grey mt-1">Upload EzyVet Invoice Lines export (CSV/XLS/XLSX). File is parsed locally then uploaded in batches. Duplicates are automatically skipped.</p>
          <div v-if="uploadProgress.total > 0" class="mt-3">
            <v-progress-linear :model-value="uploadProgress.pct" color="primary" height="8" rounded class="mb-1" />
            <div class="text-caption text-grey">{{ uploadProgress.status }}</div>
          </div>
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
            variant="outlined" density="compact" show-size
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
            variant="outlined" density="compact" multiple show-size
            @update:model-value="onTrackingFilesSelected"
          />
          <v-select
            v-model="trackingDupAction"
            :items="[{title:'Skip duplicates',value:'skip'},{title:'Replace duplicates',value:'replace'}]"
            label="Duplicate handling"
            density="compact" variant="outlined" class="mt-2"
          />
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
definePageMeta({ layout: 'default', middleware: ['auth', 'marketing-admin'] })

const route = useRoute()

// ── State ────────────────────────────────────────────────────────────────

const loading = ref(false)
const syncing = ref(false)
const error = ref<string | null>(null)

// Two API responses: performance (location-based) and practice-overview (client/referral/sync)
const perfData = ref<any>(null)
const overviewData = ref<any>(null)

const activeTab = ref((route.query.tab as string) || 'overview')
const chartKey = ref(0)

// Location filter
const locationFilter = ref<string | null>(null)
const clinicLocations = computed(() => perfData.value?.locations || ['Sherman Oaks', 'Van Nuys', 'Venice'])
const locationOptions = computed(() => ['All Locations', 'Compare Locations', ...clinicLocations.value])

// Per-chart filters
const typeLocationFilter = ref('All Locations')
const dowLocationFilter = ref('Compare Locations')
const dayOfWeekLocationOptions = computed(() => ['All Locations', 'Compare Locations', ...clinicLocations.value])

// Date range — default to full range of imported data
const dateRange = reactive({
  start: '2025-01-01',
  end: new Date().toISOString().split('T')[0],
})

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
function fmtDec(n: number) { return (n || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) }
function fmtCur(n: number | string | null) {
  if (n === null || n === undefined) return '0'
  const v = typeof n === 'string' ? parseFloat(n) : n
  return isNaN(v) ? '0' : v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function formatDateTime(d: string | null): string {
  if (!d) return 'Never'
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
function printReport() { window.print() }
function notify(message: string, color = 'success') { snackbar.message = message; snackbar.color = color; snackbar.show = true }

const LOC_COLORS: Record<string, string> = {
  'Sherman Oaks': '#7C3AED',
  'Van Nuys': '#3B82F6',
  'Venice': '#10B981',
}

// ── Combined data presence ───────────────────────────────────────────────

const hasData = computed(() => !!perfData.value || !!overviewData.value)
const syncStatus = computed(() => overviewData.value?.syncStatus || null)

// ── KPIs — single source of truth from performance API (location-accurate) ──

const kpis = computed(() => {
  if (!perfData.value) {
    // Fallback to overview data if performance unavailable
    const ov = overviewData.value
    if (!ov) return { totalAppointments: 0, totalRevenue: 0, uniqueClients: 0, avgRevenuePerAppt: 0 }
    return {
      totalAppointments: ov.kpis?.appointments?.totalAppointments || 0,
      totalRevenue: ov.kpis?.revenue?.totalRevenue || 0,
      uniqueClients: ov.kpis?.clients?.activeContacts || 0,
      avgRevenuePerAppt: 0,
    }
  }
  const loc = locationFilter.value
  if (!loc || loc === 'All Locations' || loc === 'Compare Locations') return perfData.value.kpis
  const appts = perfData.value.apptsByLocation?.[loc] || 0
  const rev = perfData.value.revenueByLocation?.[loc] || 0
  return {
    totalAppointments: appts,
    totalRevenue: rev,
    uniqueClients: perfData.value.clientsByLocation?.[loc] || 0,
    avgRevenuePerAppt: appts > 0 ? Math.round(rev / appts * 100) / 100 : 0,
  }
})

// Date-responsive secondary KPIs (computed from perfData, always change with date range)
const daysInRange = computed(() => {
  const start = new Date(dateRange.start + 'T00:00:00')
  const end = new Date(dateRange.end + 'T00:00:00')
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)
})
const avgApptsPerDay = computed(() => {
  const total = kpis.value.totalAppointments || 0
  return total > 0 ? Math.round(total / daysInRange.value * 10) / 10 : 0
})
const avgRevenuePerDay = computed(() => {
  const total = kpis.value.totalRevenue || 0
  return total > 0 ? Math.round(total / daysInRange.value) : 0
})

const rpaTable = computed(() => perfData.value?.revenuePerAppt || {})

// ── Insight computeds ───────────────────────────────────────────────────

const weakestLocation = computed(() => {
  if (!perfData.value?.revenuePerAppt) return null
  let worst: { name: string; perAppt: number } | null = null
  for (const loc of clinicLocations.value) {
    const rpa = perfData.value.revenuePerAppt[loc]
    if (rpa && rpa.appointments > 10 && (!worst || rpa.perAppt < worst.perAppt)) {
      worst = { name: loc, perAppt: rpa.perAppt }
    }
  }
  return worst
})

const slowestDay = computed(() => {
  const dow = perfData.value?.dayOfWeek
  if (!dow?.length) return null
  // Only weekdays Mon-Sat
  const weekdays = dow.filter((d: any) => d.index >= 1 && d.index <= 6)
  if (!weekdays.length) return null
  const min = weekdays.reduce((a: any, b: any) => a.total < b.total ? a : b)
  return min.day
})

// ── Location helpers ─────────────────────────────────────────────────────

function isCompare(): boolean { return locationFilter.value === 'Compare Locations' }
function isSingleLoc(): boolean {
  const loc = locationFilter.value
  return !!loc && loc !== 'All Locations' && loc !== 'Compare Locations'
}
function activeLoc(): string { return locationFilter.value || '' }
function locVal(byLocation: Record<string, number> | undefined, fallbackTotal: number): number {
  if (!byLocation) return fallbackTotal
  if (isSingleLoc()) return byLocation[activeLoc()] || 0
  return fallbackTotal
}

const CHART_THEME = { theme: 'dark' as const }

// ════════════════════════════════════════════════════════════════
// CHART COMPUTEDS
// ════════════════════════════════════════════════════════════════

// ── Location bar (Overview) ──
const hasLocBarData = computed(() => (locBarSeries.value[0]?.data?.length ?? 0) > 0)
const locBarSeries = computed(() => {
  if (!perfData.value) return [{ name: 'Appointments', data: [] }]
  return [{ name: 'Appointments', data: clinicLocations.value.map((l: string) => perfData.value.apptsByLocation?.[l] || 0) }]
})
const locBarOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
  colors: clinicLocations.value.map((l: string) => LOC_COLORS[l] || '#888'),
  plotOptions: { bar: { borderRadius: 6, distributed: true, columnWidth: '55%' } },
  xaxis: { categories: clinicLocations.value },
  yaxis: { title: { text: 'Appointments' } },
  dataLabels: { enabled: true, style: { fontSize: '12px' } },
  tooltip: { ...CHART_THEME }, legend: { show: false },
}))

// ── Revenue per Appointment by Location (Overview) ──
const hasRevPerApptData = computed(() => (revPerApptSeries.value[0]?.data?.length ?? 0) > 0)
const revPerApptSeries = computed(() => {
  if (!perfData.value?.revenuePerAppt) return [{ name: 'Rev/Appt', data: [] }]
  return [{ name: 'Rev/Appt', data: clinicLocations.value.map((l: string) => perfData.value.revenuePerAppt[l]?.perAppt || 0) }]
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

// ── Monthly Trend dual-axis (Overview) ──
const monthlyTrendSeries = computed(() => {
  if (!perfData.value?.monthlyTrend?.length) return []
  const trend = perfData.value.monthlyTrend
  if (isCompare()) {
    const series: any[] = []
    for (const l of clinicLocations.value) {
      series.push({ name: `${l} Revenue`, type: 'line', data: trend.map((m: any) => m.revenueByLocation?.[l] || 0) })
    }
    for (const l of clinicLocations.value) {
      series.push({ name: `${l} Appts`, type: 'column', data: trend.map((m: any) => m.appointmentsByLocation?.[l] || 0) })
    }
    return series
  }
  return [
    { name: 'Revenue', type: 'area', data: trend.map((m: any) => isSingleLoc() ? (m.revenueByLocation?.[activeLoc()] || 0) : m.revenue) },
    { name: 'Appointments', type: 'column', data: trend.map((m: any) => isSingleLoc() ? (m.appointmentsByLocation?.[activeLoc()] || 0) : m.appointments) },
  ]
})
const monthlyTrendOptions = computed(() => {
  const labels = (perfData.value?.monthlyTrend || []).map((m: any) => m.label)
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

// ── Service Category (Overview, from performance API) ──
const svcCatSeries = computed(() => {
  if (!perfData.value?.serviceCategories?.length) return []
  return perfData.value.serviceCategories.map((c: any) => locVal(c.byLocation, c.total)).filter((v: number) => v > 0)
})
const svcCatOptions = computed(() => {
  const cats = (perfData.value?.serviceCategories || []).filter((c: any) => locVal(c.byLocation, c.total) > 0)
  return {
    chart: { type: 'donut', fontFamily: 'inherit' },
    labels: cats.map((c: any) => c.category),
    colors: ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#8B5CF6', '#14B8A6', '#F97316'],
    legend: { position: 'bottom' as const, fontSize: '11px' },
    dataLabels: { enabled: true, formatter: (val: number) => `${Math.round(val)}%` },
    tooltip: { ...CHART_THEME },
  }
})

// ── Day of Week (Overview, compare locations) ──
const dowSeries = computed(() => {
  if (!perfData.value?.dayOfWeek?.length) return []
  if (isSingleLoc()) return [{ name: activeLoc(), data: perfData.value.dayOfWeek.map((d: any) => d.byLocation?.[activeLoc()] || 0) }]
  return clinicLocations.value.map((loc: string) => ({
    name: loc, data: perfData.value.dayOfWeek.map((d: any) => d.byLocation?.[loc] || 0),
  }))
})
const dowOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
  colors: isSingleLoc() ? [LOC_COLORS[activeLoc()] || '#888'] : clinicLocations.value.map((l: string) => LOC_COLORS[l]),
  xaxis: { categories: (perfData.value?.dayOfWeek || []).map((d: any) => d.day?.substring(0, 3)) },
  yaxis: { title: { text: 'Appointments' } },
  plotOptions: { bar: { borderRadius: 3, columnWidth: '60%' } },
  dataLabels: { enabled: true, style: { fontSize: '10px' } },
  tooltip: { ...CHART_THEME },
  legend: { position: 'top' as const, fontSize: '11px' },
}))

// ── Appointment Types (Appointments tab) ──
const typeSeries = computed(() => {
  if (!perfData.value?.appointmentTypes?.length) return [{ name: 'Count', data: [] }]
  const locF = typeLocationFilter.value
  const top = perfData.value.appointmentTypes.slice(0, 20)
  if (locF === 'All Locations') return [{ name: 'All Locations', data: top.map((t: any) => t.total) }]
  return [{ name: locF, data: top.map((t: any) => t.byLocation?.[locF] || 0) }]
})
const typeOptions = computed(() => {
  const top = (perfData.value?.appointmentTypes || []).slice(0, 20)
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

// ── Weekly Volume (Appointments tab) ──
const weeklyTrendSeries = computed(() => {
  if (!perfData.value?.weeklyTrend?.length) return []
  const trend = perfData.value.weeklyTrend
  if (isCompare()) {
    return clinicLocations.value.map((loc: string) => ({ name: loc, data: trend.map((w: any) => w.byLocation?.[loc] || 0) }))
  }
  return [{ name: isSingleLoc() ? activeLoc() : 'All Locations', data: trend.map((w: any) => isSingleLoc() ? (w.byLocation?.[activeLoc()] || 0) : w.total) }]
})
const weeklyTrendOptions = computed(() => ({
  chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit' },
  colors: isCompare() ? clinicLocations.value.map((l: string) => LOC_COLORS[l]) : [isSingleLoc() ? (LOC_COLORS[activeLoc()] || '#7C3AED') : '#7C3AED'],
  fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
  stroke: { curve: 'smooth' as const, width: 2 },
  xaxis: { categories: (perfData.value?.weeklyTrend || []).map((w: any) => w.week), labels: { rotate: -45, style: { fontSize: '10px' } } },
  yaxis: { title: { text: 'Appointments' } },
  dataLabels: { enabled: false },
  tooltip: { ...CHART_THEME, shared: true },
  legend: { position: 'top' as const, fontSize: '11px' },
}))

// ── Day of Week Detail (Appointments tab) ──
const dowDetailSeries = computed(() => {
  if (!perfData.value?.dayOfWeek?.length) return []
  const locF = dowLocationFilter.value
  if (locF === 'Compare Locations') {
    return clinicLocations.value.map((loc: string) => ({ name: loc, data: perfData.value.dayOfWeek.map((d: any) => d.byLocation?.[loc] || 0) }))
  }
  if (locF === 'All Locations') return [{ name: 'All Locations', data: perfData.value.dayOfWeek.map((d: any) => d.total) }]
  return [{ name: locF, data: perfData.value.dayOfWeek.map((d: any) => d.byLocation?.[locF] || 0) }]
})
const dowDetailOptions = computed(() => {
  const locF = dowLocationFilter.value
  const isComp = locF === 'Compare Locations'
  return {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
    colors: isComp ? clinicLocations.value.map((l: string) => LOC_COLORS[l]) : [locF !== 'All Locations' ? (LOC_COLORS[locF] || '#3B82F6') : '#3B82F6'],
    xaxis: { categories: (perfData.value?.dayOfWeek || []).map((d: any) => d.day?.substring(0, 3)) },
    yaxis: { title: { text: 'Appointments' } },
    plotOptions: { bar: { borderRadius: 4, columnWidth: isComp ? '80%' : '50%' } },
    dataLabels: { enabled: true, style: { fontSize: '10px' } },
    tooltip: { ...CHART_THEME },
    legend: { position: 'top' as const, fontSize: '11px', show: isComp },
  }
})

// ── Revenue Trend (Revenue tab) ──
const revTrendSeries = computed(() => {
  if (!perfData.value?.monthlyTrend?.length) return []
  const trend = perfData.value.monthlyTrend
  if (isCompare()) return clinicLocations.value.map((loc: string) => ({ name: loc, data: trend.map((m: any) => m.revenueByLocation?.[loc] || 0) }))
  return [{ name: isSingleLoc() ? activeLoc() : 'All Locations', data: trend.map((m: any) => isSingleLoc() ? (m.revenueByLocation?.[activeLoc()] || 0) : m.revenue) }]
})
const revTrendOptions = computed(() => ({
  chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit' },
  colors: isCompare() ? clinicLocations.value.map((l: string) => LOC_COLORS[l]) : [isSingleLoc() ? (LOC_COLORS[activeLoc()] || '#10B981') : '#10B981'],
  fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
  stroke: { curve: 'smooth' as const, width: 2 },
  xaxis: { categories: (perfData.value?.monthlyTrend || []).map((m: any) => m.label), labels: { rotate: -45, style: { fontSize: '10px' } } },
  yaxis: { title: { text: 'Revenue ($)' }, labels: { formatter: (v: number) => '$' + (v / 1000).toFixed(0) + 'k' } },
  dataLabels: { enabled: false },
  tooltip: { ...CHART_THEME, shared: true, y: { formatter: (v: number) => '$' + (v || 0).toLocaleString() } },
  legend: { position: 'top' as const, fontSize: '11px' },
}))

// ── Department Revenue donut (Revenue tab, from overview API) ──
const deptDonutSeries = computed(() =>
  (overviewData.value?.charts?.departmentRevenue || []).map((d: any) => d.revenue)
)
const deptDonutOptions = computed(() => ({
  chart: { type: 'donut', fontFamily: 'inherit' },
  labels: (overviewData.value?.charts?.departmentRevenue || []).map((d: any) => d.department),
  colors: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#14B8A6', '#F97316', '#6366F1'],
  legend: { position: 'bottom' as const, fontSize: '11px' },
  dataLabels: { enabled: true, formatter: (val: number) => `${Math.round(val)}%` },
  tooltip: { ...CHART_THEME, y: { formatter: (v: number) => '$' + v.toLocaleString() } },
}))

// ── Product Groups (Revenue tab, from performance API) ──
const pgSeries = computed(() => {
  if (!perfData.value?.topProductGroups?.length) return [{ name: 'Revenue', data: [] }]
  const pgs = perfData.value.topProductGroups.slice(0, 12)
  if (isSingleLoc()) return [{ name: activeLoc(), data: pgs.map((p: any) => p.byLocation?.[activeLoc()] || 0) }]
  if (isCompare()) return clinicLocations.value.map((loc: string) => ({ name: loc, data: pgs.map((p: any) => p.byLocation?.[loc] || 0) }))
  return [{ name: 'All Locations', data: pgs.map((p: any) => p.revenue) }]
})
const pgOptions = computed(() => {
  const pgs = (perfData.value?.topProductGroups || []).slice(0, 12)
  return {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit', stacked: isCompare() },
    colors: isCompare() ? clinicLocations.value.map((l: string) => LOC_COLORS[l]) : [isSingleLoc() ? (LOC_COLORS[activeLoc()] || '#3B82F6') : '#3B82F6'],
    plotOptions: { bar: { borderRadius: 3, horizontal: true } },
    xaxis: { title: { text: 'Revenue ($)' }, labels: { formatter: (v: number) => '$' + (v / 1000).toFixed(0) + 'k' } },
    yaxis: { labels: { style: { fontSize: '10px' }, maxWidth: 180 } },
    dataLabels: { enabled: false },
    tooltip: { ...CHART_THEME, y: { formatter: (v: number) => '$' + (v || 0).toLocaleString() } },
    legend: { position: 'top' as const, fontSize: '11px', show: isCompare() },
    labels: pgs.map((p: any) => p.group),
  }
})

// ── Top Staff (Revenue tab, from performance API — location-aware) ──
const staffSeries = computed(() => {
  if (!perfData.value?.topStaff?.length) return [{ name: 'Revenue', data: [] }]
  let staffList = perfData.value.topStaff
  if (isSingleLoc()) {
    staffList = staffList.filter((s: any) => (s.byLocation?.[activeLoc()] || 0) > 0)
      .sort((a: any, b: any) => (b.byLocation?.[activeLoc()] || 0) - (a.byLocation?.[activeLoc()] || 0))
    return [{ name: activeLoc(), data: staffList.slice(0, 15).map((s: any) => s.byLocation?.[activeLoc()] || 0) }]
  }
  return [{ name: 'All Locations', data: staffList.slice(0, 15).map((s: any) => s.revenue) }]
})
const staffOptions = computed(() => {
  let staffList = perfData.value?.topStaff || []
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

async function loadAll() {
  loading.value = true
  error.value = null
  // Clear old data so stale numbers don't persist if the new request fails
  perfData.value = null
  overviewData.value = null
  try {
    const params = new URLSearchParams()
    if (dateRange.start) params.set('startDate', dateRange.start)
    if (dateRange.end) params.set('endDate', dateRange.end)
    params.set('_t', Date.now().toString()) // cache-bust

    // Call both APIs in parallel — each is resilient independently
    const [perfResult, overviewResult] = await Promise.allSettled([
      $fetch(`/api/analytics/performance?${params.toString()}`),
      $fetch(`/api/analytics/practice-overview?${params.toString()}`),
    ])

    if (perfResult.status === 'fulfilled') {
      perfData.value = perfResult.value
    } else {
      console.warn('Performance API failed:', perfResult.reason)
    }

    if (overviewResult.status === 'fulfilled') {
      const ov = overviewResult.value as any
      if (ov.success) overviewData.value = ov
    } else {
      console.warn('Overview API failed:', overviewResult.reason)
    }

    chartKey.value++
  } catch (err: any) {
    error.value = err.data?.message || err.message || 'Failed to load analytics'
  } finally {
    loading.value = false
  }
}

watch(() => [dateRange.start, dateRange.end], () => {
  if (_debounce) clearTimeout(_debounce)
  _debounce = setTimeout(() => loadAll(), 500)
})

// ── Sync All ─────────────────────────────────────────────────────────────

async function syncAll() {
  syncing.value = true
  try {
    const result = await $fetch('/api/ezyvet/sync-analytics', { method: 'POST', body: { syncType: 'all' } }) as any
    if (result.success) {
      const first = Object.values(result.results)[0] as any
      const invoicesSynced = first?.invoices?.upserted || 0
      const contactsSynced = first?.contacts?.upserted || 0
      notify(`Synced ${invoicesSynced.toLocaleString()} invoices, ${contactsSynced.toLocaleString()} contacts`)
      await loadAll()
    }
  } catch (err: any) {
    const msg = err.data?.message || err.message || 'Sync failed'
    if (msg.includes('No active ezyVet clinic')) {
      notify('ezyVet API not configured. Set up credentials in the ezyVet Integration page.', 'warning')
    } else {
      notify('Sync failed: ' + msg, 'error')
    }
  } finally {
    syncing.value = false
  }
}

// ── Upload Functions ─────────────────────────────────────────────────────

const uploadProgress = reactive({ total: 0, sent: 0, pct: 0, status: '' })
let _uploadProgressTimer: ReturnType<typeof setTimeout> | null = null

function scheduleProgressReset() {
  if (_uploadProgressTimer) clearTimeout(_uploadProgressTimer)
  _uploadProgressTimer = setTimeout(() => { uploadProgress.total = 0 }, 3000)
}

/** Read file as ArrayBuffer for client-side XLSX parsing */
function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

/** Read file as base64 (fallback for small files) */
function fileToBase64(file: File): Promise<string> {
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

/** Parse XLSX/CSV file client-side using SheetJS */
async function parseFileClientSide(file: File): Promise<Record<string, any>[]> {
  const XLSX = await import('xlsx')
  const buffer = await readFileAsArrayBuffer(file)
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) throw new Error('No sheets found in file')

  // Get raw arrays to detect header row
  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  const headerKeywords = ['invoice #', 'invoice', 'invoice line reference', 'invoice number', 'product name', 'appointment']
  let headerIdx = 0
  for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
    const row = rawRows[i].map((c: any) => String(c).trim().toLowerCase())
    const matchCount = headerKeywords.filter(kw => row.some((cell: string) => cell === kw || cell.includes(kw))).length
    if (matchCount >= 2) { headerIdx = i; break }
  }

  const headers = rawRows[headerIdx].map((c: any) => String(c).trim())
  const rows: Record<string, any>[] = []
  for (let i = headerIdx + 1; i < rawRows.length; i++) {
    const row = rawRows[i]
    if (!row || row.every((c: any) => !String(c).trim())) continue
    const obj: Record<string, any> = {}
    // Stringify all values so server-side parsers get consistent string input
    headers.forEach((h: string, idx: number) => { if (h) obj[h] = row[idx] != null ? String(row[idx]) : '' })
    rows.push(obj)
  }
  return rows
}

/** Upload rows in batches to avoid Vercel's 4.5MB body limit */
async function uploadInBatches(url: string, allRows: Record<string, any>[], fileName: string, extra: Record<string, any> = {}): Promise<{ inserted: number; duplicatesSkipped: number }> {
  const BATCH_SIZE = 2000
  let totalInserted = 0
  let totalSkipped = 0

  uploadProgress.total = allRows.length
  uploadProgress.sent = 0
  uploadProgress.pct = 0

  for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
    const batch = allRows.slice(i, i + BATCH_SIZE)
    uploadProgress.status = `Uploading rows ${i + 1}–${Math.min(i + BATCH_SIZE, allRows.length)} of ${allRows.length}...`

    const result = await $fetch(url, {
      method: 'POST',
      body: { invoiceLines: batch, fileName, ...extra },
    }) as any

    totalInserted += result.inserted || 0
    totalSkipped += result.duplicatesSkipped || 0
    uploadProgress.sent = Math.min(i + BATCH_SIZE, allRows.length)
    uploadProgress.pct = Math.round((uploadProgress.sent / allRows.length) * 100)
  }

  uploadProgress.status = `Done — ${totalInserted} inserted, ${totalSkipped} duplicates skipped`
  return { inserted: totalInserted, duplicatesSkipped: totalSkipped }
}

async function uploadInvoice() {
  if (!invFile.value) return
  uploadingInvoice.value = true
  uploadProgress.total = 0
  try {
    // Parse file client-side to avoid Vercel 4.5MB body limit
    uploadProgress.status = 'Parsing file...'
    const rows = await parseFileClientSide(invFile.value)

    if (rows.length === 0) {
      notify('No data rows found in file', 'warning')
      return
    }

    const result = await uploadInBatches('/api/invoices/upload', rows, invFile.value.name)
    notify(`Uploaded ${result.inserted} invoice lines. ${result.duplicatesSkipped} duplicates skipped.`)
    showInvoiceUpload.value = false; invFile.value = null
    await loadAll()
  } catch (err: any) {
    notify('Upload failed: ' + (err.data?.message || err.message), 'error')
  } finally {
    uploadingInvoice.value = false
    scheduleProgressReset()
  }
}

async function uploadStatus() {
  if (!statusFile.value) return
  uploadingStatus.value = true
  uploadProgress.total = 0
  try {
    uploadProgress.status = 'Parsing file...'
    const rows = await parseFileClientSide(statusFile.value)
    if (rows.length === 0) { notify('No data rows found in file', 'warning'); return }

    // Status upload uses fileData — send in batches as parsed rows if large, else base64
    if (statusFile.value.size > 3 * 1024 * 1024) {
      const result = await uploadInBatches('/api/appointments/upload-status', rows, statusFile.value.name, { duplicateAction: statusDupAction.value })
      notify(`Uploaded ${result.inserted} status records. ${result.duplicatesSkipped} skipped.`)
    } else {
      const fileData = await fileToBase64(statusFile.value)
      const result = await $fetch('/api/appointments/upload-status', { method: 'POST', body: { fileData, fileName: statusFile.value.name, duplicateAction: statusDupAction.value } }) as any
      notify(`Uploaded ${result.inserted || 0} status records.`)
    }
    showStatusUpload.value = false; statusFile.value = null
    await loadAll()
  } catch (err: any) { notify('Upload failed: ' + (err.data?.message || err.message), 'error') }
  finally {
    uploadingStatus.value = false
    scheduleProgressReset()
  }
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
  if (trackingTotalInserted.value > 0) loadAll()
}

async function runTrackingBatch() {
  if (!trackingBatch.value.length) return
  trackingProcessing.value = true
  trackingCompleted.value = false
  trackingTotalInserted.value = 0
  trackingTotalErrors.value = 0

  for (let idx = 0; idx < trackingBatch.value.length; idx++) {
    const entry = trackingBatch.value[idx] as BatchFile
    trackingCurrentIdx.value = idx
    entry.status = 'uploading'
    try {
      // For large files, convert to CSV text client-side to avoid base64 inflation hitting Vercel 4.5MB limit
      let body: Record<string, any>
      if (entry.file.size > 3 * 1024 * 1024) {
        const XLSX = await import('xlsx')
        const arrayBuf = await readFileAsArrayBuffer(entry.file)
        const wb = XLSX.read(new Uint8Array(arrayBuf), { type: 'array' })
        const csvText = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]], { blankrows: true })
        body = { csvText, fileName: entry.name, duplicateAction: trackingDupAction.value }
      } else {
        const fileData = await fileToBase64(entry.file)
        body = { fileData, fileName: entry.name, duplicateAction: trackingDupAction.value }
      }
      const res = await $fetch('/api/appointments/upload-tracking', { method: 'POST', body }) as any
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

onMounted(() => { loadAll() })

onBeforeUnmount(() => {
  if (_debounce) clearTimeout(_debounce)
  if (_uploadProgressTimer) clearTimeout(_uploadProgressTimer)
})
</script>

<style scoped>
.practice-analytics-page { max-width: 1400px; margin: 0 auto; }
.cursor-pointer { cursor: pointer; }
</style>
