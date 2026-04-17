-- ============================================
-- Migration 279: Add Google Maps coordinate fields
-- ============================================
-- Adds latitude/longitude columns to support Google Maps integration:
-- - marketing_events: venue coordinates for event mapping
-- - referral_partners: partner location for routing
-- - locations: clinic coordinates for geofence visualization
-- - employees: home coordinates for commute analysis

-- ── Marketing Events Coordinates ──
ALTER TABLE marketing_events 
  ADD COLUMN IF NOT EXISTS venue_latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS venue_longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS venue_place_id TEXT,
  ADD COLUMN IF NOT EXISTS parking_info TEXT;

COMMENT ON COLUMN marketing_events.venue_latitude IS 'Google Maps latitude coordinate for event venue';
COMMENT ON COLUMN marketing_events.venue_longitude IS 'Google Maps longitude coordinate for event venue';
COMMENT ON COLUMN marketing_events.venue_place_id IS 'Google Places API place_id for venue lookup';
COMMENT ON COLUMN marketing_events.parking_info IS 'Parking details for attendees';

-- ── Referral Partners Coordinates ──
ALTER TABLE referral_partners
  ADD COLUMN IF NOT EXISTS latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS place_id TEXT,
  ADD COLUMN IF NOT EXISTS geocoded_address TEXT,
  ADD COLUMN IF NOT EXISTS service_radius_km NUMERIC DEFAULT 25;

COMMENT ON COLUMN referral_partners.latitude IS 'Google Maps latitude coordinate';
COMMENT ON COLUMN referral_partners.longitude IS 'Google Maps longitude coordinate';
COMMENT ON COLUMN referral_partners.place_id IS 'Google Places API place_id';
COMMENT ON COLUMN referral_partners.geocoded_address IS 'Formatted address returned by Google Geocoding API';
COMMENT ON COLUMN referral_partners.service_radius_km IS 'Service area radius in kilometers';

-- ── Locations (Clinics) Coordinates ──
-- Note: geofences table already has lat/lng, but locations table may not
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'locations' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE locations ADD COLUMN latitude NUMERIC;
    ALTER TABLE locations ADD COLUMN longitude NUMERIC;
    ALTER TABLE locations ADD COLUMN place_id TEXT;
    
    COMMENT ON COLUMN locations.latitude IS 'Google Maps latitude coordinate for clinic';
    COMMENT ON COLUMN locations.longitude IS 'Google Maps longitude coordinate for clinic';
    COMMENT ON COLUMN locations.place_id IS 'Google Places API place_id';
  END IF;
END $$;

-- ── Employees Home Coordinates (for commute analysis) ──
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS home_latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS home_longitude NUMERIC;

COMMENT ON COLUMN employees.home_latitude IS 'Home address latitude for commute calculations';
COMMENT ON COLUMN employees.home_longitude IS 'Home address longitude for commute calculations';

-- ── Populate existing location coordinates from geofences ──
UPDATE locations l
SET 
  latitude = g.latitude,
  longitude = g.longitude
FROM geofences g
WHERE g.location_id = l.id
  AND g.latitude IS NOT NULL
  AND g.longitude IS NOT NULL
  AND l.latitude IS NULL;

-- ── Indexes for coordinate-based queries ──
CREATE INDEX IF NOT EXISTS idx_marketing_events_coords 
  ON marketing_events (venue_latitude, venue_longitude) 
  WHERE venue_latitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_referral_partners_coords 
  ON referral_partners (latitude, longitude) 
  WHERE latitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_locations_coords 
  ON locations (latitude, longitude) 
  WHERE latitude IS NOT NULL;

-- ── Function to calculate distance between two coordinates (Haversine) ──
CREATE OR REPLACE FUNCTION calculate_distance_km(
  lat1 NUMERIC, lng1 NUMERIC,
  lat2 NUMERIC, lng2 NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
  R CONSTANT NUMERIC := 6371; -- Earth's radius in kilometers
  dLat NUMERIC;
  dLng NUMERIC;
  a NUMERIC;
  c NUMERIC;
BEGIN
  IF lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN
    RETURN NULL;
  END IF;
  
  dLat := RADIANS(lat2 - lat1);
  dLng := RADIANS(lng2 - lng1);
  
  a := SIN(dLat / 2) * SIN(dLat / 2) +
       COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
       SIN(dLng / 2) * SIN(dLng / 2);
  
  c := 2 * ATAN2(SQRT(a), SQRT(1 - a));
  
  RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_distance_km IS 'Calculate distance in km between two lat/lng coordinates using Haversine formula';

-- ── View: Partners with distance from each clinic ──
CREATE OR REPLACE VIEW v_partners_with_distances AS
SELECT 
  rp.*,
  venice.name AS venice_clinic,
  calculate_distance_km(rp.latitude, rp.longitude, venice.latitude, venice.longitude) AS venice_distance_km,
  sherman.name AS sherman_oaks_clinic,
  calculate_distance_km(rp.latitude, rp.longitude, sherman.latitude, sherman.longitude) AS sherman_oaks_distance_km,
  vannuys.name AS van_nuys_clinic,
  calculate_distance_km(rp.latitude, rp.longitude, vannuys.latitude, vannuys.longitude) AS van_nuys_distance_km
FROM referral_partners rp
LEFT JOIN locations venice ON venice.name ILIKE '%venice%'
LEFT JOIN locations sherman ON sherman.name ILIKE '%sherman%'
LEFT JOIN locations vannuys ON vannuys.name ILIKE '%van nuys%' OR vannuys.name ILIKE '%vannuys%';

COMMENT ON VIEW v_partners_with_distances IS 'Partners with pre-calculated distances from each clinic location';
