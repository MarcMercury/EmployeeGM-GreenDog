-- =====================================================
-- MIGRATION: 029_seed_all_employee_skills.sql
-- Description: Seeds all skills to all employees at level 0
-- This allows viewing how skills are displayed across the system
-- Created: December 2024
-- =====================================================

-- Insert all skills for all employees at level 0
-- Uses ON CONFLICT to skip any that already exist
INSERT INTO public.employee_skills (employee_id, skill_id, level, notes)
SELECT 
    e.id as employee_id,
    s.id as skill_id,
    0 as level,
    'Auto-seeded - pending assessment' as notes
FROM public.employees e
CROSS JOIN public.skill_library s
ON CONFLICT (employee_id, skill_id) DO NOTHING;

-- Verify the seeding
DO $$
DECLARE
    employee_count INTEGER;
    skill_count INTEGER;
    employee_skill_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO employee_count FROM public.employees;
    SELECT COUNT(*) INTO skill_count FROM public.skill_library;
    SELECT COUNT(*) INTO employee_skill_count FROM public.employee_skills;
    
    RAISE NOTICE 'Employees: %, Skills: %, Employee Skills: % (expected: %)', 
        employee_count, 
        skill_count, 
        employee_skill_count,
        employee_count * skill_count;
END $$;

-- =====================================================
-- Done!
-- =====================================================
