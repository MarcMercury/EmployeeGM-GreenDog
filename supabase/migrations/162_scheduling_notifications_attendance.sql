-- ============================================================================
-- MIGRATION 162: Scheduling Notifications & Attendance Integration
-- Fixes gaps identified in scheduling system audit:
-- 1. Enable shift assignment notifications
-- 2. Auto-populate attendance from completed shifts
-- ============================================================================

-- ============================================================================
-- 1. SHIFT ASSIGNMENT NOTIFICATION TRIGGER
-- Creates in-app notification when employee is assigned to a shift
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_shift_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_profile_id UUID;
  v_shift_date DATE;
  v_location_name TEXT;
BEGIN
  -- Only trigger when employee_id changes from NULL to a value (assignment)
  -- or when a new shift is created with an employee
  IF (TG_OP = 'INSERT' AND NEW.employee_id IS NOT NULL) OR
     (TG_OP = 'UPDATE' AND OLD.employee_id IS NULL AND NEW.employee_id IS NOT NULL) THEN
    
    -- Get profile_id from employee
    SELECT profile_id INTO v_profile_id
    FROM employees
    WHERE id = NEW.employee_id;
    
    -- Get shift date and location
    v_shift_date := DATE(NEW.start_at);
    
    SELECT name INTO v_location_name
    FROM locations
    WHERE id = NEW.location_id;
    
    -- Only create notification if profile exists and shift is published
    IF v_profile_id IS NOT NULL AND NEW.status IN ('published', 'scheduled') THEN
      INSERT INTO notifications (
        profile_id,
        type,
        title,
        body,
        data,
        is_read,
        created_at
      ) VALUES (
        v_profile_id,
        'schedule_assigned',
        'New Shift Assigned',
        format('You have been assigned a shift on %s at %s', 
          to_char(v_shift_date, 'Mon DD, YYYY'),
          COALESCE(v_location_name, 'TBD')),
        jsonb_build_object(
          'shift_id', NEW.id,
          'shift_date', v_shift_date,
          'location', v_location_name,
          'start_time', to_char(NEW.start_at, 'HH24:MI'),
          'end_time', to_char(NEW.end_at, 'HH24:MI'),
          'url', '/my-schedule'
        ),
        false,
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS trigger_notify_shift_assignment ON shifts;
CREATE TRIGGER trigger_notify_shift_assignment
  AFTER INSERT OR UPDATE ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION notify_shift_assignment();

COMMENT ON FUNCTION notify_shift_assignment() IS 
  'Creates in-app notification when an employee is assigned to a shift';

-- ============================================================================
-- 2. SHIFT UNASSIGNMENT NOTIFICATION
-- Notifies employee when they are removed from a shift
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_shift_unassignment()
RETURNS TRIGGER AS $$
DECLARE
  v_profile_id UUID;
  v_shift_date DATE;
BEGIN
  -- Only trigger when employee_id changes from a value to NULL (unassignment)
  IF TG_OP = 'UPDATE' AND OLD.employee_id IS NOT NULL AND NEW.employee_id IS NULL THEN
    
    -- Get profile_id from the OLD employee
    SELECT profile_id INTO v_profile_id
    FROM employees
    WHERE id = OLD.employee_id;
    
    v_shift_date := DATE(OLD.start_at);
    
    IF v_profile_id IS NOT NULL THEN
      INSERT INTO notifications (
        profile_id,
        type,
        title,
        body,
        data,
        is_read,
        created_at
      ) VALUES (
        v_profile_id,
        'schedule_removed',
        'Shift Removed',
        format('Your shift on %s has been removed from the schedule', 
          to_char(v_shift_date, 'Mon DD, YYYY')),
        jsonb_build_object(
          'shift_date', v_shift_date,
          'url', '/my-schedule'
        ),
        false,
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_shift_unassignment ON shifts;
CREATE TRIGGER trigger_notify_shift_unassignment
  AFTER UPDATE ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION notify_shift_unassignment();

-- ============================================================================
-- 3. AUTO-POPULATE ATTENDANCE FROM COMPLETED SHIFTS
-- When a shift is marked as completed, create an attendance record
-- ============================================================================

CREATE OR REPLACE FUNCTION populate_attendance_from_shift()
RETURNS TRIGGER AS $$
DECLARE
  v_time_entry RECORD;
  v_attendance_status TEXT;
  v_minutes_late INTEGER := 0;
  v_penalty_weight NUMERIC(3,2) := 0.0;
  v_grace_period INTEGER := 5; -- 5 minute grace period
BEGIN
  -- Only trigger when status changes to 'completed'
  IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    -- Skip if no employee assigned
    IF NEW.employee_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Check if attendance record already exists
    IF EXISTS (
      SELECT 1 FROM attendance 
      WHERE shift_id = NEW.id AND employee_id = NEW.employee_id
    ) THEN
      RETURN NEW;
    END IF;
    
    -- Find matching time entry for this shift
    SELECT * INTO v_time_entry
    FROM time_entries
    WHERE shift_id = NEW.id
      AND employee_id = NEW.employee_id
    ORDER BY clock_in_at ASC
    LIMIT 1;
    
    -- Determine attendance status
    IF v_time_entry.id IS NOT NULL AND v_time_entry.clock_in_at IS NOT NULL THEN
      -- Calculate minutes late
      v_minutes_late := GREATEST(0, 
        EXTRACT(EPOCH FROM (v_time_entry.clock_in_at - NEW.start_at)) / 60
      )::INTEGER;
      
      IF v_minutes_late <= v_grace_period THEN
        v_attendance_status := 'present';
        v_penalty_weight := 0.0;
      ELSE
        v_attendance_status := 'late';
        v_penalty_weight := 1.0;
      END IF;
    ELSE
      -- No time entry found - check if shift was in the past
      IF NEW.start_at < NOW() - INTERVAL '1 hour' THEN
        v_attendance_status := 'no_show';
        v_penalty_weight := 1.0;
      ELSE
        v_attendance_status := 'present'; -- Assume present if recent
        v_penalty_weight := 0.0;
      END IF;
    END IF;
    
    -- Insert attendance record
    INSERT INTO attendance (
      employee_id,
      shift_id,
      shift_date,
      scheduled_start,
      actual_start,
      status,
      minutes_late,
      penalty_weight,
      created_at,
      updated_at
    ) VALUES (
      NEW.employee_id,
      NEW.id,
      DATE(NEW.start_at),
      NEW.start_at,
      v_time_entry.clock_in_at,
      v_attendance_status,
      v_minutes_late,
      v_penalty_weight,
      NOW(),
      NOW()
    )
    ON CONFLICT (employee_id, shift_id) 
    WHERE shift_id IS NOT NULL
    DO UPDATE SET
      status = EXCLUDED.status,
      actual_start = EXCLUDED.actual_start,
      minutes_late = EXCLUDED.minutes_late,
      penalty_weight = EXCLUDED.penalty_weight,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_populate_attendance ON shifts;
CREATE TRIGGER trigger_populate_attendance
  AFTER UPDATE ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION populate_attendance_from_shift();

COMMENT ON FUNCTION populate_attendance_from_shift() IS 
  'Auto-populates attendance table when shifts are marked as completed';

-- ============================================================================
-- 4. UPDATE notifications TABLE - Add category column if missing
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'category'
  ) THEN
    ALTER TABLE notifications ADD COLUMN category TEXT DEFAULT 'general';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'requires_action'
  ) THEN
    ALTER TABLE notifications ADD COLUMN requires_action BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ============================================================================
-- 5. ADD NOTIFICATION TRIGGER SEED DATA FOR SCHEDULING
-- ============================================================================

INSERT INTO notification_triggers (name, event_type, description, channel_target, send_dm, message_template)
VALUES 
  ('Shift Assigned', 'shift_assigned', 'Notification when employee is assigned to a shift', NULL, true, '📅 You have been assigned a new shift on {{shift_date}} at {{location}}.'),
  ('Shift Removed', 'shift_removed', 'Notification when employee is removed from a shift', NULL, true, '📅 Your shift on {{shift_date}} has been removed.'),
  ('Schedule Week Published', 'schedule_week_published', 'Notification when entire week schedule is published', '#schedule', false, '📅 The schedule for week of {{week_start}} has been published. Check your shifts!')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This migration adds:
-- 1. Trigger for shift assignment notifications (in-app)
-- 2. Trigger for shift unassignment notifications (in-app)
-- 3. Trigger to auto-populate attendance when shifts complete
-- 4. Notification trigger seed data for scheduling events
