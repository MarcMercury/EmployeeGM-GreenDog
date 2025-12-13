-- =====================================================
-- USER PROFILE TRIGGER
-- Creates a profile when a new auth user signs up
-- =====================================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, auth_user_id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    CASE 
      WHEN NEW.email = 'marc.h.mercury@gmail.com' THEN 'admin'
      ELSE 'user'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- SEED ADMIN USER (if not exists)
-- =====================================================
-- Note: You need to create the user in Supabase Auth first
-- Then run this to ensure admin role is set

-- Update Marc's profile to admin if exists
UPDATE public.profiles 
SET role = 'admin' 
WHERE LOWER(email) = 'marc.h.mercury@gmail.com';
