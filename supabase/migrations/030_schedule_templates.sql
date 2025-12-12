-- =====================================================
-- MIGRATION: 030_schedule_templates.sql
-- Description: Add schedule templates for "Save as Template" feature
-- Allows saving a week's schedule as a reusable template
-- Created: December 2024
-- =====================================================

-- Schedule Templates Table - Stores named templates
CREATE TABLE IF NOT EXISTS public.schedule_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Template Shifts - The actual shift patterns in a template
CREATE TABLE IF NOT EXISTS public.schedule_template_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.schedule_templates(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Monday, 6 = Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  role_required TEXT,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL, -- Optional: pre-assigned employee
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add role_required to shifts table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'shifts' 
    AND column_name = 'role_required'
  ) THEN
    ALTER TABLE public.shifts ADD COLUMN role_required TEXT;
  END IF;
END $$;

-- Add is_published to shifts table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'shifts' 
    AND column_name = 'is_published'
  ) THEN
    ALTER TABLE public.shifts ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Add notes to shifts table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'shifts' 
    AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.shifts ADD COLUMN notes TEXT;
  END IF;
END $$;

-- Update status check constraint to include 'closed_clinic'
-- First drop the old constraint if it exists, then add the new one
DO $$
BEGIN
  -- Try to drop the old constraint (it may have different names)
  ALTER TABLE public.shifts DROP CONSTRAINT IF EXISTS shifts_status_check;
  ALTER TABLE public.shifts DROP CONSTRAINT IF EXISTS shifts_status_check1;
  
  -- Add new constraint with closed_clinic status
  ALTER TABLE public.shifts ADD CONSTRAINT shifts_status_check 
    CHECK (status IN ('draft', 'published', 'completed', 'missed', 'cancelled', 'closed_clinic'));
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not update status constraint, it may already be correct';
END $$;

-- RLS Policies for schedule_templates
ALTER TABLE public.schedule_templates ENABLE ROW LEVEL SECURITY;

-- Admins can do everything with templates
CREATE POLICY "Admins can manage schedule templates" ON public.schedule_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for schedule_template_shifts
ALTER TABLE public.schedule_template_shifts ENABLE ROW LEVEL SECURITY;

-- Admins can do everything with template shifts
CREATE POLICY "Admins can manage template shifts" ON public.schedule_template_shifts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- Indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_schedule_templates_active ON public.schedule_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_schedule_template_shifts_template ON public.schedule_template_shifts(template_id);
CREATE INDEX IF NOT EXISTS idx_schedule_template_shifts_day ON public.schedule_template_shifts(day_of_week);
CREATE INDEX IF NOT EXISTS idx_shifts_location_date ON public.shifts(location_id, start_at);
CREATE INDEX IF NOT EXISTS idx_shifts_employee_date ON public.shifts(employee_id, start_at);

-- =====================================================
-- Done!
-- =====================================================
