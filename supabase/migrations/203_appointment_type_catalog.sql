-- ============================================================================
-- MIGRATION 203: Appointment Type Catalog & Service Expansion  
-- Adds missing service codes used by the real clinic appointment types
-- Adds appointment_service_mapping unique constraint for upserts
-- ============================================================================

-- ============================================================================
-- 1. Add missing services to match actual clinic departments
-- ============================================================================

-- Wellness (VE, UC - veterinary exams and urgent care)
INSERT INTO services (name, code, description, department, duration_minutes, color, icon, requires_dvm, min_staff_count, max_staff_count, is_active, sort_order)
VALUES ('Wellness/Vet Exams', 'WELLNESS', 'Veterinary exams (new & returning), urgent care, drop-off UC', 'Wellness', 30, '#4CAF50', 'mdi-stethoscope', true, 2, 4, true, 7)
ON CONFLICT (code) DO UPDATE SET 
  description = EXCLUDED.description,
  department = EXCLUDED.department;

-- Add-on Services (Tech Services, Bloodwork)
INSERT INTO services (name, code, description, department, duration_minutes, color, icon, requires_dvm, min_staff_count, max_staff_count, is_active, sort_order)
VALUES ('Add-on Services', 'ADDON', 'Tech services (VX, AG, NT), bloodwork, supplemental procedures', 'Add-on Services', 15, '#FF9800', 'mdi-needle', false, 1, 3, true, 8)
ON CONFLICT (code) DO UPDATE SET 
  description = EXCLUDED.description,
  department = EXCLUDED.department;

-- Cardiology 
INSERT INTO services (name, code, description, department, duration_minutes, color, icon, requires_dvm, min_staff_count, max_staff_count, is_active, sort_order)
VALUES ('Cardiology', 'CARDIO', 'Echocardiograms, cardiac consultations (Dr. D''Urso, Dr. Saelinger)', 'Cardiology', 60, '#E91E63', 'mdi-heart-pulse', true, 1, 2, true, 9)
ON CONFLICT (code) DO UPDATE SET 
  description = EXCLUDED.description,
  department = EXCLUDED.department;

-- Imaging
INSERT INTO services (name, code, description, department, duration_minutes, color, icon, requires_dvm, min_staff_count, max_staff_count, is_active, sort_order)
VALUES ('Imaging', 'IMAGING', 'Radiographs, X-rays, CT scans, MRI', 'Imaging', 30, '#607D8B', 'mdi-radiology-box', true, 1, 2, true, 10)
ON CONFLICT (code) DO UPDATE SET 
  description = EXCLUDED.description,
  department = EXCLUDED.department;

-- Update existing DENTAL service description
UPDATE services 
SET description = 'NAD (Non-Anesthesia Dental), NEAT (Nails/Ears/Anal Glands), Oral Exams, GDD procedures',
    department = 'Dentistry'
WHERE code = 'DENTAL';

-- Update existing AP service description  
UPDATE services
SET description = 'Advanced procedures under anesthesia - dental surgery, extractions, OE/AP',
    department = 'Advanced Procedures'
WHERE code = 'AP';

-- Update existing EXOTIC service description
UPDATE services
SET description = 'Exotic animal care - avian, reptile, small mammals (wellness, sick, surgery, tech)',
    department = 'Exotics'
WHERE code = 'EXOTIC';

-- Update existing IM service description
UPDATE services
SET description = 'Internal medicine consultations, rechecks, procedures, endoscopy',
    department = 'Internal Medicine'
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
    INSERT INTO appointment_service_mapping (appointment_type, service_code, confidence_score, source)
    VALUES 
      ('NEAT New', 'DENTAL', 1.0, 'seed'),
      ('NEAT Returning', 'DENTAL', 1.0, 'seed'),
      ('NAD New', 'DENTAL', 1.0, 'seed'),
      ('NAD Returning', 'DENTAL', 1.0, 'seed'),
      ('OE New', 'DENTAL', 1.0, 'seed'),
      ('OE Returning', 'DENTAL', 1.0, 'seed'),
      ('GDD (New)', 'DENTAL', 1.0, 'seed'),
      ('GDD (Returning)', 'DENTAL', 1.0, 'seed'),
      ('Oral Exam (New)', 'DENTAL', 1.0, 'seed'),
      ('Oral Exam (Returning)', 'DENTAL', 1.0, 'seed'),
      -- Advanced Procedures
      ('AP', 'AP', 1.0, 'seed'),
      ('Advanced Procedure', 'AP', 1.0, 'seed'),
      ('OE/AP', 'AP', 1.0, 'seed'),
      ('Post AP Recheck', 'AP', 1.0, 'seed'),
      ('OE Possible Same Day AP', 'AP', 1.0, 'seed'),
      -- Wellness
      ('VE New', 'WELLNESS', 1.0, 'seed'),
      ('VE Returning', 'WELLNESS', 1.0, 'seed'),
      ('Veterinary Exam New', 'WELLNESS', 1.0, 'seed'),
      ('Veterinary Exam Returning', 'WELLNESS', 1.0, 'seed'),
      ('Urgent Care (New)', 'WELLNESS', 1.0, 'seed'),
      ('Urgent Care (Returning)', 'WELLNESS', 1.0, 'seed'),
      ('Drop Off Urgent Care', 'WELLNESS', 1.0, 'seed'),
      -- Add-on
      ('Tech Services', 'ADDON', 1.0, 'seed'),
      ('Tech Services (VX,AG,NT)', 'ADDON', 1.0, 'seed'),
      ('Bloodwork', 'ADDON', 1.0, 'seed'),
      -- Surgery
      ('Surgery', 'SURG', 1.0, 'seed'),
      ('Surgery Consult New', 'SURG', 1.0, 'seed'),
      ('Surgery Consult Returning', 'SURG', 1.0, 'seed'),
      -- Exotics
      ('EX Wellness New', 'EXOTIC', 1.0, 'seed'),
      ('EX Wellness Returning', 'EXOTIC', 1.0, 'seed'),
      ('EX Recheck', 'EXOTIC', 1.0, 'seed'),
      ('EX Tech', 'EXOTIC', 1.0, 'seed'),
      ('EX Sick New', 'EXOTIC', 1.0, 'seed'),
      ('EX Sick Returning', 'EXOTIC', 1.0, 'seed'),
      ('EX Surgery', 'EXOTIC', 1.0, 'seed'),
      -- Internal Medicine
      ('IM Consult New', 'IM', 1.0, 'seed'),
      ('IM Consult Returning', 'IM', 1.0, 'seed'),
      ('IM Recheck', 'IM', 1.0, 'seed'),
      ('IM Tech', 'IM', 1.0, 'seed'),
      ('IM Procedure', 'IM', 1.0, 'seed'),
      -- Imaging
      ('Imaging', 'IMAGING', 1.0, 'seed'),
      -- MPMV
      ('MP - Pickup', 'MPMV', 1.0, 'seed'),
      ('MP - Shipment', 'MPMV', 1.0, 'seed'),
      ('MP - Meds Done', 'MPMV', 1.0, 'seed'),
      -- Misc
      ('VetFM Client', 'WELLNESS', 0.9, 'seed')
    ON CONFLICT (appointment_type) DO UPDATE SET
      service_code = EXCLUDED.service_code,
      confidence_score = EXCLUDED.confidence_score;
  END IF;
END $$;
