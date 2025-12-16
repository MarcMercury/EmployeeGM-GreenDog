-- Migration 035: Comprehensive Audit Logging
-- Multi-Admin System Hardening: Audit Trail for Critical Operations
-- Tracks: employee modifications, schedule changes, pay changes, PTO approvals, role changes, deletions

-- ============================================================
-- 1. CREATE COMPREHENSIVE AUDIT LOG TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who performed the action
  actor_id uuid REFERENCES auth.users(id),
  actor_email text,
  actor_ip inet,
  
  -- What was affected
  entity_type text NOT NULL,  -- 'employee', 'shift', 'schedule', 'pay_setting', 'pto_request', 'profile', etc.
  entity_id uuid,
  entity_name text,           -- Human-readable identifier (e.g., "John Doe", "Week of 2024-01-15")
  
  -- What happened
  action text NOT NULL,       -- 'create', 'update', 'delete', 'approve', 'reject', 'publish', 'assign', etc.
  action_category text,       -- 'hr', 'scheduling', 'payroll', 'pto', 'security'
  
  -- Change details
  old_values jsonb,           -- Previous state (for updates/deletes)
  new_values jsonb,           -- New state (for creates/updates)
  changes jsonb,              -- Computed diff for updates
  
  -- Context
  session_id text,            -- Browser session ID if available
  user_agent text,
  request_path text,
  
  -- Timestamp
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Performance indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action, action_category);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_time ON public.audit_log(entity_type, created_at DESC);

-- ============================================================
-- 2. RLS POLICIES FOR AUDIT LOG
-- ============================================================

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE auth_user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- System can insert audit logs (via service role or triggers)
CREATE POLICY "System can insert audit logs"
  ON public.audit_log FOR INSERT
  WITH CHECK (true);

-- No one can update or delete audit logs (immutable)
-- (No UPDATE or DELETE policies = no one can modify)

-- ============================================================
-- 3. AUDIT LOGGING FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_entity_type text,
  p_entity_id uuid,
  p_entity_name text,
  p_action text,
  p_action_category text,
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
  
  SELECT email INTO v_actor_email
  FROM public.profiles
  WHERE auth_user_id = v_actor_id;
  
  -- Insert audit record
  INSERT INTO public.audit_log (
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

-- ============================================================
-- 4. EMPLOYEE AUDIT TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.audit_employee_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entity_name text;
  v_changes jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_entity_name := COALESCE(OLD.first_name, '') || ' ' || COALESCE(OLD.last_name, '');
    
    PERFORM log_audit_event(
      'employee',
      OLD.id,
      v_entity_name,
      'delete',
      'hr',
      to_jsonb(OLD),
      NULL,
      NULL
    );
    
    RETURN OLD;
    
  ELSIF TG_OP = 'UPDATE' THEN
    v_entity_name := COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '');
    
    -- Compute changes
    v_changes := jsonb_build_object();
    
    -- Track sensitive field changes
    IF OLD.employment_status IS DISTINCT FROM NEW.employment_status THEN
      v_changes := v_changes || jsonb_build_object('employment_status', 
        jsonb_build_object('old', OLD.employment_status, 'new', NEW.employment_status));
    END IF;
    
    IF OLD.department_id IS DISTINCT FROM NEW.department_id THEN
      v_changes := v_changes || jsonb_build_object('department_id', 
        jsonb_build_object('old', OLD.department_id, 'new', NEW.department_id));
    END IF;
    
    IF OLD.position_id IS DISTINCT FROM NEW.position_id THEN
      v_changes := v_changes || jsonb_build_object('position_id', 
        jsonb_build_object('old', OLD.position_id, 'new', NEW.position_id));
    END IF;
    
    IF OLD.manager_employee_id IS DISTINCT FROM NEW.manager_employee_id THEN
      v_changes := v_changes || jsonb_build_object('manager_employee_id', 
        jsonb_build_object('old', OLD.manager_employee_id, 'new', NEW.manager_employee_id));
    END IF;
    
    IF OLD.location_id IS DISTINCT FROM NEW.location_id THEN
      v_changes := v_changes || jsonb_build_object('location_id', 
        jsonb_build_object('old', OLD.location_id, 'new', NEW.location_id));
    END IF;
    
    IF OLD.termination_date IS DISTINCT FROM NEW.termination_date THEN
      v_changes := v_changes || jsonb_build_object('termination_date', 
        jsonb_build_object('old', OLD.termination_date, 'new', NEW.termination_date));
    END IF;
    
    -- Only log if there are tracked changes
    IF v_changes != '{}'::jsonb THEN
      PERFORM log_audit_event(
        'employee',
        NEW.id,
        v_entity_name,
        'update',
        'hr',
        to_jsonb(OLD),
        to_jsonb(NEW),
        v_changes
      );
    END IF;
    
    RETURN NEW;
    
  ELSIF TG_OP = 'INSERT' THEN
    v_entity_name := COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '');
    
    PERFORM log_audit_event(
      'employee',
      NEW.id,
      v_entity_name,
      'create',
      'hr',
      NULL,
      to_jsonb(NEW),
      NULL
    );
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Attach trigger to employees table
DROP TRIGGER IF EXISTS trg_audit_employee_changes ON public.employees;
CREATE TRIGGER trg_audit_employee_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION audit_employee_changes();

-- ============================================================
-- 5. PAY SETTINGS AUDIT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.audit_pay_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entity_name text;
  v_changes jsonb;
BEGIN
  -- Get employee name for context
  SELECT COALESCE(e.first_name, '') || ' ' || COALESCE(e.last_name, '')
  INTO v_entity_name
  FROM public.employees e
  WHERE e.id = COALESCE(NEW.employee_id, OLD.employee_id);
  
  IF TG_OP = 'DELETE' THEN
    PERFORM log_audit_event(
      'pay_setting',
      OLD.id,
      v_entity_name || ' - Pay Settings',
      'delete',
      'payroll',
      to_jsonb(OLD),
      NULL,
      NULL
    );
    RETURN OLD;
    
  ELSIF TG_OP = 'UPDATE' THEN
    v_changes := jsonb_build_object();
    
    -- Track pay rate changes (sensitive!)
    IF OLD.pay_type IS DISTINCT FROM NEW.pay_type THEN
      v_changes := v_changes || jsonb_build_object('pay_type', 
        jsonb_build_object('old', OLD.pay_type, 'new', NEW.pay_type));
    END IF;
    
    IF OLD.hourly_rate IS DISTINCT FROM NEW.hourly_rate THEN
      v_changes := v_changes || jsonb_build_object('hourly_rate', 
        jsonb_build_object('old', OLD.hourly_rate, 'new', NEW.hourly_rate));
    END IF;
    
    IF OLD.annual_salary IS DISTINCT FROM NEW.annual_salary THEN
      v_changes := v_changes || jsonb_build_object('annual_salary', 
        jsonb_build_object('old', OLD.annual_salary, 'new', NEW.annual_salary));
    END IF;
    
    IF OLD.overtime_eligible IS DISTINCT FROM NEW.overtime_eligible THEN
      v_changes := v_changes || jsonb_build_object('overtime_eligible', 
        jsonb_build_object('old', OLD.overtime_eligible, 'new', NEW.overtime_eligible));
    END IF;
    
    IF v_changes != '{}'::jsonb THEN
      PERFORM log_audit_event(
        'pay_setting',
        NEW.id,
        v_entity_name || ' - Pay Settings',
        'update',
        'payroll',
        to_jsonb(OLD),
        to_jsonb(NEW),
        v_changes
      );
    END IF;
    
    RETURN NEW;
    
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM log_audit_event(
      'pay_setting',
      NEW.id,
      v_entity_name || ' - Pay Settings',
      'create',
      'payroll',
      NULL,
      to_jsonb(NEW),
      NULL
    );
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_pay_changes ON public.employee_pay_settings;
CREATE TRIGGER trg_audit_pay_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.employee_pay_settings
  FOR EACH ROW
  EXECUTE FUNCTION audit_pay_changes();

-- ============================================================
-- 6. PTO REQUEST AUDIT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.audit_pto_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entity_name text;
  v_action text;
BEGIN
  -- Get employee name
  SELECT COALESCE(e.first_name, '') || ' ' || COALESCE(e.last_name, '')
  INTO v_entity_name
  FROM public.employees e
  WHERE e.id = COALESCE(NEW.employee_id, OLD.employee_id);
  
  IF TG_OP = 'UPDATE' THEN
    -- Determine action based on status change
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_action := CASE NEW.status
        WHEN 'approved' THEN 'approve'
        WHEN 'rejected' THEN 'reject'
        WHEN 'cancelled' THEN 'cancel'
        ELSE 'update'
      END;
      
      PERFORM log_audit_event(
        'pto_request',
        NEW.id,
        v_entity_name || ' - PTO ' || TO_CHAR(NEW.start_date, 'MM/DD') || '-' || TO_CHAR(NEW.end_date, 'MM/DD'),
        v_action,
        'pto',
        to_jsonb(OLD),
        to_jsonb(NEW),
        jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status))
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_pto_changes ON public.time_off_requests;
CREATE TRIGGER trg_audit_pto_changes
  AFTER UPDATE ON public.time_off_requests
  FOR EACH ROW
  EXECUTE FUNCTION audit_pto_changes();

-- ============================================================
-- 7. SCHEDULE/SHIFT PUBLISH AUDIT TRIGGER  
-- ============================================================

CREATE OR REPLACE FUNCTION public.audit_schedule_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log when schedule is published
  IF OLD.is_published = false AND NEW.is_published = true THEN
    PERFORM log_audit_event(
      'shift',
      NEW.id,
      'Shift - ' || TO_CHAR(NEW.start_at, 'YYYY-MM-DD HH24:MI'),
      'publish',
      'scheduling',
      NULL,
      jsonb_build_object(
        'shift_id', NEW.id,
        'employee_id', NEW.employee_id,
        'location_id', NEW.location_id,
        'start_at', NEW.start_at,
        'end_at', NEW.end_at
      ),
      NULL
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_schedule_publish ON public.shifts;
CREATE TRIGGER trg_audit_schedule_publish
  AFTER UPDATE ON public.shifts
  FOR EACH ROW
  EXECUTE FUNCTION audit_schedule_publish();

-- ============================================================
-- 8. PROFILE ROLE CHANGE AUDIT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log role changes (very sensitive!)
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    PERFORM log_audit_event(
      'profile',
      NEW.id,
      COALESCE(NEW.email, 'Unknown'),
      'role_change',
      'security',
      jsonb_build_object('role', OLD.role, 'email', OLD.email),
      jsonb_build_object('role', NEW.role, 'email', NEW.email),
      jsonb_build_object('role', jsonb_build_object('old', OLD.role, 'new', NEW.role))
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_role_changes ON public.profiles;
CREATE TRIGGER trg_audit_role_changes
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_role_changes();

-- ============================================================
-- 9. AUDIT LOG CLEANUP FUNCTION (for data retention)
-- ============================================================

-- Function to clean up old audit logs (configurable retention)
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(
  p_retention_days integer DEFAULT 365
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  DELETE FROM public.audit_log
  WHERE created_at < now() - (p_retention_days || ' days')::interval;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- ============================================================
-- 10. AUDIT LOG VIEWS FOR COMMON QUERIES
-- ============================================================

-- View for recent HR changes
CREATE OR REPLACE VIEW public.v_recent_hr_audit AS
SELECT 
  al.created_at,
  al.actor_email,
  al.action,
  al.entity_name,
  al.changes
FROM public.audit_log al
WHERE al.action_category = 'hr'
ORDER BY al.created_at DESC
LIMIT 100;

-- View for pay changes (highly sensitive - may want additional RLS)
CREATE OR REPLACE VIEW public.v_pay_audit AS
SELECT 
  al.created_at,
  al.actor_email,
  al.action,
  al.entity_name,
  al.changes
FROM public.audit_log al
WHERE al.action_category = 'payroll'
ORDER BY al.created_at DESC
LIMIT 100;

-- View for security events (role changes, etc.)
CREATE OR REPLACE VIEW public.v_security_audit AS
SELECT 
  al.created_at,
  al.actor_email,
  al.action,
  al.entity_name,
  al.old_values,
  al.new_values
FROM public.audit_log al
WHERE al.action_category = 'security'
ORDER BY al.created_at DESC
LIMIT 100;

-- ============================================================
-- 11. GRANT PERMISSIONS
-- ============================================================

GRANT SELECT ON public.audit_log TO authenticated;
GRANT SELECT ON public.v_recent_hr_audit TO authenticated;
GRANT SELECT ON public.v_pay_audit TO authenticated;
GRANT SELECT ON public.v_security_audit TO authenticated;

-- ============================================================
-- 12. RATE LIMITING TABLE (for future API protection)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  endpoint text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint 
  ON public.rate_limits(user_id, endpoint, window_start DESC);

-- Cleanup old rate limit records (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < now() - interval '1 hour';
END;
$$;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- This migration adds:
-- 1. Comprehensive audit_log table with proper indexing
-- 2. RLS policies (admin-only read, immutable records)
-- 3. Automatic triggers for: employees, pay_settings, PTO, shifts, profiles
-- 4. Audit views for quick queries by category
-- 5. Rate limiting table for future API protection
-- 6. Data retention cleanup function
