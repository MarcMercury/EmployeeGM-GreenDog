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
 * **7th consecutive day rules (Cal. Lab. Code § 510)**
 *  - When `weekStartDate` is provided and all 7 days have hours,
 *    the 7th day's first 8 h → 1.5× (overtime) and beyond 8 h → 2× (double-time).
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

  /**
   * ISO date string for the week start day (e.g. "2026-03-29" for Sunday).
   * When provided alongside `dailyHours` keyed by date, the calculator will
   * detect if the employee worked 7 consecutive days in the workweek and
   * apply CA Labor Code § 510 7th-day premium rules:
   *   - First 8 hours on 7th day → 1.5× (overtime)
   *   - Hours beyond 8 on 7th day → 2× (double-time)
   */
  weekStartDate?: string
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

  // --- Detect 7th consecutive workday if weekStartDate is provided ----------
  let seventhDayDate: string | null = null

  if (options?.weekStartDate) {
    // Build array of 7 dates in the workweek
    const weekStart = new Date(options.weekStartDate + 'T00:00:00')
    const weekDates: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      weekDates.push(d.toISOString().split('T')[0])
    }

    // Check if all 7 days have hours worked
    const workedDays = weekDates.filter(d => (dailyHours[d] ?? 0) > 0)
    if (workedDays.length === 7) {
      // 7th consecutive day is the last day of the workweek
      seventhDayDate = weekDates[6]
    }
  }

  // --- Step 1: daily split --------------------------------------------------
  for (const [date, hours] of Object.entries(dailyHours)) {
    if (date === seventhDayDate) {
      // CA Labor Code § 510: 7th consecutive workday
      // First 8 hours at 1.5×, hours beyond 8 at 2×
      if (hours <= 8) {
        overtime += hours
      } else {
        overtime += 8
        doubleTime += hours - 8
      }
    } else {
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
