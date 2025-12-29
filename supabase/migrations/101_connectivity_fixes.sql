-- =====================================================
-- Connectivity Fixes Migration
-- Migration 101 - Workflow Automation & Gap Fixes
-- =====================================================
-- This migration addresses gaps identified in the connectivity audit:
-- 1. Auto-sync attendance from shift completion and time entries
-- 2. Manager notifications for skill advancement
-- 3. Status constraint fixes for marketing_leads
-- 4. Shift status normalization

-- =====================================================
-- 1. ATTENDANCE AUTO-SYNC TRIGGERS
-- =====================================================

-- Trigger function: Sync attendance when shift status changes to completed/missed
CREATE OR REPLACE FUNCTION public.trigger_sync_attendance_on_shift_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when status changes to completed or missed
  IF (NEW.status IN ('completed', 'missed') AND 
      (OLD.status IS NULL OR OLD.status NOT IN ('completed', 'missed'))) THEN
    -- Call the existing sync function
    PERFORM public.sync_attendance_from_shift(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on shifts table
DROP TRIGGER IF EXISTS trg_shift_attendance_sync ON public.shifts;
CREATE TRIGGER trg_shift_attendance_sync
AFTER UPDATE ON public.shifts
FOR EACH ROW
EXECUTE FUNCTION public.trigger_sync_attendance_on_shift_complete();

-- Trigger function: Sync attendance when time_entry is created/updated with a shift_id
CREATE OR REPLACE FUNCTION public.trigger_sync_attendance_on_time_entry()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if there's a linked shift
  IF NEW.shift_id IS NOT NULL THEN
    PERFORM public.sync_attendance_from_shift(NEW.shift_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on time_entries table
DROP TRIGGER IF EXISTS trg_time_entry_attendance_sync ON public.time_entries;
CREATE TRIGGER trg_time_entry_attendance_sync
AFTER INSERT OR UPDATE ON public.time_entries
FOR EACH ROW
EXECUTE FUNCTION public.trigger_sync_attendance_on_time_entry();

-- =====================================================
-- 2. MANAGER NOTIFICATION FOR SKILL ADVANCEMENT
-- =====================================================

-- Enhanced skill change notification that also notifies the manager
CREATE OR REPLACE FUNCTION public.notify_skill_change_with_manager()
RETURNS TRIGGER AS $$
DECLARE
  v_employee_profile_id UUID;
  v_manager_profile_id UUID;
  v_skill_name TEXT;
  v_old_level INTEGER;
  v_notification_type TEXT;
  v_notification_title TEXT;
  v_notification_body TEXT;
  v_employee_name TEXT;
BEGIN
  -- Get skill name
  SELECT name INTO v_skill_name
  FROM public.skill_library
  WHERE id = NEW.skill_id;
  
  -- Get employee profile and name
  SELECT e.profile_id, CONCAT(e.first_name, ' ', e.last_name)
  INTO v_employee_profile_id, v_employee_name
  FROM public.employees e
  WHERE e.id = NEW.employee_id;
  
  -- Get manager's profile_id
  SELECT m.profile_id INTO v_manager_profile_id
  FROM public.employees e
  JOIN public.employees m ON e.manager_employee_id = m.id
  WHERE e.id = NEW.employee_id;
  
  -- Determine notification type and content
  v_old_level := COALESCE(OLD.level, 0);
  
  IF TG_OP = 'INSERT' THEN
    v_notification_type := 'skill_added';
    v_notification_title := '🎯 New Skill Added!';
    v_notification_body := format('Your "%s" skill has been added at level %s!', v_skill_name, NEW.level);
  ELSIF NEW.level > v_old_level THEN
    v_notification_type := 'skill_improved';
    v_notification_title := '🎯 Skill Level Up!';
    v_notification_body := format('Your "%s" skill has improved from level %s to level %s!', v_skill_name, v_old_level, NEW.level);
  ELSE
    v_notification_type := 'skill_updated';
    v_notification_title := '🎯 Skill Updated';
    v_notification_body := format('Your "%s" skill has been updated to level %s.', v_skill_name, NEW.level);
  END IF;
  
  -- Notify the employee
  IF v_employee_profile_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      profile_id,
      type,
      category,
      title,
      body,
      action_url,
      created_at
    ) VALUES (
      v_employee_profile_id,
      v_notification_type,
      'skills',
      v_notification_title,
      v_notification_body,
      '/people/my-skills',
      NOW()
    );
  END IF;
  
  -- Notify the manager if skill improved
  IF v_manager_profile_id IS NOT NULL AND NEW.level > v_old_level THEN
    INSERT INTO public.notifications (
      profile_id,
      type,
      category,
      title,
      body,
      action_url,
      created_at
    ) VALUES (
      v_manager_profile_id,
      'team_skill_improved',
      'team',
      '📊 Team Skill Update',
      format('%s has advanced their "%s" skill to level %s.', v_employee_name, v_skill_name, NEW.level),
      format('/employees/%s', NEW.employee_id),
      NOW()
    );
  END IF;
  
  -- If skill reaches level 4 or 5, also notify admins for certification review
  IF NEW.level >= 4 THEN
    INSERT INTO public.notifications (
      profile_id,
      type,
      category,
      title,
      body,
      action_url,
      created_at
    )
    SELECT 
      p.id,
      'skill_certification_review',
      'admin',
      '🏅 Skill Certification Review Needed',
      format('%s has reached level %s in "%s" and may require certification verification.', 
             v_employee_name, NEW.level, v_skill_name),
      format('/employees/%s', NEW.employee_id),
      NOW()
    FROM public.profiles p
    WHERE p.role = 'admin'
      AND p.id != COALESCE(v_employee_profile_id, '00000000-0000-0000-0000-000000000000');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace the existing trigger with the enhanced one
DROP TRIGGER IF EXISTS trigger_notify_employee_skill_change ON public.employee_skills;
DROP TRIGGER IF EXISTS trg_notify_skill_change_with_manager ON public.employee_skills;
CREATE TRIGGER trg_notify_skill_change_with_manager
AFTER INSERT OR UPDATE ON public.employee_skills
FOR EACH ROW
EXECUTE FUNCTION public.notify_skill_change_with_manager();

-- =====================================================
-- 3. FIX MARKETING_LEADS STATUS CONSTRAINT
-- =====================================================

-- Add 'qualified' to the status check constraint
DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE public.marketing_leads DROP CONSTRAINT IF EXISTS marketing_leads_status_check;
  
  -- Add new constraint with 'qualified' included
  ALTER TABLE public.marketing_leads 
  ADD CONSTRAINT marketing_leads_status_check 
  CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost'));
EXCEPTION
  WHEN undefined_table THEN
    -- Table doesn't exist, skip
    NULL;
  WHEN undefined_column THEN
    -- Column doesn't exist, skip
    NULL;
END $$;

-- =====================================================
-- 4. AUTO-COMPLETE PAST SHIFTS FUNCTION
-- =====================================================
-- This function can be called by a scheduled job to mark past shifts as completed

CREATE OR REPLACE FUNCTION public.auto_complete_past_shifts()
RETURNS TABLE (
  updated_count INTEGER,
  synced_count INTEGER
) AS $$
DECLARE
  v_updated_count INTEGER := 0;
  v_synced_count INTEGER := 0;
  v_shift RECORD;
BEGIN
  -- Mark published shifts that have ended as completed
  -- Only for shifts with an assigned employee that ended more than 1 hour ago
  FOR v_shift IN
    UPDATE public.shifts
    SET 
      status = 'completed',
      updated_at = NOW()
    WHERE status = 'published'
      AND end_at < NOW() - INTERVAL '1 hour'
      AND employee_id IS NOT NULL
    RETURNING id
  LOOP
    v_updated_count := v_updated_count + 1;
    
    -- Sync attendance for this shift
    BEGIN
      PERFORM public.sync_attendance_from_shift(v_shift.id);
      v_synced_count := v_synced_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Log but don't fail
      RAISE NOTICE 'Failed to sync attendance for shift %: %', v_shift.id, SQLERRM;
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_updated_count, v_synced_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.auto_complete_past_shifts() TO authenticated;

-- =====================================================
-- 5. CANDIDATE INTERVIEWS TABLE (For Multi-Round Tracking)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.candidate_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  
  -- Interview details
  interview_type TEXT NOT NULL DEFAULT 'initial' CHECK (interview_type IN (
    'phone_screen',
    'initial',
    'technical',
    'panel',
    'working_interview',
    'final',
    'other'
  )),
  round_number INTEGER NOT NULL DEFAULT 1,
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 30,
  location TEXT,
  video_link TEXT,
  
  -- Interviewer
  interviewer_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled',
    'in_progress',
    'completed',
    'cancelled',
    'no_show'
  )),
  
  -- Scoring (1-5 scale)
  technical_score INTEGER CHECK (technical_score BETWEEN 1 AND 5),
  communication_score INTEGER CHECK (communication_score BETWEEN 1 AND 5),
  cultural_fit_score INTEGER CHECK (cultural_fit_score BETWEEN 1 AND 5),
  overall_score INTEGER CHECK (overall_score BETWEEN 1 AND 5),
  
  -- Recommendation
  recommendation TEXT CHECK (recommendation IN (
    'strong_yes',
    'yes',
    'neutral',
    'no',
    'strong_no'
  )),
  
  -- Notes
  notes TEXT,
  strengths TEXT,
  concerns TEXT,
  
  -- Timestamps
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_candidate_interviews_candidate ON public.candidate_interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_interviews_interviewer ON public.candidate_interviews(interviewer_employee_id);
CREATE INDEX IF NOT EXISTS idx_candidate_interviews_scheduled ON public.candidate_interviews(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_candidate_interviews_status ON public.candidate_interviews(status);

-- RLS
ALTER TABLE public.candidate_interviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view interviews" ON public.candidate_interviews;
CREATE POLICY "Authenticated users can view interviews" ON public.candidate_interviews
FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage interviews" ON public.candidate_interviews;
CREATE POLICY "Admins can manage interviews" ON public.candidate_interviews
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role = 'admin'
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_interviews TO authenticated;

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_candidate_interview_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_candidate_interviews_updated ON public.candidate_interviews;
CREATE TRIGGER trg_candidate_interviews_updated
BEFORE UPDATE ON public.candidate_interviews
FOR EACH ROW EXECUTE FUNCTION update_candidate_interview_timestamp();

-- =====================================================
-- 6. SHADOW VISITS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.candidate_shadow_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  
  -- Visit details
  visit_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  
  -- Observer/Host
  host_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled',
    'completed',
    'cancelled',
    'no_show'
  )),
  
  -- Evaluation
  punctuality_score INTEGER CHECK (punctuality_score BETWEEN 1 AND 5),
  engagement_score INTEGER CHECK (engagement_score BETWEEN 1 AND 5),
  teamwork_score INTEGER CHECK (teamwork_score BETWEEN 1 AND 5),
  skill_demonstration_score INTEGER CHECK (skill_demonstration_score BETWEEN 1 AND 5),
  overall_impression TEXT CHECK (overall_impression IN (
    'excellent',
    'good',
    'acceptable',
    'concerning',
    'not_recommended'
  )),
  
  -- Notes
  observer_notes TEXT,
  candidate_questions TEXT,
  areas_of_strength TEXT,
  areas_for_development TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shadow_visits_candidate ON public.candidate_shadow_visits(candidate_id);
CREATE INDEX IF NOT EXISTS idx_shadow_visits_date ON public.candidate_shadow_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_shadow_visits_host ON public.candidate_shadow_visits(host_employee_id);

-- RLS
ALTER TABLE public.candidate_shadow_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view shadow visits" ON public.candidate_shadow_visits;
CREATE POLICY "Authenticated users can view shadow visits" ON public.candidate_shadow_visits
FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage shadow visits" ON public.candidate_shadow_visits;
CREATE POLICY "Admins can manage shadow visits" ON public.candidate_shadow_visits
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role = 'admin'
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_shadow_visits TO authenticated;

-- =====================================================
-- 7. HELPER FUNCTION: Get Training Courses for a Skill
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_skill_training_courses(p_skill_id UUID)
RETURNS TABLE (
  course_id UUID,
  title TEXT,
  description TEXT,
  skill_level_awarded INTEGER,
  estimated_duration INTEGER,
  is_required BOOLEAN,
  category TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tc.id as course_id,
    tc.title,
    tc.description,
    tc.skill_level_awarded,
    tc.estimated_duration,
    tc.is_required,
    tc.category
  FROM public.training_courses tc
  WHERE tc.skill_id = p_skill_id
    AND tc.status = 'published'
  ORDER BY tc.skill_level_awarded ASC, tc.title ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_skill_training_courses(UUID) TO authenticated;

-- =====================================================
-- 8. COMMENTS
-- =====================================================

COMMENT ON FUNCTION public.trigger_sync_attendance_on_shift_complete IS 'Automatically syncs attendance when a shift is marked completed or missed';
COMMENT ON FUNCTION public.trigger_sync_attendance_on_time_entry IS 'Automatically syncs attendance when a time entry is created or updated with a shift_id';
COMMENT ON FUNCTION public.notify_skill_change_with_manager IS 'Notifies employee and manager when skill levels change, and admins for certification-level skills';
COMMENT ON FUNCTION public.auto_complete_past_shifts IS 'Marks published shifts that have ended as completed and syncs attendance';
COMMENT ON TABLE public.candidate_interviews IS 'Tracks individual interview rounds with scoring for candidates';
COMMENT ON TABLE public.candidate_shadow_visits IS 'Tracks shadow/working interview visits with evaluations';
COMMENT ON FUNCTION public.get_skill_training_courses IS 'Returns available training courses for a specific skill';
