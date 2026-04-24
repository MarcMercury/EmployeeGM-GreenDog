/**
 * Bonus Calculator Engine
 *
 * Pure, deterministic functions that take a `BonusPlan` + normalized
 * `InvoiceRow[]` + run inputs and return a `BonusCalculationResult`.
 *
 * Four plan types are supported:
 *   • production_categories  — categorised % of revenue (e.g. Dr. Geist)
 *   • revenue_attendance     — flat bonus × % shifts worked (e.g. Rally)
 *   • revenue_percentage     — flat % of net revenue (e.g. Marc, Cynthia)
 *   • threshold_surplus      — % of revenue above a baseline (e.g. Robertson)
 */
import type {
  BonusPlan,
  BonusCalculationResult,
  BonusCategoryResult,
  BonusRunInputs,
  InvoiceRow,
  ProductionCategoriesConfig,
  ProductionCategoryRule,
  RevenueAttendanceConfig,
  RevenuePercentageConfig,
  ThresholdSurplusConfig,
} from '~/types/bonus'

// ─── shared helpers ──────────────────────────────────────────────────────

const round2 = (n: number) => Math.round(n * 100) / 100

function revenueOf(row: InvoiceRow, field: string | undefined): number {
  switch (field) {
    case 'standard_price':       return row.standard_price * (row.qty || 1)
    case 'price_after_discount': return row.price_after_discount
    case 'total_earned':
    default:                     return row.total_earned
  }
}

function inPeriod(row: InvoiceRow, start: string, end: string): boolean {
  return row.invoice_date >= start && row.invoice_date <= end
}

function matchesAlias(name: string, aliases: string[] = []): boolean {
  if (!name) return false
  const n = name.toLowerCase()
  return aliases.some(a => n.includes(a.toLowerCase()))
}

function matchesGroup(productGroup: string, groups: string[] | undefined): boolean {
  if (!groups || groups.length === 0) return true
  const pg = productGroup.toLowerCase()
  return groups.some(g => {
    const gl = g.toLowerCase()
    // strip leading asterisk for comparison (ezyVet uses "*Services" etc.)
    return pg === gl || pg === gl.replace(/^\*/, '') || pg.replace(/^\*/, '') === gl.replace(/^\*/, '')
  })
}

function containsAny(s: string, needles: string[] | undefined): boolean {
  if (!needles?.length) return false
  const l = s.toLowerCase()
  return needles.some(n => l.includes(n.toLowerCase()))
}

function ruleMatches(row: InvoiceRow, rule: ProductionCategoryRule, aliases: string[]): boolean {
  if (rule.match_mode === 'all_invoice_revenue') return true

  const isStaff = matchesAlias(row.staff_member, aliases)
  const isOwner = matchesAlias(row.case_owner, aliases)

  switch (rule.match_mode) {
    case 'staff_member':               if (!isStaff) return false; break
    case 'case_owner':                 if (!isOwner) return false; break
    case 'staff_or_case_owner':        if (!isStaff && !isOwner) return false; break
    case 'case_owner_is_other_dvm': {
      // Case owner is Geist (or alias) but staff_member is a DIFFERENT doctor
      if (!isOwner) return false
      const staffIsSelf = matchesAlias(row.staff_member, aliases)
      if (staffIsSelf) return false
      // should be billed by some doctor (heuristic: "Dr." prefix)
      if (!/^dr\b|doctor|dvm/i.test(row.staff_member)) return false
      break
    }
  }

  if (!matchesGroup(row.product_group, rule.product_groups)) return false
  if (containsAny(row.product_name, rule.exclude_contains)) return false
  return true
}

// ─── plan-type calculators ───────────────────────────────────────────────

function calcProductionCategories(
  plan: BonusPlan,
  rows: InvoiceRow[],
  inputs: BonusRunInputs,
): BonusCalculationResult {
  const cfg = plan.config as ProductionCategoriesConfig
  const aliases = cfg.match_staff_aliases || []
  const field = cfg.revenue_field

  const periodRows = rows.filter(r => inPeriod(r, inputs.period_start, inputs.period_end))

  // Total invoice revenue attributable to this employee (any match) — drives
  // the annual 1% net line and the "Revenue" column total on the summary.
  let totalAttributableRevenue = 0
  for (const r of periodRows) {
    if (matchesAlias(r.staff_member, aliases) || matchesAlias(r.case_owner, aliases)) {
      totalAttributableRevenue += revenueOf(r, field)
    }
  }

  const categories: BonusCategoryResult[] = []
  let totalBonus = 0

  for (const rule of cfg.categories) {
    let revenue = 0
    let count = 0

    if (rule.match_mode === 'all_invoice_revenue') {
      revenue = totalAttributableRevenue
      count = periodRows.filter(r =>
        matchesAlias(r.staff_member, aliases) || matchesAlias(r.case_owner, aliases)
      ).length
    } else {
      for (const r of periodRows) {
        if (ruleMatches(r, rule, aliases)) {
          revenue += revenueOf(r, field)
          count++
        }
      }
    }

    const bonus = revenue * rule.rate
    totalBonus += bonus

    categories.push({
      key: rule.key,
      label: rule.label,
      rate: rule.rate,
      revenue: round2(revenue),
      bonus: round2(bonus),
      row_count: count,
      note: rule.note,
    })
  }

  return {
    plan_id: plan.id,
    plan_type: plan.plan_type,
    employee_name: plan.employee_name,
    period_label: inputs.period_label,
    period_start: inputs.period_start,
    period_end: inputs.period_end,
    total_revenue: round2(totalAttributableRevenue),
    total_bonus: round2(totalBonus),
    source_rows: periodRows.length,
    categories,
  }
}

function calcRevenueAttendance(
  plan: BonusPlan,
  rows: InvoiceRow[],
  inputs: BonusRunInputs,
): BonusCalculationResult {
  const cfg = plan.config as RevenueAttendanceConfig
  const periodRows = rows.filter(r => inPeriod(r, inputs.period_start, inputs.period_end))
  const locationFiltered = cfg.location_filter
    ? periodRows.filter(r =>
        (r.business_name || r.department).toLowerCase().includes(cfg.location_filter!.toLowerCase())
      )
    : periodRows

  const revenue = locationFiltered.reduce((s, r) => s + r.total_earned, 0)

  const workDays = inputs.work_days ?? cfg.inputs?.find(i => i.key === 'work_days')?.default ?? 0
  const daysOut = inputs.days_out ?? cfg.inputs?.find(i => i.key === 'days_out')?.default ?? 0
  const base = cfg.base_bonus_amount || 0
  const threshold = cfg.min_revenue_threshold ?? 0

  const pctWorked = workDays > 0 ? Math.max(0, (workDays - daysOut) / workDays) : 0
  const meetsThreshold = revenue >= threshold
  const bonus = meetsThreshold ? base * pctWorked : 0

  const warnings: string[] = []
  if (!meetsThreshold && threshold > 0) {
    warnings.push(
      `Revenue $${revenue.toFixed(0)} is below the $${threshold.toFixed(0)} threshold — bonus is $0.`
    )
  }
  if (workDays <= 0) warnings.push('Work Days not provided — payout cannot be scaled by attendance.')

  const categories: BonusCategoryResult[] = [
    {
      key: 'revenue',
      label: cfg.location_filter ? `Revenue (${cfg.location_filter})` : 'Revenue',
      rate: 0,
      revenue: round2(revenue),
      bonus: 0,
      row_count: locationFiltered.length,
    },
    {
      key: 'base_bonus',
      label: 'Base Bonus Amount',
      rate: 0,
      revenue: 0,
      bonus: round2(base),
      row_count: 0,
    },
    {
      key: 'attendance',
      label: `Attendance: ${workDays - daysOut}/${workDays} shifts worked`,
      rate: pctWorked,
      revenue: 0,
      bonus: round2(base * pctWorked),
      row_count: 0,
      note: `${(pctWorked * 100).toFixed(2)}% of scheduled shifts`,
    },
  ]

  return {
    plan_id: plan.id,
    plan_type: plan.plan_type,
    employee_name: plan.employee_name,
    period_label: inputs.period_label,
    period_start: inputs.period_start,
    period_end: inputs.period_end,
    total_revenue: round2(revenue),
    total_bonus: round2(bonus),
    source_rows: locationFiltered.length,
    categories,
    extras: {
      work_days: workDays,
      days_out: daysOut,
      pct_worked: round2(pctWorked),
      base_bonus_amount: base,
      meets_threshold: meetsThreshold,
      threshold,
    },
    warnings,
  }
}

function calcRevenuePercentage(
  plan: BonusPlan,
  rows: InvoiceRow[],
  inputs: BonusRunInputs,
): BonusCalculationResult {
  const cfg = plan.config as RevenuePercentageConfig
  const field = cfg.revenue_field
  const periodRows = rows.filter(r => inPeriod(r, inputs.period_start, inputs.period_end))
  const locationFiltered = cfg.location_filter
    ? periodRows.filter(r =>
        (r.business_name || r.department).toLowerCase().includes(cfg.location_filter!.toLowerCase())
      )
    : periodRows

  const revenue = locationFiltered.reduce((s, r) => s + revenueOf(r, field), 0)
  const bonus = revenue * cfg.rate

  return {
    plan_id: plan.id,
    plan_type: plan.plan_type,
    employee_name: plan.employee_name,
    period_label: inputs.period_label,
    period_start: inputs.period_start,
    period_end: inputs.period_end,
    total_revenue: round2(revenue),
    total_bonus: round2(bonus),
    source_rows: locationFiltered.length,
    categories: [{
      key: 'net_revenue',
      label: `Net Revenue × ${(cfg.rate * 100).toFixed(2)}%`,
      rate: cfg.rate,
      revenue: round2(revenue),
      bonus: round2(bonus),
      row_count: locationFiltered.length,
    }],
  }
}

function calcThresholdSurplus(
  plan: BonusPlan,
  rows: InvoiceRow[],
  inputs: BonusRunInputs,
): BonusCalculationResult {
  const cfg = plan.config as ThresholdSurplusConfig
  const aliases = cfg.staff_aliases || []
  const field = cfg.revenue_field
  const periodRows = rows.filter(r => inPeriod(r, inputs.period_start, inputs.period_end))

  let revenue = 0
  let count = 0
  for (const r of periodRows) {
    if (!matchesGroup(r.product_group, cfg.product_groups)) continue
    if (aliases.length > 0) {
      const staffOk = matchesAlias(r.staff_member, aliases)
      const ownerOk = matchesAlias(r.case_owner, aliases)
      const mode = cfg.match_mode || 'staff_or_case_owner'
      if (mode === 'staff_member' && !staffOk) continue
      if (mode === 'case_owner' && !ownerOk) continue
      if (mode === 'staff_or_case_owner' && !staffOk && !ownerOk) continue
    }
    revenue += revenueOf(r, field)
    count++
  }

  const baseline = cfg.baseline_per_period || 0
  const surplus = Math.max(0, revenue - baseline)
  const bonus = surplus * (cfg.rate_above_baseline || 0)
  const warnings: string[] = []
  if (revenue < baseline) {
    warnings.push(`Revenue $${revenue.toFixed(0)} is below baseline $${baseline.toFixed(0)} — no bonus.`)
  }

  return {
    plan_id: plan.id,
    plan_type: plan.plan_type,
    employee_name: plan.employee_name,
    period_label: inputs.period_label,
    period_start: inputs.period_start,
    period_end: inputs.period_end,
    total_revenue: round2(revenue),
    total_bonus: round2(bonus),
    source_rows: count,
    categories: [
      { key: 'revenue',  label: 'Qualifying Revenue', rate: 0,                         revenue: round2(revenue),  bonus: 0,                row_count: count },
      { key: 'baseline', label: 'Baseline Minimum',    rate: 0,                         revenue: round2(baseline), bonus: 0,                row_count: 0 },
      { key: 'surplus',  label: 'Surplus × Rate',      rate: cfg.rate_above_baseline || 0, revenue: round2(surplus),  bonus: round2(bonus), row_count: 0 },
    ],
    extras: { baseline, surplus: round2(surplus), rate: cfg.rate_above_baseline },
    warnings,
  }
}

// ─── public entry point ──────────────────────────────────────────────────

export function calculateBonus(
  plan: BonusPlan,
  rows: InvoiceRow[],
  inputs: BonusRunInputs,
): BonusCalculationResult {
  switch (plan.plan_type) {
    case 'production_categories': return calcProductionCategories(plan, rows, inputs)
    case 'revenue_attendance':    return calcRevenueAttendance(plan, rows, inputs)
    case 'revenue_percentage':    return calcRevenuePercentage(plan, rows, inputs)
    case 'threshold_surplus':     return calcThresholdSurplus(plan, rows, inputs)
    default: {
      const never: never = plan.plan_type
      throw new Error(`Unsupported bonus plan type: ${never}`)
    }
  }
}

/** Convenience: generate a period label + dates from a quarter picker */
export function quarterToPeriod(year: number, quarter: 1 | 2 | 3 | 4): {
  period_label: string; period_start: string; period_end: string
} {
  const startMonth = (quarter - 1) * 3 + 1
  const endMonth = startMonth + 2
  const lastDay = new Date(year, endMonth, 0).getDate()
  return {
    period_label: `Q${quarter} ${year}`,
    period_start: `${year}-${String(startMonth).padStart(2, '0')}-01`,
    period_end:   `${year}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  }
}

export function semiAnnualToPeriod(year: number, half: 1 | 2): {
  period_label: string; period_start: string; period_end: string
} {
  return half === 1
    ? { period_label: `H1 ${year}`, period_start: `${year}-01-01`, period_end: `${year}-06-30` }
    : { period_label: `H2 ${year}`, period_start: `${year}-07-01`, period_end: `${year}-12-31` }
}
