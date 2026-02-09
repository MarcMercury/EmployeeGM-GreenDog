/**
 * Shared helper functions for marketing/partnerships page and its sub-components.
 */

export function formatPartnerDate(date: string): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatPartnerDateTime(date: string): string {
  if (!date) return ''
  return new Date(date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function formatCurrency(value: number): string {
  if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M'
  if (value >= 1000) return (value / 1000).toFixed(1) + 'K'
  return value.toFixed(0)
}

export function formatCompactNumber(value: any): string {
  const num = Number(value) || 0
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toLocaleString()
}

export function getTierColor(tier: string): string {
  const colors: Record<string, string> = {
    Platinum: '#E5E4E2', Gold: '#FFD700', Silver: '#C0C0C0', Bronze: '#CD7F32', Coal: '#36454F',
    platinum: '#E5E4E2', gold: '#FFD700', silver: '#C0C0C0', bronze: '#CD7F32', prospect: '#9E9E9E'
  }
  return colors[tier] || '#9E9E9E'
}

export function getTierLabel(tier: string): string {
  const labels: Record<string, string> = {
    Platinum: 'P', Gold: 'G', Silver: 'S', Bronze: 'B', Coal: 'C',
    platinum: 'P', gold: 'G', silver: 'S', bronze: 'B', prospect: '?'
  }
  return labels[tier] || '?'
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    'Very High': 'deep-purple', 'High': 'error', 'Medium': 'warning', 'Low': 'info',
    high: 'error', medium: 'warning', low: 'info'
  }
  return colors[priority] || 'grey'
}

export function getRelationshipHealthColor(health: number | null): string {
  if (health === null) return 'grey'
  if (health >= 80) return 'success'
  if (health >= 60) return 'light-green'
  if (health >= 40) return 'warning'
  if (health >= 20) return 'orange'
  return 'error'
}

export function getRelationshipStatusColor(status: string | null): string {
  const colors: Record<string, string> = {
    'Excellent': 'success', 'Good': 'light-green', 'Fair': 'warning',
    'Needs Attention': 'orange', 'At Risk': 'error'
  }
  return colors[status || ''] || 'grey'
}

export function getRelationshipScoreColor(score: number | null): string {
  const s = score || 50
  if (s >= 80) return 'text-success'
  if (s >= 60) return 'text-info'
  if (s >= 40) return 'text-warning'
  return 'text-error'
}

export function getRelationshipScoreColorName(score: number | null): string {
  const s = score || 50
  if (s >= 80) return 'success'
  if (s >= 60) return 'info'
  if (s >= 40) return 'warning'
  return 'error'
}

export function getRelationshipScoreLabel(score: number | null): string {
  const s = score || 50
  if (s >= 80) return 'Excellent'
  if (s >= 60) return 'Good'
  if (s >= 40) return 'Needs Attention'
  return 'At Risk'
}

export function getPaymentStatusColor(status: string | null): string {
  const colors: Record<string, string> = { paid: 'success', pending: 'warning', overdue: 'error', waived: 'info' }
  return colors[status || ''] || 'grey'
}

export function getVisitTypeColor(type: string): string {
  const colors: Record<string, string> = { visit: 'success', call: 'info', email: 'purple', meeting: 'primary', lunch_and_learn: 'orange', ce_event: 'pink' }
  return colors[type] || 'grey'
}

export function isPartnerOverdue(partner: any): boolean {
  // Prefer server-computed visit_overdue field (set by recalculate_partner_metrics RPC
  // and update_partner_derived_fields trigger using expected_visit_frequency_days)
  if (partner.visit_overdue !== undefined && partner.visit_overdue !== null) {
    return partner.visit_overdue
  }
  // Fallback: client-side calculation using expected_visit_frequency_days or visit_frequency
  if (!partner.last_visit_date) return false
  if (partner.visit_frequency === 'as_needed') return false
  const last = new Date(partner.last_visit_date)
  const now = new Date()
  const days = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
  // Use expected_visit_frequency_days if available (aligned with server logic)
  if (partner.expected_visit_frequency_days) {
    return days > partner.expected_visit_frequency_days
  }
  const thresholds: Record<string, number> = { weekly: 7, biweekly: 14, monthly: 30, quarterly: 90, annually: 365 }
  return days > (thresholds[partner.visit_frequency] || 120)
}
