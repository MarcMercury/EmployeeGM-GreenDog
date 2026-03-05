/**
 * Standardised revenue extraction from an invoice_line row.
 *
 * Uses the same COALESCE(total_earned, price_after_discount, 0) logic
 * across all analytics APIs so revenue numbers are always consistent.
 */
export function lineRevenue(line: { total_earned?: string | number | null; price_after_discount?: string | number | null }): number {
  const v = parseFloat(String(line.total_earned ?? '')) || parseFloat(String(line.price_after_discount ?? '')) || 0
  return isNaN(v) ? 0 : v
}
