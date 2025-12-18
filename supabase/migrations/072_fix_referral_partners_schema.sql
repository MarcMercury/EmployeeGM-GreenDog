-- Migration: 072_fix_referral_partners_schema
-- Description: Ensure referral_partners has all required columns
-- Fixes: 'column referral_partners.name does not exist' error

-- The referral_partners table may be missing columns if it was created
-- before the 001_schema.sql was updated or the migrations got out of sync

-- Add name column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'referral_partners' 
        AND column_name = 'name'
    ) THEN
        ALTER TABLE public.referral_partners ADD COLUMN name TEXT NOT NULL DEFAULT 'Unknown';
    END IF;
END $$;

-- Add contact_name if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'referral_partners' 
        AND column_name = 'contact_name'
    ) THEN
        ALTER TABLE public.referral_partners ADD COLUMN contact_name TEXT;
    END IF;
END $$;

-- Add email if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'referral_partners' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE public.referral_partners ADD COLUMN email TEXT;
    END IF;
END $$;

-- Add phone if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'referral_partners' 
        AND column_name = 'phone'
    ) THEN
        ALTER TABLE public.referral_partners ADD COLUMN phone TEXT;
    END IF;
END $$;

-- Add address if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'referral_partners' 
        AND column_name = 'address'
    ) THEN
        ALTER TABLE public.referral_partners ADD COLUMN address TEXT;
    END IF;
END $$;

-- Add notes if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'referral_partners' 
        AND column_name = 'notes'
    ) THEN
        ALTER TABLE public.referral_partners ADD COLUMN notes TEXT;
    END IF;
END $$;

-- Add status if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'referral_partners' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.referral_partners ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
END $$;

-- Ensure the table has proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_referral_partners_name ON public.referral_partners(name);
CREATE INDEX IF NOT EXISTS idx_referral_partners_status ON public.referral_partners(status);
