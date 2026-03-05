-- RPC: get_performance_invoice_summary
--
-- Replaces the client-side pagination loop in performance.get.ts.
-- Returns a single JSONB object with all invoice-line aggregations
-- needed by the Practice Analytics page:
--   - totals (grand revenue, unique clients, unique invoices, line count)
--   - byDivision (revenue / clients / invoices per raw division value)
--   - byMonth (revenue per month per division)
--   - byProductGroup (revenue per product_group per division)
--   - byStaff (revenue per staff_member per division)
--
-- Division normalisation (mapping raw DB values to clinic names) remains
-- in the JS layer so the RPC stays generic.

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
    SELECT *
    FROM   invoice_lines
    WHERE  (p_start_date IS NULL OR invoice_date >= p_start_date)
      AND  (p_end_date   IS NULL OR invoice_date <= p_end_date)
      AND  (invoice_type IS DISTINCT FROM 'Header')
  ),
  totals AS (
    SELECT
      COALESCE(SUM(COALESCE(total_earned::numeric, price_after_discount::numeric, 0)), 0) AS total_revenue,
      COUNT(DISTINCT client_code)    AS unique_clients,
      COUNT(DISTINCT invoice_number) AS unique_invoices,
      COUNT(*)                       AS line_count
    FROM filtered
  ),
  by_division AS (
    SELECT
      COALESCE(division, '(null)') AS division,
      COALESCE(SUM(COALESCE(total_earned::numeric, price_after_discount::numeric, 0)), 0) AS revenue,
      COUNT(DISTINCT client_code)    AS unique_clients,
      COUNT(DISTINCT invoice_number) AS unique_invoices
    FROM filtered
    GROUP BY COALESCE(division, '(null)')
  ),
  by_month AS (
    SELECT
      to_char(invoice_date, 'YYYY-MM')   AS month,
      COALESCE(division, '(null)')       AS division,
      COALESCE(SUM(COALESCE(total_earned::numeric, price_after_discount::numeric, 0)), 0) AS revenue
    FROM filtered
    WHERE invoice_date IS NOT NULL
    GROUP BY to_char(invoice_date, 'YYYY-MM'), COALESCE(division, '(null)')
  ),
  by_product_group AS (
    SELECT
      COALESCE(product_group, 'Unknown') AS product_group,
      COALESCE(division, '(null)')       AS division,
      COALESCE(SUM(COALESCE(total_earned::numeric, price_after_discount::numeric, 0)), 0) AS revenue
    FROM filtered
    GROUP BY COALESCE(product_group, 'Unknown'), COALESCE(division, '(null)')
  ),
  by_staff AS (
    SELECT
      COALESCE(staff_member, 'Unknown')  AS staff_member,
      COALESCE(division, '(null)')       AS division,
      COALESCE(SUM(COALESCE(total_earned::numeric, price_after_discount::numeric, 0)), 0) AS revenue
    FROM filtered
    WHERE staff_member IS NOT NULL
    GROUP BY COALESCE(staff_member, 'Unknown'), COALESCE(division, '(null)')
  )
  SELECT jsonb_build_object(
    'totals',         (SELECT row_to_json(t)::jsonb FROM totals t),
    'byDivision',     COALESCE((SELECT jsonb_agg(row_to_json(d)) FROM by_division d), '[]'::jsonb),
    'byMonth',        COALESCE((SELECT jsonb_agg(row_to_json(m)) FROM by_month m), '[]'::jsonb),
    'byProductGroup', COALESCE((SELECT jsonb_agg(row_to_json(p)) FROM by_product_group p), '[]'::jsonb),
    'byStaff',        COALESCE((SELECT jsonb_agg(row_to_json(s)) FROM by_staff s), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_performance_invoice_summary(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_performance_invoice_summary(date, date) TO service_role;
