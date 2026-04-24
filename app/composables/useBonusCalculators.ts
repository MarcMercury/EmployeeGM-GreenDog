/**
 * useBonusCalculators
 *
 * Loads bonus_plans + bonus_runs from Supabase, persists new runs, and
 * exposes the calculator utilities to Vue components. The heavy lifting
 * (parsing + math) lives in `~/utils/invoiceParser` and
 * `~/utils/bonusCalculator`; this composable is a thin data layer.
 */
import { ref, computed } from 'vue'
import type {
  BonusPlan,
  BonusRunRecord,
  BonusRunStatus,
  InvoiceRow,
  BonusRunInputs,
} from '~/types/bonus'
import { calculateBonus } from '~/utils/bonusCalculator'

const _plans = ref<BonusPlan[]>([])
const _runs = ref<BonusRunRecord[]>([])
const _loaded = ref(false)
const _loading = ref(false)

export function useBonusCalculators() {
  const supabase = useSupabaseClient() as any

  async function loadAll(force = false) {
    if (_loaded.value && !force) return
    _loading.value = true
    try {
      const [{ data: plans, error: e1 }, { data: runs, error: e2 }] = await Promise.all([
        supabase.from('bonus_plans').select('*').order('employee_name'),
        supabase.from('bonus_runs').select('*').order('period_end', { ascending: false }),
      ])
      if (e1) throw e1
      if (e2) throw e2
      _plans.value = (plans || []) as BonusPlan[]
      _runs.value = (runs || []) as BonusRunRecord[]
      _loaded.value = true
    } finally {
      _loading.value = false
    }
  }

  async function savePlan(plan: Partial<BonusPlan> & { id?: string }): Promise<BonusPlan> {
    const payload = {
      employee_name: plan.employee_name,
      employee_id: plan.employee_id ?? null,
      plan_type: plan.plan_type,
      period_type: plan.period_type,
      config: plan.config,
      description: plan.description ?? null,
      active: plan.active ?? true,
    }
    const query = plan.id
      ? supabase.from('bonus_plans').update(payload).eq('id', plan.id).select().single()
      : supabase.from('bonus_plans').insert(payload).select().single()
    const { data, error } = await query
    if (error) throw error
    // refresh local cache
    const idx = _plans.value.findIndex(p => p.id === data.id)
    if (idx >= 0) _plans.value[idx] = data as BonusPlan
    else _plans.value.push(data as BonusPlan)
    return data as BonusPlan
  }

  async function deletePlan(id: string) {
    const { error } = await supabase.from('bonus_plans').delete().eq('id', id)
    if (error) throw error
    _plans.value = _plans.value.filter(p => p.id !== id)
  }

  async function saveRun(
    plan: BonusPlan,
    rows: InvoiceRow[],
    inputs: BonusRunInputs,
  ): Promise<BonusRunRecord> {
    const result = calculateBonus(plan, rows, inputs)
    const payload = {
      plan_id: plan.id,
      period_label: inputs.period_label,
      period_start: inputs.period_start,
      period_end: inputs.period_end,
      total_bonus: result.total_bonus,
      total_revenue: result.total_revenue,
      breakdown: result,
      source_rows: result.source_rows,
      source_filename: inputs.source_filename ?? null,
      notes: inputs.notes ?? null,
      status: 'draft' as BonusRunStatus,
    }
    const { data, error } = await supabase.from('bonus_runs').insert(payload).select().single()
    if (error) throw error
    _runs.value.unshift(data as BonusRunRecord)
    return data as BonusRunRecord
  }

  async function updateRunStatus(id: string, status: BonusRunStatus) {
    const { data, error } = await supabase
      .from('bonus_runs').update({ status }).eq('id', id).select().single()
    if (error) throw error
    const idx = _runs.value.findIndex(r => r.id === id)
    if (idx >= 0) _runs.value[idx] = data as BonusRunRecord
    return data as BonusRunRecord
  }

  async function deleteRun(id: string) {
    const { error } = await supabase.from('bonus_runs').delete().eq('id', id)
    if (error) throw error
    _runs.value = _runs.value.filter(r => r.id !== id)
  }

  const plans    = computed(() => _plans.value)
  const activePlans = computed(() => _plans.value.filter(p => p.active))
  const runs     = computed(() => _runs.value)
  const loading  = computed(() => _loading.value)
  const loaded   = computed(() => _loaded.value)

  function runsForPlan(planId: string) {
    return computed(() => _runs.value.filter(r => r.plan_id === planId))
  }

  return {
    plans, activePlans, runs, loading, loaded,
    loadAll, savePlan, deletePlan, saveRun, updateRunStatus, deleteRun, runsForPlan,
    calculate: calculateBonus,
  }
}
