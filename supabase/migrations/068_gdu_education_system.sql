-- =====================================================
-- Green Dog University (GDU) Education System
-- Creates tables for Visitor CRM, CE Events, and Event Checklists
-- =====================================================

-- =====================================================
-- ENUM TYPES
-- =====================================================

-- Visitor types for education CRM
CREATE TYPE education_visitor_type AS ENUM (
  'intern',
  'extern',
  'student',
  'ce_attendee',
  'shadow',
  'other'
);

-- CE Event format options
CREATE TYPE ce_event_format AS ENUM (
  'live',
  'webinar',
  'hybrid',
  'recorded'
);

-- CE Event status
CREATE TYPE ce_event_status AS ENUM (
  'draft',
  'pending_approval',
  'approved',
  'in_progress',
  'completed',
  'cancelled'
);

-- RACE approval status
CREATE TYPE race_approval_status AS ENUM (
  'not_submitted',
  'pending',
  'approved',
  'denied',
  'not_required'
);

-- Checklist task categories
CREATE TYPE ce_task_category AS ENUM (
  'pre_event_admin',
  'av_tech_setup',
  'attendee_materials',
  'lab_setup',
  'food_refreshments',
  'event_day_operations',
  'post_event_closeout',
  'marketing_followup'
);

-- Checklist task status
CREATE TYPE ce_task_status AS ENUM (
  'not_started',
  'in_progress',
  'completed',
  'blocked',
  'skipped'
);

-- =====================================================
-- EDUCATION VISITORS TABLE
-- CRM for interns, externs, students, and CE attendees
-- =====================================================
CREATE TABLE education_visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  
  -- Visitor Classification
  visitor_type education_visitor_type NOT NULL DEFAULT 'student',
  
  -- Organization
  organization_name TEXT,
  school_of_origin TEXT,
  program_name TEXT,
  
  -- Visit Details
  visit_start_date DATE,
  visit_end_date DATE,
  
  -- Lead Source
  lead_source TEXT,
  referral_name TEXT,
  
  -- Notes and Status
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Linked CE Event (if CE attendee)
  ce_event_id UUID,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- CE EVENTS TABLE
-- Main table for Continuing Education events
-- Based on RACE application structure from PDF
-- =====================================================
CREATE TABLE ce_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ========== EVENT INFORMATION ==========
  title TEXT NOT NULL,
  description TEXT,
  event_date_start DATE NOT NULL,
  event_date_end DATE,
  location_name TEXT,
  location_address TEXT,
  format ce_event_format NOT NULL DEFAULT 'live',
  status ce_event_status NOT NULL DEFAULT 'draft',
  
  -- ========== PROVIDER INFORMATION ==========
  provider_name TEXT DEFAULT 'GreenDog Dental Veterinary Center',
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  organization_type TEXT,
  website TEXT,
  
  -- RACE Provider Status
  race_provider_status race_approval_status DEFAULT 'not_submitted',
  race_provider_number TEXT,
  race_course_number TEXT,
  race_approval_date DATE,
  
  -- VMB Status (California Veterinary Medical Board)
  vmb_approval_status race_approval_status DEFAULT 'not_submitted',
  vmb_approval_number TEXT,
  
  -- ========== COURSE CONTENT ==========
  ce_hours_offered DECIMAL(4,1) NOT NULL DEFAULT 1,
  ce_hours_lecture DECIMAL(4,1) DEFAULT 0,
  ce_hours_lab DECIMAL(4,1) DEFAULT 0,
  
  -- Course Outline (JSON for flexible structure)
  course_outline JSONB DEFAULT '[]'::jsonb,
  
  -- Learning Objectives (array)
  learning_objectives TEXT[],
  
  -- Teaching Methods
  instructional_methods TEXT[], -- 'lecture', 'lab', 'interactive', 'case_discussion', 'q_and_a'
  
  -- Assessment
  has_exam BOOLEAN DEFAULT false,
  has_quiz BOOLEAN DEFAULT false,
  provides_certificate BOOLEAN DEFAULT true,
  attendance_tracking_method TEXT DEFAULT 'sign_in_sheet',
  
  -- ========== SPEAKER INFORMATION ==========
  -- Primary speaker
  speaker_name TEXT,
  speaker_credentials TEXT,
  speaker_biography TEXT,
  speaker_cv_url TEXT,
  
  -- Additional speakers (JSON array)
  additional_speakers JSONB DEFAULT '[]'::jsonb,
  
  -- ========== LOGISTICS ==========
  max_attendees INTEGER,
  current_attendees INTEGER DEFAULT 0,
  registration_url TEXT,
  registration_fee DECIMAL(10,2) DEFAULT 0,
  
  -- Travel/Lodging for speaker
  speaker_travel_confirmed BOOLEAN DEFAULT false,
  speaker_lodging_confirmed BOOLEAN DEFAULT false,
  speaker_honorarium DECIMAL(10,2),
  
  -- Sponsor/Vendor
  sponsors JSONB DEFAULT '[]'::jsonb,
  
  -- ========== LINKED MARKETING EVENT ==========
  marketing_event_id UUID, -- Will link to marketing_events table
  
  -- ========== METADATA ==========
  organizer_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- CE EVENT TASKS TABLE
-- Operational checklist for each CE event
-- Based on GREEN DOG UNIVERSITY — CE EVENT CHECKLIST.pdf
-- =====================================================
CREATE TABLE ce_event_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ce_event_id UUID NOT NULL REFERENCES ce_events(id) ON DELETE CASCADE,
  
  -- Task Details
  category ce_task_category NOT NULL,
  task_name TEXT NOT NULL,
  task_description TEXT,
  sort_order INTEGER DEFAULT 0,
  
  -- Assignment
  primary_assignee_id UUID REFERENCES profiles(id),
  backup_assignee_id UUID REFERENCES profiles(id),
  
  -- Status
  status ce_task_status NOT NULL DEFAULT 'not_started',
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id),
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CE EVENT ATTENDEES TABLE
-- Track attendees for each CE event
-- =====================================================
CREATE TABLE ce_event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ce_event_id UUID NOT NULL REFERENCES ce_events(id) ON DELETE CASCADE,
  
  -- Attendee info (can link to education_visitors)
  visitor_id UUID REFERENCES education_visitors(id),
  
  -- Or standalone attendee info
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  license_number TEXT,
  license_type TEXT, -- 'DVM', 'RVT', etc.
  
  -- Attendance
  checked_in BOOLEAN DEFAULT false,
  check_in_time TIMESTAMPTZ,
  
  -- Certificate
  certificate_issued BOOLEAN DEFAULT false,
  certificate_issued_at TIMESTAMPTZ,
  certificate_number TEXT,
  
  -- Feedback
  feedback_submitted BOOLEAN DEFAULT false,
  feedback_rating INTEGER,
  feedback_comments TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_education_visitors_type ON education_visitors(visitor_type);
CREATE INDEX idx_education_visitors_active ON education_visitors(is_active);
CREATE INDEX idx_education_visitors_dates ON education_visitors(visit_start_date, visit_end_date);

CREATE INDEX idx_ce_events_status ON ce_events(status);
CREATE INDEX idx_ce_events_dates ON ce_events(event_date_start, event_date_end);
CREATE INDEX idx_ce_events_organizer ON ce_events(organizer_id);
CREATE INDEX idx_ce_events_marketing ON ce_events(marketing_event_id);

CREATE INDEX idx_ce_event_tasks_event ON ce_event_tasks(ce_event_id);
CREATE INDEX idx_ce_event_tasks_category ON ce_event_tasks(category);
CREATE INDEX idx_ce_event_tasks_status ON ce_event_tasks(status);
CREATE INDEX idx_ce_event_tasks_assignee ON ce_event_tasks(primary_assignee_id);

CREATE INDEX idx_ce_event_attendees_event ON ce_event_attendees(ce_event_id);
CREATE INDEX idx_ce_event_attendees_visitor ON ce_event_attendees(visitor_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE education_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ce_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ce_event_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ce_event_attendees ENABLE ROW LEVEL SECURITY;

-- Education Visitors policies
CREATE POLICY "Authenticated users can view education visitors"
  ON education_visitors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage education visitors"
  ON education_visitors FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- CE Events policies
CREATE POLICY "Authenticated users can view CE events"
  ON ce_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage CE events"
  ON ce_events FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- CE Event Tasks policies
CREATE POLICY "Authenticated users can view CE event tasks"
  ON ce_event_tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update assigned tasks"
  ON ce_event_tasks FOR UPDATE
  TO authenticated
  USING (
    primary_assignee_id = auth.uid() 
    OR backup_assignee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all CE event tasks"
  ON ce_event_tasks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- CE Event Attendees policies
CREATE POLICY "Authenticated users can view CE event attendees"
  ON ce_event_attendees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage CE event attendees"
  ON ce_event_attendees FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- =====================================================
-- TRIGGERS for updated_at
-- =====================================================
CREATE TRIGGER update_education_visitors_updated_at
  BEFORE UPDATE ON education_visitors
  FOR EACH ROW
  EXECUTE FUNCTION update_marketing_updated_at();

CREATE TRIGGER update_ce_events_updated_at
  BEFORE UPDATE ON ce_events
  FOR EACH ROW
  EXECUTE FUNCTION update_marketing_updated_at();

CREATE TRIGGER update_ce_event_tasks_updated_at
  BEFORE UPDATE ON ce_event_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_marketing_updated_at();

-- =====================================================
-- FUNCTION: Generate checklist tasks for new CE Event
-- =====================================================
CREATE OR REPLACE FUNCTION generate_ce_event_checklist(p_event_id UUID)
RETURNS void AS $$
DECLARE
  v_sort INTEGER := 0;
BEGIN
  -- ========== PRE-EVENT ADMIN ==========
  INSERT INTO ce_event_tasks (ce_event_id, category, task_name, sort_order) VALUES
    (p_event_id, 'pre_event_admin', 'CE syllabus, objectives, and paperwork finalized', v_sort),
    (p_event_id, 'pre_event_admin', 'RACE or VMB application submitted (≥45–60 days in advance)', v_sort + 1),
    (p_event_id, 'pre_event_admin', 'Course agenda & timed itinerary approved by lecturer', v_sort + 2),
    (p_event_id, 'pre_event_admin', 'Speaker credentials (CV, licenses, biography) collected', v_sort + 3),
    (p_event_id, 'pre_event_admin', 'CE approval number received and filed', v_sort + 4),
    (p_event_id, 'pre_event_admin', 'Attendee registration live and functioning (Eventbrite/Form)', v_sort + 5),
    (p_event_id, 'pre_event_admin', 'Automated confirmation emails tested', v_sort + 6),
    (p_event_id, 'pre_event_admin', 'Attendee sign-in sheets and certificate templates prepared', v_sort + 7),
    (p_event_id, 'pre_event_admin', 'Welcome packet created (parking map, area guide, contact info)', v_sort + 8),
    (p_event_id, 'pre_event_admin', 'Marketing launch complete (flyer, email, web calendar, social posts)', v_sort + 9),
    (p_event_id, 'pre_event_admin', 'Pre-event social post and RSVP reminder sent (48 hrs before)', v_sort + 10),
    (p_event_id, 'pre_event_admin', 'Vendor/sponsor partnerships confirmed (logos, payments, food)', v_sort + 11),
    (p_event_id, 'pre_event_admin', 'Speaker travel, lodging, and transport confirmed', v_sort + 12),
    (p_event_id, 'pre_event_admin', 'Equipment or special lecturer requests fulfilled', v_sort + 13),
    (p_event_id, 'pre_event_admin', 'Parking plan finalized; directional signage printed', v_sort + 14),
    (p_event_id, 'pre_event_admin', 'RACE approval signage printed for display onsite', v_sort + 15),
    (p_event_id, 'pre_event_admin', 'CE materials archived in shared drive (retain 4 yrs)', v_sort + 16);

  v_sort := 100;
  -- ========== AV/TECH SETUP ==========
  INSERT INTO ce_event_tasks (ce_event_id, category, task_name, sort_order) VALUES
    (p_event_id, 'av_tech_setup', 'Presenting laptop/computer ready and tested', v_sort),
    (p_event_id, 'av_tech_setup', 'Microphone, speakers, and clicker operational', v_sort + 1),
    (p_event_id, 'av_tech_setup', 'Display screen or projector functioning properly', v_sort + 2),
    (p_event_id, 'av_tech_setup', 'HDMI / USB-C / VGA adapters available', v_sort + 3),
    (p_event_id, 'av_tech_setup', 'Test deck loaded and screen share verified', v_sort + 4),
    (p_event_id, 'av_tech_setup', 'Extension cords, surge protectors, and backup batteries ready', v_sort + 5),
    (p_event_id, 'av_tech_setup', 'Room layout set for attendees (desks/chairs confirmed)', v_sort + 6),
    (p_event_id, 'av_tech_setup', 'Registration desk set (sign-in sheets, name tags, pens)', v_sort + 7),
    (p_event_id, 'av_tech_setup', 'Directional signage posted (Lobby → Lecture → Lab → Restrooms)', v_sort + 8),
    (p_event_id, 'av_tech_setup', 'Lighting and temperature adjusted for comfort', v_sort + 9),
    (p_event_id, 'av_tech_setup', 'Photography/video camera tested for content capture', v_sort + 10),
    (p_event_id, 'av_tech_setup', 'Event signage and branding in place', v_sort + 11);

  v_sort := 200;
  -- ========== ATTENDEE MATERIALS ==========
  INSERT INTO ce_event_tasks (ce_event_id, category, task_name, sort_order) VALUES
    (p_event_id, 'attendee_materials', 'Lecture notes printed and collated', v_sort),
    (p_event_id, 'attendee_materials', 'Branded goody bags assembled (notebook, pen, water, mints)', v_sort + 1),
    (p_event_id, 'attendee_materials', 'Event program printed (agenda, speaker bio, CE info)', v_sort + 2),
    (p_event_id, 'attendee_materials', 'Marketing flyers for future CE events displayed', v_sort + 3),
    (p_event_id, 'attendee_materials', 'Student/externship opportunity signage posted', v_sort + 4),
    (p_event_id, 'attendee_materials', 'Desk/table branding materials set', v_sort + 5),
    (p_event_id, 'attendee_materials', 'Feedback forms printed or QR survey prepared', v_sort + 6);

  v_sort := 300;
  -- ========== LAB SETUP ==========
  INSERT INTO ce_event_tasks (ce_event_id, category, task_name, sort_order) VALUES
    (p_event_id, 'lab_setup', 'Instructor demonstration station prepared', v_sort),
    (p_event_id, 'lab_setup', 'Demo specimen/model/cadaver ready and stored properly', v_sort + 1),
    (p_event_id, 'lab_setup', 'Macro-lens camera → TV/monitor tested', v_sort + 2),
    (p_event_id, 'lab_setup', 'Suction, air, and lighting confirmed operational', v_sort + 3),
    (p_event_id, 'lab_setup', 'Biohazard & sharps containers placed and labeled', v_sort + 4),
    (p_event_id, 'lab_setup', 'Adequate disinfectant and surface cleaner stocked', v_sort + 5),
    (p_event_id, 'lab_setup', 'Tables arranged and covered for each attendee', v_sort + 6),
    (p_event_id, 'lab_setup', 'Complete instrument kits per attendee checked', v_sort + 7),
    (p_event_id, 'lab_setup', 'PPE stocked (masks, caps, gloves, gowns)', v_sort + 8),
    (p_event_id, 'lab_setup', 'Cadaver heads/models available if applicable', v_sort + 9),
    (p_event_id, 'lab_setup', 'Sutures, gauze, burs, distilled water stocked', v_sort + 10),
    (p_event_id, 'lab_setup', 'Instrument sterilization flow mapped', v_sort + 11),
    (p_event_id, 'lab_setup', 'Waste & sharps disposal plan reviewed', v_sort + 12),
    (p_event_id, 'lab_setup', 'Lab signage for safety and PPE posted', v_sort + 13);

  v_sort := 400;
  -- ========== FOOD & REFRESHMENTS ==========
  INSERT INTO ce_event_tasks (ce_event_id, category, task_name, sort_order) VALUES
    (p_event_id, 'food_refreshments', 'Dietary restrictions gathered from attendees', v_sort),
    (p_event_id, 'food_refreshments', 'Coffee, cold brew, and kombucha stocked/tested', v_sort + 1),
    (p_event_id, 'food_refreshments', 'Breakfast items ready before start', v_sort + 2),
    (p_event_id, 'food_refreshments', 'Lunch order confirmed ≥ 24 hours prior', v_sort + 3),
    (p_event_id, 'food_refreshments', 'Lunch delivery or pickup scheduled and timed', v_sort + 4),
    (p_event_id, 'food_refreshments', 'Trash bins and cleanup plan arranged', v_sort + 5),
    (p_event_id, 'food_refreshments', 'Farewell dinner or happy-hour location confirmed (≥ 48 hrs prior)', v_sort + 6),
    (p_event_id, 'food_refreshments', 'Attendee count confirmed and transport planned', v_sort + 7),
    (p_event_id, 'food_refreshments', 'Payment method for meals confirmed', v_sort + 8),
    (p_event_id, 'food_refreshments', 'Post-meal cleanup plan completed', v_sort + 9);

  v_sort := 500;
  -- ========== EVENT DAY OPERATIONS ==========
  INSERT INTO ce_event_tasks (ce_event_id, category, task_name, sort_order) VALUES
    (p_event_id, 'event_day_operations', 'Staff briefed on day-of flow and assignments', v_sort),
    (p_event_id, 'event_day_operations', 'Welcome desk open 30 minutes before start', v_sort + 1),
    (p_event_id, 'event_day_operations', 'Attendee check-in active and running smoothly', v_sort + 2),
    (p_event_id, 'event_day_operations', 'Speaker arrival and setup confirmed', v_sort + 3),
    (p_event_id, 'event_day_operations', 'Attendance tracked for CE credit compliance', v_sort + 4),
    (p_event_id, 'event_day_operations', 'Photographer capturing lecture, lab, and group photos', v_sort + 5),
    (p_event_id, 'event_day_operations', 'AV support monitoring slides and sound during lecture', v_sort + 6),
    (p_event_id, 'event_day_operations', 'Lab runners maintaining PPE, instruments, sterilization flow', v_sort + 7),
    (p_event_id, 'event_day_operations', 'Hospitality area replenished during breaks', v_sort + 8),
    (p_event_id, 'event_day_operations', 'Directional signage visible throughout venue', v_sort + 9),
    (p_event_id, 'event_day_operations', 'Midday schedule check (timing, food, supplies)', v_sort + 10),
    (p_event_id, 'event_day_operations', 'Safety walkthrough performed (lab + lecture areas)', v_sort + 11),
    (p_event_id, 'event_day_operations', 'End-of-day cleanup checklist completed', v_sort + 12);

  v_sort := 600;
  -- ========== POST-EVENT CLOSEOUT ==========
  INSERT INTO ce_event_tasks (ce_event_id, category, task_name, sort_order) VALUES
    (p_event_id, 'post_event_closeout', 'Attendance verified and logged', v_sort),
    (p_event_id, 'post_event_closeout', 'Certificates issued or emailed', v_sort + 1),
    (p_event_id, 'post_event_closeout', 'CE records archived (min 4 yrs)', v_sort + 2),
    (p_event_id, 'post_event_closeout', 'Speaker thank-you sent; honorarium processed', v_sort + 3),
    (p_event_id, 'post_event_closeout', 'Photo/video selects uploaded to shared folder', v_sort + 4),
    (p_event_id, 'post_event_closeout', 'Recap post created for social media & website', v_sort + 5),
    (p_event_id, 'post_event_closeout', 'Post-event thank-you email with photo link sent', v_sort + 6),
    (p_event_id, 'post_event_closeout', 'Feedback survey distributed', v_sort + 7),
    (p_event_id, 'post_event_closeout', 'Feedback reviewed and key insights logged', v_sort + 8),
    (p_event_id, 'post_event_closeout', 'Internal debrief held (what worked / what to improve)', v_sort + 9),
    (p_event_id, 'post_event_closeout', 'Supplies inventoried & restocked', v_sort + 10),
    (p_event_id, 'post_event_closeout', 'Waste & sharps disposed per protocol', v_sort + 11),
    (p_event_id, 'post_event_closeout', 'Event added to CE Historical Log', v_sort + 12),
    (p_event_id, 'post_event_closeout', 'Recap + assets added to CE web page', v_sort + 13);

  v_sort := 700;
  -- ========== MARKETING & CONTINUITY FOLLOW-UP ==========
  INSERT INTO ce_event_tasks (ce_event_id, category, task_name, sort_order) VALUES
    (p_event_id, 'marketing_followup', 'Photos shared with Marketing Team', v_sort),
    (p_event_id, 'marketing_followup', 'Quotes/testimonials pulled from feedback forms', v_sort + 1),
    (p_event_id, 'marketing_followup', 'Upcoming CE events promoted in recap', v_sort + 2),
    (p_event_id, 'marketing_followup', 'Media recap posted to Slack / Green Dog University channels', v_sort + 3),
    (p_event_id, 'marketing_followup', 'Metrics logged (attendees, CE credits, total hours taught)', v_sort + 4),
    (p_event_id, 'marketing_followup', 'Files backed up (slides, certificates, agenda, approvals)', v_sort + 5);

END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Auto-generate checklist when CE event created
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_generate_ce_checklist()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate checklist tasks for the new event
  PERFORM generate_ce_event_checklist(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ce_event_generate_checklist
  AFTER INSERT ON ce_events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_ce_checklist();

-- =====================================================
-- TRIGGER: Send notification when task completed
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_ce_task_completed_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_event_title TEXT;
  v_organizer_id UUID;
BEGIN
  -- Only trigger when status changes TO 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get the event details
    SELECT title, organizer_id INTO v_event_title, v_organizer_id
    FROM ce_events
    WHERE id = NEW.ce_event_id;
    
    -- Set completion timestamp
    NEW.completed_at := NOW();
    NEW.completed_by := auth.uid();
    
    -- Create notification for the event organizer
    IF v_organizer_id IS NOT NULL THEN
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        link_url,
        created_at
      ) VALUES (
        v_organizer_id,
        'CE Task Completed',
        'Task "' || NEW.task_name || '" completed for event: ' || v_event_title,
        'success',
        '/gdu/events/' || NEW.ce_event_id,
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER ce_task_completed_notify
  BEFORE UPDATE ON ce_event_tasks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_ce_task_completed_notification();

-- =====================================================
-- Add foreign key for education_visitors.ce_event_id
-- =====================================================
ALTER TABLE education_visitors 
  ADD CONSTRAINT fk_education_visitors_ce_event 
  FOREIGN KEY (ce_event_id) REFERENCES ce_events(id) ON DELETE SET NULL;
