-- Migration: 137_database_integrity_constraints.sql
-- Purpose: Add critical database constraints for data integrity
-- Date: 2026-01-20

-- =====================================================
-- 1. EMPLOYEE DATA INTEGRITY
-- =====================================================

-- Ensure hire date is before termination date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employees_dates_valid'
  ) THEN
    ALTER TABLE employees ADD CONSTRAINT employees_dates_valid
      CHECK (hire_date <= COALESCE(termination_date, '2100-01-01'::date));
  END IF;
END $$;

-- Ensure email format is valid (basic check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employees_email_format'
  ) THEN
    ALTER TABLE employees ADD CONSTRAINT employees_email_format
      CHECK (email_work IS NULL OR email_work ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
  END IF;
END $$;

-- Ensure employment status is valid
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employees_status_valid'
  ) THEN
    ALTER TABLE employees ADD CONSTRAINT employees_status_valid
      CHECK (employment_status IN ('active', 'inactive', 'on_leave', 'terminated', 'pending'));
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Constraint may already exist or column may have different values
  RAISE NOTICE 'Skipping employees_status_valid constraint: %', SQLERRM;
END $$;

-- =====================================================
-- 2. SHIFT/SCHEDULE INTEGRITY
-- =====================================================

-- Ensure shift times are logically valid (or marked as overnight)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shifts_times_valid'
  ) THEN
    ALTER TABLE shifts ADD CONSTRAINT shifts_times_valid
      CHECK (
        start_time < end_time 
        OR (start_time > end_time AND COALESCE(is_overnight, false) = true)
      );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping shifts_times_valid constraint: %', SQLERRM;
END $$;

-- =====================================================
-- 3. AUDIT LOG IMMUTABILITY
-- =====================================================

-- Prevent any modification to audit logs (only if table exists)
DO $$
BEGIN
  -- Only create if audit_log table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_log') THEN
    -- Create the prevention function
    CREATE OR REPLACE FUNCTION public.prevent_audit_modification()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    BEGIN
      RAISE EXCEPTION 'Audit log records cannot be modified or deleted';
    END;
    $func$;

    -- Drop existing trigger if any and recreate
    DROP TRIGGER IF EXISTS audit_log_immutable ON audit_log;
    CREATE TRIGGER audit_log_immutable
      BEFORE UPDATE OR DELETE ON audit_log
      FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();
    
    RAISE NOTICE 'Audit log immutability trigger created';
  ELSE
    RAISE NOTICE 'Skipping audit_log trigger - table does not exist';
  END IF;
END $$;

-- =====================================================
-- 4. DATABASE HEALTH CHECK FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_database_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_active_employees int;
  v_pending_time_off int;
  v_unread_notifications int;
  v_recent_audits int;
  v_orphaned_profiles int;
BEGIN
  -- Count active employees
  SELECT count(*) INTO v_active_employees 
  FROM employees WHERE is_active = true;
  
  -- Count pending time off requests
  SELECT count(*) INTO v_pending_time_off 
  FROM time_off_requests WHERE status = 'pending';
  
  -- Count unread notifications
  SELECT count(*) INTO v_unread_notifications 
  FROM notifications WHERE read_at IS NULL;
  
  -- Count recent audit entries (last hour)
  SELECT count(*) INTO v_recent_audits 
  FROM audit_log WHERE created_at > now() - interval '1 hour';
  
  -- Check for orphaned profiles
  SELECT count(*) INTO v_orphaned_profiles 
  FROM profiles p 
  WHERE p.auth_user_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.auth_user_id);
  
  v_result := jsonb_build_object(
    'timestamp', now(),
    'status', CASE WHEN v_orphaned_profiles = 0 THEN 'healthy' ELSE 'warning' END,
    'metrics', jsonb_build_object(
      'active_employees', v_active_employees,
      'pending_time_off', v_pending_time_off,
      'unread_notifications', v_unread_notifications,
      'recent_audit_entries', v_recent_audits
    ),
    'issues', jsonb_build_object(
      'orphaned_profiles', v_orphaned_profiles
    )
  );
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'timestamp', now(),
    'status', 'error',
    'error', SQLERRM
  );
END;
$$;

-- Grant execute to authenticated users (admin check in app layer)
GRANT EXECUTE ON FUNCTION public.check_database_health() TO authenticated;

-- =====================================================
-- 5. PERFORMANCE INDEXES (with existence checks)
-- =====================================================

-- Employees by department (common filter)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employees') THEN
    CREATE INDEX IF NOT EXISTS idx_employees_dept_active 
      ON employees(department_id, is_active) 
      WHERE is_active = true;
  END IF;
END $$;

-- Candidates by pipeline stage (recruiting flow)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'candidates') THEN
    CREATE INDEX IF NOT EXISTS idx_candidates_stage_date 
      ON candidates(pipeline_stage, created_at DESC);
  END IF;
END $$;

-- Notifications for quick unread count
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    CREATE INDEX IF NOT EXISTS idx_notifications_unread 
      ON notifications(user_id, created_at DESC) 
      WHERE read_at IS NULL;
  END IF;
END $$;

-- Time off requests pending approval
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'time_off_requests') THEN
    CREATE INDEX IF NOT EXISTS idx_time_off_pending_approver 
      ON time_off_requests(approver_id, requested_at) 
      WHERE status = 'pending';
  END IF;
END $$;

-- Audit log by entity (for viewing history) - only if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_log') THEN
    CREATE INDEX IF NOT EXISTS idx_audit_entity_time 
      ON audit_log(entity_type, entity_id, created_at DESC);
  END IF;
END $$;

-- =====================================================
-- 6. DATA VALIDATION TRIGGER
-- =====================================================

-- Validate employee data before save
CREATE OR REPLACE FUNCTION public.validate_employee_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Normalize email to lowercase
  IF NEW.email_work IS NOT NULL THEN
    NEW.email_work := lower(trim(NEW.email_work));
  END IF;
  
  -- Normalize phone number (remove non-digits except +)
  IF NEW.phone_mobile IS NOT NULL THEN
    NEW.phone_mobile := regexp_replace(NEW.phone_mobile, '[^0-9+]', '', 'g');
  END IF;
  
  -- Trim name fields
  NEW.first_name := trim(NEW.first_name);
  NEW.last_name := trim(NEW.last_name);
  
  -- Set updated_at
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$;

-- Apply to employees table
DROP TRIGGER IF EXISTS validate_employee_before_save ON employees;
CREATE TRIGGER validate_employee_before_save
  BEFORE INSERT OR UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION validate_employee_data();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMENT ON FUNCTION public.check_database_health() IS 'Returns JSON health metrics for monitoring';
COMMENT ON FUNCTION public.validate_employee_data() IS 'Normalizes employee data before save';
