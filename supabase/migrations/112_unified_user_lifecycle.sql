-- =====================================================
-- Migration: Unified User Lifecycle System
-- Description: Eliminates data fragmentation by creating
--   a universal person identity that flows seamlessly from
--   Visitor → Lead → Candidate → Employee
-- =====================================================
-- Key Features:
--   1. Universal DNA (unified_persons) - Single source of identity
--   2. Extended Data Store - JSONB for variable lifecycle data
--   3. Promotion Pipeline - Atomic data inheritance functions
--   4. Magic Link System - Secure public intake forms
--   5. Strict RLS - Insert-only for public, full for admins
-- =====================================================

-- =====================================================
-- STEP 1: LIFECYCLE STAGE ENUM
-- =====================================================

DO $$ BEGIN
  CREATE TYPE person_lifecycle_stage AS ENUM (
    'visitor',        -- Website visitor, event attendee
    'lead',           -- Marketing/sales lead
    'student',        -- GDU education program participant
    'applicant',      -- Job applicant/candidate
    'hired',          -- Hired, awaiting onboarding
    'employee',       -- Active employee
    'alumni',         -- Former employee
    'archived'        -- Archived record
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- STEP 2: UNIFIED_PERSONS TABLE - "Universal DNA"
-- This is the single source of truth for identity data
-- =====================================================

CREATE TABLE IF NOT EXISTS public.unified_persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ========== CORE IDENTITY (Universal DNA) ==========
  -- These fields are standardized across ALL lifecycle stages
  
  -- Name
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  preferred_name TEXT,
  
  -- Primary Contact
  email TEXT NOT NULL,
  email_secondary TEXT,
  phone_mobile TEXT,
  phone_home TEXT,
  phone_work TEXT,
  
  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'USA',
  
  -- Demographics
  date_of_birth DATE,
  gender TEXT,
  pronouns TEXT,
  
  -- Emergency Contact
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  emergency_contact_email TEXT,
  
  -- Digital Identity
  avatar_url TEXT,
  linkedin_url TEXT,
  website_url TEXT,
  
  -- ========== LIFECYCLE TRACKING ==========
  current_stage person_lifecycle_stage NOT NULL DEFAULT 'visitor',
  stage_entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Source Tracking
  source_type TEXT, -- 'website', 'event', 'referral', 'job_board', 'walk_in', 'school'
  source_detail TEXT, -- Specific source (e.g., 'Indeed', 'LinkedIn', 'Career Fair 2024')
  referral_source TEXT, -- If referral, who referred them
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  -- ========== LINKED RECORDS ==========
  -- These link to stage-specific tables for historical data
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE SET NULL,
  marketing_lead_id UUID,  -- FK added after table creation
  education_visitor_id UUID, -- FK added after table creation
  
  -- ========== FLAGS ==========
  is_active BOOLEAN DEFAULT true,
  do_not_contact BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  
  -- ========== METADATA ==========
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK constraints for linked records
DO $$ BEGIN
  ALTER TABLE public.unified_persons 
    ADD CONSTRAINT unified_persons_marketing_lead_id_fkey 
    FOREIGN KEY (marketing_lead_id) REFERENCES public.marketing_leads(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.unified_persons 
    ADD CONSTRAINT unified_persons_education_visitor_id_fkey 
    FOREIGN KEY (education_visitor_id) REFERENCES public.education_visitors(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Unique constraint on email (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unified_persons_email_unique 
  ON public.unified_persons(LOWER(email));

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_unified_persons_stage ON public.unified_persons(current_stage);
CREATE INDEX IF NOT EXISTS idx_unified_persons_source ON public.unified_persons(source_type);
CREATE INDEX IF NOT EXISTS idx_unified_persons_name ON public.unified_persons(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_unified_persons_active ON public.unified_persons(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_unified_persons_profile ON public.unified_persons(profile_id);
CREATE INDEX IF NOT EXISTS idx_unified_persons_employee ON public.unified_persons(employee_id);
CREATE INDEX IF NOT EXISTS idx_unified_persons_candidate ON public.unified_persons(candidate_id);

-- =====================================================
-- STEP 3: PERSON_EXTENDED_DATA - Flexible History Store
-- Stores variable lifecycle data in structured JSONB
-- =====================================================

CREATE TABLE IF NOT EXISTS public.person_extended_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES public.unified_persons(id) ON DELETE CASCADE,
  
  -- Data categorization
  data_type TEXT NOT NULL CHECK (data_type IN (
    'education',           -- Schools, degrees, graduation dates
    'work_history',        -- Previous employment
    'certifications',      -- Professional certifications
    'licenses',            -- Professional licenses (RVT, DVM, etc.)
    'skills',              -- Skills and competencies
    'externship_goals',    -- GDU externship objectives
    'interview_notes',     -- Interview feedback
    'application_data',    -- Original job application responses
    'enrollment_data',     -- GDU enrollment details
    'onboarding_progress', -- Onboarding checklist state
    'custom'               -- Custom data
  )),
  
  -- The actual data
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Versioning for data history
  version INTEGER NOT NULL DEFAULT 1,
  is_current BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Only one current version per type per person
CREATE UNIQUE INDEX IF NOT EXISTS idx_person_extended_data_current 
  ON public.person_extended_data(person_id, data_type) 
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_person_extended_data_person ON public.person_extended_data(person_id);
CREATE INDEX IF NOT EXISTS idx_person_extended_data_type ON public.person_extended_data(data_type);

-- =====================================================
-- STEP 4: INTAKE_LINKS - Magic Link System
-- Secure, expiring links for external data collection
-- =====================================================

CREATE TABLE IF NOT EXISTS public.intake_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Unique token for the URL (use UUID concatenation for 64-char hex token)
  token TEXT NOT NULL UNIQUE DEFAULT (
    replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
  ),
  
  -- Link configuration
  link_type TEXT NOT NULL CHECK (link_type IN (
    'job_application',    -- External job application
    'student_enrollment', -- GDU student enrollment
    'externship_signup',  -- Externship/intern signup
    'general_intake',     -- General contact/interest form
    'referral_partner',   -- Partner referral signup
    'event_registration'  -- Event registration
  )),
  
  -- Pre-fill data (sent in invitation)
  prefill_email TEXT,
  prefill_first_name TEXT,
  prefill_last_name TEXT,
  
  -- Target position/program (for applications/enrollments)
  target_position_id UUID REFERENCES public.job_positions(id) ON DELETE SET NULL,
  target_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  target_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  
  -- For event registrations
  target_event_id UUID,
  
  -- Link state
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',    -- Created, not yet sent
    'sent',       -- Email sent
    'opened',     -- Link accessed
    'completed',  -- Form submitted
    'expired',    -- Past expiration
    'revoked'     -- Manually revoked
  )),
  
  -- Expiration
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  
  -- Usage tracking
  sent_at TIMESTAMPTZ,
  sent_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  opened_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  ip_address_completed INET,
  user_agent_completed TEXT,
  
  -- Result
  resulting_person_id UUID REFERENCES public.unified_persons(id) ON DELETE SET NULL,
  
  -- Notes
  internal_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_intake_links_token ON public.intake_links(token);
CREATE INDEX IF NOT EXISTS idx_intake_links_status ON public.intake_links(status);
CREATE INDEX IF NOT EXISTS idx_intake_links_type ON public.intake_links(link_type);
CREATE INDEX IF NOT EXISTS idx_intake_links_expires ON public.intake_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_intake_links_email ON public.intake_links(prefill_email);

-- =====================================================
-- STEP 5: INTAKE_SUBMISSIONS - Form Submission Tracking
-- Records raw submission data before processing
-- =====================================================

CREATE TABLE IF NOT EXISTS public.intake_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_link_id UUID NOT NULL REFERENCES public.intake_links(id) ON DELETE CASCADE,
  
  -- Raw form data
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Processing state
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN (
    'pending',      -- Awaiting processing
    'processing',   -- Currently being processed
    'completed',    -- Successfully processed
    'failed',       -- Processing failed
    'needs_review'  -- Requires manual review
  )),
  processing_error TEXT,
  processed_at TIMESTAMPTZ,
  
  -- Resulting record
  resulting_person_id UUID REFERENCES public.unified_persons(id) ON DELETE SET NULL,
  
  -- Duplicate detection
  is_duplicate BOOLEAN DEFAULT false,
  duplicate_of_person_id UUID REFERENCES public.unified_persons(id) ON DELETE SET NULL,
  
  -- Files uploaded
  uploaded_files JSONB DEFAULT '[]'::jsonb,
  
  -- Submission metadata
  ip_address INET,
  user_agent TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intake_submissions_link ON public.intake_submissions(intake_link_id);
CREATE INDEX IF NOT EXISTS idx_intake_submissions_status ON public.intake_submissions(processing_status);
CREATE INDEX IF NOT EXISTS idx_intake_submissions_person ON public.intake_submissions(resulting_person_id);

-- =====================================================
-- STEP 6: LIFECYCLE_TRANSITIONS - Audit Trail
-- Records every stage change for compliance/reporting
-- =====================================================

CREATE TABLE IF NOT EXISTS public.lifecycle_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES public.unified_persons(id) ON DELETE CASCADE,
  
  -- Transition details
  from_stage person_lifecycle_stage NOT NULL,
  to_stage person_lifecycle_stage NOT NULL,
  
  -- Who/what triggered the transition
  triggered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'manual',         -- Admin manually promoted
    'automatic',      -- System automation
    'intake_form',    -- From public intake form
    'import',         -- Data import
    'api'             -- API call
  )),
  
  -- Associated records
  source_record_id UUID,
  source_table TEXT,
  destination_record_id UUID,
  destination_table TEXT,
  
  -- Notes
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamp
  transitioned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_transitions_person ON public.lifecycle_transitions(person_id);
CREATE INDEX IF NOT EXISTS idx_lifecycle_transitions_stages ON public.lifecycle_transitions(from_stage, to_stage);
CREATE INDEX IF NOT EXISTS idx_lifecycle_transitions_date ON public.lifecycle_transitions(transitioned_at);

-- =====================================================
-- STEP 7: UPDATED_AT TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_unified_persons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS unified_persons_updated_at ON unified_persons;
CREATE TRIGGER unified_persons_updated_at
  BEFORE UPDATE ON unified_persons
  FOR EACH ROW
  EXECUTE FUNCTION update_unified_persons_updated_at();

CREATE OR REPLACE FUNCTION update_person_extended_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS person_extended_data_updated_at ON person_extended_data;
CREATE TRIGGER person_extended_data_updated_at
  BEFORE UPDATE ON person_extended_data
  FOR EACH ROW
  EXECUTE FUNCTION update_person_extended_data_updated_at();

-- =====================================================
-- STEP 8: ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.unified_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_extended_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lifecycle_transitions ENABLE ROW LEVEL SECURITY;

-- ========== UNIFIED_PERSONS POLICIES ==========

-- Admins can do everything
DROP POLICY IF EXISTS "Admins can manage unified_persons" ON public.unified_persons;
CREATE POLICY "Admins can manage unified_persons"
ON public.unified_persons FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
  )
);

-- Users can view their own record
DROP POLICY IF EXISTS "Users can view own unified_person" ON public.unified_persons;
CREATE POLICY "Users can view own unified_person"
ON public.unified_persons FOR SELECT
TO authenticated
USING (
  profile_id IN (
    SELECT id FROM profiles WHERE auth_user_id = auth.uid()
  )
);

-- ========== PERSON_EXTENDED_DATA POLICIES ==========

DROP POLICY IF EXISTS "Admins can manage person_extended_data" ON public.person_extended_data;
CREATE POLICY "Admins can manage person_extended_data"
ON public.person_extended_data FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
  )
);

DROP POLICY IF EXISTS "Users can view own extended_data" ON public.person_extended_data;
CREATE POLICY "Users can view own extended_data"
ON public.person_extended_data FOR SELECT
TO authenticated
USING (
  person_id IN (
    SELECT up.id FROM unified_persons up
    JOIN profiles p ON up.profile_id = p.id
    WHERE p.auth_user_id = auth.uid()
  )
);

-- ========== INTAKE_LINKS POLICIES ==========

DROP POLICY IF EXISTS "Admins can manage intake_links" ON public.intake_links;
CREATE POLICY "Admins can manage intake_links"
ON public.intake_links FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
  )
);

-- Public can view intake links by token (for form rendering)
-- This is handled via anon role in the public intake API
DROP POLICY IF EXISTS "Public can view active intake_links by token" ON public.intake_links;
CREATE POLICY "Public can view active intake_links by token"
ON public.intake_links FOR SELECT
TO anon
USING (
  status IN ('pending', 'sent', 'opened')
  AND expires_at > NOW()
);

-- ========== INTAKE_SUBMISSIONS POLICIES ==========

DROP POLICY IF EXISTS "Admins can manage intake_submissions" ON public.intake_submissions;
CREATE POLICY "Admins can manage intake_submissions"
ON public.intake_submissions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
  )
);

-- Public can INSERT submissions (but not read/update/delete)
DROP POLICY IF EXISTS "Public can submit intake forms" ON public.intake_submissions;
CREATE POLICY "Public can submit intake forms"
ON public.intake_submissions FOR INSERT
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM intake_links il
    WHERE il.id = intake_link_id
    AND il.status IN ('pending', 'sent', 'opened')
    AND il.expires_at > NOW()
  )
);

-- ========== LIFECYCLE_TRANSITIONS POLICIES ==========

DROP POLICY IF EXISTS "Admins can manage lifecycle_transitions" ON public.lifecycle_transitions;
CREATE POLICY "Admins can manage lifecycle_transitions"
ON public.lifecycle_transitions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
  )
);

DROP POLICY IF EXISTS "Managers can view lifecycle_transitions" ON public.lifecycle_transitions;
CREATE POLICY "Managers can view lifecycle_transitions"
ON public.lifecycle_transitions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role IN ('admin', 'super_admin', 'manager')
  )
);

-- =====================================================
-- STEP 9: HELPER FUNCTIONS
-- =====================================================

-- Function to check for duplicate emails
CREATE OR REPLACE FUNCTION public.check_duplicate_person_email(
  p_email TEXT
)
RETURNS TABLE(
  is_duplicate BOOLEAN,
  existing_person_id UUID,
  existing_stage person_lifecycle_stage,
  existing_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true AS is_duplicate,
    up.id AS existing_person_id,
    up.current_stage AS existing_stage,
    up.first_name || ' ' || up.last_name AS existing_name
  FROM unified_persons up
  WHERE LOWER(up.email) = LOWER(p_email)
  LIMIT 1;
  
  -- If no match found, return false
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::person_lifecycle_stage, NULL::TEXT;
  END IF;
END;
$$;

-- Function to update extended data with versioning
CREATE OR REPLACE FUNCTION public.upsert_person_extended_data(
  p_person_id UUID,
  p_data_type TEXT,
  p_data JSONB,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id UUID;
  v_current_version INTEGER;
BEGIN
  -- Mark existing current version as not current
  UPDATE person_extended_data
  SET is_current = false
  WHERE person_id = p_person_id
    AND data_type = p_data_type
    AND is_current = true
  RETURNING version INTO v_current_version;
  
  -- Insert new version
  INSERT INTO person_extended_data (
    person_id,
    data_type,
    data,
    version,
    is_current,
    created_by
  ) VALUES (
    p_person_id,
    p_data_type,
    p_data,
    COALESCE(v_current_version, 0) + 1,
    true,
    p_created_by
  )
  RETURNING id INTO v_new_id;
  
  RETURN v_new_id;
END;
$$;

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION public.check_duplicate_person_email TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_duplicate_person_email TO anon;
GRANT EXECUTE ON FUNCTION public.upsert_person_extended_data TO authenticated;

-- =====================================================
-- STEP 10: PROMOTION FUNCTIONS
-- Atomic functions for stage transitions
-- =====================================================

-- ==========================================================
-- PROMOTE: Visitor/Lead → Applicant (Start Job Application)
-- ==========================================================
CREATE OR REPLACE FUNCTION public.promote_to_applicant(
  p_person_id UUID,
  p_target_position_id UUID DEFAULT NULL,
  p_target_department_id UUID DEFAULT NULL,
  p_target_location_id UUID DEFAULT NULL,
  p_resume_url TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_person RECORD;
  v_new_candidate_id UUID;
  v_actor_id UUID;
BEGIN
  -- Get actor (current user)
  SELECT id INTO v_actor_id FROM profiles WHERE auth_user_id = auth.uid();
  
  -- Fetch the person
  SELECT * INTO v_person FROM unified_persons WHERE id = p_person_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Person not found: %', p_person_id;
  END IF;
  
  IF v_person.current_stage NOT IN ('visitor', 'lead', 'student') THEN
    RAISE EXCEPTION 'Cannot promote to applicant from stage: %', v_person.current_stage;
  END IF;
  
  -- Create candidate record
  INSERT INTO candidates (
    first_name,
    last_name,
    preferred_name,
    email,
    email_personal,
    phone,
    phone_mobile,
    phone_work,
    address_line1,
    address_line2,
    city,
    state,
    postal_code,
    date_of_birth,
    emergency_contact_name,
    emergency_contact_phone,
    emergency_contact_relationship,
    avatar_url,
    target_position_id,
    department_id,
    location_id,
    resume_url,
    source,
    referral_source,
    notes,
    status,
    applied_at
  ) VALUES (
    v_person.first_name,
    v_person.last_name,
    v_person.preferred_name,
    v_person.email,
    v_person.email_secondary,
    v_person.phone_mobile,
    v_person.phone_mobile,
    v_person.phone_work,
    v_person.address_line1,
    v_person.address_line2,
    v_person.city,
    v_person.state,
    v_person.postal_code,
    v_person.date_of_birth,
    v_person.emergency_contact_name,
    v_person.emergency_contact_phone,
    v_person.emergency_contact_relationship,
    v_person.avatar_url,
    p_target_position_id,
    p_target_department_id,
    p_target_location_id,
    p_resume_url,
    v_person.source_type,
    v_person.referral_source,
    p_notes,
    'new',
    NOW()
  )
  RETURNING id INTO v_new_candidate_id;
  
  -- Copy extended data if exists
  INSERT INTO candidate_notes (
    candidate_id,
    note,
    note_type,
    author_id
  )
  SELECT
    v_new_candidate_id,
    'Previous lifecycle data: ' || ped.data_type || ' - ' || ped.data::text,
    'system',
    v_actor_id
  FROM person_extended_data ped
  WHERE ped.person_id = p_person_id
    AND ped.is_current = true
    AND ped.data_type IN ('work_history', 'education', 'skills');
  
  -- Update unified_persons
  UPDATE unified_persons
  SET 
    current_stage = 'applicant',
    stage_entered_at = NOW(),
    candidate_id = v_new_candidate_id,
    updated_at = NOW()
  WHERE id = p_person_id;
  
  -- Record transition
  INSERT INTO lifecycle_transitions (
    person_id,
    from_stage,
    to_stage,
    triggered_by,
    trigger_type,
    destination_record_id,
    destination_table,
    notes
  ) VALUES (
    p_person_id,
    v_person.current_stage,
    'applicant',
    v_actor_id,
    'manual',
    v_new_candidate_id,
    'candidates',
    p_notes
  );
  
  RETURN v_new_candidate_id;
END;
$$;

-- ==========================================================
-- PROMOTE: Applicant → Hired (Accept Job Offer)
-- ==========================================================
CREATE OR REPLACE FUNCTION public.promote_to_hired(
  p_person_id UUID,
  p_target_start_date DATE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_person RECORD;
  v_candidate RECORD;
  v_actor_id UUID;
BEGIN
  -- Get actor
  SELECT id INTO v_actor_id FROM profiles WHERE auth_user_id = auth.uid();
  
  -- Fetch person
  SELECT * INTO v_person FROM unified_persons WHERE id = p_person_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Person not found: %', p_person_id;
  END IF;
  
  IF v_person.current_stage != 'applicant' THEN
    RAISE EXCEPTION 'Can only promote to hired from applicant stage, current: %', v_person.current_stage;
  END IF;
  
  IF v_person.candidate_id IS NULL THEN
    RAISE EXCEPTION 'No candidate record linked to this person';
  END IF;
  
  -- Update candidate status
  UPDATE candidates
  SET 
    status = 'accepted_offer',
    updated_at = NOW()
  WHERE id = v_person.candidate_id;
  
  -- Start onboarding process
  INSERT INTO candidate_onboarding (
    candidate_id,
    status,
    target_start_date,
    created_by
  ) VALUES (
    v_person.candidate_id,
    'not_started',
    p_target_start_date,
    v_actor_id
  )
  ON CONFLICT (candidate_id) DO UPDATE
  SET 
    status = 'not_started',
    target_start_date = EXCLUDED.target_start_date,
    updated_at = NOW();
  
  -- Update unified_persons
  UPDATE unified_persons
  SET 
    current_stage = 'hired',
    stage_entered_at = NOW(),
    updated_at = NOW()
  WHERE id = p_person_id;
  
  -- Record transition
  INSERT INTO lifecycle_transitions (
    person_id,
    from_stage,
    to_stage,
    triggered_by,
    trigger_type,
    notes
  ) VALUES (
    p_person_id,
    'applicant',
    'hired',
    v_actor_id,
    'manual',
    'Accepted job offer. Target start: ' || COALESCE(p_target_start_date::text, 'TBD')
  );
  
  RETURN v_person.candidate_id;
END;
$$;

-- ==========================================================
-- PROMOTE: Hired → Employee (Complete Onboarding)
-- Uses existing promote_candidate_to_employee function
-- ==========================================================
CREATE OR REPLACE FUNCTION public.complete_hire_to_employee(
  p_person_id UUID,
  p_employment_type TEXT,
  p_job_title_id UUID,
  p_start_date DATE,
  p_starting_wage NUMERIC,
  p_pay_type TEXT DEFAULT 'hourly',
  p_department_id UUID DEFAULT NULL,
  p_location_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_person RECORD;
  v_new_employee_id UUID;
  v_new_profile_id UUID;
  v_actor_id UUID;
BEGIN
  -- Get actor
  SELECT id INTO v_actor_id FROM profiles WHERE auth_user_id = auth.uid();
  
  -- Fetch person
  SELECT * INTO v_person FROM unified_persons WHERE id = p_person_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Person not found: %', p_person_id;
  END IF;
  
  IF v_person.current_stage != 'hired' THEN
    RAISE EXCEPTION 'Can only complete hire from hired stage, current: %', v_person.current_stage;
  END IF;
  
  IF v_person.candidate_id IS NULL THEN
    RAISE EXCEPTION 'No candidate record linked to this person';
  END IF;
  
  -- Call existing promote function
  SELECT promote_candidate_to_employee(
    v_person.candidate_id,
    p_employment_type,
    p_job_title_id,
    p_start_date,
    p_starting_wage,
    p_pay_type,
    p_department_id,
    p_location_id
  ) INTO v_new_employee_id;
  
  -- Get the profile ID from the new employee
  SELECT profile_id INTO v_new_profile_id
  FROM employees WHERE id = v_new_employee_id;
  
  -- Update unified_persons with employee link
  UPDATE unified_persons
  SET 
    current_stage = 'employee',
    stage_entered_at = NOW(),
    employee_id = v_new_employee_id,
    profile_id = v_new_profile_id,
    updated_at = NOW()
  WHERE id = p_person_id;
  
  -- Record transition
  INSERT INTO lifecycle_transitions (
    person_id,
    from_stage,
    to_stage,
    triggered_by,
    trigger_type,
    source_record_id,
    source_table,
    destination_record_id,
    destination_table,
    notes
  ) VALUES (
    p_person_id,
    'hired',
    'employee',
    v_actor_id,
    'manual',
    v_person.candidate_id,
    'candidates',
    v_new_employee_id,
    'employees',
    'Onboarding completed. Start date: ' || p_start_date
  );
  
  RETURN v_new_employee_id;
END;
$$;

-- ==========================================================
-- PROMOTE: Visitor → Student (GDU Enrollment)
-- ==========================================================
CREATE OR REPLACE FUNCTION public.promote_to_student(
  p_person_id UUID,
  p_program_name TEXT,
  p_school_of_origin TEXT DEFAULT NULL,
  p_visit_start_date DATE DEFAULT NULL,
  p_visit_end_date DATE DEFAULT NULL,
  p_externship_goals JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_person RECORD;
  v_new_visitor_id UUID;
  v_actor_id UUID;
BEGIN
  -- Get actor
  SELECT id INTO v_actor_id FROM profiles WHERE auth_user_id = auth.uid();
  
  -- Fetch person
  SELECT * INTO v_person FROM unified_persons WHERE id = p_person_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Person not found: %', p_person_id;
  END IF;
  
  IF v_person.current_stage NOT IN ('visitor', 'lead') THEN
    RAISE EXCEPTION 'Cannot promote to student from stage: %', v_person.current_stage;
  END IF;
  
  -- Create education_visitors record
  INSERT INTO education_visitors (
    first_name,
    last_name,
    email,
    phone,
    visitor_type,
    school_of_origin,
    program_name,
    visit_start_date,
    visit_end_date,
    lead_source,
    referral_name,
    notes,
    is_active,
    created_by
  ) VALUES (
    v_person.first_name,
    v_person.last_name,
    v_person.email,
    v_person.phone_mobile,
    'student',
    p_school_of_origin,
    p_program_name,
    p_visit_start_date,
    p_visit_end_date,
    v_person.source_type,
    v_person.referral_source,
    NULL,
    true,
    (SELECT id FROM auth.users WHERE id = auth.uid())
  )
  RETURNING id INTO v_new_visitor_id;
  
  -- Store externship goals in extended data
  IF p_externship_goals IS NOT NULL THEN
    PERFORM upsert_person_extended_data(
      p_person_id,
      'externship_goals',
      p_externship_goals,
      v_actor_id
    );
  END IF;
  
  -- Store enrollment data
  PERFORM upsert_person_extended_data(
    p_person_id,
    'enrollment_data',
    jsonb_build_object(
      'program_name', p_program_name,
      'school_of_origin', p_school_of_origin,
      'start_date', p_visit_start_date,
      'end_date', p_visit_end_date,
      'enrolled_at', NOW()
    ),
    v_actor_id
  );
  
  -- Update unified_persons
  UPDATE unified_persons
  SET 
    current_stage = 'student',
    stage_entered_at = NOW(),
    education_visitor_id = v_new_visitor_id,
    updated_at = NOW()
  WHERE id = p_person_id;
  
  -- Record transition
  INSERT INTO lifecycle_transitions (
    person_id,
    from_stage,
    to_stage,
    triggered_by,
    trigger_type,
    destination_record_id,
    destination_table,
    notes
  ) VALUES (
    p_person_id,
    v_person.current_stage,
    'student',
    v_actor_id,
    'manual',
    v_new_visitor_id,
    'education_visitors',
    'Enrolled in: ' || p_program_name
  );
  
  RETURN v_new_visitor_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.promote_to_applicant TO authenticated;
GRANT EXECUTE ON FUNCTION public.promote_to_hired TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_hire_to_employee TO authenticated;
GRANT EXECUTE ON FUNCTION public.promote_to_student TO authenticated;

-- =====================================================
-- STEP 11: INTAKE FORM PROCESSING FUNCTION
-- Processes public form submissions
-- =====================================================

CREATE OR REPLACE FUNCTION public.process_intake_submission(
  p_submission_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_submission RECORD;
  v_link RECORD;
  v_form_data JSONB;
  v_new_person_id UUID;
  v_duplicate_check RECORD;
  v_email TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
BEGIN
  -- Fetch submission
  SELECT * INTO v_submission FROM intake_submissions WHERE id = p_submission_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found: %', p_submission_id;
  END IF;
  
  IF v_submission.processing_status != 'pending' THEN
    RAISE EXCEPTION 'Submission already processed';
  END IF;
  
  -- Mark as processing
  UPDATE intake_submissions
  SET processing_status = 'processing'
  WHERE id = p_submission_id;
  
  -- Fetch linked intake link
  SELECT * INTO v_link FROM intake_links WHERE id = v_submission.intake_link_id;
  v_form_data := v_submission.form_data;
  
  -- Extract email
  v_email := COALESCE(
    v_form_data->>'email',
    v_link.prefill_email
  );
  
  IF v_email IS NULL OR v_email = '' THEN
    UPDATE intake_submissions
    SET 
      processing_status = 'failed',
      processing_error = 'Email is required'
    WHERE id = p_submission_id;
    RETURN NULL;
  END IF;
  
  -- Check for duplicates
  SELECT * INTO v_duplicate_check FROM check_duplicate_person_email(v_email);
  
  IF v_duplicate_check.is_duplicate THEN
    -- Mark as duplicate but don't fail - update existing record
    UPDATE intake_submissions
    SET 
      is_duplicate = true,
      duplicate_of_person_id = v_duplicate_check.existing_person_id
    WHERE id = p_submission_id;
    
    -- Update existing person's last activity
    UPDATE unified_persons
    SET 
      last_activity_at = NOW(),
      updated_at = NOW()
    WHERE id = v_duplicate_check.existing_person_id;
    
    v_new_person_id := v_duplicate_check.existing_person_id;
  ELSE
    -- Extract name
    v_first_name := COALESCE(
      v_form_data->>'first_name',
      v_form_data->>'firstName',
      v_link.prefill_first_name,
      ''
    );
    v_last_name := COALESCE(
      v_form_data->>'last_name',
      v_form_data->>'lastName',
      v_link.prefill_last_name,
      ''
    );
    
    -- Create new person
    INSERT INTO unified_persons (
      first_name,
      last_name,
      preferred_name,
      email,
      email_secondary,
      phone_mobile,
      phone_home,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      date_of_birth,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relationship,
      linkedin_url,
      current_stage,
      source_type,
      source_detail,
      utm_source,
      utm_medium,
      utm_campaign
    ) VALUES (
      v_first_name,
      v_last_name,
      v_form_data->>'preferred_name',
      v_email,
      v_form_data->>'email_secondary',
      COALESCE(v_form_data->>'phone_mobile', v_form_data->>'phone'),
      v_form_data->>'phone_home',
      v_form_data->>'address_line1',
      v_form_data->>'address_line2',
      v_form_data->>'city',
      v_form_data->>'state',
      v_form_data->>'postal_code',
      (v_form_data->>'date_of_birth')::DATE,
      v_form_data->>'emergency_contact_name',
      v_form_data->>'emergency_contact_phone',
      v_form_data->>'emergency_contact_relationship',
      v_form_data->>'linkedin_url',
      CASE v_link.link_type
        WHEN 'job_application' THEN 'applicant'
        WHEN 'student_enrollment' THEN 'student'
        WHEN 'externship_signup' THEN 'student'
        ELSE 'visitor'
      END,
      'intake_form',
      v_link.link_type,
      v_form_data->>'utm_source',
      v_form_data->>'utm_medium',
      v_form_data->>'utm_campaign'
    )
    RETURNING id INTO v_new_person_id;
    
    -- Store type-specific data in extended_data
    CASE v_link.link_type
      WHEN 'job_application' THEN
        -- Store work history and application data
        IF v_form_data ? 'work_history' THEN
          PERFORM upsert_person_extended_data(
            v_new_person_id, 'work_history', v_form_data->'work_history', NULL
          );
        END IF;
        IF v_form_data ? 'education' THEN
          PERFORM upsert_person_extended_data(
            v_new_person_id, 'education', v_form_data->'education', NULL
          );
        END IF;
        -- Store full application
        PERFORM upsert_person_extended_data(
          v_new_person_id, 'application_data', v_form_data, NULL
        );
        
        -- Auto-promote to applicant if job application
        PERFORM promote_to_applicant(
          v_new_person_id,
          v_link.target_position_id,
          v_link.target_department_id,
          v_link.target_location_id,
          v_form_data->>'resume_url',
          'Submitted via intake form'
        );
        
      WHEN 'student_enrollment', 'externship_signup' THEN
        -- Store enrollment data
        IF v_form_data ? 'externship_goals' THEN
          PERFORM upsert_person_extended_data(
            v_new_person_id, 'externship_goals', v_form_data->'externship_goals', NULL
          );
        END IF;
        PERFORM upsert_person_extended_data(
          v_new_person_id, 'enrollment_data', v_form_data, NULL
        );
        
        -- Auto-promote to student
        PERFORM promote_to_student(
          v_new_person_id,
          COALESCE(v_form_data->>'program_name', 'General Program'),
          v_form_data->>'school_of_origin',
          (v_form_data->>'start_date')::DATE,
          (v_form_data->>'end_date')::DATE,
          v_form_data->'externship_goals'
        );
        
      ELSE
        -- General intake - just store the data
        PERFORM upsert_person_extended_data(
          v_new_person_id, 'custom', v_form_data, NULL
        );
    END CASE;
  END IF;
  
  -- Update submission as completed
  UPDATE intake_submissions
  SET 
    processing_status = 'completed',
    processed_at = NOW(),
    resulting_person_id = v_new_person_id
  WHERE id = p_submission_id;
  
  -- Update intake link as completed
  UPDATE intake_links
  SET 
    status = 'completed',
    completed_at = NOW(),
    resulting_person_id = v_new_person_id
  WHERE id = v_submission.intake_link_id;
  
  RETURN v_new_person_id;
END;
$$;

-- Grant to service role only (not public)
REVOKE EXECUTE ON FUNCTION public.process_intake_submission FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_intake_submission TO service_role;

-- =====================================================
-- STEP 12: CREATE INTAKE LINK FUNCTION (for Admin UI)
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_intake_link(
  p_link_type TEXT,
  p_prefill_email TEXT DEFAULT NULL,
  p_prefill_first_name TEXT DEFAULT NULL,
  p_prefill_last_name TEXT DEFAULT NULL,
  p_target_position_id UUID DEFAULT NULL,
  p_target_department_id UUID DEFAULT NULL,
  p_target_location_id UUID DEFAULT NULL,
  p_target_event_id UUID DEFAULT NULL,
  p_expires_in_days INTEGER DEFAULT 7,
  p_internal_notes TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  token TEXT,
  link_type TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link_id UUID;
  v_token TEXT;
  v_expires_at TIMESTAMPTZ;
  v_actor_id UUID;
BEGIN
  -- Get actor
  SELECT profiles.id INTO v_actor_id 
  FROM profiles WHERE auth_user_id = auth.uid();
  
  -- Verify admin permission
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Only admins can create intake links';
  END IF;
  
  v_expires_at := NOW() + (p_expires_in_days || ' days')::INTERVAL;
  
  INSERT INTO intake_links (
    link_type,
    prefill_email,
    prefill_first_name,
    prefill_last_name,
    target_position_id,
    target_department_id,
    target_location_id,
    target_event_id,
    expires_at,
    internal_notes,
    created_by
  ) VALUES (
    p_link_type,
    p_prefill_email,
    p_prefill_first_name,
    p_prefill_last_name,
    p_target_position_id,
    p_target_department_id,
    p_target_location_id,
    p_target_event_id,
    v_expires_at,
    p_internal_notes,
    v_actor_id
  )
  RETURNING 
    intake_links.id,
    intake_links.token,
    intake_links.link_type,
    intake_links.expires_at
  INTO v_link_id, v_token, link_type, v_expires_at;
  
  RETURN QUERY SELECT v_link_id, v_token, p_link_type, v_expires_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_intake_link TO authenticated;

-- =====================================================
-- STEP 13: MIGRATION HELPER - Backfill existing records
-- Creates unified_persons entries for existing data
-- =====================================================

CREATE OR REPLACE FUNCTION public.backfill_unified_persons()
RETURNS TABLE(
  source_table TEXT,
  records_processed INTEGER,
  records_created INTEGER,
  duplicates_skipped INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_processed INTEGER := 0;
  v_created INTEGER := 0;
  v_skipped INTEGER := 0;
  v_person_id UUID;
BEGIN
  -- Backfill from candidates
  FOR v_person_id IN
    INSERT INTO unified_persons (
      first_name, last_name, preferred_name, email, email_secondary,
      phone_mobile, phone_work, address_line1, address_line2,
      city, state, postal_code, date_of_birth,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
      avatar_url, current_stage, source_type, referral_source,
      candidate_id, is_active, created_at
    )
    SELECT 
      c.first_name, c.last_name, c.preferred_name, c.email, c.email_personal,
      c.phone_mobile, c.phone_work, c.address_line1, c.address_line2,
      c.city, c.state, c.postal_code, c.date_of_birth,
      c.emergency_contact_name, c.emergency_contact_phone, c.emergency_contact_relationship,
      c.avatar_url,
      CASE 
        WHEN c.status = 'hired' THEN 'hired'::person_lifecycle_stage
        ELSE 'applicant'::person_lifecycle_stage
      END,
      c.source, c.referral_source,
      c.id, true, c.created_at
    FROM candidates c
    WHERE NOT EXISTS (
      SELECT 1 FROM unified_persons up WHERE LOWER(up.email) = LOWER(c.email)
    )
    RETURNING id
  LOOP
    v_created := v_created + 1;
  END LOOP;
  v_processed := (SELECT COUNT(*) FROM candidates);
  v_skipped := v_processed - v_created;
  
  source_table := 'candidates';
  records_processed := v_processed;
  records_created := v_created;
  duplicates_skipped := v_skipped;
  RETURN NEXT;
  
  -- Reset counters
  v_processed := 0;
  v_created := 0;
  v_skipped := 0;
  
  -- Backfill from education_visitors
  FOR v_person_id IN
    INSERT INTO unified_persons (
      first_name, last_name, email, phone_mobile,
      current_stage, source_type, referral_source,
      education_visitor_id, is_active, created_at
    )
    SELECT 
      ev.first_name, ev.last_name, ev.email, ev.phone,
      'student'::person_lifecycle_stage,
      ev.lead_source, ev.referral_name,
      ev.id, ev.is_active, ev.created_at
    FROM education_visitors ev
    WHERE ev.email IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM unified_persons up WHERE LOWER(up.email) = LOWER(ev.email)
    )
    RETURNING id
  LOOP
    v_created := v_created + 1;
  END LOOP;
  v_processed := (SELECT COUNT(*) FROM education_visitors WHERE email IS NOT NULL);
  v_skipped := v_processed - v_created;
  
  source_table := 'education_visitors';
  records_processed := v_processed;
  records_created := v_created;
  duplicates_skipped := v_skipped;
  RETURN NEXT;
  
  -- Reset counters
  v_processed := 0;
  v_created := 0;
  v_skipped := 0;
  
  -- Backfill from marketing_leads
  FOR v_person_id IN
    INSERT INTO unified_persons (
      first_name, last_name, email, phone_mobile,
      current_stage, source_type,
      marketing_lead_id, is_active, created_at
    )
    SELECT 
      ml.first_name, ml.last_name, ml.email, ml.phone,
      'lead'::person_lifecycle_stage,
      ml.source,
      ml.id, true, ml.created_at
    FROM marketing_leads ml
    WHERE ml.email IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM unified_persons up WHERE LOWER(up.email) = LOWER(ml.email)
    )
    RETURNING id
  LOOP
    v_created := v_created + 1;
  END LOOP;
  v_processed := (SELECT COUNT(*) FROM marketing_leads WHERE email IS NOT NULL);
  v_skipped := v_processed - v_created;
  
  source_table := 'marketing_leads';
  records_processed := v_processed;
  records_created := v_created;
  duplicates_skipped := v_skipped;
  RETURN NEXT;
  
  -- Backfill employees (as employee stage with profile link)
  v_processed := 0;
  v_created := 0;
  v_skipped := 0;
  
  FOR v_person_id IN
    INSERT INTO unified_persons (
      first_name, last_name, preferred_name, 
      email, email_secondary, phone_mobile, phone_work,
      date_of_birth, current_stage,
      employee_id, profile_id, is_active, created_at
    )
    SELECT 
      e.first_name, e.last_name, e.preferred_name,
      COALESCE(e.email_work, e.email_personal), e.email_personal,
      e.phone_mobile, e.phone_work,
      e.date_of_birth, 
      CASE 
        WHEN e.employment_status = 'terminated' THEN 'alumni'::person_lifecycle_stage
        ELSE 'employee'::person_lifecycle_stage
      END,
      e.id, e.profile_id, 
      e.employment_status != 'terminated',
      e.created_at
    FROM employees e
    WHERE COALESCE(e.email_work, e.email_personal) IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM unified_persons up 
      WHERE LOWER(up.email) = LOWER(COALESCE(e.email_work, e.email_personal))
    )
    RETURNING id
  LOOP
    v_created := v_created + 1;
  END LOOP;
  v_processed := (SELECT COUNT(*) FROM employees WHERE COALESCE(email_work, email_personal) IS NOT NULL);
  v_skipped := v_processed - v_created;
  
  source_table := 'employees';
  records_processed := v_processed;
  records_created := v_created;
  duplicates_skipped := v_skipped;
  RETURN NEXT;
END;
$$;

-- Only allow admins to run backfill
REVOKE EXECUTE ON FUNCTION public.backfill_unified_persons FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.backfill_unified_persons TO authenticated;

-- =====================================================
-- STEP 14: VIEWS FOR UNIFIED DATA ACCESS
-- =====================================================

-- View showing person with current stage details
CREATE OR REPLACE VIEW public.unified_persons_view AS
SELECT 
  up.*,
  -- Candidate details if applicant/hired
  c.status AS candidate_status,
  c.resume_url,
  c.target_position_id,
  jp.title AS target_position_title,
  -- Employee details if employee
  e.employee_number,
  e.employment_status,
  e.hire_date,
  emp_pos.title AS current_position_title,
  d.name AS department_name,
  l.name AS location_name,
  -- Education details if student
  ev.visitor_type AS student_type,
  ev.program_name,
  ev.school_of_origin,
  ev.visit_start_date,
  ev.visit_end_date
FROM unified_persons up
LEFT JOIN candidates c ON up.candidate_id = c.id
LEFT JOIN job_positions jp ON c.target_position_id = jp.id
LEFT JOIN employees e ON up.employee_id = e.id
LEFT JOIN job_positions emp_pos ON e.position_id = emp_pos.id
LEFT JOIN departments d ON COALESCE(e.department_id, c.department_id) = d.id
LEFT JOIN locations l ON COALESCE(e.location_id, c.location_id) = l.id
LEFT JOIN education_visitors ev ON up.education_visitor_id = ev.id;

-- Grant access
GRANT SELECT ON public.unified_persons_view TO authenticated;

-- =====================================================
-- STEP 15: NOTIFICATION TRIGGER FOR NEW INTAKE
-- =====================================================

CREATE OR REPLACE FUNCTION notify_intake_submission()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notification for admins
  INSERT INTO notifications (
    profile_id,
    title,
    message,
    type,
    link
  )
  SELECT 
    p.id,
    'New Intake Submission',
    'A new ' || (SELECT link_type FROM intake_links WHERE id = NEW.intake_link_id) || ' form was submitted.',
    'info',
    '/admin/intake/' || NEW.id
  FROM profiles p
  WHERE p.role IN ('admin', 'super_admin')
    AND p.is_active = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS intake_submission_notification ON intake_submissions;
CREATE TRIGGER intake_submission_notification
  AFTER INSERT ON intake_submissions
  FOR EACH ROW
  EXECUTE FUNCTION notify_intake_submission();

-- =====================================================
-- DONE!
-- The Unified User Lifecycle system is now ready.
-- 
-- Next steps:
-- 1. Run backfill_unified_persons() to migrate existing data
-- 2. Create server API endpoints for intake form processing
-- 3. Create public intake form UI components
-- =====================================================
