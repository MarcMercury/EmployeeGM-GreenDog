-- =====================================================
-- PHASE 1: FOUNDATION - Data Integrity Constraints
-- Migration: 137_phase1_data_integrity.sql
-- Priority: 🔴 CRITICAL - Do First
-- Purpose: Prevent data corruption at the database level
-- =====================================================

-- This phase adds CHECK constraints to ensure data validity.
-- These are non-breaking changes that enforce business rules.

-- -----------------------------------------------------
-- 1.1 EMPLOYEE DATA VALIDATION
-- -----------------------------------------------------

-- Ensure hire date is before or equal to termination date
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_dates_valid') THEN
    ALTER TABLE employees ADD CONSTRAINT employees_dates_valid
      CHECK (hire_date IS NULL OR termination_date IS NULL OR hire_date <= termination_date);
    RAISE NOTICE 'Added employees_dates_valid constraint';
  ELSE
    RAISE NOTICE 'employees_dates_valid constraint already exists';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping employees_dates_valid: %', SQLERRM;
END $$;

-- Ensure email format is valid (basic regex check)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_email_format') THEN
    ALTER TABLE employees ADD CONSTRAINT employees_email_format
      CHECK (email_work IS NULL OR email_work ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    RAISE NOTICE 'Added employees_email_format constraint';
  ELSE
    RAISE NOTICE 'employees_email_format constraint already exists';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping employees_email_format: %', SQLERRM;
END $$;

-- -----------------------------------------------------
-- 1.2 DATA NORMALIZATION TRIGGER
-- -----------------------------------------------------

-- Automatically clean and normalize employee data on save
CREATE OR REPLACE FUNCTION public.normalize_employee_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Normalize email to lowercase
  IF NEW.email_work IS NOT NULL THEN
    NEW.email_work := lower(trim(NEW.email_work));
  END IF;
  
  -- Trim name fields
  IF NEW.first_name IS NOT NULL THEN
    NEW.first_name := trim(NEW.first_name);
  END IF;
  
  IF NEW.last_name IS NOT NULL THEN
    NEW.last_name := trim(NEW.last_name);
  END IF;
  
  -- Set updated_at timestamp
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$;

-- Apply trigger to employees table
DROP TRIGGER IF EXISTS normalize_employee_before_save ON employees;
CREATE TRIGGER normalize_employee_before_save
  BEFORE INSERT OR UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION normalize_employee_data();

COMMENT ON FUNCTION public.normalize_employee_data() IS 'Normalizes employee data (lowercase email, trim names) before save';

-- -----------------------------------------------------
-- 1.3 PROFILE DATA VALIDATION
-- -----------------------------------------------------

-- Ensure profile email format is valid
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_format') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_email_format
      CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    RAISE NOTICE 'Added profiles_email_format constraint';
  ELSE
    RAISE NOTICE 'profiles_email_format constraint already exists';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping profiles_email_format: %', SQLERRM;
END $$;

-- -----------------------------------------------------
-- PHASE 1 COMPLETE
-- -----------------------------------------------------

DO $$
BEGIN
  RAISE NOTICE '✅ Phase 1 Complete: Data integrity constraints applied';
END $$;
