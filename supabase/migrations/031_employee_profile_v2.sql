-- =====================================================
-- MIGRATION: 031_employee_profile_v2.sql
-- Description: Enhanced employee profile tables
-- - Employee licenses (professional credentials with expiration)
-- - CE Credits tracking (Continuing Education budget)
-- - Time-off balances (PTO/Sick tracking)
-- - Updates to employee_notes for timeline visibility
-- Created: December 2024
-- =====================================================

-- =====================================================
-- 1. EMPLOYEE LICENSES TABLE
-- Tracks professional licenses, certifications with expiration dates
-- =====================================================
CREATE TABLE IF NOT EXISTS public.employee_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  
  -- License details
  license_type TEXT NOT NULL, -- e.g., 'RVT', 'DVM', 'CVT'
  license_number TEXT NOT NULL,
  issuing_authority TEXT, -- e.g., 'California Veterinary Medical Board'
  state_code TEXT, -- e.g., 'CA', 'TX'
  
  -- Validity dates
  issue_date DATE,
  expiration_date DATE,
  
  -- Status
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 2. CE CREDITS TRACKING
-- Continuing Education budget and spend tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS public.employee_ce_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  
  -- Budget period (annual typically)
  period_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  
  -- Budget allocation
  budget_amount NUMERIC NOT NULL DEFAULT 0, -- Total allotted
  currency TEXT DEFAULT 'USD',
  
  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: one budget per employee per year
  UNIQUE(employee_id, period_year)
);

-- CE Credit Transactions (spend records)
CREATE TABLE IF NOT EXISTS public.employee_ce_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ce_credit_id UUID NOT NULL REFERENCES public.employee_ce_credits(id) ON DELETE CASCADE,
  
  -- Transaction details
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL, -- What was it spent on
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Category
  category TEXT DEFAULT 'course' CHECK (category IN (
    'course',
    'conference', 
    'certification',
    'materials',
    'travel',
    'other'
  )),
  
  -- Receipt/documentation (optional link to employee_documents)
  document_id UUID REFERENCES public.employee_documents(id) ON DELETE SET NULL,
  
  -- Approval
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 3. TIME-OFF BALANCES
-- PTO/Sick time accrual and usage tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS public.employee_time_off_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  time_off_type_id UUID NOT NULL REFERENCES public.time_off_types(id) ON DELETE CASCADE,
  
  -- Balance tracking
  period_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  accrued_hours NUMERIC NOT NULL DEFAULT 0, -- Total earned
  used_hours NUMERIC NOT NULL DEFAULT 0, -- Total used
  pending_hours NUMERIC NOT NULL DEFAULT 0, -- Pending approval requests
  
  -- Carryover from previous period
  carryover_hours NUMERIC NOT NULL DEFAULT 0,
  
  -- Max caps
  max_accrual_hours NUMERIC, -- Cap on accrual
  max_carryover_hours NUMERIC, -- Cap on carryover
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique: one balance per employee per type per year
  UNIQUE(employee_id, time_off_type_id, period_year)
);

-- =====================================================
-- 4. UPDATE EMPLOYEE_NOTES FOR TIMELINE
-- Add note_type and is_pinned for better timeline management
-- =====================================================
DO $$
BEGIN
  -- Add note_type if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'employee_notes' 
    AND column_name = 'note_type'
  ) THEN
    ALTER TABLE public.employee_notes ADD COLUMN note_type TEXT DEFAULT 'general' 
      CHECK (note_type IN ('general', 'performance', 'disciplinary', 'recognition', 'goal', 'system'));
  END IF;

  -- Add is_pinned if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'employee_notes' 
    AND column_name = 'is_pinned'
  ) THEN
    ALTER TABLE public.employee_notes ADD COLUMN is_pinned BOOLEAN DEFAULT false;
  END IF;
END $$;

-- =====================================================
-- 5. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_employee_licenses_employee ON public.employee_licenses(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_licenses_expiration ON public.employee_licenses(expiration_date);
CREATE INDEX IF NOT EXISTS idx_employee_ce_credits_employee ON public.employee_ce_credits(employee_id, period_year);
CREATE INDEX IF NOT EXISTS idx_employee_ce_transactions_credit ON public.employee_ce_transactions(ce_credit_id);
CREATE INDEX IF NOT EXISTS idx_employee_time_off_balances_employee ON public.employee_time_off_balances(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_notes_employee ON public.employee_notes(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_notes_created ON public.employee_notes(created_at DESC);

-- =====================================================
-- 6. ENABLE RLS ON NEW TABLES
-- =====================================================
ALTER TABLE public.employee_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_ce_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_ce_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_time_off_balances ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. RLS POLICIES - LICENSES
-- =====================================================
CREATE POLICY "Admins manage employee licenses" ON public.employee_licenses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Employees view their own licenses" ON public.employee_licenses
  FOR SELECT USING (
    employee_id IN (
      SELECT e.id FROM employees e
      JOIN profiles p ON e.profile_id = p.id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- =====================================================
-- 8. RLS POLICIES - CE CREDITS
-- =====================================================
CREATE POLICY "Admins manage CE credits" ON public.employee_ce_credits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Employees view their own CE credits" ON public.employee_ce_credits
  FOR SELECT USING (
    employee_id IN (
      SELECT e.id FROM employees e
      JOIN profiles p ON e.profile_id = p.id
      WHERE p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins manage CE transactions" ON public.employee_ce_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Employees view their own CE transactions" ON public.employee_ce_transactions
  FOR SELECT USING (
    ce_credit_id IN (
      SELECT id FROM employee_ce_credits
      WHERE employee_id IN (
        SELECT e.id FROM employees e
        JOIN profiles p ON e.profile_id = p.id
        WHERE p.auth_user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- 9. RLS POLICIES - TIME OFF BALANCES
-- =====================================================
CREATE POLICY "Admins manage time off balances" ON public.employee_time_off_balances
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Employees view their own time off balances" ON public.employee_time_off_balances
  FOR SELECT USING (
    employee_id IN (
      SELECT e.id FROM employees e
      JOIN profiles p ON e.profile_id = p.id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- =====================================================
-- 10. UPDATED_AT TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_employee_licenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employee_licenses_updated_at
  BEFORE UPDATE ON public.employee_licenses
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_licenses_updated_at();

CREATE OR REPLACE FUNCTION update_employee_ce_credits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employee_ce_credits_updated_at
  BEFORE UPDATE ON public.employee_ce_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_ce_credits_updated_at();

CREATE OR REPLACE FUNCTION update_employee_time_off_balances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employee_time_off_balances_updated_at
  BEFORE UPDATE ON public.employee_time_off_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_time_off_balances_updated_at();

-- =====================================================
-- Done!
-- =====================================================


