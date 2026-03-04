-- Fix ezyvet_api_sync_log sync_type CHECK constraint
-- The original constraint only allowed: 'users','appointments','consults','animals','full'
-- But the sync-analytics code also writes 'invoices' and 'contacts', causing constraint violations.

ALTER TABLE ezyvet_api_sync_log
  DROP CONSTRAINT IF EXISTS ezyvet_api_sync_log_sync_type_check;

ALTER TABLE ezyvet_api_sync_log
  ADD CONSTRAINT ezyvet_api_sync_log_sync_type_check
  CHECK (sync_type IN ('users', 'appointments', 'consults', 'animals', 'invoices', 'contacts', 'full'));
