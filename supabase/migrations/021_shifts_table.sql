-- =============================================
-- Migration: Update Shifts Table for Schedule Builder
-- Note: shifts table already exists in 006_full_schema.sql
-- This migration adds missing columns and RLS policies
-- =============================================

-- Add missing columns to existing shifts table
ALTER TABLE public.shifts 
  ADD COLUMN IF NOT EXISTS role_required TEXT,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Update status check constraint to include 'closed_clinic'
-- First drop the old constraint, then add new one
ALTER TABLE public.shifts DROP CONSTRAINT IF EXISTS shifts_status_check;
ALTER TABLE public.shifts ADD CONSTRAINT shifts_status_check 
  CHECK (status IN ('draft', 'published', 'completed', 'missed', 'cancelled', 'open', 'filled', 'closed_clinic'));

-- Additional index for is_published
CREATE INDEX IF NOT EXISTS idx_shifts_published ON public.shifts(is_published);

-- =============================================
-- RLS Policies for Schedule Builder
-- =============================================

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can view published shifts" ON public.shifts;
DROP POLICY IF EXISTS "Admins can view all shifts" ON public.shifts;
DROP POLICY IF EXISTS "Admins can create shifts" ON public.shifts;
DROP POLICY IF EXISTS "Admins can update shifts" ON public.shifts;
DROP POLICY IF EXISTS "Admins can delete shifts" ON public.shifts;

-- All authenticated users can view published shifts
CREATE POLICY "Authenticated users can view published shifts"
  ON public.shifts FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND is_published = true
  );

-- Admins can view ALL shifts (including unpublished drafts)
CREATE POLICY "Admins can view all shifts"
  ON public.shifts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE employees.profile_id IN (
        SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE auth_user_id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Admins can insert shifts
CREATE POLICY "Admins can create shifts"
  ON public.shifts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update shifts
CREATE POLICY "Admins can update shifts"
  ON public.shifts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete shifts
CREATE POLICY "Admins can delete shifts"
  ON public.shifts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- Seed sample shifts for testing (current week)
-- =============================================
DO $$
DECLARE
  loc_id UUID;
  week_start DATE := date_trunc('week', CURRENT_DATE)::DATE;
  i INTEGER;
BEGIN
  -- Get first location
  SELECT id INTO loc_id FROM public.locations LIMIT 1;
  
  IF loc_id IS NOT NULL THEN
    -- Create shifts for each day of the week (if none exist)
    IF NOT EXISTS (SELECT 1 FROM public.shifts WHERE start_at >= week_start) THEN
      FOR i IN 0..6 LOOP
        -- Morning shift (8am - 12pm)
        INSERT INTO public.shifts (start_at, end_at, location_id, status, is_open_shift)
        VALUES (
          (week_start + i) + INTERVAL '8 hours',
          (week_start + i) + INTERVAL '12 hours',
          loc_id,
          'draft',
          true
        );
        
        -- Afternoon shift (1pm - 5pm)
        INSERT INTO public.shifts (start_at, end_at, location_id, status, is_open_shift)
        VALUES (
          (week_start + i) + INTERVAL '13 hours',
          (week_start + i) + INTERVAL '17 hours',
          loc_id,
          'draft',
          true
        );
      END LOOP;
      
      RAISE NOTICE 'Created 14 sample shifts for the current week';
    ELSE
      RAISE NOTICE 'Shifts already exist for this week - skipping seed';
    END IF;
  ELSE
    RAISE NOTICE 'No locations found - skipping shift seeding';
  END IF;
END $$;
