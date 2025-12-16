-- Migration: 051_fix_employee_assets_rls.sql
-- Purpose: Create employee_assets table and fix RLS policies
-- Created: December 16, 2025

-- =====================================================
-- CREATE EMPLOYEE ASSETS TABLE IF NOT EXISTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.employee_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    asset_name TEXT NOT NULL,
    asset_type TEXT CHECK (asset_type IN ('Key', 'Badge', 'Device', 'Equipment', 'Uniform', 'Other')),
    serial_number TEXT,
    checked_out_at TIMESTAMPTZ DEFAULT NOW(),
    expected_return_date DATE,
    returned_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_assets_employee_id 
    ON public.employee_assets(employee_id);

ALTER TABLE public.employee_assets ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FIX EMPLOYEE ASSETS RLS POLICIES
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins manage assets" ON public.employee_assets;
DROP POLICY IF EXISTS "Users view own assets" ON public.employee_assets;

-- Recreate with correct auth pattern
CREATE POLICY "Admins manage assets" ON public.employee_assets
FOR ALL USING (public.is_admin());

-- Users can view their own assets
CREATE POLICY "Users view own assets" ON public.employee_assets
FOR SELECT USING (
    employee_id IN (
        SELECT e.id FROM public.employees e
        WHERE e.profile_id = auth.uid()
    )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_assets TO authenticated;

-- =====================================================
-- CREATE EMPLOYEE_COMPENSATION TABLE IF NOT EXISTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.employee_compensation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    pay_type TEXT CHECK (pay_type IN ('Hourly', 'Salary', 'Commission', 'Contract')) DEFAULT 'Hourly',
    pay_rate DECIMAL(12,2),
    employment_status TEXT CHECK (employment_status IN ('Full Time', 'Part Time', 'PRN', 'Contract', 'Intern')),
    benefits_enrolled BOOLEAN DEFAULT FALSE,
    bonus_plan_details TEXT,
    ce_budget_total DECIMAL(10,2) DEFAULT 0,
    ce_budget_used DECIMAL(10,2) DEFAULT 0,
    effective_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_compensation_employee_id 
    ON public.employee_compensation(employee_id);

ALTER TABLE public.employee_compensation ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FIX EMPLOYEE_COMPENSATION RLS
-- =====================================================
DROP POLICY IF EXISTS "Admins manage compensation" ON public.employee_compensation;
DROP POLICY IF EXISTS "Users view own compensation" ON public.employee_compensation;

CREATE POLICY "Admins manage compensation" ON public.employee_compensation
FOR ALL USING (public.is_admin());

CREATE POLICY "Users view own compensation" ON public.employee_compensation
FOR SELECT USING (
    employee_id IN (
        SELECT e.id FROM public.employees e
        WHERE e.profile_id = auth.uid()
    )
);

GRANT SELECT, INSERT, UPDATE ON public.employee_compensation TO authenticated;
