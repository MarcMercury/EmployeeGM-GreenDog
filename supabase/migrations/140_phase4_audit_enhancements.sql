-- =====================================================
-- PHASE 4: AUDIT - Immutability & Enhanced Logging
-- Migration: 140_phase4_audit_enhancements.sql
-- Priority: 🟡 HIGH - Do Soon
-- Purpose: Protect audit trail and enhance logging
-- =====================================================

-- This phase ensures audit logs cannot be tampered with
-- and adds enhanced logging capabilities.

-- -----------------------------------------------------
-- 4.1 CREATE AUDIT LOG TABLE (if not exists)
-- -----------------------------------------------------

-- Ensure the audit_log table exists with proper structure
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who performed the action
  actor_id uuid REFERENCES auth.users(id),
  actor_email text,
  actor_ip inet,
  
  -- What was affected
  entity_type text NOT NULL,
  entity_id uuid,
  entity_name text,
  
  -- What happened
  action text NOT NULL,
  action_category text,
  
  -- Change details
  old_values jsonb,
  new_values jsonb,
  changes jsonb,
  
  -- Context
  session_id text,
  user_agent text,
  request_path text,
  
  -- Timestamp
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_entity 
  ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor 
  ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action 
  ON audit_log(action, action_category);
CREATE INDEX IF NOT EXISTS idx_audit_log_created 
  ON audit_log(created_at DESC);

COMMENT ON TABLE public.audit_log IS 'Immutable audit trail for all critical operations';

-- -----------------------------------------------------
-- 4.2 AUDIT LOG RLS POLICIES
-- -----------------------------------------------------

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_log;
CREATE POLICY "Admins can view audit logs"
  ON public.audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- System can insert audit logs
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_log;
CREATE POLICY "System can insert audit logs"
  ON public.audit_log FOR INSERT
  WITH CHECK (true);

-- No UPDATE or DELETE policies = immutable

-- -----------------------------------------------------
-- 4.3 AUDIT LOG IMMUTABILITY TRIGGER
-- -----------------------------------------------------

-- Function to prevent modifications
CREATE OR REPLACE FUNCTION public.prevent_audit_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Audit log records cannot be modified or deleted. This is a security feature.';
END;
$$;

-- Apply trigger
DROP TRIGGER IF EXISTS audit_log_immutable ON audit_log;
CREATE TRIGGER audit_log_immutable
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- -----------------------------------------------------
-- 4.4 CONVENIENT AUDIT LOGGING FUNCTION
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_entity_type text,
  p_entity_id uuid,
  p_entity_name text,
  p_action text,
  p_action_category text DEFAULT NULL,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL,
  p_changes jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_actor_email text;
  v_audit_id uuid;
BEGIN
  -- Get current user info
  v_actor_id := auth.uid();
  
  IF v_actor_id IS NOT NULL THEN
    SELECT email INTO v_actor_email
    FROM profiles
    WHERE auth_user_id = v_actor_id;
  END IF;
  
  -- Insert audit record
  INSERT INTO audit_log (
    actor_id,
    actor_email,
    entity_type,
    entity_id,
    entity_name,
    action,
    action_category,
    old_values,
    new_values,
    changes
  ) VALUES (
    v_actor_id,
    v_actor_email,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_action,
    p_action_category,
    p_old_values,
    p_new_values,
    p_changes
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_audit_event(text, uuid, text, text, text, jsonb, jsonb, jsonb) TO authenticated;

COMMENT ON FUNCTION public.log_audit_event IS 
  'Convenience function to log audit events from application code';

-- -----------------------------------------------------
-- 4.5 AUDIT CLEANUP FUNCTION (archive old records)
-- -----------------------------------------------------

-- Create archive table for old audit records
CREATE TABLE IF NOT EXISTS public.audit_log_archive (
  LIKE public.audit_log INCLUDING ALL
);

COMMENT ON TABLE public.audit_log_archive IS 'Archived audit records older than 90 days';

-- Function to archive old audit records (run monthly)
CREATE OR REPLACE FUNCTION public.archive_old_audit_logs()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_archived_count int;
BEGIN
  -- Only super_admin can run this
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE auth_user_id = auth.uid() 
    AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Super admin access required';
  END IF;

  -- Move records older than 90 days to archive
  WITH moved AS (
    DELETE FROM audit_log
    WHERE created_at < now() - interval '90 days'
    RETURNING *
  )
  INSERT INTO audit_log_archive SELECT * FROM moved;
  
  GET DIAGNOSTICS v_archived_count = ROW_COUNT;
  
  RETURN v_archived_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_old_audit_logs() TO authenticated;

-- -----------------------------------------------------
-- PHASE 4 COMPLETE
-- -----------------------------------------------------

DO $$
BEGIN
  RAISE NOTICE '✅ Phase 4 Complete: Audit logging enhanced';
END $$;
