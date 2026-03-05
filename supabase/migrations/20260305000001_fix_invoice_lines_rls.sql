-- Fix invoice_lines RLS policy: operator precedence bug
-- The original policy had:
--   (id = auth.uid() OR auth_user_id = auth.uid()) AND role IN (...)
-- which SQL evaluates as:
--   id = auth.uid() OR (auth_user_id = auth.uid() AND role IN (...))
-- granting any user whose profiles.id matches auth.uid() full access
-- regardless of role. This mirrors the fix applied to appointment_data
-- in migration 253.

DROP POLICY IF EXISTS "invoice_lines_admin" ON invoice_lines;

CREATE POLICY "invoice_lines_admin" ON invoice_lines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'hr_admin', 'manager', 'sup_admin', 'marketing_admin')
    )
  );

-- Also fix the same pattern on invoice_analysis_runs and invoice_upload_history
-- if they exist with the same bug.
DROP POLICY IF EXISTS "invoice_analysis_admin" ON invoice_analysis_runs;
CREATE POLICY "invoice_analysis_admin" ON invoice_analysis_runs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'hr_admin', 'manager', 'sup_admin', 'marketing_admin')
    )
  );

DROP POLICY IF EXISTS "invoice_upload_admin" ON invoice_upload_history;
CREATE POLICY "invoice_upload_admin" ON invoice_upload_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid()
        AND role IN ('super_admin', 'admin', 'hr_admin', 'manager', 'sup_admin', 'marketing_admin')
    )
  );
