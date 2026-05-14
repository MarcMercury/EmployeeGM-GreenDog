-- =====================================================
-- Migration 20260514000001: Referral reporting improvements
-- =====================================================
-- 1. Fix NULL handling in recompute_referral_partner_totals so partners with
--    a NULL last_referral_date actually get populated from the ledger.
-- 2. Enforce well-formed ISO dates on referral_revenue_line_items.transaction_date.
-- 3. Add indexes to support the date-range report query.
-- 4. Add undo_referral_upload(upload_id) RPC for selective rollback of a
--    single upload (safer than the nuclear clear_referral_stats path).
-- =====================================================

-- ---------------------------------------------------------------
-- 1. Fix recompute_referral_partner_totals NULL handling
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recompute_referral_partner_totals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    -- Use COALESCE so a NULL existing value does not poison GREATEST().
    last_referral_date       = GREATEST(
      COALESCE(p.last_referral_date::date, a.last_date),
      a.last_date
    )
  FROM agg a
  WHERE p.id = a.partner_id;

  -- Zero out partners with no ledger rows so stale data clears.
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

-- ---------------------------------------------------------------
-- 2. Enforce well-formed ISO dates on the ledger
-- ---------------------------------------------------------------
-- Clean any pre-existing malformed rows first so the constraint can apply.
DELETE FROM public.referral_revenue_line_items
WHERE transaction_date IS NULL
   OR transaction_date !~ '^\d{4}-\d{2}-\d{2}$';

ALTER TABLE public.referral_revenue_line_items
  DROP CONSTRAINT IF EXISTS referral_revenue_line_items_transaction_date_iso_chk;

ALTER TABLE public.referral_revenue_line_items
  ADD CONSTRAINT referral_revenue_line_items_transaction_date_iso_chk
  CHECK (transaction_date ~ '^\d{4}-\d{2}-\d{2}$');

-- ---------------------------------------------------------------
-- 3. Indexes supporting the date-range report query
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_rrli_transaction_date
  ON public.referral_revenue_line_items (transaction_date);

CREATE INDEX IF NOT EXISTS idx_rrli_partner_date
  ON public.referral_revenue_line_items (partner_id, transaction_date);

CREATE INDEX IF NOT EXISTS idx_rrli_upload_id
  ON public.referral_revenue_line_items (upload_id);

-- ---------------------------------------------------------------
-- 4. Undo a single upload — selective rollback
-- ---------------------------------------------------------------
-- Returns the number of ledger rows removed. Recomputes partner totals so
-- the dashboard reflects the rollback without an extra round-trip.
CREATE OR REPLACE FUNCTION public.undo_referral_upload(p_upload_id UUID)
RETURNS TABLE (rows_deleted INTEGER, upload_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  IF p_upload_id IS NULL THEN
    RAISE EXCEPTION 'upload_id is required';
  END IF;

  DELETE FROM public.referral_revenue_line_items
  WHERE upload_id = p_upload_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  -- Mark the sync_history row as undone rather than deleting it, so the
  -- audit trail remains intact.
  UPDATE public.referral_sync_history
  SET sync_details = COALESCE(sync_details, '{}'::jsonb)
                     || jsonb_build_object(
                          'undone_at', NOW(),
                          'rows_removed', v_deleted
                        )
  WHERE id = p_upload_id;

  PERFORM public.recompute_referral_partner_totals();

  RETURN QUERY SELECT v_deleted, p_upload_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.undo_referral_upload(UUID) TO authenticated;
COMMENT ON FUNCTION public.undo_referral_upload(UUID) IS
  'Deletes ledger rows from a single referral upload and recomputes partner totals. Marks the sync_history row as undone.';
