-- Migration: Employee Compensation Module
-- Professional Personnel Record - Compensation Data

-- ============================================
-- 1. CREATE EMPLOYEE_COMPENSATION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.employee_compensation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL UNIQUE,
    pay_type TEXT CHECK (pay_type IN ('Hourly', 'Salary')),
    pay_rate NUMERIC(10, 2), -- e.g., 28.50 or 75000.00
    employment_status TEXT CHECK (employment_status IN ('Full Time', 'Part Time', 'Contractor', 'Per Diem')),
    benefits_enrolled BOOLEAN DEFAULT false,
    bonus_plan_details TEXT, -- e.g., "Quarterly Production Bonus"
    ce_budget_total NUMERIC(10, 2) DEFAULT 0, -- Total CE Allowance
    ce_budget_used NUMERIC(10, 2) DEFAULT 0, -- Amount Spent
    effective_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 2. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_employee_compensation_employee_id 
    ON public.employee_compensation(employee_id);

-- ============================================
-- 3. AUTO-UPDATE TIMESTAMP TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_compensation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_compensation_updated_at ON public.employee_compensation;
CREATE TRIGGER trigger_compensation_updated_at
    BEFORE UPDATE ON public.employee_compensation
    FOR EACH ROW EXECUTE FUNCTION update_compensation_updated_at();

-- ============================================
-- 4. ROW LEVEL SECURITY (CRITICAL)
-- ============================================
ALTER TABLE public.employee_compensation ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins Full Access" ON public.employee_compensation;
DROP POLICY IF EXISTS "Users View Own" ON public.employee_compensation;

-- Policy 1: Admins can do EVERYTHING (Select, Insert, Update, Delete)
CREATE POLICY "Admins Full Access" ON public.employee_compensation
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super_admin')
    )
);

-- Policy 2: Users can VIEW their OWN record only
CREATE POLICY "Users View Own" ON public.employee_compensation
FOR SELECT USING (
    employee_id IN (
        SELECT e.id FROM public.employees e
        JOIN public.profiles p ON e.profile_id = p.id
        WHERE p.id = auth.uid()
    )
);

-- Policy 3: Peers cannot see anything (Implicit Deny - no policy = no access)

-- ============================================
-- 5. AUDIT LOGGING FOR COMPENSATION CHANGES
-- ============================================
CREATE OR REPLACE FUNCTION audit_compensation_changes()
RETURNS TRIGGER AS $$
DECLARE
    changes_json JSONB;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        changes_json := jsonb_build_object();
        
        IF OLD.pay_type IS DISTINCT FROM NEW.pay_type THEN
            changes_json := changes_json || jsonb_build_object('pay_type', jsonb_build_object('old', OLD.pay_type, 'new', NEW.pay_type));
        END IF;
        IF OLD.pay_rate IS DISTINCT FROM NEW.pay_rate THEN
            changes_json := changes_json || jsonb_build_object('pay_rate', jsonb_build_object('old', OLD.pay_rate, 'new', NEW.pay_rate));
        END IF;
        IF OLD.employment_status IS DISTINCT FROM NEW.employment_status THEN
            changes_json := changes_json || jsonb_build_object('employment_status', jsonb_build_object('old', OLD.employment_status, 'new', NEW.employment_status));
        END IF;
        IF OLD.benefits_enrolled IS DISTINCT FROM NEW.benefits_enrolled THEN
            changes_json := changes_json || jsonb_build_object('benefits_enrolled', jsonb_build_object('old', OLD.benefits_enrolled, 'new', NEW.benefits_enrolled));
        END IF;
        
        INSERT INTO public.audit_log (
            actor_id, entity_type, entity_id, action, old_values, new_values, changes
        ) VALUES (
            auth.uid(), 'compensation', NEW.id, 'UPDATE',
            to_jsonb(OLD), to_jsonb(NEW), changes_json
        );
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_log (
            actor_id, entity_type, entity_id, action, new_values
        ) VALUES (
            auth.uid(), 'compensation', NEW.id, 'INSERT', to_jsonb(NEW)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_audit_compensation ON public.employee_compensation;
CREATE TRIGGER trigger_audit_compensation
    AFTER INSERT OR UPDATE ON public.employee_compensation
    FOR EACH ROW EXECUTE FUNCTION audit_compensation_changes();

-- ============================================
-- 6. EMPLOYEE ASSETS TABLE (For Tab 6)
-- ============================================
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

DROP POLICY IF EXISTS "Admins manage assets" ON public.employee_assets;
CREATE POLICY "Admins manage assets" ON public.employee_assets
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'super_admin', 'manager')
    )
);

DROP POLICY IF EXISTS "Users view own assets" ON public.employee_assets;
CREATE POLICY "Users view own assets" ON public.employee_assets
FOR SELECT USING (
    employee_id IN (
        SELECT e.id FROM public.employees e
        JOIN public.profiles p ON e.profile_id = p.id
        WHERE p.id = auth.uid()
    )
);

-- ============================================
-- 7. GRANT PERMISSIONS
-- ============================================
GRANT SELECT, INSERT, UPDATE ON public.employee_compensation TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_assets TO authenticated;
