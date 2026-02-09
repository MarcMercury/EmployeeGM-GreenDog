/**
 * Shared formatting utilities for roster components.
 * Extracted during Phase 4 decomposition of roster/[id].vue.
 */
import { format, differenceInDays } from 'date-fns'

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A'
  return format(new Date(dateStr), 'MMM d, yyyy')
}

export function formatEmploymentType(type: string): string {
  const typeMap: Record<string, string> = {
    'full-time': 'Full Time',
    'part-time': 'Part Time',
    'contract': 'Contractor',
    'per-diem': 'Per Diem',
    'intern': 'Intern'
  }
  return typeMap[type] || type || 'Not Set'
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'active': 'success',
    'inactive': 'grey',
    'on-leave': 'warning',
    'terminated': 'error'
  }
  return colors[status] || 'grey'
}

export function formatPayRate(rate: number | null): string {
  if (!rate) return '0.00'
  if (rate >= 1000) {
    return rate.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }
  return rate.toFixed(2)
}
