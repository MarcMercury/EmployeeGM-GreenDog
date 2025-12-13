-- Migration: Create Admin and Employee Users
-- Run in Supabase SQL Editor or via Supabase CLI

-- =====================================================
-- STEP 1: Create Auth Users (Run in Supabase Dashboard)
-- =====================================================
-- Go to Authentication > Users > Add User
-- 
-- User 1 (ADMIN):
--   Email: Marc.H.Mercury@gmail.com
--   Password: (set your own secure password)
--   
-- User 2 (EMPLOYEE):
--   Email: crystal.barrom@greendogdental.com
--   Password: GreenDog2026!

-- =====================================================
-- STEP 2: Insert/Update Profiles (after auth users exist)
-- =====================================================

-- For Marc Mercury (ADMIN) - will update if exists, insert if not
INSERT INTO profiles (id, email, first_name, last_name, role, created_at, updated_at)
SELECT 
  id,
  'Marc.H.Mercury@gmail.com',
  'Marc',
  'Mercury',
  'admin',
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'Marc.H.Mercury@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  first_name = 'Marc',
  last_name = 'Mercury',
  updated_at = NOW();

-- For Crystal Barrom (EMPLOYEE)
INSERT INTO profiles (id, email, first_name, last_name, role, created_at, updated_at)
SELECT 
  id,
  'crystal.barrom@greendogdental.com',
  'Crystal',
  'Barrom',
  'user',
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'crystal.barrom@greendogdental.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'user',
  first_name = 'Crystal',
  last_name = 'Barrom',
  updated_at = NOW();

-- =====================================================
-- STEP 3: Link to Employees table (if employee record exists)
-- =====================================================

-- Update Marc's employee record to link to profile
UPDATE employees 
SET profile_id = (SELECT id FROM auth.users WHERE email = 'Marc.H.Mercury@gmail.com')
WHERE first_name ILIKE 'Marc' AND last_name ILIKE 'Mercury';

-- Update Crystal's employee record to link to profile  
UPDATE employees 
SET profile_id = (SELECT id FROM auth.users WHERE email = 'crystal.barrom@greendogdental.com')
WHERE first_name ILIKE 'Crystal' AND last_name ILIKE 'Barrom';

-- =====================================================
-- VERIFICATION: Check the results
-- =====================================================
SELECT p.id, p.email, p.first_name, p.last_name, p.role,
       e.id as employee_id, e.first_name as emp_first, e.last_name as emp_last
FROM profiles p
LEFT JOIN employees e ON e.profile_id = p.id
WHERE p.email IN ('Marc.H.Mercury@gmail.com', 'crystal.barrom@greendogdental.com')
   OR p.role = 'admin';
