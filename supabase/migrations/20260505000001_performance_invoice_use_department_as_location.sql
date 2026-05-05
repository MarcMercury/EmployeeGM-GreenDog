-- RPC: get_performance_invoice_summary — v3
--
-- Practice management has confirmed that on the EzyVet invoice export,
-- the "Department" column carries the physical clinic location (Sherman
-- Oaks / Van Nuys / Venice) more reliably than the "Active Division"
-- column. Previously this RPC grouped by `division`, which left many
-- months with revenue but unattributed location buckets.
--
-- This migration switches the location key to:
--     COALESCE(NULLIF(TRIM(department), ''), division)
--
-- The returned JSON still uses the field name `division` so the
-- consuming API (server/api/analytics/performance.get.ts) does not have
-- to change its contract — only the source of truth for "what location
-- did this revenue/appointment belong to" is updated.

CREATE OR REPLACE FUNCTION get_performance_invoice_summary(
  p_start_date date DEFAULT NULL,
  p_end_date   date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH filtered AS (
    SELECT
      il.*,
      -- Unified location key: prefer Department, fall back to Division.
      COALESCE(NULLIF(TRIM(il.department), ''), il.division) AS location_key
    FROM   invoice_lines il
    WHERE  (p_start_date IS NULL OR il.invoice_date >= p_start_date)
      AND  (p_end_date   IS NULL OR il.invoice_date <= p_end_date)
      AND  (il.invoice_type IS DISTINCT FROM 'Header')
  ),
  -- One row per unique (client, date, location) — the appointment grain
  appt_grain AS (
    SELECT DISTINCT
      client_code,
      invoice_date,
      COALESCE(location_key, '(null)') AS division
    FROM   filtered
    WHERE  client_code IS NOT NULL
      AND  invoice_date IS NOT NULL
  ),
  totals AS (
    SELECT
      COALESCE(SUM(COALESCE(total_earned::numeric, price_after_discount::numeric, 0)), 0) AS total_revenue,
      COUNT(DISTINCT client_code)    AS unique_clients,
      COUNT(DISTINCT invoice_number) AS unique_invoices,
      COUNT(*)                       AS line_count,
      (SELECT COUNT(*) FROM appt_grain) AS appointments
    FROM filtered
  ),
  by_division AS (
    SELECT
      COALESCE(f.location_key, '(null)') AS division,
      COALESCE(SUM(COALESCE(f.total_earned::numeric, f.price_after_discount::numeric, 0)), 0) AS revenue,
      COUNT(DISTINCT f.client_code)    AS unique_clients,
      COUNT(DISTINCT f.invoice_number) AS unique_invoices,
      COALESCE(
        (SELECT COUNT(*) FROM appt_grain a WHERE a.division = COALESCE(f.location_key, '(null)')),
        0
      ) AS appointments
    FROM filtered f
    GROUP BY COALESCE(f.location_key, '(null)')
  ),
  by_month AS (
    SELECT
      to_char(f.invoice_date, 'YYYY-MM')   AS month,
      COALESCE(f.location_key, '(null)')   AS division,
      COALESCE(SUM(COALESCE(f.total_earned::numeric, f.price_after_discount::numeric, 0)), 0) AS revenue,
      COUNT(DISTINCT f.client_code || '__' || f.invoice_date::text) AS appointments
    FROM filtered f
    WHERE f.invoice_date IS NOT NULL
    GROUP BY to_char(f.invoice_date, 'YYYY-MM'), COALESCE(f.location_key, '(null)')
  ),
  by_week AS (
    SELECT
      to_char(date_trunc('week', invoice_date), 'YYYY-MM-DD') AS week,
      division,
      COUNT(*) AS appointments
    FROM appt_grain
    GROUP BY date_trunc('week', invoice_date), division
  ),
  by_dow AS (
    SELECT
      EXTRACT(DOW FROM invoice_date)::int AS dow,
      division,
      COUNT(*) AS appointments
    FROM appt_grain
    GROUP BY EXTRACT(DOW FROM invoice_date), division
  ),
  by_product_group AS (
    SELECT
      COALESCE(product_group, 'Unknown')   AS product_group,
      COALESCE(location_key, '(null)')     AS division,
      COALESCE(SUM(COALESCE(total_earned::numeric, price_after_discount::numeric, 0)), 0) AS revenue
    FROM filtered
    GROUP BY COALESCE(product_group, 'Unknown'), COALESCE(location_key, '(null)')
  ),
  by_staff AS (
    SELECT
      COALESCE(staff_member, 'Unknown')    AS staff_member,
      COALESCE(location_key, '(null)')     AS division,
      COALESCE(SUM(COALESCE(total_earned::numeric, price_after_discount::numeric, 0)), 0) AS revenue
    FROM filtered
    WHERE staff_member IS NOT NULL
    GROUP BY COALESCE(staff_member, 'Unknown'), COALESCE(location_key, '(null)')
  )
  SELECT jsonb_build_object(
    'totals',         (SELECT row_to_json(t)::jsonb FROM totals t),
    'byDivision',     COALESCE((SELECT jsonb_agg(row_to_json(d)) FROM by_division d), '[]'::jsonb),
    'byMonth',        COALESCE((SELECT jsonb_agg(row_to_json(m)) FROM by_month m), '[]'::jsonb),
    'byWeek',         COALESCE((SELECT jsonb_agg(row_to_json(w)) FROM by_week w), '[]'::jsonb),
    'byDow',          COALESCE((SELECT jsonb_agg(row_to_json(dw)) FROM by_dow dw), '[]'::jsonb),
    'byProductGroup', COALESCE((SELECT jsonb_agg(row_to_json(p)) FROM by_product_group p), '[]'::jsonb),
    'byStaff',        COALESCE((SELECT jsonb_agg(row_to_json(s)) FROM by_staff s), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_performance_invoice_summary(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_performance_invoice_summary(date, date) TO service_role;
