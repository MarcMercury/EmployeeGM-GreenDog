<template>
  <div v-if="plan" class="bonus-plan-page">
    <!-- Breadcrumb header -->
    <div class="d-flex align-center mb-4">
      <v-btn icon="mdi-arrow-left" variant="text" to="/admin/bonus-calculators" />
      <div class="ml-2">
        <div class="text-caption text-grey">
          <NuxtLink to="/admin/bonus-calculators" class="text-decoration-none">Bonus Calculators</NuxtLink>
          / Configure
        </div>
        <h1 class="text-h5 font-weight-bold mb-0">
          {{ plan.employee_name }}
          <v-chip size="small" :color="typeColor" class="ml-2">{{ typeLabel }}</v-chip>
          <v-chip size="small" variant="outlined" class="ml-1">{{ plan.period_type }}</v-chip>
        </h1>
      </div>
      <v-spacer />
      <v-btn
        variant="outlined"
        prepend-icon="mdi-content-save"
        color="primary"
        :loading="saving"
        :disabled="!dirty"
        @click="save"
      >
        Save Changes
      </v-btn>
      <v-btn
        variant="text"
        color="error"
        prepend-icon="mdi-delete"
        class="ml-2"
        @click="confirmDelete"
      >
        Delete
      </v-btn>
    </div>

    <v-row>
      <!-- Left: General -->
      <v-col cols="12" md="5">
        <v-card rounded="lg" elevation="2" class="mb-4">
          <v-card-title>General</v-card-title>
          <v-card-text>
            <v-text-field
              v-model="draft.employee_name"
              label="Employee Name"
              variant="outlined"
              density="compact"
            />
            <v-textarea
              v-model="draft.description"
              label="Description"
              rows="3"
              variant="outlined"
              density="compact"
            />
            <v-select
              v-model="draft.period_type"
              :items="[
                { title:'Quarterly', value:'quarterly' },
                { title:'Semi-Annual', value:'semi_annual' },
                { title:'Annual', value:'annual' },
                { title:'Monthly', value:'monthly' },
              ]"
              label="Period Type"
              variant="outlined"
              density="compact"
            />
            <v-switch
              v-model="draft.active"
              label="Active"
              color="success"
              density="compact"
              hide-details
            />
          </v-card-text>
        </v-card>

        <!-- History for this plan -->
        <v-card rounded="lg" elevation="2">
          <v-card-title class="d-flex align-center">
            <v-icon start>mdi-history</v-icon>
            History
            <v-spacer />
            <span class="text-caption text-grey">{{ planRuns.length }} run(s)</span>
          </v-card-title>
          <v-card-text>
            <v-list v-if="planRuns.length" density="compact">
              <v-list-item
                v-for="run in planRuns"
                :key="run.id"
                :title="run.period_label"
                :subtitle="`$${fmt(run.total_bonus)} · ${run.status}`"
              >
                <template #append>
                  <v-chip :color="statusColor(run.status)" size="x-small">{{ run.status }}</v-chip>
                </template>
              </v-list-item>
            </v-list>
            <p v-else class="text-caption text-grey">No calculation runs yet.</p>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Right: Rules -->
      <v-col cols="12" md="7">
        <v-card rounded="lg" elevation="2">
          <v-card-title class="d-flex align-center">
            <v-icon start>mdi-cog-outline</v-icon>
            Rules &amp; Configuration
          </v-card-title>
          <v-card-text>
            <!-- PRODUCTION CATEGORIES -->
            <template v-if="draft.plan_type === 'production_categories'">
              <v-alert type="info" variant="tonal" density="compact" class="mb-3">
                Each category applies a % to qualifying invoice revenue. Match mode controls whether
                the employee must be the Staff Member, Case Owner, or either.
              </v-alert>
              <div class="mb-4">
                <div class="text-caption text-grey mb-1">Staff / Case Owner Aliases</div>
                <v-combobox
                  v-model="prodCfg.match_staff_aliases"
                  label="Name variants to match (e.g. 'Dr. Michael Geist', 'Geist')"
                  variant="outlined"
                  density="compact"
                  multiple
                  chips
                  closable-chips
                  hide-details
                />
              </div>
              <v-select
                v-model="prodCfg.revenue_field"
                :items="revenueFieldOptions"
                label="Revenue Source Column"
                variant="outlined"
                density="compact"
                class="mb-4"
              />

              <div class="d-flex align-center mb-2">
                <strong>Categories</strong>
                <v-spacer />
                <v-btn size="small" variant="tonal" prepend-icon="mdi-plus" @click="addCategory">
                  Add Category
                </v-btn>
              </div>

              <v-expansion-panels variant="accordion" multiple>
                <v-expansion-panel
                  v-for="(cat, idx) in prodCfg.categories"
                  :key="idx"
                >
                  <v-expansion-panel-title>
                    <span class="font-weight-medium">{{ cat.label || '(Unnamed)' }}</span>
                    <v-chip size="x-small" color="primary" class="ml-2">{{ (cat.rate * 100).toFixed(1) }}%</v-chip>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <v-row dense>
                      <v-col cols="12" sm="6">
                        <v-text-field v-model="cat.label" label="Label" variant="outlined" density="compact" />
                      </v-col>
                      <v-col cols="6" sm="3">
                        <v-text-field
                          v-model.number="cat.rate"
                          label="Rate (0.32 = 32%)"
                          type="number"
                          step="0.01"
                          variant="outlined"
                          density="compact"
                        />
                      </v-col>
                      <v-col cols="6" sm="3">
                        <v-text-field v-model="cat.key" label="Key" variant="outlined" density="compact" />
                      </v-col>
                      <v-col cols="12">
                        <v-select
                          v-model="cat.match_mode"
                          :items="matchModeOptions"
                          label="Match Mode"
                          variant="outlined"
                          density="compact"
                        />
                      </v-col>
                      <v-col cols="12">
                        <v-combobox
                          v-model="cat.product_groups"
                          label="Product Groups (match any)"
                          multiple chips closable-chips
                          variant="outlined" density="compact" hide-details
                        />
                      </v-col>
                      <v-col cols="12" class="mt-3">
                        <v-combobox
                          v-model="cat.exclude_contains"
                          label="Exclude product names containing…"
                          multiple chips closable-chips
                          variant="outlined" density="compact" hide-details
                        />
                      </v-col>
                      <v-col cols="12" class="mt-3">
                        <v-text-field v-model="cat.note" label="Note" variant="outlined" density="compact" />
                      </v-col>
                    </v-row>
                    <div class="text-right mt-2">
                      <v-btn color="error" variant="text" size="small" prepend-icon="mdi-delete" @click="removeCategory(idx)">
                        Remove
                      </v-btn>
                    </div>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </template>

            <!-- REVENUE ATTENDANCE -->
            <template v-else-if="draft.plan_type === 'revenue_attendance'">
              <v-row dense>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model.number="attCfg.base_bonus_amount"
                    label="Base Bonus Amount ($)"
                    type="number"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model.number="attCfg.min_revenue_threshold"
                    label="Min Revenue Threshold ($)"
                    type="number"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    v-model="attCfg.location_filter"
                    label="Location filter (e.g. 'Sherman Oaks')"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>
                <v-col cols="12">
                  <v-textarea
                    v-model="attCfg.payout_formula"
                    label="Payout Formula (documentation only)"
                    rows="2"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>
              </v-row>
              <v-alert type="info" density="compact" variant="tonal" class="mt-3">
                Payout = <code>base × (work_days − days_out) / work_days</code>, gated by the revenue threshold.
                Work days / days out are supplied when running the calculation.
              </v-alert>
            </template>

            <!-- REVENUE PERCENTAGE -->
            <template v-else-if="draft.plan_type === 'revenue_percentage'">
              <v-row dense>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model.number="revCfg.rate"
                    label="Rate (0.01 = 1%)"
                    type="number"
                    step="0.001"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-select
                    v-model="revCfg.revenue_field"
                    :items="revenueFieldOptions"
                    label="Revenue Column"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    v-model="revCfg.location_filter"
                    label="Location filter (optional)"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>
              </v-row>
            </template>

            <!-- THRESHOLD SURPLUS -->
            <template v-else-if="draft.plan_type === 'threshold_surplus'">
              <v-row dense>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model.number="threshCfg.baseline_per_period"
                    label="Baseline per Period ($)"
                    type="number"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model.number="threshCfg.rate_above_baseline"
                    label="Rate Above Baseline (0.10 = 10%)"
                    type="number"
                    step="0.01"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>
                <v-col cols="12">
                  <v-combobox
                    v-model="threshCfg.product_groups"
                    label="Product Groups"
                    multiple chips closable-chips
                    variant="outlined" density="compact"
                  />
                </v-col>
                <v-col cols="12">
                  <v-combobox
                    v-model="threshCfg.staff_aliases"
                    label="Staff Name Aliases"
                    multiple chips closable-chips
                    variant="outlined" density="compact"
                  />
                </v-col>
                <v-col cols="12">
                  <v-select
                    v-model="threshCfg.match_mode"
                    :items="matchModeOptions"
                    label="Match Mode"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>
              </v-row>
              <v-alert type="info" density="compact" variant="tonal" class="mt-3">
                Bonus = <code>max(0, revenue − baseline) × rate</code>.
              </v-alert>
            </template>
          </v-card-text>
        </v-card>

        <!-- Raw JSON fallback -->
        <v-card rounded="lg" variant="outlined" class="mt-4">
          <v-card-title class="text-body-2 text-grey-darken-1">
            <v-icon start size="16">mdi-code-json</v-icon>
            Raw Config (advanced)
          </v-card-title>
          <v-card-text>
            <v-textarea
              :model-value="jsonConfig"
              :rows="8"
              variant="outlined"
              density="compact"
              class="font-mono"
              readonly
            />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar v-model="snack.show" :color="snack.color" :timeout="3500" location="bottom right">
      {{ snack.msg }}
    </v-snackbar>
  </div>

  <div v-else-if="!loading" class="pa-12 text-center">
    <v-icon size="80" color="grey">mdi-alert-circle-outline</v-icon>
    <p class="text-h6 mt-4">Plan not found</p>
    <v-btn color="primary" to="/admin/bonus-calculators" class="mt-3">Back to list</v-btn>
  </div>

  <div v-else class="text-center py-12">
    <v-progress-circular indeterminate color="primary" size="56" />
  </div>
</template>

<script setup lang="ts">
import type {
  BonusPlan,
  BonusPlanType,
  BonusRunStatus,
  ProductionCategoriesConfig,
  ProductionCategoryRule,
  RevenueAttendanceConfig,
  RevenuePercentageConfig,
  ThresholdSurplusConfig,
} from '~/types/bonus'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin'],
})

const route = useRoute()
const router = useRouter()
const planId = computed(() => route.params.id as string)

const { plans, runs, loading, loadAll, savePlan, deletePlan, runsForPlan } = useBonusCalculators()
await loadAll()

const plan = computed<BonusPlan | null>(() => plans.value.find(p => p.id === planId.value) || null)
const planRuns = computed(() => runs.value.filter(r => r.plan_id === planId.value))

// ─── Editable draft ───────────────────────────────────────────────────────

const draft = reactive<{
  employee_name: string
  description: string
  period_type: string
  active: boolean
  plan_type: BonusPlanType
  config: any
}>({
  employee_name: '',
  description: '',
  period_type: 'quarterly',
  active: true,
  plan_type: 'production_categories',
  config: {},
})

watchEffect(() => {
  if (!plan.value) return
  // Deep clone to allow unsaved edits
  draft.employee_name = plan.value.employee_name
  draft.description = plan.value.description || ''
  draft.period_type = plan.value.period_type
  draft.active = plan.value.active
  draft.plan_type = plan.value.plan_type
  draft.config = JSON.parse(JSON.stringify(plan.value.config || {}))
})

// Type-narrowed config refs
const prodCfg    = computed<ProductionCategoriesConfig>(() => draft.config as ProductionCategoriesConfig)
const attCfg     = computed<RevenueAttendanceConfig>(()    => draft.config as RevenueAttendanceConfig)
const revCfg     = computed<RevenuePercentageConfig>(()    => draft.config as RevenuePercentageConfig)
const threshCfg  = computed<ThresholdSurplusConfig>(()     => draft.config as ThresholdSurplusConfig)

const jsonConfig = computed(() => JSON.stringify(draft.config, null, 2))

const dirty = computed(() => {
  if (!plan.value) return false
  return (
    draft.employee_name !== plan.value.employee_name ||
    draft.description !== (plan.value.description || '') ||
    draft.period_type !== plan.value.period_type ||
    draft.active !== plan.value.active ||
    JSON.stringify(draft.config) !== JSON.stringify(plan.value.config || {})
  )
})

// ─── Categories CRUD (production type) ───────────────────────────────────

function addCategory() {
  const next: ProductionCategoryRule = {
    key: 'new_' + Math.random().toString(36).slice(2, 6),
    label: 'New Category',
    rate: 0.20,
    match_mode: 'case_owner',
    product_groups: [],
  }
  if (!Array.isArray((draft.config as ProductionCategoriesConfig).categories)) {
    (draft.config as ProductionCategoriesConfig).categories = []
  }
  ;(draft.config as ProductionCategoriesConfig).categories.push(next)
}

function removeCategory(idx: number) {
  (draft.config as ProductionCategoriesConfig).categories.splice(idx, 1)
}

// ─── Actions ─────────────────────────────────────────────────────────────

const saving = ref(false)
async function save() {
  if (!plan.value) return
  saving.value = true
  try {
    await savePlan({
      id: plan.value.id,
      employee_name: draft.employee_name,
      description: draft.description,
      period_type: draft.period_type as any,
      active: draft.active,
      plan_type: plan.value.plan_type,
      config: draft.config,
    })
    notify('Plan saved')
  } catch (err: any) {
    notify('Save failed: ' + (err?.message || 'unknown'), 'error')
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  if (!plan.value) return
  if (!confirm(`Delete the bonus plan for ${plan.value.employee_name}? This will also delete all historical runs.`)) return
  try {
    await deletePlan(plan.value.id)
    await router.push('/admin/bonus-calculators')
  } catch (err: any) {
    notify('Delete failed: ' + (err?.message || 'unknown'), 'error')
  }
}

// ─── Helpers / static options ────────────────────────────────────────────

const matchModeOptions = [
  { title: 'All invoice revenue',                value: 'all_invoice_revenue' },
  { title: 'Staff Member matches employee',      value: 'staff_member' },
  { title: 'Case Owner matches employee',        value: 'case_owner' },
  { title: 'Staff Member OR Case Owner matches', value: 'staff_or_case_owner' },
  { title: 'Case Owner is employee, Staff is another DVM', value: 'case_owner_is_other_dvm' },
]

const revenueFieldOptions = [
  { title: 'Total Earned (incl)',       value: 'total_earned' },
  { title: 'Price After Discount (excl)', value: 'price_after_discount' },
  { title: 'Standard Price × Qty',       value: 'standard_price' },
]

const typeLabel = computed(() => {
  switch (draft.plan_type) {
    case 'production_categories': return 'Production Categories'
    case 'revenue_attendance':    return 'Revenue × Attendance'
    case 'revenue_percentage':    return 'Revenue Percentage'
    case 'threshold_surplus':     return 'Threshold Surplus'
  }
})
const typeColor = computed(() => {
  switch (draft.plan_type) {
    case 'production_categories': return 'deep-purple'
    case 'revenue_attendance':    return 'blue'
    case 'revenue_percentage':    return 'green'
    case 'threshold_surplus':     return 'orange'
  }
})

function fmt(n: number) {
  return (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function statusColor(s: BonusRunStatus) {
  return ({ draft: 'grey', approved: 'primary', paid: 'success', void: 'error' }[s] || 'grey')
}

const snack = reactive({ show: false, msg: '', color: 'success' })
function notify(msg: string, color: 'success' | 'error' | 'warning' = 'success') {
  snack.msg = msg; snack.color = color; snack.show = true
}
</script>

<style scoped>
.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
  font-size: 12px !important;
}
</style>
