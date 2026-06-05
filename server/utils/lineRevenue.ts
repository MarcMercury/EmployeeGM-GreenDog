/**
 * Parse a possibly-formatted monetary value into a number.
 *
 * Defensively strips currency symbols ($), thousands separators (,) and
 * surrounding whitespace, and converts accounting-style negatives
 * "(123.45)" → -123.45. This mirrors the upload parser so any legacy or
 * unnormalised rows are read accurately.
 *
 * Returns `null` when the value is absent or unparseable — this is the
 * SQL-NULL signal that lets lineRevenue() coalesce correctly.
 */
function parseMoney(val: string | number | null | undefined): number | null {
  if (val == null || val === '') return null
  if (typeof val === 'number') return Number.isNaN(val) ? null : val
  const cleaned = String(val).trim().replace(/[$,\s]/g, '').replace(/^\(([^)]+)\)$/, '-$1')
  if (cleaned === '') return null
  const n = parseFloat(cleaned)
  return Number.isNaN(n) ? null : n
}

/**
 * Standardised revenue extraction from an invoice_line row.
 *
 * Mirrors the SQL `COALESCE(total_earned::numeric, price_after_discount::numeric, 0)`
 * used by the analytics RPCs so JS- and SQL-based reports always agree:
 *   - `total_earned` wins whenever it is present — INCLUDING a legitimate
 *     0.00 (e.g. a comped or fully-discounted line). The previous `||`
 *     logic treated 0 as "missing" and wrongly fell through to
 *     `price_after_discount`, over-counting revenue on zero-earned lines.
 *   - `price_after_discount` is used only when `total_earned` is NULL/absent.
 *   - 0 is the final fallback when neither field is present.
 */
export function lineRevenue(line: { total_earned?: string | number | null; price_after_discount?: string | number | null }): number {
  const earned = parseMoney(line.total_earned)
  if (earned !== null) return earned
  return parseMoney(line.price_after_discount) ?? 0
}
