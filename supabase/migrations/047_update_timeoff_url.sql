-- Migration: Update time off notification URL to point to combined my-schedule page
-- The my-time-off page has been merged into my-schedule with a tab parameter

-- Update the function that handles time off notifications
CREATE OR REPLACE FUNCTION handle_time_off_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification for the employee
  PERFORM create_notification(
    NEW.employee_id,
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'time_off_request_submitted'
      WHEN NEW.status = 'approved' THEN 'time_off_request_approved'
      WHEN NEW.status = 'denied' THEN 'time_off_request_denied'
      ELSE 'time_off_request_updated'
    END,
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'Time Off Request Submitted'
      WHEN NEW.status = 'approved' THEN 'Time Off Request Approved'
      WHEN NEW.status = 'denied' THEN 'Time Off Request Denied'
      ELSE 'Time Off Request Updated'
    END,
    CASE 
      WHEN TG_OP = 'INSERT' THEN format('Your time off request for %s - %s has been submitted.', to_char(NEW.start_date, 'Mon DD'), to_char(NEW.end_date, 'Mon DD'))
      WHEN NEW.status = 'approved' THEN format('Your time off request for %s - %s has been approved!', to_char(NEW.start_date, 'Mon DD'), to_char(NEW.end_date, 'Mon DD'))
      WHEN NEW.status = 'denied' THEN format('Your time off request for %s - %s has been denied.', to_char(NEW.start_date, 'Mon DD'), to_char(NEW.end_date, 'Mon DD'))
      ELSE format('Your time off request for %s - %s has been updated.', to_char(NEW.start_date, 'Mon DD'), to_char(NEW.end_date, 'Mon DD'))
    END,
    jsonb_build_object(
      'start_date', NEW.start_date,
      'end_date', NEW.end_date,
      'status', NEW.status,
      'url', '/my-schedule?tab=timeoff'
    ),
    NEW.status = 'pending'  -- Pending items may need follow-up
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
