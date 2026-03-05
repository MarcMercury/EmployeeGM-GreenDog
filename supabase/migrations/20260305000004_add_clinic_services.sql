-- Migration: 20260305000004_add_clinic_services
-- Description: Add services TEXT[] column to referral_partners for tracking clinic service offerings

ALTER TABLE public.referral_partners
ADD COLUMN IF NOT EXISTS services TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.referral_partners.services IS 'Checkbox list of services offered: Dentistry, GP, Urg Care, Emergency, 24Hr Care, Internal Med, Cardio, Exotics, CT/Imaging, Derm, Optho, Accup, Other';
