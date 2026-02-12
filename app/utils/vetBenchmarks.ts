/**
 * California Veterinary Medical Practice Benchmarks
 *
 * Authoritative industry benchmarks for small-animal veterinary hospitals
 * operating in California. Sources: AAHA, VHMA, VetSuccess, AVMA, and
 * California Veterinary Medical Board (VMB) guidelines.
 *
 * Scope: Medical veterinary practice only — NOT retail, grooming, or boarding.
 * Geography: California-specific where noted; otherwise national SA benchmarks.
 *
 * Last reviewed: February 2026
 */

// =====================================================
// FINANCIAL BENCHMARKS
// =====================================================

export const FINANCIAL_BENCHMARKS = {
  /** Revenue per FTE veterinarian — Small Animal (annual) */
  revenuePerFteVet: {
    low: 600_000,
    target: 700_000,
    high: 850_000,
    elite: 1_000_000,
    unit: 'USD/year',
    source: 'AAHA / VHMA national SA benchmark, adjusted CA cost-of-practice',
    description: 'Annual production per full-time-equivalent veterinarian',
  },

  /** Net income (profit) margin */
  netIncomeMargin: {
    low: 0.08,
    target: 0.10,
    high: 0.15,
    elite: 0.20,
    unit: 'ratio',
    source: 'AAHA Financial & Productivity Pulsepoints',
    description: 'Net income as percentage of total revenue',
  },

  /** Payroll costs as percentage of revenue */
  payrollCostRatio: {
    low: 0.27,     // Too high — margin compression
    target: 0.25,  // Upper bound healthy
    optimal: 0.23, // Sweet spot
    high: 0.30,    // Danger zone
    unit: 'ratio',
    source: 'VHMA / Well-Managed Practice benchmarks',
    description: 'Total payroll (including benefits & taxes) / gross revenue. Ideal 23-25%',
  },

  /** Cost of Goods Sold as percentage of revenue */
  cogs: {
    low: 0.18,
    target: 0.20,
    high: 0.23,
    danger: 0.26,
    unit: 'ratio',
    source: 'AAHA / VetSuccess',
    description: 'Drugs, supplies, and labs as % of revenue. Target 18-23%',
  },

  /** Facilities expense as percentage of collections */
  facilitiesExpense: {
    low: 0.05,
    target: 0.07,
    high: 0.09,
    danger: 0.12,
    unit: 'ratio',
    source: 'AAHA benchmarks',
    description: 'Rent, utilities, maintenance as % of collections. Target 7-9%',
  },

  /** Exam room annual production */
  examRoomRevenue: {
    low: 300_000,
    target: 444_000,
    high: 550_000,
    unit: 'USD/year',
    source: 'AAHA benchmarks',
    description: 'Annual revenue generated per exam room',
  },

  /** Collection rate */
  collectionRate: {
    minimum: 0.98,
    target: 0.995,
    unit: 'ratio',
    source: 'AAHA / industry standard',
    description: 'Percentage of charges actually collected. Minimum 98%',
  },
} as const

// =====================================================
// STAFFING BENCHMARKS
// =====================================================

export const STAFFING_BENCHMARKS = {
  /** Staff-to-veterinarian ratio */
  staffToVetRatio: {
    low: 3.0,
    optimal: 4.0,
    high: 5.0,
    max: 6.0,
    unit: 'staff:vet',
    source: 'AAHA / VHMA productivity studies',
    description: 'Total support staff per DVM. 4:1 to 5:1 is optimal for productivity',
  },

  /** Credentialed technician-to-vet ratio */
  techToVetRatio: {
    low: 1.0,
    target: 2.0,
    high: 3.0,
    unit: 'tech:vet',
    source: 'AAHA staffing guidelines',
    description: 'Registered Veterinary Technicians per DVM',
  },

  /** Maximum recommended daily shift hours (CA labor) */
  maxDailyHours: 12,

  /** CA overtime thresholds (Labor Code § 510) */
  californiaOT: {
    dailyOT: 8,        // Hours before OT kicks in daily
    dailyDoubletime: 12, // Hours before double-time daily
    weeklyOT: 40,       // Hours before weekly OT
    seventhDay: true,    // 7th consecutive day = OT for all hours
    source: 'California Labor Code § 510',
  },
} as const

// =====================================================
// CLIENT / OPERATIONAL BENCHMARKS
// =====================================================

export const CLIENT_BENCHMARKS = {
  /** New clients per veterinarian per month */
  newClientsPerVetPerMonth: {
    low: 15,
    target: 24,
    high: 35,
    unit: 'clients/vet/month',
    source: 'AAHA / VetSuccess',
    description: 'Target 24 new clients per month per FTE veterinarian',
  },

  /** Client retention / bonding rate (18-month window) */
  clientRetention: {
    poor: 0.40,
    belowAvg: 0.50,
    average: 0.60,
    good: 0.65,
    excellent: 0.75,
    unit: 'ratio',
    source: 'AAHA / VetSuccess bonding rate benchmark',
    description: 'Percentage of clients returning within 18 months. Industry target: 60%',
  },

  /** Patients seen per veterinarian per day */
  patientsPerVetPerDay: {
    low: 12,
    target: 15,
    high: 18,
    pandemicHigh: 16.6,
    unit: 'patients/vet/day',
    source: 'AVMA / VetSuccess (post-pandemic normalization)',
    description: 'Average ~15 patients per DVM per day, down from 16.6 pandemic-era high',
  },

  /** Revenue per client visit (average transaction charge) */
  averageTransactionCharge: {
    low: 175,
    target: 250,
    high: 400,
    unit: 'USD/visit',
    source: 'AAHA Vital Statistics',
    description: 'Average charge per client visit',
  },

  /** Client lifetime value (annual) */
  annualClientValue: {
    low: 250,
    average: 500,
    good: 750,
    vip: 2000,
    premium: 5000,
    unit: 'USD/year',
    source: 'AAHA / practice analytics',
    description: 'Annual revenue per active client',
  },
} as const

// =====================================================
// CLINICAL / COMPLIANCE BENCHMARKS
// =====================================================

export const CLINICAL_BENCHMARKS = {
  /** Heartworm testing compliance */
  heartwormCompliance: {
    estimated: 0.73,
    actual: 0.81,
    target: 0.90,
    unit: 'ratio',
    source: 'AAHA compliance studies',
    description: 'Heartworm testing compliance rate',
  },

  /** DE A controlled substance record retention (CA is stricter) */
  controlledSubstanceRetention: {
    federal: 2,  // years
    california: 3, // years — stricter
    unit: 'years',
    source: 'DEA / California VMB',
    description: 'CA requires 3 years vs federal 2 years',
  },

  /** Certification renewal windows */
  certificationWindows: {
    rvtRenewal: 24,        // months — RVT license renewal cycle
    deaRenewal: 36,        // months — DEA registration
    radiationSafety: 12,   // months
    cprRecert: 24,         // months
    unit: 'months',
    source: 'California VMB / DEA',
    description: 'Key certification renewal cycles for CA vet practices',
  },
} as const

// =====================================================
// CALIFORNIA-SPECIFIC FACTORS
// =====================================================

export const CALIFORNIA_FACTORS = {
  /** Key regulatory body */
  regulatoryBody: 'California Veterinary Medical Board (VMB)',

  /** Industry trends (as of early 2025/2026) */
  trends: {
    newClientAcquisition: 'declining',     // Down 2 consecutive years
    visitVolume: 'declining',              // Fewer visits per client
    retentionImportance: 'critical',       // Quality > volume
    staffingMarket: 'tight',              // High COL = competitive pay needed
    telemedicineAdoption: 'growing',      // Post-pandemic acceleration
  },

  /** Benchmarking tools commonly used */
  benchmarkingTools: [
    'VetSuccess',
    'AAHA Standards of Care',
    'VHMA Reports',
    'Veterinary Economics / dvm360',
  ],

  /** Minimum wage (CA 2026) — for payroll validation */
  minimumWage: {
    state: 16.50,            // CA state minimum (2026 est.)
    healthcareWorker: 25.00, // SB 525 healthcare worker minimum
    unit: 'USD/hour',
    source: 'California Labor Code / SB 525',
    description: 'CA healthcare worker min wage applies to vet staff',
  },
} as const

// =====================================================
// CLIENT SEGMENTATION THRESHOLDS
// =====================================================

export const CLIENT_SEGMENTS = {
  /** Revenue-based tiers aligned with vet industry */
  vip: { min: 5000, label: 'VIP', description: 'Top-tier, multi-pet or specialty care' },
  premium: { min: 2000, max: 5000, label: 'Premium', description: 'Regular wellness + some specialty' },
  regular: { min: 500, max: 2000, label: 'Regular', description: 'Annual wellness + sick visits' },
  lowValue: { min: 25, max: 500, label: 'Low Value', description: 'Single visit or basic only' },
  minimal: { max: 25, label: 'Minimal', description: 'Record exists, negligible revenue' },
} as const

// =====================================================
// REFERRAL / CRM BENCHMARKS
// =====================================================

export const REFERRAL_BENCHMARKS = {
  /** Expected referral visit frequency by tier */
  visitFrequency: {
    highTier: 60,    // days — visit platinum/gold partners every 60 days
    midTier: 120,    // days — visit silver partners every 120 days
    lowTier: 180,    // days — visit bronze/new partners every 180 days
    unit: 'days',
    source: 'Internal best practice based on VHMA referral management',
    description: 'How often to visit referral partners based on their tier',
  },

  /** Partner inactivity thresholds */
  inactivityThresholds: {
    warning: 60,     // days without referral
    atRisk: 90,      // days without referral
    inactive: 180,   // days without referral
    unit: 'days',
    description: 'Days since last referral before escalation',
  },

  /** Healthy referral mix — not too dependent on any single source */
  referralConcentration: {
    maxSingleSource: 0.25,  // No single partner > 25% of total referrals
    topThreeMax: 0.50,      // Top 3 partners should be < 50% of total
    unit: 'ratio',
    description: 'Revenue diversification across referral sources',
  },
} as const

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export type BenchmarkSeverity = 'excellent' | 'good' | 'warning' | 'critical'

/**
 * Evaluate a metric against a benchmark range.
 * Higher-is-better metrics (revenue, retention, etc.)
 */
export function evaluateHigherIsBetter(
  value: number,
  thresholds: { critical: number; warning: number; good: number; excellent: number }
): { severity: BenchmarkSeverity; color: string; label: string; icon: string } {
  if (value >= thresholds.excellent) return { severity: 'excellent', color: 'green', label: 'Excellent', icon: 'mdi-trophy' }
  if (value >= thresholds.good) return { severity: 'good', color: 'light-green', label: 'Good', icon: 'mdi-check-circle' }
  if (value >= thresholds.warning) return { severity: 'warning', color: 'orange', label: 'Below Target', icon: 'mdi-alert' }
  return { severity: 'critical', color: 'red', label: 'Critical', icon: 'mdi-alert-circle' }
}

/**
 * Evaluate a metric where lower-is-better (costs, ratios).
 */
export function evaluateLowerIsBetter(
  value: number,
  thresholds: { excellent: number; good: number; warning: number; critical: number }
): { severity: BenchmarkSeverity; color: string; label: string; icon: string } {
  if (value <= thresholds.excellent) return { severity: 'excellent', color: 'green', label: 'Excellent', icon: 'mdi-trophy' }
  if (value <= thresholds.good) return { severity: 'good', color: 'light-green', label: 'Good', icon: 'mdi-check-circle' }
  if (value <= thresholds.warning) return { severity: 'warning', color: 'orange', label: 'Above Target', icon: 'mdi-alert' }
  return { severity: 'critical', color: 'red', label: 'Critical', icon: 'mdi-alert-circle' }
}

// =====================================================
// PRE-BUILT EVALUATORS for common metrics
// =====================================================

/** Evaluate client retention rate (0-1 scale) */
export function evaluateRetention(rate: number): ReturnType<typeof evaluateHigherIsBetter> & { benchmark: string } {
  const result = evaluateHigherIsBetter(rate, {
    critical: CLIENT_BENCHMARKS.clientRetention.poor,
    warning: CLIENT_BENCHMARKS.clientRetention.belowAvg,
    good: CLIENT_BENCHMARKS.clientRetention.average,
    excellent: CLIENT_BENCHMARKS.clientRetention.good,
  })
  return {
    ...result,
    benchmark: `Industry target: ${CLIENT_BENCHMARKS.clientRetention.average * 100}% (18-month bonding rate). Top CA practices: ${CLIENT_BENCHMARKS.clientRetention.good * 100}–${CLIENT_BENCHMARKS.clientRetention.excellent * 100}%.`,
  }
}

/** Evaluate payroll cost ratio (0-1 scale) */
export function evaluatePayrollRatio(ratio: number): ReturnType<typeof evaluateLowerIsBetter> & { benchmark: string } {
  const result = evaluateLowerIsBetter(ratio, {
    excellent: FINANCIAL_BENCHMARKS.payrollCostRatio.optimal,
    good: FINANCIAL_BENCHMARKS.payrollCostRatio.target,
    warning: FINANCIAL_BENCHMARKS.payrollCostRatio.low,
    critical: FINANCIAL_BENCHMARKS.payrollCostRatio.high,
  })
  return {
    ...result,
    benchmark: `Target: ${FINANCIAL_BENCHMARKS.payrollCostRatio.optimal * 100}–${FINANCIAL_BENCHMARKS.payrollCostRatio.target * 100}% of revenue. Above ${FINANCIAL_BENCHMARKS.payrollCostRatio.low * 100}% compresses margins.`,
  }
}

/** Evaluate revenue per FTE vet */
export function evaluateRevenuePerVet(revenue: number): ReturnType<typeof evaluateHigherIsBetter> & { benchmark: string } {
  const result = evaluateHigherIsBetter(revenue, {
    critical: FINANCIAL_BENCHMARKS.revenuePerFteVet.low,
    warning: FINANCIAL_BENCHMARKS.revenuePerFteVet.target,
    good: FINANCIAL_BENCHMARKS.revenuePerFteVet.high,
    excellent: FINANCIAL_BENCHMARKS.revenuePerFteVet.elite,
  })
  return {
    ...result,
    benchmark: `Target: $${(FINANCIAL_BENCHMARKS.revenuePerFteVet.target / 1000).toFixed(0)}K–$${(FINANCIAL_BENCHMARKS.revenuePerFteVet.high / 1000).toFixed(0)}K per FTE DVM. Elite: $${(FINANCIAL_BENCHMARKS.revenuePerFteVet.elite / 1000).toFixed(0)}K+.`,
  }
}

/** Evaluate staffing ratio */
export function evaluateStaffingRatio(ratio: number): ReturnType<typeof evaluateHigherIsBetter> & { benchmark: string } {
  // Staff ratio: 4-5 is optimal. Below 3 = understaffed, above 6 = overstaffed
  if (ratio >= STAFFING_BENCHMARKS.staffToVetRatio.optimal && ratio <= STAFFING_BENCHMARKS.staffToVetRatio.high) {
    return {
      severity: 'excellent',
      color: 'green',
      label: 'Optimal',
      icon: 'mdi-check-circle',
      benchmark: `Optimal range: ${STAFFING_BENCHMARKS.staffToVetRatio.optimal}:1 to ${STAFFING_BENCHMARKS.staffToVetRatio.high}:1 staff per DVM.`,
    }
  }
  if (ratio < STAFFING_BENCHMARKS.staffToVetRatio.low) {
    return {
      severity: 'critical',
      color: 'red',
      label: 'Understaffed',
      icon: 'mdi-alert-circle',
      benchmark: `Below minimum ${STAFFING_BENCHMARKS.staffToVetRatio.low}:1. DVMs likely stretched thin — reduces throughput and care quality.`,
    }
  }
  if (ratio > STAFFING_BENCHMARKS.staffToVetRatio.max) {
    return {
      severity: 'warning',
      color: 'orange',
      label: 'Overstaffed',
      icon: 'mdi-alert',
      benchmark: `Above ${STAFFING_BENCHMARKS.staffToVetRatio.max}:1. May indicate payroll inefficiency. Review role distribution.`,
    }
  }
  // Between low-optimal or high-max
  return {
    severity: 'good',
    color: 'light-green',
    label: 'Acceptable',
    icon: 'mdi-check',
    benchmark: `Near optimal range of ${STAFFING_BENCHMARKS.staffToVetRatio.optimal}:1 to ${STAFFING_BENCHMARKS.staffToVetRatio.high}:1.`,
  }
}

/** Evaluate new client acquisition rate per vet per month */
export function evaluateNewClients(clientsPerVetPerMonth: number): ReturnType<typeof evaluateHigherIsBetter> & { benchmark: string } {
  const result = evaluateHigherIsBetter(clientsPerVetPerMonth, {
    critical: 10,
    warning: CLIENT_BENCHMARKS.newClientsPerVetPerMonth.low,
    good: CLIENT_BENCHMARKS.newClientsPerVetPerMonth.target,
    excellent: CLIENT_BENCHMARKS.newClientsPerVetPerMonth.high,
  })
  return {
    ...result,
    benchmark: `Target: ${CLIENT_BENCHMARKS.newClientsPerVetPerMonth.target} new clients/DVM/month. CA trend: new client acquisition declining for 2+ years — retention is even more critical.`,
  }
}

/** Evaluate patients per vet per day */
export function evaluatePatientsPerDay(patients: number): ReturnType<typeof evaluateHigherIsBetter> & { benchmark: string } {
  const result = evaluateHigherIsBetter(patients, {
    critical: 8,
    warning: CLIENT_BENCHMARKS.patientsPerVetPerDay.low,
    good: CLIENT_BENCHMARKS.patientsPerVetPerDay.target,
    excellent: CLIENT_BENCHMARKS.patientsPerVetPerDay.high,
  })
  return {
    ...result,
    benchmark: `Target: ~${CLIENT_BENCHMARKS.patientsPerVetPerDay.target} patients/DVM/day (post-pandemic normal, down from ${CLIENT_BENCHMARKS.patientsPerVetPerDay.pandemicHigh} pandemic high).`,
  }
}

/**
 * Generate a benchmark context string for AI/LLM prompts.
 * Include this in any AI analysis system prompt so GPT-4 has the
 * correct industry frame of reference.
 */
export function getBenchmarkContextForAI(): string {
  return `
CALIFORNIA VETERINARY MEDICAL PRACTICE BENCHMARKS (Small Animal, 2025-2026)
============================================================================

FINANCIAL:
- Revenue per FTE Veterinarian: $700K–$850K+ annually
- Net Income Margin: 10–15% (elite >20%)
- Payroll Costs: 23–25% of revenue (above 27% = margin compression)
- COGS (drugs/supplies/labs): 18–23% of revenue
- Facilities Expense: 7–9% of collections
- Exam Room Production: ~$444K+ per exam room per year
- Collection Rate: minimum 98%

STAFFING:
- Staff-to-Veterinarian Ratio: 4:1 to 5:1 is optimal
- Credentialed Tech-to-Vet Ratio: 2:1 target
- CA overtime: daily >8h = 1.5×, >12h = 2×; weekly >40h = OT
- CA healthcare worker minimum wage: $25/hr (SB 525)

CLIENT / OPERATIONAL:
- New Clients: Target 24/month/veterinarian (declining trend in CA for 2+ years)
- Client Retention (Bonding Rate): 60% target (18-month window); top practices 65–75%
- Patients per Day: ~15/DVM (down from pandemic 16.6)
- Average Transaction Charge: $250+ target
- "Big 4" Baseline: PCV/TS/BG/BUN for rapid patient assessment

CLINICAL COMPLIANCE (CA-SPECIFIC):
- California VMB requires strict drug storage & record-keeping
- Controlled substance records (DEA): 3 years in CA (stricter than federal 2 years)
- Heartworm testing compliance: actual ~81%, target >90%
- RVT license renewal: every 2 years
- Radiation safety: annual recertification

INDUSTRY TRENDS (CA, 2025-2026):
- New client acquisition down 2 consecutive years
- Visit volume declining — high-quality service crucial for retention
- Staffing challenges: CA high cost of living requires competitive pay
- Focus on hiring/retaining credentialed veterinary technicians
- Telemedicine adoption growing post-pandemic

BENCHMARKING TOOLS: VetSuccess, AAHA Standards, VHMA Reports, dvm360

When analyzing this practice's data, compare against THESE benchmarks specifically.
Flag metrics that fall below the "warning" threshold and celebrate those at "excellent."
Always frame recommendations in terms of these industry standards.
`.trim()
}
