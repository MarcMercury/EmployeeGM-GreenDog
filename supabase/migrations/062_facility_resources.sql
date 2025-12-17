-- =====================================================
-- Migration: Facilities Resources
-- Description: Table for tracking facility vendors and contractors
--   (plumbers, electricians, handyman, landlords, etc.) per location
-- =====================================================

-- =====================================================
-- STEP 1: Create facility_resources table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.facility_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Resource Info
  name TEXT NOT NULL,
  company_name TEXT,
  resource_type TEXT NOT NULL CHECK (resource_type IN (
    'plumber', 'electrician', 'hvac', 'handyman', 'landlord', 
    'cleaning', 'landscaping', 'pest_control', 'security', 
    'it_support', 'appliance_repair', 'roofing', 'other'
  )),
  
  -- Contact Info
  phone TEXT,
  phone_alt TEXT,
  email TEXT,
  website TEXT,
  
  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  
  -- Service Details
  service_area TEXT, -- e.g., "North Bay", "All locations"
  hours_of_operation TEXT,
  emergency_contact BOOLEAN DEFAULT false,
  emergency_phone TEXT,
  
  -- Relationship
  contract_start_date DATE,
  contract_end_date DATE,
  is_preferred BOOLEAN DEFAULT false,
  
  -- Notes & Rating
  notes TEXT,
  internal_rating INTEGER CHECK (internal_rating >= 1 AND internal_rating <= 5),
  
  -- Audit
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- STEP 2: Create junction table for location assignments
-- =====================================================

CREATE TABLE IF NOT EXISTS public.facility_resource_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.facility_resources(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(resource_id, location_id)
);

-- =====================================================
-- STEP 3: Create indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_facility_resources_type ON public.facility_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_facility_resources_active ON public.facility_resources(is_active);
CREATE INDEX IF NOT EXISTS idx_facility_resources_preferred ON public.facility_resources(is_preferred);
CREATE INDEX IF NOT EXISTS idx_facility_resources_emergency ON public.facility_resources(emergency_contact);

CREATE INDEX IF NOT EXISTS idx_facility_resource_locations_resource ON public.facility_resource_locations(resource_id);
CREATE INDEX IF NOT EXISTS idx_facility_resource_locations_location ON public.facility_resource_locations(location_id);

-- =====================================================
-- STEP 4: Enable RLS and create policies
-- =====================================================

ALTER TABLE public.facility_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_resource_locations ENABLE ROW LEVEL SECURITY;

-- All authenticated users can VIEW facility resources
CREATE POLICY "All users can view facility resources"
ON public.facility_resources
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

-- Admins can manage facility resources
CREATE POLICY "Admins can manage facility resources"
ON public.facility_resources
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- All authenticated users can view location assignments
CREATE POLICY "All users can view resource locations"
ON public.facility_resource_locations
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Admins can manage location assignments
CREATE POLICY "Admins can manage resource locations"
ON public.facility_resource_locations
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- =====================================================
-- STEP 5: Grant permissions
-- =====================================================

GRANT SELECT ON public.facility_resources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facility_resources TO authenticated;
GRANT SELECT ON public.facility_resource_locations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facility_resource_locations TO authenticated;

-- =====================================================
-- STEP 6: Update triggers
-- =====================================================

CREATE TRIGGER update_facility_resources_updated_at
  BEFORE UPDATE ON public.facility_resources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- STEP 7: Seed some sample resource types for reference
-- =====================================================

COMMENT ON TABLE public.facility_resources IS 'Directory of facility vendors and contractors (plumbers, electricians, etc.) for physical facility maintenance';
COMMENT ON COLUMN public.facility_resources.resource_type IS 'Type of service: plumber, electrician, hvac, handyman, landlord, cleaning, landscaping, pest_control, security, it_support, appliance_repair, roofing, other';
COMMENT ON COLUMN public.facility_resources.emergency_contact IS 'Whether this vendor provides emergency/after-hours service';
COMMENT ON COLUMN public.facility_resources.is_preferred IS 'Preferred vendor for this service type';
