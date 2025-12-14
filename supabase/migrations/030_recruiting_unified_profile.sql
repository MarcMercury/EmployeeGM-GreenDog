-- =====================================================
-- Migration: Recruiting Module - Unified Profile Schema
-- Description: Re-engineer candidates as "employees in draft mode"
-- Creates data parity between candidates and employees tables
-- Adds candidate_documents, candidate_notes tables
-- Creates promote_candidate_to_employee function
-- =====================================================

-- =====================================================
-- STEP 1: Extend candidates table with employee-parity columns
-- =====================================================

-- Vitals & Contact Info
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS preferred_name TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS email_personal TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS phone_mobile TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS phone_work TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Emergency Contact
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT;

-- Professional Licenses
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS license_type TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS license_state TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS license_expiration DATE;

-- Compensation Expectations
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS expected_salary NUMERIC;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS expected_hourly_rate NUMERIC;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS pay_type_preference TEXT CHECK (pay_type_preference IN ('hourly', 'salary', 'either'));

-- Employment Details (to be finalized on hire)
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS source TEXT; -- where did they come from (referral, indeed, etc.)
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS referral_source TEXT; -- if referral, who referred them

-- Interview Tracking
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS interview_date TIMESTAMPTZ;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS interviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS working_interview_date DATE;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS working_interview_completed BOOLEAN DEFAULT false;

-- Avatar/Photo
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- =====================================================
-- STEP 2: Create candidate_documents table (mirrors employee_documents)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.candidate_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  uploader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  description TEXT,
  category TEXT DEFAULT 'general' CHECK (category IN (
    'general', 'resume', 'cover_letter', 'certification', 
    'license', 'reference', 'background_check', 'other'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidate_documents_candidate ON candidate_documents(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_documents_category ON candidate_documents(category);

-- Enable RLS
ALTER TABLE public.candidate_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can manage candidate documents
DROP POLICY IF EXISTS "Admins can manage candidate documents" ON public.candidate_documents;
CREATE POLICY "Admins can manage candidate documents"
ON public.candidate_documents FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role IN ('admin')
  )
);

-- =====================================================
-- STEP 3: Create candidate_notes table (mirrors employee_notes)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.candidate_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  note TEXT NOT NULL,
  note_type TEXT DEFAULT 'general' CHECK (note_type IN (
    'general', 'interview', 'screening', 'reference_check', 
    'background_check', 'offer', 'rejection', 'system'
  )),
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidate_notes_candidate ON candidate_notes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_notes_type ON candidate_notes(note_type);

-- Enable RLS
ALTER TABLE public.candidate_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can manage candidate notes
DROP POLICY IF EXISTS "Admins can manage candidate notes" ON public.candidate_notes;
CREATE POLICY "Admins can manage candidate notes"
ON public.candidate_notes FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role IN ('admin')
  )
);

-- =====================================================
-- STEP 4: Updated_at triggers for new tables
-- =====================================================

CREATE OR REPLACE FUNCTION update_candidate_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS candidate_documents_updated_at ON candidate_documents;
CREATE TRIGGER candidate_documents_updated_at
  BEFORE UPDATE ON candidate_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_candidate_documents_updated_at();

CREATE OR REPLACE FUNCTION update_candidate_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS candidate_notes_updated_at ON candidate_notes;
CREATE TRIGGER candidate_notes_updated_at
  BEFORE UPDATE ON candidate_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_candidate_notes_updated_at();

-- =====================================================
-- STEP 5: The "Promote Candidate to Employee" Function
-- This is the atomic transaction that handles hiring
-- =====================================================

CREATE OR REPLACE FUNCTION public.promote_candidate_to_employee(
  p_candidate_id UUID,
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
AS $$
DECLARE
  v_new_employee_id UUID;
  v_new_profile_id UUID;
  v_candidate RECORD;
  v_employee_number TEXT;
BEGIN
  -- 1. Fetch the candidate record
  SELECT * INTO v_candidate FROM candidates WHERE id = p_candidate_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Candidate not found: %', p_candidate_id;
  END IF;
  
  IF v_candidate.status = 'hired' THEN
    RAISE EXCEPTION 'Candidate has already been hired';
  END IF;
  
  -- 2. Generate employee number (EMP-YYYYMMDD-XXXX)
  v_employee_number := 'EMP-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || 
                       lpad(floor(random() * 10000)::text, 4, '0');
  
  -- 3. Create a profile for the new employee (no auth user yet)
  INSERT INTO profiles (
    email,
    first_name,
    last_name,
    phone,
    avatar_url,
    role,
    is_active
  ) VALUES (
    v_candidate.email,
    v_candidate.first_name,
    v_candidate.last_name,
    COALESCE(v_candidate.phone_mobile, v_candidate.phone),
    v_candidate.avatar_url,
    'user',
    true
  )
  RETURNING id INTO v_new_profile_id;
  
  -- 4. Create the employee record
  INSERT INTO employees (
    profile_id,
    employee_number,
    first_name,
    last_name,
    preferred_name,
    email_work,
    email_personal,
    phone_work,
    phone_mobile,
    department_id,
    position_id,
    location_id,
    employment_type,
    employment_status,
    hire_date,
    date_of_birth,
    notes_internal
  ) VALUES (
    v_new_profile_id,
    v_employee_number,
    v_candidate.first_name,
    v_candidate.last_name,
    v_candidate.preferred_name,
    v_candidate.email,  -- work email defaults to candidate email
    v_candidate.email_personal,
    v_candidate.phone_work,
    COALESCE(v_candidate.phone_mobile, v_candidate.phone),
    COALESCE(p_department_id, v_candidate.department_id),
    p_job_title_id,
    COALESCE(p_location_id, v_candidate.location_id),
    p_employment_type,
    'active',
    p_start_date,
    v_candidate.date_of_birth,
    v_candidate.notes
  )
  RETURNING id INTO v_new_employee_id;
  
  -- 5. Migrate candidate_skills → employee_skills
  INSERT INTO employee_skills (
    employee_id,
    skill_id,
    rating,
    is_goal,
    notes,
    last_assessed_at,
    created_at
  )
  SELECT 
    v_new_employee_id,
    cs.skill_id,
    cs.rating,
    false,  -- not a goal yet
    cs.notes,
    cs.rated_at,
    cs.created_at
  FROM candidate_skills cs
  WHERE cs.candidate_id = p_candidate_id;
  
  -- 6. Migrate candidate_documents → employee_documents
  INSERT INTO employee_documents (
    employee_id,
    uploader_id,
    file_name,
    file_url,
    file_type,
    file_size,
    description,
    category,
    created_at
  )
  SELECT 
    v_new_employee_id,
    cd.uploader_id,
    cd.file_name,
    cd.file_url,
    cd.file_type,
    cd.file_size,
    cd.description,
    CASE cd.category
      WHEN 'resume' THEN 'general'
      WHEN 'cover_letter' THEN 'general'
      WHEN 'certification' THEN 'certification'
      WHEN 'license' THEN 'license'
      WHEN 'background_check' THEN 'other'
      ELSE cd.category
    END,
    cd.created_at
  FROM candidate_documents cd
  WHERE cd.candidate_id = p_candidate_id;
  
  -- 7. Migrate candidate_notes → employee_notes
  INSERT INTO employee_notes (
    employee_id,
    author_id,
    note,
    note_type,
    is_pinned,
    created_at
  )
  SELECT 
    v_new_employee_id,
    cn.author_id,
    cn.note,
    CASE cn.note_type
      WHEN 'interview' THEN 'general'
      WHEN 'screening' THEN 'general'
      WHEN 'reference_check' THEN 'general'
      WHEN 'offer' THEN 'general'
      ELSE COALESCE(cn.note_type, 'general')
    END,
    cn.is_pinned,
    cn.created_at
  FROM candidate_notes cn
  WHERE cn.candidate_id = p_candidate_id;
  
  -- 8. Create license record if candidate had license info
  IF v_candidate.license_number IS NOT NULL THEN
    INSERT INTO employee_licenses (
      employee_id,
      license_type,
      license_number,
      state,
      expiration_date,
      status
    ) VALUES (
      v_new_employee_id,
      COALESCE(v_candidate.license_type, 'RVT'),
      v_candidate.license_number,
      v_candidate.license_state,
      v_candidate.license_expiration,
      CASE 
        WHEN v_candidate.license_expiration < CURRENT_DATE THEN 'expired'
        ELSE 'active'
      END
    );
  END IF;
  
  -- 9. Create pay settings for the employee
  INSERT INTO employee_pay_settings (
    employee_id,
    pay_type,
    hourly_rate,
    annual_salary,
    effective_date
  ) VALUES (
    v_new_employee_id,
    p_pay_type,
    CASE WHEN p_pay_type = 'hourly' THEN p_starting_wage ELSE NULL END,
    CASE WHEN p_pay_type = 'salary' THEN p_starting_wage ELSE NULL END,
    p_start_date
  );
  
  -- 10. Update candidate status to 'hired' and link to employee
  UPDATE candidates 
  SET 
    status = 'hired',
    updated_at = NOW()
  WHERE id = p_candidate_id;
  
  -- 11. Add a system note documenting the hire
  INSERT INTO employee_notes (
    employee_id,
    note,
    note_type,
    created_at
  ) VALUES (
    v_new_employee_id,
    'Employee record created from candidate profile. Original application date: ' || 
    to_char(v_candidate.applied_at, 'YYYY-MM-DD'),
    'system',
    NOW()
  );
  
  RETURN v_new_employee_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.promote_candidate_to_employee TO authenticated;

-- =====================================================
-- STEP 6: Update candidates RLS to use auth_user_id correctly
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage candidates" ON public.candidates;
CREATE POLICY "Admins can manage candidates"
ON public.candidates FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role IN ('admin')
  )
);

DROP POLICY IF EXISTS "Admins can manage candidate skills" ON public.candidate_skills;
CREATE POLICY "Admins can manage candidate skills"
ON public.candidate_skills FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role IN ('admin')
  )
);

DROP POLICY IF EXISTS "Admins can manage onboarding" ON public.onboarding_checklist;
CREATE POLICY "Admins can manage onboarding"
ON public.onboarding_checklist FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role IN ('admin')
  )
);

-- =====================================================
-- Done! The recruiting module now supports:
-- 1. Full data parity with employees table
-- 2. Document storage during interview process
-- 3. Notes/timeline during interview process  
-- 4. One-click hire with atomic data migration
-- =====================================================
