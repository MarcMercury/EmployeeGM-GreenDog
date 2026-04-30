<!--
  Unified Practice Analytics & CRM Report
  ========================================
  Single source of truth combining CRM client data (ezyVet contacts) +
  Invoice Lines to produce a complete business performance picture:
    • Veterinary KPIs (revenue, appointments, ARPU, retention, lapsed %)
    • Location performance
    • Client behavior (segments, churn, geography, recency)
    • Service performance (categories, product groups, staff, departments)
    • Trends (monthly/weekly revenue & volume)
    • Invoice upload history & data freshness

  Upload wizard (triggered when data missing, or manually):
    Step 1 → CRM Client CSV (ezyVet contacts export)
    Step 2 → Invoice Line CSV/XLSX files (one or many)
    Step 3 → Dashboard
-->
<template>
  <div class="unified-analytics-page">
    <!-- ═══════════════════════════ HEADER ═══════════════════════════ -->
    <div class="d-flex justify-space-between align-center flex-wrap gap-2 mb-4">
      <div>
        <h1 class="text-h4 font-weight-bold">Practice Analytics &amp; CRM</h1>
        <p class="text-subtitle-2 text-grey mb-1">
          One unified report — KPIs, location &amp; service performance, client behavior.
        </p>
        <div class="text-caption d-flex align-center flex-wrap gap-2">
          <v-chip
            size="x-small"
            :color="hasCrmData ? 'success' : 'grey'"
            variant="tonal"
            :prepend-icon="hasCrmData ? 'mdi-check-circle' : 'mdi-circle-outline'"
          >
            CRM Clients: {{ crmContactCount.toLocaleString() }}
          </v-chip>
          <v-chip
            size="x-small"
            :color="hasInvoiceData ? 'success' : 'grey'"
            variant="tonal"
            :prepend-icon="hasInvoiceData ? 'mdi-check-circle' : 'mdi-circle-outline'"
          >
            Invoice lines: {{ invoiceLineCount.toLocaleString() }}
          </v-chip>
          <span v-if="lastCrmSync" class="text-grey">
            <v-icon size="12">mdi-sync</v-icon>
            CRM synced {{ formatDateTime(lastCrmSync) }}
          </span>
        </div>
      </div>
      <div class="d-flex gap-2 flex-wrap">
        <v-btn color="primary" prepend-icon="mdi-upload" @click="openWizard">
          Upload Data
        </v-btn>
        <v-btn color="success" prepend-icon="mdi-cloud-sync" variant="outlined" :loading="syncing" @click="syncAll">
          Sync ezyVet
        </v-btn>
        <v-btn
          color="deep-purple"
          variant="outlined"
          prepend-icon="mdi-robot-outline"
          :loading="aiReviewLoading"
          :disabled="!hasAnyData"
          @click="runAiReview"
        >
          AI Review
        </v-btn>
        <v-btn color="primary" variant="outlined" prepend-icon="mdi-printer" @click="printReport">Print</v-btn>
        <v-btn color="primary" variant="text" prepend-icon="mdi-refresh" :loading="loading" @click="loadAll">Refresh</v-btn>
        <v-btn color="error" variant="text" prepend-icon="mdi-delete-sweep" :disabled="!hasAnyData || clearing" @click="clearDialogOpen = true">
          Clear Data
        </v-btn>
      </div>
    </div>

    <!-- ═══════════════════════════ FILTERS ═══════════════════════════ -->
    <v-card class="mb-4" elevation="1">
      <v-card-text class="py-3">
        <v-row dense align="center">
          <v-col cols="12" md="3">
            <v-select
              v-model="locationFilter"
              :items="locationOptions"
              label="Location"
              density="compact" variant="outlined" hide-details clearable
              placeholder="All Locations"
            />
          </v-col>
          <v-col cols="6" md="3">
            <v-text-field v-model="dateRange.start" type="date" label="From" density="compact" variant="outlined" hide-details />
          </v-col>
          <v-col cols="6" md="3">
            <v-text-field v-model="dateRange.end" type="date" label="To" density="compact" variant="outlined" hide-details />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="divisionFilter"
              :items="['All Divisions', ...(crmAnalytics?.divisions || [])]"
              label="Division (CRM)"
              density="compact" variant="outlined" hide-details clearable
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Data-missing banner leads the user to the wizard -->
    <v-alert
      v-if="!loading && !hasAnyData"
      type="info" variant="tonal" class="mb-4"
      prepend-icon="mdi-database-import"
    >
      <div class="font-weight-bold">No data yet — let's build your full performance picture.</div>
      <div class="text-caption mb-2">
        Upload your CRM Client export <strong>and</strong> your Invoice Lines exports to unlock the complete report.
      </div>
      <v-btn color="primary" prepend-icon="mdi-play" size="small" @click="openWizard">Start Upload Wizard</v-btn>
    </v-alert>

    <v-alert
      v-else-if="!loading && (!hasCrmData || !hasInvoiceData)"
      type="warning" variant="tonal" class="mb-4"
      prepend-icon="mdi-alert-circle-outline"
    >
      <div class="font-weight-bold">
        Partial data — {{ !hasCrmData ? 'CRM client data missing' : 'invoice data missing' }}.
      </div>
      <div class="text-caption mb-2">
        Some sections below will be empty until both datasets are uploaded.
      </div>
      <v-btn color="primary" prepend-icon="mdi-upload" size="small" @click="openWizard">Upload Missing Data</v-btn>
    </v-alert>

    <!-- Loading -->
    <div v-if="loading" class="text-center pa-12">
      <v-progress-circular indeterminate color="primary" size="56" />
      <p class="text-grey mt-4">Loading unified analytics...</p>
    </div>

    <template v-else-if="hasAnyData">
      <!-- ═══ UNIFIED KPI STRIP ═══ -->
      <v-row class="mb-5">
        <v-col cols="6" md="2">
          <v-card class="pa-3" elevation="2">
            <div class="d-flex align-center">
              <v-avatar color="green-darken-1" size="40" class="mr-2"><v-icon color="white">mdi-currency-usd</v-icon></v-avatar>
              <div>
                <div class="text-h6 font-weight-bold">${{ fmtCur(kpis.totalRevenue) }}</div>
                <div class="text-caption text-grey">Total Revenue</div>
              </div>
            </div>
          </v-card>
        </v-col>
        <v-col cols="6" md="2">
          <v-card class="pa-3" elevation="2">
            <div class="d-flex align-center">
              <v-avatar color="deep-purple-darken-1" size="40" class="mr-2"><v-icon color="white">mdi-calendar-check</v-icon></v-avatar>
              <div>
                <div class="text-h6 font-weight-bold">{{ fmt(kpis.totalAppointments) }}</div>
                <div class="text-caption text-grey">Appointments</div>
              </div>
            </div>
          </v-card>
        </v-col>
        <v-col cols="6" md="2">
          <v-card class="pa-3" elevation="2">
            <div class="d-flex align-center">
              <v-avatar color="blue-darken-1" size="40" class="mr-2"><v-icon color="white">mdi-account-group</v-icon></v-avatar>
              <div>
                <div class="text-h6 font-weight-bold">{{ fmt(kpis.uniqueClients) }}</div>
                <div class="text-caption text-grey">Active Clients</div>
              </div>
            </div>
          </v-card>
        </v-col>
        <v-col cols="6" md="2">
          <v-card class="pa-3" elevation="2">
            <div class="d-flex align-center">
              <v-avatar color="teal-darken-1" size="40" class="mr-2"><v-icon color="white">mdi-receipt-text-outline</v-icon></v-avatar>
              <div>
                <div class="text-h6 font-weight-bold">${{ fmtCur(kpis.avgRevenuePerAppt) }}</div>
                <div class="text-caption text-grey">Rev / Appt</div>
              </div>
            </div>
          </v-card>
        </v-col>
        <v-col cols="6" md="2">
          <v-card class="pa-3" elevation="2">
            <div class="d-flex align-center">
              <v-avatar color="indigo-darken-1" size="40" class="mr-2"><v-icon color="white">mdi-chart-line</v-icon></v-avatar>
              <div>
                <div class="text-h6 font-weight-bold">${{ fmtCur(kpis.arpu) }}</div>
                <div class="text-caption text-grey">ARPU ($25+)</div>
              </div>
            </div>
          </v-card>
        </v-col>
        <v-col cols="6" md="2">
          <v-card class="pa-3" elevation="2">
            <div class="d-flex align-center">
              <v-avatar :color="retentionColor" size="40" class="mr-2"><v-icon color="white">mdi-account-heart</v-icon></v-avatar>
              <div>
                <div class="text-h6 font-weight-bold">{{ kpis.retentionRate }}%</div>
                <div class="text-caption text-grey">Retention</div>
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Insights + Suggested Actions (from CRM analytics) -->
      <v-row v-if="crmAnalytics?.insights?.length || crmAnalytics?.suggestedActions?.length" class="mb-5">
        <v-col cols="12" md="6">
          <v-card elevation="2" class="fill-height">
            <v-card-title class="d-flex align-center">
              <v-icon class="mr-2" color="info">mdi-lightbulb-on</v-icon>
              Key Insights
              <v-spacer />
              <v-chip size="x-small" color="info" variant="tonal">{{ crmAnalytics.insights?.length || 0 }}</v-chip>
            </v-card-title>
            <v-card-text class="insights-scroll">
              <v-alert
                v-for="(insight, idx) in crmAnalytics.insights"
                :key="idx" :type="insight.type" variant="tonal" density="compact"
                class="mb-2" border="start"
              >
                <template #prepend><v-icon>{{ insight.icon }}</v-icon></template>
                <div class="font-weight-bold text-body-2">{{ insight.title }}</div>
                <div class="text-caption">{{ insight.detail }}</div>
              </v-alert>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card elevation="2" class="fill-height">
            <v-card-title class="d-flex align-center">
              <v-icon class="mr-2" color="warning">mdi-clipboard-check-outline</v-icon>
              Suggested Actions
              <v-spacer />
              <v-chip size="x-small" color="warning" variant="tonal">{{ crmAnalytics.suggestedActions?.length || 0 }}</v-chip>
            </v-card-title>
            <v-card-text class="insights-scroll">
              <div
                v-for="(action, idx) in crmAnalytics.suggestedActions" :key="idx"
                class="action-item mb-3 pa-3 rounded-lg" :class="`action-${action.priority}`"
              >
                <div class="d-flex align-center mb-1">
                  <v-icon size="20" class="mr-2">{{ action.icon }}</v-icon>
                  <span class="font-weight-bold text-body-2">{{ action.title }}</span>
                  <v-spacer />
                  <v-chip :color="action.priority === 'high' ? 'error' : action.priority === 'medium' ? 'warning' : 'info'" size="x-small" label>
                    {{ action.priority }}
                  </v-chip>
                </div>
                <div class="text-caption text-medium-emphasis">{{ action.detail }}</div>
                <div v-if="action.metric" class="text-caption font-weight-bold mt-1" style="color: #1976D2;">
                  {{ action.metric }}
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- ═══ AI DATA REVIEW ═══ -->
      <v-card v-if="aiReview" class="mb-5" elevation="3" border>
        <v-card-title class="d-flex align-center flex-wrap">
          <v-icon start color="deep-purple">mdi-robot-outline</v-icon>
          AI Data &amp; Methodology Review
          <v-chip
            class="ml-3"
            size="small"
            :color="aiReview.confidenceScore >= 75 ? 'success' : aiReview.confidenceScore >= 50 ? 'warning' : 'error'"
            label
          >
            Confidence: {{ aiReview.confidenceScore }}%
          </v-chip>
          <v-spacer />
          <span class="text-caption text-grey">
            {{ aiReview.model }} · {{ aiReview.tokensUsed.toLocaleString() }} tokens · ${{ aiReview.costUsd.toFixed(4) }}
          </span>
          <v-btn icon="mdi-close" variant="text" size="small" class="ml-2" @click="aiReview = null" />
        </v-card-title>

        <v-card-text>
          <p class="text-body-1 mb-4 font-italic">{{ aiReview.summary }}</p>

          <v-row dense>
            <!-- Findings -->
            <v-col cols="12" md="7">
              <div class="text-subtitle-2 mb-2">
                <v-icon size="18" class="mr-1">mdi-magnify-scan</v-icon>
                Findings ({{ aiReview.findings.length }})
              </div>
              <div v-if="!aiReview.findings.length" class="text-caption text-grey">No findings.</div>
              <v-alert
                v-for="(f, idx) in aiReview.findings"
                :key="idx"
                :type="aiSeverityType(f.severity)"
                variant="tonal"
                density="compact"
                class="mb-2"
                border="start"
              >
                <div class="d-flex align-center mb-1">
                  <v-chip size="x-small" label class="mr-2 text-uppercase" :color="aiCategoryColor(f.category)">
                    {{ f.category.replace('_', ' ') }}
                  </v-chip>
                  <span class="font-weight-bold text-body-2">{{ f.title }}</span>
                </div>
                <div class="text-caption">{{ f.detail }}</div>
                <div v-if="f.metric" class="text-caption font-weight-bold mt-1">
                  Metric: {{ f.metric }}
                  <span v-if="f.affectedRecords"> · {{ f.affectedRecords.toLocaleString() }} records</span>
                </div>
                <div v-if="f.suggestedAction" class="text-caption mt-1">
                  <v-icon size="14">mdi-arrow-right-bold</v-icon> {{ f.suggestedAction }}
                </div>
              </v-alert>
            </v-col>

            <!-- Verified metrics + actions -->
            <v-col cols="12" md="5">
              <div class="text-subtitle-2 mb-2">
                <v-icon size="18" class="mr-1">mdi-check-decagram-outline</v-icon>
                Metric Audit
              </div>
              <v-table density="compact" class="mb-4">
                <tbody>
                  <tr v-for="(m, idx) in aiReview.verifiedMetrics" :key="idx">
                    <td class="text-caption">{{ m.name }}</td>
                    <td class="text-caption text-right font-weight-bold">{{ m.value }}</td>
                    <td class="text-right" style="width:100px">
                      <v-chip
                        size="x-small" label
                        :color="m.assessment === 'verified' ? 'success' : m.assessment === 'questionable' ? 'warning' : 'error'"
                      >
                        {{ m.assessment }}
                      </v-chip>
                    </td>
                  </tr>
                </tbody>
              </v-table>

              <div class="text-subtitle-2 mb-2">
                <v-icon size="18" class="mr-1">mdi-clipboard-check-outline</v-icon>
                Top Recommended Actions
              </div>
              <div
                v-for="(a, idx) in aiReview.topActions"
                :key="idx"
                class="action-item mb-2 pa-2 rounded-lg"
                :class="`action-${a.priority}`"
              >
                <div class="d-flex align-center mb-1">
                  <span class="font-weight-bold text-body-2">{{ a.title }}</span>
                  <v-spacer />
                  <v-chip size="x-small" label :color="a.priority === 'high' ? 'error' : a.priority === 'medium' ? 'warning' : 'info'">
                    {{ a.priority }}
                  </v-chip>
                </div>
                <div class="text-caption text-medium-emphasis">{{ a.rationale }}</div>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- ═══ TABS ═══ -->
      <v-tabs v-model="activeTab" color="deep-purple" class="mb-4">
        <v-tab value="overview"><v-icon start size="18">mdi-view-dashboard</v-icon>Overview</v-tab>
        <v-tab value="locations"><v-icon start size="18">mdi-map-marker</v-icon>Locations</v-tab>
        <v-tab value="clients"><v-icon start size="18">mdi-account-group</v-icon>Client Behavior</v-tab>
        <v-tab value="services"><v-icon start size="18">mdi-tag-multiple</v-icon>Services</v-tab>
        <v-tab value="staff"><v-icon start size="18">mdi-account-tie</v-icon>Staff Performance</v-tab>
        <v-tab value="trends"><v-icon start size="18">mdi-chart-line</v-icon>Trends</v-tab>
        <v-tab value="data"><v-icon start size="18">mdi-database-check</v-icon>Data Sources</v-tab>
      </v-tabs>

      <v-window v-model="activeTab">
        <!-- ─────────── OVERVIEW ─────────── -->
        <v-window-item value="overview">
          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <v-card elevation="2">
                <v-card-title class="text-subtitle-1"><v-icon start>mdi-map-marker</v-icon>Appointments by Location</v-card-title>
                <v-card-text>
                  <ClientOnly>
                    <apexchart v-if="hasLocBarData" type="bar" height="280" :options="locBarOptions" :series="locBarSeries" :key="'locbar'+chartKey" />
                  </ClientOnly>
                  <div v-if="!hasLocBarData" class="text-center text-grey pa-8">Invoice data required</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card elevation="2">
                <v-card-title class="text-subtitle-1"><v-icon start>mdi-cash-multiple</v-icon>Revenue / Appointment by Location</v-card-title>
                <v-card-text>
                  <ClientOnly>
                    <apexchart v-if="hasRevPerApptData" type="bar" height="280" :options="revPerApptOptions" :series="revPerApptSeries" :key="'rpa'+chartKey" />
                  </ClientOnly>
                  <div v-if="!hasRevPerApptData" class="text-center text-grey pa-8">Invoice data required</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <v-card class="mb-4" elevation="2">
            <v-card-title class="text-subtitle-1"><v-icon start>mdi-chart-timeline-variant</v-icon>Monthly Trend — Revenue &amp; Appointments</v-card-title>
            <v-card-text>
              <ClientOnly>
                <apexchart v-if="monthlyTrendSeries.length" type="line" height="320" :options="monthlyTrendOptions" :series="monthlyTrendSeries" :key="'mtrend'+chartKey" />
              </ClientOnly>
              <div v-if="!monthlyTrendSeries.length" class="text-center text-grey pa-8">Invoice data required</div>
            </v-card-text>
          </v-card>

          <v-row>
            <v-col cols="12" md="6">
              <v-card elevation="2">
                <v-card-title class="text-subtitle-1"><v-icon start>mdi-tag-multiple</v-icon>Service Category Distribution</v-card-title>
                <v-card-text>
                  <ClientOnly>
                    <apexchart v-if="svcCatSeries.length" type="donut" height="320" :options="svcCatOptions" :series="svcCatSeries" :key="'svccat'+chartKey" />
                  </ClientOnly>
                  <div v-if="!svcCatSeries.length" class="text-center text-grey pa-8">Invoice data required</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card elevation="2">
                <v-card-title class="text-subtitle-1"><v-icon start>mdi-account-group</v-icon>Client Segmentation</v-card-title>
                <v-card-text>
                  <ClientOnly>
                    <apexchart v-if="segmentDonutSeries.length" type="donut" height="320" :options="segmentDonutOptions" :series="segmentDonutSeries" :key="'seg'+chartKey" />
                  </ClientOnly>
                  <div v-if="!segmentDonutSeries.length" class="text-center text-grey pa-8">CRM data required</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-window-item>

        <!-- ─────────── LOCATIONS ─────────── -->
        <v-window-item value="locations">
          <v-card class="mb-4" elevation="2">
            <v-card-title class="text-subtitle-1"><v-icon start>mdi-swap-horizontal</v-icon>Revenue / Appointment Cross-Reference</v-card-title>
            <v-card-text>
              <v-table density="comfortable">
                <thead>
                  <tr>
                    <th>Location</th>
                    <th class="text-right">Appointments</th>
                    <th class="text-right">Revenue</th>
                    <th class="text-right">Rev / Appt</th>
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

          <v-row>
            <v-col cols="12" md="6">
              <v-card elevation="2">
                <v-card-title class="text-subtitle-1"><v-icon start>mdi-domain</v-icon>Division Performance (CRM)</v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="divisionHeaders"
                    :items="crmAnalytics?.divisionBreakdown || []"
                    density="compact" :items-per-page="10"
                  >
                    <template #item.totalRevenue="{ item }">
                      <span class="font-weight-bold text-primary">${{ fmtCur(item.totalRevenue) }}</span>
                    </template>
                    <template #item.avgRevenue="{ item }">${{ fmtCur(item.avgRevenue) }}</template>
                  </v-data-table>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card elevation="2">
                <v-card-title class="text-subtitle-1"><v-icon start>mdi-office-building</v-icon>Department Performance (CRM)</v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="departmentHeaders"
                    :items="crmAnalytics?.departmentBreakdown || []"
                    density="compact" :items-per-page="10"
                  >
                    <template #item.totalRevenue="{ item }">
                      <span class="font-weight-bold text-primary">${{ fmtCur(item.totalRevenue) }}</span>
                    </template>
                    <template #item.avgRevenue="{ item }">${{ fmtCur(item.avgRevenue) }}</template>
                  </v-data-table>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-window-item>

        <!-- ─────────── CLIENT BEHAVIOR ─────────── -->
        <v-window-item value="clients">
          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <v-card elevation="2">
                <v-card-title class="text-subtitle-1"><v-icon start>mdi-chart-histogram</v-icon>Revenue Distribution ($25+)</v-card-title>
                <v-card-text>
                  <ClientOnly>
                    <apexchart v-if="revenueDistributionSeries[0]?.data?.length" type="bar" height="320" :options="revenueDistributionOptions" :series="revenueDistributionSeries" :key="'revdist'+chartKey" />
                  </ClientOnly>
                  <div v-if="!revenueDistributionSeries[0]?.data?.length" class="text-center text-grey pa-8">CRM data required</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card elevation="2">
                <v-card-title class="text-subtitle-1"><v-icon start>mdi-clock-outline</v-icon>Recency Analysis</v-card-title>
                <v-card-text>
                  <ClientOnly>
                    <apexchart v-if="recencySeries[0]?.data?.length" type="bar" height="320" :options="recencyOptions" :series="recencySeries" :key="'rec'+chartKey" />
                  </ClientOnly>
                  <div v-if="!recencySeries[0]?.data?.length" class="text-center text-grey pa-8">CRM data required</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <v-card v-if="crmAnalytics?.churnRisk?.length" class="mb-4" elevation="2">
            <v-card-title>
              <v-icon start color="error">mdi-account-alert</v-icon>Churn Risk — High-Value Clients Not Seen 6+ Months
              <v-spacer />
              <v-chip size="small" color="error" variant="tonal">{{ crmAnalytics.churnRisk.length }} at risk</v-chip>
            </v-card-title>
            <v-card-text>
              <v-data-table :headers="churnHeaders" :items="crmAnalytics.churnRisk" density="compact" :items-per-page="10">
                <template #item.revenue="{ item }">
                  <span class="font-weight-bold text-primary">${{ fmtCur(item.revenue) }}</span>
                </template>
                <template #item.lastVisit="{ item }">
                  <span v-if="item.lastVisit">{{ formatDate(item.lastVisit) }}</span>
                  <span v-else class="text-error">Never</span>
                </template>
                <template #item.riskLevel="{ item }">
                  <v-chip :color="item.riskLevel === 'critical' ? 'error' : item.riskLevel === 'high' ? 'warning' : 'info'" size="x-small" label>
                    {{ item.riskLevel }}
                  </v-chip>
                </template>
              </v-data-table>
            </v-card-text>
          </v-card>

          <v-card v-if="crmAnalytics?.topClients?.length" class="mb-4" elevation="2">
            <v-card-title><v-icon start color="amber">mdi-star</v-icon>Top 25 Clients by Revenue</v-card-title>
            <v-card-text>
              <v-data-table :headers="topClientHeaders" :items="crmAnalytics.topClients" density="compact" :items-per-page="10">
                <template #item.revenue="{ item }">
                  <span class="font-weight-bold text-primary">${{ fmtCur(item.revenue) }}</span>
                </template>
                <template #item.lastVisit="{ item }">
                  <span v-if="item.lastVisit">{{ formatDate(item.lastVisit) }}</span>
                  <span v-else class="text-grey">Never</span>
                </template>
              </v-data-table>
            </v-card-text>
          </v-card>

          <v-card v-if="crmAnalytics?.geographicBreakdown?.length" elevation="2">
            <v-card-title><v-icon start>mdi-map-marker-radius</v-icon>Neighborhood Analysis — by Zip Code</v-card-title>
            <v-card-text>
              <v-data-table :headers="geoHeaders" :items="crmAnalytics.geographicBreakdown" density="compact" :items-per-page="10">
                <template #item.zipCodes="{ item }">
                  <span class="text-caption">{{ item.zipCodes?.join(', ') }}</span>
                </template>
                <template #item.totalRevenue="{ item }">
                  <span class="font-weight-bold text-primary">${{ fmtCur(item.totalRevenue) }}</span>
                </template>
                <template #item.avgRevenue="{ item }">${{ fmtCur(item.avgRevenue) }}</template>
              </v-data-table>
            </v-card-text>
          </v-card>
        </v-window-item>

        <!-- ─────────── SERVICES ─────────── -->
        <v-window-item value="services">
          <v-card class="mb-4" elevation="2">
            <v-card-title class="d-flex align-center">
              <v-icon start>mdi-format-list-numbered</v-icon>Appointment Types
              <v-spacer />
              <v-select v-model="typeLocationFilter" :items="['All Locations', ...clinicLocations]" density="compact" variant="outlined" hide-details style="max-width: 200px" />
            </v-card-title>
            <v-card-text>
              <ClientOnly>
                <apexchart v-if="typeSeries[0]?.data?.length" type="bar" height="420" :options="typeOptions" :series="typeSeries" :key="'type'+chartKey+typeLocationFilter" />
              </ClientOnly>
              <div v-if="!typeSeries[0]?.data?.length" class="text-center text-grey pa-8">Invoice data required</div>
            </v-card-text>
          </v-card>

          <v-row>
            <v-col cols="12" md="6">
              <v-card elevation="2">
                <v-card-title class="text-subtitle-1"><v-icon start>mdi-package-variant</v-icon>Top Product Groups</v-card-title>
                <v-card-text>
                  <ClientOnly>
                    <apexchart v-if="pgSeries[0]?.data?.length" type="bar" height="360" :options="pgOptions" :series="pgSeries" :key="'pg'+chartKey" />
                  </ClientOnly>
                  <div v-if="!pgSeries[0]?.data?.length" class="text-center text-grey pa-8">Invoice data required</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card elevation="2">
                <v-card-title class="text-subtitle-1"><v-icon start>mdi-account-star</v-icon>Top Staff by Revenue</v-card-title>
                <v-card-text>
                  <ClientOnly>
                    <apexchart v-if="staffSeries[0]?.data?.length" type="bar" height="360" :options="staffOptions" :series="staffSeries" :key="'staff'+chartKey" />
                  </ClientOnly>
                  <div v-if="!staffSeries[0]?.data?.length" class="text-center text-grey pa-8">Invoice data required</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-window-item>

        <!-- ─────────── STAFF PERFORMANCE ─────────── -->
        <v-window-item value="staff">
          <div v-if="loading" class="d-flex justify-center pa-12">
            <v-progress-circular indeterminate color="deep-purple" size="48" />
          </div>

          <template v-else-if="staffPerf">
            <!-- KPIs -->
            <v-row class="mb-2">
              <v-col cols="6" md="3">
                <v-card variant="tonal" color="deep-purple">
                  <v-card-text>
                    <div class="text-caption">Active Staff</div>
                    <div class="text-h5 font-weight-bold">{{ staffPerf.kpis.totalStaff }}</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="6" md="3">
                <v-card variant="tonal" color="success">
                  <v-card-text>
                    <div class="text-caption">Total Revenue</div>
                    <div class="text-h5 font-weight-bold">${{ staffPerf.kpis.totalRevenue.toLocaleString() }}</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="6" md="3">
                <v-card variant="tonal" color="info">
                  <v-card-text>
                    <div class="text-caption">Transactions</div>
                    <div class="text-h5 font-weight-bold">{{ staffPerf.kpis.totalTransactions.toLocaleString() }}</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="6" md="3">
                <v-card variant="tonal" color="primary">
                  <v-card-text>
                    <div class="text-caption">Avg Revenue / Staff</div>
                    <div class="text-h5 font-weight-bold">${{ staffPerf.kpis.avgRevenuePerStaff.toLocaleString() }}</div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <!-- Leaderboards -->
            <v-row>
              <v-col cols="12" md="6">
                <v-card elevation="2" class="mb-4">
                  <v-card-title class="text-subtitle-1">
                    <v-icon start>mdi-trophy</v-icon>Top by Revenue
                    <v-spacer />
                    <span class="text-caption text-grey">{{ staffPerf.period.startDate }} – {{ staffPerf.period.endDate }}</span>
                  </v-card-title>
                  <v-card-text class="pa-0">
                    <v-table density="compact">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Staff</th>
                          <th>Primary Location</th>
                          <th class="text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(s, i) in staffPerf.leaderboards.topByRevenue" :key="s.staff">
                          <td class="text-caption">{{ i + 1 }}</td>
                          <td class="font-weight-medium">{{ s.staff }}</td>
                          <td><v-chip size="x-small" label>{{ s.location }}</v-chip></td>
                          <td class="text-right font-weight-bold">${{ s.revenue.toLocaleString() }}</td>
                        </tr>
                      </tbody>
                    </v-table>
                  </v-card-text>
                </v-card>
              </v-col>

              <v-col cols="12" md="6">
                <v-card elevation="2" class="mb-4">
                  <v-card-title class="text-subtitle-1">
                    <v-icon start color="success">mdi-trending-up</v-icon>Top Growth (vs prior {{ staffPerfPriorLabel }})
                  </v-card-title>
                  <v-card-text class="pa-0">
                    <v-table density="compact">
                      <thead>
                        <tr>
                          <th>Staff</th>
                          <th class="text-right">Prior</th>
                          <th class="text-right">Current</th>
                          <th class="text-right">Δ %</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-if="!staffPerf.leaderboards.topGrowers.length">
                          <td colspan="4" class="text-center text-caption text-grey pa-4">Insufficient prior-period data.</td>
                        </tr>
                        <tr v-for="s in staffPerf.leaderboards.topGrowers" :key="s.staff">
                          <td class="font-weight-medium">{{ s.staff }}</td>
                          <td class="text-right text-caption">${{ s.priorRevenue.toLocaleString() }}</td>
                          <td class="text-right">${{ s.revenue.toLocaleString() }}</td>
                          <td class="text-right">
                            <v-chip size="x-small" :color="s.revenueChangePct >= 0 ? 'success' : 'error'" label>
                              {{ s.revenueChangePct >= 0 ? '+' : '' }}{{ s.revenueChangePct }}%
                            </v-chip>
                          </td>
                        </tr>
                      </tbody>
                    </v-table>
                  </v-card-text>
                </v-card>
              </v-col>

              <v-col cols="12" md="6">
                <v-card elevation="2" class="mb-4">
                  <v-card-title class="text-subtitle-1"><v-icon start>mdi-account-multiple</v-icon>Most Clients Served</v-card-title>
                  <v-card-text class="pa-0">
                    <v-table density="compact">
                      <thead>
                        <tr>
                          <th>Staff</th>
                          <th class="text-right">Clients</th>
                          <th class="text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="s in staffPerf.leaderboards.mostClients" :key="s.staff">
                          <td class="font-weight-medium">{{ s.staff }}</td>
                          <td class="text-right">{{ s.uniqueClients.toLocaleString() }}</td>
                          <td class="text-right">${{ s.revenue.toLocaleString() }}</td>
                        </tr>
                      </tbody>
                    </v-table>
                  </v-card-text>
                </v-card>
              </v-col>

              <v-col cols="12" md="6">
                <v-card elevation="2" class="mb-4">
                  <v-card-title class="text-subtitle-1"><v-icon start>mdi-cash-multiple</v-icon>Highest Avg Ticket (≥10 tx)</v-card-title>
                  <v-card-text class="pa-0">
                    <v-table density="compact">
                      <thead>
                        <tr>
                          <th>Staff</th>
                          <th class="text-right">Avg Ticket</th>
                          <th class="text-right">Transactions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="s in staffPerf.leaderboards.highestAvgTicket" :key="s.staff">
                          <td class="font-weight-medium">{{ s.staff }}</td>
                          <td class="text-right font-weight-bold">${{ s.avgTransactionValue.toLocaleString() }}</td>
                          <td class="text-right">{{ s.transactions.toLocaleString() }}</td>
                        </tr>
                      </tbody>
                    </v-table>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <!-- Practice product groups + staff-by-location -->
            <v-row>
              <v-col cols="12" md="7">
                <v-card elevation="2" class="mb-4">
                  <v-card-title class="text-subtitle-1"><v-icon start>mdi-package-variant-closed</v-icon>Strongest Product Groups (Practice-Wide)</v-card-title>
                  <v-card-text>
                    <ClientOnly>
                      <apexchart
                        v-if="staffPgSeries[0]?.data?.length"
                        type="bar" height="360"
                        :options="staffPgOptions" :series="staffPgSeries"
                        :key="'staffpg'+chartKey"
                      />
                    </ClientOnly>
                    <div v-if="!staffPgSeries[0]?.data?.length" class="text-center text-grey pa-8">No revenue in selected period.</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="5">
                <v-card elevation="2" class="mb-4">
                  <v-card-title class="text-subtitle-1"><v-icon start>mdi-map-marker-multiple</v-icon>Staff By Location</v-card-title>
                  <v-card-text class="pa-0">
                    <v-table density="compact">
                      <thead>
                        <tr>
                          <th>Location</th>
                          <th class="text-right">Staff</th>
                          <th class="text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="l in staffPerf.staffByLocation" :key="l.location">
                          <td>{{ l.location }}</td>
                          <td class="text-right">{{ l.staffCount }}</td>
                          <td class="text-right font-weight-bold">${{ l.revenue.toLocaleString() }}</td>
                        </tr>
                      </tbody>
                    </v-table>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <!-- Full staff roster with drill-down -->
            <v-card elevation="2">
              <v-card-title class="d-flex align-center flex-wrap">
                <v-icon start>mdi-account-details</v-icon>Staff Roster &amp; Product-Group Mix
                <v-spacer />
                <v-text-field
                  v-model="staffSearch" placeholder="Search staff..." prepend-inner-icon="mdi-magnify"
                  density="compact" variant="outlined" hide-details clearable style="max-width:240px" class="mr-2"
                />
                <v-select
                  v-model="staffPrimaryLocFilter"
                  :items="['All Locations', ...staffLocationOptions]"
                  density="compact" variant="outlined" hide-details
                  style="max-width:200px"
                />
              </v-card-title>
              <v-card-text class="pa-0">
                <v-expansion-panels variant="accordion" multiple>
                  <v-expansion-panel v-for="s in filteredStaffRows" :key="s.staff">
                    <v-expansion-panel-title>
                      <div class="d-flex align-center w-100">
                        <div class="font-weight-medium" style="min-width:200px">{{ s.staff }}</div>
                        <v-chip size="x-small" label class="mr-3">{{ s.primaryLocation }}</v-chip>
                        <div class="text-caption mr-3">
                          <v-icon size="14">mdi-cash</v-icon> ${{ s.revenue.toLocaleString() }}
                        </div>
                        <div class="text-caption mr-3">
                          <v-icon size="14">mdi-receipt</v-icon> {{ s.transactions.toLocaleString() }} tx
                        </div>
                        <div class="text-caption mr-3">
                          <v-icon size="14">mdi-account-group</v-icon> {{ s.uniqueClients.toLocaleString() }} clients
                        </div>
                        <v-spacer />
                        <v-chip
                          size="x-small" label
                          :color="s.revenueChangePct >= 0 ? 'success' : 'error'"
                        >
                          {{ s.revenueChangePct >= 0 ? '+' : '' }}{{ s.revenueChangePct }}%
                        </v-chip>
                      </div>
                    </v-expansion-panel-title>
                    <v-expansion-panel-text>
                      <v-row dense>
                        <v-col cols="12" md="4">
                          <div class="text-caption text-grey">Avg Ticket</div>
                          <div class="text-body-1 font-weight-bold">${{ s.avgTransactionValue.toLocaleString() }}</div>
                        </v-col>
                        <v-col cols="12" md="4">
                          <div class="text-caption text-grey">Revenue / Client</div>
                          <div class="text-body-1 font-weight-bold">${{ s.revenuePerClient.toLocaleString() }}</div>
                        </v-col>
                        <v-col cols="12" md="4">
                          <div class="text-caption text-grey">Prior Period Revenue</div>
                          <div class="text-body-1 font-weight-bold">${{ s.priorRevenue.toLocaleString() }}</div>
                        </v-col>
                      </v-row>

                      <div class="text-subtitle-2 mt-4 mb-2">
                        <v-icon size="18">mdi-tag-outline</v-icon> Top Product Groups
                      </div>
                      <v-table density="compact" class="mb-3">
                        <thead>
                          <tr><th>Group</th><th class="text-right">Revenue</th><th class="text-right">% of Their Book</th></tr>
                        </thead>
                        <tbody>
                          <tr v-for="g in s.topProductGroups" :key="g.group">
                            <td>{{ g.group }}</td>
                            <td class="text-right">${{ g.revenue.toLocaleString() }}</td>
                            <td class="text-right">
                              <v-progress-linear
                                :model-value="g.pctOfStaffRevenue"
                                color="deep-purple" height="14" rounded
                                style="max-width:140px;display:inline-block;vertical-align:middle"
                              >
                                <span class="text-caption">{{ g.pctOfStaffRevenue }}%</span>
                              </v-progress-linear>
                            </td>
                          </tr>
                          <tr v-if="!s.topProductGroups.length">
                            <td colspan="3" class="text-center text-grey text-caption pa-2">No product-group data</td>
                          </tr>
                        </tbody>
                      </v-table>

                      <div v-if="s.byLocation.length > 1">
                        <div class="text-subtitle-2 mb-2"><v-icon size="18">mdi-map-marker</v-icon> Revenue by Location</div>
                        <v-chip-group>
                          <v-chip v-for="l in s.byLocation" :key="l.location" size="small" variant="tonal">
                            {{ l.location }} · ${{ l.revenue.toLocaleString() }}
                          </v-chip>
                        </v-chip-group>
                      </div>
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                </v-expansion-panels>
                <div v-if="!filteredStaffRows.length" class="text-center text-grey pa-6">No staff match the current filters.</div>
              </v-card-text>
            </v-card>
          </template>

          <v-alert v-else type="info" variant="tonal" class="mt-4">
            No staff data loaded yet. Make sure invoice lines have been imported for the selected period.
          </v-alert>
        </v-window-item>

        <!-- ─────────── TRENDS ─────────── -->
        <v-window-item value="trends">
          <v-card class="mb-4" elevation="2">
            <v-card-title class="text-subtitle-1"><v-icon start>mdi-chart-line</v-icon>Monthly Revenue Trend</v-card-title>
            <v-card-text>
              <ClientOnly>
                <apexchart v-if="revTrendSeries.length" type="area" height="320" :options="revTrendOptions" :series="revTrendSeries" :key="'revtrend'+chartKey" />
              </ClientOnly>
              <div v-if="!revTrendSeries.length" class="text-center text-grey pa-8">Invoice data required</div>
            </v-card-text>
          </v-card>

          <v-card class="mb-4" elevation="2">
            <v-card-title class="text-subtitle-1"><v-icon start>mdi-trending-up</v-icon>Weekly Appointment Volume</v-card-title>
            <v-card-text>
              <ClientOnly>
                <apexchart v-if="weeklyTrendSeries.length" type="area" height="300" :options="weeklyTrendOptions" :series="weeklyTrendSeries" :key="'wtrend'+chartKey" />
              </ClientOnly>
              <div v-if="!weeklyTrendSeries.length" class="text-center text-grey pa-8">Invoice data required</div>
            </v-card-text>
          </v-card>

          <v-card elevation="2">
            <v-card-title class="text-subtitle-1"><v-icon start>mdi-calendar-week</v-icon>Demand by Day of Week</v-card-title>
            <v-card-text>
              <ClientOnly>
                <apexchart v-if="dowSeries.length" type="bar" height="320" :options="dowOptions" :series="dowSeries" :key="'dow'+chartKey" />
              </ClientOnly>
              <div v-if="!dowSeries.length" class="text-center text-grey pa-8">Invoice data required</div>
            </v-card-text>
          </v-card>
        </v-window-item>

        <!-- ─────────── DATA SOURCES ─────────── -->
        <v-window-item value="data">
          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <v-card elevation="2" class="fill-height">
                <v-card-title><v-icon start>mdi-account-multiple</v-icon>CRM Clients</v-card-title>
                <v-card-text>
                  <div class="d-flex align-center mb-2">
                    <v-chip :color="hasCrmData ? 'success' : 'grey'" variant="tonal" size="small" class="mr-2">
                      {{ hasCrmData ? 'Loaded' : 'Missing' }}
                    </v-chip>
                    <span class="text-body-2">{{ crmContactCount.toLocaleString() }} contact records</span>
                  </div>
                  <div class="text-caption text-grey mb-3" v-if="lastCrmSync">
                    Last sync: {{ formatDateTime(lastCrmSync) }}
                  </div>
                  <v-btn color="primary" size="small" variant="outlined" prepend-icon="mdi-upload" @click="openWizard('crm')">
                    Upload CRM CSV
                  </v-btn>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card elevation="2" class="fill-height">
                <v-card-title><v-icon start>mdi-receipt-text</v-icon>Invoice Lines</v-card-title>
                <v-card-text>
                  <div class="d-flex align-center mb-2">
                    <v-chip :color="hasInvoiceData ? 'success' : 'grey'" variant="tonal" size="small" class="mr-2">
                      {{ hasInvoiceData ? 'Loaded' : 'Missing' }}
                    </v-chip>
                    <span class="text-body-2">{{ invoiceLineCount.toLocaleString() }} invoice lines</span>
                  </div>
                  <v-btn color="primary" size="small" variant="outlined" prepend-icon="mdi-upload" @click="openWizard('invoices')">
                    Upload Invoice Reports
                  </v-btn>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <v-card v-if="crmAnalytics?.dataQuality" elevation="2" class="mb-4">
            <v-card-title class="d-flex align-center">
              <v-icon start>mdi-database-check</v-icon>Data Quality Score
              <v-spacer />
              <v-chip
                :color="crmAnalytics.dataQuality.overallScore >= 75 ? 'success' : crmAnalytics.dataQuality.overallScore >= 50 ? 'warning' : 'error'"
                size="small" label
              >
                {{ crmAnalytics.dataQuality.overallScore }}%
              </v-chip>
            </v-card-title>
            <v-card-text>
              <v-row dense>
                <v-col v-for="field in dataQualityFields" :key="field.key" cols="6" md="4">
                  <div class="d-flex align-center mb-2">
                    <v-icon size="16" :color="field.color" class="mr-2">{{ field.icon }}</v-icon>
                    <span class="text-caption flex-grow-1">{{ field.label }}</span>
                    <span class="text-caption font-weight-bold" :class="`text-${field.color}`">{{ field.pct }}%</span>
                  </div>
                  <v-progress-linear :model-value="field.pct" :color="field.color" height="4" rounded class="mb-1" />
                  <div class="text-caption text-grey">
                    {{ field.missing }} of {{ crmAnalytics.dataQuality.totalRecords }} missing
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <v-card v-if="syncStatus?.lastSyncByType" elevation="2">
            <v-card-title><v-icon start>mdi-database-sync</v-icon>Sync History</v-card-title>
            <v-card-text>
              <v-row dense>
                <v-col v-for="(info, syncType) in syncStatus.lastSyncByType" :key="syncType" cols="12" sm="6" md="3">
                  <v-card variant="tonal" class="pa-3">
                    <div class="d-flex align-center mb-1">
                      <v-icon size="16" color="success" class="mr-1">mdi-check-circle</v-icon>
                      <span class="text-caption font-weight-bold text-uppercase">{{ syncType }}</span>
                    </div>
                    <div class="text-caption text-grey">Last: {{ formatDateTime(info.lastSync) }}</div>
                    <div class="text-caption text-grey">{{ info.recordsSynced?.toLocaleString() || 0 }} records</div>
                  </v-card>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-window-item>
      </v-window>
    </template>

    <!-- Error -->
    <v-alert v-if="error" type="error" class="mt-4" closable @click:close="error = null">{{ error }}</v-alert>

    <!-- ═══════════════════════════ CLEAR DATA DIALOG ═══════════════════════════ -->
    <v-dialog v-model="clearDialogOpen" max-width="520" :persistent="clearing">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start color="error">mdi-delete-sweep</v-icon>
          Clear Analytics Data
        </v-card-title>
        <v-card-text>
          <v-alert type="warning" variant="tonal" density="compact" class="mb-3">
            This permanently deletes uploaded data from the database. Re-upload CSVs to restore.
          </v-alert>
          <v-radio-group v-model="clearScope" density="compact" hide-details>
            <v-radio value="all">
              <template #label>
                <div>
                  <div class="font-weight-medium">Everything</div>
                  <div class="text-caption text-grey">Invoice lines ({{ invoiceLineCount.toLocaleString() }}) + CRM contacts ({{ crmContactCount.toLocaleString() }})</div>
                </div>
              </template>
            </v-radio>
            <v-radio value="invoices">
              <template #label>
                <div>
                  <div class="font-weight-medium">Invoice lines only</div>
                  <div class="text-caption text-grey">{{ invoiceLineCount.toLocaleString() }} rows</div>
                </div>
              </template>
            </v-radio>
            <v-radio value="contacts">
              <template #label>
                <div>
                  <div class="font-weight-medium">CRM contacts only</div>
                  <div class="text-caption text-grey">{{ crmContactCount.toLocaleString() }} rows</div>
                </div>
              </template>
            </v-radio>
          </v-radio-group>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :disabled="clearing" @click="clearDialogOpen = false">Cancel</v-btn>
          <v-btn color="error" :loading="clearing" prepend-icon="mdi-delete-sweep" @click="clearData">
            Clear {{ clearScope === 'all' ? 'Everything' : clearScope === 'invoices' ? 'Invoices' : 'Contacts' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ═══════════════════════════ UPLOAD WIZARD ═══════════════════════════ -->
    <v-dialog v-model="wizardOpen" max-width="820" persistent scrollable>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start>mdi-upload-multiple</v-icon>
          Unified Report — Data Upload Wizard
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" :disabled="wizardBusy" @click="closeWizard" />
        </v-card-title>

        <v-card-text>
          <v-stepper v-model="wizardStep" flat :items="['CRM Clients', 'Invoice Reports', 'Done']" hide-actions>
            <!-- STEP 1: CRM -->
            <template #item.1>
              <div class="pa-1">
                <v-alert type="info" variant="tonal" density="compact" class="mb-3">
                  <div class="font-weight-bold text-body-2">Step 1 — CRM Client Report</div>
                  <div class="text-caption">
                    Upload your ezyVet CRM Contacts CSV export. Expected headers include:
                    <code>Contact Code, Contact First Name, Contact Last Name, Email Addresses, Mobile Numbers,
                    Contact Physical City, Contact Physical Post Code, Revenue Spend YTD, Last Invoiced,
                    Contact Division, Contact Is Active</code>.
                  </div>
                </v-alert>

                <v-file-input
                  v-model="crmFile"
                  accept=".csv"
                  label="Select CRM CSV file"
                  prepend-icon="mdi-file-delimited"
                  variant="outlined" density="compact" show-size
                  :disabled="crmUploadState.processing"
                  @update:model-value="handleCrmFileSelect"
                />

                <div v-if="crmPreviewRows.length > 0" class="mt-2">
                  <div class="text-subtitle-2 mb-1">Preview (first 5 of {{ crmTotalRows }}):</div>
                  <v-table density="compact" class="preview-table">
                    <thead><tr><th v-for="h in crmPreviewHeaders" :key="h" class="text-caption">{{ h }}</th></tr></thead>
                    <tbody>
                      <tr v-for="(row, idx) in crmPreviewRows" :key="idx">
                        <td v-for="h in crmPreviewHeaders" :key="h" class="text-caption">{{ row[h] || '—' }}</td>
                      </tr>
                    </tbody>
                  </v-table>
                </div>

                <div v-if="crmUploadState.processing" class="text-center py-4">
                  <v-progress-circular :model-value="crmUploadState.progress" :size="64" :width="6" color="primary">
                    {{ crmUploadState.progress }}%
                  </v-progress-circular>
                  <div class="text-body-2 mt-2">{{ crmUploadState.message }}</div>
                  <div class="text-caption text-grey">
                    Batch {{ crmUploadState.currentBatch }} / {{ crmUploadState.totalBatches }} —
                    {{ crmUploadState.processedRows }} / {{ crmUploadState.totalRows }} rows
                  </div>
                </div>

                <v-alert v-if="crmUploadState.complete && !crmUploadState.error" type="success" variant="tonal" class="mt-3" density="compact">
                  Imported — {{ crmUploadState.inserted }} inserted, {{ crmUploadState.updated }} updated,
                  {{ crmUploadState.errors }} errors.
                </v-alert>
                <v-alert v-if="crmUploadState.error" type="error" variant="tonal" class="mt-3" density="compact">
                  {{ crmUploadState.errorMessage }}
                </v-alert>

                <div class="d-flex justify-space-between mt-4">
                  <v-btn variant="text" :disabled="wizardBusy" @click="skipCrmStep">
                    Skip (already have CRM data)
                  </v-btn>
                  <div>
                    <v-btn
                      v-if="!crmUploadState.complete"
                      color="primary" prepend-icon="mdi-cloud-upload"
                      :disabled="!crmParsedRows.length || crmUploadState.processing"
                      :loading="crmUploadState.processing"
                      @click="startCrmImport"
                    >
                      Import {{ crmParsedRows.length }} contacts
                    </v-btn>
                    <v-btn v-else color="primary" append-icon="mdi-arrow-right" @click="wizardStep = 2">
                      Continue to Invoices
                    </v-btn>
                  </div>
                </div>
              </div>
            </template>

            <!-- STEP 2: INVOICES -->
            <template #item.2>
              <div class="pa-1">
                <v-alert type="info" variant="tonal" density="compact" class="mb-3">
                  <div class="font-weight-bold text-body-2">Step 2 — Invoice Lines Reports</div>
                  <div class="text-caption">
                    Upload one or many ezyVet Invoice Lines exports (CSV, XLS, or XLSX).
                    Files are parsed in-browser and uploaded in batches. Duplicates are skipped automatically.
                  </div>
                </v-alert>

                <v-file-input
                  v-model="invoiceFiles"
                  accept=".csv,.xls,.xlsx,.tsv"
                  label="Select invoice file(s)"
                  prepend-icon="mdi-file-multiple"
                  variant="outlined" density="compact" multiple show-size
                  :disabled="invoiceBatchProcessing"
                  @update:model-value="onInvoiceFilesSelected"
                />

                <div v-if="invoiceBatch.length" class="mt-3">
                  <v-list density="compact" class="pa-0">
                    <v-list-item v-for="(f, i) in invoiceBatch" :key="i" class="px-0">
                      <template #prepend>
                        <v-icon :color="f.status === 'done' ? 'success' : f.status === 'error' ? 'error' : f.status === 'uploading' ? 'primary' : 'grey'" size="18">
                          {{ f.status === 'done' ? 'mdi-check-circle' : f.status === 'error' ? 'mdi-alert-circle' : f.status === 'uploading' ? 'mdi-loading mdi-spin' : 'mdi-circle-outline' }}
                        </v-icon>
                      </template>
                      <v-list-item-title class="text-body-2">{{ f.name }}</v-list-item-title>
                      <v-list-item-subtitle class="text-caption">
                        <template v-if="f.status === 'done'">{{ f.inserted }} inserted, {{ f.skipped }} skipped</template>
                        <template v-else-if="f.status === 'error'">{{ f.error }}</template>
                        <template v-else-if="f.status === 'uploading'">{{ f.progressMessage || 'Uploading...' }}</template>
                        <template v-else>Pending</template>
                      </v-list-item-subtitle>
                    </v-list-item>
                  </v-list>
                  <v-progress-linear v-if="invoiceBatchProcessing" :model-value="(invoiceCurrentIdx + 1) / invoiceBatch.length * 100" color="primary" class="mt-2" />
                </div>

                <v-alert v-if="invoiceBatchComplete" type="info" variant="tonal" density="compact" class="mt-3">
                  Batch complete: {{ invoiceTotalInserted }} invoice lines from
                  {{ invoiceBatch.filter(f => f.status === 'done').length }} file(s).
                  <template v-if="invoiceTotalErrors"> {{ invoiceTotalErrors }} file(s) had errors.</template>
                </v-alert>

                <div class="d-flex justify-space-between mt-4">
                  <v-btn variant="text" :disabled="wizardBusy" @click="wizardStep = 1">
                    <v-icon start>mdi-arrow-left</v-icon>Back
                  </v-btn>
                  <div class="d-flex gap-2">
                    <v-btn
                      v-if="invoiceBatchProcessing"
                      color="error" variant="outlined" prepend-icon="mdi-close"
                      :disabled="invoiceCancelRequested"
                      @click="cancelInvoiceBatch"
                    >
                      {{ invoiceCancelRequested ? 'Canceling...' : 'Cancel' }}
                    </v-btn>
                    <v-btn
                      v-if="!invoiceBatchComplete"
                      color="primary" prepend-icon="mdi-cloud-upload"
                      :disabled="!invoiceBatch.length || invoiceBatchProcessing"
                      :loading="invoiceBatchProcessing"
                      @click="runInvoiceBatch"
                    >
                      Upload {{ invoiceBatch.length }} file(s)
                    </v-btn>
                    <v-btn v-else color="primary" append-icon="mdi-arrow-right" @click="wizardStep = 3">
                      Finish
                    </v-btn>
                  </div>
                </div>
              </div>
            </template>

            <!-- STEP 3: DONE -->
            <template #item.3>
              <div class="pa-2 text-center">
                <v-icon size="80" color="success">mdi-check-circle</v-icon>
                <div class="text-h5 mt-3">Data upload complete!</div>
                <div class="text-caption text-grey mt-2 mb-4">
                  Your unified analytics report has been refreshed with the new data.
                </div>
                <div class="d-flex justify-center gap-2">
                  <v-chip color="success" variant="tonal" prepend-icon="mdi-account-multiple">
                    CRM: {{ crmUploadState.inserted + crmUploadState.updated }} contacts
                  </v-chip>
                  <v-chip color="success" variant="tonal" prepend-icon="mdi-receipt-text">
                    Invoices: {{ invoiceTotalInserted }} lines
                  </v-chip>
                </div>
                <v-btn class="mt-5" color="primary" prepend-icon="mdi-chart-box" @click="finishWizard">
                  View Dashboard
                </v-btn>
              </div>
            </template>
          </v-stepper>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000" location="bottom right">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { evaluateRetention } from '~/utils/vetBenchmarks'

definePageMeta({ layout: 'default', middleware: ['auth', 'marketing-admin'] })

useHead({ title: 'Practice Analytics & CRM' })

const route = useRoute()
const supabase = useSupabaseClient()

// ═══════════════════════════ STATE ═══════════════════════════
const loading = ref(false)
const syncing = ref(false)
const clearing = ref(false)
const clearDialogOpen = ref(false)
const clearScope = ref<'all' | 'invoices' | 'contacts'>('all')
const error = ref<string | null>(null)

const perfData = ref<any>(null)          // /api/analytics/performance
const overviewData = ref<any>(null)      // /api/analytics/practice-overview
const crmAnalytics = ref<any>(null)      // /api/marketing/ezyvet-analytics
const staffPerf = ref<any>(null)         // /api/analytics/staff-performance
const staffSearch = ref('')
const staffPrimaryLocFilter = ref('All Locations')

const activeTab = ref((route.query.tab as string) || 'overview')
const chartKey = ref(0)

const locationFilter = ref<string | null>(null)
const divisionFilter = ref<string | null>(null)
const dateRange = reactive({
  start: '2025-01-01',
  end: new Date().toISOString().split('T')[0],
})
const typeLocationFilter = ref('All Locations')

const snackbar = reactive({ show: false, message: '', color: 'success' })
function notify(message: string, color = 'success') { snackbar.message = message; snackbar.color = color; snackbar.show = true }

const LOC_COLORS: Record<string, string> = {
  'Sherman Oaks': '#7C3AED',
  'Van Nuys': '#3B82F6',
  'Venice': '#10B981',
}
const CHART_THEME = { theme: 'dark' as const }

// ═══════════════════════════ HELPERS ═══════════════════════════
function fmt(n: number) { return (n || 0).toLocaleString() }
function fmtCur(n: number | string | null) {
  if (n == null) return '0'
  const v = typeof n === 'string' ? parseFloat(n) : n
  return isNaN(v) ? '0' : v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function formatDate(d: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function formatDateTime(d: string | null) {
  if (!d) return 'Never'
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}
function printReport() { window.print() }

// ═══════════════════════════ DATA PRESENCE ═══════════════════════════
const crmContactCount = computed(() => crmAnalytics.value?.kpis?.totalContacts || 0)
const invoiceLineCount = computed(() =>
  perfData.value?.dataSummary?.invoiceLinesLoaded ?? overviewData.value?.kpis?.revenue?.lineCount ?? 0
)
const hasCrmData = computed(() => crmContactCount.value > 0)
const hasInvoiceData = computed(() => invoiceLineCount.value > 0)
const hasAnyData = computed(() => hasCrmData.value || hasInvoiceData.value)
const lastCrmSync = computed(() => crmAnalytics.value?.lastSync?.completed_at || null)
const syncStatus = computed(() => overviewData.value?.syncStatus || null)

const clinicLocations = computed<string[]>(() => perfData.value?.locations || ['Sherman Oaks', 'Van Nuys', 'Venice'])
const locationOptions = computed(() => ['All Locations', 'Compare Locations', ...clinicLocations.value])

function isCompare() { return locationFilter.value === 'Compare Locations' }
function isSingleLoc() {
  const loc = locationFilter.value
  return !!loc && loc !== 'All Locations' && loc !== 'Compare Locations'
}
function activeLoc() { return locationFilter.value || '' }
function locVal(byLocation: Record<string, number> | undefined, fallbackTotal: number) {
  if (!byLocation) return fallbackTotal
  if (isSingleLoc()) return byLocation[activeLoc()] || 0
  return fallbackTotal
}

// ═══════════════════════════ UNIFIED KPIs ═══════════════════════════
const kpis = computed(() => {
  const perfKpis = perfData.value?.kpis
  const ovKpis = overviewData.value?.kpis
  const crmKpis = crmAnalytics.value?.kpis

  // For the headline KPIs we use clinic-only revenue so totalRevenue and
  // totalAppointments share the same denominator grain. The all-divisions
  // figure is available as perfKpis.totalRevenue for transparency tabs.
  let totalRevenue = perfKpis?.clinicRevenue ?? perfKpis?.totalRevenue ?? ovKpis?.revenue?.totalRevenue ?? crmKpis?.totalRevenue ?? 0
  let totalAppointments = perfKpis?.totalAppointments ?? ovKpis?.appointments?.totalAppointments ?? 0
  let uniqueClients = perfKpis?.uniqueClients ?? ovKpis?.clients?.activeContacts ?? crmKpis?.activeContacts ?? 0
  let avgRevenuePerAppt = perfKpis?.avgRevenuePerAppt ?? 0

  if (isSingleLoc() && perfData.value) {
    const loc = activeLoc()
    totalAppointments = perfData.value.apptsByLocation?.[loc] || 0
    totalRevenue = perfData.value.revenueByLocation?.[loc] || 0
    uniqueClients = perfData.value.clientsByLocation?.[loc] || 0
    avgRevenuePerAppt = totalAppointments > 0 ? Math.round(totalRevenue / totalAppointments * 100) / 100 : 0
  }

  return {
    totalRevenue,
    totalAppointments,
    uniqueClients,
    avgRevenuePerAppt,
    arpu: crmKpis?.arpu || 0,
    retentionRate: crmKpis?.retentionRate ?? 0,
  }
})
const retentionColor = computed(() =>
  crmAnalytics.value?.kpis?.retentionRate != null
    ? evaluateRetention(crmAnalytics.value.kpis.retentionRate / 100).color
    : 'grey'
)
const rpaTable = computed(() => perfData.value?.revenuePerAppt || {})

// ═══════════════════════════ CHART COMPUTEDS (Invoice-sourced) ═══════════════════════════
const hasLocBarData = computed(() => !!perfData.value?.apptsByLocation)
const locBarSeries = computed(() => [{
  name: 'Appointments',
  data: clinicLocations.value.map(l => perfData.value?.apptsByLocation?.[l] || 0)
}])
const locBarOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
  colors: clinicLocations.value.map(l => LOC_COLORS[l] || '#888'),
  plotOptions: { bar: { borderRadius: 6, distributed: true, columnWidth: '55%' } },
  xaxis: { categories: clinicLocations.value },
  dataLabels: { enabled: true },
  tooltip: { ...CHART_THEME }, legend: { show: false },
}))

const hasRevPerApptData = computed(() => !!perfData.value?.revenuePerAppt)
const revPerApptSeries = computed(() => [{
  name: 'Rev/Appt',
  data: clinicLocations.value.map(l => perfData.value?.revenuePerAppt?.[l]?.perAppt || 0)
}])
const revPerApptOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false } },
  colors: clinicLocations.value.map(l => LOC_COLORS[l] || '#888'),
  plotOptions: { bar: { borderRadius: 6, distributed: true, columnWidth: '55%' } },
  xaxis: { categories: clinicLocations.value },
  yaxis: { labels: { formatter: (v: number) => '$' + Math.round(v) } },
  dataLabels: { enabled: true, formatter: (v: number) => '$' + Math.round(v) },
  tooltip: { ...CHART_THEME }, legend: { show: false },
}))

const monthlyTrendSeries = computed(() => {
  const trend = perfData.value?.monthlyTrend
  if (!trend?.length) return []
  return [
    { name: 'Revenue', type: 'area', data: trend.map((m: any) => isSingleLoc() ? (m.revenueByLocation?.[activeLoc()] || 0) : m.revenue) },
    { name: 'Appointments', type: 'column', data: trend.map((m: any) => isSingleLoc() ? (m.appointmentsByLocation?.[activeLoc()] || 0) : m.appointments) },
  ]
})
const monthlyTrendOptions = computed(() => ({
  chart: { toolbar: { show: false }, stacked: false },
  colors: ['#10B981', '#7C3AED'],
  stroke: { width: [2, 0], curve: 'smooth' as const },
  fill: { type: ['gradient', 'solid'], gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
  xaxis: { categories: (perfData.value?.monthlyTrend || []).map((m: any) => m.label), labels: { rotate: -45 } },
  yaxis: [
    { title: { text: 'Revenue ($)' }, labels: { formatter: (v: number) => '$' + (v / 1000).toFixed(0) + 'k' } },
    { opposite: true, title: { text: 'Appointments' } },
  ],
  tooltip: { ...CHART_THEME, shared: true },
  legend: { position: 'top' as const },
}))

const svcCatSeries = computed(() => {
  if (!perfData.value?.serviceCategories?.length) return []
  return perfData.value.serviceCategories.map((c: any) => locVal(c.byLocation, c.total)).filter((v: number) => v > 0)
})
const svcCatOptions = computed(() => {
  const cats = (perfData.value?.serviceCategories || []).filter((c: any) => locVal(c.byLocation, c.total) > 0)
  return {
    chart: { type: 'donut' },
    labels: cats.map((c: any) => c.category),
    colors: ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#8B5CF6', '#14B8A6', '#F97316'],
    legend: { position: 'bottom' as const },
    dataLabels: { enabled: true, formatter: (v: number) => `${Math.round(v)}%` },
    tooltip: { ...CHART_THEME },
  }
})

const dowSeries = computed(() => {
  if (!perfData.value?.dayOfWeek?.length) return []
  if (isSingleLoc()) return [{ name: activeLoc(), data: perfData.value.dayOfWeek.map((d: any) => d.byLocation?.[activeLoc()] || 0) }]
  return clinicLocations.value.map(loc => ({
    name: loc, data: perfData.value.dayOfWeek.map((d: any) => d.byLocation?.[loc] || 0),
  }))
})
const dowOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false } },
  colors: isSingleLoc() ? [LOC_COLORS[activeLoc()] || '#888'] : clinicLocations.value.map(l => LOC_COLORS[l]),
  xaxis: { categories: (perfData.value?.dayOfWeek || []).map((d: any) => d.day?.substring(0, 3)) },
  plotOptions: { bar: { borderRadius: 3, columnWidth: '60%' } },
  dataLabels: { enabled: true },
  tooltip: { ...CHART_THEME },
  legend: { position: 'top' as const },
}))

const typeSeries = computed(() => {
  if (!perfData.value?.appointmentTypes?.length) return [{ name: 'Count', data: [] }]
  const top = perfData.value.appointmentTypes.slice(0, 20)
  const locF = typeLocationFilter.value
  if (locF === 'All Locations') return [{ name: 'All Locations', data: top.map((t: any) => t.total) }]
  return [{ name: locF, data: top.map((t: any) => t.byLocation?.[locF] || 0) }]
})
const typeOptions = computed(() => {
  const top = (perfData.value?.appointmentTypes || []).slice(0, 20)
  return {
    chart: { type: 'bar', toolbar: { show: false } },
    colors: ['#7C3AED'],
    plotOptions: { bar: { borderRadius: 4, horizontal: true } },
    xaxis: { title: { text: 'Count' } },
    dataLabels: { enabled: true },
    tooltip: { ...CHART_THEME },
    labels: top.map((t: any) => t.type),
  }
})

const weeklyTrendSeries = computed(() => {
  const trend = perfData.value?.weeklyTrend
  if (!trend?.length) return []
  if (isCompare()) return clinicLocations.value.map(loc => ({ name: loc, data: trend.map((w: any) => w.byLocation?.[loc] || 0) }))
  return [{ name: isSingleLoc() ? activeLoc() : 'All Locations', data: trend.map((w: any) => isSingleLoc() ? (w.byLocation?.[activeLoc()] || 0) : w.total) }]
})
const weeklyTrendOptions = computed(() => ({
  chart: { type: 'area', toolbar: { show: false } },
  colors: isCompare() ? clinicLocations.value.map(l => LOC_COLORS[l]) : [isSingleLoc() ? (LOC_COLORS[activeLoc()] || '#7C3AED') : '#7C3AED'],
  fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
  stroke: { curve: 'smooth' as const, width: 2 },
  xaxis: { categories: (perfData.value?.weeklyTrend || []).map((w: any) => w.week), labels: { rotate: -45 } },
  dataLabels: { enabled: false },
  tooltip: { ...CHART_THEME, shared: true },
  legend: { position: 'top' as const },
}))

const revTrendSeries = computed(() => {
  const trend = perfData.value?.monthlyTrend
  if (!trend?.length) return []
  if (isCompare()) return clinicLocations.value.map(loc => ({ name: loc, data: trend.map((m: any) => m.revenueByLocation?.[loc] || 0) }))
  return [{ name: isSingleLoc() ? activeLoc() : 'All Locations', data: trend.map((m: any) => isSingleLoc() ? (m.revenueByLocation?.[activeLoc()] || 0) : m.revenue) }]
})
const revTrendOptions = computed(() => ({
  chart: { type: 'area', toolbar: { show: false } },
  colors: isCompare() ? clinicLocations.value.map(l => LOC_COLORS[l]) : [isSingleLoc() ? (LOC_COLORS[activeLoc()] || '#10B981') : '#10B981'],
  fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
  stroke: { curve: 'smooth' as const, width: 2 },
  xaxis: { categories: (perfData.value?.monthlyTrend || []).map((m: any) => m.label), labels: { rotate: -45 } },
  yaxis: { labels: { formatter: (v: number) => '$' + (v / 1000).toFixed(0) + 'k' } },
  dataLabels: { enabled: false },
  tooltip: { ...CHART_THEME, y: { formatter: (v: number) => '$' + (v || 0).toLocaleString() } },
  legend: { position: 'top' as const },
}))

const pgSeries = computed(() => {
  const pgs = perfData.value?.topProductGroups?.slice(0, 12)
  if (!pgs?.length) return [{ name: 'Revenue', data: [] }]
  if (isSingleLoc()) return [{ name: activeLoc(), data: pgs.map((p: any) => p.byLocation?.[activeLoc()] || 0) }]
  return [{ name: 'All Locations', data: pgs.map((p: any) => p.revenue) }]
})
const pgOptions = computed(() => {
  const pgs = (perfData.value?.topProductGroups || []).slice(0, 12)
  return {
    chart: { type: 'bar', toolbar: { show: false } },
    colors: [isSingleLoc() ? (LOC_COLORS[activeLoc()] || '#3B82F6') : '#3B82F6'],
    plotOptions: { bar: { borderRadius: 3, horizontal: true } },
    xaxis: { labels: { formatter: (v: number) => '$' + (v / 1000).toFixed(0) + 'k' } },
    tooltip: { ...CHART_THEME, y: { formatter: (v: number) => '$' + (v || 0).toLocaleString() } },
    labels: pgs.map((p: any) => p.group),
  }
})

const staffSeries = computed(() => {
  const staff = perfData.value?.topStaff
  if (!staff?.length) return [{ name: 'Revenue', data: [] }]
  if (isSingleLoc()) {
    const filtered = staff.filter((s: any) => (s.byLocation?.[activeLoc()] || 0) > 0)
      .sort((a: any, b: any) => (b.byLocation?.[activeLoc()] || 0) - (a.byLocation?.[activeLoc()] || 0))
    return [{ name: activeLoc(), data: filtered.slice(0, 15).map((s: any) => s.byLocation?.[activeLoc()] || 0) }]
  }
  return [{ name: 'All Locations', data: staff.slice(0, 15).map((s: any) => s.revenue) }]
})
const staffOptions = computed(() => {
  let staff = perfData.value?.topStaff || []
  if (isSingleLoc()) {
    staff = staff.filter((s: any) => (s.byLocation?.[activeLoc()] || 0) > 0)
      .sort((a: any, b: any) => (b.byLocation?.[activeLoc()] || 0) - (a.byLocation?.[activeLoc()] || 0))
  }
  return {
    chart: { type: 'bar', toolbar: { show: false } },
    colors: [isSingleLoc() ? (LOC_COLORS[activeLoc()] || '#EC4899') : '#EC4899'],
    plotOptions: { bar: { borderRadius: 3, horizontal: true } },
    xaxis: { labels: { formatter: (v: number) => '$' + (v / 1000).toFixed(0) + 'k' } },
    tooltip: { ...CHART_THEME, y: { formatter: (v: number) => '$' + (v || 0).toLocaleString() } },
    labels: staff.slice(0, 15).map((s: any) => s.name),
  }
})

// ═══════════════════════════ STAFF PERFORMANCE TAB ═══════════════════════════
const staffLocationOptions = computed<string[]>(() => {
  if (!staffPerf.value?.staff) return []
  const locs = new Set<string>()
  for (const s of staffPerf.value.staff) locs.add(s.primaryLocation)
  return Array.from(locs).sort()
})

const filteredStaffRows = computed<any[]>(() => {
  if (!staffPerf.value?.staff) return []
  const q = staffSearch.value?.trim().toLowerCase() || ''
  const locFilter = staffPrimaryLocFilter.value
  return staffPerf.value.staff.filter((s: any) => {
    if (q && !s.staff.toLowerCase().includes(q)) return false
    if (locFilter && locFilter !== 'All Locations' && s.primaryLocation !== locFilter) return false
    return true
  })
})

const staffPerfPriorLabel = computed(() => {
  const p = staffPerf.value?.priorPeriod
  if (!p) return 'period'
  return `${p.startDate} – ${p.endDate}`
})

const staffPgSeries = computed(() => {
  const groups = staffPerf.value?.productGroupTotals || []
  if (!groups.length) return [{ name: 'Revenue', data: [] }]
  return [{ name: 'Revenue', data: groups.map((g: any) => g.revenue) }]
})
const staffPgOptions = computed(() => {
  const groups = staffPerf.value?.productGroupTotals || []
  return {
    chart: { type: 'bar', toolbar: { show: false } },
    colors: ['#7C3AED'],
    plotOptions: { bar: { borderRadius: 3, horizontal: true, dataLabels: { position: 'bottom' } } },
    dataLabels: {
      enabled: true,
      formatter: (_v: number, opts: any) => {
        const g = groups[opts.dataPointIndex]
        return g ? `${g.pctOfPractice}%` : ''
      },
      style: { colors: ['#fff'] },
    },
    xaxis: {
      categories: groups.map((g: any) => g.group),
      labels: { formatter: (v: number) => '$' + (v / 1000).toFixed(0) + 'k' },
    },
    tooltip: {
      y: { formatter: (v: number) => '$' + (v || 0).toLocaleString() },
    },
  }
})

// ═══════════════════════════ CHART COMPUTEDS (CRM-sourced) ═══════════════════════════
const segmentDonutSeries = computed(() => crmAnalytics.value?.clientSegments?.map((s: any) => s.revenue) || [])
const segmentDonutOptions = computed(() => ({
  chart: { type: 'donut' },
  labels: crmAnalytics.value?.clientSegments?.map((s: any) => s.label) || [],
  colors: ['#E91E63', '#9C27B0', '#1976D2', '#4CAF50', '#9E9E9E'],
  legend: { position: 'bottom' as const },
  tooltip: { y: { formatter: (v: number) => '$' + (v || 0).toLocaleString() } },
  dataLabels: { formatter: (v: number) => `${Math.round(v)}%` },
}))

const revenueDistributionSeries = computed(() => [{
  name: 'Clients',
  data: crmAnalytics.value?.revenueDistribution?.map((d: any) => d.count) || []
}])
const revenueDistributionOptions = computed(() => ({
  chart: { type: 'bar' },
  plotOptions: { bar: { columnWidth: '70%', borderRadius: 4 } },
  dataLabels: { enabled: true, offsetY: -20, style: { fontSize: '12px', colors: ['#304758'] } },
  xaxis: {
    categories: crmAnalytics.value?.revenueDistribution?.map((d: any) => d.label) || [],
    labels: { rotate: -45 }
  },
  yaxis: { title: { text: 'Clients' } },
  colors: ['#1976D2'],
}))

const recencySeries = computed(() => [{
  name: 'Clients',
  data: crmAnalytics.value?.recencyChart?.map((d: any) => d.count) || []
}])
const recencyOptions = computed(() => ({
  chart: { type: 'bar' },
  plotOptions: { bar: { columnWidth: '60%', borderRadius: 4, distributed: true } },
  dataLabels: { enabled: true, style: { colors: ['#fff'] } },
  xaxis: {
    categories: crmAnalytics.value?.recencyChart?.map((d: any) => d.label) || [],
    labels: { rotate: -45 }
  },
  colors: crmAnalytics.value?.recencyChart?.map((d: any) => d.color) || [],
  legend: { show: false },
}))

const dataQualityFields = computed(() => {
  const dq = crmAnalytics.value?.dataQuality
  if (!dq || dq.totalRecords === 0) return []
  const total = dq.totalRecords
  const fields = [
    { key: 'email', label: 'Email', missing: dq.missingEmail, icon: 'mdi-email' },
    { key: 'phone', label: 'Phone', missing: dq.missingPhone, icon: 'mdi-phone' },
    { key: 'city', label: 'City', missing: dq.missingCity, icon: 'mdi-map-marker' },
    { key: 'zip', label: 'Zip', missing: dq.missingZip, icon: 'mdi-map-marker-outline' },
    { key: 'lastVisit', label: 'Last Visit', missing: dq.missingLastVisit, icon: 'mdi-calendar' },
    { key: 'division', label: 'Division', missing: dq.missingDivision, icon: 'mdi-domain' }
  ]
  return fields.map(f => {
    const pct = Math.round(((total - f.missing) / total) * 100)
    return { ...f, pct, color: pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'error' }
  })
})

// ═══════════════════════════ TABLE HEADERS ═══════════════════════════
const churnHeaders = [
  { title: 'Client', key: 'name', sortable: true },
  { title: 'Revenue', key: 'revenue', sortable: true },
  { title: 'Last Visit', key: 'lastVisit', sortable: true },
  { title: 'Days Since', key: 'daysSinceVisit', sortable: true },
  { title: 'Risk', key: 'riskLevel', sortable: true },
]
const topClientHeaders = [
  { title: 'Client', key: 'name', sortable: true },
  { title: 'Revenue', key: 'revenue', sortable: true },
  { title: 'Last Visit', key: 'lastVisit', sortable: true },
]
const geoHeaders = [
  { title: 'Neighborhood', key: 'neighborhood', sortable: true },
  { title: 'Zip Codes', key: 'zipCodes', sortable: false },
  { title: 'Clients', key: 'totalClients', sortable: true },
  { title: 'Revenue', key: 'totalRevenue', sortable: true },
  { title: 'Avg', key: 'avgRevenue', sortable: true },
]
const divisionHeaders = [
  { title: 'Division', key: 'division', sortable: true },
  { title: 'Clients', key: 'totalClients', sortable: true },
  { title: 'Active', key: 'activeClients', sortable: true },
  { title: 'Revenue', key: 'totalRevenue', sortable: true },
  { title: 'Avg', key: 'avgRevenue', sortable: true },
]
const departmentHeaders = [
  { title: 'Department', key: 'department', sortable: true },
  { title: 'Clients', key: 'totalClients', sortable: true },
  { title: 'Active', key: 'activeClients', sortable: true },
  { title: 'Revenue', key: 'totalRevenue', sortable: true },
  { title: 'Avg', key: 'avgRevenue', sortable: true },
]

// ═══════════════════════════ DATA LOADING ═══════════════════════════
let _debounce: ReturnType<typeof setTimeout> | null = null

async function loadAll() {
  loading.value = true
  error.value = null
  perfData.value = null
  overviewData.value = null
  crmAnalytics.value = null
  staffPerf.value = null

  try {
    const params = new URLSearchParams()
    if (dateRange.start) params.set('startDate', dateRange.start)
    if (dateRange.end) params.set('endDate', dateRange.end)
    params.set('_t', Date.now().toString())

    const crmParams = new URLSearchParams()
    if (divisionFilter.value && divisionFilter.value !== 'All Divisions') crmParams.append('division', divisionFilter.value)
    // Location filter — maps to a raw division ilike match (e.g. "Venice" → "%Venice%")
    if (locationFilter.value && locationFilter.value !== 'All Locations' && locationFilter.value !== 'Compare Locations') {
      crmParams.append('location', locationFilter.value)
    }
    if (dateRange.start) crmParams.append('startDate', dateRange.start)
    if (dateRange.end) crmParams.append('endDate', dateRange.end)

    const [perfResult, overviewResult, crmResult, staffResult] = await Promise.allSettled([
      $fetch(`/api/analytics/performance?${params.toString()}`),
      $fetch(`/api/analytics/practice-overview?${params.toString()}`),
      $fetch(`/api/marketing/ezyvet-analytics?${crmParams.toString()}`),
      $fetch(`/api/analytics/staff-performance?${crmParams.toString()}`),
    ])

    if (perfResult.status === 'fulfilled') perfData.value = perfResult.value
    if (overviewResult.status === 'fulfilled') {
      const ov = overviewResult.value as any
      if (ov?.success) overviewData.value = ov
    }
    if (crmResult.status === 'fulfilled') {
      const cr = crmResult.value as any
      if (cr?.success) crmAnalytics.value = cr
    }
    if (staffResult.status === 'fulfilled') {
      const sp = staffResult.value as any
      if (sp?.success) staffPerf.value = sp
    }

    chartKey.value++
  } catch (err: any) {
    error.value = err.data?.message || err.message || 'Failed to load analytics'
  } finally {
    loading.value = false
  }
}

watch(() => [dateRange.start, dateRange.end, divisionFilter.value, locationFilter.value], () => {
  // Clear stale AI review the moment filters change — otherwise the card
  // shows findings from a different time window and looks like the report
  // isn't responding to date changes.
  aiReview.value = null
  if (_debounce) clearTimeout(_debounce)
  _debounce = setTimeout(() => loadAll(), 500)
})

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
    notify(msg.includes('No active ezyVet clinic') ? 'ezyVet API not configured.' : 'Sync failed: ' + msg, 'warning')
  } finally {
    syncing.value = false
  }
}

// ═══════════════════════════ AI DATA REVIEW ═══════════════════════════
interface AiFinding {
  severity: 'critical' | 'warning' | 'info' | 'success'
  category: 'methodology' | 'data_quality' | 'anomaly' | 'benchmark' | 'recommendation'
  title: string
  detail: string
  metric?: string
  affectedRecords?: number
  suggestedAction?: string
}
interface AiReview {
  generatedAt: string
  model: string
  costUsd: number
  tokensUsed: number
  durationMs: number
  summary: string
  confidenceScore: number
  findings: AiFinding[]
  verifiedMetrics: Array<{ name: string; value: string; assessment: 'verified' | 'questionable' | 'flagged'; note: string }>
  topActions: Array<{ priority: 'high' | 'medium' | 'low'; title: string; rationale: string }>
}
const aiReview = ref<AiReview | null>(null)
const aiReviewLoading = ref(false)

function aiSeverityType(s: string) {
  return s === 'critical' ? 'error' : s === 'warning' ? 'warning' : s === 'success' ? 'success' : 'info'
}
function aiCategoryColor(c: string) {
  switch (c) {
    case 'methodology': return 'deep-purple'
    case 'data_quality': return 'orange'
    case 'anomaly': return 'red'
    case 'benchmark': return 'blue'
    case 'recommendation': return 'teal'
    default: return 'grey'
  }
}

async function runAiReview() {
  if (aiReviewLoading.value) return
  aiReviewLoading.value = true
  try {
    const body: Record<string, string> = {}
    if (dateRange.start) body.startDate = dateRange.start
    if (dateRange.end) body.endDate = dateRange.end
    if (locationFilter.value && locationFilter.value !== 'All Locations' && locationFilter.value !== 'Compare Locations') {
      body.location = locationFilter.value
    }
    if (divisionFilter.value && divisionFilter.value !== 'All Divisions') {
      body.division = divisionFilter.value
    }
    const result = await $fetch<AiReview & { success: boolean }>('/api/marketing/analytics-ai-review', {
      method: 'POST',
      body,
      // The endpoint also pulls live KPIs internally — give it room to run.
      timeout: 90_000,
    })
    if (result?.success) {
      aiReview.value = result
      notify(`AI review complete — confidence ${result.confidenceScore}%, ${result.findings.length} finding(s).`)
      // Scroll the user to the review card
      await nextTick()
      document.querySelector('.unified-analytics-page')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      notify('AI review returned no result', 'warning')
    }
  } catch (err: any) {
    const msg = err.data?.message || err.message || 'AI review failed'
    notify(msg, 'warning')
  } finally {
    aiReviewLoading.value = false
  }
}

async function clearData() {
  clearing.value = true
  try {
    const result = await $fetch('/api/analytics/clear-data', {
      method: 'POST',
      body: { scope: clearScope.value },
    }) as any
    if (result?.success) {
      notify(`Cleared ${result.invoicesDeleted.toLocaleString()} invoice lines, ${result.contactsDeleted.toLocaleString()} contacts`)
      clearDialogOpen.value = false
      await loadAll()
    } else {
      notify('Clear failed', 'warning')
    }
  } catch (err: any) {
    notify('Clear failed: ' + (err.data?.message || err.message || 'Unknown error'), 'warning')
  } finally {
    clearing.value = false
  }
}

// ═══════════════════════════ UPLOAD WIZARD ═══════════════════════════
const wizardOpen = ref(false)
const wizardStep = ref(1)

const wizardBusy = computed(() => crmUploadState.processing || invoiceBatchProcessing.value)

function openWizard(target?: 'crm' | 'invoices') {
  resetWizard()
  wizardStep.value = target === 'invoices' ? 2 : 1
  wizardOpen.value = true
}
function closeWizard() {
  if (wizardBusy.value) return
  wizardOpen.value = false
}
function finishWizard() {
  wizardOpen.value = false
  loadAll()
}
function resetWizard() {
  crmFile.value = null
  crmPreviewRows.value = []
  crmPreviewHeaders.value = []
  crmTotalRows.value = 0
  crmParsedRows.value = []
  Object.assign(crmUploadState, { processing: false, complete: false, error: false, errorMessage: '', progress: 0, message: '', currentBatch: 0, totalBatches: 0, processedRows: 0, totalRows: 0, inserted: 0, updated: 0, errors: 0 })
  invoiceFiles.value = []
  invoiceBatch.value = []
  invoiceBatchProcessing.value = false
  invoiceBatchComplete.value = false
  invoiceCurrentIdx.value = -1
  invoiceTotalInserted.value = 0
  invoiceTotalErrors.value = 0
}
function skipCrmStep() {
  wizardStep.value = 2
}

// ── CRM Upload (Step 1) ──
const crmFile = ref<File | null>(null)
const crmPreviewRows = ref<any[]>([])
const crmPreviewHeaders = ref<string[]>([])
const crmTotalRows = ref(0)
const crmParsedRows = ref<any[]>([])
const crmUploadState = reactive({
  processing: false, complete: false, error: false, errorMessage: '',
  progress: 0, message: '', currentBatch: 0, totalBatches: 0,
  processedRows: 0, totalRows: 0, inserted: 0, updated: 0, errors: 0
})

const CRM_HEADER_MAP: Record<string, string> = {
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
  'Service Department': 'department',
}

// RFC 4180-compliant CSV parser — handles CRLF / LF / CR line endings,
// quoted fields with embedded newlines/commas, and escaped quotes ("").
// Returns an array of records keyed by the header row.
function parseCSV(text: string): Record<string, string>[] {
  // Strip BOM if present (Excel commonly prepends \uFEFF)
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)

  const records: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }      // escaped quote → "
        else inQuotes = false                                // end of quoted value
      } else {
        field += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        row.push(field); field = ''
      } else if (ch === '\r' || ch === '\n') {
        // End of record. Handle CRLF as one terminator.
        row.push(field); field = ''
        // Skip empty rows (e.g. trailing newline at EOF)
        if (row.length > 1 || (row.length === 1 && row[0] !== '')) records.push(row)
        row = []
        if (ch === '\r' && text[i + 1] === '\n') i++
      } else {
        field += ch
      }
    }
  }
  // Flush trailing field/row at EOF (no terminating newline)
  if (field !== '' || row.length > 0) {
    row.push(field)
    if (row.length > 1 || (row.length === 1 && row[0] !== '')) records.push(row)
  }

  if (!records.length) return []

  const headers = records[0].map(h => h.trim())
  const out: Record<string, string>[] = []
  for (let r = 1; r < records.length; r++) {
    const vals = records[r]
    if (!vals.length) continue
    const obj: Record<string, string> = {}
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = (vals[c] ?? '').trim()
    }
    out.push(obj)
  }
  return out
}

// Robust date parser — accepts ISO, DD/MM/YYYY (EzyVet AU default), MM/DD/YYYY,
// DD-Mmm-YYYY, and Excel serial numbers. Returns YYYY-MM-DD or null.
// Mirrors server/api/invoices/upload.post.ts → parseDate() so client and
// server parse the same source data identically.
function parseFlexibleDate(val: unknown): string | null {
  if (val == null || val === '') return null
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val.toISOString().slice(0, 10)
  }
  if (typeof val === 'number') {
    if (val > 1 && val < 200000) {
      const d = new Date((val - 25569) * 86400 * 1000)
      return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
    }
    return null
  }
  const v = String(val).trim()
  if (!v) return null

  // ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
    const d = new Date(v)
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  // DD/MM/YYYY or MM/DD/YYYY (or with -). EzyVet exports DD/MM/YYYY.
  const slash = v.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/)
  if (slash) {
    let [, a, b, y] = slash
    let day = parseInt(a, 10), month = parseInt(b, 10)
    let year = parseInt(y, 10)
    if (year < 100) year += 2000
    if (day > 12 && month <= 12) { /* DD/MM */ }
    else if (month > 12 && day <= 12) { [day, month] = [month, day] } // swap
    // both ≤12 → assume DD/MM (EzyVet convention)
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2000 && year <= 2100) {
      const d = new Date(Date.UTC(year, month - 1, day))
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
    }
  }
  // DD-Mmm-YYYY (e.g. 15-Jan-2026)
  const named = v.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})/)
  if (named) {
    const d = new Date(`${named[2]} ${named[1]}, ${named[3]}`)
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  // Last resort
  const d = new Date(v)
  if (!isNaN(d.getTime()) && d.getUTCFullYear() >= 2000 && d.getUTCFullYear() <= 2100) {
    return d.toISOString().slice(0, 10)
  }
  return null
}

// Robust number parser — handles "$1,234.56", "(125.00)" → -125, blanks → null.
function parseFlexibleNumber(val: unknown): number | null {
  if (val == null || val === '') return null
  if (typeof val === 'number') return isNaN(val) ? null : val
  const cleaned = String(val).replace(/[$,\s]/g, '').replace(/^\(([^)]+)\)$/, '-$1')
  if (!cleaned) return null
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

function transformCrmRow(csvRow: Record<string, any>): Record<string, any> {
  const dbRow: Record<string, any> = {}
  for (const [csvHeader, dbField] of Object.entries(CRM_HEADER_MAP)) {
    const raw = csvRow[csvHeader]
    let value: any = raw === undefined || raw === '' ? null : raw

    if (dbField === 'is_active') {
      // Accept "Yes"/"Y"/"True"/"1" — anything else (including blank) is false.
      const s = (value == null ? '' : String(value)).trim().toUpperCase()
      value = s === 'YES' || s === 'Y' || s === 'TRUE' || s === '1'
    } else if (dbField === 'revenue_ytd') {
      value = parseFlexibleNumber(value) ?? 0
    } else if (dbField === 'last_visit') {
      value = parseFlexibleDate(value)
    } else if (typeof value === 'string') {
      value = value.trim() || null
    }
    dbRow[dbField] = value
  }
  return dbRow
}

async function handleCrmFileSelect(fileInput: File | File[] | null) {
  const file = Array.isArray(fileInput) ? fileInput[0] : fileInput
  if (!file) {
    crmPreviewRows.value = []; crmPreviewHeaders.value = []; crmParsedRows.value = []
    return
  }
  const text = await file.text()
  const rows = parseCSV(text)
  crmTotalRows.value = rows.length
  if (rows.length > 0) {
    crmPreviewHeaders.value = Object.keys(CRM_HEADER_MAP).slice(0, 6) // show first 6 for preview width
    crmPreviewRows.value = rows.slice(0, 5)
    crmParsedRows.value = rows.map(transformCrmRow)
  }
}

async function startCrmImport() {
  if (!crmParsedRows.value.length) return
  const BATCH_SIZE = 500
  const batches: any[][] = []
  for (let i = 0; i < crmParsedRows.value.length; i += BATCH_SIZE) {
    batches.push(crmParsedRows.value.slice(i, i + BATCH_SIZE))
  }
  Object.assign(crmUploadState, {
    processing: true, complete: false, error: false, errorMessage: '',
    progress: 0, message: 'Starting import...',
    currentBatch: 0, totalBatches: batches.length,
    processedRows: 0, totalRows: crmParsedRows.value.length,
    inserted: 0, updated: 0, errors: 0,
  })

  try {
    const { data: syncRecord } = await supabase
      .from('ezyvet_sync_history')
      .insert({
        sync_type: 'csv_import', status: 'running',
        total_rows: crmParsedRows.value.length,
        file_name: crmFile.value?.name, triggered_by: 'user'
      })
      .select().single()

    for (let i = 0; i < batches.length; i++) {
      crmUploadState.currentBatch = i + 1
      crmUploadState.message = `Processing batch ${i + 1} of ${batches.length}...`
      try {
        const result = await $fetch('/api/marketing/ezyvet-upsert', {
          method: 'POST', body: { contacts: batches[i] }
        }) as any
        if (result) {
          crmUploadState.inserted += result.inserted || 0
          crmUploadState.updated += result.updated || 0
          crmUploadState.errors += result.errors || 0
        }
      } catch {
        crmUploadState.errors += batches[i].length
      }
      crmUploadState.processedRows += batches[i].length
      crmUploadState.progress = Math.round((crmUploadState.processedRows / crmUploadState.totalRows) * 100)
    }

    if (syncRecord) {
      await supabase
        .from('ezyvet_sync_history')
        .update({
          status: 'completed', completed_at: new Date().toISOString(),
          inserted_count: crmUploadState.inserted,
          updated_count: crmUploadState.updated,
          error_count: crmUploadState.errors
        })
        .eq('id', syncRecord.id)
    }
    crmUploadState.complete = true
    crmUploadState.processing = false
    notify(`CRM import complete: ${crmUploadState.inserted} inserted, ${crmUploadState.updated} updated`)
  } catch (err: any) {
    crmUploadState.error = true
    crmUploadState.errorMessage = err.message || 'Import failed'
    crmUploadState.processing = false
    crmUploadState.complete = true
  }
}

// ── Invoice Upload (Step 2) ──
interface InvoiceBatchFile {
  name: string; file: File
  status: 'pending' | 'uploading' | 'done' | 'error'
  inserted: number; skipped: number; error: string
  progressMessage?: string
}
const invoiceFiles = ref<File[]>([])
const invoiceBatch = ref<InvoiceBatchFile[]>([])
const invoiceBatchProcessing = ref(false)
const invoiceBatchComplete = ref(false)
const invoiceCurrentIdx = ref(-1)
const invoiceTotalInserted = ref(0)
const invoiceTotalErrors = ref(0)
const invoiceCancelRequested = ref(false)
const invoiceAbortCtrl = ref<AbortController | null>(null)

function onInvoiceFilesSelected(files: File | File[] | null) {
  const list = Array.isArray(files) ? files : files ? [files] : []
  invoiceBatch.value = list.map(f => ({
    name: f.name, file: f, status: 'pending', inserted: 0, skipped: 0, error: ''
  }))
  invoiceBatchComplete.value = false
  invoiceCurrentIdx.value = -1
  invoiceTotalInserted.value = 0
  invoiceTotalErrors.value = 0
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

async function parseInvoiceFileClientSide(
  file: File,
  onProgress?: (msg: string) => void
): Promise<Record<string, any>[]> {
  const yieldUI = () => new Promise(r => setTimeout(r, 0))
  onProgress?.(`Reading ${(file.size / 1024 / 1024).toFixed(1)} MB...`)
  await yieldUI()

  const XLSX = await import('xlsx')
  const buffer = await readFileAsArrayBuffer(file)
  onProgress?.('Decoding spreadsheet...')
  await yieldUI()

  // cellDates: true returns date-typed cells as JS Date objects rather than
  // raw Excel serial numbers. Without this, dates like 45412 get serialised
  // through String() and the server's parseDate() rejects them — silently
  // dropping every invoice_date in XLSX uploads.
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) throw new Error('No sheets found in file')
  // raw: true keeps Date objects intact (otherwise sheet_to_json formats them
  // back to strings using the cell's number-format).
  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true })
  onProgress?.(`Found ${rawRows.length.toLocaleString()} rows — extracting...`)
  await yieldUI()

  const headerKeywords = ['invoice #', 'invoice', 'invoice line reference', 'invoice number', 'product name', 'appointment']
  let headerIdx = 0
  for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
    const row = rawRows[i].map((c: any) => String(c).trim().toLowerCase())
    const matchCount = headerKeywords.filter(kw => row.some((cell: string) => cell === kw || cell.includes(kw))).length
    if (matchCount >= 2) { headerIdx = i; break }
  }
  const headers = rawRows[headerIdx].map((c: any) => String(c).trim())
  const rows: Record<string, any>[] = []
  const total = rawRows.length
  for (let i = headerIdx + 1; i < total; i++) {
    const row = rawRows[i]
    if (!row || row.every((c: any) => c == null || String(c).trim() === '')) continue
    const obj: Record<string, any> = {}
    headers.forEach((h: string, idx: number) => {
      if (!h) return
      const v = row[idx]
      if (v == null) { obj[h] = ''; return }
      if (v instanceof Date) {
        // Normalise to ISO YYYY-MM-DD so the server treats it as a real date
        // regardless of the user's locale-formatted Excel column.
        obj[h] = isNaN(v.getTime()) ? '' : v.toISOString().slice(0, 10)
      } else {
        obj[h] = typeof v === 'number' ? v : String(v)
      }
    })
    rows.push(obj)
    // Yield every 5K rows so the UI can repaint the progress message.
    if (rows.length % 5000 === 0) {
      onProgress?.(`Parsed ${rows.length.toLocaleString()} of ${total.toLocaleString()} rows...`)
      await yieldUI()
    }
  }
  onProgress?.(`Parsed ${rows.length.toLocaleString()} rows. Preparing upload...`)
  await yieldUI()
  return rows
}

async function uploadInvoiceRowsInBatches(entry: InvoiceBatchFile, allRows: Record<string, any>[]) {
  // Smaller client batches → server processes 1 chunk per request → finishes well
  // under the Vercel function timeout, even on a busy invoice_lines table.
  // 250 rows × ~1KB ≈ 250KB request payload — fast enough that no batch should
  // approach the 60s server timeout even with the auto-purge step at the end.
  const BATCH_SIZE = 250
  const REQUEST_TIMEOUT_MS = 60_000 // per-batch timeout
  const MAX_RETRIES = 2
  let totalInserted = 0
  let totalSkipped = 0

  for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
    if (invoiceCancelRequested.value) throw new Error('Upload canceled')
    const batch = allRows.slice(i, i + BATCH_SIZE)
    const rangeLabel = `rows ${i + 1}–${Math.min(i + BATCH_SIZE, allRows.length)} of ${allRows.length}`
    entry.progressMessage = `Uploading ${rangeLabel}...`

    let attempt = 0
    let lastErr: any = null
    while (attempt <= MAX_RETRIES) {
      const ctrl = new AbortController()
      invoiceAbortCtrl.value = ctrl
      const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS)
      try {
        const result = await $fetch('/api/invoices/upload', {
          method: 'POST',
          body: { invoiceLines: batch, fileName: entry.name },
          signal: ctrl.signal,
        }) as any
        clearTimeout(timer)
        totalInserted += result.inserted || 0
        totalSkipped += result.duplicatesSkipped || 0
        lastErr = null
        break
      } catch (err: any) {
        clearTimeout(timer)
        lastErr = err
        if (invoiceCancelRequested.value) throw new Error('Upload canceled')
        attempt++
        if (attempt > MAX_RETRIES) break
        entry.progressMessage = `Retrying ${rangeLabel} (attempt ${attempt + 1})...`
        await new Promise(r => setTimeout(r, 1500 * attempt))
      }
    }
    if (lastErr) {
      throw new Error(`Failed at ${rangeLabel}: ${lastErr.data?.message || lastErr.message || 'timeout'}`)
    }
  }
  return { inserted: totalInserted, duplicatesSkipped: totalSkipped }
}

function cancelInvoiceBatch() {
  invoiceCancelRequested.value = true
  invoiceAbortCtrl.value?.abort()
}

async function runInvoiceBatch() {
  if (!invoiceBatch.value.length) return
  invoiceBatchProcessing.value = true
  invoiceBatchComplete.value = false
  invoiceCancelRequested.value = false
  invoiceTotalInserted.value = 0
  invoiceTotalErrors.value = 0

  for (let idx = 0; idx < invoiceBatch.value.length; idx++) {
    const entry = invoiceBatch.value[idx] as InvoiceBatchFile
    invoiceCurrentIdx.value = idx
    entry.status = 'uploading'
    entry.progressMessage = 'Parsing file...'
    try {
      const rows = await parseInvoiceFileClientSide(entry.file, msg => { entry.progressMessage = msg })
      if (rows.length === 0) throw new Error('No data rows found')
      const result = await uploadInvoiceRowsInBatches(entry, rows)
      entry.status = 'done'
      entry.inserted = result.inserted
      entry.skipped = result.duplicatesSkipped
      invoiceTotalInserted.value += entry.inserted
    } catch (err: any) {
      entry.status = 'error'
      entry.error = err.data?.message || err.message || 'Failed'
      invoiceTotalErrors.value++
    }
  }
  invoiceBatchProcessing.value = false
  invoiceBatchComplete.value = true
  notify(
    `Invoice batch complete: ${invoiceTotalInserted.value} lines from ${invoiceBatch.value.filter(f => f.status === 'done').length} file(s).`,
    invoiceTotalErrors.value ? 'warning' : 'success'
  )
}

// ═══════════════════════════ INIT ═══════════════════════════
onMounted(() => { loadAll() })
onBeforeUnmount(() => { if (_debounce) clearTimeout(_debounce) })
</script>

<style scoped>
.unified-analytics-page { max-width: 1400px; margin: 0 auto; }
.insights-scroll { max-height: 420px; overflow-y: auto; }

.action-item {
  border-left: 4px solid transparent;
  transition: background-color 0.2s;
}
.action-high   { background-color: rgba(244, 67, 54, 0.06);  border-left-color: #F44336; }
.action-medium { background-color: rgba(255, 152, 0, 0.06);  border-left-color: #FF9800; }
.action-low    { background-color: rgba(33, 150, 243, 0.06); border-left-color: #2196F3; }

.preview-table { max-height: 200px; overflow: auto; }
.preview-table th,
.preview-table td {
  white-space: nowrap;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media print {
  .v-btn { display: none !important; }
  .v-card { break-inside: avoid; page-break-inside: avoid; }
  .insights-scroll { max-height: none; overflow: visible; }
}
</style>
