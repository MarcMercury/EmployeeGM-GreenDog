-- Add API Monitoring page to permission system
-- NOTE: page_definitions schema changed; this migration is now a no-op.
-- The API monitoring page access is managed through the application layer.
DO $$ BEGIN RAISE NOTICE 'Migration 20260218_add_api_monitoring_page: skipped (no-op)'; END $$;
