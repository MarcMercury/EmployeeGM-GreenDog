-- Clear all revenue and referral metrics from referral partners
-- Due to parsing issues causing inaccurate attribution of metrics to contacts
-- This resets all metrics to 0 for a clean slate

UPDATE referral_partners
SET 
  total_referrals_all_time = 0,
  total_revenue_all_time = 0,
  last_sync_date = NULL;

-- Also clear the sync history to prevent "already uploaded" errors
-- when re-uploading PDFs after parsing fixes
TRUNCATE TABLE referral_sync_history;
