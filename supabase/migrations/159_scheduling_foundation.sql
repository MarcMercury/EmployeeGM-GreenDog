-- ============================================================================
-- MIGRATION 159: Scheduling System Foundation
-- Phase 1: Database tables for AI-driven schedule builder
-- FULLY IDEMPOTENT - Safe to re-run
-- ============================================================================

-- ============================================================================
-- 1. SERVICES TABLE
-- What your clinics actually provide (Surgery, NAP, Dental, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  description TEXT,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  default_duration_minutes INT DEFAULT 480,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'mdi-medical-bag',
  requires_dvm BOOLEAN DEFAULT false,
  min_staff_count INT DEFAULT 1,
  max_staff_count INT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_services_department ON services(department_id);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "services_select_all" ON services;
CREATE POLICY "services_select_all" ON services FOR SELECT USING (true);

DROP POLICY IF EXISTS "services_modify_admin" ON services;
CREATE POLICY "services_modify_admin" ON services FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'hr_admin'))
);

-- ============================================================================
-- 2. SERVICE_SLOTS TABLE
-- What services run when at each location (recurring schedule pattern)
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  capacity INT DEFAULT 1,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  effective_from DATE,
  effective_until DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(service_id, location_id, day_of_week, start_time)
);

CREATE INDEX IF NOT EXISTS idx_service_slots_location ON service_slots(location_id);
CREATE INDEX IF NOT EXISTS idx_service_slots_service ON service_slots(service_id);
CREATE INDEX IF NOT EXISTS idx_service_slots_day ON service_slots(day_of_week);
CREATE INDEX IF NOT EXISTS idx_service_slots_active ON service_slots(is_active) WHERE is_active = true;

ALTER TABLE service_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_slots_select_all" ON service_slots;
CREATE POLICY "service_slots_select_all" ON service_slots FOR SELECT USING (true);

DROP POLICY IF EXISTS "service_slots_modify_admin" ON service_slots;
CREATE POLICY "service_slots_modify_admin" ON service_slots FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'hr_admin', 'manager'))
);

-- ============================================================================
-- 3. SERVICE_STAFFING_REQUIREMENTS TABLE
-- What roles/positions each service needs
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_staffing_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  position_id UUID REFERENCES job_positions(id) ON DELETE SET NULL,
  role_category TEXT,
  role_label TEXT,
  min_count INT NOT NULL DEFAULT 1,
  max_count INT,
  is_required BOOLEAN DEFAULT true,
  priority INT DEFAULT 1,
  skills_required UUID[],
  notes TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staffing_reqs_service ON service_staffing_requirements(service_id);
CREATE INDEX IF NOT EXISTS idx_staffing_reqs_position ON service_staffing_requirements(position_id);
CREATE INDEX IF NOT EXISTS idx_staffing_reqs_category ON service_staffing_requirements(role_category);

ALTER TABLE service_staffing_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staffing_reqs_select_all" ON service_staffing_requirements;
CREATE POLICY "staffing_reqs_select_all" ON service_staffing_requirements FOR SELECT USING (true);

DROP POLICY IF EXISTS "staffing_reqs_modify_admin" ON service_staffing_requirements;
CREATE POLICY "staffing_reqs_modify_admin" ON service_staffing_requirements FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'hr_admin'))
);

-- ============================================================================
-- 4. EMPLOYEE_AVAILABILITY TABLE
-- When employees CAN work (beyond just time-off)
-- ============================================================================
CREATE TABLE IF NOT EXISTS employee_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  availability_type TEXT DEFAULT 'available' CHECK (availability_type IN ('available', 'preferred', 'avoid', 'unavailable')),
  preference_level INT DEFAULT 0,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  reason TEXT,
  effective_from DATE,
  effective_until DATE,
  is_recurring BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_employee_availability_employee ON employee_availability(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_availability_day ON employee_availability(day_of_week);
CREATE INDEX IF NOT EXISTS idx_employee_availability_type ON employee_availability(availability_type);

ALTER TABLE employee_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employee_availability_select" ON employee_availability;
CREATE POLICY "employee_availability_select" ON employee_availability FOR SELECT USING (
  employee_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'hr_admin', 'manager', 'sup_admin')
  )
);

DROP POLICY IF EXISTS "employee_availability_insert" ON employee_availability;
CREATE POLICY "employee_availability_insert" ON employee_availability FOR INSERT WITH CHECK (
  employee_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'hr_admin', 'manager')
  )
);

DROP POLICY IF EXISTS "employee_availability_update" ON employee_availability;
CREATE POLICY "employee_availability_update" ON employee_availability FOR UPDATE USING (
  employee_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'hr_admin', 'manager')
  )
);

DROP POLICY IF EXISTS "employee_availability_delete" ON employee_availability;
CREATE POLICY "employee_availability_delete" ON employee_availability FOR DELETE USING (
  employee_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'hr_admin', 'manager')
  )
);

-- ============================================================================
-- 5. SCHEDULE_WEEKS TABLE
-- Track week-level status for publishing workflow
-- ============================================================================
CREATE TABLE IF NOT EXISTS schedule_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'locked')),
  coverage_score FLOAT,
  total_shifts INT DEFAULT 0,
  filled_shifts INT DEFAULT 0,
  open_shifts INT DEFAULT 0,
  conflict_count INT DEFAULT 0,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  ai_suggestions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(location_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_schedule_weeks_location ON schedule_weeks(location_id);
CREATE INDEX IF NOT EXISTS idx_schedule_weeks_date ON schedule_weeks(week_start);
CREATE INDEX IF NOT EXISTS idx_schedule_weeks_status ON schedule_weeks(status);

ALTER TABLE schedule_weeks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schedule_weeks_select_all" ON schedule_weeks;
CREATE POLICY "schedule_weeks_select_all" ON schedule_weeks FOR SELECT USING (true);

DROP POLICY IF EXISTS "schedule_weeks_modify_admin" ON schedule_weeks;
CREATE POLICY "schedule_weeks_modify_admin" ON schedule_weeks FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'hr_admin', 'manager', 'sup_admin'))
);

-- ============================================================================
-- 6. ALTER SHIFTS TABLE
-- Add service context and AI tracking
-- ============================================================================
ALTER TABLE shifts 
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS service_slot_id UUID REFERENCES service_slots(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS staffing_requirement_id UUID REFERENCES service_staffing_requirements(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS schedule_week_id UUID REFERENCES schedule_weeks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ai_suggested BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_confidence FLOAT,
  ADD COLUMN IF NOT EXISTS ai_reasoning TEXT,
  ADD COLUMN IF NOT EXISTS conflict_flags JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS assignment_source TEXT DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_shifts_service ON shifts(service_id);
CREATE INDEX IF NOT EXISTS idx_shifts_service_slot ON shifts(service_slot_id);
CREATE INDEX IF NOT EXISTS idx_shifts_schedule_week ON shifts(schedule_week_id);
CREATE INDEX IF NOT EXISTS idx_shifts_ai_suggested ON shifts(ai_suggested) WHERE ai_suggested = true;

-- ============================================================================
-- 7. SCHEDULING_RULES TABLE
-- Configurable constraints for AI and validation
-- ============================================================================
CREATE TABLE IF NOT EXISTS scheduling_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL CHECK (rule_type IN (
    'max_hours_per_week', 'max_hours_per_day', 'min_rest_between_shifts',
    'max_consecutive_days', 'skill_required', 'certification_required',
    'overtime_threshold', 'break_requirement', 'location_restriction', 'custom'
  )),
  parameters JSONB NOT NULL DEFAULT '{}',
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  position_id UUID REFERENCES job_positions(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  severity TEXT DEFAULT 'warning' CHECK (severity IN ('error', 'warning', 'info')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_scheduling_rules_type ON scheduling_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_scheduling_rules_active ON scheduling_rules(is_active) WHERE is_active = true;

ALTER TABLE scheduling_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scheduling_rules_select_all" ON scheduling_rules;
CREATE POLICY "scheduling_rules_select_all" ON scheduling_rules FOR SELECT USING (true);

DROP POLICY IF EXISTS "scheduling_rules_modify_admin" ON scheduling_rules;
CREATE POLICY "scheduling_rules_modify_admin" ON scheduling_rules FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);

-- ============================================================================
-- 8. AI_SCHEDULING_LOG TABLE
-- Track AI suggestions and outcomes for learning
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_scheduling_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN (
    'auto_fill', 'suggest_replacement', 'conflict_detected',
    'optimization', 'coverage_analysis', 'pattern_detected'
  )),
  input_context JSONB,
  suggestions JSONB,
  accepted_suggestions JSONB,
  rejected_suggestions JSONB,
  feedback TEXT,
  processing_time_ms INT,
  model_version TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_log_week ON ai_scheduling_log(week_start);
CREATE INDEX IF NOT EXISTS idx_ai_log_location ON ai_scheduling_log(location_id);
CREATE INDEX IF NOT EXISTS idx_ai_log_action ON ai_scheduling_log(action);
CREATE INDEX IF NOT EXISTS idx_ai_log_date ON ai_scheduling_log(created_at);

ALTER TABLE ai_scheduling_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_log_select_admin" ON ai_scheduling_log;
CREATE POLICY "ai_log_select_admin" ON ai_scheduling_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'hr_admin', 'manager'))
);

DROP POLICY IF EXISTS "ai_log_insert" ON ai_scheduling_log;
CREATE POLICY "ai_log_insert" ON ai_scheduling_log FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 9. SEED INITIAL SERVICES (idempotent via ON CONFLICT)
-- ============================================================================
INSERT INTO services (name, code, description, color, icon, requires_dvm, min_staff_count, max_staff_count, sort_order) VALUES
  ('Surgery', 'SURG', 'Surgical procedures including orthopedic and soft tissue', '#ff00ff', 'mdi-hospital', true, 3, 6, 1),
  ('Anesthesia Procedures (AP)', 'AP', 'Anesthesia-required procedures and dentals', '#ffff00', 'mdi-needle', true, 2, 4, 2),
  ('Non-Anesthesia Procedures (NAP)', 'NAP', 'Procedures not requiring anesthesia', '#00ffff', 'mdi-stethoscope', true, 2, 4, 3),
  ('Internal Medicine (IM)', 'IM', 'Internal medicine consultations and diagnostics', '#00ff00', 'mdi-heart-pulse', true, 2, 3, 4),
  ('Exotics', 'EXOTIC', 'Exotic animal care and procedures', '#00ff99', 'mdi-turtle', true, 2, 3, 5),
  ('Dentistry', 'DENTAL', 'Dental procedures and cleanings', '#ff9900', 'mdi-tooth', true, 2, 4, 6),
  ('Mobile/MPMV', 'MPMV', 'Mobile Pet Medical Vehicle services', '#0099ff', 'mdi-van-utility', true, 2, 3, 7),
  ('General Admin', 'ADMIN', 'Administrative and front office coverage', '#e0e0e0', 'mdi-desk', false, 2, 4, 8),
  ('Float/Support', 'FLOAT', 'Floating support staff', '#ffcc00', 'mdi-account-switch', false, 1, 3, 9)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 10. SEED DEFAULT SCHEDULING RULES
-- ============================================================================
INSERT INTO scheduling_rules (name, description, rule_type, parameters, severity) VALUES
  ('Max 40 Hours/Week', 'Standard full-time weekly hour limit', 'max_hours_per_week', '{"max_hours": 40, "warning_at": 35}', 'warning'),
  ('Max 10 Hours/Day', 'Maximum hours in a single shift', 'max_hours_per_day', '{"max_hours": 10}', 'warning'),
  ('Min 8 Hours Rest', 'Minimum rest between shifts', 'min_rest_between_shifts', '{"min_hours": 8}', 'error'),
  ('Max 6 Consecutive Days', 'Prevent burnout from too many consecutive days', 'max_consecutive_days', '{"max_days": 6}', 'warning'),
  ('Overtime at 40 Hours', 'Flag overtime when exceeding 40 hours', 'overtime_threshold', '{"threshold_hours": 40}', 'info')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 11. TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS services_updated_at ON services;
CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_services_updated_at();

CREATE OR REPLACE FUNCTION update_schedule_week_stats()
RETURNS TRIGGER AS $$
DECLARE
  week_id UUID;
  total_count INT;
  filled_count INT;
  open_count INT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    week_id := OLD.schedule_week_id;
  ELSE
    week_id := NEW.schedule_week_id;
  END IF;
  
  IF week_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE employee_id IS NOT NULL),
    COUNT(*) FILTER (WHERE employee_id IS NULL OR is_open_shift = true)
  INTO total_count, filled_count, open_count
  FROM shifts
  WHERE schedule_week_id = week_id;
  
  UPDATE schedule_weeks
  SET 
    total_shifts = total_count,
    filled_shifts = filled_count,
    open_shifts = open_count,
    coverage_score = CASE 
      WHEN total_count > 0 THEN (filled_count::FLOAT / total_count::FLOAT) * 100
      ELSE 0
    END,
    updated_at = now()
  WHERE id = week_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shifts_update_week_stats ON shifts;
CREATE TRIGGER shifts_update_week_stats
  AFTER INSERT OR UPDATE OR DELETE ON shifts
  FOR EACH ROW EXECUTE FUNCTION update_schedule_week_stats();

-- ============================================================================
-- 12. HELPER VIEWS
-- ============================================================================
CREATE OR REPLACE VIEW scheduling_context AS
SELECT 
  e.id as employee_id,
  e.first_name,
  e.last_name,
  e.position_id,
  p.title as position_title,
  e.employment_type,
  (e.employment_status = 'Active') as is_active,
  (SELECT el.location_id FROM employee_locations el WHERE el.employee_id = e.id LIMIT 1) as primary_location_id,
  COALESCE(
    (SELECT array_agg(s.name) FROM employee_skills es JOIN skill_library s ON es.skill_id = s.id WHERE es.employee_id = e.id),
    ARRAY[]::TEXT[]
  ) as skills,
  COALESCE(
    (SELECT SUM(EXTRACT(EPOCH FROM (sh.end_at - sh.start_at))/3600)::NUMERIC(10,2)
     FROM shifts sh WHERE sh.employee_id = e.id AND sh.start_at > now() - interval '4 weeks'),
    0
  ) as recent_hours_4_weeks,
  COALESCE(
    (SELECT SUM(EXTRACT(EPOCH FROM (sh.end_at - sh.start_at))/3600)::NUMERIC(10,2)
     FROM shifts sh WHERE sh.employee_id = e.id 
     AND sh.start_at >= date_trunc('week', now())
     AND sh.start_at < date_trunc('week', now()) + interval '7 days'),
    0
  ) as current_week_hours
FROM employees e
LEFT JOIN job_positions p ON e.position_id = p.id
WHERE e.employment_status = 'Active';

CREATE OR REPLACE VIEW service_coverage_summary AS
SELECT 
  sw.id as schedule_week_id,
  sw.location_id,
  l.name as location_name,
  sw.week_start,
  sw.status,
  s.id as service_id,
  s.name as service_name,
  s.code as service_code,
  COALESCE((SELECT COUNT(*) FROM shifts sh WHERE sh.schedule_week_id = sw.id AND sh.service_id = s.id), 0) as total_slots,
  COALESCE((SELECT COUNT(*) FROM shifts sh WHERE sh.schedule_week_id = sw.id AND sh.service_id = s.id AND sh.employee_id IS NOT NULL), 0) as filled_slots
FROM schedule_weeks sw
CROSS JOIN services s
LEFT JOIN locations l ON sw.location_id = l.id
WHERE s.is_active = true;

-- ============================================================================
-- COMPLETE
-- ============================================================================
