-- Migration: 053_interview_enhancements.sql
-- Purpose: Add interview-related columns for candidate assessment
-- Created: December 16, 2025

-- =====================================================
-- ADD INTERVIEW ASSESSMENT COLUMNS TO CANDIDATES
-- =====================================================

-- Overall interview score (1-5 stars)
ALTER TABLE public.candidates 
ADD COLUMN IF NOT EXISTS overall_score INTEGER CHECK (overall_score >= 1 AND overall_score <= 5);

-- Experience years
ALTER TABLE public.candidates 
ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0;

-- Salary expectation
ALTER TABLE public.candidates 
ADD COLUMN IF NOT EXISTS salary_expectation DECIMAL(12,2);

-- Interview status for tracking interview stage
ALTER TABLE public.candidates 
ADD COLUMN IF NOT EXISTS interview_status TEXT DEFAULT 'pending' 
CHECK (interview_status IN ('pending', 'scheduled', 'in_progress', 'completed', 'follow_up'));

-- =====================================================
-- CREATE CANDIDATE_FORWARDS TABLE FOR REVIEW ROUTING
-- =====================================================
CREATE TABLE IF NOT EXISTS public.candidate_forwards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
    forwarded_by_employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE SET NULL,
    forwarded_to_employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'completed')),
    forwarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_candidate_forwards_candidate ON public.candidate_forwards(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_forwards_to ON public.candidate_forwards(forwarded_to_employee_id);
CREATE INDEX IF NOT EXISTS idx_candidate_forwards_by ON public.candidate_forwards(forwarded_by_employee_id);
CREATE INDEX IF NOT EXISTS idx_candidate_forwards_status ON public.candidate_forwards(status);

-- RLS
ALTER TABLE public.candidate_forwards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage forwards" ON public.candidate_forwards;
CREATE POLICY "Admins can manage forwards" ON public.candidate_forwards
FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Users can view forwards to them" ON public.candidate_forwards;
CREATE POLICY "Users can view forwards to them" ON public.candidate_forwards
FOR SELECT USING (
    forwarded_to_employee_id IN (
        SELECT e.id FROM public.employees e WHERE e.profile_id = auth.uid()
    )
);

GRANT SELECT, INSERT, UPDATE ON public.candidate_forwards TO authenticated;

-- =====================================================
-- NOTIFICATION TRIGGER FOR CANDIDATE FORWARDS
-- =====================================================
CREATE OR REPLACE FUNCTION notify_candidate_forward()
RETURNS TRIGGER AS $$
DECLARE
    v_forwarded_to_profile_id UUID;
    v_candidate_name TEXT;
    v_forwarder_name TEXT;
BEGIN
    -- Get the profile_id of the employee being forwarded to
    SELECT e.profile_id INTO v_forwarded_to_profile_id
    FROM public.employees e
    WHERE e.id = NEW.forwarded_to_employee_id;
    
    -- Get candidate name
    SELECT first_name || ' ' || last_name INTO v_candidate_name
    FROM public.candidates WHERE id = NEW.candidate_id;
    
    -- Get forwarder name
    SELECT first_name || ' ' || last_name INTO v_forwarder_name
    FROM public.employees WHERE id = NEW.forwarded_by_employee_id;
    
    -- Create notification for the employee receiving the forward
    IF v_forwarded_to_profile_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            profile_id,
            type,
            category,
            title,
            body,
            action_url,
            requires_action
        ) VALUES (
            v_forwarded_to_profile_id,
            'info',
            'recruiting',
            'Candidate Review Request',
            v_forwarder_name || ' has forwarded ' || v_candidate_name || ' for your review',
            '/recruiting/' || NEW.candidate_id,
            true
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_candidate_forward ON public.candidate_forwards;
CREATE TRIGGER trigger_notify_candidate_forward
    AFTER INSERT ON public.candidate_forwards
    FOR EACH ROW
    EXECUTE FUNCTION notify_candidate_forward();
