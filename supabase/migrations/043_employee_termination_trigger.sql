-- =====================================================
-- Migration 043: Employee Termination Trigger
-- =====================================================
-- Purpose: Automatically notify all admins when an employee 
-- is deactivated or terminated for immediate offboarding action.
-- =====================================================

-- =====================================================
-- PART 1: TERMINATION NOTIFICATION TRIGGER
-- =====================================================

-- Function: notify_admins_on_employee_termination
-- Fires when employee is terminated or deactivated
CREATE OR REPLACE FUNCTION public.notify_admins_on_employee_termination()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
  employee_name TEXT;
  notification_title TEXT;
  notification_body TEXT;
BEGIN
  -- Check if this is a termination or deactivation event
  -- Condition 1: employment_status changed to 'terminated'
  -- Condition 2: is_active changed to false (if column exists - employees table uses employment_status)
  
  IF (
    (OLD.employment_status IS DISTINCT FROM NEW.employment_status AND NEW.employment_status = 'terminated')
    OR (OLD.employment_status IS DISTINCT FROM NEW.employment_status AND NEW.employment_status = 'inactive')
  ) THEN
    
    -- Build employee name
    employee_name := COALESCE(NEW.preferred_name, NEW.first_name) || ' ' || NEW.last_name;
    
    -- Build notification content
    notification_title := 'URGENT: Employee Deactivated - ' || employee_name;
    notification_body := 'This employee has been marked as inactive/terminated. Please immediately review their profile to revoke system access, retrieve physical assets (keys, uniform), and finalize payroll.';
    
    -- Find all admin users and create notifications for each
    FOR admin_record IN
      SELECT id
      FROM public.profiles
      WHERE role = 'admin'
        AND is_active = true
    LOOP
      INSERT INTO public.notifications (
        profile_id,
        type,
        title,
        body,
        data,
        is_read,
        created_at
      ) VALUES (
        admin_record.id,
        'admin_alert',
        notification_title,
        notification_body,
        jsonb_build_object(
          'employee_id', NEW.id,
          'employee_name', employee_name,
          'previous_status', OLD.employment_status,
          'new_status', NEW.employment_status,
          'termination_date', NEW.termination_date,
          'termination_reason', NEW.termination_reason,
          'link', '/roster/' || NEW.id::text
        ),
        false,
        NOW()
      );
    END LOOP;
    
    -- Log the termination event to audit logs
    INSERT INTO public.audit_logs (
      action,
      entity_type,
      entity_id,
      metadata,
      occurred_at
    ) VALUES (
      'employee_terminated',
      'employee',
      NEW.id,
      jsonb_build_object(
        'employee_name', employee_name,
        'previous_status', OLD.employment_status,
        'new_status', NEW.employment_status,
        'termination_date', NEW.termination_date,
        'termination_reason', NEW.termination_reason
      ),
      NOW()
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on the employees table
DROP TRIGGER IF EXISTS trg_employee_termination_notification ON public.employees;

CREATE TRIGGER trg_employee_termination_notification
  AFTER UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_employee_termination();

-- =====================================================
-- PART 2: ADD NEW LOCATION
-- =====================================================

-- Insert My Pet Mobile Vet location
INSERT INTO public.locations (
  id,
  name,
  code,
  address_line1,
  city,
  state,
  country,
  postal_code,
  timezone,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'My Pet Mobile Vet',
  'MPMV',
  '14661 Aetna St.',
  'Van Nuys',
  'CA',
  'USA',
  '91411',
  'America/Los_Angeles',
  true,
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Ensure the function can be executed
GRANT EXECUTE ON FUNCTION public.notify_admins_on_employee_termination() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_admins_on_employee_termination() TO service_role;

-- =====================================================
-- VERIFICATION COMMENT
-- =====================================================
-- To test this trigger:
-- UPDATE public.employees 
-- SET employment_status = 'terminated', 
--     termination_date = CURRENT_DATE,
--     termination_reason = 'Test termination'
-- WHERE id = '<employee_uuid>';
--
-- Then check notifications table for admin alerts
