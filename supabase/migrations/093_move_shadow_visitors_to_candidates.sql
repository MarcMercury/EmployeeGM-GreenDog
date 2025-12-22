-- =====================================================
-- Migration: Move Shadow Interview Visitors to Recruiting
-- 093_move_shadow_visitors_to_candidates.sql
-- 
-- This migration identifies education_visitors with 
-- "Interviewee/Shadow" or "Shadow Interview" program
-- and moves them to the candidates table for recruiting.
-- =====================================================

-- Step 1: Insert shadow interview visitors into candidates table
-- Map fields appropriately:
-- - first_name, last_name -> first_name, last_name
-- - email -> generate placeholder if null
-- - status -> 'interview' (they've had a shadow interview)
-- - source -> 'Shadow Interview'
-- - notes -> include program info, coordinator, visit date, etc.
-- - applied_at -> visit_start_date

INSERT INTO public.candidates (
  first_name,
  last_name,
  email,
  phone,
  status,
  source,
  notes,
  applied_at,
  created_at,
  updated_at
)
SELECT
  ev.first_name,
  ev.last_name,
  -- Generate email if not present (use lowercase first.last@candidate.greendog.vet)
  COALESCE(
    ev.email, 
    LOWER(REPLACE(ev.first_name, ' ', '') || '.' || REPLACE(COALESCE(ev.last_name, 'unknown'), ' ', '') || '@candidate.greendog.vet')
  ) AS email,
  ev.phone,
  -- Set status based on visit_status
  CASE 
    WHEN ev.visit_status = 'done' THEN 'interview'
    WHEN ev.visit_status = 'upcoming' THEN 'screening'
    ELSE 'interview'
  END AS status,
  'Shadow Interview' AS source,
  -- Build notes from visitor data
  CONCAT_WS(E'\n',
    'Migrated from Visitor CRM',
    'Program: ' || ev.program_name,
    CASE WHEN ev.visit_start_date IS NOT NULL 
      THEN 'Visit Date: ' || ev.visit_start_date::text 
      ELSE NULL 
    END,
    CASE WHEN ev.coordinator IS NOT NULL 
      THEN 'Coordinator: ' || ev.coordinator 
      ELSE NULL 
    END,
    CASE WHEN ev.mentor IS NOT NULL 
      THEN 'Mentor: ' || ev.mentor 
      ELSE NULL 
    END,
    CASE WHEN ev.location IS NOT NULL 
      THEN 'Location: ' || ev.location 
      ELSE NULL 
    END,
    CASE WHEN ev.visit_status IS NOT NULL 
      THEN 'Shadow Status: ' || ev.visit_status 
      ELSE NULL 
    END,
    ev.notes
  ) AS notes,
  COALESCE(ev.visit_start_date, ev.created_at::date) AS applied_at,
  NOW() AS created_at,
  NOW() AS updated_at
FROM public.education_visitors ev
WHERE 
  -- Match Interviewee/Shadow program patterns
  (
    ev.program_name ILIKE '%Interviewee%'
    OR ev.program_name ILIKE '%Shadow%Interview%'
    OR ev.program_name ILIKE '%Shadow Interview%'
    OR ev.visitor_type = 'shadow'
  )
  -- Don't duplicate if already exists
  AND NOT EXISTS (
    SELECT 1 FROM public.candidates c 
    WHERE 
      LOWER(c.first_name) = LOWER(ev.first_name) 
      AND LOWER(c.last_name) = LOWER(COALESCE(ev.last_name, ''))
  );

-- Step 2: Mark these visitors as migrated by updating their status
-- We'll set is_active = false and add a note indicating migration
UPDATE public.education_visitors
SET 
  is_active = false,
  notes = CONCAT_WS(E'\n', 
    notes, 
    '[MIGRATED TO RECRUITING ' || NOW()::date || '] Moved to Candidates Pipeline'
  )
WHERE 
  (
    program_name ILIKE '%Interviewee%'
    OR program_name ILIKE '%Shadow%Interview%'
    OR program_name ILIKE '%Shadow Interview%'
    OR visitor_type = 'shadow'
  );

-- Step 3: Log the migration
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count 
  FROM public.candidates 
  WHERE source = 'Shadow Interview';
  
  RAISE NOTICE 'Migration complete: % shadow interview visitors moved to candidates pipeline', v_count;
END $$;
