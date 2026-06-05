/**
 * Tests for lineRevenue() — the single source of truth for per-line
 * revenue used by every CRM/Practice analytics endpoint.
 *
 * These lock in parsing accuracy ("robust and accurate per what is
 * imported") and the SQL-equivalent COALESCE semantics so JS- and
 * SQL-based reports never diverge.
 */

import { describe, it, expect } from 'vitest'
import { lineRevenue } from '../../server/utils/lineRevenue'

describe('lineRevenue', () => {
  it('uses total_earned when present', () => {
    expect(lineRevenue({ total_earned: 123.45, price_after_discount: 999 })).toBe(123.45)
  })

  it('treats a legitimate 0 total_earned as $0 (does NOT fall through)', () => {
    // A comped / 100%-discounted line earns $0 even though it has a list price.
    // The old `||` logic wrongly returned 200 here, over-counting revenue.
    expect(lineRevenue({ total_earned: 0, price_after_discount: 200 })).toBe(0)
    expect(lineRevenue({ total_earned: '0.00', price_after_discount: '200' })).toBe(0)
  })

  it('falls back to price_after_discount only when total_earned is null/absent', () => {
    expect(lineRevenue({ total_earned: null, price_after_discount: 88.5 })).toBe(88.5)
    expect(lineRevenue({ total_earned: '', price_after_discount: 88.5 })).toBe(88.5)
    expect(lineRevenue({ price_after_discount: 50 })).toBe(50)
  })

  it('returns 0 when neither field is present', () => {
    expect(lineRevenue({})).toBe(0)
    expect(lineRevenue({ total_earned: null, price_after_discount: null })).toBe(0)
    expect(lineRevenue({ total_earned: '', price_after_discount: '' })).toBe(0)
  })

  it('parses numeric strings', () => {
    expect(lineRevenue({ total_earned: '1234.56' })).toBe(1234.56)
  })

  it('strips currency symbols and thousands separators', () => {
    // Plain parseFloat("1,234.56") would return 1 — a 1000x undercount.
    expect(lineRevenue({ total_earned: '$1,234.56' })).toBe(1234.56)
    expect(lineRevenue({ total_earned: '1,000' })).toBe(1000)
  })

  it('handles accounting-style negatives (refunds/credits)', () => {
    expect(lineRevenue({ total_earned: '(50.00)' })).toBe(-50)
    expect(lineRevenue({ total_earned: -25 })).toBe(-25)
  })

  it('returns 0 for unparseable values', () => {
    expect(lineRevenue({ total_earned: 'N/A', price_after_discount: 'n/a' })).toBe(0)
    expect(lineRevenue({ total_earned: NaN })).toBe(0)
  })
})
