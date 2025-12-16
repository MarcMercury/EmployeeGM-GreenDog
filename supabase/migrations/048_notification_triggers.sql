-- Migration: Notification Triggers
-- Fixes existing triggers and adds admin notifications for time off requests

-- =====================================================
-- FIX: Time Off Request Trigger (was pointing to wrong table)
-- =====================================================

-- Drop the incorrect trigger if it exists (note: table is time_off_requests not pto_requests)
DROP TRIGGER IF EXISTS trigger_notify_pto_change ON public.time_off_requests;

-- Create corrected trigger function for time off notifications
CREATE OR REPLACE FUNCTION notify_time_off_change()
RETURNS trigger AS $$
DECLARE
  employee_record RECORD;
  admin_profile RECORD;
  type_name TEXT;
BEGIN
  -- Get employee info
  SELECT e.first_name, e.last_name, e.profile_id INTO employee_record
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

  -- Notify admins when a new time off request is submitted
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    FOR admin_profile IN 
      SELECT p.id FROM public.profiles p
      WHERE p.role = 'admin'
        AND p.id != employee_record.profile_id  -- Don't notify if employee is admin
    LOOP
      INSERT INTO public.notifications (
        profile_id,
        type,
        category,
        title,
        body,
        data,
        requires_action
      ) VALUES (
        admin_profile.id,
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
        true  -- Requires action
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on the correct table
DROP TRIGGER IF EXISTS trigger_notify_time_off_change ON public.time_off_requests;
CREATE TRIGGER trigger_notify_time_off_change
  AFTER INSERT OR UPDATE ON public.time_off_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_time_off_change();

-- =====================================================
-- FIX: Employee Skills Trigger (verify correct table name)
-- =====================================================

-- Update the skills notification function to handle skill_library
CREATE OR REPLACE FUNCTION notify_employee_skill_change()
RETURNS trigger AS $$
DECLARE
  skill_name TEXT;
  employee_profile_id UUID;
BEGIN
  -- Get skill name from skill_library
  SELECT name INTO skill_name
  FROM public.skill_library
  WHERE id = NEW.skill_id;

  -- Get employee's profile_id
  SELECT profile_id INTO employee_profile_id
  FROM public.employees
  WHERE id = NEW.employee_id;

  IF employee_profile_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    profile_id,
    type,
    category,
    title,
    body,
    data,
    requires_action
  ) VALUES (
    employee_profile_id,
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'skill_added'
      WHEN NEW.proficiency_level > COALESCE(OLD.proficiency_level, 0) THEN 'skill_improved'
      ELSE 'skill_updated'
    END,
    'skills',
    CASE 
      WHEN TG_OP = 'INSERT' THEN '⭐ New Skill Added!'
      WHEN NEW.proficiency_level > COALESCE(OLD.proficiency_level, 0) THEN '🎯 Skill Level Up!'
      ELSE 'Skill Updated'
    END,
    CASE 
      WHEN TG_OP = 'INSERT' THEN format('"%s" has been added to your skill profile.', COALESCE(skill_name, 'A skill'))
      WHEN NEW.proficiency_level > COALESCE(OLD.proficiency_level, 0) THEN format('Your "%s" skill has improved to level %s!', COALESCE(skill_name, 'skill'), NEW.proficiency_level)
      ELSE format('Your "%s" skill has been updated.', COALESCE(skill_name, 'skill'))
    END,
    jsonb_build_object(
      'skill_name', skill_name,
      'skill_id', NEW.skill_id,
      'proficiency_level', NEW.proficiency_level,
      'url', '/skills'
    ),
    false
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on employee_skills table
DROP TRIGGER IF EXISTS trigger_notify_skill_change ON public.employee_skills;
DROP TRIGGER IF EXISTS trigger_notify_employee_skill_change ON public.employee_skills;
CREATE TRIGGER trigger_notify_employee_skill_change
  AFTER INSERT OR UPDATE ON public.employee_skills
  FOR EACH ROW
  EXECUTE FUNCTION notify_employee_skill_change();

-- =====================================================
-- NEW: Schedule Assignment Notification (when shifts published)
-- =====================================================

CREATE OR REPLACE FUNCTION notify_shift_published()
RETURNS trigger AS $$
DECLARE
  employee_profile_id UUID;
  shift_date DATE;
BEGIN
  -- Only notify when status changes to 'scheduled' (published)
  IF NEW.status = 'scheduled' AND (OLD.status IS NULL OR OLD.status != 'scheduled') THEN
    -- Get employee's profile_id
    SELECT profile_id INTO employee_profile_id
    FROM public.employees
    WHERE id = NEW.employee_id;

    IF employee_profile_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Extract date from start_at
    shift_date := NEW.start_at::date;

    INSERT INTO public.notifications (
      profile_id,
      type,
      category,
      title,
      body,
      data,
      requires_action
    ) VALUES (
      employee_profile_id,
      'schedule_published',
      'schedule',
      '📅 New Shift Scheduled',
      format('You have been scheduled to work on %s', to_char(shift_date, 'Day, Mon DD, YYYY')),
      jsonb_build_object(
        'shift_id', NEW.id,
        'start_at', NEW.start_at,
        'end_at', NEW.end_at,
        'location_id', NEW.location_id,
        'role', NEW.role_required,
        'url', '/my-schedule'
      ),
      false
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on shifts table
DROP TRIGGER IF EXISTS trigger_notify_shift_published ON public.shifts;
CREATE TRIGGER trigger_notify_shift_published
  AFTER INSERT OR UPDATE ON public.shifts
  FOR EACH ROW
  EXECUTE FUNCTION notify_shift_published();

-- =====================================================
-- COMMENT for documentation
-- =====================================================
COMMENT ON FUNCTION notify_time_off_change() IS 'Notifies employee on time off status changes and admins on new requests';
COMMENT ON FUNCTION notify_employee_skill_change() IS 'Notifies employee when their skills are added or updated';
COMMENT ON FUNCTION notify_shift_published() IS 'Notifies employee when a shift is published to their schedule';
