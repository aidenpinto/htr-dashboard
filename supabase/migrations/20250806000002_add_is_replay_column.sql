-- Add is_replay column to notifications table
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS is_replay boolean DEFAULT false;

-- Update the existing policies to handle replay notifications
-- Replay notifications should only be visible to participants on dashboard, not in admin panel
