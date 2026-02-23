<template>
  <div class="performance-analysis-page">
    <!-- Page Header -->
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Performance Analysis</h1>
        <p class="text-subtitle-1 text-grey">
          Combined invoice revenue and appointment demand analysis
        </p>
        <div v-if="invoiceStats.earliestDate || apptStats.totalAppointments" class="text-caption text-grey mt-1">
          <v-icon size="14" class="mr-1">mdi-database</v-icon>
          <template v-if="invoiceStats.earliestDate">
            Invoices: {{ formatDate(invoiceStats.earliestDate) }} – {{ formatDate(invoiceStats.latestDate) }}
            ({{ formatNumber(invoiceStats.totalLines) }} lines)
          </template>
          <template v-if="invoiceStats.earliestDate && apptStats.totalAppointments">&nbsp;|&nbsp;</template>
          <template v-if="apptStats.totalAppointments">
            Appointments: {{ formatNumber(apptStats.totalAppointments) }} records
          </template>
        </div>
      </div>
      <div class="d-flex gap-2">
        <v-menu>
          <template #activator="{ props }">
            <v-btn v-bind="props" color="primary" prepend-icon="mdi-upload">
              Upload Data
            </v-btn>
          </template>
          <v-list density="compact">
            <v-list-subheader class="text-caption">EzyVet Exports</v-list-subheader>
            <v-list-item prepend-icon="mdi-receipt-text" @click="showInvoiceUpload = true">
              <v-list-item-title>Invoice Lines Report</v-list-item-title>
              <v-list-item-subtitle class="text-caption">CSV from EzyVet invoice export</v-list-item-subtitle>
            </v-list-item>
            <v-list-item prepend-icon="mdi-clock-check-outline" @click="showStatusUpload = true">
              <v-list-item-title>Appointment Status Report</v-list-item-title>
              <v-list-item-subtitle class="text-caption">XLS from EzyVet appointment status</v-list-item-subtitle>
            </v-list-item>
            <v-divider class="my-1" />
            <v-list-subheader class="text-caption">Clinic Tracking</v-list-subheader>
            <v-list-item prepend-icon="mdi-table-large" @click="showTrackingUpload = true">
              <v-list-item-title>Appointment Tracking CSV</v-list-item-title>
              <v-list-item-subtitle class="text-caption">Weekly matrix tracking spreadsheet</v-list-item-subtitle>
            </v-list-item>
            <v-list-item prepend-icon="mdi-folder-open" :disabled="importingClinic" @click="importClinicReports">
              <v-list-item-title>Import Saved Clinic Reports</v-list-item-title>
              <v-list-item-subtitle class="text-caption">From server data/Appointments folder</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-menu>
        <v-btn
          color="success"
          variant="outlined"
          prepend-icon="mdi-cloud-sync"
          :loading="syncing"
          @click="syncFromEzyVet"
        >
          Sync ezyVet
        </v-btn>
      </div>
    </div>

    <!-- Tabs -->
    <v-tabs v-model="activeTab" color="deep-purple" class="mb-6">
      <v-tab value="overview">
        <v-icon start size="18">mdi-view-dashboard</v-icon>
        Overview
      </v-tab>
      <v-tab value="invoices">
        <v-icon start size="18">mdi-receipt-text</v-icon>
        Invoices
      </v-tab>
      <v-tab value="appointments">
        <v-icon start size="18">mdi-calendar-check</v-icon>
        Appointments
      </v-tab>
    </v-tabs>

    <!-- ══════════════════ OVERVIEW TAB ══════════════════ -->
    <v-window v-model="activeTab">
      <v-window-item value="overview">
        <!-- Combined Stats -->
        <v-row class="mb-6">
          <v-col cols="12" sm="6" md="3">
            <v-card class="pa-4" elevation="2">
              <div class="d-flex align-center">
                <v-avatar color="green-darken-1" size="48" class="mr-3">
                  <v-icon color="white">mdi-currency-usd</v-icon>
                </v-avatar>
                <div>
                  <div class="text-h5 font-weight-bold">${{ formatCurrency(invoiceStats.totalRevenue) }}</div>
                  <div class="text-caption text-grey">Total Revenue</div>
                </div>
              </div>
            </v-card>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-card class="pa-4" elevation="2">
              <div class="d-flex align-center">
                <v-avatar color="blue-darken-1" size="48" class="mr-3">
                  <v-icon color="white">mdi-receipt-text</v-icon>
                </v-avatar>
                <div>
                  <div class="text-h5 font-weight-bold">{{ formatNumber(invoiceStats.uniqueInvoices) }}</div>
                  <div class="text-caption text-grey">Unique Invoices</div>
                </div>
              </div>
            </v-card>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-card class="pa-4" elevation="2">
              <div class="d-flex align-center">
                <v-avatar color="purple-darken-1" size="48" class="mr-3">
                  <v-icon color="white">mdi-calendar-check</v-icon>
                </v-avatar>
                <div>
                  <div class="text-h5 font-weight-bold">{{ formatNumber(apptStats.totalAppointments) }}</div>
                  <div class="text-caption text-grey">Total Appointments</div>
                </div>
              </div>
            </v-card>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-card class="pa-4" elevation="2">
              <div class="d-flex align-center">
                <v-avatar color="teal-darken-1" size="48" class="mr-3">
                  <v-icon color="white">mdi-account-group</v-icon>
                </v-avatar>
                <div>
                  <div class="text-h5 font-weight-bold">{{ formatNumber(invoiceStats.uniqueClients) }}</div>
                  <div class="text-caption text-grey">Unique Clients</div>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <!-- Secondary Stats -->
        <v-row class="mb-6">
          <v-col cols="12" sm="6" md="3">
            <v-card class="pa-4" elevation="2">
              <div class="d-flex align-center">
                <v-avatar color="indigo-darken-1" size="48" class="mr-3">
                  <v-icon color="white">mdi-file-document-multiple</v-icon>
                </v-avatar>
                <div>
                  <div class="text-h5 font-weight-bold">{{ formatNumber(invoiceStats.totalLines) }}</div>
                  <div class="text-caption text-grey">Invoice Lines</div>
                </div>
              </div>
            </v-card>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-card class="pa-4" elevation="2">
              <div class="d-flex align-center">
                <v-avatar color="orange-darken-1" size="48" class="mr-3">
                  <v-icon color="white">mdi-hospital-building</v-icon>
                </v-avatar>
                <div>
                  <div class="text-h5 font-weight-bold">{{ apptStats.uniqueLocations }}</div>
                  <div class="text-caption text-grey">Locations</div>
                </div>
              </div>
            </v-card>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-card class="pa-4" elevation="2">
              <div class="d-flex align-center">
                <v-avatar color="pink-darken-1" size="48" class="mr-3">
                  <v-icon color="white">mdi-clipboard-list</v-icon>
                </v-avatar>
                <div>
                  <div class="text-h5 font-weight-bold">{{ apptStats.uniqueTypes }}</div>
                  <div class="text-caption text-grey">Appointment Types</div>
                </div>
              </div>
            </v-card>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-card class="pa-4" elevation="2">
              <div class="d-flex align-center">
                <v-avatar color="deep-purple-darken-1" size="48" class="mr-3">
                  <v-icon color="white">mdi-doctor</v-icon>
                </v-avatar>
                <div>
                  <div class="text-h5 font-weight-bold">{{ formatNumber(invoiceStats.uniqueStaff) }}</div>
                  <div class="text-caption text-grey">Staff Members</div>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <!-- Combined AI Analysis -->
        <v-card class="mb-6" elevation="2">
          <v-card-title class="d-flex align-center">
            <v-icon start color="deep-purple">mdi-brain</v-icon>
            Combined AI Analysis
            <v-spacer />
            <v-btn
              color="deep-purple"
              size="small"
              :loading="analyzingCombined"
              :disabled="invoiceStats.totalLines === 0 && apptStats.totalAppointments === 0"
              @click="runCombinedAnalysis"
            >
              Run Analysis
            </v-btn>
          </v-card-title>
          <v-card-text v-if="!combinedAnalysis">
            <v-alert type="info" variant="tonal" density="compact">
              Upload invoice and appointment data, then run AI analysis to get combined revenue + demand insights.
            </v-alert>
          </v-card-text>
          <v-card-text v-else>
            <!-- Insights -->
            <template v-if="combinedAnalysis.insights?.length">
              <div class="text-subtitle-2 font-weight-bold mb-2">Key Insights</div>
              <v-alert
                v-for="(insight, i) in combinedAnalysis.insights"
                :key="i"
                :type="insight.severity === 'warning' ? 'warning' : insight.severity === 'success' ? 'success' : 'info'"
                variant="tonal"
                class="mb-2"
                density="compact"
              >
                <div class="d-flex align-center gap-2">
                  <v-chip size="x-small" :color="insightColor(insight.type)">{{ insight.type }}</v-chip>
                  {{ insight.message }}
                </div>
              </v-alert>
            </template>

            <!-- Recommendations -->
            <template v-if="combinedAnalysis.recommendations?.length">
              <div class="text-subtitle-2 font-weight-bold mt-4 mb-2">Recommendations</div>
              <v-card
                v-for="(rec, i) in combinedAnalysis.recommendations"
                :key="i"
                variant="outlined"
                class="mb-2 pa-3"
              >
                <div class="d-flex align-center gap-2 mb-1">
                  <v-chip size="x-small" :color="rec.impact === 'high' ? 'error' : rec.impact === 'medium' ? 'warning' : 'grey'">{{ rec.impact }}</v-chip>
                  <v-chip size="x-small" :color="recCategoryColor(rec.category)" variant="tonal">{{ rec.category }}</v-chip>
                  <span class="text-subtitle-2 font-weight-bold">{{ rec.title }}</span>
                </div>
                <div class="text-caption">{{ rec.description }}</div>
              </v-card>
            </template>
          </v-card-text>
        </v-card>

        <!-- Side-by-side key charts -->
        <v-row class="mb-6">
          <v-col cols="12" md="6">
            <v-card elevation="2">
              <v-card-title class="text-subtitle-1">
                <v-icon start size="20">mdi-chart-line</v-icon>
                Revenue Trend
              </v-card-title>
              <v-card-text>
                <template v-if="invoiceDashboard?.monthly?.length">
                  <ClientOnly>
                    <apexchart
                      type="area"
                      height="280"
                      :options="overviewRevenueOptions"
                      :series="overviewRevenueSeries"
                    />
                  </ClientOnly>
                </template>
                <div v-else class="text-center text-grey pa-8">Upload invoice data to see revenue trends</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="6">
            <v-card elevation="2">
              <v-card-title class="text-subtitle-1">
                <v-icon start size="20">mdi-chart-bar</v-icon>
                Appointment Volume by Week
              </v-card-title>
              <v-card-text>
                <template v-if="appointments.length">
                  <ClientOnly>
                    <apexchart
                      type="area"
                      height="280"
                      :options="overviewApptTrendOptions"
                      :series="overviewApptTrendSeries"
                    />
                  </ClientOnly>
                </template>
                <div v-else class="text-center text-grey pa-8">Upload appointment data to see volume trends</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- ══════════════════ INVOICES TAB ══════════════════ -->
      <v-window-item value="invoices">
        <!-- Filters -->
        <v-card class="mb-6" elevation="2">
          <v-card-text>
            <v-row dense align="center">
              <v-col cols="12" md="3">
                <v-select
                  v-model="invFilters.location"
                  :items="invoiceLocationOptions"
                  label="Location"
                  variant="outlined"
                  density="compact"
                  clearable
                  hide-details
                  prepend-inner-icon="mdi-hospital-building"
                  @update:model-value="loadInvoiceData"
                />
              </v-col>
              <v-col cols="12" md="2">
                <v-text-field
                  v-model="invFilters.startDate"
                  type="date"
                  label="From Date"
                  variant="outlined"
                  density="compact"
                  hide-details
                  prepend-inner-icon="mdi-calendar-start"
                  @update:model-value="loadInvoiceData"
                />
              </v-col>
              <v-col cols="12" md="2">
                <v-text-field
                  v-model="invFilters.endDate"
                  type="date"
                  label="To Date"
                  variant="outlined"
                  density="compact"
                  hide-details
                  prepend-inner-icon="mdi-calendar-end"
                  @update:model-value="loadInvoiceData"
                />
              </v-col>
              <v-col cols="12" md="5" class="d-flex gap-2 align-center">
                <v-btn color="deep-purple" prepend-icon="mdi-brain" :loading="analyzingInvoice" :disabled="invoiceStats.totalLines === 0" @click="runInvoiceAnalysis">
                  AI Analysis
                </v-btn>
                <v-btn color="primary" variant="outlined" prepend-icon="mdi-refresh" :loading="loadingInvoice" @click="loadInvoiceData">
                  Refresh
                </v-btn>
                <v-btn variant="text" size="small" color="primary" prepend-icon="mdi-download" @click="exportInvoiceCSV" :disabled="invoiceStats.totalLines === 0">Export</v-btn>
              </v-col>
            </v-row>

            <!-- Quick date presets -->
            <div class="d-flex gap-2 mt-3">
              <v-chip
                v-for="preset in datePresets"
                :key="preset.label"
                size="small"
                :color="isActivePreset(preset, invFilters) ? 'primary' : 'default'"
                :variant="isActivePreset(preset, invFilters) ? 'elevated' : 'outlined'"
                @click="applyPreset(preset, invFilters, loadInvoiceData)"
              >
                {{ preset.label }}
              </v-chip>
            </div>
          </v-card-text>
        </v-card>

        <!-- Loading / Empty -->
        <div v-if="loadingInvoice" class="text-center pa-8">
          <v-progress-circular indeterminate color="primary" size="48" />
          <p class="text-body-2 text-grey mt-4">Loading invoice data...</p>
        </div>

        <v-card v-else-if="invoiceStats.totalLines === 0" class="mb-6 pa-8 text-center" elevation="2">
          <v-icon size="72" color="grey-lighten-1" class="mb-4">mdi-receipt-text-outline</v-icon>
          <h3 class="text-h6 mb-2">No Invoice Data Yet</h3>
          <p class="text-body-2 text-grey mb-4">Upload an invoice lines CSV or sync from ezyVet.</p>
          <v-btn color="primary" prepend-icon="mdi-upload" @click="showInvoiceUpload = true">Upload CSV</v-btn>
        </v-card>

        <template v-else>
          <!-- Revenue Charts -->
          <v-row class="mb-6">
            <v-col cols="12" md="7">
              <v-card elevation="2">
                <v-card-title class="text-subtitle-1"><v-icon start size="20">mdi-chart-line</v-icon>Revenue Trend</v-card-title>
                <v-card-text>
                  <ClientOnly>
                    <apexchart :key="'inv-rev-'+invDataVersion" type="area" height="320" :options="monthlyRevenueOptions" :series="monthlyRevenueSeries" />
                  </ClientOnly>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="5">
              <v-card elevation="2">
                <v-card-title class="text-subtitle-1"><v-icon start size="20">mdi-chart-donut</v-icon>Revenue by Department</v-card-title>
                <v-card-text>
                  <ClientOnly>
                    <apexchart :key="'inv-dept-'+invDataVersion" type="donut" height="320" :options="departmentDonutOptions" :series="departmentDonutSeries" />
                  </ClientOnly>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Product Groups -->
          <v-row class="mb-6">
            <v-col cols="12">
              <v-card elevation="2">
                <v-card-title class="text-subtitle-1"><v-icon start size="20">mdi-package-variant</v-icon>Top Product Groups by Revenue</v-card-title>
                <v-card-text>
                  <ClientOnly>
                    <apexchart :key="'inv-pg-'+invDataVersion" type="bar" height="320" :options="productGroupOptions" :series="productGroupSeries" />
                  </ClientOnly>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Staff Performance -->
          <v-row class="mb-6">
            <v-col cols="12" md="6">
              <v-card elevation="2">
                <v-card-title class="text-subtitle-1"><v-icon start size="20">mdi-account-cash</v-icon>Staff Revenue (Top 15)</v-card-title>
                <v-card-text>
                  <ClientOnly>
                    <apexchart :key="'inv-staff-'+invDataVersion" type="bar" height="400" :options="staffRevenueOptions" :series="staffRevenueSeries" />
                  </ClientOnly>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card elevation="2">
                <v-card-title class="text-subtitle-1"><v-icon start size="20">mdi-account-tie</v-icon>Case Owner Revenue (Top 15)</v-card-title>
                <v-card-text>
                  <ClientOnly>
                    <apexchart :key="'inv-owner-'+invDataVersion" type="bar" height="400" :options="caseOwnerRevenueOptions" :series="caseOwnerRevenueSeries" />
                  </ClientOnly>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Client Count + Invoice Volume -->
          <v-row class="mb-6">
            <v-col cols="12" md="6">
              <v-card elevation="2">
                <v-card-title class="text-subtitle-1"><v-icon start size="20">mdi-account-multiple-plus</v-icon>Client Count</v-card-title>
                <v-card-text>
                  <ClientOnly>
                    <apexchart :key="'inv-clients-'+invDataVersion" type="bar" height="280" :options="monthlyClientOptions" :series="monthlyClientSeries" />
                  </ClientOnly>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card elevation="2">
                <v-card-title class="text-subtitle-1"><v-icon start size="20">mdi-file-document-multiple</v-icon>Invoice Volume</v-card-title>
                <v-card-text>
                  <ClientOnly>
                    <apexchart :key="'inv-vol-'+invDataVersion" type="line" height="280" :options="monthlyVolumeOptions" :series="monthlyVolumeSeries" />
                  </ClientOnly>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- AI Invoice Analysis Results -->
          <template v-if="invoiceAnalysis">
            <h2 class="text-h5 font-weight-bold mb-4"><v-icon start color="deep-purple">mdi-brain</v-icon>Invoice AI Analysis</h2>

            <!-- Revenue Summary -->
            <v-card class="mb-4" elevation="2" v-if="invoiceAnalysis.revenueSummary">
              <v-card-title class="text-subtitle-1"><v-icon start size="20">mdi-cash-register</v-icon>Revenue Summary</v-card-title>
              <v-card-text>
                <v-row>
                  <v-col cols="12" sm="4" md="2">
                    <div class="text-caption text-grey">Total Revenue</div>
                    <div class="text-h6 font-weight-bold">${{ formatCurrency(invoiceAnalysis.revenueSummary.totalRevenue) }}</div>
                  </v-col>
                  <v-col cols="12" sm="4" md="2">
                    <div class="text-caption text-grey">Avg/Line</div>
                    <div class="text-h6">${{ formatCurrency(invoiceAnalysis.revenueSummary.avgRevenuePerLine) }}</div>
                  </v-col>
                  <v-col cols="12" sm="4" md="2">
                    <div class="text-caption text-grey">Top Department</div>
                    <div class="text-body-1 font-weight-bold">{{ invoiceAnalysis.revenueSummary.topDepartment }}</div>
                  </v-col>
                  <v-col cols="12" sm="4" md="2">
                    <div class="text-caption text-grey">Growth</div>
                    <v-chip size="small" :color="invoiceAnalysis.revenueSummary.growthIndicator === 'growing' ? 'success' : invoiceAnalysis.revenueSummary.growthIndicator === 'declining' ? 'error' : 'grey'">
                      {{ invoiceAnalysis.revenueSummary.growthIndicator === 'growing' ? '↑ Growing' : invoiceAnalysis.revenueSummary.growthIndicator === 'declining' ? '↓ Declining' : '→ Stable' }}
                    </v-chip>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>

            <!-- Insights + Recommendations -->
            <v-row class="mb-4">
              <v-col cols="12" md="6" v-if="invoiceAnalysis.insights?.length">
                <v-card elevation="2" class="fill-height">
                  <v-card-title class="text-subtitle-1"><v-icon start size="20" color="info">mdi-lightbulb</v-icon>Key Insights</v-card-title>
                  <v-card-text style="max-height: 300px; overflow-y: auto;">
                    <v-alert v-for="(insight, i) in invoiceAnalysis.insights" :key="i" :type="insight.severity === 'warning' ? 'warning' : insight.severity === 'success' ? 'success' : 'info'" variant="tonal" class="mb-2" density="compact">
                      <div class="d-flex align-center gap-2">
                        <v-chip size="x-small" :color="insightColor(insight.type)">{{ insight.type }}</v-chip>
                        {{ insight.message }}
                      </div>
                    </v-alert>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="6" v-if="invoiceAnalysis.recommendations?.length">
                <v-card elevation="2" class="fill-height">
                  <v-card-title class="text-subtitle-1"><v-icon start size="20" color="orange">mdi-star</v-icon>Recommendations</v-card-title>
                  <v-card-text style="max-height: 300px; overflow-y: auto;">
                    <v-card v-for="(rec, i) in invoiceAnalysis.recommendations" :key="i" variant="outlined" class="mb-2 pa-3">
                      <div class="d-flex align-center gap-2 mb-1">
                        <v-chip size="x-small" :color="rec.impact === 'high' ? 'error' : rec.impact === 'medium' ? 'warning' : 'grey'">{{ rec.impact }}</v-chip>
                        <span class="text-subtitle-2 font-weight-bold">{{ rec.title }}</span>
                      </div>
                      <div class="text-caption">{{ rec.description }}</div>
                    </v-card>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </template>
        </template>
      </v-window-item>

      <!-- ══════════════════ APPOINTMENTS TAB ══════════════════ -->
      <v-window-item value="appointments">
        <!-- Filters -->
        <v-card class="mb-6" elevation="2">
          <v-card-text>
            <v-row dense align="center">
              <v-col cols="12" md="3">
                <v-select
                  v-model="apptFilters.locationId"
                  :items="apptLocationOptions"
                  item-title="name"
                  item-value="id"
                  label="Location"
                  variant="outlined"
                  density="compact"
                  clearable
                  hide-details
                  prepend-inner-icon="mdi-map-marker"
                  @update:model-value="loadApptData"
                />
              </v-col>
              <v-col cols="12" md="2">
                <v-text-field v-model="apptFilters.startDate" type="date" label="From Date" variant="outlined" density="compact" hide-details prepend-inner-icon="mdi-calendar-start" />
              </v-col>
              <v-col cols="12" md="2">
                <v-text-field v-model="apptFilters.endDate" type="date" label="To Date" variant="outlined" density="compact" hide-details prepend-inner-icon="mdi-calendar-end" />
              </v-col>
              <v-col cols="12" md="2">
                <v-select v-model="apptFilters.serviceCategory" :items="serviceCategoryOptions" label="Service" variant="outlined" density="compact" clearable hide-details prepend-inner-icon="mdi-medical-bag" />
              </v-col>
              <v-col cols="12" md="3" class="d-flex gap-2 align-center">
                <v-btn color="deep-purple" prepend-icon="mdi-brain" :loading="analyzingAppt" :disabled="apptStats.totalAppointments === 0" @click="runApptAnalysis">
                  AI Analysis
                </v-btn>
                <v-btn color="primary" variant="outlined" prepend-icon="mdi-refresh" :loading="loadingAppt" @click="loadApptData">
                  Refresh
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Loading / Empty -->
        <div v-if="loadingAppt" class="text-center pa-8">
          <v-progress-circular indeterminate color="primary" size="48" />
          <p class="text-body-2 text-grey mt-4">Loading appointment data...</p>
        </div>

        <v-card v-else-if="apptStats.totalAppointments === 0" class="mb-6 pa-8 text-center" elevation="2">
          <v-icon size="72" color="grey-lighten-1" class="mb-4">mdi-calendar-blank</v-icon>
          <h3 class="text-h6 mb-2">No Appointment Data Yet</h3>
          <p class="text-body-2 text-grey mb-4">Upload appointment tracking CSVs or import clinic reports.</p>
          <div class="d-flex gap-2 justify-center">
            <v-btn color="primary" prepend-icon="mdi-table-large" @click="showTrackingUpload = true">Upload Tracking CSV</v-btn>
            <v-btn color="deep-purple" variant="outlined" prepend-icon="mdi-clock-check-outline" @click="showStatusUpload = true">Upload Status Report</v-btn>
            <v-btn color="teal" variant="outlined" prepend-icon="mdi-folder-open" :loading="importingClinic" @click="importClinicReports">Import Clinic Reports</v-btn>
          </div>
        </v-card>

        <template v-else>
          <!-- Appointment Charts -->
          <v-row class="mb-6">
            <v-col cols="12" md="6">
              <v-card elevation="2">
                <v-card-title class="text-subtitle-1"><v-icon start size="20">mdi-chart-line</v-icon>Weekly Appointment Volume</v-card-title>
                <v-card-text>
                  <ClientOnly>
                    <apexchart type="area" height="280" :options="weeklyTrendOptions" :series="weeklyTrendSeries" />
                  </ClientOnly>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card elevation="2">
                <v-card-title class="text-subtitle-1"><v-icon start size="20">mdi-chart-donut</v-icon>Appointment Types</v-card-title>
                <v-card-text>
                  <ClientOnly>
                    <apexchart type="donut" height="280" :options="typeBreakdownOptions" :series="typeBreakdownSeries" />
                  </ClientOnly>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <v-row class="mb-6">
            <v-col cols="12" md="6">
              <v-card elevation="2">
                <v-card-title class="text-subtitle-1"><v-icon start size="20">mdi-calendar-week</v-icon>Demand by Day of Week</v-card-title>
                <v-card-text>
                  <ClientOnly>
                    <apexchart type="bar" height="280" :options="dayOfWeekOptions" :series="dayOfWeekSeries" />
                  </ClientOnly>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card elevation="2">
                <v-card-title class="text-subtitle-1"><v-icon start size="20">mdi-medical-bag</v-icon>Service Category Distribution</v-card-title>
                <v-card-text>
                  <ClientOnly>
                    <apexchart type="bar" height="280" :options="serviceCategoryChartOptions" :series="serviceCategorySeries" />
                  </ClientOnly>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- AI Appointment Analysis Results -->
          <template v-if="apptAnalysis">
            <h2 class="text-h5 font-weight-bold mb-4"><v-icon start color="deep-purple">mdi-brain</v-icon>Appointment AI Analysis</h2>

            <!-- Demand Summary -->
            <v-row class="mb-4" v-if="apptAnalysis.insights?.length">
              <v-col cols="12">
                <v-card elevation="2">
                  <v-card-title class="text-subtitle-1"><v-icon start size="20" color="info">mdi-lightbulb</v-icon>Insights & Recommendations</v-card-title>
                  <v-card-text style="max-height: 400px; overflow-y: auto;">
                    <v-alert v-for="(insight, i) in apptAnalysis.insights" :key="i" :type="insight.severity === 'warning' ? 'warning' : insight.severity === 'success' ? 'success' : 'info'" variant="tonal" class="mb-2" density="compact">
                      {{ insight.message }}
                    </v-alert>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <!-- Weekly Plan -->
            <v-card class="mb-6" elevation="2" v-if="apptAnalysis.weeklyPlan && Object.keys(apptAnalysis.weeklyPlan).length">
              <v-card-title class="text-subtitle-1"><v-icon start size="20">mdi-calendar-multiselect</v-icon>Recommended Weekly Plan</v-card-title>
              <v-card-text>
                <v-row>
                  <v-col v-for="(plan, day) in apptAnalysis.weeklyPlan" :key="day" cols="12" sm="6" md="4" lg="2">
                    <v-card variant="outlined" class="pa-2">
                      <div class="text-subtitle-2 font-weight-bold text-center">{{ day }}</div>
                      <div class="text-caption text-grey text-center mb-1">{{ plan.totalStaff }} staff</div>
                      <v-chip v-for="svc in (plan.services || []).slice(0, 4)" :key="svc.code" size="x-small" class="ma-1">
                        {{ svc.code }}: {{ svc.slots }}
                      </v-chip>
                    </v-card>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </template>
        </template>
      </v-window-item>
    </v-window>

    <!-- ══════════════════ DIALOGS ══════════════════ -->

    <!-- Invoice Upload Dialog -->
    <v-dialog v-model="showInvoiceUpload" max-width="700" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start>mdi-receipt-text</v-icon>
          Upload Invoice Lines
          <v-spacer />
          <v-btn icon variant="text" @click="showInvoiceUpload = false"><v-icon>mdi-close</v-icon></v-btn>
        </v-card-title>
        <v-divider />
        <v-card-text>
          <v-alert type="info" variant="tonal" density="compact" class="mb-4">
            <strong>Add-To Upload:</strong> New invoice lines are added to existing data.
            Duplicate records (same Invoice # + Line Reference) are automatically skipped.
          </v-alert>
          <v-file-input
            v-model="invUploadForm.file"
            label="Select Invoice Lines File"
            accept=".csv,.xls,.xlsx,.tsv"
            variant="outlined"
            density="compact"
            prepend-icon="mdi-file-delimited"
            :rules="[v => !!v || 'File is required']"
            @update:model-value="previewInvoiceFile"
          />
          <template v-if="invCsvPreview.rows.length">
            <div class="text-caption text-grey mb-1">Preview: {{ invCsvPreview.totalRows.toLocaleString() }} rows, {{ invCsvPreview.columns.length }} columns</div>
            <div style="max-height: 200px; overflow: auto;" class="mb-4">
              <v-table density="compact">
                <thead><tr><th v-for="col in invCsvPreview.columns.slice(0, 8)" :key="col" class="text-caption">{{ col }}</th><th v-if="invCsvPreview.columns.length > 8" class="text-caption">...</th></tr></thead>
                <tbody><tr v-for="(row, i) in invCsvPreview.rows.slice(0, 5)" :key="i"><td v-for="col in invCsvPreview.columns.slice(0, 8)" :key="col" class="text-caption" style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ row[col] || '' }}</td><td v-if="invCsvPreview.columns.length > 8" class="text-caption">...</td></tr></tbody>
              </v-table>
            </div>
          </template>
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showInvoiceUpload = false">Cancel</v-btn>
          <v-btn color="primary" :loading="uploadingInvoice" :disabled="!invUploadForm.file" @click="uploadInvoiceData">
            {{ invUploadProgress || 'Upload & Process' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Appointment Status Upload Dialog -->
    <v-dialog v-model="showStatusUpload" max-width="640" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start>mdi-clock-check-outline</v-icon>
          Upload Appointment Status Report
          <v-spacer />
          <v-btn icon variant="text" @click="showStatusUpload = false"><v-icon>mdi-close</v-icon></v-btn>
        </v-card-title>
        <v-divider />
        <v-card-text>
          <v-alert type="info" variant="tonal" density="compact" class="mb-4">
            <strong>EzyVet Appointment Status Report</strong> — CSV or XLS export with per-appointment timing data.
            Links to Invoice Lines via owner name and animal name for cross-analysis.
          </v-alert>
          <v-file-input
            v-model="statusUploadForm.file"
            label="Select Appointment Status File"
            accept=".csv,.xls,.xlsx,.tsv"
            variant="outlined"
            density="compact"
            prepend-icon="mdi-file-table-outline"
            :rules="[v => !!v || 'File is required']"
            @update:model-value="resetStatusDuplicateCheck"
          />
          <template v-if="statusUploadInfo.reportLocation">
            <v-chip size="small" color="teal" variant="tonal" class="mb-2 mr-2"><v-icon start size="14">mdi-map-marker</v-icon>{{ statusUploadInfo.reportLocation }}</v-chip>
            <v-chip size="small" color="blue" variant="tonal" class="mb-2"><v-icon start size="14">mdi-calendar-range</v-icon>{{ statusUploadInfo.dateRange }}</v-chip>
          </template>

          <!-- Duplicate Detection -->
          <v-alert
            v-if="statusDupCheck.checked && statusDupCheck.duplicateDates.length > 0 && !statusDupCheck.chosenAction"
            type="warning" variant="tonal" density="compact" class="mb-4" prominent icon="mdi-calendar-alert"
          >
            <div class="font-weight-bold mb-1">{{ statusDupCheck.duplicateDates.length }} day(s) already have status data</div>
            <div class="text-body-2 mb-2">
              {{ statusDupCheck.duplicateRecordCount }} overlapping records
            </div>
            <div class="d-flex gap-2">
              <v-btn size="small" color="warning" variant="flat" prepend-icon="mdi-skip-next" @click="statusDupCheck.chosenAction = 'skip'">Skip duplicates ({{ statusDupCheck.newRecordCount }} new)</v-btn>
              <v-btn size="small" color="orange-darken-2" variant="flat" prepend-icon="mdi-swap-horizontal" @click="statusDupCheck.chosenAction = 'replace'">Replace</v-btn>
            </div>
          </v-alert>
          <v-alert v-if="statusDupCheck.chosenAction === 'skip'" type="info" variant="tonal" density="compact" class="mb-4">
            <strong>Skip mode:</strong> {{ statusDupCheck.newRecordCount }} new records will upload.
            <v-btn size="x-small" variant="text" class="ml-2" @click="statusDupCheck.chosenAction = null">Change</v-btn>
          </v-alert>
          <v-alert v-if="statusDupCheck.chosenAction === 'replace'" type="info" variant="tonal" density="compact" class="mb-4">
            <strong>Replace mode:</strong> Existing status data for {{ statusDupCheck.duplicateDates.length }} day(s) will be replaced.
            <v-btn size="x-small" variant="text" class="ml-2" @click="statusDupCheck.chosenAction = null">Change</v-btn>
          </v-alert>
          <v-alert v-if="statusDupCheck.checked && statusDupCheck.duplicateDates.length === 0" type="success" variant="tonal" density="compact" class="mb-4" icon="mdi-check-circle">
            No duplicates — all records are new.
          </v-alert>
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showStatusUpload = false">Cancel</v-btn>
          <v-btn v-if="!statusDupCheck.checked" color="primary" :loading="statusDupCheck.loading" :disabled="!statusUploadForm.file" @click="checkStatusDuplicates">Check & Upload</v-btn>
          <v-btn v-else color="primary" :loading="uploadingStatus" :disabled="!statusUploadForm.file || (statusDupCheck.duplicateDates.length > 0 && !statusDupCheck.chosenAction)" @click="uploadStatusData">Upload & Process</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Appointment Tracking Upload Dialog -->
    <v-dialog v-model="showTrackingUpload" max-width="640" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start>mdi-table-large</v-icon>
          Upload Appointment Tracking CSV
          <v-spacer />
          <v-btn icon variant="text" @click="showTrackingUpload = false"><v-icon>mdi-close</v-icon></v-btn>
        </v-card-title>
        <v-divider />
        <v-card-text>
          <v-alert type="info" variant="tonal" density="compact" class="mb-4">
            <strong>Weekly Tracking Spreadsheet</strong> — matrix-format CSV or XLS with appointment types per day per location (SO/VN/VE).
          </v-alert>
          <v-file-input
            v-model="trackingUploadForm.file"
            label="Select Tracking File"
            accept=".csv,.xls,.xlsx,.tsv"
            variant="outlined"
            density="compact"
            prepend-icon="mdi-file-delimited"
            :rules="[v => !!v || 'File is required']"
            @update:model-value="resetTrackingDupCheck"
          />
          <template v-if="trackingUploadInfo.weekTitle">
            <v-chip size="small" color="deep-purple" variant="tonal" class="mb-2 mr-2"><v-icon start size="14">mdi-calendar-week</v-icon>{{ trackingUploadInfo.weekTitle }}</v-chip>
            <v-chip v-for="sec in trackingUploadInfo.sections" :key="sec" size="x-small" variant="outlined" class="mb-2 mr-1">{{ sec }}</v-chip>
          </template>

          <!-- Duplicate Detection -->
          <v-alert
            v-if="trackingDupCheck.checked && trackingDupCheck.duplicateDates.length > 0 && !trackingDupCheck.chosenAction"
            type="warning" variant="tonal" density="compact" class="mb-4" prominent icon="mdi-calendar-alert"
          >
            <div class="font-weight-bold mb-1">{{ trackingDupCheck.duplicateDates.length }} day(s) already have tracking data</div>
            <div class="d-flex gap-2">
              <v-btn size="small" color="warning" variant="flat" prepend-icon="mdi-skip-next" @click="trackingDupCheck.chosenAction = 'skip'">Skip ({{ trackingDupCheck.newRecordCount }} new)</v-btn>
              <v-btn size="small" color="orange-darken-2" variant="flat" prepend-icon="mdi-swap-horizontal" @click="trackingDupCheck.chosenAction = 'replace'">Replace</v-btn>
            </div>
          </v-alert>
          <v-alert v-if="trackingDupCheck.chosenAction" type="info" variant="tonal" density="compact" class="mb-4">
            <strong>{{ trackingDupCheck.chosenAction === 'skip' ? 'Skip' : 'Replace' }} mode</strong>
            <v-btn size="x-small" variant="text" class="ml-2" @click="trackingDupCheck.chosenAction = null">Change</v-btn>
          </v-alert>
          <v-alert v-if="trackingDupCheck.checked && trackingDupCheck.duplicateDates.length === 0" type="success" variant="tonal" density="compact" class="mb-4" icon="mdi-check-circle">
            No duplicates — all records are new.
          </v-alert>
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showTrackingUpload = false">Cancel</v-btn>
          <v-btn v-if="!trackingDupCheck.checked" color="primary" :loading="trackingDupCheck.loading" :disabled="!trackingUploadForm.file" @click="checkTrackingDuplicates">Check & Upload</v-btn>
          <v-btn v-else color="primary" :loading="uploadingTracking" :disabled="!trackingUploadForm.file || (trackingDupCheck.duplicateDates.length > 0 && !trackingDupCheck.chosenAction)" @click="uploadTrackingData">Upload & Process</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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

const supabase = useSupabaseClient()
const route = useRoute()

// ── State ────────────────────────────────────────────────────────────────

const activeTab = ref((route.query.tab as string) || 'overview')
const loadingInvoice = ref(false)
const loadingAppt = ref(false)
const analyzingInvoice = ref(false)
const analyzingAppt = ref(false)
const analyzingCombined = ref(false)
const uploadingInvoice = ref(false)
const uploadingStatus = ref(false)
const uploadingTracking = ref(false)
const importingClinic = ref(false)
const syncing = ref(false)
const invUploadProgress = ref('')
const showInvoiceUpload = ref(false)
const showStatusUpload = ref(false)
const showTrackingUpload = ref(false)
const invDataVersion = ref(0)

// Date defaults: last complete month end
const lastCompleteMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 0)
const defaultStart = new Date(lastCompleteMonth.getTime() - 89 * 86400000).toISOString().split('T')[0]
const defaultEnd = lastCompleteMonth.toISOString().split('T')[0]

const invFilters = reactive({ location: null as string | null, startDate: defaultStart, endDate: defaultEnd })
const apptFilters = reactive({ locationId: null as string | null, startDate: defaultStart, endDate: defaultEnd, serviceCategory: null as string | null })

// Upload forms
const invUploadForm = reactive({ file: null as File | null })
const statusUploadForm = reactive({ file: null as File | null })
const trackingUploadForm = reactive({ file: null as File | null })

const invCsvPreview = reactive({ columns: [] as string[], rows: [] as Record<string, string>[], totalRows: 0 })

const statusUploadInfo = reactive({ reportLocation: '', dateRange: '' })
const trackingUploadInfo = reactive({ weekTitle: '', sections: [] as string[] })

const statusDupCheck = reactive({
  checked: false, loading: false,
  duplicateDates: [] as string[], duplicateRecordCount: 0, newRecordCount: 0,
  chosenAction: null as 'skip' | 'replace' | null,
})
const trackingDupCheck = reactive({
  checked: false, loading: false,
  duplicateDates: [] as string[], duplicateRecordCount: 0, newRecordCount: 0,
  chosenAction: null as 'skip' | 'replace' | null,
})

// Stats
const invoiceStats = reactive({
  totalLines: 0, totalRevenue: 0, uniqueInvoices: 0, uniqueClients: 0,
  uniqueStaff: 0, uniqueDepartments: 0, earliestDate: null as string | null, latestDate: null as string | null,
})
const apptStats = reactive({ totalAppointments: 0, uniqueTypes: 0, uniqueLocations: 0 })

// Data
const invoiceDashboard = ref<any>(null)
const appointments = ref<any[]>([])
const invoiceAnalysis = ref<any>(null)
const apptAnalysis = ref<any>(null)
const combinedAnalysis = ref<any>(null)
const invoiceLocationOptions = ref<string[]>([])
const apptLocationOptions = ref<{ id: string; name: string }[]>([])

const snackbar = reactive({ show: false, message: '', color: 'success' })

const serviceCategoryOptions = ['SURG', 'AP_DENTAL', 'CLINIC_NAD', 'IM', 'EXOTIC', 'CARDIO', 'DENTAL', 'IMAGING', 'MOBILE', 'CSR', 'ADMIN', 'FLOAT']

// ── Date Presets ─────────────────────────────────────────────────────────

const datePresets = [
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 90 Days', days: 90 },
  { label: 'Last 6 Months', days: 180 },
  { label: 'Last 12 Months', days: 365 },
  { label: 'YTD', days: -1 },
  { label: 'All Time', days: -2 },
]

function isActivePreset(preset: { days: number }, filters: { startDate: string }) {
  if (preset.days === -2) return !filters.startDate || filters.startDate === '2020-01-01'
  if (preset.days === -1) return filters.startDate === new Date().getFullYear() + '-01-01'
  const lcm = new Date(new Date().getFullYear(), new Date().getMonth(), 0)
  return filters.startDate === new Date(lcm.getTime() - (preset.days - 1) * 86400000).toISOString().split('T')[0]
}

function applyPreset(preset: { days: number }, filters: { startDate: string; endDate: string }, reload: () => void) {
  const lcm = new Date(new Date().getFullYear(), new Date().getMonth(), 0)
  filters.endDate = lcm.toISOString().split('T')[0]
  if (preset.days === -2) filters.startDate = '2020-01-01'
  else if (preset.days === -1) filters.startDate = new Date().getFullYear() + '-01-01'
  else filters.startDate = new Date(lcm.getTime() - (preset.days - 1) * 86400000).toISOString().split('T')[0]
  reload()
}

// ── Invoice Chart Computed ───────────────────────────────────────────────

const monthlyData = computed(() => (invoiceDashboard.value?.monthly || []).map((m: any) => ({
  month: m.month, revenue: m.revenue || 0, count: m.lineCount || 0, invoiceCount: m.invoiceCount || 0, clientCount: m.clientCount || 0,
})))

const monthlyRevenueSeries = computed(() => [{ name: 'Revenue', data: monthlyData.value.map((d: any) => Math.round(d.revenue * 100) / 100) }])
const monthlyRevenueOptions = computed(() => ({
  chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit' },
  colors: ['#10B981'], fill: { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0.1 } },
  stroke: { curve: 'smooth', width: 2 },
  xaxis: { categories: monthlyData.value.map((d: any) => d.month), labels: { rotate: -45, style: { fontSize: '10px' } } },
  yaxis: { title: { text: 'Revenue ($)' }, labels: { formatter: (v: number) => '$' + (v / 1000).toFixed(0) + 'k' } },
  dataLabels: { enabled: false }, tooltip: { theme: 'dark', y: { formatter: (v: number) => '$' + v.toLocaleString(undefined, { minimumFractionDigits: 2 }) } },
}))

const deptData = computed(() => (invoiceDashboard.value?.departments || []).map((d: any) => [d.department || 'Unknown', d.revenue || 0]))
const departmentDonutSeries = computed(() => deptData.value.map(([, v]: any) => Math.round(v * 100) / 100))
const departmentDonutOptions = computed(() => ({
  chart: { type: 'donut', fontFamily: 'inherit' }, labels: deptData.value.map(([k]: any) => k),
  colors: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#14B8A6', '#F97316', '#6366F1'],
  legend: { position: 'bottom', fontSize: '11px' }, dataLabels: { enabled: true, formatter: (val: number) => `${Math.round(val)}%` },
  tooltip: { theme: 'dark', y: { formatter: (v: number) => '$' + v.toLocaleString() } },
}))

const pgData = computed(() => (invoiceDashboard.value?.productGroups || []).map((d: any) => [d.productGroup || 'Unknown', d.revenue || 0]))
const productGroupSeries = computed(() => [{ name: 'Revenue', data: pgData.value.map(([, v]: any) => Math.round(v * 100) / 100) }])
const productGroupOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' }, colors: ['#3B82F6'],
  xaxis: { categories: pgData.value.map(([k]: any) => k), labels: { rotate: -45, style: { fontSize: '10px' }, trim: true, maxHeight: 80 } },
  yaxis: { title: { text: 'Revenue ($)' }, labels: { formatter: (v: number) => '$' + (v / 1000).toFixed(0) + 'k' } },
  plotOptions: { bar: { borderRadius: 4 } }, dataLabels: { enabled: false },
  tooltip: { theme: 'dark', y: { formatter: (v: number) => '$' + v.toLocaleString() } },
}))

const staffData = computed(() => (invoiceDashboard.value?.staff || []).map((d: any) => [d.staffMember, d.revenue || 0]))
const staffRevenueSeries = computed(() => [{ name: 'Revenue', data: staffData.value.map(([, v]: any) => Math.round(v * 100) / 100) }])
const staffRevenueOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' }, colors: ['#8B5CF6'],
  xaxis: { categories: staffData.value.map(([k]: any) => k), title: { text: 'Revenue ($)' }, labels: { formatter: (v: number) => '$' + (v / 1000).toFixed(0) + 'k' } },
  yaxis: { labels: { style: { fontSize: '11px' }, maxWidth: 180 } },
  plotOptions: { bar: { borderRadius: 4, horizontal: true } }, dataLabels: { enabled: false },
  tooltip: { theme: 'dark', y: { formatter: (v: number) => '$' + v.toLocaleString() } },
}))

const caseOwnerData = computed(() => (invoiceDashboard.value?.caseOwners || []).map((d: any) => [d.caseOwner, d.revenue || 0]))
const caseOwnerRevenueSeries = computed(() => [{ name: 'Revenue', data: caseOwnerData.value.map(([, v]: any) => Math.round(v * 100) / 100) }])
const caseOwnerRevenueOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' }, colors: ['#EC4899'],
  xaxis: { categories: caseOwnerData.value.map(([k]: any) => k), title: { text: 'Revenue ($)' }, labels: { formatter: (v: number) => '$' + (v / 1000).toFixed(0) + 'k' } },
  yaxis: { labels: { style: { fontSize: '11px' }, maxWidth: 180 } },
  plotOptions: { bar: { borderRadius: 4, horizontal: true } }, dataLabels: { enabled: false },
  tooltip: { theme: 'dark', y: { formatter: (v: number) => '$' + v.toLocaleString() } },
}))

const monthlyClientSeries = computed(() => [{ name: 'Unique Clients', data: monthlyData.value.map((d: any) => d.clientCount) }])
const monthlyClientOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' }, colors: ['#F59E0B'],
  xaxis: { categories: monthlyData.value.map((d: any) => d.month), labels: { rotate: -45, style: { fontSize: '10px' } } },
  yaxis: { title: { text: 'Client Count' } }, plotOptions: { bar: { borderRadius: 4 } },
  dataLabels: { enabled: true, style: { fontSize: '10px' } }, tooltip: { theme: 'dark' },
}))

const monthlyVolumeSeries = computed(() => [
  { name: 'Invoice Lines', data: monthlyData.value.map((d: any) => d.count) },
  { name: 'Invoices', data: monthlyData.value.map((d: any) => d.invoiceCount) },
])
const monthlyVolumeOptions = computed(() => ({
  chart: { type: 'line', toolbar: { show: false }, fontFamily: 'inherit' }, colors: ['#06B6D4', '#EF4444'],
  stroke: { curve: 'smooth', width: [2, 2] },
  xaxis: { categories: monthlyData.value.map((d: any) => d.month), labels: { rotate: -45, style: { fontSize: '10px' } } },
  yaxis: { title: { text: 'Count' } }, dataLabels: { enabled: false },
  tooltip: { theme: 'dark' }, legend: { position: 'top' },
}))

// ── Appointment Chart Computed ───────────────────────────────────────────

const filteredAppointments = computed(() => {
  let list = appointments.value
  if (apptFilters.serviceCategory) list = list.filter(a => a.service_category === apptFilters.serviceCategory)
  return list
})

// Get the effective count for an appointment row (tracking rows store count in raw_data)
function apptCount(a: any): number {
  return a.raw_data?.count || 1
}

function getWeekKey(dateStr: string) {
  const d = new Date(dateStr)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  return d.toISOString().split('T')[0]
}

const weeklyTrendSeries = computed(() => {
  const wm: Record<string, number> = {}
  for (const a of filteredAppointments.value) { const k = getWeekKey(a.appointment_date); wm[k] = (wm[k] || 0) + apptCount(a) }
  const sorted = Object.entries(wm).sort((a, b) => a[0].localeCompare(b[0]))
  return [{ name: 'Appointments', data: sorted.map(([, v]) => v) }]
})
const weeklyTrendOptions = computed(() => ({
  chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit' }, colors: ['#7C3AED'],
  fill: { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0.1 } }, stroke: { curve: 'smooth', width: 2 },
  xaxis: { categories: (() => { const wm: Record<string, number> = {}; for (const a of filteredAppointments.value) { const k = getWeekKey(a.appointment_date); wm[k] = 1 }; return Object.keys(wm).sort() })(), labels: { rotate: -45, style: { fontSize: '10px' } } },
  yaxis: { title: { text: 'Appointments' } }, dataLabels: { enabled: false }, tooltip: { theme: 'dark' },
}))

const typeBreakdownSeries = computed(() => {
  const tm: Record<string, number> = {}
  for (const a of filteredAppointments.value) { const t = a.appointment_type || 'Unknown'; tm[t] = (tm[t] || 0) + apptCount(a) }
  return Object.entries(tm).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([, v]) => v)
})
const typeBreakdownOptions = computed(() => {
  const tm: Record<string, number> = {}
  for (const a of filteredAppointments.value) { const t = a.appointment_type || 'Unknown'; tm[t] = (tm[t] || 0) + apptCount(a) }
  const labels = Object.entries(tm).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k]) => k)
  return {
    chart: { type: 'donut', fontFamily: 'inherit' }, labels,
    colors: ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#14B8A6', '#F97316'],
    legend: { position: 'bottom', fontSize: '11px' }, dataLabels: { enabled: true, formatter: (val: number) => `${Math.round(val)}%` },
    tooltip: { theme: 'dark' },
  }
})

const dayOfWeekSeries = computed(() => {
  // Index 0=Mon .. 5=Sat — exclude Sunday (locations closed)
  const days = [0, 0, 0, 0, 0, 0]
  for (const a of filteredAppointments.value) {
    const dow = new Date(a.appointment_date + 'T00:00:00').getDay()
    if (dow === 0) continue // Skip Sunday
    days[dow - 1] += apptCount(a)
  }
  return [{ name: 'Appointments', data: days }]
})
const dayOfWeekOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' }, colors: ['#3B82F6'],
  xaxis: { categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }, yaxis: { title: { text: 'Appointments' } },
  plotOptions: { bar: { borderRadius: 4 } }, dataLabels: { enabled: true, style: { fontSize: '10px' } }, tooltip: { theme: 'dark' },
}))

const serviceCategorySeries = computed(() => {
  const cm: Record<string, number> = {}
  for (const a of filteredAppointments.value) { const c = a.service_category || 'UNMAPPED'; cm[c] = (cm[c] || 0) + apptCount(a) }
  const sorted = Object.entries(cm).sort((a, b) => b[1] - a[1]).slice(0, 12)
  return [{ name: 'Appointments', data: sorted.map(([, v]) => v) }]
})
const serviceCategoryChartOptions = computed(() => {
  const cm: Record<string, number> = {}
  for (const a of filteredAppointments.value) { const c = a.service_category || 'UNMAPPED'; cm[c] = (cm[c] || 0) + apptCount(a) }
  const sorted = Object.entries(cm).sort((a, b) => b[1] - a[1]).slice(0, 12)
  return {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' }, colors: ['#10B981'],
    xaxis: { categories: sorted.map(([k]) => k), labels: { rotate: -45, style: { fontSize: '10px' } } },
    yaxis: { title: { text: 'Appointments' } }, plotOptions: { bar: { borderRadius: 4 } },
    dataLabels: { enabled: false }, tooltip: { theme: 'dark' },
  }
})

// Overview charts
const overviewRevenueSeries = computed(() => monthlyRevenueSeries.value)
const overviewRevenueOptions = computed(() => monthlyRevenueOptions.value)
const overviewApptTrendSeries = computed(() => weeklyTrendSeries.value)
const overviewApptTrendOptions = computed(() => weeklyTrendOptions.value)

// ── Helpers ──────────────────────────────────────────────────────────────

function formatNumber(n: number): string { return n?.toLocaleString() ?? '0' }
function formatCurrency(n: number | string | null): string {
  if (n === null || n === undefined) return '0.00'
  const num = typeof n === 'string' ? parseFloat(n) : n
  return isNaN(num) ? '0.00' : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function formatDate(d: string | null): string { return d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '' }
function formatDateTime(d: string | null): string { return d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '' }
function insightColor(type: string): string { return { trend: 'blue', opportunity: 'amber', concern: 'red', achievement: 'green', staffing: 'deep-purple', risk: 'red' }[type] || 'grey' }
function recCategoryColor(cat: string): string { return { revenue: 'green', efficiency: 'blue', growth: 'purple', cost: 'orange' }[cat] || 'grey' }
function showNotification(message: string, color = 'success') { snackbar.message = message; snackbar.color = color; snackbar.show = true }

// ── CSV Parsing ──────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = []; let current = ''; let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') inQuotes = !inQuotes
    else if ((ch === ',' || ch === '\t') && !inQuotes) { result.push(current.trim()); current = '' }
    else current += ch
  }
  result.push(current.trim()); return result
}

function findHeaderRow(lines: string[], markers: RegExp[]): number {
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const cols = parseCSVLine(lines[i])
    if (cols.some(c => markers.some(m => m.test(c.trim())))) return i
  }
  return 0
}

// ── Invoice Previewing + Upload ──────────────────────────────────────────

function isExcelFile(file: File): boolean {
  const name = file.name.toLowerCase()
  return name.endsWith('.xls') || name.endsWith('.xlsx')
}

function previewInvoiceFile(file: File | File[] | null) {
  invCsvPreview.columns = []; invCsvPreview.rows = []; invCsvPreview.totalRows = 0
  const f = Array.isArray(file) ? file[0] : file
  if (!f) return
  // Skip client-side preview for XLS — server will parse it
  if (isExcelFile(f)) {
    invCsvPreview.columns = ['(XLS file selected — preview on upload)']
    invCsvPreview.totalRows = 0
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string; if (!text) return
    const lines = text.split('\n').filter(l => l.trim())
    const headerIdx = findHeaderRow(lines, [/^Invoice$/i, /^Invoice Line Reference$/i])
    const headers = parseCSVLine(lines[headerIdx])
    invCsvPreview.columns = headers; invCsvPreview.totalRows = lines.length - headerIdx - 1
    for (let i = headerIdx + 1; i < Math.min(lines.length, headerIdx + 6); i++) {
      const values = parseCSVLine(lines[i]); const row: Record<string, string> = {}
      headers.forEach((h, idx) => { row[h] = values[idx] || '' }); invCsvPreview.rows.push(row)
    }
  }
  reader.readAsText(f)
}

async function uploadInvoiceData() {
  if (!invUploadForm.file) return
  uploadingInvoice.value = true
  try {
    // XLS/XLSX: send raw file as base64, let server parse
    if (isExcelFile(invUploadForm.file)) {
      const fileData = await fileToBase64(invUploadForm.file)
      invUploadProgress.value = 'Processing spreadsheet...'
      const result = await $fetch('/api/invoices/upload', { method: 'POST', body: { fileData, fileName: invUploadForm.file!.name } }) as any
      invUploadProgress.value = ''
      showNotification(`Upload complete: ${result.inserted || 0} new lines, ${result.duplicatesSkipped || 0} duplicates skipped.`)
      showInvoiceUpload.value = false; invUploadForm.file = null; invCsvPreview.columns = []; invCsvPreview.rows = []
      await loadInvoiceData()
      return
    }

    // CSV/TSV: parse client-side and send as JSON rows
    const text = await invUploadForm.file.text()
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length < 2) throw new Error('File must have a header and data rows')
    const headerIdx = findHeaderRow(lines, [/^Invoice$/i, /^Invoice Line Reference$/i, /^Invoice Line Date/i])
    const headers = parseCSVLine(lines[headerIdx])
    const rows: Record<string, any>[] = []
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]); if (values.length < 3) continue
      const row: Record<string, any> = {}; headers.forEach((h, idx) => { row[h.trim()] = (values[idx] || '').trim() }); rows.push(row)
    }
    if (rows.length === 0) throw new Error('No data rows found')

    const CHUNK = 500; let totalInserted = 0; let totalDupes = 0; const totalChunks = Math.ceil(rows.length / CHUNK)
    for (let ci = 0; ci < totalChunks; ci++) {
      const chunk = rows.slice(ci * CHUNK, (ci + 1) * CHUNK)
      invUploadProgress.value = totalChunks > 1 ? `Uploading chunk ${ci + 1} of ${totalChunks}...` : ''
      const result = await $fetch('/api/invoices/upload', { method: 'POST', body: { invoiceLines: chunk, fileName: invUploadForm.file!.name } }) as any
      totalInserted += result.inserted || 0; totalDupes += result.duplicatesSkipped || 0
    }
    invUploadProgress.value = ''
    showNotification(`Upload complete: ${totalInserted} new lines, ${totalDupes} duplicates skipped.`)
    showInvoiceUpload.value = false; invUploadForm.file = null; invCsvPreview.columns = []; invCsvPreview.rows = []
    await loadInvoiceData()
  } catch (err: any) {
    showNotification('Upload failed: ' + (err.data?.message || err.message || 'Unknown error'), 'error')
  } finally { uploadingInvoice.value = false }
}

// ── Appointment Status Upload ────────────────────────────────────────────

function resetStatusDuplicateCheck() {
  statusDupCheck.checked = false; statusDupCheck.loading = false
  statusDupCheck.duplicateDates = []; statusDupCheck.duplicateRecordCount = 0
  statusDupCheck.newRecordCount = 0; statusDupCheck.chosenAction = null
  statusUploadInfo.reportLocation = ''; statusUploadInfo.dateRange = ''
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1]) // Strip data:...;base64, prefix
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function checkStatusDuplicates() {
  if (!statusUploadForm.file) return
  statusDupCheck.loading = true
  try {
    const fileData = await fileToBase64(statusUploadForm.file)
    const result = await $fetch('/api/appointments/upload-status', { method: 'POST', body: { fileData, fileName: statusUploadForm.file!.name, duplicateAction: 'check' } }) as any
    statusDupCheck.duplicateDates = result.duplicateDates || []
    statusDupCheck.duplicateRecordCount = result.duplicateRecordCount || 0
    statusDupCheck.newRecordCount = result.newRecordCount || 0
    statusDupCheck.checked = true
    statusUploadInfo.reportLocation = result.reportLocation || ''
    statusUploadInfo.dateRange = result.dateRange ? `${result.dateRange.start} – ${result.dateRange.end}` : ''
    if (statusDupCheck.duplicateDates.length === 0) statusDupCheck.chosenAction = 'skip'
  } catch (err: any) { showNotification('Status check failed: ' + (err.data?.message || err.message || 'Unknown'), 'error') }
  finally { statusDupCheck.loading = false }
}

async function uploadStatusData() {
  if (!statusUploadForm.file) return
  uploadingStatus.value = true
  try {
    const fileData = await fileToBase64(statusUploadForm.file)
    const result = await $fetch('/api/appointments/upload-status', { method: 'POST', body: { fileData, fileName: statusUploadForm.file!.name, duplicateAction: statusDupCheck.chosenAction || undefined } }) as any
    let msg = `Uploaded ${result?.inserted || 0} appointment status records.`
    if (result?.skippedDuplicates > 0) msg += ` ${result.skippedDuplicates} skipped.`
    if (result?.stats) msg += ` (${result.stats.uniqueOwners} owners, ${result.stats.uniqueAnimals} animals)`
    showNotification(msg)
    showStatusUpload.value = false; statusUploadForm.file = null
    resetStatusDuplicateCheck(); await loadApptData()
  } catch (err: any) { showNotification('Upload failed: ' + (err.data?.message || err.message || 'Unknown'), 'error') }
  finally { uploadingStatus.value = false }
}

// ── Appointment Tracking Upload ──────────────────────────────────────────

function resetTrackingDupCheck() {
  trackingDupCheck.checked = false; trackingDupCheck.loading = false
  trackingDupCheck.duplicateDates = []; trackingDupCheck.duplicateRecordCount = 0
  trackingDupCheck.newRecordCount = 0; trackingDupCheck.chosenAction = null
  trackingUploadInfo.weekTitle = ''; trackingUploadInfo.sections = []
}

async function checkTrackingDuplicates() {
  if (!trackingUploadForm.file) return
  trackingDupCheck.loading = true
  try {
    let body: Record<string, any> = { fileName: trackingUploadForm.file!.name, duplicateAction: 'check' }
    if (isExcelFile(trackingUploadForm.file)) {
      body.fileData = await fileToBase64(trackingUploadForm.file)
    } else {
      body.csvText = await trackingUploadForm.file.text()
    }
    const result = await $fetch('/api/appointments/upload-tracking', { method: 'POST', body }) as any
    trackingDupCheck.duplicateDates = result.duplicateDates || []
    trackingDupCheck.duplicateRecordCount = result.duplicateRecordCount || 0
    trackingDupCheck.newRecordCount = result.newRecordCount || 0
    trackingDupCheck.checked = true
    trackingUploadInfo.weekTitle = result.weekTitle || ''
    trackingUploadInfo.sections = result.sections || []
    if (trackingDupCheck.duplicateDates.length === 0) trackingDupCheck.chosenAction = 'skip'
  } catch (err: any) { showNotification('Tracking check failed: ' + (err.data?.message || err.message || 'Unknown'), 'error') }
  finally { trackingDupCheck.loading = false }
}

async function uploadTrackingData() {
  if (!trackingUploadForm.file) return
  uploadingTracking.value = true
  try {
    let body: Record<string, any> = { fileName: trackingUploadForm.file!.name, duplicateAction: trackingDupCheck.chosenAction || undefined }
    if (isExcelFile(trackingUploadForm.file)) {
      body.fileData = await fileToBase64(trackingUploadForm.file)
    } else {
      body.csvText = await trackingUploadForm.file.text()
    }
    const result = await $fetch('/api/appointments/upload-tracking', { method: 'POST', body }) as any
    let msg = `Uploaded ${result?.inserted || 0} appointment tracking records.`
    if (result?.weekTitle) msg += ` (${result.weekTitle})`
    if (result?.skippedDuplicates > 0) msg += ` ${result.skippedDuplicates} skipped.`
    showNotification(msg)
    showTrackingUpload.value = false; trackingUploadForm.file = null
    resetTrackingDupCheck(); await loadApptData()
  } catch (err: any) { showNotification('Upload failed: ' + (err.data?.message || err.message || 'Unknown'), 'error') }
  finally { uploadingTracking.value = false }
}

// ── ezyVet Sync ──────────────────────────────────────────────────────────

async function syncFromEzyVet() {
  syncing.value = true
  try {
    const result = await $fetch('/api/ezyvet/sync-analytics', { method: 'POST', body: { syncType: 'all' } }) as any
    if (result.success) { showNotification('Data synced from ezyVet'); await loadInvoiceData(); await loadApptData() }
  } catch (err: any) {
    const msg = err.data?.message || err.message || 'Sync failed'
    showNotification(msg.includes('No active ezyVet') ? 'ezyVet API not configured. Use CSV upload.' : 'Sync failed: ' + msg, msg.includes('No active') ? 'warning' : 'error')
  } finally { syncing.value = false }
}

// ── Clinic Reports Import ────────────────────────────────────────────────

async function importClinicReports() {
  importingClinic.value = true
  try {
    const result = await $fetch('/api/appointments/import-clinic-reports', { method: 'POST', body: { replaceExisting: true } }) as any
    if (result?.success) {
      showNotification(`Imported ${result.inserted} appointments from ${result.filesProcessed} report(s).`)
      await loadApptData()
    } else showNotification(result?.message || 'Import failed', 'error')
  } catch (err: any) { showNotification('Import failed: ' + (err.data?.message || err.message || 'Unknown'), 'error') }
  finally { importingClinic.value = false }
}

// ── Data Loading ─────────────────────────────────────────────────────────

async function loadInvoiceData() {
  loadingInvoice.value = true
  try {
    const params = new URLSearchParams()
    if (invFilters.startDate) params.set('startDate', invFilters.startDate)
    if (invFilters.endDate) params.set('endDate', invFilters.endDate)
    if (invFilters.location) params.set('location', invFilters.location)
    const data = await $fetch(`/api/invoices/dashboard?${params.toString()}`) as any
    invoiceDashboard.value = data
    const s = data.stats || {}
    invoiceStats.totalLines = s.totalLines || 0
    invoiceStats.totalRevenue = s.totalRevenue || 0
    invoiceStats.uniqueInvoices = s.uniqueInvoices || 0
    invoiceStats.uniqueClients = s.uniqueClients || 0
    invoiceStats.uniqueStaff = s.uniqueStaff || 0
    invoiceStats.uniqueDepartments = s.uniqueDepartments || 0
    invoiceStats.earliestDate = s.earliestDate || null
    invoiceStats.latestDate = s.latestDate || null
    invoiceLocationOptions.value = data.locationOptions || []
    if (data.latestAnalysis) invoiceAnalysis.value = data.latestAnalysis
  } catch (err: any) { showNotification('Failed to load invoice data: ' + (err.message || 'Unknown'), 'error') }
  finally { loadingInvoice.value = false; invDataVersion.value++ }
}

async function loadApptData() {
  loadingAppt.value = true
  try {
    const { data: locs } = await supabase.from('locations').select('id, name').eq('is_active', true).order('name')
    apptLocationOptions.value = locs || []

    let allAppt: any[] = []; let page = 0; const pageSize = 1000; let hasMore = true
    while (hasMore) {
      let query = supabase.from('appointment_data').select('*')
        .gte('appointment_date', apptFilters.startDate).lte('appointment_date', apptFilters.endDate)
        .order('appointment_date', { ascending: false }).range(page * pageSize, (page + 1) * pageSize - 1)
      if (apptFilters.locationId) query = query.eq('location_id', apptFilters.locationId)
      const { data, error } = await query
      if (error) throw error
      if (data && data.length > 0) { allAppt = allAppt.concat(data); hasMore = data.length === pageSize; page++ }
      else hasMore = false
    }
    appointments.value = allAppt
    apptStats.totalAppointments = allAppt.reduce((sum: number, a: any) => sum + (a.raw_data?.count || 1), 0)
    apptStats.uniqueTypes = new Set(allAppt.map(a => a.appointment_type)).size
    apptStats.uniqueLocations = new Set(allAppt.map(a => a.location_id || a.location_name).filter(Boolean)).size

    // Load latest appointment analysis
    const { data: latestRun } = await supabase.from('appointment_analysis_runs').select('*').eq('status', 'completed').order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (latestRun) {
      apptAnalysis.value = { demandSummary: latestRun.demand_summary, serviceRecommendations: latestRun.service_recommendations, staffingSuggestions: latestRun.staffing_suggestions, weeklyPlan: latestRun.weekly_plan, insights: latestRun.insights }
    }
  } catch (err: any) { showNotification('Failed to load appointment data: ' + (err.message || 'Unknown'), 'error') }
  finally { loadingAppt.value = false }
}

// ── AI Analysis ──────────────────────────────────────────────────────────

async function runInvoiceAnalysis() {
  analyzingInvoice.value = true
  try {
    const result = await $fetch('/api/invoices/analyze', { method: 'POST', body: { location: invFilters.location, startDate: invFilters.startDate, endDate: invFilters.endDate } }) as any
    invoiceAnalysis.value = result
    showNotification(`Invoice analysis complete! ${result.totalLines?.toLocaleString()} lines, $${formatCurrency(result.totalRevenue)}.`)
  } catch (err: any) { showNotification('Analysis failed: ' + (err.data?.message || err.message || 'Unknown'), 'error') }
  finally { analyzingInvoice.value = false }
}

async function runApptAnalysis() {
  analyzingAppt.value = true
  try {
    const result = await $fetch('/api/appointments/analyze', { method: 'POST', body: { locationId: apptFilters.locationId, weeksBack: Math.ceil((new Date(apptFilters.endDate).getTime() - new Date(apptFilters.startDate).getTime()) / (7 * 86400000)) || 12 } })
    apptAnalysis.value = result
    showNotification(`Appointment analysis complete! ${(result as any)?.totalAppointments || 0} analyzed.`)
  } catch (err: any) { showNotification('Analysis failed: ' + (err.message || 'Unknown'), 'error') }
  finally { analyzingAppt.value = false }
}

async function runCombinedAnalysis() {
  analyzingCombined.value = true
  try {
    // Run both analyses in parallel if we have data for both
    const promises: Promise<any>[] = []
    if (invoiceStats.totalLines > 0 && !invoiceAnalysis.value) {
      promises.push($fetch('/api/invoices/analyze', { method: 'POST', body: { location: invFilters.location, startDate: invFilters.startDate, endDate: invFilters.endDate } }).then(r => { invoiceAnalysis.value = r }))
    }
    if (apptStats.totalAppointments > 0 && !apptAnalysis.value) {
      promises.push($fetch('/api/appointments/analyze', { method: 'POST', body: { locationId: apptFilters.locationId, weeksBack: Math.ceil((new Date(apptFilters.endDate).getTime() - new Date(apptFilters.startDate).getTime()) / (7 * 86400000)) || 12 } }).then(r => { apptAnalysis.value = r }))
    }
    await Promise.all(promises)

    // Merge insights and recommendations from both analyses
    const allInsights: any[] = []
    const allRecs: any[] = []
    if (invoiceAnalysis.value?.insights) allInsights.push(...invoiceAnalysis.value.insights.map((i: any) => ({ ...i, source: 'invoice' })))
    if (apptAnalysis.value?.insights) allInsights.push(...apptAnalysis.value.insights.map((i: any) => ({ ...i, source: 'appointment' })))
    if (invoiceAnalysis.value?.recommendations) allRecs.push(...invoiceAnalysis.value.recommendations.map((r: any) => ({ ...r, source: 'invoice' })))
    if (apptAnalysis.value?.serviceRecommendations) {
      for (const sr of apptAnalysis.value.serviceRecommendations) {
        allRecs.push({ title: `${sr.serviceName || sr.serviceCode}: ${sr.dailyVolume} daily`, description: sr.reasoning, impact: sr.priority || 'medium', category: 'growth', source: 'appointment' })
      }
    }
    combinedAnalysis.value = { insights: allInsights, recommendations: allRecs }
    showNotification('Combined analysis complete!')
  } catch (err: any) { showNotification('Combined analysis failed: ' + (err.message || 'Unknown'), 'error') }
  finally { analyzingCombined.value = false }
}

// ── Export ────────────────────────────────────────────────────────────────

function exportInvoiceCSV() {
  const csvRows = ['Category,Name,Revenue']
  for (const s of invoiceDashboard.value?.staff || []) csvRows.push(`Staff,"${s.staffMember}",${s.revenue}`)
  for (const d of invoiceDashboard.value?.departments || []) csvRows.push(`Department,"${d.department}",${d.revenue}`)
  for (const p of invoiceDashboard.value?.productGroups || []) csvRows.push(`Product Group,"${p.productGroup}",${p.revenue}`)
  for (const m of invoiceDashboard.value?.monthly || []) csvRows.push(`Monthly,${m.month},${m.revenue}`)
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob); const a = document.createElement('a')
  a.href = url; a.download = `performance-summary-${invFilters.startDate}-to-${invFilters.endDate}.csv`
  a.click(); URL.revokeObjectURL(url)
}

// ── Date filter watchers ─────────────────────────────────────────────────

let _apptTimer: ReturnType<typeof setTimeout> | null = null
watch(() => [apptFilters.startDate, apptFilters.endDate], () => { if (_apptTimer) clearTimeout(_apptTimer); _apptTimer = setTimeout(() => loadApptData(), 400) })

// ── Init ─────────────────────────────────────────────────────────────────

onMounted(() => {
  loadInvoiceData()
  loadApptData()
})
</script>

<style scoped>
.performance-analysis-page {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
