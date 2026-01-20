-- =====================================================
-- PHASE 2: PERFORMANCE - Database Indexes
-- Migration: 138_phase2_performance_indexes.sql
-- Priority: 🔴 CRITICAL - Do First
-- Purpose: Speed up common queries for multi-user scale
-- =====================================================

-- This phase adds indexes for frequently-used query patterns.
-- These are non-breaking changes that improve read performance.

-- -----------------------------------------------------
-- 2.1 EMPLOYEE INDEXES
-- -----------------------------------------------------

-- Active employees by department (roster filtering)
-- Note: employees table uses employment_status column, not is_active
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employees') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_employees_dept_status') THEN
      CREATE INDEX idx_employees_dept_status 
        ON employees(department_id, employment_status);
      RAISE NOTICE 'Created idx_employees_dept_status';
    END IF;
    
    -- Employee lookup by email
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_employees_email_work') THEN
      CREATE INDEX idx_employees_email_work 
        ON employees(email_work) 
        WHERE email_work IS NOT NULL;
      RAISE NOTICE 'Created idx_employees_email_work';
    END IF;
    
    -- Employee lookup by profile_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_employees_profile_id') THEN
      CREATE INDEX idx_employees_profile_id 
        ON employees(profile_id) 
        WHERE profile_id IS NOT NULL;
      RAISE NOTICE 'Created idx_employees_profile_id';
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------
-- 2.2 RECRUITING INDEXES
-- -----------------------------------------------------

-- Candidates by status (kanban board)
-- Note: candidates table uses 'status' column, not 'pipeline_stage'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'candidates') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'status') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_candidates_status_date') THEN
        CREATE INDEX idx_candidates_status_date 
          ON candidates(status, created_at DESC);
        RAISE NOTICE 'Created idx_candidates_status_date';
      END IF;
    END IF;
  END IF;
  
  -- Also check recruiting_candidates table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recruiting_candidates') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'recruiting_candidates' AND column_name = 'status') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_recruiting_candidates_status') THEN
        CREATE INDEX idx_recruiting_candidates_status 
          ON recruiting_candidates(status, created_at DESC);
        RAISE NOTICE 'Created idx_recruiting_candidates_status';
      END IF;
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------
-- 2.3 NOTIFICATION INDEXES
-- -----------------------------------------------------

-- Unread notifications per user (badge counts)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_unread') THEN
      CREATE INDEX idx_notifications_unread 
        ON notifications(user_id, created_at DESC) 
        WHERE read_at IS NULL;
      RAISE NOTICE 'Created idx_notifications_unread';
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------
-- 2.4 TIME OFF INDEXES
-- -----------------------------------------------------

-- Pending time off requests for approvers (check columns exist first)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'time_off_requests') THEN
    -- Check if approver_id column exists before creating index
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'time_off_requests' AND column_name = 'approver_id') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_time_off_pending') THEN
        CREATE INDEX idx_time_off_pending 
          ON time_off_requests(approver_id, requested_at) 
          WHERE status = 'pending';
        RAISE NOTICE 'Created idx_time_off_pending';
      END IF;
    ELSE
      RAISE NOTICE 'Skipping idx_time_off_pending: approver_id column does not exist';
    END IF;
    
    -- Time off by employee (check columns exist)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'time_off_requests' AND column_name = 'employee_id') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_time_off_employee') THEN
        CREATE INDEX idx_time_off_employee 
          ON time_off_requests(employee_id, start_date DESC);
        RAISE NOTICE 'Created idx_time_off_employee';
      END IF;
    ELSE
      RAISE NOTICE 'Skipping idx_time_off_employee: employee_id column does not exist';
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------
-- 2.5 SCHEDULE INDEXES
-- -----------------------------------------------------

-- Shifts by schedule and date (check columns exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shifts') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shifts' AND column_name = 'schedule_week_id') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_shifts_schedule_date') THEN
        CREATE INDEX idx_shifts_schedule_date 
          ON shifts(schedule_week_id, shift_date);
        RAISE NOTICE 'Created idx_shifts_schedule_date';
      END IF;
    ELSE
      RAISE NOTICE 'Skipping idx_shifts_schedule_date: schedule_week_id column does not exist';
    END IF;
    
    -- Shifts by employee (check columns exist)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shifts' AND column_name = 'employee_id') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_shifts_employee_date') THEN
        CREATE INDEX idx_shifts_employee_date 
          ON shifts(employee_id, shift_date DESC);
        RAISE NOTICE 'Created idx_shifts_employee_date';
      END IF;
    ELSE
      RAISE NOTICE 'Skipping idx_shifts_employee_date: employee_id column does not exist';
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------
-- 2.6 MARKETING/CRM INDEXES
-- -----------------------------------------------------

-- Marketing leads by status
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketing_leads') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketing_leads_status') THEN
      CREATE INDEX idx_marketing_leads_status 
        ON marketing_leads(status, created_at DESC);
      RAISE NOTICE 'Created idx_marketing_leads_status';
    END IF;
  END IF;
END $$;

-- Referral partners by zone
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'referral_partners') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_referral_partners_zone') THEN
      CREATE INDEX idx_referral_partners_zone 
        ON referral_partners(zone, priority_level);
      RAISE NOTICE 'Created idx_referral_partners_zone';
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------
-- PHASE 2 COMPLETE
-- -----------------------------------------------------

DO $$
BEGIN
  RAISE NOTICE '✅ Phase 2 Complete: Performance indexes created';
END $$;
