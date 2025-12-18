-- Migration: 071_fix_gdu_rls_policies
-- Description: Fix RLS policies for GDU tables - use auth_user_id instead of id
-- The original policies incorrectly used p.id = auth.uid() but profiles uses auth_user_id

-- =====================================================
-- 1. FIX CE_EVENTS POLICIES
-- =====================================================

-- Drop the broken policy
DROP POLICY IF EXISTS "Admins can manage CE events" ON ce_events;

-- Create fixed policy using is_admin() helper function
CREATE POLICY "Admins can manage CE events"
  ON ce_events FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================
-- 2. FIX EDUCATION_VISITORS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage education visitors" ON education_visitors;

CREATE POLICY "Admins can manage education visitors"
  ON education_visitors FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================
-- 3. FIX CE_EVENT_TASKS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can update assigned tasks" ON ce_event_tasks;
DROP POLICY IF EXISTS "Admins can manage all CE event tasks" ON ce_event_tasks;

-- Allow users to update their assigned tasks
CREATE POLICY "Users can update assigned tasks"
  ON ce_event_tasks FOR UPDATE
  TO authenticated
  USING (
    primary_assignee_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    OR backup_assignee_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    OR public.is_admin()
  )
  WITH CHECK (
    primary_assignee_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    OR backup_assignee_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    OR public.is_admin()
  );

-- Admins can do everything
CREATE POLICY "Admins can manage all CE event tasks"
  ON ce_event_tasks FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================
-- 4. FIX CE_EVENT_ATTENDEES POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage CE event attendees" ON ce_event_attendees;

CREATE POLICY "Admins can manage CE event attendees"
  ON ce_event_attendees FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================
-- 5. FIX PARTNER_NOTES POLICY (add WITH CHECK)
-- =====================================================

DROP POLICY IF EXISTS "partner_notes_admin_all" ON partner_notes;

CREATE POLICY "partner_notes_admin_all" ON partner_notes
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================
-- 6. FIX PARTNER_GOALS POLICY (add WITH CHECK)
-- =====================================================

DROP POLICY IF EXISTS "partner_goals_admin_all" ON partner_goals;

CREATE POLICY "partner_goals_admin_all" ON partner_goals
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =====================================================
-- 7. ADD INSERT POLICY FOR PARTNER_VISIT_LOGS
-- The original table may be missing proper insert permissions
-- =====================================================

-- Check if admin policy exists, if not create it
DO $$
BEGIN
  -- Drop existing policies to recreate with proper WITH CHECK
  DROP POLICY IF EXISTS "Admin full access to partner_visit_logs" ON partner_visit_logs;
  DROP POLICY IF EXISTS "partner_visit_logs_admin_all" ON partner_visit_logs;
  
  -- Create proper admin policy
  CREATE POLICY "partner_visit_logs_admin_all" ON partner_visit_logs
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON ce_events TO authenticated;
GRANT ALL ON ce_event_tasks TO authenticated;
GRANT ALL ON ce_event_attendees TO authenticated;
GRANT ALL ON education_visitors TO authenticated;
GRANT ALL ON partner_notes TO authenticated;
GRANT ALL ON partner_goals TO authenticated;

-- =====================================================
-- 9. COMMENTS
-- =====================================================

COMMENT ON POLICY "Admins can manage CE events" ON ce_events IS 'Fixed: Uses is_admin() helper instead of broken p.id = auth.uid() check';
COMMENT ON POLICY "Admins can manage education visitors" ON education_visitors IS 'Fixed: Uses is_admin() helper';
