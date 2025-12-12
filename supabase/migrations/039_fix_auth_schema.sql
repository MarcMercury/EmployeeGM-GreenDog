-- =====================================================
-- Migration 039: Clean up auth schema issues
-- The manual auth.users insertions from previous migrations 
-- may have corrupted the auth schema
-- =====================================================

-- Drop and recreate the handle_new_user trigger with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only insert profile if it doesn't already exist
  INSERT INTO public.profiles (id, auth_user_id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    CASE 
      WHEN LOWER(NEW.email) = 'marc.h.mercury@gmail.com' THEN 'admin'
      ELSE 'user'
    END
  )
  ON CONFLICT (auth_user_id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail auth
    RAISE WARNING 'handle_new_user error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Clean up any orphaned or duplicate auth.identities entries
-- This can cause "Database error querying schema" 
DO $$
DECLARE
  orphan_count INT;
BEGIN
  -- Count orphaned identities
  SELECT COUNT(*) INTO orphan_count
  FROM auth.identities i
  LEFT JOIN auth.users u ON i.user_id = u.id
  WHERE u.id IS NULL;
  
  IF orphan_count > 0 THEN
    -- Delete orphaned identities
    DELETE FROM auth.identities 
    WHERE user_id NOT IN (SELECT id FROM auth.users);
    
    RAISE NOTICE 'Deleted % orphaned identity records', orphan_count;
  END IF;
END $$;

-- Ensure the profiles table has proper constraints
-- Add ON CONFLICT handling for email if not exists
DO $$
BEGIN
  -- Create unique constraint on email if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_email_key' 
    AND conrelid = 'public.profiles'::regclass
  ) THEN
    -- Can't add constraint if duplicates exist, so we skip
    RAISE NOTICE 'Email unique constraint check - may have duplicates';
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'Migration 039 completed - cleaned up auth schema';
END $$;
