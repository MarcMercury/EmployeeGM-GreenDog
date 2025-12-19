-- Migration: 076_update_referral_zones.sql
-- Description: Update zones to use larger consolidated geographic zones
-- Zone Structure:
--   1. Westside & Coastal 🌊 - Santa Monica, Venice, Marina del Rey, Culver City, Beverly Hills, Westwood, Malibu, Pacific Palisades, Brentwood
--   2. South Valley 🎬 - Studio City, Sherman Oaks, Encino, Tarzana, Woodland Hills, Burbank, Toluca Lake, Universal City
--   3. North Valley 🏘️ - Northridge, Chatsworth, Granada Hills, Porter Ranch, Van Nuys, Reseda, Canoga Park, North Hollywood, Sun Valley, Sylmar
--   4. Central & Eastside 🏙️ - DTLA, Silver Lake, Echo Park, Hollywood, West Hollywood, Los Feliz, Eagle Rock, Boyle Heights
--   5. South Bay & Airport ✈️ - El Segundo, Manhattan Beach, Torrance, Redondo Beach, Hawthorne, Inglewood, Gardena
--   6. San Gabriel Valley & Northeast 🥡 - Pasadena, Glendale, Arcadia, Alhambra, Monterey Park, San Marino

-- =====================================================
-- UPDATE ZONES TO NEW CONSOLIDATED STRUCTURE
-- =====================================================

-- 1. Westside & Coastal Zone 🌊
UPDATE public.referral_partners SET zone = 'Westside & Coastal'
WHERE zone IN (
  'WESTSIDE', 'SANTA MONICA', 'VENICE', 'MARINA', 'MARINA DEL REY',
  'CULVER CITY', 'BEVERLY HILLS', 'BEVERLY', 'WESTWOOD', 'MALIBU',
  'PACIFIC PALISADES', 'BRENTWOOD', 'MAR VISTA', 'WEST LA',
  'RANCHO PARK', 'WESTCHESTER'
);

-- 2. South Valley Zone (The Boulevard) 🎬
UPDATE public.referral_partners SET zone = 'South Valley'
WHERE zone IN (
  'STUDIO CITY', 'SHERMAN OAKS', 'ENCINO', 'TARZANA', 'WOODLAND HILLS',
  'BURBANK', 'TOLUCA LAKE', 'UNIVERSAL CITY', 'VALLEY VILLAGE',
  'WEST VALLEY', 'WESTLAKE VILLAGE'
);

-- 3. North Valley Zone (The Deep Valley) 🏘️
UPDATE public.referral_partners SET zone = 'North Valley'
WHERE zone IN (
  'NORTHRIDGE', 'CHATSWORTH', 'GRANADA HILLS', 'PORTER RANCH',
  'VAN NUYS', 'RESEDA', 'CANOGA PARK', 'NORTH HOLLYWOOD', 'NOHO',
  'SUN VALLEY', 'SYLMAR', 'MISSION HILLS', 'PANORAMA CITY',
  'WINNETKA', 'VALLEY', 'NORTH HILLS', 'SANTA CLARITA', 'VALENCIA'
);

-- 4. Central & Eastside Zone 🏙️
UPDATE public.referral_partners SET zone = 'Central & Eastside'
WHERE zone IN (
  'LA', 'DTLA', 'DOWNTOWN', 'SILVER LAKE', 'ECHO PARK',
  'HOLLYWOOD', 'WEST HOLLYWOOD', 'LOS FELIZ', 'EAGLE ROCK',
  'BOYLE HEIGHTS', 'HANCOCK PARK', 'MELROSE', 'EASTSIDE'
);

-- 5. South Bay & Airport Zone ✈️
UPDATE public.referral_partners SET zone = 'South Bay'
WHERE zone IN (
  'SOUTH BAY', 'EL SEGUNDO', 'MANHATTAN BEACH', 'TORRANCE',
  'REDONDO BEACH', 'HAWTHORNE', 'INGLEWOOD', 'GARDENA',
  'LONG BEACH', 'CERRITOS'
);

-- 6. San Gabriel Valley & Northeast Zone 🥡
UPDATE public.referral_partners SET zone = 'San Gabriel Valley'
WHERE zone IN (
  'PASADENA', 'GLENDALE', 'ARCADIA', 'ALHAMBRA',
  'MONTEREY PARK', 'SAN MARINO', 'SAN FERNANDO'
);

-- Update any remaining unclassified zones to 'Central & Eastside' as default
UPDATE public.referral_partners SET zone = 'Central & Eastside'
WHERE zone IS NOT NULL 
  AND zone NOT IN ('Westside & Coastal', 'South Valley', 'North Valley', 'Central & Eastside', 'South Bay', 'San Gabriel Valley');

-- =====================================================
-- ADD ZONE CHECK CONSTRAINT (optional - for data integrity)
-- =====================================================

-- Drop existing constraint if any
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'referral_partners_zone_check'
  ) THEN
    ALTER TABLE public.referral_partners DROP CONSTRAINT referral_partners_zone_check;
  END IF;
END $$;

-- Add check constraint for valid zones
ALTER TABLE public.referral_partners 
ADD CONSTRAINT referral_partners_zone_check 
CHECK (zone IS NULL OR zone IN (
  'Westside & Coastal',
  'South Valley', 
  'North Valley',
  'Central & Eastside',
  'South Bay',
  'San Gabriel Valley'
));
