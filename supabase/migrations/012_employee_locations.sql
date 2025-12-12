-- =====================================================
-- Employee Assigned Locations (Junction Table)
-- Allows employees to be assigned to multiple locations
-- =====================================================

-- Create junction table for employee <-> location many-to-many relationship
CREATE TABLE IF NOT EXISTS public.employee_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, location_id)
);

-- Ensure only one primary location per employee
CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_primary_location 
  ON public.employee_locations(employee_id) 
  WHERE is_primary = true;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_employee_locations_employee 
  ON public.employee_locations(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_locations_location 
  ON public.employee_locations(location_id);

-- Enable RLS
ALTER TABLE public.employee_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies (DROP first to make migration idempotent)
DROP POLICY IF EXISTS "Anyone can view employee locations" ON public.employee_locations;
CREATE POLICY "Anyone can view employee locations" 
  ON public.employee_locations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage employee locations" ON public.employee_locations;
CREATE POLICY "Admins can manage employee locations" 
  ON public.employee_locations FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_employee_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_employee_locations_updated_at ON public.employee_locations;
CREATE TRIGGER trigger_employee_locations_updated_at
  BEFORE UPDATE ON public.employee_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_locations_updated_at();

-- Migrate existing location_id data to the junction table
-- This will set the employee's current location_id as their primary location
INSERT INTO public.employee_locations (employee_id, location_id, is_primary)
SELECT id, location_id, true
FROM public.employees
WHERE location_id IS NOT NULL
ON CONFLICT (employee_id, location_id) DO NOTHING;

-- =====================================================
-- View for easy querying of employees with all locations
-- =====================================================
CREATE OR REPLACE VIEW public.employee_locations_view AS
SELECT 
  e.id as employee_id,
  e.first_name,
  e.last_name,
  e.first_name || ' ' || e.last_name as full_name,
  jp.title as job_title,
  d.name as department_name,
  d.id as department_id,
  e.manager_employee_id,
  e.location_id as primary_location_id,
  pl.name as primary_location_name,
  COALESCE(
    array_agg(
      jsonb_build_object(
        'id', l.id,
        'name', l.name,
        'is_primary', el.is_primary
      )
    ) FILTER (WHERE l.id IS NOT NULL),
    ARRAY[]::jsonb[]
  ) as assigned_locations
FROM public.employees e
LEFT JOIN public.job_positions jp ON e.position_id = jp.id
LEFT JOIN public.departments d ON e.department_id = d.id
LEFT JOIN public.locations pl ON e.location_id = pl.id
LEFT JOIN public.employee_locations el ON e.id = el.employee_id
LEFT JOIN public.locations l ON el.location_id = l.id
WHERE e.employment_status = 'active'
GROUP BY e.id, e.first_name, e.last_name, jp.title, d.name, d.id, 
         e.manager_employee_id, e.location_id, pl.name;
