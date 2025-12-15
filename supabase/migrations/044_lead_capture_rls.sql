-- =====================================================
-- Migration 044: Lead Capture RLS for Anonymous Inserts
-- =====================================================
-- Purpose: Allow unauthenticated (anonymous) users to submit
-- leads via public QR code forms while restricting read access
-- to authenticated admins only.
-- =====================================================

-- =====================================================
-- PART 1: ENABLE RLS ON MARKETING_LEADS
-- =====================================================

ALTER TABLE public.marketing_leads ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 2: DROP EXISTING POLICIES (if any)
-- =====================================================

DROP POLICY IF EXISTS "Admins can view all leads" ON public.marketing_leads;
DROP POLICY IF EXISTS "Admins can manage leads" ON public.marketing_leads;
DROP POLICY IF EXISTS "Anyone can insert leads" ON public.marketing_leads;
DROP POLICY IF EXISTS "anon_insert_leads" ON public.marketing_leads;
DROP POLICY IF EXISTS "authenticated_manage_leads" ON public.marketing_leads;

-- =====================================================
-- PART 3: CREATE NEW RLS POLICIES
-- =====================================================

-- Policy 1: Allow ANYONE (including anonymous) to INSERT leads
-- This is required for the public QR code lead capture form
CREATE POLICY "anon_insert_leads" ON public.marketing_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy 2: Only authenticated users can SELECT (view) leads
CREATE POLICY "authenticated_select_leads" ON public.marketing_leads
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 3: Only authenticated users can UPDATE leads
CREATE POLICY "authenticated_update_leads" ON public.marketing_leads
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy 4: Only authenticated users can DELETE leads
CREATE POLICY "authenticated_delete_leads" ON public.marketing_leads
  FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- PART 4: ALSO ALLOW ANON TO READ EVENTS (for validation)
-- =====================================================

-- Drop existing policies on marketing_events if any
DROP POLICY IF EXISTS "anon_select_events" ON public.marketing_events;

-- The public capture form needs to validate the event exists
-- Allow anonymous users to read basic event info
CREATE POLICY "anon_select_events" ON public.marketing_events
  FOR SELECT
  TO anon
  USING (status IN ('confirmed', 'tentative', 'completed'));

-- =====================================================
-- VERIFICATION COMMENT
-- =====================================================
-- Test anonymous insert:
-- 1. Sign out of the app
-- 2. Visit /public/lead-capture/[eventId]
-- 3. Submit the form
-- 4. Lead should be inserted successfully
--
-- Test read protection:
-- 1. As anonymous user, try to SELECT from marketing_leads
-- 2. Should return empty set (no rows visible)
--
-- Test admin access:
-- 1. Sign in as admin
-- 2. View leads page - should see all leads
