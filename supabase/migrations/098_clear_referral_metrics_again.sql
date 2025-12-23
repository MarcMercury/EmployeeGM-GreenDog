-- Clear all revenue and referral metrics from referral partners (again)
-- Previous data was incorrectly attributed due to fuzzy matching issues
-- "Centinela Animal Hospital" was being matched to "Center-Sinai Animal Hospital"

UPDATE referral_partners
SET 
  total_referrals_all_time = 0,
  total_revenue_all_time = 0,
  last_sync_date = NULL;

-- Also clear the sync history to allow re-upload of PDFs
TRUNCATE TABLE referral_sync_history;
