<template>
  <div class="ezyvet-analytics-page">
    <!-- Page Header -->
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">EzyVet Analytics</h1>
        <p class="text-subtitle-1 text-grey">
          Business intelligence dashboard — insights &amp; suggested actions from your client data
        </p>
        <div v-if="analytics?.lastSync" class="text-caption text-grey mt-1">
          <v-icon size="14" class="mr-1">mdi-sync</v-icon>
          Last data sync: {{ formatDateTime(analytics.lastSync.completed_at) }}
          ({{ analytics.lastSync.total_rows?.toLocaleString() }} records)
        </div>
      </div>
      <div class="d-flex gap-2">
        <v-btn
          color="success"
          prepend-icon="mdi-cloud-sync"
          :loading="syncingContacts"
          @click="syncContactsFromEzyVet"
        >
          Sync from ezyVet
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
        <v-menu>
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              variant="text"
              icon="mdi-dots-vertical"
            />
          </template>
          <v-list density="compact">
            <v-list-item prepend-icon="mdi-upload" @click="showUploadDialog = true">
              <v-list-item-title>Import CSV (Manual)</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
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
      <div class="text-h6 mt-4">Analyzing client data...</div>
    </div>

    <!-- Analytics Content -->
    <div v-else-if="analytics">

      <!-- ===== INSIGHTS & ACTIONS BANNER ===== -->
      <v-row class="mb-6" v-if="analytics.insights?.length || analytics.suggestedActions?.length">
        <!-- Key Insights -->
        <v-col cols="12" md="6">
          <v-card elevation="2" class="fill-height">
            <v-card-title class="d-flex align-center">
              <v-icon class="mr-2" color="info">mdi-lightbulb-on</v-icon>
              Key Insights
              <v-spacer />
              <v-chip size="x-small" color="info" variant="tonal">{{ analytics.insights?.length || 0 }}</v-chip>
            </v-card-title>
            <v-card-text class="insights-scroll">
              <v-alert
                v-for="(insight, idx) in analytics.insights"
                :key="idx"
                :type="insight.type"
                variant="tonal"
                density="compact"
                class="mb-2"
                border="start"
              >
                <template #prepend>
                  <v-icon>{{ insight.icon }}</v-icon>
                </template>
                <div class="font-weight-bold text-body-2">{{ insight.title }}</div>
                <div class="text-caption">{{ insight.detail }}</div>
              </v-alert>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Suggested Actions -->
        <v-col cols="12" md="6">
          <v-card elevation="2" class="fill-height">
            <v-card-title class="d-flex align-center">
              <v-icon class="mr-2" color="warning">mdi-clipboard-check-outline</v-icon>
              Suggested Actions
              <v-spacer />
              <v-chip size="x-small" color="warning" variant="tonal">{{ analytics.suggestedActions?.length || 0 }}</v-chip>
            </v-card-title>
            <v-card-text class="insights-scroll">
              <div
                v-for="(action, idx) in analytics.suggestedActions"
                :key="idx"
                class="action-item mb-3 pa-3 rounded-lg"
                :class="`action-${action.priority}`"
              >
                <div class="d-flex align-center mb-1">
                  <v-icon size="20" class="mr-2">{{ action.icon }}</v-icon>
                  <span class="font-weight-bold text-body-2">{{ action.title }}</span>
                  <v-spacer />
                  <v-chip
                    :color="action.priority === 'high' ? 'error' : action.priority === 'medium' ? 'warning' : 'info'"
                    size="x-small"
                    label
                  >
                    {{ action.priority }}
                  </v-chip>
                </div>
                <div class="text-caption text-medium-emphasis">{{ action.detail }}</div>
                <div v-if="action.metric" class="text-caption font-weight-bold mt-1" style="color: #1976D2;">
                  {{ action.metric }}
                </div>
              </div>
              <div v-if="!analytics.suggestedActions?.length" class="text-center text-grey py-4">
                <v-icon size="48" color="success">mdi-check-circle-outline</v-icon>
                <div class="mt-2">No urgent actions needed right now.</div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- ===== KPI CARDS ===== -->
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
                <div class="text-body-2 text-grey">Active Clients (12mo)</div>
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
              <v-avatar :color="evaluateRetention(analytics.kpis.retentionRate / 100).color" size="56" class="mr-4">
                <v-icon color="white" size="28">mdi-account-heart</v-icon>
              </v-avatar>
              <div>
                <div class="text-h4 font-weight-bold" :style="{ color: `rgb(var(--v-theme-${evaluateRetention(analytics.kpis.retentionRate / 100).color}))` }">
                  {{ analytics.kpis.retentionRate }}%
                </div>
                <div class="text-body-2 text-grey">
                  Retention Rate
                  <v-tooltip location="bottom">
                    <template #activator="{ props }">
                      <v-icon v-bind="props" size="14" class="ml-1">mdi-information-outline</v-icon>
                    </template>
                    CA Vet Benchmark: {{ CLIENT_BENCHMARKS.clientRetention.average * 100 }}% bonding rate (18-mo).
                    Top practices: {{ CLIENT_BENCHMARKS.clientRetention.good * 100 }}–{{ CLIENT_BENCHMARKS.clientRetention.excellent * 100 }}%.
                  </v-tooltip>
                </div>
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- ===== DATA QUALITY SCORECARD ===== -->
      <v-card elevation="2" class="mb-6">
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-database-check</v-icon>
          Data Quality Score
          <v-spacer />
          <v-chip
            :color="analytics.dataQuality.overallScore >= 75 ? 'success' : analytics.dataQuality.overallScore >= 50 ? 'warning' : 'error'"
            size="small"
            label
          >
            {{ analytics.dataQuality.overallScore }}%
          </v-chip>
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="3">
              <div class="text-center">
                <v-progress-circular
                  :model-value="analytics.dataQuality.overallScore"
                  :size="100"
                  :width="12"
                  :color="analytics.dataQuality.overallScore >= 75 ? 'success' : analytics.dataQuality.overallScore >= 50 ? 'warning' : 'error'"
                >
                  <span class="text-h5 font-weight-bold">{{ analytics.dataQuality.overallScore }}%</span>
                </v-progress-circular>
                <div class="text-caption mt-2">Overall Completeness</div>
              </div>
            </v-col>
            <v-col cols="12" md="9">
              <v-row dense>
                <v-col v-for="field in dataQualityFields" :key="field.key" cols="6" md="4">
                  <div class="d-flex align-center mb-2">
                    <v-icon size="16" :color="field.color" class="mr-2">{{ field.icon }}</v-icon>
                    <span class="text-caption flex-grow-1">{{ field.label }}</span>
                    <span class="text-caption font-weight-bold" :class="`text-${field.color}`">
                      {{ field.pct }}%
                    </span>
                  </div>
                  <v-progress-linear
                    :model-value="field.pct"
                    :color="field.color"
                    height="4"
                    rounded
                    class="mb-1"
                  />
                  <div class="text-caption text-grey">
                    {{ field.missing }} of {{ analytics.dataQuality.totalRecords }} missing
                  </div>
                </v-col>
              </v-row>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- ===== CLIENT SEGMENTATION ===== -->
      <v-card elevation="2" class="mb-6">
        <v-card-title>
          <v-icon class="mr-2">mdi-account-group</v-icon>
          Client Segmentation
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <ClientOnly>
                <apexchart
                  type="donut"
                  height="320"
                  :options="segmentDonutOptions"
                  :series="segmentDonutSeries"
                />
              </ClientOnly>
            </v-col>
            <v-col cols="12" md="6">
              <v-data-table
                :headers="segmentHeaders"
                :items="analytics.clientSegments"
                density="compact"
                :items-per-page="-1"
                hide-default-footer
              >
                <template #item.label="{ item }">
                  <span class="font-weight-bold">{{ item.label }}</span>
                </template>
                <template #item.revenue="{ item }">
                  <span class="text-primary font-weight-bold">{{ formatCurrency(item.revenue) }}</span>
                </template>
                <template #item.avgRevenue="{ item }">
                  {{ formatCurrency(item.avgRevenue) }}
                </template>
                <template #item.retentionRate="{ item }">
                  <v-chip :color="getActiveRateColor(item.retentionRate)" size="x-small" label>
                    {{ item.retentionRate }}%
                  </v-chip>
                </template>
              </v-data-table>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- ===== CHARTS ROW: Revenue Distribution + Recency ===== -->
      <v-row class="mb-6">
        <v-col cols="12" md="6">
          <v-card elevation="2" class="fill-height">
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
        <v-col cols="12" md="6">
          <v-card elevation="2" class="fill-height">
            <v-card-title>
              <v-icon class="mr-2">mdi-clock-outline</v-icon>
              Recency Analysis
              <v-spacer />
              <span class="text-body-2 text-grey">
                {{ formatNumber(recencyTotal) }} clients
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

      <!-- ===== CHURN RISK TABLE ===== -->
      <v-card elevation="2" class="mb-6" v-if="analytics.churnRisk?.length">
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2" color="error">mdi-account-alert</v-icon>
          Churn Risk — High-Value Clients Not Seen in 6+ Months
          <v-spacer />
          <v-chip size="small" color="error" variant="tonal">{{ analytics.churnRisk.length }} at risk</v-chip>
        </v-card-title>
        <v-card-text>
          <v-data-table
            :headers="churnHeaders"
            :items="analytics.churnRisk"
            density="compact"
            :items-per-page="10"
          >
            <template #item.name="{ item }">
              <span class="font-weight-medium">{{ item.name || 'Unknown' }}</span>
            </template>
            <template #item.revenue="{ item }">
              <span class="font-weight-bold text-primary">{{ formatCurrency(item.revenue) }}</span>
            </template>
            <template #item.lastVisit="{ item }">
              <span v-if="item.lastVisit">{{ formatDate(item.lastVisit) }}</span>
              <span v-else class="text-error">Never</span>
            </template>
            <template #item.daysSinceVisit="{ item }">
              <span v-if="item.daysSinceVisit != null">{{ item.daysSinceVisit }} days</span>
              <span v-else>—</span>
            </template>
            <template #item.riskLevel="{ item }">
              <v-chip
                :color="item.riskLevel === 'critical' ? 'error' : item.riskLevel === 'high' ? 'warning' : 'info'"
                size="x-small"
                label
              >
                {{ item.riskLevel }}
              </v-chip>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>

      <!-- ===== TOP CLIENTS ===== -->
      <v-card elevation="2" class="mb-6" v-if="analytics.topClients?.length">
        <v-card-title>
          <v-icon class="mr-2" color="amber">mdi-star</v-icon>
          Top 25 Clients by Revenue
        </v-card-title>
        <v-card-text>
          <v-data-table
            :headers="topClientHeaders"
            :items="analytics.topClients"
            density="compact"
            :items-per-page="10"
          >
            <template #item.name="{ item }">
              <span class="font-weight-medium">{{ item.name || 'Unknown' }}</span>
            </template>
            <template #item.revenue="{ item }">
              <span class="font-weight-bold text-primary">{{ formatCurrency(item.revenue) }}</span>
            </template>
            <template #item.lastVisit="{ item }">
              <div v-if="item.lastVisit">
                <div>{{ formatDate(item.lastVisit) }}</div>
                <div class="text-caption" :class="getRecencyClass(item.lastVisit)">
                  {{ getRecencyLabel(item.lastVisit) }}
                </div>
              </div>
              <span v-else class="text-grey">Never</span>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>

      <!-- ===== GEOGRAPHIC ANALYSIS ===== -->
      <v-card elevation="2" class="mb-6" v-if="analytics.geographicBreakdown?.length">
        <v-card-title>
          <v-icon class="mr-2">mdi-map-marker-radius</v-icon>
          Neighborhood Analysis — by Zip Code
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <ClientOnly>
                <apexchart
                  type="bar"
                  height="350"
                  :options="geoNeighborhoodOptions"
                  :series="geoNeighborhoodSeries"
                />
              </ClientOnly>
            </v-col>
            <v-col cols="12" md="6">
              <v-data-table
                :headers="geoHeaders"
                :items="analytics.geographicBreakdown"
                density="compact"
                :items-per-page="10"
              >
                <template #item.zipCodes="{ item }">
                  <span class="text-caption">{{ item.zipCodes?.join(', ') }}</span>
                </template>
                <template #item.totalRevenue="{ item }">
                  <span class="font-weight-bold text-primary">{{ formatCurrency(item.totalRevenue) }}</span>
                </template>
                <template #item.avgRevenue="{ item }">
                  {{ formatCurrency(item.avgRevenue) }}
                </template>
                <template #item.retentionRate="{ item }">
                  <v-chip :color="getActiveRateColor(item.retentionRate)" size="x-small" label>
                    {{ item.retentionRate }}%
                  </v-chip>
                </template>
              </v-data-table>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- ===== DIVISION & DEPARTMENT ===== -->
      <v-row class="mb-6">
        <v-col cols="12" md="6">
          <v-card elevation="2" class="fill-height">
            <v-card-title>
              <v-icon class="mr-2">mdi-domain</v-icon>
              Division Performance
            </v-card-title>
            <v-card-text>
              <v-data-table
                :headers="divisionHeaders"
                :items="analytics.divisionBreakdown"
                density="compact"
                :items-per-page="10"
              >
                <template #item.totalRevenue="{ item }">
                  <span class="font-weight-bold text-primary">{{ formatCurrency(item.totalRevenue) }}</span>
                </template>
                <template #item.avgRevenue="{ item }">
                  {{ formatCurrency(item.avgRevenue) }}
                </template>
                <template #item.activeRate="{ item }">
                  <v-chip
                    :color="getActiveRateColor(item.totalClients > 0 ? Math.round((item.activeClients / item.totalClients) * 100) : 0)"
                    size="x-small"
                    label
                  >
                    {{ item.totalClients > 0 ? Math.round((item.activeClients / item.totalClients) * 100) : 0 }}%
                  </v-chip>
                </template>
              </v-data-table>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card elevation="2" class="fill-height">
            <v-card-title>
              <v-icon class="mr-2">mdi-office-building</v-icon>
              Department Performance
            </v-card-title>
            <v-card-text>
              <v-data-table
                :headers="departmentHeaders"
                :items="analytics.departmentBreakdown"
                density="compact"
                :items-per-page="10"
              >
                <template #item.totalRevenue="{ item }">
                  <span class="font-weight-bold text-primary">{{ formatCurrency(item.totalRevenue) }}</span>
                </template>
                <template #item.avgRevenue="{ item }">
                  {{ formatCurrency(item.avgRevenue) }}
                </template>
                <template #item.activeRate="{ item }">
                  <v-chip
                    :color="getActiveRateColor(item.totalClients > 0 ? Math.round((item.activeClients / item.totalClients) * 100) : 0)"
                    size="x-small"
                    label
                  >
                    {{ item.totalClients > 0 ? Math.round((item.activeClients / item.totalClients) * 100) : 0 }}%
                  </v-chip>
                </template>
              </v-data-table>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- No Data State -->
    <v-card v-else-if="!loading && !error" class="pa-12 text-center" elevation="2">
      <v-icon size="80" color="grey">mdi-chart-box-outline</v-icon>
      <div class="text-h5 mt-4">No Analytics Data</div>
      <div class="text-grey mt-2">
        Sync client data directly from ezyVet, or import a CSV manually as a fallback.
      </div>
      <div class="d-flex gap-2 justify-center mt-6">
        <v-btn
          color="success"
          prepend-icon="mdi-cloud-sync"
          :loading="syncingContacts"
          @click="syncContactsFromEzyVet"
        >
          Sync from ezyVet
        </v-btn>
        <v-btn
          color="primary"
          variant="outlined"
          prepend-icon="mdi-upload"
          @click="showUploadDialog = true"
        >
          Import CSV (Manual)
        </v-btn>
      </div>
    </v-card>

    <!-- Error State -->
    <v-alert v-if="error" type="error" class="mt-4">
      {{ error }}
    </v-alert>

    <!-- Upload Dialog -->
    <v-dialog v-model="showUploadDialog" max-width="600" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-upload</v-icon>
          Import EzyVet CSV
          <v-spacer />
          <v-btn icon variant="text" aria-label="Close" @click="closeUploadDialog">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-text>
          <!-- Upload State -->
          <div v-if="!uploadState.processing && !uploadState.complete">
            <v-alert type="info" variant="tonal" class="mb-4">
              <div class="font-weight-bold mb-1">Expected CSV Headers:</div>
              <code class="text-caption">
                Contact Code, Contact First Name, Contact Last Name, Email Addresses,
                Mobile Numbers, Contact Physical City, Contact Physical Post Code,
                Revenue Spend YTD, Last Invoiced, Contact Division, Contact Hear About Option,
                Contact Is Active
              </code>
            </v-alert>

            <v-file-input
              v-model="uploadFile"
              accept=".csv"
              label="Select CSV file"
              prepend-icon="mdi-file-delimited"
              variant="outlined"
              show-size
              :disabled="uploadState.processing"
              @update:model-value="handleFileSelect"
            />

            <div v-if="previewData.length > 0" class="mt-4">
              <div class="text-subtitle-2 mb-2">
                Preview (first 5 rows of {{ totalPreviewRows }}):
              </div>
              <v-table density="compact" class="preview-table">
                <thead>
                  <tr>
                    <th v-for="header in previewHeaders" :key="header" class="text-caption">
                      {{ header }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, idx) in previewData" :key="idx">
                    <td v-for="header in previewHeaders" :key="header" class="text-caption">
                      {{ row[header] || '—' }}
                    </td>
                  </tr>
                </tbody>
              </v-table>

              <!-- Data Quality Warnings -->
              <div v-if="importQualityWarnings.length > 0" class="mt-4">
                <div class="text-subtitle-2 mb-2">Data Quality Summary</div>
                <v-alert
                  v-for="(warning, idx) in importQualityWarnings"
                  :key="idx"
                  :type="warning.severity"
                  variant="tonal"
                  density="compact"
                  class="mb-1"
                >
                  {{ warning.message }}
                </v-alert>
              </div>
            </div>
          </div>

          <!-- Processing State -->
          <div v-if="uploadState.processing" class="text-center py-6">
            <v-progress-circular
              :model-value="uploadState.progress"
              :size="80"
              :width="8"
              color="primary"
            >
              {{ uploadState.progress }}%
            </v-progress-circular>
            <div class="text-h6 mt-4">{{ uploadState.message }}</div>
            <div class="text-caption text-grey">
              Batch {{ uploadState.currentBatch }} of {{ uploadState.totalBatches }}
            </div>
            <div class="text-caption text-grey mt-1">
              {{ uploadState.processedRows }} / {{ uploadState.totalRows }} rows
            </div>
          </div>

          <!-- Complete State -->
          <div v-if="uploadState.complete" class="text-center py-6">
            <v-icon
              :color="uploadState.error ? 'error' : 'success'"
              size="80"
            >
              {{ uploadState.error ? 'mdi-alert-circle' : 'mdi-check-circle' }}
            </v-icon>
            <div class="text-h6 mt-4">
              {{ uploadState.error ? 'Import Failed' : 'Import Complete!' }}
            </div>
            <div v-if="!uploadState.error" class="mt-2">
              <v-chip color="success" class="mx-1">
                {{ uploadState.inserted }} inserted
              </v-chip>
              <v-chip color="info" class="mx-1">
                {{ uploadState.updated }} updated
              </v-chip>
              <v-chip v-if="uploadState.errors > 0" color="error" class="mx-1">
                {{ uploadState.errors }} errors
              </v-chip>
            </div>
            <div v-if="uploadState.error" class="text-error mt-2">
              {{ uploadState.errorMessage }}
            </div>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            v-if="!uploadState.processing && !uploadState.complete"
            variant="text"
            @click="closeUploadDialog"
          >
            Cancel
          </v-btn>
          <v-btn
            v-if="!uploadState.processing && !uploadState.complete"
            color="primary"
            :disabled="!uploadFile || previewData.length === 0"
            @click="startImport"
          >
            Start Import
          </v-btn>
          <v-btn
            v-if="uploadState.complete"
            color="primary"
            @click="closeUploadDialog"
          >
            Done
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { evaluateRetention, CLIENT_BENCHMARKS } from '~/utils/vetBenchmarks'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'marketing-admin']
})

// State
const loading = ref(false)
const syncingContacts = ref(false)
const error = ref<string | null>(null)
const analytics = ref<any>(null)
const divisions = ref<string[]>([])

// Upload state
const supabase = useSupabaseClient()
const showUploadDialog = ref(false)
const uploadFile = ref<File | null>(null)
const uploadState = ref({
  processing: false,
  complete: false,
  error: false,
  errorMessage: '',
  progress: 0,
  message: '',
  currentBatch: 0,
  totalBatches: 0,
  processedRows: 0,
  totalRows: 0,
  inserted: 0,
  updated: 0,
  errors: 0
})
const previewData = ref<any[]>([])
const previewHeaders = ref<string[]>([])
const totalPreviewRows = ref(0)
const parsedRows = ref<any[]>([])

// Import data quality warnings
const importQualityWarnings = computed(() => {
  if (parsedRows.value.length === 0) return []
  const warnings: { severity: 'warning' | 'info' | 'error'; message: string }[] = []
  const total = parsedRows.value.length

  const missingEmail = parsedRows.value.filter(r => !r.email).length
  const missingPhone = parsedRows.value.filter(r => !r.phone_mobile).length
  const missingCity = parsedRows.value.filter(r => !r.address_city).length
  const missingRevenue = parsedRows.value.filter(r => !r.revenue_ytd || r.revenue_ytd === 0).length
  const missingLastVisit = parsedRows.value.filter(r => !r.last_visit).length
  const noDivision = parsedRows.value.filter(r => !r.division).length

  if (missingEmail > 0) warnings.push({ severity: missingEmail > total * 0.3 ? 'warning' : 'info', message: `${missingEmail} of ${total} contacts (${Math.round(missingEmail / total * 100)}%) missing email address` })
  if (missingPhone > 0) warnings.push({ severity: missingPhone > total * 0.3 ? 'warning' : 'info', message: `${missingPhone} of ${total} contacts (${Math.round(missingPhone / total * 100)}%) missing phone number` })
  if (missingCity > 0) warnings.push({ severity: 'info', message: `${missingCity} of ${total} contacts (${Math.round(missingCity / total * 100)}%) missing city` })
  if (missingLastVisit > 0) warnings.push({ severity: missingLastVisit > total * 0.2 ? 'warning' : 'info', message: `${missingLastVisit} of ${total} contacts (${Math.round(missingLastVisit / total * 100)}%) have no last visit date` })
  if (missingRevenue > total * 0.5) warnings.push({ severity: 'warning', message: `${missingRevenue} contacts have $0 revenue — may indicate stale or incomplete records` })

  return warnings
})

// CSV Header mapping
const CSV_HEADER_MAP: Record<string, string> = {
  'Contact Code': 'ezyvet_contact_code',
  'Contact First Name': 'first_name',
  'Contact Last Name': 'last_name',
  'Email Addresses': 'email',
  'Mobile Numbers': 'phone_mobile',
  'Contact Physical City': 'address_city',
  'Contact Physical Post Code': 'address_zip',
  'Revenue Spend YTD': 'revenue_ytd',
  'Last Invoiced': 'last_visit',
  'Contact Division': 'division',
  'Contact Hear About Option': 'referral_source',
  'Contact Is Active': 'is_active',
  'Breed': 'breed',
  'Pet Breed': 'breed',
  'Department': 'department',
  'Service Department': 'department'
}
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
// ezyVet API SYNC
// ========================================

async function syncContactsFromEzyVet() {
  syncingContacts.value = true
  try {
    const result = await $fetch('/api/ezyvet/sync-analytics', {
      method: 'POST',
      body: { syncType: 'contacts' },
    }) as any

    if (result.success) {
      const stats = Object.values(result.results)[0] as any
      const upserted = stats?.contacts?.upserted || 0
      // Show success notification via error ref (hacky but functional)
      await loadAnalytics()
      error.value = null
      alert(`Synced ${upserted.toLocaleString()} contacts from ezyVet`)
    }
  } catch (err: any) {
    const msg = err.data?.message || err.message || 'Sync failed'
    if (msg.includes('No active ezyVet clinic')) {
      error.value = 'ezyVet API not configured yet. Use CSV import or set up API credentials in the ezyVet Integration page.'
    } else {
      error.value = 'Sync failed: ' + msg
    }
  } finally {
    syncingContacts.value = false
  }
}

// ========================================
// CSV IMPORT FUNCTIONS
// ========================================

function parseCSV(text: string): any[] {
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []

  const headers = parseCSVLine(lines[0])
  const rows: any[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === 0) continue

    const row: Record<string, any> = {}
    headers.forEach((header, idx) => {
      row[header.trim()] = values[idx]?.trim() || ''
    })
    rows.push(row)
  }

  return rows
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

function transformRow(csvRow: Record<string, any>): Record<string, any> {
  const dbRow: Record<string, any> = {}

  for (const [csvHeader, dbField] of Object.entries(CSV_HEADER_MAP)) {
    let value = csvRow[csvHeader]

    if (value === undefined || value === '') {
      value = null
    } else if (dbField === 'is_active') {
      value = value?.toUpperCase() === 'YES'
    } else if (dbField === 'revenue_ytd') {
      value = parseFloat(value?.replace(/[$,]/g, '')) || 0
    } else if (dbField === 'last_visit' && value) {
      const parsed = new Date(value)
      value = isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0]
    }

    dbRow[dbField] = value
  }

  return dbRow
}

async function handleFileSelect(fileInput: File | File[] | null) {
  const file = Array.isArray(fileInput) ? fileInput[0] : fileInput

  if (!file) {
    previewData.value = []
    previewHeaders.value = []
    parsedRows.value = []
    return
  }

  const text = await file.text()
  const rows = parseCSV(text)
  totalPreviewRows.value = rows.length

  if (rows.length > 0) {
    previewHeaders.value = Object.keys(CSV_HEADER_MAP)
    previewData.value = rows.slice(0, 5)
    parsedRows.value = rows.map(transformRow)
  }
}

async function startImport() {
  if (parsedRows.value.length === 0) return

  const BATCH_SIZE = 500
  const batches: any[][] = []

  for (let i = 0; i < parsedRows.value.length; i += BATCH_SIZE) {
    batches.push(parsedRows.value.slice(i, i + BATCH_SIZE))
  }

  uploadState.value = {
    processing: true,
    complete: false,
    error: false,
    errorMessage: '',
    progress: 0,
    message: 'Starting import...',
    currentBatch: 0,
    totalBatches: batches.length,
    processedRows: 0,
    totalRows: parsedRows.value.length,
    inserted: 0,
    updated: 0,
    errors: 0
  }

  try {
    // Create sync history record
    const { data: syncRecord, error: syncError } = await supabase
      .from('ezyvet_sync_history')
      .insert({
        sync_type: 'csv_import',
        status: 'running',
        total_rows: parsedRows.value.length,
        file_name: uploadFile.value?.name,
        triggered_by: 'user'
      })
      .select()
      .single()

    if (syncError) console.warn('Could not create sync record:', syncError)

    // Process batches
    for (let i = 0; i < batches.length; i++) {
      uploadState.value.currentBatch = i + 1
      uploadState.value.message = `Processing batch ${i + 1} of ${batches.length}...`

      const batch = batches[i]

      try {
        const result = await $fetch('/api/marketing/ezyvet-upsert', {
          method: 'POST',
          body: { contacts: batch }
        })

        if (result) {
          uploadState.value.inserted += result.inserted || 0
          uploadState.value.updated += result.updated || 0
          uploadState.value.errors += result.errors || 0
        }
      } catch (fetchErr: any) {
        console.error('[EzyVet Import] Batch error:', fetchErr)
        uploadState.value.errors += batch.length
      }

      uploadState.value.processedRows += batch.length
      uploadState.value.progress = Math.round((uploadState.value.processedRows / uploadState.value.totalRows) * 100)
    }

    // Update sync history
    if (syncRecord) {
      await supabase
        .from('ezyvet_sync_history')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          inserted_count: uploadState.value.inserted,
          updated_count: uploadState.value.updated,
          error_count: uploadState.value.errors
        })
        .eq('id', syncRecord.id)
    }

    uploadState.value.complete = true
    uploadState.value.processing = false

    // Reload analytics after import
    await loadAnalytics()

  } catch (err: any) {
    uploadState.value.error = true
    uploadState.value.errorMessage = err.message || 'Import failed'
    uploadState.value.processing = false
    uploadState.value.complete = true
  }
}

function closeUploadDialog() {
  showUploadDialog.value = false
  uploadFile.value = null
  previewData.value = []
  previewHeaders.value = []
  parsedRows.value = []
  uploadState.value = {
    processing: false,
    complete: false,
    error: false,
    errorMessage: '',
    progress: 0,
    message: '',
    currentBatch: 0,
    totalBatches: 0,
    processedRows: 0,
    totalRows: 0,
    inserted: 0,
    updated: 0,
    errors: 0
  }
}

// ========================================
// DATA QUALITY FIELDS (computed for display)
// ========================================
const dataQualityFields = computed(() => {
  const dq = analytics.value?.dataQuality
  if (!dq || dq.totalRecords === 0) return []
  const total = dq.totalRecords
  const fields = [
    { key: 'email', label: 'Email', missing: dq.missingEmail, icon: 'mdi-email' },
    { key: 'phone', label: 'Phone', missing: dq.missingPhone, icon: 'mdi-phone' },
    { key: 'city', label: 'City', missing: dq.missingCity, icon: 'mdi-map-marker' },
    { key: 'zip', label: 'Zip Code', missing: dq.missingZip, icon: 'mdi-map-marker-outline' },
    { key: 'lastVisit', label: 'Last Visit', missing: dq.missingLastVisit, icon: 'mdi-calendar' },
    { key: 'division', label: 'Division', missing: dq.missingDivision, icon: 'mdi-domain' }
  ]
  return fields.map(f => {
    const presentPct = Math.round(((total - f.missing) / total) * 100)
    return {
      ...f,
      pct: presentPct,
      color: presentPct >= 80 ? 'success' : presentPct >= 50 ? 'warning' : 'error'
    }
  })
})

// ========================================
// CHART CONFIGURATIONS
// ========================================

// Client Segmentation Donut
const segmentDonutOptions = computed(() => ({
  chart: { type: 'donut' },
  labels: analytics.value?.clientSegments?.map((s: any) => s.label) || [],
  colors: ['#E91E63', '#9C27B0', '#1976D2', '#4CAF50', '#9E9E9E'],
  legend: { position: 'bottom', fontSize: '12px' },
  plotOptions: {
    pie: {
      donut: {
        size: '60%',
        labels: {
          show: true,
          total: {
            show: true,
            label: 'Total Revenue',
            formatter: () => formatCurrencyShort(analytics.value?.kpis?.totalRevenue || 0)
          }
        }
      }
    }
  },
  tooltip: {
    y: { formatter: (val: number) => formatCurrency(val) }
  },
  dataLabels: {
    formatter: (val: number) => `${Math.round(val)}%`
  }
}))

const segmentDonutSeries = computed(() =>
  analytics.value?.clientSegments?.map((s: any) => s.revenue) || []
)

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
    align: 'center' as const,
    style: { fontSize: '14px', color: '#666' }
  }
}))

const revenueDistributionSeries = computed(() => [{
  name: 'Clients',
  data: analytics.value?.revenueDistribution?.map((d: any) => d.count) || []
}])

// Neighborhood Analysis Chart
const geoNeighborhoodOptions = computed(() => {
  const areas = analytics.value?.geographicBreakdown?.slice(0, 12) || []
  return {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        dataLabels: { position: 'center' }
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => val,
      style: { fontSize: '11px', colors: ['#fff'] }
    },
    xaxis: {
      categories: areas.map((c: any) => c.neighborhood)
    },
    colors: ['#1976D2'],
    tooltip: {
      y: { formatter: (val: number) => `${val} clients` }
    }
  }
})

const geoNeighborhoodSeries = computed(() => [{
  name: 'Clients',
  data: (analytics.value?.geographicBreakdown?.slice(0, 12) || []).map((c: any) => c.totalClients)
}])

// Recency Analysis Chart
const recencyTotal = computed(() => {
  if (!analytics.value?.recencyChart) return 0
  return analytics.value.recencyChart.reduce((sum: number, d: any) => sum + (d.count || 0), 0)
})

const recencyOptions = computed(() => ({
  chart: {
    type: 'bar',
    toolbar: { show: true }
  },
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '60%',
      borderRadius: 4,
      distributed: true
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
  },
  legend: { show: false }
}))

const recencySeries = computed(() => [{
  name: 'Clients',
  data: analytics.value?.recencyChart?.map((d: any) => d.count) || []
}])

// ========================================
// TABLE HEADERS
// ========================================

const segmentHeaders = [
  { title: 'Segment', key: 'label', sortable: false },
  { title: 'Clients', key: 'count', sortable: true },
  { title: 'Revenue', key: 'revenue', sortable: true },
  { title: 'Avg Revenue', key: 'avgRevenue', sortable: true },
  { title: 'Retention', key: 'retentionRate', sortable: true }
]

const churnHeaders = [
  { title: 'Client', key: 'name', sortable: true },
  { title: 'Revenue YTD', key: 'revenue', sortable: true },
  { title: 'Last Visit', key: 'lastVisit', sortable: true },
  { title: 'Days Since', key: 'daysSinceVisit', sortable: true },
  { title: 'Risk', key: 'riskLevel', sortable: true },
  { title: 'Division', key: 'division', sortable: true },
  { title: 'City', key: 'city', sortable: true },
  { title: 'Email', key: 'email', sortable: false }
]

const topClientHeaders = [
  { title: 'Client', key: 'name', sortable: true },
  { title: 'Revenue YTD', key: 'revenue', sortable: true },
  { title: 'Last Visit', key: 'lastVisit', sortable: true },
  { title: 'Division', key: 'division', sortable: true },
  { title: 'Zip', key: 'zip', sortable: true },
  { title: 'Email', key: 'email', sortable: false }
]

const geoHeaders = [
  { title: 'Neighborhood', key: 'neighborhood', sortable: true },
  { title: 'Zip Codes', key: 'zipCodes', sortable: false },
  { title: 'Clients', key: 'totalClients', sortable: true },
  { title: 'Active', key: 'activeClients', sortable: true },
  { title: 'Retention', key: 'retentionRate', sortable: true },
  { title: 'Revenue', key: 'totalRevenue', sortable: true },
  { title: 'Avg Revenue', key: 'avgRevenue', sortable: true }
]

const divisionHeaders = [
  { title: 'Division', key: 'division', sortable: true },
  { title: 'Total Clients', key: 'totalClients', sortable: true },
  { title: 'Active Clients', key: 'activeClients', sortable: true },
  { title: 'Active Rate', key: 'activeRate', sortable: false },
  { title: 'Total Revenue', key: 'totalRevenue', sortable: true },
  { title: 'Avg Revenue', key: 'avgRevenue', sortable: true }
]

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

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

function getActiveRateColor(rate: number): string {
  if (rate >= 70) return 'success'
  if (rate >= 40) return 'warning'
  return 'error'
}

function getRecencyClass(dateStr: string): string {
  if (!dateStr) return 'text-grey'
  const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 90) return 'text-success'
  if (diffDays <= 180) return 'text-warning'
  return 'text-error'
}

function getRecencyLabel(dateStr: string): string {
  if (!dateStr) return ''
  const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 30) return 'Recent'
  if (diffDays <= 90) return `${diffDays} days ago`
  return `${Math.floor(diffDays / 30)} months ago`
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

.insights-scroll {
  max-height: 400px;
  overflow-y: auto;
}

.action-item {
  border-left: 4px solid transparent;
  transition: background-color 0.2s;
}

.action-high {
  background-color: rgba(244, 67, 54, 0.06);
  border-left-color: #F44336;
}

.action-medium {
  background-color: rgba(255, 152, 0, 0.06);
  border-left-color: #FF9800;
}

.action-low {
  background-color: rgba(33, 150, 243, 0.06);
  border-left-color: #2196F3;
}

.action-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

@media print {
  .v-btn {
    display: none !important;
  }
  
  .v-card {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  
  .insights-scroll {
    max-height: none;
    overflow: visible;
  }
}

.preview-table {
  max-height: 200px;
  overflow: auto;
}

.preview-table th,
.preview-table td {
  white-space: nowrap;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>