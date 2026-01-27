-- ============================================================================
-- MIGRATION 164: Service Staffing with Shift Times
-- Complete staffing requirements with actual shift times per role
-- ============================================================================

-- ============================================================================
-- 1. ADD TIME COLUMNS TO STAFFING REQUIREMENTS
-- ============================================================================
ALTER TABLE service_staffing_requirements
  ADD COLUMN IF NOT EXISTS default_start_time TIME DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS default_end_time TIME DEFAULT '17:30';

-- ============================================================================
-- 2. ADD CARDIOLOGY SERVICE
-- ============================================================================
INSERT INTO services (name, code, description, color, icon, requires_dvm, min_staff_count, sort_order) VALUES
  ('Cardiology', 'CARDIO', 'Cardiac specialty services', '#DC2626', 'mdi-heart-pulse', true, 3, 5)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  icon = EXCLUDED.icon,
  requires_dvm = EXCLUDED.requires_dvm,
  min_staff_count = EXCLUDED.min_staff_count,
  sort_order = EXCLUDED.sort_order;

-- ============================================================================
-- 3. CLEAR AND REBUILD ALL STAFFING REQUIREMENTS
-- ============================================================================
DELETE FROM service_staffing_requirements;

-- ============================================================================
-- SURGERY SERVICE
-- ============================================================================
INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'DVM', 'Surgery DVM', 1, 1, true, 1, 1, '09:00', '18:30'
FROM services s WHERE s.code = 'SURG';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Intern', 'Intern', 0, 1, false, 2, 2, '09:00', '18:30'
FROM services s WHERE s.code = 'SURG';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Intern', 'Extern/Student', 0, 1, false, 3, 3, '09:00', '17:30'
FROM services s WHERE s.code = 'SURG';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Lead', 'Surgery Lead', 1, 1, true, 4, 4, '08:30', '17:00'
FROM services s WHERE s.code = 'SURG';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Tech', 'Tech 1', 1, 1, true, 5, 5, '09:00', '17:30'
FROM services s WHERE s.code = 'SURG';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Tech', 'Tech 2', 1, 1, true, 6, 6, '09:00', '17:30'
FROM services s WHERE s.code = 'SURG';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Tech', 'Tech 3', 0, 1, false, 7, 7, '09:00', '17:30'
FROM services s WHERE s.code = 'SURG';

-- ============================================================================
-- AP DENTAL (Advanced Procedure)
-- ============================================================================
INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'DVM', 'AP DVM', 1, 1, true, 1, 1, '09:00', '18:30'
FROM services s WHERE s.code = 'AP_DENTAL';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Intern', 'Intern', 0, 1, false, 2, 2, '09:00', '18:30'
FROM services s WHERE s.code = 'AP_DENTAL';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Intern', 'Extern/Student', 0, 1, false, 3, 3, '09:00', '17:30'
FROM services s WHERE s.code = 'AP_DENTAL';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Lead', 'AP Lead', 1, 1, true, 4, 4, '10:00', '18:30'
FROM services s WHERE s.code = 'AP_DENTAL';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Tech', 'Tech (Early)', 1, 1, true, 5, 5, '08:30', '17:00'
FROM services s WHERE s.code = 'AP_DENTAL';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Tech', 'Tech (Mid)', 1, 1, true, 6, 6, '09:00', '17:30'
FROM services s WHERE s.code = 'AP_DENTAL';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Tech', 'Tech (Late)', 0, 1, false, 7, 7, '10:00', '18:30'
FROM services s WHERE s.code = 'AP_DENTAL';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Tech', 'Tech (Swing)', 0, 1, false, 8, 8, '09:30', '18:00'
FROM services s WHERE s.code = 'AP_DENTAL';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Tech', 'Remote Tech', 0, 1, false, 9, 9, '09:00', '17:30'
FROM services s WHERE s.code = 'AP_DENTAL';

-- ============================================================================
-- CLINIC & NAD
-- ============================================================================
INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'DVM', 'Clinic DVM', 1, 1, true, 1, 1, '09:00', '18:30'
FROM services s WHERE s.code = 'CLINIC_NAD';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Intern', 'Intern', 0, 1, false, 2, 2, '09:00', '18:30'
FROM services s WHERE s.code = 'CLINIC_NAD';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Intern', 'Extern/Student', 0, 1, false, 3, 3, '09:00', '17:30'
FROM services s WHERE s.code = 'CLINIC_NAD';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'DA', 'DA - NAD', 1, 1, true, 4, 4, '09:00', '18:30'
FROM services s WHERE s.code = 'CLINIC_NAD';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'DA', 'DA - Training', 0, 1, false, 5, 5, '09:00', '18:30'
FROM services s WHERE s.code = 'CLINIC_NAD';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Tech', 'Clinic Tech (Early)', 1, 1, true, 6, 6, '08:30', '17:00'
FROM services s WHERE s.code = 'CLINIC_NAD';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Tech', 'Clinic Tech (Mid)', 0, 1, false, 7, 7, '09:00', '17:30'
FROM services s WHERE s.code = 'CLINIC_NAD';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Tech', 'Clinic Tech (Late)', 0, 1, false, 8, 8, '10:00', '18:30'
FROM services s WHERE s.code = 'CLINIC_NAD';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Lead', 'Float/Lead', 1, 1, true, 9, 9, '10:00', '18:30'
FROM services s WHERE s.code = 'CLINIC_NAD';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'DA', 'Dentals 1', 1, 1, true, 10, 10, '09:00', '17:30'
FROM services s WHERE s.code = 'CLINIC_NAD';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'DA', 'Dentals 2', 0, 1, false, 11, 11, '09:30', '18:00'
FROM services s WHERE s.code = 'CLINIC_NAD';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'DA', 'Dentals (Trainee)', 0, 1, false, 12, 12, '09:30', '18:00'
FROM services s WHERE s.code = 'CLINIC_NAD';

-- ============================================================================
-- INTERNAL MEDICINE
-- ============================================================================
INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'DVM', 'IM DVM', 1, 1, true, 1, 1, '09:00', '18:30'
FROM services s WHERE s.code = 'IM';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Intern', 'Intern', 0, 1, false, 2, 2, '09:00', '18:30'
FROM services s WHERE s.code = 'IM';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Intern', 'Extern/Student', 0, 1, false, 3, 3, '09:00', '17:30'
FROM services s WHERE s.code = 'IM';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Tech', 'Tech/DA', 1, 1, true, 4, 4, '09:00', '17:30'
FROM services s WHERE s.code = 'IM';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Tech', 'Tech 2', 0, 1, false, 5, 5, '09:00', '17:30'
FROM services s WHERE s.code = 'IM';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Tech', 'Tech 3 (Late)', 0, 1, false, 6, 6, '09:30', '18:00'
FROM services s WHERE s.code = 'IM';

-- ============================================================================
-- EXOTICS
-- ============================================================================
INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'DVM', 'Exotics DVM', 1, 1, true, 1, 1, '09:00', '18:30'
FROM services s WHERE s.code = 'EXOTIC';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Intern', 'Intern', 0, 1, false, 2, 2, '09:00', '18:30'
FROM services s WHERE s.code = 'EXOTIC';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Intern', 'Extern/Student', 0, 1, false, 3, 3, '09:00', '17:30'
FROM services s WHERE s.code = 'EXOTIC';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Tech', 'Tech/DA', 1, 1, true, 4, 4, '09:00', '17:30'
FROM services s WHERE s.code = 'EXOTIC';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Tech', 'Tech 2', 0, 1, false, 5, 5, '09:00', '17:30'
FROM services s WHERE s.code = 'EXOTIC';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Tech', 'Tech 3 (Late)', 0, 1, false, 6, 6, '09:30', '18:00'
FROM services s WHERE s.code = 'EXOTIC';

-- ============================================================================
-- MOBILE SERVICES
-- ============================================================================
INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'DVM', 'Mobile DVM', 1, 1, true, 1, 1, '09:00', '18:30'
FROM services s WHERE s.code = 'MOBILE';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Tech', 'MPMV Tech 1', 1, 1, true, 2, 2, '09:00', '17:30'
FROM services s WHERE s.code = 'MOBILE';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Tech', 'MPMV Tech 2', 0, 1, false, 3, 3, '09:00', '17:30'
FROM services s WHERE s.code = 'MOBILE';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Tech', 'MPMV Tech 3', 0, 1, false, 4, 4, '09:00', '17:30'
FROM services s WHERE s.code = 'MOBILE';

-- ============================================================================
-- CARDIOLOGY (New!)
-- ============================================================================
INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'DVM', 'Cardiology DVM', 1, 1, true, 1, 1, '09:00', '17:30'
FROM services s WHERE s.code = 'CARDIO';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Intern', 'Intern', 0, 1, false, 2, 2, '09:00', '18:30'
FROM services s WHERE s.code = 'CARDIO';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Intern', 'Extern/Student', 0, 1, false, 3, 3, '09:00', '17:30'
FROM services s WHERE s.code = 'CARDIO';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Tech', 'Tech/DA', 1, 1, true, 4, 4, '09:00', '17:30'
FROM services s WHERE s.code = 'CARDIO';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Tech', 'Tech 2', 0, 1, false, 5, 5, '09:00', '17:30'
FROM services s WHERE s.code = 'CARDIO';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Tech', 'Tech 3 (Late)', 0, 1, false, 6, 6, '09:30', '18:00'
FROM services s WHERE s.code = 'CARDIO';

-- ============================================================================
-- CLIENT SERVICES (CSR)
-- ============================================================================
INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Lead', 'CSR Lead', 1, 1, true, 1, 1, '08:00', '16:30'
FROM services s WHERE s.code = 'CSR';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Admin', 'CSR (Early)', 1, 1, true, 2, 2, '08:00', '16:30'
FROM services s WHERE s.code = 'CSR';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Admin', 'CSR (Mid)', 1, 1, true, 3, 3, '09:00', '17:30'
FROM services s WHERE s.code = 'CSR';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Admin', 'CSR (Late)', 0, 1, false, 4, 4, '10:00', '18:30'
FROM services s WHERE s.code = 'CSR';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Admin', 'CSR (Swing)', 0, 1, false, 5, 5, '09:30', '18:00'
FROM services s WHERE s.code = 'CSR';

-- ============================================================================
-- REMOTE CLIENT SERVICES
-- ============================================================================
INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Lead', 'RCSR Manager', 1, 1, true, 1, 1, '09:00', '17:30'
FROM services s WHERE s.code = 'REMOTE_CSR';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Admin', 'Morning Lead', 1, 1, true, 2, 2, '07:30', '16:00'
FROM services s WHERE s.code = 'REMOTE_CSR';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Admin', 'Mid Day', 1, 1, true, 3, 3, '08:00', '16:30'
FROM services s WHERE s.code = 'REMOTE_CSR';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Admin', 'AP/SX Support', 0, 1, false, 4, 4, '08:45', '17:15'
FROM services s WHERE s.code = 'REMOTE_CSR';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Admin', 'Support', 0, 1, false, 5, 5, '09:00', '17:30'
FROM services s WHERE s.code = 'REMOTE_CSR';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Admin', 'Closer', 1, 1, true, 6, 6, '09:45', '18:15'
FROM services s WHERE s.code = 'REMOTE_CSR';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Float', 'Float', 0, 1, false, 7, 7, '10:30', '19:00'
FROM services s WHERE s.code = 'REMOTE_CSR';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Admin', 'Texting/Tidio', 0, 1, false, 8, 8, '08:00', '17:30'
FROM services s WHERE s.code = 'REMOTE_CSR';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Admin', 'Admin/Backend', 0, 1, false, 9, 9, '10:00', '19:00'
FROM services s WHERE s.code = 'REMOTE_CSR';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Tech', 'MPMV Med Team 1', 0, 1, false, 10, 10, '10:00', '18:30'
FROM services s WHERE s.code = 'REMOTE_CSR';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Tech', 'MPMV Med Team 2', 0, 1, false, 11, 11, '10:00', '18:30'
FROM services s WHERE s.code = 'REMOTE_CSR';

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order, default_start_time, default_end_time)
SELECT s.id, 'Tech', 'MPMV Med Team 3', 0, 1, false, 12, 12, '09:00', '17:30'
FROM services s WHERE s.code = 'REMOTE_CSR';

-- ============================================================================
-- 4. UPDATE CREATE_SCHEDULE_DRAFT FUNCTION TO USE TIMES
-- ============================================================================
CREATE OR REPLACE FUNCTION create_schedule_draft(
  p_location_id UUID,
  p_week_start DATE,
  p_operational_days INT[],
  p_service_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_draft_id UUID;
  v_service RECORD;
  v_req RECORD;
  v_day INT;
  v_slot_date DATE;
BEGIN
  -- Check for existing draft
  SELECT id INTO v_draft_id
  FROM schedule_drafts
  WHERE location_id = p_location_id 
    AND week_start = p_week_start
    AND status NOT IN ('published', 'archived');
  
  -- If exists, update it
  IF v_draft_id IS NOT NULL THEN
    UPDATE schedule_drafts
    SET operational_days = p_operational_days,
        selected_service_ids = p_service_ids,
        updated_at = now()
    WHERE id = v_draft_id;
    
    -- Clear existing slots and regenerate
    DELETE FROM draft_slots WHERE draft_id = v_draft_id;
  ELSE
    -- Create new draft
    INSERT INTO schedule_drafts (location_id, week_start, operational_days, selected_service_ids, created_by)
    VALUES (p_location_id, p_week_start, p_operational_days, p_service_ids, auth.uid())
    RETURNING id INTO v_draft_id;
  END IF;
  
  -- Generate ghost slots for each service/day combination
  FOR v_day IN SELECT unnest(p_operational_days) LOOP
    v_slot_date := p_week_start + v_day;
    
    FOR v_service IN 
      SELECT s.id as service_id, s.name as service_name
      FROM services s
      WHERE s.id = ANY(p_service_ids) AND s.is_active = true
    LOOP
      -- Get staffing requirements for this service
      FOR v_req IN
        SELECT *
        FROM service_staffing_requirements
        WHERE service_id = v_service.service_id
        ORDER BY priority, sort_order
      LOOP
        -- Create min_count slots for this requirement
        FOR i IN 1..GREATEST(v_req.min_count, 1) LOOP
          -- Only create if within min_count OR if max allows optional slots
          IF i <= v_req.min_count OR (v_req.max_count IS NOT NULL AND i <= v_req.max_count) THEN
            INSERT INTO draft_slots (
              draft_id, service_id, staffing_requirement_id,
              role_category, role_label, is_required, priority,
              slot_date, start_time, end_time
            ) VALUES (
              v_draft_id, v_service.service_id, v_req.id,
              v_req.role_category, 
              v_req.role_label,
              i <= v_req.min_count, -- Only required if within min_count
              v_req.priority,
              v_slot_date, 
              COALESCE(v_req.default_start_time, '09:00'::TIME),
              COALESCE(v_req.default_end_time, '17:30'::TIME)
            );
          END IF;
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP;
  
  RETURN v_draft_id;
END;
$$;

-- ============================================================================
-- COMPLETE
-- ============================================================================
