-- =====================================================
-- CLEAN SLATE: Drop all tables and start fresh
-- WARNING: This will delete all data!
-- =====================================================

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS public.points_log CASCADE;
DROP TABLE IF EXISTS public.employee_achievements CASCADE;
DROP TABLE IF EXISTS public.achievements CASCADE;
DROP TABLE IF EXISTS public.employee_certifications CASCADE;
DROP TABLE IF EXISTS public.certifications CASCADE;
DROP TABLE IF EXISTS public.mentorships CASCADE;
DROP TABLE IF EXISTS public.skill_categories CASCADE;
DROP TABLE IF EXISTS public.employee_skills CASCADE;
DROP TABLE IF EXISTS public.skill_library CASCADE;
DROP TABLE IF EXISTS public.feature_flags CASCADE;
DROP TABLE IF EXISTS public.app_settings CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.employee_notes CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.payroll_run_items CASCADE;
DROP TABLE IF EXISTS public.payroll_runs CASCADE;
DROP TABLE IF EXISTS public.pay_periods CASCADE;
DROP TABLE IF EXISTS public.employee_pay_settings CASCADE;
DROP TABLE IF EXISTS public.financial_kpis CASCADE;
DROP TABLE IF EXISTS public.feedback CASCADE;
DROP TABLE IF EXISTS public.goal_updates CASCADE;
DROP TABLE IF EXISTS public.goals CASCADE;
DROP TABLE IF EXISTS public.review_signoffs CASCADE;
DROP TABLE IF EXISTS public.review_responses CASCADE;
DROP TABLE IF EXISTS public.review_participants CASCADE;
DROP TABLE IF EXISTS public.performance_reviews CASCADE;
DROP TABLE IF EXISTS public.review_templates CASCADE;
DROP TABLE IF EXISTS public.review_cycles CASCADE;
DROP TABLE IF EXISTS public.training_quiz_attempts CASCADE;
DROP TABLE IF EXISTS public.training_quiz_questions CASCADE;
DROP TABLE IF EXISTS public.training_quizzes CASCADE;
DROP TABLE IF EXISTS public.training_progress CASCADE;
DROP TABLE IF EXISTS public.training_enrollments CASCADE;
DROP TABLE IF EXISTS public.training_lessons CASCADE;
DROP TABLE IF EXISTS public.training_courses CASCADE;
DROP TABLE IF EXISTS public.social_post_attachments CASCADE;
DROP TABLE IF EXISTS public.social_posts CASCADE;
DROP TABLE IF EXISTS public.social_accounts CASCADE;
DROP TABLE IF EXISTS public.lead_activities CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.marketing_assets CASCADE;
DROP TABLE IF EXISTS public.files CASCADE;
DROP TABLE IF EXISTS public.marketing_campaigns CASCADE;
DROP TABLE IF EXISTS public.appointment_participants CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.shift_changes CASCADE;
DROP TABLE IF EXISTS public.time_entries CASCADE;
DROP TABLE IF EXISTS public.shifts CASCADE;
DROP TABLE IF EXISTS public.shift_templates CASCADE;
DROP TABLE IF EXISTS public.time_punches CASCADE;
DROP TABLE IF EXISTS public.clock_devices CASCADE;
DROP TABLE IF EXISTS public.geofences CASCADE;
DROP TABLE IF EXISTS public.time_off_requests CASCADE;
DROP TABLE IF EXISTS public.time_off_types CASCADE;
DROP TABLE IF EXISTS public.work_schedules CASCADE;
DROP TABLE IF EXISTS public.employee_teams CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.employees CASCADE;
DROP TABLE IF EXISTS public.job_positions CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.locations CASCADE;
DROP TABLE IF EXISTS public.company_settings CASCADE;
DROP TABLE IF EXISTS public.profile_roles CASCADE;
DROP TABLE IF EXISTS public.role_permissions CASCADE;
DROP TABLE IF EXISTS public.permissions CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop old tables that may exist from previous schemas
DROP TABLE IF EXISTS public.schedules CASCADE;
DROP TABLE IF EXISTS public.skills CASCADE;

-- Drop enums if they exist
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS time_off_status CASCADE;
DROP TYPE IF EXISTS shift_type CASCADE;
