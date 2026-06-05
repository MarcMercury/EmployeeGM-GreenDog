/**
 * Shared formatting helpers for Marketing pages.
 *
 * These complement the date/currency formatters already in partnershipHelpers.ts
 * (`formatPartnerDate`, `formatPartnerDateTime`, `formatCurrency`, `formatCompactNumber`).
 *
 * Nuxt auto-imports these from `app/utils/`.
 */

/**
 * Human-friendly relative date string ("Today", "3 days ago", "2 weeks ago", …).
 */
export function formatRelativeDate(date: string): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return d.toLocaleDateString()
}

/**
 * Convert a snake_case or underscore-separated string to Title Case.
 *   "pet_business" → "Pet Business"
 */
export function formatTypeName(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

/**
 * Format a 24-hour "HH:MM" or "HH:MM:SS" time string to 12-hour AM/PM.
 */
export function formatTime(time: string): string {
  if (!time) return ''
  const parts = time.split(':')
  if (parts.length < 2) return time
  const hours = parts[0] || '0'
  const minutes = parts[1] || '00'
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

/**
 * Short month + day label for a Date.
 *   new Date('2026-03-06') → "Mar 6"
 */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─────────────────────────────────────────────────────────────────────────
// Canonical report formatters
//
// Single source of truth for numbers, money, percentages and dates shown on
// the Practice Analytics & CRM reports. Using these everywhere guarantees
// consistent rounding, locale and currency presentation across all tabs.
// ─────────────────────────────────────────────────────────────────────────

/** Coerce a possibly-stringified numeric value to a finite number (else 0). */
function toFiniteNumber(value: number | string | null | undefined): number {
  if (value == null || value === '') return 0
  const n = typeof value === 'string' ? parseFloat(value) : value
  return Number.isFinite(n) ? n : 0
}

/**
 * Whole-number count with thousands separators.
 *   1234 → "1,234"
 */
export function formatNumber(value: number | string | null | undefined): string {
  return toFiniteNumber(value).toLocaleString('en-US')
}

/**
 * Currency for reports. Owns the `$` so it is never hand-prepended in
 * templates. Whole dollars by default; pass `{ cents: true }` for $1,234.56.
 * Pass `{ symbol: false }` to omit the `$` (e.g. when a template already
 * renders the symbol next to the value).
 *   1234     → "$1,234"
 *   1234.5,  { cents: true } → "$1,234.50"
 *   1234,    { symbol: false } → "1,234"
 */
export function formatMoney(
  value: number | string | null | undefined,
  opts: { cents?: boolean; symbol?: boolean } = {},
): string {
  const digits = opts.cents ? 2 : 0
  const n = toFiniteNumber(value)
  if (opts.symbol === false) {
    return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  }
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

/**
 * Percentage display. Input is already a percent (0–100), not a ratio.
 *   42 → "42%"   42.6, { decimals: 1 } → "42.6%"
 */
export function formatPercent(
  value: number | string | null | undefined,
  opts: { decimals?: number } = {},
): string {
  const decimals = opts.decimals ?? 0
  return `${toFiniteNumber(value).toFixed(decimals)}%`
}

/**
 * Report date — "Mar 6, 2026". Empty/invalid inputs render as "".
 */
export function formatReportDate(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Report date+time — "Mar 6, 2026, 2:30 PM". Empty/invalid inputs render as
 * the `emptyLabel` (default "Never"), e.g. for last-sync timestamps.
 */
export function formatReportDateTime(
  value: string | null | undefined,
  opts: { emptyLabel?: string } = {},
): string {
  const emptyLabel = opts.emptyLabel ?? 'Never'
  if (!value) return emptyLabel
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return emptyLabel
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

