-- =====================================================
-- SEED FILE: Create Auth Users and Profiles
-- =====================================================
-- Schema Note: profiles.auth_user_id links to auth.users.id
-- profiles.id is auto-generated UUID (separate from auth user id)
-- =====================================================

-- =====================================================
-- STEP 1: Create Auth Users (idempotent - skip if exists)
-- =====================================================

DO $$
DECLARE
  marc_user_id UUID;
  crystal_user_id UUID;
BEGIN
  -- Check if Marc Mercury exists
  SELECT id INTO marc_user_id FROM auth.users WHERE email = 'Marc.H.Mercury@gmail.com';
  
  IF marc_user_id IS NULL THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, aud, role,
      created_at, updated_at, confirmation_token, recovery_token
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'Marc.H.Mercury@gmail.com',
      crypt('Gold_1234!', gen_salt('bf')),
      NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"first_name": "Marc", "last_name": "Mercury"}',
      'authenticated', 'authenticated',
      NOW(), NOW(), '', ''
    ) RETURNING id INTO marc_user_id;
    RAISE NOTICE 'Created auth user for Marc Mercury: %', marc_user_id;
  ELSE
    RAISE NOTICE 'Auth user for Marc Mercury already exists: %', marc_user_id;
  END IF;

  -- Check if Crystal Barrom exists
  SELECT id INTO crystal_user_id FROM auth.users WHERE email = 'crystal.barrom@greendogdental.com';
  
  IF crystal_user_id IS NULL THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, aud, role,
      created_at, updated_at, confirmation_token, recovery_token
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'crystal.barrom@greendogdental.com',
      crypt('GreenDog2026!', gen_salt('bf')),
      NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"first_name": "Crystal", "last_name": "Barrom"}',
      'authenticated', 'authenticated',
      NOW(), NOW(), '', ''
    ) RETURNING id INTO crystal_user_id;
    RAISE NOTICE 'Created auth user for Crystal Barrom: %', crystal_user_id;
  ELSE
    RAISE NOTICE 'Auth user for Crystal Barrom already exists: %', crystal_user_id;
  END IF;
END $$;

-- =====================================================
-- STEP 2: Create Profiles (using auth_user_id, not id)
-- =====================================================

-- Marc Mercury - ADMIN
INSERT INTO profiles (auth_user_id, email, first_name, last_name, role, created_at, updated_at)
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
ON CONFLICT (auth_user_id) DO UPDATE SET
  role = 'admin',
  first_name = 'Marc',
  last_name = 'Mercury',
  updated_at = NOW();

-- Crystal Barrom - USER (Employee level)
INSERT INTO profiles (auth_user_id, email, first_name, last_name, role, created_at, updated_at)
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
ON CONFLICT (auth_user_id) DO UPDATE SET
  role = 'user',
  first_name = 'Crystal',
  last_name = 'Barrom',
  updated_at = NOW();

-- =====================================================
-- STEP 3: Create identities (required for Supabase Auth login)
-- =====================================================

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
)
SELECT 
  gen_random_uuid(),
  id,
  jsonb_build_object('sub', id::text, 'email', email),
  'email',
  id::text,
  NOW(), NOW(), NOW()
FROM auth.users
WHERE email IN ('Marc.H.Mercury@gmail.com', 'crystal.barrom@greendogdental.com')
  AND NOT EXISTS (
    SELECT 1 FROM auth.identities i 
    WHERE i.user_id = auth.users.id AND i.provider = 'email'
  );

-- =====================================================
-- STEP 4: Link Profiles to Employees table
-- =====================================================

UPDATE employees 
SET profile_id = p.id
FROM profiles p
JOIN auth.users u ON p.auth_user_id = u.id
WHERE u.email = 'Marc.H.Mercury@gmail.com'
  AND LOWER(employees.first_name) = 'marc' 
  AND LOWER(employees.last_name) = 'mercury'
  AND employees.profile_id IS NULL;

UPDATE employees 
SET profile_id = p.id
FROM profiles p
JOIN auth.users u ON p.auth_user_id = u.id
WHERE u.email = 'crystal.barrom@greendogdental.com'
  AND LOWER(employees.first_name) = 'crystal' 
  AND LOWER(employees.last_name) = 'barrom'
  AND employees.profile_id IS NULL;
