<template>
  <div class="reports-tab">
    <!-- Date Range Picker -->
    <v-card variant="outlined" class="mb-4">
      <v-card-text class="py-3">
        <v-row align="center" dense>
          <v-col cols="12" md="3">
            <v-select
              v-model="preset"
              :items="presetOptions"
              label="Time Period"
              variant="outlined"
              density="compact"
              hide-details
              @update:model-value="applyPreset"
            />
          </v-col>
          <v-col cols="6" md="2">
            <v-text-field
              v-model="dateFrom"
              label="From"
              type="date"
              variant="outlined"
              density="compact"
              hide-details
              @update:model-value="preset = 'custom'"
            />
          </v-col>
          <v-col cols="6" md="2">
            <v-text-field
              v-model="dateTo"
              label="To"
              type="date"
              variant="outlined"
              density="compact"
              hide-details
              @update:model-value="preset = 'custom'"
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-btn color="primary" variant="flat" block @click="generateReport" :loading="loading">
              <v-icon start>mdi-chart-bar</v-icon>
              Generate
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" />
      <p class="text-body-2 text-grey mt-2">Generating report...</p>
    </div>

    <!-- Report Content -->
    <div v-else-if="hasData">
      <!-- Summary Stats -->
      <v-row class="mb-4">
        <v-col cols="6" md="3">
          <v-card variant="outlined" class="text-center pa-4">
            <div class="text-h4 font-weight-bold text-primary">{{ reportData.totalReferrals.toLocaleString() }}</div>
            <div class="text-caption text-grey-darken-1 mt-1">Total Referrals</div>
          </v-card>
        </v-col>
        <v-col cols="6" md="3">
          <v-card variant="outlined" class="text-center pa-4">
            <div class="text-h4 font-weight-bold text-success">${{ formatCurrency(reportData.totalRevenue) }}</div>
            <div class="text-caption text-grey-darken-1 mt-1">Referral Revenue</div>
          </v-card>
        </v-col>
        <v-col cols="6" md="3">
          <v-card variant="outlined" class="text-center pa-4">
            <div class="text-h4 font-weight-bold text-info">{{ reportData.totalVisits.toLocaleString() }}</div>
            <div class="text-caption text-grey-darken-1 mt-1">Clinic Visits Made</div>
          </v-card>
        </v-col>
        <v-col cols="6" md="3">
          <v-card variant="outlined" class="text-center pa-4">
            <div class="text-h4 font-weight-bold text-secondary">{{ reportData.activePartners }}</div>
            <div class="text-caption text-grey-darken-1 mt-1">Active Referring Clinics</div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Avg Revenue per Referral + Avg Referrals per Partner -->
      <v-row class="mb-4">
        <v-col cols="6" md="3">
          <v-card variant="outlined" class="text-center pa-4">
            <div class="text-h5 font-weight-bold text-teal">${{ formatCurrency(reportData.avgRevenuePerReferral) }}</div>
            <div class="text-caption text-grey-darken-1 mt-1">Avg Revenue / Referral</div>
          </v-card>
        </v-col>
        <v-col cols="6" md="3">
          <v-card variant="outlined" class="text-center pa-4">
            <div class="text-h5 font-weight-bold text-deep-purple">{{ reportData.avgReferralsPerPartner.toFixed(1) }}</div>
            <div class="text-caption text-grey-darken-1 mt-1">Avg Referrals / Partner</div>
          </v-card>
        </v-col>
        <v-col cols="6" md="3">
          <v-card variant="outlined" class="text-center pa-4">
            <div class="text-h5 font-weight-bold text-orange">{{ reportData.partnersByTier.length }}</div>
            <div class="text-caption text-grey-darken-1 mt-1">Tier Breakdown</div>
          </v-card>
        </v-col>
        <v-col cols="6" md="3">
          <v-card variant="outlined" class="text-center pa-4">
            <div class="text-h5 font-weight-bold text-pink">{{ reportData.zoneBreakdown.length }}</div>
            <div class="text-caption text-grey-darken-1 mt-1">Zones Active</div>
          </v-card>
        </v-col>
      </v-row>

      <v-row>
        <!-- Top Referring Clinics -->
        <v-col cols="12" md="6">
          <v-card variant="outlined">
            <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center">
              <v-icon start color="amber" size="20">mdi-trophy</v-icon>
              Top Referring Clinics
            </v-card-title>
            <v-divider />
            <v-list density="compact" class="pa-0">
              <v-list-item
                v-for="(clinic, idx) in reportData.topClinics"
                :key="clinic.id"
                class="px-4"
              >
                <template #prepend>
                  <v-avatar :color="idx < 3 ? 'amber' : 'grey-lighten-2'" size="28" class="mr-3">
                    <span class="text-caption font-weight-bold" :class="idx < 3 ? 'text-white' : ''">{{ idx + 1 }}</span>
                  </v-avatar>
                </template>
                <v-list-item-title class="text-body-2">{{ clinic.name }}</v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                  {{ clinic.referrals.toLocaleString() }} referrals &bull; ${{ Number(clinic.revenue).toLocaleString() }}
                </v-list-item-subtitle>
                <template #append>
                  <v-chip size="x-small" :color="getTierColor(clinic.tier)" variant="flat">
                    {{ clinic.tier || 'N/A' }}
                  </v-chip>
                </template>
              </v-list-item>
              <v-list-item v-if="!reportData.topClinics.length">
                <v-list-item-title class="text-body-2 text-grey text-center">No referral data in this period</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>

        <!-- Revenue by Tier -->
        <v-col cols="12" md="6">
          <v-card variant="outlined">
            <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center">
              <v-icon start color="deep-purple" size="20">mdi-chart-donut</v-icon>
              Breakdown by Tier
            </v-card-title>
            <v-divider />
            <v-list density="compact" class="pa-0">
              <v-list-item
                v-for="tier in reportData.partnersByTier"
                :key="tier.tier"
                class="px-4"
              >
                <template #prepend>
                  <v-avatar :color="getTierChipColor(tier.tier)" size="28" class="mr-3">
                    <span class="text-caption font-weight-bold text-white">{{ getTierLabel(tier.tier) }}</span>
                  </v-avatar>
                </template>
                <v-list-item-title class="text-body-2">{{ tier.tier || 'Unset' }}</v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                  {{ tier.count }} partners &bull; {{ tier.referrals.toLocaleString() }} referrals &bull; ${{ Number(tier.revenue).toLocaleString() }}
                </v-list-item-subtitle>
                <template #append>
                  <span class="text-body-2 font-weight-medium text-success">${{ formatCurrency(tier.revenue) }}</span>
                </template>
              </v-list-item>
              <v-list-item v-if="!reportData.partnersByTier.length">
                <v-list-item-title class="text-body-2 text-grey text-center">No tier data</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>
      </v-row>

      <!-- Zone Breakdown -->
      <v-row class="mt-2">
        <v-col cols="12">
          <v-card variant="outlined">
            <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center">
              <v-icon start color="teal" size="20">mdi-map-marker-multiple</v-icon>
              Referrals by Zone
            </v-card-title>
            <v-divider />
            <v-table density="compact">
              <thead>
                <tr>
                  <th>Zone</th>
                  <th class="text-center">Partners</th>
                  <th class="text-center">Referrals</th>
                  <th class="text-end">Revenue</th>
                  <th class="text-center">Visits Made</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="zone in reportData.zoneBreakdown" :key="zone.zone">
                  <td class="text-body-2">{{ zone.zone || 'Unassigned' }}</td>
                  <td class="text-center">{{ zone.count }}</td>
                  <td class="text-center font-weight-medium">{{ zone.referrals.toLocaleString() }}</td>
                  <td class="text-end font-weight-medium text-success">${{ Number(zone.revenue).toLocaleString() }}</td>
                  <td class="text-center">{{ zone.visits }}</td>
                </tr>
                <tr v-if="!reportData.zoneBreakdown.length">
                  <td colspan="5" class="text-center text-grey py-4">No zone data</td>
                </tr>
              </tbody>
              <tfoot v-if="reportData.zoneBreakdown.length">
                <tr class="font-weight-bold" style="background: rgba(0,0,0,0.02);">
                  <td>Total</td>
                  <td class="text-center">{{ reportData.zoneBreakdown.reduce((s, z) => s + z.count, 0) }}</td>
                  <td class="text-center">{{ reportData.zoneBreakdown.reduce((s, z) => s + z.referrals, 0).toLocaleString() }}</td>
                  <td class="text-end text-success">${{ reportData.zoneBreakdown.reduce((s, z) => s + z.revenue, 0).toLocaleString() }}</td>
                  <td class="text-center">{{ reportData.zoneBreakdown.reduce((s, z) => s + z.visits, 0) }}</td>
                </tr>
              </tfoot>
            </v-table>
          </v-card>
        </v-col>
      </v-row>

      <!-- Recent Visit Activity in Period -->
      <v-row class="mt-2 mb-4">
        <v-col cols="12">
          <v-card variant="outlined">
            <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon start color="blue" size="20">mdi-calendar-check</v-icon>
                Visit Activity in Period
              </div>
              <span class="text-caption text-grey">{{ reportData.visitsList.length }} visits</span>
            </v-card-title>
            <v-divider />
            <v-data-table
              :headers="visitHeaders"
              :items="reportData.visitsList"
              :items-per-page="10"
              density="compact"
              class="elevation-0"
            >
              <template #item.visit_date="{ item }">
                <span class="text-body-2">{{ formatPartnerDate(item.visit_date) }}</span>
              </template>
              <template #item.items_discussed="{ item }">
                <div class="d-flex flex-wrap gap-1">
                  <v-chip
                    v-for="topic in (item.items_discussed || []).slice(0, 3)"
                    :key="topic"
                    size="x-small"
                    variant="tonal"
                    color="primary"
                  >
                    {{ topic }}
                  </v-chip>
                  <v-chip v-if="(item.items_discussed || []).length > 3" size="x-small" variant="text">
                    +{{ item.items_discussed.length - 3 }}
                  </v-chip>
                </div>
              </template>
              <template #no-data>
                <div class="text-center text-grey py-4">No visits in this period</div>
              </template>
            </v-data-table>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Empty State -->
    <v-card v-else variant="outlined" class="text-center py-12">
      <v-icon size="64" color="grey-lighten-1">mdi-chart-timeline-variant</v-icon>
      <p class="text-h6 text-grey mt-4">Select a time period and click Generate</p>
      <p class="text-body-2 text-grey-darken-1">View referral metrics, top clinics, visit counts, and revenue breakdowns</p>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { formatPartnerDate, formatCurrency, getTierColor, getTierLabel } from '~/utils/partnershipHelpers'

interface Props {
  partners: any[]
}

const props = defineProps<Props>()
const supabase = useSupabaseClient()

// Date range state
const preset = ref('last30')
const dateFrom = ref('')
const dateTo = ref('')
const loading = ref(false)
const hasData = ref(false)

const presetOptions = [
  { title: 'Last 30 Days', value: 'last30' },
  { title: 'Last 90 Days', value: 'last90' },
  { title: 'Last 6 Months', value: 'last6m' },
  { title: 'Last 12 Months', value: 'last12m' },
  { title: 'Year to Date', value: 'ytd' },
  { title: 'All Time', value: 'all' },
  { title: 'Custom', value: 'custom' }
]

const visitHeaders = [
  { title: 'Date', key: 'visit_date', sortable: true },
  { title: 'Clinic', key: 'clinic_name', sortable: true },
  { title: 'Spoke To', key: 'spoke_to', sortable: false },
  { title: 'Topics', key: 'items_discussed', sortable: false },
  { title: 'Notes', key: 'visit_notes', sortable: false }
]

interface ReportData {
  totalReferrals: number
  totalRevenue: number
  totalVisits: number
  activePartners: number
  avgRevenuePerReferral: number
  avgReferralsPerPartner: number
  topClinics: { id: string; name: string; referrals: number; revenue: number; tier: string }[]
  partnersByTier: { tier: string; count: number; referrals: number; revenue: number }[]
  zoneBreakdown: { zone: string; count: number; referrals: number; revenue: number; visits: number }[]
  visitsList: any[]
}

const reportData = reactive<ReportData>({
  totalReferrals: 0,
  totalRevenue: 0,
  totalVisits: 0,
  activePartners: 0,
  avgRevenuePerReferral: 0,
  avgReferralsPerPartner: 0,
  topClinics: [],
  partnersByTier: [],
  zoneBreakdown: [],
  visitsList: []
})

function getTierChipColor(tier: string): string {
  const map: Record<string, string> = {
    Platinum: 'blue-grey', Gold: 'amber-darken-2', Silver: 'grey', Bronze: 'brown', Coal: 'grey-darken-3',
    platinum: 'blue-grey', gold: 'amber-darken-2', silver: 'grey', bronze: 'brown'
  }
  return map[tier] || 'grey'
}

function applyPreset(value: string) {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  dateTo.value = fmt(today)

  switch (value) {
    case 'last30':
      dateFrom.value = fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30))
      break
    case 'last90':
      dateFrom.value = fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 90))
      break
    case 'last6m':
      dateFrom.value = fmt(new Date(today.getFullYear(), today.getMonth() - 6, today.getDate()))
      break
    case 'last12m':
      dateFrom.value = fmt(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()))
      break
    case 'ytd':
      dateFrom.value = fmt(new Date(today.getFullYear(), 0, 1))
      break
    case 'all':
      dateFrom.value = '2020-01-01'
      break
    default:
      break
  }
}

/** Parse a transaction_date TEXT value (various CSV formats) into an ISO date string or null */
function parseTransactionDate(raw: string): string | null {
  if (!raw) return null
  const d = new Date(raw)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  // Try MM-DD-YYYY or MM/DD/YYYY
  const parts = raw.split(/[-\/]/)
  if (parts.length === 3) {
    const [m, day, y] = parts
    const d2 = new Date(`${y}-${m.padStart(2, '0')}-${day.padStart(2, '0')}`)
    if (!isNaN(d2.getTime())) return d2.toISOString().split('T')[0]
  }
  return null
}

async function generateReport() {
  if (!dateFrom.value || !dateTo.value) {
    applyPreset(preset.value)
  }

  loading.value = true
  hasData.value = false

  try {
    const allPartners = props.partners
    const partnerMap = new Map<string, any>()
    for (const p of allPartners) partnerMap.set(p.id, p)

    const from = dateFrom.value
    const to = dateTo.value

    // ── 1. Fetch ALL revenue line items from referral_revenue_line_items ──
    // transaction_date is TEXT so we can't do server-side date filtering;
    // fetch all and filter client-side by parsed date.
    const { data: rawLineItems, error: lineError } = await supabase
      .from('referral_revenue_line_items')
      .select('partner_id, transaction_date, amount')

    if (lineError) throw lineError

    // Parse dates and filter to the selected range
    const lineItems = (rawLineItems || [])
      .map(li => ({ ...li, isoDate: parseTransactionDate(li.transaction_date) }))
      .filter(li => li.isoDate && li.isoDate >= from && li.isoDate <= to)

    // ── 2. Aggregate referral data per partner ──
    const partnerAgg = new Map<string, { referrals: number; revenue: number }>()
    for (const li of lineItems) {
      if (!li.partner_id) continue
      const agg = partnerAgg.get(li.partner_id) || { referrals: 0, revenue: 0 }
      agg.referrals++
      agg.revenue += Number(li.amount) || 0
      partnerAgg.set(li.partner_id, agg)
    }

    // ── 3. Fetch clinic visits in the date range ──
    const { data: visits, error: visitError } = await supabase
      .from('clinic_visits')
      .select('*')
      .gte('visit_date', from)
      .lte('visit_date', to)
      .order('visit_date', { ascending: false })

    if (visitError) throw visitError
    const visitsList = visits || []

    // ── 4. Compute summary metrics ──
    const totalReferrals = lineItems.length
    const totalRevenue = lineItems.reduce((s, li) => s + (Number(li.amount) || 0), 0)
    const activePartnerIds = new Set(lineItems.map(li => li.partner_id).filter(Boolean))

    reportData.totalReferrals = totalReferrals
    reportData.totalRevenue = Math.round(totalRevenue * 100) / 100
    reportData.totalVisits = visitsList.length
    reportData.activePartners = activePartnerIds.size
    reportData.avgRevenuePerReferral = totalReferrals > 0 ? totalRevenue / totalReferrals : 0
    reportData.avgReferralsPerPartner = activePartnerIds.size > 0 ? totalReferrals / activePartnerIds.size : 0

    // ── 5. Top clinics by referrals in period ──
    reportData.topClinics = Array.from(partnerAgg.entries())
      .map(([pid, agg]) => {
        const p = partnerMap.get(pid)
        return {
          id: pid,
          name: p?.name || 'Unknown',
          referrals: agg.referrals,
          revenue: Math.round(agg.revenue * 100) / 100,
          tier: p?.tier || ''
        }
      })
      .sort((a, b) => b.referrals - a.referrals)
      .slice(0, 10)

    // ── 6. Group by tier ──
    const tierMap = new Map<string, { count: number; referrals: number; revenue: number }>()
    for (const [pid, agg] of partnerAgg) {
      const p = partnerMap.get(pid)
      const tier = p?.tier || 'Unset'
      const existing = tierMap.get(tier) || { count: 0, referrals: 0, revenue: 0 }
      existing.count++
      existing.referrals += agg.referrals
      existing.revenue += agg.revenue
      tierMap.set(tier, existing)
    }
    const tierOrder = ['Platinum', 'Gold', 'Silver', 'Bronze', 'Coal', 'Unset']
    reportData.partnersByTier = tierOrder
      .filter(t => tierMap.has(t))
      .map(t => ({ tier: t, ...tierMap.get(t)! }))

    // ── 7. Group by zone — referral data + visit counts ──
    const zoneMap = new Map<string, { count: number; referrals: number; revenue: number; visits: number }>()
    for (const [pid, agg] of partnerAgg) {
      const p = partnerMap.get(pid)
      const zone = p?.zone || 'Unassigned'
      const existing = zoneMap.get(zone) || { count: 0, referrals: 0, revenue: 0, visits: 0 }
      existing.count++
      existing.referrals += agg.referrals
      existing.revenue += agg.revenue
      zoneMap.set(zone, existing)
    }
    for (const v of visitsList) {
      const p = partnerMap.get(v.partner_id)
      const zone = p?.zone || 'Unassigned'
      const existing = zoneMap.get(zone) || { count: 0, referrals: 0, revenue: 0, visits: 0 }
      existing.visits++
      zoneMap.set(zone, existing)
    }
    reportData.zoneBreakdown = Array.from(zoneMap.entries())
      .map(([zone, data]) => ({ zone, ...data }))
      .sort((a, b) => b.revenue - a.revenue)

    // ── 8. Visit list for the table ──
    reportData.visitsList = visitsList

    hasData.value = true
  } catch (e: any) {
    console.error('Error generating report:', e)
  } finally {
    loading.value = false
  }
}

// Auto-apply default preset on mount
onMounted(() => {
  applyPreset('last30')
})
</script>
