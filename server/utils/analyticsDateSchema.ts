/**
 * Shared Zod schema for analytics date-range query parameters.
 * Validates that startDate/endDate are proper YYYY-MM-DD strings.
 */

import { z } from 'zod'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format').optional()

export const analyticsQuerySchema = z.object({
  startDate: isoDate,
  endDate: isoDate,
  division: z.string().optional(),
  _t: z.string().optional(), // cache-bust param
})

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>
