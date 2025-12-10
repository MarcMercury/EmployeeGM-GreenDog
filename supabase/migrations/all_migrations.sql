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
-- =====================================================
-- Employee GM - Green Dog Dental
-- Complete Database Schema
-- Run 001_clean_slate.sql first to drop existing tables
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. PROFILES (linked to auth.users)
-- Per AGENT.md: role column on profiles: enum 'admin', 'user'
-- =====================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 2. ROLES & PERMISSIONS
-- =====================================================
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

CREATE TABLE public.profile_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, role_id)
);

-- =====================================================
-- 3. COMPANY SETTINGS
-- =====================================================
CREATE TABLE public.company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legal_name TEXT,
  display_name TEXT,
  industry TEXT,
  timezone TEXT DEFAULT 'America/Los_Angeles',
  locale TEXT DEFAULT 'en-US',
  default_workweek_start INTEGER DEFAULT 0,
  primary_address JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 4. LOCATIONS
-- =====================================================
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'USA',
  postal_code TEXT,
  phone TEXT,
  timezone TEXT DEFAULT 'America/Los_Angeles',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 5. DEPARTMENTS
-- =====================================================
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT,
  parent_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 6. JOB POSITIONS
-- =====================================================
CREATE TABLE public.job_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  code TEXT,
  description TEXT,
  job_family TEXT,
  is_manager BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 7. EMPLOYEES
-- =====================================================
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
  employee_number TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  preferred_name TEXT,
  email_work TEXT,
  email_personal TEXT,
  phone_work TEXT,
  phone_mobile TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  position_id UUID REFERENCES public.job_positions(id) ON DELETE SET NULL,
  manager_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  employment_type TEXT DEFAULT 'full-time' CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'per-diem', 'intern')),
  employment_status TEXT DEFAULT 'active' CHECK (employment_status IN ('active', 'inactive', 'on-leave', 'terminated')),
  hire_date DATE,
  termination_date DATE,
  termination_reason TEXT,
  date_of_birth DATE,
  notes_internal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 8. TEAMS
-- =====================================================
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.employee_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  role_in_team TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, team_id)
);

-- =====================================================
-- 9. WORK SCHEDULES
-- =====================================================
CREATE TABLE public.work_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  start_time TIME,
  end_time TIME,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 10. TIME OFF
-- =====================================================
CREATE TABLE public.time_off_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  is_paid BOOLEAN NOT NULL DEFAULT true,
  default_hours_per_day NUMERIC DEFAULT 8,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.time_off_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  time_off_type_id UUID NOT NULL REFERENCES public.time_off_types(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_hours NUMERIC CHECK (duration_hours > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  manager_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 11. GEOFENCES & CLOCK DEVICES
-- =====================================================
CREATE TABLE public.geofences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  latitude NUMERIC,
  longitude NUMERIC,
  radius_meters NUMERIC DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.clock_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  device_type TEXT,
  identifier TEXT UNIQUE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 12. TIME PUNCHES & ENTRIES
-- =====================================================
CREATE TABLE public.time_punches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  punch_type TEXT NOT NULL CHECK (punch_type IN ('in', 'out')),
  punched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_device_id UUID REFERENCES public.clock_devices(id) ON DELETE SET NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  geo_accuracy_meters NUMERIC,
  geofence_id UUID REFERENCES public.geofences(id) ON DELETE SET NULL,
  within_geofence BOOLEAN,
  violation_reason TEXT,
  source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 13. SHIFT TEMPLATES & SHIFTS
-- =====================================================
CREATE TABLE public.shift_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  weekday INTEGER CHECK (weekday >= 0 AND weekday <= 6),
  start_time TIME,
  end_time TIME,
  role_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'completed', 'missed', 'cancelled')),
  is_open_shift BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_by_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
  clock_in_at TIMESTAMPTZ,
  clock_out_at TIMESTAMPTZ,
  total_hours NUMERIC,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  approved_by_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  correction_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.shift_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  from_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  to_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  type TEXT,
  status TEXT DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  manager_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  manager_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 14. APPOINTMENTS
-- =====================================================
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  location_type TEXT,
  location_detail TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled',
  created_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.appointment_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  is_internal BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 15. MARKETING CAMPAIGNS & LEADS
-- =====================================================
CREATE TABLE public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  channel TEXT CHECK (channel IN ('email', 'social', 'print', 'digital', 'event', 'referral', 'other')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled')),
  start_date DATE,
  end_date DATE,
  budget NUMERIC,
  objective TEXT,
  target_audience TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Files table (needed for marketing_assets FK)
CREATE TABLE public.files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uploader_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  bucket TEXT,
  path TEXT,
  original_name TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  linked_entity_type TEXT,
  linked_entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.marketing_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  type TEXT,
  title TEXT,
  content TEXT,
  file_id UUID REFERENCES public.files(id) ON DELETE SET NULL,
  url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  source TEXT,
  campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  owner_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost', 'unqualified')),
  lifecycle_stage TEXT CHECK (lifecycle_stage IN ('subscriber', 'lead', 'marketing_qualified', 'sales_qualified', 'opportunity', 'customer', 'evangelist')),
  company_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.lead_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  type TEXT,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  summary TEXT,
  metadata JSONB,
  happened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 16. SOCIAL MEDIA
-- =====================================================
CREATE TABLE public.social_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform TEXT NOT NULL,
  handle TEXT,
  profile_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.social_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  social_account_id UUID REFERENCES public.social_accounts(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  title TEXT,
  content TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed', 'deleted')),
  scheduled_for TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  target_platforms TEXT,
  link_url TEXT,
  metrics JSONB,
  created_by_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.social_post_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  social_post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  file_id UUID REFERENCES public.files(id) ON DELETE SET NULL,
  alt_text TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 17. TRAINING & COURSES
-- =====================================================
CREATE TABLE public.training_courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  estimated_hours NUMERIC,
  is_required_for_role BOOLEAN NOT NULL DEFAULT false,
  required_for_position_ids JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.training_lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  video_url TEXT,
  file_id UUID REFERENCES public.files(id) ON DELETE SET NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.training_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date DATE,
  status TEXT DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'in_progress', 'completed', 'expired', 'dropped')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, course_id)
);

CREATE TABLE public.training_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.training_lessons(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  progress_percent NUMERIC DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, lesson_id)
);

CREATE TABLE public.training_quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES public.training_courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.training_lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instructions TEXT,
  passing_score NUMERIC DEFAULT 70 CHECK (passing_score >= 0 AND passing_score <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.training_quiz_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES public.training_quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice',
  options JSONB,
  correct_answer JSONB,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.training_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES public.training_quizzes(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  score NUMERIC,
  passed BOOLEAN,
  answers JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 18. PERFORMANCE REVIEWS
-- =====================================================
CREATE TABLE public.review_cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  period_start DATE,
  period_end DATE,
  due_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'in_review', 'calibration', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.review_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  form_schema JSONB,
  workflow_config JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.performance_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_cycle_id UUID REFERENCES public.review_cycles(id) ON DELETE SET NULL,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  manager_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.review_templates(id) ON DELETE SET NULL,
  current_stage TEXT CHECK (current_stage IN ('self_review', 'manager_review', 'calibration', 'delivery', 'acknowledged')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'submitted', 'completed', 'cancelled')),
  employee_submitted_at TIMESTAMPTZ,
  manager_submitted_at TIMESTAMPTZ,
  calibrated_rating NUMERIC CHECK (calibrated_rating >= 0 AND calibrated_rating <= 5),
  overall_rating NUMERIC CHECK (overall_rating >= 0 AND overall_rating <= 5),
  summary_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.review_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  performance_review_id UUID NOT NULL REFERENCES public.performance_reviews(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  role TEXT,
  status TEXT DEFAULT 'pending',
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.review_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  performance_review_id UUID NOT NULL REFERENCES public.performance_reviews(id) ON DELETE CASCADE,
  question_key TEXT,
  responder_role TEXT,
  responder_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  answer_text TEXT,
  answer_value NUMERIC,
  visibility TEXT DEFAULT 'private',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.review_signoffs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  performance_review_id UUID NOT NULL REFERENCES public.performance_reviews(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  role TEXT,
  signed_at TIMESTAMPTZ,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 19. GOALS & FEEDBACK
-- =====================================================
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  owner_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  aligns_to_goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'company')),
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'cancelled', 'on_hold')),
  start_date DATE,
  target_date DATE,
  completed_at TIMESTAMPTZ,
  progress_percent NUMERIC DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  metrics JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.goal_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  comment TEXT,
  progress_percent NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  to_employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  type TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  message TEXT,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 20. PAY & PAYROLL
-- =====================================================
CREATE TABLE public.employee_pay_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  pay_type TEXT DEFAULT 'hourly',
  hourly_rate NUMERIC,
  annual_salary NUMERIC,
  currency TEXT DEFAULT 'USD',
  overtime_multiplier NUMERIC DEFAULT 1.5,
  effective_from DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.pay_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL CHECK (end_date >= start_date),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'processing', 'finalized')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.payroll_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pay_period_id UUID NOT NULL REFERENCES public.pay_periods(id) ON DELETE CASCADE,
  run_number INTEGER DEFAULT 1 CHECK (run_number > 0),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'processed', 'cancelled')),
  total_gross_pay NUMERIC CHECK (total_gross_pay >= 0),
  total_hours NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.payroll_run_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  regular_hours NUMERIC,
  overtime_hours NUMERIC,
  other_hours NUMERIC,
  gross_pay NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.financial_kpis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_start DATE,
  period_end DATE,
  kpi_key TEXT NOT NULL,
  kpi_label TEXT,
  value NUMERIC,
  currency TEXT DEFAULT 'USD',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 21. ANNOUNCEMENTS, TASKS, NOTES
-- =====================================================
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  body TEXT,
  audience_type TEXT DEFAULT 'all',
  audience_filter JSONB,
  published_at TIMESTAMPTZ,
  published_by_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_by_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  related_entity_type TEXT,
  related_entity_id UUID,
  due_date DATE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.employee_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  author_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  visibility TEXT DEFAULT 'private',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 22. NOTIFICATIONS
-- =====================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT,
  title TEXT,
  body TEXT,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 23. AUDIT LOGS
-- =====================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 24. APP SETTINGS & FEATURE FLAGS
-- =====================================================
CREATE TABLE public.app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feature_key TEXT NOT NULL UNIQUE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 25. SKILL LIBRARY
-- =====================================================
CREATE TABLE public.skill_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(category, name)
);

CREATE TABLE public.employee_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skill_library(id) ON DELETE CASCADE,
  level INTEGER DEFAULT 0 CHECK (level >= 0 AND level <= 5),
  certified_at TIMESTAMPTZ,
  certified_by_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, skill_id)
);

-- =====================================================
-- 26. MENTORSHIPS (per AGENT.md - Learner-Mentor relationships)
-- Automatic pairing: Learners (level 0) with Mentors (level 5)
-- =====================================================
CREATE TABLE public.mentorships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  skill_id UUID NOT NULL REFERENCES public.skill_library(id) ON DELETE CASCADE,
  mentor_employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  mentee_employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  mentor_notes TEXT,
  mentee_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Prevent self-mentorship
  CONSTRAINT no_self_mentorship CHECK (mentor_employee_id != mentee_employee_id),
  -- One active mentorship per skill per mentee
  UNIQUE(skill_id, mentee_employee_id, mentor_employee_id)
);

-- =====================================================
-- 27. CERTIFICATIONS (per AGENT.md - Required certifications)
-- =====================================================
CREATE TABLE public.certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  description TEXT,
  issuing_authority TEXT,
  validity_months INTEGER,
  is_required BOOLEAN NOT NULL DEFAULT false,
  required_for_position_ids JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.employee_certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  certification_id UUID NOT NULL REFERENCES public.certifications(id) ON DELETE CASCADE,
  certification_number TEXT,
  issued_date DATE,
  expiration_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'expired', 'revoked', 'renewal_pending')),
  verified_by_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  document_file_id UUID REFERENCES public.files(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, certification_id)
);

-- =====================================================
-- 28. ACHIEVEMENTS & GAMIFICATION (per AGENT.md)
-- =====================================================
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  description TEXT,
  icon_url TEXT,
  badge_color TEXT,
  category TEXT CHECK (category IN ('skills', 'training', 'attendance', 'performance', 'tenure', 'special')),
  points INTEGER DEFAULT 0 CHECK (points >= 0),
  criteria JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.employee_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  awarded_by_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, achievement_id)
);

-- =====================================================
-- 29. POINTS LOG (per AGENT.md - Point tracking for gamification)
-- =====================================================
CREATE TABLE public.points_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  source_type TEXT CHECK (source_type IN ('achievement', 'skill', 'training', 'manual', 'attendance', 'performance')),
  source_id UUID,
  awarded_by_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 30. SKILL CATEGORIES (per AGENT.md - Skill groupings)
-- Normalized from skill_library.category for better queries
-- =====================================================
CREATE TABLE public.skill_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  icon_name TEXT,
  color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user ON public.profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_employees_profile ON public.employees(profile_id);
CREATE INDEX IF NOT EXISTS idx_employees_department ON public.employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_position ON public.employees(position_id);
CREATE INDEX IF NOT EXISTS idx_employees_location ON public.employees(location_id);
CREATE INDEX IF NOT EXISTS idx_employees_manager ON public.employees(manager_employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(employment_status);
CREATE INDEX IF NOT EXISTS idx_shifts_employee ON public.shifts(employee_id);
CREATE INDEX IF NOT EXISTS idx_shifts_start ON public.shifts(start_at);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON public.shifts(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_employee ON public.time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_punches_employee ON public.time_punches(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_punches_punched_at ON public.time_punches(punched_at);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_employee ON public.time_off_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_status ON public.time_off_requests(status);
CREATE INDEX IF NOT EXISTS idx_leads_owner ON public.leads(owner_employee_id);
CREATE INDEX IF NOT EXISTS idx_leads_campaign ON public.leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_notifications_profile ON public.notifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(profile_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_profile_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_occurred ON public.audit_logs(occurred_at);
CREATE INDEX IF NOT EXISTS idx_skill_library_category ON public.skill_library(category);
CREATE INDEX IF NOT EXISTS idx_employee_skills_employee ON public.employee_skills(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_skills_skill ON public.employee_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_employee_skills_level ON public.employee_skills(level);
CREATE INDEX IF NOT EXISTS idx_mentorships_mentor ON public.mentorships(mentor_employee_id);
CREATE INDEX IF NOT EXISTS idx_mentorships_mentee ON public.mentorships(mentee_employee_id);
CREATE INDEX IF NOT EXISTS idx_mentorships_skill ON public.mentorships(skill_id);
CREATE INDEX IF NOT EXISTS idx_mentorships_status ON public.mentorships(status);
CREATE INDEX IF NOT EXISTS idx_employee_certifications_employee ON public.employee_certifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_certifications_status ON public.employee_certifications(status);
CREATE INDEX IF NOT EXISTS idx_employee_certifications_expiration ON public.employee_certifications(expiration_date);
CREATE INDEX IF NOT EXISTS idx_employee_achievements_employee ON public.employee_achievements(employee_id);
CREATE INDEX IF NOT EXISTS idx_points_log_employee ON public.points_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_training_enrollments_employee ON public.training_enrollments(employee_id);
CREATE INDEX IF NOT EXISTS idx_training_enrollments_status ON public.training_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee ON public.performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_status ON public.performance_reviews(status);
CREATE INDEX IF NOT EXISTS idx_goals_owner ON public.goals(owner_employee_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON public.goals(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.tasks(assigned_to_employee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
-- =====================================================
-- SEED DATA: Locations, Roles, Departments, Job Positions
-- =====================================================

-- =====================================================
-- 0. COMPANY SETTINGS (Required base configuration)
-- =====================================================
INSERT INTO public.company_settings (legal_name, display_name, industry, timezone, locale) VALUES
('Green Dog Dental, Inc.', 'Green Dog Dental', 'Veterinary', 'America/Los_Angeles', 'en-US');

-- =====================================================
-- 1. LOCATIONS
-- =====================================================
INSERT INTO public.locations (name, code, address_line1, city, state, postal_code, phone) VALUES
('Sherman Oaks', 'SO', '13907 Ventura Blvd Suite #101', 'Sherman Oaks', 'CA', '91423', '(310) 606-2407'),
('Venice', 'VEN', '210 Main Street', 'Venice', 'CA', '90291', '(310) 606-2407'),
('The Valley', 'VAL', '14661 Aetna St.', 'Van Nuys', 'CA', '91411', '(310) 606-2407');

-- =====================================================
-- 2. ROLES
-- =====================================================
INSERT INTO public.roles (key, name, description, is_system) VALUES
('super_admin', 'Super Admin', 'Full system access with all permissions', true),
('admin', 'Admin', 'Administrative access to manage users and settings', true),
('manager', 'Manager', 'Can manage team members and approve requests', false),
('employee', 'Employee', 'Standard employee access', false);

-- =====================================================
-- 3. DEPARTMENTS
-- =====================================================
INSERT INTO public.departments (name, code) VALUES
('General Practice / Wellness', 'GEN'),
('Surgery', 'SURG'),
('Dentistry', 'DENT'),
('Exotics', 'EXOT'),
('Emergency / Urgent Care', 'ER'),
('Internal Medicine', 'IM'),
('Diagnostics / Imaging', 'DIAG'),
('Pharmacy', 'PHARM'),
('Treatment / ICU / Inpatient Care', 'ICU'),
('Anesthesia', 'ANES'),
('Rehabilitation / Physical Therapy', 'REHAB'),
('Front Desk / Client Services (CSR)', 'CSR'),
('Marketing & Community Outreach', 'MKT'),
('Billing / Finance', 'FIN'),
('Human Resources', 'HR'),
('Training & Continuing Education', 'TRAIN'),
('Recruiting / Talent Acquisition', 'RECRUIT'),
('Inventory / Purchasing', 'INV'),
('Facilities / Maintenance', 'FAC'),
('IT & Systems Administration', 'IT'),
('Compliance & Quality Assurance', 'QA'),
('Operations Management / Practice Manager Office', 'OPS'),
('Medical Director / Leadership', 'LEAD'),
('Executive', 'EXEC');

-- =====================================================
-- 4. JOB POSITIONS
-- =====================================================
INSERT INTO public.job_positions (title, code, is_manager) VALUES
('Veterinary Assistant', 'VA', false),
('Client Service Representative (CSR)', 'CSR', false),
('Veterinary Technician', 'VT', false),
('Registered Veterinary Technician (RVT)', 'RVT', false),
('Lead Veterinary Technician', 'LEAD_VT', true),
('Senior Veterinary Technician', 'SR_VT', false),
('Technician Supervisor', 'TECH_SUP', true),
('Training Manager', 'TRAIN_MGR', true),
('Surgery Technician', 'SURG_TECH', false),
('Dental Technician', 'DENT_TECH', false),
('Emergency Technician', 'ER_TECH', false),
('Anesthesia Technician', 'ANES_TECH', false),
('ICU Technician', 'ICU_TECH', false),
('Triage Nurse', 'TRIAGE', false),
('Exotic Animal Technician', 'EXOT_TECH', false),
('Oncology Technician', 'ONC_TECH', false),
('Cardiology Technician', 'CARD_TECH', false),
('Ophthalmology Technician', 'OPH_TECH', false),
('Rehabilitation Technician', 'REHAB_TECH', false),
('Behavior Technician', 'BEH_TECH', false),
('Chemotherapy Technician', 'CHEMO_TECH', false),
('Blood Bank Technician', 'BLOOD_TECH', false),
('Mobile Technician', 'MOB_TECH', false),
('Veterinarian (DVM)', 'DVM', false),
('Associate Veterinarian', 'ASSOC_DVM', false),
('Relief Veterinarian', 'RELIEF_DVM', false),
('Locum Veterinarian', 'LOCUM_DVM', false),
('Specialist Veterinarian', 'SPEC_DVM', false),
('Telemedicine Veterinarian', 'TELE_DVM', false),
('Overnight ER Veterinarian', 'ER_DVM', false),
('Medical Director', 'MED_DIR', true),
('Area Medical Director', 'AREA_MED_DIR', true),
('Regional Medical Director', 'REG_MED_DIR', true),
('Chief Medical Officer (CMO)', 'CMO', true),
('Chief Client Officer', 'CCO', true),
('Practice Director', 'PRAC_DIR', true),
('Practice Manager', 'PRAC_MGR', true),
('Assistant Practice Manager', 'ASST_PRAC_MGR', true),
('Clinic Supervisor', 'CLIN_SUP', true),
('Clinical Staff Manager', 'CLIN_STAFF_MGR', true),
('Hospital Administrator', 'HOSP_ADMIN', true),
('Doctor''s Assistant', 'DOC_ASST', false),
('Chief Operations Officer (COO)', 'COO', true),
('Facilities Technician', 'FAC_TECH', false),
('Chief Marketing Officer', 'CMO_MKT', true),
('Marketing Director', 'MKT_DIR', true),
('Creative Director', 'CREAT_DIR', true),
('Graphic Designer', 'GRAPH_DES', false),
('Content Writer', 'CONTENT', false),
('Legal Counsel', 'LEGAL', false),
('Chief Legal Counsel', 'CLO', true),
('Director of Veterinary Education', 'VET_ED_DIR', true),
('Veterinary Skills Trainer', 'VET_TRAIN', false),
('Clinical Instructor', 'CLIN_INST', false),
('Internship Program Director', 'INTERN_DIR', true),
('Residency Program Director', 'RES_DIR', true),
('CE Program Coordinator', 'CE_COORD', false),
('Telehealth Coordinator', 'TELE_COORD', false),
('Patient Care Coordinator', 'PAT_COORD', false);

-- =====================================================
-- 5. TIME OFF TYPES
-- =====================================================
INSERT INTO public.time_off_types (name, code, requires_approval, is_paid, default_hours_per_day) VALUES
('Paid Time Off', 'PTO', true, true, 8),
('Sick Leave', 'SICK', true, true, 8),
('Vacation', 'VAC', true, true, 8),
('Personal Day', 'PERS', true, true, 8),
('Bereavement', 'BRV', true, true, 8),
('Jury Duty', 'JURY', true, true, 8),
('Unpaid Leave', 'UNPAID', true, false, 8),
('FMLA', 'FMLA', true, false, 8),
('Maternity/Paternity', 'PARENTAL', true, true, 8),
('Holiday', 'HOL', false, true, 8);

-- =====================================================
-- 6. PERMISSIONS (Core system permissions)
-- =====================================================
INSERT INTO public.permissions (key, description) VALUES
-- Profile permissions
('profiles.view', 'View user profiles'),
('profiles.edit', 'Edit user profiles'),
('profiles.delete', 'Delete user profiles'),
-- Employee permissions
('employees.view', 'View employee records'),
('employees.create', 'Create new employees'),
('employees.edit', 'Edit employee records'),
('employees.delete', 'Delete employees'),
-- Schedule permissions
('schedules.view', 'View schedules'),
('schedules.create', 'Create schedules'),
('schedules.edit', 'Edit schedules'),
('schedules.publish', 'Publish schedules'),
-- Time off permissions
('timeoff.view', 'View time off requests'),
('timeoff.request', 'Request time off'),
('timeoff.approve', 'Approve time off requests'),
('timeoff.deny', 'Deny time off requests'),
-- Skills permissions
('skills.view', 'View skills and ratings'),
('skills.rate', 'Rate employee skills'),
('skills.certify', 'Certify skill levels'),
-- Training permissions
('training.view', 'View training courses'),
('training.create', 'Create training courses'),
('training.enroll', 'Enroll employees in training'),
('training.complete', 'Mark training complete'),
-- Marketing permissions (Admin only)
('marketing.view', 'View marketing data'),
('marketing.create', 'Create marketing campaigns'),
('marketing.edit', 'Edit marketing campaigns'),
('marketing.delete', 'Delete marketing data'),
-- Leads permissions
('leads.view', 'View leads'),
('leads.create', 'Create leads'),
('leads.edit', 'Edit leads'),
('leads.delete', 'Delete leads'),
-- Settings permissions
('settings.view', 'View system settings'),
('settings.edit', 'Edit system settings'),
-- Reports permissions
('reports.view', 'View reports'),
('reports.export', 'Export reports'),
-- Admin permissions
('admin.users', 'Manage users'),
('admin.roles', 'Manage roles'),
('admin.audit', 'View audit logs');

-- =====================================================
-- 7. ROLE-PERMISSION MAPPINGS
-- =====================================================
-- Super Admin gets ALL permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key = 'super_admin';

-- Admin gets most permissions except some admin-only
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key = 'admin'
AND p.key NOT IN ('admin.roles', 'settings.edit');

-- Manager gets team management permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key = 'manager'
AND p.key IN (
  'profiles.view', 'employees.view', 'employees.edit',
  'schedules.view', 'schedules.create', 'schedules.edit', 'schedules.publish',
  'timeoff.view', 'timeoff.request', 'timeoff.approve', 'timeoff.deny',
  'skills.view', 'skills.rate',
  'training.view', 'training.enroll',
  'reports.view'
);

-- Employee gets basic self-service permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key = 'employee'
AND p.key IN (
  'profiles.view',
  'schedules.view',
  'timeoff.view', 'timeoff.request',
  'skills.view',
  'training.view'
);

-- =====================================================
-- 8. SKILL CATEGORIES (Normalized from skill_library)
-- =====================================================
INSERT INTO public.skill_categories (name, description, display_order) VALUES
('Clinical Skills', 'Core veterinary clinical competencies', 1),
('Diagnostics & Imaging', 'Lab work, radiology, and diagnostic procedures', 2),
('Surgical & Procedural', 'Surgery, anesthesia, and procedural skills', 3),
('Emergency & Critical Care', 'Emergency response and ICU skills', 4),
('Pharmacy & Treatment', 'Medication and treatment administration', 5),
('Specialty Skills', 'Advanced specialty area competencies', 6),
('Client Service', 'Customer service and communication skills', 7),
('Operations & Admin', 'Administrative and operational skills', 8),
('HR / People Ops', 'Human resources and people management', 9),
('Practice Management', 'Business and practice management skills', 10),
('Training & Education', 'Teaching and training competencies', 11),
('Leadership Skills', 'Management and leadership competencies', 12),
('Financial Skills', 'Financial management and analysis', 13),
('Inventory Skills', 'Inventory and supply chain management', 14),
('Facilities Skills', 'Facility maintenance and safety', 15),
('Technology Skills', 'Technical and software proficiency', 16),
('Soft Skills', 'Interpersonal and communication skills', 17),
('Gameplay Attributes', 'Performance metrics and attributes', 18),
('Creative / Marketing', 'Marketing and creative skills', 19),
('Legal / Compliance', 'Regulatory and compliance knowledge', 20),
('Remote Work Skills', 'Remote work and virtual collaboration', 21);

-- =====================================================
-- 9. BASE CERTIFICATIONS (Common veterinary certifications)
-- =====================================================
INSERT INTO public.certifications (name, code, description, issuing_authority, validity_months, is_required) VALUES
('Registered Veterinary Technician', 'RVT', 'State-licensed veterinary technician credential', 'California Veterinary Medical Board', 24, false),
('Veterinary Technician Specialist - Emergency & Critical Care', 'VTS-ECC', 'Academy of Veterinary Emergency and Critical Care Technicians', 'NAVTA', 60, false),
('Veterinary Technician Specialist - Dentistry', 'VTS-DENT', 'Academy of Veterinary Dental Technicians', 'NAVTA', 60, false),
('Veterinary Technician Specialist - Anesthesia', 'VTS-ANES', 'Academy of Veterinary Technicians in Anesthesia and Analgesia', 'NAVTA', 60, false),
('RECOVER CPR Certification', 'RECOVER', 'Veterinary CPR certification following RECOVER guidelines', 'RECOVER Initiative', 24, false),
('Fear Free Certified Professional', 'FFCP', 'Fear Free animal handling certification', 'Fear Free', 12, false),
('Low Stress Handling Certification', 'LSH', 'Low Stress Handling University certification', 'Low Stress Handling', 24, false),
('DEA Registration', 'DEA', 'Federal controlled substance registration', 'Drug Enforcement Administration', 36, false),
('Radiation Safety Certificate', 'RAD-SAFE', 'Radiation safety and X-ray operation certification', 'State Radiation Control', 24, false),
('OSHA Bloodborne Pathogens', 'OSHA-BBP', 'OSHA bloodborne pathogen training certification', 'OSHA', 12, true);

-- =====================================================
-- 10. BASE ACHIEVEMENTS (Gamification)
-- =====================================================
INSERT INTO public.achievements (name, code, description, category, points) VALUES
-- Skill achievements
('First Skill Mastered', 'FIRST_SKILL_5', 'Reached level 5 in your first skill', 'skills', 100),
('Skill Collector', 'SKILLS_10', 'Rated in 10 different skills', 'skills', 50),
('Jack of All Trades', 'SKILLS_25', 'Rated in 25 different skills', 'skills', 150),
('Master Technician', 'SKILLS_50', 'Rated in 50 different skills', 'skills', 300),
('Mentor Badge', 'MENTOR_FIRST', 'Completed your first mentorship as a mentor', 'skills', 200),
-- Training achievements
('Training Initiate', 'TRAIN_FIRST', 'Completed your first training course', 'training', 50),
('Continuous Learner', 'TRAIN_5', 'Completed 5 training courses', 'training', 100),
('Training Champion', 'TRAIN_10', 'Completed 10 training courses', 'training', 200),
('Perfect Score', 'QUIZ_100', 'Scored 100% on a training quiz', 'training', 75),
-- Attendance achievements
('Perfect Week', 'ATTEND_WEEK', 'Perfect attendance for one week', 'attendance', 25),
('Perfect Month', 'ATTEND_MONTH', 'Perfect attendance for one month', 'attendance', 100),
('Iron Employee', 'ATTEND_QUARTER', 'Perfect attendance for one quarter', 'attendance', 300),
-- Performance achievements
('Rising Star', 'PERF_FIRST', 'Received first positive performance review', 'performance', 100),
('Consistently Excellent', 'PERF_STREAK', 'Three consecutive positive reviews', 'performance', 250),
-- Tenure achievements
('Welcome Aboard', 'TENURE_30', '30 days with the company', 'tenure', 25),
('One Year Strong', 'TENURE_1Y', 'One year anniversary', 'tenure', 200),
('Veteran', 'TENURE_3Y', 'Three year anniversary', 'tenure', 500),
('Decade of Dedication', 'TENURE_10Y', 'Ten year anniversary', 'tenure', 1000),
-- Special achievements
('Team Player', 'TEAM_HELP', 'Helped a colleague complete a challenging task', 'special', 50),
('Innovation Award', 'INNOVATE', 'Suggested an implemented improvement', 'special', 150),
('Client Hero', 'CLIENT_HERO', 'Received exceptional client feedback', 'special', 100);-- =====================================================
-- SEED DATA: Skill Library
-- =====================================================

INSERT INTO public.skill_library (category, name, description) VALUES
-- Clinical Skills
('Clinical Skills', 'Physical Examination', 'Systematic evaluation of a patient''s body systems.'),
('Clinical Skills', 'Patient Triage', 'Prioritizing patients based on severity of condition.'),
('Clinical Skills', 'History Taking', 'Gathering relevant medical and lifestyle data from owners.'),
('Clinical Skills', 'Fear-Free Handling', 'Using low-stress techniques to reduce patient anxiety.'),
('Clinical Skills', 'Animal Behavior Assessment', 'Reading body language to predict and manage behavior.'),
('Clinical Skills', 'Basic Restraint', 'Safe holding techniques for standard procedures.'),
('Clinical Skills', 'Advanced Restraint', 'Safe handling for aggressive or high-stress patients.'),
('Clinical Skills', 'Nursing Care', 'Delivering daily medical care and hygiene to inpatients.'),
('Clinical Skills', 'Patient Monitoring', 'Observing and recording vital signs and status changes.'),
('Clinical Skills', 'Pain Scoring', 'Assessing pain levels using validated pain scales.'),
('Clinical Skills', 'Medical Note Accuracy', 'Ensuring records are precise, complete, and legally sound.'),
('Clinical Skills', 'SOAP Documentation', 'Recording Subjective, Objective, Assessment, and Plan data.'),
('Clinical Skills', 'Bandaging Techniques', 'Applying and maintaining therapeutic bandages and splints.'),
('Clinical Skills', 'Wound Care', 'Cleaning, debriding, and managing traumatic or surgical wounds.'),
('Clinical Skills', 'Fluid Therapy', 'Calculating and managing IV and SQ fluid administration.'),
('Clinical Skills', 'Catheter Placement (IV)', 'Aseptic insertion of intravenous catheters.'),
('Clinical Skills', 'Catheter Placement (Urinary)', 'Aseptic insertion of urinary catheters for collection or patency.'),
('Clinical Skills', 'Oxygen Therapy', 'Administering supplemental oxygen via various methods.'),
('Clinical Skills', 'Feeding Tube Placement', 'Placing and managing nasogastric or esophagostomy tubes.'),
('Clinical Skills', 'Nail Trimming', 'Safe trimming of claws without injury to the quick.'),
('Clinical Skills', 'Anal Gland Expression', 'Manual expression of anal sacs.'),
('Clinical Skills', 'Vaccination Protocols', 'Understanding schedules and administration of core vaccines.'),
('Clinical Skills', 'Parasite Prevention Knowledge', 'Knowledge of flea, tick, and heartworm preventatives.'),
('Clinical Skills', 'Common Disease Recognition', 'Identifying signs of frequent veterinary conditions.'),
('Clinical Skills', 'Toxicology Basics', 'Recognizing and initiating treatment for common toxins.'),
('Clinical Skills', 'Post-Operative Monitoring', 'Managing recovery phase immediately after surgery.'),
('Clinical Skills', 'Treatment Sheet Accuracy', 'Correctly logging all treatments given to inpatients.'),

-- Diagnostics & Imaging
('Diagnostics & Imaging', 'Radiology Positioning', 'Positioning patients for clear, diagnostic X-ray images.'),
('Diagnostics & Imaging', 'Radiographic Safety', 'Adhering to PPE and shielding protocols for radiation.'),
('Diagnostics & Imaging', 'Ultrasound Operation', 'Basic handling and setting adjustments of ultrasound machines.'),
('Diagnostics & Imaging', 'Ultrasound Preparation', 'Shaving and prepping patients for abdominal scans.'),
('Diagnostics & Imaging', 'Sample Collection – Blood', 'Venipuncture for CBC/Chem/Lytes analysis.'),
('Diagnostics & Imaging', 'Sample Collection – Urine Cystocentesis', 'Sterile urine collection via needle aspiration.'),
('Diagnostics & Imaging', 'Sample Collection – FNA', 'Fine Needle Aspirate technique for mass sampling.'),
('Diagnostics & Imaging', 'Cytology Preparation', 'Preparing and staining slides for microscopic review.'),
('Diagnostics & Imaging', 'Microscope Use', 'Focusing and navigating slides at various magnifications.'),
('Diagnostics & Imaging', 'Diagnostic Interpretation', 'Analyzing lab results to form a diagnosis.'),
('Diagnostics & Imaging', 'POC Testing', 'Running rapid in-house tests (Parvo, Giardia, etc.).'),
('Diagnostics & Imaging', 'Lab Equipment Operation', 'Maintenance and use of in-house blood analyzers.'),
('Diagnostics & Imaging', 'CBC Reading', 'Interpreting Complete Blood Count data and morphology.'),
('Diagnostics & Imaging', 'Chemistry Panel Interpretation', 'Analyzing organ function markers in blood work.'),
('Diagnostics & Imaging', 'Coagulation Testing', 'Running PT/PTT tests for clotting disorders.'),
('Diagnostics & Imaging', 'Diagnostic Workflow Planning', 'Ordering tests in the most efficient logical sequence.'),
('Diagnostics & Imaging', 'EKG Operation', 'Attaching leads and running electrocardiogram tracings.'),
('Diagnostics & Imaging', 'EKG Interpretation', 'Identifying arrhythmias and normal heart rhythms.'),

-- Surgical & Procedural
('Surgical & Procedural', 'Anesthesia Monitoring', 'Tracking vitals and depth during general anesthesia.'),
('Surgical & Procedural', 'Anesthesia Induction', 'Administering drugs to induce unconsciousness for surgery.'),
('Surgical & Procedural', 'Anesthesia Recovery', 'Managing the patient''s wake-up phase safely.'),
('Surgical & Procedural', 'Aseptic Technique', 'Maintaining sterility to prevent surgical infections.'),
('Surgical & Procedural', 'Surgical Assisting', 'Hands-on assistance to the surgeon during procedures.'),
('Surgical & Procedural', 'Instrument Handling', 'Proper passing and use of surgical tools.'),
('Surgical & Procedural', 'Suturing Assistance', 'Cutting suture and assisting with closure.'),
('Surgical & Procedural', 'Sterile Field Maintenance', 'Preserving the sterile zone during operations.'),
('Surgical & Procedural', 'Dental Prophylaxis', 'Scaling and polishing teeth under anesthesia.'),
('Surgical & Procedural', 'Dental Radiographs', 'Taking diagnostic X-rays of tooth roots.'),
('Surgical & Procedural', 'Dental Charting', 'Mapping oral health and pathology on dental charts.'),
('Surgical & Procedural', 'Intubation', 'Placing endotracheal tube for airway management.'),
('Surgical & Procedural', 'Emergency Intubation', 'Rapid airway access in respiratory arrest scenarios.'),
('Surgical & Procedural', 'Blood Draws (Difficult Veins)', 'Venipuncture on dehydrated or vascularly compromised patients.'),
('Surgical & Procedural', 'IV Catheter Challenges', 'Placing IV access in difficult or blown veins.'),
('Surgical & Procedural', 'Arterial Sampling', 'Collecting blood from arteries for blood gas analysis.'),
('Surgical & Procedural', 'Laser Therapy Use', 'Operating therapeutic laser for pain and healing.'),

-- Emergency & Critical Care
('Emergency & Critical Care', 'Rapid Triage', 'Immediate assessment of life-threatening conditions.'),
('Emergency & Critical Care', 'Shock Protocols', 'Recognizing and treating various stages of shock.'),
('Emergency & Critical Care', 'Crash Cart Management', 'Ensuring emergency drugs and equipment are ready.'),
('Emergency & Critical Care', 'CPR (RECOVER Certified)', 'Basic and Advanced Life Support techniques.'),
('Emergency & Critical Care', 'Fluid Shock Dosing', 'Calculating bolus fluid rates for resuscitation.'),
('Emergency & Critical Care', 'Emergency Drug Knowledge', 'Pharmacology of epinephrine, atropine, and other code drugs.'),
('Emergency & Critical Care', 'Oxygen Cage Setup', 'Preparing and regulating environmental oxygen therapy.'),
('Emergency & Critical Care', 'Ventilation Support', 'Manual or mechanical breathing support for patients.'),
('Emergency & Critical Care', 'ICU Monitoring', 'High-frequency observation of critical status patients.'),
('Emergency & Critical Care', 'Vital Trend Interpretation', 'Noticing subtle degradation in patient stability over time.'),
('Emergency & Critical Care', 'Emergency Communication', 'Clear, closed-loop communication during crisis.'),
('Emergency & Critical Care', 'Toxicity Protocols', 'Specific treatments for chocolate, grapes, xylitol, etc.'),
('Emergency & Critical Care', 'Bite Wound Triage', 'Assessing depth and severity of penetrating trauma.'),
('Emergency & Critical Care', 'GDV Protocol Knowledge', 'Handling suspected bloat/torsion cases rapidly.'),
('Emergency & Critical Care', 'Seizure Management', 'Acute treatment and monitoring of status epilepticus.'),

-- Pharmacy & Treatment
('Pharmacy & Treatment', 'Medication Math', 'Calculating dosages based on weight and concentration.'),
('Pharmacy & Treatment', 'Dose Conversion', 'Converting between mg, ml, and other units.'),
('Pharmacy & Treatment', 'Compounding Basics', 'Mixing medications safely for specific administration needs.'),
('Pharmacy & Treatment', 'Prescription Accuracy', 'Verifying drug, dose, and instructions before dispensing.'),
('Pharmacy & Treatment', 'Controlled Substance Logging', 'Adhering to DEA strict recording requirements.'),
('Pharmacy & Treatment', 'Tablet Splitting Accuracy', 'Precising dividing pills for correct dosing.'),
('Pharmacy & Treatment', 'Liquid Medication Prep', 'Measuring oral suspensions accurately.'),
('Pharmacy & Treatment', 'Injection Technique IM', 'Intramuscular injection administration.'),
('Pharmacy & Treatment', 'Injection Technique SQ', 'Subcutaneous injection administration.'),
('Pharmacy & Treatment', 'Injection Technique IV', 'Direct Intravenous injection administration.'),
('Pharmacy & Treatment', 'Pharmacy Inventory', 'Managing stock levels and expiration dates.'),
('Pharmacy & Treatment', 'Drug Interaction Awareness', 'Recognizing contraindications between prescribed meds.'),
('Pharmacy & Treatment', 'Pharmacy Label Accuracy', 'Ensuring client labels meet legal and safety standards.'),
('Pharmacy & Treatment', 'Refill Authorization Workflow', 'Process for reviewing and approving prescription requests.'),

-- Specialty Skills
('Specialty Skills', 'Cardiology Diagnostics', 'Assisting with echocardiograms and Holter monitors.'),
('Specialty Skills', 'Ophthalmology Diagnostics', 'Tonometry, tear tests, and stain tests for eyes.'),
('Specialty Skills', 'Exotic Animal Care', 'Husbandry and medical care for non-traditional pets.'),
('Specialty Skills', 'Avian Handling', 'Safe restraint and capture of birds.'),
('Specialty Skills', 'Reptile Handling', 'Safe restraint of lizards, snakes, and chelonians.'),
('Specialty Skills', 'Small Mammal Care', 'Care for rabbits, ferrets, and pocket pets.'),
('Specialty Skills', 'Specialty Surgery Assistance', 'Assisting in orthopedics or soft tissue specialty cases.'),
('Specialty Skills', 'Teleconsultation Support', 'Facilitating remote consults with specialists.'),
('Specialty Skills', 'Advanced Ultrasound', 'Detailed organ scanning beyond A-FAST/T-FAST.'),
('Specialty Skills', 'Endoscopy Support', 'Setting up and maintaining scoping equipment.'),
('Specialty Skills', 'Chemotherapy Protocols', 'Safe handling and administration of cytotoxic drugs.'),

-- Client Service
('Client Service', 'Phone Communication', 'Professional etiquette and clarity on calls.'),
('Client Service', 'Call Control', 'Managing conversation flow and duration effectively.'),
('Client Service', 'Client Empathy', 'Demonstrating understanding of client emotions.'),
('Client Service', 'De-escalation', 'Calming upset clients to resolve conflict.'),
('Client Service', 'Service Recovery', 'Turning a negative experience into a positive one.'),
('Client Service', 'Estimate Presentation', 'Explaining costs and value to clients clearly.'),
('Client Service', 'Financial Conversations', 'Discussing payment options and budget constraints.'),
('Client Service', 'Scheduling Optimization', 'Booking appointments to maximize clinic flow.'),
('Client Service', 'Conflict Diffusion', 'Resolving interpersonal issues between parties.'),
('Client Service', 'Client Education', 'Teaching owners about pet health and care.'),
('Client Service', 'Medical Triage (CSR Level)', 'Determining urgency of phone inquiries.'),
('Client Service', 'Queue Management', 'Managing lobby flow and waiting clients.'),
('Client Service', 'CRM Accuracy', 'Keeping client contact info and notes updated.'),
('Client Service', 'SMS/Chat Support', 'Professional communication via text channels.'),
('Client Service', 'Remote Support Tools', 'Using software to assist clients off-site.'),
('Client Service', 'Referral Coordination', 'Managing records between general and specialty practices.'),
('Client Service', 'NPS Influence', 'Actions that drive positive Net Promoter Scores.'),
('Client Service', 'Multi-tasking Under Pressure', 'Handling phones, lobby, and admin simultaneously.'),
('Client Service', 'Upselling Preventatives', 'Encouraging compliance with flea/tick/heartworm prevention.'),

-- Operations & Admin
('Operations & Admin', 'Appointment Forecasting', 'Predicting future schedule volume and needs.'),
('Operations & Admin', 'Workload Balancing', 'Distributing tasks evenly across the team.'),
('Operations & Admin', 'PIMS Administration', 'Managing settings in Practice Information Management System.'),
('Operations & Admin', 'Record Accuracy', 'Auditing files for completeness.'),
('Operations & Admin', 'Inventory Logging', 'Tracking goods received and usage.'),
('Operations & Admin', 'Email Communication', 'Professional internal and external email correspondence.'),
('Operations & Admin', 'Policy Compliance', 'Adhering to hospital handbook and rules.'),
('Operations & Admin', 'Office Workflow Design', 'Creating efficient administrative processes.'),
('Operations & Admin', 'Report Generation', 'Pulling data reports from practice software.'),
('Operations & Admin', 'Data Entry Accuracy', 'Error-free input of clinical or financial data.'),
('Operations & Admin', 'Clinic Flow Optimization', 'Improving the movement of patients and staff.'),
('Operations & Admin', 'Vendor Communication', 'Managing relationships with suppliers.'),
('Operations & Admin', 'Estimate Auditing', 'Checking invoices against estimates for accuracy.'),
('Operations & Admin', 'Task Delegation', 'Assigning appropriate duties to team members.'),
('Operations & Admin', 'Time Blocking', 'Dedicating time slots to specific focus work.'),
('Operations & Admin', 'Process Documentation', 'Writing SOPs and guides for tasks.'),

-- HR / People Ops
('HR / People Ops', 'Interviewing', 'Conducting effective candidate interviews.'),
('HR / People Ops', 'Candidate Screening', 'Reviewing resumes and applications.'),
('HR / People Ops', 'Culture Stewardship', 'Promoting positive hospital values and morale.'),
('HR / People Ops', 'Onboarding', 'Integrating new hires into the team.'),
('HR / People Ops', 'Training Delivery', 'Teaching skills and protocols to staff.'),
('HR / People Ops', 'Conflict Resolution', 'Mediating disputes between employees.'),
('HR / People Ops', 'Performance Coaching', 'Guiding employees to improve work output.'),
('HR / People Ops', 'Difficult Conversations', 'Addressing behavioral or performance issues directly.'),
('HR / People Ops', 'Employment Law Basics', 'Understanding wage, hour, and labor regulations.'),
('HR / People Ops', 'Scheduling Fairness', 'Creating equitable work rosters.'),
('HR / People Ops', 'Coverage Planning', 'Ensuring adequate staffing for all shifts.'),
('HR / People Ops', 'Retention Strategies', 'Programs to keep staff engaged and employed.'),
('HR / People Ops', 'CE Tracking', 'Monitoring Continuing Education compliance.'),
('HR / People Ops', 'Recognition Practices', 'Rewarding and acknowledging staff achievements.'),
('HR / People Ops', 'Burnout Detection', 'Identifying signs of compassion fatigue in staff.'),
('HR / People Ops', 'Team Engagement', 'Facilitating participation and enthusiasm.'),

-- Practice Management
('Practice Management', 'KPI Interpretation', 'Analyzing Key Performance Indicators for business health.'),
('Practice Management', 'Budget Management', 'Overseeing departmental spending and limits.'),
('Practice Management', 'Revenue Forecasting', 'Projecting future income based on trends.'),
('Practice Management', 'Production/ProSal Modeling', 'Managing doctor compensation structures.'),
('Practice Management', 'Staff Allocation', 'Optimizing labor hours to patient volume.'),
('Practice Management', 'Cost Control', 'Reducing waste and unnecessary expenses.'),
('Practice Management', 'Clinic Workflow Design', 'Architecting the patient journey from check-in to out.'),
('Practice Management', 'Risk Management', 'Identifying and mitigating liability issues.'),
('Practice Management', 'Compliance Oversight', 'Ensuring adherence to all legal regulations.'),
('Practice Management', 'Quality Assurance', 'Monitoring standard of care and service.'),
('Practice Management', 'Vendor Negotiation', 'Bargaining for better pricing or terms.'),
('Practice Management', 'Inventory Cost Control', 'Managing COGS (Cost of Goods Sold).'),
('Practice Management', 'Cash Flow Awareness', 'Monitoring liquidity and operational funds.'),
('Practice Management', 'Strategic Planning', 'Setting long-term business goals.'),
('Practice Management', 'Operational Auditing', 'Reviewing systems for efficiency gaps.'),
('Practice Management', 'Cross-Department Coordination', 'Aligning medical, admin, and kennel teams.'),

-- Training & Education
('Training & Education', 'SOP Creation', 'Writing Standard Operating Procedures.'),
('Training & Education', 'Curriculum Development', 'Designing educational programs for staff.'),
('Training & Education', 'Coaching', 'One-on-one mentorship for skill improvement.'),
('Training & Education', 'Medical Knowledge Instruction', 'Teaching clinical concepts to the team.'),
('Training & Education', 'Shadowing Programs', 'Managing observation periods for trainees.'),
('Training & Education', 'Skills Evaluation', 'Testing and verifying practical competencies.'),
('Training & Education', 'Training Needs Assessment', 'Identifying gaps in team knowledge.'),
('Training & Education', 'CE Program Planning', 'Organizing continuing education events.'),
('Training & Education', 'Mentorship', 'Long-term career guidance for junior staff.'),
('Training & Education', 'Feedback Delivery', 'Providing constructive critique effectively.'),
('Training & Education', 'On-the-Job Training', 'Teaching skills during live clinical work.'),
('Training & Education', 'Performance Tracking', 'Monitoring growth and milestones over time.'),

-- Leadership Skills
('Leadership Skills', 'Strategic Decision-Making', 'Making choices that align with long-term goals.'),
('Leadership Skills', 'Crisis Management', 'Leading effectively during emergencies.'),
('Leadership Skills', 'Team Motivation', 'Inspiring staff to perform their best.'),
('Leadership Skills', 'Delegation', 'Trusting others with responsibility.'),
('Leadership Skills', 'Leadership Communication', 'Conveying vision and instruction clearly.'),
('Leadership Skills', 'Policy Creation', 'Drafting rules and guidelines for the practice.'),
('Leadership Skills', 'Change Management', 'Guiding the team through transitions.'),
('Leadership Skills', 'Goal Setting', 'Defining clear, achievable objectives.'),
('Leadership Skills', 'Cross-Functional Collaboration', 'Working across different roles and departments.'),
('Leadership Skills', 'Conflict Mediation', 'Resolving disputes between parties.'),
('Leadership Skills', 'Culture Maintenance', 'Upholding the core values of the practice.'),
('Leadership Skills', 'Vision Setting', 'Defining the future direction of the organization.'),
('Leadership Skills', 'Accountability Systems', 'Ensuring standards are met consistently.'),
('Leadership Skills', 'Coaching Direct Reports', 'Developing the skills of immediate subordinates.'),

-- Financial Skills
('Financial Skills', 'Revenue Cycle Management', 'Managing the flow of income from service to payment.'),
('Financial Skills', 'Cost Analysis', 'Breaking down expenses to find savings.'),
('Financial Skills', 'Budget Forecasting', 'Predicting future financial needs.'),
('Financial Skills', 'Pricing Strategy', 'Setting service fees appropriately.'),
('Financial Skills', 'Inventory Cost Modeling', 'Analyzing the financial impact of stock.'),
('Financial Skills', 'Payroll Understanding', 'Knowledge of wage calculations and taxes.'),
('Financial Skills', 'Financial KPIs', 'Tracking profit, loss, and margins.'),
('Financial Skills', 'Margin Optimization', 'Maximizing profit on services and goods.'),
('Financial Skills', 'Financial Reporting', 'Creating and reading P&L statements.'),
('Financial Skills', 'Scenario Planning', 'Preparing for various financial futures.'),
('Financial Skills', 'Capital Allocation', 'Deciding where to invest business funds.'),

-- Inventory Skills
('Inventory Skills', 'Ordering', 'Purchasing stock from suppliers.'),
('Inventory Skills', 'Receiving', 'Verifying incoming shipments against orders.'),
('Inventory Skills', 'Vendor Negotiation', 'Discussing price and terms with reps.'),
('Inventory Skills', 'Stock Rotation', 'Using First-In-First-Out (FIFO) methods.'),
('Inventory Skills', 'Expiration Control', 'Minimizing waste from expired drugs.'),
('Inventory Skills', 'DEA Compliance', 'Strictly following federal drug laws.'),
('Inventory Skills', 'Controlled Drug Tracking', 'Logging every unit of regulated substances.'),
('Inventory Skills', 'Inventory Forecasting', 'Predicting stock needs based on usage.'),
('Inventory Skills', 'Backorder Management', 'Handling supply chain shortages.'),
('Inventory Skills', 'Invoice Reconciliation', 'Matching bills to received goods.'),
('Inventory Skills', 'Storage Optimization', 'Organizing stock for efficiency and safety.'),

-- Facilities Skills
('Facilities Skills', 'Equipment Maintenance', 'Routine care of medical machines.'),
('Facilities Skills', 'Safety Inspections', 'Checking the facility for hazards.'),
('Facilities Skills', 'Clinic Cleanliness Standards', 'Maintaining medical-grade hygiene.'),
('Facilities Skills', 'OSHA Compliance', 'Adhering to workplace safety regulations.'),
('Facilities Skills', 'Biohazard Handling', 'Proper disposal of medical waste.'),
('Facilities Skills', 'Chemical Safety', 'Safe storage and use of cleaning agents.'),
('Facilities Skills', 'Vendor Scheduling', 'Coordinating repairs and services.'),
('Facilities Skills', 'Emergency Preparedness', 'Readiness for fire, flood, or power loss.'),
('Facilities Skills', 'Environmental Control', 'Managing temperature, ventilation, and noise.'),

-- Technology Skills
('Technology Skills', 'PIMS Mastery', 'Expert use of practice management software.'),
('Technology Skills', 'Telemedicine Tools', 'Operating video consult platforms.'),
('Technology Skills', 'Remote CSR Systems', 'Using VOIP and remote desktop tools.'),
('Technology Skills', 'Data Entry Mastery', 'Fast and accurate typing and input.'),
('Technology Skills', 'Reporting Dashboards', 'Using analytics tools to view metrics.'),
('Technology Skills', 'Cloud File Management', 'Organizing documents in Google Drive/Dropbox.'),
('Technology Skills', 'Troubleshooting', 'Basic fixing of IT issues.'),
('Technology Skills', 'Digital Payments', 'Processing credit cards and online transactions.'),
('Technology Skills', 'Workflow Software', 'Using project management tools (Asana, etc.).'),
('Technology Skills', 'Cybersecurity Basics', 'Awareness of phishing and password safety.'),
('Technology Skills', 'Device Setup', 'Configuring tablets, printers, and scanners.'),

-- Soft Skills
('Soft Skills', 'Communication', 'Exchanging information clearly and effectively.'),
('Soft Skills', 'Empathy', 'Understanding and sharing feelings of others.'),
('Soft Skills', 'Problem Solving', 'Finding solutions to difficult issues.'),
('Soft Skills', 'Adaptability', 'Adjusting easily to new conditions.'),
('Soft Skills', 'Time Management', 'Using work hours productively.'),
('Soft Skills', 'Teamwork', 'Working collaboratively with a group.'),
('Soft Skills', 'Professionalism', 'Maintaining high standards of behavior.'),
('Soft Skills', 'Ownership', 'Taking responsibility for outcomes.'),
('Soft Skills', 'Initiative', 'Taking action without being told.'),
('Soft Skills', 'Emotional Regulation', 'Managing one''s own emotional state.'),
('Soft Skills', 'Stress Tolerance', 'Maintaining performance under pressure.'),
('Soft Skills', 'Critical Thinking', 'Objective analysis to form a judgment.'),
('Soft Skills', 'Attention to Detail', 'Accuracy in small particulars.'),
('Soft Skills', 'Reliability', 'Being dependable and consistent.'),
('Soft Skills', 'Resilience', 'Recovering quickly from difficulties.'),
('Soft Skills', 'Creative Thinking', 'Thinking outside traditional methods.'),
('Soft Skills', 'Accountability', 'Being answerable for actions.'),

-- Gameplay Attributes
('Gameplay Attributes', 'Medical Competency', 'Overall rating of clinical knowledge.'),
('Gameplay Attributes', 'Efficiency', 'Speed of task completion without error.'),
('Gameplay Attributes', 'Accuracy', 'Precision in medical and admin tasks.'),
('Gameplay Attributes', 'Autonomy', 'Ability to work without supervision.'),
('Gameplay Attributes', 'Stress Resistance', 'Ability to maintain performance under pressure.'),
('Gameplay Attributes', 'Recovery Rate', 'Speed of bouncing back from difficult shifts.'),
('Gameplay Attributes', 'Compassion Fatigue Sensitivity', 'Vulnerability to emotional burnout.'),
('Gameplay Attributes', 'Morale', 'Current level of job satisfaction and enthusiasm.'),
('Gameplay Attributes', 'Team Synergy', 'Effectiveness of working within this specific group.'),
('Gameplay Attributes', 'Leadership Trust', 'Confidence in the management team.'),
('Gameplay Attributes', 'Engagement', 'Level of active participation in the role.'),
('Gameplay Attributes', 'Production Contribution', 'Impact on revenue generation.'),
('Gameplay Attributes', 'Client Experience', 'Impact on client satisfaction scores.'),
('Gameplay Attributes', 'Specialty Bonus – Surgery', 'Performance buff in surgical environments.'),
('Gameplay Attributes', 'Specialty Bonus – Dentistry', 'Performance buff in dental environments.'),
('Gameplay Attributes', 'Specialty Bonus – Emergency', 'Performance buff in ER environments.'),

-- Creative / Marketing
('Creative / Marketing', 'Content Writing', 'Creating text for blogs or social media.'),
('Creative / Marketing', 'Blog Writing', 'Writing long-form educational articles.'),
('Creative / Marketing', 'Graphic Design', 'Creating visual assets for marketing.'),
('Creative / Marketing', 'Brand Messaging', 'Maintaining consistent voice and tone.'),
('Creative / Marketing', 'Social Media Strategy', 'Planning posts to maximize engagement.'),
('Creative / Marketing', 'Community Engagement', 'Interacting with followers online.'),
('Creative / Marketing', 'Video Editing', 'Cutting and polishing video content.'),
('Creative / Marketing', 'Marketing Analytics', 'Interpreting campaign performance data.'),
('Creative / Marketing', 'Campaign Execution', 'Rolling out marketing initiatives.'),
('Creative / Marketing', 'Educational Content Creation', 'Making materials to teach clients.'),

-- Legal / Compliance
('Legal / Compliance', 'Regulatory Knowledge', 'Understanding veterinary laws.'),
('Legal / Compliance', 'Contract Review', 'Analyzing legal agreements.'),
('Legal / Compliance', 'Policy Development', 'Writing compliant workplace rules.'),
('Legal / Compliance', 'Legal Risk Awareness', 'Identifying potential lawsuit triggers.'),
('Legal / Compliance', 'Documentation Compliance', 'Ensuring records meet legal standards.'),
('Legal / Compliance', 'Medical Record Standards', 'Maintaining complete patient files.'),
('Legal / Compliance', 'Privacy Compliance', 'Protecting client and employee data.'),

-- Remote Work Skills
('Remote Work Skills', 'Remote Communication', 'Staying connected while off-site.'),
('Remote Work Skills', 'Self-Management', 'Working effectively without oversight.'),
('Remote Work Skills', 'Asynchronous Collaboration', 'Working on shared projects at different times.'),
('Remote Work Skills', 'Virtual Teamwork', 'Building rapport digitally.'),
('Remote Work Skills', 'Remote Workspace Setup', 'Creating an effective home office.'),
('Remote Work Skills', 'Queue Management', 'Handling digital waiting lines.'),
('Remote Work Skills', 'Digital Empathy', 'Conveying care through text/video.'),
('Remote Work Skills', 'Independent Problem Solving', 'Troubleshooting without immediate help.'),
('Remote Work Skills', 'Remote Productivity Systems', 'Using tools to track and maintain output.');
-- =====================================================
-- SEED DATA: Employee Records
-- Green Dog Dental Staff as of December 2025
-- =====================================================
-- This seeds the employees table with profile links
-- Run AFTER 007_seed_org_data.sql (needs departments/positions)
-- =====================================================

-- Helper function to parse wages (handles both hourly and salary)
-- Note: Wages > 500 are assumed to be annual salary, otherwise hourly

-- =====================================================
-- INSERT EMPLOYEES
-- =====================================================

INSERT INTO public.employees (
  employee_number,
  first_name,
  last_name,
  preferred_name,
  date_of_birth,
  hire_date,
  department_id,
  position_id,
  employment_type,
  employment_status,
  location_id,
  email_work,
  notes_internal
) VALUES
-- Adriana Gutierrez
('EMP001', 'Adriana', 'Gutierrez', NULL, '1997-11-13', '2020-07-13',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'adriana.gutierrez@greendogdental.com',
  'In House'),

-- Aislinn Dickey
('EMP002', 'Aislinn', 'Dickey', NULL, '1996-04-16', '2024-01-05',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'aislinn.dickey@greendogdental.com',
  'In House CSR'),

-- Alexandra Martin
('EMP003', 'Alexandra', 'Martin', NULL, '1994-09-25', '2021-08-12',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  NULL, -- Remote
  'alexandra.martin@greendogdental.com',
  'Remote - DA / CSR Admin'),

-- Alysia Sanford
('EMP004', 'Alysia', 'Sanford', NULL, '1998-10-19', '2021-07-12',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'alysia.sanford@greendogdental.com',
  'In House'),

-- Ana Livia Fraga
('EMP005', 'Ana Livia', 'Fraga', NULL, '1972-12-07', '2024-04-01',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'analivia.fraga@greendogdental.com',
  'In House'),

-- Ana Victoria Portillo
('EMP006', 'Ana Victoria', 'Portillo', NULL, '1997-11-16', '2025-11-24',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'anavictoria.portillo@greendogdental.com',
  'In House CSR'),

-- Andrea Rehrig
('EMP007', 'Andrea', 'Rehrig', NULL, '1979-04-05', '2025-10-27',
  (SELECT id FROM public.departments WHERE code = 'MKT'),
  (SELECT id FROM public.job_positions WHERE code = 'CMO_MKT'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'andrea.rehrig@greendogdental.com',
  'Marketing Director / Chief Marketing Officer'),

-- Angela Fraga
('EMP008', 'Angela', 'Fraga', NULL, '1971-11-08', '2017-08-31',
  (SELECT id FROM public.departments WHERE code = 'OPS'),
  (SELECT id FROM public.job_positions WHERE code = 'VT'),
  'full-time', 'active',
  NULL, -- Remote
  'angela.fraga@greendogdental.com',
  'Remote Administrator / Veterinary Technician'),

-- Angela Lina Perez
('EMP009', 'Angela Lina', 'Perez', NULL, '1999-08-25', '2024-03-10',
  (SELECT id FROM public.departments WHERE code = 'OPS'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'angelalina.perez@greendogdental.com',
  'In House Admin'),

-- Arron Bryant
('EMP010', 'Arron', 'Bryant', NULL, '1980-03-09', '2024-08-07',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'arron.bryant@greendogdental.com',
  'In House'),

-- Ashley Paredes
('EMP011', 'Ashley', 'Paredes', NULL, '1994-08-18', '2024-07-30',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  NULL, -- Remote
  'ashley.paredes@greendogdental.com',
  'Remote CSR'),

-- Batia Blank
('EMP012', 'Batia', 'Blank', NULL, '2000-05-01', '2025-02-27',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'batia.blank@greendogdental.com',
  'In House'),

-- Bianca Alfonso
('EMP013', 'Bianca', 'Alfonso', NULL, '1993-01-20', '2014-02-03',
  (SELECT id FROM public.departments WHERE code = 'OPS'),
  (SELECT id FROM public.job_positions WHERE code = 'PRAC_DIR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'bianca.alfonso@greendogdental.com',
  'Practice Director'),

-- Brandon Orange
('EMP014', 'Brandon', 'Orange', NULL, '1994-12-10', '2021-04-26',
  (SELECT id FROM public.departments WHERE code = 'OPS'),
  (SELECT id FROM public.job_positions WHERE code = 'ASST_PRAC_MGR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'brandon.orange@greendogdental.com',
  'Assistant Practice Manager'),

-- Brittany Finch
('EMP015', 'Brittany', 'Finch', NULL, '2000-08-28', '2022-01-10',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'brittany.finch@greendogdental.com',
  'Client Services Representative'),

-- Caitlin Quinn
('EMP016', 'Caitlin', 'Quinn', NULL, '1993-08-30', '2023-07-21',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  NULL, -- Remote
  'caitlin.quinn@greendogdental.com',
  'Remote CSR'),

-- Carlos Alexei Marquez
('EMP017', 'Carlos Alexei', 'Marquez', NULL, '1989-02-12', '2024-11-15',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'carlos.marquez@greendogdental.com',
  'Foreign Vet Graduate Intern'),

-- Carmen Chan
('EMP018', 'Carmen', 'Chan', NULL, '1992-06-21', '2020-07-22',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'RVT'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'carmen.chan@greendogdental.com',
  'Registered Veterinary Technician'),

-- Catherine Ramirez
('EMP019', 'Catherine', 'Ramirez', NULL, '1991-05-16', '2020-11-06',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CLIN_SUP'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'catherine.ramirez@greendogdental.com',
  'Lead CSR Supervisor'),

-- Christina Earnest
('EMP020', 'Christina', 'Earnest', NULL, '1981-05-24', '2013-10-03',
  (SELECT id FROM public.departments WHERE code = 'OPS'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  NULL, -- Remote
  'christina.earnest@greendogdental.com',
  'Remote Administrator'),

-- Crystal Barrom
('EMP021', 'Crystal', 'Barrom', NULL, '1995-02-12', '2023-01-09',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'crystal.barrom@greendogdental.com',
  'In House'),

-- Cynthia Garcia
('EMP022', 'Cynthia', 'Garcia', NULL, '1993-05-11', '2021-11-01',
  (SELECT id FROM public.departments WHERE code = 'EXEC'),
  (SELECT id FROM public.job_positions WHERE code = 'CLO'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'cynthia.garcia@greendogdental.com',
  'Chief Legal Counsel'),

-- Deija Lighon
('EMP023', 'Deija', 'Lighon', NULL, '1990-11-04', '2021-04-13',
  (SELECT id FROM public.departments WHERE code = 'LEAD'),
  (SELECT id FROM public.job_positions WHERE code = 'CLIN_STAFF_MGR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'deija.lighon@greendogdental.com',
  'Clinical Director / Clinical Staff Manager'),

-- Diana Monterde
('EMP024', 'Diana', 'Monterde', NULL, '1993-11-17', '2016-05-12',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'RVT'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'diana.monterde@greendogdental.com',
  'Registered Veterinary Technician'),

-- Dr. Andre de Mattos Faro
('EMP025', 'Andre', 'de Mattos Faro', 'Dr. Andre', '1976-04-15', '2024-03-18',
  (SELECT id FROM public.departments WHERE code = 'TRAIN'),
  (SELECT id FROM public.job_positions WHERE code = 'VET_ED_DIR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'andre.faro@greendogdental.com',
  'Director of Veterinary Education'),

-- Dr. Candice Habawel
('EMP026', 'Candice', 'Habawel', 'Dr. Candice', '1991-07-28', '2017-10-09',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'DVM'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'candice.habawel@greendogdental.com',
  'Doctor of Veterinary Medicine'),

-- Dr. Celestine Hoh
('EMP027', 'Celestine', 'Hoh', 'Dr. Celestine', '1997-05-29', '2024-12-12',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'DVM'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'celestine.hoh@greendogdental.com',
  'Veterinarian'),

-- Dr. Claudia Lau
('EMP028', 'Claudia', 'Lau', 'Dr. Claudia', '1995-01-31', '2023-02-06',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'DVM'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'claudia.lau@greendogdental.com',
  'Doctor of Veterinary Medicine'),

-- Dr. Ella Scott
('EMP029', 'Ella', 'Scott', 'Dr. Ella', '2000-05-17', '2025-06-01',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'DVM'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'ella.scott@greendogdental.com',
  'Doctor of Veterinary Medicine'),

-- Dr. Heather Rally Webb
('EMP030', 'Heather', 'Rally Webb', 'Dr. Heather', '1987-01-09', '2022-10-25',
  (SELECT id FROM public.departments WHERE code = 'LEAD'),
  (SELECT id FROM public.job_positions WHERE code = 'MED_DIR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'heather.webb@greendogdental.com',
  'Medical Director'),

-- Dr. Jessica Robertson
('EMP031', 'Jessica', 'Robertson', 'Dr. Jessica', '1987-05-26', '2025-06-15',
  (SELECT id FROM public.departments WHERE code = 'EXOT'),
  (SELECT id FROM public.job_positions WHERE code = 'SPEC_DVM'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'jessica.robertson@greendogdental.com',
  'Head of Zoological Medicine and Surgery'),

-- Dr. Michael Geist
('EMP032', 'Michael', 'Geist', 'Dr. Michael', '1981-04-15', '2021-07-12',
  (SELECT id FROM public.departments WHERE code = 'EXEC'),
  (SELECT id FROM public.job_positions WHERE code = 'CMO'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'michael.geist@greendogdental.com',
  'Chief Medical Officer'),

-- Dr. Niko Alzate
('EMP033', 'Niko', 'Alzate', 'Dr. Niko', '1997-06-27', '2025-11-03',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'DVM'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'niko.alzate@greendogdental.com',
  'DVM'),

-- Dr. Sherry Vartanian
('EMP034', 'Sherry', 'Vartanian', 'Dr. Sherry', '1995-09-25', '2025-03-03',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'DVM'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'sherry.vartanian@greendogdental.com',
  'Doctor of Veterinary Medicine'),

-- Ethan Young
('EMP035', 'Ethan', 'Young', NULL, '1995-08-21', '2025-08-18',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'ethan.young@greendogdental.com',
  'In House'),

-- Fidel Fraga
('EMP036', 'Fidel', 'Fraga', NULL, '1997-08-15', '2019-05-26',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'fidel.fraga@greendogdental.com',
  'Vet Assistant'),

-- Gladys Castro
('EMP037', 'Gladys', 'Castro', NULL, '2001-08-20', '2025-06-02',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'RVT'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'gladys.castro@greendogdental.com',
  'RVT'),

-- Jennifer Velasquez
('EMP038', 'Jennifer', 'Velasquez', NULL, '1995-10-06', '2025-02-03',
  (SELECT id FROM public.departments WHERE code = 'OPS'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'jennifer.velasquez@greendogdental.com',
  'In House Administrator'),

-- Jessica Lucra
('EMP039', 'Jessica', 'Lucra', NULL, '1986-07-28', '2014-08-25',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'DOC_ASST'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'jessica.lucra@greendogdental.com',
  'Doctor''s Assistant'),

-- Jessica Salazar
('EMP040', 'Jessica', 'Salazar', NULL, '1993-02-12', '2025-09-08',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'RVT'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'jessica.salazar@greendogdental.com',
  'RVT'),

-- Joseph Reyes
('EMP041', 'Joseph', 'Reyes', NULL, '1989-09-30', '2022-05-24',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'joseph.reyes@greendogdental.com',
  'In House'),

-- Karen Cuestas
('EMP042', 'Karen', 'Cuestas', NULL, '1990-12-09', '2022-12-17',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'karen.cuestas@greendogdental.com',
  'In House'),

-- Ken Padilla
('EMP043', 'Ken', 'Padilla', NULL, '1998-03-25', '2025-05-08',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'ken.padilla@greendogdental.com',
  'In House'),

-- Kirtlynn Moller
('EMP044', 'Kirtlynn', 'Moller', NULL, '2001-12-11', '2025-09-08',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'kirtlynn.moller@greendogdental.com',
  'CSR'),

-- Laurence Marai
('EMP045', 'Laurence', 'Marai', NULL, '1977-05-14', '2023-04-03',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'PAT_COORD'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'laurence.marai@greendogdental.com',
  'Referral Coordinator'),

-- Lisa Girtain
('EMP046', 'Lisa', 'Girtain', NULL, '1969-09-25', '2024-05-27',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  NULL, -- Remote
  'lisa.girtain@greendogdental.com',
  'Remote CSR'),

-- Marelyn Ventura
('EMP047', 'Marelyn', 'Ventura', NULL, '1997-02-27', '2025-10-06',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'marelyn.ventura@greendogdental.com',
  'In House'),

-- Maria Portillo
('EMP048', 'Maria', 'Portillo', NULL, '1970-11-21', '2025-04-07',
  (SELECT id FROM public.departments WHERE code = 'FAC'),
  (SELECT id FROM public.job_positions WHERE code = 'FAC_TECH'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'maria.portillo@greendogdental.com',
  'Facilities'),

-- Marc Mercury (COO - Admin User)
('EMP049', 'Marc', 'Mercury', NULL, '1980-11-06', '2021-02-15',
  (SELECT id FROM public.departments WHERE code = 'EXEC'),
  (SELECT id FROM public.job_positions WHERE code = 'COO'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'marc.mercury@greendogdental.com',
  'Chief Operations Officer'),

-- Markie Perez
('EMP050', 'Markie', 'Perez', NULL, '1988-12-29', '2021-02-22',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'RVT'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'markie.perez@greendogdental.com',
  'RVT'),

-- Megan Rolnik
('EMP051', 'Megan', 'Rolnik', NULL, '1992-02-09', '2025-05-12',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'RVT'),
  'part-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'megan.rolnik@greendogdental.com',
  'RVT'),

-- Miguel Antonio Gonzalez
('EMP052', 'Miguel Antonio', 'Gonzalez', NULL, '1995-12-12', '2024-03-10',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VT'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'miguel.gonzalez@greendogdental.com',
  'Vet Technician'),

-- Natalie Ulloa
('EMP053', 'Natalie', 'Ulloa', NULL, '2003-01-15', '2025-11-17',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'natalie.ulloa@greendogdental.com',
  'CSR'),

-- Nauman Ali
('EMP054', 'Nauman', 'Ali', NULL, '1992-02-25', '2023-11-06',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'nauman.ali@greendogdental.com',
  'CSR'),

-- Nichole Gibbs
('EMP055', 'Nichole', 'Gibbs', NULL, '1990-09-22', '2024-10-04',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  NULL, -- Remote
  'nichole.gibbs@greendogdental.com',
  'Remote CSR'),

-- Nick Bermudez
('EMP056', 'Nick', 'Bermudez', NULL, '1986-05-01', '2021-01-11',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VT'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'nick.bermudez@greendogdental.com',
  'Veterinary Technician'),

-- Rachael Banyasz
('EMP057', 'Rachael', 'Banyasz', NULL, '1994-01-21', '2023-02-09',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'DOC_ASST'),
  'part-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'rachael.banyasz@greendogdental.com',
  'Doctor''s Assistant'),

-- Raquel Velez
('EMP058', 'Raquel', 'Velez', NULL, '1997-10-01', '2025-01-01',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'raquel.velez@greendogdental.com',
  'In House'),

-- Sara Drickman
('EMP059', 'Sara', 'Drickman', NULL, '1990-10-05', '2025-01-16',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  NULL, -- Remote
  'sara.drickman@greendogdental.com',
  'Remote CSR'),

-- Shelby Ackerman
('EMP060', 'Shelby', 'Ackerman', NULL, '1994-03-29', '2021-04-07',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  NULL, -- Remote
  'shelby.ackerman@greendogdental.com',
  'RCSR'),

-- Sierra Frasier
('EMP061', 'Sierra', 'Frasier', NULL, '1984-12-06', '2021-04-02',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  NULL, -- Remote
  'sierra.frasier@greendogdental.com',
  'Remote CSR / My Pet Admin'),

-- Sierra Mendez
('EMP062', 'Sierra', 'Mendez', NULL, '1996-08-24', '2025-09-09',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  NULL, -- Remote
  'sierra.mendez@greendogdental.com',
  'Remote CSR'),

-- Sonora Chavez
('EMP063', 'Sonora', 'Chavez', NULL, '1999-05-18', '2025-09-02',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'sonora.chavez@greendogdental.com',
  'CSR / Vet Assistant'),

-- Taylor Fox
('EMP064', 'Taylor', 'Fox', NULL, '1989-11-05', '2019-02-11',
  (SELECT id FROM public.departments WHERE code = 'OPS'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'taylor.fox@greendogdental.com',
  'My Pet Admin'),

-- Tiffany Tesoro
('EMP065', 'Tiffany', 'Tesoro', NULL, '1996-01-25', '2022-10-27',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CLIN_SUP'),
  'full-time', 'active',
  NULL, -- Remote
  'tiffany.tesoro@greendogdental.com',
  'Remote CSR Manager'),

-- Verenice Mendoza
('EMP066', 'Verenice', 'Mendoza', NULL, '1992-08-27', '2024-01-05',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'verenice.mendoza@greendogdental.com',
  'In House CSR'),

-- Veronica Rios
('EMP067', 'Veronica', 'Rios', NULL, '1989-10-03', '2019-01-27',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'veronica.rios@greendogdental.com',
  'In House'),

-- Yasuko Sano
('EMP068', 'Yasuko', 'Sano', NULL, '1964-06-23', '2023-01-23',
  (SELECT id FROM public.departments WHERE code = 'FAC'),
  (SELECT id FROM public.job_positions WHERE code = 'FAC_TECH'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'yasuko.sano@greendogdental.com',
  'Facilities'),

-- Zuleyka Chuc
('EMP069', 'Zuleyka', 'Chuc', NULL, '1991-09-07', '2024-06-24',
  (SELECT id FROM public.departments WHERE code = 'CSR'),
  (SELECT id FROM public.job_positions WHERE code = 'CSR'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'zuleyka.chuc@greendogdental.com',
  'In House CSR'),

-- Ervin Tenorio
('EMP070', 'Ervin', 'Tenorio', NULL, '1996-10-14', '2023-09-18',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'ervin.tenorio@greendogdental.com',
  'In House'),

-- Rachel Moreno
('EMP071', 'Rachel', 'Moreno', NULL, '1995-03-23', '2024-10-08',
  (SELECT id FROM public.departments WHERE code = 'GEN'),
  (SELECT id FROM public.job_positions WHERE code = 'VA'),
  'full-time', 'active',
  (SELECT id FROM public.locations WHERE code = 'SO'),
  'rachel.moreno@greendogdental.com',
  'In House'),

-- Lauren Corallo
('EMP072', 'Lauren', 'Corallo', NULL, '1990-12-11', '2017-03-02',
  (SELECT id FROM public.departments WHERE code = 'MKT'),
  (SELECT id FROM public.job_positions WHERE code = 'GRAPH_DES'),
  'contract', 'active',
  NULL, -- Remote
  'lauren.corallo@greendogdental.com',
  'Graphic Designer - Contractor');


-- =====================================================
-- INSERT PAY SETTINGS FOR ALL EMPLOYEES
-- =====================================================

INSERT INTO public.employee_pay_settings (
  employee_id,
  pay_type,
  hourly_rate,
  annual_salary,
  currency,
  effective_from
)
SELECT 
  e.id,
  CASE 
    -- Salaried employees (annual amounts)
    WHEN e.employee_number IN ('EMP007', 'EMP009', 'EMP013', 'EMP018', 'EMP022', 'EMP023', 'EMP024', 'EMP025', 'EMP026', 'EMP027', 'EMP028', 'EMP029', 'EMP030', 'EMP031', 'EMP032', 'EMP033', 'EMP034', 'EMP040', 'EMP049') THEN 'salary'
    ELSE 'hourly'
  END,
  CASE 
    -- Hourly rates
    WHEN e.employee_number = 'EMP001' THEN 20.50  -- Adriana Gutierrez
    WHEN e.employee_number = 'EMP002' THEN 22.50  -- Aislinn Dickey
    WHEN e.employee_number = 'EMP003' THEN 25.00  -- Alexandra Martin
    WHEN e.employee_number = 'EMP004' THEN 23.50  -- Alysia Sanford
    WHEN e.employee_number = 'EMP005' THEN 18.00  -- Ana Livia Fraga
    WHEN e.employee_number = 'EMP006' THEN 21.00  -- Ana Victoria Portillo
    WHEN e.employee_number = 'EMP008' THEN 23.00  -- Angela Fraga
    WHEN e.employee_number = 'EMP010' THEN 27.00  -- Arron Bryant
    WHEN e.employee_number = 'EMP011' THEN 20.00  -- Ashley Paredes
    WHEN e.employee_number = 'EMP012' THEN 20.00  -- Batia Blank
    WHEN e.employee_number = 'EMP014' THEN 21.50  -- Brandon Orange
    WHEN e.employee_number = 'EMP015' THEN 26.00  -- Brittany Finch
    WHEN e.employee_number = 'EMP016' THEN 19.50  -- Caitlin Quinn
    WHEN e.employee_number = 'EMP017' THEN 17.87  -- Carlos Alexei Marquez
    WHEN e.employee_number = 'EMP019' THEN 28.00  -- Catherine Ramirez
    WHEN e.employee_number = 'EMP020' THEN 21.91  -- Christina Earnest
    WHEN e.employee_number = 'EMP021' THEN 22.00  -- Crystal Barrom
    WHEN e.employee_number = 'EMP035' THEN 18.50  -- Ethan Young
    WHEN e.employee_number = 'EMP036' THEN 28.13  -- Fidel Fraga
    WHEN e.employee_number = 'EMP037' THEN 30.00  -- Gladys Castro
    WHEN e.employee_number = 'EMP038' THEN 26.00  -- Jennifer Velasquez
    WHEN e.employee_number = 'EMP039' THEN 24.00  -- Jessica Lucra
    WHEN e.employee_number = 'EMP041' THEN 27.00  -- Joseph Reyes
    WHEN e.employee_number = 'EMP042' THEN 20.50  -- Karen Cuestas
    WHEN e.employee_number = 'EMP043' THEN 17.87  -- Ken Padilla
    WHEN e.employee_number = 'EMP044' THEN 22.00  -- Kirtlynn Moller
    WHEN e.employee_number = 'EMP045' THEN 31.00  -- Laurence Marai
    WHEN e.employee_number = 'EMP046' THEN 22.50  -- Lisa Girtain
    WHEN e.employee_number = 'EMP047' THEN 24.50  -- Marelyn Ventura
    WHEN e.employee_number = 'EMP048' THEN 18.00  -- Maria Portillo
    WHEN e.employee_number = 'EMP050' THEN 27.00  -- Markie Perez
    WHEN e.employee_number = 'EMP051' THEN 29.00  -- Megan Rolnik
    WHEN e.employee_number = 'EMP052' THEN 17.87  -- Miguel Antonio Gonzalez
    WHEN e.employee_number = 'EMP053' THEN 21.50  -- Natalie Ulloa
    WHEN e.employee_number = 'EMP054' THEN 21.00  -- Nauman Ali
    WHEN e.employee_number = 'EMP055' THEN 19.00  -- Nichole Gibbs
    WHEN e.employee_number = 'EMP056' THEN 37.00  -- Nick Bermudez
    WHEN e.employee_number = 'EMP057' THEN 25.00  -- Rachael Banyasz
    WHEN e.employee_number = 'EMP058' THEN 31.00  -- Raquel Velez
    WHEN e.employee_number = 'EMP059' THEN 23.50  -- Sara Drickman
    WHEN e.employee_number = 'EMP060' THEN 24.50  -- Shelby Ackerman
    WHEN e.employee_number = 'EMP061' THEN 30.00  -- Sierra Frasier
    WHEN e.employee_number = 'EMP062' THEN 20.00  -- Sierra Mendez
    WHEN e.employee_number = 'EMP063' THEN 19.00  -- Sonora Chavez
    WHEN e.employee_number = 'EMP064' THEN 28.00  -- Taylor Fox
    WHEN e.employee_number = 'EMP065' THEN 25.00  -- Tiffany Tesoro
    WHEN e.employee_number = 'EMP066' THEN 20.00  -- Verenice Mendoza
    WHEN e.employee_number = 'EMP067' THEN 28.40  -- Veronica Rios
    WHEN e.employee_number = 'EMP068' THEN 18.50  -- Yasuko Sano
    WHEN e.employee_number = 'EMP069' THEN 19.00  -- Zuleyka Chuc
    WHEN e.employee_number = 'EMP070' THEN 22.00  -- Ervin Tenorio
    WHEN e.employee_number = 'EMP071' THEN 17.27  -- Rachel Moreno
    WHEN e.employee_number = 'EMP072' THEN 50.00  -- Lauren Corallo (contractor)
    ELSE NULL
  END,
  CASE 
    -- Annual salaries
    WHEN e.employee_number = 'EMP007' THEN 110000.00  -- Andrea Rehrig
    WHEN e.employee_number = 'EMP009' THEN 49400.00   -- Angela Lina Perez
    WHEN e.employee_number = 'EMP013' THEN 65000.00   -- Bianca Alfonso
    WHEN e.employee_number = 'EMP018' THEN 69160.00   -- Carmen Chan
    WHEN e.employee_number = 'EMP022' THEN 100000.00  -- Cynthia Garcia
    WHEN e.employee_number = 'EMP023' THEN 83200.00   -- Deija Lighon
    WHEN e.employee_number = 'EMP024' THEN 52000.00   -- Diana Monterde
    WHEN e.employee_number = 'EMP025' THEN 64201.02   -- Dr. Andre de Mattos Faro
    WHEN e.employee_number = 'EMP026' THEN 125000.00  -- Dr. Candice Habawel
    WHEN e.employee_number = 'EMP027' THEN 82000.10   -- Dr. Celestine Hoh
    WHEN e.employee_number = 'EMP028' THEN 120000.00  -- Dr. Claudia Lau
    WHEN e.employee_number = 'EMP029' THEN 95000.00   -- Dr. Ella Scott
    WHEN e.employee_number = 'EMP030' THEN 156000.00  -- Dr. Heather Rally Webb
    WHEN e.employee_number = 'EMP031' THEN 180000.08  -- Dr. Jessica Robertson
    WHEN e.employee_number = 'EMP032' THEN 225000.10  -- Dr. Michael Geist
    WHEN e.employee_number = 'EMP033' THEN 140000.00  -- Dr. Niko Alzate
    WHEN e.employee_number = 'EMP034' THEN 100000.00  -- Dr. Sherry Vartanian
    WHEN e.employee_number = 'EMP040' THEN 70000.00   -- Jessica Salazar
    WHEN e.employee_number = 'EMP049' THEN 120000.14  -- Marc Mercury
    ELSE NULL
  END,
  'USD',
  e.hire_date
FROM public.employees e;


-- =====================================================
-- UPDATE Marc Mercury's profile to link to employee record
-- (Assumes profile was created via auth signup)
-- =====================================================
-- This links the profile to the employee record when they log in
-- UPDATE public.employees 
-- SET profile_id = (SELECT id FROM public.profiles WHERE email ILIKE '%marc%mercury%' LIMIT 1)
-- WHERE employee_number = 'EMP049';

-- =====================================================
-- SUMMARY
-- =====================================================
-- Total Employees: 72
-- Full-Time: 69
-- Part-Time: 2 (Megan Rolnik, Rachael Banyasz)
-- Contractors: 1 (Lauren Corallo)
-- Remote Workers: 14
-- In-House: 58
-- DVMs: 10
-- RVTs: 7
-- Vet Assistants: 20
-- CSRs: 22
-- Management/Admin: 13
-- =====================================================
