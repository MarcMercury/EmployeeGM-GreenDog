-- ============================================================================
-- MIGRATION 203: Appointment Type Catalog & Service Expansion  
-- Adds missing service codes used by the real clinic appointment types
-- Adds appointment_service_mapping unique constraint for upserts
-- ============================================================================

-- ============================================================================
-- 1. Add missing services to match actual clinic departments
-- Note: services table uses department_id (UUID) and default_duration_minutes
-- ============================================================================

-- Wellness (VE, UC - veterinary exams and urgent care)
INSERT INTO services (name, code, description, default_duration_minutes, color, icon, requires_dvm, min_staff_count, max_staff_count, is_active, sort_order)
VALUES ('Wellness/Vet Exams', 'WELLNESS', 'Veterinary exams (new & returning), urgent care, drop-off UC', 30, '#4CAF50', 'mdi-stethoscope', true, 2, 4, true, 18)
ON CONFLICT (code) DO UPDATE SET 
  description = EXCLUDED.description;

-- Add-on Services (Tech Services, Bloodwork)
INSERT INTO services (name, code, description, default_duration_minutes, color, icon, requires_dvm, min_staff_count, max_staff_count, is_active, sort_order)
VALUES ('Add-on Services', 'ADDON', 'Tech services (VX, AG, NT), bloodwork, supplemental procedures', 15, '#FF9800', 'mdi-needle', false, 1, 3, true, 19)
ON CONFLICT (code) DO UPDATE SET 
  description = EXCLUDED.description;

-- Update existing CARDIO description
UPDATE services 
SET description = 'Echocardiograms, cardiac consultations (Dr. D''Urso, Dr. Saelinger)'
WHERE code = 'CARDIO';

-- Update existing IMAGING description
UPDATE services 
SET description = 'Radiographs, X-rays, CT scans, MRI'
WHERE code = 'IMAGING';

-- Update existing AP_DENTAL service description  
UPDATE services
SET description = 'Advanced procedures under anesthesia - dental surgery, extractions, OE/AP'
WHERE code = 'AP_DENTAL';

-- Update existing EXOTIC service description
UPDATE services
SET description = 'Exotic animal care - avian, reptile, small mammals (wellness, sick, surgery, tech)'
WHERE code = 'EXOTIC';

-- Update existing IM service description
UPDATE services
SET description = 'Internal medicine consultations, rechecks, procedures, endoscopy'
WHERE code = 'IM';

-- ============================================================================
-- 2. Add unique constraint on appointment_service_mapping for upserts
-- ============================================================================
-- (Only if migration 202 has been applied and table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'appointment_service_mapping') THEN
    -- Add unique constraint if not exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'appointment_service_mapping_appointment_type_key'
    ) THEN
      ALTER TABLE appointment_service_mapping 
        ADD CONSTRAINT appointment_service_mapping_appointment_type_key 
        UNIQUE (appointment_type);
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 3. Seed the appointment_service_mapping with known GreenDog types
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'appointment_service_mapping') THEN
    -- Dentistry types
    INSERT INTO appointment_service_mapping (appointment_type, service_code, confidence)
    VALUES 
      ('NEAT New', 'DENTAL', 1.0),
      ('NEAT Returning', 'DENTAL', 1.0),
      ('NAD New', 'DENTAL', 1.0),
      ('NAD Returning', 'DENTAL', 1.0),
      ('OE New', 'DENTAL', 1.0),
      ('OE Returning', 'DENTAL', 1.0),
      ('GDD (New)', 'DENTAL', 1.0),
      ('GDD (Returning)', 'DENTAL', 1.0),
      ('Oral Exam (New)', 'DENTAL', 1.0),
      ('Oral Exam (Returning)', 'DENTAL', 1.0),
      -- Advanced Procedures
      ('AP', 'AP_DENTAL', 1.0),
      ('Advanced Procedure', 'AP_DENTAL', 1.0),
      ('OE/AP', 'AP_DENTAL', 1.0),
      ('Post AP Recheck', 'AP_DENTAL', 1.0),
      ('OE Possible Same Day AP', 'AP_DENTAL', 1.0),
      -- Wellness
      ('VE New', 'WELLNESS', 1.0),
      ('VE Returning', 'WELLNESS', 1.0),
      ('Veterinary Exam New', 'WELLNESS', 1.0),
      ('Veterinary Exam Returning', 'WELLNESS', 1.0),
      ('Urgent Care (New)', 'WELLNESS', 1.0),
      ('Urgent Care (Returning)', 'WELLNESS', 1.0),
      ('Drop Off Urgent Care', 'WELLNESS', 1.0),
      -- Add-on
      ('Tech Services', 'ADDON', 1.0),
      ('Tech Services (VX,AG,NT)', 'ADDON', 1.0),
      ('Bloodwork', 'ADDON', 1.0),
      -- Surgery
      ('Surgery', 'SURG', 1.0),
      ('Surgery Consult New', 'SURG', 1.0),
      ('Surgery Consult Returning', 'SURG', 1.0),
      -- Exotics
      ('EX Wellness New', 'EXOTIC', 1.0),
      ('EX Wellness Returning', 'EXOTIC', 1.0),
      ('EX Recheck', 'EXOTIC', 1.0),
      ('EX Tech', 'EXOTIC', 1.0),
      ('EX Sick New', 'EXOTIC', 1.0),
      ('EX Sick Returning', 'EXOTIC', 1.0),
      ('EX Surgery', 'EXOTIC', 1.0),
      -- Internal Medicine
      ('IM Consult New', 'IM', 1.0),
      ('IM Consult Returning', 'IM', 1.0),
      ('IM Recheck', 'IM', 1.0),
      ('IM Tech', 'IM', 1.0),
      ('IM Procedure', 'IM', 1.0),
      -- Imaging
      ('Imaging', 'IMAGING', 1.0),
      -- MPMV
      ('MP - Pickup', 'MPMV', 1.0),
      ('MP - Shipment', 'MPMV', 1.0),
      ('MP - Meds Done', 'MPMV', 1.0),
      -- Misc
      ('VetFM Client', 'WELLNESS', 0.9)
    ON CONFLICT (appointment_type) DO UPDATE SET
      service_code = EXCLUDED.service_code,
      confidence = EXCLUDED.confidence;
  END IF;
END $$;
