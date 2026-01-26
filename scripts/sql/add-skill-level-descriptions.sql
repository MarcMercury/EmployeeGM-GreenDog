-- =================================================================
-- COMPREHENSIVE SKILLS TAXONOMY SCHEMA UPDATE
-- Run this in Supabase SQL Editor before importing skills
-- URL: https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql/new
-- =================================================================

-- Step 1: Add new columns to skill_library table
ALTER TABLE public.skill_library 
  ADD COLUMN IF NOT EXISTS level_descriptions JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.skill_library 
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE public.skill_library 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Step 2: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_skill_library_category ON public.skill_library(category);
CREATE INDEX IF NOT EXISTS idx_skill_library_active ON public.skill_library(is_active);

-- Step 3: Add column documentation
COMMENT ON COLUMN public.skill_library.level_descriptions IS 
  'JSON object with keys 0-5 describing each skill level:
   0 = Untrained / Unaware
   1 = Novice / Observer (Knows theory)
   2 = Apprentice / Supervised (Needs help)
   3 = Professional / Unsupervised (Standard)
   4 = Advanced / Specialist (Complex cases)
   5 = Mentor / Teacher (Trains others)';

-- Step 4: Verify columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'skill_library' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Success message
SELECT 'Schema update complete! Now run: npx tsx scripts/import-skills-taxonomy.ts' as status;
