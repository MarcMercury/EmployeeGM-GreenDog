-- Fix notify_candidate_status_change() trigger function
-- The function referenced OLD.stage / NEW.stage but the candidates table
-- uses "status" not "stage". This caused a 400 error whenever a job_position
-- was deleted, because the FK SET NULL cascade triggered an UPDATE on
-- candidates which fired this function and crashed on the missing column.
--
-- Also removes the duplicate trigger (trigger_notify_candidate_change) that
-- was identical to trg_notify_candidate_status_change.

CREATE OR REPLACE FUNCTION public.notify_candidate_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  recruiter_profile_id uuid;
  candidate_name text;
BEGIN
  -- Only notify on status changes
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get the recruiter/owner's profile if assigned
  IF NEW.assigned_to IS NOT NULL THEN
    SELECT p.id INTO recruiter_profile_id
    FROM public.profiles p
    WHERE p.id = NEW.assigned_to
    LIMIT 1;
  END IF;

  IF recruiter_profile_id IS NULL THEN
    RETURN NEW;
  END IF;

  candidate_name := COALESCE(NEW.first_name || ' ' || NEW.last_name, 'Unknown');

  PERFORM create_notification(
    recruiter_profile_id,
    'candidate_stage_changed',
    'hr',
    '📋 Candidate Status Updated',
    format('%s has moved to status: %s', candidate_name, COALESCE(NEW.status, 'New')),
    jsonb_build_object(
      'candidate_id', NEW.id,
      'candidate_name', candidate_name,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'url', '/recruiting/pipeline'
    ),
    false,
    '/recruiting/pipeline'
  );

  RETURN NEW;
END;
$function$;

-- Remove duplicate trigger (both fired the same function)
DROP TRIGGER IF EXISTS trigger_notify_candidate_change ON candidates;
