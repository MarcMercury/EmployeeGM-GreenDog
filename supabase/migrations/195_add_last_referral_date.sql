-- Migration: Add last_referral_date column
-- Purpose: Separate EzyVet referral dates from our logged visit dates
-- 
-- last_referral_date = From EzyVet report (when their referred client visited US)
-- last_visit_date = From our visit logs (when WE visited THEM)

-- 1. Add last_referral_date column if it doesn't exist
ALTER TABLE public.referral_partners 
ADD COLUMN IF NOT EXISTS last_referral_date TIMESTAMPTZ;

-- 2. Copy existing last_visit_date to last_referral_date for historical data
-- (Since previously this was being used for both purposes)
UPDATE public.referral_partners 
SET last_referral_date = last_visit_date
WHERE last_referral_date IS NULL AND last_visit_date IS NOT NULL;

-- 3. Now we need to recalculate last_visit_date from actual clinic_visits
-- This will correctly show when we actually visited them
UPDATE public.referral_partners rp
SET last_visit_date = (
  SELECT MAX(visit_date)
  FROM public.clinic_visits cv
  WHERE cv.partner_id = rp.id
)
WHERE EXISTS (
  SELECT 1 FROM public.clinic_visits cv WHERE cv.partner_id = rp.id
);

-- Also check partner_visit_logs table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'partner_visit_logs') THEN
    UPDATE public.referral_partners rp
    SET last_visit_date = GREATEST(
      rp.last_visit_date,
      (SELECT MAX(visit_date) FROM public.partner_visit_logs pvl WHERE pvl.partner_id = rp.id)
    )
    WHERE EXISTS (
      SELECT 1 FROM public.partner_visit_logs pvl WHERE pvl.partner_id = rp.id
    );
  END IF;
END $$;

-- 4. Add comment to clarify column purposes
COMMENT ON COLUMN public.referral_partners.last_referral_date IS 'Last time a referred client from this partner visited us (from EzyVet reports)';
COMMENT ON COLUMN public.referral_partners.last_visit_date IS 'Last time we visited this partner (from Quick Visit or Log Visit)';

-- 5. Create index for new column
CREATE INDEX IF NOT EXISTS idx_referral_partners_last_referral_date 
ON public.referral_partners(last_referral_date);
