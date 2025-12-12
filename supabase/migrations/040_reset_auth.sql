-- =====================================================
-- Migration 040: Emergency auth.users reset
-- The auth schema is corrupted - we need to delete all manually inserted users
-- Users will need to sign up fresh using Supabase Auth UI
-- =====================================================

-- First, delete all auth.identities 
DELETE FROM auth.identities;

-- Then delete all auth.users
DELETE FROM auth.users;

-- Clear auth_user_id from profiles (they'll be re-linked on signup)
UPDATE public.profiles SET auth_user_id = NULL;

-- Ensure the handle_new_user trigger is correct
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert new profile or update existing one based on email
  INSERT INTO public.profiles (id, auth_user_id, email, first_name, last_name, role)
  VALUES (
    gen_random_uuid(),
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
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  RAISE NOTICE 'Auth schema reset complete. Users must sign up fresh.';
END $$;
