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
