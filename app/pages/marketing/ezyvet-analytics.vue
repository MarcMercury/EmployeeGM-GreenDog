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
              <v-avatar :color="analytics.kpis.retentionRate >= 60 ? 'success' : analytics.kpis.retentionRate >= 40 ? 'warning' : 'error'" size="56" class="mr-4">
                <v-icon color="white" size="28">mdi-account-heart</v-icon>
              </v-avatar>
              <div>
                <div class="text-h4 font-weight-bold" :class="analytics.kpis.retentionRate >= 60 ? 'text-success' : analytics.kpis.retentionRate >= 40 ? 'text-warning' : 'text-error'">
                  {{ analytics.kpis.retentionRate }}%
                </div>
                <div class="text-body-2 text-grey">Retention Rate</div>
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

      <!-- ===== CHARTS ROW: Breed + Referral Source ===== -->
      <v-row class="mb-6">
        <v-col cols="12" md="6">
          <v-card elevation="2" class="fill-height">
            <v-card-title>
              <v-icon class="mr-2">mdi-paw</v-icon>
              Revenue by Breed (Top 10)
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
        <v-col cols="12" md="6">
          <v-card elevation="2" class="fill-height">
            <v-card-title>
              <v-icon class="mr-2">mdi-bullhorn</v-icon>
              Client Referral Sources
            </v-card-title>
            <v-card-text>
              <ClientOnly>
                <apexchart
                  type="pie"
                  height="350"
                  :options="referralPieOptions"
                  :series="referralPieSeries"
                />
              </ClientOnly>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- ===== GEOGRAPHIC ANALYSIS ===== -->
      <v-card elevation="2" class="mb-6" v-if="analytics.geographicBreakdown?.length">
        <v-card-title>
          <v-icon class="mr-2">mdi-map-marker-radius</v-icon>
          Geographic Analysis — Top Cities
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <ClientOnly>
                <apexchart
                  type="bar"
                  height="350"
                  :options="geoCityOptions"
                  :series="geoCitySeries"
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

      <!-- ===== REFERRAL SOURCE TABLE ===== -->
      <v-card elevation="2" class="mb-6" v-if="analytics.referralBreakdown?.length">
        <v-card-title>
          <v-icon class="mr-2">mdi-share-variant</v-icon>
          Referral Source Performance
        </v-card-title>
        <v-card-text>
          <v-data-table
            :headers="referralHeaders"
            :items="analytics.referralBreakdown"
            density="comfortable"
            :items-per-page="10"
          >
            <template #item.source="{ item }">
              <span class="font-weight-medium">{{ item.source }}</span>
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
  middleware: ['auth', 'marketing-admin']
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
    { key: 'lastVisit', label: 'Last Visit', missing: dq.missingLastVisit, icon: 'mdi-calendar' },
    { key: 'referral', label: 'Referral Source', missing: dq.missingReferralSource, icon: 'mdi-share-variant' },
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
    formatter: (val: number) => formatCurrencyShort(val),
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

// Referral Source Pie Chart
const referralPieOptions = computed(() => {
  const items = analytics.value?.referralBreakdown?.slice(0, 8) || []
  return {
    chart: { type: 'pie' },
    labels: items.map((r: any) => r.source),
    colors: ['#1976D2', '#4CAF50', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4', '#795548', '#607D8B'],
    legend: { position: 'bottom', fontSize: '11px' },
    tooltip: {
      y: { formatter: (val: number) => `${val} clients` }
    }
  }
})

const referralPieSeries = computed(() =>
  (analytics.value?.referralBreakdown?.slice(0, 8) || []).map((r: any) => r.totalClients)
)

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

// Geographic City Chart
const geoCityOptions = computed(() => {
  const cities = analytics.value?.geographicBreakdown?.slice(0, 10) || []
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
      categories: cities.map((c: any) => c.city)
    },
    colors: ['#1976D2'],
    tooltip: {
      y: { formatter: (val: number) => `${val} clients` }
    }
  }
})

const geoCitySeries = computed(() => [{
  name: 'Clients',
  data: (analytics.value?.geographicBreakdown?.slice(0, 10) || []).map((c: any) => c.totalClients)
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
  { title: 'City', key: 'city', sortable: true },
  { title: 'Breed', key: 'breed', sortable: true },
  { title: 'Email', key: 'email', sortable: false }
]

const geoHeaders = [
  { title: 'City', key: 'city', sortable: true },
  { title: 'Clients', key: 'totalClients', sortable: true },
  { title: 'Active', key: 'activeClients', sortable: true },
  { title: 'Retention', key: 'retentionRate', sortable: true },
  { title: 'Revenue', key: 'totalRevenue', sortable: true },
  { title: 'Avg Revenue', key: 'avgRevenue', sortable: true }
]

const referralHeaders = [
  { title: 'Source', key: 'source', sortable: true },
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
</style>