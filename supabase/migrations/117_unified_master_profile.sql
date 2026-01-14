-- =====================================================
-- Migration 117: Unified Master Profile Architecture
-- =====================================================
-- Description: Implements "One Human = One Record" philosophy
-- by creating extension tables ("hats") that attach to the
-- unified_persons table without creating duplicate records.
--
-- Architecture:
--   unified_persons (Core Identity - "The Anchor")
--   ├── person_crm_data (Marketing/CRM extension)
--   ├── person_recruiting_data (Job application extension)
--   └── person_employee_data (Employment extension)
--
-- Key Features:
--   1. Extension tables hold stage-specific data
--   2. A person gains "hats" without changing ID
--   3. Auth access can be granted/revoked independently
--   4. Full audit trail of lifecycle transitions
-- =====================================================

-- =====================================================
-- STEP 1: PERSON_CRM_DATA (Marketing/Sales Extension)
-- Holds CRM-specific data for visitors and leads
-- =====================================================

CREATE TABLE IF NOT EXISTS public.person_crm_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES public.unified_persons(id) ON DELETE CASCADE,
  
  -- CRM Classification
  lead_status TEXT DEFAULT 'new' CHECK (lead_status IN (
    'new', 'contacted', 'qualified', 'nurturing', 'converted', 'lost', 'archived'
  )),
  lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  lead_temperature TEXT CHECK (lead_temperature IN ('cold', 'warm', 'hot')),
  
  -- Source Attribution
  acquisition_source TEXT, -- 'website', 'event', 'referral', 'social', 'job_board', etc.
  acquisition_detail TEXT, -- Specific source (e.g., 'LinkedIn', 'Career Fair 2024')
  acquisition_campaign TEXT, -- Marketing campaign that brought them
  referral_partner_id UUID REFERENCES public.referral_partners(id) ON DELETE SET NULL,
  first_touch_date TIMESTAMPTZ,
  
  -- Event Engagement
  events_attended JSONB DEFAULT '[]'::jsonb, -- Array of event IDs and dates
  last_event_attended_at TIMESTAMPTZ,
  event_attendance_count INTEGER DEFAULT 0,
  
  -- Communication Preferences
  preferred_contact_method TEXT CHECK (preferred_contact_method IN ('email', 'phone', 'text', 'mail')),
  email_opt_in BOOLEAN DEFAULT true,
  sms_opt_in BOOLEAN DEFAULT false,
  mail_opt_in BOOLEAN DEFAULT false,
  
  -- Tags and Notes
  tags JSONB DEFAULT '[]'::jsonb, -- Array of tag strings
  marketing_notes TEXT,
  
  -- Pet/Business Info (for veterinary context)
  pets_info JSONB DEFAULT '[]'::jsonb, -- Array of pet objects
  business_info JSONB, -- If they own a business
  
  -- Interests
  interests JSONB DEFAULT '[]'::jsonb, -- Services they're interested in
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Unique constraint: one CRM record per person
CREATE UNIQUE INDEX IF NOT EXISTS idx_person_crm_data_person_unique 
  ON public.person_crm_data(person_id);

CREATE INDEX IF NOT EXISTS idx_person_crm_data_status ON public.person_crm_data(lead_status);
CREATE INDEX IF NOT EXISTS idx_person_crm_data_source ON public.person_crm_data(acquisition_source);
CREATE INDEX IF NOT EXISTS idx_person_crm_data_score ON public.person_crm_data(lead_score);

-- =====================================================
-- STEP 2: PERSON_RECRUITING_DATA (Recruiting Extension)
-- Holds job application and interview data
-- =====================================================

CREATE TABLE IF NOT EXISTS public.person_recruiting_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES public.unified_persons(id) ON DELETE CASCADE,
  
  -- Application Status
  recruiting_status TEXT DEFAULT 'new' CHECK (recruiting_status IN (
    'new', 'reviewing', 'screening', 'interviewing', 'offer_pending', 
    'offer_extended', 'offer_accepted', 'offer_declined', 'hired', 
    'withdrawn', 'rejected', 'on_hold'
  )),
  status_changed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Target Position
  target_position_id UUID REFERENCES public.job_positions(id) ON DELETE SET NULL,
  target_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  target_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  
  -- Candidate Type
  candidate_type TEXT DEFAULT 'applicant' CHECK (candidate_type IN (
    'applicant', 'intern', 'extern', 'student', 'referral', 'internal'
  )),
  
  -- Resume/Documents
  resume_url TEXT,
  cover_letter_url TEXT,
  portfolio_url TEXT,
  documents JSONB DEFAULT '[]'::jsonb, -- Array of document objects
  
  -- Application Data
  applied_at TIMESTAMPTZ,
  application_source TEXT, -- Where they applied from
  application_data JSONB DEFAULT '{}'::jsonb, -- Full application form data
  
  -- Salary/Compensation
  salary_expectation_min NUMERIC(10,2),
  salary_expectation_max NUMERIC(10,2),
  salary_expectation_type TEXT CHECK (salary_expectation_type IN ('hourly', 'salary', 'negotiable')),
  
  -- Availability
  available_start_date DATE,
  preferred_schedule TEXT, -- Full-time, Part-time, etc.
  work_authorization TEXT,
  relocation_willing BOOLEAN DEFAULT false,
  
  -- Interview Tracking
  interview_scores JSONB DEFAULT '{}'::jsonb, -- Object with interview stage scores
  interview_notes JSONB DEFAULT '[]'::jsonb, -- Array of interview note objects
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  
  -- Skills Assessment
  skills_assessment JSONB DEFAULT '{}'::jsonb, -- Skill ratings from interview
  
  -- References
  "references" JSONB DEFAULT '[]'::jsonb, -- Array of reference objects
  background_check_status TEXT CHECK (background_check_status IN (
    'not_started', 'pending', 'passed', 'failed', 'requires_review'
  )),
  background_check_date DATE,
  
  -- Offer Details (if offer extended)
  offer_details JSONB, -- Offer letter details
  offer_extended_at TIMESTAMPTZ,
  offer_response_deadline DATE,
  offer_accepted_at TIMESTAMPTZ,
  
  -- Rejection/Withdrawal
  rejection_reason TEXT,
  rejection_notes TEXT,
  withdrawal_reason TEXT,
  
  -- Linked legacy record (for migration)
  legacy_candidate_id UUID REFERENCES public.candidates(id) ON DELETE SET NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Unique constraint: one recruiting record per person
CREATE UNIQUE INDEX IF NOT EXISTS idx_person_recruiting_data_person_unique 
  ON public.person_recruiting_data(person_id);

CREATE INDEX IF NOT EXISTS idx_person_recruiting_data_status ON public.person_recruiting_data(recruiting_status);
CREATE INDEX IF NOT EXISTS idx_person_recruiting_data_position ON public.person_recruiting_data(target_position_id);
CREATE INDEX IF NOT EXISTS idx_person_recruiting_data_type ON public.person_recruiting_data(candidate_type);
CREATE INDEX IF NOT EXISTS idx_person_recruiting_data_applied ON public.person_recruiting_data(applied_at);

-- =====================================================
-- STEP 3: PERSON_EMPLOYEE_DATA (Employment Extension)
-- Holds HR/payroll data for employees
-- =====================================================

CREATE TABLE IF NOT EXISTS public.person_employee_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES public.unified_persons(id) ON DELETE CASCADE,
  
  -- Employment Status
  employment_status TEXT DEFAULT 'pending' CHECK (employment_status IN (
    'pending', 'onboarding', 'active', 'on_leave', 'suspended', 'terminated', 'resigned'
  )),
  status_changed_at TIMESTAMPTZ DEFAULT NOW(),
  status_reason TEXT,
  
  -- Employee Identification
  employee_number TEXT,
  ssn_last_four TEXT, -- Only store last 4 digits, full SSN in secure vault
  ssn_encrypted TEXT, -- Encrypted full SSN if needed
  
  -- Position & Organization
  position_id UUID REFERENCES public.job_positions(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  manager_id UUID REFERENCES public.unified_persons(id) ON DELETE SET NULL,
  
  -- Employment Details
  employment_type TEXT CHECK (employment_type IN (
    'full_time', 'part_time', 'contractor', 'intern', 'extern', 'per_diem', 'temp'
  )),
  hire_date DATE,
  original_hire_date DATE, -- For rehires
  probation_end_date DATE,
  
  -- Compensation (current)
  pay_rate NUMERIC(10,2),
  pay_type TEXT CHECK (pay_type IN ('hourly', 'salary', 'commission', 'stipend')),
  pay_frequency TEXT CHECK (pay_frequency IN ('weekly', 'bi_weekly', 'semi_monthly', 'monthly')),
  flsa_status TEXT CHECK (flsa_status IN ('exempt', 'non_exempt')),
  
  -- Compensation History
  compensation_history JSONB DEFAULT '[]'::jsonb, -- Array of pay changes with dates
  
  -- Schedule & Time
  default_schedule JSONB, -- Weekly schedule template
  pto_balance_hours NUMERIC(10,2) DEFAULT 0,
  sick_balance_hours NUMERIC(10,2) DEFAULT 0,
  
  -- Access & Permissions
  role TEXT DEFAULT 'employee', -- Maps to profiles.role
  permissions JSONB DEFAULT '{}'::jsonb, -- Additional granular permissions
  
  -- Benefits
  benefits_eligible BOOLEAN DEFAULT false,
  benefits_enrolled JSONB DEFAULT '{}'::jsonb, -- Enrolled benefits
  benefits_enrollment_date DATE,
  
  -- Direct Deposit
  direct_deposit_info JSONB, -- Encrypted banking info
  
  -- Documents & Compliance
  i9_verified BOOLEAN DEFAULT false,
  i9_verified_at TIMESTAMPTZ,
  w4_submitted BOOLEAN DEFAULT false,
  w4_submitted_at TIMESTAMPTZ,
  employee_handbook_signed BOOLEAN DEFAULT false,
  handbook_signed_at TIMESTAMPTZ,
  
  -- Termination (if applicable)
  termination_date DATE,
  termination_type TEXT CHECK (termination_type IN (
    'voluntary', 'involuntary', 'layoff', 'retirement', 'contract_end', 'mutual'
  )),
  termination_reason TEXT,
  eligible_for_rehire BOOLEAN DEFAULT true,
  final_paycheck_issued BOOLEAN DEFAULT false,
  exit_interview_completed BOOLEAN DEFAULT false,
  
  -- Linked legacy record (for migration)
  legacy_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Unique constraint: one employee record per person
CREATE UNIQUE INDEX IF NOT EXISTS idx_person_employee_data_person_unique 
  ON public.person_employee_data(person_id);

CREATE INDEX IF NOT EXISTS idx_person_employee_data_status ON public.person_employee_data(employment_status);
CREATE INDEX IF NOT EXISTS idx_person_employee_data_position ON public.person_employee_data(position_id);
CREATE INDEX IF NOT EXISTS idx_person_employee_data_department ON public.person_employee_data(department_id);
CREATE INDEX IF NOT EXISTS idx_person_employee_data_manager ON public.person_employee_data(manager_id);
CREATE INDEX IF NOT EXISTS idx_person_employee_data_number ON public.person_employee_data(employee_number);

-- =====================================================
-- STEP 4: UPDATE TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_person_crm_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_person_recruiting_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_person_employee_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS person_crm_data_updated_at ON person_crm_data;
CREATE TRIGGER person_crm_data_updated_at
  BEFORE UPDATE ON person_crm_data
  FOR EACH ROW
  EXECUTE FUNCTION update_person_crm_data_updated_at();

DROP TRIGGER IF EXISTS person_recruiting_data_updated_at ON person_recruiting_data;
CREATE TRIGGER person_recruiting_data_updated_at
  BEFORE UPDATE ON person_recruiting_data
  FOR EACH ROW
  EXECUTE FUNCTION update_person_recruiting_data_updated_at();

DROP TRIGGER IF EXISTS person_employee_data_updated_at ON person_employee_data;
CREATE TRIGGER person_employee_data_updated_at
  BEFORE UPDATE ON person_employee_data
  FOR EACH ROW
  EXECUTE FUNCTION update_person_employee_data_updated_at();

-- =====================================================
-- STEP 5: ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.person_crm_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_recruiting_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_employee_data ENABLE ROW LEVEL SECURITY;

-- CRM Data Policies
DROP POLICY IF EXISTS "Admins can manage person_crm_data" ON public.person_crm_data;
CREATE POLICY "Admins can manage person_crm_data"
ON public.person_crm_data FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role IN ('admin', 'super_admin', 'marketing_admin')
  )
);

-- Recruiting Data Policies
DROP POLICY IF EXISTS "Admins can manage person_recruiting_data" ON public.person_recruiting_data;
CREATE POLICY "Admins can manage person_recruiting_data"
ON public.person_recruiting_data FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
  )
);

-- Managers can view recruiting data for their team
DROP POLICY IF EXISTS "Managers can view recruiting_data" ON public.person_recruiting_data;
CREATE POLICY "Managers can view recruiting_data"
ON public.person_recruiting_data FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role IN ('admin', 'super_admin', 'manager')
  )
);

-- Employee Data Policies
DROP POLICY IF EXISTS "Admins can manage person_employee_data" ON public.person_employee_data;
CREATE POLICY "Admins can manage person_employee_data"
ON public.person_employee_data FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
  )
);

-- Users can view their own employee data
DROP POLICY IF EXISTS "Users can view own employee_data" ON public.person_employee_data;
CREATE POLICY "Users can view own employee_data"
ON public.person_employee_data FOR SELECT
TO authenticated
USING (
  person_id IN (
    SELECT up.id FROM unified_persons up
    JOIN profiles p ON up.profile_id = p.id
    WHERE p.auth_user_id = auth.uid()
  )
);

-- Managers can view their direct reports' employee data
DROP POLICY IF EXISTS "Managers can view direct reports employee_data" ON public.person_employee_data;
CREATE POLICY "Managers can view direct reports employee_data"
ON public.person_employee_data FOR SELECT
TO authenticated
USING (
  manager_id IN (
    SELECT up.id FROM unified_persons up
    JOIN profiles p ON up.profile_id = p.id
    WHERE p.auth_user_id = auth.uid()
  )
);

-- =====================================================
-- STEP 6: ACCESS GRANT/REVOKE FUNCTIONS
-- Manage auth.users independently from person records
-- =====================================================

-- Grant system access to a person (create auth.users record)
CREATE OR REPLACE FUNCTION public.grant_person_access(
  p_person_id UUID,
  p_role TEXT DEFAULT 'employee',
  p_send_welcome_email BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_person RECORD;
  v_new_auth_id UUID;
  v_new_profile_id UUID;
  v_actor_id UUID;
  v_temp_password TEXT;
BEGIN
  -- Get actor
  SELECT id INTO v_actor_id FROM profiles WHERE auth_user_id = auth.uid();
  
  -- Verify admin permission
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Only admins can grant system access';
  END IF;
  
  -- Fetch person
  SELECT * INTO v_person FROM unified_persons WHERE id = p_person_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Person not found: %', p_person_id;
  END IF;
  
  -- Check if already has access
  IF v_person.profile_id IS NOT NULL THEN
    -- Check if auth.users record exists
    IF EXISTS (
      SELECT 1 FROM profiles pr
      WHERE pr.id = v_person.profile_id
      AND pr.auth_user_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Person already has system access';
    END IF;
  END IF;
  
  -- Generate temp password (will be overwritten by email invite)
  v_temp_password := encode(gen_random_bytes(16), 'hex');
  
  -- Create auth.users record
  -- Note: In production, use supabase auth.admin API instead
  -- This is a placeholder for the logical flow
  v_new_auth_id := gen_random_uuid();
  
  -- Create profile if doesn't exist
  IF v_person.profile_id IS NULL THEN
    INSERT INTO profiles (
      id,
      auth_user_id,
      email,
      first_name,
      last_name,
      role,
      is_active
    ) VALUES (
      gen_random_uuid(),
      v_new_auth_id,
      v_person.email,
      v_person.first_name,
      v_person.last_name,
      p_role,
      true
    )
    RETURNING id INTO v_new_profile_id;
    
    -- Link profile to person
    UPDATE unified_persons
    SET 
      profile_id = v_new_profile_id,
      updated_at = NOW()
    WHERE id = p_person_id;
  ELSE
    -- Update existing profile with auth link
    UPDATE profiles
    SET 
      auth_user_id = v_new_auth_id,
      role = p_role,
      is_active = true,
      updated_at = NOW()
    WHERE id = v_person.profile_id
    RETURNING id INTO v_new_profile_id;
  END IF;
  
  -- Record transition
  INSERT INTO lifecycle_transitions (
    person_id,
    from_stage,
    to_stage,
    triggered_by,
    trigger_type,
    notes,
    metadata
  ) VALUES (
    p_person_id,
    v_person.current_stage,
    v_person.current_stage, -- Stage doesn't change, just access
    v_actor_id,
    'manual',
    'System access granted with role: ' || p_role,
    jsonb_build_object(
      'action', 'grant_access',
      'role', p_role,
      'profile_id', v_new_profile_id
    )
  );
  
  RETURN v_new_profile_id;
END;
$$;

-- Revoke system access (disable auth without deleting person)
CREATE OR REPLACE FUNCTION public.revoke_person_access(
  p_person_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_person RECORD;
  v_profile RECORD;
  v_actor_id UUID;
BEGIN
  -- Get actor
  SELECT id INTO v_actor_id FROM profiles WHERE auth_user_id = auth.uid();
  
  -- Verify admin permission
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Only admins can revoke system access';
  END IF;
  
  -- Fetch person
  SELECT * INTO v_person FROM unified_persons WHERE id = p_person_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Person not found: %', p_person_id;
  END IF;
  
  IF v_person.profile_id IS NULL THEN
    RAISE EXCEPTION 'Person does not have system access';
  END IF;
  
  -- Disable the profile (keeps history)
  UPDATE profiles
  SET 
    is_active = false,
    updated_at = NOW()
  WHERE id = v_person.profile_id
  RETURNING * INTO v_profile;
  
  -- Note: In production, also disable auth.users via admin API
  -- UPDATE auth.users SET disabled = true WHERE id = v_profile.auth_user_id;
  
  -- Record transition
  INSERT INTO lifecycle_transitions (
    person_id,
    from_stage,
    to_stage,
    triggered_by,
    trigger_type,
    notes,
    metadata
  ) VALUES (
    p_person_id,
    v_person.current_stage,
    v_person.current_stage,
    v_actor_id,
    'manual',
    'System access revoked. Reason: ' || COALESCE(p_reason, 'Not specified'),
    jsonb_build_object(
      'action', 'revoke_access',
      'reason', p_reason,
      'profile_id', v_person.profile_id
    )
  );
  
  RETURN true;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.grant_person_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_person_access TO authenticated;

-- =====================================================
-- STEP 7: UPGRADE FUNCTIONS ("Add a Hat")
-- Allow a person to gain new capabilities without changing ID
-- =====================================================

-- Add CRM data to a person (make them a lead)
CREATE OR REPLACE FUNCTION public.add_crm_hat(
  p_person_id UUID,
  p_acquisition_source TEXT DEFAULT NULL,
  p_acquisition_detail TEXT DEFAULT NULL,
  p_tags JSONB DEFAULT '[]'::jsonb,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_crm_id UUID;
  v_actor_id UUID;
BEGIN
  -- Get actor
  SELECT id INTO v_actor_id FROM profiles WHERE auth_user_id = auth.uid();
  
  -- Create or update CRM data
  INSERT INTO person_crm_data (
    person_id,
    acquisition_source,
    acquisition_detail,
    tags,
    marketing_notes,
    first_touch_date,
    created_by
  ) VALUES (
    p_person_id,
    p_acquisition_source,
    p_acquisition_detail,
    p_tags,
    p_notes,
    NOW(),
    v_actor_id
  )
  ON CONFLICT (person_id) DO UPDATE
  SET 
    acquisition_source = COALESCE(EXCLUDED.acquisition_source, person_crm_data.acquisition_source),
    acquisition_detail = COALESCE(EXCLUDED.acquisition_detail, person_crm_data.acquisition_detail),
    tags = person_crm_data.tags || EXCLUDED.tags,
    marketing_notes = COALESCE(EXCLUDED.marketing_notes || E'\n' || person_crm_data.marketing_notes, person_crm_data.marketing_notes),
    updated_by = v_actor_id,
    updated_at = NOW();
  
  -- Get the id after upsert
  SELECT id INTO v_crm_id FROM person_crm_data WHERE person_id = p_person_id;
  
  -- Update unified_persons stage if visitor
  UPDATE unified_persons
  SET 
    current_stage = CASE 
      WHEN current_stage = 'visitor' THEN 'lead'
      ELSE current_stage
    END,
    source_type = COALESCE(source_type, p_acquisition_source),
    source_detail = COALESCE(source_detail, p_acquisition_detail),
    updated_at = NOW()
  WHERE id = p_person_id;
  
  RETURN v_crm_id;
END;
$$;

-- Add Recruiting data to a person (make them an applicant)
CREATE OR REPLACE FUNCTION public.add_recruiting_hat(
  p_person_id UUID,
  p_target_position_id UUID DEFAULT NULL,
  p_target_department_id UUID DEFAULT NULL,
  p_target_location_id UUID DEFAULT NULL,
  p_candidate_type TEXT DEFAULT 'applicant',
  p_resume_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recruiting_id UUID;
  v_person RECORD;
  v_actor_id UUID;
BEGIN
  -- Get actor
  SELECT id INTO v_actor_id FROM profiles WHERE auth_user_id = auth.uid();
  
  -- Get person
  SELECT * INTO v_person FROM unified_persons WHERE id = p_person_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Person not found: %', p_person_id;
  END IF;
  
  -- Create recruiting data
  INSERT INTO person_recruiting_data (
    person_id,
    target_position_id,
    target_department_id,
    target_location_id,
    candidate_type,
    resume_url,
    applied_at,
    recruiting_status,
    created_by
  ) VALUES (
    p_person_id,
    p_target_position_id,
    p_target_department_id,
    p_target_location_id,
    p_candidate_type,
    p_resume_url,
    NOW(),
    'new',
    v_actor_id
  )
  ON CONFLICT (person_id) DO UPDATE
  SET 
    target_position_id = COALESCE(EXCLUDED.target_position_id, person_recruiting_data.target_position_id),
    target_department_id = COALESCE(EXCLUDED.target_department_id, person_recruiting_data.target_department_id),
    target_location_id = COALESCE(EXCLUDED.target_location_id, person_recruiting_data.target_location_id),
    resume_url = COALESCE(EXCLUDED.resume_url, person_recruiting_data.resume_url),
    updated_by = v_actor_id,
    updated_at = NOW();
  
  -- Get the id after upsert
  SELECT id INTO v_recruiting_id FROM person_recruiting_data WHERE person_id = p_person_id;
  
  -- Update stage
  UPDATE unified_persons
  SET 
    current_stage = CASE 
      WHEN current_stage IN ('visitor', 'lead') THEN 'applicant'
      ELSE current_stage
    END,
    stage_entered_at = CASE 
      WHEN current_stage IN ('visitor', 'lead') THEN NOW()
      ELSE stage_entered_at
    END,
    updated_at = NOW()
  WHERE id = p_person_id;
  
  -- Record transition if stage changed
  IF v_person.current_stage IN ('visitor', 'lead') THEN
    INSERT INTO lifecycle_transitions (
      person_id,
      from_stage,
      to_stage,
      triggered_by,
      trigger_type,
      notes
    ) VALUES (
      p_person_id,
      v_person.current_stage,
      'applicant',
      v_actor_id,
      'manual',
      'Applied for position via add_recruiting_hat'
    );
  END IF;
  
  RETURN v_recruiting_id;
END;
$$;

-- Add Employee data to a person (hire them)
CREATE OR REPLACE FUNCTION public.add_employee_hat(
  p_person_id UUID,
  p_position_id UUID,
  p_department_id UUID DEFAULT NULL,
  p_location_id UUID DEFAULT NULL,
  p_hire_date DATE DEFAULT CURRENT_DATE,
  p_employment_type TEXT DEFAULT 'full_time',
  p_pay_rate NUMERIC DEFAULT NULL,
  p_pay_type TEXT DEFAULT 'hourly'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_data_id UUID;
  v_person RECORD;
  v_employee_number TEXT;
  v_actor_id UUID;
BEGIN
  -- Get actor
  SELECT id INTO v_actor_id FROM profiles WHERE auth_user_id = auth.uid();
  
  -- Verify admin permission
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Only admins can add employee status';
  END IF;
  
  -- Get person
  SELECT * INTO v_person FROM unified_persons WHERE id = p_person_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Person not found: %', p_person_id;
  END IF;
  
  -- Generate employee number
  v_employee_number := (
    SELECT 'EMP' || LPAD((COALESCE(MAX(NULLIF(REGEXP_REPLACE(employee_number, '[^0-9]', '', 'g'), '')::INTEGER, 0) + 1)::TEXT, 4, '0'))
    FROM person_employee_data
  );
  
  -- Create employee data
  INSERT INTO person_employee_data (
    person_id,
    position_id,
    department_id,
    location_id,
    hire_date,
    original_hire_date,
    employment_type,
    pay_rate,
    pay_type,
    employee_number,
    employment_status,
    created_by
  ) VALUES (
    p_person_id,
    p_position_id,
    p_department_id,
    p_location_id,
    p_hire_date,
    p_hire_date,
    p_employment_type,
    p_pay_rate,
    p_pay_type,
    v_employee_number,
    'onboarding',
    v_actor_id
  )
  ON CONFLICT (person_id) DO UPDATE
  SET 
    position_id = EXCLUDED.position_id,
    department_id = EXCLUDED.department_id,
    location_id = EXCLUDED.location_id,
    hire_date = EXCLUDED.hire_date,
    employment_type = EXCLUDED.employment_type,
    pay_rate = EXCLUDED.pay_rate,
    pay_type = EXCLUDED.pay_type,
    employment_status = 'onboarding',
    updated_by = v_actor_id,
    updated_at = NOW();
  
  -- Get the id after upsert
  SELECT id INTO v_employee_data_id FROM person_employee_data WHERE person_id = p_person_id;
  
  -- Update stage
  UPDATE unified_persons
  SET 
    current_stage = 'employee',
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
    notes,
    metadata
  ) VALUES (
    p_person_id,
    v_person.current_stage,
    'employee',
    v_actor_id,
    'manual',
    'Hired as employee',
    jsonb_build_object(
      'employee_number', v_employee_number,
      'hire_date', p_hire_date,
      'position_id', p_position_id
    )
  );
  
  RETURN v_employee_data_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.add_crm_hat TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_recruiting_hat TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_employee_hat TO authenticated;

-- =====================================================
-- STEP 8: UNIFIED MASTER PROFILE VIEW
-- Single view to access all "hats" for a person
-- =====================================================

CREATE OR REPLACE VIEW public.master_profile_view AS
SELECT 
  up.id,
  up.first_name,
  up.last_name,
  up.preferred_name,
  up.email,
  up.email_secondary,
  up.phone_mobile,
  up.phone_home,
  up.phone_work,
  up.address_line1,
  up.address_line2,
  up.city,
  up.state,
  up.postal_code,
  up.country,
  up.date_of_birth,
  up.gender,
  up.pronouns,
  up.emergency_contact_name,
  up.emergency_contact_phone,
  up.emergency_contact_relationship,
  up.emergency_contact_email,
  up.avatar_url,
  up.linkedin_url,
  up.website_url,
  up.current_stage,
  up.stage_entered_at,
  up.source_type,
  up.source_detail,
  up.referral_source,
  up.is_active,
  up.created_at,
  up.updated_at,
  up.last_activity_at,
  
  -- Has "hats" indicators
  (crm.id IS NOT NULL) AS has_crm_data,
  (rec.id IS NOT NULL) AS has_recruiting_data,
  (emp.id IS NOT NULL) AS has_employee_data,
  (up.profile_id IS NOT NULL) AS has_system_access,
  
  -- CRM Summary
  crm.lead_status,
  crm.lead_score,
  crm.acquisition_source,
  crm.tags AS crm_tags,
  
  -- Recruiting Summary
  rec.recruiting_status,
  rec.candidate_type,
  rec.target_position_id,
  jp.title AS target_position_title,
  rec.applied_at,
  rec.overall_rating,
  
  -- Employee Summary
  emp.employee_number,
  emp.employment_status,
  emp.employment_type,
  emp.hire_date,
  emp_pos.title AS current_position_title,
  dept.name AS department_name,
  loc.name AS location_name,
  emp.pay_rate,
  emp.pay_type,
  
  -- Profile/Access
  pr.role AS system_role,
  pr.is_active AS access_active
  
FROM unified_persons up
LEFT JOIN person_crm_data crm ON up.id = crm.person_id
LEFT JOIN person_recruiting_data rec ON up.id = rec.person_id
LEFT JOIN job_positions jp ON rec.target_position_id = jp.id
LEFT JOIN person_employee_data emp ON up.id = emp.person_id
LEFT JOIN job_positions emp_pos ON emp.position_id = emp_pos.id
LEFT JOIN departments dept ON emp.department_id = dept.id
LEFT JOIN locations loc ON emp.location_id = loc.id
LEFT JOIN profiles pr ON up.profile_id = pr.id;

-- Grant access
GRANT SELECT ON public.master_profile_view TO authenticated;

-- =====================================================
-- STEP 9: MIGRATION FUNCTION - Populate Extension Tables
-- Copies data from legacy tables to new extension tables
-- =====================================================

CREATE OR REPLACE FUNCTION public.migrate_to_extension_tables()
RETURNS TABLE(
  extension_table TEXT,
  records_created INTEGER,
  records_updated INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created INTEGER := 0;
  v_updated INTEGER := 0;
BEGIN
  -- Migrate marketing_leads to person_crm_data
  INSERT INTO person_crm_data (
    person_id,
    lead_status,
    acquisition_source,
    marketing_notes,
    first_touch_date,
    tags
  )
  SELECT 
    up.id,
    COALESCE(ml.status, 'new'),
    ml.source,
    ml.notes,
    ml.created_at,
    COALESCE(ml.tags, '[]'::jsonb)
  FROM unified_persons up
  JOIN marketing_leads ml ON up.marketing_lead_id = ml.id
  WHERE NOT EXISTS (
    SELECT 1 FROM person_crm_data pcd WHERE pcd.person_id = up.id
  )
  ON CONFLICT (person_id) DO NOTHING;
  
  GET DIAGNOSTICS v_created = ROW_COUNT;
  
  extension_table := 'person_crm_data';
  records_created := v_created;
  records_updated := 0;
  RETURN NEXT;
  
  -- Reset counters
  v_created := 0;
  
  -- Migrate candidates to person_recruiting_data
  INSERT INTO person_recruiting_data (
    person_id,
    recruiting_status,
    target_position_id,
    target_department_id,
    target_location_id,
    candidate_type,
    resume_url,
    applied_at,
    application_source,
    legacy_candidate_id
  )
  SELECT 
    up.id,
    CASE c.status
      WHEN 'new' THEN 'new'
      WHEN 'screening' THEN 'screening'
      WHEN 'interview' THEN 'interviewing'
      WHEN 'offer' THEN 'offer_extended'
      WHEN 'hired' THEN 'hired'
      WHEN 'rejected' THEN 'rejected'
      ELSE 'new'
    END,
    c.target_position_id,
    c.department_id,
    c.location_id,
    COALESCE(c.candidate_type, 'applicant'),
    c.resume_url,
    c.applied_at,
    c.source,
    c.id
  FROM unified_persons up
  JOIN candidates c ON up.candidate_id = c.id
  WHERE NOT EXISTS (
    SELECT 1 FROM person_recruiting_data prd WHERE prd.person_id = up.id
  )
  ON CONFLICT (person_id) DO NOTHING;
  
  GET DIAGNOSTICS v_created = ROW_COUNT;
  
  extension_table := 'person_recruiting_data';
  records_created := v_created;
  records_updated := 0;
  RETURN NEXT;
  
  -- Reset counters
  v_created := 0;
  
  -- Migrate employees to person_employee_data
  INSERT INTO person_employee_data (
    person_id,
    employment_status,
    employee_number,
    position_id,
    department_id,
    location_id,
    employment_type,
    hire_date,
    original_hire_date,
    pay_rate,
    pay_type,
    legacy_employee_id
  )
  SELECT 
    up.id,
    CASE e.employment_status
      WHEN 'active' THEN 'active'
      WHEN 'terminated' THEN 'terminated'
      WHEN 'on_leave' THEN 'on_leave'
      ELSE 'active'
    END,
    e.employee_number,
    e.position_id,
    e.department_id,
    e.location_id,
    COALESCE(e.employment_type, 'full_time'),
    e.hire_date,
    e.hire_date,
    e.hourly_rate,
    'hourly',
    e.id
  FROM unified_persons up
  JOIN employees e ON up.employee_id = e.id
  WHERE NOT EXISTS (
    SELECT 1 FROM person_employee_data ped WHERE ped.person_id = up.id
  )
  ON CONFLICT (person_id) DO NOTHING;
  
  GET DIAGNOSTICS v_created = ROW_COUNT;
  
  extension_table := 'person_employee_data';
  records_created := v_created;
  records_updated := 0;
  RETURN NEXT;
END;
$$;

-- Only allow admins
REVOKE EXECUTE ON FUNCTION public.migrate_to_extension_tables FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.migrate_to_extension_tables TO authenticated;

-- =====================================================
-- STEP 10: LOOKUP FUNCTION - Find Person by Email
-- Deduplication-safe lookup
-- =====================================================

CREATE OR REPLACE FUNCTION public.find_or_create_person(
  p_email TEXT,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_source_type TEXT DEFAULT 'manual',
  p_source_detail TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_person_id UUID;
  v_actor_id UUID;
BEGIN
  -- Get actor
  SELECT id INTO v_actor_id FROM profiles WHERE auth_user_id = auth.uid();
  
  -- Look for existing person
  SELECT id INTO v_person_id
  FROM unified_persons
  WHERE LOWER(email) = LOWER(p_email)
  LIMIT 1;
  
  IF v_person_id IS NOT NULL THEN
    -- Update last activity
    UPDATE unified_persons
    SET last_activity_at = NOW()
    WHERE id = v_person_id;
    
    RETURN v_person_id;
  END IF;
  
  -- Create new person
  INSERT INTO unified_persons (
    email,
    first_name,
    last_name,
    current_stage,
    source_type,
    source_detail,
    created_by
  ) VALUES (
    LOWER(p_email),
    COALESCE(p_first_name, ''),
    COALESCE(p_last_name, ''),
    'visitor',
    p_source_type,
    p_source_detail,
    v_actor_id
  )
  RETURNING id INTO v_person_id;
  
  RETURN v_person_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_or_create_person TO authenticated;

-- =====================================================
-- DONE!
-- =====================================================
-- The Unified Master Profile architecture is complete.
--
-- Key Functions:
--   find_or_create_person(email) - Dedup-safe lookup
--   add_crm_hat(person_id) - Add marketing data
--   add_recruiting_hat(person_id) - Add applicant data
--   add_employee_hat(person_id) - Add employment data
--   grant_person_access(person_id) - Create login
--   revoke_person_access(person_id) - Disable login
--   migrate_to_extension_tables() - Populate from legacy
--
-- Key Views:
--   master_profile_view - All data unified
-- =====================================================
