-- =====================================================
-- SEED DATA: Admin User - Marc Mercury
-- =====================================================
-- 
-- STEP 1: Create user in Supabase Dashboard
-- Go to: Authentication → Users → "Add User"
--   Email: Marc.h.mercury@gmail.com
--   Password: Gold_1234!
--   Check: "Auto Confirm User"
--   Click: "Create User"
--
-- STEP 2: Run THIS SQL in SQL Editor to make admin
-- =====================================================

-- Make Marc Mercury an admin (updates the profile created by auth trigger)
UPDATE public.profiles
SET 
  first_name = 'Marc',
  last_name = 'Mercury',
  role = 'admin'
WHERE email = 'Marc.h.mercury@gmail.com';

-- Verify it worked:
-- SELECT * FROM public.profiles WHERE email = 'Marc.h.mercury@gmail.com';
