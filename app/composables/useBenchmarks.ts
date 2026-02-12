/**
 * useBenchmarks composable
 *
 * Provides reactive benchmark evaluations for veterinary practice metrics.
 * Wraps the vetBenchmarks utility with Vue reactivity so dashboard components
 * can bind benchmark colors, labels, and tooltips directly in templates.
 *
 * Usage:
 *   const { evaluateMetric, benchmarkTooltip, BENCHMARKS } = useBenchmarks()
 *   const retention = evaluateMetric('retention', 0.62)
 *   // => { severity: 'good', color: 'light-green', label: 'Good', benchmark: '...' }
 */

import {
  FINANCIAL_BENCHMARKS,
  STAFFING_BENCHMARKS,
  CLIENT_BENCHMARKS,
  CLINICAL_BENCHMARKS,
  CALIFORNIA_FACTORS,
  CLIENT_SEGMENTS,
  REFERRAL_BENCHMARKS,
  evaluateRetention,
  evaluatePayrollRatio,
  evaluateRevenuePerVet,
  evaluateStaffingRatio,
  evaluateNewClients,
  evaluatePatientsPerDay,
  evaluateHigherIsBetter,
  evaluateLowerIsBetter,
  getBenchmarkContextForAI,
  type BenchmarkSeverity,
} from '~/utils/vetBenchmarks'

export type MetricType =
  | 'retention'
  | 'payrollRatio'
  | 'revenuePerVet'
  | 'staffingRatio'
  | 'newClients'
  | 'patientsPerDay'
  | 'netMargin'
  | 'cogsRatio'
  | 'collectionRate'
  | 'examRoomRevenue'

export function useBenchmarks() {
  /**
   * Evaluate any supported metric against CA vet industry benchmarks
   */
  function evaluateMetric(metric: MetricType, value: number) {
    switch (metric) {
      case 'retention':
        return evaluateRetention(value)
      case 'payrollRatio':
        return evaluatePayrollRatio(value)
      case 'revenuePerVet':
        return evaluateRevenuePerVet(value)
      case 'staffingRatio':
        return evaluateStaffingRatio(value)
      case 'newClients':
        return evaluateNewClients(value)
      case 'patientsPerDay':
        return evaluatePatientsPerDay(value)
      case 'netMargin':
        return {
          ...evaluateHigherIsBetter(value, {
            critical: FINANCIAL_BENCHMARKS.netIncomeMargin.low,
            warning: FINANCIAL_BENCHMARKS.netIncomeMargin.target,
            good: FINANCIAL_BENCHMARKS.netIncomeMargin.high,
            excellent: FINANCIAL_BENCHMARKS.netIncomeMargin.elite,
          }),
          benchmark: `Target: ${FINANCIAL_BENCHMARKS.netIncomeMargin.target * 100}–${FINANCIAL_BENCHMARKS.netIncomeMargin.high * 100}% net margin. Elite practices: ${FINANCIAL_BENCHMARKS.netIncomeMargin.elite * 100}%+.`,
        }
      case 'cogsRatio':
        return {
          ...evaluateLowerIsBetter(value, {
            excellent: FINANCIAL_BENCHMARKS.cogs.low,
            good: FINANCIAL_BENCHMARKS.cogs.target,
            warning: FINANCIAL_BENCHMARKS.cogs.high,
            critical: FINANCIAL_BENCHMARKS.cogs.danger,
          }),
          benchmark: `Target: ${FINANCIAL_BENCHMARKS.cogs.low * 100}–${FINANCIAL_BENCHMARKS.cogs.high * 100}% COGS. Above ${FINANCIAL_BENCHMARKS.cogs.danger * 100}% = critical.`,
        }
      case 'collectionRate':
        return {
          ...evaluateHigherIsBetter(value, {
            critical: 0.94,
            warning: 0.96,
            good: FINANCIAL_BENCHMARKS.collectionRate.minimum,
            excellent: FINANCIAL_BENCHMARKS.collectionRate.target,
          }),
          benchmark: `Minimum: ${FINANCIAL_BENCHMARKS.collectionRate.minimum * 100}%. Target: ${FINANCIAL_BENCHMARKS.collectionRate.target * 100}%.`,
        }
      case 'examRoomRevenue':
        return {
          ...evaluateHigherIsBetter(value, {
            critical: 200_000,
            warning: FINANCIAL_BENCHMARKS.examRoomRevenue.low,
            good: FINANCIAL_BENCHMARKS.examRoomRevenue.target,
            excellent: FINANCIAL_BENCHMARKS.examRoomRevenue.high,
          }),
          benchmark: `Target: $${(FINANCIAL_BENCHMARKS.examRoomRevenue.target / 1000).toFixed(0)}K+ per exam room per year.`,
        }
      default:
        return {
          severity: 'good' as BenchmarkSeverity,
          color: 'grey',
          label: 'Unknown',
          icon: 'mdi-help-circle',
          benchmark: 'No benchmark defined for this metric.',
        }
    }
  }

  /**
   * Get a short tooltip string for a benchmark
   */
  function benchmarkTooltip(metric: MetricType): string {
    const tips: Record<MetricType, string> = {
      retention: `CA Vet Benchmark: ${CLIENT_BENCHMARKS.clientRetention.average * 100}% retention (18-mo bonding). Top practices: ${CLIENT_BENCHMARKS.clientRetention.good * 100}–${CLIENT_BENCHMARKS.clientRetention.excellent * 100}%.`,
      payrollRatio: `Target: ${FINANCIAL_BENCHMARKS.payrollCostRatio.optimal * 100}–${FINANCIAL_BENCHMARKS.payrollCostRatio.target * 100}% of revenue.`,
      revenuePerVet: `Target: $${(FINANCIAL_BENCHMARKS.revenuePerFteVet.target / 1000).toFixed(0)}K–$${(FINANCIAL_BENCHMARKS.revenuePerFteVet.high / 1000).toFixed(0)}K per FTE DVM/year.`,
      staffingRatio: `Optimal: ${STAFFING_BENCHMARKS.staffToVetRatio.optimal}:1 to ${STAFFING_BENCHMARKS.staffToVetRatio.high}:1 staff per vet.`,
      newClients: `Target: ${CLIENT_BENCHMARKS.newClientsPerVetPerMonth.target}/month/DVM. CA trend: declining 2+ yrs.`,
      patientsPerDay: `Target: ~${CLIENT_BENCHMARKS.patientsPerVetPerDay.target}/DVM/day (post-pandemic).`,
      netMargin: `Target: ${FINANCIAL_BENCHMARKS.netIncomeMargin.target * 100}–${FINANCIAL_BENCHMARKS.netIncomeMargin.high * 100}%.`,
      cogsRatio: `Target: ${FINANCIAL_BENCHMARKS.cogs.low * 100}–${FINANCIAL_BENCHMARKS.cogs.high * 100}% of revenue.`,
      collectionRate: `Minimum: ${FINANCIAL_BENCHMARKS.collectionRate.minimum * 100}%.`,
      examRoomRevenue: `Target: $${(FINANCIAL_BENCHMARKS.examRoomRevenue.target / 1000).toFixed(0)}K+/room/year.`,
    }
    return tips[metric] || ''
  }

  /**
   * Get the Vuetify color for a retention percentage (commonly used in multiple pages)
   */
  function retentionColor(ratePct: number): string {
    // Input is already a percentage (0-100), convert to ratio
    const ratio = ratePct / 100
    return evaluateRetention(ratio).color
  }

  /**
   * Format a ratio as a grade label with color
   */
  function benchmarkGrade(metric: MetricType, value: number) {
    const result = evaluateMetric(metric, value)
    return {
      grade: result.label,
      color: result.color,
      icon: result.icon,
      detail: result.benchmark,
    }
  }

  return {
    // Evaluators
    evaluateMetric,
    benchmarkTooltip,
    benchmarkGrade,
    retentionColor,

    // Raw constants (for templates that need them directly)
    FINANCIAL: FINANCIAL_BENCHMARKS,
    STAFFING: STAFFING_BENCHMARKS,
    CLIENT: CLIENT_BENCHMARKS,
    CLINICAL: CLINICAL_BENCHMARKS,
    CALIFORNIA: CALIFORNIA_FACTORS,
    SEGMENTS: CLIENT_SEGMENTS,
    REFERRALS: REFERRAL_BENCHMARKS,

    // For AI prompts
    getBenchmarkContextForAI,
  }
}
