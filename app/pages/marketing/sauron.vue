<template>
  <div class="sauron-page">
    <!-- ═══════════ HEADER ═══════════ -->
    <div class="d-flex justify-space-between align-center mb-6 flex-wrap ga-3">
      <div>
        <div class="d-flex align-center gap-3">
          <h1 class="text-h4 font-weight-bold">Sauron</h1>
          <v-chip color="amber-darken-2" variant="flat" size="small" class="font-weight-bold">
            One Report to Rule Them All
          </v-chip>
        </div>
        <p class="text-subtitle-1 text-grey mt-1">
          Deep practice performance analysis — clients, revenue &amp; appointments cross-referenced against AAHA&nbsp;/&nbsp;VHMA&nbsp;benchmarks
        </p>
        <div v-if="lastRefresh" class="text-caption text-grey mt-1">
          <v-icon size="14" class="mr-1">mdi-eye</v-icon>
          Last refreshed: {{ fmtDT(lastRefresh) }}
          <span class="ml-2">·</span>
          <span class="ml-2">{{ fmtN(totalRecords) }} records across 3 data sources</span>
          <span v-if="dataCutoff" class="ml-2">·</span>
          <span v-if="dataCutoff" class="ml-2">Data through: {{ dataCutoff }}</span>
        </div>
      </div>
      <div class="d-flex gap-2">
        <v-btn color="amber-darken-2" variant="outlined" prepend-icon="mdi-printer" @click="printReport">Print</v-btn>
        <v-btn color="amber-darken-2" prepend-icon="mdi-refresh" :loading="loading" @click="refreshAll">Refresh</v-btn>
      </div>
    </div>

    <!-- ═══════════ LOADING ═══════════ -->
    <div v-if="loading && !hasData" class="d-flex justify-center align-center" style="min-height:400px">
      <div class="text-center">
        <v-progress-circular indeterminate color="amber-darken-2" size="64" width="6" class="mb-4" />
        <div class="text-h6 text-grey">The Eye sees all… analyzing {{ loadingStep }}</div>
      </div>
    </div>

    <!-- ═══════════ MAIN CONTENT ═══════════ -->
    <template v-else-if="hasData">

      <!-- ───────── §1  PRACTICE SCORECARD ───────── -->
      <div class="mb-6">
        <div class="d-flex align-center gap-2 mb-3">
          <v-icon color="amber-darken-2" size="20">mdi-clipboard-check</v-icon>
          <h2 class="text-h6 font-weight-bold">Practice Scorecard</h2>
          <span class="text-caption text-grey ml-2">vs. CA veterinary benchmarks</span>
        </div>
        <v-row dense>
          <v-col cols="12" sm="6" md="4" lg="3" v-for="card in scorecardItems" :key="card.label">
            <v-tooltip location="top" max-width="320" content-class="sauron-tooltip">
              <template #activator="{ props: tipProps }">
                <v-card v-bind="tipProps" class="h-100 scorecard-card" variant="outlined" :class="'border-' + card.borderColor">
                  <v-card-text class="pa-3">
                    <div class="d-flex justify-space-between align-start">
                      <div>
                        <div class="text-caption text-medium-emphasis text-uppercase">{{ card.label }}</div>
                        <div class="text-h5 font-weight-bold mt-1" :class="'text-' + card.valueColor">{{ card.value }}</div>
                      </div>
                      <v-avatar :color="card.borderColor" size="36" variant="tonal">
                        <v-icon size="20">{{ card.icon }}</v-icon>
                      </v-avatar>
                    </div>
                    <div class="mt-2">
                      <v-progress-linear :model-value="card.pct" :color="card.borderColor" height="6" rounded class="mb-1" />
                      <div class="d-flex justify-space-between">
                        <span class="text-caption" :class="'text-' + card.borderColor">{{ card.rating }}</span>
                        <span class="text-caption text-medium-emphasis">Benchmark: {{ card.benchmark }}</span>
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
              </template>
              <span class="text-body-2" style="color: #fff">{{ card.tooltip }}</span>
            </v-tooltip>
          </v-col>
        </v-row>
      </div>

      <!-- ───────── §2  KEY FINDINGS ───────── -->
      <v-card class="mb-6" variant="outlined">
        <v-card-title class="d-flex align-center gap-2 pb-0">
          <v-icon color="amber-darken-2" size="20">mdi-lightbulb-on</v-icon>
          Key Findings
          <v-chip v-if="criticalCount" size="x-small" color="red" variant="tonal" class="ml-1">{{ criticalCount }} critical</v-chip>
          <v-chip v-if="warningCount" size="x-small" color="orange" variant="tonal" class="ml-1">{{ warningCount }} warnings</v-chip>
          <v-chip v-if="successCount" size="x-small" color="green" variant="tonal" class="ml-1">{{ successCount }} strengths</v-chip>
        </v-card-title>
        <v-card-text>
          <v-list density="compact" class="pa-0">
            <v-list-item v-for="(obs, i) in observations" :key="i" class="px-0 mb-1">
              <template #prepend>
                <v-avatar :color="sevColor(obs.severity)" size="32" variant="tonal" class="mr-3">
                  <v-icon size="18">{{ obs.icon }}</v-icon>
                </v-avatar>
              </template>
              <v-list-item-title class="text-body-2 font-weight-medium text-wrap">{{ obs.title }}</v-list-item-title>
              <v-list-item-subtitle class="text-caption text-wrap mt-1" style="white-space:normal">{{ obs.detail }}</v-list-item-subtitle>
              <template #append>
                <v-chip :color="sevColor(obs.severity)" size="x-small" variant="tonal">{{ obs.category }}</v-chip>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>

      <!-- ───────── §3  REVENUE DEEP-DIVE ───────── -->
      <v-card class="mb-6" variant="outlined">
        <v-card-title class="d-flex align-center gap-2 pb-0">
          <v-icon color="green" size="20">mdi-currency-usd</v-icon>
          Revenue Deep-Dive
          <v-chip size="x-small" color="green" variant="tonal" class="ml-1">${{ fmtC(inv.totalRevenue) }}</v-chip>
        </v-card-title>
        <v-card-text class="pt-4">
          <v-row dense>
            <v-col cols="6" sm="3">
              <div class="text-center">
                <div class="text-h6 font-weight-bold text-green">${{ fmtCurr(inv.totalRevenue) }}</div>
                <div class="text-caption">Total Revenue</div>
              </div>
            </v-col>
            <v-col cols="6" sm="3">
              <div class="text-center">
                <div class="text-h6 font-weight-bold text-blue">{{ fmtN(inv.uniqueInvoices) }}</div>
                <div class="text-caption">Invoices</div>
              </div>
            </v-col>
            <v-col cols="6" sm="3">
              <div class="text-center">
                <div class="text-h6 font-weight-bold text-purple">{{ fmtN(inv.uniqueClients) }}</div>
                <div class="text-caption">Unique Clients</div>
              </div>
            </v-col>
            <v-col cols="6" sm="3">
              <div class="text-center">
                <div class="text-h6 font-weight-bold text-amber">${{ inv.uniqueClients > 0 ? fmtCurr(inv.totalRevenue / inv.uniqueClients) : '0' }}</div>
                <div class="text-caption">Avg Rev / Client</div>
              </div>
            </v-col>
          </v-row>
          <v-divider class="my-4" />

          <!-- Department concentration -->
          <h4 class="text-subtitle-2 font-weight-bold mb-2">Revenue by Department</h4>
          <div v-for="dept in inv.topDepartments.slice(0, 8)" :key="dept.name" class="mb-2">
            <div class="d-flex justify-space-between text-caption mb-1">
              <span>{{ dept.name }}</span>
              <span class="font-weight-medium">${{ fmtC(dept.revenue) }} ({{ dept.pct }}%)</span>
            </div>
            <v-progress-linear :model-value="dept.pct" :color="dept.pct > 40 ? 'red' : dept.pct > 25 ? 'orange' : 'green'" height="8" rounded />
          </div>

          <!-- Staff productivity -->
          <v-divider class="my-4" />
          <h4 class="text-subtitle-2 font-weight-bold mb-2">Top Producers</h4>
          <v-row dense>
            <v-col cols="12" sm="6" md="4" v-for="staff in inv.topStaff.slice(0, 6)" :key="staff.name">
              <v-card variant="tonal" class="pa-2">
                <div class="d-flex justify-space-between align-center">
                  <span class="text-body-2 font-weight-medium">{{ staff.name }}</span>
                  <span class="text-body-2 font-weight-bold text-green">${{ fmtC(staff.revenue) }}</span>
                </div>
                <div class="text-caption text-medium-emphasis">{{ fmtN(staff.lines) }} line items · {{ fmtN(staff.invoices) }} invoices</div>
              </v-card>
            </v-col>
          </v-row>

          <!-- Monthly trend -->
          <v-divider class="my-4" />
          <h4 class="text-subtitle-2 font-weight-bold mb-2">Monthly Revenue Trend</h4>
          <div v-if="inv.monthlyTrend.length > 0" class="d-flex align-end gap-1" style="height:120px">
            <div v-for="m in inv.monthlyTrend" :key="m.month" class="flex-grow-1 text-center">
              <div
                class="mx-auto rounded"
                :style="{ width: '100%', maxWidth: '32px', height: Math.max(4, (m.revenue / inv.peakMonth) * 100) + 'px', backgroundColor: m.revenue >= inv.avgMonthly ? '#4CAF50' : '#FF9800' }"
              />
              <div class="text-caption mt-1" style="font-size:9px">{{ m.label }}</div>
            </div>
          </div>

          <div class="text-right mt-3">
            <v-btn variant="text" size="small" color="green" to="/marketing/invoice-analysis" append-icon="mdi-arrow-right">Full Invoice Analysis</v-btn>
          </div>
        </v-card-text>
      </v-card>

      <!-- ───────── §4  CLIENT HEALTH ───────── -->
      <v-card class="mb-6" variant="outlined">
        <v-card-title class="d-flex align-center gap-2 pb-0">
          <v-icon color="deep-purple" size="20">mdi-account-heart</v-icon>
          Client Health Analysis
          <v-chip size="x-small" color="deep-purple" variant="tonal" class="ml-1">{{ fmtN(cli.totalClients) }} contacts</v-chip>
        </v-card-title>
        <v-card-text class="pt-4">
          <!-- Lifecycle funnel -->
          <h4 class="text-subtitle-2 font-weight-bold mb-2">Client Lifecycle Funnel</h4>
          <div class="d-flex align-center gap-1 mb-3" style="height:60px">
            <div v-for="seg in cli.segments" :key="seg.label"
              class="text-center rounded pa-1 d-flex flex-column justify-center"
              :style="{ flex: Math.max(seg.pct, 5), backgroundColor: seg.bg, minWidth: '60px', height: '100%' }"
            >
              <div class="font-weight-bold text-body-2">{{ fmtN(seg.count) }}</div>
              <div style="font-size:10px" class="text-medium-emphasis">{{ seg.label }}</div>
              <div style="font-size:9px">{{ seg.pct }}%</div>
            </div>
          </div>

          <v-row dense class="mb-3">
            <v-col cols="6" sm="3">
              <div class="text-center">
                <div class="text-h6 font-weight-bold" :class="cli.retentionRate >= 60 ? 'text-green' : cli.retentionRate >= 40 ? 'text-orange' : 'text-red'">
                  {{ cli.retentionRate }}%
                </div>
                <div class="text-caption">Retention (12mo)</div>
                <div class="text-caption text-medium-emphasis">Target: 60%</div>
              </div>
            </v-col>
            <v-col cols="6" sm="3">
              <div class="text-center">
                <div class="text-h6 font-weight-bold text-blue">${{ fmtCurr(cli.arpu) }}</div>
                <div class="text-caption">ARPU ($25+ clients)</div>
                <div class="text-caption text-medium-emphasis">Target: $500+</div>
              </div>
            </v-col>
            <v-col cols="6" sm="3">
              <div class="text-center">
                <div class="text-h6 font-weight-bold text-amber">{{ fmtN(cli.highValue) }}</div>
                <div class="text-caption">VIP Clients ($2K+)</div>
              </div>
            </v-col>
            <v-col cols="6" sm="3">
              <div class="text-center">
                <div class="text-h6 font-weight-bold text-red">{{ fmtN(cli.lapsed) }}</div>
                <div class="text-caption">Lapsed (12mo+)</div>
              </div>
            </v-col>
          </v-row>

          <!-- Revenue tiers -->
          <v-divider class="my-4" />
          <h4 class="text-subtitle-2 font-weight-bold mb-2">Client Value Tiers</h4>
          <div v-for="tier in cli.tiers" :key="tier.label" class="mb-2">
            <div class="d-flex justify-space-between text-caption mb-1">
              <span>{{ tier.label }} <span class="text-medium-emphasis">({{ tier.range }})</span></span>
              <span class="font-weight-medium">{{ fmtN(tier.count) }} clients · ${{ fmtC(tier.revenue) }} revenue</span>
            </div>
            <v-progress-linear :model-value="tier.clientPct" :color="tier.color" height="8" rounded />
          </div>

          <!-- Division breakdown -->
          <v-divider v-if="cli.divisions.length > 1" class="my-4" />
          <h4 v-if="cli.divisions.length > 1" class="text-subtitle-2 font-weight-bold mb-2">By Division</h4>
          <v-row v-if="cli.divisions.length > 1" dense>
            <v-col cols="6" sm="4" md="3" v-for="div in cli.divisions" :key="div.name">
              <v-card variant="tonal" class="pa-2 text-center">
                <div class="text-body-2 font-weight-medium">{{ div.name }}</div>
                <div class="text-h6 font-weight-bold text-primary">{{ fmtN(div.count) }}</div>
                <div class="text-caption">${{ fmtC(div.revenue) }} rev</div>
              </v-card>
            </v-col>
          </v-row>

          <div class="text-right mt-3">
            <v-btn variant="text" size="small" color="deep-purple" to="/marketing/ezyvet-analytics" append-icon="mdi-arrow-right">Full Client Analytics</v-btn>
          </div>
        </v-card-text>
      </v-card>

      <!-- ───────── §5  APPOINTMENT INTELLIGENCE ───────── -->
      <v-card v-if="appt.total > 0" class="mb-6" variant="outlined">
        <v-card-title class="d-flex align-center gap-2 pb-0">
          <v-icon color="indigo" size="20">mdi-calendar-check</v-icon>
          Appointment Intelligence
          <v-chip size="x-small" color="indigo" variant="tonal" class="ml-1">{{ fmtN(appt.total) }} appointments</v-chip>
        </v-card-title>
        <v-card-text class="pt-4">
          <v-row dense class="mb-3">
            <v-col cols="6" sm="3">
              <div class="text-center">
                <div class="text-h6 font-weight-bold text-indigo">{{ fmtN(appt.total) }}</div>
                <div class="text-caption">Total Appointments</div>
              </div>
            </v-col>
            <v-col cols="6" sm="3">
              <div class="text-center">
                <div class="text-h6 font-weight-bold text-teal">{{ appt.uniqueTypes }}</div>
                <div class="text-caption">Service Types</div>
              </div>
            </v-col>
            <v-col cols="6" sm="3">
              <div class="text-center">
                <div class="text-h6 font-weight-bold text-blue">{{ appt.locations }}</div>
                <div class="text-caption">Locations</div>
              </div>
            </v-col>
            <v-col cols="6" sm="3">
              <div class="text-center">
                <div class="text-h6 font-weight-bold text-amber">{{ appt.peakDay || '—' }}</div>
                <div class="text-caption">Busiest Day</div>
              </div>
            </v-col>
          </v-row>

          <!-- Service mix -->
          <v-divider class="my-4" />
          <h4 class="text-subtitle-2 font-weight-bold mb-2">Service Mix</h4>
          <div v-for="svc in appt.topServices.slice(0, 10)" :key="svc.name" class="mb-2">
            <div class="d-flex justify-space-between text-caption mb-1">
              <span>{{ svc.name }}</span>
              <span class="font-weight-medium">{{ fmtN(svc.count) }} ({{ svc.pct }}%)</span>
            </div>
            <v-progress-linear :model-value="svc.pct" color="indigo" height="6" rounded />
          </div>

          <!-- Day-of-week heatmap -->
          <v-divider class="my-4" />
          <h4 class="text-subtitle-2 font-weight-bold mb-2">Day-of-Week Distribution</h4>
          <div class="d-flex gap-2">
            <div v-for="day in appt.dayDistribution" :key="day.name" class="flex-grow-1 text-center">
              <div class="rounded pa-2" :style="{ backgroundColor: dayHeatColor(day.pct) }">
                <div class="text-body-2 font-weight-bold">{{ day.count }}</div>
              </div>
              <div class="text-caption mt-1">{{ day.abbr }}</div>
            </div>
          </div>

          <!-- Species breakdown -->
          <v-divider v-if="appt.speciesBreakdown.length > 0" class="my-4" />
          <h4 v-if="appt.speciesBreakdown.length > 0" class="text-subtitle-2 font-weight-bold mb-2">Species Breakdown</h4>
          <v-row v-if="appt.speciesBreakdown.length > 0" dense>
            <v-col cols="6" sm="4" md="3" v-for="sp in appt.speciesBreakdown.slice(0, 8)" :key="sp.name">
              <v-card variant="tonal" class="pa-2 text-center">
                <div class="text-body-2 font-weight-medium">{{ sp.name }}</div>
                <div class="text-h6 font-weight-bold text-indigo">{{ fmtN(sp.count) }}</div>
                <div class="text-caption">{{ sp.pct }}%</div>
              </v-card>
            </v-col>
          </v-row>

          <div class="text-right mt-3">
            <v-btn variant="text" size="small" color="indigo" to="/marketing/appointment-analysis" append-icon="mdi-arrow-right">Full Appointment Analysis</v-btn>
          </div>
        </v-card-text>
      </v-card>

      <!-- ───────── §6  CROSS-DOMAIN INSIGHTS ───────── -->
      <v-card class="mb-6" variant="outlined">
        <v-card-title class="d-flex align-center gap-2 pb-0">
          <v-icon color="deep-orange" size="20">mdi-chart-timeline-variant-shimmer</v-icon>
          Cross-Domain Intelligence
          <span class="text-caption text-grey ml-2">Where the three datasets intersect</span>
        </v-card-title>
        <v-card-text class="pt-4">
          <v-row dense>
            <v-col cols="12" sm="6" md="4" v-for="insight in crossInsights" :key="insight.label">
              <v-card variant="outlined" class="pa-3 h-100" :style="{ borderLeft: '4px solid ' + insight.accentColor }">
                <div class="text-caption text-uppercase mb-1" style="color: #555">{{ insight.label }}</div>
                <div class="text-h5 font-weight-bold" :style="{ color: insight.accentColor }">{{ insight.value }}</div>
                <div class="text-body-2 mt-1" style="color: #333">{{ insight.note }}</div>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- ───────── §7  DATA COVERAGE ───────── -->
      <v-card variant="outlined" class="mb-6">
        <v-card-title class="d-flex align-center gap-2 pb-0">
          <v-icon color="grey" size="20">mdi-database</v-icon>
          Data Coverage
        </v-card-title>
        <v-card-text>
          <v-row dense>
            <v-col cols="4" v-for="src in dataSources" :key="src.name">
              <div class="text-center pa-2">
                <v-icon :color="src.count > 0 ? 'green' : 'grey'" size="20">
                  {{ src.count > 0 ? 'mdi-check-circle' : 'mdi-alert-circle-outline' }}
                </v-icon>
                <div class="text-subtitle-2 font-weight-bold">{{ fmtN(src.count) }}</div>
                <div class="text-caption text-medium-emphasis">{{ src.name }}</div>
                <div v-if="src.dateRange" class="text-caption text-grey" style="font-size:10px">{{ src.dateRange }}</div>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </template>

    <!-- No data state -->
    <div v-else class="text-center py-12">
      <v-icon size="64" color="grey-lighten-1">mdi-eye-off</v-icon>
      <div class="text-h6 text-grey mt-3">No data found</div>
      <div class="text-body-2 text-grey">Import client, invoice, or appointment data first.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  CLIENT_BENCHMARKS,
  FINANCIAL_BENCHMARKS,
  evaluateRetention,
} from '~/utils/vetBenchmarks'

definePageMeta({ layout: 'default', middleware: ['auth', 'marketing-admin'] })
useHead({ title: 'Sauron — Executive Report' })

const loading = ref(false)
const loadingStep = ref('loading data')
const lastRefresh = ref<string | null>(null)
const dataCutoffDate = ref('')

// ═══════════════════════════════════════════
// DATA STATE
// ═══════════════════════════════════════════

const inv = reactive({
  totalRevenue: 0,
  uniqueInvoices: 0,
  uniqueClients: 0,
  uniqueStaff: 0,
  totalLines: 0,
  topDepartments: [] as { name: string; revenue: number; pct: number }[],
  topStaff: [] as { name: string; revenue: number; lines: number; invoices: number }[],
  monthlyTrend: [] as { month: string; label: string; revenue: number }[],
  peakMonth: 1,
  avgMonthly: 0,
  earliestDate: null as string | null,
  latestDate: null as string | null,
})

const cli = reactive({
  totalClients: 0,
  activeClients: 0,
  atRisk: 0,
  lapsed: 0,
  neverVisited: 0,
  retentionRate: 0,
  arpu: 0,
  totalRevenue: 0,
  highValue: 0,
  segments: [] as { label: string; count: number; pct: number; bg: string }[],
  tiers: [] as { label: string; range: string; count: number; revenue: number; clientPct: number; color: string }[],
  divisions: [] as { name: string; count: number; revenue: number }[],
})

const appt = reactive({
  total: 0,
  uniqueTypes: 0,
  locations: 0,
  peakDay: '',
  topServices: [] as { name: string; count: number; pct: number }[],
  dayDistribution: [] as { name: string; abbr: string; count: number; pct: number }[],
  speciesBreakdown: [] as { name: string; count: number; pct: number }[],
  earliestDate: null as string | null,
  latestDate: null as string | null,
})

const observations = ref<Array<{
  icon: string; title: string; detail: string
  severity: 'critical' | 'warning' | 'success' | 'info'
  category: string
}>>([])

// ═══════════════════════════════════════════
// COMPUTED
// ═══════════════════════════════════════════

const hasData = computed(() => cli.totalClients > 0 || inv.totalLines > 0 || appt.total > 0)
const totalRecords = computed(() => cli.totalClients + inv.totalLines + appt.total)
const dataCutoff = computed(() => {
  if (dataCutoffDate.value) {
    const d = new Date(dataCutoffDate.value + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }
  return ''
})

const criticalCount = computed(() => observations.value.filter(o => o.severity === 'critical').length)
const warningCount = computed(() => observations.value.filter(o => o.severity === 'warning').length)
const successCount = computed(() => observations.value.filter(o => o.severity === 'success').length)

// ── Scorecard ──
const scorecardItems = computed(() => {
  const items: Array<{
    label: string; value: string; icon: string
    borderColor: string; valueColor: string
    pct: number; rating: string; benchmark: string
    tooltip: string
  }> = []

  // 1. Client Retention
  const retEval = evaluateRetention(cli.retentionRate / 100)
  items.push({
    label: 'Client Retention',
    value: `${cli.retentionRate}%`,
    icon: 'mdi-shield-check',
    borderColor: retEval.color,
    valueColor: retEval.color,
    pct: Math.min(cli.retentionRate / 0.75 * 100 / 100, 100),
    rating: retEval.label,
    benchmark: '60% (AAHA)',
    tooltip: 'Percentage of clients with invoice activity in the last 12 months who also had activity in the prior 12 months. Based on AAHA benchmark of 60%.',
  })

  // 2. Avg Revenue per Client (from invoices)
  const avgRev = inv.uniqueClients > 0 ? inv.totalRevenue / inv.uniqueClients : 0
  const atcTarget = CLIENT_BENCHMARKS.averageTransactionCharge.target
  const atcHigh = CLIENT_BENCHMARKS.averageTransactionCharge.high
  const atcColor = avgRev >= atcHigh ? 'green' : avgRev >= atcTarget ? 'light-green' : avgRev >= CLIENT_BENCHMARKS.averageTransactionCharge.low ? 'orange' : 'red'
  const atcLabel = avgRev >= atcHigh ? 'Excellent' : avgRev >= atcTarget ? 'Good' : avgRev >= CLIENT_BENCHMARKS.averageTransactionCharge.low ? 'Below Target' : 'Critical'
  items.push({
    label: 'Avg Rev / Client',
    value: `$${fmtCurr(avgRev)}`,
    icon: 'mdi-currency-usd',
    borderColor: atcColor,
    valueColor: atcColor,
    pct: Math.min((avgRev / atcHigh) * 100, 100),
    rating: atcLabel,
    benchmark: `$${atcTarget} (AAHA)`,
    tooltip: 'Total invoice revenue divided by the number of unique clients. Indicates average spending per client across all services.',
  })

  // 3. Revenue Concentration (HHI-lite — top dept %)
  const topDeptPct = inv.topDepartments.length > 0 ? inv.topDepartments[0].pct : 0
  const concColor = topDeptPct > 50 ? 'red' : topDeptPct > 35 ? 'orange' : 'green'
  items.push({
    label: 'Revenue Diversification',
    value: topDeptPct > 0 ? `Top: ${topDeptPct}%` : 'N/A',
    icon: 'mdi-chart-pie',
    borderColor: concColor,
    valueColor: concColor,
    pct: 100 - topDeptPct,
    rating: topDeptPct > 50 ? 'Concentrated' : topDeptPct > 35 ? 'Moderate' : 'Healthy',
    benchmark: '<35% (best practice)',
    tooltip: 'Shows how much revenue is concentrated in the top department. Lower is better — a healthy practice has no single department above 35% of total revenue.',
  })

  // 4. Client Lifetime Value
  const clv = cli.arpu
  const clvTarget = CLIENT_BENCHMARKS.annualClientValue.average
  const clvGood = CLIENT_BENCHMARKS.annualClientValue.good
  const clvColor = clv >= clvGood ? 'green' : clv >= clvTarget ? 'light-green' : clv >= CLIENT_BENCHMARKS.annualClientValue.low ? 'orange' : 'red'
  items.push({
    label: 'ARPU',
    value: `$${fmtCurr(clv)}`,
    icon: 'mdi-diamond-stone',
    borderColor: clvColor,
    valueColor: clvColor,
    pct: Math.min((clv / clvGood) * 100, 100),
    rating: clv >= clvGood ? 'Excellent' : clv >= clvTarget ? 'Good' : 'Below Target',
    benchmark: `$${clvTarget} avg (AAHA)`,
    tooltip: 'Average Revenue Per User — calculated from CRM contacts with $25+ in invoice activity. Measures per-client revenue value against AAHA benchmarks.',
  })

  // 5. Lapse Risk
  const lapsePct = cli.totalClients > 0 ? Math.round((cli.lapsed / cli.totalClients) * 100) : 0
  const lapseColor = lapsePct > 50 ? 'red' : lapsePct > 30 ? 'orange' : 'green'
  items.push({
    label: 'Lapse Rate',
    value: `${lapsePct}%`,
    icon: 'mdi-account-off',
    borderColor: lapseColor,
    valueColor: lapseColor,
    pct: 100 - lapsePct,
    rating: lapsePct > 50 ? 'Critical' : lapsePct > 30 ? 'Elevated' : 'Healthy',
    benchmark: '<30% ideal',
    tooltip: 'Percentage of CRM contacts classified as lapsed (no activity in 12+ months). A healthy practice keeps this below 30%.',
  })

  // 6. VIP Client Concentration
  const vipPct = cli.totalClients > 0 ? Math.round((cli.highValue / cli.totalClients) * 100) : 0
  const vipColor = vipPct >= 10 ? 'green' : vipPct >= 5 ? 'light-green' : 'orange'
  items.push({
    label: 'VIP Clients ($2K+)',
    value: `${fmtN(cli.highValue)} (${vipPct}%)`,
    icon: 'mdi-star',
    borderColor: vipColor,
    valueColor: vipColor,
    pct: Math.min(vipPct * 5, 100),
    rating: vipPct >= 10 ? 'Strong' : vipPct >= 5 ? 'Average' : 'Opportunity',
    benchmark: '10%+ VIP ideal',
    tooltip: 'Number and percentage of clients who have spent $2,000 or more. A strong VIP base (10%+) indicates loyal, high-value relationships.',
  })

  return items
})

// ── Cross-domain insights ──
const crossInsights = computed(() => {
  const insights: Array<{ label: string; value: string; note: string; accentColor: string }> = []

  // Revenue per appointment
  if (appt.total > 0 && inv.totalRevenue > 0) {
    const revPerAppt = inv.totalRevenue / appt.total
    insights.push({
      label: 'Revenue per Appointment',
      value: `$${fmtCurr(revPerAppt)}`,
      note: revPerAppt >= 250 ? 'Above $250 AAHA target — strong transaction value' : `Below $250 target — opportunity to increase per-visit value`,
      accentColor: revPerAppt >= 250 ? '#4CAF50' : '#FF9800',
    })
  }

  // Invoice lines per appointment (bundling metric)
  if (appt.total > 0 && inv.totalLines > 0) {
    const linesPerAppt = (inv.totalLines / appt.total).toFixed(1)
    insights.push({
      label: 'Invoice Lines per Visit',
      value: linesPerAppt,
      note: Number(linesPerAppt) >= 3 ? 'Good service bundling — multiple charges per visit' : 'Low bundling — are diagnostics/labs being recommended consistently?',
      accentColor: Number(linesPerAppt) >= 3 ? '#4CAF50' : '#FF9800',
    })
  }

  // Client-to-appointment ratio
  if (cli.activeClients > 0 && appt.total > 0) {
    const apptsPerClient = (appt.total / cli.activeClients).toFixed(1)
    insights.push({
      label: 'Visits per Active Client',
      value: `${apptsPerClient}×`,
      note: Number(apptsPerClient) >= 2 ? 'Clients returning for multiple visits — good bonding' : 'Low repeat visits — retention and recall programs needed',
      accentColor: Number(apptsPerClient) >= 2 ? '#4CAF50' : '#FF9800',
    })
  }

  // Revenue from active vs total clients
  if (cli.totalClients > 0 && cli.activeClients > 0) {
    const activePct = Math.round((cli.activeClients / cli.totalClients) * 100)
    insights.push({
      label: 'Active Client Ratio',
      value: `${activePct}%`,
      note: `${fmtN(cli.activeClients)} of ${fmtN(cli.totalClients)} clients seen in last 12 months. ${cli.lapsed > 0 ? fmtN(cli.lapsed) + ' are reactivation candidates.' : ''}`,
      accentColor: activePct >= 50 ? '#2196F3' : '#f44336',
    })
  }

  // Staff productivity (revenue per staff member)
  if (inv.uniqueStaff > 0) {
    const revPerStaff = inv.totalRevenue / inv.uniqueStaff
    insights.push({
      label: 'Revenue per Provider',
      value: `$${fmtC(revPerStaff)}`,
      note: `Across ${inv.uniqueStaff} providers. AAHA target: $700K+/FTE DVM/year.`,
      accentColor: '#2196F3',
    })
  }

  // At-risk revenue impact estimate
  if (cli.atRisk > 0 && cli.arpu > 0) {
    const riskRevenueImpact = cli.atRisk * cli.arpu
    insights.push({
      label: 'At-Risk Revenue Impact',
      value: `$${fmtC(riskRevenueImpact)}`,
      note: `${fmtN(cli.atRisk)} at-risk clients × $${fmtCurr(cli.arpu)} ARPU. Targeted outreach could recover this revenue.`,
      accentColor: '#f44336',
    })
  }

  return insights
})

// ── Data sources ──
const dataSources = computed(() => [
  { name: 'CRM Contacts', count: cli.totalClients, dateRange: '' },
  { name: 'Invoice Lines', count: inv.totalLines, dateRange: inv.earliestDate && inv.latestDate ? `${inv.earliestDate} → ${inv.latestDate}` : '' },
  { name: 'Appointments', count: appt.total, dateRange: appt.earliestDate && appt.latestDate ? `${appt.earliestDate} → ${appt.latestDate}` : '' },
])

// ═══════════════════════════════════════════
// DATA FETCHER — single server API call
// ═══════════════════════════════════════════

async function fetchAllData() {
  loadingStep.value = 'loading data'
  const data = await $fetch('/api/marketing/sauron') as any

  // Populate invoice data
  Object.assign(inv, data.inv)

  // Populate client data
  Object.assign(cli, data.cli)

  // Populate appointment data
  Object.assign(appt, data.appt)

  // Set data cutoff date
  dataCutoffDate.value = data.cutoffDate || ''
}

// ═══════════════════════════════════════════
// OBSERVATION ENGINE
// ═══════════════════════════════════════════

function generateObservations() {
  const obs: typeof observations.value = []

  // ── CLIENT HEALTH ──

  if (cli.totalClients > 0) {
    const lapsePct = Math.round((cli.lapsed / cli.totalClients) * 100)

    if (cli.lapsed > cli.activeClients) {
      obs.push({
        icon: 'mdi-account-alert', severity: 'critical', category: 'Client Health',
        title: `${fmtN(cli.lapsed)} lapsed clients outnumber ${fmtN(cli.activeClients)} active clients`,
        detail: `${lapsePct}% of your client base hasn't visited in 12+ months. AAHA benchmarks suggest a healthy practice retains 60%+ clients within 18 months. A targeted reactivation campaign (wellness reminders, loyalty offers) is urgently needed. Even recovering 10% of lapsed clients could add ~$${fmtC(cli.lapsed * 0.1 * cli.arpu)} in revenue.`,
      })
    } else if (lapsePct > 30) {
      obs.push({
        icon: 'mdi-account-clock', severity: 'warning', category: 'Client Health',
        title: `${lapsePct}% lapse rate exceeds healthy threshold`,
        detail: `${fmtN(cli.lapsed)} clients lapsed. Best-practice target is under 30%. Focus on recall compliance and proactive outreach to the ${fmtN(cli.atRisk)} at-risk clients before they lapse.`,
      })
    }

    if (cli.retentionRate >= 65) {
      obs.push({
        icon: 'mdi-shield-check', severity: 'success', category: 'Client Health',
        title: `Strong retention at ${cli.retentionRate}%`,
        detail: `Above the AAHA/VetSuccess 60% bonding rate benchmark. ${fmtN(cli.activeClients + cli.atRisk)} of ${fmtN(cli.totalClients)} clients have been seen within 12 months. Top CA practices hit 65-75%.`,
      })
    } else if (cli.retentionRate < 50) {
      obs.push({
        icon: 'mdi-shield-alert', severity: 'critical', category: 'Client Health',
        title: `Retention at ${cli.retentionRate}% — well below 60% industry target`,
        detail: `This means more than half of your client base is disengaged. Per AAHA/VetSuccess, this is below average and indicates systemic retention issues. Review: client experience, follow-up processes, pricing perception, and appointment reminders.`,
      })
    }

    if (cli.atRisk > 0) {
      const atRiskRev = cli.atRisk * cli.arpu
      obs.push({
        icon: 'mdi-clock-alert', severity: 'warning', category: 'Client Health',
        title: `${fmtN(cli.atRisk)} clients are sliding toward lapse (6-12mo inactive)`,
        detail: `These clients represent ~$${fmtC(atRiskRev)} in potential annual revenue (${fmtN(cli.atRisk)} × $${fmtCurr(cli.arpu)} ARPU). Targeted outreach within the next 90 days has the highest recovery probability. Consider: wellness reminders, special offers, or a personal call from their provider.`,
      })
    }

    if (cli.highValue > 0) {
      const vipPct = Math.round((cli.highValue / cli.totalClients) * 100)
      obs.push({
        icon: 'mdi-diamond-stone', severity: vipPct >= 10 ? 'success' : 'info', category: 'Client Value',
        title: `${fmtN(cli.highValue)} VIP clients ($2K+ lifetime) — ${vipPct}% of base`,
        detail: `These high-value clients are your practice foundation. Ensure they receive premium experience: priority scheduling, proactive wellness plans, and relationship management. Losing even a few VIPs has outsized revenue impact.`,
      })
    }

    if (cli.neverVisited > 0 && cli.neverVisited > cli.totalClients * 0.05) {
      obs.push({
        icon: 'mdi-account-question', severity: 'info', category: 'Data Quality',
        title: `${fmtN(cli.neverVisited)} contacts with no visit date recorded`,
        detail: `${Math.round((cli.neverVisited / cli.totalClients) * 100)}% of contacts have null last_visit. These may be data quality issues from the EzyVet import, or genuinely new/unconverted leads. Review and clean up for accurate retention metrics.`,
      })
    }
  }

  // ── REVENUE ──

  if (inv.totalRevenue > 0) {
    const avgRev = inv.uniqueClients > 0 ? inv.totalRevenue / inv.uniqueClients : 0

    if (avgRev >= CLIENT_BENCHMARKS.averageTransactionCharge.high) {
      obs.push({
        icon: 'mdi-trophy', severity: 'success', category: 'Revenue',
        title: `Average revenue per client: $${fmtCurr(avgRev)} — above $${CLIENT_BENCHMARKS.averageTransactionCharge.high} benchmark`,
        detail: `Across ${fmtN(inv.uniqueClients)} unique clients generating $${fmtCurr(inv.totalRevenue)} total. This indicates strong service utilization and appropriate pricing. Maintain through continued emphasis on comprehensive care plans.`,
      })
    } else if (avgRev < CLIENT_BENCHMARKS.averageTransactionCharge.low) {
      obs.push({
        icon: 'mdi-alert-circle', severity: 'warning', category: 'Revenue',
        title: `Average revenue per client: $${fmtCurr(avgRev)} — below $${CLIENT_BENCHMARKS.averageTransactionCharge.low} AAHA minimum`,
        detail: `This suggests underutilization of services or underpricing. Review: are diagnostics being recommended consistently? Is the fee schedule current? AAHA target is $250/visit.`,
      })
    }

    // Revenue concentration
    if (inv.topDepartments.length > 0) {
      const top = inv.topDepartments[0]
      if (top.pct > 50) {
        obs.push({
          icon: 'mdi-chart-pie', severity: 'warning', category: 'Revenue',
          title: `Revenue concentration risk: ${top.name} = ${top.pct}% of total`,
          detail: `$${fmtCurr(top.revenue)} from one department. Best practice is no single department exceeding 35%. If this department encounters staffing or demand issues, revenue impact would be severe. Diversify by growing other service lines.`,
        })
      }
    }

    // Monthly trend analysis
    if (inv.monthlyTrend.length >= 3) {
      const recent3 = inv.monthlyTrend.slice(-3)
      const prior3 = inv.monthlyTrend.slice(-6, -3)
      if (prior3.length >= 2) {
        const recentAvg = recent3.reduce((s, m) => s + m.revenue, 0) / recent3.length
        const priorAvg = prior3.reduce((s, m) => s + m.revenue, 0) / prior3.length
        const pctChange = priorAvg > 0 ? Math.round(((recentAvg - priorAvg) / priorAvg) * 100) : 0

        if (pctChange < -15) {
          obs.push({
            icon: 'mdi-trending-down', severity: 'critical', category: 'Revenue Trend',
            title: `Revenue declining: ${pctChange}% in last 3 months vs prior 3`,
            detail: `Recent 3-month avg: $${fmtCurr(recentAvg)}/mo vs prior $${fmtCurr(priorAvg)}/mo. This is a significant decline. Investigate: has client volume dropped? Have prices changed? Are providers scheduling fewer appointments?`,
          })
        } else if (pctChange < -5) {
          obs.push({
            icon: 'mdi-trending-down', severity: 'warning', category: 'Revenue Trend',
            title: `Revenue softening: ${pctChange}% recent quarterly trend`,
            detail: `Monitor closely. Recent avg: $${fmtCurr(recentAvg)}/mo. CA vet industry seeing declining visit volumes — retention focus is critical.`,
          })
        } else if (pctChange > 10) {
          obs.push({
            icon: 'mdi-trending-up', severity: 'success', category: 'Revenue Trend',
            title: `Revenue growing: +${pctChange}% in last 3 months`,
            detail: `Recent avg: $${fmtCurr(recentAvg)}/mo vs prior $${fmtCurr(priorAvg)}/mo. Positive momentum — identify what's driving growth and double down.`,
          })
        }
      }
    }

    // Staff performance spread
    if (inv.topStaff.length >= 3) {
      const topRev = inv.topStaff[0].revenue
      const bottomRev = inv.topStaff[inv.topStaff.length - 1].revenue
      const ratio = bottomRev > 0 ? (topRev / bottomRev).toFixed(1) : '∞'
      if (Number(ratio) > 5) {
        obs.push({
          icon: 'mdi-account-group', severity: 'info', category: 'Staff',
          title: `${ratio}× gap between top and bottom producers`,
          detail: `Top: ${inv.topStaff[0].name} at $${fmtC(topRev)}. Consider implications: is this a productivity issue, scheduling inequality, or specialty difference? AAHA recommends $700K+ per FTE DVM annually.`,
        })
      }
    }
  }

  // ── APPOINTMENTS ──

  if (appt.total > 0) {
    if (appt.peakDay) {
      const peakPct = appt.dayDistribution.find(d => d.name === appt.peakDay)?.pct || 0
      const minDay = appt.dayDistribution.filter(d => d.count > 0).reduce((a, b) => a.count < b.count ? a : b, appt.dayDistribution[0])
      obs.push({
        icon: 'mdi-calendar-check', severity: 'info', category: 'Scheduling',
        title: `${appt.peakDay} is busiest (${peakPct}% of appointments)`,
        detail: `Quietest day: ${minDay.name} (${minDay.count} appointments). Consider: can you redistribute demand with pricing incentives or targeted scheduling on slower days? This could improve provider utilization and reduce wait times.`,
      })
    }

    // Service diversity
    if (appt.topServices.length > 0) {
      const topSvc = appt.topServices[0]
      if (topSvc.pct > 40) {
        obs.push({
          icon: 'mdi-medical-bag', severity: 'warning', category: 'Service Mix',
          title: `${topSvc.name} dominates at ${topSvc.pct}% of all appointments`,
          detail: `Heavy reliance on one service type. Diversifying into additional services (dental, wellness plans, diagnostics) reduces risk and increases per-visit revenue. AAHA well-managed practices offer 10+ service categories.`,
        })
      }
    }

    // Species insights
    if (appt.speciesBreakdown.length > 0) {
      const topSpecies = appt.speciesBreakdown[0]
      if (topSpecies.pct > 80) {
        obs.push({
          icon: 'mdi-paw', severity: 'info', category: 'Service Mix',
          title: `${topSpecies.name} represents ${topSpecies.pct}% of patients`,
          detail: `Near-exclusive focus on ${topSpecies.name.toLowerCase()}. Consider whether expanding exotic/avian/pocket pet services could capture unserved market segments in your area.`,
        })
      }
    }
  }

  // ── CROSS-DOMAIN ──

  if (appt.total > 0 && inv.totalRevenue > 0) {
    const revPerAppt = inv.totalRevenue / appt.total
    if (revPerAppt < CLIENT_BENCHMARKS.averageTransactionCharge.low) {
      obs.push({
        icon: 'mdi-chart-timeline-variant', severity: 'warning', category: 'Cross-Domain',
        title: `Revenue per appointment: $${fmtCurr(revPerAppt)} — below $${CLIENT_BENCHMARKS.averageTransactionCharge.low} minimum`,
        detail: `This cross-references invoices against appointments. Low per-visit revenue suggests either: under-recommending services, discounting, or a high proportion of low-value visit types. Review your most common appointment types and their average charges.`,
      })
    } else if (revPerAppt >= CLIENT_BENCHMARKS.averageTransactionCharge.target) {
      obs.push({
        icon: 'mdi-check-decagram', severity: 'success', category: 'Cross-Domain',
        title: `Revenue per appointment: $${fmtCurr(revPerAppt)} — meets AAHA target`,
        detail: `Good transaction value indicating comprehensive service delivery. Continue recommending appropriate diagnostics, preventatives, and follow-up care.`,
      })
    }

    const linesPerAppt = inv.totalLines / appt.total
    if (linesPerAppt < 2) {
      obs.push({
        icon: 'mdi-format-list-checks', severity: 'warning', category: 'Cross-Domain',
        title: `Low service bundling: ${linesPerAppt.toFixed(1)} invoice lines per appointment`,
        detail: `Well-managed practices typically generate 3+ line items per visit (exam, diagnostics, treatment, dispensing). Low bundling may indicate missed recommendations for labs, preventatives, or dental assessments.`,
      })
    }
  }

  // Sort: critical → warning → info → success
  const order = { critical: 0, warning: 1, info: 2, success: 3 }
  obs.sort((a, b) => order[a.severity] - order[b.severity])
  observations.value = obs
}

// ═══════════════════════════════════════════
// REFRESH
// ═══════════════════════════════════════════

async function refreshAll() {
  loading.value = true
  try {
    await fetchAllData()
    generateObservations()
    lastRefresh.value = new Date().toISOString()
  } catch (err) {
    console.error('[Sauron] Refresh error:', err)
  } finally {
    loading.value = false
  }
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function fmtN(n: number): string { return n.toLocaleString() }
function fmtC(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}
function fmtCurr(n: number): string { return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }
function fmtDT(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
function sevColor(s: string): string {
  return s === 'critical' ? 'red' : s === 'warning' ? 'orange' : s === 'success' ? 'green' : 'blue'
}
function dayHeatColor(pct: number): string {
  if (pct >= 20) return 'rgba(63, 81, 181, 0.4)'
  if (pct >= 15) return 'rgba(63, 81, 181, 0.25)'
  if (pct >= 10) return 'rgba(63, 81, 181, 0.15)'
  return 'rgba(63, 81, 181, 0.07)'
}
function printReport() { window.print() }

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════
onMounted(() => refreshAll())
</script>

<style scoped>
.sauron-page {
  max-width: 1200px;
  margin: 0 auto;
}
.scorecard-card {
  transition: transform 0.2s, box-shadow 0.2s;
}
.scorecard-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}
.border-green { border-color: #4CAF50 !important; border-width: 2px !important; }
.border-light-green { border-color: #8BC34A !important; border-width: 2px !important; }
.border-orange { border-color: #FF9800 !important; border-width: 2px !important; }
.border-red { border-color: #f44336 !important; border-width: 2px !important; }
.border-grey { border-color: #9e9e9e !important; }
.border-amber-darken-1 { border-color: #FFB300 !important; border-width: 2px !important; }
.border-purple { border-color: #9C27B0 !important; border-width: 2px !important; }
.border-blue { border-color: #2196F3 !important; border-width: 2px !important; }
.border-indigo { border-color: #3F51B5 !important; border-width: 2px !important; }
@media print {
  .v-btn { display: none !important; }
}
</style>

<style>
/* Global (non-scoped) — tooltip is teleported to body, outside component scope */
.sauron-tooltip {
  background: #212121 !important;
  color: #ffffff !important;
  font-size: 0.875rem !important;
  line-height: 1.5 !important;
  padding: 12px 16px !important;
  border-radius: 8px !important;
  opacity: 1 !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
}
.sauron-tooltip * {
  color: #ffffff !important;
}
</style>
