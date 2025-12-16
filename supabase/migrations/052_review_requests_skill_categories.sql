-- Migration: 052_review_requests_skill_categories.sql
-- Purpose: Add skill_categories column and rename columns for clarity
-- Created: December 16, 2025

-- =====================================================
-- ADD NEW COLUMNS TO REVIEW_REQUESTS
-- =====================================================

-- Add skill_categories column (array of category names)
ALTER TABLE public.review_requests 
ADD COLUMN IF NOT EXISTS skill_categories TEXT[];

-- Add topics column (alias for topics_to_cover for cleaner API)
ALTER TABLE public.review_requests 
ADD COLUMN IF NOT EXISTS topics TEXT[];

-- Add notes column (alias for additional_notes)
ALTER TABLE public.review_requests 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Comment on columns
COMMENT ON COLUMN public.review_requests.skill_categories IS 'Array of skill category names to review (e.g., Clinical Skills, Leadership)';
COMMENT ON COLUMN public.review_requests.topics IS 'Array of discussion topics for the review';
COMMENT ON COLUMN public.review_requests.notes IS 'Additional notes or context for the review';
