-- Migration: Add ability to close/dismiss notifications
-- Adds closed_at column and index for efficient filtering

-- Add closed_at column to track when a notification was dismissed
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ DEFAULT NULL;

-- Add index for efficient filtering of open notifications
CREATE INDEX IF NOT EXISTS idx_notifications_open 
ON public.notifications(profile_id, closed_at) 
WHERE closed_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.notifications.closed_at IS 'Timestamp when the notification was closed/dismissed. NULL means the notification is still visible.';
