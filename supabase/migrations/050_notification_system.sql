-- Migration: Comprehensive Notification System
-- Purpose: Auto-generate notifications for user-affecting actions
-- Excludes: HR/Admin-only actions like notes, internal memos

-- ============================================================================
-- PART 0: ADD MISSING COLUMNS TO NOTIFICATIONS TABLE
-- ============================================================================

-- Add category column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'category') THEN
    ALTER TABLE public.notifications ADD COLUMN category TEXT;
  END IF;
END $$;

-- Add requires_action column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'requires_action') THEN
    ALTER TABLE public.notifications ADD COLUMN requires_action BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add action_url column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'action_url') THEN
    ALTER TABLE public.notifications ADD COLUMN action_url TEXT;
  END IF;
END $$;

-- ============================================================================
-- PART 1: CORE NOTIFICATION HELPER FUNCTION
-- ============================================================================

-- Helper function to create notifications with deduplication
CREATE OR REPLACE FUNCTION create_notification(
  p_profile_id uuid,
  p_type text,
  p_category text,
  p_title text,
  p_body text,
  p_data jsonb DEFAULT '{}'::jsonb,
  p_requires_action boolean DEFAULT false,
  p_action_url text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  notification_id uuid;
BEGIN
  -- Prevent duplicate notifications within 5 minutes
  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE profile_id = p_profile_id
      AND type = p_type
      AND created_at > NOW() - INTERVAL '5 minutes'
      AND (p_data IS NULL OR data = p_data)
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (
    profile_id,
    type,
    category,
    title,
    body,
    data,
    requires_action,
    action_url
  ) VALUES (
    p_profile_id,
    p_type,
    p_category,
    p_title,
    p_body,
    p_data,
    p_requires_action,
    p_action_url
  )
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 2: EMPLOYEE/PROFILE NOTIFICATIONS
-- ============================================================================

-- Enhanced profile change notification
CREATE OR REPLACE FUNCTION notify_profile_change()
RETURNS trigger AS $$
DECLARE
  changed_fields text[];
  notification_body text;
BEGIN
  -- Skip if this is an internal/system update (no significant user-facing changes)
  IF TG_OP = 'UPDATE' THEN
    -- Check for meaningful changes
    IF OLD.first_name = NEW.first_name AND 
       OLD.last_name = NEW.last_name AND
       OLD.phone = NEW.phone AND
       OLD.email = NEW.email AND
       OLD.role = NEW.role AND
       OLD.hire_date = NEW.hire_date THEN
      RETURN NEW;
    END IF;
    
    -- Build list of changed fields
    changed_fields := ARRAY[]::text[];
    IF OLD.first_name != NEW.first_name THEN changed_fields := array_append(changed_fields, 'name'); END IF;
    IF OLD.last_name != NEW.last_name THEN changed_fields := array_append(changed_fields, 'name'); END IF;
    IF OLD.phone IS DISTINCT FROM NEW.phone THEN changed_fields := array_append(changed_fields, 'phone'); END IF;
    IF OLD.email IS DISTINCT FROM NEW.email THEN changed_fields := array_append(changed_fields, 'email'); END IF;
    IF OLD.role != NEW.role THEN changed_fields := array_append(changed_fields, 'role'); END IF;
    IF OLD.hire_date IS DISTINCT FROM NEW.hire_date THEN changed_fields := array_append(changed_fields, 'hire date'); END IF;
    
    notification_body := format('Your profile has been updated: %s', array_to_string(changed_fields, ', '));
  ELSE
    notification_body := 'Welcome! Your profile has been created.';
  END IF;

  PERFORM create_notification(
    NEW.id,
    CASE WHEN TG_OP = 'INSERT' THEN 'profile_created' ELSE 'profile_updated' END,
    'profile',
    CASE WHEN TG_OP = 'INSERT' THEN 'Welcome to TeamOS!' ELSE '📋 Profile Updated' END,
    notification_body,
    jsonb_build_object(
      'changed_fields', changed_fields,
      'url', '/profile'
    ),
    false,
    '/profile'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_notify_profile_change ON public.profiles;
CREATE TRIGGER trigger_notify_profile_change
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_profile_change();

-- ============================================================================
-- PART 3: EMPLOYEE RECORD CHANGES (employees table)
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_employee_change()
RETURNS trigger AS $$
DECLARE
  emp_profile_id uuid;
  changed_fields text[];
  notification_body text;
BEGIN
  -- Get the profile_id for this employee
  SELECT id INTO emp_profile_id
  FROM public.profiles
  WHERE auth_user_id = NEW.auth_user_id
  LIMIT 1;

  IF emp_profile_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- For updates, check what changed
  IF TG_OP = 'UPDATE' THEN
    -- Skip if no significant changes
    IF OLD.job_title IS NOT DISTINCT FROM NEW.job_title AND
       OLD.department IS NOT DISTINCT FROM NEW.department AND
       OLD.primary_location IS NOT DISTINCT FROM NEW.primary_location AND
       OLD.employment_type IS NOT DISTINCT FROM NEW.employment_type AND
       OLD.manager_id IS NOT DISTINCT FROM NEW.manager_id AND
       OLD.status IS NOT DISTINCT FROM NEW.status THEN
      RETURN NEW;
    END IF;

    changed_fields := ARRAY[]::text[];
    IF OLD.job_title IS DISTINCT FROM NEW.job_title THEN 
      changed_fields := array_append(changed_fields, 'job title'); 
    END IF;
    IF OLD.department IS DISTINCT FROM NEW.department THEN 
      changed_fields := array_append(changed_fields, 'department'); 
    END IF;
    IF OLD.primary_location IS DISTINCT FROM NEW.primary_location THEN 
      changed_fields := array_append(changed_fields, 'location'); 
    END IF;
    IF OLD.manager_id IS DISTINCT FROM NEW.manager_id THEN 
      changed_fields := array_append(changed_fields, 'manager'); 
    END IF;
    IF OLD.status IS DISTINCT FROM NEW.status THEN 
      changed_fields := array_append(changed_fields, 'status'); 
    END IF;

    notification_body := format('Your employee record has been updated: %s', array_to_string(changed_fields, ', '));
  ELSE
    notification_body := 'Your employee record has been created.';
  END IF;

  PERFORM create_notification(
    emp_profile_id,
    'employee_updated',
    'hr',
    '👤 Employee Record Updated',
    notification_body,
    jsonb_build_object(
      'employee_id', NEW.id,
      'changed_fields', changed_fields,
      'url', '/profile'
    ),
    false,
    '/profile'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_employee_change ON public.employees;
CREATE TRIGGER trigger_notify_employee_change
  AFTER INSERT OR UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION notify_employee_change();

-- ============================================================================
-- PART 4: TIME-OFF (PTO) NOTIFICATIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_time_off_status_change()
RETURNS trigger AS $$
DECLARE
  emp_profile_id uuid;
  pto_dates text;
BEGIN
  -- Get profile_id from employee_id
  IF NEW.employee_id IS NOT NULL THEN
    SELECT p.id INTO emp_profile_id
    FROM public.profiles p
    JOIN public.employees e ON e.auth_user_id = p.auth_user_id
    WHERE e.id = NEW.employee_id
    LIMIT 1;
  END IF;

  IF emp_profile_id IS NULL THEN
    RETURN NEW;
  END IF;

  pto_dates := format('%s to %s', 
    to_char(NEW.start_date, 'Mon DD'), 
    to_char(NEW.end_date, 'Mon DD, YYYY')
  );

  -- Only notify on status changes
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  PERFORM create_notification(
    emp_profile_id,
    'pto_' || NEW.status,
    'pto',
    CASE NEW.status
      WHEN 'approved' THEN '🎉 Time Off Approved!'
      WHEN 'denied' THEN '❌ Time Off Request Denied'
      WHEN 'pending' THEN '📤 Time Off Request Submitted'
      WHEN 'cancelled' THEN '🚫 Time Off Request Cancelled'
      ELSE '📅 Time Off Status Updated'
    END,
    CASE NEW.status
      WHEN 'approved' THEN format('Your time off request for %s has been approved.', pto_dates)
      WHEN 'denied' THEN format('Your time off request for %s has been denied.', pto_dates)
      WHEN 'pending' THEN format('Your time off request for %s is pending approval.', pto_dates)
      WHEN 'cancelled' THEN format('Your time off request for %s has been cancelled.', pto_dates)
      ELSE format('Your time off request for %s has been updated.', pto_dates)
    END,
    jsonb_build_object(
      'request_id', NEW.id,
      'start_date', NEW.start_date,
      'end_date', NEW.end_date,
      'status', NEW.status,
      'url', '/my-schedule'
    ),
    NEW.status = 'pending',  -- Pending requests may need action
    '/my-schedule'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_time_off_change ON public.time_off_requests;
CREATE TRIGGER trigger_notify_time_off_change
  AFTER INSERT OR UPDATE ON public.time_off_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_time_off_status_change();

-- ============================================================================
-- PART 5: SCHEDULE/SHIFT NOTIFICATIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_shift_change()
RETURNS trigger AS $$
DECLARE
  emp_profile_id uuid;
  shift_date_str text;
BEGIN
  -- Get profile_id for employee
  SELECT p.id INTO emp_profile_id
  FROM public.profiles p
  JOIN public.employees e ON e.auth_user_id = p.auth_user_id
  WHERE e.id = COALESCE(NEW.employee_id, OLD.employee_id)
  LIMIT 1;

  IF emp_profile_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  shift_date_str := to_char(COALESCE(NEW.schedule_date, OLD.schedule_date), 'Mon DD, YYYY');

  PERFORM create_notification(
    emp_profile_id,
    CASE TG_OP
      WHEN 'INSERT' THEN 'shift_assigned'
      WHEN 'UPDATE' THEN 'shift_updated'
      WHEN 'DELETE' THEN 'shift_removed'
    END,
    'schedule',
    CASE TG_OP
      WHEN 'INSERT' THEN '📅 New Shift Assigned'
      WHEN 'UPDATE' THEN '🔄 Shift Updated'
      WHEN 'DELETE' THEN '❌ Shift Removed'
    END,
    CASE TG_OP
      WHEN 'INSERT' THEN format('You have been assigned a shift on %s.', shift_date_str)
      WHEN 'UPDATE' THEN format('Your shift on %s has been updated.', shift_date_str)
      WHEN 'DELETE' THEN format('Your shift on %s has been removed.', shift_date_str)
    END,
    jsonb_build_object(
      'schedule_date', COALESCE(NEW.schedule_date, OLD.schedule_date),
      'url', '/my-schedule'
    ),
    TG_OP = 'INSERT',  -- New shifts may require acknowledgement
    '/my-schedule'
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_shift_change ON public.shifts;
CREATE TRIGGER trigger_notify_shift_change
  AFTER INSERT OR UPDATE OR DELETE ON public.shifts
  FOR EACH ROW
  EXECUTE FUNCTION notify_shift_change();

-- ============================================================================
-- PART 6: SKILLS/TRAINING NOTIFICATIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_skill_change()
RETURNS trigger AS $$
DECLARE
  emp_profile_id uuid;
  skill_name text;
BEGIN
  -- Get profile_id for employee
  SELECT p.id INTO emp_profile_id
  FROM public.profiles p
  JOIN public.employees e ON e.auth_user_id = p.auth_user_id
  WHERE e.id = NEW.employee_id
  LIMIT 1;

  IF emp_profile_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get skill name
  SELECT name INTO skill_name
  FROM public.skills
  WHERE id = NEW.skill_id;

  -- Skip if just updating timestamps
  IF TG_OP = 'UPDATE' AND OLD.rating = NEW.rating THEN
    RETURN NEW;
  END IF;

  PERFORM create_notification(
    emp_profile_id,
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'skill_added'
      WHEN NEW.rating > COALESCE(OLD.rating, 0) THEN 'skill_improved'
      ELSE 'skill_updated'
    END,
    'training',
    CASE 
      WHEN TG_OP = 'INSERT' THEN '🌟 New Skill Added'
      WHEN NEW.rating > COALESCE(OLD.rating, 0) THEN '📈 Skill Level Improved!'
      ELSE '🔧 Skill Updated'
    END,
    CASE 
      WHEN TG_OP = 'INSERT' THEN format('"%s" has been added to your skills profile.', skill_name)
      WHEN NEW.rating > COALESCE(OLD.rating, 0) THEN format('Your "%s" skill has improved to level %s!', skill_name, NEW.rating)
      ELSE format('Your "%s" skill has been updated.', skill_name)
    END,
    jsonb_build_object(
      'skill_name', skill_name,
      'skill_id', NEW.skill_id,
      'rating', NEW.rating,
      'url', '/my-skills'
    ),
    false,
    '/my-skills'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_skill_change ON public.employee_skills;
CREATE TRIGGER trigger_notify_skill_change
  AFTER INSERT OR UPDATE ON public.employee_skills
  FOR EACH ROW
  EXECUTE FUNCTION notify_skill_change();

-- ============================================================================
-- PART 7: GOAL NOTIFICATIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_goal_change()
RETURNS trigger AS $$
DECLARE
  emp_profile_id uuid;
BEGIN
  -- Get profile_id for employee
  SELECT p.id INTO emp_profile_id
  FROM public.profiles p
  JOIN public.employees e ON e.auth_user_id = p.auth_user_id
  WHERE e.id = NEW.employee_id
  LIMIT 1;

  IF emp_profile_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only notify on significant changes
  IF TG_OP = 'UPDATE' THEN
    IF OLD.completed = NEW.completed AND NEW.completed = true THEN
      -- Goal completed - special notification
      PERFORM create_notification(
        emp_profile_id,
        'goal_completed',
        'growth',
        '🎯 Goal Completed!',
        format('Congratulations! You have completed your goal: "%s"', NEW.title),
        jsonb_build_object(
          'goal_id', NEW.id,
          'goal_title', NEW.title,
          'url', '/growth'
        ),
        false,
        '/growth'
      );
    ELSIF OLD.progress IS DISTINCT FROM NEW.progress AND NEW.progress >= 75 AND OLD.progress < 75 THEN
      -- Milestone: 75% progress
      PERFORM create_notification(
        emp_profile_id,
        'goal_milestone',
        'growth',
        '📊 Goal Progress: 75%!',
        format('You''re 75%% of the way to completing "%s". Keep going!', NEW.title),
        jsonb_build_object(
          'goal_id', NEW.id,
          'goal_title', NEW.title,
          'progress', NEW.progress,
          'url', '/growth'
        ),
        false,
        '/growth'
      );
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM create_notification(
      emp_profile_id,
      'goal_assigned',
      'growth',
      '🎯 New Goal Assigned',
      format('A new goal has been set: "%s"', NEW.title),
      jsonb_build_object(
        'goal_id', NEW.id,
        'goal_title', NEW.title,
        'target_date', NEW.target_date,
        'url', '/growth'
      ),
      true,  -- Goals require action
      '/growth'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_goal_change ON public.employee_goals;
CREATE TRIGGER trigger_notify_goal_change
  AFTER INSERT OR UPDATE ON public.employee_goals
  FOR EACH ROW
  EXECUTE FUNCTION notify_goal_change();

-- ============================================================================
-- PART 8: CANDIDATE NOTIFICATIONS (for Recruiting managers)
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_candidate_status_change()
RETURNS trigger AS $$
DECLARE
  recruiter_profile_id uuid;
  candidate_name text;
BEGIN
  -- Only notify on stage/status changes
  IF TG_OP = 'UPDATE' AND OLD.stage = NEW.stage THEN
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
    '📋 Candidate Stage Updated',
    format('%s has moved to stage: %s', candidate_name, COALESCE(NEW.stage, 'New')),
    jsonb_build_object(
      'candidate_id', NEW.id,
      'candidate_name', candidate_name,
      'old_stage', OLD.stage,
      'new_stage', NEW.stage,
      'url', '/recruiting/pipeline'
    ),
    false,
    '/recruiting/pipeline'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_candidate_change ON public.candidates;
CREATE TRIGGER trigger_notify_candidate_change
  AFTER UPDATE ON public.candidates
  FOR EACH ROW
  EXECUTE FUNCTION notify_candidate_status_change();

-- ============================================================================
-- PART 9: DOCUMENT NOTIFICATIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_document_shared()
RETURNS trigger AS $$
DECLARE
  emp_profile_id uuid;
  doc_name text;
BEGIN
  -- Only notify when a document is assigned/shared with an employee
  IF NEW.employee_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get profile_id for employee
  SELECT p.id INTO emp_profile_id
  FROM public.profiles p
  JOIN public.employees e ON e.auth_user_id = p.auth_user_id
  WHERE e.id = NEW.employee_id
  LIMIT 1;

  IF emp_profile_id IS NULL THEN
    RETURN NEW;
  END IF;

  doc_name := COALESCE(NEW.title, NEW.file_name, 'Document');

  PERFORM create_notification(
    emp_profile_id,
    'document_shared',
    'hr',
    '📄 New Document Available',
    format('A new document has been shared with you: "%s"', doc_name),
    jsonb_build_object(
      'document_id', NEW.id,
      'document_name', doc_name,
      'url', '/my-documents'
    ),
    NEW.requires_signature = true,
    '/my-documents'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_document_shared ON public.employee_documents;
CREATE TRIGGER trigger_notify_document_shared
  AFTER INSERT ON public.employee_documents
  FOR EACH ROW
  EXECUTE FUNCTION notify_document_shared();

-- ============================================================================
-- PART 10: ANNOUNCEMENT NOTIFICATIONS (company-wide)
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_announcement()
RETURNS trigger AS $$
BEGIN
  -- Only for published announcements
  IF NEW.status != 'published' THEN
    RETURN NEW;
  END IF;

  -- Skip if it's just an update and was already published
  IF TG_OP = 'UPDATE' AND OLD.status = 'published' THEN
    RETURN NEW;
  END IF;

  -- Create notification for all active employees
  INSERT INTO public.notifications (
    profile_id,
    type,
    category,
    title,
    body,
    data,
    requires_action,
    action_url
  )
  SELECT 
    p.id,
    'announcement',
    'system',
    '📢 ' || LEFT(NEW.title, 50),
    LEFT(NEW.content, 200) || CASE WHEN LENGTH(NEW.content) > 200 THEN '...' ELSE '' END,
    jsonb_build_object(
      'announcement_id', NEW.id,
      'url', '/announcements'
    ),
    false,
    '/announcements'
  FROM public.profiles p
  WHERE p.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.profile_id = p.id
        AND n.type = 'announcement'
        AND n.data->>'announcement_id' = NEW.id::text
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_announcement ON public.announcements;
CREATE TRIGGER trigger_notify_announcement
  AFTER INSERT OR UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION notify_announcement();

-- ============================================================================
-- PART 11: PERFORMANCE REVIEW NOTIFICATIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_review_change()
RETURNS trigger AS $$
DECLARE
  emp_profile_id uuid;
  reviewer_name text;
BEGIN
  -- Get profile_id for the employee being reviewed
  SELECT p.id INTO emp_profile_id
  FROM public.profiles p
  WHERE p.id = NEW.reviewee_id
  LIMIT 1;

  IF emp_profile_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get reviewer name
  SELECT COALESCE(first_name || ' ' || last_name, 'Your reviewer') INTO reviewer_name
  FROM public.profiles
  WHERE id = NEW.reviewer_id;

  -- Only notify on significant status changes
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  PERFORM create_notification(
    emp_profile_id,
    'review_' || NEW.status,
    'growth',
    CASE NEW.status
      WHEN 'pending' THEN '📝 Performance Review Pending'
      WHEN 'in_progress' THEN '📝 Performance Review In Progress'
      WHEN 'completed' THEN '✅ Performance Review Completed'
      WHEN 'acknowledged' THEN '👍 Performance Review Acknowledged'
      ELSE '📝 Performance Review Updated'
    END,
    CASE NEW.status
      WHEN 'pending' THEN format('%s has initiated a performance review.', reviewer_name)
      WHEN 'completed' THEN format('Your performance review by %s has been completed.', reviewer_name)
      ELSE format('Your performance review status has been updated to: %s', NEW.status)
    END,
    jsonb_build_object(
      'review_id', NEW.id,
      'reviewer_name', reviewer_name,
      'status', NEW.status,
      'url', '/growth'
    ),
    NEW.status IN ('pending', 'completed'),  -- These require employee action
    '/growth'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_review_change ON public.performance_reviews;
CREATE TRIGGER trigger_notify_review_change
  AFTER INSERT OR UPDATE ON public.performance_reviews
  FOR EACH ROW
  EXECUTE FUNCTION notify_review_change();

-- ============================================================================
-- PART 12: RLS POLICY FOR NOTIFICATIONS
-- ============================================================================

-- Ensure users can only see their own notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (profile_id = auth.uid() OR profile_id IN (
    SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (profile_id = auth.uid() OR profile_id IN (
    SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
  ));

-- Service role can do everything
DROP POLICY IF EXISTS "Service role full access" ON public.notifications;
CREATE POLICY "Service role full access" ON public.notifications
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_notifications_profile_created 
ON public.notifications(profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_profile_unread 
ON public.notifications(profile_id, is_read) WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_type 
ON public.notifications(type);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION create_notification IS 'Helper to create notifications with built-in deduplication';
COMMENT ON FUNCTION notify_profile_change IS 'Notifies user when their profile is updated';
COMMENT ON FUNCTION notify_employee_change IS 'Notifies user when their employee record is updated';
COMMENT ON FUNCTION notify_time_off_status_change IS 'Notifies user on time off request status changes';
COMMENT ON FUNCTION notify_shift_change IS 'Notifies user when their shifts are created/updated/removed';
COMMENT ON FUNCTION notify_skill_change IS 'Notifies user when their skills are added/improved';
COMMENT ON FUNCTION notify_goal_change IS 'Notifies user when goals are assigned or completed';
COMMENT ON FUNCTION notify_candidate_status_change IS 'Notifies recruiters when candidate stages change';
COMMENT ON FUNCTION notify_document_shared IS 'Notifies user when a document is shared with them';
COMMENT ON FUNCTION notify_announcement IS 'Creates notifications for all active users on new announcements';
COMMENT ON FUNCTION notify_review_change IS 'Notifies employees about performance review updates';
