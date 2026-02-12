-- Migration: Create invoice dashboard aggregation function
-- This runs ALL aggregations in the database, bypassing the 1000-row API limit.
-- Returns pre-computed stats, monthly data, and top-N breakdowns as JSON.

CREATE OR REPLACE FUNCTION get_invoice_dashboard(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_location text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  v_stats jsonb;
  v_monthly jsonb;
  v_departments jsonb;
  v_product_groups jsonb;
  v_staff jsonb;
  v_case_owners jsonb;
BEGIN
  -- Stats summary (exclude Header rows, require non-null total_earned for revenue)
  SELECT jsonb_build_object(
    'totalLines', COUNT(*),
    'totalRevenue', COALESCE(SUM(CASE WHEN total_earned IS NOT NULL THEN total_earned ELSE 0 END), 0),
    'uniqueInvoices', COUNT(DISTINCT invoice_number),
    'uniqueClients', COUNT(DISTINCT client_code),
    'uniqueStaff', COUNT(DISTINCT staff_member),
    'uniqueDepartments', COUNT(DISTINCT department),
    'earliestDate', MIN(invoice_date)::text,
    'latestDate', MAX(invoice_date)::text
  ) INTO v_stats
  FROM invoice_lines
  WHERE (invoice_type IS DISTINCT FROM 'Header')
    AND (p_start_date IS NULL OR invoice_date >= p_start_date)
    AND (p_end_date IS NULL OR invoice_date <= p_end_date)
    AND (p_location IS NULL OR department = p_location);

  -- Monthly aggregation
  SELECT COALESCE(jsonb_agg(row_data ORDER BY month), '[]'::jsonb)
  INTO v_monthly
  FROM (
    SELECT jsonb_build_object(
      'month', TO_CHAR(invoice_date, 'YYYY-MM'),
      'revenue', COALESCE(SUM(total_earned), 0),
      'lineCount', COUNT(*),
      'invoiceCount', COUNT(DISTINCT invoice_number),
      'clientCount', COUNT(DISTINCT client_code)
    ) AS row_data,
    TO_CHAR(invoice_date, 'YYYY-MM') AS month
    FROM invoice_lines
    WHERE invoice_date IS NOT NULL
      AND (invoice_type IS DISTINCT FROM 'Header')
      AND (p_start_date IS NULL OR invoice_date >= p_start_date)
      AND (p_end_date IS NULL OR invoice_date <= p_end_date)
      AND (p_location IS NULL OR department = p_location)
    GROUP BY TO_CHAR(invoice_date, 'YYYY-MM')
  ) sub;

  -- Department revenue (top 10)
  SELECT COALESCE(jsonb_agg(row_data ORDER BY rev DESC), '[]'::jsonb)
  INTO v_departments
  FROM (
    SELECT jsonb_build_object(
      'department', COALESCE(department, 'Unknown'),
      'revenue', COALESCE(SUM(total_earned), 0)
    ) AS row_data,
    COALESCE(SUM(total_earned), 0) AS rev
    FROM invoice_lines
    WHERE (invoice_type IS DISTINCT FROM 'Header')
      AND (p_start_date IS NULL OR invoice_date >= p_start_date)
      AND (p_end_date IS NULL OR invoice_date <= p_end_date)
      AND (p_location IS NULL OR department = p_location)
    GROUP BY department
    ORDER BY rev DESC
    LIMIT 10
  ) sub;

  -- Product group revenue (top 12)
  SELECT COALESCE(jsonb_agg(row_data ORDER BY rev DESC), '[]'::jsonb)
  INTO v_product_groups
  FROM (
    SELECT jsonb_build_object(
      'productGroup', COALESCE(product_group, 'Unknown'),
      'revenue', COALESCE(SUM(total_earned), 0)
    ) AS row_data,
    COALESCE(SUM(total_earned), 0) AS rev
    FROM invoice_lines
    WHERE (invoice_type IS DISTINCT FROM 'Header')
      AND (p_start_date IS NULL OR invoice_date >= p_start_date)
      AND (p_end_date IS NULL OR invoice_date <= p_end_date)
      AND (p_location IS NULL OR department = p_location)
    GROUP BY product_group
    ORDER BY rev DESC
    LIMIT 12
  ) sub;

  -- Staff revenue (top 15)
  SELECT COALESCE(jsonb_agg(row_data ORDER BY rev DESC), '[]'::jsonb)
  INTO v_staff
  FROM (
    SELECT jsonb_build_object(
      'staffMember', staff_member,
      'revenue', COALESCE(SUM(total_earned), 0)
    ) AS row_data,
    COALESCE(SUM(total_earned), 0) AS rev
    FROM invoice_lines
    WHERE staff_member IS NOT NULL
      AND (invoice_type IS DISTINCT FROM 'Header')
      AND (p_start_date IS NULL OR invoice_date >= p_start_date)
      AND (p_end_date IS NULL OR invoice_date <= p_end_date)
      AND (p_location IS NULL OR department = p_location)
    GROUP BY staff_member
    ORDER BY rev DESC
    LIMIT 15
  ) sub;

  -- Case owner revenue (top 15)
  SELECT COALESCE(jsonb_agg(row_data ORDER BY rev DESC), '[]'::jsonb)
  INTO v_case_owners
  FROM (
    SELECT jsonb_build_object(
      'caseOwner', case_owner,
      'revenue', COALESCE(SUM(total_earned), 0)
    ) AS row_data,
    COALESCE(SUM(total_earned), 0) AS rev
    FROM invoice_lines
    WHERE case_owner IS NOT NULL
      AND (invoice_type IS DISTINCT FROM 'Header')
      AND (p_start_date IS NULL OR invoice_date >= p_start_date)
      AND (p_end_date IS NULL OR invoice_date <= p_end_date)
      AND (p_location IS NULL OR department = p_location)
    GROUP BY case_owner
    ORDER BY rev DESC
    LIMIT 15
  ) sub;

  -- Combine all results
  result := jsonb_build_object(
    'stats', v_stats,
    'monthly', v_monthly,
    'departments', v_departments,
    'productGroups', v_product_groups,
    'staff', v_staff,
    'caseOwners', v_case_owners
  );

  RETURN result;
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION get_invoice_dashboard(date, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_invoice_dashboard(date, date, text) TO service_role;
