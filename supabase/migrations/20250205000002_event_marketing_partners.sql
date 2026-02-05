-- =====================================================
-- MIGRATION 202: Event Marketing Partners Junction Table  
-- =====================================================
-- Creates a junction table to link marketing events with
-- marketing partners (vendors, rescues, chambers, etc.)
-- =====================================================

-- Create junction table
CREATE TABLE IF NOT EXISTS public.event_marketing_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.marketing_events(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.marketing_partners(id) ON DELETE CASCADE,
  
  -- Participation details
  role TEXT DEFAULT 'vendor' CHECK (role IN (
    'vendor', 'sponsor', 'rescue', 'food_vendor', 
    'entertainment', 'donor', 'volunteer', 'host', 'speaker', 'exhibitor', 'chamber', 'other'
  )),
  booth_info TEXT,
  notes TEXT,
  
  -- Status
  is_confirmed BOOLEAN DEFAULT false,
  
  -- Tracking
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate entries
  UNIQUE(event_id, partner_id)
);

-- Enable RLS
ALTER TABLE public.event_marketing_partners ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "event_marketing_partners_view" ON public.event_marketing_partners;
DROP POLICY IF EXISTS "event_marketing_partners_admin_all" ON public.event_marketing_partners;
DROP POLICY IF EXISTS "event_marketing_partners_marketing_admin_all" ON public.event_marketing_partners;

-- Policies
CREATE POLICY "event_marketing_partners_view" ON public.event_marketing_partners
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "event_marketing_partners_marketing_admin_all" ON public.event_marketing_partners
  FOR ALL TO authenticated
  USING (public.is_marketing_admin())
  WITH CHECK (public.is_marketing_admin());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_marketing_partners_event_id ON public.event_marketing_partners(event_id);
CREATE INDEX IF NOT EXISTS idx_event_marketing_partners_partner_id ON public.event_marketing_partners(partner_id);

-- Grants
GRANT ALL ON public.event_marketing_partners TO authenticated;

-- Comments
COMMENT ON TABLE public.event_marketing_partners IS 'Junction table linking marketing events with marketing partners (vendors, sponsors, rescues, etc.)';
COMMENT ON COLUMN public.event_marketing_partners.role IS 'Role of the partner at the event';
