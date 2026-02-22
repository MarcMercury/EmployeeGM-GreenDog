-- =====================================================
-- Migration 264: Restore Student Program View
-- =====================================================
-- Description: Migration 200b incorrectly dropped and replaced the
-- student_program_view with a broken definition referencing a
-- non-existent student_programs table. This migration restores
-- the correct view definition from migration 121 which joins
-- person_program_data with unified_persons.
-- =====================================================

DROP VIEW IF EXISTS public.student_program_view CASCADE;

CREATE OR REPLACE VIEW public.student_program_view AS
SELECT 
  ppd.id AS enrollment_id,
  up.id AS person_id,
  
  -- Person Info
  up.first_name,
  up.last_name,
  up.preferred_name,
  COALESCE(up.preferred_name, up.first_name) || ' ' || up.last_name AS display_name,
  up.email,
  up.phone_mobile,
  up.avatar_url,
  up.current_stage AS lifecycle_stage,
  
  -- Program Info
  ppd.program_type,
  ppd.enrollment_status,
  ppd.program_name,
  ppd.cohort_identifier,
  ppd.start_date,
  ppd.end_date,
  ppd.expected_graduation_date,
  ppd.actual_completion_date,
  
  -- School Info
  ppd.school_of_origin,
  ppd.school_program,
  ppd.academic_advisor,
  
  -- Assignment
  ppd.assigned_location_id,
  l.name AS location_name,
  ppd.assigned_mentor_id,
  mentor.first_name || ' ' || mentor.last_name AS mentor_name,
  ppd.assigned_coordinator_id,
  coord.first_name || ' ' || coord.last_name AS coordinator_name,
  
  -- Schedule
  ppd.schedule_type,
  ppd.scheduled_hours_per_week,
  
  -- Compensation
  ppd.is_paid,
  ppd.stipend_amount,
  ppd.stipend_frequency,
  
  -- Progress
  ppd.hours_completed,
  ppd.hours_required,
  CASE 
    WHEN ppd.hours_required > 0 
    THEN ROUND((ppd.hours_completed / ppd.hours_required) * 100, 1)
    ELSE 0 
  END AS completion_percentage,
  ppd.overall_performance_rating,
  
  -- Outcomes
  ppd.eligible_for_employment,
  ppd.employment_interest_level,
  ppd.converted_to_employee,
  
  -- Status flags
  CASE 
    WHEN ppd.start_date > CURRENT_DATE THEN 'upcoming'
    WHEN ppd.end_date < CURRENT_DATE THEN 'past'
    WHEN ppd.enrollment_status IN ('enrolled', 'in_progress') THEN 'current'
    ELSE 'other'
  END AS time_status,
  
  -- Metadata
  ppd.created_at,
  ppd.updated_at

FROM public.person_program_data ppd
JOIN public.unified_persons up ON up.id = ppd.person_id
LEFT JOIN public.locations l ON l.id = ppd.assigned_location_id
LEFT JOIN public.employees mentor ON mentor.id = ppd.assigned_mentor_id
LEFT JOIN public.employees coord ON coord.id = ppd.assigned_coordinator_id;

-- Grant access
GRANT SELECT ON public.student_program_view TO authenticated;
