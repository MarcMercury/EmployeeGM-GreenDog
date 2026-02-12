/**
 * California Overtime Calculation Utility
 *
 * Implements California Labor Code overtime rules per STAFFING_BENCHMARKS in
 * ~/utils/vetBenchmarks.ts (sourced from CA Labor Code § 510):
 *
 * **Daily overtime (Cal. Lab. Code § 510)**
 *  - Hours 1–8 in a workday → regular rate
 *  - Hours 8–12 in a workday → 1.5× (overtime)
 *  - Hours 12+ in a workday  → 2× (double-time)
 *
 * **Weekly overtime (Cal. Lab. Code § 510)**
 *  - Hours beyond 40 in a workweek → 1.5× (applied after daily split)
 *
 * **7th consecutive day rules** are NOT yet implemented (requires
 * tracking consecutive workdays, which depends on schedule context).
 *
 * CA-specific note: SB 525 sets healthcare worker minimum wage at $25/hr.
 * Ensure all vet staff hourly rates comply with this floor.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Per-day hours keyed by ISO date string (e.g. "2026-02-09"). */
export type DailyHoursMap = Record<string, number>

/** Options that may be extended in the future (e.g. 7th-day flag). */
export interface OTOptions {
  /**
   * Weekly regular-hour cap before weekly OT kicks in.
   * @default 40
   */
  weeklyRegularCap?: number
}

/** Breakdown returned by the calculator. All values are rounded to two decimals. */
export interface OTResult {
  /** Hours paid at the regular rate. */
  regular: number
  /** Hours paid at 1.5× (daily > 8 h or weekly > 40 h). */
  overtime: number
  /** Hours paid at 2× (daily > 12 h). */
  doubleTime: number
  /** Sum of regular + overtime + doubleTime. */
  total: number
}

// ---------------------------------------------------------------------------
// Core calculation
// ---------------------------------------------------------------------------

/**
 * Calculate California overtime from a map of daily worked hours.
 *
 * @param dailyHours - Object keyed by date string whose values are the total
 *   hours worked that day (may span multiple punches aggregated beforehand).
 * @param options - Optional overrides (e.g. custom weekly cap).
 * @returns An {@link OTResult} with the hour breakdown.
 *
 * @example
 * ```ts
 * const result = calculateCaliforniaOT({
 *   '2026-02-02': 10,   // 8 regular + 2 OT
 *   '2026-02-03': 13,   // 8 regular + 4 OT + 1 DT
 *   '2026-02-04': 7,
 *   '2026-02-05': 8,
 *   '2026-02-06': 8,
 * })
 * // result → { regular: 31, overtime: 6, doubleTime: 1, total: 38 }
 * ```
 */
export function calculateCaliforniaOT(
  dailyHours: DailyHoursMap,
  options?: OTOptions,
): OTResult {
  const weeklyRegularCap = options?.weeklyRegularCap ?? 40

  let regular = 0
  let overtime = 0
  let doubleTime = 0

  // --- Step 1: daily split --------------------------------------------------
  for (const hours of Object.values(dailyHours)) {
    if (hours <= 8) {
      regular += hours
    } else if (hours <= 12) {
      regular += 8
      overtime += hours - 8
    } else {
      regular += 8
      overtime += 4 // hours 8–12
      doubleTime += hours - 12
    }
  }

  // --- Step 2: weekly cap – excess regular becomes overtime ------------------
  if (regular > weeklyRegularCap) {
    overtime += regular - weeklyRegularCap
    regular = weeklyRegularCap
  }

  // --- Round to two decimal places ------------------------------------------
  return {
    regular: Math.round(regular * 100) / 100,
    overtime: Math.round(overtime * 100) / 100,
    doubleTime: Math.round(doubleTime * 100) / 100,
    total: Math.round((regular + overtime + doubleTime) * 100) / 100,
  }
}
