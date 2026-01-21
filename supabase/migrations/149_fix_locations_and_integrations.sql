-- =====================================================
-- Migration: 149_fix_locations_and_integrations.sql
-- Description: Add all clinic locations and clean up data
-- =====================================================

-- 1. Add more locations (keeping existing Aetna/Van Nuys location)
INSERT INTO public.locations (id, name, code, address_line1, city, state, postal_code, phone, is_active)
VALUES
  (gen_random_uuid(), 'Venice Location', 'VEN', '(Address TBD)', 'Venice', 'CA', '90291', '(818) 282-6663', true),
  (gen_random_uuid(), 'Sherman Oaks Location', 'SO', '(Address TBD)', 'Sherman Oaks', 'CA', '91403', '(818) 282-6663', true)
ON CONFLICT DO NOTHING;

-- 2. Update the main location name if needed
UPDATE public.locations 
SET name = 'Aetna - Van Nuys (Main)'
WHERE code = 'GDVC' AND name = 'Green Dog Dental Veterinary Center';

-- 3. Verify locations
DO $$ 
DECLARE
  loc_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO loc_count FROM public.locations;
  RAISE NOTICE '✅ Total locations: %', loc_count;
END $$;
