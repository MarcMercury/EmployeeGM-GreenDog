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
