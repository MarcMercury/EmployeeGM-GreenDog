-- Migration 273: Add marketing_testimonials and event_staff_preferences tables
-- Also adds event staff-related columns to profiles

-- ============================================
-- 1. MARKETING TESTIMONIALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.marketing_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_name TEXT NOT NULL,
  pet_name TEXT,
  pet_type TEXT,
  contact TEXT,
  location_shot TEXT,
  date_shot DATE,
  shot_by TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'editing', 'approved', 'published', 'archived')),
  follow_up TEXT,
  notes TEXT,
  media_urls JSONB DEFAULT '[]',
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.marketing_testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "testimonials_select_authenticated"
  ON public.marketing_testimonials FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "testimonials_insert_admin"
  ON public.marketing_testimonials FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin', 'marketing_admin', 'sup_admin')
    )
  );

CREATE POLICY "testimonials_update_admin"
  ON public.marketing_testimonials FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin', 'marketing_admin', 'sup_admin')
    )
  );

CREATE POLICY "testimonials_delete_admin"
  ON public.marketing_testimonials FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin', 'sup_admin')
    )
  );

-- ============================================
-- 2. EVENT STAFF PREFERENCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.event_staff_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_name TEXT NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  has_car BOOLEAN DEFAULT false,
  is_new_to_events BOOLEAN DEFAULT true,
  can_be_filmed BOOLEAN DEFAULT true,
  is_event_lead BOOLEAN DEFAULT false,
  scheduling_notes TEXT,
  do_not_schedule_with TEXT[],
  preferred_event_types TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_name)
);

-- RLS
ALTER TABLE public.event_staff_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_staff_prefs_select_authenticated"
  ON public.event_staff_preferences FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "event_staff_prefs_insert_admin"
  ON public.event_staff_preferences FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin', 'marketing_admin', 'sup_admin', 'manager')
    )
  );

CREATE POLICY "event_staff_prefs_update_admin"
  ON public.event_staff_preferences FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin', 'marketing_admin', 'sup_admin', 'manager')
    )
  );

CREATE POLICY "event_staff_prefs_delete_admin"
  ON public.event_staff_preferences FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin', 'sup_admin')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_testimonials_status ON public.marketing_testimonials(status);
CREATE INDEX IF NOT EXISTS idx_testimonials_owner ON public.marketing_testimonials(owner_name);
CREATE INDEX IF NOT EXISTS idx_event_staff_prefs_name ON public.event_staff_preferences(staff_name);
CREATE INDEX IF NOT EXISTS idx_event_staff_prefs_profile ON public.event_staff_preferences(profile_id);
