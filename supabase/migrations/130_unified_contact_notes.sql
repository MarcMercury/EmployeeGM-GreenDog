-- =====================================================
-- Migration 130: Unified Contact Notes System
-- =====================================================
-- Description: Creates a unified notes table for all contact types
-- (students, candidates, employees, partners, visitors)
-- with consistent timestamped, initialed notes functionality.
-- =====================================================

-- =====================================================
-- 1. CREATE UNIFIED CONTACT_NOTES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.contact_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Polymorphic reference to the contact
  contact_type TEXT NOT NULL CHECK (contact_type IN ('student', 'candidate', 'employee', 'partner', 'visitor', 'influencer', 'referral')),
  contact_id UUID NOT NULL,
  
  -- For students, also track the enrollment
  enrollment_id UUID NULL,
  
  -- Note content
  note TEXT NOT NULL,
  note_type TEXT DEFAULT 'general' CHECK (note_type IN ('general', 'progress', 'feedback', 'interview', 'hr', 'performance', 'training', 'system')),
  
  -- Author tracking
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_initials VARCHAR(5),
  
  -- Edit tracking
  edited_at TIMESTAMPTZ,
  edited_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  edited_by_initials VARCHAR(5),
  
  -- Visibility and flags
  visibility TEXT DEFAULT 'internal' CHECK (visibility IN ('internal', 'hr_only', 'management', 'self')),
  is_pinned BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  
  -- Transfer tracking (when note follows a person through stages)
  source_note_id UUID NULL, -- Original note if this was transferred
  transferred_from TEXT NULL, -- e.g., 'student', 'candidate'
  transferred_at TIMESTAMPTZ NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_contact_notes_contact 
  ON public.contact_notes(contact_type, contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_notes_enrollment 
  ON public.contact_notes(enrollment_id) WHERE enrollment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contact_notes_created 
  ON public.contact_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_notes_author 
  ON public.contact_notes(author_id);
CREATE INDEX IF NOT EXISTS idx_contact_notes_pinned 
  ON public.contact_notes(contact_type, contact_id) WHERE is_pinned = true;

-- Comments
COMMENT ON TABLE public.contact_notes IS 'Unified notes table for all contact types - students, candidates, employees, partners, etc.';
COMMENT ON COLUMN public.contact_notes.contact_type IS 'Type of contact: student, candidate, employee, partner, visitor, influencer, referral';
COMMENT ON COLUMN public.contact_notes.contact_id IS 'UUID of the contact record (person_id for students, candidate_id, employee_id, etc.)';
COMMENT ON COLUMN public.contact_notes.enrollment_id IS 'For students, references the specific person_program_data enrollment';
COMMENT ON COLUMN public.contact_notes.visibility IS 'Who can see this note: internal (all staff), hr_only, management, self (only the contact)';
COMMENT ON COLUMN public.contact_notes.source_note_id IS 'If this note was transferred from another stage, the original note ID';

-- =====================================================
-- 2. TRIGGER FOR AUTO-SETTING INITIALS
-- =====================================================

CREATE OR REPLACE FUNCTION public.set_contact_note_initials()
RETURNS TRIGGER AS $$
BEGIN
  -- Set author initials on insert
  IF TG_OP = 'INSERT' AND NEW.author_initials IS NULL THEN
    NEW.author_initials := public.get_user_initials(auth.uid());
  END IF;
  
  -- Set author_id if not provided
  IF TG_OP = 'INSERT' AND NEW.author_id IS NULL THEN
    SELECT id INTO NEW.author_id FROM public.profiles WHERE auth_user_id = auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.set_contact_note_edited()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.note IS DISTINCT FROM NEW.note THEN
    NEW.edited_at := NOW();
    NEW.edited_by_initials := public.get_user_initials(auth.uid());
    SELECT id INTO NEW.edited_by_id FROM public.profiles WHERE auth_user_id = auth.uid();
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_contact_note_initials ON public.contact_notes;
CREATE TRIGGER trigger_contact_note_initials
  BEFORE INSERT ON public.contact_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_contact_note_initials();

DROP TRIGGER IF EXISTS trigger_contact_note_edited ON public.contact_notes;
CREATE TRIGGER trigger_contact_note_edited
  BEFORE UPDATE ON public.contact_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_contact_note_edited();

-- =====================================================
-- 3. RLS POLICIES
-- =====================================================

ALTER TABLE public.contact_notes ENABLE ROW LEVEL SECURITY;

-- Select policy: staff can see notes based on visibility
CREATE POLICY "Staff can view contact notes"
  ON public.contact_notes FOR SELECT
  TO authenticated
  USING (
    -- HR-only notes visible to admins/HR
    (visibility = 'hr_only' AND (
      public.is_admin() OR 
      EXISTS (SELECT 1 FROM public.profiles WHERE auth_user_id = auth.uid() AND role IN ('hr', 'hr_manager'))
    ))
    OR
    -- Management notes visible to managers+
    (visibility = 'management' AND EXISTS (
      SELECT 1 FROM public.profiles WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'super_admin', 'manager', 'hr', 'hr_manager')
    ))
    OR
    -- Internal notes visible to all authenticated staff
    (visibility = 'internal')
    OR
    -- Self notes visible to the contact themselves
    (visibility = 'self')
  );

-- Insert policy: authenticated staff can create notes
CREATE POLICY "Staff can create contact notes"
  ON public.contact_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE auth_user_id = auth.uid())
  );

-- Update policy: author or admin can edit
CREATE POLICY "Author or admin can update contact notes"
  ON public.contact_notes FOR UPDATE
  TO authenticated
  USING (
    author_id = (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    OR public.is_admin()
  )
  WITH CHECK (
    author_id = (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    OR public.is_admin()
  );

-- Delete policy: admin only
CREATE POLICY "Admins can delete contact notes"
  ON public.contact_notes FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- =====================================================
-- 4. FUNCTION TO ADD A NOTE (Unified Interface)
-- =====================================================

CREATE OR REPLACE FUNCTION public.add_contact_note(
  p_contact_type TEXT,
  p_contact_id UUID,
  p_note TEXT,
  p_note_type TEXT DEFAULT 'general',
  p_visibility TEXT DEFAULT 'internal',
  p_enrollment_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_note_id UUID;
  v_author_id UUID;
BEGIN
  -- Get author profile
  SELECT id INTO v_author_id FROM public.profiles WHERE auth_user_id = auth.uid();
  
  INSERT INTO public.contact_notes (
    contact_type, contact_id, enrollment_id, 
    note, note_type, visibility, author_id
  ) VALUES (
    p_contact_type, p_contact_id, p_enrollment_id,
    p_note, p_note_type, p_visibility, v_author_id
  )
  RETURNING id INTO v_note_id;
  
  RETURN v_note_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.add_contact_note TO authenticated;

-- =====================================================
-- 5. FUNCTION TO TRANSFER NOTES BETWEEN STAGES
-- =====================================================

CREATE OR REPLACE FUNCTION public.transfer_contact_notes(
  p_source_type TEXT,
  p_source_id UUID,
  p_target_type TEXT,
  p_target_id UUID,
  p_mark_hr_only BOOLEAN DEFAULT false
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  INSERT INTO public.contact_notes (
    contact_type, contact_id, note, note_type,
    author_id, author_initials,
    visibility,
    source_note_id, transferred_from, transferred_at,
    created_at
  )
  SELECT 
    p_target_type,
    p_target_id,
    note,
    note_type,
    author_id,
    author_initials,
    CASE WHEN p_mark_hr_only THEN 'hr_only' ELSE visibility END,
    id,
    p_source_type,
    NOW(),
    created_at
  FROM public.contact_notes
  WHERE contact_type = p_source_type
    AND contact_id = p_source_id
    AND NOT is_archived;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.transfer_contact_notes TO authenticated;

-- =====================================================
-- 6. VIEW FOR EASY QUERYING WITH AUTHOR INFO
-- =====================================================

CREATE OR REPLACE VIEW public.contact_notes_view AS
SELECT 
  cn.*,
  COALESCE(p.first_name || ' ' || p.last_name, 'Unknown') AS author_name,
  ep.first_name || ' ' || ep.last_name AS edited_by_name
FROM public.contact_notes cn
LEFT JOIN public.profiles p ON cn.author_id = p.id
LEFT JOIN public.profiles ep ON cn.edited_by_id = ep.id
WHERE NOT cn.is_archived;

GRANT SELECT ON public.contact_notes_view TO authenticated;

-- =====================================================
-- 7. MIGRATE EXISTING NOTES (Optional - run separately)
-- =====================================================

-- This section can be used to migrate existing notes to the unified table
-- Run these only if you want to consolidate all notes

-- Migrate candidate_notes
-- INSERT INTO public.contact_notes (
--   contact_type, contact_id, note, note_type,
--   author_id, author_initials, visibility, created_at
-- )
-- SELECT 
--   'candidate', candidate_id, content, 'general',
--   author_id, author_initials, 'internal', created_at
-- FROM public.candidate_notes
-- ON CONFLICT DO NOTHING;

-- Migrate employee_notes  
-- INSERT INTO public.contact_notes (
--   contact_type, contact_id, note, note_type,
--   author_id, author_initials, visibility, created_at
-- )
-- SELECT 
--   'employee', employee_id, note, COALESCE(note_type, 'general'),
--   (SELECT id FROM profiles WHERE employees.id = employee_notes.author_employee_id),
--   author_initials, 
--   CASE WHEN visibility = 'private' THEN 'internal' ELSE visibility END,
--   created_at
-- FROM public.employee_notes
-- ON CONFLICT DO NOTHING;
