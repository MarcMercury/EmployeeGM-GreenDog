-- =====================================================
-- VISITOR REASON FOR VISIT
-- Migration: 102_visitor_reason_for_visit.sql
-- Description: Add reason_for_visit field to education_visitors
--              for tracking why visitors are coming
-- =====================================================

-- Add reason_for_visit field
ALTER TABLE education_visitors 
ADD COLUMN IF NOT EXISTS reason_for_visit TEXT;

-- Add a comment for documentation
COMMENT ON COLUMN education_visitors.reason_for_visit IS 'The reason or purpose for the visitor''s visit (e.g., shadowing, externship, interview)';
