-- ============================================================================
-- MIGRATION 201: Schedule Review/Approval Workflow
-- Adds submit-for-review → approve → publish pipeline
-- Adds collaborative editing support via realtime
-- ============================================================================

-- ============================================================================
-- 1. ALTER schedule_drafts: add new statuses and review columns
-- ============================================================================

-- Drop the old CHECK constraint and add new one with additional statuses
ALTER TABLE schedule_drafts DROP CONSTRAINT IF EXISTS schedule_drafts_status_check;
ALTER TABLE schedule_drafts ADD CONSTRAINT schedule_drafts_status_check
  CHECK (status IN ('building', 'reviewing', 'validated', 'submitted_for_review', 'approved', 'published', 'archived'));

-- Add review/approval tracking columns
ALTER TABLE schedule_drafts
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_notes TEXT DEFAULT '';

-- Index for the new statuses
CREATE INDEX IF NOT EXISTS idx_schedule_drafts_submitted ON schedule_drafts(status) WHERE status = 'submitted_for_review';
CREATE INDEX IF NOT EXISTS idx_schedule_drafts_approved ON schedule_drafts(status) WHERE status = 'approved';

-- ============================================================================
-- 2. SUBMIT DRAFT FOR REVIEW
-- Transitions: validated → submitted_for_review
-- ============================================================================
CREATE OR REPLACE FUNCTION submit_draft_for_review(p_draft_id UUID, p_notes TEXT DEFAULT '')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_draft RECORD;
  v_profile_id UUID;
  v_profile_name TEXT;
BEGIN
  -- Require schedule admin role (SECURITY DEFINER bypasses RLS)
  IF NOT public.is_schedule_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions: schedule admin role required');
  END IF;

  -- Get profile ID for current user
  SELECT p.id, (p.first_name || ' ' || p.last_name) 
  INTO v_profile_id, v_profile_name
  FROM profiles p WHERE p.auth_user_id = auth.uid();

  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
  END IF;

  -- Get draft
  SELECT * INTO v_draft FROM schedule_drafts WHERE id = p_draft_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Draft not found');
  END IF;

  -- Must be validated before submitting (all required slots filled)
  IF v_draft.status NOT IN ('validated') THEN
    RETURN jsonb_build_object('success', false, 'error', 
      'Draft must be validated before submitting for review. Current status: ' || v_draft.status);
  END IF;

  -- Update draft status (append notes to preserve review history)
  UPDATE schedule_drafts
  SET 
    status = 'submitted_for_review',
    submitted_by = v_profile_id,
    submitted_at = now(),
    review_notes = CASE
      WHEN p_notes IS NOT NULL AND p_notes != '' THEN
        CASE WHEN review_notes IS NOT NULL AND review_notes != ''
          THEN review_notes || E'\n' || 'Submitted: ' || p_notes
          ELSE 'Submitted: ' || p_notes
        END
      ELSE review_notes
    END,
    updated_at = now()
  WHERE id = p_draft_id;

  RETURN jsonb_build_object(
    'success', true,
    'draft_id', p_draft_id,
    'submitted_by', v_profile_name,
    'submitted_at', now()
  );
END;
$$;

-- ============================================================================
-- 3. APPROVE SCHEDULE DRAFT
-- Transitions: submitted_for_review → approved
-- ============================================================================
CREATE OR REPLACE FUNCTION approve_schedule_draft(p_draft_id UUID, p_notes TEXT DEFAULT '')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_draft RECORD;
  v_profile_id UUID;
  v_profile_name TEXT;
  v_submitter_name TEXT;
BEGIN
  -- Require schedule admin role (SECURITY DEFINER bypasses RLS)
  IF NOT public.is_schedule_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions: schedule admin role required');
  END IF;

  -- Get profile ID for current user
  SELECT p.id, (p.first_name || ' ' || p.last_name)
  INTO v_profile_id, v_profile_name
  FROM profiles p WHERE p.auth_user_id = auth.uid();

  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
  END IF;

  -- Get draft
  SELECT * INTO v_draft FROM schedule_drafts WHERE id = p_draft_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Draft not found');
  END IF;

  -- Must be submitted for review
  IF v_draft.status != 'submitted_for_review' THEN
    RETURN jsonb_build_object('success', false, 'error', 
      'Draft must be submitted for review before approving. Current status: ' || v_draft.status);
  END IF;

  -- Prevent self-approval: submitter cannot approve their own schedule
  IF v_draft.submitted_by = v_profile_id THEN
    RETURN jsonb_build_object('success', false, 'error',
      'Cannot approve your own submission. A different reviewer must approve.');
  END IF;

  -- Get submitter name for notification
  SELECT (first_name || ' ' || last_name) INTO v_submitter_name
  FROM profiles WHERE id = v_draft.submitted_by;

  -- Update draft status
  UPDATE schedule_drafts
  SET
    status = 'approved',
    approved_by = v_profile_id,
    approved_at = now(),
    reviewed_by = v_profile_id,
    reviewed_at = now(),
    review_notes = CASE 
      WHEN p_notes IS NOT NULL AND p_notes != '' THEN 
        COALESCE(review_notes || E'\n', '') || 'Approved: ' || p_notes
      ELSE review_notes
    END,
    updated_at = now()
  WHERE id = p_draft_id;

  RETURN jsonb_build_object(
    'success', true,
    'draft_id', p_draft_id,
    'approved_by', v_profile_name,
    'approved_at', now(),
    'submitter_name', v_submitter_name,
    'submitted_by_id', v_draft.submitted_by
  );
END;
$$;

-- ============================================================================
-- 4. REQUEST CHANGES (Send back to building)
-- Transitions: submitted_for_review → building
-- ============================================================================
CREATE OR REPLACE FUNCTION request_schedule_changes(p_draft_id UUID, p_notes TEXT DEFAULT '')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_draft RECORD;
  v_profile_id UUID;
  v_profile_name TEXT;
BEGIN
  -- Require schedule admin role (SECURITY DEFINER bypasses RLS)
  IF NOT public.is_schedule_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions: schedule admin role required');
  END IF;

  -- Get profile ID
  SELECT p.id, (p.first_name || ' ' || p.last_name)
  INTO v_profile_id, v_profile_name
  FROM profiles p WHERE p.auth_user_id = auth.uid();

  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
  END IF;

  -- Get draft
  SELECT * INTO v_draft FROM schedule_drafts WHERE id = p_draft_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Draft not found');
  END IF;

  -- Must be submitted for review
  IF v_draft.status != 'submitted_for_review' THEN
    RETURN jsonb_build_object('success', false, 'error', 
      'Can only request changes on drafts submitted for review. Current status: ' || v_draft.status);
  END IF;

  -- Send back to building
  UPDATE schedule_drafts
  SET
    status = 'building',
    reviewed_by = v_profile_id,
    reviewed_at = now(),
    review_notes = CASE 
      WHEN p_notes IS NOT NULL AND p_notes != '' THEN 
        COALESCE(review_notes || E'\n', '') || 'Changes requested: ' || p_notes
      ELSE review_notes
    END,
    -- Clear submission tracking so it can be re-submitted
    submitted_by = NULL,
    submitted_at = NULL,
    approved_by = NULL,
    approved_at = NULL,
    -- Clear validation since changes are expected
    validated_at = NULL,
    coverage_score = 0,
    validation_errors = '[]'::jsonb,
    validation_warnings = '[]'::jsonb,
    updated_at = now()
  WHERE id = p_draft_id;

  RETURN jsonb_build_object(
    'success', true,
    'draft_id', p_draft_id,
    'reviewed_by', v_profile_name,
    'status', 'building'
  );
END;
$$;

-- ============================================================================
-- 5. UPDATE PUBLISH to require approved status
-- ============================================================================
CREATE OR REPLACE FUNCTION publish_schedule_draft(p_draft_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_draft RECORD;
  v_slot RECORD;
  v_schedule_week_id UUID;
  v_profile_id UUID;
BEGIN
  -- Require schedule admin role (SECURITY DEFINER bypasses RLS)
  IF NOT public.is_schedule_admin() THEN
    RAISE EXCEPTION 'Insufficient permissions: schedule admin role required';
  END IF;

  -- Get profile ID for current user
  SELECT id INTO v_profile_id FROM profiles WHERE auth_user_id = auth.uid();

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Get draft
  SELECT * INTO v_draft FROM schedule_drafts WHERE id = p_draft_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Draft not found';
  END IF;

  -- Must be approved before publishing (or validated for backward compatibility)
  IF v_draft.status NOT IN ('approved', 'validated') THEN
    RAISE EXCEPTION 'Draft must be approved before publishing. Current status: %', v_draft.status;
  END IF;
  
  -- Delete any existing shifts for this week/location (republish scenario)
  DELETE FROM shifts 
  WHERE location_id = v_draft.location_id 
    AND start_at >= v_draft.week_start::TIMESTAMPTZ
    AND start_at < (v_draft.week_start + INTERVAL '7 days')::TIMESTAMPTZ;

  -- Get or create schedule_week
  SELECT id INTO v_schedule_week_id
  FROM schedule_weeks
  WHERE location_id = v_draft.location_id AND week_start = v_draft.week_start;
  
  IF v_schedule_week_id IS NULL THEN
    INSERT INTO schedule_weeks (location_id, week_start, status)
    VALUES (v_draft.location_id, v_draft.week_start, 'draft')
    RETURNING id INTO v_schedule_week_id;
  END IF;

  -- Convert draft_slots to shifts
  FOR v_slot IN
    SELECT ds.*, s.name as service_name
    FROM draft_slots ds
    JOIN services s ON ds.service_id = s.id
    WHERE ds.draft_id = p_draft_id
    AND ds.employee_id IS NOT NULL
  LOOP
    INSERT INTO shifts (
      employee_id, location_id, service_id, staffing_requirement_id,
      schedule_week_id, start_at, end_at, role_required,
      status, is_published, assignment_source
    ) VALUES (
      v_slot.employee_id, v_draft.location_id, v_slot.service_id,
      v_slot.staffing_requirement_id, v_schedule_week_id,
      (v_slot.slot_date::TEXT || ' ' || v_slot.start_time::TEXT)::TIMESTAMPTZ,
      (v_slot.slot_date::TEXT || ' ' || v_slot.end_time::TEXT)::TIMESTAMPTZ,
      v_slot.role_label, 'published', true, 'manual'
    );
  END LOOP;

  -- Update schedule_week
  UPDATE schedule_weeks
  SET status = 'published', published_at = now(), published_by = v_profile_id,
      total_shifts = (SELECT COUNT(*) FROM draft_slots WHERE draft_id = p_draft_id),
      filled_shifts = (SELECT COUNT(*) FROM draft_slots WHERE draft_id = p_draft_id AND employee_id IS NOT NULL)
  WHERE id = v_schedule_week_id;

  -- Mark draft as published
  UPDATE schedule_drafts
  SET status = 'published', published_at = now(), published_by = v_profile_id, updated_at = now()
  WHERE id = p_draft_id;

  RETURN true;
END;
$$;

-- ============================================================================
-- 6. ENABLE REALTIME on draft_slots for collaborative editing
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'draft_slots'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE draft_slots;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'schedule_drafts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE schedule_drafts;
  END IF;
END $$;

-- ============================================================================
-- 7. GRANT EXECUTE on new functions
-- ============================================================================
GRANT EXECUTE ON FUNCTION submit_draft_for_review(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_schedule_draft(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION request_schedule_changes(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION publish_schedule_draft(UUID) TO authenticated;
