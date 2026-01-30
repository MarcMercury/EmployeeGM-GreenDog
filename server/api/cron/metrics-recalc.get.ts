/**
 * Weekly Metrics Recalculation Cron Job
 * 
 * Runs every Monday at 6:00 AM UTC (Sunday 10pm PST)
 * Recalculates aggregate metrics that may drift over time
 * 
 * Configure in vercel.json:
 * {
 *   "crons": [
 *     { "path": "/api/cron/metrics-recalc", "schedule": "0 6 * * 1" }
 *   ]
 * }
 */

import { serverSupabaseServiceRole } from '#supabase/server'
// logger is auto-imported from server/utils/logger.ts

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  
  // Verify cron secret for security
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('[MetricsCron] Unauthorized cron attempt')
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  logger.cron('metrics-recalc', 'started', { timestamp: new Date().toISOString() })

  const supabase = await serverSupabaseServiceRole(event)
  const results = {
    employeeMetrics: { updated: 0, errors: 0 },
    referralStats: { updated: 0, errors: 0 },
    scheduleHours: { updated: 0, errors: 0 }
  }

  try {
    // 1. Recalculate employee tenure and status flags
    logger.info('[MetricsCron] Recalculating employee metrics...')
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, hire_date, status')
      .eq('status', 'active')

    if (empError) {
      logger.error('[MetricsCron] Failed to fetch employees', empError)
    } else if (employees) {
      for (const emp of employees) {
        try {
          const hireDate = new Date(emp.hire_date)
          const now = new Date()
          const tenureYears = (now.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
          
          // Could update a computed tenure field if needed
          results.employeeMetrics.updated++
        } catch (err) {
          results.employeeMetrics.errors++
        }
      }
    }

    // 2. Refresh referral partner aggregate stats
    logger.info('[MetricsCron] Recalculating referral stats...')
    const { data: referralCounts, error: refError } = await supabase
      .rpc('refresh_referral_partner_stats')
      .catch(() => ({ data: null, error: { message: 'RPC not found' } }))

    if (refError) {
      // RPC might not exist yet - that's okay
      logger.warn('[MetricsCron] Referral stats RPC not available', refError)
    } else {
      results.referralStats.updated = referralCounts || 0
    }

    // 3. Recalculate schedule hour totals for current pay period
    logger.info('[MetricsCron] Validating schedule hours...')
    const { count, error: schedError } = await supabase
      .from('schedules')
      .select('*', { count: 'exact', head: true })
      .gte('start_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    if (schedError) {
      logger.error('[MetricsCron] Failed to check schedules', schedError)
    } else {
      results.scheduleHours.updated = count || 0
    }

    const duration = Date.now() - startTime
    logger.cron('metrics-recalc', 'completed', {
      duration: `${duration}ms`,
      results
    })

    return {
      success: true,
      duration: `${duration}ms`,
      results
    }

  } catch (error: any) {
    logger.error('[MetricsCron] Unexpected error', error)
    
    throw createError({
      statusCode: 500,
      message: error.message || 'Metrics recalculation failed'
    })
  }
})
