-- =====================================================
-- Add RLS policy for users to update their own employee record
-- =====================================================

-- Allow users to update certain fields on their own employee record
CREATE POLICY "Users can update their own employee record"
  ON public.employees FOR UPDATE
  USING (profile_id = public.current_profile_id())
  WITH CHECK (profile_id = public.current_profile_id());
