// =============================================================================
// Practice Analytics & EzyVet Analytics — Shared Type Definitions
// =============================================================================

// ── Performance API (server/api/analytics/performance.get.ts) ────────────

export interface PerformanceKpis {
  totalAppointments: number
  totalRevenue: number
  uniqueClients: number
  avgRevenuePerAppt: number
}

export interface LocationBreakdown {
  appointments: number
  revenue: number
  perAppt: number
}

export interface AppointmentType {
  type: string
  category: string
  total: number
  byLocation: Record<string, number>
}

export interface ServiceCategory {
  category: string
  total: number
  byLocation: Record<string, number>
}

export interface DayOfWeekEntry {
  day: string
  index: number
  total: number
  byLocation: Record<string, number>
}

export interface WeeklyTrendEntry {
  week: string
  total: number
  byLocation: Record<string, number>
}

export interface MonthlyTrendEntry {
  month: string
  label: string
  appointments: number
  appointmentsByLocation: Record<string, number>
  revenue: number
  revenueByLocation: Record<string, number>
}

export interface ProductGroup {
  group: string
  revenue: number
  byLocation: Record<string, number>
}

export interface StaffRevenue {
  name: string
  revenue: number
  location: string
  byLocation: Record<string, number>
}

export interface PerformanceResponse {
  locations: string[]
  dateRange: { start: string; end: string }
  kpis: PerformanceKpis
  apptsByLocation: Record<string, number>
  appointmentTypes: AppointmentType[]
  serviceCategories: ServiceCategory[]
  dayOfWeek: DayOfWeekEntry[]
  weeklyTrend: WeeklyTrendEntry[]
  monthlyTrend: MonthlyTrendEntry[]
  revenueByLocation: Record<string, number>
  revenuePerAppt: Record<string, LocationBreakdown>
  topProductGroups: ProductGroup[]
  topStaff: StaffRevenue[]
  avgDurationByLocation: Record<string, number>
  clientsByLocation: Record<string, number>
  dataSummary: {
    invoiceLinesLoaded: number
    appointmentRowsLoaded: number
    completedAppointments: number
    divisionValues: Record<string, number>
  }
}

// ── Practice-Overview API (server/api/analytics/practice-overview.get.ts) ──

export interface RevenueMetrics {
  totalRevenue: number
  uniqueInvoices: number
  uniqueClients: number
  avgRevenuePerInvoice: number
  lineCount: number
  revenueChangePct: number
}

export interface AppointmentMetrics {
  totalAppointments: number
  avgPerDay: number
  uniqueTypes: number
  dataSource: 'ezyvet_api' | 'csv_upload' | 'none'
}

export interface ClientMetrics {
  totalContacts: number
  activeContacts: number
  recentVisitors: number
  lapsedClients: number
  retentionRate3Mo: number
  retentionRate12Mo: number
}

export interface ReferralMetrics {
  totalPartners: number
  activePartners: number
  totalReferrals: number
  totalReferralRevenue: number
  tierBreakdown: Record<string, number>
}

export interface SyncStatus {
  mode: string
  lastSyncByType: Record<string, { lastSync: string; recordsSynced: number }>
  isStale: boolean
  hasApiData: boolean
}

export interface PracticeOverviewResponse {
  success: boolean
  dateRange: { startDate: string; endDate: string }
  kpis: {
    revenue: RevenueMetrics
    appointments: AppointmentMetrics
    clients: ClientMetrics
    referrals: ReferralMetrics
  }
  charts: {
    monthlyRevenue: Array<{ month: string; revenue: number; invoiceCount: number; clientCount: number }>
    departmentRevenue: Array<{ department: string; revenue: number }>
    topStaff: Array<{ name: string; revenue: number }>
    appointmentsByType: Array<{ type: string; count: number }>
    clientRetention: Array<{ label: string; count: number }>
  }
  syncStatus: SyncStatus
  generatedAt: string
}

// ── EzyVet Analytics API (server/api/marketing/ezyvet-analytics.get.ts) ──

export interface ClientSegment {
  label: string
  count: number
  revenue: number
  avgRevenue: number
  retentionRate: number
}

export interface ChurnRiskClient {
  name: string
  revenue: number
  lastVisit: string | null
  daysSinceVisit: number | null
  riskLevel: 'critical' | 'high' | 'medium'
}

export interface GeographicArea {
  neighborhood: string
  zipCodes: string[]
  totalClients: number
  totalRevenue: number
  avgRevenue: number
  retentionRate: number
}

export interface DataQuality {
  totalRecords: number
  overallScore: number
  missingEmail: number
  missingPhone: number
  missingCity: number
  missingZip: number
  missingLastVisit: number
  missingDivision: number
}

export interface AnalyticsInsight {
  type: 'success' | 'warning' | 'info' | 'error'
  icon: string
  title: string
  detail: string
}

export interface SuggestedAction {
  icon: string
  title: string
  detail: string
  priority: 'high' | 'medium' | 'low'
  metric?: string
}

export interface EzyVetAnalyticsResponse {
  success: boolean
  kpis: {
    totalContacts: number
    activeContacts: number
    inactiveContacts: number
    totalRevenue: number
    arpu: number
    avgRevenue: number
    retentionRate: number
  }
  clientSegments: ClientSegment[]
  revenueDistribution: Array<{ label: string; count: number; percentage: number }>
  recencyAnalysis: Record<string, number>
  recencyChart: Array<{ label: string; count: number; color: string }>
  divisionBreakdown: Array<{ division: string; totalClients: number; activeClients: number; totalRevenue: number; avgRevenue: number }>
  departmentBreakdown: Array<{ department: string; totalClients: number; activeClients: number; totalRevenue: number; avgRevenue: number }>
  geographicBreakdown: GeographicArea[]
  topClients: Array<{ name: string; revenue: number; lastVisit: string | null }>
  churnRisk: ChurnRiskClient[]
  dataQuality: DataQuality
  insights: AnalyticsInsight[]
  suggestedActions: SuggestedAction[]
  divisions: string[]
  lastSync: { completed_at: string; total_rows: number } | null
  generatedAt: string
  dataQualityNote?: string
}
