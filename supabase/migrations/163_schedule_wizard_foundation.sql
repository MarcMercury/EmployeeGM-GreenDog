-- ============================================================================
-- MIGRATION 163: Schedule Wizard Foundation
-- Service-based scheduling with draft sandbox and wizard workflow
-- ============================================================================

-- ============================================================================
-- 1. SCHEDULE DRAFTS TABLE (The Sandbox)
-- Allows admins to build schedules without users seeing them until published
-- ============================================================================
CREATE TABLE IF NOT EXISTS schedule_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Scope
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  
  -- What's being scheduled
  operational_days INT[] NOT NULL DEFAULT '{1,2,3,4,5}', -- 0=Sun, 1=Mon, etc.
  selected_service_ids UUID[] NOT NULL DEFAULT '{}',
  
  -- Status workflow
  status TEXT DEFAULT 'building' CHECK (status IN ('building', 'reviewing', 'validated', 'published', 'archived')),
  
  -- Validation results
  validation_errors JSONB DEFAULT '[]',
  validation_warnings JSONB DEFAULT '[]',
  coverage_score FLOAT DEFAULT 0,
  
  -- AI analysis
  ai_analysis JSONB DEFAULT '{}',
  ai_suggestions JSONB DEFAULT '[]',
  
  -- Tracking
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  validated_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Only one active draft per location per week
  UNIQUE(location_id, week_start) 
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_schedule_drafts_location ON schedule_drafts(location_id);
CREATE INDEX IF NOT EXISTS idx_schedule_drafts_week ON schedule_drafts(week_start);
CREATE INDEX IF NOT EXISTS idx_schedule_drafts_status ON schedule_drafts(status);

-- Enable RLS
ALTER TABLE schedule_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "schedule_drafts_select_admin" ON schedule_drafts;
CREATE POLICY "schedule_drafts_select_admin" ON schedule_drafts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_admin', 'manager', 'sup_admin')
    )
  );

DROP POLICY IF EXISTS "schedule_drafts_modify_admin" ON schedule_drafts;
CREATE POLICY "schedule_drafts_modify_admin" ON schedule_drafts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_admin', 'manager', 'sup_admin')
    )
  );

-- ============================================================================
-- 2. DRAFT SLOTS TABLE (Individual Assignments in the Draft)
-- Each slot represents a required role in a service for a specific day
-- ============================================================================
CREATE TABLE IF NOT EXISTS draft_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES schedule_drafts(id) ON DELETE CASCADE,
  
  -- What service and role
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  staffing_requirement_id UUID REFERENCES service_staffing_requirements(id) ON DELETE SET NULL,
  
  -- Role details (copied from staffing_requirement for display)
  role_category TEXT NOT NULL, -- DVM, Lead, Tech, DA, Admin, etc.
  role_label TEXT NOT NULL, -- Surgery Lead, AP Tech 1, etc.
  is_required BOOLEAN DEFAULT true,
  priority INT DEFAULT 1,
  
  -- When
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '17:30',
  
  -- Who (assigned employee - NULL means empty/ghost slot)
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  
  -- Status flags
  is_filled BOOLEAN GENERATED ALWAYS AS (employee_id IS NOT NULL) STORED,
  has_conflict BOOLEAN DEFAULT false,
  conflict_reason TEXT,
  
  -- AI context
  ai_suggested_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  ai_confidence FLOAT,
  ai_reasoning TEXT,
  
  -- Tracking
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  assigned_at TIMESTAMPTZ,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_draft_slots_draft ON draft_slots(draft_id);
CREATE INDEX IF NOT EXISTS idx_draft_slots_service ON draft_slots(service_id);
CREATE INDEX IF NOT EXISTS idx_draft_slots_date ON draft_slots(slot_date);
CREATE INDEX IF NOT EXISTS idx_draft_slots_employee ON draft_slots(employee_id);
CREATE INDEX IF NOT EXISTS idx_draft_slots_unfilled ON draft_slots(draft_id, is_filled) WHERE is_filled = false;

-- Enable RLS
ALTER TABLE draft_slots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "draft_slots_select_admin" ON draft_slots;
CREATE POLICY "draft_slots_select_admin" ON draft_slots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_admin', 'manager', 'sup_admin')
    )
  );

DROP POLICY IF EXISTS "draft_slots_modify_admin" ON draft_slots;
CREATE POLICY "draft_slots_modify_admin" ON draft_slots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_admin', 'manager', 'sup_admin')
    )
  );

-- ============================================================================
-- 3. ADD MISSING SERVICES
-- Complete the service catalog per user requirements
-- ============================================================================

-- First, ensure existing services have proper codes if missing
-- Clean up any duplicate codes and ensure proper codes exist
UPDATE services SET code = 'CLINIC' WHERE name ILIKE '%clinic%' AND code IS NULL;
UPDATE services SET code = 'NAP' WHERE name ILIKE '%nap%' AND code IS NULL;
UPDATE services SET code = 'AP' WHERE (name ILIKE '%anesthesia%' OR name ILIKE '%ap dental%') AND code IS NULL AND NOT EXISTS (SELECT 1 FROM services WHERE code = 'AP');
UPDATE services SET code = 'SURG' WHERE name ILIKE '%surgery%' AND code IS NULL AND NOT EXISTS (SELECT 1 FROM services WHERE code = 'SURG');
UPDATE services SET code = 'IM' WHERE name ILIKE '%internal%' AND code IS NULL AND NOT EXISTS (SELECT 1 FROM services WHERE code = 'IM');

-- Insert complete service list (upsert by code)
INSERT INTO services (name, code, description, color, icon, requires_dvm, min_staff_count, sort_order) VALUES
  ('Clinic & NAD', 'CLINIC_NAD', 'General clinic and non-anesthetic dental', '#10B981', 'mdi-hospital-building', true, 2, 1),
  ('AP Dental', 'AP_DENTAL', 'Anesthesia-assisted dental procedures', '#6366F1', 'mdi-tooth', true, 3, 2),
  ('Surgery', 'SURG', 'Surgical procedures', '#EF4444', 'mdi-heart-pulse', true, 4, 3),
  ('Internal Medicine', 'IM', 'Internal medicine consultations', '#8B5CF6', 'mdi-stethoscope', true, 2, 4),
  ('CSR', 'CSR', 'Client Service Representatives - front desk', '#F59E0B', 'mdi-phone-in-talk', false, 2, 5),
  ('Remote CSR', 'REMOTE_CSR', 'Remote/virtual client service', '#FBBF24', 'mdi-headset', false, 1, 6),
  ('Mobile', 'MOBILE', 'Mobile veterinary services', '#14B8A6', 'mdi-van-utility', true, 2, 7),
  ('Exotics', 'EXOTIC', 'Exotic animal care', '#22C55E', 'mdi-turtle', true, 2, 8),
  ('Imaging', 'IMAGING', 'Radiology and diagnostic imaging', '#3B82F6', 'mdi-radioactive', false, 2, 9),
  ('Inventory', 'INVENTORY', 'Inventory management and ordering', '#64748B', 'mdi-package-variant', false, 1, 10),
  ('Facilities', 'FACILITIES', 'Facilities and maintenance', '#78716C', 'mdi-wrench', false, 1, 11),
  ('Management', 'MANAGEMENT', 'Practice management', '#0EA5E9', 'mdi-account-tie', false, 1, 12),
  ('Admin', 'ADMIN', 'Administrative support', '#A855F7', 'mdi-desktop-classic', false, 2, 13),
  ('Marketing', 'MARKETING', 'Marketing and outreach', '#EC4899', 'mdi-bullhorn', false, 1, 14)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  icon = EXCLUDED.icon,
  requires_dvm = EXCLUDED.requires_dvm,
  min_staff_count = EXCLUDED.min_staff_count,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- ============================================================================
-- 4. ADD STAFFING REQUIREMENTS FOR NEW SERVICES
-- Define the "skeleton crew" for each service
-- ============================================================================

-- CSR staffing requirements
INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order)
SELECT s.id, 'Admin', 'Lead CSR', 1, 1, true, 1, 1
FROM services s WHERE s.code = 'CSR'
ON CONFLICT DO NOTHING;

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order)
SELECT s.id, 'Admin', 'CSR 1', 1, 1, true, 2, 2
FROM services s WHERE s.code = 'CSR'
ON CONFLICT DO NOTHING;

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order)
SELECT s.id, 'Admin', 'CSR 2', 0, 1, false, 3, 3
FROM services s WHERE s.code = 'CSR'
ON CONFLICT DO NOTHING;

-- Remote CSR
INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order)
SELECT s.id, 'Admin', 'Remote CSR', 1, 2, true, 1, 1
FROM services s WHERE s.code = 'REMOTE_CSR'
ON CONFLICT DO NOTHING;

-- Mobile
INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order)
SELECT s.id, 'DVM', 'Mobile DVM', 1, 1, true, 1, 1
FROM services s WHERE s.code = 'MOBILE'
ON CONFLICT DO NOTHING;

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order)
SELECT s.id, 'Tech', 'Mobile Tech', 1, 1, true, 2, 2
FROM services s WHERE s.code = 'MOBILE'
ON CONFLICT DO NOTHING;

-- Imaging
INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order)
SELECT s.id, 'Tech', 'Imaging Lead', 1, 1, true, 1, 1
FROM services s WHERE s.code = 'IMAGING'
ON CONFLICT DO NOTHING;

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order)
SELECT s.id, 'Tech', 'Imaging Tech', 0, 1, false, 2, 2
FROM services s WHERE s.code = 'IMAGING'
ON CONFLICT DO NOTHING;

-- Inventory
INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order)
SELECT s.id, 'Admin', 'Inventory Manager', 1, 1, true, 1, 1
FROM services s WHERE s.code = 'INVENTORY'
ON CONFLICT DO NOTHING;

-- Facilities
INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order)
SELECT s.id, 'Admin', 'Facilities Staff', 1, 2, true, 1, 1
FROM services s WHERE s.code = 'FACILITIES'
ON CONFLICT DO NOTHING;

-- Management
INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order)
SELECT s.id, 'Admin', 'Practice Manager', 1, 1, true, 1, 1
FROM services s WHERE s.code = 'MANAGEMENT'
ON CONFLICT DO NOTHING;

-- Marketing
INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order)
SELECT s.id, 'Admin', 'Marketing Lead', 1, 1, true, 1, 1
FROM services s WHERE s.code = 'MARKETING'
ON CONFLICT DO NOTHING;

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order)
SELECT s.id, 'Admin', 'Marketing Assistant', 0, 1, false, 2, 2
FROM services s WHERE s.code = 'MARKETING'
ON CONFLICT DO NOTHING;

-- Clinic & NAD (combined service)
INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order)
SELECT s.id, 'DVM', 'Clinic DVM', 1, 2, true, 1, 1
FROM services s WHERE s.code = 'CLINIC_NAD'
ON CONFLICT DO NOTHING;

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order)
SELECT s.id, 'Lead', 'Clinic Lead', 1, 1, true, 2, 2
FROM services s WHERE s.code = 'CLINIC_NAD'
ON CONFLICT DO NOTHING;

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order)
SELECT s.id, 'Tech', 'Clinic Tech', 1, 2, true, 3, 3
FROM services s WHERE s.code = 'CLINIC_NAD'
ON CONFLICT DO NOTHING;

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order)
SELECT s.id, 'DA', 'Dental Assistant', 1, 2, false, 4, 4
FROM services s WHERE s.code = 'CLINIC_NAD'
ON CONFLICT DO NOTHING;

-- AP Dental
INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order)
SELECT s.id, 'DVM', 'AP DVM', 1, 1, true, 1, 1
FROM services s WHERE s.code = 'AP_DENTAL'
ON CONFLICT DO NOTHING;

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order)
SELECT s.id, 'Lead', 'AP Lead Tech', 1, 1, true, 2, 2
FROM services s WHERE s.code = 'AP_DENTAL'
ON CONFLICT DO NOTHING;

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order)
SELECT s.id, 'Tech', 'AP Tech 1', 1, 1, true, 3, 3
FROM services s WHERE s.code = 'AP_DENTAL'
ON CONFLICT DO NOTHING;

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order)
SELECT s.id, 'Tech', 'AP Tech 2', 0, 1, false, 4, 4
FROM services s WHERE s.code = 'AP_DENTAL'
ON CONFLICT DO NOTHING;

INSERT INTO service_staffing_requirements (service_id, role_category, role_label, min_count, max_count, is_required, priority, sort_order)
SELECT s.id, 'Intern', 'Intern/Extern', 0, 2, false, 5, 5
FROM services s WHERE s.code = 'AP_DENTAL'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. RPC FUNCTIONS FOR WIZARD WORKFLOW
-- ============================================================================

-- Function: Create or get draft for a week/location
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
        FOR i IN 1..v_req.min_count LOOP
          INSERT INTO draft_slots (
            draft_id, service_id, staffing_requirement_id,
            role_category, role_label, is_required, priority,
            slot_date, start_time, end_time
          ) VALUES (
            v_draft_id, v_service.service_id, v_req.id,
            v_req.role_category, v_req.role_label || CASE WHEN v_req.min_count > 1 THEN ' ' || i ELSE '' END,
            v_req.is_required, v_req.priority,
            v_slot_date, '09:00', '17:30'
          );
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP;
  
  RETURN v_draft_id;
END;
$$;

-- Function: Get available employees for a slot (anti-clash logic)
CREATE OR REPLACE FUNCTION get_available_employees_for_slot(
  p_draft_id UUID,
  p_slot_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_role_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  employee_id UUID,
  first_name TEXT,
  last_name TEXT,
  position_title TEXT,
  is_available BOOLEAN,
  conflict_reason TEXT,
  current_week_hours NUMERIC,
  reliability_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_draft RECORD;
  v_slot_start TIMESTAMPTZ;
  v_slot_end TIMESTAMPTZ;
BEGIN
  -- Get draft info
  SELECT * INTO v_draft FROM schedule_drafts WHERE id = p_draft_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Draft not found';
  END IF;
  
  -- Calculate exact timestamps
  v_slot_start := (p_slot_date::TEXT || ' ' || p_start_time::TEXT)::TIMESTAMPTZ;
  v_slot_end := (p_slot_date::TEXT || ' ' || p_end_time::TEXT)::TIMESTAMPTZ;
  
  RETURN QUERY
  WITH employee_data AS (
    SELECT 
      e.id,
      e.first_name,
      e.last_name,
      jp.title as position_title,
      -- Check for approved time off
      EXISTS (
        SELECT 1 FROM time_off_requests tor
        WHERE tor.employee_id = e.id
        AND tor.status = 'approved'
        AND p_slot_date BETWEEN tor.start_date AND tor.end_date
      ) as has_time_off,
      -- Check for existing published shifts (any location)
      EXISTS (
        SELECT 1 FROM shifts s
        WHERE s.employee_id = e.id
        AND s.status IN ('draft', 'published')
        AND (s.start_at, s.end_at) OVERLAPS (v_slot_start, v_slot_end)
      ) as has_shift_conflict,
      -- Check for assignment in this draft
      EXISTS (
        SELECT 1 FROM draft_slots ds
        WHERE ds.draft_id = p_draft_id
        AND ds.employee_id = e.id
        AND ds.slot_date = p_slot_date
        AND (ds.start_time, ds.end_time) OVERLAPS (p_start_time, p_end_time)
      ) as has_draft_conflict,
      -- Calculate current week hours
      COALESCE(
        (SELECT SUM(EXTRACT(EPOCH FROM (s.end_at - s.start_at))/3600)
         FROM shifts s
         WHERE s.employee_id = e.id
         AND s.start_at >= v_draft.week_start
         AND s.start_at < v_draft.week_start + 7),
        0
      ) as week_hours,
      -- Reliability score (from attendance if available)
      COALESCE(
        (SELECT AVG(CASE 
          WHEN a.status = 'on_time' THEN 100
          WHEN a.status = 'late' THEN 70
          WHEN a.status = 'absent' THEN 0
          ELSE 80
        END)
        FROM attendance a
        WHERE a.employee_id = e.id
        AND a.date > CURRENT_DATE - 90),
        85
      ) as reliability
    FROM employees e
    LEFT JOIN job_positions jp ON e.position_id = jp.id
    WHERE e.employment_status = 'Active'
    AND e.is_active = true
  )
  SELECT 
    ed.id,
    ed.first_name,
    ed.last_name,
    ed.position_title,
    NOT (ed.has_time_off OR ed.has_shift_conflict OR ed.has_draft_conflict) as is_available,
    CASE 
      WHEN ed.has_time_off THEN 'Approved time off'
      WHEN ed.has_shift_conflict THEN 'Scheduled elsewhere'
      WHEN ed.has_draft_conflict THEN 'Already in this draft'
      ELSE NULL
    END as conflict_reason,
    ed.week_hours::NUMERIC,
    ed.reliability::NUMERIC
  FROM employee_data ed
  ORDER BY 
    NOT (ed.has_time_off OR ed.has_shift_conflict OR ed.has_draft_conflict) DESC,
    ed.reliability DESC,
    ed.week_hours ASC;
END;
$$;

-- Function: Assign employee to slot
CREATE OR REPLACE FUNCTION assign_employee_to_slot(
  p_slot_id UUID,
  p_employee_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot RECORD;
BEGIN
  -- Get slot details
  SELECT * INTO v_slot FROM draft_slots WHERE id = p_slot_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Slot not found';
  END IF;
  
  -- Update the slot
  UPDATE draft_slots
  SET employee_id = p_employee_id,
      assigned_at = now(),
      assigned_by = auth.uid(),
      updated_at = now()
  WHERE id = p_slot_id;
  
  RETURN true;
END;
$$;

-- Function: Validate draft (2nd Draft check)
CREATE OR REPLACE FUNCTION validate_schedule_draft(p_draft_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_errors JSONB := '[]';
  v_warnings JSONB := '[]';
  v_record RECORD;
  v_coverage_score FLOAT;
  v_total_slots INT;
  v_filled_slots INT;
BEGIN
  -- Check 1: Understaffing (required roles not filled)
  FOR v_record IN
    SELECT ds.role_label, ds.slot_date, s.name as service_name
    FROM draft_slots ds
    JOIN services s ON ds.service_id = s.id
    WHERE ds.draft_id = p_draft_id
    AND ds.is_required = true
    AND ds.employee_id IS NULL
  LOOP
    v_errors := v_errors || jsonb_build_object(
      'type', 'understaffing',
      'severity', 'error',
      'message', format('Missing required %s for %s on %s', 
        v_record.role_label, v_record.service_name, v_record.slot_date),
      'date', v_record.slot_date
    );
  END LOOP;
  
  -- Check 2: Employee double-booked in draft
  FOR v_record IN
    SELECT e.first_name, e.last_name, ds.slot_date, COUNT(*) as shift_count
    FROM draft_slots ds
    JOIN employees e ON ds.employee_id = e.id
    WHERE ds.draft_id = p_draft_id
    AND ds.employee_id IS NOT NULL
    GROUP BY e.id, e.first_name, e.last_name, ds.slot_date, ds.start_time, ds.end_time
    HAVING COUNT(*) > 1
  LOOP
    v_errors := v_errors || jsonb_build_object(
      'type', 'double_booking',
      'severity', 'error',
      'message', format('%s %s is double-booked on %s', 
        v_record.first_name, v_record.last_name, v_record.slot_date)
    );
  END LOOP;
  
  -- Check 3: Overtime warning (> 40 hours)
  FOR v_record IN
    SELECT e.first_name, e.last_name, 
           SUM(EXTRACT(EPOCH FROM (ds.end_time::TIME - ds.start_time::TIME))/3600) as draft_hours
    FROM draft_slots ds
    JOIN employees e ON ds.employee_id = e.id
    WHERE ds.draft_id = p_draft_id
    AND ds.employee_id IS NOT NULL
    GROUP BY e.id, e.first_name, e.last_name
    HAVING SUM(EXTRACT(EPOCH FROM (ds.end_time::TIME - ds.start_time::TIME))/3600) > 40
  LOOP
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'overtime',
      'severity', 'warning',
      'message', format('%s %s has %.1f hours scheduled (overtime)', 
        v_record.first_name, v_record.last_name, v_record.draft_hours)
    );
  END LOOP;
  
  -- Check 4: 7 consecutive days warning
  FOR v_record IN
    SELECT e.first_name, e.last_name, COUNT(DISTINCT ds.slot_date) as work_days
    FROM draft_slots ds
    JOIN employees e ON ds.employee_id = e.id
    WHERE ds.draft_id = p_draft_id
    AND ds.employee_id IS NOT NULL
    GROUP BY e.id, e.first_name, e.last_name
    HAVING COUNT(DISTINCT ds.slot_date) >= 7
  LOOP
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'consecutive_days',
      'severity', 'warning',
      'message', format('%s %s is scheduled %d days this week', 
        v_record.first_name, v_record.last_name, v_record.work_days)
    );
  END LOOP;
  
  -- Calculate coverage score
  SELECT COUNT(*), COUNT(*) FILTER (WHERE employee_id IS NOT NULL)
  INTO v_total_slots, v_filled_slots
  FROM draft_slots
  WHERE draft_id = p_draft_id;
  
  v_coverage_score := CASE 
    WHEN v_total_slots > 0 THEN (v_filled_slots::FLOAT / v_total_slots::FLOAT) * 100
    ELSE 0
  END;
  
  -- Update draft with validation results
  UPDATE schedule_drafts
  SET validation_errors = v_errors,
      validation_warnings = v_warnings,
      coverage_score = v_coverage_score,
      validated_at = now(),
      status = CASE WHEN jsonb_array_length(v_errors) = 0 THEN 'validated' ELSE 'reviewing' END,
      updated_at = now()
  WHERE id = p_draft_id;
  
  RETURN jsonb_build_object(
    'errors', v_errors,
    'warnings', v_warnings,
    'coverage_score', v_coverage_score,
    'total_slots', v_total_slots,
    'filled_slots', v_filled_slots,
    'is_valid', jsonb_array_length(v_errors) = 0
  );
END;
$$;

-- Function: Publish draft to live shifts
CREATE OR REPLACE FUNCTION publish_schedule_draft(p_draft_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_draft RECORD;
  v_slot RECORD;
  v_schedule_week_id UUID;
BEGIN
  -- Get draft
  SELECT * INTO v_draft FROM schedule_drafts WHERE id = p_draft_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Draft not found';
  END IF;
  
  -- Get or create schedule_week
  SELECT id INTO v_schedule_week_id
  FROM schedule_weeks
  WHERE location_id = v_draft.location_id AND week_start = v_draft.week_start;
  
  IF v_schedule_week_id IS NULL THEN
    INSERT INTO schedule_weeks (location_id, week_start, status)
    VALUES (v_draft.location_id, v_draft.week_start, 'draft')
    RETURNING id INTO v_schedule_week_id;
  END IF;
  
  -- Convert draft_slots to shifts
  FOR v_slot IN
    SELECT ds.*, s.name as service_name
    FROM draft_slots ds
    JOIN services s ON ds.service_id = s.id
    WHERE ds.draft_id = p_draft_id
    AND ds.employee_id IS NOT NULL
  LOOP
    INSERT INTO shifts (
      employee_id,
      location_id,
      service_id,
      staffing_requirement_id,
      schedule_week_id,
      start_at,
      end_at,
      role_required,
      status,
      is_published,
      assignment_source
    ) VALUES (
      v_slot.employee_id,
      v_draft.location_id,
      v_slot.service_id,
      v_slot.staffing_requirement_id,
      v_schedule_week_id,
      (v_slot.slot_date::TEXT || ' ' || v_slot.start_time::TEXT)::TIMESTAMPTZ,
      (v_slot.slot_date::TEXT || ' ' || v_slot.end_time::TEXT)::TIMESTAMPTZ,
      v_slot.role_label,
      'published',
      true,
      'manual'
    );
  END LOOP;
  
  -- Update schedule_week status
  UPDATE schedule_weeks
  SET status = 'published',
      published_at = now(),
      published_by = auth.uid()
  WHERE id = v_schedule_week_id;
  
  -- Mark draft as published
  UPDATE schedule_drafts
  SET status = 'published',
      published_at = now(),
      published_by = auth.uid()
  WHERE id = p_draft_id;
  
  RETURN true;
END;
$$;

-- ============================================================================
-- 6. GRANT EXECUTE PERMISSIONS
-- ============================================================================
GRANT EXECUTE ON FUNCTION create_schedule_draft TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_employees_for_slot TO authenticated;
GRANT EXECUTE ON FUNCTION assign_employee_to_slot TO authenticated;
GRANT EXECUTE ON FUNCTION validate_schedule_draft TO authenticated;
GRANT EXECUTE ON FUNCTION publish_schedule_draft TO authenticated;

-- ============================================================================
-- COMPLETE
-- ============================================================================
