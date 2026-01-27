-- ============================================================================
-- MIGRATION 171: Fix All Schedule RLS Policies
-- All policies incorrectly use profiles.id instead of profiles.auth_user_id
-- ============================================================================

-- ============================================================================
-- 1. FIX SCHEDULE_DRAFTS RLS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "schedule_drafts_select_admin" ON schedule_drafts;
CREATE POLICY "schedule_drafts_select_admin" ON schedule_drafts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "schedule_drafts_modify_admin" ON schedule_drafts;
CREATE POLICY "schedule_drafts_modify_admin" ON schedule_drafts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_admin', 'manager')
    )
  );

-- ============================================================================
-- 2. FIX DRAFT_SLOTS RLS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "draft_slots_select_admin" ON draft_slots;
CREATE POLICY "draft_slots_select_admin" ON draft_slots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "draft_slots_modify_admin" ON draft_slots;
CREATE POLICY "draft_slots_modify_admin" ON draft_slots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_admin', 'manager')
    )
  );

-- ============================================================================
-- 3. FIX SCHEDULE_TEMPLATES RLS POLICIES (if they have the same issue)
-- ============================================================================
DROP POLICY IF EXISTS "schedule_templates_select" ON schedule_templates;
CREATE POLICY "schedule_templates_select" ON schedule_templates FOR SELECT USING (true);

DROP POLICY IF EXISTS "schedule_templates_modify" ON schedule_templates;
CREATE POLICY "schedule_templates_modify" ON schedule_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role IN ('super_admin', 'admin', 'hr_admin', 'manager'))
);

-- ============================================================================
-- 4. FIX EMPLOYEE_AVAILABILITY RLS IF EXISTS
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'employee_availability') THEN
    EXECUTE 'DROP POLICY IF EXISTS "availability_select" ON employee_availability';
    EXECUTE 'CREATE POLICY "availability_select" ON employee_availability FOR SELECT USING (true)';
    
    EXECUTE 'DROP POLICY IF EXISTS "availability_modify_admin" ON employee_availability';
    EXECUTE 'CREATE POLICY "availability_modify_admin" ON employee_availability FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role IN (''super_admin'', ''admin'', ''hr_admin'', ''manager''))
    )';
  END IF;
END $$;

-- ============================================================================
-- COMPLETE
-- ============================================================================
