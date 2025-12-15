-- =====================================================
-- Migration 045: Recruiting Module Fixes
-- =====================================================
-- 1. Add target_position_id to candidates
-- 2. Fix candidate_skills rating column name
-- 3. Add indexes for better performance
-- =====================================================

-- Add target_position_id to candidates table
ALTER TABLE public.candidates 
ADD COLUMN IF NOT EXISTS target_position_id UUID REFERENCES public.job_positions(id) ON DELETE SET NULL;

-- Add index for target position lookups
CREATE INDEX IF NOT EXISTS idx_candidates_target_position ON public.candidates(target_position_id);

-- Update candidate_skills to have 'rated_at' column if missing
ALTER TABLE public.candidate_skills 
ADD COLUMN IF NOT EXISTS rated_at TIMESTAMPTZ;

ALTER TABLE public.candidate_skills 
ADD COLUMN IF NOT EXISTS rated_by UUID REFERENCES public.profiles(id);

-- Add skill_level alias as view for backwards compat
-- (Some code references skill_level instead of rating)

-- Create or update RLS policies for candidates
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage candidates" ON public.candidates;
CREATE POLICY "Admins can manage candidates" 
ON public.candidates FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role = 'admin'
  )
);

-- Grant permissions
GRANT ALL ON public.candidates TO authenticated;
GRANT ALL ON public.candidate_skills TO authenticated;
GRANT ALL ON public.candidate_documents TO authenticated;
GRANT ALL ON public.candidate_notes TO authenticated;

-- =====================================================
-- Resume text extraction placeholder function
-- Will be replaced with actual OCR integration later
-- =====================================================

CREATE OR REPLACE FUNCTION public.extract_resume_text(p_document_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_doc RECORD;
  v_extracted JSONB;
BEGIN
  -- Get the document
  SELECT * INTO v_doc FROM candidate_documents WHERE id = p_document_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Document not found');
  END IF;
  
  -- Placeholder: In production, this would call an OCR service
  -- For now, return a placeholder response
  v_extracted := jsonb_build_object(
    'status', 'pending',
    'message', 'Resume parsing not yet implemented. Manual entry required.',
    'document_id', p_document_id,
    'file_name', v_doc.file_name,
    'parsed_at', NOW()
  );
  
  RETURN v_extracted;
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION public.extract_resume_text(UUID) TO authenticated;
