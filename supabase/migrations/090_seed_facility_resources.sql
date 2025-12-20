-- =====================================================
-- Migration: Seed Facility Resources - Service Provider Directory
-- Description: Add missing resource types and seed vendor data
-- =====================================================

-- =====================================================
-- STEP 1: Drop and recreate resource_type constraint with new values
-- =====================================================

ALTER TABLE public.facility_resources 
DROP CONSTRAINT IF EXISTS facility_resources_resource_type_check;

ALTER TABLE public.facility_resources 
ADD CONSTRAINT facility_resources_resource_type_check CHECK (resource_type IN (
  'plumber', 'electrician', 'hvac', 'handyman', 'landlord', 
  'cleaning', 'landscaping', 'pest_control', 'security', 
  'it_support', 'appliance_repair', 'roofing', 'other',
  -- New types added:
  'painting', 'design', 'cabinetry', 'countertops', 'general_contractor'
));

-- =====================================================
-- STEP 2: Insert facility resources
-- =====================================================

-- Get location IDs for reference
DO $$
DECLARE
  venice_id UUID;
  sherman_oaks_id UUID;
  aetna_id UUID;
  resource_id UUID;
BEGIN
  -- Get location IDs
  SELECT id INTO venice_id FROM public.locations WHERE code = 'VEN' LIMIT 1;
  SELECT id INTO sherman_oaks_id FROM public.locations WHERE code = 'SO' LIMIT 1;
  SELECT id INTO aetna_id FROM public.locations WHERE code = 'VAL' LIMIT 1;
  
  -- 1. HVAC - Oismin
  INSERT INTO public.facility_resources (name, company_name, resource_type, phone, notes, is_active, emergency_contact)
  VALUES ('Oismin', NULL, 'hvac', '323-218-1309', 'Very expensive; use only in emergencies if Perloff cannot fix', true, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO resource_id;
  IF resource_id IS NOT NULL THEN
    INSERT INTO public.facility_resource_locations (resource_id, location_id, is_primary)
    VALUES 
      (resource_id, venice_id, true),
      (resource_id, sherman_oaks_id, false)
    ON CONFLICT (resource_id, location_id) DO NOTHING;
  END IF;
  
  -- 2. Electrical / General - Mike Kremic
  INSERT INTO public.facility_resources (name, company_name, resource_type, phone, notes, is_active, is_preferred)
  VALUES ('Mike Kremic', NULL, 'electrician', '310-678-7677', 'Inexpensive; hard to schedule; handles all general handywork', true, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO resource_id;
  IF resource_id IS NOT NULL THEN
    INSERT INTO public.facility_resource_locations (resource_id, location_id, is_primary)
    VALUES 
      (resource_id, venice_id, true),
      (resource_id, sherman_oaks_id, false),
      (resource_id, aetna_id, false)
    ON CONFLICT (resource_id, location_id) DO NOTHING;
  END IF;
  
  -- 3. General / Other - Joe Lum
  INSERT INTO public.facility_resources (name, company_name, resource_type, phone, notes, is_active)
  VALUES ('Joe Lum', NULL, 'handyman', '213-760-0820', 'Aetna GC; use for any Aetna-related issues', true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO resource_id;
  IF resource_id IS NOT NULL THEN
    INSERT INTO public.facility_resource_locations (resource_id, location_id, is_primary)
    VALUES 
      (resource_id, venice_id, false),
      (resource_id, sherman_oaks_id, false),
      (resource_id, aetna_id, true)
    ON CONFLICT (resource_id, location_id) DO NOTHING;
  END IF;
  
  -- 4. Handyman - Josh Chan
  INSERT INTO public.facility_resources (name, company_name, resource_type, phone, notes, is_active)
  VALUES ('Josh Chan', NULL, 'handyman', '323-667-4844', 'Day rate only; good for moving and small construction', true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO resource_id;
  IF resource_id IS NOT NULL THEN
    INSERT INTO public.facility_resource_locations (resource_id, location_id, is_primary)
    VALUES 
      (resource_id, venice_id, true),
      (resource_id, sherman_oaks_id, false),
      (resource_id, aetna_id, false)
    ON CONFLICT (resource_id, location_id) DO NOTHING;
  END IF;
  
  -- 5. Painting - Thelma
  INSERT INTO public.facility_resources (name, company_name, resource_type, phone, notes, is_active)
  VALUES ('Thelma', NULL, 'painting', '818-220-3128', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO resource_id;
  IF resource_id IS NOT NULL THEN
    INSERT INTO public.facility_resource_locations (resource_id, location_id, is_primary)
    VALUES 
      (resource_id, venice_id, true),
      (resource_id, sherman_oaks_id, false),
      (resource_id, aetna_id, false)
    ON CONFLICT (resource_id, location_id) DO NOTHING;
  END IF;
  
  -- 6. Design / Signage - James Farran
  INSERT INTO public.facility_resources (name, company_name, resource_type, phone, notes, is_active)
  VALUES ('James Farran', NULL, 'design', '917-407-9541', 'Designer for artistic projects and signage', true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO resource_id;
  IF resource_id IS NOT NULL THEN
    INSERT INTO public.facility_resource_locations (resource_id, location_id, is_primary)
    VALUES 
      (resource_id, venice_id, true),
      (resource_id, sherman_oaks_id, false),
      (resource_id, aetna_id, false)
    ON CONFLICT (resource_id, location_id) DO NOTHING;
  END IF;
  
  -- 7. Landlord / Utilities - Perloff & Webster
  INSERT INTO public.facility_resources (name, company_name, resource_type, phone, notes, is_active, is_preferred)
  VALUES ('Perloff & Webster', NULL, 'landlord', NULL, 'Venice Landlord; call first for any fixes or utility issues', true, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO resource_id;
  IF resource_id IS NOT NULL THEN
    INSERT INTO public.facility_resource_locations (resource_id, location_id, is_primary)
    VALUES 
      (resource_id, venice_id, true)
    ON CONFLICT (resource_id, location_id) DO NOTHING;
  END IF;
  
  -- 8. Painting - Armando
  INSERT INTO public.facility_resources (name, company_name, resource_type, phone, notes, is_active)
  VALUES ('Armando', 'Sats Painter (Architect)', 'painting', '661-544-0859', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO resource_id;
  IF resource_id IS NOT NULL THEN
    INSERT INTO public.facility_resource_locations (resource_id, location_id, is_primary)
    VALUES 
      (resource_id, venice_id, true),
      (resource_id, aetna_id, false)
    ON CONFLICT (resource_id, location_id) DO NOTHING;
  END IF;
  
  -- 9. Cabinetry - Juan
  INSERT INTO public.facility_resources (name, company_name, resource_type, phone, notes, is_active)
  VALUES ('Juan', 'NuCentury Cabinets', 'cabinetry', '323-839-1263', NULL, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO resource_id;
  IF resource_id IS NOT NULL THEN
    INSERT INTO public.facility_resource_locations (resource_id, location_id, is_primary)
    VALUES 
      (resource_id, venice_id, true),
      (resource_id, sherman_oaks_id, false),
      (resource_id, aetna_id, false)
    ON CONFLICT (resource_id, location_id) DO NOTHING;
  END IF;
  
  -- 10. Stone / Counters - Luis
  INSERT INTO public.facility_resources (name, company_name, resource_type, phone, notes, is_active)
  VALUES ('Luis', NULL, 'countertops', '213-200-2706', 'Countertop and stone installations', true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO resource_id;
  IF resource_id IS NOT NULL THEN
    INSERT INTO public.facility_resource_locations (resource_id, location_id, is_primary)
    VALUES 
      (resource_id, venice_id, true),
      (resource_id, sherman_oaks_id, false),
      (resource_id, aetna_id, false)
    ON CONFLICT (resource_id, location_id) DO NOTHING;
  END IF;
  
  -- 11. Contractor - Joe Milic
  INSERT INTO public.facility_resources (name, company_name, resource_type, phone, notes, is_active)
  VALUES ('Joe Milic', '2116 Main Contractor', 'general_contractor', '310-985-4615', 'Erica referral; never used', true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO resource_id;
  IF resource_id IS NOT NULL THEN
    INSERT INTO public.facility_resource_locations (resource_id, location_id, is_primary)
    VALUES 
      (resource_id, venice_id, true)
    ON CONFLICT (resource_id, location_id) DO NOTHING;
  END IF;
  
  -- 12. Plumbing - Honest Plumber
  INSERT INTO public.facility_resources (name, company_name, resource_type, phone, notes, is_active)
  VALUES ('Honest Plumber', NULL, 'plumber', '818-333-6389', 'Plumbing service', true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO resource_id;
  IF resource_id IS NOT NULL THEN
    INSERT INTO public.facility_resource_locations (resource_id, location_id, is_primary)
    VALUES 
      (resource_id, venice_id, true)
    ON CONFLICT (resource_id, location_id) DO NOTHING;
  END IF;
  
  -- 13. Plumbing - Nacho
  INSERT INTO public.facility_resources (name, company_name, resource_type, phone, notes, is_active)
  VALUES ('Nacho', NULL, 'plumber', '818-612-2711', 'Local plumber', true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO resource_id;
  IF resource_id IS NOT NULL THEN
    INSERT INTO public.facility_resource_locations (resource_id, location_id, is_primary)
    VALUES 
      (resource_id, venice_id, true)
    ON CONFLICT (resource_id, location_id) DO NOTHING;
  END IF;
  
  -- 14. IT / Software - David Martinez
  INSERT INTO public.facility_resources (name, company_name, resource_type, phone, notes, is_active)
  VALUES ('David Martinez', NULL, 'it_support', '562-972-4574', 'Software at Aetna and general Help Desk items', true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO resource_id;
  IF resource_id IS NOT NULL THEN
    INSERT INTO public.facility_resource_locations (resource_id, location_id, is_primary)
    VALUES 
      (resource_id, aetna_id, true)
    ON CONFLICT (resource_id, location_id) DO NOTHING;
  END IF;
  
  -- 15. IT / Hardware - Brian Chan
  INSERT INTO public.facility_resources (name, company_name, resource_type, phone, notes, is_active)
  VALUES ('Brian Chan', NULL, 'it_support', '626-246-8246', 'Hardware installer for Aetna', true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO resource_id;
  IF resource_id IS NOT NULL THEN
    INSERT INTO public.facility_resource_locations (resource_id, location_id, is_primary)
    VALUES 
      (resource_id, venice_id, true)
    ON CONFLICT (resource_id, location_id) DO NOTHING;
  END IF;

END $$;
