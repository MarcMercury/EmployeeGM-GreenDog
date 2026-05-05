-- =====================================================
-- Migration 285: Referral totals computed from line-item ledger
-- =====================================================
-- Description:
--   * Adds referrals_last_12_months column for Statistics-report
--     uploads so they no longer overwrite cumulative totals.
--   * Adds row_index + invoice_line_id to referral_revenue_line_items
--     so legitimate same-day duplicate visits aren't dedup-collapsed.
--   * Adds recompute_referral_partner_totals() which derives
--     total_revenue_all_time, total_referrals_all_time and
--     last_referral_date from referral_revenue_line_items.
--   * Wires the recompute into recalculate_partner_metrics() so
--     dashboard tiers always reflect the ledger.
-- =====================================================

-- 1. New column: rolling 12-month referral count from Statistics CSVs
ALTER TABLE public.referral_partners
  ADD COLUMN IF NOT EXISTS referrals_last_12_months INTEGER DEFAULT 0;

COMMENT ON COLUMN public.referral_partners.referrals_last_12_months IS
  'Rolling 12-month referral count from EzyVet Referral Statistics report (does NOT overwrite all-time totals)';

-- 2. Stronger dedup keys on the line-item ledger
ALTER TABLE public.referral_revenue_line_items
  ADD COLUMN IF NOT EXISTS row_index INTEGER,
  ADD COLUMN IF NOT EXISTS invoice_line_id TEXT;

COMMENT ON COLUMN public.referral_revenue_line_items.row_index IS
  'Sequence within (date, client, animal, amount) group inside a single upload — disambiguates legitimate same-day repeat visits';
COMMENT ON COLUMN public.referral_revenue_line_items.invoice_line_id IS
  'Optional EzyVet invoice/line identifier when present in the source export';

-- 3. Recompute totals from the ledger
CREATE OR REPLACE FUNCTION public.recompute_referral_partner_totals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Aggregate ledger and sync onto referral_partners
  WITH agg AS (
    SELECT
      partner_id,
      COUNT(*)::int                            AS visit_count,
      ROUND(SUM(amount)::numeric, 2)           AS revenue_sum,
      MAX(NULLIF(transaction_date,'')::date)   AS last_date
    FROM public.referral_revenue_line_items
    WHERE partner_id IS NOT NULL
    GROUP BY partner_id
  )
  UPDATE public.referral_partners p
  SET
    total_revenue_all_time   = COALESCE(a.revenue_sum, 0),
    total_referrals_all_time = COALESCE(a.visit_count, 0),
    last_referral_date       = GREATEST(p.last_referral_date::date, a.last_date)
  FROM agg a
  WHERE p.id = a.partner_id;

  -- Zero out partners with no ledger rows so stale data clears
  UPDATE public.referral_partners p
  SET
    total_revenue_all_time   = 0,
    total_referrals_all_time = 0
  WHERE NOT EXISTS (
    SELECT 1 FROM public.referral_revenue_line_items li
    WHERE li.partner_id = p.id
  )
  AND (p.total_revenue_all_time <> 0 OR p.total_referrals_all_time <> 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.recompute_referral_partner_totals() TO authenticated;
COMMENT ON FUNCTION public.recompute_referral_partner_totals() IS
  'Re-derives total_referrals_all_time, total_revenue_all_time and last_referral_date for every partner from the referral_revenue_line_items ledger.';

-- 4. Wire recompute into recalculate_partner_metrics
CREATE OR REPLACE FUNCTION recalculate_partner_metrics()
RETURNS SETOF referral_partners
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Step 0: Re-derive totals from the line-item ledger so every downstream
  -- bucket calculation reflects the canonical source of truth.
  PERFORM public.recompute_referral_partner_totals();

  -- Step 1: Tier (revenue quintiles)
  WITH tier_calc AS (
    SELECT id, NTILE(5) OVER (ORDER BY COALESCE(total_revenue_all_time, 0) DESC) AS tier_bucket
    FROM referral_partners
  )
  UPDATE referral_partners rp
  SET tier = CASE tc.tier_bucket
    WHEN 1 THEN 'Platinum'
    WHEN 2 THEN 'Gold'
    WHEN 3 THEN 'Silver'
    WHEN 4 THEN 'Bronze'
    WHEN 5 THEN 'Coal'
  END
  FROM tier_calc tc
  WHERE rp.id = tc.id;

  -- Step 2: Priority (referral-count quartiles)
  WITH priority_calc AS (
    SELECT id, NTILE(4) OVER (ORDER BY COALESCE(total_referrals_all_time, 0) DESC) AS priority_bucket
    FROM referral_partners
  )
  UPDATE referral_partners rp
  SET priority = CASE pc.priority_bucket
    WHEN 1 THEN 'Very High'
    WHEN 2 THEN 'High'
    WHEN 3 THEN 'Medium'
    WHEN 4 THEN 'Low'
  END
  FROM priority_calc pc
  WHERE rp.id = pc.id;

  -- Step 3: Visit tier and expected cadence
  WITH visit_tier_calc AS (
    SELECT id,
      NTILE(3) OVER (
        ORDER BY (COALESCE(total_revenue_all_time, 0) + COALESCE(total_referrals_all_time, 0) * 100) DESC
      ) AS visit_bucket
    FROM referral_partners
  )
  UPDATE referral_partners rp
  SET
    visit_tier = CASE vtc.visit_bucket WHEN 1 THEN 'High' WHEN 2 THEN 'Medium' WHEN 3 THEN 'Low' END,
    expected_visit_frequency_days = CASE vtc.visit_bucket WHEN 1 THEN 60 WHEN 2 THEN 120 WHEN 3 THEN 180 END
  FROM visit_tier_calc vtc
  WHERE rp.id = vtc.id;

  -- Step 4: Days since last visit + overdue
  UPDATE referral_partners
  SET
    days_since_last_visit = CASE
      WHEN last_visit_date IS NOT NULL THEN EXTRACT(DAY FROM (NOW() - last_visit_date::timestamp))::integer
      ELSE NULL
    END,
    visit_overdue = CASE
      WHEN last_visit_date IS NULL THEN TRUE
      WHEN EXTRACT(DAY FROM (NOW() - last_visit_date::timestamp)) > COALESCE(expected_visit_frequency_days, 120) THEN TRUE
      ELSE FALSE
    END;

  -- Step 5: Relationship health & status
  UPDATE referral_partners
  SET
    relationship_health = (
      CASE tier
        WHEN 'Platinum' THEN 40 WHEN 'Gold' THEN 32 WHEN 'Silver' THEN 24
        WHEN 'Bronze' THEN 16 WHEN 'Coal' THEN 8 ELSE 0
      END
      +
      CASE priority
        WHEN 'Very High' THEN 30 WHEN 'High' THEN 22 WHEN 'Medium' THEN 15 WHEN 'Low' THEN 8 ELSE 0
      END
      +
      CASE
        WHEN last_visit_date IS NULL THEN 0
        WHEN days_since_last_visit <= COALESCE(expected_visit_frequency_days, 120) * 0.5 THEN 30
        WHEN days_since_last_visit <= COALESCE(expected_visit_frequency_days, 120) THEN 20
        WHEN days_since_last_visit <= COALESCE(expected_visit_frequency_days, 120) * 1.5 THEN 10
        ELSE 0
      END
    ),
    relationship_status = CASE
      WHEN relationship_health >= 80 THEN 'Excellent'
      WHEN relationship_health >= 60 THEN 'Good'
      WHEN relationship_health >= 40 THEN 'Fair'
      WHEN relationship_health >= 20 THEN 'Needs Attention'
      ELSE 'At Risk'
    END,
    needs_followup = CASE
      WHEN visit_overdue = TRUE THEN TRUE
      WHEN relationship_health < 40 THEN TRUE
      ELSE needs_followup
    END;

  RETURN QUERY SELECT * FROM referral_partners ORDER BY name;
END;
$$;

GRANT EXECUTE ON FUNCTION recalculate_partner_metrics() TO authenticated;
COMMENT ON FUNCTION recalculate_partner_metrics() IS
  'Recomputes ledger totals, then redistributes tier/priority/visit-tier and relationship health for every partner.';
