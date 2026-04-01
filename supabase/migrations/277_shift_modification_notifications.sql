-- ============================================================================
-- MIGRATION 277: Notify employees when published shifts are modified
-- Fixes gap: admins editing a published shift (time, location, status)
-- did NOT trigger any notification to the affected employee.
-- ============================================================================

-- Trigger function: fires on UPDATE to shifts table when key fields change
CREATE OR REPLACE FUNCTION notify_shift_modification()
RETURNS TRIGGER AS $$
DECLARE
  v_profile_id UUID;
  v_shift_date DATE;
  v_location_name TEXT;
  v_old_location TEXT;
  v_change_details TEXT := '';
BEGIN
  -- Only applies to published shifts with an assigned employee
  IF NEW.employee_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('published', 'scheduled') THEN
    RETURN NEW;
  END IF;

  -- Skip if this is handled by the assignment/unassignment triggers
  IF OLD.employee_id IS NULL AND NEW.employee_id IS NOT NULL THEN
    RETURN NEW; -- Handled by notify_shift_assignment
  END IF;
  IF OLD.employee_id IS NOT NULL AND NEW.employee_id IS NULL THEN
    RETURN NEW; -- Handled by notify_shift_unassignment
  END IF;

  -- Detect meaningful changes (time, location, cancellation)
  IF OLD.start_at = NEW.start_at
     AND OLD.end_at = NEW.end_at
     AND COALESCE(OLD.location_id, '00000000-0000-0000-0000-000000000000') =
         COALESCE(NEW.location_id, '00000000-0000-0000-0000-000000000000')
     AND OLD.status = NEW.status
  THEN
    -- No meaningful change
    RETURN NEW;
  END IF;

  -- Get profile_id
  SELECT profile_id INTO v_profile_id
  FROM employees
  WHERE id = NEW.employee_id;

  IF v_profile_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_shift_date := DATE(NEW.start_at);

  -- Build change description
  IF OLD.start_at != NEW.start_at OR OLD.end_at != NEW.end_at THEN
    v_change_details := format('Time changed to %s – %s',
      to_char(NEW.start_at, 'HH12:MI AM'),
      to_char(NEW.end_at, 'HH12:MI AM'));
  END IF;

  IF COALESCE(OLD.location_id, '00000000-0000-0000-0000-000000000000') !=
     COALESCE(NEW.location_id, '00000000-0000-0000-0000-000000000000') THEN
    SELECT name INTO v_location_name FROM locations WHERE id = NEW.location_id;
    SELECT name INTO v_old_location FROM locations WHERE id = OLD.location_id;
    IF v_change_details != '' THEN
      v_change_details := v_change_details || '. ';
    END IF;
    v_change_details := v_change_details || format('Location changed from %s to %s',
      COALESCE(v_old_location, 'TBD'), COALESCE(v_location_name, 'TBD'));
  END IF;

  IF OLD.status != NEW.status AND NEW.status = 'cancelled' THEN
    v_change_details := 'Shift has been cancelled';
  END IF;

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
    'schedule_modified',
    'Shift Updated',
    format('Your shift on %s has been updated. %s',
      to_char(v_shift_date, 'Mon DD, YYYY'),
      v_change_details),
    jsonb_build_object(
      'shift_id', NEW.id,
      'shift_date', v_shift_date,
      'old_start', to_char(OLD.start_at, 'HH24:MI'),
      'new_start', to_char(NEW.start_at, 'HH24:MI'),
      'old_end', to_char(OLD.end_at, 'HH24:MI'),
      'new_end', to_char(NEW.end_at, 'HH24:MI'),
      'url', '/my-schedule'
    ),
    false,
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old trigger if exists, then create
DROP TRIGGER IF EXISTS trigger_notify_shift_modification ON shifts;
CREATE TRIGGER trigger_notify_shift_modification
  AFTER UPDATE ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION notify_shift_modification();

COMMENT ON FUNCTION notify_shift_modification() IS
  'Notifies assigned employee when a published shift time, location, or status changes';
