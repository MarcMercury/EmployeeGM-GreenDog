/**
 * Bonus Calculator — types
 *
 * Shared types for the Admin Ops → Bonus Calculators feature.
 *
 * Each employee's bonus agreement is stored in `bonus_plans` with a plan_type
 * that tells the engine which config shape + algorithm to use.
 */

export type BonusPlanType =
  | 'production_categories'
  | 'revenue_attendance'
  | 'revenue_percentage'
  | 'threshold_surplus'

export type BonusPeriodType = 'quarterly' | 'semi_annual' | 'annual' | 'monthly'

export type BonusRunStatus = 'draft' | 'approved' | 'paid' | 'void'

/** Match mode — how a rule identifies rows attributable to the employee */
export type BonusMatchMode =
  | 'all_invoice_revenue'
  | 'staff_member'
  | 'case_owner'
  | 'staff_or_case_owner'
  | 'case_owner_is_other_dvm'

/** A single category rule inside a production_categories config */
export interface ProductionCategoryRule {
  key: string
  label: string
  rate: number            // 0.32 = 32%
  match_mode: BonusMatchMode
  product_groups?: string[]
  exclude_contains?: string[]
  note?: string
}

export interface ProductionCategoriesConfig {
  match_staff_aliases: string[]
  revenue_field?: 'total_earned' | 'price_after_discount' | 'standard_price'
  categories: ProductionCategoryRule[]
}

export interface RevenueAttendanceConfig {
  base_bonus_amount: number
  location_filter?: string | null
  min_revenue_threshold?: number
  payout_formula?: string
  inputs?: { key: string; label: string; default: number }[]
}

export interface RevenuePercentageConfig {
  rate: number
  revenue_field?: 'total_earned' | 'price_after_discount' | 'standard_price'
  location_filter?: string | null
  match_staff_aliases?: string[]
}

export interface ThresholdSurplusConfig {
  baseline_per_period: number
  rate_above_baseline: number
  revenue_field?: 'total_earned' | 'price_after_discount' | 'standard_price'
  product_groups?: string[]
  match_mode?: BonusMatchMode
  staff_aliases?: string[]
}

export type BonusPlanConfig =
  | ProductionCategoriesConfig
  | RevenueAttendanceConfig
  | RevenuePercentageConfig
  | ThresholdSurplusConfig

export interface BonusPlan {
  id: string
  employee_name: string
  employee_id: string | null
  plan_type: BonusPlanType
  period_type: BonusPeriodType
  config: BonusPlanConfig
  description: string | null
  active: boolean
  created_at: string
  updated_at: string
}

/** Normalized invoice row — the shared input shape across all calculators */
export interface InvoiceRow {
  invoice_no: string | number
  invoice_date: string        // ISO yyyy-mm-dd
  department: string
  business_name?: string
  pet_name?: string
  species?: string
  breed?: string
  product_name: string
  product_group: string
  staff_member: string
  case_owner: string
  qty: number
  standard_price: number
  price_after_discount: number
  total_earned: number
}

/** Per-category breakdown line */
export interface BonusCategoryResult {
  key: string
  label: string
  rate: number
  revenue: number
  bonus: number
  row_count: number
  note?: string
}

/** Return of a single calculation run */
export interface BonusCalculationResult {
  plan_id: string
  plan_type: BonusPlanType
  employee_name: string
  period_label: string
  period_start: string
  period_end: string
  total_revenue: number
  total_bonus: number
  source_rows: number
  categories: BonusCategoryResult[]
  /** Extra computed metrics specific to plan_type (attendance %, threshold diff, etc.) */
  extras?: Record<string, unknown>
  warnings?: string[]
}

export interface BonusRunRecord {
  id: string
  plan_id: string
  period_label: string
  period_start: string
  period_end: string
  total_bonus: number
  total_revenue: number
  breakdown: BonusCalculationResult
  source_rows: number
  source_filename: string | null
  notes: string | null
  status: BonusRunStatus
  calculated_at: string
  calculated_by: string | null
}

/** Inputs provided by the user at calculation time (not stored in plan config) */
export interface BonusRunInputs {
  period_label: string
  period_start: string
  period_end: string
  /** For revenue_attendance — user provides work_days + days_out */
  work_days?: number
  days_out?: number
  notes?: string
  source_filename?: string
}
