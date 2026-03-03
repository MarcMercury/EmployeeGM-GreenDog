-- =====================================================
-- Migration 270: Update Facility Resources from Facility & Maint. sheet
-- Source: "Med COntacts 1.xlsx" → "Facility & Maint." sheet
-- Description:
--   1) Update existing facility resources (Osmin, Mike Kremic, Juan)
--   2) Add new facility resources (Washer/Dryer, Lock & Safe, Gardner, Phillips Plumbing, Audio)
--   3) Add 'locksmith', 'audio', and 'gardener' to resource_type constraint
-- =====================================================

-- =====================================================
-- STEP 1: Expand resource_type constraint for new types
-- =====================================================

ALTER TABLE public.facility_resources 
DROP CONSTRAINT IF EXISTS facility_resources_resource_type_check;

ALTER TABLE public.facility_resources 
ADD CONSTRAINT facility_resources_resource_type_check CHECK (resource_type IN (
  'plumber', 'electrician', 'hvac', 'handyman', 'landlord', 
  'cleaning', 'landscaping', 'pest_control', 'security', 
  'it_support', 'appliance_repair', 'roofing', 'other',
  'painting', 'design', 'cabinetry', 'countertops', 'general_contractor',
  -- New types from Facility & Maint. sheet:
  'locksmith', 'audio', 'gardener'
));

-- =====================================================
-- STEP 2: Update existing resources with spreadsheet data
-- =====================================================

-- Update Osmin/Oismin (HVAC) - correct name from spreadsheet is "Osmin Sibrian"
UPDATE public.facility_resources
SET
  name = 'Osmin Sibrian',
  phone = '323-218-1309',
  notes = COALESCE(notes, '') || ' | Spreadsheet note: Already did some HVAC. Location: 210.',
  updated_at = NOW()
WHERE name ILIKE '%oismin%' OR name ILIKE '%osmin%';

-- Update Mike Kremic - spreadsheet says "Mike/Mitar Kremic"
UPDATE public.facility_resources
SET
  name = 'Mike/Mitar Kremic',
  phone = '310-678-7677',
  email = 'kremic.michael@gmail.com',
  notes = COALESCE(notes, '') || ' | Spreadsheet: Electrician, Plumbing. Serves ALL locations.',
  updated_at = NOW()
WHERE name ILIKE '%kremic%';

-- Update Juan (NuCentury Cabinets) - spreadsheet says "Juan Ramon"
UPDATE public.facility_resources
SET
  name = 'Juan Ramon',
  company_name = 'NuCentury Cabinets',
  phone = '323-839-1263',
  email = 'info@nucenturycabinets.com',
  notes = COALESCE(notes, '') || ' | Spreadsheet: Cabinets/Millwork. Serves ALL locations.',
  updated_at = NOW()
WHERE name ILIKE 'juan' AND resource_type = 'cabinetry';

-- =====================================================
-- STEP 3: Insert new facility resources from spreadsheet
-- =====================================================

DO $$
DECLARE
  venice_id UUID;
  sherman_oaks_id UUID;
  aetna_id UUID;
  v_resource_id UUID;
BEGIN
  -- Get location IDs
  SELECT id INTO venice_id FROM public.locations WHERE code = 'VEN' LIMIT 1;
  SELECT id INTO sherman_oaks_id FROM public.locations WHERE code = 'SO' LIMIT 1;
  SELECT id INTO aetna_id FROM public.locations WHERE code = 'VAL' LIMIT 1;

  -- 1. Washer/Dryer - Local Appliance Repair (Location: 210)
  INSERT INTO public.facility_resources (
    name, company_name, resource_type, phone, website, notes, is_active
  ) VALUES (
    'Local Appliance Repair', 'Local Appliance Repair', 'appliance_repair',
    '310-564-6950', 'https://www.localappliancerepair.co/',
    'Washer/Dryer repair. Location: 210 (Main St).',
    true
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_resource_id;
  IF v_resource_id IS NOT NULL AND sherman_oaks_id IS NOT NULL THEN
    INSERT INTO public.facility_resource_locations (resource_id, location_id, is_primary)
    VALUES (v_resource_id, sherman_oaks_id, true)
    ON CONFLICT (resource_id, location_id) DO NOTHING;
  END IF;

  -- 2. SM Lock and Safe Co. (through Perloff and Webster)
  INSERT INTO public.facility_resources (
    name, company_name, resource_type, phone, notes, is_active
  ) VALUES (
    'SM Lock and Safe Co.', 'SM Lock and Safe Co.', 'locksmith',
    '(310) 450-5101',
    'Through Perloff and Webster (landlord referral).',
    true
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_resource_id;
  IF v_resource_id IS NOT NULL AND venice_id IS NOT NULL THEN
    INSERT INTO public.facility_resource_locations (resource_id, location_id, is_primary)
    VALUES (v_resource_id, venice_id, true)
    ON CONFLICT (resource_id, location_id) DO NOTHING;
  END IF;

  -- 3. Gardner - Marti (Location: 210)
  INSERT INTO public.facility_resources (
    name, resource_type, phone, notes, is_active
  ) VALUES (
    'Marti', 'gardener',
    '310-210-9085',
    'One-off gardening. Location: 210 (Main St).',
    true
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_resource_id;
  IF v_resource_id IS NOT NULL AND sherman_oaks_id IS NOT NULL THEN
    INSERT INTO public.facility_resource_locations (resource_id, location_id, is_primary)
    VALUES (v_resource_id, sherman_oaks_id, true)
    ON CONFLICT (resource_id, location_id) DO NOTHING;
  END IF;

  -- 4. Phillips Plumbing (Location: 210)
  INSERT INTO public.facility_resources (
    name, company_name, resource_type, phone, notes, is_active
  ) VALUES (
    'Phillips Plumbing', 'Phillips Plumbing', 'plumber',
    '(310) 671-1765',
    'Plumbers - referred by Perloff and Webster. Location: 210 (Main St).',
    true
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_resource_id;
  IF v_resource_id IS NOT NULL AND sherman_oaks_id IS NOT NULL THEN
    INSERT INTO public.facility_resource_locations (resource_id, location_id, is_primary)
    VALUES (v_resource_id, sherman_oaks_id, true)
    ON CONFLICT (resource_id, location_id) DO NOTHING;
  END IF;

  -- 5. Audio - Juan Contreras / PC Intek (Location: 210)
  INSERT INTO public.facility_resources (
    name, company_name, resource_type, phone, email, notes, is_active
  ) VALUES (
    'Juan Contreras', 'PC Intek', 'audio',
    '(626) 862-5511', 'it-tech@pcintek.com',
    'Audio/AV setup. Location: 210 (Main St).',
    true
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_resource_id;
  IF v_resource_id IS NOT NULL AND sherman_oaks_id IS NOT NULL THEN
    INSERT INTO public.facility_resource_locations (resource_id, location_id, is_primary)
    VALUES (v_resource_id, sherman_oaks_id, true)
    ON CONFLICT (resource_id, location_id) DO NOTHING;
  END IF;

END $$;

-- Done! Summary:
-- Updated: Osmin Sibrian (HVAC), Mike/Mitar Kremic (Handyman/Electrician), Juan Ramon (Cabinetry)
-- New: Local Appliance Repair, SM Lock and Safe Co., Marti (Gardner),
--   Phillips Plumbing, Juan Contreras/PC Intek (Audio)
