-- =====================================================
-- MIGRATION: 033_add_bio_to_profiles.sql
-- Description: Add bio column to profiles table
-- =====================================================

-- Add bio column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'bio'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN bio TEXT;
    RAISE NOTICE 'Added bio column to profiles table';
  ELSE
    RAISE NOTICE 'bio column already exists';
  END IF;
END $$;
