-- =====================================================
-- Migration: 082_signed_notes_global.sql
-- Description: Add signed notes support (author initials, edited tracking) 
--              to all note tables for global consistency
-- Tables affected: employee_notes, candidate_notes
-- =====================================================

-- =====================================================
-- 1. ENHANCE EMPLOYEE_NOTES WITH SIGNED NOTE FIELDS
-- =====================================================

-- Add author_initials column
ALTER TABLE public.employee_notes 
  ADD COLUMN IF NOT EXISTS author_initials VARCHAR(5);

-- Add edited_at timestamp
ALTER TABLE public.employee_notes 
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- Add edited_by_initials column
ALTER TABLE public.employee_notes 
  ADD COLUMN IF NOT EXISTS edited_by_initials VARCHAR(5);

-- Add note_type if not exists (for categorization)
ALTER TABLE public.employee_notes 
  ADD COLUMN IF NOT EXISTS note_type TEXT DEFAULT 'general';

-- Add is_pinned if not exists
ALTER TABLE public.employee_notes 
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- Add updated_at column
ALTER TABLE public.employee_notes 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN public.employee_notes.author_initials IS 'Initials of the user who created the note (e.g., JD for John Doe)';
COMMENT ON COLUMN public.employee_notes.edited_by_initials IS 'Initials of the user who last edited the note';
COMMENT ON COLUMN public.employee_notes.edited_at IS 'Timestamp when the note was last edited';

-- =====================================================
-- 2. ENHANCE CANDIDATE_NOTES WITH SIGNED NOTE FIELDS
-- =====================================================

-- Add author_initials column
ALTER TABLE public.candidate_notes 
  ADD COLUMN IF NOT EXISTS author_initials VARCHAR(5);

-- Add edited_at timestamp
ALTER TABLE public.candidate_notes 
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- Add edited_by_initials column  
ALTER TABLE public.candidate_notes 
  ADD COLUMN IF NOT EXISTS edited_by_initials VARCHAR(5);

COMMENT ON COLUMN public.candidate_notes.author_initials IS 'Initials of the user who created the note (e.g., JD for John Doe)';
COMMENT ON COLUMN public.candidate_notes.edited_by_initials IS 'Initials of the user who last edited the note';
COMMENT ON COLUMN public.candidate_notes.edited_at IS 'Timestamp when the note was last edited';

-- =====================================================
-- 3. REUSE GET_USER_INITIALS FUNCTION FROM MIGRATION 081
-- =====================================================

-- The get_user_initials function was created in migration 081
-- We don't recreate it here to avoid return type conflicts
-- If needed, ensure function exists and use it

-- =====================================================
-- 4. TRIGGER FUNCTIONS FOR AUTO-POPULATING INITIALS
-- =====================================================

-- Employee notes trigger function
CREATE OR REPLACE FUNCTION public.set_employee_note_initials()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.author_initials IS NULL THEN
    NEW.author_initials := public.get_user_initials(auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Employee notes edited trigger function
CREATE OR REPLACE FUNCTION public.set_employee_note_edited_initials()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.note IS DISTINCT FROM NEW.note THEN
    NEW.edited_at := NOW();
    NEW.edited_by_initials := public.get_user_initials(auth.uid());
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Candidate notes trigger function
CREATE OR REPLACE FUNCTION public.set_candidate_note_initials()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.author_initials IS NULL THEN
    NEW.author_initials := public.get_user_initials(auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Candidate notes edited trigger function
CREATE OR REPLACE FUNCTION public.set_candidate_note_edited_initials()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.note IS DISTINCT FROM NEW.note THEN
    NEW.edited_at := NOW();
    NEW.edited_by_initials := public.get_user_initials(auth.uid());
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. CREATE TRIGGERS
-- =====================================================

-- Employee notes insert trigger
DROP TRIGGER IF EXISTS trigger_set_employee_note_initials ON public.employee_notes;
CREATE TRIGGER trigger_set_employee_note_initials
  BEFORE INSERT ON public.employee_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_employee_note_initials();

-- Employee notes update trigger
DROP TRIGGER IF EXISTS trigger_set_employee_note_edited_initials ON public.employee_notes;
CREATE TRIGGER trigger_set_employee_note_edited_initials
  BEFORE UPDATE ON public.employee_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_employee_note_edited_initials();

-- Candidate notes insert trigger
DROP TRIGGER IF EXISTS trigger_set_candidate_note_initials ON public.candidate_notes;
CREATE TRIGGER trigger_set_candidate_note_initials
  BEFORE INSERT ON public.candidate_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_candidate_note_initials();

-- Candidate notes update trigger
DROP TRIGGER IF EXISTS trigger_set_candidate_note_edited_initials ON public.candidate_notes;
CREATE TRIGGER trigger_set_candidate_note_edited_initials
  BEFORE UPDATE ON public.candidate_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_candidate_note_edited_initials();

-- =====================================================
-- 6. BACKFILL EXISTING NOTES WITH AUTHOR INITIALS
-- =====================================================

-- Backfill employee_notes where author_employee_id is set
UPDATE public.employee_notes en
SET author_initials = public.get_user_initials(en.author_employee_id)
WHERE en.author_initials IS NULL 
  AND en.author_employee_id IS NOT NULL;

-- Backfill candidate_notes where author_id is set
UPDATE public.candidate_notes cn
SET author_initials = public.get_user_initials(cn.author_id)
WHERE cn.author_initials IS NULL 
  AND cn.author_id IS NOT NULL;

-- For notes without author, mark as system
UPDATE public.employee_notes
SET author_initials = 'SY'
WHERE author_initials IS NULL;

UPDATE public.candidate_notes
SET author_initials = 'SY'
WHERE author_initials IS NULL;

-- =====================================================
-- 7. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_employee_notes_created_at 
  ON public.employee_notes(created_at DESC);
  
CREATE INDEX IF NOT EXISTS idx_candidate_notes_created_at 
  ON public.candidate_notes(created_at DESC);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION public.get_user_initials IS 'Returns user initials from their profile for signed notes';
COMMENT ON TRIGGER trigger_set_employee_note_initials ON public.employee_notes IS 'Auto-populates author initials on new employee notes';
COMMENT ON TRIGGER trigger_set_candidate_note_initials ON public.candidate_notes IS 'Auto-populates author initials on new candidate notes';
