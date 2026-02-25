-- Migration: 267_fix_tier_priority_constraints
-- Description: Align CHECK constraints on tier & priority with recalculate_partner_metrics() function
--
-- The recalculate function (migration 191) writes:
--   tier:     'Platinum', 'Gold', 'Silver', 'Bronze', 'Coal'
--   priority: 'Very High', 'High', 'Medium', 'Low'
--
-- The original constraints (migration 054) only allow:
--   tier:     ('platinum', 'gold', 'silver', 'bronze', 'prospect')
--   priority: ('high', 'medium', 'low')
--
-- This migration fixes the mismatch by:
--   1. Dropping the old CHECK constraints
--   2. Adding new ones matching the values the function writes
--   3. Updating any existing data to the new casing/values

-- =====================================================
-- 1. DROP OLD CONSTRAINTS (safe: only if they exist)
-- =====================================================

DO $$
DECLARE
  _constraint_name TEXT;
BEGIN
  -- Drop tier CHECK constraint(s)
  FOR _constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
    WHERE rel.relname = 'referral_partners'
      AND nsp.nspname = 'public'
      AND con.contype = 'c'
      AND att.attname = 'tier'
  LOOP
    EXECUTE format('ALTER TABLE public.referral_partners DROP CONSTRAINT %I', _constraint_name);
    RAISE NOTICE 'Dropped tier constraint: %', _constraint_name;
  END LOOP;

  -- Drop priority CHECK constraint(s)
  FOR _constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
    WHERE rel.relname = 'referral_partners'
      AND nsp.nspname = 'public'
      AND con.contype = 'c'
      AND att.attname = 'priority'
  LOOP
    EXECUTE format('ALTER TABLE public.referral_partners DROP CONSTRAINT %I', _constraint_name);
    RAISE NOTICE 'Dropped priority constraint: %', _constraint_name;
  END LOOP;
END
$$;

-- =====================================================
-- 2. UPDATE EXISTING DATA TO NEW CASING / VALUES
-- =====================================================

-- Tier: lowercase → Title Case, 'prospect' → 'Coal'
UPDATE public.referral_partners SET tier = 'Platinum' WHERE lower(tier) = 'platinum';
UPDATE public.referral_partners SET tier = 'Gold'     WHERE lower(tier) = 'gold';
UPDATE public.referral_partners SET tier = 'Silver'   WHERE lower(tier) = 'silver';
UPDATE public.referral_partners SET tier = 'Bronze'   WHERE lower(tier) = 'bronze';
UPDATE public.referral_partners SET tier = 'Coal'     WHERE lower(tier) IN ('prospect', 'coal');

-- Priority: lowercase → Title Case, add 'Very High'
UPDATE public.referral_partners SET priority = 'Very High' WHERE lower(priority) = 'very high';
UPDATE public.referral_partners SET priority = 'High'      WHERE lower(priority) = 'high' AND priority != 'Very High';
UPDATE public.referral_partners SET priority = 'Medium'    WHERE lower(priority) = 'medium';
UPDATE public.referral_partners SET priority = 'Low'       WHERE lower(priority) = 'low';

-- =====================================================
-- 3. ADD NEW CHECK CONSTRAINTS
-- =====================================================

ALTER TABLE public.referral_partners
  ADD CONSTRAINT referral_partners_tier_check
    CHECK (tier IS NULL OR tier IN ('Platinum', 'Gold', 'Silver', 'Bronze', 'Coal'));

ALTER TABLE public.referral_partners
  ADD CONSTRAINT referral_partners_priority_check
    CHECK (priority IS NULL OR priority IN ('Very High', 'High', 'Medium', 'Low'));
