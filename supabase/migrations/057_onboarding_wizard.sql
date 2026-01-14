-- =====================================================
-- Migration: Enhanced Onboarding Wizard System
-- Description: Comprehensive onboarding workflow with stages,
--   templates, task tracking, asset assignment, and notifications
-- =====================================================

-- =====================================================
-- STEP 1: Create onboarding_templates table
-- Defines reusable onboarding workflows by position/department
-- =====================================================

CREATE TABLE IF NOT EXISTS public.onboarding_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  position_id UUID REFERENCES public.job_positions(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one default template allowed
CREATE UNIQUE INDEX IF NOT EXISTS idx_onboarding_templates_default 
  ON public.onboarding_templates(is_default) WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_onboarding_templates_position ON public.onboarding_templates(position_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_templates_department ON public.onboarding_templates(department_id);

-- =====================================================
-- STEP 2: Create onboarding_stages table
-- Defines stages within a template (e.g., Profile Setup, Paperwork)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.onboarding_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.onboarding_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'mdi-clipboard-check',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_stages_template ON public.onboarding_stages(template_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_stages_order ON public.onboarding_stages(template_id, sort_order);

-- =====================================================
-- STEP 3: Create onboarding_task_templates table
-- Individual tasks within each stage
-- =====================================================

CREATE TABLE IF NOT EXISTS public.onboarding_task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES public.onboarding_stages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'checkbox' CHECK (task_type IN (
    'checkbox',      -- Simple completion
    'document',      -- Requires document upload
    'signature',     -- Requires signature/acknowledgment
    'form',          -- Requires form completion
    'assignment',    -- Asset assignment
    'notification',  -- Send notification to employee
    'date'           -- Set a date (e.g., start date)
  )),
  is_required BOOLEAN DEFAULT true,
  requires_upload BOOLEAN DEFAULT false,
  document_category TEXT, -- For document tasks
  notify_on_complete BOOLEAN DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  estimated_minutes INTEGER, -- How long this task typically takes
  instructions TEXT, -- Detailed instructions for completing the task
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_task_templates_stage ON public.onboarding_task_templates(stage_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_task_templates_order ON public.onboarding_task_templates(stage_id, sort_order);

-- =====================================================
-- STEP 4: Create candidate_onboarding table
-- Tracks onboarding progress for each candidate
-- =====================================================

CREATE TABLE IF NOT EXISTS public.candidate_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.onboarding_templates(id) ON DELETE SET NULL,
  current_stage_id UUID REFERENCES public.onboarding_stages(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN (
    'not_started', 'in_progress', 'paused', 'completed', 'cancelled'
  )),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- HR/Admin assigned
  target_start_date DATE, -- When new hire should start
  actual_start_date DATE, -- When they actually started
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(candidate_id) -- One onboarding per candidate
);

CREATE INDEX IF NOT EXISTS idx_candidate_onboarding_candidate ON public.candidate_onboarding(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_onboarding_status ON public.candidate_onboarding(status);
CREATE INDEX IF NOT EXISTS idx_candidate_onboarding_assigned ON public.candidate_onboarding(assigned_to);
CREATE INDEX IF NOT EXISTS idx_candidate_onboarding_template ON public.candidate_onboarding(template_id);

-- =====================================================
-- STEP 5: Create candidate_onboarding_tasks table
-- Tracks individual task completion for each candidate
-- =====================================================

CREATE TABLE IF NOT EXISTS public.candidate_onboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id UUID NOT NULL REFERENCES public.candidate_onboarding(id) ON DELETE CASCADE,
  task_template_id UUID REFERENCES public.onboarding_task_templates(id) ON DELETE SET NULL,
  stage_id UUID NOT NULL REFERENCES public.onboarding_stages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'checkbox',
  is_required BOOLEAN DEFAULT true,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  document_id UUID REFERENCES public.candidate_documents(id) ON DELETE SET NULL, -- For document tasks
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidate_onboarding_tasks_onboarding ON public.candidate_onboarding_tasks(onboarding_id);
CREATE INDEX IF NOT EXISTS idx_candidate_onboarding_tasks_stage ON public.candidate_onboarding_tasks(stage_id);
CREATE INDEX IF NOT EXISTS idx_candidate_onboarding_tasks_completed ON public.candidate_onboarding_tasks(is_completed);

-- =====================================================
-- STEP 6: Create or extend employee_assets table
-- Track equipment/assets assigned to employees
-- =====================================================

CREATE TABLE IF NOT EXISTS public.employee_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  asset_type TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add columns that may not exist
ALTER TABLE public.employee_assets ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES public.candidates(id) ON DELETE SET NULL;
ALTER TABLE public.employee_assets ADD COLUMN IF NOT EXISTS asset_description TEXT;
ALTER TABLE public.employee_assets ADD COLUMN IF NOT EXISTS serial_number TEXT;
ALTER TABLE public.employee_assets ADD COLUMN IF NOT EXISTS returned_date DATE;
ALTER TABLE public.employee_assets ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'new';
ALTER TABLE public.employee_assets ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.employee_assets ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Drop and recreate constraint if needed
ALTER TABLE public.employee_assets DROP CONSTRAINT IF EXISTS employee_assets_asset_type_check;
ALTER TABLE public.employee_assets ADD CONSTRAINT employee_assets_asset_type_check 
  CHECK (asset_type IN ('laptop', 'phone', 'tablet', 'uniform', 'badge', 'keys', 'vehicle', 'equipment', 'other'));

ALTER TABLE public.employee_assets DROP CONSTRAINT IF EXISTS employee_assets_condition_check;
ALTER TABLE public.employee_assets ADD CONSTRAINT employee_assets_condition_check 
  CHECK (condition IN ('new', 'good', 'fair', 'poor'));

CREATE INDEX IF NOT EXISTS idx_employee_assets_employee ON public.employee_assets(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_assets_candidate ON public.employee_assets(candidate_id);
CREATE INDEX IF NOT EXISTS idx_employee_assets_type ON public.employee_assets(asset_type);

-- =====================================================
-- STEP 7: Create onboarding_notifications table
-- Track notifications sent during onboarding
-- =====================================================

CREATE TABLE IF NOT EXISTS public.onboarding_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id UUID NOT NULL REFERENCES public.candidate_onboarding(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.candidate_onboarding_tasks(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'welcome', 'task_reminder', 'stage_complete', 'document_request',
    'policy_sent', 'onboarding_complete', 'start_date_reminder', 'custom'
  )),
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('candidate', 'admin', 'manager', 'hr')),
  recipient_email TEXT,
  subject TEXT NOT NULL,
  body TEXT,
  sent_at TIMESTAMPTZ,
  is_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_notifications_onboarding ON public.onboarding_notifications(onboarding_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_notifications_sent ON public.onboarding_notifications(is_sent);

-- =====================================================
-- STEP 8: Enable RLS on all new tables
-- =====================================================

ALTER TABLE public.onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_onboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for onboarding_templates
DROP POLICY IF EXISTS "Admins can manage onboarding templates" ON public.onboarding_templates;
CREATE POLICY "Admins can manage onboarding templates"
ON public.onboarding_templates FOR ALL
USING (public.is_admin());

-- RLS Policies for onboarding_stages
DROP POLICY IF EXISTS "Admins can manage onboarding stages" ON public.onboarding_stages;
CREATE POLICY "Admins can manage onboarding stages"
ON public.onboarding_stages FOR ALL
USING (public.is_admin());

-- RLS Policies for onboarding_task_templates
DROP POLICY IF EXISTS "Admins can manage onboarding task templates" ON public.onboarding_task_templates;
CREATE POLICY "Admins can manage onboarding task templates"
ON public.onboarding_task_templates FOR ALL
USING (public.is_admin());

-- RLS Policies for candidate_onboarding
DROP POLICY IF EXISTS "Admins can manage candidate onboarding" ON public.candidate_onboarding;
CREATE POLICY "Admins can manage candidate onboarding"
ON public.candidate_onboarding FOR ALL
USING (public.is_admin());

-- RLS Policies for candidate_onboarding_tasks
DROP POLICY IF EXISTS "Admins can manage candidate onboarding tasks" ON public.candidate_onboarding_tasks;
CREATE POLICY "Admins can manage candidate onboarding tasks"
ON public.candidate_onboarding_tasks FOR ALL
USING (public.is_admin());

-- RLS Policies for employee_assets
DROP POLICY IF EXISTS "Admins can manage employee assets" ON public.employee_assets;
CREATE POLICY "Admins can manage employee assets"
ON public.employee_assets FOR ALL
USING (public.is_admin());

-- RLS Policies for onboarding_notifications
DROP POLICY IF EXISTS "Admins can manage onboarding notifications" ON public.onboarding_notifications;
CREATE POLICY "Admins can manage onboarding notifications"
ON public.onboarding_notifications FOR ALL
USING (public.is_admin());

-- =====================================================
-- STEP 9: Create triggers for notifications
-- =====================================================

-- Trigger: Notify when onboarding status changes
CREATE OR REPLACE FUNCTION public.trigger_onboarding_status_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- When onboarding starts
  IF NEW.status = 'in_progress' AND (OLD.status IS NULL OR OLD.status = 'not_started') THEN
    INSERT INTO public.notifications (profile_id, type, title, message, link)
    SELECT 
      p.id,
      'onboarding_started',
      'New Onboarding Started',
      'Onboarding has started for ' || c.first_name || ' ' || c.last_name,
      '/recruiting/onboarding/' || NEW.id
    FROM public.candidates c
    CROSS JOIN public.profiles p
    WHERE c.id = NEW.candidate_id
    AND p.role = 'admin';
  END IF;

  -- When onboarding completes
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO public.notifications (profile_id, type, title, message, link)
    SELECT 
      p.id,
      'onboarding_completed',
      'Onboarding Completed',
      c.first_name || ' ' || c.last_name || ' has completed onboarding!',
      '/recruiting/onboarding/' || NEW.id
    FROM public.candidates c
    CROSS JOIN public.profiles p
    WHERE c.id = NEW.candidate_id
    AND p.role = 'admin';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_onboarding_status_notification ON public.candidate_onboarding;
CREATE TRIGGER trigger_onboarding_status_notification
  AFTER INSERT OR UPDATE OF status ON public.candidate_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_onboarding_status_notification();

-- Trigger: Notify when a stage is completed
CREATE OR REPLACE FUNCTION public.trigger_onboarding_stage_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_stage_name TEXT;
  v_candidate_name TEXT;
  v_onboarding_id UUID;
BEGIN
  -- Check if all required tasks in the stage are now complete
  IF NEW.is_completed = true AND (OLD.is_completed IS NULL OR OLD.is_completed = false) THEN
    -- Get stage and candidate info
    SELECT 
      s.name,
      c.first_name || ' ' || c.last_name,
      co.id
    INTO v_stage_name, v_candidate_name, v_onboarding_id
    FROM public.candidate_onboarding_tasks cot
    JOIN public.candidate_onboarding co ON cot.onboarding_id = co.id
    JOIN public.candidates c ON co.candidate_id = c.id
    JOIN public.onboarding_stages s ON cot.stage_id = s.id
    WHERE cot.id = NEW.id;

    -- Check if all required tasks in this stage are complete
    IF NOT EXISTS (
      SELECT 1 FROM public.candidate_onboarding_tasks
      WHERE onboarding_id = NEW.onboarding_id
      AND stage_id = NEW.stage_id
      AND is_required = true
      AND is_completed = false
    ) THEN
      -- All tasks in stage complete - send notification
      INSERT INTO public.notifications (profile_id, type, title, message, link)
      SELECT 
        p.id,
        'onboarding_stage_complete',
        'Onboarding Stage Completed',
        v_candidate_name || ' completed the "' || v_stage_name || '" stage',
        '/recruiting/onboarding/' || v_onboarding_id
      FROM public.profiles p
      WHERE p.role = 'admin';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_onboarding_stage_complete ON public.candidate_onboarding_tasks;
CREATE TRIGGER trigger_onboarding_stage_complete
  AFTER UPDATE OF is_completed ON public.candidate_onboarding_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_onboarding_stage_complete();

-- =====================================================
-- STEP 10: Seed default onboarding template
-- =====================================================

-- Create default template
INSERT INTO public.onboarding_templates (id, name, description, is_default, is_active)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Standard Onboarding',
  'Default onboarding workflow for all new employees',
  true,
  true
) ON CONFLICT DO NOTHING;

-- Create stages for default template
INSERT INTO public.onboarding_stages (id, template_id, name, description, icon, sort_order)
VALUES 
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Profile Setup', 'Complete the employee profile with all required information', 'mdi-account-edit', 1),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Documentation', 'Collect and verify required employment documents', 'mdi-file-document-multiple', 2),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Policies & Agreements', 'Send and track policy acknowledgments', 'mdi-clipboard-check', 3),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Equipment & Access', 'Assign equipment and set up system access', 'mdi-laptop', 4),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Training & Orientation', 'Schedule and complete orientation training', 'mdi-school', 5)
ON CONFLICT DO NOTHING;

-- Create tasks for Profile Setup stage
INSERT INTO public.onboarding_task_templates (stage_id, name, description, task_type, is_required, sort_order, notify_on_complete)
VALUES 
  ('b0000000-0000-0000-0000-000000000001', 'Verify Personal Information', 'Confirm name, address, phone, and emergency contact', 'checkbox', true, 1, false),
  ('b0000000-0000-0000-0000-000000000001', 'Upload Photo', 'Upload employee photo for badge and profile', 'document', false, 2, false),
  ('b0000000-0000-0000-0000-000000000001', 'Set Start Date', 'Confirm official start date', 'date', true, 3, true),
  ('b0000000-0000-0000-0000-000000000001', 'Assign Department & Position', 'Confirm department and job position', 'checkbox', true, 4, false),
  ('b0000000-0000-0000-0000-000000000001', 'Assign Manager', 'Set direct supervisor/manager', 'checkbox', true, 5, false)
ON CONFLICT DO NOTHING;

-- Create tasks for Documentation stage
INSERT INTO public.onboarding_task_templates (stage_id, name, description, task_type, is_required, requires_upload, document_category, sort_order, notify_on_complete)
VALUES 
  ('b0000000-0000-0000-0000-000000000002', 'I-9 Employment Verification', 'Complete and verify I-9 form', 'document', true, true, 'general', 1, true),
  ('b0000000-0000-0000-0000-000000000002', 'W-4 Tax Form', 'Complete federal tax withholding form', 'document', true, true, 'general', 2, false),
  ('b0000000-0000-0000-0000-000000000002', 'Direct Deposit Form', 'Set up payroll direct deposit', 'document', false, true, 'general', 3, false),
  ('b0000000-0000-0000-0000-000000000002', 'Background Check Complete', 'Verify background check has cleared', 'checkbox', true, false, NULL, 4, true),
  ('b0000000-0000-0000-0000-000000000002', 'Licenses & Certifications', 'Upload required professional licenses', 'document', false, true, 'license', 5, false)
ON CONFLICT DO NOTHING;

-- Create tasks for Policies stage
INSERT INTO public.onboarding_task_templates (stage_id, name, description, task_type, is_required, sort_order, notify_on_complete)
VALUES 
  ('b0000000-0000-0000-0000-000000000003', 'Employee Handbook', 'Send and confirm receipt of employee handbook', 'notification', true, 1, true),
  ('b0000000-0000-0000-0000-000000000003', 'Handbook Acknowledgment', 'Employee acknowledges reading handbook', 'signature', true, 2, true),
  ('b0000000-0000-0000-0000-000000000003', 'HIPAA Training', 'Complete HIPAA privacy training', 'checkbox', true, 3, true),
  ('b0000000-0000-0000-0000-000000000003', 'Safety Policies', 'Review and acknowledge safety policies', 'signature', true, 4, false),
  ('b0000000-0000-0000-0000-000000000003', 'Code of Conduct', 'Review and sign code of conduct agreement', 'signature', true, 5, false)
ON CONFLICT DO NOTHING;

-- Create tasks for Equipment stage
INSERT INTO public.onboarding_task_templates (stage_id, name, description, task_type, is_required, sort_order, notify_on_complete)
VALUES 
  ('b0000000-0000-0000-0000-000000000004', 'Order Uniforms', 'Order and deliver work uniforms', 'assignment', true, 1, false),
  ('b0000000-0000-0000-0000-000000000004', 'Create Work Email', 'Set up company email account', 'checkbox', true, 2, true),
  ('b0000000-0000-0000-0000-000000000004', 'Issue Employee Badge', 'Create and issue employee ID badge', 'assignment', true, 3, false),
  ('b0000000-0000-0000-0000-000000000004', 'Set Up System Access', 'Create login credentials for required systems', 'checkbox', true, 4, true),
  ('b0000000-0000-0000-0000-000000000004', 'Assign Equipment', 'Issue laptop, phone, or other equipment', 'assignment', false, 5, false)
ON CONFLICT DO NOTHING;

-- Create tasks for Training stage
INSERT INTO public.onboarding_task_templates (stage_id, name, description, task_type, is_required, sort_order, notify_on_complete)
VALUES 
  ('b0000000-0000-0000-0000-000000000005', 'Schedule Orientation', 'Set date for new employee orientation', 'date', true, 1, false),
  ('b0000000-0000-0000-0000-000000000005', 'Complete Orientation', 'Attend and complete orientation session', 'checkbox', true, 2, true),
  ('b0000000-0000-0000-0000-000000000005', 'Meet the Team', 'Introduction to team members and department', 'checkbox', true, 3, false),
  ('b0000000-0000-0000-0000-000000000005', 'Role-Specific Training', 'Complete job-specific training modules', 'checkbox', true, 4, true),
  ('b0000000-0000-0000-0000-000000000005', 'First Week Check-in', 'Schedule check-in meeting after first week', 'date', false, 5, false)
ON CONFLICT DO NOTHING;

-- =====================================================
-- STEP 11: Helper function to start onboarding for a candidate
-- =====================================================

CREATE OR REPLACE FUNCTION public.start_candidate_onboarding(
  p_candidate_id UUID,
  p_template_id UUID DEFAULT NULL,
  p_assigned_to UUID DEFAULT NULL,
  p_target_start_date DATE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_template_id UUID;
  v_onboarding_id UUID;
  v_first_stage_id UUID;
BEGIN
  -- Get template (use provided or default)
  IF p_template_id IS NOT NULL THEN
    v_template_id := p_template_id;
  ELSE
    SELECT id INTO v_template_id
    FROM public.onboarding_templates
    WHERE is_default = true AND is_active = true
    LIMIT 1;
  END IF;

  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'No onboarding template found';
  END IF;

  -- Get first stage
  SELECT id INTO v_first_stage_id
  FROM public.onboarding_stages
  WHERE template_id = v_template_id
  ORDER BY sort_order
  LIMIT 1;

  -- Create candidate_onboarding record
  INSERT INTO public.candidate_onboarding (
    candidate_id,
    template_id,
    current_stage_id,
    status,
    started_at,
    assigned_to,
    target_start_date,
    created_by
  ) VALUES (
    p_candidate_id,
    v_template_id,
    v_first_stage_id,
    'in_progress',
    NOW(),
    p_assigned_to,
    p_target_start_date,
    p_assigned_to
  )
  RETURNING id INTO v_onboarding_id;

  -- Copy all tasks from template to candidate
  INSERT INTO public.candidate_onboarding_tasks (
    onboarding_id,
    task_template_id,
    stage_id,
    name,
    description,
    task_type,
    is_required,
    sort_order
  )
  SELECT 
    v_onboarding_id,
    tt.id,
    s.id,
    tt.name,
    tt.description,
    tt.task_type,
    tt.is_required,
    tt.sort_order
  FROM public.onboarding_task_templates tt
  JOIN public.onboarding_stages s ON tt.stage_id = s.id
  WHERE s.template_id = v_template_id
  ORDER BY s.sort_order, tt.sort_order;

  RETURN v_onboarding_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.start_candidate_onboarding TO authenticated;

-- =====================================================
-- STEP 12: Updated timestamp triggers
-- =====================================================

-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_onboarding_templates_updated_at
  BEFORE UPDATE ON public.onboarding_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_onboarding_stages_updated_at
  BEFORE UPDATE ON public.onboarding_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_onboarding_task_templates_updated_at
  BEFORE UPDATE ON public.onboarding_task_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_candidate_onboarding_updated_at
  BEFORE UPDATE ON public.candidate_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_candidate_onboarding_tasks_updated_at
  BEFORE UPDATE ON public.candidate_onboarding_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_assets_updated_at
  BEFORE UPDATE ON public.employee_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
