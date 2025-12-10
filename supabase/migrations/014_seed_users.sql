-- =====================================================
-- SEED FILE: Create Auth Users and Profiles
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: Create Auth Users using Supabase's auth.users
-- NOTE: This uses Supabase's internal function to create users
-- =====================================================

-- Create Marc Mercury (ADMIN)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'Marc.H.Mercury@gmail.com',
  crypt('Gold_1234!', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "Marc", "last_name": "Mercury"}',
  'authenticated',
  'authenticated',
  NOW(),
  NOW(),
  '',
  ''
)
ON CONFLICT (email) DO NOTHING;

-- Create Crystal Barrom (EMPLOYEE)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'crystal.barrom@greendogdental.com',
  crypt('GreenDog2026!', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "Crystal", "last_name": "Barrom"}',
  'authenticated',
  'authenticated',
  NOW(),
  NOW(),
  '',
  ''
)
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- STEP 2: Create Profiles (linked to auth.users)
-- =====================================================

-- Marc Mercury - ADMIN
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

-- Crystal Barrom - USER (Employee level)
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
-- STEP 3: Create identities (required for Supabase Auth)
-- =====================================================

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  id,
  jsonb_build_object('sub', id::text, 'email', email),
  'email',
  id::text,
  NOW(),
  NOW(),
  NOW()
FROM auth.users
WHERE email IN ('Marc.H.Mercury@gmail.com', 'crystal.barrom@greendogdental.com')
ON CONFLICT (provider, provider_id) DO NOTHING;

-- =====================================================
-- STEP 4: Link to Employees table (if records exist)
-- =====================================================

UPDATE employees 
SET profile_id = (SELECT id FROM auth.users WHERE email = 'Marc.H.Mercury@gmail.com')
WHERE LOWER(first_name) = 'marc' AND LOWER(last_name) = 'mercury'
  AND profile_id IS NULL;

UPDATE employees 
SET profile_id = (SELECT id FROM auth.users WHERE email = 'crystal.barrom@greendogdental.com')
WHERE LOWER(first_name) = 'crystal' AND LOWER(last_name) = 'barrom'
  AND profile_id IS NULL;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 
  'AUTH USERS' as table_name,
  email,
  created_at
FROM auth.users 
WHERE email IN ('Marc.H.Mercury@gmail.com', 'crystal.barrom@greendogdental.com');

SELECT 
  'PROFILES' as table_name,
  email,
  first_name,
  last_name,
  role
FROM profiles 
WHERE email IN ('Marc.H.Mercury@gmail.com', 'crystal.barrom@greendogdental.com');
