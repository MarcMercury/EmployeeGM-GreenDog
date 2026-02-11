-- ============================================================================
-- MIGRATION 250: Notification System Audit Fixes
-- Date: 2026-02-11
-- 
-- Fixes identified during notification system audit:
-- 1. publish_schedule_week() uses wrong column names (user_id → profile_id, etc.)
-- 2. No INSERT RLS policy on notifications — admin/manager/system can't insert
-- 3. Time-off admin notifications only go to role='admin', not managers/supervisors
-- 4. No notification when admin changes a user's role
-- 5. Agent notification types missing category field
-- 6. Termination trigger only notifies admins, not managers
-- ============================================================================

-- ============================================================================
-- 1. FIX: publish_schedule_week() — wrong column names
-- The function used 'user_id', 'message', 'reference_type', 'reference_id'
-- but notifications table has 'profile_id', 'body', 'type', 'category', 'data'
-- ============================================================================

CREATE OR REPLACE FUNCTION publish_schedule_week(
  p_schedule_week_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  -- Update schedule week status
  UPDATE schedule_weeks
  SET 
    status = 'published',
    published_at = now(),
    published_by = v_user_id,
    updated_at = now()
  WHERE id = p_schedule_week_id
  AND status IN ('draft', 'review');
  
  -- Update all shifts to published
  UPDATE shifts
  SET is_published = true
  WHERE schedule_week_id = p_schedule_week_id;
  
  -- Create notifications for employees with shifts (FIXED column names)
  INSERT INTO notifications (
    profile_id,
    type,
    category,
    title,
    body,
    data,
    requires_action,
    is_read,
    created_at
  )
  SELECT DISTINCT
    e.profile_id,
    'schedule_published',
    'schedule',
    'Schedule Published',
    format('Your schedule for week of %s has been published. Check your shifts!', 
      to_char(sw.week_start, 'Mon DD, YYYY')),
    jsonb_build_object(
      'schedule_week_id', sw.id,
      'week_start', sw.week_start,
      'url', '/my-schedule',
      'action_label', 'View Schedule'
    ),
    false,
    false,
    NOW()
  FROM shifts sh
  JOIN schedule_weeks sw ON sh.schedule_week_id = sw.id
  JOIN employees e ON sh.employee_id = e.id
  WHERE sw.id = p_schedule_week_id
  AND e.profile_id IS NOT NULL;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION publish_schedule_week(UUID) IS 
  'Publishes a schedule week — updates status, marks shifts published, and creates in-app notifications for all assigned employees. Fixed in migration 250 to use correct column names.';

-- ============================================================================
-- 2. FIX: Add INSERT RLS policies on notifications table
-- Previously only SELECT and UPDATE existed. System, agents, and admin/manager
-- operations need to INSERT notifications for other users.
-- ============================================================================

-- Allow admins and managers to insert notifications for any user
CREATE POLICY "Admins and managers can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin')
    )
  );

-- Allow admin-level users to SELECT all notifications (for company view in Activity Hub)
CREATE POLICY "Admins can view all notifications" ON public.notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin')
    )
  );

-- ============================================================================
-- 3. FIX: Time-off request notifications — include managers and supervisors
-- Previously only role='admin' profiles were notified.
-- Now also notifies managers and supervisors.
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_time_off_change()
RETURNS trigger AS $$
DECLARE
  employee_record RECORD;
  manager_profile RECORD;
  type_name TEXT;
BEGIN
  -- Get employee info
  SELECT e.first_name, e.last_name, e.profile_id, e.manager_employee_id INTO employee_record
  FROM public.employees e
  WHERE e.id = NEW.employee_id;

  -- Get time off type name
  SELECT name INTO type_name
  FROM public.time_off_types
  WHERE id = NEW.time_off_type_id;

  -- Notify the employee about their request status
  IF employee_record.profile_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      profile_id,
      type,
      category,
      title,
      body,
      data,
      requires_action
    ) VALUES (
      employee_record.profile_id,
      CASE 
        WHEN NEW.status = 'approved' THEN 'pto_approved'
        WHEN NEW.status = 'denied' THEN 'pto_denied'
        WHEN NEW.status = 'pending' AND TG_OP = 'INSERT' THEN 'pto_submitted'
        ELSE 'pto_updated'
      END,
      'pto',
      CASE 
        WHEN NEW.status = 'approved' THEN '🎉 Time Off Approved!'
        WHEN NEW.status = 'denied' THEN 'Time Off Request Denied'
        WHEN NEW.status = 'pending' AND TG_OP = 'INSERT' THEN 'Time Off Request Submitted'
        ELSE 'Time Off Status Updated'
      END,
      CASE 
        WHEN NEW.status = 'approved' THEN format('Your %s request for %s - %s has been approved!', 
          COALESCE(type_name, 'time off'), to_char(NEW.start_date, 'Mon DD'), to_char(NEW.end_date, 'Mon DD, YYYY'))
        WHEN NEW.status = 'denied' THEN format('Your %s request for %s - %s was not approved. %s', 
          COALESCE(type_name, 'time off'), to_char(NEW.start_date, 'Mon DD'), to_char(NEW.end_date, 'Mon DD, YYYY'),
          COALESCE('Reason: ' || NEW.manager_comment, 'Please contact your manager for details.'))
        WHEN NEW.status = 'pending' AND TG_OP = 'INSERT' THEN format('Your %s request for %s - %s is pending review.', 
          COALESCE(type_name, 'time off'), to_char(NEW.start_date, 'Mon DD'), to_char(NEW.end_date, 'Mon DD, YYYY'))
        ELSE format('Your time off request for %s - %s has been updated.', 
          to_char(NEW.start_date, 'Mon DD'), to_char(NEW.end_date, 'Mon DD, YYYY'))
      END,
      jsonb_build_object(
        'request_id', NEW.id,
        'start_date', NEW.start_date,
        'end_date', NEW.end_date,
        'status', NEW.status,
        'type_name', type_name,
        'url', '/my-schedule'
      ),
      NEW.status = 'pending'
    );
  END IF;

  -- Notify admins, managers, and supervisors when a new time off request is submitted
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    -- Notify the employee's direct manager first (if they have one)
    IF employee_record.manager_employee_id IS NOT NULL THEN
      FOR manager_profile IN 
        SELECT p.id FROM public.profiles p
        JOIN public.employees e ON e.profile_id = p.id
        WHERE e.id = employee_record.manager_employee_id
          AND p.id != employee_record.profile_id
      LOOP
        INSERT INTO public.notifications (
          profile_id, type, category, title, body, data, requires_action
        ) VALUES (
          manager_profile.id,
          'pto_request_manager',
          'pto',
          '📋 Time Off Request from Your Team',
          format('%s %s has requested %s from %s to %s', 
            COALESCE(employee_record.first_name, 'Employee'), 
            COALESCE(employee_record.last_name, ''),
            COALESCE(type_name, 'time off'),
            to_char(NEW.start_date, 'Mon DD'), 
            to_char(NEW.end_date, 'Mon DD, YYYY')),
          jsonb_build_object(
            'request_id', NEW.id,
            'employee_id', NEW.employee_id,
            'employee_name', COALESCE(employee_record.first_name, '') || ' ' || COALESCE(employee_record.last_name, ''),
            'start_date', NEW.start_date,
            'end_date', NEW.end_date,
            'type_name', type_name,
            'url', '/time-off',
            'action_label', 'Review Request'
          ),
          true
        );
      END LOOP;
    END IF;

    -- Notify admins and supervisors (roles that can approve time off)
    FOR manager_profile IN 
      SELECT p.id FROM public.profiles p
      WHERE p.role IN ('admin', 'super_admin', 'sup_admin')
        AND p.is_active = true
        AND p.id != employee_record.profile_id
        -- Exclude the direct manager (already notified above)
        AND p.id NOT IN (
          SELECT COALESCE(e2.profile_id, '00000000-0000-0000-0000-000000000000'::uuid)
          FROM employees e2
          WHERE e2.id = employee_record.manager_employee_id
        )
    LOOP
      INSERT INTO public.notifications (
        profile_id, type, category, title, body, data, requires_action
      ) VALUES (
        manager_profile.id,
        'pto_request_admin',
        'pto',
        '📋 New Time Off Request',
        format('%s %s has requested %s from %s to %s', 
          COALESCE(employee_record.first_name, 'Employee'), 
          COALESCE(employee_record.last_name, ''),
          COALESCE(type_name, 'time off'),
          to_char(NEW.start_date, 'Mon DD'), 
          to_char(NEW.end_date, 'Mon DD, YYYY')),
        jsonb_build_object(
          'request_id', NEW.id,
          'employee_id', NEW.employee_id,
          'employee_name', COALESCE(employee_record.first_name, '') || ' ' || COALESCE(employee_record.last_name, ''),
          'start_date', NEW.start_date,
          'end_date', NEW.end_date,
          'type_name', type_name,
          'url', '/time-off',
          'action_label', 'Review Request'
        ),
        true
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_time_off_change() IS 
  'Notifies employee on time off status changes, and admins + managers + supervisors on new requests. Updated in migration 250.';

-- ============================================================================
-- 4. NEW: Role Change Notification Trigger
-- When an admin changes a user's role, notify the affected user
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_role_change()
RETURNS trigger AS $$
DECLARE
  old_role_name TEXT;
  new_role_name TEXT;
BEGIN
  -- Only fire when role actually changes
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Map role keys to display names
    old_role_name := CASE OLD.role
      WHEN 'super_admin' THEN 'Super Admin'
      WHEN 'admin' THEN 'Admin'
      WHEN 'manager' THEN 'Manager'
      WHEN 'hr_admin' THEN 'HR Admin'
      WHEN 'sup_admin' THEN 'Supervisor'
      WHEN 'office_admin' THEN 'Office Admin'
      WHEN 'marketing_admin' THEN 'Marketing Admin'
      WHEN 'user' THEN 'Team Member'
      ELSE COALESCE(OLD.role, 'Unknown')
    END;
    
    new_role_name := CASE NEW.role
      WHEN 'super_admin' THEN 'Super Admin'
      WHEN 'admin' THEN 'Admin'
      WHEN 'manager' THEN 'Manager'
      WHEN 'hr_admin' THEN 'HR Admin'
      WHEN 'sup_admin' THEN 'Supervisor'
      WHEN 'office_admin' THEN 'Office Admin'
      WHEN 'marketing_admin' THEN 'Marketing Admin'
      WHEN 'user' THEN 'Team Member'
      ELSE COALESCE(NEW.role, 'Unknown')
    END;

    -- Notify the user whose role changed
    INSERT INTO public.notifications (
      profile_id,
      type,
      category,
      title,
      body,
      data,
      requires_action,
      is_read
    ) VALUES (
      NEW.id,
      'role_changed',
      'hr',
      '🔑 Your Access Level Has Changed',
      format('Your role has been updated from %s to %s. Your permissions may have changed.', old_role_name, new_role_name),
      jsonb_build_object(
        'old_role', OLD.role,
        'new_role', NEW.role,
        'old_role_name', old_role_name,
        'new_role_name', new_role_name,
        'url', '/profile',
        'action_label', 'View Profile'
      ),
      true,
      false
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_role_change ON public.profiles;
CREATE TRIGGER trigger_notify_role_change
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_role_change();

COMMENT ON FUNCTION notify_role_change() IS 
  'Notifies a user when their access level/role is changed by an admin.';

-- ============================================================================
-- 5. FIX: Employee Termination — also notify the employee's direct manager
-- Previously only admins were notified. Now the manager gets a specific alert.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_admins_on_employee_termination()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
  manager_record RECORD;
  employee_name TEXT;
  notification_title TEXT;
  notification_body TEXT;
BEGIN
  IF (
    (OLD.employment_status IS DISTINCT FROM NEW.employment_status AND NEW.employment_status = 'terminated')
    OR (OLD.employment_status IS DISTINCT FROM NEW.employment_status AND NEW.employment_status = 'inactive')
  ) THEN
    
    employee_name := COALESCE(NEW.preferred_name, NEW.first_name) || ' ' || NEW.last_name;
    notification_title := 'URGENT: Employee Deactivated - ' || employee_name;
    notification_body := 'This employee has been marked as inactive/terminated. Please immediately review their profile to revoke system access, retrieve physical assets (keys, uniform), and finalize payroll.';
    
    -- Notify all admin users
    FOR admin_record IN
      SELECT id FROM public.profiles
      WHERE role IN ('admin', 'super_admin')
        AND is_active = true
    LOOP
      INSERT INTO public.notifications (
        profile_id, type, category, title, body, data, requires_action, is_read, created_at
      ) VALUES (
        admin_record.id,
        'admin_alert',
        'hr',
        notification_title,
        notification_body,
        jsonb_build_object(
          'employee_id', NEW.id,
          'employee_name', employee_name,
          'previous_status', OLD.employment_status,
          'new_status', NEW.employment_status,
          'termination_date', NEW.termination_date,
          'termination_reason', NEW.termination_reason,
          'url', '/roster/' || NEW.id::text,
          'action_label', 'Review Employee'
        ),
        true,
        false,
        NOW()
      );
    END LOOP;

    -- Notify the employee's direct manager (if different from admin)
    IF NEW.manager_employee_id IS NOT NULL THEN
      SELECT p.id INTO manager_record
      FROM public.profiles p
      JOIN public.employees e ON e.profile_id = p.id
      WHERE e.id = NEW.manager_employee_id
        AND p.is_active = true;
      
      IF manager_record.id IS NOT NULL THEN
        -- Check this manager wasn't already notified as an admin
        IF NOT EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = manager_record.id
          AND role IN ('admin', 'super_admin')
        ) THEN
          INSERT INTO public.notifications (
            profile_id, type, category, title, body, data, requires_action, is_read, created_at
          ) VALUES (
            manager_record.id,
            'team_change_alert',
            'hr',
            '📋 Team Member Departing: ' || employee_name,
            format('%s has been marked as %s. Please review any pending assignments, shift coverage, and knowledge transfer.', 
              employee_name, NEW.employment_status),
            jsonb_build_object(
              'employee_id', NEW.id,
              'employee_name', employee_name,
              'new_status', NEW.employment_status,
              'url', '/roster/' || NEW.id::text,
              'action_label', 'Review'
            ),
            true,
            false,
            NOW()
          );
        END IF;
      END IF;
    END IF;
    
    -- Log the termination event to audit logs
    INSERT INTO public.audit_logs (
      action, entity_type, entity_id, metadata, occurred_at
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

COMMENT ON FUNCTION notify_admins_on_employee_termination() IS 
  'Notifies admins AND direct managers when an employee is terminated/deactivated. Updated in migration 250.';

-- ============================================================================
-- 6. ADD: action_label column to notifications if missing
-- Several notification inserts reference action_label in data JSONB, but 
-- for consistency the column should exist at top level too.
-- ============================================================================

ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS action_label TEXT;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This migration fixes:
-- 1. publish_schedule_week() RPC — corrected column names (profile_id, body, type, category, data)
-- 2. Added INSERT + admin SELECT RLS policies on notifications table
-- 3. Time-off notifications now go to admins, managers, AND supervisors
-- 4. New trigger: role change notifications for affected users
-- 5. Termination trigger now also notifies the employee's direct manager
-- 6. Added action_label column to notifications table
