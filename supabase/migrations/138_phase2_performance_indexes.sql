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
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employees') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_employees_dept_active') THEN
      CREATE INDEX idx_employees_dept_active 
        ON employees(department_id, is_active) 
        WHERE is_active = true;
      RAISE NOTICE 'Created idx_employees_dept_active';
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

-- Candidates by pipeline stage (kanban board)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'candidates') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_candidates_stage_date') THEN
      CREATE INDEX idx_candidates_stage_date 
        ON candidates(pipeline_stage, created_at DESC);
      RAISE NOTICE 'Created idx_candidates_stage_date';
    END IF;
  END IF;
  
  -- Also check recruiting_candidates table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recruiting_candidates') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_recruiting_candidates_stage') THEN
      CREATE INDEX idx_recruiting_candidates_stage 
        ON recruiting_candidates(pipeline_stage, created_at DESC);
      RAISE NOTICE 'Created idx_recruiting_candidates_stage';
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

-- Pending time off requests for approvers
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'time_off_requests') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_time_off_pending') THEN
      CREATE INDEX idx_time_off_pending 
        ON time_off_requests(approver_id, requested_at) 
        WHERE status = 'pending';
      RAISE NOTICE 'Created idx_time_off_pending';
    END IF;
    
    -- Time off by employee
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_time_off_employee') THEN
      CREATE INDEX idx_time_off_employee 
        ON time_off_requests(employee_id, start_date DESC);
      RAISE NOTICE 'Created idx_time_off_employee';
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------
-- 2.5 SCHEDULE INDEXES
-- -----------------------------------------------------

-- Shifts by schedule and date
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shifts') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_shifts_schedule_date') THEN
      CREATE INDEX idx_shifts_schedule_date 
        ON shifts(schedule_week_id, shift_date);
      RAISE NOTICE 'Created idx_shifts_schedule_date';
    END IF;
    
    -- Shifts by employee
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_shifts_employee_date') THEN
      CREATE INDEX idx_shifts_employee_date 
        ON shifts(employee_id, shift_date DESC);
      RAISE NOTICE 'Created idx_shifts_employee_date';
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
