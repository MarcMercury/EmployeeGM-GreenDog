<template>
  <div class="bonus-calculators-page">
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap ga-2">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">
          <v-icon icon="mdi-calculator-variant" size="32" color="primary" class="mr-2" />
          Bonus Calculators
        </h1>
        <p class="text-body-1 text-grey-darken-1 mb-0">
          Upload invoice data and auto-calculate quarterly / annual bonuses per employee agreement.
        </p>
      </div>
      <div class="d-flex ga-2 flex-wrap">
        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-cloud-upload"
          @click="showUpload = true"
        >
          Upload Invoice Data
        </v-btn>
        <v-btn
          color="secondary"
          variant="outlined"
          prepend-icon="mdi-plus"
          @click="showNewPlan = true"
        >
          New Plan
        </v-btn>
        <v-chip color="warning" variant="flat">
          <v-icon start>mdi-shield-crown</v-icon>
          Admin Only
        </v-chip>
      </div>
    </div>

    <!-- Loaded invoice banner -->
    <v-alert
      v-if="invoiceRows.length"
      type="success"
      variant="tonal"
      class="mb-4"
      closable
      @click:close="clearInvoices"
    >
      <div class="d-flex align-center flex-wrap ga-3">
        <div>
          <strong>{{ invoiceRows.length.toLocaleString() }}</strong> invoice line items loaded
          <span v-if="invoiceFileName"> from <strong>{{ invoiceFileName }}</strong></span>
          · date range <strong>{{ invoiceDateRange.start }}</strong> to <strong>{{ invoiceDateRange.end }}</strong>
          · total revenue <strong>${{ fmt(invoiceTotalRevenue) }}</strong>
        </div>
        <v-spacer />
        <v-btn size="small" variant="outlined" color="primary" @click="autoCalculateAll" :loading="autoCalculating">
          <v-icon start>mdi-flash</v-icon>
          Auto-Calculate All Plans
        </v-btn>
      </div>
    </v-alert>

    <!-- No data banner -->
    <v-alert v-else type="info" variant="tonal" class="mb-4">
      Upload an ezyVet <strong>invoice lines</strong> export (CSV/XLSX) to begin calculating bonuses.
      The system will parse the file and match each line to the applicable bonus rules.
    </v-alert>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="56" />
    </div>

    <template v-else>
      <!-- Bonus Summary Dashboard (recent runs, grouped by period) -->
      <v-card v-if="runs.length" class="mb-6" rounded="lg" elevation="2">
        <v-card-title class="d-flex align-center">
          <v-icon start color="success">mdi-chart-box</v-icon>
          Bonus Summary
          <v-spacer />
          <v-select
            v-model="summaryPeriodFilter"
            :items="availablePeriods"
            label="Period"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            style="max-width: 220px"
          />
        </v-card-title>
        <v-card-text>
          <v-table density="comfortable">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Period</th>
                <th class="text-right">Amount</th>
                <th>Status</th>
                <th>Notes</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="run in filteredRuns" :key="run.id">
                <td class="font-weight-medium">{{ planName(run.plan_id) }}</td>
                <td>{{ run.period_label }}</td>
                <td class="text-right font-weight-bold">
                  <span :class="run.total_bonus >= 0 ? 'text-success' : 'text-error'">
                    ${{ fmt(run.total_bonus) }}
                  </span>
                </td>
                <td>
                  <v-chip :color="statusColor(run.status)" size="x-small" variant="flat">{{ run.status }}</v-chip>
                </td>
                <td class="text-caption text-grey">{{ run.notes || '—' }}</td>
                <td class="text-right">
                  <v-btn size="small" variant="text" icon="mdi-eye" @click="viewRun(run)" />
                  <v-menu>
                    <template #activator="{ props }">
                      <v-btn v-bind="props" size="small" variant="text" icon="mdi-dots-vertical" />
                    </template>
                    <v-list density="compact">
                      <v-list-item @click="setStatus(run, 'approved')">
                        <template #prepend><v-icon>mdi-check</v-icon></template>
                        <v-list-item-title>Mark approved</v-list-item-title>
                      </v-list-item>
                      <v-list-item @click="setStatus(run, 'paid')">
                        <template #prepend><v-icon>mdi-cash</v-icon></template>
                        <v-list-item-title>Mark paid</v-list-item-title>
                      </v-list-item>
                      <v-list-item @click="setStatus(run, 'void')">
                        <template #prepend><v-icon>mdi-cancel</v-icon></template>
                        <v-list-item-title>Void</v-list-item-title>
                      </v-list-item>
                      <v-divider />
                      <v-list-item class="text-error" @click="deleteRunConfirm(run)">
                        <template #prepend><v-icon color="error">mdi-delete</v-icon></template>
                        <v-list-item-title>Delete</v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </td>
              </tr>
              <tr v-if="filteredRuns.length" class="bg-grey-lighten-4 font-weight-bold">
                <td colspan="2">Total</td>
                <td class="text-right">${{ fmt(filteredRunsTotal) }}</td>
                <td colspan="3"></td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
      </v-card>

      <!-- Plan cards -->
      <h2 class="text-h6 font-weight-bold mb-3">Bonus Plans</h2>
      <v-row>
        <v-col v-for="plan in plans" :key="plan.id" cols="12" md="6" lg="4">
          <v-card rounded="lg" elevation="2" :class="{ 'opacity-60': !plan.active }">
            <v-card-item>
              <template #prepend>
                <v-avatar :color="planTypeColor(plan.plan_type)" size="44">
                  <v-icon color="white">{{ planTypeIcon(plan.plan_type) }}</v-icon>
                </v-avatar>
              </template>
              <v-card-title>{{ plan.employee_name }}</v-card-title>
              <v-card-subtitle>
                {{ planTypeLabel(plan.plan_type) }} · {{ plan.period_type }}
              </v-card-subtitle>
            </v-card-item>
            <v-card-text class="pt-0">
              <p class="text-caption text-grey-darken-1 mb-3" style="min-height: 3em">
                {{ plan.description || 'No description' }}
              </p>
              <div v-if="lastRunForPlan(plan.id)" class="text-caption mb-2">
                <strong>Latest:</strong> {{ lastRunForPlan(plan.id)!.period_label }} —
                <span class="text-success font-weight-bold">
                  ${{ fmt(lastRunForPlan(plan.id)!.total_bonus) }}
                </span>
              </div>
              <div v-else class="text-caption text-grey mb-2">No runs yet</div>
            </v-card-text>
            <v-card-actions>
              <v-btn
                variant="tonal"
                color="primary"
                prepend-icon="mdi-flash"
                :disabled="!invoiceRows.length"
                @click="openCalcDialog(plan)"
              >
                Calculate
              </v-btn>
              <v-spacer />
              <v-btn
                variant="text"
                size="small"
                :to="`/admin/bonus-calculators/${plan.id}`"
                prepend-icon="mdi-cog"
              >
                Configure
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- Upload Dialog -->
    <v-dialog v-model="showUpload" max-width="620" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start>mdi-file-table</v-icon>Upload Invoice Data
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="showUpload = false" />
        </v-card-title>
        <v-card-text>
          <v-file-input
            v-model="uploadFile"
            accept=".csv,.xls,.xlsx,.tsv"
            label="Invoice lines export"
            prepend-icon="mdi-file-table"
            variant="outlined"
            density="compact"
            show-size
          />
          <p class="text-caption text-grey mt-1">
            Upload the ezyVet "Invoice Lines" export for the period you want to calculate.
            Accepted columns: Invoice #, Invoice Date, Department, Product Name, Product Group,
            Staff Member, Case Owner, Qty, Total Earned(incl).
          </p>
          <v-alert v-if="uploadError" type="error" density="compact" variant="tonal" class="mt-3">
            {{ uploadError }}
          </v-alert>
          <v-alert v-for="w in uploadWarnings" :key="w" type="warning" density="compact" variant="tonal" class="mt-2">
            {{ w }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showUpload = false">Cancel</v-btn>
          <v-btn color="primary" :loading="uploading" :disabled="!uploadFile" @click="handleUpload">
            Parse &amp; Load
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Calc Dialog (collects period + attendance inputs) -->
    <v-dialog v-model="calcDialog.show" max-width="600" persistent>
      <v-card v-if="calcDialog.plan">
        <v-card-title class="d-flex align-center">
          <v-icon start>mdi-flash</v-icon>
          Calculate Bonus — {{ calcDialog.plan.employee_name }}
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="calcDialog.show = false" />
        </v-card-title>
        <v-card-text>
          <v-row dense>
            <v-col cols="6">
              <v-select
                v-model="calcDialog.year"
                :items="yearOptions"
                label="Year"
                density="compact"
                variant="outlined"
                hide-details
              />
            </v-col>
            <v-col cols="6">
              <v-select
                v-if="calcDialog.plan.period_type === 'quarterly'"
                v-model="calcDialog.quarter"
                :items="[{title:'Q1',value:1},{title:'Q2',value:2},{title:'Q3',value:3},{title:'Q4',value:4}]"
                label="Quarter"
                density="compact"
                variant="outlined"
                hide-details
              />
              <v-select
                v-else-if="calcDialog.plan.period_type === 'semi_annual'"
                v-model="calcDialog.half"
                :items="[{title:'H1 (Jan–Jun)',value:1},{title:'H2 (Jul–Dec)',value:2}]"
                label="Half"
                density="compact"
                variant="outlined"
                hide-details
              />
              <v-text-field
                v-else
                :model-value="calcDialog.year"
                label="Full Year"
                disabled
                density="compact"
                variant="outlined"
                hide-details
              />
            </v-col>
          </v-row>

          <!-- Revenue/attendance inputs -->
          <template v-if="calcDialog.plan.plan_type === 'revenue_attendance'">
            <v-row dense class="mt-2">
              <v-col cols="6">
                <v-text-field
                  v-model.number="calcDialog.work_days"
                  label="Scheduled Work Days"
                  type="number"
                  density="compact"
                  variant="outlined"
                  hide-details
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model.number="calcDialog.days_out"
                  label="Days Out / Missed"
                  type="number"
                  density="compact"
                  variant="outlined"
                  hide-details
                />
              </v-col>
            </v-row>
          </template>

          <v-textarea
            v-model="calcDialog.notes"
            label="Notes (optional)"
            rows="2"
            density="compact"
            variant="outlined"
            class="mt-3"
            hide-details
          />

          <!-- Live Preview -->
          <v-divider class="my-4" />
          <div v-if="calcDialog.preview" class="bonus-preview">
            <div class="d-flex align-center justify-space-between mb-2">
              <strong class="text-subtitle-1">{{ calcDialog.preview.period_label }} Preview</strong>
              <span class="text-h5 text-success font-weight-bold">
                ${{ fmt(calcDialog.preview.total_bonus) }}
              </span>
            </div>
            <v-table density="compact">
              <thead>
                <tr>
                  <th>Category</th>
                  <th class="text-right">Rate</th>
                  <th class="text-right">Revenue</th>
                  <th class="text-right">Bonus</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in calcDialog.preview.categories" :key="c.key">
                  <td>{{ c.label }}</td>
                  <td class="text-right">{{ c.rate ? (c.rate * 100).toFixed(1) + '%' : '—' }}</td>
                  <td class="text-right">{{ c.revenue ? '$' + fmt(c.revenue) : '—' }}</td>
                  <td class="text-right font-weight-bold">${{ fmt(c.bonus) }}</td>
                </tr>
              </tbody>
            </v-table>
            <v-alert
              v-for="w in calcDialog.preview.warnings"
              :key="w"
              type="warning"
              density="compact"
              variant="tonal"
              class="mt-2"
            >{{ w }}</v-alert>
            <p class="text-caption text-grey mt-2">
              {{ calcDialog.preview.source_rows.toLocaleString() }} invoice lines considered.
            </p>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-btn variant="text" @click="calcDialog.show = false">Cancel</v-btn>
          <v-spacer />
          <v-btn
            color="primary"
            variant="flat"
            prepend-icon="mdi-content-save"
            :loading="calcDialog.saving"
            :disabled="!calcDialog.preview"
            @click="saveCalculation"
          >
            Save Run
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Run Viewer -->
    <v-dialog v-model="runViewer.show" max-width="900">
      <v-card v-if="runViewer.run">
        <v-card-title class="d-flex align-center">
          <v-icon start>mdi-eye</v-icon>
          {{ planName(runViewer.run.plan_id) }} — {{ runViewer.run.period_label }}
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="runViewer.show = false" />
        </v-card-title>
        <v-card-text>
          <div class="d-flex align-center justify-space-between mb-3">
            <div>
              <div class="text-caption text-grey">Total Revenue</div>
              <div class="text-h6">${{ fmt(runViewer.run.total_revenue) }}</div>
            </div>
            <div>
              <div class="text-caption text-grey">Source Rows</div>
              <div class="text-h6">{{ runViewer.run.source_rows.toLocaleString() }}</div>
            </div>
            <div class="text-right">
              <div class="text-caption text-grey">Total Bonus</div>
              <div class="text-h4 text-success font-weight-bold">
                ${{ fmt(runViewer.run.total_bonus) }}
              </div>
            </div>
          </div>
          <v-table density="comfortable">
            <thead>
              <tr>
                <th>Category</th>
                <th class="text-right">Rate</th>
                <th class="text-right">Revenue</th>
                <th class="text-right">Bonus</th>
                <th class="text-right">Rows</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in runViewer.run.breakdown.categories" :key="c.key">
                <td>
                  {{ c.label }}
                  <div v-if="c.note" class="text-caption text-grey">{{ c.note }}</div>
                </td>
                <td class="text-right">{{ c.rate ? (c.rate * 100).toFixed(2) + '%' : '—' }}</td>
                <td class="text-right">{{ c.revenue ? '$' + fmt(c.revenue) : '—' }}</td>
                <td class="text-right font-weight-bold">${{ fmt(c.bonus) }}</td>
                <td class="text-right">{{ c.row_count || '—' }}</td>
              </tr>
            </tbody>
          </v-table>
          <p v-if="runViewer.run.notes" class="text-caption text-grey mt-3">
            <strong>Notes:</strong> {{ runViewer.run.notes }}
          </p>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- New Plan dialog -->
    <v-dialog v-model="showNewPlan" max-width="520">
      <v-card>
        <v-card-title>New Bonus Plan</v-card-title>
        <v-card-text>
          <v-text-field v-model="newPlan.employee_name" label="Employee Name" variant="outlined" density="compact" />
          <v-select
            v-model="newPlan.plan_type"
            :items="planTypeOptions"
            label="Plan Type"
            variant="outlined"
            density="compact"
          />
          <v-select
            v-model="newPlan.period_type"
            :items="[
              { title:'Quarterly', value:'quarterly' },
              { title:'Semi-Annual', value:'semi_annual' },
              { title:'Annual', value:'annual' },
              { title:'Monthly', value:'monthly' },
            ]"
            label="Period"
            variant="outlined"
            density="compact"
          />
          <v-textarea
            v-model="newPlan.description"
            label="Description"
            rows="2"
            variant="outlined"
            density="compact"
          />
          <v-alert type="info" density="compact" variant="tonal">
            Configure the rate/category rules after creating the plan.
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showNewPlan = false">Cancel</v-btn>
          <v-btn color="primary" :loading="creatingPlan" @click="createPlan">Create</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snack.show" :color="snack.color" :timeout="3500" location="bottom right">
      {{ snack.msg }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import type {
  BonusPlan,
  BonusPlanType,
  BonusRunRecord,
  BonusRunStatus,
  BonusCalculationResult,
  InvoiceRow,
} from '~/types/bonus'
import { parseInvoiceFile } from '~/utils/invoiceParser'
import { calculateBonus, quarterToPeriod, semiAnnualToPeriod } from '~/utils/bonusCalculator'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin'],
})

const {
  plans, runs, loading, loadAll, saveRun, updateRunStatus, deleteRun, savePlan,
} = useBonusCalculators()

await loadAll()

// ─── Invoice data (client-side, in-memory) ───────────────────────────────

const invoiceRows = useState<InvoiceRow[]>('bonus-invoice-rows', () => [])
const invoiceFileName = useState<string>('bonus-invoice-filename', () => '')

const invoiceDateRange = computed(() => {
  if (!invoiceRows.value.length) return { start: '—', end: '—' }
  let min = invoiceRows.value[0]!.invoice_date
  let max = min
  for (const r of invoiceRows.value) {
    if (r.invoice_date < min) min = r.invoice_date
    if (r.invoice_date > max) max = r.invoice_date
  }
  return { start: min, end: max }
})

const invoiceTotalRevenue = computed(() =>
  invoiceRows.value.reduce((s, r) => s + r.total_earned, 0)
)

// ─── Upload ──────────────────────────────────────────────────────────────

const showUpload = ref(false)
const uploadFile = ref<File | null>(null)
const uploading = ref(false)
const uploadError = ref<string | null>(null)
const uploadWarnings = ref<string[]>([])

async function handleUpload() {
  if (!uploadFile.value) return
  uploading.value = true
  uploadError.value = null
  uploadWarnings.value = []
  try {
    const file = uploadFile.value as unknown as File
    const result = await parseInvoiceFile(file)
    if (!result.rows.length) {
      uploadError.value = 'No invoice rows parsed. Check the file format.'
      return
    }
    invoiceRows.value = result.rows
    invoiceFileName.value = file.name
    uploadWarnings.value = result.warnings
    notify(`Loaded ${result.rows.length.toLocaleString()} invoice rows`)
    showUpload.value = false
    uploadFile.value = null
  } catch (err: any) {
    uploadError.value = err?.message || 'Failed to parse file'
  } finally {
    uploading.value = false
  }
}

function clearInvoices() {
  invoiceRows.value = []
  invoiceFileName.value = ''
}

// ─── Summary filters ─────────────────────────────────────────────────────

const summaryPeriodFilter = ref<string | null>(null)
const availablePeriods = computed(() =>
  Array.from(new Set(runs.value.map(r => r.period_label))).sort().reverse()
)
const filteredRuns = computed(() =>
  summaryPeriodFilter.value
    ? runs.value.filter(r => r.period_label === summaryPeriodFilter.value)
    : runs.value.slice(0, 30)
)
const filteredRunsTotal = computed(() =>
  filteredRuns.value.reduce((s, r) => s + Number(r.total_bonus || 0), 0)
)

// ─── Calc dialog ─────────────────────────────────────────────────────────

const now = new Date()
const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

interface CalcDialogState {
  show: boolean
  plan: BonusPlan | null
  year: number
  quarter: 1 | 2 | 3 | 4
  half: 1 | 2
  work_days: number
  days_out: number
  notes: string
  preview: BonusCalculationResult | null
  saving: boolean
}

const calcDialog = reactive<CalcDialogState>({
  show: false,
  plan: null,
  year: now.getFullYear(),
  quarter: (Math.floor(now.getMonth() / 3) + 1) as 1 | 2 | 3 | 4,
  half: now.getMonth() < 6 ? 1 : 2,
  work_days: 66,
  days_out: 0,
  notes: '',
  preview: null,
  saving: false,
})

function openCalcDialog(plan: BonusPlan) {
  calcDialog.plan = plan
  calcDialog.notes = ''
  calcDialog.preview = null
  // Default attendance inputs from plan config if available
  const cfg = plan.config as any
  if (plan.plan_type === 'revenue_attendance' && cfg?.inputs) {
    calcDialog.work_days = cfg.inputs.find((i: any) => i.key === 'work_days')?.default ?? 66
    calcDialog.days_out = cfg.inputs.find((i: any) => i.key === 'days_out')?.default ?? 0
  }
  calcDialog.show = true
}

function computePreview() {
  if (!calcDialog.plan) return
  if (!invoiceRows.value.length) return
  const period = resolvePeriod(calcDialog.plan, calcDialog.year, calcDialog.quarter, calcDialog.half)
  calcDialog.preview = calculateBonus(calcDialog.plan, invoiceRows.value, {
    period_label: period.period_label,
    period_start: period.period_start,
    period_end: period.period_end,
    work_days: calcDialog.work_days,
    days_out: calcDialog.days_out,
    notes: calcDialog.notes,
    source_filename: invoiceFileName.value,
  })
}

watch(
  () => [calcDialog.show, calcDialog.year, calcDialog.quarter, calcDialog.half, calcDialog.work_days, calcDialog.days_out],
  () => { if (calcDialog.show) computePreview() },
  { immediate: false },
)

function resolvePeriod(plan: BonusPlan, year: number, quarter: 1|2|3|4, half: 1|2) {
  if (plan.period_type === 'quarterly') return quarterToPeriod(year, quarter)
  if (plan.period_type === 'semi_annual') return semiAnnualToPeriod(year, half)
  if (plan.period_type === 'annual') {
    return { period_label: `${year}`, period_start: `${year}-01-01`, period_end: `${year}-12-31` }
  }
  // monthly default — current month
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const last = new Date(year, now.getMonth() + 1, 0).getDate()
  return { period_label: `${year}-${m}`, period_start: `${year}-${m}-01`, period_end: `${year}-${m}-${last}` }
}

async function saveCalculation() {
  if (!calcDialog.plan || !calcDialog.preview) return
  calcDialog.saving = true
  try {
    await saveRun(calcDialog.plan, invoiceRows.value, {
      period_label: calcDialog.preview.period_label,
      period_start: calcDialog.preview.period_start,
      period_end: calcDialog.preview.period_end,
      work_days: calcDialog.work_days,
      days_out: calcDialog.days_out,
      notes: calcDialog.notes,
      source_filename: invoiceFileName.value,
    })
    notify(`Saved ${calcDialog.plan.employee_name} — ${calcDialog.preview.period_label}: $${fmt(calcDialog.preview.total_bonus)}`)
    calcDialog.show = false
  } catch (err: any) {
    notify('Failed to save: ' + (err?.message || 'unknown'), 'error')
  } finally {
    calcDialog.saving = false
  }
}

// ─── Auto-calculate all ──────────────────────────────────────────────────

const autoCalculating = ref(false)
async function autoCalculateAll() {
  if (!invoiceRows.value.length) return
  autoCalculating.value = true
  try {
    let count = 0
    let total = 0
    for (const plan of plans.value.filter(p => p.active)) {
      const period = resolvePeriod(plan, calcDialog.year, calcDialog.quarter, calcDialog.half)
      const inputs = {
        period_label: period.period_label,
        period_start: period.period_start,
        period_end: period.period_end,
        work_days: (plan.config as any)?.inputs?.find((i: any) => i.key === 'work_days')?.default,
        days_out: 0,
        source_filename: invoiceFileName.value,
        notes: 'Auto-calculated batch run',
      }
      const result = calculateBonus(plan, invoiceRows.value, inputs)
      await saveRun(plan, invoiceRows.value, inputs)
      total += result.total_bonus
      count++
    }
    notify(`Auto-calculated ${count} plans — total $${fmt(total)}`)
  } catch (err: any) {
    notify('Batch calculation failed: ' + (err?.message || 'unknown'), 'error')
  } finally {
    autoCalculating.value = false
  }
}

// ─── Run viewer & actions ────────────────────────────────────────────────

const runViewer = reactive<{ show: boolean; run: BonusRunRecord | null }>({ show: false, run: null })
function viewRun(run: BonusRunRecord) {
  runViewer.run = run
  runViewer.show = true
}

async function setStatus(run: BonusRunRecord, status: BonusRunStatus) {
  try {
    await updateRunStatus(run.id, status)
    notify(`Status updated to ${status}`)
  } catch (err: any) {
    notify('Failed: ' + (err?.message || 'unknown'), 'error')
  }
}

async function deleteRunConfirm(run: BonusRunRecord) {
  if (!confirm(`Delete ${planName(run.plan_id)} — ${run.period_label}?`)) return
  try {
    await deleteRun(run.id)
    notify('Run deleted')
  } catch (err: any) {
    notify('Failed: ' + (err?.message || 'unknown'), 'error')
  }
}

// ─── New plan ────────────────────────────────────────────────────────────

const planTypeOptions = [
  { title: 'Production Categories (Geist-style)', value: 'production_categories' },
  { title: 'Revenue × Attendance (Rally-style)',  value: 'revenue_attendance' },
  { title: 'Revenue Percentage (Marc / Cynthia)', value: 'revenue_percentage' },
  { title: 'Threshold Surplus (Robertson-style)', value: 'threshold_surplus' },
] as { title: string; value: BonusPlanType }[]

const showNewPlan = ref(false)
const creatingPlan = ref(false)
const newPlan = reactive({
  employee_name: '',
  plan_type: 'revenue_percentage' as BonusPlanType,
  period_type: 'quarterly',
  description: '',
})

async function createPlan() {
  if (!newPlan.employee_name) {
    notify('Employee name is required', 'error')
    return
  }
  creatingPlan.value = true
  try {
    const config = defaultConfigFor(newPlan.plan_type)
    const plan = await savePlan({
      employee_name: newPlan.employee_name,
      plan_type: newPlan.plan_type,
      period_type: newPlan.period_type as any,
      description: newPlan.description,
      config,
    })
    notify(`Plan created for ${plan.employee_name}`)
    showNewPlan.value = false
    newPlan.employee_name = ''
    newPlan.description = ''
    await navigateTo(`/admin/bonus-calculators/${plan.id}`)
  } catch (err: any) {
    notify('Failed to create plan: ' + (err?.message || 'unknown'), 'error')
  } finally {
    creatingPlan.value = false
  }
}

function defaultConfigFor(type: BonusPlanType): any {
  switch (type) {
    case 'production_categories':
      return { match_staff_aliases: [], revenue_field: 'total_earned', categories: [] }
    case 'revenue_attendance':
      return {
        base_bonus_amount: 8000,
        location_filter: null,
        min_revenue_threshold: 0,
        inputs: [
          { key: 'work_days', label: 'Scheduled Work Days', default: 66 },
          { key: 'days_out', label: 'Days Out', default: 0 },
        ],
      }
    case 'revenue_percentage':
      return { rate: 0.01, revenue_field: 'total_earned', location_filter: null }
    case 'threshold_surplus':
      return {
        baseline_per_period: 0, rate_above_baseline: 0.10,
        revenue_field: 'total_earned', product_groups: [], match_mode: 'staff_or_case_owner', staff_aliases: [],
      }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function fmt(n: number) {
  return (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function planName(planId: string) {
  return plans.value.find(p => p.id === planId)?.employee_name || 'Unknown'
}
function lastRunForPlan(planId: string) {
  return runs.value.find(r => r.plan_id === planId) || null
}
function planTypeColor(type: BonusPlanType): string {
  switch (type) {
    case 'production_categories': return 'deep-purple'
    case 'revenue_attendance':    return 'blue'
    case 'revenue_percentage':    return 'green'
    case 'threshold_surplus':     return 'orange'
  }
}
function planTypeIcon(type: BonusPlanType): string {
  switch (type) {
    case 'production_categories': return 'mdi-chart-timeline-variant'
    case 'revenue_attendance':    return 'mdi-calendar-check'
    case 'revenue_percentage':    return 'mdi-percent'
    case 'threshold_surplus':     return 'mdi-chart-bell-curve'
  }
}
function planTypeLabel(type: BonusPlanType): string {
  return planTypeOptions.find(o => o.value === type)?.title || type
}
function statusColor(s: BonusRunStatus): string {
  return ({ draft: 'grey', approved: 'primary', paid: 'success', void: 'error' }[s] || 'grey')
}

const snack = reactive({ show: false, msg: '', color: 'success' })
function notify(msg: string, color: 'success' | 'error' | 'warning' = 'success') {
  snack.msg = msg; snack.color = color; snack.show = true
}
</script>

<style scoped>
.bonus-calculators-page {
  padding: 0;
}
.bonus-preview :deep(th),
.bonus-preview :deep(td) {
  padding: 6px 10px !important;
  font-size: 12px !important;
}
</style>
